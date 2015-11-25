var Code = require('../../../consts/code');
var logger = require('pomelo-logger').getLogger(__filename);
var utils = require('../../../util/utils');
var consts = require('../../../consts/consts');
var redisKeyUtil = require('../../../util/redisKeyUtil');
var channelUtil = require('../../../util/channelUtil');
var RoomDao = require('../../../dao/roomChatDao');
var MessageDao = require('../../../dao/messageDao');
var FriendDao = require('../../../dao/friendDao');
var messageService = require('../../../services/messageService');
var async = require('async');
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
  var uids = { uid : session.uid, sid : session.frontendId};
  var route = msg.__route__;
  var sendDate = msg.date || Date.now();
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
            done(null, true)
          } else {
            console.log('Người chơi đang k ở trong bàn chơi : ', tableId);
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
        self.chatService.createMessage(msg, done);
      }else {
        done (null, msg)
      }
    },
    function (message, done) {
      var data = {
        msgId: message._id,
        from: uid,
        fname : msg.fname,
        type: message.type || 0,
        content: message.content,
        date: sendDate || Date.now(),
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
      messageService.pushMessageToPlayer({ uid : session.uid, sid : session.frontendId}, msg.__route__, utils.getError(err.ec || Code.FAIL));
    }
    msg = null;
  });
};

Handler.prototype.getHistory = function (msg, session, next) {
  var uid = session.uid;
  msg.from = session.uid;
  pomelo.app.get('chatService').getMessages(msg, function (err, msgs) {
    if (err) {
      next(null, {ec: Code.FAIL})
    }
    else {
      var results = [];
      for (var i = 0, len = msgs.length; i < len; i++) {
        var msg = msgs[i];
        results.push(msg.getInfo());
      }
      next(null, { msg : results});
      MessageDao.unCountUnreadMessage({
        targetType: consts.TARGET_TYPE.PERSON,
        uid: uid,
        fromId: uid
      });
      msg = null;
    }
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

