/**
 * Created by vietanha34 on 9/23/15.
 */

var pomelo = require('pomelo');
var consts = require('../consts/consts');
var utils = require('../util/utils');
var code = require('../consts/code');
var Promise = require('bluebird');
var redisKeyUtil = require('../util/redisKeyUtil');
var lodash = require('lodash');
var moment = require('moment');
var TopupDao = require('../dao/topupDao');
var ItemDao = module.exports;

ItemDao.durationMap = {
  3: 'price1',
  7: 'price2',
  30: 'price3'
};

/**
 *
 * @param uid
 * @param itemId
 * @param duration (3,7,30)
 * @param cb
 */
ItemDao.buy = function buy(uid, itemId, duration, cb) {
  if (!itemId || !duration || [3,7,30].indexOf(duration) == -1) {
    return utils.invokeCallback(cb, 'invalid param buy item');
  }

  // lấy thông tin vật phẩm, kiểm tra tồn tại, kiểm tra hòm đồ
  var query = 'SELECT vipLevel, '+ItemDao.durationMap[duration]+' as price, discount, u.expiredAt ' +
                'FROM Item AS i LEFT JOIN UserItem AS u ' +
                'ON i.id = u.itemId AND u.uid = :uid ' +
                'WHERE i.id = :itemId';

  var now = moment().unix();
  var item;

  var mysql = pomelo.app.get('mysqlClient');
  return mysql.sequelize
    .query(query, {
      replacements: {uid: uid, itemId: itemId},
      type: mysql.sequelize.QueryTypes.SELECT,
      raw: true
    })
    .then(function(rows) {
      item = (rows && rows.length) ? rows[0] : null;
      if (!item) throw new Error('Vật phẩm không tồn tại');

      // trừ tiền
      var discount = (item.expiredAt && item.expiredAt >= now) ? ItemDao.CONFIG.RENEW_DISCOUNT : 0;
      var gold = Math.round(item.price * (1-item.discount/100) * (1-discount));
      return TopupDao.topup({
        uid: uid,
        gold: -gold,
        type: consts.CHANGE_GOLD_TYPE.BUY_ITEM,
        msg: 'Mua vật phẩm '+itemId+' giá '+gold+' gold'
      });
    })
    .then(function(topupResult) {
      if (!topupResult || topupResult.ec) {
        return utils.invokeCallback(cb, null, {ec: topupResult.ec, msg: code.ITEM_LANGUAGE.NOT_ENOUGH_MONEY})
      }

      // thêm vào hòm đồ
      var expiredAt = Math.max(item.expiredAt||0, now) + (duration*86400);
      return mysql.UserItem
        .upsert({
          uid: uid,
          itemId: itemId,
          updatedAt: now,
          expiredAt: expiredAt
        })
        .then(function(result) {
          pomelo.app.get('redisInfo').hset(redisKeyUtil.getUserEffectKey(uid), itemId, expiredAt);

          var type = (item.expiredAt && item.expiredAt >= now)
            ? code.ITEM_LANGUAGE.RENEW
            : code.ITEM_LANGUAGE.BUY;

          return utils.invokeCallback(cb, null, {
            msg: [code.ITEM_LANGUAGE.BUY_SUCCESS, type],
            gold: topupResult.gold,
            itemId: itemId,
            duration: (expiredAt-now)
          });
        });
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb, e.stack || e);
    });
};

/**
 *
 * @param uid
 * @param type (0: shop, 1: trunk)
 * @param cb
 */
ItemDao.getItems = function getItems(uid, type, cb) {
  var query = 'SELECT * FROM Item AS i '+(type?'':'LEFT')+' JOIN UserItem AS u ' +
                  'ON i.id = u.itemId AND uid = :uid ' +
                  'WHERE `status` = 1';
  var mysql = pomelo.app.get('mysqlClient');
  return mysql.sequelize
    .query(query, {
      replacements: {uid: uid},
      type: mysql.sequelize.QueryTypes.SELECT,
      raw: true
    })
    .then(function(list) {
      for (var i=0; i<list.length; i++) {
        list[i]['duration'] = Math.max(list[i]['expiredAt'] - moment().unix(), 0);
        if (!list[i]['duration'] && type) {
          list.splice(i, 1);
          i--;
          continue;
        }
        if (list[i]['duration']) {
          list[i]['price1'] = Math.round(list[i]['price1'] * (1-ItemDao.CONFIG.RENEW_DISCOUNT));
        }
        list[i]['itemId'] = list[i]['id'];
        list[i]['image'] = utils.JSONParse(list[i]['image'], {id: 0});
        if (list[i]['discount']) {
          var discount = 1-(list[i]['discount']/100);
          list[i]['price1'] = Math.round(list[i]['price1'] * discount);
          list[i]['price2'] = Math.round(list[i]['price2'] * discount);
          list[i]['price3'] = Math.round(list[i]['price3'] * discount);
        }
        var dayPrice = list[i]['price1']/3;
        list[i]['save7'] = Math.round((dayPrice - list[i]['price2']/7)/dayPrice*100);
        list[i]['save30'] = Math.round((dayPrice - list[i]['price3']/30)/dayPrice*100);
      }

      lodash.sortBy(list, 'rank');
      return utils.invokeCallback(cb, null, {list: list});
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb, null, {list: []});
    });
};

/**
 * kiểm tra các effect của user
 * @param uid
 * @param effects
 * @param cb
 *
 * @return effect object VD: {1: 1, 3: 1, 13: 2}
 */
ItemDao.checkEffect = function checkEffect(uid, effects, cb) {
  if (!effects || !effects.length) {
    effects = Object.keys(consts.ITEM_EFFECT).map(function(k){return consts.ITEM_EFFECT[k]});
  }
  if (!uid) {
    return utils.invokeCallback(cb, 'invalid param check effect');
  }

  var hasVip = false;
  if (effects.indexOf(consts.ITEM_EFFECT.THE_VIP) >= 0) {
    hasVip = true;
    effects.push(14);
    effects.push(15);
  }

  effects.sort(function(a,b){return a - b});

  var levelIndex = effects.indexOf(consts.ITEM_EFFECT.LEVEL);
  if (levelIndex >= 0) {
    effects.splice(levelIndex, 0, 6);
  }

  var now = moment().unix();
  var effectKey = redisKeyUtil.getUserEffectKey(uid);
  return pomelo.app.get('redisInfo')
    .hmgetAsync(effectKey, effects)
    .then(function(results) {
      results = results || [];
      var effectObj = {};
      var n = hasVip ? results.length-3: results.length;
      for (var i=0; i<n; i++) {
        if (results[i] >= now)
          effectObj[effects[i]] = 1;
      }
      if (hasVip) {
        for (var j=3; j>=1; j--) {
          if (results[i+j-1] >= now)
            effectObj[consts.ITEM_EFFECT.THE_VIP] = j;
        }
      }
      if (levelIndex >= 0) {
        if (results[levelIndex+1] >= now)
          effectObj[consts.ITEM_EFFECT.LEVEL] = 10;
        else if (results[levelIndex] >= now)
          effectObj[consts.ITEM_EFFECT.LEVEL] = 5;
      }

      utils.log('EFFECT: ', effectObj);

      return utils.invokeCallback(cb, null, effectObj);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb, null, {});
    });
};

/**
 * Tặng vật phẩm
 * @param uid
 * @param itemId
 * @param duration (phút)
 * @param cb
 */
ItemDao.donateItem = function donateItem(uid, itemId, duration, cb) {
  if (!uid || !itemId || !duration) {
    return utils.invokeCallback(cb, 'invalid param donate item');
  }

  var now = moment().unix();
  var mysql = pomelo.app.get('mysqlClient');
  var expiredAt;

  return mysql.UserItem
    .findOne({
      attributes: ['expiredAt'],
      where: {uid: uid, itemId: itemId}
    })
    .then(function(item) {
      expiredAt = item ? Math.max(item.expiredAt||0, now) : now;
      expiredAt += (duration*60);
      return mysql.UserItem
        .upsert({
          uid: uid,
          itemId: itemId,
          updatedAt: now,
          expiredAt: expiredAt
        })
    })
    .then(function(result) {
      pomelo.app.get('redisInfo').hset(redisKeyUtil.getUserEffectKey(uid), itemId, expiredAt);

      return utils.invokeCallback(cb, null, expiredAt);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb, e.stack || e);
    });
};

ItemDao.CONFIG = {
  RENEW_DISCOUNT: 0.2
};
