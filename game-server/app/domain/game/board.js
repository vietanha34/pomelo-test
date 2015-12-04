var consts = require('../../consts/consts');
var BaseBoard = require('./base/boardBase');
var utils = require('../../util/utils');
var event = require('./events/boardEvents');
var pomelo = require('pomelo');
var path = require('path');
var fs = require('fs');

/**
 * Tạo Đối tượng bàn chơi phù hợp với từng trò chơi, game process tương ứng
 *
 * @module Game
 * @class BoardFactory
 * @param {Object} params thông số của bàn chơi
 * @param {String} boardId Định danh của bàn chơi
 * @param cb
 */
module.exports = function (params, boardId, cb) {
  var gameConfig = pomelo.app.get('gameConfig');
  return pomelo.app.get('boardService').addBoard(params, boardId)
    .then(function (res) {
      var board, Board;
      if (res) {
        var gameId = params.gameId;
        var boardDir = getBoardPath(pomelo.app.getBase(), gameConfig[gameId] || 'tướng');
        if (boardDir) {
          params.boardId = boardId;
          Board = require(boardDir);
          board = new Board(params);
          event.addEventFromBoard(board);
          return utils.invokeCallback(cb, null, board);
        } else {
          params.boardId = boardId;
          board = new BaseBoard(params);
          event.addEventFromBoard(board);
          return utils.invokeCallback(cb, null, board);
        }
      }
      else{
        return utils.invokeCallback(cb, null, null);
      }
    })
};

/**
 * Get handler path
 *
 * @param  {String} appBase    application base path
 * @param  {String} serverType server type
 * @return {String}            path string if the path exist else null
 */
var getBoardPath = function (appBase, serverType) {
  var p = path.join(appBase, '/app/domain/game', serverType, consts.DIR.BOARD);
  return fs.existsSync(p) ? p : null;
};
