/**
 * Created by vietanha34 on 4/11/16.
 */


module.exports = function(sequelize, DataTypes) {
  return sequelize.define('TourHistory', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    firstPlayerName : {
      type : DataTypes.STRING,
      allowNull: true
    },
    firstPlayerUid : {
      type : DataTypes.INTEGER,
      allowNull: true
    },
    secondPlayerName: {
      type: DataTypes.STRING
    },
    secondPlayerUid : {
      type : DataTypes.INTEGER
    },
    result: {
      type : DataTypes.STRING
    },
    match: {
      type: DataTypes.STRING
    },
    round : {
      type : DataTypes.INTEGER,
      comment: '1 : vòng 1/8, 2 : vòng 1/4, 3 : trận chung kết'
    },
    tourId: {
      type: DataTypes.INTEGER
    }
  }, {
    classMethods: {
      associate: function(models) {
      }
    }
  });
};
