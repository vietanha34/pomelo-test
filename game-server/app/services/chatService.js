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
//var HomeDao = require('../dao/homeDao');


var ChatService = function(app, opts) {
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
ChatService.prototype.pushByRoomId = function(channelName, route ,msg, cb) {
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
  this.app.get('mongoClient').model('message').update({ id : message.id}, message, cb)
};

pro.getMessage = function (msgId, cb) {
  this.app.get('mongoClient').model('message').findOne({ _id : msgId}, cb)
};

pro.getFirstMessage = function (opts, cb) {
  var length = opts.length || 20;
  var target = opts.target;
  var from = opts.from;
  var roomId = opts.roomId;
  var targetType = opts.targetType;
  var projection;
  if (targetType == consts.TARGET_TYPE.GROUP) {
    projection = {
      roomId : roomId
    }
  }else {
    projection = {
      $or : [
        { from :target, target : from},
        { target : target, from : from}
      ]
    }
  };
  this.app.get('mongoClient').model('message').find(projection)
    .sort({ date : 1})
    .limit(length)
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
      $or : [
        { from :targetUid, target : fromUid},
        { target : fromUid, from : targetUid}
      ]
    };
  }else {
    projection = {
      roomId : roomId
    }
  }
  if (msgId) {
    if (opts.navigator) {
      projection['_id'] = { '$gte' : msgId}
    }else {
      projection['_id'] = { '$lte' : msgId}
    }
  }
  this.app.get('mongoClient').model('message').find(projection)
    .sort({ date : -1})
    .limit(length)
    .exec(cb)
};

pro.sendMessageToPlayer = function (fromUid, targetUid, data) {
  //utils.invokeCallback(cb);
  pomelo.app.get('statusService').getStatusByUid(targetUid, false, function (err, status) {
    if (err) {
      console.log(err);
    }
    else if (status.online) {
      pomelo.app.get('statusService').pushByUids([targetUid], 'chat.chatHandler.send', data);
    }
    MessageDao.countUnreadMessage({
      count : 1,
      targetType : consts.TARGET_TYPE.PERSON,
      uid : targetUid,
      fromId : fromUid
    }, function (err, res) {
      if (err) {
        logger.error("message : %s , stack : %s ",err.message, err.stack);
      }else {
        //HomeDao.pushInfo(targetUid, { chatCount : res}, function () {
        //
        //});
      }
    })
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
      members = mems;
      pomelo.app.get('statusService').pushByUids(members, 'chat.chatHandler.send', data, done)
    },
    function (f, done) {
      console.log(f);
      fails = f;
      pomelo.app.get('statusService').getStatusByUids(members,false, done);
    },
    function (status, done) {
      for(var key in status){
        var stat = status[key];
        var targetUid = key;
        if (!stat.online) {
          MessageDao.countUnreadMessage({
            count : 1,
            targetType : consts.TARGET_TYPE.GROUP,
            uid : targetUid,
            fromId : roomId
          })
        }
      }
      done()
    }
  ], function (err) {
    if (err) {
      logger.error(err);
    }
  });
};

pro.sendMessageToBoard = function (fromUid, channelName, data, cb) {
  var self = this;
  data.content = setContent(data.content);
  this.checkBanUser(channelName, fromUid, function (err, exists) {
    if (!exists) {
      self.app.get('globalChannelService').pushMessage('connector', 'chat.chatHandler.send', data, channelName);
    }else {
      utils.invokeCallback(cb, { ec : Code.ON_GAME.FA_CAM_CHAT})
    }
  });
};

pro.banUser = function (channelName, uid, cb) {
  var redisClient = this.app.get('redisCache');
  redisClient.sadd(redisKeyUtil.getChatChannelBanUserKey(channelName), uid, function (err, res) {
    utils.invokeCallback(cb, err, res)
  })
};

pro.clearBanUser = function (channelName, uid, cb) {
  var redisClient = this.app.get('redisCache');
  redisClient.srem(redisKeyUtil.getChatChannelBanUserKey(channelName), uid, function (err, res) {
    utils.invokeCallback(cb, err, res)
  })
};

pro.checkBanUser = function (channelName, uid, cb) {
  var redisClient = this.app.get('redisCache');
  redisClient.sismember(redisKeyUtil.getChatChannelBanUserKey(channelName), uid, function (err, res) {
    utils.invokeCallback(cb, err, res)
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