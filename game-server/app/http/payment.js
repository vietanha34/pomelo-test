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
  app.post('/payment/promotion', function(req, res) {
    var data = utils.JSONParse(req.body.data);
    if (!data) return res.json({ ec:0, data: {}, extra: {}}).end();
    UserDao.getUserPropertiesByUsername(data.username, ['uid','distributorId'])
      .then(function(user) {
        user = user || {};
        user.uid = user.uid || 1;
        user.username = data.username || '';
        user.dtId = user.distributorId || 1;

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
};
