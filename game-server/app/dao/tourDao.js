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

TourDao.getTour = function (opts) {
  
};


TourDao.getTourTable = function (opts) {

};

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
    where : {
      type: opts.type
    },
    limit : length,
    offset: offset,
    raw : true,
    attributes : ['tourType', 'status', 'tourId','fee', 'icon', 'name', 'beginTime']
};
  switch (opts.type){
    case 1:
      //condition['include'] = {
      //  model: pomelo.app.get('mysqlClient').TourPrize,
      //  attributes: ['gold', ['content','text'], ['type','stt']]
      //};
      break;
    case 2:
    default:

  }
  return pomelo.app.get('mysqlClient')
    .Tournament
    .findAll(condition)
    .map(function (tour) {
      console.log('tour : ', tour);
      switch(tour.status){
        case consts.TOUR_STATUS.RUNNING:
        case consts.TOUR_STATUS.PRE_START:
          return pomelo.app.get('mysqlClient')
            .TourPrize
            .findAll({
              where: {
                tourId : tour.tourId
              },
              attributes: ['gold', ['content','text'], ['type','stt']],
              raw : true
            })
            .then(function (prize) {
              console.log('prize : ', prize);
              tour['icon'] = utils.JSONParse(tour.icon, { id : 0, version : 0});
              tour['rule'] = 'Cờ tướng liệt C5';
              tour['time'] = moment(tour.beginTime).format('YYYY:MM:DD');
              tour.prize = prize;
              return Promise.resolve(tour);
            });
          break;
        case consts.TOUR_STATUS.FINISHED:
        default :
          return Promise.resolve(tour);
      }
    })
    .then(function (tours) {
      tours = lodash.compact(tours);
      return utils.invokeCallback(cb, null, { tour : tours, length : length, offset: offset} );
    })
    .catch(function (err) {
      console.error('getListTour err : ', err);
      return utils.invokeCallback(cb, null, {tour: [], length : 0, offset : 0});
    })
};

TourDao.createPlayer = function (opts) {

};