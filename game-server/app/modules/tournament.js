/**
 * Created by vietanha34 on 3/9/15.
 */

var utils = require('../util/utils');
var pomelo = require('pomelo');
var lodash = require('lodash');
var Code = require('../consts/code');
var logger = require('pomelo-logger').getLogger(__filename);
var consts = require('../consts/consts');


module.exports = function (opts) {
  return new Module(opts);
};

module.exports.moduleId = 'tournament';

var Module = function (opts) {
  opts = opts || {};
  this.app = opts.app;
  this.type = opts.type || 'pull';
};

Module.prototype.monitorHandler = function (agent, msg, cb) {
  var gameId = msg.gameId;
  var curServer = this.app.curServer;
  var game = this.app.game;
  if (curServer.id === 'game-server-' + gameId * 10){
    // tạo mới bàn chơi;
    // tạo mới room;
    var hallConfigs = this.app.get('dataService').get('hallConfig').data;
    var hallConfig = hallConfigs['' + gameId + msg.hallId];
    game
      .boardManager
      .delRoom(msg.roomId)
      .then(function () {
        game.boardManager.createRoomTournament(hallConfig, msg.roomId, msg);
      });
  }
  utils.invokeCallback(cb, null, { ec :Code.OK})
};

Module.prototype.masterHandler = function (agent, msg, cb) {
  agent.request('tournament-server-1', module.exports.moduleId, msg, cb);
};

Module.prototype.clientHandler = function (agent, msg, cb) {
  console.error('handler message : ', msg);
  var gameId = msg.gameId;
  if (gameId) {
    agent.notifyByType('game', module.exports.moduleId, msg);
  }
  utils.invokeCallback(cb, null, { ec :Code.OK})
};
