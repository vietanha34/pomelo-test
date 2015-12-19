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
var moment = require('moment');
var Formula = require('../consts/formula');
var MD5 = require('MD5');

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
        break;
      default:
        res.status(500).json({msg: "có lỗi xảy ra"})
    }
  });

  app.get('/experience', function (req, res) {
    var data = req.query;
    if (!data) return res.json({ec: 0, data: {}, extra: {}}).end();
    var gameId = data.game_id;
    var username = data.uname;
    return UserDao.getUserPropertiesByUsername(username, [''])
  });


  app.get('/profile', getProfile);

  app.get('/expProfile', getExpProfile);

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
          return res.json({code:0, message: "", data: {uname:data.uname}, extra : { firstLogin : 0, dt_id :1}}).end();
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

var getProfile = function (req, res) {
  var data = req.query;
  if (!data) return res.json({ec: 0, data: {}, extra: {}}).end();
  return UserDao.getUserPropertiesByUsername(data.uname, ['username', 'gold', 'money2', 'phone', 'email', ['distributorId', 'dt_id'], ['spId', 'sp_id'], ['deviceId','deviceid'], ['createdAt', 'regDate'], ['updatedAt', 'lastupdate']])
    .then(function (user) {
      user.money = 0;
      user.pass = '';
      user.ban = 0;
      user.idcard  = '';
      user['lastupdate'] = moment(user['lastupdate']).unix();
      user['regDate'] = moment(user['regDate']).unix();
      return res.json(user).end();
    })
    .catch(function (err) {
      console.log(err);
      return res.json({}).end();
    })
};

var getExpProfile = function (req, res) {
  var data = req.query;
  if (!data) return res.json({ec: 0, data: {}, extra: {}}).end();
  return UserDao.getUserPropertiesByUsername(data.uname, ['uid', 'statusMsg', 'address', 'fullname', 'birthday' ,['exp', 'totalxp'], ['vipPoint', 'vpoint'], ['sex','gender']])
    .then(function (user) {
      user.maxxp = Formula.calExp(user.level + 1);
      user.timeplay = 0;
      user.birthday = user.birthday ? '0000-00-00' : moment(user.birthday).format('YYYY-MM-DD');
      return res.json(user).end();
    })
    .catch(function (err) {
      console.log(err);
      return res.json({}).end();
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
  return UserDao.updateProfile(data.uname, {
    passwordMd5 : MD5(data.newpass)
  })
  .then(function (result) {
    })
};

var banUser = function (req, res) {
  var data = req.query;
  if (!data) return res.json({code: 99, data: {}, extra: {}}).end();
  return UserDao.updateProfile(data.uname, {
    status : 2
  })
  .then(function (result) {
      console.log('result banUser : ', result);
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

    })
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