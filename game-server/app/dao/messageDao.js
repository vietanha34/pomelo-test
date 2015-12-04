/**
 * Created by vietanha34 on 12/4/14.
 */

var pomelo = require('pomelo');
var async = require('async');
var utils = require('../util/utils');
var Code = require('../consts/code');
var redisKeyUtil = require('../util/redisKeyUtil');
var consts = require('../consts/consts');

var MessageDao = module.exports;

MessageDao.getCountUnReadMessageByUid = function (opts, cb) {
  var redisInfo = pomelo.app.get('redisInfo');
  var targetType = opts.targetType || consts.TARGET_TYPE.PERSON;
  var uid = opts.uid;
  var fromId = opts.fromId; // from uid or from rid
  var fromKey = utils.getFromKey(targetType, fromId);
  redisInfo.hgetAsync(redisKeyUtil.getUserMetadata(uid), fromKey)
    .then(function (res) {
      return utils.invokeCallback(cb, null, !isNaN(parseInt(res)) ? parseInt(res) : 0)
    })
    .catch(function (err) {
      console.error(err);
      return utils.invokeCallback(cb, null, 0);
    })
};

MessageDao.getAllCountUnReadMessageByUid = function (uid, cb) {
  var redisInfo = pomelo.app.get('redisInfo');
  redisInfo.hgetall(redisKeyUtil.getUserMetadata(uid), function (err, res) {
    if (err) {
      utils.invokeCallback(cb, err);
    }
    else {
      for (var key in res ){
        var splitData = key.split('|');
        res[splitData[0]] = {
          numMsg: !isNaN(parseInt(res[key])) ? parseInt(res[key]) : 0,
          targetType : splitData[1] || consts.TARGET_TYPE.PERSON
        }
      }
      utils.invokeCallback(cb, null, res)
    }
  });
};


MessageDao.getCountUnReadyMessage = function (uid, cb) {
  var redisInfo = pomelo.app.get('redisInfo');
  redisInfo.hget(redisKeyUtil.getPlayerInfoKey(uid), 'chatCount', function (err, res) {
    if (err) {
      utils.invokeCallback(cb, err);
    }
    else {
      utils.invokeCallback(cb, null, !isNaN(parseInt(res)) ? parseInt(res) : 0)
    }
  })
};


MessageDao.countUnreadMessage = function (opts, cb) {
  var count = opts.count || 0;
  var targetType = opts.targetType || consts.TARGET_TYPE.PERSON;
  var uid = opts.uid;
  var fromId = opts.fromId; // from uid or from rid
  var fromKey = utils.getFromKey(targetType, fromId);
  var multi = pomelo.app.get('redisInfo').multi();
  multi.hget(redisKeyUtil.getUserMetadata(uid), fromKey);
  multi.hincrby(redisKeyUtil.getUserMetadata(uid), fromKey, count);
  multi.exec(function (err, res) {
    var userChatCount = res[0];// luong chat cua nguoi choi day
    multi = pomelo.app.get('redisInfo').multi();
    if (!parseInt(userChatCount)) {
      multi.hincrby(redisKeyUtil.getPlayerInfoKey(uid), 'chatCount', count);
    }
    multi.hget(redisKeyUtil.getPlayerInfoKey(uid), 'chatCount');
    multi.exec(function (err, res) {
      res = res.length === 2 ? (res[1] || 0) : (res[0] || 0);
      utils.invokeCallback(cb, err, res);
    });
  });
};

MessageDao.unCountUnreadMessage = function (opts,cb) {
  var targetType = opts.targetType || consts.TARGET_TYPE.PERSON;
  var uid = opts.uid;
  var fromId = opts.fromId; // from uid or from rid
  var fromKey = utils.getFromKey(targetType, fromId);
  var redisInfo = pomelo.app.get('redisInfo');
  var multi = redisInfo.multi();
  multi.hget(redisKeyUtil.getUserMetadata(uid), fromKey);
  multi.hget(redisKeyUtil.getPlayerInfoKey(uid), 'chatCount');
  multi.exec(function (err, res) {
    if (res && !isNaN(parseInt(res[0]))) {
      var count = parseInt(res[0]);
      var totalCount = !isNaN(parseInt(res[1])) ? parseInt(res[1]) : 0;
      var multi = redisInfo.multi();
      multi.hdel(redisKeyUtil.getUserMetadata(uid), fromKey);
      if (count && totalCount > 0) {
        totalCount -= 1;
      }
      multi.hset(redisKeyUtil.getPlayerInfoKey(uid), 'chatCount', totalCount || 0);
      multi.exec(cb);
    }
  })
};