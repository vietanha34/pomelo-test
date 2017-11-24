"use strict";
/**
 * Created by bi on 4/27/15.
 */

var utils = require('../util/utils');
var code = require('../consts/code');
var PromotionDao = require('../dao/paymentDao');
var UserDao = require('../dao/userDao');
var Promise = require('bluebird');
var pomelo = require('pomelo');
var consts = require('../consts/consts');
var lodash = require('lodash');

module.exports = function(app) {
  app.post('/payment/promotion', function(req, res) {
    var data = utils.JSONParse(req.body.data);
    if (!data) return res.json({ ec:0, data: {}, extra: {}}).end();
    var inReview = 1;
    var mysqlClient = pomelo.app.get('mysqlClient');
    var list = Object.keys(consts.UMAP_GAME_NAME);
    var listAttributes = [];
    var achievement, uid;
    for (var i=0; i<list.length; i++) {
      var gameName = consts.UMAP_GAME_NAME[list[i]];
      listAttributes.push(gameName+'Win');
      listAttributes.push(gameName+'Draw');
      listAttributes.push(gameName+'Lose');
      listAttributes.push(gameName+'GiveUp');
    }
    return UserDao.getUserIdByUsername(data.username)
      .then(function (u) {
        uid = u;
        if (!uid) {
          return Promise.reject()
        }
        return mysqlClient
          .Achievement
          .findOne({
            where: {
              uid: uid
            },
            attributes: listAttributes,
            raw: true
          });
      })
      .then(function (achi) {
        achievement = achi;
        if (!achievement) {
          return Promise.reject();
        }
        var keys = Object.keys(achievement);
        var totalMatch = 0;
        for (var i = 0, len = keys.length; i < len; i++) {
          var key = keys[i];
          if (lodash.isNumber(achievement[key])) {
            totalMatch += achievement[key]
          }
        }

        if (totalMatch > 10) {
          inReview = 0;
        }

        inReview = data.platform === consts.PLATFORM_ENUM.WEB ? 0 : inReview

        return UserDao.getUserPropertiesByUsername(data.username, ['uid','distributorId'])
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
      })
      .spread(function (promotion, extra) {
        return res.json({ec: 0, data: promotion, extra: extra, inReview: inReview}).end();
      })
      .catch(function (e) {
        if (e) {
          console.error('payment cms error:', e);
        }
        return res.json({ec: 0, data: {}, extra: {}, inReview: inReview}).end();
      })
      .finally(function () {
        console.error('promotion: ', data, uid, listAttributes, achievement);
      })
  });
};
