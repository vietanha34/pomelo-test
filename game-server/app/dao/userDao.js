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
    .findOne({where: {uid: uid}, attributes: properties, raw: true})
    .then(function (user) {
      console.log('properties : ', user);
      return utils.invokeCallback(cb, null, user);
    })
    .catch(function (err) {
      console.error(err);
      return utils.invokeCallback(cb, err);
    })
};

UserDao.getUserAchievementProperties = function (uid, properties, achiProperties, cb) {
  return pomelo.app.get('mysqlClient')
    .User
    .findOne({
      where: {uid: uid},
      attributes: properties,
      include: [{
        model: pomelo.app.get('mysqlClient').Achievement,
        attributes: achiProperties
      }],
      raw: true
    })
    .then(function (user) {
      console.log('properties : ', user);
      return utils.invokeCallback(cb, null, user);
    })
    .catch(function (err) {
      console.error(err);
      return utils.invokeCallback(cb, err);
    })

};

UserDao.getUserPropertiesByUsername = function (username, properties, cb) {
  return pomelo.app.get('mysqlClient')
    .User
    .findOne({where: {username: username}, attributes: properties, raw: true})
    .then(function (user) {
      console.log('properties : ', user);
      return utils.invokeCallback(cb, null, user);
    })
    .catch(function (err) {
      console.error(err);
      return utils.invokeCallback(cb, err);
    })
};

UserDao.getUsersPropertiesByUids = function (uids, properties, cb) {
  return pomelo.app.get('mysqlClient')
    .User
    .findAll({where: {uid: {$in: uids}}, attributes: properties, raw: true})
    .then(function (users) {
      return utils.invokeCallback(cb, null, users);
    })
    .catch(function (err) {
      console.error(err);
      return utils.invokeCallback(cb, err);
    })
};


UserDao.getUserIdByUsername = function (username, cb) {
  return pomelo.app.get('mysqlClient')
    .User
    .findOne({
      where: {
        username: username
      },
      attributes: ['uid'],
      raw: true
    })
    .then(function (user) {
      if (user) {
        return utils.invokeCallback(cb, null, user.uid);
      } else {
        return utils.invokeCallback(cb, {
          msg: "Không tìm thấy người chơi",
          code: 15,
          message: "Người chơi không tồn tại"
        })
      }
    });
};

/**
 * Get user information by userId
 *
 * @param {String} uid UserId
 * @param {function} cb Callback function
 */
UserDao.getUserById = function (uid, cb) {
  return pomelo.app.get('mysqlClient')
    .User
    .findOne({where: {uid: uid}})
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
        uid: uid
      }
    })
    .then(function (user) {
      return utils.invokeCallback(cb, null, user);
    })
    .catch(function (err) {
      return utils.invokeCallback(cb, err);
    })
};

UserDao.isExist = function (username, cb) {
  return pomelo.app.get('mysqlClient')
    .User
    .findOne({
      where : {
        username : username
      },
      attributes : ['uid'],
      raw : true
    })
    .then(function (user) {
      if (user){
        return utils.invokeCallback(cb, null, {userid : user.uid})
      }else {
        return utils.invokeCallback(cb, null, false);
      }
    })
    .catch(function (err) {
      return utils.invokeCallback(cb, null, false);
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
  var user, created, userData, username;
  var promise = accountService
    .getUserProfile(msg.accessToken)
    .then(function (res) {
      res = utils.JSONParse(res, {});
      if (res && !res.ec) {

        res.uid = res.id;
        userData = res;
        delete res['id'];
        username = res.username;
        if (msg.platform === 'ios') return Promise.resolve(null);
        return pomelo
          .app
          .get('redisInfo')
          .zrankAsync('onlineUser:oldVersion', res.username);
      } else {
        return Promise.reject({
          ec: Code.FAIL,
          msg: 'Có lỗi xảy ra'
        })
      }
    })
    .then(function (rank) {
      if (lodash.isNumber(rank)) {
        if (username) {
          pomelo
            .app
            .get('redisInfo')
            .RPUSH('list:requireLogin:newVersion', username, function (e, r) {
              if (e) console.error(e);
            })
        }
        return Promise.reject({
          ec: Code.FAIL,
          msg: 'Bạn đã đăng nhập trên phiên bản cũ, xin vui lòng chắm dứt kết nối ở phiên bản cũ'
        })
      }else {
        return pomelo.app.get('mysqlClient')
          .User
          .findOrCreate({where: {uid: userData.uid}, raw: true, defaults: userData});
      }
    })
    .spread(function (u, c) {
      user = u;
      created = c;
      if (created) {
        // TODO push event register
        return accountService.getInitBalance(msg);
      } else {
        return pomelo.app.get('mysqlClient')
          .User
          .update({
            fullname: userData.fullname,
            phone: userData.phoneNumber,
            email: userData.email,
            birthday: userData.birthday,
            avatar: u.avatar ? u.avatar : userData.avatar ? JSON.stringify({
              id: userData.uid,
              version: userData.avatarVersion
            }) : null,
            distributorId: userData.dtId
          }, {
            where: {uid: userData.uid}
          })
      }
    })
    .then(function (balance) {
      if (created) {
        var emitterConfig = pomelo.app.get('emitterConfig');
        pomelo.app.rpc.event.eventRemote.emit(null, emitterConfig.REGISTER, {
          uid: user.uid,
          username: user.username,
          platform: msg.platform,
          deviceId: msg.deviceId,
          version: msg.version,
          extraData: msg.data,
          dtId : msg.dtId,
          type: user.accountType,
          ip: msg.ip,
          userCount: balance ? balance.count || 1 : 1
        }, function () {
        });
        return utils.invokeCallback(cb, null, user);
      } else {
        return utils.invokeCallback(cb, null, user);
      }
    })
    .cancellable()
    .catch(function (err) {
      console.error('err : ', err);
      return utils.invokeCallback(cb, err);
    });
  return promise
};

UserDao.loginWithUsername = function (msg, cb) {
  return Promise.delay(0)
    .then(function () {
      return pomelo.app.get('redisInfo')
        .hgetAsync('cothu:' + msg.username, 'passwd');
    })
    .then(function (passwd) {
      if (passwd) {
        if (passwd === msg.password) {
          return utils.invokeCallback(cb, null, {code: 0})
        } else {
          return utils.invokeCallback(cb, null, {code: 11, message: "Sai mật khẩu", data: {}})
        }
      } else {
        return pomelo
          .app
          .get('accountService')
          .loginWithUsername(msg)
      }
    })
    .then(function (result) {
      if (result) {
        if (!result.code) {
          pomelo.app.get('redisInfo')
            .hmset('cothu:' + msg.username, {passwd: msg.password});
          pomelo.app.get('redisInfo')
            .expire('cothu:' + msg.username, 60 * 10);
        }
        return utils.invokeCallback(cb, null, result)
      }
    })
    .catch(function (err) {
      console.log('err : ', err);
      return utils.invokeCallback(cb, null, {code: 99, msg: 'Có lỗi xảy ra'});
    })
};

UserDao.updateProfile = function (username, msg) {
  msg.username = username;
  if (msg.passwordMd5){
    pomelo.app.get('redisInfo')
      .hset('cothu:' + msg.username, 'passwd', msg.passwordMd5);
    pomelo.app.get('redisInfo')
      .expire('cothu:' + msg.username, 60 * 60 * 24);
  }
  return pomelo.app.get('accountService')
    .updateProfile(msg);
};

UserDao.updateUserProfile = function (uid, msg) {
  msg.userId = uid;
  return pomelo.app.get('accountService')
    .updateUserProfile(msg);
};

UserDao.loginViaApp = function (msg, cb) {
  return pomelo
    .app
    .get('accountService')
    .loginViaApp({
      data : msg.data,
      spId : msg.spid,
      dtId : msg.dtId,
      deviceId : msg.deviceId,
      ip : msg.ip,
      platform: msg.platform
    })
    .then(function (result) {
      console.log('loginViaApp result : ', result );
      if (result && !result.code){
        return pomelo
          .app.get('mysqlClient')
          .User
          .findOrCreate({where: {uid: result.extra.userId}, raw: true, defaults: {
            uid: result.extra.userId,
            username : result.extra.username,
            fullname: result.extra.username,
            phone: msg.phone || '',
            email: msg.email || '',
            avatar: null,
            accountType: consts.ACCOUNT_TYPE.ACCOUNT_TYPE_USER,
            distributorId: msg.dtid || 1
          }})
          .spread(function (user, created) {
            var firstLogin = 0;
            if (created){
              var emitterConfig = pomelo.app.get('emitterConfig');
              pomelo.app.rpc.event.eventRemote.emit(null, emitterConfig.REGISTER, {
                uid: user.uid,
                username: user.username,
                platform: msg.platform,
                deviceId: msg.deviceid,
                version: msg.version,
                extraData: msg.data,
                type: user.accountType,
                ip: msg.ip,
                userCount: 1
              }, function () {
              });
              firstLogin = 1;
            }
            return utils.invokeCallback(cb, null, {code : 0, message: '', data: {}, extra: { firstLogin : firstLogin}})
          })
      }else{
        return utils.invokeCallback(cb, null, result)
      }
    })

};

UserDao.deleteCache = function (username, uid) {
  if (uid){
    UserDao.getUserProperties(uid, ['username'])
      .then(function (user) {
        if (user){
          var username = user.username;
          var redisClient  = pomelo.app.get('redisInfo');
          redisClient.del('cothu:profile:' + username);
          redisClient.del('cothu:expProfile:'+username);
          pomelo.app.get('redisInfo')
            .del('cothu:' + username, 'passwd');
        }
      })
  }else {
    var redisClient  = pomelo.app.get('redisInfo');
    redisClient.del('cothu:profile:' + username);
    redisClient.del('cothu:expProfile:'+username);
  }
};

UserDao.createUser = function (msg, cb) {
  return pomelo
    .app
    .get('accountService')
    .createUser({
      username: msg.uname,
      password: msg.pass,
      dtId: msg.dtid || msg.dtId,
      spId: msg.spId || msg.spid,
      gold: msg.money,
      platform: msg.platform,
      deviceId: msg.deviceId,
      email: msg.email,
      secretKey: 't-$u15zfgi_3&_6ot9+s_-qlcdfon@f7',
      client_id: 'cothuV2@thudojsc',
      client_secret: '7r3hEvclrCXYAMzzXI79uyYuahcJhCgNnxmCtPnfalrlYMwDiODGloZoNcOa2IZJre1X9PayYJWqUdQjD5u6qEePDk9TeNw8'
    })
    .then(function (result) {
      if (result) {
        // result ok -> tạo mới tài khoản
        return pomelo
          .app
          .get('mysqlClient')
          .User
          .create({
            gold : msg.money2 || 0,
            uid: result.userId,
            username : msg.uname,
            fullname: msg.uname,
            phone: msg.phone || '',
            email: msg.email || '',
            avatar: null,
            platform : msg.platform,
            accountType: consts.ACCOUNT_TYPE.ACCOUNT_TYPE_USER,
            distributorId: msg.dtid || msg.dtId || 1,
            deviceId: msg.deviceId || msg.deviceid,
            spId: msg.spid || msg.spId || ''
          });
      } else {
        console.error('createUser: ', result);
        return utils.invokeCallback(cb, null, {
          code: 1,
          message: "Không thể tạo mới đc user",
          data: ''
        })
      }
    })
    .then(function (user) {
      if (user) {
        var emitterConfig = pomelo.app.get('emitterConfig');
        pomelo.app.rpc.event.eventRemote.emit(null, emitterConfig.REGISTER, {
          uid: user.uid,
          username: user.username,
          platform: msg.platform,
          deviceId: msg.deviceid || msg.deviceId,
          version: msg.version,
          extraData: msg.data,
          type: user.accountType,
          ip: msg.ip,
          userCount: 1
        }, function () {
        });
        return utils.invokeCallback(cb, null, {code : 0, message: '', data:{}})
      } else {
        return utils.invokeCallback(cb, null, {
          code: 1,
          message: "Không thể tạo mới đc user",
          data: ''
        })
      }
    })
    .catch(function (err) {
      console.log('createUser: ', err);
      return utils.invokeCallback(cb, null, {
        code: 1,
        message: "Không thể tạo mới đc user",
        data: ''
      })
    })
};

var findFullnameAvailable = function (fullname, num) {
  num = num || 0;
  var name = num > 0 ? fullname + ' ' + num : fullname;
  return pomelo
    .app
    .get('mysqlClient')
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