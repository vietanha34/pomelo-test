/**
 * Created by vietanha34 on 1/19/16.
 */



var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var consts = require('../../../consts/consts');

var GuildEventSchema = new Schema({
  guildId: { type : Number, default : 0},
  uid : { type : Number, default : ''},
  fullname : { type : String, default : ''},
  content : { type : String, default : ''},
  type : { type : Number, default : 1},
  time : { type: Date, default: Date.now}
}, { versionKey: false, collection: 'GuildEvent' });

module.exports = mongoose.model('GuildEvent', GuildEventSchema);