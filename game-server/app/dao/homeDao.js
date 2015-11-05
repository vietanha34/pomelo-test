/**
 * Created by kiendt on 9/23/15.
 */

var HomeDao = module.exports;
var pomelo = require('pomelo');
var Promise = require('bluebird');
var lodash = require('lodash');
var consts = require('../consts/consts');
var code = require('../consts/code');
var utils = require('../util/utils');
var redisKeyUtil = require('../util/redisKeyUtil');
var NotifyDao = require('./notifyDao');

/**
 *
 * @param params
 * @param cb
 */
HomeDao.getHome = function getHome(params, cb) {
  // todo
};

/**
 * Push thay đổi màn hình home
 * @param uid
 * @param change
 * @param cb
 */
HomeDao.pushInfo = Promise.promisify(function pushInfo(uid, change, cb) {
  if (!change) {
    return utils.invokeCallback(cb, 'invalid params home push info');
  }

  var redis = pomelo.app.get('redisInfo');
  if (uid) {
    var userKey = redisKeyUtil.getPlayerInfoKey(uid);
    if (change.chatCount || change.chatCount===0 || change.friendNotifyCount || change.friendNotifyCount===0) {
      change = JSON.parse(JSON.stringify(change));
      var attr1 = change.chatCount ? 'friendNotifyCount' : 'chatCount';
      var attr2 = change.chatCount ? 'chatCount' : 'friendNotifyCount';
      redis.hget(userKey, attr1, function(e, count) {
        if (e) console.error(e);
        else {
          change.friendCount = Number(change[attr2]) + (count?Number(count):0);
          delete change[attr2];
          pomelo.app.get('statusService')
            .pushByUids([uid], 'home.homeHandler.updateHome', change, function (e, res) {
              if (e) console.error(e);
            });
        }
      });
    }
    else {
      pomelo.app.get('statusService')
        .pushByUids([userId], 'home.homeHandler.updateHome', change, function (e, res) {
          if (e) console.error(e);
        });
    }
    redis.hmset(userKey, change, function(e, res) {
      utils.invokeCallback(cb, e, res);
      if (e) console.error(e);
    });
  }
  else {
    pomelo.app.get('channelService')
      .broadcast('connector', 'home.homeHandler.updateHome', change, {}, function (e, res) {
        if (e) console.error(e);
      });
    var homeKey = HomeDao.redis.getHomeKey();
    HomeDao.homeInfo = HomeDao.homeInfo || {};
    for (var attr in change) {
      HomeDao.homeInfo[attr] = change[attr];
    }
    redis.hmset(homeKey, change, function(e, res) {
      utils.invokeCallback(cb, e, res);
      if (e) console.error(e);
    });
  }
});