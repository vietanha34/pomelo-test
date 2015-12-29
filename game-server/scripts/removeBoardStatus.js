/**
 * Created by vietanha34 on 7/31/15.
 */


var redis = require('redis').createClient(3339, '172.16.10.21');
redis.select(3);
var async = require('async');
var fs = require('fs');
var moment = require('moment');
var utils = require('../app/util/utils');
var models = require('../app/dao/mysqlModels');
var Promise = require('bluebird');
var db = models({
  "host": "172.16.10.21",
  "port": 3337,
  "database": "cothu",
  "dialert": "mysql",
  "username": "u.cothu",
  "password": "b8PC5ZbLHMdt",
  "timezone": "+07:00",
  "pool": {
    "max": 100,
    "min": 0,
    "idle": 10000
  }
});

//var multi = redis.multi();
//for (var i = 0, len = uids.length; i < len; i++) {
//  var key = 'ionline:userInfo:' + uids[i].uid;
//  multi.hmset(key, { chip : 50000, tempChip : 50000 })
//}
//
//multi.exec(function (err, infos) {
//  console.log('infos : ', infos);
//});

redis.keys('POMELO:STATUS:board:*', function (err, keys) {
  if (keys) {
    for (var i = 0, len = keys.length; i < len; i++) {
      redis.smembers(keys[i], function (err, result) {
        if (result && result.length > 0) {
          Promise.delay(0)
            .then(function () {
              return [
                db.sequelize.query('SELECT * from Boards WHERE boardId = :boardId', {
                  replacements: {boardId: result[0]},
                  type: db.sequelize.QueryTypes.SELECT,
                  raw: true
                }),
                Promise.resolve(this.key)
              ]
            }.bind({key : this.key}))
            .spread(function (boards, key) {
              console.log('boards: ', boards, key);
              if (boards.length === 0){
                redis.del(key);
              }
            })
        }
      }.bind({ key : keys[i]}))
    }
  }
});