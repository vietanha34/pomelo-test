/**
 * Created by vietanha34 on 3/25/16.
 */

/**
 * Created by vietanha34 on 3/25/16.
 */


module.exports = function(sequelize, DataTypes) {
  return sequelize.define('TourProfile', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    uid : {
      type : DataTypes.INTEGER,
      allowNull : false
    },
    tourId : {
      type : DataTypes.INTEGER,
      allowNull: true
    },
    win : {
      type : DataTypes.INTEGER,
      allowNull: true
    },
    lose: {
      type: DataTypes.INTEGER
    },
    draw : {
      type : DataTypes.INTEGER
    },
    status : {
      type: DataTypes.INTEGER
    },
    point : {
      type : DataTypes.INTEGER
    },
    rank : {
      type : DataTypes.INTEGER
    },
    joinDate : {
      type: DataTypes.DATE
    }
  }, {
    classMethods: {
      associate: function(models) {
      }
    }
  });
};
