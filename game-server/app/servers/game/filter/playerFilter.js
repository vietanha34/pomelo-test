var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');

module.exports = function () {
  return new Filter();
};

var Filter = function () {
};

/**
 * Game filter
 */
Filter.prototype.before = function (msg, session, next) {
  var game = pomelo.app.game;
  var boardId = session.get('tableId');
  var board;
  session.game = game;
  if (boardId) {
    board = game.getBoard(boardId);
    if (board) {
      session.board = board;
      next();
    }
    else {
      next(new Error('No Board exists!'))
    }
  }
  else {
    next();
  }
};