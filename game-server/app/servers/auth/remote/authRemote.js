/**
 * Created by vietanha34 on 9/8/15.
 */

var utils = require('../../../util/utils');
var consts = require('../../../consts/consts');
var Code = require('../../../consts/code');
var userDao = require('../../../dao/userDao');

module.exports = function (app) {
  return new AuthRemote(app);
};

var AuthRemote = function (app) {
  this.app = app;
};

/**
 * Login hệ thống
 *
 * @param msg
 * @param cb
 */
AuthRemote.prototype.login = function (msg, cb) {
  userDao
    .login(msg)
    .then(function (res) {
      utils.invokeCallback(cb, null, res);
    })
    .catch(function (err) {
      utils.invokeCallback(cb, err);
    })
};