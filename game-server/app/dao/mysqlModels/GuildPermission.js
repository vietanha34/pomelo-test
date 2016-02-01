/**
 * Created by vietanha34 on 1/19/16.
 */

/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('GuildPermission', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    resourceId: {
      type: DataTypes.STRING
    },
    permission: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
};
