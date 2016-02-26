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
  var players = msg.players;
  var curServer = this.app.curServer;
  var game = this.app.game;
  if (curServer.id === 'game-server-' + gameId * 10){
    // tạo mới bàn chơi;
    // tạo mới room;
    var hallConfigs = this.app.get('dataService').get('hallConfig').data;
    var hallConfig = hallConfigs['' + gameId + consts.HALL_ID.CAO_THU];
    game.boardManager.createRoomEmpty(hallConfig, consts.HALL_ID.CAO_THU * 100 + 10);
    // tạo bàn chơi
    for (var i = 0; i <= players.length; i++) {
      var opts = utils.clone(hallConfig);
      if (opts.hallId === consts.HALL_ID.LIET_CHAP){
        opts.lockMode = msg.lockMode || [3]; // liệt tốt 5;
        opts.removeMode = [];
        opts.optional = JSON.stringify({lock: opts.lockMode, remove: opts.removeMode});
      }
      opts.username = players[i];
      opts.timeWait = 60000; // thời gian chờ là 1 phút
      opts.matchPlay = msg.matchPlay || 3;
      opts.timePlayer = msg.timePlay;
      opts.configBet = [msg.bet || 5000, msg.bet || 5000];
      opts.turnTime = msg.turnTime || 3 * 60;
      opts.bet = msg.bet || 5000;
      opts.totalTime = msg.turnTime || 15 * 60;
      opts.base = true;
      opts.level = msg.level || 0;
      opts.roomId = roomId;
      opts.index = i + 1;
      exp.createBoard(opts);
    }
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
