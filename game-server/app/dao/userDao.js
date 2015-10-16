/**
 * Created by vietanha34 on 6/5/15.
 */

var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');
var consts = require('../consts/consts');
var utils = require('../util/utils');
var Code = require('../consts/code');
var Promise = require('bluebird');
var redisKeyUtil = require('../util/redisKeyUtil');
var regexValidUtil = require('../util/regexValid');
var lodash = require('lodash');
var UserDao = module.exports;

var charCode = [192,
  193,
  194,
  195,
  200,
  201,
  202,
  204,
  205,
  210,
  211,
  212,
  213,
  217,
  218,
  221,
  224,
  225,
  226,
  227,
  232,
  233,
  234,
  236,
  237,
  242,
  243,
  244,
  245,
  249,
  250,
  253,
  258,
  259,
  272,
  273,
  296,
  297,
  360,
  361,
  416,
  417,
  431,
  432,
  7840,
  7841,
  7842,
  7843,
  7844,
  7845,
  7846,
  7847,
  7848,
  7849,
  7850,
  7851,
  7852,
  7853,
  7854,
  7855,
  7856,
  7857,
  7858,
  7859,
  7860,
  7861,
  7862,
  7863,
  7864,
  7865,
  7866,
  7867,
  7868,
  7869,
  7870,
  7871,
  7872,
  7873,
  7874,
  7875,
  7876,
  7877,
  7878,
  7879,
  7880,
  7881,
  7882,
  7883,
  7884,
  7885,
  7886,
  7887,
  7888,
  7889,
  7890,
  7891,
  7892,
  7893,
  7894,
  7895,
  7896,
  7897,
  7898,
  7899,
  7900,
  7901,
  7902,
  7903,
  7904,
  7905,
  7906,
  7907,
  7908,
  7909,
  7910,
  7911,
  7912,
  7913,
  7914,
  7915,
  7916,
  7917,
  7918,
  7919,
  7920,
  7921,
  7922,
  7923,
  7924,
  7925,
  7926,
  7927,
  7928,
  7929,
  32,
  48,
  49,
  50,
  51,
  52,
  53,
  54,
  55,
  56,
  57,
  65,
  66,
  67,
  68,
  69,
  70,
  71,
  72,
  73,
  74,
  75,
  76,
  77,
  78,
  79,
  80,
  81,
  82,
  83,
  84,
  85,
  86,
  87,
  88,
  89,
  90,
  97,
  98,
  99,
  100,
  101,
  102,
  103,
  104,
  105,
  106,
  107,
  108,
  109,
  110,
  111,
  112,
  113,
  114,
  115,
  116,
  117,
  118,
  119,
  120,
  121,
  122];

UserDao.getUserProperties = function (uid, properties, cb) {
  return pomelo.app.get('mysqlClient')
    .User
    .findOne({where: {id: uid}, attributes: properties, raw: true})
    .then(function (user) {
      console.log('properties : ', user);
      return utils.invokeCallback(cb, null, user);
    })
    .catch(function (err) {
      console.error(err);
      return utils.invokeCallback(cb, err);
    })
};

UserDao.getUserPropertiesByUids = function (uids, properties, cb) {
  return pomelo.app.get('mysqlClient')
    .User
    .findOne({where: {userId: {$in: uids}}, attributes: properties, raw: true})
    .then(function (users) {
      return utils.invokeCallback(cb, null, users);
    })
    .catch(function (err) {
      return utils.invokeCallback(cb, err);
    })
};


UserDao.getUserIdByUsername = function (username) {
  return pomelo.app.get('mysqlClient')
    .User
    .findOne({
      where: {
        username: username
      },
      attributes: ['userId'],
      raw: true
    })
};

/**
 * Get user infomation by userId
 *
 * @param {String} uid UserId
 * @param {function} cb Callback function
 */
UserDao.getUserById = function (uid, cb) {
  return pomelo.app.get('mysqlClient')
    .User
    .findOne({where: {userId: uid}})
    .then(function (user) {
      return utils.invokeCallback(cb, null, user);
    })
    .catch(function (err) {
      return utils.invokeCallback(cb, err);
    })
};

/**
 * Update user properties
 *
 * @param uid
 * @param opts
 * @param cb
 */
UserDao.updateProperties = function (uid, opts, cb) {
  return pomelo.app.get('mysqlClient')
    .User
    .update(opts, {
      where: {
        userId: uid
      }
    })
    .then(function (user) {
      return utils.invokeCallback(cb, null, user);
    })
    .catch(function (err) {
      return utils.invokeCallback(cb, err);
    })
};


/**
 * Login user
 *
 * @param msg
 * @param cb
 */
UserDao.login = function (msg, cb) {
  // kiểm tra accessToken của người dùng, mỗi accessToken sẽ được lưu trên máy trong vào 30 phút
  var accountService = pomelo.app.get('accountService');
  return accountService
    .getUserProfile(msg.accessToken)
    .then(function (res) {
      if (res && !res.ec) {
        console.log('res  typeof : ', typeof res);
        res.userId = res.id;
        delete res['id'];
        console.log('res : ', res);
        return pomelo.app.get('mysqlClient')
          .User
          .findOrCreate({where: {userId: res.userId}, raw: true, defaults : res});
      } else {
        Promise.reject({
          ec: Code.FAIL,
          msg: 'Có lỗi xảy ra'
        })
      }
    })
    .spread(function (user, created) {
      if (created) {
        // TODO push event register
      }
      return utils.invokeCallback(cb, null, user);
    })
    .catch(function (err) {
      console.error('err : ', err);
      return utils.invokeCallback(cb, err);
    })

};

var findFullnameAvailable = function (fullname, num) {
  num = num || 0;
  var name = num > 0 ? fullname + ' ' + num : fullname;
  return pomelo.app.get('mysqlClient')
    .User
    .count({
      where: {
        fullname: name
      }
    })
    .then(function (count) {
      if (count > 0) {
        return findFullnameAvailable(fullname, num + 1);
      } else {
        return name
      }
    })
    .catch(function (err) {
      return name
    })
};

