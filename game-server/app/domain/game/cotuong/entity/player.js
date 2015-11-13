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
  this.firstMove = false;
  this.totalTime  = opts.totalTime;
  this.totalTimeDefault = opts.totalTime;
  this.timeTurnStart = Date.now();
  this.numDelay = 2;
  this.numDraw = 3;
  this.timeDelay = 0; // nước đi xin hoãn;
  this.timeDraw = 0; // nước đi xin hoà
  this.requestDraw  = false;
  this.requestDelay = false;
  this.disableDelay = false;
  this.disableDraw = false;
};

util.inherits(Player, PlayerBase);

Player.prototype.getState = function (uid) {
  var result = Player.super_.prototype.getState.apply(this, [uid]);
  return result
};

Player.prototype.xinHoan = function (numMove) {
  this.requestDelay = true;
  this.timeDelay = numMove;
  this.numDelay -= 1;
  this.pushMenu(this.table.genMenu(consts.ACTION.DE_LAY, { disable : 1 , count : this.numDelay}));
  this.disableDelay = true;
};

Player.prototype.xinHoa = function (numMove) {
  this.requestDraw = true;
  this.timeDraw  = numMove;
  this.numDraw -= 1;
  this.pushMenu(this.table.genMenu(consts.ACTION.DRAW, { disable : 1 , count : this.numDraw}));
  this.disableDraw = true;
};

Player.prototype.move = function (numMove) {
  this.totalTime -= Math.floor((Date.now() - this.timeTurnStart));
  if (!this.firstMove){
    this.firstMove = true;
    this.pushMenu(this.table.genMenu(consts.ACTION.DE_LAY, { count : this.numDelay}));
    return true
  }else
  if (this.disableDelay && numMove - this.timeDelay >= 20 && this.numDelay > 0){
    this.pushMenu(this.table.genMenu(consts.ACTION.DE_LAY, { count : this.numDelay}));
    return true
  }
  if (this.disableDraw && numMove - this.timeDraw >= 10 && this.numDraw > 0){
    this.pushMenu(this.table.genMenu(consts.ACTION.DRAW, { count : this.numDraw}));
    return true
  }
};

Player.prototype.reset = function () {
  Player.super_.prototype.reset.call(this);
  this.totalTime = this.totalTimeDefault;
  this.numDelay = 2;
  this.numDraw = 3;
  this.timeDelay = 0; // nước đi xin hoãn;
  this.timeDraw = 0; // nước đi xin hoãn;
  this.firstMove = false;
};


Player.prototype.genStartMenu = function () {
  Player.super_.prototype.genStartMenu.call(this);
  if (!this.guest){
    this.pushMenu(this.table.genMenu(consts.ACTION.DE_LAY, {disable : 1, count : this.numDelay}));
    this.pushMenu(this.table.genMenu(consts.ACTION.DRAW, { count : this.numDraw}));
    this.pushMenu(this.table.genMenu(consts.ACTION.SURRENDER));
  }
};



module.exports = Player;