/**
 * Created by KienDT on 12/02/14.
 */

var consts = require('../../../consts/consts');
var code = require('../../../consts/code');
var lodash = require('lodash');
var utils = require('../../../util/utils');
var async = require('async');
var FriendDao = require('../../../dao/friendDao');
var util = require('util');
var Promise = require('bluebird');
var logger= require('pomelo-logger').getLogger(__filename);

module.exports = function (app) {
  return new Handler(app)
};

var Handler = function (app) {
  this.app = app;
};

Handler.prototype.request = function request(msg, session, next) {
  FriendDao.request(session.uid, msg.uid)
    .then(function(res) {
      return utils.invokeCallback(next, null, res);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      return utils.invokeCallback(next, null, {ec: code.EC.NORMAL, msg: code.COMMON_LANGUAGE.ERROR});
    });
};

Handler.prototype.reject = function reject(msg, session, next) {
  FriendDao.reject(session.uid, msg.uid)
    .then(function(res) {
      return utils.invokeCallback(next, null, res);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      return utils.invokeCallback(next, null, {ec: code.EC.NORMAL, msg: code.COMMON_LANGUAGE.ERROR});
    });
};

Handler.prototype.getListFriend = function getListFriend(msg, session, next) {
  FriendDao.getFullList(session.uid, 0)
    .then(function(res) {
      return utils.invokeCallback(next, null, res);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      return utils.invokeCallback(next, null, {ec: code.EC.NORMAL, msg: code.COMMON_LANGUAGE.ERROR});
    });
};

Handler.prototype.searchFriend = function searchFriend(msg, session, next) {
  msg.uid = session.uid;
  FriendDao.search(msg)
    .then(function(res) {
      return utils.invokeCallback(next, null, res);
    })
    .catch(function(e) {
      utils.log(e.stack || e);
      console.error(e.stack || e);
      return utils.invokeCallback(next, null, {ec: code.EC.NORMAL, msg: code.COMMON_LANGUAGE.ERROR});
    });
};