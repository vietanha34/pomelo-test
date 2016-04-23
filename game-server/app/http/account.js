/**
 * Created by bi on 12/19/15.
 */

var utils = require('../util/utils');
var code = require('../consts/code');
var Consts = require('../consts/consts');
var UserDao = require('../dao/userDao');
var TopDao = require('../dao/topDao');
var Promise = require('bluebird');
var pomelo = require('pomelo');
var moment = require('moment');
var Formula = require('../consts/formula');
var MD5 = require('MD5');
var encrypt = require('../util/encrypt');
var RegexValid = require('../util/regexValid');

module.exports = function (app) {
  app.get('/acc', function (req, res) {
    var data = req.query;
    switch (data.api) {
      case 'acc.create':
        register(req, res);
        break;
      case 'acc.login':
        login(req, res);
        break;
      case 'acc.exists':
        existUser(req, res);
        break;
      case 'acc.ban':
        banUser(req, res);
        break;
      case 'acc.loginViaApp':
        loginViaApp(req, res);
        break;
      case 'acc.change':
        changePassword(req, res);
        break;
      case 'acc.forgot':
        forgot(req, res);
        break;
      case 'acc.forgot_pass':
        forgotPass(req, res);
        break;
      case 'acc.logout':
        logout(req, res);
        break;
      case 'acc.update':
        updateProfile(req, res);
        break;
      case 'acc.update_vipPoint':
        updateVippoint(req, res);
        break;
      default:
        res.status(500).json({msg: "có lỗi xảy ra"})
    }
  });

  app.get('/top', function(req, res) {
    var param = req.query;
    var type = 99;
    var gameId = param.gameid || 20;
    if (param.api == 'top.famous') {
      type = Consts.MAP_GAME_ID_OLD_VERSION[gameId] || 1;
    }
    else if (param.api == 'top.rich') {
      type = 100;
    }

    return TopDao.getTop(1, type)
      .then(function(data) {
        var ret = [];
        data.list.forEach(function(item, i, list) {
          ret.push({
            uname: item.username,
            fullname: item.fullname,
            money: item.gold || 0,
            money2: item.gold || 0,
            maxxp:  item.exp || 0,
            totalxp:  item.exp || 0,
            avatarid: '',
            status: item.statusMsg || '',
            vpoint:  item.vipPoint || 0,
            elo:  item.point || 0
          });
        });

        return res.json({
          code: code.ACCOUNT_OLD.OK,
          data: ret,
          message: 0
        })
      });
  });

  app.get('/experience/update', function (req, res) {
    var data = req.query;
    if (!data) return res.json({code: code.ACCOUNT_OLD.WRONG_PARAM});
    var gameId = data.game_id;
    var username = data.uname || '';
    var xp = data.xp || 0;
    var win = data.win || 0;
    var lose = data.lose || 0;
    var draw = data.draw || 0;
    var giveUp = data.giveup || 0;
    var elo = data.elo || 0;

    if (!Consts.GAME_MAP_ID[gameId] || !username) {
      return res.json({code: code.ACCOUNT_OLD.WRONG_PARAM});
    }
    UserDao
      .getUserIdByUsername(username)
      .then(function (uid) {
        if (!uid) {
          return res.json({code: code.ACCOUNT_OLD.USER_NOT_EXISTS});
        }
        var db = pomelo.app.get('mysqlClient');
        db
          .Achievement
          .findOne({
            where: {
              uid: uid
            }
          })
          .then(function (user) {
            if (!user) {
              return res.json({code: code.ACCOUNT_OLD.USER_NOT_EXISTS});
            }
            if (xp) {
              UserDao
                .updateProperties(uid, {
                  exp: db.sequelize.literal(' exp + ' + xp)
                })
                .catch(function (err) {
                  console.error(err);
                })
            }
            var update = {};
            var gameName = Consts.GAME_MAP_ID[gameId];
            update[gameName + 'Xp'] = db.sequelize.literal(' ' + gameName + 'Xp + ' + xp);
            update[gameName + 'Win'] = db.sequelize.literal(' ' + gameName + 'Win + ' + win);
            update[gameName + 'Lose'] = db.sequelize.literal(' ' + gameName + 'Lose + ' + lose);
            update[gameName + 'Draw'] = db.sequelize.literal(' ' + gameName + 'Draw + ' + draw);
            var newElo = Number(user[gameName + 'Elo']) + Number(elo);
            if (newElo < 500) {
              update[gameName + 'Elo'] = 500
            } else {
              update[gameName + 'Elo'] = db.sequelize.literal(' ' + gameName + 'Elo + ' + elo);
            }
            update[gameName + 'GiveUp'] = db.sequelize.literal(' ' + gameName + 'GiveUp + ' + giveUp);
            user
              .updateAttributes(update)
              .catch(function (err) {
                console.error(err);
              });

            res.json({
              code: code.ACCOUNT_OLD.OK,
              data: '',
              message: ''
            });

            var mongoClient = pomelo.app.get('mongoClient');
            var Top = mongoClient.model('Top');
            var topUpdate = {};
            topUpdate[gameName] = newElo || 500;
            Top.update({uid: uid}, topUpdate, {upsert: false}, function(e,r) {
              if (e) console.error(e.stack || e);
            });
          })
          .catch(function (err) {
            console.error(err);
            res.status(500).end();
          })
      })
      .catch(function (err) {
        console.error(err);
        res.status(500).end();
      });
  });

  app.get('/experience', function (req, res) {
    var data = req.query;
    if (!data) return res.json({code: code.ACCOUNT_OLD.WRONG_PARAM});
    var username = data.uname || '';
    UserDao
      .getUserIdByUsername(username)
      .then(function (uid) {
        pomelo
          .app
          .get('mysqlClient')
          .Achievement
          .findOne({
            where: {
              uid: uid
            },
            raw: true
          })
          .then(function (record) {
            if (record) {
              var keys = Object.keys(Consts.GAME_MAP_ID);
              var exp = [];
              for (var i = 0; i < keys.length; i++) {
                var gameId = keys[i];
                var gameName = Consts.GAME_MAP_ID[gameId];
                exp.push({
                  game_id: gameId,
                  xp: record[gameName + 'Xp'],
                  win: record[gameName + 'Win'],
                  lose: record[gameName + 'Lose'],
                  draw: record[gameName + 'Draw'],
                  elo: record[gameName + 'Elo'],
                  giveup: record[gameName + 'GiveUp'],
                  expert: 0
                });
              }
              res.json(exp);
            } else {
              res.json({});
            }
          })
          .catch(function (err) {
            console.error(err);
            res.status(500).end();
          });
      })
      .catch(function (err) {
        console.error(err);
        res.status(500).end();
      });
  });

  app.get('/profile', getProfile);

  app.get('/expProfile', getExpProfile);

  app.get('/bank', function (req, res) {
    var data = req.query;
    var response = {
      code: code.ACCOUNT_OLD.FAIL,
      data: null,
      extra: {},
      message: null
    };
    if (!data) return res.json(response).end();
    var api = data.api;
    var uname = data.uname || '';
    var gold = parseInt(data.gold || 0);
    if (!uname || !gold || gold < 0) {
      return res.json({code: code.ACCOUNT_OLD.WRONG_PARAM});
    }
    var opts = {
      gold: gold,
      username: uname
    };
    var uid;
    UserDao.getUserIdByUsername(uname)
      .then(function (u) {
        uid = u;
        if (gold < 20000) return Promise.resolve({online: false});
        var statusService = pomelo.app.get('statusService');
        return Promise.promisify(statusService.getStatusByUid,{ context : statusService})(uid, true)
      })
      .then(function (status) {
        if (status && status.online){
          return Promise.reject({ec : code.FAIL, msg : "Người chơi đang online trên cả 2 phiên bản"})
        }
        opts.uid = uid;
        if (api === 'bank.subgold') {
          return pomelo
            .app
            .get('paymentService')
            .subBalance(opts)
            .then(function (bank) {
              console.log('paymentService: ', bank);
              if (bank && bank.ec === code.OK) {
                response.code = code.ACCOUNT_OLD.OK;
                response.extra = {
                  currentMoney: bank.gold
                };
                return res.json(response);
              }
              res.json(response);
            })
            .catch(function (err) {
              console.error(err);
              res.json(response);
            })
        } else {
          return pomelo
            .app
            .get('paymentService')
            .addBalance(opts, function (err, bank) {
              console.log('paymentService: ', err, bank);
              if (bank && bank.ec === code.OK) {
                response.code = code.ACCOUNT_OLD.OK;
                response.extra = {
                  currentMoney: bank.gold
                };
                response.data = bank;
                return res.json(response);
              }
              if (err) console.error(err);
              res.json(response);
            });
        }
      })
      .catch(function (err) {
        if (err.ec  === code.FAIL){
          console.error('account bank : Đăng nhập 2 tài khoản cùng lúc : ', uname);
        }else {
          console.error('account bank err : ', err);
        }
        res.json({msg: err.msg || 'có lỗi xảy ra', code: 99}).end()
      })
      .finally(function () {

      })
  });

  app.get('/friendship', function (req, res) {
    var data = req.query;
    if (!data) return res.json({}).end();
    switch (data.api) {
      case 'friendship.listing':
        register(req, res);
        break;
      case 'friendship.add':
        login(req, res);
        break;
      case 'friendship.exists':
        existUser(req, res);
        break;
      case 'friendship.delete':
        banUser(req, res);
        break;
      case 'friendship.accept':
        break;
      default:
        res.status(500).json({msg: "có lỗi xảy ra"})
    }
  });

  app.get('/topup', function (req, res) {
    var data = req.query;
    if (!data) return res.json({}).end();
    return UserDao.getUserIdByUsername(data.uname)
      .then(function (uid) {
        var opts = {
          uid : uid,
          gold : parseInt(data.gold) || 0,
          type : Consts.CHANGE_GOLD_TYPE.TOPUP_CARD
        };
        return pomelo
          .app
          .get('paymentService')
          .addBalance(opts, function (err, bank) {
            console.log('paymentService: ', err, bank);
            var response = {
              code: code.ACCOUNT_OLD.FAIL,
              data: null,
              extra: {},
              message: null
            };
            if (bank && bank.ec === code.OK) {
              response.code = code.ACCOUNT_OLD.OK;
              response.extra = {
                currentMoney: bank.gold
              };
              response.data = bank;
              return res.json(response);
            }
            if (err) console.error(err);
            res.json(response);
          });
      })
      .catch(function (err) {
        if (err && err.code === 15){
          // người dùng k tồn tài
          res.json({code : 15, message:"Người dùng không tồn tại", data:{}})
        }else {
          res.json({ code : 99, messsage: 'Lỗi hệ thống', data : {}});
        }
      })
  })
};

var register = function (req, res) {
  var data = req.query;
  if (!data) return res.json({ec: 0, data: {}, extra: {}}).end();
  return Promise.delay(0)
    .then(function () {
      return UserDao.createUser(data)
    })
    .then(function (result) {
      res.json(result).end();
    })
    .catch(function (err) {
      console.error(err);
      res.json({code: code.ACCOUNT_OLD.ERROR});
    })
};

var login = function (req, res) {
  var data = req.query;
  if (!data) return res.json({ec: 0, data: {}, extra: {}}).end();
  return Promise.delay(0)
    .then(function () {
      return UserDao.loginWithUsername({
        username: data.uname,
        password: data.passwd
      })
    })
    .then(function (result) {
      console.error('login 1 : ', data.uname, result);
      if (result && !result.code) {
        return UserDao.getUserIdByUsername(data.uname, result)
      } else {
        pomelo
          .app
          .get('redisInfo')
          .zadd('onlineUser:oldVersion', Date.now(), data.uname, function (e, r) {
            if (!e) {
              res.json(this.result).end();
            } else {
              return res.json({code: 1, message: 'Bạn đang đăng nhập trên phiên bản cờ thủ mới', data: {}}).end();
            }
          }.bind({result: result}));
      }
    })
    .then(function (uid) {
      if (uid) {
        return Promise.promisify(pomelo.app.get('statusService').getStatusByUid, { context : pomelo.app.get('statusService')})(uid, null)
      } else {
        Promise.reject({code: code.ACCOUNT_OLD.USER_NOT_EXISTS, message: "Người dùng không tồn tại", data: {}});
      }
    })
    .then(function (status) {
      if (status) {
        console.error('login 2 : ', data.uname, status);
        if (status.online) {
          return Promise.reject({code: 1, message: 'Bạn đang đăng nhập trên phiên bản cờ thủ mới', data: {}})
        } else {
          // add user login in old version
          pomelo
            .app
            .get('redisInfo')
            .zadd('onlineUser:oldVersion', Date.now(), data.uname, function (e, r) {
              if (!e) {
                console.error('login 4 : ');
                return res.json({
                  code: 0,
                  message: "",
                  data: {uname: this.uname},
                  extra: {
                    firstLogin: 0,
                    dt_id: 1 //TODO: change distributor ID
                  }
                }).end();
              } else {
                console.error('login 3 : ');
                return res.json({code: 1, message: 'Bạn đang đăng nhập trên phiên bản cờ thủ mới', data: {}}).end();
              }
            }.bind({uname: data.uname}));
        }
      } else {
        res.json({code: code.ACCOUNT_OLD.ERROR});
      }
    })
    .catch(function (err) {
      console.error(err, {message: err.message || 'có lỗi xảy ra', code: err.code || 99, data: {}});
      res.json({message: err.message || 'có lỗi xảy ra', code: err.code || 99, data: {}}).end()
    })
    .finally(function () {
      data = null;
    })
};

var getProfile = function (req, res) {
  var data = req.query;
  if (!data) return res.json({ec: 0, data: {}, extra: {}}).end();
  return pomelo
    .app
    .get('redisInfo')
    .hgetallAsync('cothu:profile:' + data.uname)
    .then(function (profile) {
      if (profile) {
        return Promise.resolve(profile);
      } else {
        return UserDao.getUserPropertiesByUsername(data.uname, ['username', ['gold', 'money2'], 'phone', 'email', ['distributorId', 'dt_id'], ['spId', 'sp_id'], ['updatedAt', 'lastupdate']])
          .then(function (user) {
            if (!user) return res.status(500).end();
            user.money = 0;
            user.pass = '';
            user.ban = 0;
            user.idcard = '';
            user['lastupdate'] = moment(user['lastupdate']).unix();
            user['regDate'] = moment(user['regDate']).unix();
            pomelo.app.get('redisInfo').hmset('cothu:profile:' + data.uname, user);
            pomelo.app.get('redisInfo').expire('cothu:profile:' + data.uname, 60 * 10);
            return Promise.resolve(user);
          })
      }
    })
    .then(function (user) {
      res.json(user).end();
    })
    .catch(function (err) {
      console.log(err);
      res.status(500).end();
    })
};

var getExpProfile = function (req, res) {
  var data = req.query;
  if (!data) return res.json({ec: 0, data: {}, extra: {}}).end();
  return pomelo
    .app
    .get('redisInfo')
    .getAsync('cothu:expProfile:' + data.uname)
    .then(function (profile) {
      if (profile) {
        return Promise.resolve(profile);
      } else {
        return UserDao.getUserPropertiesByUsername(data.uname, ['uid', ['statusMsg', 'status'], 'address', 'fullname', 'birthday', ['exp', 'totalxp'], ['vipPoint', 'vpoint'], ['sex', 'gender']])
          .then(function (user) {
            if (!user) return res.status(500).end();
            user.address = user.address || '';
            user.maxxp = Formula.calExp(user.level + 1) || 0;
            user.totalxp = user.totalxp || 0;
            user.timeplay = 0;
            user.fnchange = 0;
            user.vpchange = 0;
            user.avatarid = 112;
            user.avatarexpire = 0;
            user.img = 'http://cms.gviet.vn/assets/file/ico/486.png';
            user.clandate = '';
            user.uid = '';
            user.birthday = user.birthday ? '0000-00-00' : moment(user.birthday).format('YYYY-MM-DD');
            var dataCache = JSON.stringify(user);
            pomelo.app.get('redisInfo').set('cothu:expProfile:' + data.uname, dataCache);
            pomelo.app.get('redisInfo').expire('cothu:expProfile:' + data.uname, 60 * 10);
            return Promise.resolve(user);
          })
      }
    })
    .then(function (user) {
      res.json(user);
    })
    .catch(function (err) {
      console.log(err);
      res.status(500).end();
    })
};

var loginViaApp = function (req, res) {
  var data = req.query;
  if (!data) return res.json({ec: 0, data: {}, extra: {}}).end();
  return Promise.delay(0)
    .then(function () {
      return UserDao.loginViaApp(data)
    })
    .then(function (result) {
      res.json(result).end();
    })
    .catch(function (err) {
      console.log('err: ', err);
      res.json({code: 99, message: 'có lỗi xảy ra'}).end()
    })
};

var changePassword = function (req, res) {
  var data = req.query;
  if (!data) return res.json({code: 99, data: {}, extra: {}}).end();
  UserDao
    .updateProfile(data.uname, {
      passwordMd5: MD5(data.newpass),
      password: encrypt.cryptPassword(data.newpass)
    })
    .then(function (result) {
      if (result && result[0]) {
        return res.json({code: 0, message: "Đổi mật khẩu thành công", data: {newpass: data.newpass}})
      } else {
        return res.json({code: 1, message: "Không thể cập nhật được mật khẩu", data: {}});
      }
    });
};

var banUser = function (req, res) {
  var data = req.query;
  if (!data) return res.json({code: 99, data: {}, extra: {}}).end();
  return UserDao.updateProfile(data.uname, {
    status: 2
  })
    .then(function (result) {
      if (result && result[0]) {
        return res.json({code: 0, message: "Khoá người chơi thành công", data: {}})
      } else {
        return res.json({code: 1, message: "Người chơi không tồn tại", data: {}});
      }
    })
};

var existUser = function (req, res) {
  var data = req.query;
  if (!data) return res.json({code: 99, data: {}, extra: {}}).end();
  return UserDao.isExist(data.uname)
    .then(function (data) {
      if (data) {
        return res.json({code: 14, message: '', data: data});
      } else {
        return res.json({code: 0, message: "user không tồn tại", data: {}})
      }
    })
};

var activeUser = function (req, res) {
  var data = req.query;
  if (!data) return res.json({code: 99, data: {}, extra: {}}).end();
  return UserDao.updateProfile(data.uname, {
    status: 1
  })
    .then(function (result) {
      if (result && result[0]) {
        return res.json({code: 0, message: "Mở khoá người chơi thành công", data: {newpass: data.newpass}})
      } else {
        return res.json({code: 1, message: "Người chơi không tồn tại", data: {}});
      }
    })
};

var logout = function (req, res) {
  var data = req.query;
  if (!data) return res.json({code: 99, data: {}, extra: {}}).end();
  pomelo.app.get('redisInfo')
    .zrem('onlineUser:oldVersion', data.uname);
  res.json({code: code.ACCOUNT_OLD.OK});
};

var updateVippoint = function (req, res) {
  var data = req.query;
  if (!data) return res.json({code: 99, data: {}, extra: {}}).end();
  if (parseInt(data.vipPoint) < 0) return res.json({code:0, data:{}, message:''});
  UserDao
    .getUserIdByUsername(data.uname)
    .then(function (uid) {
      var mysqlClient = pomelo.app.get('mysqlClient');
      return mysqlClient
        .User
        .update({
          vipPoint: mysqlClient.sequelize.literal('vipPoint + ' + parseInt(data.vipPoint))
        }, {
          where: {
            uid: uid
          }
        });
    })
    .then(function () {
      UserDao.deleteCache(data.uname);
      return res.json({code: 1, data: {}, message: ''})
    })
    .catch(function (err) {
      console.log(err);
      res.json({code: 0, data: {}, message: ''})
    });
};

var forgotPass = function (req, res) {
  var data = req.query;
  if (!data) return res.json({code: 99, data: {}, extra: {}}).end();
  var newPass;
  UserDao.getUserPropertiesByUsername(data.uname, ['email', 'deviceId'])
    .then(function (user) {
      if (!user) {
        return Promise.reject({code: 10, message: 'Tên đăng nhập không hợp lệ', data: {}});
      }
      if ((data.email && user.email === data.email) || (data["o\tdevice"] && data["o\tdevice"] === user['deviceId'])) {
        newPass = utils.uid(6);
        return UserDao.updateProfile(data.uname, {
          passwordMd5: MD5(newPass),
          password: encrypt.cryptPassword(newPass)
        })
      } else {
        return Promise.reject({code: 1, message: "Email không chính xác hoặc không hợp lệ", data: {}})
      }
    })
    .then(function (result) {
      return res.json({code: 0, message: '', data: {pass: newPass}});
    })
    .catch(function (err) {
      return res.json({code: err.code || 99, data: {}, message: ''})
    })
};

var forgot = function (req, res) {
  var data = req.query;
  if (!data) return res.json({code: 99, data: {}, extra: {}}).end();
  var newPass;
  UserDao.getUserPropertiesByUsername(data.uname, ['phone'])
    .then(function (user) {
      if (!user) {
        return Promise.reject({code: 10, message: 'Tên đăng nhập không hợp lệ', data: {}});
      }
      if (user.phone === data.phone) {
        newPass = utils.uid(6);
        return UserDao.updateProfile(data.uname, {
          passwordMd5: MD5(newPass),
          password: encrypt.cryptPassword(newPass)
        })
      } else {
        return Promise.reject({code: 13, message: "Số điện thoại không hợp lệ", data: {}})
      }
    })
    .then(function (result) {
      return res.json({code: 0, message: '', data: {pass: newPass}});
    })
    .catch(function (err) {
      console.error(err);
      return res.json({code: err.code || 99, data: {}, message: err.message || 'Có lỗi xảy ra'})
    })
};

var updateProfile = function (req, res) {
  var data = req.query;
  if (!data) return res.json({code: 99, data: {}, extra: {}}).end();
  var update = {}, updateAccount = {};
  if (data.gender) update.sex = updateAccount.sex = data.gender;
  if (data.address) update.address = updateAccount.address = new Buffer(data.address, 'base64').toString('utf8');
  if (data.status) update.statusMsg = new Buffer(data.status, 'base64').toString('utf8');
  if (data.fullname) update.fullname = updateAccount.fullname = new Buffer(data.fullname, 'base64').toString('utf8');
  if (data.phone) update.phone = updateAccount.phoneNumber = data.phone;
  if (data.deviceid) update.deviceId = updateAccount.deviceId = data.deviceid;
  if (data.email) update.email = updateAccount.email = data.email;
  if (data.birthday) { update.birthday = moment(data.birthday, 'YYYY-MM-DD').toDate(); updateAccount.birthday = data.birthday};

  UserDao
    .getUserIdByUsername(data.uname)
    .then(function (uid) {
      var mysqlClient = pomelo.app.get('mysqlClient');
      return [mysqlClient
        .User.update(update, {
          where: {
            uid: uid
          }
        }), UserDao.updateUserProfile(uid, updateAccount)];
    })
    .spread(function () {
      UserDao.deleteCache(data.uname);
      return res.json({code: 0, data: {}, message: ''})
    })
    .catch(function (err) {
      console.log(err);
      res.json({code: 99, data: {}, message: 'Có lỗi xảy ra'})
    })
    .finally(function () {
      data = null;
    })
};

var friendListing = function (req, res) {
  var data = req.query;

};