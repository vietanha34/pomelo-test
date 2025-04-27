/**
 * Created by vietanha34 on 2/14/15.
 */

var Code = require('../../../consts/code');

module.exports = function (app) {
  return new ConnectorRemote(app);
};

var ConnectorRemote = function (app) {
  this.app = app;
};

/**
 * kick người dùng bind với uid
 *
 * @param uid
 * @param cb
 */
ConnectorRemote.prototype.kick = function (uid, cb) {
  return this.app.get('sessionService').kick(uid, Code.CONFLICT, cb);
};