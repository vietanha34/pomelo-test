/**
 * Created by KienDT on 12/02/14.
 */

var pomelo = require('pomelo');
var lodash = require('lodash');
var consts = require('../../../consts/consts');
var redisKeyUtil = require('../../../util/redisKeyUtil');
var Promise = require('bluebird');
var NewsDao = require('../../../dao/newsDao');
var Code = require('../../../consts/code');
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
  var self = this;
  Promise.props({
    newCount: NewsDao.getNumNewsUnreadByUserId(session.uid),
    notifyCount: NewsDao.getNumNewsUnreadByUserId(session.uid)
  })
    .then(function (result) {
      var data = {
        userInfo: {
          fullname: session.get('fullname'),
          avatar : session.get('username'),
          uid: session.uid,
          gold: session.get('gold'),
          level : session.get('level'),
          exp : [0,1000] // TODO change
        },
        game : [
          {gameId : 1, status : 1},
          {gameId : 2, status : 1},
          {gameId : 3, status : 1},
          {gameId : 4, status : 1},
          {gameId : 5, status : 1},
          {gameId : 6, status : 1}
        ]
      };
      if (msg.langVersion !== self.app.get('gameService').langVersion) data.language = self.app.get('gameService').language
      result = utils.merge_options(result, data);
      next(null, result);
    })
    .catch(function (err) {
      console.error('err : ', err);
    })
    .finally(function () {
      session = null;
    })
};


Handler.prototype.getLanguage = function (msg, session, next) {
  next(null, this.app.get('gameService').language);
};

Handler.prototype.updateHome = function (msg, session, next) {
  return next(null, {})
};
