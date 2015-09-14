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
var Players = require('./entity/playerPool');
var EventEmitter = require('events').EventEmitter;
var Code = require('../../../consts/code');
var BoardConsts = require('./logic/consts');
var dictionary = require('../../../../config/dictionary.json');
var dataApi = require('../../../util/dataApi');
var ItemDao = require('../../../dao/itemDao');

/**
 * Bàn chơi cơ bản của game thẻ bài, developer có thể kế thửa để phát triển cho từng loại game
 * Tham số truyền vào
 * * opts :
 *   * gameId Number: Định danh của game
 *   * tableId Number: định danh của bàn chơi
 *   * bet Number: tiền cược của bàn chơi
 *   * roomId : Id của room : đại gia, bình dân, solo
 *   * maxPlayer Number: Số lượng ngừoi chơi tốt đa
 *   * minPlayer Number: Số lượng người chơi tối thiếu
 *   * numSlot : Lượng slot có trong bàn chơi
 *   * lock : bàn chơi có khoá hay không
 *   * autoStart : bàn chơi tự động bắt đầu khi đủ ngừoi chơi
 *   * status : trạng thái của bàn chơi
 *   * configPlayer : Array mảng lượng người chơi có thể config
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
  this.gameId = opts.gameId;
  this.tableId = opts.tableId;
  this.districtId = opts.districtId || 1;
  this.boardName = opts.boardName;
  this.bet = opts.bet || 0;
  this.roomId = opts.roomId;
  this.owner = '';
  this.base = opts.base;
  this.numMatchPlay = 0;
  this.maxPlayer = opts.maxPlayer || opts.numSlot || 4;
  this.minPlayer = opts.minPlayer || 2;
  this.numSlot = opts.numSlot || 4;
  this.minBuyIn = opts.minBuyIn || this.bet;
  this.maxBuyIn = opts.maxBuyIn ? opts.maxBuyIn : null;
  this.status = consts.BOARD_STATUS.NOT_STARTED;
  this.lock = opts.lock ? 1 : 0;
  this.autoStart = opts.autoStart == 1;
  this.configPlayer = opts.configPlayer || [];
  this.configBet = opts.configMoney || [];
  this.isClose = false;
  this.isMaintenance = false;
  this.turnTime = opts.turnTime || 20000;
  this.tax = opts.tax || 2;
  this.totalTax = 0;
  this.createdTime = Date.now();
  this.timeStart = Date.now();
  this.gameType = opts.gameType || consts.GAME_TYPE.NORMAL;
  this.timer = new Timer();
  this.minMoneyLength = 0;
  this.maxMoneyLength = 0;
  this.readyTimeout = {};
  this.startTimeout = null;
  this.title = opts.title;
  this.resultLog = []; // mảng kết quả trả về cho người chơi
  var players = PlayerPool || Players;
  this.players = new players({
    numSlot: this.numSlot,
    table: this,
    maxPlayer: this.maxPlayer,
    Player: Player
  });
  this.joinBoardQueue = async.queue(this.players.addPlayer,1);
  this.limitConfig = dataApi.limitConfig.findById(this.gameId);
  this.districtName = channelUtil.getDistrictChannelName(this.gameId);
  this.channelName = channelUtil.getBoardChannelName(this.tableId);
  this.giveUpUsers = [];
  this.tourId = opts.tourId || '';
  if (this.gameType === consts.GAME_TYPE.TOURNAMENT) {
    this.autoStart = 1;
    this.startTour = false;
    this.autoStartGame();
    this.matchTurn = opts.matchTurn || 0; // Số ván đấu trong một turn vào bàn
    this.elapsedTime = 10000;
  }
  // default
  this.betDefault = this.bet;
  this.minPlayerDefault = this.minPlayer;
  this.maxplayerDefault = this.maxPlayer;
};

util.inherits(Board, EventEmitter);

var pro = Board.prototype;

module.exports = Board;

pro.autoStartGame = function () {
  setTimeout(function () {
    this.startTour = true;
    this.elapsedTime = 0;
    if (this.players.length < this.minPlayer) {
      // ván chơi không đủ điều kiện để bắt đầu
      this.pushMessage('onNotify', {
        popup_type: consts.POPUP_TYPE.CENTER_SCREEN,
        title: "Đấu trường",
        message: Code.ON_TOUR.FA_BOARD_TOUR_NOT_ENOUGH_PLAYER,
        buttonLabel: 'Rời bàn',
        buttonColor: 1,
        command: {
          target: consts.NOTIFY_TARGET.LEAVE_BOARD
        }
      });
      setTimeout(function removeBoard() {
        pomelo.app.game.boardManager.remove({tableId: this.tableId});
      }.bind(this), 20000);
    } else {
      this.StartGame(this.owner);
    }
  }.bind(this), 13000)
};

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
 * Kiểm tra có đủ điều kiện để bắt đầu ván chơi hay không
 *
 */
pro.checkStartGame = function () {
  if (this.isMaintenance) {
    this.clearTimeoutStart();
    return Code.ON_GAME.FA_GAME_MAINTENANCE;
  }
  if (this.gameType === consts.GAME_TYPE.TOURNAMENT) {
    if (this.numMatchPlay >= this.matchTurn) {
      this.clearTimeoutStart();
      return Code.ON_GAME.FA_BOARD_ALREADY_STARTED
    }else {
      this.players.availablePlayer = [];
      for(var i = 0, len = this.players.playerSeat.length; i < len; i++){
        var uid = this.players.playerSeat[i];
        if (!uid) {
          continue
        }
        if (this.players.getPlayer(uid).gold > this.bet) {
          this.players.availablePlayer.push(this.players.playerSeat[i]);
        }
      }
      if (this.players.availablePlayer.length < this.minPlayer){
        return Code.ON_GAME.FA_NOT_ENOUGH_PLAYER;
      }
      return Code.OK
    }
  }
  if (!this.owner || !this.players.length) {
    this.clearTimeoutStart();
    return Code.ON_GAME.FA_OWNER_NOT_ENOUGH_MONEY;
  }
  var availablePlayer = this.players.getNumAvailablePlayer();
  var ownerPlayer = this.players.getPlayer(this.owner);
  var soloLimit;
  if (!this.autoStart) {
    if (lodash.isArray(this.limitConfig.solo)) {
      soloLimit = this.limitConfig.solo[0] * this.bet;
    } else {
      soloLimit = this.limitConfig.solo * this.bet;
    }
  }
  if (this.status !== consts.BOARD_STATUS.NOT_STARTED) {
    this.clearTimeoutStart();
    return Code.ON_GAME.FA_BOARD_ALREADY_STARTED
  } else if (!this.autoStart && ownerPlayer.gold < soloLimit) {
    this.clearTimeoutStart();
    return Code.ON_GAME.FA_OWNER_NOT_ENOUGH_MONEY;
  } else if (availablePlayer < this.minPlayer) {
    this.clearTimeoutStart();
    return Code.ON_GAME.FA_NOT_ENOUGH_PLAYER;
  } else {
    if (!this.autoStart && Date.now() - (this.timeFinish || 0) < 10000 && availablePlayer !== this.players.length) {
      // chua phai thoi gian de bat dau
      this.clearTimeoutStart();
      return Code.ON_GAME.FA_WAIT_FOR_READY; //{ code : , data : [(((10000 - Date.now() - (this.timeFinish || 0)) / 1000) | 0).toString()] };
    } else {
      return Code.OK
    }
  }
};

pro.divide = function (uid, deck, numCard, index) {
  index = index || 0;
  var fixCards = pomelo.app.get('gameService').fixCards;
  fixCards = fixCards || {};
  fixCards[this.gameId] = fixCards[this.gameId] || {};
  var player = this.players.getPlayer(uid);
  var cards = [];
  var fixCard = fixCards[this.gameId][player.userInfo.username];
  if (fixCard && fixCard.length > 0) {
    var cardFix = fixCard[this.numMatchPlay % fixCard.length];
    if (cardFix.length >= numCard) {
      cards = cardFix.slice(index, numCard + index);
    } else {
      cards = cardFix;
      for (var i = 0, len = numCard - cardFix.length; i < len; i++) {
        var j = 0;
        do {
          if (cards.indexOf(deck[j]) < 0) {
            cards.push(deck[j]);
            break;
          }
          j++;
        } while (1)
      }
    }
    for (j = 0, len = cards.length; j < len; j++) {
      var card = cards[j];
      utils.arrayRemove(deck, card);
    }
    return cards
  } else {
    return deck.splice(0, numCard);
  }
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
  if (!player || (this.maxBuyIn && (player.gold + gold) > this.maxBuyIn)) {
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
    }else {
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
  var channel = pomelo.app.get('channelService').getChannel(this.channelName, true);
  logger.info('\n broadcast to channel %s : \n route : %s \n msg : %j', this.channelName, route, msg);
  channel.pushMessage(route, msg);
};

pro.pushMessageWithMenu = function (route, msg) {
  var player, key;
  for (key in this.players.players) {
    player = this.players.players[key];
    messageService.pushMessageToPlayer(player.getUids(), route, utils.merge_options(msg, {menu: player.menu || []}))
  }
  logger.info("\n Push message without Menu \n route :  %s \n message %j", route, msg);
};


pro.pushMenuGame = function (route, msg) {
  for (var i = 0, len = this.players.playerSeat.length; i < len; i++) {
    var playerUid = this.players.playerSeat[i];
    if (!this.players.getPlayer(playerUid)) {
      continue
    }
    if (playerUid === this.owner) {
      this.pushMessageToPlayer(playerUid, route,
        utils.merge_options(msg, {menu: [this.genMenu(consts.ACTION.START_GAME)]})
      );
    } else {
      this.pushMessageToPlayer(playerUid, route,
        utils.merge_options(msg, {menu: [this.genMenu(consts.ACTION.READY)]})
      );
    }
  }
  this.pushMessageToUids(this.players.guestIds, route, msg);
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

pro.getLimitConfig = function () {

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
  logger.info("\n Push message without Uid : %j \n route :  %s \n message %j", uids, route, msg);
  if (uids.length != 0) {
    messageService.pushMessageByUids(uids, route, msg)
  }
};

/**
 * Gửi msg đến tất cả ngừoi chơi trong bàn ngoại trừ 1 người chơi
 *
 * @param {String} uid Định danh người chơi không gửi đến
 * @param {String} route
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
    tmpState.sid = this.players.getSlotId(playerUid, player.uid);
    if (playerOther.guest && this.players.length >= this.maxPlayer) {
      playerOther.removeMenu(consts.ACTION.SIT_BACK_IN);
      this.pushMessageToPlayer(playerUid, 'onPlayerJoin', utils.merge_options(tmpState, {menu: playerOther.menu}));
    } else {
      this.pushMessageToPlayer(playerUid, 'onPlayerJoin', tmpState);
    }
  }
};

pro.pushLeaveBoard = function (uid, data) {
  var playerUids = Object.keys(this.players.players);
  for (var i = 0, len = playerUids.length; i < len; i++) {
    var playerUid = playerUids[i];
    var player = this.players.getPlayer(playerUid);
    if (uid == playerUid) {
      continue
    }
    if (player.guest && this.players.length < this.maxPlayer) {
      if (!player.hasMenu(consts.ACTION.CHARGE_MONEY) && !player.hasMenu(consts.ACTION.SIT_BACK_IN)) {
        player.menu.push(this.genMenu(consts.ACTION.SIT_BACK_IN));
      }
      this.pushMessageToPlayer(playerUid, 'district.districtHandler.leaveBoard', utils.merge_options(data, {menu: player.menu}));
    } else {
      this.pushMessageToPlayer(playerUid, 'district.districtHandler.leaveBoard', data);
    }
  }
};

/**
 * clear player if timeout
 *
 * @param player
 * @param cb
 */
pro.playerTimeout = function (player, cb) {
  logger.info('\n %s auto leaveBoard ', player.uid);
  var self = this;
  this.emit('kick', player);
  this.leaveBoard(player.uid, true, function (err, uids) {
    if (err) {
      logger.error("message : %s , stack : %s , err : %s ", err.message, err.stack, err);
    } else if (uids && !uids.ec) {
      messageService.pushMessageToPlayer(uids, 'district.districtHandler.leaveBoard', {
        uid: uids.uid, msg: Code.ON_GAME.FA_TIME_OUT
      });
      if (!uids.guest) {
        self.pushLeaveBoard(uids.uid, {uid: uids.uid});
      }
      utils.invokeCallback(cb);
    }
  });
};

pro.isAlive = function () {
  if (!this.players) {
    return false;
  }
  this.clearIdlePlayer();
  if (this.base) {
    return true
  }
  if (this.players.length === 0 || this.status === consts.BOARD_STATUS.NOT_STARTED && (Date.now() - this.timeStart) > consts.TIME.GAME_IDLE) {
    return false
  }
  else {
    return true
  }
};

pro.clearIdlePlayer = function () {
  var key, player;
  if (!this.players) {
    return
  }
  var playerSeat = lodash.compact(this.players.playerSeat);
  for (key in this.players.players) {
    player = this.players.players[key];
    if (playerSeat.indexOf(player.uid) > -1) {
      playerSeat.splice(playerSeat.indexOf(player.uid));
    }
    if (player.timeAction < Date.now() - consts.TIME.SIT_OUT_TIMEOUT && ((this.status !== consts.BOARD_STATUS.NOT_STARTED && this.players.availablePlayer.indexOf(player.uid) < 0) || this.status === consts.BOARD_STATUS.NOT_STARTED)) {
      this.playerTimeout(player);
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
};

/**
 *
 * @param opts
 * @param cb
 * @method joinBoard
 */
pro.joinBoard = function (opts, cb) {
  var userInfo = opts.userInfo;
  var uid = userInfo.uid;
  var self = this;
  if (this.gameType === consts.GAME_TYPE.TOURNAMENT) {
    if (this.startTour && !this.players.getPlayer(uid) < 0)
      return utils.invokeCallback(cb, null, utils.getError(Code.ON_TOUR.TOUR_ALL_READY_STARTED));
    userInfo.fullname = '';
  }
  this.joinBoardQueue.push({ userInfo : userInfo, slotId: opts.slotId, context : this.players}, function (err, result) {
    if (err) {
      logger.error("message : %s , stack : %s , err : %s ", err.message, err.stack, err);
      utils.invokeCallback(cb, err);
    }
    else if (result.ec == Code.OK) {
      if (result.newPlayer) {
        self.emit('joinBoard', self.players.getPlayer(uid));
      }
      if (result.owner) {
        //
      } else {
        if (!result.guest && self.status === consts.BOARD_STATUS.NOT_STARTED && !this.autoStart && result.newPlayer) {
          self.setTimeoutReady([uid], 10000 + consts.TIME.TIMEOUT_LEAVE_BOARD);
        }
      }
      var state = self.getBoardState(uid);
      if (result.guest && self.players.length === self.maxPlayer) {
        state.msg = Code.ON_GAME.BOARD_FULL;
      }
      utils.invokeCallback(cb, null, state);
    } else {
      utils.invokeCallback(cb, null, result)
    }
  });
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
 * @param {Function} cb
 * @param {Boolean} force
 * @method leaveBoard
 */
pro.leaveBoard = function (uid, force, cb) {
  var self = this;
  if (this.status !== consts.BOARD_STATUS.NOT_STARTED && this.timeStart + BoardConsts.LEAVEBOARD_TIMEOUT > Date.now() && !force && this.players.availablePlayer.indexOf(uid) > -1) {
    utils.invokeCallback(cb, null, utils.getError(Code.ON_GAME.FA_LEAVE_BOARD_GAME_JUST_STARTED, [Math.ceil((BoardConsts.LEAVEBOARD_TIMEOUT - (Date.now() - this.timeStart)) / 1000)]));
    return
  }
  if (this.gameType === consts.GAME_TYPE.TOURNAMENT && ((!this.startTour && this.numMatchPlay === 0) && this.createdTime > Date.now() - 20 * 1000)) {
    utils.invokeCallback(cb, null, utils.getError(Code.ON_TOUR.FA_LEAVE_BOARD_TOUR_NOT_START));
    return
  }
  // TODO check nguòi chơi có trong bàn chơi không
  async.waterfall([
    function (done) {
      if (typeof self.clearPlayer == 'function') {
        self.clearPlayer(uid, done)
      } else {
        done()
      }
    },
    function (playing, done) {
      var player = self.players.getPlayer(uid);
      var userInfo = player.userInfo;
      var uids = player.getUids();
      if (player) {
        player.reset();
      }
      var goldAfter = player.goldAfter + player.gold;
      self.clearTimeoutReady([player.uid]);
      uids.guest = player.guest;
      self.players.removePlayer(uid);
      if (self.owner == uid) {
        self.setOwner();
      }
      self.emit('leaveBoard', userInfo);
      uids.target = self.gameType === consts.GAME_TYPE.TOURNAMENT ? consts.NOTIFY_TARGET.TOURNAMENT : undefined;
      uids.tourId = self.tourId;
      uids.gold = goldAfter;
      utils.invokeCallback(cb, null, uids);
      if (self.owner && self.players.getPlayer(self.owner)) {
        if (self.status == consts.BOARD_STATUS.NOT_STARTED) {
          self.pushMessageToPlayer(self.owner, 'game.gameHandler.setOwner', {
            uid: self.owner,
            menu: self.players.getPlayer(self.owner).menu
          });
          self.pushMessageWithOutUid(self.owner, 'game.gameHandler.setOwner', {uid: self.owner})
        } else {
          self.pushMessage('game.gameHandler.setOwner', {uid: self.owner});
        }
      }
      done();
    }
  ], function (err) {
    if (err) {
      logger.error("message : %s , stack : %s , err : %s ", err.message, err.stack, err);
    }
  });
};

/**
 * Lấy trạng thái của bàn chơi
 *
 * @method getStatus
 * @returns {{bet: *}}
 */
pro.getStatus = function () {
  return {
    bet: this.bet
  };
};


pro.setOwner = function (uid) {
  if (uid) {
    var player = this.players.getPlayer(uid);
    if (player) {
      if (player.uid !== this.owner) {
        player.setOwner();
        this.owner = player.uid;
      } else {
        this.owner = this.getNextOwner();
      }
      this.players.getPlayer(this.owner).clearOwner();
    } else {
      this.owner = this.getNextOwner();
    }
  } else {
    this.owner = this.getNextOwner();
  }
  if (this.owner && !this.autoStart && this.players.length >= 2 && this.players.checkAllReady()) {
    this.setTimeoutStart(this.owner, consts.TIME.TIMEOUT_START);
  }
};

/**
 * Lấy về thông tin, trạng thái của bàn chơi tại thời điểm hiện tại
 *
 * @param uid
 * @method getBoardState
 * @returns {{info: *, status: *, players: *}}
 */
pro.getBoardState = function (uid) {
  var player = this.players.getPlayer(uid);
  var state = {
    info: this.getBoardInfo(),
    status: this.getStatus(uid),
    players: this.players.getPlayerState(uid),
    item: player.item,
    emotion: player.emotion,
    gift: player.gift,
    award: player.award,
    awardMsg: player.awardMsg,
    resultLog: this.getResultLog() // logging result của game
  };
  if (player.effect && player.effect.expire) {
    player.effect.expiredTime = Math.abs(player.effect.expire - (Date.now() / 1000 | 0)) | 0;
  }
  state.effect = player.effect;
  if (this.readyTimeout[uid]) {
    var menu = this.players.getMenu(uid);
    var timeLeft = utils.getTimeLeft(this.readyTimeout[uid]);
    if (timeLeft > 0 && timeLeft < 10000) {
      for (var i = 0, len = menu.length; i < len; i++) {
        if (menu[i].id === consts.ACTION.READY) {
          menu[i].timeout = timeLeft
        }
      }
    }
    state.menu = this.players.getMenu(uid);
  } else {
    state.menu = this.players.getMenu(uid);
  }
  return state;
};

pro.getBoardInfo = function (finish) {
  if (finish) {
    return {
      boardId: this.tableId,
      gameId: this.gameId,
      tourId: this.tourId,
      districtId: this.districtId,
      matchId: this.game ? this.game.matchId : '',
      bet: this.bet,
      owner: this.owner,
      gameType: this.gameType
    }
  } else {
    return {
      gameId: this.gameId,
      tableId: this.tableId,
      roomId: this.roomId,
      maxPlayer: this.maxPlayer,
      minPlayer: this.minPlayer,
      owner: this.owner,
      numSlot: this.numSlot,
      time: this.turnTime,
      lock: this.lock,
      configPlayer: this.configPlayer,
      configBet: this.configBet,
      gameType: this.gameType,
      title: this.title,
      elapsedTime: this.elapsedTime
    }
  }
};

/**
 *
 * @param uid
 * @param force
 * @param cb
 */
pro.standUp = function (uid, force, cb) {
  var self = this;
  var standUpPlayer;
  if (this.status !== consts.BOARD_STATUS.NOT_STARTED && this.timeStart + BoardConsts.LEAVEBOARD_TIMEOUT > Date.now() && !force && this.players.availablePlayer.indexOf(uid) > -1) {
    utils.invokeCallback(cb, null, utils.getError(Code.ON_GAME.FA_LEAVE_BOARD_GAME_JUST_STARTED, [Math.ceil((BoardConsts.LEAVEBOARD_TIMEOUT - (Date.now() - this.timeStart)) / 1000) + 1]));
    return
  }
  async.waterfall([
    function (done) {
      if (typeof self.clearPlayer == 'function') {
        self.clearPlayer(uid, done)
      } else {
        done()
      }
    },
    function (playing, done) {
      var player = self.players.getPlayer(uid);
      if (player) {
        player.reset();
      }
      standUpPlayer = player;
      player.timeAction = Date.now();
      self.clearTimeoutReady([player.uid]);
      var owner = self.owner;
      self.players.standUp(uid);
      self.players.checkMissionAward(uid, done);
      if (self.owner == uid) {
        self.setOwner();
      }
      self.emit('standUp', player);
      if (self.owner && self.owner !== owner && self.players.getPlayer(self.owner)) {
        if (self.status == consts.BOARD_STATUS.NOT_STARTED) {
          self.pushMessageToPlayer(self.owner, 'game.gameHandler.setOwner', {
            uid: self.owner,
            menu: self.autoStart ? undefined : self.players.getPlayer(self.owner).menu
          });
          self.pushMessageWithOutUid(self.owner, 'game.gameHandler.setOwner', {uid: self.owner})
        } else {
          self.pushMessage('game.gameHandler.setOwner', {uid: self.owner});
        }
      }
    },
    function (award, done) {
      standUpPlayer.award = award ? award.isAward ? 1 : 0 : 0;
      standUpPlayer.awardMsg = award ? award.msg ? award.msg : '' : '';
      var state = self.getBoardState(uid);
      utils.invokeCallback(cb, null, state, uid);
      done();
    }
  ], function (err) {
    if (err) {
      utils.invokeCallback(cb, err)
    }
    standUpPlayer = null;
  });
};

pro.getNextOwner = function () {
  var mostUid = this.players.findMostPlayerWithoutOwner();
  if (mostUid) {
    this.owner = mostUid;
    this.players.getPlayer(mostUid).setOwner();
  }
  return mostUid
};

pro.setTimeoutReady = function (uids, time) {
  if (this.autoStart) {
    return
  }
  var self = this;
  if (!uids) {
    uids = lodash.compact(this.players.playerSeat);
  }
  var dataSetMenu = [];
  for (var i = 0, len = uids.length; i < len; i++) {
    var uid = uids[i];
    if (uid === self.owner) {
      continue
    }
    dataSetMenu.push({
      uid: uid,
      time: time,
      menu: consts.ACTION.READY
    });
    if (this.readyTimeout[uid]) {
      this.timer.cancelJob(this.readyTimeout[uid]);
    }
    this.readyTimeout[uid] = this.timer.addJob(function (uid) {
      if (self.status !== consts.BOARD_STATUS.NOT_STARTED || !self.players) {
        return;
      }
      self.startTimeout = null;
      var player = self.players.getPlayer(uid);
      if (player && self.owner !== player.uid && !player.ready) {
        var fullname = player.userInfo.fullname || player.userInfo.username;
        self.standUp(uid, true, function standUpTimeoutReady(err, state, uid) {
          if (state && !state.ec) {
            // TODO change message
            state.msg = Code.ON_GAME.FA_NOT_READY;
            self.pushMessageToPlayer(uid, 'game.gameHandler.reloadBoard', state);
            self.pushLeaveBoard(uid, {
              uid: uid,
              msg: utils.getMessage(Code.ON_GAME.FA_NOT_READY_WITH_USERNAME, [fullname])
            });
            if (self.owner && self.players.length >= 2 && self.players.checkAllReady()) {
              self.setTimeoutStart(self.owner, consts.TIME.TIMEOUT_START);
            }
          }
        });
      }
    }, uid, time);
  }
  this.pushMessage('onSetMenu', {
    data: dataSetMenu
  })
};

pro.setTimeoutStart = function (uid, time) {
  if (this.autoStart) {
    return
  }
  var self = this;
  if (this.startTimeout) {
    this.timer.cancelJob(this.startTimeout);
  }
  this.pushMessage('onSetMenu', {
    data: [
      {
        uid: uid,
        time: consts.TIME.TIMEOUT_START,
        menu: consts.ACTION.START_GAME
      }
    ]
  });
  this.startTimeout = this.timer.addJob(function (uid) {
    if (self.status !== consts.BOARD_STATUS.NOT_STARTED || !self.players) {
      return;
    }
    self.startTimeout = null;
    var player = self.players.getPlayer(uid);
    if (player && self.owner === player.uid) {
      var fullname = player.userInfo.fullname || player.userInfo.username;
      self.standUp(uid, true, function (err, state, uid) {
        if (state && !state.ec) {
          // TODO change message
          state.msg = Code.ON_GAME.FA_OWNER_NOT_START;
          self.pushMessageToPlayer(uid, 'game.gameHandler.reloadBoard', state);
          self.pushLeaveBoard(uid, {
            uid: uid,
            msg: utils.getMessage(Code.ON_GAME.FA_OWNER_NOT_START_WITH_USERNAME, [fullname])
          })
        }
      });
    }
  }, uid, time);
};

pro.clearTimeoutReady = function (uids) {
  if (this.autoStart) {
    return
  }
  uids = uids || Object.keys(this.readyTimeout);
  for (var i = 0, len = uids.length; i < len; i++) {
    var uid = uids[i];
    if (this.readyTimeout[uid]) {
      this.timer.cancelJob(this.readyTimeout[uid]);
      this.readyTimeout[uid] = null;
    }
  }
};

pro.clearTimeoutStart = function () {
  if (this.autoStart) {
    return
  }
  if (this.startTimeout) {
    this.timer.cancelJob(this.startTimeout);
    this.startTimeout = null;
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
 * @param properties
 * @param cb
 */
pro.changeBoardProperties = function (properties, notify, cb) {
  var changed = false;
  var dataChanged = {};
  var dataUpdate = {};
  var self = this;
  if (this.owner) {
    var ownerName = this.players.getPlayer(this.owner).userInfo.fullname;
  } else {
    ownerName = ''
  }
  properties = properties || {};
  async.waterfall([
    function (done) {
      // change numPlayer
      var numPlayer = properties.maxPlayer;
      if (numPlayer) {
        if (numPlayer !== self.maxPlayer && self.configPlayer.indexOf(numPlayer) > -1 && self.players.length <= numPlayer) {
          changed = true;
          self.maxPlayer = numPlayer;
          dataChanged.maxPlayer = numPlayer;
          dataUpdate.max_player = numPlayer;
        } else if (self.players.length > numPlayer) {
          return done({ec: Code.ON_GAME.FA_CHANGE_MAX_PLAYER_SMALL_THAN_PLAYER});
        } else if (self.configPlayer.indexOf(numPlayer) < 0) {
          return done({ec: Code.ON_GAME.FA_CHANGE_MAX_PLAYER_NOT_ON_CONFIG});
        }
      }
      done();
    },
    function (done) {
      // change bet;
      var bet = properties.bet;
      if (bet) {
        var minMoney = utils.getMoneyLimit(self.gameId, bet, true);
        var ownerPlayer = self.players.getPlayer(self.owner);
        if (ownerPlayer && ownerPlayer.gold < minMoney) {
          return done({ec: Code.ON_GAME.FA_OWNER_NOT_ENOUGH_MONEY_CHANGE_BOARD})
        } else {
          self.bet = bet;
          changed = true;
          dataChanged.bet = bet;
          dataUpdate.bet = bet;
        }
      }
      return done();
    },
    function (done) {
      // changed turnTime
      done();
    },
    function (done) {
      // changeOwner
      var owner = properties.owner;
      if (owner && self.owner !== owner && self.players.playerSeat.indexOf(owner)) {
        self.players.getPlayer(self.owner).clearOwner();
        self.players.getPlayer(owner).setOwner();
        self.owner = owner;
        changed = true;
        dataChanged.owner = owner;
      }
      done();
    }
  ], function (err) {
    if (err) {
      utils.invokeCallback(cb, err);
    } else {
      if (changed) {
        self.clearTimeoutReady();
        self.setTimeoutReady(null, 10000 + consts.TIME.TIMEOUT_LEAVE_BOARD);
        self.players.unReadyAll();
        dataChanged.title = [Code.ON_GAME.OWNER, ownerName];
        dataChanged.msg = [Code.ON_GAME.OWNER_CHANGE_BOARD_PROPERTIES, self.maxPlayer.toString(), self.bet.toString()];
        if (dataChanged.bet && self.gameId === consts.GAMEID.POKER) {
          dataChanged.smallblind = dataChanged.bet;
          dataChanged.bigblind = dataChanged.bet * 2;
          dataChanged.bet = null;
        }
        if (notify) {
          self.pushMessageWithMenu('game.gameHandler.changeBoardProperties', dataChanged);
        }
        self.emit('setBoard', dataUpdate);
        utils.invokeCallback(cb, null, {});
      } else {
        utils.invokeCallback(cb, null, {ec: Code.FAIL});
      }
    }
  })
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
    utils.invokeCallback(cb, null, {ec: Code.FAIL})
  } else {
    player.timeAction = Date.now();
    this.players.sitIn(uid, slotId, function (err, result) {
      if (err) {
        logger.error("message : %s , stack : %s , err : %s ", err.message, err.stack, err);
        utils.invokeCallback(cb, err);
      }
      else {
        if (result && !result.ec) {
          if (!self.owner) {
            self.owner = uid;
          }
          self.emit('sitIn');
          var state = self.getBoardState(uid);
          self.pushOnJoinBoard(uid);
          if (self.status === consts.BOARD_STATUS.NOT_STARTED && !this.autoStart) {
            self.setTimeoutReady([uid], 10000 + consts.TIME.TIMEOUT_LEAVE_BOARD);
          }
          utils.invokeCallback(cb, null, state);
        } else {
          utils.invokeCallback(cb, null, result || {ec: Code.FAIL});
        }
      }
    });
  }
};

pro.close = function (cb) {
  var self = this;
  this.isClose = true;
  var channel = this.getChannel();
  this.joinBoardQueue.kill();
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

pro.ready = function (uid, cb) {
  var player = this.players.getPlayer(uid);
  if (player) {
    if (this.status == consts.BOARD_STATUS.NOT_STARTED && !player.ready) {
      if (!this.autoStart && player.gold < (this.limitConfig.all ? this.limitConfig.all * this.bet : (this.limitConfig.solo || 1) * this.bet)) {
        utils.invokeCallback(cb, null, utils.getError(Code.ON_GAME.FA_NOT_ENOUGH_MONEY_TO_READY));
        return
      }
      player.Ready();
      this.clearTimeoutReady([player.uid]);
      if (!this.startTimeout && this.players.checkAllReady() && this.status === consts.BOARD_STATUS.NOT_STARTED) {
        this.setTimeoutStart(this.owner, consts.TIME.TIMEOUT_START);
      }
      player.status = consts.PLAYER_STATUS.READY;
      this.pushMessageWithOutUid(uid, 'game.gameHandler.ready', {uid: uid});
      utils.invokeCallback(cb, null, {});
    } else {
      utils.invokeCallback(cb, null, utils.getError(Code.ON_GAME.FA_BOARD_ALREADY_STARTED))
    }
  } else {
    // TODO change msg here
    utils.invokeCallback(cb, null, {ec: 500, msg: 'người chơi không tồn tại '});
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

pro.kick = function (uid, cb) {
  var self = this;
  if (this.status !== consts.BOARD_STATUS.NOT_STARTED && this.players.availablePlayer.indexOf(uid) > -1) {
    utils.invokeCallback(cb, null, utils.getError(Code.ON_GAME.FA_BOARD_ALREADY_STARTED));
    return
  }
  var player = this.players.getPlayer(uid);
  if (!player) {
    // TODO change msg nguoi choi khong ton tai
    utils.invokeCallback(cb, null, utils.getError(Code.FAIL));
    return
  }
  if (player.checkItems(ItemDao.CONFIG.EFFECT_LIST.CAM_KICK)) {
    utils.invokeCallback(cb, null, utils.getError(Code.ON_GAME.FA_USER_HAS_ITEM_CAM_KICK));
    return
  }
  this.emit('kick', player);
  var userInfo = player.userInfo;
  this.leaveBoard(uid, true, function (err, uids) {
    if (err) {
      utils.invokeCallback(cb, null, { ec : Code.FAIL});
    } else if (uids && !uids.ec) {
      messageService.pushMessageToPlayer(uids, 'district.districtHandler.leaveBoard', {
        uid: uids.uid, msg: Code.ON_GAME.FA_KICK
      });
      self.pushLeaveBoard(uids.uid, {
        uid: uids.uid,
        msg: utils.getMessage(Code.ON_GAME.FA_KICK_WITH_NAME, [userInfo.fullname || userInfo.username])
      });
      utils.invokeCallback(cb, null, {});
    }
  });
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
  var ownerPlayer = this.players.getPlayer(this.owner);
  if (!ownerPlayer.checkItems(ItemDao.CONFIG.EFFECT_LIST.CAM_CHAT)) {
    utils.invokeCallback(cb, null, utils.getError(Code.ON_GAME.FA_OWNER_NOT_HAS_CAM_CHAT));
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
 * @param {Number} type
 * @param {Number} size
 * @param {Object} extraData
 * @method genMenu
 * @returns {*}
 */
pro.genMenu = function (menuId, extraData, type, size) {
  extraData = typeof extraData == 'object' ? extraData : {};
  return utils.merge_options({
      id: menuId,
      msg: utils.getMenuLanguage(menuId),
      type: type || consts.BUTTON_TYPE.SUGGEST,
      size: size || 0.25
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
  var self = this, extra;
  if (!finish) {
    this.pushMessage('onFinishGame', msg);
  }
  else {
    for (var i = 0, len = this.players.playerSeat.length; i < len; i++) {
      var playerUid = this.players.playerSeat[i];
      if (!this.players.getPlayer(playerUid)) {
        continue
      }
      if (this.gameType == consts.GAME_TYPE.TOURNAMENT && this.numMatchPlay >= this.matchTurn) {
        extra = utils.merge_options(extraData[playerUid], {menu: [self.genMenu(consts.ACTION.LEAVE_BOARD)]});
        this.pushMessageToPlayer(playerUid, 'onFinishGame', utils.merge_options(msg, extra));
      }
      else {
        if (playerUid === this.owner) {
          extra = utils.merge_options(extraData[playerUid], {menu: [self.genMenu(consts.ACTION.CONTINUE)]});
          this.pushMessageToPlayer(playerUid, 'onFinishGame',
            utils.merge_options(msg, extra)
          );
        } else {
          extra = utils.merge_options(extraData[playerUid], {
            menu: [self.genMenu(consts.ACTION.READY, {
              msg: utils.getMenuLanguage(consts.ACTION.CONTINUE),
              timeout: (10000 + this.winLayer * consts.TIME.LAYER_TIME)
            }, consts.BUTTON_TYPE.SUGGEST)]
          });
          this.pushMessageToPlayer(playerUid, 'onFinishGame',
            utils.merge_options(msg, extra)
          );
        }
      }
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

pro.checkCloseWhenFinishGame = function checkCloseWhenFinishGame() {
  if ((this.gameType === consts.GAME_TYPE.TOURNAMENT && this.numMatchPlay >= this.matchTurn)|| this.isMaintenance) {
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
      })
    }
    setTimeout(function () {
      pomelo.app.game.boardManager.remove({tableId: this.tableId});
    }.bind(this), 20000);
  }
};

pro.resetDefault = function () {
  this.bet = this.betDefault;
  this.minPlayer = this.minPlayerDefault;
  this.maxPlayer = this.maxplayerDefault;
  this.emit('setBoard', {max_player: this.maxPlayer, bet: this.bet})
};

/**
 * * abtract
 *
 * Tính số tiền người chơi mất khi rời game trong quá trình chơi
 *
 * @param uid
 * @returns {number}
 */
pro.getPunishMoney = function (uid) {
  return 0
};

pro.reset = function () {
  console.log('boardBase reset')
};

pro.finishGame = function () {
  this.status = consts.BOARD_STATUS.NOT_STARTED;
  this.players.reset();
  this.timer.stop();
  this.game.timeId = null;
  this.game.close();
  this.game = null;
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
      if (!this.maxBuyIn){
        player.addGold(items[i].gold, null, items[i].msg || 'Nhận tiền từ ngoài vào')
      }
    }
  }
  player.addItems(item);
  return player.goldAfter
};

/**
 * Tính thời gian delay lúc chia bài đầu game
 *
 * @param numPlayer
 * @param numCard
 * @returns {number}
 */
pro.calculatorSleepTime = function (numPlayer, numCard) {
  if (numCard <= 3) {
    return 200 * ( numPlayer * numCard + 1)
  } else {
    return 100 * ( numPlayer * numCard + 1)
  }
};


pro.calActionSleepTime = function (sleepType) {
  if (sleepType === consts.SLEEP_TYPE.CARD) {
    return 200
  } else if (sleepType === consts.SLEEP_TYPE.MONEY) {
    return 1000
  } else {
    return 100
  }
};

pro.pushResultLog = function (log) {
  if (this.resultLog.length > 100){
    this.resultLog.splice(0, this.resultLog.length - 50);
  }
  this.resultLog.push(log)
};

pro.getResultLog = function () {
  return lodash.takeRight(this.resultLog, 5);
};

pro.transaction = function (uids, transactionId, cb) {
  var self = this;
  var opts = [];
  var limitConfig = dataApi.limitConfig.findById(this.gameId);
  for(var i = 0, len = uids.length; i < len ; i ++){
    var player = this.players.getPlayer(uids[i]);
    if (!player) continue;
    opts.push({
      type: consts.CHANGE_GOLD_TYPE.ADD_BOARD,
      uid: uids[i],
      gold: limitConfig.max ? this.bet * limitConfig.max : player.gold,
      force: true,
      temp : true,
      gameType: this.gameType,
      bet : this.bet,
      tableId : this.tableId,
      gameId : this.gameId,
      tourId : this.tourId
    })
  }
  this.players.paymentRemote(BoardConsts.PAYMENT_METHOD.SUB_GOLD, opts, transactionId, function (err, results) {
    if (err){
      logger.error('err : ', err);
    }else{
      for(i= 0, len = results.length; i < len ; i ++ ){
        var res = results[i];
        if (res.ec){
          continue
        }
        var uid = res.uid;
        var player = self.players.getPlayer(uid);
        if (player){
          player.goldInGame = res.subGold;
          player.goldAfter = res.gold + res.subGold;
          if (self.autoStart){
            player.gold = res.subGold
          }
        }
      }
    }
    utils.invokeCallback(cb, err, res);
  })
};