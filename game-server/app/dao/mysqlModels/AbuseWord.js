/**
 * Created by vietanha34 on 1/8/16.
 */


module.exports = function(sequelize, DataTypes) {
  return sequelize.define('AbuseWord', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    word : {
      type : DataTypes.STRING,
      allowNull: false
    }
  }, {
    createdAt: false,

    // I want updatedAt to actually be called updateTimestamp
    updatedAt: false,
    classMethods: {
      associate: function(models) {
      }
    }
  });
};
