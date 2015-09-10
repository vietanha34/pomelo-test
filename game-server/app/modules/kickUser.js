/**
 * Created by vietanha34 on 7/30/15.
 */

/*!
 * Pomelo -- consoleModule maintenance
 * Copyright(c) 2012 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */
var utils = require('../util/utils');
var pomelo = require('pomelo');
var Code = require('../consts/code');
var consts = require('../consts/consts');
var lodash = require('lodash');
var MD5 = require('MD5');

module.exports = function (opts) {
  return new Module(opts);
};

module.exports.moduleId = 'kickUser';

var Module = function (opts) {
  opts = opts || {};
  this.app = opts.app;
  this.type = opts.type || 'pull';
};

Module.prototype.monitorHandler = function (agent, msg, cb) {
  var self = this;
  if (!msg.username || !msg.signature) {
    //return res.status(500).json({ec: 500, msg: 'invalid params'});
    return
  }
  if (msg.signature !== MD5([msg.username || '', msg.userId || '', consts.CMS_SECRET_KEY].join('|')))
    //return res.status(500).json({ ec : 500, msg : 'wrong signature'});
    return;

  this.app.get('mysqlClient')
    .AccUser
    .findOne({
      where : {
        $or: [
          {username: msg.username},
          {id: parseInt(msg.userId)}
        ]
      },
      attributes : ['id'],
      raw : true
    })
    .then(function (user) {
      if (user){
        kickUser(self.app, user.id, function () {
        });
      }
    })
};

Module.prototype.masterHandler = function (agent, msg, cb) {
  agent.request('home-server-1', module.exports.moduleId, msg, cb);
};

Module.prototype.clientHandler = function (agent, msg, cb) {
  agent.notifyByType('home', module.exports.moduleId, msg);
  utils.invokeCallback(cb, null, {ec: Code.OK});
};


var kickUser = function kickUser(app, uid, cb) {
  var statusService = app.get('statusService');
  statusService.getSidsByUid(uid, function (err, sids) {
    app.rpc.connector.connectorRemote.kick({frontendId: sids[0]}, uid, cb);
  });
};