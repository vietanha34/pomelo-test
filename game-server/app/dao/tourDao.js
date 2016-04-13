/**
 * Created by vietanha34 on 3/25/16.
 */

var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');
var consts = require('../consts/consts');
var utils = require('../util/utils');
var Code = require('../consts/code');
var Promise = require('bluebird');
var redisKeyUtil = require('../util/redisKeyUtil');
var lodash = require('lodash');
var TourDao = module.exports;
var UserDao = require('./userDao');
var moment = require('moment');

/**
 * Lấy danh sách giải đấu
 *
 * @param opts
 * @param cb
 */
TourDao.getListTour = function (opts, cb) {
  var length = opts.length || 1;
  var offset = opts.offset || 0;
  var condition = {
    where: {
      type: opts.type
    },
    limit: length,
    offset: offset,
    raw: true,
    attributes: ['tourType', 'status', 'tourId', 'fee', 'icon', 'name', 'beginTime', 'endTime', 'numPlayer']
  };

  return pomelo.app.get('mysqlClient')
    .Tournament
    .findAll(condition)
    .map(function (tour) {
      console.log('tour : ', tour);
      switch (tour.status) {
        case consts.TOUR_STATUS.STARTED:
        case consts.TOUR_STATUS.RUNNING:
        case consts.TOUR_STATUS.PRE_START:
          return Promise.delay(0)
            .then(function () {
              if (tour.type === 1) {
                return Promise.resolve(0)
              } else {
                return pomelo.app.get('mysqlClient')
                  .TourProfile
                  .count({
                    where: {
                      tourId: tour.tourId,
                      uid: opts.uid
                    },
                    raw: true
                  })
              }
            })
            .then(function (count) {
              var isRegister = 0;
              if (count > 0) {
                isRegister = 1
              }
              return pomelo.app.get('mysqlClient')
                .TourPrize
                .findAll({
                  where: {
                    tourId: tour.tourId
                  },
                  attributes: ['gold', ['content', 'text'], ['type', 'stt']],
                  raw: true
                })
                .then(function (prize) {
                  console.log('prize : ', prize);
                  tour['isRegister'] = isRegister;
                  tour['icon'] = utils.JSONParse(tour.icon, {id: 0, version: 0});
                  tour['rule'] = 'Cờ tướng liệt C5';
                  tour['time'] = moment(tour.beginTime).format('YYYY:MM:DD');
                  tour.prize = prize;
                  return Promise.resolve(tour);
                });
            });
          break;
        case consts.TOUR_STATUS.FINISHED:
        default :
          tour['icon'] = utils.JSONParse(tour.icon, {id: 0, version: 0});
          tour['time'] = moment(tour.endTime).format('YYYY:MM:DD');
          tour['champion'] = [
            {
              stt: 1,
              uid: 1,
              avatar: {"id": 4, "version": 1449114274},
              fullname: 'Việt Anh',
              gold: 100000,
              text: '1 SHi'
            },
            {
              stt: 2,
              uid: 2,
              avatar: {"version": 1449719551, "id": 5},
              fullname: 'Văn gà',
              gold: 100000,
              text: '1 lx 150cc'
            },
            {
              stt: 3,
              uid: 3,
              avatar: {"version": 1449026406, "id": 6},
              fullname: 'Tuấn Anh',
              gold: 100000,
              text: 'dylan tàu'
            }
          ];
          return Promise.resolve(tour)
      }
    })
    .then(function (tours) {
      tours = lodash.compact(tours);
      return utils.invokeCallback(cb, null, {tour: tours, length: length, offset: offset});
    })
    .catch(function (err) {
      console.error('getListTour err : ', err);
      return utils.invokeCallback(cb, null, {tour: [], length: 0, offset: 0});
    })
};

TourDao.getTour = function (opts, cb) {
  return pomelo.app.get('mysqlClient')
    .Tournament
    .findOne(opts)
    .then(function (tour) {
      return utils.invokeCallback(cb, null, tour)
    })
};

TourDao.getTourProfile = function (opts, cb) {
  return pomelo.app.get('mysqlClient')
    .TourProfile
    .findAll(opts)
};

TourDao.getTourRound = function (opts, cb) {
  return pomelo.app.get('mysqlClient')
    .TourRound
    .findAll(opts)
};

TourDao.getTourTable = function (opts, cb) {
  return pomelo.app.get('mysqlClient')
    .TourTable
    .findAll(opts)
};

TourDao.getTourGroup = function (opts, cb) {
  return pomelo.app.get('mysqlClient')
    .TourGroup
    .findAll(opts)
};