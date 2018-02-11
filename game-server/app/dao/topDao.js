/**
 * Created by kiendt on 9/23/15.
 */

var TopDao = module.exports;
var pomelo = require('pomelo');
var Promise = require('bluebird');
var code = require('../consts/code');
var consts = require('../consts/consts');
var utils = require('../util/utils');
var formula = require('../consts/formula');
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
  if (type === code.TOP_TYPE.VIP)
    attr = 'vipPoint';
  else if (type === code.TOP_TYPE.GOLD)
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
  var me = {rank: 0};
  var list;
  var statuses;

  var promise = Top.find().limit(consts.TOP.PER_PAGE).sort(sort).select(select)
    .then(function(users) {
      users = users || [];
      users.forEach(function(user) {
        uids.push(user.uid);
        top[user.uid] = user[attr] || 0;
      });
      if (uids.indexOf(uid) === -1) {
        uids.push(uid);
        inTop = false;
      }

      var properties = ['uid', 'username', 'fullname', 'avatar', 'sex', 'vipPoint', 'gold', 'exp', 'statusMsg'];

      var statusService = pomelo.app.get('statusService');
      return [
        UserDao.getUsersPropertiesByUids(uids, properties),
        Promise.promisify(statusService.getStatusByUids,{ context : statusService})(uids, true)
      ];
    })
    .spread(function(users, status) {
      list = users || [];
      statuses = status || [];
      users = null;
      status = null;
      return processUsers();
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return processUsers();
    });

  var processUsers = function() {
    if (type !== code.TOP_TYPE.VIP && type !== code.TOP_TYPE.GOLD) {
      list.forEach(function(user) {
        user.point = top[user.uid] || 0;
      });
    }
    else {
      list.forEach(function(user) {
        user.point = user[attr] || 0;
      });
    }

    list.sort(function(a, b) {
      return b.point - a.point;
    });

    for (var i = 0; i < list.length; i++) {
      if (!statuses[list[i].uid] || !statuses[list[i].uid].online)
        list[i].status = consts.ONLINE_STATUS.OFFLINE;
      else if (!statuses[list[i].uid].board)
        list[i].status = consts.ONLINE_STATUS.ONLINE;
      else if (typeof statuses[list[i].uid].board === 'string') {
        var tmp = statuses[list[i].uid].board.split(':');
        list[i].status = tmp.length > 1
          ? (Number(tmp[1]))
          : consts.ONLINE_STATUS.ONLINE;
        list[i].boardId = statuses[list[i].uid].board;
      }
      else list[i].status = consts.ONLINE_STATUS.ONLINE;

      list[i].avatar = utils.JSONParse(list[i].avatar, {id: 0});
      list[i].vipLevel = formula.calVipLevel(Number(list[i].vipPoint) || 0);

      if (list[i].uid === uid) {
        me = utils.clone(list[i]);
        if (inTop) {
          list[i].isMe = 1;
          me.rank = i+1;
        }
        else {
          list.splice(i,1);
          i--;
        }
      }
    }

    statuses = null;

    if (!inTop) {
      var rankAttr = attr+'Rank';
      var select = {};
      select[rankAttr] = 1;
      select[attr] = 1;
      return Top
        .findOne({uid: uid})
        .select(select)
        .lean()
        .then(function(user) {
          me.rank = Number(user[rankAttr]) || 0;
          me.point = Number(user[attr]) || 0;
          return utils.invokeCallback(cb, null, {list: list, me: me});
        });
    }

    return utils.invokeCallback(cb, null, {list: list, me: me});
  };

  return promise;
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
  var goldRank;
  Top.update({uid: params.uid}, params.update, {upsert: false})
    .then(function() {
      return Top.count({gold: {$gt: params.update.gold}})
    })
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
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
    });
};

/**
 *
 * @param params
 *  uid
 *  update
 * @param cb
 */
TopDao.updateVip = function updateVip(params, cb) {
  var mongoClient = pomelo.app.get('mongoClient');
  var Top = mongoClient.model('Top');
  var goldRank;
  Top.update({uid: params.uid}, params.update, {upsert: false})
    .then(function() {
      return Top.count({gold: {$gt: params.update.gold}})
    })
    .then(function(count) {
      goldRank = (count||1000) + 1;
      return Top.count({vipPoint: {$gt: params.update.vipPoint}});
    })
    .then(function(count) {
      var update = { goldRank: goldRank };
      update['vipPointRank'] = (count||1000) + 1;
      return Top.update({uid: params.uid}, update);
    })
    .catch(function(e) {
      console.error(e.stack || e);
    });
};

/**
 *
 * @param params
 *  uid
 *  update
 * @param cb
 */
TopDao.updateGold = function updateVip(params, cb) {
  var mongoClient = pomelo.app.get('mongoClient');
  var Top = mongoClient.model('Top');
  var goldRank;
  Top.update({uid: params.uid}, params.update, {upsert: false})
    .then(function() {
      return Top.count({gold: {$gt: params.update.gold}})
    })
    .then(function(count) {
      goldRank = (count||1000) + 1;
      var update = { goldRank: goldRank };
      return Top.update({uid: params.uid}, update);
    })
    .catch(function(e) {
      console.error(e.stack || e);
    });
};