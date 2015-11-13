/**
 * Created by bi on 09/01/2015.
 */


var async = require('async');
var utils = require('../../../util/utils');
var code = require('../../../consts/code');
var TopDao = require('../../../dao/topDao');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

Handler.prototype.getTop = function (msg, session, next) {
  TopDao.getTop(session.uid, msg.type)
    .then(function(result) {
      return utils.invokeCallback(next, null, result);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(next, null, {ec: code.EC.NORMAL, msg: code.COMMON_LANGUAGE.ERROR});
    });
};