/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('LogLogin', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    userId : {
      type : DataTypes.INTEGER,
      allowNull : false
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    deviceName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    platform: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ip : {
      type : DataTypes.STRING,
      allowNull : true
    },
    version : {
      type : DataTypes.STRING,
      allowNull : true
    },
    LoginTime: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    },
    createdAt: false,
    // I want updatedAt to actually be called updateTimestamp
    updatedAt: false
  });
};
