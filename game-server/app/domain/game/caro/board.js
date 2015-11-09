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
var Rule = require('luat-co-thu').Caro;
var dictionary = require('../../../../config/dictionary.json');
var BoardBase = require('../base/boardBase');


function Game(table) {
  this.game = new Rule(false, 'default');
  this.turn = '';
  this.table = table;
  this.matchId = uuid.v4();
  this.blackUid = null;
  this.whiteUid = null;
  this.playerPlayingId = [];
  this.legalMoves = {};
  this.isCheck = {};
  this.numMove = 0;
  this.previousMove = null;
}

Game.prototype.close = function () {
  this.table = null;
};

Game.prototype.init = function () {
  var i;
  this.table.timer.stop();
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
  for (i = 0; i < keys.length; i++) {
    var player = this.table.players.getPlayer(keys[i]);
    player.menu = [];
    player.genStartMenu();
    player.startGame();
    if (this.playerPlayingId.indexOf(player.uid) > -1){
      player.totalTime = this.table.totalTime;
      if (player.color === consts.COLOR.WHITE ){
        this.whiteUid = player.uid;
      }else {
        this.blackUid = player.uid;
      }
    }
  }

  this.table.pushMessageWithMenu('game.gameHandler.startGame', {});
  this.table.emit('startGame', this.playerPlayingId);
  var gameStatus = this.game.getBoardStatus();
  this.setOnTurn(gameStatus);
};

Game.prototype.setOnTurn = function (gameStatus) {
  var turnColor = gameStatus.isWhiteTurn ? consts.COLOR.WHITE : consts.COLOR.BLACK;
  var turnUid = turnColor === consts.COLOR.WHITE ? this.whiteUid : this.blackUid;
  var player = this.table.players.getPlayer(turnUid);
  player.timeTurnStart = Date.now();
  var turnTime = player.totalTime <= this.table.turnTime ? player.totalTime : this.table.turnTime;
  turnTime = turnTime >= 5000 ? turnTime : 5000;
  this.table.pushMessageToPlayer(player.uid, 'onTurn',  {
    uid : player.uid,
    time : [turnTime, player.totalTime],
    banSquare : gameStatus.forbidenSquares
  });
  var self = this;
  this.table.pushMessageWithOutUid(player.uid, 'onTurn', {uid : player.uid, time : [turnTime, player.totalTime]});
  this.table.turnUid = player.uid;
  console.log('setOnTurn with turnTime : ', turnTime);
  console.log('addTurnTime : ', turnTime);
  this.table.jobId = this.table.timer.addJob(function () {
    self.finishGame(consts.WIN_TYPE.LOSE);
  }, null, turnTime + 2000);
};


Game.prototype.progress = function () {
  var gameStatus = this.game.getBoardStatus();
  if (gameStatus.matchResult){
    var winUid, result;
    if (gameStatus.matchResult === 'trangThang'){
      result = consts.WIN_TYPE.WIN;
      winUid = this.whiteUid;
    }else if (gameStatus.matchResult === 'denThang' ){
      result = consts.WIN_TYPE.WIN;
      winUid = this.blackUid
    }else {
      result = consts.WIN_TYPE.DRAW;
    }
    return this.finishGame(result, winUid);
  }else {
    return this.setOnTurn(gameStatus);
  }
};

Game.prototype.finishGame = function (result, uid) {
  console.trace('finishGame : ', result);
  var turnColor = this.game.isWhiteTurn ? consts.COLOR.WHITE : consts.COLOR.BLACK;
  var turnUid = uid ? uid : turnColor === consts.COLOR.WHITE ? this.whiteUid : this.blackUid;
  var players = [];
  var bet = result === consts.WIN_TYPE.DRAW ? 0 : this.table.bet;
  for (var i = 0, len = this.playerPlayingId.length; i < len ;i++){
    var player = this.table.players.getPlayer(this.playerPlayingId[i]);
    if (player.uid === turnUid){
      var subGold = player.subGold(bet);
      players.push({
        uid : player.uid,
        gold : subGold,
        result : result,
        totalGold : player.gold,
        elo : 0,
        xp : 0
      })
    }else {
      var addGold = player.addGold(bet, true);
      players.push({
        uid : player.uid,
        gold : addGold,
        result : result === consts.WIN_TYPE.DRAW ? result : consts.WIN_TYPE.WIN === result ? consts.WIN_TYPE.LOSE : consts.WIN_TYPE.WIN,
        totalGold : player.gold,
        elo : 0,
        xp : 0
      })
    }
  }
  var gameStatus = this.game.getBoardStatus();
  var winningLine = gameStatus.winningLines;
  this.table.finishGame();
  this.table.pushFinishGame({ players : players, line : winningLine}, true);
};

function Table(opts) {
  Table.super_.call(this, opts, null, Player);
  this.looseUser = null;
  this.game = new Game(this);
  this.addFunction = []
}

util.inherits(Table, BoardBase);


Table.prototype.pushFinishGame = function (msg, finish) {
  this.reset();
  msg.status = this.getStatus();
  Table.super_.prototype.pushFinishGame.call(this, msg, finish);
};

Table.prototype.getStatus = function () {
  var status = Table.super_.prototype.getStatus.call(this);
  var boardStatus = this.game.game.getBoardStatus();
  status.board = boardStatus.piecePositions;
  status.previous = boardStatus.prevMove;
  status.banSquare = boardStatus.forbidenSquares;
  status.score  = this.score;
  return status
};

Table.prototype.getBoardInfo = function (finish) {
  var boardInfo = Table.super_.prototype.getBoardInfo.call(this, finish);
  return boardInfo
};

Table.prototype.clearPlayer = function (uid) {
  if (this.game && this.status !== consts.BOARD_STATUS.NOT_STARTED){
    var index = this.game.playerPlayingId.indexOf(uid);
    if(index > -1){
      this.game.finishGame(consts.WIN_TYPE.LOSE, uid);
    }
  }
};

Table.prototype.startGame = function (uid, cb) {
  var code = this.checkStartGame();
  var self = this;
  if (code == Code.OK) {
    this.game.playerPlayingId = this.players.playerSeat;
    this.transaction(this.game.playerPlayingId, this.game.matchId, function (err, res) {
      if (res) {
        utils.invokeCallback(cb);
        self.game.init();
      } else {
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
  this.game.game.makeMove(opts.move);
  this.game.numMove += 1;
  var player = this.players.getPlayer(uid);
  var id = player.color === consts.COLOR.WHITE ? 1 : -1;
  this.pushMessage('game.gameHandler.action', { move : [[opts.move, id]]});
  if (this.jobId){
    this.timer.cancelJob(this.jobId);
  }
  player.move();
  this.game.progress();
  return utils.invokeCallback(cb, null, {});
};

Table.prototype.finishGame = function () {
  this.status = consts.BOARD_STATUS.NOT_STARTED;
  this.players.reset();
  this.timer.stop();
};

Table.prototype.reset = function () {
  this.game.close();
  this.game = null;
  this.game = new Game(this);
};

Table.prototype.demand = function (opts) {
  var uid = opts.uid, otherPlayerUid, otherPlayer;
  var player = this.players.getPlayer(uid);
  if (!player || this.players.playerSeat.indexOf(uid) < 0){
    return { ec : Code.FAIL};
  }
  switch (opts.id){
    case consts.ACTION.DRAW:
      otherPlayerUid = this.players.getOtherPlayer(uid);
      if (lodash.isNumber(opts.accept)){
        // trả lời request
        otherPlayer = this.players.getPlayer(otherPlayerUid);
        if (opts.accept && otherPlayer.requestDraw){
          // xử lý hoà cờ nước đi;
          this.game.finishGame(consts.WIN_TYPE.DRAW);
        }else {
          otherPlayer.requestDraw = false;
        }
      }else {
        //request
        if (player.timeDraw && this.game.numMove - player.timeDraw < 20){
          return {ec : Code.FAIL};
        }
        player.xinHoa(this.game.numMove);
        this.pushMessageToPlayer(otherPlayerUid, 'game.gameHandler.demand', {
          id : consts.ACTION.DRAW,
          msg : "Đối thủ muốn xin hoà",
          time : 10000
        })
      }
      break;
    case consts.ACTION.SURRENDER:
    default :
      this.game.finishGame(consts.WIN_TYPE.LOSE, opts.uid);
  }
};


Table.prototype.changeBoardProperties = function (properties, addFunction, cb) {
  var uid = properties.uid;
  var self = this;
  Table.super_.prototype.changeBoardProperties.call(this, properties, this.addFunction, function (err, res) {
    //if (lodash.isArray(properties.lock) || lodash.isArray(properties.remove) || properties.color){
    //  var ownerPlayer = self.players.getPlayer(self.owner);
    //  if (ownerPlayer.color === consts.COLOR.WHITE){
    //    self.game.game.isWhiteTurn = true;
    //  }else {
    //    self.game.game.isWhiteTurn = false;
    //  }
    //  console.log('turnToMode : ');
    //  var boardState = self.getBoardState(uid);
    //  self.pushMessageWithMenu('game.gameHandler.reloadBoard', boardState);
    //}
    return utils.invokeCallback(cb, err, res)
  });
};

module.exports = Table;
