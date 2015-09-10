/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('CmsPromotion', {
    id: {
      type: DataTypes.INTEGER(10),
      allowNull: false,
	    primaryKey : true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
	  specialPromotionCard: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    start: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    },
    end: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    },
    rate: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    status: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '1'
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
};
