/**
 * Created by vietanha34 on 1/8/16.
 */

var models = require('../app/dao/mysqlModels');
var async = require('async');
var mysqlConfig = {
  "host" : "172.16.10.21",
  "port": 3337,
  "database": "cothu",
  "dialert" : "mysql",
  "username": "u.cothu",
  "password": "b8PC5ZbLHMdt",
  "timezone": "+07:00",
  "pool": {
    "max": 100,
    "min": 0,
    "idle": 10000
  }
};

var abuse = require('../app/util/abuse');

var data = [];

var keys = Object.keys(abuse);

for(var i=0, len = keys.length; i< len; i++){
  var key = keys[i];
  data.push({word : key});
}

var db = models(mysqlConfig);
var sequelize = db.sequelize;

db
  .AbuseWord
  .bulkCreate(data);

//var mysql      = require('mysql');
//var connection = mysql.createConnection(mysqlConfig);
//
//connection.connect();
//
//connection.query('select uid, vnd FROM LogPayTransactions where status = 0 limit 0,10')
//  .stream({highWaterMark: 5})
//  .pipe(function (data) {
//    console.log('data : ', data);
//  });

//connection.end();