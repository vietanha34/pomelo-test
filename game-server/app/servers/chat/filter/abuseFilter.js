var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');
var wordFilter = require('../../../util/wordFilter');
var lodash = require('lodash');
var channelUtil = require('../../../util/channelUtil');
var consts = require('../../../consts/consts');
var util = require('util');

module.exports = function () {
  return new Filter();
};

var Filter = function () {
};

/**
 * Game filter
 */
Filter.prototype.before = function (msg, session, next) {
  if (typeof msg.content === 'string'){
    var word = wordFilter(msg.content, pomelo.app.get('gameService') ? pomelo.app.get('gameService').abuse : {});
    msg.content = word.msg;
    if (word.isChange){
      session.__abuse__ = true;
    }
  }
  next ();
};

Filter.prototype.after = function (err, msg, session, resp, next) {
  if (session.__abuse__) {
    // check nói tục chửi bậy
    var key = 'cothu:abuse:'+session.uid;
    var redisCache = pomelo.app.get('redisCache');
    var fullname = session.get('fullname');
    var uid = session.uid;
    redisCache.getAsync(key)
      .then(function (res) {
        var numAbuse = parseInt(res) || 0;
        numAbuse ++;
        if (numAbuse >= 5){
          var chatService = pomelo.app.get('chatService');
          var targetType = msg.targetType;
          var tableId = session.get('tableId');
          switch (targetType) {
            case consts.TARGET_TYPE.BOARD_GUEST:
            case consts.TARGET_TYPE.BOARD :
              if (tableId) {
                msg.content = util.format('Người chơi "%s" bị cấm chat 30 phút bởi admin do nói tục', fullname);
                pomelo.app.get('chatService').sendMessageToBoard(uid,  channelUtil.getBoardChannelName(tableId), msg, true);
              }
              break;
            case consts.TARGET_TYPE.PERSON:
              break;
            case consts.TARGET_TYPE.GROUP:
              // check contain in group
              break;
            default:
              break;
          }
          chatService.banUser('global', session.uid, Date.now() + 30 * 60 * 1000);
          redisCache.del(key);
        }else {
          numAbuse ++;
          redisCache.set(key, numAbuse);
          redisCache.expire(key, 60 * 60);
        }
      })
  }
  next (err);
};