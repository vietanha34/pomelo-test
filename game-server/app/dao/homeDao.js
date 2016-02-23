/**
 * Created by kiendt on 9/23/15.
 */

var HomeDao = module.exports;
var pomelo = require('pomelo');
var Promise = require('bluebird');
var lodash = require('lodash');
var consts = require('../consts/consts');
var code = require('../consts/code');
var formula = require('../consts/formula');
var utils = require('../util/utils');
var redisKeyUtil = require('../util/redisKeyUtil');
var NotifyDao = require('./notifyDao');
var ItemDao = require('./itemDao');
var UserDao = require('./userDao');

HomeDao.defaultData = {
  newCount: 0,
  notifyCount: 0,
  game : [
    {gameId : 1, status : 1},
    {gameId : 2, status : 1},
    {gameId : 3, status : 1},
    {gameId : 4, status : 1},
    {gameId : 5, status : 1},
    {gameId : 6, status : 1}
  ]
};

HomeDao.defaultUser = {
  fullname: 'Chào bạn',
  avatar : {id: 0},
  uid: 1,
  gold: 0,
  level: 1,
  exp: [0,10],
  vipLevel: 0,
  eloLevel: 0
};

/**
 *
 * @param params
 * @param cb
 */
HomeDao.getHome = function getHome(params, cb) {
  var data = (params.update ? {} : utils.clone(HomeDao.defaultData));
  data.userInfo = utils.clone(HomeDao.defaultUser);
  data.userInfo.uid = params.uid;

  var effects = [
    consts.ITEM_EFFECT.LEVEL,
    consts.ITEM_EFFECT.THE_VIP
  ];

  return Promise.props({
    userInfo: UserDao.getUserProperties(params.uid, ['uid', 'username', 'fullname', 'gold', 'avatar', 'exp', 'vipPoint']),
    achievement: pomelo.app.get('mysqlClient').Achievement.findOne({where: {uid: params.uid}}),
    effect: ItemDao.checkEffect(params.uid, effects),
    cacheInfo: pomelo.app.get('redisInfo').hmgetAsync(redisKeyUtil.getPlayerInfoKey(params.uid), 'dailyReceived', 'location', 'markVideo'),
    ads: pomelo.app.get('videoAdsService').available(params.platform)
  })
    .then(function(props) {
      var globalConfig = pomelo.app.get('configService').getConfig();
      data.received = ((globalConfig.IS_REVIEW || (props.cacheInfo[1] && props.cacheInfo[1] != 'VN')) ? 1 : (Number(props.cacheInfo[0]) || 0));
      data.userInfo = props.userInfo;

      data.userInfo.gold = data.userInfo.gold || 0;
      data.userInfo.avatar = data.userInfo.avatar ? utils.JSONParse(data.userInfo.avatar, {id: 0}) : {id: 0};
      var exp = data.userInfo.exp || 0;
      data.userInfo.level = formula.calLevel(exp);
      data.userInfo.exp = [exp, formula.calExp(data.userInfo.level + 1)];
      data.userInfo.vipPoint = data.userInfo.vipPoint || 0;
      data.userInfo.vipLevel = formula.calVipLevel(data.userInfo.vipPoint);

      data.userInfo.level += (props.effect[consts.ITEM_EFFECT.LEVEL]||0);
      data.userInfo.vipLevel = Math.max(data.userInfo.vipLevel, (props.effect[consts.ITEM_EFFECT.THE_VIP]||0));
      var adsDisappear = data.userInfo.vipLevel ? 1 : 0;
      if (params.version < '20160217') {
        adsDisappear = 1;
      }
      data.ads = {
        data : props.ads,
        gold : 500,
        disable: adsDisappear
      };
      props.achievement = props.achievement || {};
      var list = Object.keys(consts.UMAP_GAME_NAME);
      var max = 0;
      var name, elo;
      var gameId = 1;
      for (var i=0; i<list.length; i++) {
        name = consts.UMAP_GAME_NAME[list[i]];
        elo = props.achievement[name+'Elo'] || 0;
        if (elo && elo > max) {
          max = elo;
          gameId = list[i];
        }
      }

      data.userInfo.eloLevel = formula.calEloLevel(max);

      if (!params.update && params.langVersion !== pomelo.app.get('gameService').langVersion){
        data.language = pomelo.app.get('gameService').language
      }

      props = null;
      return utils.invokeCallback(cb, null, data);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb, null, data);
    });
};

/**
 * Push thay đổi màn hình home
 * @param uid
 * @param change
 * @param cb
 */
HomeDao.pushInfo = Promise.promisify(function pushInfo(uid, change, cb) {
  if (!change) {
    return utils.invokeCallback(cb, 'invalid params home push info');
  }

  var redis = pomelo.app.get('redisInfo');
  if (uid) {
    var userKey = redisKeyUtil.getPlayerInfoKey(uid);
    if (change.chatCount || change.chatCount===0 || change.friendNotifyCount || change.friendNotifyCount===0) {
      change = JSON.parse(JSON.stringify(change));
      var attr1 = change.chatCount ? 'friendNotifyCount' : 'chatCount';
      var attr2 = change.chatCount ? 'chatCount' : 'friendNotifyCount';
      redis.hget(userKey, attr1, function(e, count) {
        if (e) console.error(e);
        else {
          change.friendCount = Number(change[attr2]) + (count?Number(count):0);
          delete change[attr2];
          pomelo
            .app
            .get('statusService')
            .pushByUids([uid], 'home.homeHandler.updateHome', change, function (e, res) {
              if (e) console.error(e);
            });
        }
      });
    }
    else {
      pomelo.app.get('statusService')
        .pushByUids([uid], 'home.homeHandler.updateHome', change, function (e, res) {
          if (e) console.error(e);
        });
    }
    redis.hmset(userKey, change, function(e, res) {
      utils.invokeCallback(cb, e, res);
      if (e) console.error(e);
    });
  }
  else {
    pomelo.app.get('channelService')
      .broadcast('connector', 'home.homeHandler.updateHome', change, {}, function (e, res) {
        if (e) console.error(e);
      });
    var homeKey = HomeDao.redis.getHomeKey();
    HomeDao.homeInfo = HomeDao.homeInfo || {};
    for (var attr in change) {
      HomeDao.homeInfo[attr] = change[attr];
    }
    redis.hmset(homeKey, change, function(e, res) {
      utils.invokeCallback(cb, e, res);
      if (e) console.error(e);
    });
  }
});