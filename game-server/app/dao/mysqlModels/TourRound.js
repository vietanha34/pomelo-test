/**
 * Created by vietanha34 on 4/7/16.
 */

/**
 * Created by vietanha34 on 3/25/16.
 */


module.exports = function(sequelize, DataTypes) {
  return sequelize.define('TourRound', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    name :{
      type: DataTypes.STRING
    },
    status : {
      type: DataTypes.INTEGER(4)
    },
    tourId : {
      type : DataTypes.INTEGER,
      allowNull: true
    },
    battleType : {
      type : DataTypes.INTEGER,
      allowNull: true
    },
    tableConfigId: {
      type: DataTypes.INTEGER
    },
    numGroup : {
      type: DataTypes.INTEGER
    },
    numRound : {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    type : {
      type: DataTypes.INTEGER
    },
    scheduleId : {
      type: DataTypes.INTEGER
    }
  }, {
    classMethods: {
      associate: function(models) {
        //models.TourRound.hasMany(models.TourGroup,  {foreignKey : 'roundId'})
        models.TourRound.hasOne(models.TourTableConfig, {foreignKey : 'tableConfigId'})
      }
    }
  });
};
