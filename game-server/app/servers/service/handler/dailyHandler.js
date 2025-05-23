/**
 * Created by bi on 09/01/2015.
 */


var async = require('async');
var utils = require('../../../util/utils');
var code = require('../../../consts/code');
var DailyDao = require('../../../dao/dailyDao');
var TopupDao = require('../../../dao/topupDao');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

Handler.prototype.getData = function (msg, session, next) {
  DailyDao.getData(session, msg)
    .then(function(result) {
      return utils.invokeCallback(next, null, result);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(next, null, {ec: code.EC.NORMAL, msg: code.COMMON_LANGUAGE.ERROR});
    });
};

Handler.prototype.getGold = function (msg, session, next) {
  DailyDao.getGold(session, msg)
    .then(function(result) {
      return utils.invokeCallback(next, null, result);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(next, null, {ec: code.EC.NORMAL, msg: code.COMMON_LANGUAGE.ERROR});
    });
};

Handler.prototype.getGoldAward = function (msg, session, next) {
  TopupDao.getGoldAward(session.uid, msg.packageId)
    .then(function(result) {
      return utils.invokeCallback(next, null, result);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(next, null, {ec: code.EC.NORMAL, msg: code.COMMON_LANGUAGE.ERROR});
    });
};