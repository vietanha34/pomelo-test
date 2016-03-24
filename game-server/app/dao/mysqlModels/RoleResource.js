/**
 * Created by vietanha34 on 3/4/16.
 */

/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('RoleResource', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey : true
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue : 0
    },
    access: {
      type: DataTypes.STRING
    },
    operation: {
      type : DataTypes.STRING
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
};
