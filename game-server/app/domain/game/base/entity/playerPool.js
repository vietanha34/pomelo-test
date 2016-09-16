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
var userDao = require('../../../../dao/userDao');
var moment = require('moment');
moment.locale('vi');

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
  this.numSlot = opts.numSlot || 2;
  this.playerSeat = new Array(this.numSlot);
  this.table = opts.table;  // circular, yêu cầu giải phóng khi đóng kết nối
  this.length = 0;
  this.maxPlayer = opts.maxPlayer;
  this.players = {};
  this.Player = typeof opts.Player === 'function' ? opts.Player : Player;
  this.guestIds = []; // mảng uid của người xem;
  this.slot = [];
  for (var i = 0, len = this.numSlot.length; i < len; i++) {
    this.slot.push({
      slotId: i,
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
  for(i = 0, len = this.table.game.playerPlayingId.length; i < len ; i++){
    player = this.table.players.getPlayer(this.table.game.playerPlayingId[i]);
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
};



/**
 * Thêm mới người chơi vào bàn
 *
 * @method addPlayer
 * @param opts
 */
pro.addPlayer = function (opts) {
  var userInfo = opts.userInfo;
  var slotId = opts.slotId;
  var uid = userInfo.uid;
  var player;
  var self = this;
  var result;
  if (self.players[uid]) {
    player = self.players[uid];
    player.updateUserInfo(userInfo);
    self.table.emit('updateInfo', userInfo);
    return {ec: Code.OK, exists : true};
  }
  var data = {ec : Code.OK};
  player = new self.Player({
    effect : opts.effect || {},
    userInfo: userInfo,
    players: self,
    totalTime : self.table.totalTime,
    table: self.table
  });
  self.players[uid] = player;
  data.newPlayer = true;
  var slotIndex = self.getSlotAvailable(slotId, userInfo, this.table.timePlay);
  console.log('this.table.guildId :' , this.table.guildId, this.table.tourType);
  if (this.table.guildId && this.table.tourType === consts.TOUR_TYPE.FRIENDLY){
    // valid người chơi thuộc các bang
    if (this.table.guildId.indexOf(player.userInfo.guildId) < 0){
      slotIndex = -1;
      data.notifyMsg = util.format('Bạn không thuộc 2 hội quán tham gia đấu trường này')
    }else {
      slotIndex = this.table.guildId.indexOf(player.userInfo.guildId);
      if (slotIndex > -1 && this.table.players.playerSeat[slotIndex]){
        data.notifyMsg = util.format('Đã có người khác trong hội quán của bạn ứng chiến');
        slotIndex = -1;
      }
    }
  }
  else if(this.table.username) {
    var index = this.table.username.indexOf(player.userInfo.username);
    if (index > -1){
      if (Date.now() < this.table.timePlay){
        data.notifyMsg = util.format('Còn %s nữa sẽ đến giờ thi đấu. Xin vui lòng xem danh sách thi đấu tại loa làng hoặc Tin Admin"', moment(this.table.timePlay).fromNow(true));
      }else if (this.table.numMatchPlay === 0 && !this.table.tableTourFinish){
        data.notifyMsg = util.format('Đối thủ của bạn là "%s", vui lòng đợi người chơi trong %s nữa', index === 0 ? this.table.fullname[1] : this.table.fullname[0], moment(this.table.timePlay + this.table.tourTimeWait).fromNow(true));
      }
    }
    else {
      data.notifyMsg = util.format('Bàn chơi hiện tại đc sắp xếp cho cặp đấu "%s" vs "%s, Trận đấu diễn ra vào : %s"', this.table.fullname[0], this.table.fullname[1], moment(this.table.timePlay).format('HH:mm:ss DD-MM-YYYY'));
    }
    if (this.table.tableTourFinish){
      if (this.table.tourWinUser){
        data.notifyMsg = util.format('Người thắng cuộc trong cặp đấu : "%s" vs "%s" là "%s"', this.table.fullname[0], this.table.fullname[1], this.table.tourWinUser['fullname'])
      }else {
        data.notifyMsg = util.format('Bàn đấu đã kết thúc mà không có người thắng cuộc', this.table.fullname[0], this.table.fullname[1])
      }
    }
  }

  if ((((player.gold < self.table.configBet[0] || (self.table.owner && player.gold < self.table.bet)) && this.table.tourType !== consts.TOUR_TYPE.FRIENDLY) || self.length >= self.table.maxPlayer)
    || (((player.userInfo.level < self.table.level && !player.checkItems(consts.ITEM_EFFECT.THE_DAI_GIA))) && !player.userInfo.vipLevel && self.table.gameType !== consts.GAME_TYPE.TOURNAMENT)
  ) {
    if (slotIndex > -1) {
      if (player.gold < self.table.bet) {
        player.pushMenu(self.table.genMenu(consts.ACTION.CHARGE_MONEY));
        data.notifyMsg = 'Bạn không đủ tiền để chơi bàn chơi này'
      }
      if (player.userInfo.level < self.table.level){
        data.notifyMsg = 'Bạn không đủ cấp độ để chơi bàn chơi này'
      }
    }
    self.guestIds.push(player.uid);
    player.guest = true;
    data.guest = true;
  } else {
    if (slotIndex > -1) {
      // add new player
      self.playerSeat[slotIndex] = player.uid;
      var otherPlayer = self.getPlayer(self.getOtherPlayer(player.uid));
      if(otherPlayer){
        player.color = otherPlayer.color === consts.COLOR.WHITE ? consts.COLOR.BLACK : consts.COLOR.WHITE
      }else {
        player.color = consts.COLOR.WHITE;
      }
      self.length = lodash.compact(self.playerSeat).length;
      if (!self.table.owner) {
        self.table.owner = uid;
        data.owner = true;
        player.owner = true;
      }
    }
    else {
      self.guestIds.push(player.uid);
      player.guest = true;
      data.guest = true;
    }
  }
  console.log('playerSeat : ', self.playerSeat, self.table.guildId, opts);
  result = data;
  player.genMenu();
  return result;
};

/**
 * Lấy về vị trí ngồi thích hợp cho người chơi
 *
 * @param slotId
 * @param userInfo
 */
pro.getSlotAvailable = function (slotId, userInfo) {
  var slot = -1;
  for (var i = 0, len = this.playerSeat.length; i < len; i++) {
    var index = this.playerSeat[i];
    if ((index === undefined && slot === -1) || index === userInfo.uid) {
      slot = i
    }
  }
  if (this.table.username && this.table.username.indexOf(userInfo.username) < 0) return -1;
  if (this.table.guildId && this.table.guildId.indexOf(userInfo.guildId) > -1) return this.table.guildId.indexOf(userInfo.guildId);
  return slot
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
    //if (player.goldInGame >= 0){
    //  var opts = {
    //    uid : player.uid,
    //    gold : player.goldInGame,
    //    type : consts.CHANGE_GOLD_TYPE.PLAY_GAME,
    //    force : true,
    //    message : "Rời bàn khi đang chơi",
    //    leaveBoard : true
    //  };
    //  player.goldInGame = -1;
    //  this.paymentRemote(BoardConsts.PAYMENT_METHOD.ADD_GOLD, opts);
    //}
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
    player.reset();
    player.menu.slice(0, player.menu.length);
  }
  return {}
};


/**
 * Người chơi ngồi vào bàn chơi
 *
 * @param {String} uid định danh của người chơi
 * @param {Number} slotId vị trí của người chơi cần ngồi
 */
pro.sitIn = function (uid, slotId) {
  var self = this;
  var player = this.getPlayer(uid);
  if (self.length >= self.table.maxPlayer) {
    return {ec: Code.ON_GAME.BOARD_FULL}
  }
  if (((player.gold < self.table.configBet[0] && !self.table.owner) || (self.table.owner && player.gold < self.table.bet)) && this.table.tourType !== consts.TOUR_TYPE.FRIENDLY){
    return utils.getError(Code.ON_QUICK_PLAY.FA_NOT_ENOUGH_MONEY)
  }
  if (!player.userInfo.vipLevel){
    if (player.userInfo.level < self.table.level && !player.checkItems(consts.ITEM_EFFECT.THE_DAI_GIA)){
      return { ec: Code.FAIL, msg : 'Bạn không đủ cấp độ để chơi bàn chơi này'}
    }
  }
  if (slotId) {
    var index = self.checkSlotIdAvailable(slotId, uid);
  } else {
    index = self.getAvailableIndex(uid);
  }
  if (this.table.gameType === consts.GAME_TYPE.TOURNAMENT){
    if (this.table.tourType === consts.TOUR_TYPE.FRIENDLY){
      index = this.table.guildId.indexOf(player.userInfo.guildId);
      if (index > -1 && this.playerSeat[index]){
        return { ec: Code.FAIL, msg : 'Vị trí của hội quán bạn đã có người ngồi vào rồi'}
      }
    }else {
      index = this.table.username.indexOf(player.userInfo.username)
    }
  }
  if (index > -1){
    var result = {};
    utils.arrayRemove(self.guestIds, uid);
    self.playerSeat[index] = uid;
    var otherPlayer = self.getPlayer(self.getOtherPlayer(player.uid));
    if(otherPlayer){
      player.color = otherPlayer.color === consts.COLOR.WHITE ? consts.COLOR.BLACK : consts.COLOR.WHITE
    }else {
      player.color = consts.COLOR.WHITE;
    }
    player.guest = false;
    player.genMenu();
    if (!self.table.owner) {
      self.table.owner = uid;
      result.owner = true;
      player.owner = true;
      if (self.table.status == consts.BOARD_STATUS.NOT_STARTED) {
        player.menu = [self.table.genMenu(consts.ACTION.START_GAME)]
      } else {
        player.menu = [];
      }
    } else {
      if (self.table.status == consts.BOARD_STATUS.NOT_STARTED) {
        player.menu = [self.table.genMenu(consts.ACTION.READY)]
      } else {
        player.menu = [];
      }
    }
    self.length = lodash.compact(self.playerSeat).length;
    return {};
  }
  else {
    return utils.getError(Code.ON_GAME.FA_SLOT_EXIST)
  }
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
    case 4:
      method = 'transfer';
      break;
    default :
      method = 'subBalance'
  }
  var data;
  if (lodash.isArray(opts)) {
    data = opts;
  } else {
    opts.time = Date.now();
    data = opts;
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
pro.getSlotId = function (uid) {
  return this.playerSeat.indexOf(uid);
};


/**
 * Lấy trạng thái của toàn bộ người chơi, hàm này có tác dụng sắp xếp người chơi theo thứ tự slotId
 *
 * @param uid
 * @returns {Array} mảng state của người chơi
 */
pro.getPlayerState = function (uid) {
  var playerState = [];
  for (var j = 0, lenj = this.playerSeat.length; j < lenj; j++) {
    if (this.playerSeat[j] !== undefined && this.getPlayer(this.playerSeat[j]) !== undefined) {
      var state = this.players[this.playerSeat[j]].getState(uid);
      state.sid = j;
      playerState.push(state);
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

pro.getPlayerByUsername = function (username) {
  var keys = Object.keys(this.players);
  for (var i = 0, len = keys.length; i < len; i ++){
    var player = this.players[keys[i]];
    if (player.userInfo.username === username)
      return player
  }
};

pro.getPlayerByGuildId = function (guildId) {
  var keys = Object.keys(this.players);
  for (var i = 0, len = keys.length; i < len; i ++){
    var player = this.players[keys[i]];
    if (player.userInfo.guildId === guildId)
      return player
  }
};

/**
 * Lấy về trạng thái bàn đầy hay không
 *
 * @method isFull
 * @returns {boolean}
 */
pro.isFull = function () {
  return this.length >= this.table.maxPlayer;
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
        {ec: 0, msg: code, target: target, tourId: tourId, tourType : self.table.tourType});
      self.table.emit('leaveBoard', player.userInfo);
      self.table.emit('kick', player);
      self.players[uid] = undefined;
      player.close();
      player = null;
    }
    done();
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
  for (var i = 0, len = this.playerSeat.length; i < len; i++) {
    var index = this.playerSeat[i];
    if (index === uid) {
      return index
    }else if (i == slotId && !this.playerSeat[i]){
      return i
    }else if (!this.playerSeat[i]){
      return i
    }
  }
  return -1
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

pro.getOtherPlayer = function (uid) {
  uid = uid ? uid : this.table.owner;
  for (var i = 0, len = this.playerSeat.length; i < len; i++) {
    var otherUid = this.playerSeat[i];
    if (uid !== otherUid){
      return otherUid;
    }
  }
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

pro.readyAll = function () {
  for (var i = 0, len = this.playerSeat.length; i < len; i++) {
    var playerId = this.playerSeat[i];
    if (playerId === undefined) {
      continue
    }
    var player = this.players[playerId];
    if (this.table.owner !== player.uid) {
      player.Ready();
    }
  }
};

pro.checkStartGame = function () {
  if (lodash.compact(this.playerSeat).length < 2) {
    return false;
  }
  for (var i = 0, len = this.playerSeat.length; i< len ; i ++){
    if (this.playerSeat[i] && this.playerSeat[i] !== this.table.owner){
      var player = this.getPlayer(this.playerSeat[i]);
      if ((player.gold >= this.table.bet || this.table.tourType === consts.TOUR_TYPE.FRIENDLY) && player.ready){
        return true
      }else {
        return false
      }
    }
  }
};

pro.changeColor = function (uid, color) {
  var mapColor = {};
  var player = this.getPlayer(uid);
  if(player && player.color !== color){
    player.color = color;
    mapColor[player.uid] = color;
    var otherPlayer = this.getPlayer(this.getOtherPlayer(uid));
    if(otherPlayer){
      otherPlayer.color = color === consts.COLOR.WHITE ? consts.COLOR.BLACK : consts.COLOR.WHITE;
      mapColor[otherPlayer.uid] = otherPlayer.color;
    }
    this.table.score.reverse();
  }
  return mapColor;
};

pro.changePlayerOption = function (opts) {
  var key = Object.keys(opts);
  for (var i = 0, len = this.playerSeat.length; i < len; i++){
    if(!this.playerSeat[i]) continue;
    var player = this.getPlayer(this.playerSeat[i]);
    if(!player) continue;
    for (var j=0, lenj = key.length; j < lenj; j++ ){
      player[key[j]] = opts[key[j]];
    }
  }
};

pro.findPlayerByColor = function (color) {
  for (var i = 0, len = this.playerSeat.length; i < len; i++){
    if(!this.playerSeat[i]) continue;
    var player = this.getPlayer(this.playerSeat[i]);
    if(!player) continue;
    if (player.color === color){
      return player
    }
  }
};

pro.getGuest = function () {
  var guests = this.guestIds.slice(0, 50);
  var result = [];
  for (var i = 0, len = guests.length; i< len; i++){
    var uid = guests[i];
    var player = this.getPlayer(uid);
    if(player){
      result.push({
        fullname : player.userInfo.fullname,
        gold : player.gold,
        elo : player.userInfo.elo || 0,
        avatar : player.userInfo.avatar
      })
    }
  }
  return result
};

module.exports = PlayerPool;
