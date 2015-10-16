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
var async = require('async');

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
  this.boardManager.init({serverId: opts.serverId, gameId: this.gameId});
  this.init = false;
};

module.exports = Game;

/**
 * @api public
 */
Game.prototype.start = function (cb) {
  var self = this;
  if (!this.init) {
    return pomelo.app.get('boardService').delBoardByServerId(self.serverId)
      .then(function () {
        console.log('initBoard');
        self.initBoards();
        self.init = true;
        return utils.invokeCallback(cb);
      });
  } else {
    return utils.invokeCallback(cb);
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
      utils.invokeCallback(cb, err, {boardId: res, serverId: self.serverId, roomId: params.roomId})
    }
    else if (!!err) {
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
Game.prototype.initBoards = function () {
  var hallConfigs = pomelo.app.get('dataService').get('hallConfig').data;
  for (var i = 1, len = 10; i < len; i++) {
    var hallConfig = hallConfigs['' + this.gameId + i];
    if (hallConfig) {
      var hallId = parseInt(hallConfig.hallId);
      for (var j = 1, lenj = parseInt(hallConfig.numRoom); j <= lenj; j++) {
        this.createRoom(hallConfig, hallId * 100 + j)
      }
    } else {
      break;
    }
  }
};

Game.prototype.createRoom = function (hallConfig, roomId) {
  var self = this;
  return pomelo.app.get('boardService')
    .addRoom({
      serverId: this.serverId,
      gameId: this.gameId,
      roomId: roomId,
      hallId: parseInt(hallConfig.hallId)
    })
    .then(function () {
      for (var i = 1; i <= 50; i++) {
        var opts = utils.clone(hallConfig);
        opts.bet = parseInt(hallConfig.goldMin);
        opts.base = true;
        opts.roomId = roomId;
        opts.index = i;
        self.createBoard(opts)
      }
    })
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