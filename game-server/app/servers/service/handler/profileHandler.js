/**
 * Created by KienDT on 12/02/14.
 */

var ProfileDao = require('../../../dao/profileDao');
var utils = require('../../../util/utils');
var consts  = require('../../../consts/consts');
var code = require('../../../consts/code');

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

Handler.prototype.getProfile = function getProfile(msg, session, next) {
  return ProfileDao.getProfile(session.uid)
    .then(function(profile) {
      return utils.invokeCallback(next, null, profile);
    })
    .catch(function(e){
      console.error(e.stack || e);
      return utils.invokeCallback(next, null, {ec: code.EC.NORMAL, msg: code.COMMON_LANGUAGE.ERROR});
    });
};

Handler.prototype.updateProfile = function getProfile(msg, session, next) {
  return ProfileDao.updateProfile(session.uid, msg)
    .then(function(result) {
      return utils.invokeCallback(next, null, result);
    })
    .catch(function(e){
      console.error(e.stack || e);
      return utils.invokeCallback(next, null, {ec: code.EC.NORMAL, msg: code.COMMON_LANGUAGE.ERROR});
    });
};
