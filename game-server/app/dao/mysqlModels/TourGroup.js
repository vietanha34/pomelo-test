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
    battleType : {
      type : DataTypes.INTEGER,
      allowNull: true
    },
    lose: {
      type: DataTypes.INTEGER
    },
    draw : {
      type : DataTypes.INTEGER
    },
    point : {
      type : DataTypes.INTEGER
    },
    status : {
      type: DataTypes.DATE
    },
    groupId: {
      type: DataTypes.INTEGER
    }
  }, {
    classMethods: {
      associate: function(models) {
      }
    }
  });
};
