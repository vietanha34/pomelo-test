/**
 * Created by laanhdo on 11/25/14.
 */

var boardUtil = require('../base/logic/utils');
var consts = require('../../../consts/consts');
var Code = require('../../../consts/code');
var Formula = require('../../../consts/formula');
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
var pomelo = require('pomelo');



function Game(table, opts) {
  opts = opts || {};
  this.game = new Rule(false, opts.fen,  [],  []);
  this.turn = '';
  this.table = table;
  this.matchId = uuid.v4();
  this.blackUid = null;
  this.whiteUid = null;
  this.playerPlayingId = [];
  this.legalMoves = {};
  this.isCheck = {};
  this.numMove = 0;
  this.firstTurn = opts.turn;
  this.formationId = opts.id;
  this.maxMove = opts.numMove;
  this.formationName = opts.name;
  this.win = opts.win;
  this.previousMove = null;
  this.gameStatus = this.game.getBoardStatus();
}

Game.prototype.close = function () {
  this.table = null;
};

Game.prototype.init = function () {
  var i;
  this.table.timer.stop();
  this.game.startGame();
  this.table.status = consts.BOARD_STATUS.PLAY;
  var turnPlayer = this.table.players.findPlayerByColor(this.firstTurn);
  var color = turnPlayer.color;
  if (color !== consts.COLOR.WHITE){
    this.game.changeTurn();
  }
  this.firstTurn = turnPlayer.color;
  var keys = Object.keys(this.table.players.players);
  for (i = 0; i < keys.length; i++) {
    var player = this.table.players.getPlayer(keys[i]);
    player.menu = [];
    player.genStartMenu();
    player.startGame();
    if (this.playerPlayingId.indexOf(player.uid) > -1){
      player.totalTime = this.table.totalTime;
      player.removeMenu(consts.ACTION.CHANGE_SIDE);
      if (player.color === consts.COLOR.WHITE) {
        this.whiteUid = player.uid;
      } else {
        this.blackUid = player.uid;
      }
    }
  }
  this.table.pushMessageWithMenu('game.gameHandler.startGame', {});
  this.table.emit('startGame', this.playerPlayingId);
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
    if (Object.keys(gameStatus.warnings.sapChieuDai).length > 0) {
      notifyMsg = 'Bạn chiếu dai thêm một nước nữa sẽ bị xử thua';
    } else if (Object.keys(gameStatus.warnings.sapDuoiDai).length > 0 && !gameStatus.warnings.sapBiChieuHet) {
      notifyMsg = 'Bạn đuổi dai thêm một nước nữa sẽ bị xử thua';
    } else if (Object.keys(gameStatus.warnings.sapDuoiDai).length > 0 && gameStatus.warnings.sapBiChieuHet) {
      notifyMsg = 'Bạn đuổi dai thêm một nước nữa, ván đấu sẽ được xử hoà';
    }
  }
  this.table.pushMessageToPlayer(player.uid, 'onTurn',  {
    uid : player.uid,
    count: 1,
    notifyMsg : notifyMsg,
    time : [turnTime, player.totalTime],
    moves : gameStatus.legalMoves,
    isCheck : isCheck
  });
  var self = this;
  this.table.pushMessageWithOutUid(player.uid, 'onTurn', {uid : player.uid, count: 1, time : [turnTime, player.totalTime],isCheck : isCheck});
  this.table.turnUid = player.uid;
  this.table.turnId = this.table.timer.addJob(function () {
    self.finishGame(consts.WIN_TYPE.LOSE);
  }, null, turnTime + 2000);
};


Game.prototype.progress = function () {
  var gameStatus = this.gameStatus;
  var result = gameStatus.matchResult === 'thuaRoi'
    ? consts.WIN_TYPE.LOSE
    : gameStatus.matchResult === 'thangRoi'
    ? consts.WIN_TYPE.WIN
    : consts.WIN_TYPE.DRAW;

  if (gameStatus.isWhiteTurn && this.maxMove * 2 === this.numMove){
    if(this.win === result){
      return this.finishGame(consts.WIN_TYPE.WIN, this.whiteUid);
    }else {
      return this.finishGame(consts.WIN_TYPE.LOSE, this.whiteUid);
    }
  }
  var turn = gameStatus.isWhiteTurn ? consts.COLOR.WHITE : consts.COLOR.BLACK;
  console.log('gameStatus.matchResult : ', gameStatus.matchResult, turn, this.firstTurn, result, gameStatus);
  if (gameStatus.matchResult){
    switch (result){
      case consts.WIN_TYPE.WIN:
        if(turn === this.firstTurn){
          this.finishGame(result);
        }else {
          this.finishGame(consts.WIN_TYPE.WIN);
        }
        break;
      case consts.WIN_TYPE.LOSE:
        if(turn !== this.firstTurn){
          this.finishGame(result);
        }else {
          this.finishGame(consts.WIN_TYPE.LOSE);
        }
        break;
      case consts.WIN_TYPE.DRAW:
        if (this.win === result){
          if (turn === this.firstTurn){
            this.finishGame(consts.WIN_TYPE.WIN);
          }else {
            this.finishGame(consts.WIN_TYPE.LOSE)
          }
        }else {
          if (turn === this.firstTurn){
            this.finishGame(consts.WIN_TYPE.LOSE);
          }else {
            this.finishGame(consts.WIN_TYPE.WIN)
          }
        }
        break;
      default:
        return this.finishGame(result);
    }
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
  this.table.finishGame();
  var eloMap = this.table.hallId === consts.HALL_ID.MIEN_PHI ? [0,0] : Formula.calElo(players[0].result, players[0].elo, players[1].elo, this.table.gameId, this.table.bet);
  console.log('eloMap : ', eloMap);
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
  this.table.emit('finishGame', finishData);
  this.table.pushFinishGame({players: players}, true);
};

function Table(opts) {
  Table.super_.call(this, opts, null, Player);
  this.looseUser = null;
  this.formationMode = true;
  this.formation = null;
  var self = this;
  pomelo.app.get('mysqlClient')
    .XiangqiFormation
    .findOne({
      where: {
        status: 1
      },
      limit: 1,
      raw : true,
      attributes: ['id', 'fen', 'rank', 'name', 'win', 'turn', 'numMove']
    })
    .then(function (formation) {
      self.formation = formation;
      self.game = new Game(self, formation);
    });
  this.addFunction = []
}

util.inherits(Table, BoardBase);


Table.prototype.pushFinishGame = function (msg, finish) {
  this.reset();
  msg.status = this.getStatus();
  Table.super_.prototype.pushFinishGame.call(this, msg, finish);
};

Table.prototype.getStatus = function (uid) {
  var status = Table.super_.prototype.getStatus.call(this);
  var boardStatus = this.game.gameStatus;
  status.board = boardStatus.piecePositions;
  status.previous = boardStatus.prevMove || undefined;
  status.isCheck = boardStatus.checkInfo.isKingInCheck
    ? { king : boardStatus.checkInfo.kingPosition, attack : boardStatus.checkInfo.attackerPositions}
    : undefined;
  status.score  = this.score;
  status.log = boardStatus.movesHistory2;
  status.killed = utils.merge_options(boardStatus.killedPiecesForWhite, boardStatus.killedPiecesForBlack);
  if(status.turn){
    if (this.game.isCheck && this.game.isCheck.king) status.turn.isCheck = this.game.isCheck;
    status.turn.moves   = this.game.legalMoves;
  }
  status.formation = {
    name : this.game.formationName,
    maxMove : this.game.maxMove - Math.ceil(this.game.numMove / 2),
    maxDefMove : this.game.maxMove,
    id : this.game.id,
    total : 129,
    status : this.formationMode
      ? uid === this.owner
        ? 1
        : 0
      : 0,
    version: '123456',
    turn : this.game.firstTurn,
    color : consts.COLOR.WHITE,
    win : this.game.win
  };
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
    utils.invokeCallback(cb);
    self.game.init();
    this.emit('startGame', this.game.playerPlayingId);
  } else {
    return utils.invokeCallback(cb, null, utils.merge_options(utils.getError(code), {menu: this.players.getPlayer(uid).menu}))
  }
};

Table.prototype.action = function (uid, opts, cb) {
  var legal = this.game.game.checkMoveIsLegal(opts.move[0], opts.move[1]);
  if (legal){
    var killed = this.game.game.squares[opts.move[1]];
    this.game.previousChange = this.game.game.makeMove(opts.move[0], opts.move[1]);
    this.game.previousMove = {
      move : [opts.move[1], opts.move[0]],
      killed : killed ? [[opts.move[1],killed]] : undefined
    };
    this.game.numMove += 1;
    if (this.turnId){
      this.timer.cancelJob(this.turnId);
    }
    var player = this.players.getPlayer(uid);
    var result = player.move();
    this.game.gameStatus = this.game.game.getBoardStatus();
    var gameStatus = this.game.gameStatus;
    if (result){
      // change Menu
      this.pushMessageToPlayer(player.uid, 'game.gameHandler.action', {move : [opts.move], menu: player.menu, uid : uid, addLog : gameStatus.movesHistory3});
      this.pushMessageWithOutUid(player.uid, 'game.gameHandler.action', { move : [opts.move], uid : uid, addLog : gameStatus.movesHistory3});
    }else {
      this.pushMessage('game.gameHandler.action', { move : [opts.move], uid : uid, addLog : gameStatus.movesHistory3});
    }
    this.game.actionLog.push({
      move: [opts.move],
      uid : uid
    });
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
};

Table.prototype.reset = function () {
  this.game.close();
  this.game = null;
  this.game = new Game(this, this.formation);
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

Table.prototype.changeFormation = function (formation, opts) {
  var changeSide = opts.changeSide;
  this.game.close();
  this.formation = formation;
  this.game = new Game(this,formation);
  this.formationMode = false;
  var ownerColor = this.game.firstTurn === consts.COLOR.WHITE ? consts.COLOR.BLACK : consts.COLOR.WHITE;
  if (changeSide) {
    ownerColor = this.game.firstTurn;
  }
  var ownerPlayer = this.players.getPlayer(this.owner);
  this.players.changeColor(this.owner, ownerColor);
  ownerPlayer.removeMenu(consts.ACTION.SELECT_FORMATION);
  var otherPlayerUid = this.players.getOtherPlayer();
  var otherPlayer = this.players.getPlayer(otherPlayerUid);
  if (otherPlayer) {
    otherPlayer.pushMenu(this.genMenu(consts.ACTION.CHANGE_SIDE));
    otherPlayer.pushMenu(this.genMenu(consts.ACTION.READY));
    this.addJobReady(otherPlayer.uid);
  }
  ownerPlayer.pushMenu(this.genMenu(consts.ACTION.START_GAME));
  ownerPlayer.removeMenu(consts.ACTION.BOTTOM_MENU_CHANGE_SIDE);
  ownerPlayer.pushMenu(this.genMenu(consts.ACTION.EMO));
  ownerPlayer.pushMenu(this.genMenu(consts.ACTION.CHANGE_FORMATION));
  this.players.unReadyAll();
  var boardState = this.getBoardState();
  boardState.status.formation.change = 1;
  this.pushMessageWithMenu('game.gameHandler.reloadBoard', boardState);
  this.pushMessageWithMenu('game.gameHandler.reloadBoard', boardState);
};

Table.prototype.joinBoard = function (opts) {
  var state = Table.super_.prototype.joinBoard.call(this, opts);
  if(!state.ec && !this.formationMode && state.status && state.status.formation){
    state.status.formation.change = 1;
  }
  return state
};

Table.prototype.selectFormationMode = function () {
  this.formationMode = true;
  var ownerPlayer = this.players.getPlayer(this.owner);
  ownerPlayer.removeMenu(consts.ACTION.CHANGE_FORMATION);
  ownerPlayer.removeMenu(consts.ACTION.START_GAME);
  ownerPlayer.removeMenu(consts.ACTION.EMO);
  ownerPlayer.pushMenu(this.genMenu(consts.ACTION.SELECT_FORMATION));
  ownerPlayer.pushMenu(this.genMenu(consts.ACTION.BOTTOM_MENU_CHANGE_SIDE));
  ownerPlayer.pushMenu(this.genMenu(consts.ACTION.EMO));
  var otherPlayerUid = this.players.getOtherPlayer();
  var otherPlayer = this.players.getPlayer(otherPlayerUid);
  if (otherPlayer) {
    otherPlayer.removeMenu(consts.ACTION.CHANGE_SIDE);
    otherPlayer.removeMenu(consts.ACTION.READY);
    this.pushMessageToPlayer(otherPlayer.uid, "undefined", { menu : otherPlayer.menu})
  }
  this.cancelJob();
  this.addJobSelectFormation(this.owner);
  // todo push cho người chơi khác biết là chủ bàn đang chọn thế
  return { menu : ownerPlayer.menu };
};

Table.prototype.resetDefault = function () {
  Table.super_.prototype.resetDefault.call(this);
  this.formationMode = true;
};

Table.prototype.ready = function (uid) {
  var result = Table.super_.prototype.ready.call(this, uid);
  if (!result.ec){
    var player = this.players.getPlayer(uid);
    player.removeMenu(consts.ACTION.CHANGE_SIDE);
    return {menu : player.menu}
  }else {
    return result
  }
};

Table.prototype.standUp = function (uid) {
  var currentOwner = this.owner;
  var result = Table.super_.prototype.standUp.call(this, uid);
  if (currentOwner === uid && this.formationMode && this.owner != uid){
    this.pushMessageToPlayer(this.owner,  'game.gameHandler.changeFormationMode', {})
  }
  return result
};

Table.prototype.leaveBoard = function (uid) {
  var currentOwner = this.owner;
  var result = Table.super_.prototype.leaveBoard.call(this, uid);
  if (result && !result.ec){
    if (currentOwner === uid && this.formationMode && this.owner !== uid){
      this.pushMessageToPlayer(this.owner,  'game.gameHandler.changeFormationMode', {})
    }
  }
  return result
};

Table.prototype.addJobSelectFormation = function (uid) {
    var self = this;
    if (this.jobId){
      this.timer.cancelJob(this.jobId);
    }
    this.pushMessage('onTurn', {
      uid : uid,
      count : 0,
      time : [2 * 60 * 1000, this.totalTime, 2 * 60 * 1000]
    });
    this.turnUid = uid;
    this.jobId = this.timer.addJob(function (uid) {
      var player = self.players.getPlayer(uid);
      if (self.status !== consts.BOARD_STATUS.NOT_STARTED || !player || self.owner !== player.uid){
        return
      }
      self.jobId = null;
      self.standUp(uid);
      var state = self.getBoardState(this.owner);
      self.pushMessageToPlayer(this.owner, 'game.gameHandler.reloadBoard', state);
    }, uid, 2 * 60 * 1000 + 4000);
};


Table.prototype.changeBoardProperties = function (uid, properties, addFunction, cb) {
  var self = this;
  Table.super_.prototype.changeBoardProperties.call(this, uid, properties, this.addFunction, function (err, dataChange) {
    if (dataChange && !dataChange.ec){
      if (lodash.isNumber(dataChange.color)){
        var player = self.players.getPlayer(uid);
        player.removeMenu(consts.ACTION.CHANGE_SIDE);
        self.ready(uid);
        var boardState = self.getBoardState(uid);
        self.pushMessageWithMenu('game.gameHandler.reloadBoard', boardState);
      }
    }
    return utils.invokeCallback(cb, err, dataChange)
  });
};

module.exports = Table;
