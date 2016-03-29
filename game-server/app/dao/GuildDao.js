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
var FriendDao = require('./friendDao');
var moment = require('moment');

var RESOURCE_NAME = {
  1: 'info',
  2: 'member',
  3: 'event'
};


/**
 * Lấy thông tin về resource của guild
 *
 * @param role
 * @param permission
 * @param resourceId
 * @param cb
 */
GuildDao.getResource = function (role, permission, resourceId, cb) {
  console.log('args : ', role, permission, resourceId, resourceId['id']);
  //if (typeof RESOURCE_MAP[resourceId.id] !== 'function'){
  //  return utils.invokeCallback(cb, null, {});
  //}
  console.log('resourceMap : ', RESOURCE_MAP);
  return RESOURCE_MAP[resourceId['id']](role, permission, resourceId)
    .then(function (result) {
      result = result || {};
      result.resourceId = resourceId.id;
      return utils.invokeCallback(cb, null, result);
    })
    .catch(function (err) {
      console.error('err : ', err);
      return utils.invokeCallback(cb, null, {});
    })
};

GuildDao.getGuildChat = function (role, permission, resourceId, cb) {};

GuildDao.getGuildHistoryFund = function (role, permission, resource, cb) {};

GuildDao.getGuildRequest = function (role, permission, args, cb) {
  return pomelo.app.get('mysqlClient')
    .GuildMember
    .findAll({
      where : {
        guildId : args.guildId,
        role : 0
      },
      include: [{
        model: pomelo.app.get('mysqlClient').User,
        attributes : ['gold', 'fullname', 'avatar']
      }],
      attributes : ['uid', 'role', 'fame'],
      raw : true
    })
    .then(function (members) {
      for (var i = 0,len = members.length; i < len; i++) {
        members[i]['fullname'] = members[i]['User.fullname'];
        members[i]['gold'] = members[i]['User.gold'];
        members[i]['avatar'] = utils.JSONParse(members[i]['User.avatar']);
        members[i]['sex'] = members[i]['User.sex'] || 0;
        delete members[i]['User.fullname'];
        delete members[i]['User.gold'];
        delete members[i]['User.avatar'];
        delete members[i]['User.sex'];
      }
      return utils.invokeCallback(cb, null, {list : members});
    })
    .catch(function (err) {
      console.error('err : ', err);
      return utils.invokeCallback(cb, null, {list : []});
    })
};

GuildDao.getGuildInformation = function (role, permission, args, cb) {
  var promise = {};
  promise['info'] = pomelo.app.get('mysqlClient')
    .Guild
    .findOne({where: {id: args.guildId}, attributes: ['name', 'numMember', 'gold', 'level', 'fame', 'detail', 'icon', 'exp'], raw: true});

  if (role === consts.GUILD_MEMBER_STATUS.PRESIDENT || role === consts.GUILD_MEMBER_STATUS.VICE_PRESIDENT)
    promise['numRequest'] = pomelo.app.get('mysqlClient').GuildMember.count({where : { guildId : args.guildId, role : consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER}});

  return Promise.props(promise)
    .then(function (result) {
      var guildLevel = pomelo.app.get('dataService').get('guildLevel').data;
      result.info['numMember'] = [result.info['numMember'], guildLevel[result.info.level] ? guildLevel[result.info.level].maxMember : 20];
      result.info['exp'] = [result.info['exp'], 100];
      result.info['icon'] = utils.JSONParse(result.info['icon']);
      result.info['role'] = role ? role.role : 0;
      result.info['numRequest'] = result.numRequest || 0;
      if (role && role.role === consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER && role.guildId === args.guildId){
        result.info['isReq'] = 1;
      }else {
        result.info['isReq'] = 0;
      }
      return utils.invokeCallback(cb, null, result.info);
    })
    .catch(function (err) {
      console.error(err);
      return utils.invokeCallback(cb, err);
    })
};

GuildDao.getGuildFund = function (role, permission, args, cb) {
  var total;
  return pomelo.app.get('mysqlClient')
    .Guild
    .findOne({
      where: {
        id: args.guildId
      },
      attributes: ['gold']
    })
    .then(function (guild) {
      total = guild.gold;
      return Promise.props({
        list: pomelo.app.get('mysqlClient')
          .GuildMember
          .findAll({
            where: {
              guildId: args.guildId,
              role: {
                $ne: 0
              }
            },
            include: [{
              model: pomelo.app.get('mysqlClient').User,
              attributes: ['fullname', 'avatar', 'sex']
            }],
            attributes: ['uid', 'role', 'fame', 'gold'],
            raw: true
          }),
        gold : pomelo.app.get('mysqlClient')
          .User
          .findOne({ where : { uid: args.uid}, attributes: ['gold'], raw : true })
      })
    })
    .then(function (res) {
      console.log('res : ', res );
      if (lodash.isArray(res.list)) {
        for (var i = 0, len = res.list.length; i < len; i++){
          var member = res.list[i];
          member.fullname = member['User.fullname'];
          delete member['User.fullname'];
          member.avatar = utils.JSONParse(member['User.avatar'], { id : 0});
          delete member['User.avatar'];
          member.sex = member['User.sex'] || 0;
          delete member['User.sex'];
          res.list[i] = member;
        }
      }
      return utils.invokeCallback(cb, null, {
        total: total,
        list: res.list,
        ownGold : res.gold ? res.gold.gold : 0
      })
    })
};

GuildDao.getListGuild = function (opts, cb) {
  var guildLevel = pomelo.app.get('dataService').get('guildLevel').data;
  var condition = {
    offset : opts.offset,
    limit : opts.length,
    attributes : ['name', 'fame', 'icon', 'numMember', 'acronym', 'level', 'detail', 'id'],
    //order: [opts.sort || 'name', 'DESC'],
    raw : true
  };
  if (opts.keyword){
    condition['where'] = {
      name : {
        $like : '%' + opts.keyword + '%'
      }
    }
  }
  return pomelo.app.get('mysqlClient')
    .Guild
    .findAll(condition)
    .then(function (guilds) {
      console.log('guilds : ', guilds);
      var stt = 1;
      guilds = lodash.map(guilds, function (guild) {
        return {
          stt : stt++,
          guildId: guild.id,
          name: guild.acronym + '.' + guild.name,
          fame: guild.fame,
          detail: guild.detail,
          icon: utils.JSONParse(guild.icon,{ id : 0}),
          numMember: [guild.numMember, guildLevel[guild.level] ? guildLevel[guild.level].maxMember: 20]
        }
      });
      return utils.invokeCallback(cb, null, guilds);
    })
    .catch(function (err) {
      console.error('getListGuild err : ', err);
    })
};

GuildDao.getGuild = function (uid) {
  return pomelo.app.get('mysqlClient')
    .User
    .findOne({
      where : {
        uid : uid
      },
      attributes: ['uid','level','gold'],
      include: [ { model: pomelo.app.get('mysqlClient').GuildMember, attributes: ['role', 'guildId']} ],
      raw: true
    })
    .then(function (member) {
      if (!member['GuildMember.role'] || member['GuildMember.role'] === consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER){
        return Promise.resolve({
          status : 0,
          condition: {
            level : 0,
            gold: 10000
          },
          userInfo: {
            uid: member.uid,
            gold: member.gold,
            level: member.level
          },
          role: 0
        })
      }else if (member){
        return Promise.resolve({
          status : 1,
          condition: {
            level : 0,
            gold: 10000
          },
          userInfo: {
            uid: member.uid,
            gold: member.gold,
            level: member.level
          },
          channel: redisKeyUtil.getChatGuildName(member['GuildMember.guildId']),
          guildId : member['GuildMember.guildId'],
          role: member['GuildMember.role']
        })
      } else {

      }
    })
};


/**
 * Lây các thông tin sự kiện của guild
 *
 */
GuildDao.getGuildEvent = function (role, permission, args, cb) {
  var offset = args.offset || 0;
  var length = args.length || 20;
  return pomelo.app.get('mongoClient')
    .model('GuildEvent')
    .find({
      guildId : args.guildId
    })
    .skip(offset)
    .limit(length)
    .sort({time: 1})
    .select({content: 1, time: 1, type: 1, fullname : 1 , uid : 1})
    .lean()
    .then(function (events) {
      if (events){
        var startOfDayUnix = moment().startOf('day').unix();
        for (var i = 0, len = events.length; i < len; i++){
          var colorAlign = consts.GUILD_EVENT_TYPE_MAP[events[i].type];
          if (colorAlign) {
            events[i].color = colorAlign.color;
            events[i].align = colorAlign.align;
          }
          if (events[i].time > startOfDayUnix){
            events[i].time = moment(events[i].time * 1000).format('HH:mm')
          }else {
            events[i].time = moment(events[i].time * 1000).format('MM-DD')
          }
        }
        return utils.invokeCallback(cb, null, { list: events, offset:  offset , length : events.length});
      }
      return utils.invokeCallback(cb, null, { list: [], offset: offset, length: 0});
    })
    .catch(function (err) {
      console.error('err : ', err);
      return utils.invokeCallback(cb, null, { list: [], offset: offset, length: 0});
    })
};


/**
 * Tạo mới hội quán
 */
GuildDao.createGuild = function (uid, opts, cb) {
  // kiểm tra người chơi k nằm trong số lượng
  var guild = {};
  return GuildDao.checkUserInGuild(uid)
    .then(function (status) {
      if (!status || status === consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER){
        // người chơi đủ điều kiện để vào guild;
        // lấy thông tin của người chơi
        return UserDao.getUserProperties(uid, ['username', 'fullname', 'gold'])
      }else {
        //
        return Promise.reject({ec : Code.FAIL, msg: "Người chơi đã ở trong hội quán khác trước đó"})
      }
    })
    .then(function (user) {
      if (user){
        // check điều kiện để có thể vào guild
        if (user.level < 0 && user.gold < 10000){
          return Promise.reject({ec : Code.FAIL, msg : "Bạn không đủ điều kiện để có thể tạo mới Hội quán"})
        } else {
          return pomelo.app.get('paymentService').subBalance({
            uid : uid,
            gold : 10000,
            msg : "Phí lập hội quán"
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
                icon: JSON.stringify({id :opts.iconId || 0, version: opts.iconVersion || 0}),
                numMember: 1
              }, { transaction : t})
              .then(function (g) {
                guild = g;
                return pomelo.app.get('mysqlClient')
                  .GuildMember
                  .destroy({
                    where : {
                      uid : uid
                    }
                  }, { transaction : t})
              })
              .then(function () {
                return pomelo.app.get('mysqlClient')
                  .GuildMember
                  .create({
                    uid : uid,
                    guildId : guild.id,
                    role : consts.GUILD_MEMBER_STATUS.PRESIDENT
                  }, { transaction : t})
              })
          });
      }else {
        return Promise.reject({ec: Code.FAIL, msg: "Bạn không đủ tiền để lập hội"});
      }
    })
    .then(function () {
      return utils.invokeCallback(cb, null, { guildId : guild.guildId})
    })
    .catch(function (err) {
      console.error('err: ', err);
      if (err.ec){
        return utils.invokeCallback(cb, null, err);
      }else if (1){

      }
    })
};

GuildDao.createMember = function (opts, cb) {
  return pomelo.app.get('mysqlClient')
    .GuildMember
    .findOrCreate({
      where : {
        uid : opts.uid,
        guildId : opts.guildId
      },
      defaults: opts
    })
    .spread(function (member, created) {
      if (!created)
        member.updateAttributes(opts);
      return utils.invokeCallback(cb, null, {});
    })
    .catch(function (err) {
      console.error('createMember error : ', err)
    })
};

GuildDao.updateMember = function (uid, guildId, opts, cb) {
  var user;
  return pomelo.app.get('mysqlClient')
    .User
    .findOne({
      where: {
        uid : uid
      },
      raw : true,
      attributes: ['fullname', 'uid', 'username']
    })
    .then(function (u) {
      user = u;
      return pomelo.app.get('mysqlClient')
        .GuildMember
        .findOne({
          where : {
            uid: uid,
            guildId: guildId
          }
        })
    })
    .then(function (member) {
      if (member){
        return member.updateAttributes(opts);
      }else {
        return Promise.reject({})
      }
    })
    .then(function (result) {
      return utils.invokeCallback(cb, null, user);
    })
    .catch(function (err) {
      if (lodash.isError(err)){
        console.error(err);
      }
      return utils.invokeCallback(cb, null, { ec : err.ec || Code.FAIL, msg : err.msg});
    })
};

GuildDao.deleteMember = function (uid, guildId, cb) {
  var destroyData = {
    uid : uid
  };
  if (guildId) destroyData['guildId'] = guildId;
  return pomelo.app.get('mysqlClient')
    .GuildMember
    .destroy({
      where : destroyData
    })
    .then(function (data) {
      return utils.invokeCallback(cb, null, {});
    })
    .catch(function (err) {
      console.error(err);
      utils.invokeCallback(cb, null, {ec : Code.FAIL});
    })
};

GuildDao.updateGuild = function (role, permission, opts, cb) {
  return pomelo.app.get('mysqlClient')
    .Guild
    .update(opts, {
      where : {
        id :role.guildId
      }
    })
    .then(function () {
      return utils.invokeCallback(cb, null, {});
    })
    .catch(function (err) {
      console.error('err : ', err);
    })
};

GuildDao.delGuild = function () {
  
};

GuildDao.getGuildMember = function (role, permission, args, cb) {
  var statusService = pomelo.app.get('statusService');
  var list;
  return pomelo.app.get('mysqlClient')
    .GuildMember
    .findAll({
      where : {
        guildId : args.guildId,
        role : {
          $ne : 0
        }
      },
      include: [{
        model: pomelo.app.get('mysqlClient').User,
        attributes : ['gold', 'fullname', 'avatar']
      }],
      attributes : ['uid', 'role', 'fame'],
      raw : true
    })
    .then(function (members) {
      console.log('members : ', members);
      var uids = [];
      for (var i = 0,len = members.length; i < len; i++){
        members[i]['fullname'] = members[i]['User.fullname'];
        members[i]['gold'] = members[i]['User.gold'];
        members[i]['avatar'] = utils.JSONParse(members[i]['User.avatar']);
        members[i]['sex'] = members[i]['User.sex'] || 0;
        delete members[i]['User.fullname'];
        delete members[i]['User.gold'];
        delete members[i]['User.avatar'];
        delete members[i]['User.sex'];
        uids.push(members[i].uid);
      }
      list = members;
      return Promise.promisify(statusService.getStatusByUids,{ context : statusService})(uids, true)
    })
    .then(function (statuses) {
      for (var i = 0; i < list.length; i++) {
        if (!statuses[list[i].uid] || !statuses[list[i].uid].online)
          list[i].status = consts.ONLINE_STATUS.OFFLINE;
        else if (!statuses[list[i].uid].board)
          list[i].status = consts.ONLINE_STATUS.ONLINE;
        else if (typeof statuses[list[i].uid].board === 'string') {
          var tmp = statuses[list[i].uid].board.split(':');
          list[i].status = tmp.length > 1
            ? (Number(tmp[1]))
            : consts.ONLINE_STATUS.ONLINE;
          list[i].boardId = statuses[list[i].uid].board;
        }
        else list[i].status = consts.ONLINE_STATUS.ONLINE;

        list[i].avatar = utils.JSONParse(list[i].avatar, {id: 0});
        //if (list[i].uid == uid) {
        //  var me = utils.clone(list[i]);
        //  if (inTop) {
        //    list[i].isMe = 1;
        //    me.rank = i+1;
        //  }
        //  else {
        //    list.splice(i,1);
        //    i--;
        //  }
        //}
      }
      return utils.invokeCallback(cb, null, {member : list})
    });
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
        role : consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER
      }
    })
};

GuildDao.checkUserInGuild = function (uid, cb) {
  return pomelo.app.get('mysqlClient')
    .GuildMember
    .findOne({ where : { uid : uid}, attributes : ['role'], raw : true})
    .then(function (member) {
      if (member){
        return utils.invokeCallback(cb, null, member.role)
      }else {
        return utils.invokeCallback(cb, null, 0);
      }
    })
    .catch(function (err) {
      console.error(err);
      return utils.invokeCallback(cb, null, 0);
    })
};

GuildDao.getGuildListFriend = function (role, permission, args, cb) {
  return FriendDao.getFullList(args.uid)
    .then(function (list) {
      return utils.invokeCallback(cb, null, { list : list});
    })
    .catch(function (err) {
      console.error('err : ', err);
    })
};

GuildDao.getGuildSearchFriend = function (role, permission, args, cb) {
  return FriendDao.search(args)
    .then(function (list) {
      return utils.invokeCallback(cb, null,  list);
    })
    .catch(function (err) {
      console.error('err : ', err);
    })
};

GuildDao.addEvent = function (opts) {
  var GuildEvent = pomelo.app.get('mongoClient').model('GuildEvent');
  return GuildEvent.create({
    guildId: opts.guildId,
    uid : opts.guildId,
    fullname : opts.fullname,
    content : opts.content,
    type : opts.type,
    time : Date.now() / 1000 | 0
  })
};

GuildDao.deleteEvent = function (eventId) {
  
};

GuildDao.countInvite = function (opts) {
  return pomelo.app.get('mysqlClient')
    .GuildInvite
    .count(opts);
};

GuildDao.removeInvite = function (opts) {
  return pomelo.app.get('mysqlClient')
    .GuildInvite
    .destroy({ where : {
      uid : opts.uid,
      guildId : opts.guildId
    }})
};

var RESOURCE_MAP = {
  1: GuildDao.getGuildInformation,
  2: GuildDao.getGuildMember,
  3: GuildDao.getGuildEvent,
  4: GuildDao.getGuildChat,
  5: GuildDao.getGuildFund,
  6: GuildDao.getGuildHistoryFund,
  7: GuildDao.getGuildRequest,
  8: GuildDao.getGuildListFriend,
  9: GuildDao.getGuildSearchFriend
};
