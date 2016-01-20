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
  this.timeDraw = 0; // nước đi xin hoà
  this.numDraw = 3;
  this.requestDraw = false;
  this.disableDraw = false;
};

util.inherits(Player, PlayerBase);

Player.prototype.getState = function (uid) {
  var result = Player.super_.prototype.getState.apply(this, [uid]);
  return result
};

Player.prototype.xinHoa = function (numMove) {
  this.requestDraw = true;
  this.timeDraw  = numMove;
  this.numDraw -= 1;
  this.pushMenu(this.table.genMenu(consts.ACTION.DRAW, { disable : 1 , count : this.numDraw}));
  this.disableDraw = true;
};

Player.prototype.move = function (numMove) {
  Player.super_.prototype.move.call(this);
  this.totalTime -= Math.floor((Date.now() - this.timeTurnStart));
  if (this.disableDraw && numMove - this.timeDraw >= 10 && this.numDraw > 0){
    this.disableDraw = false;
    this.pushMenu(this.table.genMenu(consts.ACTION.DRAW, { count : this.numDraw}));
    return true
  }
};

Player.prototype.reset = function () {
  console.log('player caro reset');
  Player.super_.prototype.reset.call(this);
  this.totalTime = this.totalTimeDefault;
  this.timeDraw = 0; // nước đi xin hoãn;
  this.numDraw = 3;
};

Player.prototype.genStartMenu = function () {
  Player.super_.prototype.genStartMenu.call(this);
  if (!this.guest){
    this.pushMenu(this.table.genMenu(consts.ACTION.DRAW, { count : this.numDraw}));
    this.pushMenu(this.table.genMenu(consts.ACTION.SURRENDER));
  }
};

module.exports = Player;