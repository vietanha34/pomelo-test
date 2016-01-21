var Code = require('../../../consts/code');
var logger = require('pomelo-logger').getLogger(__filename);
var utils = require('../../../util/utils');
var consts = require('../../../consts/consts');
var redisKeyUtil = require('../../../util/redisKeyUtil');
var channelUtil = require('../../../util/channelUtil');
var RoomDao = require('../../../dao/roomChatDao');
var MessageDao = require('../../../dao/messageDao');
var UserDao = require('../../../dao/userDao');
var FriendDao = require('../../../dao/friendDao');
var Formula = require('../../../consts/formula');
var messageService = require('../../../services/messageService');
var ItemDao = require('../../../dao/itemDao');
var async = require('async');
var Promise = require('bluebird');
var pomelo = require('pomelo');

module.exports = function (app) {
  return new Handler(app, app.get('chatService'));
};

var Handler = function (app, chatService) {
  this.app = app;
  this.chatService = chatService;
};

Handler.prototype.send = function (msg, session, next) {
  var self = this;
  var uid = session.uid;
  var fullname = session.get('fullname');
  var uids = { uid : session.uid, sid : session.frontendId};
  var vipPoint = session.get('vipPoint');
  var route = msg.__route__;
  var sendDate = msg.date || Math.round(Date.now() /1000);
  next();
  if (!msg.content && !msg.target && !msg.type) {
    messageService.pushMessageToPlayer(uids, msg.__route__, { ec : Code.FAIL, msg : 'invalid params'});
    return;
  }
  msg.from = uid;
  var targetType = msg.targetType;
  var tableId = session.get('tableId');
  async.waterfall([
    function (done) {
      // checking contain in group, board;
      switch (targetType) {
        case consts.TARGET_TYPE.BOARD :
          if (tableId) {
            done(null, true)
          } else {
            done({ec: Code.FAIL})
          }
          break;
        case consts.TARGET_TYPE.PERSON:
          //FriendDao.isFriend(uid, msg.target, done);
          done(null, true);
          // check invalid person, person is friend
          break;
        case consts.TARGET_TYPE.GROUP:
          // check contain in group
          done(null, true);
          break;
        case consts.TARGET_TYPE.BOARD_GUEST:
          if (tableId) {
            ItemDao.checkEffect(uid, [consts.ITEM_EFFECT.LUAN_CO, consts.ITEM_EFFECT.THE_VIP])
              .then(function (effect) {
                if (!effect[consts.ITEM_EFFECT.LUAN_CO] && (!effect[consts.ITEM_EFFECT.THE_VIP] && !Formula.calVipLevel(vipPoint))){
                  return done({ec: Code.FAIL, msg : 'Bạn cần có vật phẩm luận cờ để có thể tán gẫu trong bàn chơi'})
                }else {
                  done(null, true)
                }
              });
          } else {
            done({ec: Code.FAIL, msg : 'Bạn đang không ở trong bàn chơi'})
          }
          break;
        default:
          done({ec: Code.FAIL});
      }
    },
    function (valid, done) {
      if (!valid) {
        done({ec : Code.CHAT.FA_USER_NOT_FRIEND})
      }else
      if (targetType !== consts.TARGET_TYPE.BOARD && targetType !== consts.TARGET_TYPE.BOARD_GUEST) {
        msg.date = new Date();
        self.chatService.createMessage(msg, done);
      }else {
        done (null, msg)
      }
    },
    function (message, done) {
      var data = {
        msgId: message._id,
        from: uid,
        fullname : fullname,
        type: message.type || 0,
        content: message.content,
        date: sendDate || Math.round(Date.now() / 1000),
        target: message.target,
        targetType: message.targetType,
        status: 0
      };
      switch (targetType) {
        case consts.TARGET_TYPE.BOARD :
          self.chatService.sendMessageToBoard(uid,  channelUtil.getBoardChannelName(tableId), data, done);
          return;
        case consts.TARGET_TYPE.BOARD_GUEST:
          return self.chatService.sendMessageToBoard(uid, channelUtil.getBoardGuestChannelName(tableId), data, done);
        case consts.TARGET_TYPE.PERSON:
          self.chatService.sendMessageToPlayer(uid, msg.target, data, done);
          messageService.pushMessageToPlayer(uids, route, data);
          return;
        case consts.TARGET_TYPE.GROUP:
          self.chatService.sendMessageToGroup(uid, msg.target, data, done);
          return
      }
    }
  ], function (err) {
    if (err) {
      messageService.pushMessageToPlayer({ uid : session.uid, sid : session.frontendId}, msg.__route__, { ec : err.ec || Code.FAIL, msg: err.msg || [Code.FAIL]});
    }
    msg = null;
  });
};

Handler.prototype.getHistory = function (msg, session, next) {
  msg.from = parseInt(session.uid);
  pomelo.app.get('chatService').getMessages(msg, function (err, msgs) {
    if (err) {
      next(null, {ec: Code.FAIL})
    } else {
      var results = [];
      for (var i = 0, len = msgs.length; i < len; i++) {
        var msg = msgs[i];
        results.push(msg.getInfo());
      }
      next(null, { msg : results});
      if (msg){
        MessageDao.unCountUnreadMessage({
          targetType: consts.TARGET_TYPE.PERSON,
          uid: msg.target,
          fromId: msg.from
        });
      }
      msg = null;
    }
  })
};

Handler.prototype.getChatLog = function (msg, session, next) {
  var uid = parseInt(session.uid);
  var redisClient = pomelo.app.get('redisInfo');
  var getMessages = Promise.promisify(pomelo.app.get('chatService').getLastMessage, pomelo.app.get('chatService'));
  redisClient.lrangeAsync(redisKeyUtil.getUserChatLog(uid), 0, 15)
    .map(function (targetUid) {
      return Promise.props({
        info : UserDao.getUserProperties(targetUid, ['uid', 'avatar', 'fullname','sex']),
        msg : getMessages({length:1, from : uid, target: parseInt(targetUid), reverse : 1}),// lastMessage
        count : MessageDao.getCountUnReadMessageByUid({ targetType : consts.TARGET_TYPE.PERSON, uid : uid, fromId : targetUid})
      })
    })
    .then(function (results) {
      for (var i = 0, len = results.length; i< len; i++){
        results[i].info.avatar = utils.JSONParse(results[i].info.avatar, {});
        results[i].msg = results[i].msg[0] ? results[i].msg[0].content || '' : '';
        results[i].count = results[i].count || 0
      }
      next(null, {data : results});
    })
};

Handler.prototype.updateStatus = function (msg, session, next) {
  var msgId = msg.msgId;
  var status = msg.status;
  var uid = session.uid;
  pomelo.app.get('chatService').getMessage(msg.msgId, function (err, msg) {
    if (err) {
      console.log(err);
      next(null, {ec: Code.FAIL})
    }
    else if (msg) {
      if (uid.toString() !== msg.target) {
        next(null, {ec: Code.FAIL})
      } else {
        next(null, {});
        msg.status = status;
        pomelo.app.get('chatService').updateMessage(msg._id, msg);
        MessageDao.unCountUnreadMessage({
          targetType: consts.TARGET_TYPE.PERSON,
          uid: uid,
          fromId: msg.from
        });
        pomelo.app.get('statusService').pushByUids([msg.from], 'chat.chatHandler.updateStatus', {msgId: msgId, status: status})
      }
    } else {
      next(null, {ec: Code.FAIL})
    }
  });
};

