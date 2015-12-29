/*!
 * Pomelo -- consoleModule onlineUser
 * Copyright(c) 2012 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */
var utils = require('../util/utils');
var pomelo = require('pomelo');
var Code = require('../consts/code');
var consts = require('../consts/consts');
var lodash = require('lodash');
var notifyDao = require('../dao/notifyDao');

module.exports = function (opts) {
  return new Module(opts);
};

module.exports.moduleId = 'maintenance';

var Module = function (opts) {
  opts = opts || {};
  this.app = opts.app;
  this.type = opts.type || 'pull';
};

Module.prototype.monitorHandler = function (agent, msg, cb) {
  var game, channelService;
  if (!msg) {
    utils.invokeCallback(cb, null, {});
    return
  }
  game = this.app.game;
  if (!msg.enable) {
    this.app.set('maintenance', null);
    utils.invokeCallback(cb, null, {});
    if (game){
      if (msg.type === consts.MAINTENANCE_TYPE.ALL || (msg.type === consts.MAINTENANCE_TYPE.GAME && lodash.isArray(msg.game) && msg.game.indexOf(game.gameId) > -1)) {
        this.app.game.maintenance(msg);
      }
    }
    return
  }
  if (game) {
    if (msg.type === consts.MAINTENANCE_TYPE.ALL || (msg.type === consts.MAINTENANCE_TYPE.GAME && lodash.isArray(msg.game) && msg.game.indexOf(game.gameId) > -1)) {
      this.app.game.maintenance(msg);
    }
  } else {
    this.app.set('maintenance', msg);
    if (this.app.getServerId() == 'home-server-1') {
      channelService = pomelo.app.get('channelService');
      notifyDao.push({
        type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
        title: msg.title || 'Bảo trì',
        msg: msg.message || 'Máy chủ sẽ được bảo trì sau ít phút nữa, người chơi vui lòng rời bàn khi ván chơi kết thúc',
        buttonLabel: 'Ok',
        command: {target: consts.NOTIFY.TARGET.NORMAL},
        scope: consts.NOTIFY.SCOPE.ALL, // gửi cho user
        image:  consts.NOTIFY.IMAGE.ALERT
      });
      channelService.broadcast('connector', 'onNotify', dropDownNotify, {}, function (err, res) {
      });
      channelService.broadcast('connector', 'onNotify', notifyCenterNotify, {}, function (err, res) {
      });
    }
  }
};

Module.prototype.masterHandler = function (agent, msg, cb) {
  agent.request('home-server-1', module.exports.moduleId, msg, cb);
};

Module.prototype.clientHandler = function (agent, msg, cb) {
  agent.notifyAll(module.exports.moduleId, msg);
  utils.invokeCallback(cb, null, {ec: Code.OK});
};
