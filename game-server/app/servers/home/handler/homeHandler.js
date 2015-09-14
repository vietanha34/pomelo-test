/**
 * Created by KienDT on 12/02/14.
 */

var pomelo = require('pomelo');
var lodash = require('lodash');
var consts = require('../../../consts/consts');
var redisKeyUtil = require('../../../util/redisKeyUtil');
var Promise = require('bluebird');
var MailDao = require('../../../dao/mailDao');
var FriendDao = require('../../../dao/friendDao');
var Code = require('../../../consts/code');
var logger = require('pomelo-logger').getLogger(__filename);
var moment = require('moment');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

Handler.prototype.getHome = function (msg, session, next) {
  Promise.props({
    numInbox: MailDao.getNumUnReadInbox(session.uid),
    numFriend: FriendDao.getCountRequestFriend(session.uid)
  }).then(function (result) {
    var data = {
      langVersion: pomelo.app.get('gameService').langVersion,
      userInfo: {
        fullname: session.get('fullname'),
        username: session.get('username'),
        uid: session.uid,
        gold: session.get('gold')
      },
      regPhone: session.get('phone') ? 0 : 1,
      inbox: result.numInbox || 0,
      friend: result.numFriend || 0,
      count: (result.numInbox + result.numFriend) || 0,
      quickPlay: {
        gameType: consts.POKER_GAME_TYPE,
        limitPot: consts.LIMIT_POT,
        bet: lodash.pluck(pomelo.app.get('gameService').gameConfig, 'bet'),
        numPlayer: consts.NUM_PLAYER
      }
    };
    var hidden = 0;
    if (session.get('platform') === consts.PLATFORM.IOS && pomelo.app.get('hiddenChangeIos') && session.get('version') > '1.0.01'){
      hidden = 1;
    }
    if (session.get('platform') === consts.PLATFORM.ANDROID && pomelo.app.get('hiddenChangeAndroid')){
      hidden = 1;
    }
    data.hidden = hidden;
    next(null, data);
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

Handler.prototype.getNumOnline = function (msg, session, next) {
  this.app.get('redisCache').get(redisKeyUtil.getCcuKey(), function (err, res) {
    next(null, {online: isNaN(parseInt(res)) ? 0 : parseInt(res)});
  })
};