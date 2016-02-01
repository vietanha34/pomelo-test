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

/**
 * Định kì lấy về danh sách các trò chơi, khu vực từ CSDL, sau đó gửi dữ liệu về cho client
 *
 * @module Service
 * @class GameService
 * @param opts
 * @param app
 * @constructor
 */

var VideoAdsService = function (app, opts) {
  this.app = app;
};

VideoAdsService.prototype.getAds = function (opts,cb ) {
  return rp({
    uri :'http://10.2.10.88:8090/ads/get',
    qs : {username: opts.username || 'laanhdo', platform : opts.platform, appId: consts.APP_ID, version : '2.0.0'},
    json: true,
    timeout : 2000
  })
    .then(function (data){
      return utils.invokeCallback(cb, null, data)
    })
    .catch(function (err) {
      console.error(err);
      return utils.invokeCallback(cb, null, {ec: Code.FAIL})
    })
};

VideoAdsService.prototype.markAds = function (opts, cb) {
  return rp({
    uri :'http://10.2.10.88:8090/ads/mark',
    qs : {username: opts.username || 'laanhdo', platform : opts.platform, appId: consts.APP_ID, id : opts.id},
    json: true,
    timeout : 2000
  })
    .then(function (data) {
      return utils.invokeCallback(cb, null, data)
    })
    .catch(function (err) {
      console.error(err);
      return utils.invokeCallback(cb, null, { ec : Code.FAIL})
    })
};

VideoAdsService.prototype.available = function (platform, cb) {
  return rp({
    uri :'http://10.2.10.88:8090/ads/available',
    qs : {appId: consts.APP_ID, version : '2.0.0'},
    json: true,
    timeout : 2000
  })
    .then(function (body) {
      console.log('body : ', body, platform);
      if (!body.ec){
        return utils.invokeCallback(cb, null, JSON.stringify(body['data'][platform]))
      }else {
        return utils.invokeCallback(cb, null, JSON.stringify([]))
      }
    })
    .catch(function (err) {
      console.error(err);
      return utils.invokeCallback(cb, null, JSON.stringify([]));
    })
};

module.exports = VideoAdsService;


