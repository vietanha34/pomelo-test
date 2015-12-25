var express = require('express');
var fs = require('fs');
var path = require('path');
var utils = require('./utils');
var bodyParser = require('body-parser');
var timeout = require('connect-timeout');
var morgan = require('morgan');
var pomelo = require('pomelo');

module.exports = function(app, opts) {
  return new Http(app, opts);
};

var Http = function(app, opts) {
  var self = this;
  this.app = app;
  this.name = '__httpdebug__';
  this.userDicPath = null;
  this.opts = opts;
  this.isStart = false;
  this.routePath = opts.routePath;
  this.app = express();
  this.app.use(bodyParser.json()); // for parsing application/json
  this.app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
  this.app.use(timeout('3s'));
  this.app.use(morgan('dev'));
  fs.readdirSync(this.routePath).forEach(function(file) {
    var route= path.join(self.routePath , file);
    require(route)(self.app);
  });
};

Http.prototype.start = function(cb) {
  if (!this.isStart) {
    httpStart.apply(this, cb);
  }
  this.isStart = true;
};

Http.prototype.stop = function (cb) {
  httpStop.apply(this, cb);
};

var httpStop = function(cb) {
  utils.invokeCallback(cb)
};

var httpStart = function(cb) {
  // development error handler
  // will print stacktrace
  if (this.app.get('env') === 'development') {
    this.app.use(function(err, req, res, next) {
      console.log(err);
      res.status(err.status || 500);
      res.json({ message : err.message})
    });
  }

  // production error handler
  // no stacktraces leaked to user
  this.app.use(function(err, req, res, next) {
    console.log(err);
    res.status(err.status || 500);
    res.json({ message : err.message})
  });
  var currentServer = pomelo.app.curServer;
  this.app.listen(currentServer.httpPort || 8889);
  utils.invokeCallback(cb);
};


