var Code = require('../consts/code');
var Consts = require('../consts/consts');
var utils = require('../util/utils');
var redisKeyUtil = require('../util/redisKeyUtil');
var lodash = require('lodash');
var consts = require('../consts/consts');
var logger = require('pomelo-logger').getLogger('service', __filename, process.pid);
var async = require('async');
var pomelo = require('pomelo');
var RoomDao = require('../dao/roomChatDao');
var channelUtil = require('../util/channelUtil');
var MessageDao = require('../dao/messageDao');
var Promise = require('bluebird');
//var HomeDao = require('../dao/homeDao');


var ChatService = function (app, opts) {
  this.app = app;
};

module.exports = ChatService;

pro = ChatService.prototype;

ChatService.prototype.addGlobal = function (channelName, uid, sid, cb) {
  return this.app.get('globalChannelService').add(channelName, uid, sid, cb);
};

ChatService.prototype.leaveGlobal = function (channelName, uid, sid, cb) {
  return this.app.get('globalChannelService').leave(channelName, uid, sid, cb);
};

ChatService.prototype.pushByGlobalChannel = function (channelName, route, msg, cb) {
  return this.app.get('globalChannelService').pushMessage('connector', route, msg, channelName, {}, cb);
};

/**
 * Push message by the specified channel
 *
 * @param  {String}   channelName channel name
 * @param  {Object}   msg         message json object
 * @param  {String}   route       route to push Message
 * @param  {Function} cb          callback function
 */
ChatService.prototype.pushByRoomId = function (channelName, route, msg, cb) {
  this.app.get('globalChannelService').pushMessage('connector', route, msg, channelName, cb);
};

pro.createMessage = function (message, cb) {
  if (message.roomId) {
    message.targetType = consts.TARGET_TYPE.GROUP;
  }
  var MessageModel = this.app.get('mongoClient').model('message');
  var msg = new MessageModel(message);
  msg.save();
  utils.invokeCallback(cb, null, msg)
};

pro.updateMessage = function (message, cb) {
  this.app.get('mongoClient').model('message').update({id: message.id}, message, cb)
};

pro.getMessage = function (msgId, cb) {
  this.app.get('mongoClient').model('message').findOne({_id: msgId}, cb)
};

pro.getLastMessage = function (opts, cb) {
  var length = opts.length || 20;
  var target = opts.target;
  var from = opts.from;
  var channel = opts.channel;
  var targetType = opts.targetType;
  var projection;
  if (targetType == consts.TARGET_TYPE.GROUP) {
    projection = {
      channel : channel
    }
  } else {
    projection = {
      $or: [
        {from: target, target: from},
        {target: target, from: from}
      ]
    }
  }
  console.log('projection: ', projection);
  this.app.get('mongoClient').model('message').find(projection)
    .sort({date: -1})
    .limit(length)
    .select('targetType status date content channel type from target roomId')
    .lean()
    .exec(cb);
};

pro.getMessages = function (opts, cb) {
  var msgId = opts.msgId;
  var length = opts.length || 20;
  var targetUid = opts.target;
  var fromUid = opts.from;
  var roomId = opts.rid;
  if (targetUid) {
    var projection = {
      $or: [
        {from: targetUid, target: fromUid},
        {target: targetUid, from: fromUid}
      ]
    };
  } else {
    projection = {
      roomId: roomId
    }
  }
  if (msgId) {
    if (opts.navigator) {
      projection['_id'] = {'$gte': msgId}
    } else {
      projection['_id'] = {'$lte': msgId}
    }
  }
  console.log('projection: ', projection);
  this.app.get('mongoClient').model('message')
    .find(projection)
    .sort({date: opts.reverse ? 1 : -1})
    .limit(length)
    .exec(cb)
};

pro.sendMessageToPlayer = function (fromUid, targetUid, data) {
  //utils.invokeCallback(cb);
  this.checkBanUser('global', fromUid)
    .then(function (banStatus) {
      if (!banStatus){
        pomelo.app.get('statusService').getStatusByUid(targetUid, false, function (err, status) {
          if (err) {
            console.log(err);
          }
          else if (status.online) {
            pomelo.app.get('statusService').pushByUids([targetUid], 'chat.chatHandler.send', data);
          }
          var redisClient = pomelo.app.get('redisInfo');
          var promises = [];
          promises.push(redisClient.lremAsync(redisKeyUtil.getUserChatLog(fromUid), 0, targetUid));
          promises.push(redisClient.lremAsync(redisKeyUtil.getUserChatLog(targetUid), 0, fromUid));
          promises.push(redisClient.lpushAsync(redisKeyUtil.getUserChatLog(fromUid), targetUid));
          promises.push(redisClient.lpushAsync(redisKeyUtil.getUserChatLog(targetUid), fromUid));
          Promise.all(promises)
            .then(function (data) {
              // TODO remove some data length
            });
          MessageDao.countUnreadMessage({
            count: 1,
            targetType: consts.TARGET_TYPE.PERSON,
            uid: targetUid,
            fromId: fromUid
          }, function (err, res) {
            if (err) {
              logger.error("message : %s , stack : %s ", err.message, err.stack);
            } else {
            }
          })
        });
      } else {
        utils.invokeCallback(cb, {ec: Code.ON_GAME.FA_CAM_CHAT})
      }
    });
};

pro.sendMessageToGroup = function (fromUid, roomId, data, cb) {
  var members;
  var fails;
  utils.invokeCallback(cb);
  async.waterfall([
    function (done) {
      RoomDao.getMembers(roomId, done)
    },
    function (mems, done) {
      console.log('chat members : ', mems );
      members = mems;
      pomelo.app.get('statusService').pushByUids(members, 'chat.chatHandler.send', data, done)
    },
    function (f, done) {
      console.log(f);
      fails = f;
      pomelo.app.get('statusService').getStatusByUids(members, false, done);
    },
    function (status, done) {
      done()
    }
  ], function (err) {
    if (err) {
      logger.error(err);
    }
  });
};

pro.sendMessageToBoard = function (fromUid, channelName, data, checkBan, cb) {
  var self = this;
  if (typeof checkBan === 'function'){
    cb = checkBan;
    checkBan = null;
  }
  data.content = setContent(data.content);
  if (!checkBan){
    this.checkBanUser([channelName,'global'], fromUid)
      .then(function (banStatus) {
        if (!banStatus){
          self.app.get('globalChannelService').pushMessage('connector', 'chat.chatHandler.send', data, channelName);
        } else {
          return utils.invokeCallback(cb, utils.getError(Code.ON_GAME.FA_CAM_CHAT))
        }
      });
  }else {
    self.app.get('globalChannelService').pushMessage('connector', 'chat.chatHandler.send', data, channelName);
  }
};

pro.banUser = function (channelName, uid, timeRelease, cb) {
  var redisClient = this.app.get('redisCache');
  return redisClient.zaddAsync(redisKeyUtil.getChatChannelBanUserKey(channelName), timeRelease, uid)
    .then(function (res) {
      return utils.invokeCallback(cb, null, res);
    })
    .catch(function (err) {
      return utils.invokeCallback(cb, err);
    })
};

pro.clearBanUser = function (channelName, uid, timeRelease, cb) {
  var redisClient = this.app.get('redisCache');
  return redisClient.zremAsync(redisKeyUtil.getChatChannelBanUserKey(channelName), uid)
    .then(function (res) {
      return utils.invokeCallback(cb, null, res);
    })
    .catch(function (err) {
      return utils.invokeCallback(cb, err);
    })
};

pro.checkBanUser = function (channelName, uid, cb) {
  var redisClient = this.app.get('redisCache');
  channelName = lodash.isArray(channelName) ? channelName : [channelName];
  return Promise.map(channelName, function (name) {
    return redisClient.zscoreAsync(redisKeyUtil.getChatChannelBanUserKey(name), uid)
      .then(function (res) {
        return utils.invokeCallback(cb, null, res);
      })
      .catch(function (err) {
        return utils.invokeCallback(cb, err);
      })
  })
    .then(function (data) {
      for (var i = 0, len = data.length; i < len; i++) {
        if (!lodash.isNaN(parseInt(data[i])) && (!data[i] || Date.now() < parseInt(data[i]))){
          return utils.invokeCallback(cb, null, true);
        }
      }
      return utils.invokeCallback(cb, null, false)
    })
    .catch(function (err) {
      console.error(err);
      return utils.invokeCallback(cb, null, false);
    })
};

pro.destroyChannel = function (channelName) {
  this.app.get('globalChannelService').destroyChannel(channelName);
  this.app.get('redisCache').del(redisKeyUtil.getChatChannelBanUserKey(channelName))
};

function setContent(str) {
  str = str.replace(/<\/?[^>]*>/g, '');
  str = str.replace(/[ | ]*\n/g, '\n');
  return str.replace(/\n[\s| | ]*\r/g, '\n');
}