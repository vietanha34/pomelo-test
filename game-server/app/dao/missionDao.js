/**
 * Created by vietanha34 on 9/23/15.
 */

var pomelo = require('pomelo');
var consts = require('../consts/consts');
var utils = require('../util/utils');
var code = require('../consts/code');
var Promise = require('bluebird');
var redisKeyUtil = require('../util/redisKeyUtil');
var regexValidUtil = require('../util/regexValid');
var lodash = require('lodash');
var moment = require('moment');
var MissionDao = module.exports;
var UserDao = require('../dao/userDao');
var TopupDao = require('../dao/topupDao');
var TopDao = require('../dao/topDao');
var NotifyDao = require('../dao/notifyDao');

/**
 *
 * @param uid
 * @param cb
 */
MissionDao.getMissions = function getMissions(uid, cb) {
  if (!uid) {
    return utils.invokeCallback(cb, 'invalid param get mission');
  }

  var redis = pomelo.app.get('redisInfo');

  return Promise.all([
    MissionDao.getAllMissions(),
    redis.hgetallAsync(redisKeyUtil.getMissionProgressKey(uid)),
    redis.hgetallAsync(redisKeyUtil.getMissionStatusKey(uid)),
    UserDao.getUserProperties(uid, ['gold'])
  ])
    .spread(function(allMission, progress, status, user) {
      for (var i=0; i<allMission.length; i++) {
        var currentProgress = Number(allMission[i].progress) || 0;
        allMission[i].progress = [currentProgress, allMission[i].progress];
        allMission[i].status = status[allMission[i].id] || 0;
        allMission[i].effect = MissionDao.EFFECT[allMission[i].id] || 0;
        if (MissionDao.COMMAND[allMission[i].id])
          allMission[i].command = MissionDao.COMMAND[allMission[i].id];

        if (allMission[i].id == MissionDao.ID.GOLD_1M
          || allMission[i].id == MissionDao.ID.GOLD_5M
          || allMission[i].id == MissionDao.ID.GOLD_10M)
          allMission[i].progress[0] = user.gold || 0;

        return utils.invokeCallback(cb, null, {list: allMission});
      }
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb, null, {list: []});
    });
};

/**
 *
 * @param uid
 * @param effect
 * @param cb
 */
MissionDao.doMission = function doMission(uid, effect, cb) {
  if (!uid || !effect || !MissionDao.EFFECT_MAP[effect]) {
    return utils.invokeCallback(cb, null, 'invalid params do mission');
  }

  var missionId = MissionDao.EFFECT_MAP[effect];

  var redis = pomelo.app.get('redisInfo');
  var redisCache = pomelo.app.get('redisCache');
  Promise.all([
    redis.hgetAsync(redisKeyUtil.getMissionStatusKey(uid), missionId.toString()),
    redisCache.hgetallAsync(redisKeyUtil.getMissionKey(missionId))
  ])
    .spread(function(status, mission) {
      if (status) return;

      return redis.hsetAsync(redisKeyUtil.getMissionProgressKey(uid), missionId.toString(), '1')
        .then(function() {
          return MissionDao.pushAward(uid, missionId, mission, 30000)
        });
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
    });

  return utils.invokeCallback(cb, null, {ec: 0});
};

MissionDao.inviteSocial = function inviteSocial(uid, friends, cb) {
  friends = utils.JSONParse(friends, null);
  if (!uid || !friends || !friends.length || friends.length >= 100) {
    return utils.invokeCallback(cb, null, 'Invalid params invite social');
  }

  var redis = pomelo.app.get('redisInfo');
  var redisCache = pomelo.app.get('redisCache');
  var inviteKey = redisKeyUtil.getInviteSocialKey(uid);

  friends.unshift(inviteKey);

  var missionId = MissionDao.ID.MOI_BAN_FB;

  return Promise.all([
    redisCache.saddAsync(friends),
    redis.hgetAsync(redisKeyUtil.getMissionStatusKey(uid), missionId.toString()),
    redis.hgetAsync(redisKeyUtil.getMissionProgressKey(uid), missionId.toString()),
    redisCache.hgetallAsync(redisKeyUtil.getMissionKey(missionId))
  ])
    .then(function(newInviteCount, status, progress, mission) {
      var newProgress = (Number(progress)+Number(newInviteCount));
      if (!status && newProgress >= mission.progress)
        MissionDao.pushAward(uid, missionId, mission, 2000);

      redis.hset(redisKeyUtil.getMissionProgressKey(uid), missionId.toString(), newProgress);

      return utils.invokeCallback(cb, null, {type: 3, progress: [newProgress||0, mission.progress||5]});
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb, null, {type: 3, progress: [0, 5]});
    });
};

/**
 * @param cb
 */
MissionDao.getAllMissions = function getAllMissions(cb) {
  var redisCache = pomelo.app.get('redisCache');
  var allMissionKey = redisKeyUtil.getAllMissionKey();
  return redisCache.getAsync(allMissionKey)
    .then(function(allMission) {
      utils.log('getAllMissions', allMission);
      if (allMission) {
        return utils.invokeCallback(cb, null, utils.JSONParse(allMission, []));
      }

      return pomelo.app.get('mysqlClient').Mission
        .findAll({
          where: {
            status: 1
          },
          order: [['rank', 'ASC']],
          raw: true
        })
        .then(function(list) {
          list = list || [];
          var multi = redisCache.multi();
          multi.setex(allMissionKey, MissionDao.CONFIG.CACHE_TIME, JSON.stringify(list));
          list.forEach(function(e, i) {
            multi.hmset(redisKeyUtil.getMissionKey(list[i].id), list[i]);
          });
          multi.exec(function(e) {
            console.error(e);
          });
          return utils.invokeCallback(cb, null, list);
        });
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb, null, []);
    });
};

/**
 *
 * @param uid
 * @param missionId
 * @param mission
 * @param delay
 * @param cb
 * @returns {*}
 */
MissionDao.pushAward = function pushAward(uid, missionId, mission, delay, cb) {
  var redis = pomelo.app.get('redisInfo');
  var operators = [redis.hsetAsync(redisKeyUtil.getMissionStatusKey(uid), missionId.toString(), '1')];
  var msg = [];
  if (mission.gold) {
    operators.push(TopupDao.topup({
      uid: uid,
      gold: mission.gold,
      type: consts.CHANGE_GOLD_TYPE.MISSION_AWARD,
      msg: 'Cộng tiền nhiệm vụ ' + missionId
    }));
    msg.push(mission.gold + ' vàng');
  }
  if (mission.exp) {
    operators.push(TopDao.add({
      uid: uid,
      attr: 'exp',
      point: mission.exp
    }));
    msg.push(mission.exp + ' điểm kinh nghiệm');
  }

  return Promise.delay(delay).all(operators)
    .spread(function() {
      return NotifyDao.push({
        type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
        title: code.MISSION_LANGUAGE.TITLE,
        msg: [code.MISSION_LANGUAGE.MSG, msg.join(' và '), mission.name],
        buttonLabel: 'OK',
        command: {target: consts.NOTIFY.TARGET.GO_MISSION},
        scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
        users: [uid],
        image:  consts.NOTIFY.IMAGE.AWARD
      })
    })
    .then(function() {
      return utils.invokeCallback(cb, null, null);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb, null, null);
    });
};

MissionDao.CONFIG = {
  CACHE_TIME: 300
};

MissionDao.ID = {
  SHARE: 1,
  MOI_BAN_FB: 2,
  CHOI_2_GIO: 3,
  CHOI_10_CARO: 4,
  CHOI_4_CO_TUONG: 5,
  CHOI_8_CO_UP: 6,
  CHOI_8_CO_VUA: 7,
  MUA_VAT_PHAM: 8,
  ELO_1200: 9,
  ELO_1400: 10,
  ELO_1600: 11,
  ELO_1800: 12,
  ELO_2000: 13,
  GOLD_1M: 14,
  GOLD_5M: 15,
  GOLD_10M: 16,
  NAP_LAN_DAU: 17,
  CHOI_30: 18,
  CHOI_100: 19,
  CHOI_500: 20,
  CHOI_1000: 21,
  CHOI_2000: 22,
  LIKE_FANPAGE: 23,
  UPLOAD: 24,
  CHOI_15_GIO: 25,
  CHOI_10_LIET_CHAP: 26,
  THANG_VAN_150000: 27,
  THANG_TONG_1M: 28
};

MissionDao.EFFECT = {
  1: 1, // missionId => effect
  2: 3,
  23: 5
};

MissionDao.EFFECT_MAP = {
  1: 1,
  5: 23
};

MissionDao.COMMAND = {
  4: {target: consts.NOTIFY.TARGET.GO_LOBBY, extra: consts.GAME_ID.CARO},
  5: {target: consts.NOTIFY.TARGET.GO_LOBBY, extra: consts.GAME_ID.CO_TUONG},
  6: {target: consts.NOTIFY.TARGET.GO_LOBBY, extra: consts.GAME_ID.CO_UP},
  7: {target: consts.NOTIFY.TARGET.GO_LOBBY, extra: consts.GAME_ID.CO_VUA},
  8: {target: consts.NOTIFY.TARGET.GO_SHOP},
  17: {target: consts.NOTIFY.TARGET.GO_TOPUP},
  26: {target: consts.NOTIFY.TARGET.GO_LOBBY, extra: consts.GAME_ID.CO_TUONG}
};
