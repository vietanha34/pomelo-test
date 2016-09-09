/**
 * Created by laanhdo on 11/25/14.
 */

var consts = require('../../../consts/consts');
var Formula = require('../../../consts/formula');
var Code = require('../../../consts/code');
var util = require('util');
var utils = require('../../../util/utils');
var Player = require('./entity/player');
var lodash = require('lodash');
var channelUtil = require('../../../util/channelUtil');
var uuid = require('node-uuid');
var events = require('events');
var Rule = require('luat-co-thu').Go;
var dictionary = require('../../../../config/dictionary.json');
var BoardBase = require('../base/boardBase');
var moment = require('moment');


function Game(table) {
  this.game = new Rule(13);
  this.turn = '';
  this.table = table;
  this.matchId = uuid.v4();
  this.blackUid = null;
  this.whiteUid = null;
  this.playerPlayingId = [];
  this.legalMoves = {};
  this.isCheck = {};
  this.numMove = 0;
  this.numChange = 0;
  this.previousMove = null;
  this.detailLog = [];
  this.actionLog = [];
  this.stringLog = [];

}

Game.prototype.close = function () {
  this.table = null;
};

Game.prototype.init = function () {
  var i;
  this.table.timer.stop();
  this.table.status = consts.BOARD_STATUS.PLAY;
  if (this.table.gameType === consts.GAME_TYPE.TOURNAMENT){
    if (this.table.tourType === consts.TOUR_TYPE.FRIENDLY){
      var guildId = this.table.guildId[this.table.numMatchPlay %2];
      turnPlayer = this.table.players.getPlayerByGuildId(guildId);
    }else {
      var username = this.table.username[this.table.numMatchPlay % 2];
      turnPlayer = this.table.players.getPlayerByUsername(username);
    }
    this.table.firstUid = turnPlayer.uid;
    this.turn = turnPlayer.uid;
  }else {
    if (this.playerPlayingId.indexOf(this.table.looseUser) > -1){
      this.turn = this.table.looseUser;
    }else {
      var index = Math.round(Math.random());
      this.turn = this.playerPlayingId[index];
    }
    this.table.firstUid = this.turn;
    this.table.looseUser = this.table.players.getOtherPlayer(this.turn);
    var turnPlayer = this.table.players.getPlayer(this.turn);
  }
  if(turnPlayer.color !== consts.COLOR.BLACK){
    var colorMap = this.table.players.changeColor(turnPlayer.uid, consts.COLOR.BLACK);
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
  this.table.emit('startGame', this.playerPlayingId);
  this.table.pushMessageWithMenu('game.gameHandler.startGame', {color : colorMap});
  var gameStatus = this.game.getBoardStatus();
  this.setOnTurn(gameStatus);
};

Game.prototype.setOnTurn = function (gameStatus) {
  var turnColor = gameStatus.isWhiteTurn ? consts.COLOR.BLACK : consts.COLOR.WHITE;
  var turnUid = turnColor === consts.COLOR.WHITE ? this.whiteUid : this.blackUid;
  var player = this.table.players.getPlayer(turnUid);
  player.timeTurnStart = Date.now();
  var timeout = false;
  if (player.totalTime <= this.table.turnTime){
    timeout = true;
  }
  var turnTime = player.totalTime <= this.table.turnTime ? player.totalTime : this.table.turnTime;
  this.table.pushMessageToPlayer(player.uid, 'onTurn',  {
    uid : player.uid,
    count : 1,
    time : [turnTime, player.totalTime],
    lockBoard : 0,
    banSquare : gameStatus.illegalMoves
  });
  var self = this;
  this.table.pushMessageWithOutUid(player.uid, 'onTurn', {uid : player.uid, count : 1, time : [turnTime, player.totalTime]});
  this.stringLog.push(util.format('%s --- Chuyển lượt đánh cho người chơi %s với tổng thời gian %s, thời gian 1 lượt %s', moment().format(), player.userInfo.username, player.totalTime, this.table.turnTime));
  this.table.turnUid = player.uid;
  this.table.turnId = this.table.timer.addJob(function (opts) {
    self.table.turnId = null;
    var player = self.table.players.getPlayer(opts.uid);
    if (opts.timeout){
      return self.finishGame(consts.WIN_TYPE.LOSE, opts.uid, consts.LOSING_REASON_NAME.HET_TIME)
    }
    if (player){
      player.autoAction ++;
      if (player.autoAction >= 4 ){
        var result = self.table.game.game.getScore();
        return self.finishGame(result);
      }
    }
    self.table.action(opts.uid, {}, true);
  }, { uid : turnUid, timeout : timeout}, turnTime + 2000);
};


Game.prototype.progress = function () {
  var gameStatus = this.game.getBoardStatus();
  if (gameStatus.isFinishedMatch){
    return this.finishGame(gameStatus.score);
  }else {
    return this.setOnTurn(gameStatus);
  }
};

Game.prototype.finishGame = function (result, uid, losingReason) {
  var winType = consts.WIN_TYPE.WIN;
  var xp, subGold, addGold, loseUser, winUser, toUid, winIndex, fromUid, loseIndex;
  var turnColor = result ?
      result.matchResult === 'trangThang'
        ? consts.COLOR.BLACK
        : result.matchResult === 'denThang'
          ? consts.COLOR.WHITE
          : undefined
        : undefined;

  if (result.matchResult === 'hoaRoi'){
    winType = consts.WIN_TYPE.DRAW;
  } else if(uid){
    winType = result || consts.WIN_TYPE.LOSE
  }
  var turnUid = uid ? uid : turnColor === consts.COLOR.WHITE ? this.whiteUid : this.blackUid;
  var players = [];
  var finishData = [];
  var bet = result === consts.WIN_TYPE.DRAW ? 0 : this.table.bet;
  var playerPlaying = this.playerPlayingId.length > 0 ? this.playerPlayingId : this.table.players.playerSeat;
  for (var i = 0, len = playerPlaying.length; i < len ;i++){
    var player = this.table.players.getPlayer(playerPlaying[i]);
    if (player.uid === turnUid){
      var colorString = player.color === consts.COLOR.WHITE ? 'black' : 'white';
      xp = winType === consts.WIN_TYPE.WIN ? Formula.calGameExp(this.table.gameId, this.table.hallId) : 0;
      console.log('xp : ', xp, winType, Formula.calGameExp(this.gameId, this.hallId));
      if (winType === consts.WIN_TYPE.WIN){
        winUser = player;
        toUid = player.uid;
        winIndex = i;
      }else if (winType === consts.WIN_TYPE.LOSE || winType === consts.WIN_TYPE.GIVE_UP){
        fromUid = player.uid;
        loseUser = player;
        loseIndex = i;
      }
      players.push({
        uid : player.uid,
        gold : 0,
        result : winType,
        text : result[colorString],
        totalGold : player.gold,
        elo : player.userInfo.elo,
        xp : xp
      });
      finishData.push({
        uid : player.uid,
        guildId: player.userInfo.guildId,
        result : {
          type : winType,
          color : player.color,
          elo : 0,
          xp : xp
        },
        info: {
          platform : player.userInfo.platform
        }
      });
    }
    else {
      colorString = player.color === consts.COLOR.WHITE ? 'black' : 'white';
      var res = winType === consts.WIN_TYPE.DRAW ? winType : consts.WIN_TYPE.WIN === winType ? consts.WIN_TYPE.LOSE : consts.WIN_TYPE.WIN;
      xp = res === consts.WIN_TYPE.WIN ? Formula.calGameExp(this.table.gameId, this.table.hallId) : 0;
      if (res === consts.WIN_TYPE.WIN){
        toUid = player.uid;
        winUser = player;
        winIndex = i;
      }else if (res === consts.WIN_TYPE.LOSE || res === consts.WIN_TYPE.GIVE_UP){
        fromUid = player.uid;
        loseUser = player;
        loseIndex = i;
      }
      players.push({
        uid : player.uid,
        gold : 0,
        result : res,
        totalGold : player.gold,
        elo : player.userInfo.elo,
        text : result[colorString],
        xp : xp
      });
      finishData.push({
        uid : player.uid,
        guildId: player.userInfo.guildId,
        result : {
          type : res ,
          color : player.color,
          elo : 0,
          xp : xp
        },
        info: {
          platform : player.userInfo.platform
        }
      });
    }
  }
  var eloMap = this.table.hallId === consts.HALL_ID.MIEN_PHI ? [players[0].elo,players[1].elo] : Formula.calElo(players[0].result, players[0].elo, players[1].elo, this.table.gameId, this.table.bet);
  this.table.finishGame();
  for (i = 0, len = eloMap.length; i < len; i++) {
    player = this.table.players.getPlayer(players[i].uid);
    players[i].elo = (eloMap[i] || player.userInfo.elo)- player.userInfo.elo;
    players[i].title  = Formula.calEloLevel(eloMap[i]);
    finishData[i].result.elo = (eloMap[i] || player.userInfo.elo)- player.userInfo.elo;
    finishData[i].result.eloAfter = eloMap[i];
    player.userInfo.elo = eloMap[i];
  }
  if (bet > 0 && result !== consts.WIN_TYPE.DRAW){
    this.table.transfer(bet, fromUid,toUid);
    if (this.table.tourType !== consts.TOUR_TYPE.FRIENDLY){
      subGold = loseUser.subGold(bet);
      addGold = winUser.addGold(subGold, true);
      players[winIndex].gold = addGold;
      players[loseIndex].gold = -subGold;
      finishData[winIndex].result.remain = winUser.gold;
      finishData[winIndex].result.money = addGold;
      finishData[loseIndex].result.remain = loseUser.gold;
      finishData[loseIndex].result.money = subGold;
    }else {
      players[winIndex].gold = 0;
      players[loseIndex].gold = 0;
      finishData[winIndex].result.remain = winUser.gold;
      finishData[winIndex].result.money = 0;
      finishData[loseIndex].result.remain = loseUser.gold;
      finishData[loseIndex].result.money = 0;
    }
  }
  var data = { players : players, notifyMsg: consts.LOSING_REASON[losingReason] ? util.format(consts.LOSING_REASON[losingReason], loseUser ? loseUser.userInfo.fullname : null) : undefined}
  this.detailLog.push({
    r : dictionary['onFinishGame'],
    d : data,
    t : Date.now()
  });
  this.table.emit('finishGame', finishData, null, consts.LOSING_REASON[losingReason] ? util.format(consts.LOSING_REASON[losingReason], loseUser ? loseUser.userInfo.fullname : null) : undefined);
  this.table.pushFinishGame(data, true);
};

function Table(opts) {
  Table.super_.call(this, opts, null, Player);
  this.looseUser = null;
  this.game = new Game(this);
  this.addFunction = [];
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
  status.killed = {};
  status.killed[-1] = boardStatus['killedWhiteCounter'][0];
  status.killed[1] = boardStatus['killedBlackCounter'][0];
  if(status.turn) {
    status.turn.banSquare = boardStatus.illegalMoves;
    if (this.status !== consts.BOARD_STATUS.NOT_STARTED){
      status.turn.lockBoard = 0;
    }
  }
  status.score  = this.score;
  return status
};


Table.prototype.clearPlayer = function (uid) {
  if (this.game && this.status !== consts.BOARD_STATUS.NOT_STARTED){
    var index = this.game.playerPlayingId.indexOf(uid);
    if(index > -1){
      this.game.finishGame(consts.WIN_TYPE.GIVE_UP, uid, consts.LOSING_REASON_NAME.ROI_BAN);
    }
  }
};

Table.prototype.startGame = function (uid, cb) {
  var code = this.checkStartGame();
  var self = this;
  if (code.ec == Code.OK) {
    this.game.playerPlayingId = utils.clone(this.players.playerSeat);
    utils.invokeCallback(cb);
    self.game.init();
  } else {
    return utils.invokeCallback(cb, null, utils.merge_options(code, {menu: this.players.getPlayer(uid).menu}))
  }
};

Table.prototype.action = function (uid, opts, auto, cb) {
  if (typeof auto === 'function'){
    cb = auto;
    auto = null;
  }
  var otherPlayer;
  var remove = this.game.game.makeMove(opts.move);
  this.game.numMove += 1;
  var player = this.players.getPlayer(uid);
  if (!auto) player.autoAction = 0;
  var id = player.color === consts.COLOR.WHITE ? -1 : 1;
  var result = player.move(this.game.numMove);
  if (this.turnId){
    this.timer.cancelJob(this.turnId);
  }
  if (opts.move){
    if (result){
      // change Menu
      this.pushMessageToPlayer(player.uid, 'game.gameHandler.action', { move : [[opts.move, id]], remove : remove.removedSquares, menu : player.menu, uid : uid});
      otherPlayer = this.players.getPlayer(this.players.getOtherPlayer(player.uid));
      this.pushMessageWithOutUids([player.uid, otherPlayer.uid], 'game.gameHandler.action', { move : [[opts.move, id]], remove : remove.removedSquares, uid : uid});
      this.pushMessageToPlayer(otherPlayer.uid, 'game.gameHandler.action', { move : [[opts.move, id]], remove : remove.removedSquares, menu : otherPlayer.menu, uid : uid});
    }else {
      this.pushMessage('game.gameHandler.action', { move : [[opts.move, id]], remove : remove.removedSquares, uid : uid});
    }
  }else {
    var notifyMsg = util.format('Người chơi %s nhường lượt đi', player.userInfo.fullname);
    if (result){
      // change Menu
      this.pushMessageToPlayer(player.uid, 'game.gameHandler.action', {remove : remove.removedSquares, menu : player.menu, notifyMsg : notifyMsg, uid : uid});
      otherPlayer = this.players.getPlayer(this.players.getOtherPlayer(player.uid));
      this.pushMessageToPlayer(otherPlayer.uid, 'game.gameHandler.action', {remove : remove.removedSquares, menu : otherPlayer.menu, notifyMsg : notifyMsg, uid : uid});
      this.pushMessageWithOutUids([player.uid, otherPlayer.uid], 'game.gameHandler.action', {remove : remove.removedSquares, notifyMsg: notifyMsg, uid : uid});
    }else {
      this.pushMessage('game.gameHandler.action', {remove : remove.removedSquares, notifyMsg: notifyMsg, uid : uid});
    }
  }
  this.game.stringLog.push(util.format('%s --- Người chơi %s di chuyển nước đi %s', moment().format('LTS'), player.userInfo.username, opts.move));
  this.game.progress();
  return utils.invokeCallback(cb, null, {});
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
        }else if(otherPlayer){
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
        if (player.timeDraw && this.game.numMove - player.timeDraw < 10){
          return {ec : Code.FAIL};
        }
        player.xinHoa(this.game.numMove);
        this.pushMessageToPlayer(otherPlayerUid, 'game.gameHandler.demand', {
          id : consts.ACTION.DRAW,
          msg : "Đối thủ muốn xin hoà",
          time : 10000
        });
        return {menu : player.menu}
      }
      break;
    case consts.ACTION.SURRENDER:
      this.game.finishGame(consts.WIN_TYPE.GIVE_UP, opts.uid, consts.LOSING_REASON_NAME.XIN_THUA);
      return {};
      break;
    default :
      return {};
  }
};


Table.prototype.changeBoardProperties = function (uid, properties, addFunction, cb) {
  var uid = properties.uid;
  var self = this;
  Table.super_.prototype.changeBoardProperties.call(this, uid, properties, this.addFunction, function (err, res) {
    if (lodash.isNumber(properties.color)){
      var boardState = self.getBoardState(uid);
      self.pushMessageWithMenu('game.gameHandler.reloadBoard', boardState);
    }
    return utils.invokeCallback(cb, err, res)
  });
};

module.exports = Table;
