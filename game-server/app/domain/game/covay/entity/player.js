var Code = require('../../../../consts/code');
var lodash = require('lodash');
var utils = require('../../../../util/utils');
var logger = require('pomelo-logger').getLogger('game', __filename, process.pid);
var pomelo = require('pomelo');
var consts = require('../../../../consts/consts');
var PlayerBase = require('../../base/entity/player');
var util = require('util');

/**
 * Lớp player base lưu thông tin về người chơi
 *
 * @module GameBase
 * @class PlayerBase
 * @param {Object} opts đối tượng thông tin ngừoi chơi
 * @constructor
 */

/**
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
  Player.super_.call(this, opts);
  this.color = opts.color;
  this.totalTime  = opts.totalTime || 15 * 60 * 1000;
  this.totalTimeDefault = opts.totalTime || 15 * 60 * 1000;
  this.timeTurnStart = Date.now();
  this.numDelay = 2;
  this.timeDraw = 0; // nước đi xin hoà
  this.requestDraw  = false;
  this.firstMove = false;
  this.autoAction = 0;
  this.numAutoChangeTurn = 0;
};

util.inherits(Player, PlayerBase);

Player.prototype.getState = function (uid) {
  var result = Player.super_.prototype.getState.apply(this, [uid]);
  return result
};


Player.prototype.xinHoa = function (numMove) {
  this.requestDraw = true;
  this.timeDraw  = numMove
};

Player.prototype.move = function () {
  Player.super_.prototype.move.call(this);
  this.totalTime -= Math.floor((Date.now() - this.timeTurnStart));
  if (!this.firstMove) {
    this.firstMove = true;
    var otherPlayer = this.table.players.getPlayer(this.table.players.getOtherPlayer(this.uid));
    otherPlayer.pushMenu(this.table.genMenu(consts.ACTION.CHANGE_TURN));
    this.pushMenu(this.table.genMenu(consts.ACTION.CHANGE_TURN));
    return true
  }
};

Player.prototype.reset = function () {
  Player.super_.prototype.reset.call(this);
  this.totalTime = this.totalTimeDefault;
  this.autoAction = 0;
  this.numDraw = 3;
  this.firstMove = false;
  this.timeDraw = 0; // nước đi xin hoãn;
};

Player.prototype.genStartMenu = function () {
  Player.super_.prototype.genStartMenu.call(this);
  if (!this.guest){
    this.pushMenu(this.table.genMenu(consts.ACTION.CHANGE_TURN,{ disable : 1}));
    this.pushMenu(this.table.genMenu(consts.ACTION.SURRENDER));
  }
};



module.exports = Player;