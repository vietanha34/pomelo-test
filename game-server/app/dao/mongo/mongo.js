/**
 * Created by vietanha34 on 1/7/15.
 */

var mongoose = require('mongoose');
var Code = require('../../consts/code');
var consts = require('../../consts/consts');
var utils = require('../../util/utils');
var async = require('async');
var logger = require('pomelo-logger').getLogger('mongo', __filename, process.pid);
var fs = require('fs');
var path = require('path');


module.exports = function (opts) {
  var schemaDir = opts.schemaDir;
  console.log("connect to mongodb  with host : %s, port : %s", opts.dbHost, opts.dbPort);
  var dbUri = "mongodb://" + opts.dbHost + ":" + opts.dbPort + "/" + opts.dbName;
  var mongoClient = mongoose.createConnection(dbUri, {server:{auto_reconnect:true}});
  mongoClient.on('error', function (error) {
    logger.error(error);
    mongoose.disconnect();
  });
  mongoClient.on('connected', function() {
    console.log('MongoDB connected!');
  });
  mongoClient.once('open', function() {
    console.log('MongoDB connection opened!');
  });
  mongoClient.on('reconnected', function () {
    console.log('MongoDB reconnected!');
  });
  mongoClient.on('disconnected', function() {
    console.log('MongoDB disconnected!');
    mongoose.connect(dbUri, {server:{auto_reconnect:true}});
  });
  preloadSchema(mongoClient, schemaDir);
  return mongoClient;
};


var preloadSchema = function (mongoClient, schemaDir) {
  var files = utils.walk(schemaDir);
  files.forEach(function(file) {
    if (path.extname(file) !== '.js') {
        return
    }
    require(file)
  });
};


