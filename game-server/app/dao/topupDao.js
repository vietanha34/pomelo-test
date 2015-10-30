/**
 * Created by kiendt on 9/23/15.
 */

var TopupDao = module.exports;
var pomelo = require('pomelo');
var Promise = require('bluebird');
var lodash = require('lodash');
var consts = require('../consts/consts');
var utils = require('../util/utils');
var redisKeyUtil = require('../util/redisKeyUtil');
var NotifyDao = require('./notifyDao');

/**
 * Cộng trừ tiền
 * @param params
 *  uid
 *  gold
 *  type
 *  msg
 * @param cb
 */
TopupDao.topup = function topup(params, cb) {
  if (!params.uid || !params.gold || !params.type || !params.msg) {
    return utils.invokeCallback(cb, 'invalid param topup');
  }

  try {
    if (params.gold > 0) {
      return Promise.promisify(pomelo.app.rpc.manager.paymentRemote.addBalance)
        ({uid: params.uid}, params, function (e, res) {
          res = res || {};
          res.addGold = params.gold;
          return utils.invokeCallback(cb, e, res);
        });
    }
    else {
      params.gold = Math.abs(params.gold);
      return Promise.promisify(pomelo.app.rpc.manager.paymentRemote.subBalance)
        ({uid: params.uid}, params, function (e, res) {
          res = res || {};
          res.subGold = -params.gold;
          return utils.invokeCallback(cb, e, res);
        });
    }
  }
  catch (e) {
    console.error(e.stack || e);
    return utils.invokeCallback(cb, e.stack || e, null);
  }
};

/**
 * Push gold cho user
 * @param params
 *  uid
 *  type
 *  gold
 *  msg
 *  title
 * @param cb
 */
TopupDao.pushGoldAward = function pushGoldAward(params, cb) {
  if (!params.uid || !params.gold || !params.type || !params.msg) {
    return utils.invokeCallback(cb, 'invalid param topup');
  }

  params.title = params.title || params.msg;

  var packageId = params.type+':'+Date.now()+lodash.random(0,1000);

  var redis = pomelo.app.get('redisService');
  return redis.hsetAsync(redisKeyUtil.getUserGoldKey(params.uid), packageId, params.gold)
    .then(function(){
      return NotifyDao.push({
        type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
        title: params.title,
        msg: params.msg,
        buttonLabel: 'Nhận',
        command: {target: consts.NOTIFY.TARGET.GET_GOLD, extra: packageId},
        scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
        users: [params.uid],
        image:  consts.NOTIFY.IMAGE.GOLD
      });
    })
    .then(function(){
      return redis.hsetAsync(redisKeyUtil.getUserNotifyKey(params.uid), packageId, JSON.stringify({
        title: title,
        msg: msg
      }));
    })
    .then(function(){
      return utils.invokeCallback(cb);
    })
    .catch(function(e){
      console.error(e.stack || e);
      return utils.invokeCallback(cb, e.stack || e);
    });
};
