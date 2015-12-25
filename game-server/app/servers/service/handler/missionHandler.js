/**
 * Created by bi on 09/01/2015.
 */


var async = require('async');
var utils = require('../../../util/utils');
var code = require('../../../consts/code');
var MissionDao = require('../../../dao/missionDao');
var consts = require('../../../consts/consts');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

Handler.prototype.getMissions = function (msg, session, next) {
  MissionDao.getMissions(session.uid)
    .then(function(result) {
      return utils.invokeCallback(next, null, result);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(next, null, {list: []});
    });
};

Handler.prototype.doMission = function (msg, session, next) {
  MissionDao.doMission(session.uid, msg.effect)
    .then(function(result) {
      return utils.invokeCallback(next, null, result);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(next, null, {ec: 0});
    });
};

Handler.prototype.inviteSocial = function (msg, session, next) {
  MissionDao.inviteSocial(session.uid, msg.friends)
    .then(function(result) {
      return utils.invokeCallback(next, null, result);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(next, null, {ec: 0});
    });
};