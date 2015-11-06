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
  this.totalTime  = opts.totalTime;
  this.totalTimeDefault = opts.totalTime;
  this.timeTurnStart = Date.now();
  this.numDelay = 2;
  this.timeDelay = 0; // nước đi xin hoãn;
  this.timeDraw = 0; // nước đi xin hoà
  this.requestDraw  = false;
  this.requestDelay = false;
};

util.inherits(Player, PlayerBase);

Player.prototype.getState = function (uid) {
  var result = Player.super_.prototype.getState.apply(this, [uid]);
  return result
};

Player.prototype.xinThua = function (numMove) {
  this.requestDelay = true;
  this.timeDelay = numMove;
  this.numDelay -= 1;
};

Player.prototype.xinHoa = function (numMove) {
  this.requestDraw = true;
  this.timeDraw  = numMove
};

Player.prototype.move = function () {
  this.totalTime -= Math.floor((Date.now() - this.timeTurnStart));
};

Player.prototype.reset = function () {
  Player.super_.prototype.reset.call(this);
  this.totalTime = this.totalTimeDefault;
  this.numDelay = 2;
  this.timeDelay = 0; // nước đi xin hoãn;
  this.timeDraw = 0; // nước đi xin hoãn;
};

Player.prototype.genStartMenu = function (guest) {
  Player.super_.prototype.genMenu.call(this);
  if (!guest){
    this.menu.push(this.table.genMenu(consts.ACTION.SURRENDER));
  }
};



module.exports = Player;