var Code = require('../../../consts/code');
var dispatcher = require('../../../util/dispatcher');
var crc = require('crc');
var utils = require('../../../util/utils');
var consts = require('../../../consts/consts');
var shortId = require('shortid');
var uuid = require('uuid');
var redisKeyUtil = require('../../../util/redisKeyUtil');

/**
 * Gate handler that dispatch user to connectors.
 */
module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

Handler.prototype.getServer = function (msg, session, next) {
  var connectors = this.app.getServersByType('connector');
  if(!connectors || connectors.length === 0) {
    next(null, utils.getError(Code.GATE.FA_NO_CODE_AVAILABLE));
    return;
  }
  var link, type, message;
  if (msg.platform === 'windowphone' && (!msg.versionCode || msg.versionCode < 9061015) && msg.dtid === '1') {
    link = 'https://www.windowsphone.com/en-us/store/app/joka-%C4%91%E1%BA%A5u-tr%C6%B0%E1%BB%9Dng-online/7f83030d-4ebe-43f6-85d6-311889369e7c';
    type = 0;
    message = "JOKA ra bản update: fix lỗi game, bổ sung đấu trường, tránh lag mạng, tải ngay!";
  }
  var idSession = uuid.v4();
  var key = shortId.generate();
  var idSessionKey = redisKeyUtil.getIdSessionKey(idSession);
  var redisCache = this.app.get('redisCache');
  var configService = this.app.get('configService');
  var res = dispatcher.dispatch(Date.now(), connectors, 'web', msg.platform === 'web' ? true : undefined);
  redisCache.set(idSessionKey, key, function (err, result) {
    if (err || !result) {
      next(null, {ec : Code.FAIL})
    }
    else {
      var responseData = {
        ec : Code.OK,
        host : res.clientHost,
        port : res.clientPort.toString(),
        config : configService.getConfig(),
        idSession : idSession,
        key : key,
        msg : message,
        link : link,
        type : type
      };
      next(null, responseData);
      redisCache.expire(idSessionKey, 60 * 60 * 6);
    }
  });
};