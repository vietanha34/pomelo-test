/**
 * Created by vietanha34 on 3/4/16.
 */

/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Resource', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey : true
    },
    resourceName: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
};
