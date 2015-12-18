/**
 * Created by vietanha34 on 12/18/15.
 */

/**
 * Created by bi on 4/27/15.
 */

var utils = require('../util/utils');
var code = require('../consts/code');
var PromotionDao = require('../dao/paymentDao');
var UserDao = require('../dao/userDao');
var Promise = require('bluebird');
var pomelo = require('pomelo');

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
      case 'acc.ban':
        break;
      case 'acc.loginViaApp':
        loginViaApp(req, res);
        break;
      case 'acc.change':
        break;
      case 'acc.forgot':
        break;
      default:
        res.status(500).json({msg: "có lỗi xảy ra"})
    }
  });

  app.post('/logout', function (req, res) {

  });

  app.post('/change', function (req, res) {

  });

  app.get('/experience', function (req, res) {
    var data = req.query;
    if (!data) return res.json({ec: 0, data: {}, extra: {}}).end();
    var gameId = data.game_id;
    var username = data.uname;
    return UserDao.getUserPropertiesByUsername(username, [''])
  });

  app.get('/bank', function (req, res) {
    var data = req.query;
    if (!data) return res.json({ec: 0, data: {}, extra: {}}).end();
    var api = data.api;
    var uname = data.uname;
    var gold = data.gold;
    var opts = {
      gold : gold
    };
    var method = api === 'bank.subgold' ? 'subBalance' : 'addBalance';
    UserDao.getUserIdByUsername(uname)
      .then(function (uid) {
        opts.uid = uid;
        return pomelo.app.get('paymentService')[method](opts, function (err, result) {
          if (err){
            res.json({code : 99, message : "Có lỗi xảy ra", data:{}});
          }else if (result.ec === code.OK){
            res.json({code : 0, message: '', data:{}});
          }else {
            res.json({code: 1, message: "Cộng trừ tiền thất bại", data: {}})
          }
        })
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
      console.log('result : ', result);
      if (result && !result.code){
        return UserDao.getUserIdByUsername(data.uname)
      }else {
        res.json(result).end();
      }
    })
    .then(function (uid) {
      if (uid){
        return Promise.promisify(pomelo.app.get('statusService').getStatusByUid, pomelo.app.get('statusService'))(uid, null)
      }
    })
    .then(function (status) {
      if (status){
        if (status.online) {
          return Promise.reject({ code : 12, msg : 'Bạn đang đăng nhập trên phiên bản cờ thủ mới', data :{}})
        } else {
          return res.json({code:0, message: "", data: {uname:data.uname}, extra : { firstLogin : 0}}).end();
        }
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