/**
 * Created by Kiendt on 12/5/14.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var GameHistorySchema = new Schema({
  matchId: String,
  gameId: Number,
  uids: [Number],
  usernames: [String],
  status: Number, // 3: thắng, 2: hòa, 1: thua
  log: String,
  date: Number,
  bet: Number,
  createdAt: { type: Date, default: Date.now, expires: '60d' }
}, { versionKey: false, collection: 'GameHistory'});

GameHistorySchema.index({ matchId: 1 });
GameHistorySchema.index({ gameId: 1, uids: 1, date: 1 });

module.exports = mongoose.model('GameHistory', GameHistorySchema );