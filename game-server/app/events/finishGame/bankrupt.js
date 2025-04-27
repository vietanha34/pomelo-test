/**
 *
 * @param {Number} type
 * @param {Object} param
 */

const Config = require('../config');
const consts = require('../../consts/consts');
const UserDao = require('../../dao/userDao')
const formula = require('../../consts/formula')
const moment = require('moment');

module.exports.type = Config.TYPE.FINISH_GAME;
const BANKRUPT_LIMIT = 300
const BANKRUPT_FLAG = 'ct:br:'


/**
 * Event Gửi về khi có một ván chơi kết thúc
 * Dữ liệu param truyền vào có dạng Object gồm các thông tin sau
 *
 * * boardType : Dạng bàn chơi , normal, tour , private
 * * tax : phế ăn của bàn
 * * boardInfo : Định danh người dùng login
 *    * boardId : Định danh của bàn chơi
 *    * gameId : Định danh của game
 *    * tourId : Đinh danh của tour nếu có
 *    * districtId : Định danh của khu vực
 *    * matchId: Định danh của ván chơi
 *    * bet : mức tiền cược
 *    * owner : Định danh của người làm chủ bàn
 * * users : Array : mảng các phần tử gồm có các tham số như sau
 *    * uid: Định danh người chơi
 *    * result :
 *       * type : thắng hoà thua : xem thêm tại **consts.WIN_TYPE**
 *       * hand : Array : mảng bài thắng
 *       * handValue : Giá trị của mảng bài
 *       * money : số tiền thắng (+) , thua (-)
 *       * remain : Số tiền còn lại thực sự
 *       * tax : phế người chơi mất
 *       * elo : số elo thay đổi (+/-)
 *       * eloAfter : số elo sau (+/-)
 *       * exp : số exp thay đổi
 * * logs :{Object} Lưu log bàn chơi
 *
 * @param {Object} app
 * @param {Number} type
 * @param {Object} param
 */

module.exports.process = async function (app, type, param) {
  if (!param.users || param.users.length !== 2 || !param.boardInfo || !param.boardInfo.gameId || !param.boardInfo.matchId) {
    console.error('wrong param finish game: ', param);
    return;
  }
  const players = param.users
  const redisCache = app.get('redisCache')
  let now = Date.now() / 1000 | 0
  for (let i = 0, leni = players.length; i < leni; i++) {
    let player = players[i];
    console.log('bankrupt: ', player.result)
    if (player.result.remain > BANKRUPT_LIMIT) {
      continue
    }
    let { createdAt, vipPoint, gold, phone} = await UserDao.getUserProperties(player.uid, ['createdAt', 'vipPoint', 'gold', 'phone'])
    console.log('bankrupt: ', createdAt, vipPoint, gold, phone)
    if (gold < BANKRUPT_LIMIT && phone) {
      createdAt = moment(createdAt)
      let vipLevel = formula.calVipLevel(vipPoint);
      createdAt = createdAt.isValid() ? createdAt: moment()
      if (createdAt.diff(moment().subtract('7','days') < 0)) {
        continue
      }
      let lastReceive = parseInt(await redisCache.get(BANKRUPT_FLAG+player.uid))
      if (lastReceive) {
        continue
      }
      let goldBonus = 0
      if (vipLevel < 1) {
        goldBonus = 888
      }else if (vipLevel < 2){
        goldBonus = 8888
      }else if (vipLevel < 3){
        goldBonus = 20000
      }else if (vipLevel === 3){
        goldBonus = 100000
      }
      await bankService.topup({
        uid: player.uid,
        amount: goldBonus,
        log: 'Viện trợ phá sản',
        type: consts.CHANGE_GOLD_TYPE.BANKRUPT
      })
      redisCache.set(BANKRUPT_FLAG+player.uid, 1)
      redisCache.expire(BANKRUPT_FLAG+player.uid, moment().add(1,'days').startOf('day').unix() - now)
      // push dropdown
      let notify = {
        uid: player.uid,
        type:  consts.NOTIFY_TYPE.DROP_DOWN,
        title : 'Viện trợ phá sản',
        msg : 'Chúc mừng bạn đã nhận được 1 lượt viện trợ phá sản ngày hôm nay với mệnh giá ' + goldBonus,
        buttonLabel: 'OK'
      };
      setTimeout(() => {
        notificationDao.push(notify);
      }, 5000)
    }
  }
};
