/**
 * Created by vietanha34 on 12/5/14.
 */


var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var lodash = require('lodash');

var RoomSchema = new Schema({
  roomId : { type : String, default : ''},
  name : { type : String, default : ''},
  members : { type : String, default : ''},
  createdDate : { type : Date, default : Date.now()}
});

module.exports = mongoose.model('room', RoomSchema );