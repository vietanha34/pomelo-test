/**
 * Created by bi on 4/27/15.
 */

var utils = require('../util/utils');
var code = require('../consts/code');
var consts = require('../consts/consts');
var TopupDao = require('../dao/topupDao');
var NotifyDao = require('../dao/notifyDao');
var UserDao = require('../dao/userDao');
var ItemDao = require('../dao/itemDao');
var MD5 = require('MD5');

module.exports = function(app) {
  app.post('/cms/topup', function(req, res) {
    var msg = ((req.method == 'POST') ? req.body : req.query);

    if (!msg.user || !msg.userId || !msg.gold || !msg.signature) {
      return res.status(500).json({ec: 500, msg: 'invalid params'});
    }

    var checkContent = [msg.user, msg.userId, msg.gold, consts.CMS_SECRET_KEY].join('|');
    var checkMd5 = MD5(checkContent);
    if (checkMd5 != msg.signature) {
      return res.status(500).json({ec: 500, msg: 'invalid signature'});
    }

    var content = 'Add gold CMS cmsUser: '+msg.user+', userId: '+msg.userId+',gold: '+msg.gold;
    TopupDao.topup({
      uid: msg.userId,
      gold: Number(msg.gold),
      type: consts.CHANGE_GOLD_TYPE.CMS,
      msg: content
    })
      .then(function(result) {
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
        })
      })
      .catch(function(e) {
          res.status(500).json({ec: 500, msg: e.stack || e});
      });
  });

  app.post('/cms/donateItem', function(req, res) {
    var msg = ((req.method == 'POST') ? req.body : req.query);

    if (!msg.user || !msg.userId || !msg.itemId || !msg.duration || !msg.title || !msg.msg || !msg.signature) {
      return res.status(500).json({ec: 500, msg: 'invalid params'});
    }

    var checkContent = [msg.userId, msg.itemId, msg.duration, consts.CMS_SECRET_KEY].join('|');
    var checkMd5 = MD5(checkContent);
    if (checkMd5 != msg.signature) {
      return res.status(500).json({ec: 500, msg: 'invalid signature'});
    }

    ItemDao.donateItem(msg.userId, msg.itemId, msg.duration)
      .then(function(result) {
        res.json({msg: 'Tặng vật phẩm thành công'});

        NotifyDao.push({
          type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
          title: msg.title,
          msg: msg.msg,
          buttonLabel: 'OK',
          command: {target: consts.NOTIFY.TARGET.NORMAL},
          scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
          users: [msg.userId],
          image:  consts.NOTIFY.IMAGE.AWARD
        })
      })
      .catch(function(e) {
        res.status(500).json({ec: 500, msg: e.stack || e});
      });
  });

  app.post('/payment/addGold', function(req, res) {
    var msg = ((req.method == 'POST') ? req.body : req.query);

    if (!msg.username || !msg.gold || !msg.signature) {
      return res.status(500).json({ec: 500, msg: 'invalid params'});
    }

    var checkContent = [msg.username, msg.gold, consts.CMS_SECRET_KEY].join('|');
    var checkMd5 = MD5(checkContent);
    if (checkMd5 != msg.signature) {
      return res.status(500).json({ec: 500, msg: 'invalid signature'});
    }

    var content = 'Add gold from affiliate, username: '+msg.username+',gold: '+msg.gold;
    UserDao.getUserPropertiesByUsername(msg.username, ['uid'])
      .then(function(user) {
        if (!user || !user.uid) {
          throw new Error('User not exists');
          return;
        }

        return TopupDao.topup({
          uid: user.uid,
          gold: Number(msg.gold),
          type: consts.CHANGE_GOLD_TYPE.VIDEO_ADS,
          msg: content
        })
      })
      .then(function(result) {
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
        })
      })
      .catch(function(e) {
        res.status(500).json({ec: 500, msg: e.stack || e});
      });
  });

  app.post('/cms/notify', function(req, res) {
    var msg = ((req.method == 'POST') ? req.body : req.query);

    if (!msg.title || !msg.msg || !msg.signature) {
      return res.status(500).json({ec: 500, msg: 'invalid params'});
    }

    try {
      var checkContent = [msg.title, msg.msg, consts.CMS_SECRET_KEY].join('|');
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
