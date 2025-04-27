
const MYSQL_CONFIG = require('../config/mysqlClient.json').production
const models = require('../app/dao/mysqlModels/index');
const db = models(MYSQL_CONFIG)
const moment = require('moment')


async function main () {
  const tours = await db.Tournament.findAll({
    where: {
      type: 1,
      status: 3,
      schedule: {
        $gt: moment(new Date(2018, 1, 14)).unix()
      }
    },
    order: 'schedule asc',
    raw: true
  })

  for (let i = 0, leni = tours.length; i < leni; i++) {
    let tour = tours[i];
    console.log('reCal tour: ', tour.tourId)
    let result = await RecalTourTable (tour.tourId)
    db.Guild.update({
      fame: db.sequelize.literal('fame + ' + result[0])
    }, {
      where: {
        id: tour.guildId1
      }
    })
    db.Guild.update({
      fame: db.sequelize.literal('fame + ' + result[1])
    }, {
      where: {
        id: tour.guildId2
      }
    })
    console.log('result: ', result)
  }

}


async function RecalTourTable (tourId) {
  const tourTables = await db.TourTable.findAll({
    raw: true,
    where: {
      tourId: tourId
    }
  })
  let fameDelta = [0,0]
  let famePunish = [0,0]
  let totalScore = [0,0]
  let length = tourTables.length
  for (let i = 0, leni = tourTables.length; i < leni; i++) {
    let tourTable = tourTables[i];
    let score = tourTable.score.split('-').map((a) => {return parseFloat(a)})
    let scoreDelta = score[0] - score[1]
    totalScore[0] += score[0]
    totalScore[1] += score[1]
    let fame = [0, 0]
    if (scoreDelta) {
      if (scoreDelta > 0) {
        fame[0] = scoreDelta * 10
        fameDelta[0] += scoreDelta * 10
        fame[1] = -(scoreDelta * 10)
        fameDelta[1] -= scoreDelta * 10
      }else {
        fame[1] = Math.abs(scoreDelta) * 10
        fameDelta[1] += Math.abs(scoreDelta) * 10
        fame[0] = scoreDelta * 10
        fameDelta[0] += scoreDelta * 10
      }
    }
    console.log('update table: ', tourTable.boardId, fame, fameDelta)
    db.TourTable.update({
      fameDelta1: fame[0],
      fameDelta2: fame[1]
    }, {
      where: {
        boardId: tourTable.boardId,
        tourId: tourTable.tourId
      }
    })
    famePunish[0] -= tourTable.famePunish1
    famePunish[1] -= tourTable.famePunish2
  }



  if (totalScore[0] > totalScore[1]) {
    famePunish[0] += 5
  }else if (totalScore[0] < totalScore[1]) {
    famePunish[1] += 5
  }else {
    famePunish[0] += 3
    famePunish[1] += 3
  }
  db.GuildBattle.update({
    guildScore1: totalScore[0],
    guildScore2: totalScore[1]
  }, {
    where: {
      tourId: tourId,
      allow: 1
    }
  })
  console.log('eo hieu sao lai ra the nay: ', fameDelta, length, famePunish)
  return [Math.round(fameDelta[0] / length) + famePunish[0], Math.round(fameDelta[1] / length) + famePunish[1]]
}

main()