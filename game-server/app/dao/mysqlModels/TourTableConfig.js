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
    uid : {
      type : DataTypes.STRING,
      allowNull : false
    },
    tourId : {
      type : DataTypes.DATEONLY,
      allowNull: true
    },
    win : {
      type : DataTypes.DATEONLY,
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
