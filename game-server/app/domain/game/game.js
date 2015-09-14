/**
 * Created by vietanha34 on 6/11/14.
 */

var pomelo = require('pomelo');
var utils = require('../../util/utils');
var logger = require('pomelo-logger').getLogger('game', __filename);
var channelUtil = require('../../util/channelUtil');
var boardPool = require('./boardPool');
var lodash = require('lodash');
var consts = require('../../consts/consts');
var async  = require('async');

/**
 * Tập hợp ,quản lý trò chơi, bàn chơi trong 1 process game
 *
 * @module Game
 * @class Game
 * @param {Object} opts
 * @api public
 */
var Game = function (opts) {
  this.gameId = opts.gameId;
  this.serverId = opts.serverId;
  this.district = {};
  this.boardManager = boardPool;
  this.boardManager.init({serverId: opts.serverId, gameId : this.gameId});
  this.init = false;
};

module.exports = Game;

/**
 * @api public
 */
Game.prototype.start = function (cb) {
  var self = this;
  if (!this.init) {
    async.waterfall([
      function (done) {
        // close all board before
        pomelo.app.get('boardService').delBoardByServerId(self.serverId, done);
      },
      function (done) {
        self.initBoards(cb);
        self.init = true;
        done();
      }
    ]);
  }else {
    utils.invokeCallback(cb);
  }
};

Game.prototype.stop = function (cb) {
  this.boardManager.stop(cb);
};

Game.prototype.maintenance = function (opts) {
  this.boardManager.maintenance(opts);
};

/**
 * Tạo bàn chơi mới
 *
 * @method createBoard
 * @param {Object} params
 * @param {Function} cb
 */

Game.prototype.createBoard = function (params, cb) {
  var self = this;
  this.boardManager.create(params, function (err, res) {
    if (res) {
      utils.invokeCallback(cb, err, {boardId: res, serverId: self.serverId, roomId : params.roomId})
    }
    else {
      logger.error(err);
      utils.invokeCallback(cb, err)
    }
  });
};

/**
 * Lấy về 1 bàn chơi đã có sẵn
 *
 * @method getBoard
 * @param {String} boardId
 * @returns {*}
 */
Game.prototype.getBoard = function (boardId) {
  return this.boardManager.getBoard(boardId)
};

/**
 * Khởi tạo danh sách các bàn chơi mặc định
 *
 * @method initBoards
 * @api private
 */
Game.prototype.initBoards = function (cb) {
  var roomKey = Object.keys(consts.ROOM_ID);
  var gameService = pomelo.app.get('gameService');
  for (var j  = 0, len = roomKey.length; j  < len; j ++) {
    var roomName = roomKey[j];
    var params = gameService.gameConfig[this.gameId + '-' + consts.ROOM_ID[roomName]];
    for(var z = params.configMoney[1]; z < params.configMoney[2]; z+= params.configMoney[0]){
      var opts = utils.clone(params);
      opts.bet = z;
      opts.base = true;
      for (var i = 0, leni = 10; i < leni; i++) {
        this.createBoard(opts, function (err, results) {
          if (err) {
            logger.error(err);
          }
        })
      }
    }
  }
  utils.invokeCallback(cb);
};


/**
 * Đóng bàn chơi, sẽ đóng bàn chơi khi bàn chơi đã thực hiện xong
 *
 * @method delBoard
 * @param boardId
 */
Game.prototype.delBoard = function (boardId) {
  return this.boardManager.delBoard(boardId)
};

/**
 * Lấy về kênh của trò chơi
 *
 * @method getChannel
 * @returns {*}
 */
Game.prototype.getChannel = function () {
  if (!this.channel) {
    var channelName = channelUtil.getGameChannelName(this.areaId);
    utils.myPrint('channelName = ', channelName);
    this.channel = pomelo.app.get('channelService').getChannel(channelName, true);
  }
  utils.myPrint('this.channel = ', this.channel);
  return this.channel;
};