/**
 * Created by bi on 12/19/15.
 */

var utils = require('../util/utils');
var code = require('../consts/code');
var Consts = require('../consts/consts');
var UserDao = require('../dao/userDao');
var Promise = require('bluebird');
var pomelo = require('pomelo');
var moment = require('moment');
var Formula = require('../consts/formula');
var MD5 = require('MD5');
var encrypt = require('../util/encrypt');

module.exports = function(app) {
  app.get('/acc', function (req, res) {
    var data = req.query;
    switch (data.api){
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
        res.status(500).json({msg: "có lỗi xảy ra"});
        break;
      case 'acc.logout':
        logout(req, res);
        break;
      default:
        res.status(500).json({msg: "có lỗi xảy ra"})
    }
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
                  exp : db.sequelize.literal(' exp + ' + xp)
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
            if (user[gameName + 'Elo'] + elo < 500) {
              update[gameName + 'Elo'] = 500
            } else {
              update[gameName + 'Elo'] = db.sequelize.literal(' '  + gameName + 'Elo + ' + elo);
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
            })
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
              for (var i = 0 ; i < keys.length; i++) {
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
      gold : gold,
      username : uname
    };
    UserDao.getUserIdByUsername(uname)
      .then(function (uid) {
        opts.uid = uid;
        if (api === 'bank.subgold') {
          pomelo
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
                response.data = bank;
                return res.json(response);
              }
              res.json(response);
            })
            .catch(function (err) {
              console.error(err);
              res.json(response);
            })
        } else {
          pomelo
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
        console.log('err : ', err);
        res.json({msg: err.msg || 'có lỗi xảy ra', code : 99}).end()
      })
      .finally(function () {

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
      if (result && !result.code){
        return UserDao.getUserIdByUsername(data.uname)
      }else {
        res.json(result).end();
      }
    })
    .then(function (uid) {
      if (uid){
        return Promise.promisify(pomelo.app.get('statusService').getStatusByUid, pomelo.app.get('statusService'))(uid, null)
      } else {
        res.json({code: code.ACCOUNT_OLD.USER_NOT_EXISTS});
      }
    })
    .then(function (status) {
      if (status){
        if (status.online) {
          return Promise.reject({ code : 1, message : 'Bạn đang đăng nhập trên phiên bản cờ thủ mới', data :{}})
        } else {
          // add user login in old version
          pomelo
            .app
            .get('redisInfo')
            .zadd('onlineUser:oldVersion', Date.now(), data.uname, function (e, r) {
              if (!e) {
                return res.json({
                  code: 0,
                  message: "",
                  data: { uname: this.uname },
                  extra : {
                    firstLogin : 0,
                    dt_id :1 //TODO: change distributor ID
                  }
                }).end();
              }else {
                return res.json({ code : 1, message : 'Bạn đang đăng nhập trên phiên bản cờ thủ mới', data :{}}).end();
              }
            }.bind({uname: data.uname}));
        }
      } else {
        res.json({code: code.ACCOUNT_OLD.ERROR});
      }
    })
    .catch(function (err) {
      console.log(err);
      res.json({message: err.message || 'có lỗi xảy ra', code : err.code || 99, data : {}}).end()
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
      if (profile){
        return Promise.resolve(profile);
      } else {
        return UserDao.getUserPropertiesByUsername(data.uname, ['username', ['gold', 'money2'], 'phone', 'email', ['distributorId', 'dt_id'], ['spId', 'sp_id'], ['updatedAt', 'lastupdate']])
          .then(function (user) {
            if (!user) return res.status(500).end();
            user.money = 0;
            user.pass = '';
            user.ban = 0;
            user.idcard  = '';
            user['lastupdate'] = moment(user['lastupdate']).unix();
            user['regDate'] = moment(user['regDate']).unix();
            pomelo.app.get('redisInfo').hmset('cothu:profile:' + data.uname, user);
            pomelo.app.get('redisInfo').expire('cothu:profile:' + data.uname, 60 * 30);
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
      if (profile){
        return Promise.resolve(profile);
      } else {
        return UserDao.getUserPropertiesByUsername(data.uname, ['uid', ['statusMsg', 'status'], 'address', 'fullname', 'birthday' ,['exp', 'totalxp'], ['vipPoint', 'vpoint'], ['sex','gender']])
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
            pomelo.app.get('redisInfo').expire('cothu:expProfile:' + data.uname, 60 * 30);
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
      res.json({code:99, message:'có lỗi xảy ra'}).end()
    })
};

var changePassword = function (req, res) {
  var data = req.query;
  if (!data) return res.json({code: 99, data: {}, extra: {}}).end();
  UserDao
    .updateProfile(data.uname, {
      passwordMd5 : MD5(data.newpass),
      password : encrypt.cryptPassword(data.newpass)
    })
    .then(function (result) {
      if (result && result[0]){
        pomelo.app.get('redisInfo')
          .hset('cothu:' + data.uname, 'passwd', MD5(data.newpass));
        pomelo.app.get('redisInfo')
          .expire('cothu:' + data.uname, 60 * 60 *24);
        return res.json({ code : 0, message: "Đổi mật khẩu thành công", data : { newpass : data.newpass}})
      }else {
        return res.json({ code : 1, message: "Không thể cập nhật được mật khẩu", data : {}});
      }
    });
};

var banUser = function (req, res) {
  var data = req.query;
  if (!data) return res.json({code: 99, data: {}, extra: {}}).end();
  return UserDao.updateProfile(data.uname, {
    status : 2
  })
    .then(function (result) {
      if (result && result[0]){
        return res.json({ code : 0, message: "Khoá người chơi thành công", data : { newpass : data.newpass}})
      }else {
        return res.json({ code : 1, message: "Người chơi không tồn tại", data : {}});
      }
    })
};

var existUser = function (req, res) {
  var data = req.query;
  if (!data) return res.json({code: 99, data: {}, extra: {}}).end();
  return UserDao.isExist(data.uname)
    .then(function (data) {
      if(data){
        return res.json({code: 14, message:'', data:data});
      }else {
        return res.json({code : 0, message :"user không tồn tại", data : {}})
      }
    })
};

var activeUser = function (req, res) {
  var data = req.query;
  if (!data) return res.json({code: 99, data: {}, extra: {}}).end();
  return UserDao.updateProfile(data.uname, {
    status : 1
  })
    .then(function (result) {
      if (result && result[0]){
        return res.json({ code : 0, message: "Mở khoá người chơi thành công", data : { newpass : data.newpass}})
      }else {
        return res.json({ code : 1, message: "Người chơi không tồn tại", data : {}});
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

var forgotPass = function (req, res) {
  var data = req.query;
  if (!data) return res.json({code: 99, data: {}, extra: {}}).end();
  pomelo
    .app.get('accountService')
    .forgotPassword({
      username : data.uname,
      phoneNumber : data.phone
    })
    .then(function (result) {

    })
};