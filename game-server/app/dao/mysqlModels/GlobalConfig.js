/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('GlobalConfig', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    key: {
      type: DataTypes.STRING,
      allowNull: true
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    label: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    },
    tableName : 'GlobalConfig',
    createdAt: false,
    updatedAt: false
  });
};
