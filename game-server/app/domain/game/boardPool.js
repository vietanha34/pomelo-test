/**
 * Created by vietanha34 on 6/11/14.
 */

var Board = require('./board');
var channelUtil = require('../../util/channelUtil');
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('game', __filename);
var utils = require('../../util/utils');
var async = require('async');
var lodash = require('lodash');
var consts = require('../../consts/consts');

var exp = module.exports;

var boards;
var serverId;
var rooms;
var intervel;
var MAX_PLAYER_IN_ROOM = 100;
var gameId;
var maps = {};

/**
 * BoardPool quản lý các bàn chơi, khởi tạo, xóa .. trong game process
 *
 * @module Game
 * @class BoardPool
 * @param opts
 */
exp.init = function (opts) {
  boards = {};
  rooms = {};
  gameId = opts.gameId;
  serverId = opts.serverId;
  intervel = opts.interval || 2 * 60 * 1000;
  exp.check();
};

/**
 * Tạo mới bàn chơi từ tham số
 *
 * @method create
 * @param params include gameId, districtId,
 * @param cb callback function
 * @returns {boolean}
 */
exp.create = function (params, cb) {
  var boardService = pomelo.app.get('boardService');
  return boardService.genBoardId({
    serverId: serverId,
    gameId: gameId,
    gameType: consts.GAME_TYPE.NORMAL,
    roomId: params.roomId
  })
    .then(function (boardId) {
      if (boards[boardId]) {
        utils.invokeCallback(cb, null, boardId);
      }
      params.serverId = serverId;
      params.boardId = boardId;
      return Promise.resolve([Board(params, boardId), boardId]);
    })
    .spread(function (board, boardId) {
      if (board) {
        boards[boardId] = board;
        if (!rooms[board.roomId]) {
          rooms[board.roomId] = {};
        }
        return utils.invokeCallback(cb, null, board.tableId);
      } else {
        return utils.invokeCallback(cb, null, null);
      }
    })
    .catch(function (err) {
      return utils.invokeCallback(cb, err);
    })
};

/**
 * Bảo trì hệ thống
 *
 * @method maintenance
 * @param opts
 */
exp.maintenance = function (opts) {
  async.forEach(Object.keys(boards), function (item, done) {
    var board = boards[item];
    if (board) {
      board.maintenance(opts);
    }
    done();
  }, function () {

  });
};

/**
 * Xóa bàn chơi từ tham số
 *
 * @method remove
 * @param params
 * @returns {boolean}
 */
exp.remove = function (params) {
  var boardId = params.tableId;
  var board;
  if (!boards[boardId]) return false;
  pomelo.app.get('boardService').delBoard(boardId);
  board = boards[boardId];
  if (board) {
    board.close();
  }
  boards[boardId] = null;
  return true;
};

/**
 * Dừng game
 *
 * @method stop
 * @param {Function} cb
 */
exp.stop = function (cb) {
  async.forEach(Object.keys(boards), function (item, done) {
    var board = boards[item];
    pomelo.app.get('boardService').delBoard(item, function () {
      if (board) {
        board.close();
      }
      done()
    });
  }, function () {
    utils.invokeCallback(cb);
  });
};

/**
 * xóa bàn chơi với tableId
 *
 * @method delBoard
 * @param boardId
 */
exp.delBoard = function (boardId) {
  var app = pomelo.app;
  var channel = pomelo.app.get('channelService').getChannel(channelUtil.getBoardChannelName(boardId), true);
  if (channel) {
    channel.destroy();
  }
  app.get('boardService').delBoard(boardId)
    .then(function () {
      var board;
      if (!boards[boardId]) return false;
      board = boards[boardId];
      board.close();
      boards[boardId] = null;
    });
};

exp.delRoom = function (roomId) {
  async.forEach(Object.keys(boards), function (item, done) {
    var board = boards[item];
    if (board.roomId === roomId) {
      exp.delBoard(item);
      done()
    } else {
      done();
    }
  }, function () {
    // xoá bàn chơi
  });
};


/**
 * Lấy đối tượng bàn chơi từ tableId
 *
 * @method getBoard
 * @param boardId
 * @returns {*}
 */
exp.getBoard = function (boardId) {
  return boards[boardId];
};

/**
 *
 * @method getBoardList
 * @returns {*}
 */
exp.getBoardList = function () {
  return boards
};

exp.check = function () {
  try {
    utils.interval(function () {
      try {
        var boardId, board;
        var rooms = {};
        for (boardId in boards) {
          board = boards[boardId];
          if (!board) {
            delete boards[boardId];
            continue
          }
          var numPlayer = board.players.length;
          numPlayer = lodash.isNumber(numPlayer) ? numPlayer : 0;
          rooms[board.roomId] = !rooms[board.roomId] ? numPlayer : rooms[board.roomId] + numPlayer;
          board.isAlive();
        }
        var roomKeys = Object.keys(rooms);
        for (var i = 0, len = roomKeys.length; i < len; i++) {
          var key = roomKeys[i];
          var progress = Math.floor(rooms[key] / 100 * 10);
          if (!progress && rooms[key]) progress += 1;
          pomelo.app.get('boardService').updateRoom({
            roomId: key,
            gameId: gameId,
            progress: progress
          })
        }
      }catch(err){
        console.error('error ', err)
      }
    }, 30000);
  }
  catch (err) {
    console.error("error in check : %j ", err);
  }
};


function onClose(err, boardId) {
  if (!err) {
    boards[boardId].close();
    boards[boardId] = null;
  }
  else {
    logger.warn('remove instance error! id : %j, err : %j', boardId, err);
  }
}
