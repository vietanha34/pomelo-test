/**
 * Created by bi on 09/01/2015.
 */


var async = require('async');
var utils = require('../../../util/utils');
var code = require('../../../consts/code');
var ItemDao = require('../../../dao/itemDao');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

Handler.prototype.getShop = function (msg, session, next) {
  ItemDao.getItems(session.uid, 0)
    .then(function(result) {
      return utils.invokeCallback(next, null, result);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(next, null, {ec: code.EC.NORMAL, msg: code.COMMON_LANGUAGE.ERROR});
    });
};

Handler.prototype.getTrunk = function (msg, session, next) {
  ItemDao.getItems(session.uid, 1)
    .then(function(result) {
      return utils.invokeCallback(next, null, result);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(next, null, {ec: code.EC.NORMAL, msg: code.COMMON_LANGUAGE.ERROR});
    });
};

Handler.prototype.buy = function (msg, session, next) {
  ItemDao.buy(session.uid, msg.itemId, msg.duration)
    .then(function(result) {
      return utils.invokeCallback(next, null, result);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(next, null, {ec: code.EC.NORMAL, msg: code.COMMON_LANGUAGE.ERROR});
    });
};