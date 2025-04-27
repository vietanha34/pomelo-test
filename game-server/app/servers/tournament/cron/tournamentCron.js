/**
 * Created by KienDT on 3/9/15.
 */

var DailyDao = require('../../../dao/dailyDao');
var TourDao = require('../../../dao/tourDao')
var consts = require('../../../consts/consts')
var moment = require('moment')
var pomelo = require('pomelo')

module.exports = function(app) {
  return new Cron(app);
};

var Cron = function(app) {
  this.app = app;
};
var cron = Cron.prototype;

cron.finishTourFriendLy = function (cronInfo) {
  var tourManager = pomelo.app.get('tourManager')
  TourDao.getTours({
    where:{
      type: consts.TOUR_TYPE.FRIENDLY,
      status: {
        $ne: consts.TOUR_STATUS.FINISHED
      },
      schedule: {
        $lt: moment().subtract(4, 'hours').unix()
      },
    },
    attributes: ['tourId'],
    raw: true
  })
    .each(function (tour) {
      return tourManager.finishTourFriendLy(tour.tourId)
    })
};
