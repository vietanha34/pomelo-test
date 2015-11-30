/**
 * Created by kiendt on 9/23/15.
 */

var NotifyDao = module.exports;
var pomelo = require('pomelo');
var Promise = require('bluebird');
var consts = require('../consts/consts');
var utils = require('../util/utils');
var redisKeyUtil = require('../util/redisKeyUtil');
var lodash = require('lodash');

/**
 *
 * @param params
 *  type
 *  title
 *  msg
 *  image
 *  button
 *  command
 *  scope
 *  users
 * @param cb
 */
NotifyDao.push = function topup(params, cb) {
  utils.log('pushNotify', params);
  if ((!params.type && params.type!==0) || !params.title) {
    return utils.invokeCallback(cb, 'invalid param push notify');
  }

  params.title = params.title || null;
  params.type = params.type ? Number(params.type) : consts.NOTIFY.TYPE.NOTIFY_CENTER;
  params.image = params.image || consts.NOTIFY.IMAGE.NORMAL;

  var scope = params.scope ? Number(params.scope) : 0;
  var users = (params.users && (params.users instanceof Array)) ? params.users : false;

  delete params.scope;
  delete params.users;

  if (scope == 99) { // push all
    var channelService = pomelo.app.get('channelService');
    return Promise.promisify(channelService.broadcast, channelService)
      ('connector', 'onNotify', params, {})
      .then(function (res) {
        return utils.invokeCallback(cb, null, res);
      })
      .catch(function(e) {
        console.error(e.stack || e);
        return utils.invokeCallback(cb, e.stack || e);
      });
  }
  else { // push users
    if (!users || !users.length) {
      return utils.invokeCallback('Invalid params push notify', null);
    } else {
      var statusService = pomelo.app.get('statusService');
      return Promise.promisify(statusService.pushByUids, statusService)
        (users, 'onNotify', params)
        .then(function (res) {
          return utils.invokeCallback(cb, null, res);
        })
        .catch(function(e) {
          console.error(e.stack || e);
          return utils.invokeCallback(cb, e.stack || e);
        });
    }
  }
};
