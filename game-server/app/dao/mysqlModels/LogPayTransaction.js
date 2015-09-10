/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('LogPayTransaction', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
	    primaryKey : true,
	    autoIncrement : true
    },
    chargeType: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: -1
    },
    type: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: -1
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    purchaseDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    text: {
      type: DataTypes.STRING,
      allowNull: true
    },
    money: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    platform: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: -1
    },
    chip: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '0'
    },
    bonus: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '0'
    },
    distributorId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '1'
    },
    spId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ''
    },
	  info: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ''
    },
	  cardCode: {
		  type: DataTypes.STRING,
		  allowNull: true,
		  defaultValue: ''
	  },
	  serial: {
		  type: DataTypes.STRING,
		  allowNull: true,
		  defaultValue: ''
	  },
    status: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: 0
    },
	  uid: {
		  type: DataTypes.BIGINT,
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
