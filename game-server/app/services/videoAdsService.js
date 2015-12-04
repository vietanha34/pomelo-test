/**
 * Created by vietanha34 on 12/3/15.
 */
/**
 * Created by vietanha34 on 5/12/15.
 */
/**
 * Created by vietanha34 on 6/4/14.
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

VideoAdsService.prototype.getAds = function (opts) {
  rp('http://10.2.10.88:8090/ads/get' + '?' + qs.stringify({username: opts.username, platform : opts.platform, appId: consts.APP_ID}))
    .then(function () {

    })
};

VideoAdsService.prototype.markAds = function (opts) {
  rp('http://10.2.10.88:8090/ads/mark' + '?' + qs.stringify({username: opts.username, platform : opts.platform, appId: consts.APP_ID}))
    .then(function () {

    })
};

module.exports = VideoAdsService;


