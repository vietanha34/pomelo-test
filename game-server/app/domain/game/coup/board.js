/**
 * Created by laanhdo on 11/25/14.
 */

var boardUtil = require('../base/logic/utils');
var consts = require('../../../consts/consts');
var Code = require('../../../consts/code');
var util = require('util');
var utils = require('../../../util/utils');
var Player = require('./entity/player');
var lodash = require('lodash');
var messageService = require('../../../services/messageService');
var channelUtil = require('../../../util/channelUtil');
var uuid = require('node-uuid');
var events = require('events');
var Rule = require('luat-co-thu').Xiangqi;
var dictionary = require('../../../../config/dictionary.json');
var BoardBase = require('../base/boardBase');



function Game(table) {
  this.game = new Rule(false, 'default', [], []);
  this.turn = '';
  this.table = table;
  this.matchId = uuid.v4();
  this.blackUid = null;
  this.whiteUid = null;
  this.playerPlayingId = [];
}

Game.prototype.close = function () {
  this.table = null;
};

Game.prototype.init = function () {
  this.table.status = consts.BOARD_STATUS.PLAY;
  if (this.playerPlayingId.indexOf(this.table.looseUser) > -1){
    this.turn = this.table.looseUser;
  }else {
    var index = Math.floor(Math.random());
    this.turn = this.playerPlayingId[index];
  }
  var turnPlayer = this.table.players.getPlayer(this.turn);
  var color = turnPlayer.color;
  if (color !== consts.COLOR.WHITE){
    this.isWhiteTurn = false;
  }
  var keys = Object.keys(this.table.players.players);
  for (var i = 0; i < keys.length; i++) {
    var player = this.table.players.getPlayer(keys[i]);
    if (this.playerPlayingId.indexOf(player.uid) > -1){
      player.totalTime = this.table.totalTime;
      if (player.color === consts.COLOR.WHITE ){
        this.whiteUid = player.uid;
      }else {
        this.blackUid = player.uid;
      }
    }
  }
  this.table.pushMessage('game.gameHandler.startGame', {});
  var gameStatus = this.game.getBoardStatus();
  this.setOnTurn(gameStatus);
};

Game.prototype.setOnTurn = function (gameStatus) {
  var turnColor = gameStatus.isWhiteTurn ? consts.COLOR.WHITE : consts.COLOR.BLACK;
  var turnUid = turnColor === consts.COLOR.WHITE ? this.whiteUid : this.blackUid;
  var player = this.table.players.getPlayer(turnUid);
  player.timeTurnStart = Date.now();
  var turnTime = player.totalTime <= this.table.turnTime ? player.totalTime : this.table.turnTime;
  var isCheck = gameStatus.checkInfo.isKingInCheck
    ? { king : gameStatus.checkInfo.kingPosition, attack : gameStatus.checkInfo.attackerPositions}
    : undefined;
  this.table.pushMessageToPlayer(player.uid, 'onTurn',  {
    uid : player.uid,
    time : [turnTime, player.totalTime],
    moves : gameStatus.legalMoves,
    isCheck : isCheck
  });
  var self = this;
  this.table.pushMessageWithOutUid(player.uid, 'onTurn', {uid : player.uid, time : [turnTime, player.totalTime],isCheck : isCheck});
  this.table.jobId = this.table.timer.addJob(function () {
    self.finishGame();
  }, null, turnTime);
};


Game.prototype.progress = function () {
  var gameStatus = this.game.getBoardStatus();
  if (gameStatus.matchResult){
    var result = gameStatus.matchResult === 'thuaRoi' ? undefined : consts.WIN_TYPE.DRAW;
    return this.finishGame(result);
  }else {
    return this.setOnTurn(gameStatus);
  }
};

Game.prototype.finishGame = function (result) {
  var turnColor = this.isWhiteTurn ? consts.COLOR.WHITE : consts.COLOR.BLACK;
  var turnUid = turnColor === consts.COLOR.WHITE ? this.whiteUid : this.blackUid;
  var players = [];
  var bet = result === consts.WIN_TYPE.DRAW ? 0 : this.table.bet;
  for (var i = 0, len = this.playerPlayingId.length; i < len ;i++){
    var player = this.table.players.getPlayer(this.playerPlayingId[i]);
    if (player.uid === turnUid){
      var subGold = player.subGold(bet);
      players.push({
        uid : player.uid,
        gold : subGold,
        result : result === consts.WIN_TYPE.DRAW ? result : consts.WIN_TYPE.LOSE,
        totalGold : player.gold,
        elo : 0,
        xp : 0
      })
    }else {
      var addGold = player.addGold(bet, true);
      players.push({
        uid : player.uid,
        gold : addGold,
        result : result === consts.WIN_TYPE.DRAW ? result : consts.WIN_TYPE.WIN,
        totalGold : player.gold,
        elo : 0,
        xp : 0
      })
    }
  }
  console.log('players : ', players);
  this.table.finishGame();
  var status = this.getStatus;
  this.table.pushFinishGame({ players : players, status : status}, true);
};

function Table(opts) {
  Table.super_.call(this, opts, null, Player);
  this.game = new Game(this);
  this.looseUser = null;
}

util.inherits(Table, BoardBase);

Table.prototype.getStatus = function () {
  var status = Table.super_.prototype.getStatus.call(this);
  var boardStatus = this.game.game.getBoardStatus();
  status.board = boardStatus.piecePositions;
  status.previous = boardStatus.prevMove || undefined;
  status.isCheck = boardStatus.checkInfo.isKingInCheck
    ? { king : boardStatus.checkInfo.kingPosition, attack : boardStatus.checkInfo.attackerPositions}
    : undefined;
  status.score  = this.score;
  status.lock = boardStatus.lockSquares;
  status.killed = utils.merge_options(boardStatus.killedPiecesForWhite, boardStatus.killedPiecesForBlack);
  status.remove = boardStatus.handicapModes;
  if (this.jobId){
    status.turn = '';
    status.timeLeft = this.timer.getLeftTime(this.jobId);
  }
  return status
};

Table.prototype.clearPlayer = function (uid) {
  if (this.game && this.status !== consts.BOARD_STATUS.NOT_STARTED){
    var index = this.game.playerPlayingId.indexOf(uid);
    if(index > -1){

    }
  }
};

Table.prototype.startGame = function (uid, cb) {
  var code = this.checkStartGame();
  var self = this;
  if (code == Code.OK) {
    this.game.playerPlayingId = this.players.playerSeat;
    this.transaction(this.game.playerPlayingId, this.game.matchId, function (err, res) {
      if (res){
        utils.invokeCallback(cb);
        self.game.init();
      }else {
        self.game.close();
        utils.invokeCallback(cb, null, { ec : 500, msg : 'Lỗi trong quá trình khởi tạo ván chơi, xin vui lòng thử lại'})
      }
    });
    this.emit('startGame', this.game.playerPlayingId);
  } else {
    return utils.invokeCallback(cb, null, utils.merge_options(utils.getError(code), {menu: this.players.getPlayer(uid).menu}))
  }
};

Table.prototype.action = function (uid, opts, cb) {
  var legal = this.game.game.checkMoveIsLegal(opts.move[0], opts.move[1]);
  if (legal){
    this.game.game.makeMove(opts.move[0], opts.move[1]);
    this.pushMessage('game.gameHandler.action', { move : opts.move});
    if (this.jobId){
      this.timer.cancelJob(this.jobId);
    }
    var player = this.players.getPlayer(uid);
    player.move();
    this.game.progress();
    return utils.invokeCallback(cb, null, {});
  }else {
    return utils.invokeCallback(cb, null, { ec :Code.FAIL})
  }
};

Table.prototype.finishGame = function () {
  this.status = consts.BOARD_STATUS.NOT_STARTED;
  this.players.reset();
  this.timer.stop();
  this.game.close();
  this.game = null;
  this.game = new Game(this);
};

Table.prototype.xinThua = function () {
};

Table.prototype.xinHoa = function () {
};

module.exports = Table;
