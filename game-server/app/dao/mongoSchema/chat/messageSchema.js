/**
 * Created by vietanha34 on 12/5/14.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var lodash = require('lodash');

var MessageSchema = new Schema({
  roomId : { type : String, default : ''},
  target : { type : Number, default : ''},
  from : { type : Number , default : ''},
  type : { type : Number, default : 1 },
  channel: { type : String, default : ''},
  content : { type : String, default: ''},
  date : { type : Date, default : Date.now()},
  status : { type : Number , default : 0},
  targetType : { type : Number, default : 2},
  read : { type : Array , default : []}
});

MessageSchema.methods = {
  getInfo : function () {
    return {
      msgId : this._id,
      type : this.type,
      from : this.from,
      status : this.status,
      content : this.content,
      targetType : this.targetType,
      target : this.target,
      date : Math.round(this.date.getTime() / 1000)
    }
  }
};

module.exports = mongoose.model('message', MessageSchema);