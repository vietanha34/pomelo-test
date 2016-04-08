/**
 * Created by vietanha34 on 1/28/16.
 */


var async = require('async');
var utils = require('../../../util/utils');
var Code = require('../../../consts/code');
var consts = require('../../../consts/consts');
var TopupDao = require('../../../dao/topupDao');
var Promise = require('bluebird');
var NotifyDao = require('../../../dao/notifyDao');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../../util/redisKeyUtil');
var TourDao = require('../../../dao/tourDao');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

/**
 * Lấy danh sách của tour bao gồm: danh sách tour giao hữu và danh sách tour thường
 *
 * * args :
 *   * tourType : giao hữu or Kỳ vương
 *
 * @param msg
 * @param session
 * @param next
 * @returns {Promise.<T>}
 */
Handler.prototype.getListTour = function (msg, session, next) {
  msg.uid = session.uid;
  return TourDao.getListTour(msg)
    .then(function (tours) {
      return utils.invokeCallback(next, null, { tour : tours, type : msg.type})
    })
    .catch(function (err) {
      console.error(err);
      return utils.invokeCallback(cb, null, { tour : [], type: msg.type});
    })
};

Handler.prototype.getTour = function (msg, session, next) {

};

Handler.prototype.getTourRank = function (msg, session, next) {

};

/**
 * Lấy lịch đấu
 *
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getTourTable = function (msg, session, next) {

};

Handler.prototype.getTourHistory = function (msg, session, next) {

};

/**
 * Lấy thông tin bảng xếp hạng
 *
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.addFund = function (msg, session, next) {

};

Handler.prototype.registerTour = function (msg, session, next) {
  var tourId = msg.tourId;
  var uid = session.uid
};