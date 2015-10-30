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
  if (!params.type || !params.title) {
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
    return Promise.promisify(pomelo.app.get('channelService').broadcast)
      ('connector', 'onNotify', params, {}, function (err, res) {
        if (err) {
          console.error(err);
        }
        return utils.invokeCallback(cb, err, res);
      });
  }
  else { // push users
    if (!users || !users.length) {
      return utils.invokeCallback('Invalid params push notify', null);
    } else {
      return Promise.promisify(pomelo.app.get('statusService').pushByUids)
        (users, 'onNotify', params, function (err, res) {
          if (err) {
            console.error(err);
          }
          return utils.invokeCallback(cb, err, res);
        });
    }
  }
};
