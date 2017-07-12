/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('User', {
    uid : {
      type : DataTypes.INTEGER.UNSIGNED,
      primaryKey : true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique : true
    },
    gold: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    },
    goldInGame : {
      type : DataTypes.BIGINT.UNSIGNED,
      allowNull : false,
      defaultValue : '0'
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ''
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue : ''
    },
    platform: {
      type: DataTypes.INTEGER(4).UNSIGNED,
      allowNull: false,
      defaultValue: '1'
    },
    distributorId: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: false,
      defaultValue: '1'
    },
    spId: {
      type: DataTypes.STRING,
      defaultValue: ''
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ''
    },
    fullname: {
      type: DataTypes.STRING,
      allowNull: true,
      unique : 'fullname_UNIQUE',
      defaultValue: ''
    },
    level: {
      type: DataTypes.INTEGER(6).UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    },
    elo : {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: false,
      defaultValue : 1000
    },
    birthday: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: '1970-01-01'
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ''
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status : {
      type : DataTypes.INTEGER(4).UNSIGNED,
      allowNull : false,
      defaultValue : '0'
    },
    accountType : {
      type : DataTypes.INTEGER(4).UNSIGNED,
      allowNull : false,
      defaultValue : '1'
    },
    sex : {
      type : DataTypes.INTEGER(4).UNSIGNED,
      allowNull : true,
      defaultValue : '1'
    },
	  hasPay: {
		  type: DataTypes.INTEGER(1).UNSIGNED,
		  allowNull: true,
		  defaultValue: 0
	  },
    ip : {
      type : DataTypes.STRING,
      allowNull: true,
      defaultValue: ''
    },
    statusMsg : {
      type : DataTypes.STRING,
      allowNull: true,
      defaultValue: ''
    },
    exp: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    },
    vipPoint: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        models.User.hasOne(models.Achievement,  { foreignKey : 'uid'})
      }
    }
  });
};
