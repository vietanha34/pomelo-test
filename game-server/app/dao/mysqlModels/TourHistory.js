/**
 * Created by vietanha34 on 4/11/16.
 */

/**
 * Created by vietanha34 on 3/25/16.
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
      type : DataTypes.INTEGER
    },
    matchId: {
      type: DataTypes.STRING
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
