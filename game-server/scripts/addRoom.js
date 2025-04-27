var hallConfigs = app.get('dataService').get('hallConfig').data
var hallConfig = hallConfigs[21];
if (hallConfig) {
  var hallId = parseInt(hallConfig.hallId);
  app.rpc.game.gameRemote.createRoom.toServer('game-server-20', hallConfig, 103, 0,function () {})
  app.rpc.game.gameRemote.createRoom.toServer('game-server-20', hallConfig, 104, 0,function () {})
}