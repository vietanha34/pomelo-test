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
var lodash = require('lodash');
var UserDao = module.exports;


UserDao.getUserProperties = function (uid, properties, cb) {
  var promises = [];
  if (properties.indexOf('guildName') > -1 || properties.indexOf('sIcon') > -1) {
    promises.push(pomelo.app.get('mysqlClient')
        .GuildMember
        .findOne({
          where: {
            uid: uid
          },
          include: [{
            model: pomelo.app.get('mysqlClient').Guild,
            attributes: ['name', 'sIcon', 'id']
          }],
          raw: true
        })
    );
    properties = lodash.remove(properties, function (property) {
      return property !== 'guildName' && property !== 'sIcon'
    });
  }
  promises.push(pomelo.app.get('mysqlClient')
    .User
    .findOne({where: {uid: uid}, attributes: properties, raw: true}));

  return Promise.delay(0)
    .then(function () {
      return promises
    })
    .spread(function (guild, user) {
      user = user || guild;
      if (guild && user) {
        user['guildName'] = guild['Guild.name'];
        user['sIcon'] = guild['Guild.sIcon'];
        user['guildId'] = guild['Guild.id'];
      }
      return utils.invokeCallback(cb, null, user);
    })
    .catch(function (err) {
      console.error(err);
      return utils.invokeCallback(cb, err);
    })
};

UserDao.getUserPropertiesRedis = function (uid, properties, cb) {
  return pomelo.app.get('redisInfo')
    .hmgetAsync(redisKeyUtil.getPlayerInfoKey(uid), properties)
    .then(function(data) {
      if (!data) return utils.invokeCallback(cb, null, null);
      var result = {uid: uid};
      for (var i = 0, len = data.length; i < len; i++) {
        result[properties[i]] = data[i];

      }
      return utils.invokeCallback(cb, null, result);
    })
    .catch(function (e) {
      console.error(e.stack || e);
      return utils.invokeCallback(cb, null, null);
    });
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

UserDao.getUserIdByUsernames = function (usernames, cb) {
  return Promise.map(usernames, (username) => {
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
          return utils.invokeCallback(cb, null, null)
        }
      });
  })
    .filter((uid) => {
      return uid
    })
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
      where: {
        username: username
      },
      attributes: ['uid'],
      raw: true
    })
    .then(function (user) {
      if (user) {
        return utils.invokeCallback(cb, null, {userid: user.uid})
      } else {
        return utils.invokeCallback(cb, null, false);
      }
    })
    .catch(function (err) {
      return utils.invokeCallback(cb, null, false);
    })

};


UserDao.getUsernameByUid = function (uid, cb) {
  return pomelo.app.get('mysqlClient')
    .User
    .findOne({
      where: {
        uid: uid
      },
      raw: true,
      attributes: ['username']
    })
    .then(function (user) {
      if (user) {
        return utils.invokeCallback(cb, null, user.username)
      } else {
        return utils.invokeCallback(cb, null, null)
      }
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
  return accountService
    .getUserProfile(msg.accessToken)
    .then(function (res) {
      res = utils.JSONParse(res, {});
      if (res && !res.ec) {
        res.uid = res.id;
        userData = res;
        userData.platform = userData.platform ? userData.platform : consts.PLATFORM_ENUM.IOS
        delete res['id'];
        username = res.username;
        if (msg.platform === 'ios' || msg.platform === 'windowphone' || msg.platform === 'android') return Promise.resolve(null);
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
      if (pomelo.app.get('env') === 'development') {
        userData.gold = 100000;
      }
      return pomelo.app.get('mysqlClient')
        .User
        .findOrCreate({where: {uid: userData.uid}, raw: true, defaults: userData});
    })
    .spread(function (u, c) {
      user = u;
      created = c;
      if (created) {
        // TODO push event register
        return accountService.getInitBalance(msg);
      } else {
        var updateData = {
          fullname: userData.fullname,
          phone: userData.phoneNumber,
          email: userData.email,
          birthday: userData.birthday
        };
        if (userData.avatar) {
          updateData.avatar = JSON.stringify({
            id: userData.uid,
            version: userData.avatarVersion
          })
        }
        pomelo.app.get('mysqlClient')
          .User
          .update(updateData, {
            where: {uid: userData.uid}
          });
        return Promise.resolve({});
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
          dtId: msg.dtId,
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
    .catch(function (err) {
      console.error('login err : ', err);
      return utils.invokeCallback(cb, err);
    });
};

UserDao.loginWithUsername = function (msg, cb) {
  return Promise.delay(0)
    .then(function () {
      return pomelo
        .app
        .get('accountService')
        .loginWithUsername(msg)
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
  if (msg.passwordMd5) {
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
      data: msg.data,
      spId: msg.spid,
      dtId: msg.dtId,
      deviceId: msg.deviceId,
      ip: msg.ip,
      platform: msg.platform
    })
    .then(function (result) {
      console.log('loginViaApp result : ', result);
      if (result && !result.code) {
        return pomelo
          .app.get('mysqlClient')
          .User
          .findOrCreate({
            where: {uid: result.extra.userId},
            raw: true, defaults: {
              uid: result.extra.userId,
              username: result.extra.username,
              fullname: result.extra.username,
              phone: msg.phone || '',
              email: msg.email || '',
              avatar: null,
              accountType: consts.ACCOUNT_TYPE.ACCOUNT_TYPE_USER,
              distributorId: msg.dtid || 1
            }
          })
          .spread(function (user, created) {
            var firstLogin = 0;
            if (created) {
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
            return utils.invokeCallback(cb, null, {code: 0, message: '', data: {}, extra: {firstLogin: firstLogin}})
          })
      } else {
        return utils.invokeCallback(cb, null, result)
      }
    })

};

UserDao.deleteCache = function (username, uid) {
  if (uid) {
    UserDao.getUserProperties(uid, ['username'])
      .then(function (user) {
        if (user) {
          var username = user.username;
          var redisClient = pomelo.app.get('redisInfo');
          redisClient.del('cothu:profile:' + username);
          redisClient.del('cothu:expProfile:' + username);
          pomelo.app.get('redisInfo')
            .del('cothu:' + username, 'passwd');
        }
      })
  } else {
    var redisClient = pomelo.app.get('redisInfo');
    redisClient.del('cothu:profile:' + username);
    redisClient.del('cothu:expProfile:' + username);
  }
};

UserDao.createUser = function (msg, cb) {
  return pomelo
    .app
    .get('accountService')
    .createUser({
      username: msg.uname,
      password: msg.pass,
      dtId: 1,
      spId: msg.spId || msg.spid,
      gold: msg.money,
      platform: msg.platform,
      deviceId: msg.deviceId,
      email: msg.email,
      versionId: 1,
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
            gold: msg.money2 || 0,
            uid: result.userId,
            username: msg.uname,
            fullname: msg.uname,
            phone: msg.phone || '',
            email: msg.email || '',
            avatar: null,
            platform: msg.platform,
            accountType: consts.ACCOUNT_TYPE.ACCOUNT_TYPE_USER,
            distributorId: 1,
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
        return utils.invokeCallback(cb, null, {code: 0, message: '', data: {}})
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