/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Language', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    vi: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ''
    },
    en: {
      type: DataTypes.STRING,
      allowNull: false
    },
    pe: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ''
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    },
    tableName : 'Language',
    createdAt: false,
    updatedAt: false
  });
};
