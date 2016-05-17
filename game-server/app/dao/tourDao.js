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
    attributes: ['tourType', 'status', 'tourId', 'fee', 'rule','icon', 'name', 'beginTime', 'endTime', ['numPlayer', 'count'], 'champion', 'registerTime', 'roundId']
  };
  if (opts.tourId){
    condition['where']['tourId'] = opts.tourId;
  }
  return pomelo.app.get('mysqlClient')
    .Tournament
    .findAll(condition)
    .map(function (tour) {
      console.log('tour : ', tour);
      return pomelo.app.get('mysqlClient')
        .TourSchedule
        .findOne({
          where : {
            roundId : tour.roundId
          },
          raw : true,
          order : 'matchTime DESC'
        })
        .then(function (schedule) {
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
                      order: 'type ASC',
                      raw: true
                    })
                    .then(function (prize) {
                      tour['isRegister'] = isRegister;
                      tour['icon'] = utils.JSONParse(tour.icon, {id: 0, version: 0});
                      switch (tour.status) {
                        case consts.TOUR_STATUS.STARTED:
                        case consts.TOUR_STATUS.RUNNING:
                          console.log('schedule : ', schedule);
                          if (schedule && schedule.show){
                            if (moment(schedule.matchTime * 1000).isAfter(moment())){
                              tour['text'] = 'Chờ thi đấu';
                              tour['remain'] = moment(schedule.matchTime * 1000).diff(moment(), 'second');
                              //tour['remain'] = 10;
                              tour['time'] = moment(schedule.matchTime * 1000).format('HH:mm DD/MM');
                            }else if (moment(schedule.matchTime * 1000).add(4, 'hours').isAfter(moment())){
                              tour['text'] = 'Đang thi đấu';
                              tour['remain'] = moment(schedule.matchTime * 1000).add(4, 'hours').diff(moment(), 'second');
                            }else {
                              tour['text'] = 'Chờ tính điểm';
                              tour['time'] = '--:--'
                            }
                          }else {
                            tour['text'] = 'Đang xếp cặp';
                            tour['time'] = '--:--';
                          }
                          break;
                        case consts.TOUR_STATUS.PRE_START:
                          if (moment(tour.registerTime).isAfter(moment())){
                            tour['text'] = 'Nhận đăng kí';
                            tour['remain'] = moment(tour.registerTime).diff(moment(), 'second');
                            tour['time'] = moment(tour.registerTime).format('HH:mm DD/MM');
                          }else {
                            tour['text'] = 'Sắp diễn ra';
                            tour['remain'] = -1;
                            tour['time'] = moment(tour.beginTime).format('HH:mm DD/MM');
                          }
                      }
                      tour.prize = prize;
                      return Promise.resolve(tour);
                    });
                });
              break;
            case consts.TOUR_STATUS.FINISHED:
            default :
              tour['icon'] = utils.JSONParse(tour.icon, {id: 0, version: 0});
              tour['text'] = 'Đã kết thúc';
              tour['time'] = moment(tour.endTime).format('HH:mm DD/MM');
              tour['champion'] = utils.JSONParse(tour.champion, []);
              return Promise.resolve(tour)
          }
        });
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

TourDao.createTable = function (opts) {
  return pomelo.app.get('mysqlClient')
    .TourTable
    .create(opts);
};