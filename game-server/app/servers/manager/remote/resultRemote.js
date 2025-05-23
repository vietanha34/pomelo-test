/**
 * Created by vietanha34 on 6/11/14.
 */

var consts = require('../../../consts/consts');
var utils = require('../../../util/utils');
var async = require('async');
var logger = require('pomelo-logger').getLogger('poker', __filename);
var messageService = require('../../../services/messageService');
var userDao = require('../../../dao/userDao');
var request = require('request');
var Code = require('../../../consts/code');
var lodash = require('lodash');
var pomelo = require('pomelo');
var util = require('util');

module.exports = function (app) {
  return new ResultRemote(app);
};

var ResultRemote = function (app) {
  this.app = app
};

var pro = ResultRemote.prototype;

/**
 * logging management with data
 *
 * * boardType : Dạng bàn chơi , normal, tour , private
 * * tax : phế ăn của bàn
 * * users : Array : mảng các phần tử gồm có các tham số như sau
 *    * uid: Định danh người chơi
 *    * result :
 *       * type : thắng hoà thua : xem thêm tại **consts.WIN_TYPE**
 *       * eventType : eventType
 *       * hand : Array : mảng bài thắng
 *       * money : số tiền thắng (+) , thua (-)
 *       * remain : Số tiền còn lại
 * * boardInfo : Định danh người dùng login
 *    * boardId : Định danh của bàn chơi
 *    * gameId : Định danh của game
 *    * tourId : Đinh danh của tour nếu có
 *    * districtId : Định danh của khu vực
 *    * matchId: Định danh của ván chơi
 *    * bet : mức tiền cược
 *    * owner : Định danh của người làm chủ bàn
 * * logs :{Object} Lưu log bàn chơi
 * --------------------
 * * response Data
 * users {Object} : Object có key là uid, value là đối tượng bên dứoi
 *    * uid : Định danh người chơi
 *    * level : level hiện tại
 *    * upLevel : {Boolean} : lên level
 *    * xp : mảng các giá trị thông tin, xp, thiện chiến ...
 *    * goldReward :{optional} Số tiền được thưởng khi lên level
 *
 * @param logs
 * @param cb
 */

pro.management = function (logs, cb) {
  console.log('manager : ', util.inspect(logs,{depth : null}));
  var self = this;
  utils.invokeCallback(cb, null, {});
  // TODO , Đồng bộ dữ liệu
  var redisInfo = this.app.get('redisInfo');
  async.map(logs.users, function (user, done) {
    userDao.getUserProperties(user.uid, ['gold', 'uid'], done)
  }, function (err, results) {
    results = lodash.compact(results);
    for (var i = 0, len = results.length; i < len; i++) {
      var result = results[i];
      var index = lodash.findIndex(logs.users, 'uid', result.uid);
      if (index > -1) {
          logs.users[index].result.remain = parseInt(result.gold) || 0 + logs.users[index].result.remain || 0;
      }
    }
    self.app.rpc.event.eventRemote.emit(null, self.app.get('emitterConfig').FINISH_GAME , logs, function () {});
  });
  if ([consts.GAME_ID.CO_TUONG, consts.GAME_ID.CO_UP, consts.GAME_ID.CO_VUA, consts.GAME_ID.CO_THE].indexOf(logs.boardInfo.gameId) > -1){
    var GameLog = this.app.get('mongoClient').model('GameLog1');
    if (logs.logs && logs.logs.status && logs.logs.status.boards) {
      
    }
    console.log(logs.logs);
    var log = new GameLog(logs.logs);
    log.save(function (err) {
      if (err){
        console.error('err : ', err);
      }
    });
  }
};





