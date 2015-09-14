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
var intervel;
var gameId ;
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
  gameId = opts.gameId;
  serverId = opts.serverId;
  intervel = opts.interval || 2 * 60 * 1000;
  check();
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
  boardService.genBoardId({ serverId : serverId, gameId : gameId, gameType: consts.GAME_TYPE.NORMAL}, function (err, boardId) {
    if (err) {
      utils.invokeCallback(cb, err)
    }
    else {
      if (boards[boardId]) {
        utils.invokeCallback(cb, null, boardId);
      }
      params.serverId = serverId;
      Board(params, boardId, function (err, board, bId) {
        if (err) {
          utils.invokeCallback(cb, err);
        }
        else if (board) {
          boards[bId] = board;
          utils.invokeCallback(cb, null, bId);
        }
        else {
          utils.invokeCallback(cb, null, null);
        }
      });
    }
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
  app.get('boardService').delBoard(boardId, function () {
    var board;
    if (!boards[boardId]) return false;
    board = boards[boardId];
    board.close();
    boards[boardId] = null;
  });
};



function garbage() {
  try {
    utils.interval(function () {
      var boardService = pomelo.app.get('boardService');
      var result = [];
      boardService.listBoardFromServerId(serverId, function (err, boardIds) {
        var i, len, boardid;
        if (!err) {
          if (lodash.isArray(boardIds)) {
            for (i = 0, len = boardIds.length; i < len; i++) {
              boardid = boardIds[i].boardid;
              if (!boards[boardid]) {
                boardService.delBoard(boardid);
                result.push(boardid);
              }
            }
          }
        }
      });
      logger.info('garbage serverid : %s result : %j', serverId, result);
    }, 30000 * 4);
  }
  catch (err) {
    logger.error("error in check : %j ", err);
  }
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

function check() {
  try {
    utils.interval(function () {
      var boardId, board;
      for (boardId in boards) {
        board = boards[boardId];
        if (board && !board.isAlive()) {
          pomelo.app.get('boardService').delBoard(boardId, function () {
          });
          board.close();
          boards[boardId] = null;
        }
      }
    }, 20000);
  }
  catch (err) {
    logger.error("error in check : %j ", err);
  }
}


function onClose(err, boardId) {
  if (!err) {
    boards[boardId].close();
    boards[boardId] = null;
  }
  else {
    logger.warn('remove instance error! id : %j, err : %j', boardId, err);
  }
}
