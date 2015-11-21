/**
 * Created by kiendt on 9/23/15.
 */

var ProfileDao = module.exports;
var pomelo = require('pomelo');
var Promise = require('bluebird');
var consts = require('../consts/consts');
var code = require('../consts/code');
var formula = require('../consts/formula');
var utils = require('../util/utils');
var regexValid = require('../util/regexValid');
var redisKeyUtil = require('../util/redisKeyUtil');
var lodash = require('lodash');
var moment = require('moment');
var UserDao = require('./userDao');
var FriendDao = require('./friendDao');
var request = require('request-promise').defaults({transform: true});

/**
 *
 * @param uid
 * @param cb
 */
ProfileDao.getProfile = function getProfile(uid, cb) {
  var properties = ['uid', 'username', 'fullname', 'avatar', 'statusMsg', 'birthday',
                    'sex', 'address', 'phone', 'email', 'accountType', 'exp', 'vipPoint'];

  var user;
  return UserDao.getUserProperties(uid, properties)
    .then(function(userObj) {
      userObj.avatar = utils.JSONParse(userObj.avatar, {id: 0});
      var birthday = moment(userObj.birthday);
      if (birthday && birthday.unix()>100)
        userObj.birthday = birthday.format('YYYY-MM-DD');
      else userObj.birthday = undefined;

      user = userObj;

      return pomelo.app.get('mysqlClient').Achievement.findOne({where: {uid: uid}});
    })
    .then(function(achievement) {
      achievement = achievement || {};
      var list = Object.keys(consts.UMAP_GAME_NAME);
      var max = 0;
      var name, elo;
      user.gameId = 1;
      for (var i=0; i<list.length; i++) {
        name = consts.UMAP_GAME_NAME[list[i]];
        elo = achievement[name+'Elo'] || 0;
        if (elo && elo > max) {
          max = elo;
          user.gameId = list[i];
        }
      }
      user.game = consts.GAME_MAP[user.gameId];
      user.elo = max;
      user.eloLevel = formula.calEloLevel(user.elo);
      var vipPoint = user.vipPoint || 0;
      user.vipPoint = [vipPoint, formula.calVipLevel(formula.calVipLevel(vipPoint) + 1)];
      user.vipLevel = formula.calVipLevel(user.vipPoint);

      return utils.invokeCallback(cb, null, user);
    })
    .catch(function(e){
      console.error(e.stack || e);
      return utils.invokeCallback(cb, e.stack || e);
    });
};

/**
 *
 * @param uid
 * @param params
 *  fullname
 *  avatar
 *  statusMsg
 *  birthday
 *  sex
 *  address
 *  phone
 *  email
 *  oldPassword
 *  password
 *  accessToken
 * @param cb
 */
ProfileDao.updateProfile = function updateProfile(uid, params, cb) {
  if (params.avatar) { // update avatar
    var avatar = utils.JSONParse(params.avatar, null);
    if (!uid || !avatar || !avatar.id || isNaN(avatar.id)) {
      return utils.invokeCallback(cb, 'invalid params update avatar');
    }
    return UserDao.updateProperties(uid, {avatar: params.avatar})
      .then(function () {
        return utils.invokeCallback(cb, null, {});
      })
      .catch(function(e) {
        console.error(e.stack || e);
        return utils.invokeCallback(cb, e.stack || e);
      });
  }
  else { // update password or profile
    if (!uid
      || (params.password && params.password.length < 5)
      || (params.fullname && params.fullname.length < 2)
      || (params.birthday && !regexValid.validDate(params.birthday))
      || (params.sex && [0, 1, 2].indexOf(params.sex) < 0)
      || (params.phone && !regexValid.validPhone(params.phone))
      || (params.email && !regexValid.validEmail(params.email))) {
      return utils.invokeCallback(cb, 'invalid params update profile');
    }

    if (params.phone) params.phoneNumber = params.phone;

    var serviceConfig = pomelo.app.get('serviceConfig');
    return request({
      uri: serviceConfig.account.authUrl + serviceConfig.account.updateProfile,
      method: 'POST',
      headers: {Authorization: 'Bearer '+params.accessToken },
      form: params,
      resolveWithFullResponse: true
    })
      .then(function(response) {
        if (response && response.statusCode == 200) {
          if (params.oldPassword && params.password) {
            var json = utils.JSONParse(response.body);
            if (!json || json.changePassword) {
              // doi mat khau khong thanh cong
              return utils.invokeCallback(cb, null, {ec: 3, msg: code.PROFILE_LANGUAGE.WRONG_OLD_PASSWORD});
            }
            return utils.invokeCallback(cb, null, {msg: code.PROFILE_LANGUAGE.PASSWORD_SUCCESS});
          }
          else {
            return UserDao.updateProperties(uid, params)
              .then(function(){

                var mongoClient = pomelo.app.get('mongoClient');
                var Top = mongoClient.model('Top');
                Top.update({uid: uid}, {fullname: params.fullname}, {upsert: false}, function(e) {
                  if (e) console.error(e.stack || e);
                });

                return utils.invokeCallback(cb, null, {msg: code.PROFILE_LANGUAGE.SUCCESS});
              });
          }
        }
        else {
          return utils.invokeCallback(cb, 'Account service error: '+(response.statusCode || ''));
        }
      })
      .catch(function(e) {
        console.error(e.stack || e);
        return utils.invokeCallback(cb, e.stack || e);
      });
  }
};

/**
 *
 * @param params
 *  uid
 *  other
 * @param cb
 */
ProfileDao.getAchievement = function getAchievement(params, cb) {
  var res = {list: []};
  return pomelo.app.get('mysqlClient').Achievement
    .findOne({where: {uid: params.uid}})
    .then(function(achievement) {
      achievement = achievement || {};
      var list = Object.keys(consts.UMAP_GAME_NAME);
      var name, elo, max = 0;
      for (var i=0; i<list.length; i++) {
        name = consts.UMAP_GAME_NAME[list[i]];
        elo = achievement[name+'Elo'] || 0;
        res.list.push({
          gameId: Number(list[i]),
          game: consts.GAME_MAP[list[i]],
          elo: elo,
          eloLevel: code.ELO_LANGUAGE[elo],
          win: achievement[name+'Win'] || 0,
          lose: achievement[name+'Lose'] || 0,
          draw: achievement[name+'Draw'] || 0,
          giveUp: achievement[name+'GiveUp'] || 0
        });
        if (elo > max) max = elo;
      }

      achievement = null;

      if (!params.other) {
        return utils.invokeCallback(cb, null, res);
      }
      else {
        var properties = ['uid', 'statusMsg', 'username', 'fullname', 'avatar', 'vipPoint', 'gold', 'exp'];
        return UserDao.getUserProperties(params.other, properties)
          .then(function(user) {
            user = user || {};
            user.avatar = utils.JSONParse(user.avatar, {id: 0});
            var birthday = moment(user.birthday);
            if (birthday && birthday.unix()>100)
              user.birthday = birthday.format('YYYY-MM-DD');
            else user.birthday = undefined;

            user.eloLevel = code.ELO_LANGUAGE[formula.calEloLevel(max)];
            var exp = user.exp;
            user.level = formula.calLevel(exp);
            user.exp = [exp, formula.calExp(user.level + 1)];
            user.vipLevel = formula.calVipLevel(user.vipPoint);

            res.info = user;

            user = null;
            return FriendDao.checkFriendStatus(params.uid, params.other);
          })
          .then(function(status) {
            res.friendStatus = status;
            return utils.invokeCallback(cb, null, res);
          });
      }
    })
    .catch(function(e) {
      console.error(e.stack || e);
      return utils.invokeCallback(cb, null, {list: [], info: {}});
    });
};

/**
 *
 * @param params
 *  gameId
 *  uid
 *  name
 *  date
 *  page
 *  perPage
 * @param cb
 */
ProfileDao.getGameHistory = function getGameHistory(params, cb) {
  if (!params.gameId || !params.uid || (params.date && !regexValid.validDate(params.date))) {
    return utils.invokeCallback(cb, 'invalid params update avatar');
  }

  params.page = params.page || 1;
  var perPage = params.perPage || consts.PROFILE.PER_PAGE;
  if (params.date) params.date = Number(moment(params.date).format('YYYYMMDD'));
  else if (params.name) params.date = Number(moment().format('YYYYMMDD'));

  var mongoClient = pomelo.app.get('mongoClient');
  var GameHistory = mongoClient.model('GameHistory');

  var condition;
  if (!params.name || params.name.length < 2) { // TH không tìm theo tên
    condition = {
      gameId: params.gameId,
      uid: params.uid
    };
    if (params.date) condition.date = params.date;
    return GameHistory
      .find(condition)
      .skip((params.page-1)*perPage)
      .limit(perPage+1)
      .sort({ createdAt: -1 })
      .select({log: -1, date: -1})
      .lean()
      .then(function(list) {
        if (!list || !list.length) {
          return utils.invokeCallback(cb, null, {list: [], hasNext: 0, page: 1});
        }

        var logs = [];
        var hasNext = list.length > perPage ? 1 : 0;
        var uids = [];
        var otherIndex;
        var status;

        if (list.length > perPage) {
          list.splice(list.length - 1, 1);
        }

        var i;
        for (i=0; i<list.length; i++) {
          if (!list[i].uids || list[i].uids.length != 2) continue;
          otherIndex = list[i].uids[0] == params.uid ? 1 : 0;
          status = (Number(list[i].status)||1);
          status = otherIndex ? status : (status==3?1:(status==1?3:2));
          logs.push({
            matchId: list[i].matchId,
            uid: list[i].uids[otherIndex] || 0,
            name: list[i].usernames[otherIndex] || '',
            time: moment(list[i].createdAt).format('hh:mm DD/MM'),
            status: code.FIRST_LANGUAGE[(otherIndex?0:1)] + ' ' + code.WIN_LANGUAGE[status]
          });
          uids.push(list[i].uids[otherIndex]);
        }

        var Top = mongoClient.model('Top');
        return Top.find({uid: {$in: uids}}).select({uid: 1, fullname: 1})
          .then(function(users) {
            users = users || [];
            var j;
            for (i=0; i<logs.length; i++) {
              for (j = 0; j < users.length; j++) {
                if (logs[i].uid == users[j].uid) {
                  logs[i].name = users[j].fullname;
                }
              }
            }

            return utils.invokeCallback(cb, null, {
              hasNext: hasNext,
              page: params.page,
              list: logs
            });
          });
      })
      .catch(function(e){
        console.error(e.stack || e);
        utils.log(e.stack || e);
        return utils.invokeCallback(cb, null, {list: [], hasNext: 0, page: 1});
      });
  }
  else { // TH tìm theo tên
    condition = {
      gameId: params.gameId,
      uid: params.uid,
      date: params.date
    };
    return GameHistory
      .find(condition)
      .limit(500)
      .sort({ createdAt: -1 })
      .select({log: -1, date: -1})
      .then(function(list) {
        if (!list || !list.length) {
          return utils.invokeCallback(cb, null, {list: [], hasNext: 0, page: 1});
        }

        var logs = [];
        var uids = [];
        var otherIndex, uid;
        var status;

        var i;
        for (i=0; i<list.length; i++) {
          if (!list[i].uids || list[i].uids.length != 2) {
            list.splice(i, 1);
            i--;
            continue;
          }
          uid = list[i].uids.indexOf(params.uids);
          uids.push(uid);
        }

        var nameRegex = new RegExp(params.name, 'i');
        var Top = mongoClient.model('Top');
        return Top.
          find({
            uid: {$in: uids},
            $or: [
              {username: nameRegex},
              {fullname: nameRegex}
            ]
          }).
          select({uid: 1, fullname: 1})
          .then(function(users) {
            users = users || [];
            var j, count = 0;
            var isBreak = false;
            var offset = (params.page-1)*perPage;
            for (i=0; i<list.length; i++) {
              for (j = 0; j < users.length; j++) {
                if (uids[i] == users[j].uid) {
                  if (++count <= offset) break;

                  otherIndex = list[i].uids[0] == params.uid ? 1 : 0;
                  status = (Number(list[i].status)||1);
                  status = otherIndex ? status : (status==3?1:(status==1?3:2));
                  logs.push({
                    matchId: list[i].matchId,
                    uid: list[i].uids[otherIndex] || 0,
                    name: users[j].fullname || (list[i].usernames[otherIndex] || ''),
                    time: moment(list[i].createdAt).format('hh:mm DD/MM'),
                    status: code.FIRST_LANGUAGE[(otherIndex?0:1)] + ' ' + code.WIN_LANGUAGE[status]
                  });

                  if (logs.length >= perPage) {
                    isBreak = true;
                    break;
                  }
                }
              }
              if (isBreak) break;
            }
            var hasNext = (i<list.length ? 1: 0);
            list = null;
            uids = null;

            return utils.invokeCallback(cb, null, {
              hasNext: hasNext,
              page: params.page,
              list: logs
            });
          });
      })
      .catch(function(e){
        console.error(e.stack || e);
        utils.log(e.stack || e);
        return utils.invokeCallback(cb, null, {list: [], hasNext: 0, page: 1});
      });
  }
};

/**
 *
 * @param params
 *  uid
 * @param cb
 */
ProfileDao.updateUser = function updateUser(params, cb) {
  var properties = ['username', 'fullname', 'distributorId', 'platform', 'gold', 'vipPoint'];
  return UserDao.getUserProperties(params.uid, properties)
    .then(function(user) {
      if (!user || !user.fullname) return;

      user.dtId = user.distributorId || 1;
      delete user.distributorId;
      user.updatedAt = new Date();

      var mongoClient = pomelo.app.get('mongoClient');
      var Top = mongoClient.model('Top');

      Top.update({uid: params.uid}, user, {upsert: true}, function(e) {
        if (e) console.error(e.stack || e);
      });

      var Achievement = pomelo.app.get('mysqlClient').Achievement;
      Achievement
        .findOrCreate({
          where: {uid: params.uid},
          defaults: {
            username: user.username,
            userCount: 1
          }
        })
        .catch(function(e) {
          console.error(e.stack || e);
        });

      return utils.invokeCallback(cb);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb);
    });
};