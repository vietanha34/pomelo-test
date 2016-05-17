/**
 * Created by vietanha34 on 3/25/16.
 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('TourSchedule', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    matchTime : {
      type : DataTypes.INTEGER,
      allowNull: true
    },
    matchMaking : {
      type : DataTypes.INTEGER(4),
      defaultValue : 0
    },
    roundId : {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    show : {
      type : DataTypes.INTEGER(4),
      defaultValue : 0
    }
  }, {
    classMethods: {
      associate: function(models) {
        models.TourSchedule.hasOne(models.TourRound, { foreignKey : 'roundId'})
      }
    },
    index : [
      {
        fields : ['matchTime']
      },
      {
        fields : ['roundId']
      }
    ]
  });
};
