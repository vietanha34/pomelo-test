/**
 * Created by vietanha34 on 10/10/14.
 */
var pomelo = require('pomelo');
var channelService = pomelo.app.get('channelService');
var data = {
  type : 1,
  title : 'rời bàn',
  msg : 'test rời bàn',
  bt : 2, // close button,
  tob : 1
};
channelService.broadcast('connector', 'onNotify', data,{}, function (err, res) {
  var result = res
});

var boardMaintenanceData = 'Xin vui lòng rời bàn sau ít phút nữa';
pomelo.app.game.maintenance(boardMaintenanceData);
