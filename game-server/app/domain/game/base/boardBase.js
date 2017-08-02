/**
 * Created by vietanha34 on 11/16/14.
 */
var consts = require('../../../consts/consts');
var pomelo = require('pomelo');
var lodash = require('lodash');
var async = require('async');
var logger = require('pomelo-logger').getLogger('game', __filename);
var messageService = require('../../../services/messageService');
var Timer = require('./logic/timer');
var channelUtil = require('../../../util/channelUtil');
var util = require('util');
var utils = require('../../../util/utils');
var itemDao = require('../../../dao/itemDao');
var Players = require('./entity/playerPool');
var EventEmitter = require('events').EventEmitter;
var Code = require('../../../consts/code');
var BoardConsts = require('./logic/consts');
var NotifyDao = require('../../../dao/notifyDao');
var UserDao = require('../../../dao/userDao');
var Promise = require('bluebird');
var dictionary = require('../../../../config/dictionary.json');

/**
 * Bàn chơi cơ bản của game cờ, developer có thể kế thửa để phát triển cho từng loại game
 * Tham số truyền vào
 * * opts :
 *   * gameId Number: Định danh của game
 *   * tableId Number: định danh của bàn chơi
 *   * hallId Number: Định danh của khu vực
 *   * roomId Number : Định danh của phòng
 *   * bet Number: tiền cược của bàn chơi
 *   * roomId : Id của room : đại gia, bình dân, solo
 *   * numSlot : Lượng slot có trong bàn chơi
 *   * lock : bàn chơi có khoá hay không
 *   * autoStart : bàn chơi tự động bắt đầu khi đủ ngừoi chơi
 *   * status : trạng thái của bàn chơi
 *   * configBet : Array : mảng lượng tiền có thể config
 *
 * @module GameBase
 * @class BoardBase
 * @param {Object} opts Đối tượng các thuộc tính config cho bàn chơi
 * @param {Object} PlayerPool Đối tượng chứa lớp PlayerPool đã được extenđ
 * @param {Object} Player lớp Player người chơi có thể extend
 * @constructor
 */
var Board = function (opts, PlayerPool, Player) {
  opts = opts || {};
  this.gameId = parseInt(opts.gameId);
  this.tableId = opts.boardId;
  this.bet = opts.bet || 0;
  this.roomId = opts.roomId;
  this.level = opts.level;
  this.hallId = parseInt(opts.hallId);
  this.owner = '';
  this.base = opts.base;
  this.numSlot = 2;
  this.minBuyIn = this.bet;
  this.status = consts.BOARD_STATUS.NOT_STARTED;
  this.lock = '';
  this.minPlayer = 2;
  this.index = opts.index;
  this.maxPlayer = 2;
  this.configBet = opts.configBet || [];
  this.configTurnTime = opts.configTurnTime || [30 * 1000, 60 * 1000, 130 * 1000, 180 * 1000];
  this.configTotalTime = opts.configTotalTime || [5 * 60 * 1000, 10 * 60 * 1000, 15 * 60 * 1000, 30 * 60 * 1000];
  this.timeWait = opts.timeWait || 30000; // Thời gian đợi người chơi sẵn sàng hoặc start ván
  this.timeWaitStart = 15000;
  this.isMaintenance = false;
  this.turnTime = opts.turnTime * 1000 || 30 * 1000;
  this.totalTime = opts.totalTime * 1000 || 10 * 60 * 1000;
  this.tax = opts.tax || 5;
  this.tableType = 1; // loại bàn đá;
  this.score = [0, 0];
  this.firstUid = null;
  this.turnId = null;
  this.jobId = null;
  this.timeStart = Date.now();
  this.gameType = opts.gameType || consts.GAME_TYPE.NORMAL;
  this.timer = new Timer();
  var players = PlayerPool || Players;
  this.players = new players({
    numSlot: this.numSlot,
    table: this,
    maxPlayer: this.maxPlayer,
    Player: Player
  });
  this.channelName = channelUtil.getBoardChannelName(this.tableId);
  this.guestChannelName = channelUtil.getBoardGuestChannelName(this.tableId);
  // default
  this.betDefault = this.bet;
  this.turnTimeDefault = this.turnTime;
  this.totalTimeDefault = this.totalTime;
  var self = this;
  // TOURNAMENT
  if (this.gameType === consts.GAME_TYPE.TOURNAMENT) {
    this.numMatchPlay = 0;
    this.username = lodash.map(opts.username, function (username) {
        return username.toLowerCase();
      }) || null; // mảng người chơi đc phép chơi trong bàn
    this.fullname = opts.fullname || [];
    this.guildId = opts.guildId || [];
    this.tourType = opts.tourType || consts.TOUR_TYPE.NORMAL;
    this.timePlay = opts.timePlay || Date.now();
    this.matchPlay = opts.matchPlay || 3;
    this.tourTimeWait = opts.tourTimeWait > 10 * 60 * 1000 ? opts.tourTimeWait : 10 * 60 * 1000;
    this.tableTourFinish = false;
    this.tourScore = [0, 0];
    this.tourGuildDefault = [];
    this.tourWin = [0,0];
    this.guildName = opts.guildName || [];
    this.tourDraw = [0,0];
    this.tourLose = [0,0];
    this.tourId = opts.tourId;
    this.tourWinUser = null;
    this.tournamentLog = [];
    this.mustWin = opts.mustWin || false;
    if (this.timePlay > Date.now()) {
      this.setTourTimeout();
    }
  }
  this.changePropertiesFunction = [
    // thay đổi tiền cược
    function (properties, dataChanged, dataUpdate, changed, done) {
      // change bet;
      var bet = Math.abs(properties.bet);
      if (bet && bet !== self.bet) {
        var ownerPlayer = self.players.getPlayer(self.owner);
        var otherPlayerUid = self.players.getOtherPlayer(self.owner);
        var otherPlayer = self.players.getPlayer(otherPlayerUid);
        var multi = 1;
        if (ownerPlayer && ownerPlayer.checkItems(consts.ITEM_EFFECT.CUOCX5)) {
          multi = 5;
        } else if (ownerPlayer && ownerPlayer.checkItems(consts.ITEM_EFFECT.CUOCX3)) {
          multi = 3;
        }
        if ((bet < self.configBet[0] || bet > self.configBet[1] * multi) && !ownerPlayer.userInfo.vipLevel) {
          return done({
            ec: Code.FAIL,
            msg: util.format("Mức cược phải nằm trong khoảng từ %s đến %s Gold", self.configBet[0], self.configBet[1] * multi)
          });
        }
        if (bet < self.configBet[0]){
          return done({ec : Code.FAIL, msg : util.format("Mức cược không được phép nhỏ hơn %s Gold", self.configBet[0])});
        }
        if (ownerPlayer && ownerPlayer.gold < bet) {
          return done(utils.getError(Code.ON_GAME.FA_OWNER_NOT_ENOUGH_MONEY_CHANGE_BOARD))
        } else if (otherPlayer && otherPlayer.gold < bet){
          return done(utils.getError(Code.ON_GAME.FA_OTHER_NOT_ENOUGH_MONEY_CHANGE_BOARD))
        }else {
          changed.push(util.format(' mức cược : %s', bet));
          dataChanged.bet = bet;
          dataUpdate.bet = bet;
        }
      }
      return done(null, properties, dataChanged, dataUpdate, changed);
    },
    // thay đổi password
    function (properties, dataChanged, dataUpdate, changed, done) {
      // change bet;
      var lock = properties.password;
      if (lodash.isString(lock) && lock !== self.lock && self.gameType !== consts.GAME_TYPE.TOURNAMENT) {
        self.lock = lock;
        changed.push(' mật khẩu bàn chơi');
        dataChanged.password = lock;
        dataUpdate.password = lock;
      }
      return done(null, properties, dataChanged, dataUpdate, changed);
    },
    // thay đổi thời gian
    function (properties, dataChanged, dataUpdate, changed, done) {
      // TODO change turn Time
      var turnTime = properties.turnTime;
      var totalTime = properties.totalTime;
      var tableType = properties.tableType;
      if (turnTime && turnTime !== self.turnTime && (self.configTurnTime.indexOf(turnTime) > -1)) {
        self.turnTime = turnTime;
        changed.push(util.format(' thời gian 1 lượt đi: %s giây', turnTime / 1000));
        dataChanged.turnTime = turnTime;
        dataUpdate.turnTime = turnTime / 1000;
      }
      if (totalTime && self.totalTime !== totalTime && (self.configTotalTime.indexOf(totalTime) > -1)) {
        self.totalTime = totalTime;
        changed.push(util.format(' thời gian tổng: %s phút', totalTime / 1000 / 60));
        dataChanged.totalTime = totalTime;
        dataUpdate.totalTime = totalTime / 1000;
        self.players.changePlayerOption({totalTime: totalTime, totalTimeDefault: totalTime})
      }
      if (lodash.isNumber(tableType) && tableType !== self.tableType) {
        dataChanged.tableType = tableType;
        changed.push(' ' + consts.TABLE_TYPE_NAME_MAP[tableType]);
        self.tableType = tableType;
      }
      return done(null, properties, dataChanged, dataUpdate, changed);
    },
    // Thay đổi chủ bàn
    function (properties, dataChanged, dataUpdate, changed, done) {
      // changeOwner
      var owner = properties.owner;
      if (owner && self.owner !== owner && self.players.playerSeat.indexOf(owner)) {
        self.players.getPlayer(self.owner).clearOwner();
        self.players.getPlayer(owner).setOwner();
        self.owner = owner;
        //changed = true;
        dataChanged.owner = owner;
      }
      return done(null, properties, dataChanged, dataUpdate, changed);
    },
    //  change color
    function (properties, dataChanged, dataUpdate, changed, done) {
      var color = properties.color;
      if (!lodash.isNumber(color) || (color !== 1 && color !== 2 && color !== 0)) return done(null, properties, dataChanged, dataUpdate, changed);
      var uid = properties.uid;
      var player = self.players.getPlayer(uid);
      if (player && player.color !== color) {
        var otherPlayerUid = self.players.getOtherPlayer(player.uid);
        var otherPlayer = self.players.getPlayer(otherPlayerUid);
        if (!color) { // color === 0
          changed.push(' đổi bên');
          if (!self.formationMode) {
            if (otherPlayer) otherPlayer.color = otherPlayer.color === consts.COLOR.BLACK ? consts.COLOR.WHITE : consts.COLOR.BLACK;
            player.color = player.color === consts.COLOR.BLACK ? consts.COLOR.WHITE : consts.COLOR.BLACK;
            dataChanged.color = player.color;
            self.score.reverse();
          }
        } else {
          changed.push(' đổi màu quân');
          player.color = color;
          if (otherPlayer) otherPlayer.color = color === consts.COLOR.BLACK ? consts.COLOR.WHITE : consts.COLOR.BLACK;
          dataChanged.color = player.color;
          self.score.reverse();
        }
      }
      return done(null, properties, dataChanged, dataUpdate, changed);
    }
  ]
};

util.inherits(Board, EventEmitter);

var pro = Board.prototype;

module.exports = Board;

/**
 * Lấy đối tượng channel của bàn chơi
 *
 * @method getChannel
 * @returns {*|Channel}
 */
pro.getChannel = function () {
  return pomelo.app.get('channelService').getChannel(this.channelName, true);
};

/**
 * Nạp tiền cho người chơi trong bàn chơi
 *
 * @param uid
 * @param gold
 * @param msg
 * @param cb
 */
pro.chargeMoney = function (uid, gold, msg, cb) {
  var player = this.players.getPlayer(uid);
  if (!player) {
    utils.invokeCallback(cb);
  } else {
    if (!player.guest) {
      this.pushMessage('onChargeMoney', {
        punish: [{
          from: '',
          to: [uid],
          fromMoney: [-gold],
          toMoney: [gold],
          toMsg: msg,
          shop: 1
        }], sleep: consts.TIME.SLEEP_CHARGE
      });
    } else {
      this.pushMessageToPlayer(player.uid, 'onChargeMoney', {
        punish: [{
          from: '',
          to: [uid],
          fromMoney: [-gold],
          toMoney: [gold],
          toMsg: msg,
          shop: 1
        }], sleep: consts.TIME.SLEEP_CHARGE
      });
    }
    utils.invokeCallback(cb, null, true);
  }
};

/**
 * push message cho toàn bộ người dùng ở trong bàn
 *
 * @param {String} route route của gói tin
 * @param {Object} msg nội dung của gói tin
 * @method pushMessage
 */
pro.pushMessage = function (route, msg) {
  var player, key;
  logger.info('\n broadcast to channel %s : \n route : %s \n msg : %j', this.channelName, route, msg);
  if (!this.players) return
  for (key in this.players.players) {
    player = this.players.players[key];
    messageService.pushMessageToPlayer(player.getUids(), route, msg)
  }
  if (this.status === consts.BOARD_STATUS.PLAY){
    this.game.detailLog.push({
      r : dictionary[route],
      d : msg,
      t : Date.now()
    })
  }
};

pro.pushMessageWithMenu = function (route, msg) {
  var player, key;
  for (key in this.players.players) {
    player = this.players.players[key];
    messageService.pushMessageToPlayer(player.getUids(), route, utils.merge_options(msg, {menu: player.menu || []}))
  }
  if (this.status === consts.BOARD_STATUS.PLAY) {
    this.game.detailLog.push({
      r : dictionary[route],
      d : msg,
      t : Date.now()
    })
  }
  logger.info("\n Push message without Menu \n route :  %s \n message %j", route, msg);
};

pro.pushMessageWithMenuWithOutUid = function (uid, route, msg) {
  var player, key;
  for (key in this.players.players) {
    player = this.players.players[key];
    if (player.uid === uid) continue;
    messageService.pushMessageToPlayer(player.getUids(), route, utils.merge_options(msg, {menu: player.menu || []}))
  }
  logger.info("\n Push message without Menu \n route :  %s \n message %j", route, msg);
};


/**
 * Gửi gói tin đến một người chơi
 *
 * @param {String} uid định danh người chơi
 * @param {String} route route string cần gửi
 * @param {Object} msg Đối tượng message cần gửi
 * @method pushMessageToPlayer
 */
pro.pushMessageToPlayer = function (uid, route, msg) {
  var uids;
  if (this.players.getPlayer(uid)) {
    uids = this.players.getPlayer(uid).getUids();
    messageService.pushMessageToPlayer(uids, route, msg);
  }
  else {
    logger.warn('fail to push message to %s', uid)
  }
};


/**
 * Gửi gói tin đến một người chơi
 *
 * @param {Array} uids định danh người chơi
 * @param {String} route route string cần gửi
 * @param {Object} msg Đối tượng message cần gửi
 * @method pushMessageToUids
 */
pro.pushMessageToUids = function (uids, route, msg) {
  var data = [];
  for (var i = 0, len = uids.length; i < len; i++) {
    if (this.players.getPlayer(uids[i])) {
      data.push(this.players.getPlayer(uids[i]).getUids())
    }
  }
  messageService.pushMessageByUids(data, route, msg);
};

/**
 * Gửi msg đến tất cả ngừoi chơi trong bàn, ngoại trừ một số người chơi
 *
 * @param {Array} uids mảng ngừoi chơi không nhận msg
 * @param {String} route route của gói tin
 * @param {Object} msg đối tượng gói tin
 * @method pushMessageWithOutUids
 */
pro.pushMessageWithOutUids = function (uids, route, msg) {
  var pushUids = [], player, key;
  for (key in this.players.players) {
    player = this.players.players[key];
    if (uids.indexOf(player.uid) < 0) {
      pushUids.push(player.getUids())
    }
  }
  logger.info("\n Push message without Uids : %j \n route :  %s \n message %j", uids, route, msg);
  if (pushUids.length != 0) {
    messageService.pushMessageByUids(pushUids, route, msg)
  }
};

/**
 * Gửi msg đến tất cả ngừoi chơi trong bàn ngoại trừ 1 người chơi
 *
 * @param {String} uid Định danh người chơi không gửi đến
 * @param {String} routed
 * @param {Object} msg
 * @method pushMessageWithOutUid
 */
pro.pushMessageWithOutUid = function (uid, route, msg) {
  var uids = [], key, player;
  for (key in this.players.players) {
    player = this.players.players[key];
    if (player.uid != uid) {
      uids.push(player.getUids())
    }
  }
  if (this.status === consts.BOARD_STATUS.PLAY){
    this.game.detailLog.push({
      r : dictionary[route],
      d : msg,
      t : Date.now()
    })
  }
  logger.info("\n Push message without Uid : %j \n route :  %s \n message %j", uids, route, msg);
  if (uids.length != 0) {
    messageService.pushMessageByUids(uids, route, msg)
  }
};

pro.pushOnJoinBoard = function (uid) {
  var player = this.players.getPlayer(uid);
  var joinPlayerState = player.getState();
  var playerUids = Object.keys(this.players.players);
  for (var i = 0, len = playerUids.length; i < len; i++) {
    var playerUid = playerUids[i];
    var playerOther = this.players.getPlayer(playerUid);
    if (uid == playerUid) {
      continue
    }
    var tmpState = lodash.clone(joinPlayerState);
    tmpState.sid = this.players.getSlotId(player.uid);
    if (playerOther.guest && this.players.length >= this.maxPlayer) {
      this.pushMessageToPlayer(playerUid, 'onPlayerJoin', utils.merge_options(tmpState, {menu: playerOther.menu}));
    } else {
      this.pushMessageToPlayer(playerUid, 'onPlayerJoin', tmpState);
    }
  }
};

pro.pushStandUp = function (uid, data) {
  this.pushMessageWithMenuWithOutUid(uid, 'district.districtHandler.leaveBoard', data);
};

pro.pushLeaveBoard = function (uid, data) {
  var playerUids = Object.keys(this.players.players);
  for (var i = 0, len = playerUids.length; i < len; i++) {
    var playerUid = playerUids[i];
    if (uid === playerUid) {
      continue
    }
    console.log('pushMessage leaveBoard : ', uid);
  }
  this.pushMessageWithMenu('district.districtHandler.leaveBoard', data);
};

/**
 * clear player if timeout
 *
 * @param player
 * @param msg
 */
pro.playerTimeout = function (player, msg) {
  var self = this;
  this.emit('kick', player);
  var uids = this.leaveBoard(player.uid, true);
  messageService.pushMessageToPlayer(uids, 'district.districtHandler.leaveBoard', {
    uid: uids.uid, notifyMsg: msg || Code.ON_GAME.FA_TIME_OUT
  });
  if (!uids.guest) {
    self.pushLeaveBoard(uids.uid, {uid: uids.uid});
  }
};

pro.isAlive = function () {
  if (!this.players) {
    return false;
  }
  try {
    this.clearIdlePlayer();
  } catch (err) {
    console.error('clearIdlePlayer error : ', err);
  }
  if (this.base) {
    return true
  }
};


pro.clearIdlePlayer = function () {
  var key, player;
  if (!this.players) {
    return
  }
  var self = this;
  if (this.gameType === consts.GAME_TYPE.TOURNAMENT) {
    if (this.status === consts.BOARD_STATUS.NOT_STARTED && ((Date.now() > this.timePlay + this.tourTimeWait && !this.numMatchPlay) || (this.tourType === consts.TOUR_TYPE.FRIENDLY && this.numMatchPlay && Date.now() > this.timeStart + consts.TIME.FRIENDLY_WAIT )) && !this.tableTourFinish) {
      if (this.players.length === 2) {
        // startGame
        console.error('start Game đi chứ');
        this.players.readyAll();
        this.startGame(this.owner, function (err, res) {
          console.error('autoStartGame : ', arguments);
        });
      }
      else {
        // finishTourSession
        var winPlayer = this.players.getPlayer(this.owner);
        if (winPlayer) {
          this.tableTourFinish = true;
          this.tourWinUser = {
            guildId : winPlayer.userInfo.guildId,
            username: winPlayer.userInfo.username,
            uid: winPlayer.uid,
            fullname : winPlayer.userInfo.fullname
          };
          var matchWin = this.matchPlay - this.numMatchPlay;
          if (this.tourType === consts.TOUR_TYPE.FRIENDLY){
            var guildId = winPlayer.userInfo.guildId;
            var guildIndex = this.guildId.indexOf(guildId);
            var updateData = {};
            var field = 'guildScore' + (guildIndex + 1);
            updateData[field] = pomelo.app.get('mysqlClient').sequelize.literal('' + field + ' + ' + matchWin);
            pomelo.app.get('mysqlClient')
              .GuildBattle
              .update(updateData, {
                where : {
                  tourId : this.tourId
                }
              })
          }
          this.tourScore[this.getTourScoreIndex(winPlayer.userInfo)] += matchWin;
          this.emit('setBoard', {score : this.tourScore ? this.tourScore.join(' - ') : null}, true);
          this.emit('tourFinish', this.tourWinUser, 'Đối thủ không vào bàn khi thời gian chờ kết thúc hoặc không bắt đầu ván tiếp theo sau thời gian quy định');
        } else {
          // cả 2 người chơi cùng thua
          this.tableTourFinish = true;
          this.emit('tourFinish', null, 'Cả 2 đối thủ không vào bàn chơi');
        }
      }
    }
  }
  var playerSeat = lodash.compact(this.players.playerSeat);
  for (key in this.players.players) {
    player = this.players.players[key];
    if (playerSeat.indexOf(player.uid) > -1) {
      playerSeat.splice(playerSeat.indexOf(player.uid));
    }
    if (player.guest) {
      if (player.timeLogout && player.timeLogout < Date.now() - consts.TIME.LOGOUT) {
        this.playerTimeout(player);
      }
      if (!player.timeLogout && player.timeAction < Date.now() - consts.TIME.GUEST) {
        this.pushMessageToPlayer(player.uid, 'game.gameHandler.hint', {
          msg: "Vui lòng xác nhận bạn vẫn còn theo dõi trận đấu này!",
          time: 30,
          btLabel: 'Xem',
          actionId: 1
        });
        player.timeoutLeaveBoard = setTimeout(function (uid) {
          var player = self.players.getPlayer(uid);
          if (player && player.guest && !player.timeLogout && player.timeAction < Date.now() - consts.TIME.GUEST) {
            self.playerTimeout(player);
          }
        }, 30000 + 2000, player.uid);
      }
    } else {
      if (player.timeLogout && this.status === consts.BOARD_STATUS.NOT_STARTED && player.timeLogout < Date.now() - consts.TIME.LOGOUT) {
        this.playerTimeout(player);
      }
      if (this.gameType !== consts.GAME_TYPE.TOURNAMENT && this.status === consts.BOARD_STATUS.NOT_STARTED && this.players.length < 2 && player.timeAction < Date.now() - consts.TIME.BOARD_NOT_START) {
        this.pushMessageToPlayer(player.uid, 'game.gameHandler.hint', {
          msg: "Không có đối thủ thi đấu, bạn có muốn tiếp tục đợi không?",
          time: 30,
          btLabel: 'Xem',
          actionId: 1
        });
        player.timeoutLeaveBoard = setTimeout(function (uid) {
          var player = self.players.getPlayer(uid);
          if (player && !player.timeLogout && player.timeAction < Date.now() - consts.TIME.BOARD_NOT_START && self.status === consts.BOARD_STATUS.NOT_STARTED && self.players.length < 2) {
            self.playerTimeout(player);
          }
        }, 30000 + 2000, player.uid);
      }
    }
  }
  if (playerSeat.length > 0) {
    for (var i = 0, len = playerSeat.length; i < len; i++) {
      var uid = playerSeat[i];
      var index = this.players.playerSeat.indexOf(uid);
      if (index > -1) {
        this.players.playerSeat[index] = undefined;
      }
    }
  }
  this.clearGlobalChannel();
};

/**
 *
 * @param opts
 * @param cb
 * @method joinBoard
 */
pro.joinBoard = function (opts) {
  var userInfo = opts.userInfo;
  var uid = userInfo.uid;
  var self = this;
  if (this.lock && !this.players.getPlayer(uid) && this.lock !== opts.password) {
    var err = utils.getError(Code.ON_GAME.FA_WRONG_PASSWORD);
    err.tableId = this.tableId;
    err.gameId = this.gameId;
    err.roomId = this.roomId;
    return err;
  }
  var result = this.players.addPlayer(opts);
  if (result.ec == Code.OK) {
    if (result.newPlayer) {
      self.emit('joinBoard', self.players.getPlayer(uid));
    }
    var state = self.getBoardState(uid);
    state.notifyMsg = result.notifyMsg;
    state.ping = 3; // ping 3 giây 1 lần
    if (result.guest && self.players.length === self.maxPlayer) {
      state.msg = Code.ON_GAME.BOARD_FULL;
    } else {
      state.msg = result.msg;
    }
    return state;
  } else {
    return result
  }
};

pro.checkLeaveBoard = function (uid) {
  if (this.status !== consts.BOARD_STATUS.NOT_STARTED && this.timeStart + BoardConsts.LEAVEBOARD_TIMEOUT > Date.now() && this.players.availablePlayer.indexOf(uid) > -1) {
    return utils.getError(Code.ON_GAME.FA_LEAVE_BOARD_GAME_JUST_STARTED, [(BoardConsts.LEAVEBOARD_TIMEOUT - (Date.now() - this.timeStart)) / 1000 | 0])
  }
  return undefined
};

/**
 * Rời bàn
 *
 * @param {String} uid
 * @param kick
 * @method leaveBoard
 */
pro.leaveBoard = function (uid, kick) {
  var self = this;
  var player = self.players.getPlayer(uid);
  if (player && !player.guest && this.status !== consts.BOARD_STATUS.NOT_STARTED && this.timeStart + BoardConsts.LEAVEBOARD_TIMEOUT > Date.now()) {
    return utils.getError(Code.ON_GAME.FA_LEAVE_BOARD_GAME_JUST_STARTED, [Math.ceil((BoardConsts.LEAVEBOARD_TIMEOUT - (Date.now() - this.timeStart)) / 1000)]);
  }
  if (typeof self.clearPlayer == 'function') {
    try {
      self.clearPlayer(uid);
    }catch (err){
      console.error("clearPlayer err : ", err);
    }
  }
  var userInfo = player.userInfo;
  var uids = player.getUids();
  if (player) {
    player.reset();
  }
  var goldAfter = player.goldAfter + player.gold;
  uids.guest = player.guest;
  userInfo.guest = player.guest;
  self.players.removePlayer(uid);
  if (self.owner == uid) {
    self.setOwner();
    if (this.owner) {
      this.emit('changeOwner');
    }
  }
  self.emit('leaveBoard', userInfo, kick);
  uids.tourId = self.tourId;
  uids.tourType = self.tourType;
  uids.gold = goldAfter;
  return uids
};

/**
 * Lấy trạng thái của bàn chơi
 *
 * @method getStatus
 * @returns {{bet: *}}
 */
pro.getStatus = function () {
  var status = {
    stt: this.status
  };
  var turnId = this.jobId || this.turnId;
  var player = this.players.getPlayer(this.turnUid);
  if (lodash.isNumber(turnId) && player) {
    var timeLeft = this.timer.getLeftTime(turnId);
    status.turn = {
      uid: this.turnUid,
      count: this.status === consts.BOARD_STATUS.NOT_STARTED ? 0 : 1,
      time: [timeLeft,
        player.totalTime - (this.turnTime - timeLeft),
        this.status === consts.BOARD_STATUS.NOT_STARTED ? 30000 + 4000 : this.turnTime
      ]
    };
  }
  return status
};

pro.setOwner = function () {
  var owner = null;
  for (var i = 0; i < 2; i++) {
    if (this.players.playerSeat[i]) owner = this.players.playerSeat[i];
  }
  this.owner = owner;
  if (owner) {
    this.timeStart = Date.now();
    this.players.getPlayer(owner).setOwner();
  }
  return owner
};

/**
 * Lấy về thông tin, trạng thái của bàn chơi tại thời điểm hiện tại
 *
 * @param uid
 * @method getBoardState
 * @returns {{info: *, status: *, players: *}}
 */
pro.getBoardState = function (uid) {
  var state = {
    info: this.getBoardInfo(null, uid || this.owner),
    status: this.getStatus(uid),
    players: this.players.getPlayerState(uid)
  };
  if (this.owner) {
    state['owner'] = this.owner;
  }
  state.menu = this.players.getMenu(uid);
  var player = this.players.getPlayer(uid);
  if (player) state.role = player.userInfo.role;
  return state
};

pro.getPreview = function () {
  var state = {
    info: this.getBoardInfo(true),
    status: this.getStatus(),
    players: this.players.getPlayerState()
  };
  if (this.owner) {
    state['owner'] = this.owner;
  }
  return state
};

pro.getBoardInfo = function (finish, uid) {
  var player = this.players.getPlayer(uid);
  var multi = 1;
  if (player && player.checkItems(consts.ITEM_EFFECT.CUOCX5)) {
    multi = 5;
  } else if (player && player.checkItems(consts.ITEM_EFFECT.CUOCX3)) {
    multi = 3;
  }
  if (player && player.userInfo.vipLevel) {
    multi = 1000;
  }
  if (finish) {
    return {
      boardId: this.tableId,
      gameId: this.gameId,
      tourId: this.tourId,
      hallId: this.hallId,
      matchId: this.game ? this.game.matchId : '',
      bet: this.bet,
      guildId : this.guildId,
      owner: this.owner,
      tableType: this.tableType,
      gameType: this.gameType,
      tourType: this.tourType,
      finishTour: this.tableTourFinish,
      tourWinner: this.tourWinUser ? this.tourWinUser.uid : undefined
    }
  } else {
    return {
      gameId: this.gameId,
      tableId: this.tableId,
      roomId: this.roomId,
      turnTime: this.turnTime,
      totalTime: this.totalTime,
      password: this.lock,
      configBet: this.configBet.map(function (x, index) {
        if (index === 1) {
          return x * multi
        } else {
          return x
        }
      }),
      configTurnTime: this.configTurnTime || [],
      configTotalTime: this.configTotalTime || [],
      gameType: this.gameType,
      hallId: this.hallId,
      index: this.index,
      tableType: this.tableType,
      bet: this.bet,
      guest: this.players.guestIds.length
    }
  }
};

/**
 *
 * @param uid
 */
pro.standUp = function (uid) {
  var self = this;
  //if (this.status !== consts.BOARD_STATUS.NOT_STARTED && this.timeStart + BoardConsts.LEAVEBOARD_TIMEOUT > Date.now() && !force && this.players.availablePlayer.indexOf(uid) > -1) {
  //  return utils.getError(Code.ON_GAME.FA_LEAVE_BOARD_GAME_JUST_STARTED, [Math.ceil((BoardConsts.LEAVEBOARD_TIMEOUT - (Date.now() - this.timeStart)) / 1000) + 1])
  //}
  if (typeof self.clearPlayer == 'function') {
    self.clearPlayer(uid);
  }
  var player = self.players.getPlayer(uid);
  if (player) {
    player.reset();
    player.timeAction = Date.now();
    self.players.standUp(uid);
    self.emit('standUp', player);
  }
  if (self.owner == uid) {
    self.setOwner();
    if (this.owner) {
      this.emit('changeOwner');
    }
  }
};

/**
 *
 *
 * @param {Number} msg
 * @param {Boolean} punish
 */
pro.getPunishMessage = function (msg, punish) {
  return [punish ? Code.ON_GAME.FA_PUNISH : Code.ON_GAME.FA_NOT_PUNISH, msg]
};

/**
 *
 * @param uid
 * @param properties
 * @param addFunction
 * @param cb
 */
pro.changeBoardProperties = function (uid, properties, addFunction, cb) {
  var self = this;
  if (this.owner === uid) {
    var ownerName = 'Chủ bàn thay đổi - ';
  } else {
    ownerName = 'Người chơi'
  }
  properties = properties || {};
  var resultString = this.checkEffectSetting(properties);
  if (resultString) {
    return utils.invokeCallback(cb, null, {ec: Code.FAIL, msg: resultString});
  }
  if (this.gameType === consts.GAME_TYPE.TOURNAMENT) {
    return utils.invokeCallback(cb, null, {ec: Code.FAIL, msg: "Không thể thay đổi bàn chơi trong giải đấu"});
  }
  var propertiesFunction = [
    function (done) {
      return done(null, properties, {}, {}, []);
    }
  ].concat(this.changePropertiesFunction, lodash.isArray(addFunction) ? addFunction : []);
  async.waterfall(propertiesFunction, function (err, properties, dataChanged, dataUpdate, changed) {
    if (err) {
      return utils.invokeCallback(cb, err);
    } else {
      propertiesFunction.splice(0, propertiesFunction.length);
      if (changed.length > 0 && self.status === consts.BOARD_STATUS.NOT_STARTED) {
        if (dataChanged.bet) self.bet = dataChanged.bet;
        self.players.unReadyAll();
        var otherPlayer = self.players.getPlayer(self.players.getOtherPlayer());
        if (otherPlayer) {
          if (dataChanged.bet && otherPlayer.gold < dataChanged.bet) {
            self.standUp(otherPlayer.uid);
          } else {
            self.addJobReady(otherPlayer.uid);
          }
        }
        dataChanged.title = [Code.ON_GAME.OWNER, ownerName];
        dataChanged.msg = [Code.ON_GAME.OWNER_CHANGE_BOARD_PROPERTIES, self.bet.toString()];
        dataChanged.notifyMsg = ownerName + changed.join(',');
        self.emit('setBoard', dataUpdate);
        self.pushMessageWithMenu('game.gameHandler.changeBoardProperties', dataChanged);
        return utils.invokeCallback(cb, null, dataChanged);
      } else {
        return utils.invokeCallback(cb, null, {ec: Code.FAIL});
      }
    }
  })
};

pro.checkEffectSetting = function (properties) {
  var self = this;
  var ownerPlayer = self.players.getPlayer(self.owner);
  if (lodash.isString(properties.password) && properties.password.length > 0) {
    if (!ownerPlayer.checkItems(consts.ITEM_EFFECT.KHOA_BAN) && !ownerPlayer.userInfo.vipLevel) {
      this.emit('suggestBuyItem', this.owner, consts.ITEM_EFFECT.KHOA_BAN);
      return 'Bạn không có vật phẩm khoá bàn chơi';
    }
  }
  // if ((lodash.isNumber(properties.turnTime) || lodash.isNumber(properties.totalTime)) && (properties.turnTime !== self.turnTime || properties.totalTime !== self.totalTime) && !ownerPlayer.checkItems(consts.ITEM_EFFECT.SUA_THOI_GIAN)) {
  //   this.emit('suggestBuyItem', this.owner, consts.ITEM_EFFECT.SUA_THOI_GIAN);
  //   return 'Bạn cần có item Sửa thời gian mới thực hiện được chức năng này';
  // }
  if (properties.tableType === consts.TABLE_TYPE.DARK && !ownerPlayer.checkItems(consts.TABLE_TYPE_MAP_EFFECT[properties.tableType])) {
    this.emit('suggestBuyItem', this.owner, consts.ITEM_EFFECT.BAN_CO_TOI);
    return 'Bạn cần có item tương ứng để kích hoạt loại bàn cờ này'
  }
};

/**
 * sit in
 *
 * @param uid
 * @param slotId
 * @param cb
 */
pro.sitIn = function (uid, slotId, cb) {
  var self = this;
  var player = this.players.getPlayer(uid);
  if (!player || !player.guest || this.players.playerSeat.indexOf(uid) > -1) {
    return utils.invokeCallback(cb, null, {ec: Code.FAIL})
  } else {
    player.timeAction = Date.now();
    var result = this.players.sitIn(uid, slotId);
    if (result && !result.ec) {
      if (!self.owner) {
        self.owner = uid;
      }
      player.menu.splice(0, player.menu.length);
      player.genMenu();
      self.emit('sitIn', player);
      var state = self.getBoardState(uid);
      self.pushOnJoinBoard(uid);
      return utils.invokeCallback(cb, null, state);
    } else {
      return utils.invokeCallback(cb, null, result || {ec: Code.FAIL});
    }
  }
};

pro.close = function (cb) {
  var self = this;
  var channel = this.getChannel();
  if (this.timer) {
    this.timer.stop();
  }
  this.timer = null;
  if (channel) {
    channel.destroy();
  }
  pomelo.app.get('chatService').destroyChannel(this.channelName);
  if (this.players) {
    this.players.close(function () {
      self.players = null;
      utils.invokeCallback(cb);
      self.emit('close');
    });
  }
};

pro.getLocale = function (locale) {
  switch (locale) {
    case 1 :
      return 'FIRST';
    case 2 :
      return 'SECOND';
    case 3 :
      return 'THIRD';
    case 4 :
      return 'FOURTH';
    default :
      return 'FOURTH';
  }
};

pro.ready = function (uid) {
  var player = this.players.getPlayer(uid);
  if (player) {
    if (player.gold < this.bet && this.tourType !== consts.TOUR_TYPE.FRIENDLY) {
      return utils.getError(Code.ON_GAME.FA_BOARD_ALREADY_STARTED);
    }
    if (this.gameType === consts.GAME_TYPE.TOURNAMENT) {
      if (this.timePlay > Date.now()) {
        return {ec: 500, msg: "Chưa đến giờ thi đấu, xin vui lòng quay lại sau", menu: player.menu}
      }
      if (this.tableTourFinish){
        return {ec: 500, msg: "Bàn chơi đấu trường đã xác định người thắng cuộc. Bạn không thể chơi tiếp.", menu: player.menu}
      }
    }
    if (this.status === consts.BOARD_STATUS.NOT_STARTED && !player.ready && player.uid !== this.owner) {
      player.Ready();
      player.status = consts.PLAYER_STATUS.READY;
      this.pushMessageWithOutUid(uid, 'game.gameHandler.ready', {uid: uid});
      this.addJobStart(this.owner);
      return {};
    } else {
      return utils.getError(Code.ON_GAME.FA_BOARD_ALREADY_STARTED)
    }
  } else {
    // TODO change msg here
    return {ec: 500, msg: 'người chơi không tồn tại '}
  }
};

/**
 * Gọi khi cần bảo trì hệ thống
 * @method maintenance
 *
 */
pro.maintenance = function (opts) {
  if (!opts.enable) {
    this.isMaintenance = false;
  } else {
    this.isMaintenance = true;
    if (this.status === consts.BOARD_STATUS.NOT_STARTED && this.players.length > 0) {
      this.checkCloseWhenFinishGame()
    }
  }
};

pro.finishGame = function () {
  this.status = consts.BOARD_STATUS.NOT_STARTED;
  this.players.reset();
  this.timer.stop();
  this.turnUid = null;
  this.jobId = null;
  this.timer = null;
  this.timer = new Timer();
};

pro.kick = function (uid, cb) {
  var self = this;
  if (this.status !== consts.BOARD_STATUS.NOT_STARTED) {
    utils.invokeCallback(cb, null, utils.getError(Code.ON_GAME.FA_BOARD_ALREADY_STARTED));
    return
  }
  var player = this.players.getPlayer(uid);
  if (!player) {
    // TODO change msg nguoi choi khong ton tai
    utils.invokeCallback(cb, null, utils.getError(Code.FAIL));
    return
  }
  var notifyMsg = Code.ON_GAME.FA_KICK;
  var ownerPlayer = this.players.getPlayer(this.owner);
  if (this.tourType === consts.TOUR_TYPE.FRIENDLY){
    notifyMsg = 'Bạn bị đuổi bởi hội chủ';
  }else {
    if (ownerPlayer.userInfo.vipLevel < player.userInfo.vipLevel) {
      return utils.invokeCallback(cb, null, utils.getError(Code.ON_GAME.FA_VIP_LEVEL_NOT_ENOUGH))
    } else if (ownerPlayer.userInfo.vipLevel === player.userInfo.vipLevel && ownerPlayer.userInfo.vipLevel) {
      if (ownerPlayer.userInfo.vipPoint < player.userInfo.vipPoint) {
        return utils.invokeCallback(cb, null, utils.getError(Code.ON_GAME.FA_VIP_POINT_NOT_ENOUGH))
      } else if (ownerPlayer.userInfo.vipPoint === player.userInfo.vipPoint) {
        if (player.checkItems(consts.ITEM_EFFECT.CAM_KICK)) {
          return utils.invokeCallback(cb, null, utils.getError(Code.ON_GAME.FA_USER_HAS_ITEM_CAM_KICK));
        }
      }
      notifyMsg = 'Bạn bị đuổi bởi người có điểm vip lớn hơn';
    } else if (ownerPlayer.userInfo.vipLevel === player.userInfo.vipLevel) {
      if (player.checkItems(consts.ITEM_EFFECT.CAM_KICK)) {
        return utils.invokeCallback(cb, null, utils.getError(Code.ON_GAME.FA_USER_HAS_ITEM_CAM_KICK));
      }
    }
    if (ownerPlayer.userInfo.vipLevel > player.userInfo.vipLevel) {
      notifyMsg = 'Bạn bị đuổi bởi người có cấp vip lớn hơn';
    }
  }
  this.emit('kick', player);
  var userInfo = player.userInfo;
  var uids = this.leaveBoard(uid, true);
  if (uids && !uids.ec) {
    messageService.pushMessageToPlayer(uids, 'district.districtHandler.leaveBoard', {
      uid: uids.uid, notifyMsg: notifyMsg
    });
    self.pushLeaveBoard(uids.uid, {
      uid: uids.uid,
      notifyMsg: utils.getMessage(Code.ON_GAME.FA_KICK_WITH_NAME, [userInfo.fullname || userInfo.username])
    });
    utils.invokeCallback(cb, null, {});
  }
};

pro.muteChat = function (uid, cb) {
  var player = this.players.getPlayer(uid);
  if (!player) {
    // TODO change msg nguoi choi khong ton tai
    utils.invokeCallback(cb, null, utils.getError(Code.ON_GAME.FA_WRONG_MOVE));
    return
  }
  if (player.isCamChat) {
    utils.invokeCallback(cb, null, utils.getError(Code.ON_GAME.FA_CAM_CHAT_EXIST));
    return
  }
  player.isCamChat = true;
  this.pushMessageWithOutUid(player.uid, 'game.gameHandler.muteChat', {
    uid: player.uid,
    msg: utils.getMessage(Code.ON_GAME.FA_CAM_CHAT_WITH_NAME, [player.userInfo.fullname || player.userInfo.username])
  });
  pomelo.app.get('chatService').banUser(this.channelName, player.userInfo.uid);
  utils.invokeCallback(cb, null, {});
};


/**
 * Tạo đối tượng menu
 *
 * @param {Number} menuId
 * @param {Object} extraData
 * @method genMenu
 * @returns {*}
 */
pro.genMenu = function (menuId, extraData) {
  extraData = typeof extraData === 'object' ? extraData : {};
  return utils.merge_options({
      id: menuId,
      msg: utils.getMenuLanguage(menuId)
    },
    extraData
  )
};

pro.mixGiveUpUsers = function (data) {
  for (var i = 0, len = this.giveUpUsers.length; i < len; i++) {
    var giveUpUser = this.giveUpUsers[i];
    var index = lodash.findIndex(data, {uid: giveUpUser.uid});
    if (index > -1) {
      data.splice(index, 1);
    }
  }
  return data.concat(this.giveUpUsers);
};


pro.pushFinishGame = function (msg, finish, extraData) {
  extraData = extraData || {};
  var extra;
  if (!finish) {
    this.pushMessage('onFinishGame', msg);
  }
  else {
    for (var i = 0, len = this.players.playerSeat.length; i < len; i++) {
      var playerUid = this.players.playerSeat[i];
      if (!this.players.getPlayer(playerUid)) {
        continue
      }
      extra = utils.merge_options(extraData[playerUid], {menu: this.players.getPlayer(playerUid).menu});
      this.pushMessageToPlayer(playerUid, 'onFinishGame',
        utils.merge_options(msg, extra)
      );
    }
    for (i = 0, len = this.players.guestIds.length; i < len; i++) {
      var uid = this.players.guestIds[i];
      var player = this.players.getPlayer(uid);
      if (player) {
        this.pushMessageToPlayer(uid, 'onFinishGame', utils.merge_options(msg, {menu: player.menu || []}))
      }
    }
    this.checkCloseWhenFinishGame();
  }
};

pro.addJobReady = function (uid, time) {
  var self = this;
  time = time || this.timeWait;
  if (this.jobId) {
    this.timer.cancelJob(this.jobId);
  }
  this.pushMessage('onTurn', {
    uid: uid,
    count: 0,
    time: [time, this.totalTime, time]
  });
  this.turnUid = uid;
  this.jobId = this.timer.addJob(function (uid) {
    var player = self.players.getPlayer(uid);
    if (self.status !== consts.BOARD_STATUS.NOT_STARTED || !player || player.ready || self.owner === player.uid) {
      return
    }
    self.jobId = null;
    self.standUp(uid);
  }, uid, time + 2000);
};

pro.addJobStart = function (uid, time) {
  var self = this;
  time = time || this.timeWaitStart;
  if (this.jobId) {
    this.timer.cancelJob(this.jobId);
  }
  this.pushMessage('onTurn', {
    uid: uid,
    count: 0,
    time: [time, this.totalTime, time]
  });
  this.turnUid = uid;
  this.jobId = this.timer.addJob(function (uid) {
    var player = self.players.getPlayer(uid);
    if (self.status !== consts.BOARD_STATUS.NOT_STARTED || !player || self.owner !== player.uid) {
      return
    }
    self.jobId = null;
    self.standUp(uid);
  }, uid, time + 2000);
};

pro.cancelJob = function () {
  if (this.jobId) {
    this.timer.cancelJob(this.jobId);
    this.pushMessage('onTurn', {
      uid: -10,
      count: 0,
      time: [0, 0, 0]
    })
  }
};

pro.checkCloseWhenFinishGame = function checkCloseWhenFinishGame() {
  if (this.isMaintenance) {
    this.pushMessage('onNotify', {
      popup_type: consts.POPUP_TYPE.CENTER_SCREEN,
      title: Code.ON_GAME.FA_BOARD_MAINTENANCE_TITLE,
      message: Code.ON_GAME.FA_BOARD_MAINTENANCE_MESSAGE,
      buttonLabel: 'Rời bàn',
      buttonColor: 1,
      command: {
        target: consts.NOTIFY_TARGET.LEAVE_BOARD
      }
    });
    setTimeout(function () {
      pomelo.app.game.boardManager.remove({tableId: this.tableId});
    }.bind(this), 20000);
  }
};

pro.resetDefault = function () {
  this.bet = this.betDefault;
  this.lock = '';
  this.minPlayer = 2;
  this.maxPlayer = 2;
  if (this.tourType !== consts.TOUR_TYPE.FRIENDLY){
    this.score = [0, 0];
  }
  this.tableType = 1;
  this.turnTime = this.turnTimeDefault;
  this.totalTime = this.totalTimeDefault;
  this.emit('setBoard', {
    max_player: this.maxPlayer,
    bet: this.bet,
    password: null,
    totalTime: this.totalTime / 1000,
    turnTime: this.turnTime / 1000
  });
  this.emit('resetDefault');
};

/**
 * Thêm một item mới cho người chơi
 *
 * items :
 *  * uid : String uid của người chơi
 *    * gold : tiền thắng
 *    * effect : effect id,
 *    * values
 * @param items
 */
pro.addItems = function (items) {
  var uid = items.uid;
  var item = items.items || [];
  var player = this.players.getPlayer(uid);
  if (!player) {
    return
  }
  for (var i = 0, len = item.length; i < len; i++) {
    if (lodash.isNumber(item[i].gold)) {
      this.chargeMoney(uid, item[i].gold, utils.getMessage(Code.ON_GAME.CHARGE_MISSION_MONEY, [item[i].gold]));
      if (!this.maxBuyIn) {
        player.addGold(items[i].gold, null, items[i].msg || 'Nhận tiền từ ngoài vào')
      }
    }
  }
  player.addItems(item);
  return player.goldAfter
};

pro.getGuest = function () {
  return this.players.getGuest();
};

pro.checkStartGame = function () {
  var result = this.players.checkStartGame();
  if (!result) {
    return utils.getError(Code.ON_GAME.FA_NOT_READY);
  } else {
    if (this.gameType === consts.GAME_TYPE.TOURNAMENT) {
      if (this.timePlay > Date.now()) {
        return {ec: 500, msg: "Chưa đến giờ thi đấu, xin vui lòng quay lại sau"}
      }
    }
    return {ec: Code.OK};
  }
};

pro.logout = function (uid) {
  var player = this.players.getPlayer(uid);
  if (player) {
    player.timeLogout = Date.now();
  }
  this.emit('logout', player);
};

pro.buyItem = function (uid, item, duration, price) {
  var self = this;
  itemDao
    .buy(uid, item, duration)
    .then(function (result) {
      if (result && !result.ec) {
        var player = self.players.getPlayer(uid);
        if (player) {
          player.gold = result.gold;
          self.pushMessageToPlayer(uid, 'onChargeMoney', {
            uid: player.uid,
            deltaMoney: -price,
            money: player.gold,
            notifyMsg: 'Bạn vừa mua vật phẩm "' + consts.ITEM_EFFECT_NAME[item] + '" Thành công'
          });
          self.pushMessageWithMenuWithOutUid(uid, 'onChargeMoney', {
            uid: player.uid,
            deltaMoney: -price,
            money: player.gold
          });
          itemDao.checkEffect(uid, null)
            .then(function (effect) {
              var player = self.players.getPlayer(uid);
              player.effect = effect;
            })
        }
      }
    })
};

pro.hint = function (uid, msg) {
  var player = this.players.getPlayer(uid);
  if (!player) return;
  msg['actionId'] = msg['actionId '] || msg['actionId'];
  switch (msg['actionId']) {
    case 1:
      clearTimeout(player.timeoutLeaveBoard);
      player.timeoutLeaveBoard = null;
      player.timeLogout = null;
      player.timeAction = Date.now();
  }
};

pro.resetTournament = function (opts) {
  var self = this;
  this.numMatchPlay = 0;
  this.username = lodash.map(opts.username, function (username) {
      return username.toLowerCase();
    }) || null; // mảng người chơi đc phép chơi trong bàn
  this.timePlay = opts.timePlay || Date.now();
  this.matchPlay = opts.matchPlay || 3;
  this.tourTimeWait = opts.tourTimeWait || 10 * 60 * 1000;
  this.tableTourFinish = false;
  this.tourWinUser = null;
  if (this.timePlay > Date.now()) {
    setTimeout(function () {
      // thời gian tour đấu đã đến,
      // push ready cho người chơi
      self.pushMessage('onNotify', {
        type: consts.NOTIFY.TYPE.POPUP,
        title: 'Đấu trường',
        msg: 'Đã đến giờ thi đấu',
        buttonLabel: 'OK',
        command: {target: consts.NOTIFY.TARGET.NORMAL},
        image: consts.NOTIFY.IMAGE.NORMAL
      });
      if (self.players.length > 1) {
        self.addJobReady(self.players.getOtherPlayer(), self.timeWait);
      }
    }, this.timePlay - Date.now());
  }
};


pro.setBoard = function (opts) {
  console.log('board setBoard : ', opts);
  if (opts.username) this.username = opts.username;
  if (opts.totalTime) this.totalTime = opts.totalTime;
  if (opts.turnTime) this.turnTime = opts.turnTime;
  if (opts.fullname) this.fullname = opts.fullname;
  if (opts.matchTime) {
    this.timePlay = opts.matchTime;
    clearTimeout(this.tourTimeout);
    this.setTourTimeout();
  }
};

pro.setTourTimeout  = function () {
  var self = this;
  this.tourTimeout = setTimeout(function () {
    // thời gian tour đấu đã đến,
    // push ready cho người chơi
    self.pushMessage('onNotify', {
      type: consts.NOTIFY.TYPE.POPUP,
      title: 'Đấu trường',
      msg: 'Đã đến giờ thi đấu, 2 đối thủ vui lòng sẵn sàng thi đấu.',
      buttonLabel: 'OK',
      command: {target: consts.NOTIFY.TARGET.NORMAL},
      image: consts.NOTIFY.IMAGE.NORMAL
    });
    Promise.map(self.username, UserDao.getUserIdByUsername)
      .then(function (result) {
        NotifyDao.push({
          type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
          title: 'Đấu trường',
          msg: util.format('Đã đến giờ thi đấu Đấu trường, bạn có muốn vào bàn chơi không?'),
          buttonLabel: 'Đến',
          command: {target: consts.NOTIFY.TARGET.GO_BOARD, boardId: self.tableId},
          scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
          users: result,
          image: consts.NOTIFY.IMAGE.NORMAL
        });
        NotifyDao.push({
          type: consts.NOTIFY.TYPE.POPUP,
          title: 'Đấu trường',
          msg: util.format('Đã đến giờ thi đấu Đấu trường, bạn có muốn vào bàn chơi không?'),
          buttonLabel: 'Đến',
          command: {target: consts.NOTIFY.TARGET.GO_BOARD, boardId: self.tableId},
          scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
          users: result,
          image: consts.NOTIFY.IMAGE.NORMAL
        });
      });
    if (self.players.length > 1) {
      self.addJobReady(self.players.getOtherPlayer(), self.timeWait);
    }
  }, this.timePlay - Date.now());
};

pro.getTourScoreIndex = function (userInfo) {
  if(!userInfo) return;
  if (this.tourType === consts.TOUR_TYPE.FRIENDLY) {
    return this.guildId.indexOf(userInfo.guildId);
  }else {
    return this.username.indexOf(userInfo.username);
  }
};

pro.transfer = function (bet, fromUid, toUid) {
  if (this.gameType === consts.GAME_TYPE.TOURNAMENT && this.tourType === consts.TOUR_TYPE.FRIENDLY) {
    var fromPlayer = this.players.getPlayer(fromUid);
    var toPlayer = this.players.getPlayer(toUid);
    this.players.paymentRemote(consts.PAYMENT_METHOD.TRANSFER, {
      gold : bet,
      fromGuildId : fromPlayer.userInfo.guildId,
      toGuildId : toPlayer.userInfo.guildId,
      gameId: this.gameId,
      tax : 5,
      force : true,
      gameType : this.gameType,
      tourType : this.tourType
    }, 1, function () {});
  }else {
    this.players.paymentRemote(consts.PAYMENT_METHOD.TRANSFER, {
      gold : bet,
      gameId: this.gameId,
      fromUid : fromUid,
      gameType : this.gameType,
      toUid : toUid,
      tax : 5,
      force : true
    }, 1, function () {});
  }
};

pro.clearGlobalChannel = function () {
  var self = this;
  pomelo.app.get('globalChannelService').getMembersByChannelName('connector', this.channelName, function (err, members) {
    if (err) {
      return console.error('clearGlobalChannel : ', err);
    }
    else {
      for (var i = 0, len = members.length; i < len; i++) {
        var member = members[i];
        if (self.players.players[member]){
          // xoá bỏ khỏi game
        }
      }

    }
  })
};
