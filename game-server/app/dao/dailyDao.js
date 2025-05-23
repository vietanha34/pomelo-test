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
 * @param session
 * @param cb
 * @returns {*}
 */
DailyDao.getData = function getData(session, msg, cb) {
  var uid = session.uid
  var platform = session.get('platform')
  var loginCount;

  var redis = pomelo.app.get('redisInfo');
  return redis.hmgetAsync([redisKeyUtil.getPlayerInfoKey(uid), 'dailyReceived', 'loginCount', 'location'])
    .then(function(result) {
      //console.error('DailyDao.getData: ', msg, platform, result);
      if (platform !== consts.PLATFORM_ENUM.WEB && !msg.instant) {
        if ((result[2] && result[2] !== 'VN')) return Promise.reject({});
      }

      if (result[0]) {
        return Promise.reject()
      }

      loginCount = result[1] || 1;

      return [
        redis.hgetallAsync(redisKeyUtil.getDailyConfigKey()),
        UserDao.getUserProperties(uid, ['exp','vipPoint']),
        ItemDao.checkEffect(uid, [consts.ITEM_EFFECT.THE_VIP]),
        pomelo.app.get('mysqlClient').Achievement.findOne({where: {uid: uid}, attributes: ['userCount']})
      ];
    })
    .spread(function(config, user, effect, achie) {
      var level = formula.calLevel(user.exp||0);
      if (achie.userCount > 3 && level < 1 && !msg.instant) {
        return utils.invokeCallback(cb, null, {received: 1});
      }
      var loginGold = (Number(config.firstLogin)||0) + (loginCount-1)*(Number(config.loginStep)||0);
      var levelGold = (Number(config.firstLevel)||0) + (level-1)*(Number(config.levelStep)||0);
      var vip = Math.max(formula.calVipLevel(user.vipPoint||0), (effect[consts.ITEM_EFFECT.THE_VIP]||0));
      var vipPercent = Number(config['vip'+vip])||0;
      var total = Math.round((loginGold + levelGold) * (1+(vipPercent/100)));

      var data = {
        label1: [config.label1, total.toString(), (loginCount==1?'đầu tiên':('thứ '+loginCount.toString()))],
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
      if (lodash.isError(e)){
        console.error('DailyDao.getData : ', e.stack || e);
        utils.log(e.stack || e);
      }
      return utils.invokeCallback(cb, null, {received: 1});
    });
};

/**
 * Nhân tiền điểm danh
 * @param session
 * @param cb
 */
DailyDao.getGold = function getGold(session, msg, cb) {
  var uid = session.uid
  return DailyDao.getData(session, msg)
    .then(function(data) {
      if (data.received) throw new Error('received');
      var goldAdd = Number(data.total) || 0
      goldAdd = msg['x2'] ? goldAdd * 2 : goldAdd
      return TopupDao.topup({
        uid: uid,
        gold: goldAdd,
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
        dailyReceived: 1,
        msg: [code.DAILY_LANGUAGE.RECEICE_MONEY, topupResult.addGold.toString()]
      });
    })
    .catch(function(e) {
      console.error('DailyDao.getGold : ', e);
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
      console.error('DailyDao.loadConfig : ', e.stack || e);
      utils.log(e.stack || e);
    });
};
