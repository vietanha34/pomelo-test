/**
 * Created by bi on 7/29/15.
 */


module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Statistic', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    date : {
      type : DataTypes.DATEONLY
    },
    totalChip : {
      type : DataTypes.BIGINT,
      allowNull: true,
      defaultValue : '0'
    },
    deltaChip : {
      type : DataTypes.BIGINT,
      allowNull: true,
      defaultValue : '0'
    }
  }, {
    classMethods: {
      associate: function(models) {
      }
    }
  });
};
