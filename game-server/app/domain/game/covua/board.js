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
var Rule = require('luat-co-thu').Chess;
var dictionary = require('../../../../config/dictionary.json');
var BoardBase = require('../base/boardBase');
var moment = require('moment');


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
  this.gameStatus = this.game.getBoardStatus();
  this.previousMove = null;
  this.detailLog = [];
  this.actionLog = [];
  this.stringLog = [];s
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
  if(turnPlayer.color !== consts.COLOR.WHITE){
    var colorMap = this.table.players.changeColor(turnPlayer.uid, consts.COLOR.WHITE);
  }
  var keys = Object.keys(this.table.players.players);
  for (i = 0; i < keys.length; i++) {
    var player = this.table.players.getPlayer(keys[i]);
    if (this.playerPlayingId.indexOf(player.uid) > -1){
      player.menu = [];
      player.genStartMenu();
      player.startGame();
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
  this.gameStatus = this.game.getBoardStatus();
  this.setOnTurn(this.gameStatus);
};

Game.prototype.setOnTurn = function (gameStatus) {
  var turnColor = gameStatus.isWhiteTurn ? consts.COLOR.WHITE : consts.COLOR.BLACK;
  var turnUid = turnColor === consts.COLOR.WHITE ? this.whiteUid : this.blackUid;
  var player = this.table.players.getPlayer(turnUid);
  var notifyMsg;
  player.timeTurnStart = Date.now();
  var turnTime = player.totalTime <= this.table.turnTime ? player.totalTime : this.table.turnTime;
  var isCheck = gameStatus.checkInfo.isKingInCheck
    ? { king : gameStatus.checkInfo.kingPosition, attack : gameStatus.checkInfo.attackerPositions}
    : undefined;
  this.isCheck = isCheck;
  this.legalMoves = gameStatus.legalMoves;
  if (Object.keys(gameStatus.warnings).length > 0) {
    console.log('gameStatus.warning : ', gameStatus.warnings);
    if (gameStatus.warnings.khongTienTrien >= 44) {
      notifyMsg = 'Còn vài nước nữa. Nếu không tiến triển, ván đấu sẽ bị xử hoà'
    }
    if (gameStatus.warnings.isTwoRepetition){
      notifyMsg = 'Lặp lại thế cờ này một lần nữa, ván đấu sẽ hoà'
    }
  }
  this.table.pushMessageToPlayer(player.uid, 'onTurn',  {
    uid : player.uid,
    time : [turnTime, player.totalTime],
    moves : gameStatus.legalMoves,
    isCheck : isCheck,
    notifyMsg: notifyMsg,
    promote : gameStatus.promotionalMoves,
    redSquare : gameStatus.redSquare
  });
  this.stringLog.push(util.format('%s --- Chuyển lượt đánh cho người chơi %s với tổng thời gian %s, thời gian 1 lượt %s, %s', moment().format('LTS'), player.userInfo.username, player.totalTime, this.table.turnTime, notifyMsg ? util.format('NotifyMsg : "%s"', notifyMsg) : ''));
  var self = this;
  this.table.pushMessageWithOutUid(player.uid, 'onTurn', {uid : player.uid, time : [turnTime, player.totalTime],isCheck : isCheck});
  this.table.turnUid = player.uid;
  this.table.turnId = this.table.timer.addJob(function (uid) {
    var player = self.table.players.getPlayer(uid);
    if (!player || self.table.turnUid !== player.uid) return;
    var losingReason = player.totalTime < self.table.turnTime ? consts.LOSING_REASON_NAME.HET_TIME : consts.LOSING_REASON_NAME.HET_LUOT;
    self.finishGame(consts.WIN_TYPE.LOSE,uid, losingReason);
  }, turnUid, turnTime + 2000);
};


Game.prototype.progress = function () {
  var gameStatus = this.gameStatus;
  if (gameStatus.matchResult){
    var result = gameStatus.matchResult === 'thuaRoi'
      ? consts.WIN_TYPE.LOSE
      : gameStatus.matchResult === 'thangRoi'
        ? consts.WIN_TYPE.WIN
        : consts.WIN_TYPE.DRAW;
    return this.finishGame(result);
  }else {
    return this.setOnTurn(gameStatus);
  }
};

Game.prototype.finishGame = function (result, uid, losingReason) {
  var turnColor = this.game.isWhiteTurn ? consts.COLOR.WHITE : consts.COLOR.BLACK;
  var turnUid = uid ? uid : turnColor === consts.COLOR.WHITE ? this.whiteUid : this.blackUid;
  var players = [];
  var xp, res, index, turnPlayer, fromUid, toUid, winUser, loseUser, addGold, subGold, winIndex, loseIndex;
  var finishData = [];
  var bet = result === consts.WIN_TYPE.DRAW ? 0 : this.table.bet;
  var playerPlaying = this.playerPlayingId.length > 0 ? this.playerPlayingId : this.table.players.playerSeat;
  for (var i = 0, len = playerPlaying.length; i < len ;i++){
    var player = this.table.players.getPlayer(playerPlaying[i]);
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
        guildId : player.userInfo.guildId,
        result : {
          type : result,
          color : player.color,
          xp : xp,
          elo : player.userInfo.elo
        },
        info: {
          platform : player.userInfo.platform
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
        guildId: player.userInfo.guildId,
        result : {
          type : res,
          color : player.color,
          xp : xp,
          elo : player.userInfo.elo
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
  var data = {players: players, notifyMsg: consts.LOSING_REASON[losingReason] ? util.format(consts.LOSING_REASON[losingReason], loseUser ? loseUser.userInfo.fullname : null) : undefined};
  if (lodash.isArray(this.detailLog)){
    this.detailLog.push({
      r : dictionary['onFinishGame'],
      d : data,
      t : Date.now()
    });
  }
  this.table.emit('finishGame', finishData, true, consts.LOSING_REASON[losingReason] ? util.format(consts.LOSING_REASON[losingReason], loseUser ? loseUser.userInfo.fullname : null) : undefined);

  this.table.pushFinishGame(data, true);
};

function Table(opts) {
  Table.super_.call(this, opts, null, Player);
  this.looseUser = null;
  this.lockMode = opts.lockMode || [];
  this.removeMode = opts.removeMode || [];
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
  var boardStatus = this.game.gameStatus;
  status.board = boardStatus.piecePositions;
  status.previous = boardStatus.prevMove || undefined;
  status.isCheck = boardStatus.checkInfo.isKingInCheck
    ? { king : boardStatus.checkInfo.kingPosition, attack : boardStatus.checkInfo.attackerPositions}
    : undefined;
  status.score  = this.score;
  status.killed = boardStatus.killedPiecesForWhite;
  status.log = boardStatus.movesHistory2;
  if(status.turn){
    if (this.game.isCheck && this.game.isCheck.king) status.turn.isCheck = this.game.isCheck;
    status.turn.moves   = this.game.legalMoves;
    status.turn.redSquare = boardStatus.redSquare;
    status.turn.promote = boardStatus.promotionalMoves;
  }
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

Table.prototype.action = function (uid, opts, cb) {
  var legal = this.game.game.checkMoveIsLegal(opts.move[0], opts.move[1]);
  if (legal){
    var killed = this.game.game.squares[opts.move[1]];
    var makeMoveResult = this.game.game.newMakeMove(opts.move[0], opts.move[1], opts.promote);
    this.game.previousMove = {
      move : [opts.move[1], opts.move[0]],
      killed : killed ? [[opts.move[1],killed]] : undefined
    };
    var gameStatus = this.game.game.getBoardStatus();
    this.game.gameStatus = gameStatus;
    var actionResponse = { move : [opts.move], addLog : gameStatus.movesHistory3};
    var actionLog = { move: [opts.move],
      t: Date.now() - this.timeStart
    };
    switch (makeMoveResult['specialType']){
      case 'batTotQuaDuong':
        actionResponse.remove = [makeMoveResult['removingSquare']];
        actionLog.remove = [makeMoveResult['removingSquare']];
        break;
      case 'nhapThanh':
        actionResponse.move.push([makeMoveResult['removingSquare'],makeMoveResult['addingSquare'][0]]);
        actionLog.move.push([makeMoveResult['removingSquare'],makeMoveResult['addingSquare'][0]]);
        break;
      case 'phongCap':
        actionResponse.promote = [[opts.move[1], opts.promote]];
        actionLog.promote = [[opts.move[1], opts.promote]];
        break;
      default :
        break;
    }
    this.game.numMove += 1;
    if (this.turnId){
      this.timer.cancelJob(this.turnId);
    }
    var player = this.players.getPlayer(uid);
    var result = player.move(this.game.numMove);
    if (result){
      // change Menu
      this.pushMessageToPlayer(player.uid, 'game.gameHandler.action', utils.merge_options(actionResponse, { menu : player.menu}));
      this.pushMessageWithOutUid(player.uid, 'game.gameHandler.action', actionResponse);
    }else {
      this.pushMessage('game.gameHandler.action', actionResponse);
    }
    this.game.actionLog.push(actionLog);
    this.game.stringLog.push(util.format('%s --- Người chơi %s di chuyển nước đi %s', moment().format('LTS'), player.userInfo.username, gameStatus.movesHistory3));
    this.game.progress();
    return utils.invokeCallback(cb, null, {});
  }else {
    return utils.invokeCallback(cb, null, { ec :Code.FAIL, msg :'đánh sai'});
  }
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
      if (lodash.isNumber(opts.accept)) {
        // trả lời request
        otherPlayer = this.players.getPlayer(otherPlayerUid);
        if (opts.accept && otherPlayer.requestDraw) {
          // xử lý hoà cờ nước đi;
          this.game.finishGame(consts.WIN_TYPE.DRAW);
        } else if (otherPlayer){
          this.pushMessage('chat.chatHandler.send', {
            from : uid,
            targetType : consts.TARGET_TYPE.BOARD,
            type : 0,
            content : util.format('Người chơi %s từ chối xin hoà', player.userInfo.fullname)
          });
          otherPlayer.requestDraw = false;
        }
      } else {
        //request
        if (player.timeDraw && this.game.numMove - player.timeDraw < 10) {
          return {ec: Code.FAIL};
        }
        player.xinHoa(this.game.numMove);
        this.pushMessageToPlayer(otherPlayerUid, 'game.gameHandler.demand', {
          id: consts.ACTION.DRAW,
          msg: "Đối thủ muốn xin hoà",
          time: 10000
        });
        return {menu: player.menu}
      }
      break;
    case consts.ACTION.SURRENDER:
      this.game.finishGame(consts.WIN_TYPE.LOSE, opts.uid, consts.LOSING_REASON_NAME.XIN_THUA);
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
