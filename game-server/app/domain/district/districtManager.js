"use strict";
/**
 * Created by vietanha34 on 11/1/16.
 */


const lodash = require('lodash');
const Promise = require('bluebird');

let DistrictManager = function (app){
  this.inter = 1000 * 60;
  setInterval(checkScale, this.inter, app);
};

let pro = DistrictManager.prototype;

module.exports = DistrictManager;

let checkScale = function (app) {
  let curServer = app.curServer;
  let hallConfigs = app.get('dataService').get('hallConfig').data;
  if (curServer.id === 'district-server-1') {
    Promise.each(lodash.values(hallConfigs), function (hallConfig) {
      app.get('boardService').getRoom({
        where : {
          roomId : hallConfig.roomId,
          gameId : hallConfig.gameId
        },
        raw : true
      })
        .then(function (rooms) {
          let roomHide = lodash.filter(rooms, {show: 0});
          let roomAvailable = lodash.filter(rooms, { show : 1});
          if (lodash.sum(roomAvailable, function(o){return o.progress}) > Math.floor(roomAvailable.length * 10 * 80 / 100)){
            var count = 0;
            for (var i = 0, len = roomHide.length; i < len; i++) {
              count ++;
              var room = roomHide[i];
              app.get('boardService').updateRoom({
                gameId: room.gameId,
                roomId: room.roomId,
                show: 1
              });
              if (count >= 2) {
                break;
              }
            }
          }else if (lodash.sum(roomAvailable, function(o){return o.progress}) > Math.floor(roomAvailable.length * 10 * 40 / 100)){

          }
        })
    });
  }
};