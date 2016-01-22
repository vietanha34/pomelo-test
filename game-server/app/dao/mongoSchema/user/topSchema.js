/**
 * Created by Kiendt on 12/5/14.
 */


var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var consts = require('../../../consts/consts');

var TopSchema = new Schema({
  uid: { type : Number, default : 0},
  username : { type : String, default : ''},
  fullname : { type : String, default : ''},
  dtId: { type : Number, default : 1},
  platform: { type : Number, default : 1},
  gold: { type : Number, default : 0},
  vipPoint: { type : Number, default : 0},
  tuong: { type : Number, default : consts.DEFAULT_ELO},
  up: { type : Number, default : consts.DEFAULT_ELO},
  the: { type : Number, default : consts.DEFAULT_ELO},
  vay: { type : Number, default : consts.DEFAULT_ELO},
  caro: { type : Number, default : consts.DEFAULT_ELO},
  vua: { type : Number, default : consts.DEFAULT_ELO},
  goldRank: { type : Number, default : consts.DEFAULT_ELO},
  vipPointRank: { type : Number, default : consts.DEFAULT_ELO},
  tuongRank: { type : Number, default : consts.DEFAULT_ELO},
  upRank: { type : Number, default : consts.DEFAULT_ELO},
  theRank: { type : Number, default : consts.DEFAULT_ELO},
  vayRank: { type : Number, default : consts.DEFAULT_ELO},
  caroRank: { type : Number, default : consts.DEFAULT_ELO},
  vuaRank: { type : Number, default : consts.DEFAULT_ELO},
  updatedAt: { type: Date, default: Date.now, expires: '30d' }
}, { versionKey: false, id: false, _id: false, collection: 'Top'});

TopSchema.index({ uid: 1 });
TopSchema.index({ username: 1 });
TopSchema.index({ gold: -1 });
TopSchema.index({ vipPoint: -1 });
TopSchema.index({ tuong: -1 });
TopSchema.index({ up: -1 });
TopSchema.index({ the: -1 });
TopSchema.index({ vay: -1 });
TopSchema.index({ caro: -1 });
TopSchema.index({ vua: -1 });

module.exports = mongoose.model('Top', TopSchema );