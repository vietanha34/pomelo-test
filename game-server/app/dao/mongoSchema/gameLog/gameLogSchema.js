/**
 * Created by vietanha34 on 12/4/15.
 */


var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var lodash = require('lodash');

var gameLogSchema = new Schema({
  matchId: {type: String, default: "", unique: true},
  info: {
    index: {type: Number, default: 0},
    gameId: {type: Number, default: 0},
    hallId: {type: Number, default: 0},
    roomId: {type: Number, default: 0},
    turnTime: {type: Number, default: 0},
    totalTime: {type: Number, default: 0},
    bet: {type: Number, default: 0},
    owner : { type : Number, default: 0}
  },
  players: [Number],
  status: {
    type: Schema.Types.Mixed, default: {}
  },
  result: {
    type : {type: Number, default: 0},
    winner : { type : Number},
    looser : { type : Number}
  },
  timeStart: {type: Date, default: Date.now},
  logs: {type: String, default: ''},
  stringLogs : {type : String, default : ''}
});

module.exports = mongoose.model('GameLog', gameLogSchema);