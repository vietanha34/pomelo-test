"use strict"
var Code = require('../../../consts/code');
var dispatcher = require('../../../util/dispatcher');
var crc = require('crc');
var utils = require('../../../util/utils');
var consts = require('../../../consts/consts');
var shortId = require('shortid');
var uuid = require('uuid');
var redisKeyUtil = require('../../../util/redisKeyUtil');
var pomelo = require('pomelo');

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
  var configService = this.app.get('configService');
  //if (msg.platform === 'ios' && [4022016].indexOf(msg.versionCode) > -1){
  //  var config = configService.getConfig();
  //  config['IS_REVIEW'] = 1;
  //  // trỏ sang server test
  //  return next(null, {
  //    ec : Code.OK,
  //    host : '123.30.235.196',
  //    port : '6511',
  //    config : config,
  //    idSession : '362a5477-3658-4b80-bba8-9d510b84b4f2',
  //    key : '41jw5tq'
  //  })
  //}
  msg.versionCode = msg.versionCode ? msg.versionCode.toString() : '';
  msg.versionCode = msg.versionCode.length === 7 ? '0' + msg.versionCode : msg.versionCode;
  var version = '' + msg.versionCode.slice(4,10) + msg.versionCode.slice(2,4) + msg.versionCode.slice(0,2);
  if (version < '20151210' && this.app.get('beta') && version !== '20150118'){
    next(null, { ec: Code.FAIL, msg : "Chương trình beta cờ thủ đã kết thúc. Bạn có thể cập nhật phần mềm để có những tính năng mới nhất"})
  }
  if (msg.platform === consts.PLATFORM_ENUM.WEB) {
    var connector = connectors.map(function (con) {
      return {
        host: con.privateHost || con.host,
        port: con.clientPort
      }
    });
    return next(null, {
      connector: connector,
      config: configService.getConfig(),
      key: this.app.get('encryptConfig').key
    })
  }

  var link, type, message;
  var idSession = uuid.v4();
  var key = shortId.generate();
  var idSessionKey = redisKeyUtil.getIdSessionKey(idSession);
  var redisCache = this.app.get('redisCache');
  var res = dispatcher.dispatch(Date.now(), connectors, 'web', msg.platform === 'web' ? true : undefined);
  redisCache.set(idSessionKey, key, function (err, result) {
    if (err || !result) {
      next(null, {ec : Code.FAIL})
    }
    else {
      var config = utils.clone(configService.getConfig());
      if (msg.packageName === 'com.thudojsc.CoThu'){
        config['IS_REVIEW'] = 1;
        pomelo.app.get('redisCache')
          .set(redisKeyUtil.getIsReviewVersion(version), 1);
        pomelo.app.get('redisCache')
          .expire(redisKeyUtil.getIsReviewVersion(version), 3600);
      }
      var responseData = {
        ec : Code.OK,
        host : res.clientHost,
        port : res.natPort ? res.natPort.toString() : res.clientPort.toString(),
        config : config,
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