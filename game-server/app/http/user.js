/**
 * Created by bi on 12/21/15.
 */

var utils = require('../util/utils');
var code = require('../consts/code');
var Consts = require('../consts/consts');
var UserDao = require('../dao/userDao');
var Promise = require('bluebird');
var pomelo = require('pomelo');
var moment = require('moment');

module.exports = function(app) {

  app.get('/user/requireLogin', function (req, res) {
    pomelo
      .app
      .get('redisInfo')
      .multi()
      .LRANGE('list:requireLogin:newVersion', 0, -1)
      .DEL('list:requireLogin:newVersion')
      .exec(function (err, replies) {
        if (replies && replies[0].length) {
          return res.json({code: code.ACCOUNT_OLD.OK, data: replies[0]});
        }
        res.json({code: code.ACCOUNT_OLD.EMPTY});
      });
  });

  app.get('/user/allowLogin', function (req, res) {
    var data = req.query.data || '';
    if (data) {
      var arr = data.split(',');
      for (var i = 0; i < arr.length; i++) {
        pomelo
          .app
          .get('redisInfo')
          .zrem('onlineUser:oldVersion', arr[i]);
      }
    } else {
      res.json({code: code.ACCOUNT_OLD.WRONG_PARAM});
    }
  })
};