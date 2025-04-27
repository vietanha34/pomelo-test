/**
 * Created by vietanha34 on 7/3/14.
 */
var util = require('util');
var utils = require('../../util/utils');
var lodash = require('lodash');
var consts = require('../../consts/consts');

module.exports.beforeStartup = function (app, cb) {
  // do some operations before application start up
  cb();
};


module.exports.afterStartup = function (app, cb) {
  // do some operations after application start up
  cb()
};

module.exports.beforeShutdown = function (app, cb) {
  // do some operations before application shutdown down
  cb();
};

module.exports.afterStartAll = function (app) {
  // do some operations after all applications start up
  var curServer = app.curServer;
  var hallConfigs = app.get('dataService').get('hallConfig').data;
  var gameServers = app.getServersByType('game');
  if (curServer.id === 'district-server-1') {
    var gameIds = lodash.values(consts.GAME_ID);
    for (var i = 0, len = gameIds.length; i < len; i++) {
      var gameId = gameIds[i];
      for (var j = 1, lenj = 10; j < lenj; j++) {
        var hallConfig = hallConfigs['' + gameId + j];
        if (hallConfig) {
          var gameServersByGameId = lodash.filter(gameServers, { gameId: gameId});
          var hallId = parseInt(hallConfig.hallId);
          for (var z = 1, lenz = parseInt(hallConfig.numRoom); z <= lenz; z++) {
            app.rpc.game.gameRemote.createRoom.toServer(gameServersByGameId[z % gameServersByGameId.length].id, hallConfig, hallId * 100 + z, z > hallConfig.numRoomShow ? 0 : 1,function () {})
          }
        }
      }
    }
  }
  app.set('maintenance', null);
};
