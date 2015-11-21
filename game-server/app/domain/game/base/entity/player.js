var Code = require('../../../../consts/code');
var lodash = require('lodash');
var utils = require('../../../../util/utils');
var logger = require('pomelo-logger').getLogger('game', __filename, process.pid);
var pomelo = require('pomelo');
var consts = require('../../../../consts/consts');
var BoardConsts = require('../logic/consts');
var util = require('util');

/**
 * Lớp player base lưu thông tin về người chơi
 *
 * @module GameBase
 * @class PlayerBase
 * @param {Object} opts đối tượng thông tin ngừoi chơi
 * @constructor
 */

/**p
 * @property {Object} userInfo Lưu trữ dữ liệu người chơi
 * @property {Number} gold Tiền của người chơi
 * @property {String} uid định danh của người chơi
 * @property {Boolean} ready tình trạng người choi,
 * @property {Object} table đối tượng table {{#crossLink "BoardBase"}}{{/crossLink}}
 * @property {Object} player đối tượng ref Players {{#crossLink "PlayerPoolBase"}}{{/crossLink}}
 * @property {Boolean} owner xác định người chơi là chủ bàn hay không
 * @property {Boolean} guest guest
 */
var Player = function (opts) {
  this.userInfo = opts.userInfo || {};
  this.userInfo.sex = parseInt(this.userInfo.sex);
  this.goldAfter = 0; // Số tiền sau của người dùng
  this.uid = opts.userInfo.uid;
  this.status = consts.PLAYER_STATUS.NOT_PLAY;
  this.ready = false; // sẵn sàng
  this.table = opts.table; //Circular reference to allow reference back to parent object.
  this.players = opts.players; //Circular reference to allow reference back to parent object.
  this.goldInGame = -1;
  this.gold = parseInt(opts.userInfo.gold);
  this.tax = isNaN(parseInt(opts.userInfo.tax))
    ? 5
    : parseInt(opts.userInfo.tax);
  this.userInfo.avatar = utils.JSONParse(this.userInfo.avatar, { id : 0, version : 0});
  this.owner = opts.owner || false; // chủ bàn chơi
  this.guest = opts.guest || false; // ngồi xem
  this.timeAction = Date.now();
  this.deltaMoney = 0;
  this.totalTax = 0;
  this.menu = [];
  this.moneyLogs = [];
  this.sitInTime = null; // Thời gian cần thiết để ngồi xuống
  this.isStandUp = false;
};

/**
 * Lấy thông tin để push cho người chơi
 *
 * @method getUids
 * @returns {{uid: *, sid: (Session.frontendId|*|.userInfo.frontendId)}}
 */
Player.prototype.getUids = function () {
  return {uid: this.uid, sid: this.userInfo.frontendId}
};

Player.prototype.genMenu = function () {
  this.menu.splice(0, this.menu.length);
  if(this.guest){
    this.pushMenu(this.table.genMenu(consts.ACTION.TAN_GAU));
  }else {
    if (this.uid === this.table.owner){
      this.pushMenu(this.table.genMenu(consts.ACTION.START_GAME));
    }else {
      this.pushMenu(this.table.genMenu(consts.ACTION.READY));
    }
    this.pushMenu(this.table.genMenu(consts.ACTION.CHAT));
    this.pushMenu(this.table.genMenu(consts.ACTION.EMO));
    this.pushMenu(this.table.genMenu(consts.ACTION.STAND_UP));
  }
};

Player.prototype.genStartMenu = function () {
  this.genMenu();
  if (!this.guest){
    this.removeMenu(consts.ACTION.STAND_UP);
  }
};

/**
 * Cập nhật thông tin người chơi
 *
 * @method updateUserInfo
 * @param userInfo
 */
Player.prototype.updateUserInfo = function (userInfo) {
  this.userInfo = userInfo;
  this.userInfo.avatar = utils.JSONParse(this.userInfo.avatar, { id : 0, version : 0});
};

/**
 * set Người chơi là chủ bàn
 *
 * @method setOwner
 */
Player.prototype.setOwner = function () {
  this.genMenu();
  this.owner = true;
};

/**
 * Xoá người chơi là chủ bản
 *
 * @method clearOwner
 */
Player.prototype.clearOwner = function () {
  this.owner = false;
};

/**
 * Lấy về thông tin trạng thái của người chơi trong bàn chơi
 *
 * @method getState
 * @returns {{username: *, uid: *, level: *, money: *, status: *, avartarid: (*|number)}}
 */
Player.prototype.getState = function (uid) {
  console.log('totalTime : ', this.totalTime);
  return {
    fullname : this.userInfo.fullname,
    uid : this.uid,
    level : this.userInfo.level,
    elo : this.userInfo.elo,
    gold : this.gold,
    color : this.color,
    totalTime : this.totalTime,
    status : this.status,
    avatar : this.userInfo.avatar,
    sex : parseInt(this.userInfo.sex)
  }
};

/**
 * Trừ tiền người chơi
 *
 * @param {Number} gold số tiền cần trừ của người chơi
 * @method subGold
 * @param msg
 * @returns {*}
 */
Player.prototype.subGold = function (gold, msg) {
  if  (!lodash.isNumber(gold)) return 0;
  if (this.goldInGame >= gold) {
    this.goldInGame -= gold;
    this.deltaMoney -= gold;
    this.goldAfter -= gold;
    this.gold -= gold;
  }else {
    gold = this.goldInGame;
    this.goldAfter -= gold;
    this.deltaMoney -= gold;
    this.goldInGame -= gold;
    this.gold -= gold;
  }
  this.moneyLogs.push(util.format(msg || 'Thua %s gold', -gold));
  return gold
};

/**
 * Thêm tiền cho người chơi
 *
 * @param gold
 * @param tax
 * @param msg
 * @method addGold
 */
Player.prototype.addGold = function (gold, tax, msg) {
  var taxMoney = 0;
  if (!lodash.isNumber(gold)) return 0;
  if (tax) {
    taxMoney = Math.floor(gold * this.tax / 100);
    gold = gold - taxMoney;
  }
  this.goldInGame += gold;
  this.gold += gold;
  this.goldAfter += gold;
  this.deltaMoney += gold;
  this.totalTax += taxMoney;
  this.moneyLogs.push(util.format(msg || 'Thắng %s gold', gold) + ' , phế ' + taxMoney + ' gold');
  return gold;
};

/**
 * Close người chơi
 *
 * @method close
 */
Player.prototype.close = function () {
  this.table = null;
  this.players = null;
  this.userInfo = null;
};

/**
 * Reset trạng thái người chơi về ban đầu
 *
 * @method reset
 */
Player.prototype.reset = function () {
  this.ready = false;
  this.deltaMoney = 0;
  this.totalTax = 0;
  this.moneyLogs.splice(0,this.moneyLogs.length);
  this.status = consts.PLAYER_STATUS.NOT_PLAY;
  this.menu.splice(0, this.menu.length);
  this.genMenu(this.guest);
};


/**
 * Kiểm tra người chơi có menu không
 *
 * @param {Number} id định danh của menu cần kiểm tra
 * @returns {boolean}
 */
Player.prototype.hasMenu = function (id) {
  var has = false;
  if (!this.menu) {
    return false;
  }
  for (var i = 0, len = this.menu.length; i < len; i++) {
    var menu = this.menu[i];
    if (menu.id === id ) {
      has = true;
      break;
    }
  }
  return has
};

Player.prototype.removeMenu = function (id) {
  for (var i = 0, len = this.menu.length; i < len; i++) {
    var menu = this.menu[i];
    if (menu && menu.id === id ) {
      this.menu.splice(i, 1);
      break;
    }
  }
  console.log('remove Menu : ', id, menu);
};

Player.prototype.pushMenu = function (menu) {
  var indexMenu = lodash.findIndex(this.menu, 'id', menu.id);
  console.log('this.menu : ', this.menu, indexMenu, menu);
  if(indexMenu > -1){
    this.menu[indexMenu] = menu;
  }else {
    this.menu.push(menu);
  }
};

Player.prototype.Ready = function () {
  this.ready = true;
  this.removeMenu(consts.ACTION.READY);
};

Player.prototype.addItems = function (items) {
  // TODO handle cam kick, cam chat
};

Player.prototype.startGame = function () {
  this.removeMenu(consts.ACTION.START_GAME);
  this.removeMenu(consts.ACTION.READY);
};

Player.prototype.unReady = function () {
  this.ready = false;
  this.pushMenu(this.table.genMenu(consts.ACTION.READY))
};

module.exports = Player;