/**
 * Created by Kiendt on 12/5/14.
 */


var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TopSchema = new Schema({
  uid: { type : Number, default : 0},
  username : { type : String, default : ''},
  fullname : { type : String, default : ''},
  dtId: { type : Number, default : 1},
  platform: { type : Number, default : 1},
  gold: { type : Number, default : 0},
  vipPoint: { type : Number, default : 0},
  exp: { type : Number, default : 0},
  tuong: { type : Number, default : 0},
  up: { type : Number, default : 0},
  the: { type : Number, default : 0},
  vay: { type : Number, default : 0},
  caro: { type : Number, default : 0},
  vua: { type : Number, default : 0},
  updatedAt: { type: Date, default: Date.now, expires: '30d' }
}, { versionKey: false, id: false, _id: false, collection: 'Top'});

TopSchema.index({ uid: 1 });
TopSchema.index({ username: 1 });
TopSchema.index({ gold: -1 });
TopSchema.index({ tuong: -1 });
TopSchema.index({ up: -1 });
TopSchema.index({ the: -1 });
TopSchema.index({ vay: -1 });
TopSchema.index({ caro: -1 });
TopSchema.index({ vua: -1 });

module.exports = mongoose.model('Top', TopSchema );