/**
 * Created by vietanha34 on 7/5/14.
 */

var Scheduler = require('pomelo-scheduler');


/**
 * Quản lý thời gian trong trò chơi
 *
 * @class Timer
 * @module GameBase
 * @param {Object} opts các thông số nhập vào , bao gồm game, board
 * @constructor
 */
var Timer = function () {
  this.scheduler = new Scheduler();
};

module.exports = Timer;

var pro = Timer.prototype;

/**
 * Thêm mời job cần thực hiện
 *
 * @method addJob
 * @param {Function} job job cần thực hiện
 * @param data
 * @param {Number} time thời gian thực hiện job
 * @returns {Number} id của job
 */
pro.addJob = function (job, data, time) {
  return this.scheduler.scheduleJob({start: Date.now() + time}, job, data);
};

/**
 * Huỷ job
 *
 * @method cancelJob
 * @param id
 * @returns {*}
 */
pro.cancelJob = function (id) {
  return this.scheduler.cancelJob(id);
};

/**
 * Lấy thời gian còn lại của job
 *
 * @method getLeftTime
 * @param id
 * @returns {*}
 */
pro.getLeftTime = function (id) {
  var timeLeft = this.scheduler.getLeftTime(id);
  if (timeLeft < 0) {
    return 0
  }
  return timeLeft
};

/**
 * Dừng toàn bộ job
 *
 * @method stop
 */
pro.stop = function () {
  console.trace('stop timer');
  this.scheduler.cancelAllJob();
};


