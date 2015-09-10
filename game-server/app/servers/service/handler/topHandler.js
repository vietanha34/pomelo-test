/**
 * Created by bi on 09/01/2015.
 */


var async = require('async');
var utils = require('../../../util/utils');
var Code = require('../../../consts/code');
var consts = require('../../../consts/consts');
var logger = require('pomelo-logger').getLogger(__filename);
var lodash = require('lodash');
var Promise = require('bluebird');
var userDao = Promise.promisifyAll(require('../../../dao/userDao'));
var moment = require('moment');
var messageService = require('../../../services/messageService');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

Handler.prototype.getTop = function (msg, session, next) {
  var offset = msg.offset || 0;
  var length = msg.length || 20;
  var type = msg.type;
  var mysqlClient = this.app.get('mysqlClient');
  switch (type) {
    case consts.TOP_TYPE.BIGWIN :
      mysqlClient
        .AccUserDetail
        .findAll({
          where : {
            winChip : { $gt : 0}
          },
          attributes : ['winChip'],
          limit : length,
          offset : offset,
          include : [{
            model : this.app.get('mysqlClient').AccUser,
            attributes : ['fullname', 'id']
          }],
          order : 'winChip DESC',
          raw : true
        })
        .then(function (values) {
          var rank = 1;
          var data = [];
          for (var i = 0, len = values.length ; i < len ; i ++) {
            data.push({
              uid : values[i]['AccUser.id'],
              rank : rank,
              fullname : values[i]['AccUser.fullname'] || values[i]['AccUser.username'],
              value : values[i].winChip || 0
            });
            rank ++;
          }
          next(null, { data : data, type : type});
        })
        .catch(function (err) {
          logger.error('error : ', err);
          next(null, { data : [], type : type});
        });
      break;
    case consts.TOP_TYPE.CHANGE:
      mysqlClient
        .LogBuyAward
        .findAll({
          where : {
            status : consts.CHANGING_STATUS.SUCCESS
          },
          attributes : ['username','userId', [mysqlClient.sequelize.fn('SUM', mysqlClient.sequelize.col('chip')), 'chip']],
          limit : length,
          offset : offset,
          order : 'chip DESC',
          include : [{
            model : this.app.get('mysqlClient').AccUser,
            attributes : ['fullname']
          }],
          group : ['username'],
          raw : true
        })
        .then(function (values) {
          var rank = 1;
          for (var i = 0, len = values.length ; i < len ; i ++) {
            values[i].uid = values[i].userId;
            values[i].value = values[i].chip || 0;
            values[i].rank = rank;
            values[i].fullname = values[i]['AccUser.fullname']|| values[i].username;
            rank ++;
          }
          next(null, { data : values, type : type});
        })
        .catch(function (err) {
          logger.error('error : ', err);
          next(null, { data : [], type : type});
        });
      break;
    default :
      next(null, { data : [], type : type});
  }
};

Handler.prototype.getHistory = function(msg, session, next) {
  var arrayName = '';
  var offset = msg.offset || 0;
  var length = msg.length || 20;
  var type = msg.type;
  var uid = session.uid;
  switch (msg.type){
    case consts.HISTORY_TYPE.CHARGE :
      this.app.get('mysqlClient')
        .LogPayTransaction
        .findAll({
          where : {
            uid : session.uid
          },
          attributes : ['id', 'text', 'money', 'type', 'status', 'purchaseDate', 'chip'],
          offset : offset,
          length : length
        })
        .then(function (values) {
          var results = [];
          for ( var i = 0, len = values.length ; i < len ; i ++){
            var value = values[i];
            var momentTime = moment(value.purchaseDate);
            results.push({
              id : value.id,
              card : value.text,
              time : momentTime.format('DD/MM/YYYY') + '\n' + momentTime.format('HH:mm A'),
              type : consts.PAYMENT_CONFIG.TYPE_UNMAP[value.type],
              money : value.chip
            })
          }
          next(null, { type : type, data: results, offset: offset, length : results.length})
        })
        .catch(function (err) {
          next(null, { type : type, data : [], offset : offset, length : 0})
        });
      break;
    case consts.HISTORY_TYPE.CHANGE :
      this.app.get('mysqlClient')
        .LogBuyAward
        .findAll({
          where : { username : session.get('username')},
          offset : offset,
          length : length,
          attributes : ['id', 'cardCode', 'serial', 'status', 'chip', 'status'],
          include : [{
            model : this.app.get('mysqlClient').CmsAward,
            attributes : ['title']
          }],
          raw : true
        })
        .then(function (values) {
          var results = [];
          for ( var i = 0, len = values.length ; i < len ; i ++){
            var value = values[i];
            var momentTime = moment(value.createdAt);
            var detail;
            switch(value.status){
              case consts.CHANGING_STATUS.PENDING:
              case consts.CHANGING_STATUS.APPROVAL:
                detail = [value['CmsAward.title'], 'Chờ xét duyệt'];
                break;
              case consts.CHANGING_STATUS.USER_CANCEL:
                detail = [value['CmsAward.title'], 'Người dùng Huỷ đổi thưởng'];
                break;
              case consts.CHANGING_STATUS.ADMIN_CANCEL:
                detail = [value['CmsAward.title'], 'Admin Huỷ đổi thưởng'];
                break;
              default:
                detail = [value['CmsAward.title'], "Mã thẻ: " + value.cardCode, 'Serial: ' + value.serial];
            }
            results.push({
              id : value.id,
              time : momentTime.format('DD/MM/YYYY') + '\n' + momentTime.format('HH:mm A'),
              detail : detail,
              money : value.chip,
              status : value.status
            })
          }
          next(null, { type : type, data: results, offset: offset, length : results.length})
        })
        .catch(function (err) {
          logger.error('err : ', err);
          next(null, { type : type, data : [], offset : offset, length : 0})
        });
      break;
    case consts.HISTORY_TYPE.PLAY :
    default :
      arrayName = 'playHistory';
      this.app.get('mongoClient')
        .model('transaction')
        .findOne({ uid : uid})
        .select(arrayName)
        .lean(true)
        .exec(function (err, result) {
          if (err || !result){
            next(null, { type : type, data : [], offset : offset, length : 0})
          }else {
            var data = result[arrayName] ? result[arrayName].slice(offset, length) : [];
            next(null, { type : type, data: data, offset: offset, length : data.length})
          }
        })
  }
};

Handler.prototype.getExchange = function (msg, session, next) {
  next(null, { data : this.app.get('gameService').exchange[session.get('dtId') || 1]})
};

Handler.prototype.getChanging = function (msg, session, next) {
  next(null, { data : this.app.get('gameService').award})
};

/**
 * Đổi thưởng
 *
 * @param msg
 * @param session
 * @param next
 * @returns {*}
 */
Handler.prototype.changing = function (msg, session, next) {
  var award = this.app.get('gameService').getAward(msg.awardId);
  var uids = utils.getUids(session);
  var self = this;
  if (!award) {
    return next(null, { msg : 'Không có phần thưởng này'});
  }
  var param = {
    gold : award.prize,
    uid : session.uid,
    type : consts.CHANGE_GOLD_TYPE.CHANGE,
    message : "Đổi thưởng " + award.name
  };
  this.app.get('paymentService').subBalance(param)
    .then(function (res) {
      messageService.pushMessageToPlayer(uids,'onNotify', { gold : res.gold});
      next(null, { msg : "Chúng tôi đã nhận được yêu cầu của bạn, vui lòng kiểm tra hộp thư để biết thông tin mới nhất"});
      var mysqlClient = self.app.get('mysqlClient');
      mysqlClient
        .LogBuyAward
        .create({
          userId : session.uid,
          username : session.get('username'),
          chip : award.prize,
          awardId : msg.awardId,
          status : consts.CHANGING_STATUS.PENDING
        });
      mysqlClient
        .AccUserDetail
        .update({
          buyItem : mysqlClient.sequelize.literal(' buyItem + ' + award.prize)
        },{
          where : { uid : session.uid }
        })
    })
    .catch(function (err) {
      return next(null, { msg : 'Bạn không đủ tiền để đổi phần thưởng này'});
    })
};


/**
 * Huỷ đổi thưởng
 *
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.unChanging = function (msg, session, next) {
  var id = msg.id;
  var uid = session.uid;
  var uids = utils.getUids(session);
  var self = this;
  var logBuy = null;
  this.app.get('mysqlClient')
    .sequelize
    .transaction(function (t) {
      var mysqlClient = self.app.get('mysqlClient');
      var promise = mysqlClient
        .LogBuyAward
        .findOne({
          where : {
            userId : uid,
            id : id,
            status : consts.CHANGING_STATUS.PENDING
          },
          attributes : ['chip'],
          include : [{
            model : mysqlClient.CmsAward,
            attributes : ['prize']
          }],
          raw : true
        }, { transaction : t})
        .then(function (value) {
          if (value){
            logBuy = value;
            return self.app.get('paymentService').addBalance({
              uid : uid,
              gold : value.chip,
              type : consts.CHANGE_GOLD_TYPE.CANCEL_CHANGE,
              message : "Huỷ đổi thưởng với mã đổi thưởng : " + id
            })
          }else {
            // khong duoc phep huy
            next(null, { ec : Code.FAIL, msg : 'Bạn không thể huỷ giao dịch này'});
            return promise.cancel();
          }
        })
        .then(function (result) {
          if (result && result.ec === Code.OK){
            messageService.pushMessageToPlayer(uids, 'onNotify', { gold : result.gold});
            var mysqlClient = self.app.get('mysqlClient');
            return [mysqlClient
              .LogBuyAward
              .update({
                status : consts.CHANGING_STATUS.USER_CANCEL
              }, {
                where : {
                  id : id
                }
              }, { transaction : t}), mysqlClient
              .AccUserDetail
              .update({
                buyItem : mysqlClient.sequelize.literal('buyItem - ' + logBuy['CmsAward.prize'])
              }, {
                where : { uid : session.uid }
              })
            ]
          }else {
            next(null, { ec : Code.FAIL, msg : 'Huỷ đổi thưởng thất bại vui lòng thử lại lần sau'});
            return promise.cancel();
          }
        })
        .cancellable();
      return promise
    })
    .spread(function (data) {
      if (data ){
        next(null, {msg : "Huỷ đổi thưởng thành công"});
      }
    })
    .catch(function (err) {
      logger.error('err : ', err);
      next(null, { ec : Code.FAIL, msg : "Có lỗi xảy ra xin vui lòng thử lại sau"})
    })
    .finally(function () {
      msg = null;
      uids = null;
      logBuy = null;
    })
};
