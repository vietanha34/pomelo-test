/**
 * Created by laanhdo on 11/25/14.
 */

var boardUtil = require('../base/logic/utils');
var consts = require('../../../consts/consts');
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


function Table(opts) {
  Table.super_.call(this, opts, null, Player);
}

function Game(table) {
  this.bet = table.bet;
  this.board = [];
  this.turn = '';
  this.table = table;
  this.matchId = uuid.v4();
  this.playerPlaying = [];
  this.game = new Rule(false, 'default');
}

util.inherits(Table, BoardBase);

Table.prototype.startGame = function (uid, cb) {

};

Table.prototype.getStatus = function () {

};


module.exports = Table;
