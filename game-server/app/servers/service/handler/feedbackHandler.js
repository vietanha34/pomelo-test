/**
 * Created by KienDT on 12/02/14.
 */

var pomelo = require('pomelo');
var code = require('../../../consts/code');
var utils = require('../../../util/utils');
var TopupDao = require('../../../dao/topupDao');
var consts = require('../../../consts/consts')
var querystring = require('querystring')
var request = require('request-promise')

module.exports = function(app) {
  return new Handler(app);
};

var REQUEST_TIMEOUT = 2000
var DEFAULT_GOLD_AWARD = 1000
var GOLD_AWARD = {
  'VN': 300
}
var URL = 'http://123.30.235.49:5688/query'

var Handler = function(app) {
  this.app = app;
};

var geoIp = function (data, cb) {
  var query = {
    ip: data.ip
  };
  return request.get(URL + '?' + querystring.stringify(query), {
    transform: utils.autoParse,
    resolveWithFullResponse: true,
    timeout: REQUEST_TIMEOUT
  })
    .then(function (response) {
      if (response.statusCode === 200) {
        return utils.invokeCallback(cb, null, response.body);
      } else {
        var error = new Error('sai token');
        error.ec = code.FAIL;
        return utils.invokeCallback(cb, null, { ec : 1});
      }
    })
    .catch(function (err) {
      console.error('geoIpService error: ', err)
      return utils.invokeCallback(cb, null, {ec : 1})
    })
};


Handler.prototype.send = function (msg, session, next) {
  if (msg.ads) {
    var realIp = utils.getIpv4FromIpv6(session.get('realIp'))
    if (msg.config) {
      return geoIp({ip: realIp})
        .then(function (location) {
          var countryCode = '';
          if (location) {
            var json = utils.JSONParse(location, {});
            if (json.ec === 0) {
              countryCode = json.data.COUNTRY_ALPHA2_CODE || 'VN';
            }else {
              countryCode = 'VN'
            }
          }else {
            countryCode = 'VN'
          }
          return next(null, {
            goldAds: GOLD_AWARD[countryCode] || DEFAULT_GOLD_AWARD
          })
        })
    }
    var adsGold = 0
    return geoIp({ip: realIp})
      .then(function (location) {
        var countryCode = '';
        if (location) {
          var json = utils.JSONParse(location, {});
          if (json.ec === 0) {
            countryCode = json.data.COUNTRY_ALPHA2_CODE || 'VN';
          } else {
            countryCode = 'VN'
          }
        }else {
          countryCode = 'VN'
        }

        adsGold = GOLD_AWARD[countryCode] || DEFAULT_GOLD_AWARD
        adsGold = msg['x2'] ? adsGold * 2 : adsGold
        return TopupDao.topup({
          uid : session.uid,
          gold : adsGold,
          msg : "Xem video ads cộng tiền, id: "+msg.id+"; platform: "+ 'instant',
          type : consts.CHANGE_GOLD_TYPE.VIDEO_ADS,
        })
      })
      .then(res => {
        next(null, {
          msg: [code.ON_GAME.FA_REWARD_ADS, adsGold.toString()],
          gold: res ? res.gold : 0,
          videoAds: {
            enable: 0
          }
        });
      })
  }
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