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
var RoomDao = require('./roomChatDao');
var ActionDao = require('./actionDao');

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

GuildDao.getGuildChat = function (role, permission, resourceId, cb) {
  var getMessages = Promise.promisify(pomelo.app.get('chatService').getLastMessage,{context: pomelo.app.get('chatService')});
  return getMessages({length:20, channel: redisKeyUtil.getChatGuildName(role.guildId), targetType: consts.TARGET_TYPE.GROUP, reverse : 1})
    .map(function (message) {
      return pomelo.app.get('mysqlClient')
        .GuildMember
        .findOne({
          where:{
            uid : message.from
          },
          include: [
            {
              model: pomelo.app.get('mysqlClient').User,
              attributes : ['uid', 'fullname']
            }
          ],
          raw :true,
          attributes : ['role', 'uid']
        })
        .then(function (result) {
          if (result){
            message.role = result.role;
            message.fullname  = result['User.fullname'] ? result['User.fullname'] : message.from;
            message['date'] = moment(message.date).unix();
            return Promise.resolve(message);
          }else {
            return pomelo.app.get('mysqlClient')
              .User
              .findOne({
                where : {
                  uid : message.from
                },
                raw : true,
                attributes : ['fullname', 'uid']
              })
              .then(function (user) {
                message.role = consts.GUILD_MEMBER_STATUS.GUEST;
                message.fullname  = user.fullname ? user.fullname : message.from;
                message['date'] = moment(message.date).unix();
                return Promise.resolve(message);
              })
          }
        })
    })
    .then(function (messages) {
      return utils.invokeCallback(cb, null, { list  : messages.reverse()})
    })
    .catch(function (err) {
      console.error('err : ', err);
      return utils.invokeCallback(cb, null, {list : []});
    })
};

GuildDao.getGuildHistoryFund = function (role, permission, resource, cb) {
  return utils.invokeCallback(cb, null, {});
};

GuildDao.getGuildRequest = function (role, permission, args, cb) {
  return pomelo.app.get('mysqlClient')
    .GuildMember
    .findAll({
      where : {
        guildId : args.guildId,
        role : consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER
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
    .findOne({where: {id: args.guildId}, attributes: ['name', 'numMember', 'gold', 'level', 'fame', 'detail', 'icon', 'exp', 'sIcon'], raw: true});
  if (role.role === consts.GUILD_MEMBER_STATUS.PRESIDENT || role.role === consts.GUILD_MEMBER_STATUS.VICE_PRESIDENT)
    promise['numRequest'] = pomelo.app.get('mysqlClient').GuildMember.count({where : { guildId : args.guildId, role : consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER}});

  return Promise.props(promise)
    .then(function (result) {
      var guildLevel = pomelo.app.get('dataService').get('guildLevel').data;
      var maxMember = guildLevel[result.info.level + 1] ? guildLevel[result.info.level + 1].maxMember : guildLevel['1'].maxMember;
      maxMember = result.info.numMember > maxMember ? result.info.numMember : maxMember;
      result.info['numMember'] = [result.info['numMember'], maxMember];
      result.info['name'] = result.info['name'];
      result.info['exp'] = [result.info['exp'], 100];
      result.info['icon'] = utils.JSONParse(result.info['icon']);
      result.info['role'] = role ? role.role : 0;
      result.info['sIcon'] = utils.JSONParse(result.info.sIcon, []);
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
                $ne: consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER
              }
            },
            offset : args.offset || 0,
            limit : args.length || 100,
            include: [{
              model: pomelo.app.get('mysqlClient').User,
              attributes: ['fullname', 'avatar', 'sex']
            }],
            order: 'gold DESC',
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

GuildDao.getListGuild = function (roleId, opts, cb) {
  var guildLevel = pomelo.app.get('dataService').get('guildLevel').data;
  var sort = opts.sort || 'name';
  var condition = {
    offset : opts.offset,
    limit : opts.length,
    attributes : ['name', 'fame', 'icon', 'numMember', 'level', 'detail', 'id', 'gold'],
    order: sort + ' DESC',
    raw : true
  };
  if (opts.keyword){
    condition['where'] = {
      status : 1,
      name : {
        $like : '%' + opts.keyword + '%'
      }
    }
  }else {
    condition['where'] = {
      status : 1
    }
  }
  return pomelo.app.get('mysqlClient')
    .Guild
    .findAll(condition)
    .then(function (guilds) {
      console.log('guilds : ', guilds);
      var stt = opts.offset + 1;
      guilds = lodash.map(guilds, function (guild) {
        var isReq;
        if (roleId.guildId === guild.id){
          isReq = 1;
        }
        var maxPlayer = guildLevel[guild.level + 1] ? guildLevel[guild.level + 1].maxMember: guildLevel[1];
        maxPlayer = guild.numMember >= maxPlayer ? guild.numMember : maxPlayer
        return {
          isReq: isReq,
          stt : stt++,
          guildId: guild.id,
          name: guild.name,
          fame: guild.fame,
          level : guild.level,
          gold : guild.gold,
          detail: guild.detail,
          icon: utils.JSONParse(guild.icon,{ id : 0}),
          sIcon : utils.JSONParse(guild.sIcon, { id : 0, version : 0}),
          numMember : [guild.numMember, maxPlayer]
        }
      });
      return utils.invokeCallback(cb, null, guilds);
    })
    .catch(function (err) {
      console.error('getListGuild err : ', err);
    })
};

GuildDao.getGuild = function (uid, cb) {
  var member;
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
    .then(function (m) {
      member = m;
      if (!member){
        return Promise.reject();
      }else {
        var data =[pomelo.app.get('mysqlClient')
          .GuildConfig
          .findOne({
            raw : true
          })
        ];
        if (member && member['GuildMember.role'] === consts.GUILD_MEMBER_STATUS.PRESIDENT){
          data.push(pomelo.app.get('mysqlClient').Guild.findOne(
            {where :{
              id : member['GuildMember.guildId']
            },
              raw : true
            }
          ))
        }
        return data
      }
    })
    .spread(function (config, guild) {
      if (!member['GuildMember.role'] || member['GuildMember.role'] === consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER){
        var request = 0;
        if (member['GuildMember.role'] === consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER){
          request = 1;
        }
        return Promise.resolve({
          status : 0,
          numRequest : 0,
          requested : request,
          condition: {
            level : config.level || 0,
            gold: config.fee || 10000,
            id : Date.now() / 1000 | 0
          },
          sIcon : utils.JSONParse(config.sIcon, []),
          userInfo: {
            uid: member.uid,
            gold: member.gold,
            level: member.level
          },
          role: 0
        })
      }else if (member){
        var msg;
        var status = 1;
        if (guild && !guild.status){
          status = 2;
          msg = "Bạn đã gửi yêu cầu thành lập hội quán.\nBQTsẽ gửi lại kết quả xét duyệt trong 24\nMọi ý kiến thắc mắc xin liên lạc sđt hỗ trợ hoặc trên fanpage:\n\nhttp://www.facebook.com/groups/cothu"
        }
        return Promise.resolve({
          status : status,
          requested : 0,
          msg : msg,
          condition: {
            level : config.level || 0,
            gold: config.fee || 10000,
            id : Date.now() / 1000 | 0
          },
          sIcon : utils.JSONParse(config.sIcon, []),
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
        return Promise.reject({ec : Code.FAIL, msg : "Người dùng không tồn tại"})
      }
    })
  .then(function (data) {
      if (data && data.guildId ){
        return pomelo.app.get('mysqlClient').GuildMember.count({where : { guildId : data.guildId, role : consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER}})
          .then(function (numRequest) {
            data.numRequest = numRequest || 0;
            return utils.invokeCallback(cb, null, data)
          })
      }else {
        return utils.invokeCallback(cb, null, data);
      }
    })
  .catch(function (err) {
      console.error('err : ', err);
      return utils.invokeCallback(cb, null, { ec : err.ec || Code.FAIL, msg : err.msg || Code.FAIL})
    });
};

GuildDao.deleteGuild = function (guildId) {
  return pomelo.app.get('mysqlClient')
    .Guild
    .destroy({
      where : {
        id: guildId
      }
    })
    .then(function () {
      // xoá member
      return pomelo.app.get('mysqlClient')
        .GuildMember
        .destroy({
          where : {
            guildId : guildId
          }
        })
    })
    .then(function () {
      // xoá roomChat
      return RoomDao.deleteRoom(redisKeyUtil.getChatGuildName(guildId))
    })
};

/**
 * Lây các thông tin sự kiện của guild
 *
 */
GuildDao.getGuildEvent = function (role, permission, args, cb) {
  var offset = 0;
  var length = 50;
  return pomelo.app.get('mongoClient')
    .model('GuildEvent')
    .find({
      guildId : args.guildId
    })
    .sort({time: -1})
    .skip(offset)
    .limit(length)
    .select({content: 1, time: 1, type: 1, fullname : 1 , uid : 1})
    .lean()
    .then(function (events) {
      events.reverse();
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
  var config;
  return GuildDao.checkUserInGuild(uid)
    .then(function (status) {
      if (!status || status === consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER){
        return [UserDao.getUserProperties(uid, ['username', 'fullname', 'gold']),
          pomelo.app.get('mysqlClient')
            .GuildConfig
            .findOne({
              raw : true
            })
        ]
      }else {
        //
        return Promise.reject({ec : Code.FAIL, msg: "Người chơi đã ở trong hội quán khác trước đó"})
      }
    })
    .spread(function (user, c) {
      config = c || {};
      var level = config.level || 0;
      var fee = config.fee || 10000;
      if (user){
        // check điều kiện để có thể vào guild
        if (user.level < level && user.gold < fee){
          return Promise.reject({ec : Code.FAIL, msg : "Bạn không đủ điều kiện để có thể tạo mới Hội quán"})
        } else {
          return pomelo.app.get('paymentService').subBalance({
            uid : uid,
            gold : fee,
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
        console.error('eo hieu tai sao luon');
        pomelo.app.get('statusService').pushByUids([uid], 'service.dailyHandler.getGoldAward', { gold : data.gold});
        return pomelo.app.get('mysqlClient')
          .Guild
          .create({
            name: opts.name,
            acronym: opts.acronym,
            detail: opts.detail,
            icon: JSON.stringify({id :opts.iconId || 0, version: opts.iconVersion || 0}),
            numMember: 0,
            fame : consts.GUILD_INIT_FAME,
            gold : parseInt((config.fee || 10000) / 100 * 10),
            requireText : opts.require,
            sIcon : JSON.stringify(opts.sIcon || {id : 0, version: 0})
          })
          .then(function (g) {
            guild = g;
            return GuildDao.createMember({
              uid : uid,
              guildId : guild.id,
              role : consts.GUILD_MEMBER_STATUS.PRESIDENT
            }, true)
          })
          .catch(function (err) {
            console.error('err : ', err);
            var msg = 'Có lỗi xảy ra, xin vui lòng thử lại sau';
            if (err.name === 'SequelizeUniqueConstraintError'){
              msg = 'Tên hội quán với các hội quán khác'
            }
            return Promise.reject({ec : err.ec || Code.FAIL, msg: err.msg || msg})
          })
      }else {
        return Promise.reject({ec: Code.FAIL, msg: "Bạn không đủ tiền để lập hội"});
      }
    })
    .then(function () {
      console.error('finish Create guild');
      return utils.invokeCallback(cb, null, { guildId : guild.guildId})
    })
    .catch(function (err) {
      console.error('err: ', err);
      if (err.ec){
        return utils.invokeCallback(cb, null, err);
      }else if (1){
      }
    })
    .finally(function () {
      config = null;
      guild = null;
    })
};

GuildDao.createMember = function (opts, deleted, cb) {
  console.log('createMember');
  return Promise.delay(0)
    .then(function () {
      if (deleted){
        return [pomelo.app.get('mysqlClient')
          .GuildMember
          .destroy({
            where : {
              uid : opts.uid
            }
          }), pomelo.app.get('mysqlClient').Guild.findOne({where : {id : opts.guildId}, attributes: ['level', 'exp', 'numMember'], raw : true})]
      }else {
        return [Promise.resolve(),
          pomelo.app.get('mysqlClient').Guild.findOne({where : {id : opts.guildId}, attributes: ['level', 'exp', 'numMember'], raw : true})
        ]
      }
    })
    .spread(function (destroy, guild) {
      if (!guild) { return Promise.reject({})}
      var guildLevel = pomelo.app.get('dataService').get('guildLevel').data;
      var level = guildLevel[(guild.level || 0) + 1];
      var maxPlayer = level ? level.maxMember : guildLevel[1].maxMember;
      if (guild.numMember >= maxPlayer){
        return Promise.reject({ec : Code.FAIL, msg : "Hội quán đã đạt giới hạn hội viên, không thể thêm mới hội viên"})
      }
      return pomelo.app.get('mysqlClient')
        .GuildMember
        .create(opts)
    })
    .then(function (member) {
      if (opts.role <= consts.GUILD_MEMBER_STATUS.NORMAL_MEMBER){
        RoomDao.addMember(redisKeyUtil.getChatGuildName(opts.guildId),[opts.uid]);
        GuildDao.updateNumMember(opts.guildId);
      }
      return utils.invokeCallback(cb, null, {member : [{role : member.role, uid : member.uid, guildId : member.guildId}]});
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
      user.role = opts.role;
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
      return utils.invokeCallback(cb, null, { member : [user]});
    })
    .catch(function (err) {
      if (lodash.isError(err)){
        console.error(err);
      }
      return utils.invokeCallback(cb, null, { ec : err.ec || Code.FAIL, msg : err.msg || Code.FAIL});
    })
};

GuildDao.deleteMember = function (uid, guildId, cb) {
  var destroyData = {
    uid : uid
  };
  var member;
  if (guildId) destroyData['guildId'] = guildId;
  return pomelo.app.get('mysqlClient')
    .GuildMember
    .findOne({
      where: {
        uid : uid
      },
      include: [
        {
          model: pomelo.app.get('mysqlClient').User,
          attributes : ['uid', 'fullname', 'username']
        }
      ],
      raw : true,
      attributes: ['uid', 'role']
    })
    .then(function (m) {
      member = m;
      console.log('delete member : ', member);
      if (member){
        return pomelo.app.get('mysqlClient')
          .GuildMember
          .destroy({
            where : destroyData
          })
      }else {
        return Promise.reject({
          ec : Code.FAIL
        })
      }
    })
    .then(function () {
      if (member && member.role <= consts.GUILD_MEMBER_STATUS.NORMAL_MEMBER){
        RoomDao.kickUser(redisKeyUtil.getChatGuildName(guildId), [uid]);
      }
      GuildDao.updateNumMember(guildId);
      return utils.invokeCallback(cb, null,{ member:  [{uid : uid, role: consts.GUILD_MEMBER_STATUS.GUEST, fullname : member['User.fullname'] }]});
    })
    .catch(function (err) {
      console.error(err);
      return utils.invokeCallback(cb, null, {ec : Code.FAIL});
    })
};

GuildDao.getMembers = function (uid, guildId, cb) {
  var whereData = {
    uid : uid
  };
  if (guildId) whereData['guildId'] = guildId;
  return pomelo.app.get('mysqlClient')
    .GuildMember
    .findOne({
      where: whereData,
      raw : true
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

GuildDao.delGuild = function (guildId) {
  return [pomelo.app.get('mysqlClient')
    .Guild
    .destroy({
      where: {
        guildId : guildId
      }
    }),
    pomelo.app.get('mysqlClient')
      .GuildMember
      .destroy({
        where : {
          guildId : guildId
        }
      })
    ]
};

GuildDao.getGuildMember = function (role, permission, args, cb) {
  var statusService = pomelo.app.get('statusService');
  var list;
  var offset = args.offset || 0;
  var length = args.length || 100;
  return pomelo.app.get('mysqlClient')
    .GuildMember
    .findAll({
      where : {
        guildId : args.guildId,
        role : {
          $ne : consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER
        }
      },
      offset : offset,
      limit : length,
      include: [{
        model: pomelo.app.get('mysqlClient').User,
        attributes : ['gold', 'fullname', 'avatar']
      }],
      order: 'role ASC',
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
      console.log('members : ', members);
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
      }
      return utils.invokeCallback(cb, null, {member : list, offset: offset})
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
    .map(function (friend) {
      return pomelo.app.get('mysqlClient')
        .GuildMember
        .count({
          where : {
            uid : friend.uid
          }
        })
        .then(function (count) {
          if (count > 0){
            return Promise.resolve(undefined)
          }else {
            return Promise.resolve(friend)
          }
        })
    })
    .then(function (list) {
      list = lodash.compact(list);
      return utils.invokeCallback(cb, null,  { list: list});
    })
    .catch(function (err) {
      console.error('getGuildListFriend : ', err);
    })
};

GuildDao.getGuildSearchFriend = function (role, permission, args, cb) {
  return FriendDao.search(args)
    .then(function (data) {
      return Promise.props({
        list: Promise.map(data.list, function (friend) {
          return pomelo.app.get('mysqlClient')
            .GuildMember
            .count({
              where : {
                uid : friend.uid,
                role: {
                  $lte : consts.GUILD_MEMBER_STATUS.NORMAL_MEMBER
                }
              }
            })
            .then(function (count) {
              if (count > 0){
                return Promise.resolve(undefined)
              }else {
                return Promise.resolve(friend)
              }
            })
        }),
        hasNext: Promise.resolve(data.hasNext),
        page: Promise.resolve(data.page)
      })
    })
    .then(function (list) {
      console.log('list : ', list);
      list.list = lodash.compact(list.list);
      return utils.invokeCallback(cb, null,  list);
    })
    .catch(function (err) {
      console.error('getGuildSearchFriend : ', err);
      return utils.invokeCallback(cb, null, []);
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

GuildDao.removeAction = function (guildId, action) {
  return pomelo.app.get('mysqlClient')
    .GuildMember
    .findOne({
      where : {
        guildId : guildId,
        role : consts.GUILD_MEMBER_STATUS.PRESIDENT
      },
      raw : true
    })
    .then(function (member) {
      if (!member) {
        return
      }
      return ActionDao.removeAction(action, member.uid)
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

GuildDao.updateNumMember = function (guildId) {
  pomelo.app.get('mysqlClient')
    .GuildMember
    .count({
      where : {
        guildId : guildId,
        role : {
          $lte : consts.GUILD_MEMBER_STATUS.NORMAL_MEMBER
        }
      }
    })
    .then(function (count) {
      pomelo.app.get('mysqlClient')
        .Guild
        .update({
          numMember: count
        }, {
          where : {
            id : guildId
          }
        })
    })
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
