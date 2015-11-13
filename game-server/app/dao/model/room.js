/**
 * Created by vietanha34 on 11/27/14.
 */

var uuid = require('uuid');

module.exports = function Room(opts) {
  this.name = opts.name || '';
  this.roomId = opts.roomId || uuid.v4();
  this.members = opts.members;
  this.numUser = opts.numUser || opts.members.length;
};