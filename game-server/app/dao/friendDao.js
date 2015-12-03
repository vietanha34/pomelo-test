/**
 * Created by kiendt on 9/23/15.
 */

var FriendDao = module.exports;
var pomelo = require('pomelo');
var Promise = require('bluebird');
var consts = require('../consts/consts');
var code = require('../consts/code');
var utils = require('../util/utils');
var redisKeyUtil = require('../util/redisKeyUtil');
var lodash = require('lodash');
var UserDao = require('./userDao');
var HomeDao = require('./homeDao');
var NotifyDao = require('./notifyDao');
var request = require('request-promise').defaults({transform: true});

/**
 *
 * @param fromId
 * @param toId
 * @param cb
 */
FriendDao.request = function request(fromId, toId, cb) {
  if (!fromId || !toId || fromId == toId) {
    return utils.invokeCallback(cb, 'invalid params friend request');
  }

  var redis = pomelo.app.get('redisService');
  var fromKey = redisKeyUtil.getPlayerFriendKey(fromId);
  var toKey = redisKeyUtil.getPlayerFriendKey(toId);

  return redis.zcardAsync(fromKey)
    .then(function(count) {
      if (count >= consts.MAX_FRIEND) {
        return utils.invokeCallback(cb, null, {ec: 3, msg: [code.FRIEND_LANGUAGE.LIMITED, consts.MAX_FRIEND.toString()]});
      }
      else {
        return FriendDao.checkFriendStatus(fromId, toId)
          .then(function(status) {
            if (status) throw new Error('Client sai luồng kết bạn');
            return redis.multi()
              .zadd(fromKey, code.FRIEND_STATUS.FRIEND, toId)
              .zadd(toKey, code.FRIEND_STATUS.FRIEND, fromId)
              .execAsync();
          })
          .then(function() {
            UserDao.getUserProperties(fromId, ['fullname'])
              .then(function(user) {
                NotifyDao.push({
                  type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
                  title: code.FRIEND_LANGUAGE.REQUEST,
                  msg: [code.FRIEND_LANGUAGE.REQUEST_TO_YOU, user.fullname || ''],
                  buttonLabel: code.FRIEND_LANGUAGE.ACCEPT,
                  command: {target: consts.NOTIFY.TARGET.GO_FRIEND},
                  scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
                  users: [toId],
                  image:  consts.NOTIFY.IMAGE.FRIEND
                });
              });

            return utils.invokeCallback(cb, null, {msg: code.FRIEND_LANGUAGE.REQUEST_OK});
          })
      }
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb, e.stack || e);
    });
};

/**
 *
 * @param fromId
 * @param toId
 * @param cb
 */
FriendDao.reject = function reject(fromId, toId, cb) {
  if (!fromId || !toId) {
    return utils.invokeCallback(cb, 'invalid params friend reject');
  }

  var redis = pomelo.app.get('redisService');
  var fromKey = redisKeyUtil.getPlayerFriendKey(fromId);
  var toKey = redisKeyUtil.getPlayerFriendKey(toId);

  return FriendDao.checkFriendStatus(fromId, toId)
    .then(function(status) {
      if (status) {
        return redis.multi()
          .zrem(fromKey, toId)
          .zrem(toKey, fromId)
          .execAsync()
          .then(function() {
            return utils.invokeCallback(cb, null, {msg: code.FRIEND_LANGUAGE.UNFRIEND_OK, uid: toId});
          });
      }
      else {
        return utils.invokeCallback(cb, null, {msg: code.FRIEND_LANGUAGE.CANCEL_BEFORE});
      }
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb, e.stack || e);
    });
};

/**
 *
 * @param fromId
 * @param toId
 * @param cb
 */
FriendDao.checkFriendStatus = function checkFriendStatus(fromId, toId, cb) {
  if (!fromId || !toId) {
    return utils.invokeCallback(cb, 'invalid params checkFriendStatus');
  }

  var redis = pomelo.app.get('redisService');
  var fromKey = redisKeyUtil.getPlayerFriendKey(fromId);
  return redis.zscoreAsync(fromKey, toId)
    .then(function(score) {
      return utils.invokeCallback(cb, null, Number(score));
    })
    .catch(function(e){
      console.error(e.stack || e);
      return utils.invokeCallback(cb, e.stack || e);
    });
};

/**
 *
 *
 * @param uid
 * @param limit
 * @param cb
 */
FriendDao.getFriendList = function getFriendList(uid, limit, cb) {
  var redis = pomelo.app.get('redisService');
  limit = limit || consts.MAX_FRIEND;
  var friendKey = redisKeyUtil.getPlayerFriendKey(uid);
  var params = [friendKey, code.FRIEND_STATUS.FRIEND, code.FRIEND_STATUS.FRIEND, 'LIMIT', 0, limit];
  return redis.zrangebyscoreAsync(params)
    .then(function(uids) {
      uids.forEach(function(e, i) {
        uids[i] = Number(uids[i]);
      });
      return utils.invokeCallback(cb, null, uids);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      return utils.invokeCallback(cb, null, []);
    });
};

/**
 *
 * @param uid
 * @param limit
 * @param cb
 */
FriendDao.getFullList = function getFullList(uid, limit, cb) {
  var redis = pomelo.app.get('redisService');
  limit = limit || (consts.MAX_FRIEND);
  var friendKey = redisKeyUtil.getPlayerFriendKey(uid);
  var params = [friendKey, 0, limit, 'WITHSCORES'];
  return redis.zrangeAsync(params)
    .then(function(list) {
      if (!list || !list.length) {
        return utils.invokeCallback(cb, null, {list: []});
      }

      var uids = [];
      var FriendStatuses = {};
      for (var i=0; i<list.length; i+=2) {
        uids.push(Number(list[i]));
        FriendStatuses[list[i]] = (Number(list[i+1]));
      }

      var properties = ['uid', 'fullname', 'avatar', 'sex', 'gold', 'statusMsg', 'level'];
      return UserDao.getUsersPropertiesByUids(uids, properties)
        .then(function(users) {
          users = users || [];
          var statusService = pomelo.app.get('statusService');
          return Promise.promisify(statusService.getStatusByUids, statusService)(uids, true)
            .then(function(statuses) {
              statuses = statuses || [];
              for (i = 0; i < users.length; i++) {
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
                users[i].friendStatus = FriendStatuses[users[i].uid] || 0;
              }

              //users.sort(function(a, b) {
              //  return a.friendStatus - b.friendStatus;
              //});

              return utils.invokeCallback(cb, null, {list: users});
            });
        });
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb, null, {list: []});
    });
};

/**
 *
 * @param params
 *  uid
 *  name
 *  page
 * @param cb
 */
FriendDao.search = function search(params, cb) {
  if (!params.uid || !params.name || params.name.length < 2) {
    return utils.invokeCallback(cb, 'invalid params search friend');
  }

  var mongoClient = pomelo.app.get('mongoClient');
  var Top = mongoClient.model('Top');
  var nameRegex = new RegExp(params.name, 'i');

  var users;
  var uids = [];
  var list;
  var i = 0;

  return Top
    .find({
      $or: [
        {username: nameRegex},
        {fullname: nameRegex}
      ]
    })
    .skip((params.page-1)*consts.FRIEND.PER_PAGE)
    .limit(consts.FRIEND.PER_PAGE+consts.MAX_FRIEND)
    .sort({ fullname: 1 })
    .select({uid: 1})
    .lean()
    .then(function(search) {
      list = search || [];
      if (!list.length)
        throw new Error('Cannot search friend');

      return FriendDao.getFriendList(params.uid, consts.MAX_FRIEND);
    })
    .then(function(friends) {
      for (i=0; i<list.length; i++) {
        if (list[i].uid && friends.indexOf(list[i].uid) == -1 && list[i].uid != params.uid) {
          uids.push(list[i].uid);
          if (uids.length >= consts.MAX_FRIEND) break;
        }
      }

      var properties = ['uid', 'fullname', 'avatar', 'sex', 'gold', 'statusMsg', 'level'];
      var statusService = pomelo.app.get('statusService');
      return [
        UserDao.getUsersPropertiesByUids(uids, properties),
        Promise.promisify(statusService.getStatusByUids, statusService)(uids, true)
      ];
    })
    .spread(function(users, statuses) {
      statuses = statuses || [];
      for (i = 0; i < users.length; i++) {
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
      }

      users.sort(function(a, b) {
        return a.fullname - b.fullname;
      });

      list = null;
      uids = null;
      statuses =  null;

      return utils.invokeCallback(cb, null, {
        list: users,
        hasNext: (users.length > consts.FRIEND.PER_PAGE) ? 1 : 0,
        page: params.page || 1
      });
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb, null, {list: [], hasNext: 0, page: params.page || 1});
    });
};