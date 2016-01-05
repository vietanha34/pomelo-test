/**
 * Created by laanhdo on 11/25/14.
 */

var boardUtil = require('../base/logic/utils');
var consts = require('../../../consts/consts');
var Formula = require('../../../consts/formula');
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
    var index = Math.round(Math.random());
    this.turn = this.playerPlayingId[index];
  }
  this.table.looseUser = this.table.players.getOtherPlayer(this.turn);
  var turnPlayer = this.table.players.getPlayer(this.turn);
  var color = turnPlayer.color;
  if (color !== consts.COLOR.WHITE){
    this.game.isWhiteTurn = false;
  }
  this.firstTurn = this.turn;
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
  this.table.pushMessageToPlayer(player.uid, 'onTurn',  {
    uid : player.uid,
    count : 1,
    lockBoard : 0,
    time : [turnTime, player.totalTime],
    banSquare : gameStatus.forbidenSquares
  });
  var self = this;
  this.table.pushMessageWithOutUid(player.uid, 'onTurn', {uid : player.uid,count:1, time : [turnTime, player.totalTime]});
  this.table.turnUid = player.uid;
  this.table.turnId = this.table.timer.addJob(function (uid) {
    self.finishGame(consts.WIN_TYPE.LOSE,uid);
  }, turnUid, turnTime + 2000);
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
  var turnColor = this.game.isWhiteTurn ? consts.COLOR.WHITE : consts.COLOR.BLACK;
  var turnUid = uid ? uid : turnColor === consts.COLOR.WHITE ? this.whiteUid : this.blackUid;
  var players = [];
  var xp, res, index, turnPlayer, fromUid, toUid, winUser, loseUser, addGold, subGold, winIndex, loseIndex;
  var finishData = [];
  var bet = result === consts.WIN_TYPE.DRAW ? 0 : this.table.bet;
  for (var i = 0, len = this.playerPlayingId.length; i < len ;i++){
    var player = this.table.players.getPlayer(this.playerPlayingId[i]);
    if (player.uid === turnUid){
      turnPlayer = player;
      index = i;
      xp = result === consts.WIN_TYPE.WIN ? Formula.calGameExp(this.table.gameId, this.table.hallId) : 0;
      if (result === consts.WIN_TYPE.WIN){
        winUser = player;
        toUid = player.uid;
        winIndex = i;
      }else if (result === consts.WIN_TYPE.LOSE || result === consts.WIN_TYPE.GIVE_UP){
        fromUid = player.uid;
        loseUser = player;
        loseIndex = i;
      }
      players.push({
        uid : player.uid,
        gold : 0,
        result : result,
        totalGold : player.gold,
        sex : player.userInfo.sex,
        elo : player.userInfo.elo,
        xp : xp
      });

      finishData.push({
        uid : player.uid,
        result : {
          type : result,
          color : player.color,
          xp : xp,
          elo : player.userInfo.elo
        }
      });
    }else {
      res = result === consts.WIN_TYPE.DRAW ? result : consts.WIN_TYPE.WIN === result ? consts.WIN_TYPE.LOSE : consts.WIN_TYPE.WIN;
      xp = res === consts.WIN_TYPE.WIN ? Formula.calGameExp(this.table.gameId, this.table.hallId) : 0;
      if (res === consts.WIN_TYPE.WIN){
        toUid = player.uid;
        winUser = player;
        winIndex = i;
      }else if (res === consts.WIN_TYPE.LOSE){
        fromUid = player.uid;
        loseUser = player;
        loseIndex = i;
      }
      players.push({
        uid : player.uid,
        gold : 0,
        result : res,
        totalGold : player.gold,
        sex : player.userInfo.sex,
        elo : player.userInfo.elo,
        xp : xp
      });

      finishData.push({
        uid : player.uid,
        result : {
          type : res,
          color : player.color,
          xp : xp,
          elo : player.userInfo.elo
        }
      });
    }
  }
  var gameStatus = this.game.getBoardStatus();
  var winningLine = gameStatus.winningLines;
  this.table.finishGame();
  var eloMap = this.table.hallId === consts.HALL_ID.MIEN_PHI ? [0,0] : Formula.calElo(players[0].result, players[0].elo, players[1].elo, this.table.gameId, this.table.bet);
  for (i = 0, len = eloMap.length; i < len; i++) {
    player = this.table.players.getPlayer(players[i].uid);
    players[i].elo = (eloMap[i] || player.userInfo.elo)- player.userInfo.elo;
    players[i].title  = Formula.calEloLevel(eloMap[i]);
    finishData[i].result.elo = (eloMap[i] || player.userInfo.elo)- player.userInfo.elo;
    finishData[i].result.eloAfter = eloMap[i];
    player.userInfo.elo = eloMap[i];
  }
  if (bet > 0){
    subGold = loseUser.subGold(bet);
    addGold = winUser.addGold(subGold, true);
    players[winIndex].gold = addGold;
    players[loseIndex].gold = -subGold;
    this.table.players.paymentRemote(consts.PAYMENT_METHOD.TRANSFER, {
      gold : bet,
      fromUid : fromUid,
      toUid : toUid,
      tax : 5,
      force : true
    }, 1, function () {})
  }
  this.table.emit('finishGame', finishData, true);
  this.table.pushFinishGame({players: players, line : winningLine}, true);
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
  status.score  = this.score;
  if (status.turn){
    if (this.status !== consts.BOARD_STATUS.NOT_STARTED){
      status.turn.lockBoard = 0;
    }
    status.turn.banSquare = boardStatus.forbidenSquares;
  }
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
      this.game.finishGame(consts.WIN_TYPE.GIVE_UP, uid);
    }
  }
};

Table.prototype.startGame = function (uid, cb) {
  var code = this.checkStartGame();
  var self = this;
  if (code == Code.OK) {
    this.game.playerPlayingId = this.players.playerSeat;
    utils.invokeCallback(cb);
    self.game.init();
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
  if (this.turnId){
    this.timer.cancelJob(this.turnId);
  }
  player.move();
  this.game.progress();
  return utils.invokeCallback(cb, null, {});
};

//Table.prototype.finishGame = function () {
//  this.status = consts.BOARD_STATUS.NOT_STARTED;
//  this.players.reset();
//  this.timer.stop();
//};

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
        }else if (otherPlayer){
          this.pushMessage('chat.chatHandler.send', {
            from : uid,
            targetType : consts.TARGET_TYPE.BOARD,
            type : 0,
            content : util.format('Người chơi %s từ chối xin hoà', player.userInfo.fullname)
          });
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
      this.game.finishGame(consts.WIN_TYPE.GIVE_UP, opts.uid);
      return {};
  }
};


Table.prototype.changeBoardProperties = function (uid, properties, addFunction, cb) {
  var uid = properties.uid;
  var self = this;
  Table.super_.prototype.changeBoardProperties.call(this, uid, properties, this.addFunction, function (err, res) {
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
