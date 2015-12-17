/**
 * Created by bi on 4/27/15.
 */

var utils = require('../util/utils');
var code = require('../consts/code');
var PromotionDao = require('../dao/paymentDao');
var UserDao = require('../dao/userDao');
var Promise = require('bluebird');

module.exports = function (app) {
  app.post('/payment/promotion', function (req, res) {
    var data = utils.JSONParse(req.body.data);
    if (!data) return res.json({ec: 0, data: {}, extra: {}}).end();
    UserDao.getUserPropertiesByUsername(data.username, ['uid', 'distributorId'])
      .then(function (user) {
        user.username = data.username;
        user.dtId = user.distributorId;

        return [
          PromotionDao.getPromotion(user.uid),
          PromotionDao.getExtra(user)
        ];
      })
      .spread(function (promotion, extra) {
        return res.json({ec: 0, data: promotion, extra: extra}).end();
      })
      .catch(function (e) {
        console.error(e.stack || e);
        return res.json({ec: 0, data: {}, extra: {}}).end();
      });
  });

  app.get('/acc', function (req, res) {
    var data = req.query;
    if (!data) return res.json({ec: 0, data: {}, extra: {}}).end();
    UserDao.getUserIdByUsername(data.uname)
      .then(function (uid) {
        return Promise.promisify(pomelo.app.get('statusService').getStatusByUid, pomelo.app.get('statusService'))(uid)
      })
      .then(function (status) {
        if (status.online) {
          return Promise.reject({ code : 12, msg : 'Bạn đang đăng nhập trên phiên bản cờ thủ mới'})
        } else {
          return UserDao.loginWithUsername({
            username: data.uname,
            password: data.password
          })
        }
      })
      .then(function (result) {
        return res.json(result).end();
      })
      .catch(function (err) {
        res.json({msg: err.msg || 'có lỗi xảy ra', code : err.code || 99}).end()
      })
      .finally(function () {

      })
  });

  app.post('/logout', function (req, res) {

  });

  app.post('/changePassword', function (req, res) {

  });

  app.get('/bank', function (req, res) {
    var data = req.query;
    if (!data) return res.json({ec: 0, data: {}, extra: {}}).end();
    var api = data.api;
    var uname = data.username;
    var gold = data.gold;
    var opts = {
      gold : data.gold
    };
    var method = data.api === 'bank.subgold' ? 'subBalance' : 'addBalance';
    UserDao.getUserIdByUsername(data.username)
      .then(function (uid) {
        opts.uid = uid;
        return pomelo.app.rpc.manager.paymentRemote[method](opts, null, function (err, res) {
          if (err){
            res.json({code : 99});
          }else if (res.ec === code.OK){
            res.json({code : 0 });
          }else {
            res.json({code: 1 })
          }
        })
      })
      .catch(function (err) {
        res.json({msg: err.msg || 'có lỗi xảy ra', code : 99}).end()
      })
      .finally(function () {

      })
  })
};
