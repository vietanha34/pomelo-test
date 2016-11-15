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
var UserDao = require('../dao/userDao');
var ItemDao = require('../dao/itemDao');
var PaymentDao = module.exports;

PaymentDao.getExtra = function getExtra(params, cb) {
  var redis = pomelo.app.get('redisInfo');
  return Promise.all([
    redis.hgetallAsync(redisKeyUtil.getPaymentConfigKey()),
    PaymentDao.getPromotionSDK(params)
  ])
    .spread(function(config, sdkPromotions) {
      config.sms = config.sms || '';
      config.card = config.card || '';
      config.iap = config.iap || '';
      config.sub = config.sub || '';

      config.sms = config.sms.split("\r\n");
      config.card = config.card.split("\r\n");
      config.iap = config.iap.split("\r\n");
      config.sub = config.sub.split("\r\n");

      sdkPromotions.forEach(function(promotion) {
        if (promotion.type && config[promotion.type]) {
          config[promotion.type].unshift('+ '+promotion.percent+'% '+promotion.reason.vi);
        }
        else if (promotion.type == 'all') {
          var txt = '+ '+promotion.percent+'% '+promotion.reason.vi;
          config.sms.unshift(txt);
          config.card.unshift(txt);
          config.iap.unshift(txt);
          config.sub.unshift(txt);
        }
      });

      return utils.invokeCallback(cb, null, config);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb, null, {});
    })
};

/**
 *
 * @param uid
 * @param cb
 */
PaymentDao.getPromotion = function getPromotion(uid, cb) {
  var promotion = {
    sms: {'0': 0},
    card: {'0': 0},
    iap: {'0': 0},
    bank: {'0': 0},
    sub: {'0': 0}
  };

  return Promise.all([
    UserDao.getUserProperties(uid, ['hasPay', 'vipPoint']),
    pomelo.app.get('redisInfo').multi()
      .hmget([redisKeyUtil.getPlayerInfoKey(uid), 'todaySms', 'todayCard', 'todayPromotion'])
      .hgetall([redisKeyUtil.getDailyConfigKey()])
      .execAsync(),
    ItemDao.checkEffect(uid, [consts.ITEM_EFFECT.THE_VIP])
  ])
    .spread(function(user, results, effect) {
      var userInfo = results[0] || [];
      var vipLevel = formula.calVipLevel(user.vipPoint||0);
      vipLevel = Math.max(vipLevel,(effect[consts.ITEM_EFFECT.THE_VIP] || 0));
      var todaySms = (Number(userInfo[0]) || 0) + 1;
      var todayCard = (Number(userInfo[1]) || 0) + 1;
      var todayPromotion = (Number(userInfo[2]) || 0);
      var config = results[1] || {};

      if (!user.hasPay) {
        var firstBonus = (Number(config.firstTopup) || 0);
        promotion.sms['0'] += firstBonus;
        promotion.card['0'] += firstBonus;
        promotion.iap['0'] += firstBonus;
        promotion.bank['0'] += firstBonus;
      }

      if (vipLevel) {
        var vipBonus = (Number(config['vip'+vipLevel] || 0) || 0);
        promotion.sms['0'] += vipBonus;
        promotion.card['0'] += vipBonus;
        promotion.iap['0'] += vipBonus;
        promotion.bank['0'] += vipBonus;
      }

      var freePromotion = pomelo.app.get('configService').getConfig().freePromotion;

      if (freePromotion && todayPromotion == 1) {
        promotion.sms['0'] += freePromotion;
        promotion.card['0'] += freePromotion;
        promotion.iap['0'] += freePromotion;
        promotion.bank['0'] += freePromotion;
      }

      if (todaySms >= 3) promotion.sms['0'] += (Number(config.sms3) || 0);
      else if (todaySms >= 2) promotion.sms['0'] += (Number(config.sms2) || 0);

      if (todayCard >= 3) promotion.card['0'] += (Number(config.card3) || 0);
      else if (todayCard >= 2) promotion.card['0'] += (Number(config.card2) || 0);

      return utils.invokeCallback(cb, null, promotion);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack | e);
      return utils.invokeCallback(cb, null, promotion);
    });
};

/**
 *
 * @param uid
 * @param type (1:card, 2:sms, 3: iap, 4:bank, 5:sub)
 * @param cb
 */
PaymentDao.getPromotionByType = function getPromotion(uid, type, cb) {
  if (!uid || !type) {
    return utils.invokeCallback(cb, null, 'invalid params get promotion');
  }

  if (type == consts.TOPUP_TYPE.SUB)
    return utils.invokeCallback(cb, null, 0);

  return Promise.all([
    UserDao.getUserProperties(uid, ['hasPay', 'vipPoint']),
    pomelo.app.get('redisInfo').multi()
      .hmget([redisKeyUtil.getPlayerInfoKey(uid), 'todaySms', 'todayCard', 'todayPromotion'])
      .hgetall([redisKeyUtil.getDailyConfigKey()])
      .execAsync(),
    ItemDao.checkEffect(uid, [consts.ITEM_EFFECT.THE_VIP])
  ])
    .spread(function(user, results, effect) {
      var userInfo = results[0] || [];
      var vipLevel = formula.calVipLevel(user.vipPoint||0);
      vipLevel = Math.max(vipLevel,(effect[consts.ITEM_EFFECT.THE_VIP] || 0));
      var todaySms = (Number(userInfo[0]) || 0) + 1;
      var todayCard = (Number(userInfo[1]) || 0) + 1;
      var todayPromotion = (Number(userInfo[2]) || 0);
      var config = results[1] || {};
      var rate = 0;

      if (!user.hasPay) rate += (Number(config.firstTopup) || 0);

      if (vipLevel) rate += (Number(config['vip'+vipLevel] || 0) || 0);

      var freePromotion = pomelo.app.get('configService').getConfig().freePromotion;

      if (freePromotion && todayPromotion == 1) {
        rate += freePromotion;
      }

      if (type == consts.TOPUP_TYPE.SMS || type == consts.TOPUP_TYPE.IAP) {
        if (todaySms >= 3) rate += (Number(config.sms3) || 0);
        else if (todaySms >= 2) rate += (Number(config.sms2) || 0);
      }
      else if (type == consts.TOPUP_TYPE.CARD) {
        if (todayCard >= 3) rate += (Number(config.card3) || 0);
        else if (todayCard >= 2) rate += (Number(config.card2) || 0);
      }

      pomelo.app.get('redisInfo').hset(redisKeyUtil.getPlayerInfoKey(uid), 'todayPromotion', '2');

      return utils.invokeCallback(cb, null, rate);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack | e);
      return utils.invokeCallback(cb, null, 0);
    })
};

PaymentDao.getPromotionSDK = function getPromotionSDK(user, cb) {
  if (!user.uid && (!user.username)) {
    return utils.invokeCallback(cb, null, 'invalid params get promotion sdk');
  }

  var redisPayment = pomelo.app.get('redisPayment');

  var promotions = [];
  var promotionKey = ['paymentsdk','promotion',consts.PARTNER_ID,consts.PR_ID,'*'].join(':');
  return redisPayment.keysAsync(promotionKey)
    .each(function(key) {
      return redisPayment.hgetallAsync(key)
        .then(function(promotionObj) {
          // todo blacklist and whitelist

          var dtId = '1_'+(user.dtId||'1');
          var percent = promotionObj.rate;
          if (promotionObj.distributor) {
            promotionObj.distributor = utils.JSONParse(promotionObj.distributor, {});
            percent = promotionObj.distributor[dtId] || percent;
          }

          promotions.push({
            percent: Number(percent) || 0,
            reason: utils.JSONParse(promotionObj.display, ''),
            type: key.split(':').pop()
          });
        });
    })
    .then(function() {
      return utils.invokeCallback(cb, null, promotions);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb, null, []);
    });
};

PaymentDao.loadConfig = function loadConfig() {
  var mysql = pomelo.app.get('mysqlClient');
  var redis = pomelo.app.get('redisInfo');
  return mysql.sequelize
    .query('SELECT `key`, `value` FROM PaymentConfig', {
      type: mysql.sequelize.QueryTypes.SELECT,
      raw: true
    })
    .then(function(list) {
      var config = {};
      for (var i=0; i<list.length; i++) {
        config[list[i].key] = list[i].value;
      }
      redis.hmset(redisKeyUtil.getPaymentConfigKey(), config);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
    });
};
