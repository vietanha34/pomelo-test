/**
 * Created by KienDT on 12/02/14.
 */

var SDKService = require('../../../services/sdkService');
var utils = require('../../../util/utils');
var consts  = require('../../../consts/consts');
var code = require('../../../consts/code');

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

Handler.prototype.sdk = function sdk(msg, session, next) {
  return SDKService.forward(msg)
    .then(function(rs) {
      return utils.invokeCallback(next, null, {type: msg.type, data: rs});
    })
    .catch(function(e) {
      console.error(e.stack || e);
      return utils.invokeCallback(next, null, {ec: code.EC.NORMAL, msg: code.COMMON_LANGUAGE.ERROR});
    });
};