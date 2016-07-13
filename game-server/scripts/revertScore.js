/**
 * Created by vietanha34 on 7/12/16.
 */
var mysqlConfig = require('../config/mysqlClient.json').production;
console.log('mysqlConfig : ', mysqlConfig);
var models = require('../app/dao/mysqlModels/index');
var db = models(mysqlConfig);

db
  .TourTable
  .findAll({
    where :{
      tourId : 14,
      winner : {
        $not : null
      },
      score : '0 - 0'
    },
    raw : true
  })
  .then(function (rows) {
    for (var i = 0, len = rows.length; i < len; i++) {
      var row = rows[i];
      var score;
      if (row.player1 === row.winner) {
        score = '2 - 0'
      }
      else {
        score = '0 - 2'
      }
      db.TourTable
        .update({
          score : score
        }, {
          where : {
            boardId : row.boardId
          }
        })
    }
  });