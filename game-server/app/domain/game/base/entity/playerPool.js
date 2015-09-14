/**
 * Created by vietanha34 on 7/4/14.
 */
var lodash = require('lodash');
var utils = require('../../../../util/utils');
var util = require('util');
var Player = require('./player');
var logger = require('pomelo-logger').getLogger('game',__filename, process.pid);
var Code = require('../../../../consts/code');
var pomelo = require('pomelo');
var async = require('async');
var BoardUtils = require('../logic/utils');
var BoardConsts = require('../logic/consts');
var consts = require('../../../../consts/consts');
var itemDao = require('../../../../dao/itemDao');
var missionDao = require('../../../../dao/missionDao');
var userDao = require('../../../../dao/userDao');
var callbackTimeout = require('cb');

/**
 * Quản lý người chơi trong bàn chơi game chắn, bao gồm các thuộc tính sau :
 *
 * @class PlayerPoolBase
 * @module GameBase
 * @param {object} opts
 * @constructor
 */
var PlayerPool = function (opts) {
  opts = opts || {};
  this.numSlot = opts.numSlot || 4;
  this.playerSeat = new Array(this.numSlot);
  this.table = opts.table;  // circular, yêu cầu giải phóng khi đóng kết nối
  this.length = 0;
  this.maxPlayer = opts.maxPlayer;
  this.players = {};
  this.Player = typeof opts.Player === 'function' ? opts.Player : Player;
  this.guestIds = []; // mảng uid của người xem;
  this.orderUid = [];
  this.slot = [];
  var slotMark = BoardUtils.getSlotMark(this.numSlot);
  for (var i = 0, len = slotMark.length; i < len; i++) {
    var slot = slotMark[i];
    this.slot.push({
      slotId: slot,
      available: BoardConsts.SLOT_STATUS.AVAILABLE
    })
  }
};

var pro = PlayerPool.prototype;

/**
 * Reset toàn bộ người chơi về trạng thái ban đầu khi chưa bắt đầu ván;
 *
 * @method reset
 */
pro.reset = function () {
  var i, len, player,opts = [];
  for(i = 0, len = this.table.game.playerPlaying.length; i < len ; i++){
    player = this.table.game.playerPlaying[i];
    opts.push({
      uid : player.uid,
      type : consts.CHANGE_GOLD_TYPE.PLAY_GAME,
      gold : player.goldInGame,
      force : true,
      gameType: this.table.gameType,
      bet : this.table.bet,
      tableId : this.table.tableId,
      gameId : this.table.gameId,
      tourId : this.table.tourId,
      leaveBoard : true
    });
    player.goldInGame = -1;
    player.reset();
  }
  console.log('this.table.game.matchId : ', this.table.game.matchId);
  this.paymentRemote(BoardConsts.PAYMENT_METHOD.ADD_GOLD, opts, this.table.game.matchId, function (err, res) {
    if (err) {
      logger.error("message : %s , stack : %s , err : %s ", err.message, err.stack, err);
    }
  });
  this.table.reset();
  this.getMoneyLength();
};

pro.getFirstPlayer = function () {
  var uid = '';
  for (var i = 0, len = this.playerSeat.length; i < len; i++) {
    if (this.playerSeat[i]) {
      return this.playerSeat[i]
    }
  }
  return uid;
};

/**
 * Thêm mới người chơi vào bàn
 *
 * @method addPlayer
 * @param opts
 * @param {Function} cb
 */
pro.addPlayer = function (opts, cb) {
  var userInfo = opts.userInfo;
  var slotId = opts.slotId;
  var uid = userInfo.uid;
  var player;
  var self = opts.context;
  var result;
  var maxBuyIn = self.table.maxBuyIn;
  if (self.players[uid]) {
    player = self.players[uid];
    player.updateUserInfo(userInfo);
    self.table.emit('updateInfo', userInfo);
    self.checkMissionAward(uid ,function checkMissionAwardCallback(err, award) {
      player.award = award ? award.isAward ? 1 : 0 : 0;
      player.awardMsg = award ? award.msg ? award.msg : '' : '';
      utils.invokeCallback(cb, null, {ec: Code.OK});
    });
    return;
  }
  async.waterfall([
    function (done) {
      var data = {ec : Code.OK};
      var gold = parseInt(userInfo.gold);
      if (maxBuyIn){
        var goldInGame = maxBuyIn > gold ? gold : maxBuyIn;
      }else {
        goldInGame = gold
      }
      if (self.players[uid]) {
        return done()
      }
      player = new self.Player({
        userInfo: userInfo,
        players: self,
        table: self.table
      });
      player.gold = goldInGame;
      player.goldAfter = gold;
      self.players[uid] = player;
      var moneyMin = utils.getMoneyLimit(self.table.gameId, self.table.bet, !self.table.owner);
      if (player.gold < moneyMin || self.length >= self.table.maxPlayer) {
        if (player.gold < moneyMin) {
          player.menu.push(self.table.genMenu(consts.ACTION.CHARGE_MONEY,  { text : "Bạn không đủ tiền để chơi bàn này"}))
        }
        self.guestIds.push(player.uid);
        player.guest = true;
        data.newPlayer = true;
        data.guest = true;
        result = data;
      } else {
        var slotIndex = self.getSlotAvailable(slotId, uid);
        if (slotIndex > -1) {
          // add new player
          var moneyLength = player.gold.toString().length;
          if (self.table.minMoneyLength == 0) {
            self.table.minMoneyLength = moneyLength;
          }
          if (moneyLength < self.table.minMoneyLength) {
            self.table.minMoneyLength = moneyLength;
          } else if (moneyLength > self.table.maxMoneyLength) {
            self.table.maxMoneyLength = moneyLength;
          }
          self.playerSeat[slotIndex] = player.uid;
          self.length = lodash.compact(self.playerSeat).length;
          data.newPlayer = true;
          if (!self.table.owner) {
            self.table.owner = uid;
            data.owner = true;
            player.owner = true;
            if (!self.table.autoStart && self.table.status == consts.BOARD_STATUS.NOT_STARTED) {
              player.menu = [self.table.genMenu(consts.ACTION.START_GAME)]
            }
          } else {
            if (!self.table.autoStart && self.table.status == consts.BOARD_STATUS.NOT_STARTED) {
              player.menu = [self.table.genMenu(consts.ACTION.READY, {timeout: 10000})]
            }
          }
        }
        else {
          self.guestIds.push(player.uid);
          player.guest = true;
          data.guest = true;
        }
        result = data;
      }
      done();
    },
  ], function (err) {
    if (err && !(err instanceof callbackTimeout.TimeoutError)) {
      logger.error("message : %s , stack : %s , err : %s ", err.message, err.stack, err);
      utils.invokeCallback(cb, null, {ec: err.ec});
    } else {
      if ((err instanceof callbackTimeout.TimeoutError)) {
        console.trace("timeout roi : ",err);
      }
      utils.invokeCallback(cb, null, result);
    }
    player = null;
  });
};

/**
 * Lấy về vị trí ngồi thích hợp cho người chơi
 *
 * @param slotId
 * @param uid
 */
pro.getSlotAvailable = function (slotId, uid) {
  var slot = null;
  var slotMark = BoardUtils.getSlotMark(this.numSlot);
  for (var i = 0, len = this.playerSeat.length; i < len; i++) {
    var index = this.playerSeat[i];
    if (lodash.isNumber(slotId) && index === undefined && slotId === slotMark[i]) {
      return i;
    }
    if ((index === undefined && slot === null) || index === uid) {
      slot = i
    }
  }
  return slot
};


pro.getMoneyLength = function () {
  var minMoneyLength = 0;
  var maxMoneyLength = 0;
  for (var i = 0, len = this.playerSeat.length; i < len; i++) {
    var uid = this.playerSeat[i];
    if (!uid) {
      continue
    }
    var player = this.getPlayer(uid);
    if (!player) {
      continue
    }
    var moneyLength = player.gold.toString().length;
    if (minMoneyLength == 0) {
      minMoneyLength = moneyLength
    }

    if (moneyLength < minMoneyLength) {
      minMoneyLength = moneyLength
    } else if (moneyLength > maxMoneyLength) {
      maxMoneyLength = moneyLength
    }
  }
  this.table.minMoneyLength = minMoneyLength;
  this.table.maxMoneyLength = maxMoneyLength;
};

/**
 * Xoá ngừoi chơi khỏi bàn
 *
 * @method removePlayer
 * @param {Object} uid định danh của ngừoi chơi cần xoá
 */
pro.removePlayer = function (uid) {
  var player = this.getPlayer(uid);
  if (player) {
    if (this.availablePlayer) {
      var availablePlayerIndex = this.availablePlayer.indexOf(uid);
      if (availablePlayerIndex > -1) this.availablePlayer.splice(availablePlayerIndex, 1)
    }
    delete this.players[uid];
    var index = -1;
    for (var i = 0, len = this.playerSeat.length; i < len ; i++){
      if (this.playerSeat[i] === uid) {
        this.playerSeat[i] = undefined;
        index = i;
      }
    }
    if (index < 0) {
      if (this.guestIds.indexOf(uid) > -1) {
        this.guestIds.splice(this.guestIds.indexOf(uid), 1)
      }
    }
    if (!player.guest) {
      this.length = lodash.compact(this.playerSeat).length
    }
    if (player.goldInGame >= 0){
      var opts = {
        uid : player.uid,
        gold : player.goldInGame,
        type : consts.CHANGE_GOLD_TYPE.PLAY_GAME,
        force : true,
        message : "Rời bàn khi đang chơi",
        leaveBoard : true
      };
      player.goldInGame = -1;
      this.paymentRemote(BoardConsts.PAYMENT_METHOD.ADD_GOLD, opts);
    }
    this.getMoneyLength();
  }
};

/**
 * Người dùng đứng lên
 *
 * @method standUp
 * @param {Object} uid định danh của người chơi đứng lên
 */
pro.standUp = function (uid) {
  var player = this.getPlayer(uid);
  if (player) {
    if (this.availablePlayer) {
      var availablePlayerIndex = this.availablePlayer.indexOf(uid);
      if (availablePlayerIndex > -1) this.availablePlayer.splice(availablePlayerIndex, 1)
    }
    var index = this.playerSeat.indexOf(uid);
    if (index > -1) {
      for (var i = 0, len = this.playerSeat.length; i < len; i++) {
        if (this.playerSeat[i] === uid) this.playerSeat[i] = undefined;
      }
    }
    if (!player.guest) {
      this.length = lodash.compact(this.playerSeat).length
    }
    if (this.guestIds.indexOf(uid) < 0) {
      this.guestIds.push(uid);
    }
    player.guest = true;
    if (player.goldInGame >= 0){
      var opts = {
        uid : player.uid,
        gold : player.goldInGame,
        type : consts.CHANGE_GOLD_TYPE.PLAY_GAME,
        force : true,
        msg : "Kết thúc ván chơi",
        leaveBoard : true
      };
      player.goldInGame = -1;
      this.paymentRemote(BoardConsts.PAYMENT_METHOD.ADD_GOLD, opts);
    }
    player.reset();
  }
  return {}
};


/**
 * Người chơi ngồi vào bàn chơi
 *
 * @param {String} uid định danh của người chơi
 * @param {Number} slotId vị trí của người chơi cần ngồi
 * @param {Function} cb call tra ve
 */
pro.sitIn = function (uid, slotId, cb) {
  var self = this;
  var player = this.getPlayer(uid);
  var sitInResult;
  async.waterfall([
    function (done) {
      if (self.length >= self.table.maxPlayer) {
        return done({ec: Code.ON_GAME.BOARD_FULL});
      }
      if (slotId) {
        var index = self.checkSlotIdAvailable(slotId, uid);
      } else {
        index = self.getAvailableIndex(uid);
      }
      if (lodash.isNumber(index)) {
        var limitMoney = utils.getMoneyLimit(self.table.gameId, self.table.bet, !self.table.owner);
        if (player.gold < limitMoney) {
          userDao.getUserProperties(player.uid, ['gold'], function (err, res) {
            if (err) {
              done(err)
            }
            else {
              res.gold = parseInt(res.gold);
              var maxBuyIn = self.table.maxBuyIn;
              if (maxBuyIn){
                var goldInGame = maxBuyIn > res.gold ? res.gold : maxBuyIn;
              }else {
                goldInGame = res.gold
              }
              player.gold = goldInGame;
              player.goldAfter = res.gold;
              if (player.gold < limitMoney) {
                done({ec: Code.ON_GAME.FA_NOT_ENOUGH_MONEY_TO_SITIN})
              } else {
                done(null, index);
              }
            }
          })
        }
        else {
          done(null, index);
        }
      }
      else {
        var error = new Error('khong co vi tri phu hop');
        error.ec = Code.ON_GAME.FA_SLOT_EXIST;
        done(error)
      }
    },
    function (index, done) {
      // sitin Player
      var result = {};
      utils.arrayRemove(self.guestIds, uid);
      self.playerSeat[index] = uid;
      player.guest = false;
      player.removeMenu(consts.ACTION.SIT_BACK_IN);
      player.removeMenu(consts.ACTION.CHARGE_MONEY);
      if (!self.table.owner) {
        self.table.owner = uid;
        result.owner = true;
        player.owner = true;
        if (!self.table.autoStart && self.table.status == consts.BOARD_STATUS.NOT_STARTED) {
          player.menu = [self.table.genMenu(consts.ACTION.START_GAME)]
        } else {
          player.menu = [];
        }
      } else {
        if (!self.table.autoStart && self.table.status == consts.BOARD_STATUS.NOT_STARTED) {
          player.menu = [self.table.genMenu(consts.ACTION.READY, {timeout: 10000})]
        } else {
          player.menu = [];
        }
      }
      sitInResult = result;
      self.length = lodash.compact(self.playerSeat).length;
      done();
    }
  ], function (err) {
    if (err) {
      logger.error("message : %s , stack : %s , error : ", err);
      utils.invokeCallback(cb, null, utils.getError(err.ec || Code.FAIL));
    }
    sitInResult = null;
    player = null;
  });
};

/**
 * Hàm cộng trừ tiền khi vào bàn , rời bàn
 *
 * @method paymentRemote
 * @param type : add, sub, sync
 * @param opts
 * @param transactionId
 * @param cb
 */
pro.paymentRemote = function (type, opts,transactionId, cb) {
  var method = '';
  switch (type) {
    case 1 :
      method = 'subBalance';
      break;
    case 2 :
      method = 'addBalance';
      break;
    case 3:
      method = 'syncBalance';
      break;
    default :
      method = 'subBalance'
  }
  var data;
  if (lodash.isArray(opts)) {
    data = opts;
  } else {
    //var gold = typeof opts.gold == 'number' ? opts.gold : this.table.maxBuyIn ? this.table.maxBuyIn : undefined;
    data = {
      uid: opts.uid,
      temp: true,
      gold: opts.gold,
      force: true,
      type: opts.type,
      time : Date.now(),
      message: opts.message,
      gameType: this.table.gameType,
      bet : this.table.bet,
      tableId : this.table.tableId,
      gameId : this.table.gameId,
      leaveBoard : opts.leaveBoard,
      tourId : opts.tourId
    };
  }
  pomelo.app.rpc.manager.paymentRemote[method](null, data, transactionId, cb);
};

/**
 * Lấy số lượng khách trong bàn
 *
 * @methogetNumtNumGuest
 * @returns {Number}
 */
pro.getNumGuest = function () {
  return this.guestIds.length;
};

/**
 * lấy thông tin slot id tính từ một vị trí cụ thể
 *
 * @param {String} cuid : uid của người chơi làm gốc tính
 * @param {String} uid : uid của ngừoi chơi cần lấy slotId
 * @returns {number} -1 nếu người chơi cần tìm slot không chơi trong bàn,
 */
pro.getSlotId = function (cuid, uid) {
  var cIndex = this.playerSeat.indexOf(cuid);
  var index = this.playerSeat.indexOf(uid);
  if (index < 0) {
    return -1
  }
  var slotMark = BoardUtils.getSlotMark(this.numSlot);
  var seat_mark = this.numSlot == 4 ? BoardConsts.SEAT_SLOT : null;
  if (cIndex > -1) {
    var distance = (this.numSlot - cIndex) - (this.numSlot - index);
    return seat_mark ? seat_mark[0][seat_mark[cIndex].indexOf(index)] : slotMark[distance > 0 ? distance : distance == 0 ? 0 : this.numSlot - (-distance)];
  } else {
    for (var i = 0, len = this.playerSeat.length; i < len; i++) {
      if (this.playerSeat[i] == uid) {
        return seat_mark ? seat_mark[0][i] : slotMark[i];
      }
    }
  }
  return 0;
};

/**
 * Lấy danh sách người có thể bắt đầu
 *
 * @param cycle Chiều kim đồng hồ
 * @returns {Array}
 */
pro.getPlayerPlaying = function (cycle) {
  var playerPlaying = [];
  var i, len, player, index;
  for (i = 0, len = this.availablePlayer.length; i < len; i++) {
    player = this.getPlayer(this.availablePlayer[i]);
    player.status = BoardConsts.PLAYER_STATUS.PLAY;
    player.menu = [];
    playerPlaying.push(player);
  }
  if (this.numSlot === 4) {
    var tmp = [, , , ,];
    for (i = 0, len = playerPlaying.length; i < len; i++) {
      player = playerPlaying[i];
      index = this.playerSeat.indexOf(player.uid);
      tmp[BoardConsts.SLOT_ORDER[index]] = player;
    }
    playerPlaying = lodash.compact(tmp);
  }
  if (cycle) {
    for (i = 0; i < Math.floor(playerPlaying.length / 2); i++) {
      tmp = playerPlaying[i];
      playerPlaying[i] = playerPlaying[playerPlaying.length - i - 1];
      playerPlaying[playerPlaying.length - i - 1] = tmp;
    }
  }
  return playerPlaying
};

/**
 * Lấy trạng thái của toàn bộ người chơi, hàm này có tác dụng sắp xếp người chơi theo thứ tự slotId
 *
 * @param uid
 * @returns {Array} mảng state của người chơi
 */
pro.getPlayerState = function (uid) {
  var playerState = [];
  var slotMark = BoardUtils.getSlotMark(this.numSlot);
  var index = this.playerSeat.indexOf(uid);
  var seat_mark = this.numSlot == 4 ? BoardConsts.SEAT_SLOT : null;
  if (index > -1) {
    var current = index;
    do {
      if (this.playerSeat[current] && this.players[this.playerSeat[current]]) {
        var distance = (this.playerSeat.length - index) - (this.playerSeat.length - current);
        var slotId = seat_mark ? seat_mark[0][seat_mark[index].indexOf(current)] : slotMark[distance > 0 ? distance : distance == 0 ? 0 : this.numSlot - (-distance)];
        var state = this.players[this.playerSeat[current]].getState(uid);
        state.sid = slotId;
        playerState.push(state);
      }
      current++;
      if (current >= this.playerSeat.length) {
        current = 0;
      }
    } while (current !== index)
  } else {
    for (var j = 0, lenj = slotMark.length; j < lenj; j++) {
      var slot = slotMark[j];
      if (this.playerSeat[j] !== undefined && this.getPlayer(this.playerSeat[j]) !== undefined) {
        state = this.players[this.playerSeat[j]].getState(uid);
        state.sid = slot;
        playerState.push(state);
      }
    }
  }
  return playerState;
};

/**
 * Lấy về trạng thái của người chơi
 *
 * @returns {{}}
 */
pro.getStatus = function () {
  var result = {};
  result.typelog = this.table.typelog;
  for (var uid in this.players) {
    result[uid] = {status: this.players[uid].status}
  }
  return result
};

/**
 * lấy về đối tượng người chơi tương ứng với uid
 *
 * @param uid
 * @returns {T|*}  {{#crossLink "PlayerBase"}}{{/crossLink}}
 */
pro.getPlayer = function (uid) {
  return this.players[uid];
};

/**
 * Lấy về trạng thái bàn đầy hay không
 *
 * @method isFull
 * @returns {boolean}
 */
pro.isFull = function () {
  return this.length == this.table.maxPlayer;
};


/**
 * [Important] Xử lý đóng bàn chơi, giải phóng dữ liệu
 *
 * @method close
 * @param cb
 */
pro.close = function (cb) {
  var self = this;
  if (self.table.isMaintenance) {
    var code = Code.ON_GAME.FA_GAME_MAINTENANCE
  }
  else {
    code = Code.ON_GAME.FA_GAME_NOT_START
  }
  var playerUids = Object.keys(this.players);
  var gameType = this.table.gameType;
  var target = gameType === consts.GAME_TYPE.TOURNAMENT ? consts.NOTIFY_TARGET.TOURNAMENT : undefined;
  var tourId = this.table.tourId;
  async.forEach(playerUids, function (uid, done) {
    var player = self.players[uid];
    if (player) {
      self.table.pushMessageToPlayer(player.uid, 'district.districtHandler.leaveBoard',
        {ec: 0, msg: code, target: target, tourId: tourId});
      self.table.emit('leaveBoard', player.userInfo);
      self.table.emit('kick', player);
      self.players[uid] = undefined;
      player.close();
      player = null;
    }
  }, function () {
    self.table = null;
    self.players = null;
    self.playerSeat.splice(0, self.playerSeat.length);
    utils.invokeCallback(cb)
  });
};

/**
 * Lấy về menu của nguời chơi
 *
 * @method getMenu
 * @param uid
 * @returns {*|menu|Array|$ax.menu|Table.game.playerPlaying.menu}
 */
pro.getMenu = function (uid) {
  return this.players[uid] ? this.players[uid].menu : [];
};


pro.getNextAvailablePlayer = function (uid) {
  var currentPosition = this.playerSeat.indexOf(uid);
  var nextUid = null;
  if (currentPosition < 0) {
    return nextUid;
  }
  var nextPosition = currentPosition;
  var num = 0;
  do {
    nextPosition = nextPosition + 1;
    if (nextPosition >= this.playerSeat.length) {
      nextPosition = 0;
    }
    if (this.playerSeat[nextPosition] && this.players[this.playerSeat[nextPosition]]) {
      return this.playerSeat[nextPosition];
    }
    num++;
  } while (nextPosition !== currentPosition && num < this.table.maxPlayer);
  return nextUid
};


/**
 * Lấy số lượng người chơi phù hợp với điều kiện
 *
 * @params {Number} money số tiền người chơi đủ điểu kiện, **default** : this.table.minBuyIn
 * @returns {number}
 */
pro.getNumAvailablePlayer = function (num, solo) {
  var numPlayer = 0;
  var ownerLimitMoney, playerLimitMoney, i, len, player, limitPrev, ownerLimitMoneyPrev;
  if (num < 1) {
    return num
  }
  var limitConfig = this.table.limitConfig;
  var ownerPlayer = this.getPlayer(this.table.owner);
  this.availablePlayer = [];
  if (!num && !this.table.autoStart) {
    // GET orderUid
    var uids = lodash.compact(this.playerSeat);
    this.orderUid = lodash.sortBy(uids, function (uid) {
      return -this.players[uid].gold
    }.bind(this));
    limit = limitConfig.all ? limitConfig.all : (limitConfig['solo'] || 1);
    if (lodash.isArray(limit)) {
      ownerLimitMoney = limit[0] * this.table.bet;
    } else {
      ownerLimitMoney = limit * this.table.bet;
    }
    if (ownerPlayer && ownerPlayer.gold < ownerLimitMoney) {
      var mostUid = this.findMostPlayerWithoutOwner();
      if (!mostUid) {
        return 0
      }
      this.availablePlayer.push(mostUid);
      this.availablePlayer.push(this.table.owner);
      for (i = 0, len = this.playerSeat.length; i < len; i++) {
        player = this.players[this.playerSeat[i]];
        if (player && player.uid !== mostUid && player.uid !== this.table.owner) {
          if (!player.ready) {
            player.isStandUp = true;
            player.standUpMsg = Code.ON_GAME.FA_USER_NOT_READY;
            player.standUpMsgWithUsername = [Code.ON_GAME.FA_USER_NOT_READY_WITH_USERNAME, player.userInfo.fullname];
          } else {
            player.isStandUp = true;
            player.standUpMsg = Code.ON_GAME.FA_OWNER_NOT_ENOUGH_MONEY_TO_PLAY_WITH_USER;
            player.standUpMsgWithUsername = [Code.ON_GAME.FA_OWNER_NOT_ENOUGH_MONEY_TO_PLAY_WITH_USER_WITH_USERNAME, player.userInfo.fullname];
          }
        }
      }
      return 2
    }
    // chon nguoi choi nhieu tien nhat de choi voi chu ban người chơi còn lại bị đuổi người chơi đứng lên
  }
  num = num || this.length;
  if (solo) {
    var limit = limitConfig.all ? limitConfig.all : (limitConfig['solo'] || 1);
  } else {
    limit = limitConfig.all ? limitConfig.all : limitConfig[num];
    limitPrev = limitConfig.all ? limitConfig.all : limitConfig[num + 1]
  }
  if (lodash.isArray(limit)) {
    ownerLimitMoney = limit[0] * this.table.bet;
    playerLimitMoney = limit[1] * this.table.bet;
  } else {
    ownerLimitMoney = limit * this.table.bet;
    playerLimitMoney = limit * this.table.bet;
  }

  if (limitPrev) {
    if (lodash.isArray(limitPrev)) {
      ownerLimitMoneyPrev = limitPrev[0] * this.table.bet;
    } else {
      ownerLimitMoneyPrev = limitPrev * this.table.bet;
    }
  }

  if (this.table.autoStart) {
    for (i = 0, len = this.playerSeat.length; i < len; i++) {
      if (!this.playerSeat[i]) {
        continue
      }
      player = this.players[this.playerSeat[i]];
      if (player.gold >= playerLimitMoney) {
        this.availablePlayer.push(player.uid);
        numPlayer++;
      } else {
        player.isStandUp = true;
        player.standUpMsg = Code.ON_GAME.FA_NOT_ENOUGH_MONEY_TO_CONTINUE;
        player.standUpMsgWithUsername = [Code.ON_GAME.FA_NOT_ENOUGH_MONEY_TO_CONTINUE_WITH_USERNAME, player.userInfo.fullname]
      }
    }
    return numPlayer;
  }

  if (ownerPlayer.gold >= ownerLimitMoney) {
    this.availablePlayer.push(ownerPlayer.uid);
    numPlayer++;
    for (i = 0, len = this.orderUid.length; i < len; i++) {
      player = this.players[this.orderUid[i]];
      if (player && player.uid !== ownerPlayer.uid) {
        if (!player.ready && this.table.owner !== player.uid) {
          player.isStandUp = true;
          player.standUpMsg = Code.ON_GAME.FA_USER_NOT_READY;
          player.standUpMsgWithUsername = [Code.ON_GAME.FA_USER_NOT_READY_WITH_USERNAME, player.userInfo.fullname];          continue
        }
        if (numPlayer == num) {
          if (player.gold < playerLimitMoney) {
            player.isStandUp = true;
            player.standUpMsg = utils.getMessage(Code.ON_GAME.FA_USER_NOT_ENOUGH_MONEY_TO_START, [num + 1]);
            player.standUpMsgWithUsername = utils.getMessage(Code.ON_GAME.FA_USER_NOT_ENOUGH_MONEY_TO_START_WITH_USERNAME, [player.userInfo.fullname, num+1])
          } else if (ownerPlayer.gold < ownerLimitMoneyPrev){
            player.isStandUp = true;
            player.standUpMsg = Code.ON_GAME.FA_OWNER_NOT_ENOUGH_MONEY_TO_PLAY_WITH_USER;
            player.standUpMsgWithUsername = utils.getMessage(Code.ON_GAME.FA_OWNER_NOT_ENOUGH_MONEY_TO_PLAY_WITH_USER_WITH_USERNAME, [player.userInfo.fullname])
          }
          continue
        }
        if (player.gold >= playerLimitMoney) {
          this.availablePlayer.push(player.uid);
          numPlayer++;
        } else {
          player.isStandUp = true;
          player.standUpMsg = utils.getMessage(Code.ON_GAME.FA_USER_NEED_MONEY_TO_START, [playerLimitMoney, num, this.table.bet]);
          player.standUpMsgWithUsername = utils.getMessage(Code.ON_GAME.FA_USER_NOT_ENOUGH_MONEY_TO_START, [num])
        }
      }
      // TODO xet nguoi choi nhieu tien hon duoc choi
    }
  } else {
    numPlayer = 0;
  }
  if (numPlayer < num) {
    if (solo) {
      return numPlayer
    } else if (num === 2) {
      return this.getNumAvailablePlayer(2, true);
    } else {
      num -= 1;
      return this.getNumAvailablePlayer(num);
    }
  } else {
    return numPlayer
  }
};


pro.findMostPlayerWithoutOwner = function () {
  var gold = 0;
  var mostUid = null;
  for (var i = 0, len = this.playerSeat.length; i < len; i++) {
    var uid = this.playerSeat[i];
    if (uid && uid !== this.table.owner) {
      var player = this.getPlayer(uid);
      if (player && player.gold > gold && player.gold > this.table.bet) {
        gold = player.gold;
        mostUid = player.uid;
      }
    }
  }
  return mostUid
};


pro.getNumReadyPlayer = function () {
  var numPlayer = 0;
  for (var i = 0, len = this.playerSeat.length; i < len; i++) {
    var player = this.players[this.playerSeat[i]];
    if (player && ( player.ready || player.owner)) {
      numPlayer++;
    }
  }
};

/**
 * Kiểm tra vị trí ngồi còn trống hay không
 *
 * @param slotId
 * @param uid
 */
pro.checkSlotIdAvailable = function (slotId, uid) {
  var slotMark = BoardUtils.getSlotMark(this.numSlot);
  var slotIndex = slotMark.indexOf(slotId);
  for (var i = 0, len = this.playerSeat.length; i < len; i++) {
    var index = this.playerSeat[i];
    if (index === uid) {
      return index
    }
  }
  if (slotIndex && ( lodash.isUndefined(this.playerSeat[slotIndex]) || this.playerSeat[slotIndex] === uid) ) {
    return slotIndex
  } else {
    return null;
  }
};

/**
 *
 */
pro.getSlotMap = function () {
  this.slot = [];
  if (this.length === 0) {
    return
  }
  var slotMark = BoardUtils.getSlotMark(this.numSlot);
  for (var j = 0, lenj = slotMark.length; j < lenj; j++) {
    var slot = slotMark[j];
    if (this.playerSeat[j] !== undefined && this.players[this.playerSeat[j]] !== undefined) {
      var player = this.getPlayer(this.playerSeat[j]);
      this.slot.push({
        slotId: slot,
        available: BoardConsts.SLOT_STATUS.SITED,
        username: player.userInfo.username || player.userInfo.fullname || '',
        fullname: player.userInfo.fullname || player.userInfo.username,
        uid: player.uid,
        avatar: player.userInfo.avatar,
        gold: player.gold,
        sex: player.userInfo.sex
      });
    } else {
      this.slot.push({
        slotId: slot,
        available: BoardConsts.SLOT_STATUS.AVAILABLE
      })
    }
  }
};

pro.checkAllReady = function () {
  for (var i = 0, len = this.playerSeat.length; i < len; i++) {
    var uid = this.playerSeat[i];
    if (uid && !this.players[uid].ready && this.table.owner !== uid){
      return false
    }
  }
  return true;
};

/**
 *
 * @param m
 * @returns {*}
 */
pro.getPlayerMoreMoney = function (m) {
  var money = m || 0;
  var uid = null;
  for (var i = 0, len = this.playerSeat.length; i < len; i++) {
    var playerUid = this.playerSeat[i];
    var player = this.players[playerUid];
    if (player && player.gold > money) {
      money = player.gold;
      uid = playerUid
    }
  }
  return uid
};

pro.getAvailableIndex = function (uid) {
  var slot = null;
  for (var i = 0, len = this.playerSeat.length; i < len; i++) {
    var index = this.playerSeat[i];
    if ((index === undefined && slot === null) || index === uid) {
      slot = i
    }
  }
  return slot
};

/**
 *
 * Bỏ ready cho toàn bộ người chơi
 * @method unReadyAll
 */
pro.unReadyAll = function () {
  for (var i = 0, len = this.playerSeat.length; i < len; i++) {
    var playerId = this.playerSeat[i];
    if (playerId === undefined) {
      continue
    }
    var player = this.players[playerId];
    if (this.table.owner !== player.uid) {
      player.unReady();
    }
  }
};

pro.checkMissionAward = function checkMissionAward(uid, cb) {
  var gameId = this.table.gameId;
  missionDao.checkMissionAward(uid, gameId, callbackTimeout(function (err, res) {
    if (err && (err instanceof callbackTimeout.TimeoutError)) {
      console.trace('timeout roi : ', err);
      utils.invokeCallback(cb, null, null);
    }else {
      utils.invokeCallback(cb, err, res)
    }
  }).timeout(500).once())
};


module.exports = PlayerPool;
