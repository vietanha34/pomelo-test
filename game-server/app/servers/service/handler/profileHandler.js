/**
 * Created by KienDT on 12/02/14.
 */

var Promise = require('bluebird');
var UserDao = require('../../../dao/userDao');
var utils = require('../../../util/utils');
var consts  = require('../../../consts/consts');
var Code = require('../../../consts/code');
var moment = require('moment');
var Encrypt = require('../../../util/encrypt');
var lodash = require('lodash');

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

Handler.prototype.getProfile = function (msg, session, next) {
  var uid = msg.uid  || session.uid;
  UserDao.getUserProperties(uid, ['updatedAt','id','gold','email','phone','birthday', 'sex','win', 'lose', 'bestHand', 'avatar', 'username','fullname','goldInGame'], function (err, res) {
    if (err){
      next(null, { ec : Code.FAIL, msg : Code.FAIL});
    }else {
      res.uid = res.id.toString();
      res.updatedAt = moment(res.updatedAt).format('DD/MM/YYYY');
      res.birthday = moment(res.birthday).format('DD/MM/YYYY');
      res.gold = res.gold + res.goldInGame;
      res.bestHand = utils.parseBestHand(res.bestHand);
      res.avatar = utils.JSONParse(res.avatar, { id : 0, version : 0});
      next(null, res)
    }
  });
};

Handler.prototype.updateProfile = function (msg, session, next) {
  var uid = session.uid;
  if (msg.birthday) {
    msg.birthday = moment(msg.birthday, 'DD/MM/YYYY', true);
    if (!msg.birthday.isValid())
      return next(null, { ec : 500, msg : 'Sai ngày tháng năm sinh'});
    msg.birthday.toDate();
  }

  if (msg.avatar) {
    msg.avatar = JSON.stringify(msg.avatar)
  }
  if (msg.password){
    var msgReponse = "Thay đổi mật khẩu thành công"
  }

  UserDao.updateProperties(uid, msg, function(e, result) {
    if (e)
      next(e.stack || e, {ec: 500, msg : e.msg || 'Không thể cập nhật thông tin. Xin vui lòng thử lại'});
    else
      next(null, {msg : msgReponse});
  });
};
