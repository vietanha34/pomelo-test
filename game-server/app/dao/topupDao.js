/**
 * Created by kiendt on 9/23/15.
 */

var TopupDao = module.exports;
var pomelo = require('pomelo');
var Promise = require('bluebird');
var lodash = require('lodash');
var consts = require('../consts/consts');
var code = require('../consts/code');
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
TopupDao.topup = Promise.promisify(function topup(params, cb) {
  if (!params.uid || !params.gold || !params.type || !params.msg) {
    return utils.invokeCallback(cb, 'invalid param topup');
  }

  try {
    if (params.gold > 0) {
      pomelo.app.rpc.manager.paymentRemote.addBalance({uid: params.uid}, params, function (e, res) {
        res = res || {};
        res.addGold = params.gold;
        res.uid = params.uid;
        return utils.invokeCallback(cb, e, res);
      });
    }
    else {
      params.gold = -params.gold;
      pomelo.app.rpc.manager.paymentRemote.subBalance({uid: params.uid}, params, function (e, res) {
        res = res || {};
        res.subGold = -params.gold;
        res.uid = params.uid;
        return utils.invokeCallback(cb, e, res);
      });
    }
  }
  catch (e) {
    console.error(e.stack || e);
    utils.log(e.stack || e);
    return utils.invokeCallback(cb, e.stack || e, null);
  }
});

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
    return utils.invokeCallback(cb, 'invalid param pushGoldAward');
  }

  params.title = params.title || params.msg;

  var packageId = params.type+':'+Date.now()+lodash.random(0,1000);

  var redis = pomelo.app.get('redisCache');
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
        title: params.title,
        msg: params.msg
      }));
    })
    .then(function(){
      return utils.invokeCallback(cb);
    })
    .catch(function(e){
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb, e.stack || e);
    });
};

/**
 * User nhận gói gold
 * @param uid
 * @param packageId
 * @param cb
 */
TopupDao.getGoldAward = function getGoldAward(uid, packageId, cb) {
  if (!uid || !packageId) {
    return utils.invokeCallback(cb, 'invalid params getGoldAward')
  }

  var redis = pomelo.app.get('redisCache');

  return redis.hgetAsync(redisKeyUtil.getUserGoldKey(uid), packageId)
    .then(function(gold){
      var type = packageId.split(':')[0];
      var changeGoldType = (consts.CHANGE_GOLD_TYPE[type] || consts.CHANGE_GOLD_TYPE.UNKNOWN);
      return TopupDao.topup({
        uid: uid,
        gold: Number(gold),
        type: changeGoldType,
        msg: 'Nhận gold '+type+'; gold: '+gold
      });
    })
    .then(function(topup){
      return redis.multi()
        .hdel(redisKeyUtil.getUserGoldKey(uid), packageId)
        .hdel(redisKeyUtil.getUserNotifyKey(uid), packageId)
        .execAsync()
        .then(function() {
          topup.msg = [code.COMMON_LANGUAGE.ADD_GOLD, (topup.addGold||0).toString()];
          return utils.invokeCallback(cb, null, topup);
        });
    })
    .catch(function(e){
      console.error(e.stack || e);
      return utils.invokeCallback(cb, e.stack || e);
    })
};
