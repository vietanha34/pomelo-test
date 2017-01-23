/**
 * Created by vietanha34 on 3/25/16.
 */



/**
 * Created by vietanha34 on 3/25/16.
 */


module.exports = function(sequelize, DataTypes) {
  return sequelize.define('TourTableConfig', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    gameId : {
      type : DataTypes.INTEGER,
      allowNull : false
    },
    bet : {
      type: DataTypes.INTEGER
    },
    totalTime : {
      type : DataTypes.INTEGER,
      allowNull: true
    },
    turnTime : {
      type : DataTypes.INTEGER,
      allowNull: true
    },
    timeWait: {
      type: DataTypes.INTEGER,
      defaultValue : 120000,
      comment: "Thời gian giãn cách giữa 2 trận đấu"
    },
    tourTimeWait : {
      type : DataTypes.INTEGER,
      defaultValue : 600000,
      comment: "Thời gian chờ đợi đấu thủ vào bàn đấu"
    },
    showKill : {
      type : DataTypes.INTEGER,
      defaultValue : 1,
      comment: 'cờ úp hiện quân ăn'
    },
    faceOffMode : {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'các luật cờ úp 1: bình thường, 2 : lật pháo, 3: sinh tử'
    },
    level : {
      type : DataTypes.INTEGER,
      comment : 'level đc phép vào đấu trường'
    },
    lockMode : {
      type: DataTypes.STRING
    },
    matchPlay: {
      type: DataTypes.INTEGER,
      defaultValue : 2,
      comment: 'Số ván có thể đấu'
    },
    mustWin: {
      type: DataTypes.INTEGER(4)
    },
    caroOpen : {
      type : DataTypes.INTEGER(4)
    }
  }, {
    classMethods: {
      associate: function(models) {
      }
    }
  });
};
