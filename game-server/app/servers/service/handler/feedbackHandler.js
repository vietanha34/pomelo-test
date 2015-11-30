/**
 * Created by KienDT on 12/02/14.
 */

var pomelo = require('pomelo');
var code = require('../../../consts/code');
var utils = require('../../../util/utils');

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

Handler.prototype.send = function (msg, session, next) {
  pomelo.app.get('mysqlClient').Feedback
    .create({
      uid: session.uid,
      username: session.get('username'),
      message: msg.message,
      toId: Number(msg.toId) || 0,
      image1: JSON.stringify(msg.image1) || '',
      image2: JSON.stringify(msg.image2) || ''
    })
    .then(function(res) {
      next(null, {msg: code.FEEDBACK_LANGUAGE.SUCCESS});
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      next(null, {msg: code.FEEDBACK_LANGUAGE.SUCCESS});
    });
};