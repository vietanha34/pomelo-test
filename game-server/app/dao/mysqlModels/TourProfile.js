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
      type : DataTypes.INTEGER.UNSIGNED,
      allowNull : false
    },
    tourId : {
      type : DataTypes.INTEGER,
      allowNull: true
    },
    win : {
      type : DataTypes.INTEGER,
      allowNull: true,
      defaultValue : 0
    },
    lose: {
      type: DataTypes.INTEGER,
      defaultValue : 0
    },
    draw : {
      type : DataTypes.INTEGER,
      defaultValue : 0
    },
    status : {
      type: DataTypes.INTEGER,
      defaultValue : 0,
      comment : '0: normal, 1 : ban'
    },
    point : {
      type : DataTypes.INTEGER,
      defaultValue : 0
    },
    rank : {
      type : DataTypes.INTEGER
    },
    groupId: {
      type: DataTypes.INTEGER
    },
    joinDate : {
      type: DataTypes.DATE
    }
  }, {
    classMethods: {
      associate: function(models) {
        models.TourProfile.belongsTo(models.User, { foreignKey : 'uid'});

      }
    }
  });
};
