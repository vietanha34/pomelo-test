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
var Rule = require('luat-co-thu').Xiangqi;
var dictionary = require('../../../../config/dictionary.json');
var BoardBase = require('../base/boardBase');


function Game(table) {
  this.game = new Rule(false, 'default', table.lockMode || [], table.removeMode || []);
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
  var i, len;
  this.table.timer.stop();
  this.game.startGame();
  this.table.status = consts.BOARD_STATUS.PLAY;
  if (this.playerPlayingId.indexOf(this.table.looseUser) > -1) {
    this.turn = this.table.looseUser;
  } else {
    var index = Math.round(Math.random());
    this.turn = this.playerPlayingId[index];
  }
  this.table.looseUser = this.table.players.getOtherPlayer(this.turn);
  var turnPlayer = this.table.players.getPlayer(this.turn);
  console.log('Người chơi đi trước : ', turnPlayer.userInfo.username, turnPlayer.color);
  if (turnPlayer.color !== consts.COLOR.WHITE) {
    this.game.isWhiteTurn = false;
  } else {
    this.game.isWhiteTurn = true;
  }
  var keys = Object.keys(this.table.players.players);
  for (i = 0; i < keys.length; i++) {
    var player = this.table.players.getPlayer(keys[i]);
    if (this.playerPlayingId.indexOf(player.uid) > -1) {
      player.menu = [];
      player.genStartMenu();
      player.startGame();
      player.totalTime = this.table.totalTime;
      if (player.color === consts.COLOR.WHITE) {
        this.whiteUid = player.uid;
      } else {
        this.blackUid = player.uid;
      }
    }
  }
  var lock = false;
  if (this.game.lockModes.length > 0) {
    var moveInit = [];
    var moveAfter = [];
    for (i = 0, len = this.game.lockModes.length; i < len; i++) {
      var square = this.game.lockModes[i];
      if (square < 6) {
        lock = true;
        var config = consts.LOCK_MODE_MAP[square];
        moveInit.push([config.before[0], config.after[0]]);
        moveAfter.push([config.before[1], config.after[1]]);
      }
    }
  }
  if (lock) {
    this.table.pushMessageWithMenu('game.gameHandler.startGame', {sleep: 500});
    this.table.pushMessage('game.gameHandler.action', {move: moveInit, sleep: 500});
    this.table.pushMessage('game.gameHandler.action', {move: moveAfter});
  } else {
    this.table.pushMessageWithMenu('game.gameHandler.startGame', {});
  }
  this.table.emit('startGame', this.playerPlayingId);
  var gameStatus = this.game.getBoardStatus();
  this.setOnTurn(gameStatus);
};

Game.prototype.setOnTurn = function (gameStatus) {
  var turnColor = gameStatus.isWhiteTurn ? consts.COLOR.WHITE : consts.COLOR.BLACK;
  var turnUid = turnColor === consts.COLOR.WHITE ? this.whiteUid : this.blackUid;
  var player = this.table.players.getPlayer(turnUid);
  var notifyMsg;
  player.timeTurnStart = Date.now();
  var turnTime = player.totalTime <= this.table.turnTime ? player.totalTime : this.table.turnTime;
  turnTime = turnTime >= 5000 ? turnTime : 5000;
  var isCheck = gameStatus.checkInfo.isKingInCheck
    ? {king: gameStatus.checkInfo.kingPosition, attack: gameStatus.checkInfo.attackerPositions}
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
    } else if (gameStatus.warnings.khongTienTrien >= 34) {
      notifyMsg = 'Còn vài nước nữa. Nếu không tiến triển, ván đấu sẽ bị xử hoà'
    }
  }
  this.table.pushMessageToPlayer(player.uid, 'onTurn', {
    uid: player.uid,
    time: [turnTime, player.totalTime],
    count: 1,
    notifyMsg: notifyMsg,
    moves: gameStatus.legalMoves,
    isCheck: isCheck
  });
  var self = this;
  this.table.pushMessageWithOutUid(player.uid, 'onTurn', {
    uid: player.uid,
    count: 1,
    time: [turnTime, player.totalTime],
    isCheck: isCheck
  });
  this.table.turnUid = player.uid;
  console.log('setOnTurn with turnTime : ', turnTime);
  console.log('addTurnTime : ', turnTime);
  this.table.jobId = this.table.timer.addJob(function (uid) {
    console.log('Job finish : ', uid);
    self.finishGame(consts.WIN_TYPE.LOSE, uid);
  }, turnUid, turnTime + 2000);
};


Game.prototype.progress = function () {
  var gameStatus = this.game.getBoardStatus();
  if (gameStatus.matchResult) {
    var result = gameStatus.matchResult === 'thuaRoi'
      ? consts.WIN_TYPE.LOSE
      : gameStatus.matchResult === 'thangRoi'
      ? consts.WIN_TYPE.WIN
      : consts.WIN_TYPE.DRAW;
    return this.finishGame(result);
  } else {
    return this.setOnTurn(gameStatus);
  }
};

Game.prototype.finishGame = function (result, uid) {
  console.trace('finishGame : ', result);
  var turnColor = this.game.isWhiteTurn ? consts.COLOR.WHITE : consts.COLOR.BLACK;
  var turnUid = uid ? uid : turnColor === consts.COLOR.WHITE ? this.whiteUid : this.blackUid;
  var players = [], finishData = [];
  var xp, res, index, turnPlayer, fromUid, toUid, winUser, loseUser, addGold, subGold, winIndex, loseIndex;
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
      }else if (result === consts.WIN_TYPE.LOSE){
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
  this.table.finishGame();
  var eloMap = this.table.hallId === consts.HALL_ID.MIEN_PHI ? [0,0] : Formula.calElo(players[0].result.type, players[0].elo, players[1].elo, this.table.gameId, this.table.bet);
  console.log('eloMap : ', eloMap);
  for (i = 0, len = eloMap.length; i < len; i++) {
    player = this.table.players.getPlayer(players[i].uid);
    players[i].elo = (eloMap[i] || player.userInfo.elo)- player.userInfo.elo;
    finishData[i].result.elo = (eloMap[i] || player.userInfo.elo)- player.userInfo.elo;
    finishData[i].result.eloAfter = eloMap[i];
    player.userInfo.elo = eloMap[i];
    console.log('finishData : ', finishData[i], player.userInfo.username);
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
  this.lockMode = opts.lockMode || [];
  this.removeMode = opts.removeMode || [];
  this.lockModeDefault = opts.lockMode || [];
  if (this.hallId === consts.HALL_ID.LIET_CHAP) {
    this.allowLockMode = true;
  }
  this.game = new Game(this);
  var self = this;
  this.addFunction = [
    function (properties, dataChanged, dataUpdate, changed, done) {
      // changeOwner
      if (!self.allowLockMode) return done(null, properties, dataChanged, dataUpdate, changed);
      var update = false;
      if (lodash.isArray(properties.lock)) {
        update = true;
        self.lockMode = properties.lock;
        self.game.game.lockModes = self.lockMode;
        dataChanged.lock = properties.lock;
      }
      if (lodash.isArray(properties.remove)) {
        self.removeMode = properties.remove;
        self.game.game.handicapModes = self.removeMode;
        dataChanged.remove = properties.remove;
        update = true;
      }
      if (update) {
        changed = true;
        //dataChanged.optional = JSON.stringify({ lock : properties.lock || [], remove: properties.remove || []});
        dataUpdate.optional = JSON.stringify({lock: properties.lock || [], remove: properties.remove || []});
      }
      console.log('data Update lock : ', changed);
      return done(null, properties, dataChanged, dataUpdate, changed);
    }
  ]
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
  status.previous = boardStatus.prevMove || undefined;
  status.isCheck = boardStatus.checkInfo.isKingInCheck
    ? {king: boardStatus.checkInfo.kingPosition, attack: boardStatus.checkInfo.attackerPositions}
    : undefined;
  status.score = this.score;
  status.lock = this.game.game.lockSquares;
  status.remove = this.game.game.handicapSquares;
  status.log = boardStatus.movesHistory2;
  status.detail = '' + this.game.firstTurn === consts.COLOR.WHITE ? 'đỏ' : 'đen' + ' đi tiên';
  status.killed = utils.merge_options(boardStatus.killedPiecesForWhite, boardStatus.killedPiecesForBlack);
  if (status.turn) {
    if (this.game.isCheck && this.game.isCheck.king) status.turn.isCheck = this.game.isCheck;
    status.turn.moves = this.game.legalMoves;
  }
  return status
};

Table.prototype.getBoardInfo = function (finish) {
  var boardInfo = Table.super_.prototype.getBoardInfo.call(this, finish);
  boardInfo.allowLock = this.allowLockMode ? 1 : 0;
  boardInfo.lock = this.lockMode;
  boardInfo.remove = this.removeMode;
  return boardInfo
};

Table.prototype.clearPlayer = function (uid) {
  if (this.game && this.status !== consts.BOARD_STATUS.NOT_STARTED) {
    var index = this.game.playerPlayingId.indexOf(uid);
    if (index > -1) {
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
        utils.invokeCallback(cb, null, {ec: 500, msg: 'Lỗi trong quá trình khởi tạo ván chơi, xin vui lòng thử lại'})
      }
    });
    this.emit('startGame', this.game.playerPlayingId);
  } else {
    return utils.invokeCallback(cb, null, utils.merge_options(utils.getError(code), {menu: this.players.getPlayer(uid).menu}))
  }
};

Table.prototype.action = function (uid, opts, cb) {
  var legal = this.game.game.checkMoveIsLegal(opts.move[0], opts.move[1]);
  if (legal) {
    var killed = this.game.game.squares[opts.move[1]];
    this.game.previousChange = this.game.game.makeMove(opts.move[0], opts.move[1]);
    this.game.previousMove = {
      move: [opts.move[1], opts.move[0]],
      killed: killed ? [[opts.move[1], killed]] : undefined
    };
    this.game.numMove += 1;
    if (this.jobId) {
      this.timer.cancelJob(this.jobId);
    }
    var gameStatus = this.game.game.getBoardStatus();
    var player = this.players.getPlayer(uid);
    var result = player.move(this.game.numMove);
    if (result) {
      // change Menu
      this.pushMessageToPlayer(player.uid, 'game.gameHandler.action', {
        move: [opts.move],
        menu: player.menu,
        addLog: gameStatus.movesHistory3
      });
      this.pushMessageWithOutUid(player.uid, 'game.gameHandler.action', {
        move: [opts.move],
        addLog: gameStatus.movesHistory3
      });
    } else {
      this.pushMessage('game.gameHandler.action', {move: [opts.move], addLog: gameStatus.movesHistory3});
    }
    this.game.progress();
    return utils.invokeCallback(cb, null, {});
  } else {
    return utils.invokeCallback(cb, null, {ec: Code.FAIL})
  }
};

Table.prototype.finishGame = function () {
  this.status = consts.BOARD_STATUS.NOT_STARTED;
  this.turnUid = null;
  this.jobId = null;
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
  if (!player || this.players.playerSeat.indexOf(uid) < 0) {
    return {ec: Code.FAIL};
  }
  switch (opts.id) {
    case consts.ACTION.DE_LAY:
      otherPlayerUid = this.players.getOtherPlayer(uid);
      if (lodash.isNumber(opts.accept)) {
        // trả lời request
        otherPlayer = this.players.getPlayer(otherPlayerUid);
        if (opts.accept && otherPlayer.requestDelay) {
          // xử lý hoãn nước đi;
          if (this.jobId) {
            this.timer.cancelJob(this.jobId);
          }
          this.pushMessage('game.gameHandler.action', {
            move: [this.game.previousMove.move],
            add: this.game.previousMove.killed,
            rollBack: 1,
            isMinus: 1
          });
          this.game.game.takeBack(this.game.previousChange);
          this.game.progress();
          return {};
        }
        else {
          this.pushMessage('chat.chatHandler.send', {
            from : uid,
            targetType : consts.TARGET_TYPE.BOARD,
            type : 0,
            content : util.format('Người chơi %s từ chối xin hoãn', player.userInfo.fullname)
          });
          otherPlayer.requestDelay = false;
          return {};
        }
      } else {
        if (otherPlayerUid !== this.turnUid) {
          return {ec: Code.FAIL};
        }
        //request
        if (player.timeDelay && this.game.numMove - player.timeDelay < 20) {
          return {ec: Code.FAIL};
        }
        if (player.numDelay <= 0) {
          return {ec: Code.FAIL};
        }
        player.xinHoan(this.game.numMove);
        this.pushMessageToPlayer(otherPlayerUid, 'game.gameHandler.demand', {
          id: consts.ACTION.DE_LAY,
          msg: "Đối thủ muốn xin hoãn một nước đi",
          time: 10000
        });
        return {menu: player.menu}
      }
      break;
    case consts.ACTION.DRAW:
      otherPlayerUid = this.players.getOtherPlayer(uid);
      if (lodash.isNumber(opts.accept)) {
        // trả lời request
        otherPlayer = this.players.getPlayer(otherPlayerUid);
        if (opts.accept && otherPlayer.requestDraw) {
          // xử lý hoà cờ nước đi;
          this.game.finishGame(consts.WIN_TYPE.DRAW);
        } else {
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
    default :
      this.game.finishGame(consts.WIN_TYPE.LOSE, opts.uid);
  }
};

Table.prototype.resetDefault = function () {
  Table.super_.prototype.resetDefault.call(this);
  this.lockMode = this.lockModeDefault;
  this.removeMode.splice(0, this.removeMode.length);
};


Table.prototype.changeBoardProperties = function (properties, addFunction, cb) {
  var uid = properties.uid;
  var self = this;
  Table.super_.prototype.changeBoardProperties.call(this, properties, this.addFunction, function (err, res) {
    if (lodash.isArray(properties.lock) || lodash.isArray(properties.remove) || properties.color) {
      var ownerPlayer = self.players.getPlayer(self.owner);
      if (ownerPlayer.color === consts.COLOR.WHITE) {
        self.game.game.isWhiteTurn = true;
      } else {
        self.game.game.isWhiteTurn = false;
      }
      console.log('turnToMode : ');
      self.game.game.turnToMode();
      var boardState = self.getBoardState(uid);
      self.pushMessageWithMenu('game.gameHandler.reloadBoard', boardState);
    }
    return utils.invokeCallback(cb, err, res)
  });
};

module.exports = Table;
