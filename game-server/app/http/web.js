/**
 * Created by bi on 12/21/15.
 */

var code = require('../consts/code');
var pomelo = require('pomelo');
var TopDao = require('../dao/topDao')
var RedisKeyUtils = require('../util/redisKeyUtil')
var lodash = require('lodash')
var UserDao = require('../dao/userDao')
var utils = require('../util/utils')

module.exports = function(app) {

  app.get('/stats/top', function (req, res) {
    var data = req.query || {};
    if (data.type !== code.TOP_TYPE.GOLD && data.type !== code.TOP_TYPE.VIP) {
      return res.json({
        ec: code.FAIL,
        msg: 'Sai Tham số'
      })
    }
    TopDao.getTop(data.uid, data.type, false)
      .then(function(result) {
        return res.json({
          ec: 200,
          data: result
        });
      })
      .catch(function(e) {
        console.error('/stats/top: ', e);
        return res.json({ec: code.FAIL, msg: 'Có lỗi xảy ra'});
      });
  });

  app.get('/stats/online', function (req, res) {
    var redisClient = pomelo.app.get('redisCache');
    var count = 0
    redisClient.getAsync(RedisKeyUtils.getCcuKey())
      .then((c) => {
        count = c
        return pomelo.app.get('waitingService').getList({
          where : {
            gold: {
              $gte : 1000
            },
          },
          attributes: ['userId'],
          limit: 10,
          raw : true
        })
      })
      .then(function (users) {
        if (lodash.isArray(users)) {
          var uids = [];
          for (var i = 0, len = users.length; i < len; i++) {
            uids.push(users[i].userId);
          }
        }
        var properties = ['uid', 'username', 'fullname', 'avatar', 'sex', 'vipPoint', 'gold', 'exp', 'statusMsg'];

        return UserDao.getUsersPropertiesByUids(uids, properties)
      })
      .map((result) => {
        result.avatar = utils.JSONParse(result.avatar, {})
        return result
      })
      .then((results) => {
        return res.json({
          ec: 0,
          users: results,
          online: count
        })
      })
      .catch(function (err) {
        console.error('/stats/online: ', err);
        res.json({
          ec : Code.FAIL,
          msg: "Có lỗi xảy ra"
        });
      })

  })
};