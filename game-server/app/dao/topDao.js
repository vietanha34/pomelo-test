/**
 * Created by kiendt on 9/23/15.
 */

var TopDao = module.exports;
var pomelo = require('pomelo');
var Promise = require('bluebird');
var code = require('../consts/code');
var consts = require('../consts/consts');
var utils = require('../util/utils');
var redisKeyUtil = require('../util/redisKeyUtil');
var UserDao = require('../dao/userDao');

/**
 *
 * @param uid
 * @param type loại BXH (99: vip, 100: đại gia, 1->6: BXH các game)
 * @param cb
 */
TopDao.getTop = function getTop(uid, type, cb) {
  type = type || code.TOP_TYPE.VIP;

  var attr;
  if (type == code.TOP_TYPE.VIP)
    attr = 'vipPoint';
  else if (type == code.TOP_TYPE.GOLD)
    attr = 'gold';
  else
    attr = consts.UMAP_GAME_NAME[type];

  attr = attr || 'vipPoint';

  var select = {uid: 1};
  select[attr] = 1;
  var sort = {};
  sort[attr] = -1;

  var mongoClient = pomelo.app.get('mongoClient');
  var Top = mongoClient.model('Top');
  var top = {};
  var uids = [];
  var inTop = true;
  var me = {rank: 1000};
  return Top
    .findAll()
    .limit(consts.TOP.PER_PAGE)
    .sort(sort)
    .select(select)
    .then(function(users) {
      users = users || [];
      users.forEach(function(user) {
        uids.push(user.uid);
        top[user.uid] = user[attr] || 0;
      });
      if (uids.indexOf(uid) == -1) {
        uids.push(uid);
        inTop = false;
      }

      var properties = ['uid', 'fullname', 'avatar', 'sex'];
      if (type == code.TOP_TYPE.VIP || type == code.TOP_TYPE.GOLD)
        properties.push(attr);
      return UserDao.getUsersPropertiesByUids(uids, properties);
    })
    .then(function(users) {
      if (type != code.TOP_TYPE.VIP && type != code.TOP_TYPE.GOLD) {
        users.forEach(function(user) {
          user.point = top[user.uid] || 0;
        });
      }
      else {
        users.forEach(function(user) {
          user.point = user[attr] || 0;
        });
      }

      users.sort(function(a, b) {
        return b.point - a.point;
      });

      return Promise.promisify(pomelo.app.get('statusService').getStatusByUids)(uids, true)
        .then(function(statuses) {
          statuses = statuses || [];

          for (var i = 0; i < users.length; i++) {
            if (!statuses[users[i].uid] || !statuses[users[i].uid].online)
              users[i].status = consts.ONLINE_STATUS.OFFLINE;
            else if (!statuses[users[i].uid].board)
              users[i].status = consts.ONLINE_STATUS.ONLINE;
            else if (typeof statuses[users[i].uid].board == 'string') {
              var tmp = statuses[users[i].uid].board.split(':');
              users[i].status = tmp.length > 1
                ? (Number(tmp[1]))
                : consts.ONLINE_STATUS.ONLINE;
              users[i].boardId = tmp[0];
            }
            else users[i].status = consts.ONLINE_STATUS.ONLINE;

            users[i].avatar = utils.JSONParse(users[i].avatar, {id: 0});

            if (users[i].uid == uid) {
              me = utils.clone(users[i]);
              if (inTop) {
                users[i].isMe = 1;
                me.rank = i+1;
              }
              else {
                users.splice(i,1);
              }
            }
          }

          if (!inTop) {
            var rankAttr = attr+'Rank';
            return Top
              .findOne({uid: uid})
              .select(rankAttr)
              .then(function(user) {
                if (user && user[rankAttr])
                  me.rank = Number(user[rankAttr]);

                return utils.invokeCallback(cb, null, {list: users, me: me});
              });
          }

          return utils.invokeCallback(cb, null, {list: users, me: me});
        });
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb, null, {list: [], me: {}});
    });
};

/**
 *
 * @param params
 *  uid
 *  attr
 *  point
 * @param cb
 */
TopDao.add = function add(params, cb) {
  if (!params.uid || !params.attr || !params.point) {
    return utils.invokeCallback(cb, 'invalid params add exp');
  }

  return UserDao.getUserProperties(params.uid, [params.attr])
    .then(function(user) {
      user[params.attr] += (Number(params.point) || 0);
      return UserDao.updateProperties(params.uid, user)
    })
    .catch(function(e) {
      console.error(e.stack || e);
      return utils.invokeCallback(cb, e.stack || e);
    });
};

/**
 *
 * @param params
 *  uid
 *  update
 *  gameName
 * @param cb
 */
TopDao.updateGame = function updateGame(params, cb) {
  var mongoClient = pomelo.app.get('mongoClient');
  var Top = mongoClient.model('Top');
  Top.update({uid: params.uid}, params.update, {upsert: false})
    .then(function() {
      var goldRank;
      return Top.count({gold: {$gt: params.update.gold}})
        .then(function(count) {
          goldRank = (count||1000) + 1;
          var countElo = {};
          countElo[params.gameName] = {$gt: params.update[params.gameName]};
          return Top.count(countElo);
        })
        .then(function(count) {
          var update = { goldRank: goldRank };
          update[params.gameName+'Rank'] = (count||1000) + 1;
          return Top.update({uid: params.uid}, update);
        });
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
    });
};
