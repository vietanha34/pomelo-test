/**
 * Created by vietanha34 on 11/25/14.
 */

var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var utils = require('../../../util/utils.js');
var Code = require('../../../consts/code');
var messageService = require('../../../services/messageService');
var consts = require('../../../consts/consts');
var ItemDao = require('../../../dao/itemDao');
var async = require('async');


module.exports = function (app) {
  return new GameRemote(app);
};

var GameRemote = function (app) {
  this.app = app;
};

GameRemote.prototype.leaveBoard = function (opts, cb) {
  var game = this.app.game;
  var board = game.getBoard(opts.boardId);
  var route = 'district.districtHandler.leaveBoard';
  var uid = opts.uid;
  if (!board) {
    utils.invokeCallback(cb, null, {ec: Code.OK});
    return
  }
  var res = board.leaveBoard(uid);
  if (!res.ec && !res.guest) {
    board.pushMessageWithOutUid(uid, route, {uid: uid});
  }
  res.uid = uid;
  utils.invokeCallback(cb, null, res);
};

GameRemote.prototype.joinBoard = function (tableId , opts, cb) {
  var game = this.app.game;
  var board = game.getBoard(tableId);
  if (!board) {
    game.delBoard(tableId);
    return utils.invokeCallback(cb, null, {data : utils.getError(Code.ON_QUICK_PLAY.FA_BOARD_NOT_EXIST)});
  }
  if (board.status === consts.BOARD_STATUS.FINISH || !board.players){
    return utils.invokeCallback(cb, null, { data : {ec : Code.FAIL, msg : "Ván đấu đã kết thúc"}})
  }
  ItemDao.checkEffect(opts.userInfo.uid,null)
    .then(function (effect) {
      opts.effect = effect;
      var state = board.joinBoard(opts);
      if (state && !state.ec) {
        return utils.invokeCallback(cb, null,
          {data: state, tableId: tableId, serverId: game.serverId, roomId: game.roomId});
      }
      else {
        return utils.invokeCallback(cb, null, {data: state})
      }
    })
    .catch(function (err) {
      opts.effect = {};
      var state = board.joinBoard(opts);
      if (state && !state.ec) {
        return utils.invokeCallback(cb, null,
          {data: state, tableId: tableId, serverId: game.serverId, roomId: game.roomId});
      }
      else {
        return utils.invokeCallback(cb, null, {data: state})
      }
    })

};

/**
 * Tạo bàn chơi mới,normal, tournament, private
 *    * gameId
 *    * opts
 *      * gameType
 *
 * @param gameId
 * @param opts
 * @param cb
 * @return {boardId: res, serverId: self.serverId, roomId : params.roomId}
 */
GameRemote.prototype.createBoard = function (gameId, opts, cb) {
  var game = this.app.game;
  var params = this.app.get('gameService').gameConfig[gameId + '-' + [opts.roomId || 1]];
  params.bet = opts.bet || params.configMoney[0];
  params.gameType = opts.gameType || consts.GAME_TYPE.NORMAL;
  params.tourId = opts.tourId;
  params.base = false;
  params.title = opts.title;
  params.matchTurn = opts.matchTurn;
  params = utils.merge_options(params, opts);
  game.createBoard(params, cb)
};

GameRemote.prototype.changeBoardProperties = function (boardId, msg, cb ) {
  var game = this.app.game;
  var board = game.getBoard(boardId);
  board.changeBoardProperties(board.owner, msg,false, function (err, res) {
    utils.invokeCallback(cb, err, res);
  })
};

/**
 * Add thêm item vào cho người dùng trong bàn chơi
 *
 * @param boardId
 * @param items
 * @param cb
 */
GameRemote.prototype.addItems = function (boardId, items, cb) {
  var game = this.app.game;
  var board = game.getBoard(boardId);
  var err;
  if (!board) {
    game.delBoard(boardId);
    err = new Error('Khong co ban phu hop');
    err.code = Code.ON_QUICK_PLAY.FA_BOARD_NOT_EXIST;
    utils.invokeCallback(cb, err);
    return;
  }
  utils.invokeCallback(cb, null, board.addItems(items));
};

GameRemote.prototype.logout = function (boardId, uid, cb) {
  var game = this.app.game;
  var board = game.getBoard(boardId);
  var err;
  if (!board) {
    game.delBoard(boardId);
    err = new Error('Khong co ban phu hop');
    err.code = Code.ON_QUICK_PLAY.FA_BOARD_NOT_EXIST;
    return utils.invokeCallback(cb, err);
  }
  return utils.invokeCallback(cb, null, board.logout(uid));
};

GameRemote.prototype.setBoard = function (boardId, msg, cb) {
  var game = this.app.game;
  var board = game.getBoard(boardId);
  var err;
  if (!board) {
    game.delBoard(boardId);
    err = new Error('Khong co ban phu hop');
    err.code = Code.ON_QUICK_PLAY.FA_BOARD_NOT_EXIST;
    return utils.invokeCallback(cb, err);
  }
  return utils.invokeCallback()
};