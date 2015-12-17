/**
 * Created by bi on 4/27/15.
 */

var utils = require('../util/utils');
var code = require('../consts/code');
var consts = require('../consts/consts');
var TopupDao = require('../dao/topupDao');
var NotifyDao = require('../dao/notifyDao');
var UserDao = require('../dao/userDao');

module.exports = function(app) {
  app.post('/cms/topup', function(req, res) {
    var msg = ((req.method == 'POST') ? req.body : req.query);

    if (!msg.user || !msg.userId || !msg.gold || !msg.signature) {
      return res.status(500).json({ec: 500, msg: 'invalid params'});
    }

    var signalField = ['user','userId','gold'];
    if (!utils.checkSignature(msg, signalField, msg.signature, consts.CMS_SECRET_KEY)) {
      return res.status(500).json({ec: 500, msg: 'invalid signature'});
    }

    var content = 'Add gold CMS cmsUser: '+msg.user+', userId: '+msg.userId+',gold: '+msg.gold;
    TopupDao.topup(msg.userId, Number(msg.gold), consts.CHANGE_GOLD_TYPE.CMS, content, function(e, result) {
      if (e || !result || result.ec) {
        res.status(500).json({ec: 500, msg: e.stack || e});
      }
      else {
        res.json(result);
        NotifyDao.push({
          type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
          title: 'Thông báo tặng vàng',
          msg: [code.COMMON_LANGUAGE.ADD_GOLD, msg.gold],
          buttonLabel: 'OK',
          command: {target: consts.NOTIFY.TARGET.NORMAL},
          scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
          users: [msg.userId],
          image:  consts.NOTIFY.IMAGE.GOLD
        });
      }
    });
  });

  app.post('/cms/notify', function(req, res) {
    var msg = ((req.method == 'POST') ? req.body : req.query);

    if (!msg.title || !msg.message || !msg.signature) {
      return res.status(500).json({ec: 500, msg: 'invalid params'});
    }

    try {
      if (msg.title) msg.title = utils.JSONParse(msg.title);
      if (msg.message) msg.message = utils.JSONParse(msg.message);

      var checkContent = [msg.title.vi, msg.message.vi, consts.CMS_SECRET_KEY].join('|');
      var checkMd5 = MD5(checkContent);
      if (checkMd5 != msg.signature) {
        return res.status(500).json({ec: 500, msg: 'invalid signature'});
      }

      if (msg.image) msg.image = utils.JSONParse(msg.image);
      if (msg.command) msg.command = utils.JSONParse(msg.command);
      if (msg.buttonLabel) msg.buttonLabel = utils.JSONParse(msg.buttonLabel);
      if (msg.users) msg.users = utils.JSONParse(msg.users);
      msg.command.target = parseInt(msg.command.target);
      if (!msg.command.target) msg.command.target = 0;
      if (msg.gold) msg.gold = Number(msg.gold);
    }
    catch (e) {
      console.log(e.stack || e);
      res.status(500).json({ec: 3, msg: e.stack || e});
      return;
    }

    NotifyDao.push(msg, function(e, result) {
      if (e)
        res.status(500).json({ec: 3, msg: e.stack || e});
      else
        res.json(result);
    });
  });
};
