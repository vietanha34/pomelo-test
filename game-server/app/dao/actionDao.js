/**
 * Created by vietanha34 on 3/28/16.
 */


var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');
var consts = require('../consts/consts');
var utils = require('../util/utils');
var Code = require('../consts/code');
var Promise = require('bluebird');
var redisKeyUtil = require('../util/redisKeyUtil');
var lodash = require('lodash');
var ActionDao = module.exports;
var UserDao = require('./userDao');
var FriendDao = require('./friendDao');
var moment = require('moment');


ActionDao.addAction = function (opts, uid) {
  console.log('addAction : ', opts);
  var key = redisKeyUtil.getUserAction(uid);
  var object = {
    type: Number(consts.NOTIFY.TYPE.CONFIRM)||0,
      title: opts.title || '',
    msg: opts.msg || '',
    image: consts.NOTIFY.IMAGE.NORMAL,
    action: opts.action,
    expire : (Date.now() / 1000 | 0) + (opts.expire || 7 * 24 * 60 * 60),
    popup: opts.popup
  };
  if (opts.buttonLabel) object['buttonLabel'] = opts['buttonLabel'];
  pomelo.app.get('statusService').pushByUids([uid], 'onNotify', object);
  return pomelo.app.get('redisCache')
    .zaddAsync(key, Date.now() / 1000 | 0, JSON.stringify(object));
};

ActionDao.getAction = function (opts, uid, cb) {
  var key = redisKeyUtil.getUserAction(uid);
  return pomelo.app.get('redisCache')
    .zrangeAsync(key, 0, -1)
    .then(function (values) {
      console.log('values : ', values);
      var keys = Object.keys(opts);
      var data = [];
      for (var i = 0, len = values.length; i < len ; i++){
        var json = utils.JSONParse(values[i], {});
        console.log('json : ', json, values[i]);
        if (json.action){
          for (var j = 0, lenj = keys.length; j < lenj; j++) {
            console.log('compare keys : ', keys[j]);
            if (json.action[keys[j]] === opts[keys[j]]) {
              data.push(json);
            }
          }
        }
      }
      return utils.invokeCallback(cb, null, data);
    })
    .catch(function (err) {
      console.error('ActionDao.getAction : ', err);
      return utils.invokeCallback(cb, null, []);
    })
};

ActionDao.removeAction = function (opts, uid, cb) {
  console.log('removeAction : ', opts);
  var key = redisKeyUtil.getUserAction(uid);
  return pomelo.app.get('redisCache')
    .zrangeAsync(key, 0, -1)
    .then(function (values) {
      console.log('values : ', values);
      var keys = Object.keys(opts);
      var lengthRemove = 0;
      for (var i = 0, len = values.length; i < len ; i++){
        var json = utils.JSONParse(values[i], {});
        console.log('json : ', json, values[i]);
        if (json.action){
          var allRight = true;
          for (var j = 0, lenj = keys.length; j < lenj; j++){
            console.log('compare keys : ', keys[j]);
            if (json.action[keys[j]] !== opts[keys[j]]){
              allRight = false;
              break;
            }
          }
          if (allRight){
            lengthRemove += 1;
            pomelo.app.get('redisCache')
              .zrem(key, JSON.stringify(json))
          }
        }
      }
      if (lengthRemove === values.length) {
        pomelo.app.get('redisCache')
          .del(key);
      }
      return utils.invokeCallback(cb, null, {});
    })
};

ActionDao.actionExist = function (opts, uid, cb) {
  console.log('check Action exist');
  var key = redisKeyUtil.getUserAction(uid);
  return pomelo.app.get('redisCache')
    .zrangeAsync(key, 0, -1)
    .then(function (values) {
      var keys = Object.keys(opts);
      for (var i = 0, len = values.length; i < len ; i++){
        var json = utils.JSONParse(values[i], {});
        if (json.action){
          var allRight = true;
          for (var j = 0, lenj = keys.length; j < lenj; j++){
            console.log('keys : ', key[j], json.action[keys[j]], opts[keys[j]]);
            if (json.action[keys[j]] !== opts[keys[j]]){
              allRight = false;
              break;
            }
          }
          if (allRight){
            return utils.invokeCallback(cb, null, true)
          }
        }
      }
      return utils.invokeCallback(cb, null, false);
    })
};

ActionDao.clearKey = function (uid) {
  var key = redisKeyUtil.getUserAction(uid);
  return pomelo.app.get('redisCache')
    .delAsync(key);
};
