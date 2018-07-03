/**
 * Created by vietanha34 on 5/12/15.
 */

var async = require('async');
var Code = require('../consts/code');
var consts = require('../consts/consts');
var utils = require('../util/utils');
var pomelo = require('pomelo');
var rp = require('request-promise');
var qs = require('querystring');

var VideoAdsService = function (app, opts) {
  this.app = app;
};

VideoAdsService.prototype.getAds = function (opts, cb) {
  return rp({
    uri: 'http://10.2.10.88:8090/ads/get',
    qs: {username: opts.username || 'laanhdo', platform: opts.platform, appId: consts.PR_ID, version: opts.version || 'default'},
    json: true,
    timeout: 5000
  })
    .then(function (data) {
      return utils.invokeCallback(cb, null, data)
    })
    .catch(function (err) {
      console.error(err);
      utils.log(err);
      return utils.invokeCallback(cb, null, {ec: Code.EC.NORMAL})
    })
};

VideoAdsService.prototype.markAds = function (opts, cb) {
  return rp({
    uri: 'http://10.2.10.88:8090/ads/mark',
    qs: {username: opts.username || 'laanhdo', platform: opts.platform, appId: consts.PR_ID, id: opts.id, type: opts.type||0},
    json: true,
    timeout: 5000
  })
    .then(function (data) {
      return utils.invokeCallback(cb, null, data)
    })
    .catch(function (err) {
      return utils.invokeCallback(cb, null, {ec: Code.EC.NORMAL})
    })
};

VideoAdsService.prototype.available = function (platform, cb) {
  return pomelo.app.get('redisCache')
    .getAsync('videoAds:available')
    .then(function (data) {
      if (data) {
        data = utils.JSONParse(data, {});
        console.log('data : ', data, typeof data, platform);
        return utils.invokeCallback(cb, null, JSON.stringify(data[platform]) || '[]');
      } else {
        return rp({
          uri: 'http://10.2.10.88:8090/ads/available',
          qs: {appId: consts.PR_ID, version: '2.0.1'},
          json: true,
          timeout: 5000
        })
          .then(function (body) {
            if (body) {
              console.log('body : ', body, typeof body);
              if (body.ec === 0) {
                pomelo.app.get('redisCache')
                  .set('videoAds:available', JSON.stringify(body['data']));
                pomelo.app.get('redisCache').expire('videoAds:available', 2 * 60);
                return utils.invokeCallback(cb, null, JSON.stringify(body['data'][platform]))
              } else {
                return utils.invokeCallback(cb, null, '[]')
              }
            }
            else {
              return utils.invokeCallback(cb, null, '[]');
            }
          })
      }
    })
    .catch(function (err) {
      console.error(err);
      utils.log(err);
      return utils.invokeCallback(cb, null, '[]');
    })
};

module.exports = VideoAdsService;
