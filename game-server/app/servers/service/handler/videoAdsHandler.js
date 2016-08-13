/**
 * Created by kiendt on 1/28/16.
 */

var async = require('async');
var util = require('util');
var utils = require('../../../util/utils');
var Code = require('../../../consts/code');
var consts = require('../../../consts/consts');
var TopupDao = require('../../../dao/topupDao');
var Promise = require('bluebird');
var NotifyDao = require('../../../dao/notifyDao');
var HomeDao = require('../../../dao/homeDao');
var UserDao = require('../../../dao/userDao');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../../util/redisKeyUtil');
var initCache = require('sequelize-redis-cache');
var cacher = initCache(pomelo.app.get('mysqlClient').sequelize, pomelo.app.get('redisCache'));

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

Handler.prototype.getAds = function (msg, session, next) {
  var platform = session.get('platform');
  platform = consts.VIDEO_ADS_PLATFORM_UMAP[platform] || '';
  return Promise.all([
    pomelo
      .app
      .get('videoAdsService')
      .getAds({
        platform : platform
      }),
    UserDao.getUserPropertiesRedis(session.uid, ['adsType']),
    pomelo.app.get('redisCache').getAsync(redisKeyUtil.userVideoAdsKey(session.uid))
  ])
    .spread(function (data, userRedis, userAd) {
      if (data && !data.ec && !userAd){
        if (data.data && data.data.priority) {
          for (var i = 0; i < data.data.priority.length-1; i++) {
            if (data.data.priority[i] == userRedis.adsType) {
              data.data.priority = data.data.priority.slice(i + 1).concat(data.data.priority.slice(0, i + 1))
            }
          }
        }

        next(null, {data: JSON.stringify(data.data)});
      } else {
        next(null, {ec: Code.EC.NORMAL, msg: 'Hiện tại không có video nào. Mời bạn quay lại sau'})
      }
    })
    .catch(function (err) {
      console.error(err);
      next(null, {ec : Code.EC.NORMAL, msg: 'Hiện tại không có video nào. Mời bạn quay lại sau'})
    })
};

Handler.prototype.markAds = function (msg, session, next) {
  var uid = session.uid;
  var globalConfig = pomelo.app.get('configService').getConfig();
  var redisCache = pomelo.app.get('redisCache');
  var platform = session.get('platform');
  var location = session.get('loc') || 'VN';

  var adsGold;

  return redisCache.getAsync(redisKeyUtil.userVideoAdsKey(uid))
    .then(function(userAd) {
      if (userAd) return Promise.reject({});

      return [
        pomelo.app.get('videoAdsService')
          .markAds({
            id : msg.id,
            status : msg.status || 0,
            type : msg.type,
            platform: consts.VIDEO_ADS_PLATFORM_UMAP[platform]
          }),
        cacher('AdsConfig')
          .ttl(HomeDao.CONFIG.ADS_CONFIG_CACHE_TIME)
          .findOne({
            attributes: ['gold', 'limit', 'wait'],
            where: {
              platform: platform,
              location: location
            },
            raw: true
          }),
        UserDao.getUserPropertiesRedis(uid, ['adsCount'])
      ];

    })
    .spread(function (data, adsConfig, userRedis) {
      adsConfig = adsConfig || {};
      adsGold = adsConfig.gold || globalConfig.adsGold || 100;
      var adsLimit = adsConfig.limit || globalConfig.adsLimit || 100;
      if (!data.ec && !(userRedis.adsCount && userRedis.adsCount > adsLimit)) {
        var statusService = pomelo.app.get('statusService');
        return Promise.props({
          payment : TopupDao.topup({
            uid : uid,
            gold : adsGold,
            msg : "Xem video ads cộng tiền, id: "+msg.id+"; platform: "+platform+"; location: "+location,
            type : consts.CHANGE_GOLD_TYPE.VIDEO_ADS,
            location: location
          }),
          adsConfig: adsConfig
          //,status : Promise.promisify(statusService.getStatusByUid, {context : statusService})(uid, true)
        })
      } else {
        return Promise.reject({});
      }
    })
    .then(function (result) {
      if (result.payment && !result.payment.ec) {
        next(null, {
          msg: 'Bạn được tặng '+adsGold+' vàng',
          gold: result.payment.gold,
          videoAds: {
            enable: 0
          }
        });

        var expire = result.adsConfig.wait || (globalConfig.adsWait || 10);

        setTimeout(function() {
          pomelo.app.get('videoAdsService')
            .available(consts.VIDEO_ADS_PLATFORM_UMAP[platform] || '')
            .then(function(available){
              pomelo.app.get('statusService')
                .pushByUids([uid], 'onHomeChange', {
                  videoAds: {
                    enable: 1,
                    gold: result.payment.addMoney,
                    data: available
                  }});
            });
        }, expire*1000);

        pomelo.app.get('redisCache')
          .setex(redisKeyUtil.userVideoAdsKey(uid), expire-1, uid);

        pomelo.app.get('redisInfo')
          .multi()
          .hincrby(redisKeyUtil.getPlayerInfoKey(uid), 'adsCount', 1)
          .hset(redisKeyUtil.getPlayerInfoKey(uid), 'adsType', msg.type)
          .exec();
      }
    })
    .catch(function (err) {
      console.error('video_ads_error: ', err);
      next(null, {ec: Code.EC.NORMAL, msg: 'bạn vui lòng chờ'});
    });
};
