/**
 * Created by vietanha34 on 3/25/16.
 */


module.exports = function(sequelize, DataTypes) {
  return sequelize.define('TourGroup', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    tourId : {
      type : DataTypes.INTEGER,
      allowNull: true
    },
    index : {
      type : DataTypes.INTEGER,
      allowNull: true,
      defaultValue : 0
    },
    roundId: {
      type: DataTypes.INTEGER
    },
    numPlayer : {
      type : DataTypes.INTEGER,
      defaultValue : 0
    },
    player1: {
      type: DataTypes.INTEGER
    },
    player2: {
      type: DataTypes.INTEGER
    },
    player3: {
      type: DataTypes.INTEGER
    },
    player4: {
      type: DataTypes.INTEGER
    },
    player5: {
      type: DataTypes.INTEGER
    },
    player6: {
      type: DataTypes.INTEGER
    },
    player7: {
      type: DataTypes.INTEGER
    },
    player8: {
      type: DataTypes.INTEGER
    },
    player9: {
      type: DataTypes.INTEGER
    },
    player10: {
      type: DataTypes.INTEGER
    },
    player11: {
      type: DataTypes.INTEGER
    },
    player12: {
      type: DataTypes.INTEGER
    },
    player13: {
      type: DataTypes.INTEGER
    },
    player14: {
      type: DataTypes.INTEGER
    },
    player15: {
      type: DataTypes.INTEGER
    }
  }, {
    classMethods: {
      associate: function(models) {
      }
    }
  });
};
