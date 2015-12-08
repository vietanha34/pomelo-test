/**
 * Created by KienDT on 12/02/14.
 */

var pomelo = require('pomelo');
var lodash = require('lodash');
var consts = require('../../../consts/consts');
var redisKeyUtil = require('../../../util/redisKeyUtil');
var Promise = require('bluebird');
var HomeDao = require('../../../dao/homeDao');
var code = require('../../../consts/code');
var logger = require('pomelo-logger').getLogger(__filename);
var utils = require('../../../util/utils');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

/**
 * Lấy thông tin màn hình home
 *
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getHome = function (msg, session, next) {
  HomeDao.getHome({uid: session.uid, langVersion : msg.langVersion})
    .then(function(res) {
      utils.invokeCallback(next, null, res);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      var defaultData = utils.clone(HomeDao.defaultData);
      defaultData.userInfo = HomeDao.defaultUser;
      utils.invokeCallback(next, null, defaultData);
    })
};


Handler.prototype.getLanguage = function (msg, session, next) {
  next(null, this.app.get('gameService').language);
};

Handler.prototype.updateHome = function (msg, session, next) {
  HomeDao.getHome({uid: session.uid, langVersion : msg.langVersion, update: true})
    .then(function(res) {
      utils.invokeCallback(next, null, res);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      utils.invokeCallback(next, null, {userInfo: HomeDao.defaultUser});
    })
};
