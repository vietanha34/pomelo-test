/**
 * Created by vietanha34 on 1/19/16.
 */

var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');
var consts = require('../consts/consts');
var utils = require('../util/utils');
var Code = require('../consts/code');
var Promise = require('bluebird');
var redisKeyUtil = require('../util/redisKeyUtil');
var lodash = require('lodash');
var GuildDao = module.exports;
var UserDao = require('./userDao');


GuildDao.getGuild = function (guildId, cb) {
  return Promise.props({
    info : GuildDao.getGuildInformation(guildId),
    member : GuildDao.getGuildMember(guildId)
  })
};

/**
 * Lấy thông
 *
 * @param guildId
 * @param getGamePlay
 * @param cb
 * @returns {Promise.<T>}
 */
GuildDao.getGuildInformation = function (guildId, getGamePlay, cb) {
  return pomelo.app.get('mysqlClient')
    .Guild
    .findOne({where: {id: guildId}, attributes: ['name', 'numPlayer', 'maxPlayer', 'gold', 'level', 'fame', 'detail', 'avatar'], raw: true})
    .then(function (guild) {
      return utils
    })
    .catch(function (err) {
      console.error(err);
      return utils.invokeCallback(cb, err);
    })
};



GuildDao.getGuildEvent = function () {
  pomelo.app.get('mongoClient')
};

/**
 * Tạo mới hội quán
 *
 */
GuildDao.createGuild = function (uid, opts, cb) {
  // kiểm tra người chơi k nằm trong số lượng
  GuildDao.checkUserInGuild(uid)
    .then(function (status) {
      if (!status || status === consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER){
        // người chơi đủ điều kiện để vào guild;
        // lấy thông tin của người chơi
        return UserDao.getUserProperties(uid, ['username', 'fullname', 'gold'])
      }else {
        //
        return Promise.reject({ec : Code.FAIL, msg: "Người dùng đã ở trong Guild trước đó"})
      }
    })
    .then(function (user) {
      if (user){
        // check điều kiện để có thể vào guild
        if (user.level < 10 && user.gold < 1000000){
          return Promise.cancel();
        }else {
          return pomelo.app.get('paymentService').subBalance({
            uid : uid,
            gold : 1000000,
            msg : "phí lập hội quán"
          })
        }
      }else {
        // người dùng k  tồn tại
        return Promise.reject({ec: Code.FAIL, msg: "Người dùng không tồn tại"});
      }
    })
    .then(function (data) {
      if (!data.ec){
        return pomelo.app.get('mysqlClient')
          .sequelize
          .transaction(function (t) {
            return pomelo.app.get('mysqlClient')
              .Guild
              .create({
                name: opts.name,
                acronym: opts.acronym,
                detail: opts.detail,
                avatar: JSON.stringify(opts.avatar)
              })
              .then(function () {

              })
          });
      }else {
        return Promise.reject({ec: Code.FAIL, msg: "Bạn không đủ tiền để lập hội"});
      }
    })
    .then(function () {

    })
    .catch(function (err) {})
};

GuildDao.updateMember = function (uid, guildId, opts, cb) {
  return pomelo.app.get('mysqlClient')
    .GuildMember
    .update(opts,{
      where : {
        uid: uid,
        guildId: guildId
      }
    })
    .then(function (data) {

    })
    .catch(function (err) {
      console.error(err);
      utils.invokeCallback(cb, err);
    })
};

GuildDao.deleteMember = function (uid, guildId, cb) {
  return pomelo.app.get('mysqlClient')
    .GuildMember
    .update(opts,{
      where : {
        uid: uid,
        guildId: guildId
      }
    })
    .then(function (data) {
    })
    .catch(function (err) {
      console.error(err);
      utils.invokeCallback(cb, err);
    })
};

GuildDao.updateGuild = function (uid, opts, cb) {

};

GuildDao.delGuild = function () {
  
};

GuildDao.getGuildMember = function (guildId, getGamePlay, cb) {
  if (typeof getGamePlay === 'function'){
    cb = getGamePlay;
    getGamePlay = false;
  }
  // lấy thông tin của member rồi lấy thông tin đang chơi nếu có
};

GuildDao.getNumMemberRequestJoin = function (guildId, cb) {
  return pomelo.app.get('mysqlClient')
};

GuildDao.getMembersRequest = function (guildId, cb) {
  return pomelo.app.get('mysqlClient')
    .GuildMember
    .findAll({
      where : {
        guildId : guildId,
        status : consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER
      }
    })
};

GuildDao.checkUserInGuild = function (uid, cb) {
  return pomelo.app.get('mysqlClient')
    .GuildMember
    .findOne({ where : { uid : uid}, attributes : ['status'], raw : true})
    .then(function (member) {
      if (member){
        return utils.invokeCallback(cb, null, member.status)
      }else {
        return utils.invokeCallback(cb, null, 0);
      }
    })
    .catch(function (err) {
      console.error(err);
      return utils.invokeCallback(cb, null, 0);
    })
};