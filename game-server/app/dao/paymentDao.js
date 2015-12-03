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

      config.sms = config.sms.split("\n");
      config.card = config.card.split("\n");
      config.iap = config.iap.split("\n");
      config.sub = config.sub.split("\n");

      sdkPromotions.forEach(function(promotion) {
        if (promotion.type && config[promotion.type]) {
          config[promotion.type].unshift('+ '+promotion.percent+'% '+promotion.reason.vi);
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
  // todo

  return utils.invokeCallback(cb, null, {
    sms: {'0': 0},
    card: {'0': 0},
    iap: {'0': 0},
    bank: {'0': 0},
    sub: {'0': 0}
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

  // todo

  return utils.invokeCallback(cb, null, 0);
};

PaymentDao.getPromotionSDK = function getPromotionSDK(user, cb) {
  if (!user.uid && (!user.username)) {
    return utils.invokeCallback(cb, null, 'invalid params get promotion sdk');
  }

  var redisPayment = pomelo.app.get('redisPayment');

  var promotions = [];
  var promotionKey = ['paymentsdk','promotion',1,3,'*'].join(':');
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
