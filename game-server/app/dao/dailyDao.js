/**
 * Created by vietanha34 on 9/23/15.
 */

var pomelo = require('pomelo');
var consts = require('../consts/consts');
var utils = require('../util/utils');
var code = require('../consts/code');
var formula = require('../consts/formula');
var Promise = require('bluebird');
var redisKeyUtil = require('../util/redisKeyUtil');
var lodash = require('lodash');
var moment = require('moment');
var TopupDao = require('../dao/topupDao');
var UserDao = require('../dao/userDao');
var ItemDao = require('../dao/itemDao');
var DailyDao = module.exports;

/**
 * Lẫy dữ liệu điểm danh
 * @param uid
 * @param cb
 * @returns {*}
 */
DailyDao.getData = function getData(uid, cb) {
  var loginCount;

  var redis = pomelo.app.get('redisInfo');
  return redis.hmgetAsync([redisKeyUtil.getPlayerInfoKey(uid), 'dailyReceived', 'loginCount'])
    .then(function(result) {
      if (result[0]) throw new Error('received');

      loginCount = result[1] || 1;

      return [
        redis.hgetallAsync(redisKeyUtil.getDailyConfigKey()),
        UserDao.getUserProperties(uid, ['exp','vipPoint']),
        ItemDao.checkEffect(uid, [consts.ITEM_EFFECT.THE_VIP])
      ];
    })
    .spread(function(config, user, effect) {
      var loginGold = (Number(config.firstLogin)||0) + (loginCount-1)*(Number(config.loginStep)||0);
      var level = formula.calLevel(user.exp||0);
      var levelGold = (Number(config.firstLevel)||0) + (level-1)*(Number(config.levelStep)||0);
      var vip = Math.max(formula.calVipLevel(user.vipPoint||0), effect[consts.ITEM_EFFECT.THE_VIP]);
      var vipPercent = Number(config['vip'+vip])||0;
      var total = Math.round((loginGold + levelGold) * (1+(vipPercent/100)));

      var data = {
        label1: [config.label1, total.toString(), loginCount.toString()],
        label2: config.label2 || '',
        loginGold: loginGold,
        level: level,
        levelGold: levelGold,
        vip: vip,
        vipPercent: vipPercent,
        total: total,
        received: 0
      };

      return utils.invokeCallback(cb, null, data);
    })
    .catch(function(e) {
      e = e.stack || e;
      console.error(e);
      utils.log(e);
      return utils.invokeCallback(cb, null, {received: 1});
    });
};

/**
 * Nhân tiền điểm danh
 * @param uid
 * @param cb
 */
DailyDao.getGold = function getGold(uid, cb) {
  return DailyDao.getData(uid)
    .then(function(data) {
      if (data.received) throw new Error('received');

      return TopupDao.topup({
        uid: uid,
        gold: Number(data.total) || 0,
        type: consts.CHANGE_GOLD_TYPE.DAILY,
        msg: [code.DAILY_LANGUAGE.RECEICE_MONEY, data.total.toString()]
      })
    })
    .then(function(topupResult) {
      if (!topupResult || !topupResult.gold) {
        throw new Error('Lỗi cộng trừ tiền');
      }

      pomelo.app.get('redisInfo').hset(redisKeyUtil.getPlayerInfoKey(uid), 'dailyReceived', '1');

      return utils.invokeCallback(cb, null, {
        gold: Number(topupResult.gold) || 0,
        msg: [code.DAILY_LANGUAGE.RECEICE_MONEY, data.total.toString()]
      });
    })
    .catch(function(e) {
      e = e.stack || e;
      console.error(e);
      utils.log(e);
      return utils.invokeCallback(cb, e);
    });
};

DailyDao.loadConfig = function loadConfig() {
  var mysql = pomelo.app.get('mysqlClient');
  var redis = pomelo.app.get('redisInfo');
  return mysql.sequelize
    .query('SELECT `key`, `value` FROM DailyConfig', {
      type: mysql.sequelize.QueryTypes.SELECT,
      raw: true
    })
    .then(function(list) {
      var config = {};
      for (var i=0; i<list.length; i++) {
        config[list[i].key] = list[i].value;
      }
      redis.hmset(redisKeyUtil.getDailyConfigKey(), config);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
    });
};
