/**
 * Created by vietanha34 on 1/9/15.
 */

var channelUtil = require('../../util/channelUtil');
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var utils = require('../../util/utils');
var dataApi = require('../../util/dataApi');
var async = require('async');
var lodash = require('lodash');
var Tour = require('./tour');


var TourManager = function (opts) {
  this.tours = {}
};

module.exports = TourManager;

pro = TourManager.prototype;

pro.createTour = function (tourId, cb ) {
  var TourModel = pomelo.app.get('mongoClient').model('tours');
  var self = this;
  TourModel.findById(tourId, function (err, tour) {
    if (!err && tour) {
      var currentTime = tour.getCurrentDay();
      var bet;
      if (currentTime && !tour.final){
        bet = currentTime.chip || tour.chipPlayed;
      }else {
        bet = tour.chipPlayed;
      }
      var tourConfig = dataApi.tourConfig.findById(tour.gameId);
      self.tours[tour._id] = new Tour({
        gameId : tour.gameId,
        tourId : tour._id,
        bet : bet,
        name : tour.name,
        final : tour.final,
        matchTurn : tour.matchTurn,
        minPlayer : tourConfig.minPlayer || 2,
        maxPlayer : tourConfig.maxPlayer  || 4
      });
    }
    utils.invokeCallback(cb, err, tour)
  });
};

pro.deleteTour = function (tourId) {
  var tour = this.getTour(tourId);
  if (tour) {
    tour.close();
    delete this.tours[tourId];
  }
};

pro.getTour = function (tourId) {
  return this.tours[tourId];
};