/**
 * Created by KienDT on 12/02/14.
 */

var consts = require('../../../consts/consts');
var Code = require('../../../consts/code');
var lodash = require('lodash');
var utils = require('../../../util/utils');
var async = require('async');
var userDao = require('../../../dao/userDao');
var util = require('util');
var Promise = require('bluebird');
var logger= require('pomelo-logger').getLogger(__filename);

module.exports = function (app) {
  return new Handler(app)
};

var Handler = function (app) {
  this.app = app;
};

Handler.prototype.request = function (msg, session, next) {
  var uid = session.uid;
  var toId = msg.uid;
  var self = this;
  var promise = this.app.get('mysqlClient')
    .AccUserFriend
    .findOne({
      where: {
        $or : [
          {
            $and : [
              {
                userId : uid
              },
              {
                friendId : toId
              }
            ]
          },
          {
            $and : [
              {
                userId : toId
              },
              {
                friendId : uid
              }
            ]
          }
        ]
      }
    })
    .then(function (friendShip) {
      console.log('FriendShip : ', friendShip);
      if (friendShip) {
        next(null, { });
        return promise.cancel();
      }else {
        return self.app.get('mysqlClient')
          .AccUserFriend
          .create({
            userId : uid,
            friendId: toId,
            status : 0
          })
      }
    })
    .then(function (result) {
      next(null, {uid : toId})
    })
    .catch(function (err) {
      logger.error('err : ', err);
      next(null, { ec : Code.FAIL})
    })
    .cancellable();
};

Handler.prototype.accept = function (msg, session, next) {
  var uid = session.uid;
  var toId = msg.uid;
  var promise = this.app.get('mysqlClient')
    .AccUserFriend
    .findOne({
      where: {
        $or : [
          {
            $and : [
              {
                userId : uid
              },
              {
                friendId : toId
              }
            ]
          },
          {
            $and : [
              {
                userId : toId
              },
              {
                friendId : uid
              }
            ]
          }
        ]
      }
    })
    .then(function (friendShip) {
      if (friendShip) {
        return friendShip.updateAttributes({
          status : 1
        })
      }else {
        next(null, { ec : Code.FAIL, msg : "khong có yêu cầu kết bạn này"});
        return promise.cancel();
      }
    })
    .then(function (result) {
      next(null, {uid : toId})
    })
    .catch(function (err) {
      console.log(err);
      next(null, { ec : Code.FAIL})
    })
    .cancellable();
};

Handler.prototype.reject = function (msg, session, next) {
  var uid = session.uid;
  var toId = msg.uid;
  var self = this;
  var options = {
    where: {
      $or : [
        {
          $and : [
            {
              userId : uid
            },
            {
              friendId : toId
            }
          ]
        },
        {
          $and : [
            {
              userId : toId
            },
            {
              friendId : uid
            }
          ]
        }
      ]
    }
  };
  var promise = this.app.get('mysqlClient')
    .AccUserFriend
    .findOne(options)
    .then(function (friendShip) {
      if (friendShip) {
        return self.app.get('mysqlClient')
          .AccUserFriends
          .destroy(options)
      }else {
        next(null, {});
        return promise.cancel();
      }
    })
    .then(function (result) {
      next(null, {uid :toId })
    })
    .catch(function (err) {
      console.log(err);
      next(null, { ec : Code.FAIL})
    })
    .cancellable();
};

Handler.prototype.unFriend = function (msg, session, next) {
  var uid = session.uid;
  var toId = msg.userId;
  var options = {
    where: {
      $or : [
        {
          $and : [
            {
              userId : uid
            },
            {
              friendId : toId
            }
          ]
        },
        {
          $and : [
            {
              userId : toId
            },
            {
              friendId : uid
            }
          ]
        }
      ]
    }
  };
  this.app.get('mysqlClient')
    .AccUserFriend
    .destroy(options)
    .then(function (friendShip) {
      next(null,{})
    })
    .catch(function (err) {
      console.log(err);
      next(null, { ec : Code.FAIL})
    })
    .cancellable();
};

Handler.prototype.getListFriend = function (msg, session, next) {
  var self = this;
  var friends = {};
  var userId = session.uid;
  var query = "(SELECT u.gold, u.fullname, u.id uid, u.avatar, f.status, 1 type " +
    "FROM ipoker.AccUserFriends as f " +
    "INNER JOIN ipoker.AccUsers as u ON u.id = f.friendId " +
    "WHERE f.userId = %s) " +
    "UNION " +
    "(SELECT u.gold, u.fullname, u.id uid, u.avatar, f.status, 2 type " +
    "FROM ipoker.AccUserFriends as f " +
    "INNER JOIN ipoker.AccUsers as u ON u.id = f.userId " +
    "WHERE f.friendId = %s)";
  query = util.format(query, userId, userId);
  this.app.get('mysqlClient')
    .sequelize
    .query(query)
    .spread(function (totalFriend) {
      for (var i = 0, len = totalFriend.length; i < len; i++) {
        var friend = totalFriend[i];
        if (friend.type === 2 && friend.status === consts.FRIEND_STATUS.REQUEST){
          friend.status = consts.FRIEND_STATUS.BE_REQUESTED
        }
        friends[friend.uid] = {
          uid : friend.uid,
          fullname : friend.fullname,
          stt : friend.status,
          gold : friend.gold
        }
      }
      var keys = lodash.pluck(totalFriend, 'uid');
      if (keys.length === 0){
        return Promise.resolve({});
      }else {
        var getStatusByUids = Promise.promisifyAll(self.app.get('statusService'));
        return getStatusByUids.getStatusByUids(keys, true);
      }
    })
    .then(function (statuses) {
      statuses = statuses || {};
      var keys = Object.keys(friends);
      for (var i = 0, len = keys.length; i < len; i++) {
        var uid = keys[i];
        friends[uid].avatar = utils.JSONParse(friends[uid].avatar, {id: 0, version: 0});
        if (statuses[uid]) {
          if (statuses[uid].online) {
            statuses[uid].online = 1;
          } else {
            statuses[uid].online = 0;
          }
          if (lodash.isArray(statuses[uid].board) && statuses[uid].board.length > 0) {
            var boardId = statuses[uid].board;
            statuses[uid].boardId = boardId;
            statuses[uid].gameId = boardId.split(':')[1];
          } else {
            delete statuses[uid].board;
            statuses[uid].boardId = '';
          }
          friends[uid] = utils.merge_options(friends[uid], statuses[uid]);
        }
      }
      next(null, {friends: lodash.values(friends)});
    })
    .catch(function (err) {
      console.error(err);
    })
    .finally(function () {
      friends = null;
    })
};

/**
 * Kiểm tra lượng người chơi có online hay không
 * * uids :
 * * fbIds : mảng các facebookId
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.checkingOnline = function (msg, session, next) {
  this.app.get('mysqlClient')
    .AccUsers
    .findAll({
      where : {
        openId : {
          $in : [msg.fbIds]
        }
      },
      attributes : ['uid']
    })
    .then(function (users) {
      var keys = lodash.pluck(users, 'uid');
      var getStatusByUids = Promise.promisify(self.app.get('statusService').getStatusByUids);
      return getStatusByUids(keys, true);
    })
    .then(function (statuses) {
      statuses = statuses || {};
      var keys = Object.keys(statuses);
      var data = [];
      for (var i = 0, len = keys.length; i < len ; i ++){
        var uid = keys[i];
        statuses[uid].uid = uid;
        statuses[uid].fbId = msg.fbIds[i];
        data.push(statuses[uid]);
        if (lodash.isArray(statuses[uid].board) && statuses[uid].board.length > 0) {
          var boardId = statuses[uid].board;
          statuses[uid].boardId = boardId;
          statuses[uid].gameId = boardId.split(':')[1];
        } else {
          delete statuses[uid].board;
          statuses[uid].boardId = '';
        }
      }
      next(null, { data : data});
    })
    .catch(function (err) {
      console.error(err);
      next(null, {ec : Code.FAIL})
    })
};
