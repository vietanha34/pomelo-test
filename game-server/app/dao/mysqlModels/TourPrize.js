/**
 * Created by vietanha34 on 3/25/16.
 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('TourPrize', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    icon : {
      type : DataTypes.STRING,
      allowNull: true
    },
    content : {
      type : DataTypes.STRING,
      allowNull: true
    },
    type : {
      type : DataTypes.INTEGER,
      allowNull: true
    },
    gold: {
      type: DataTypes.INTEGER
    },
    tourId : {
      type: DataTypes.INTEGER
    }
  }, {
    classMethods: {
      associate: function(models) {
      }
    }
  });
};
