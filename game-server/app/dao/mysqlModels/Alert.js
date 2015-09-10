/**
 * Created by bi on 7/29/15.
 */

module.exports = function(sequelize, DataTypes) {
	var Alert =  sequelize.define('Alert', {
		id: {
			type: DataTypes.BIGINT,
			allowNull: false,
			primaryKey : true,
			autoIncrement : true
		},
		title : {
			type : DataTypes.STRING,
			allowNull: false,
			defaultValue: ''
		},
		imgVersion : {
			type : DataTypes.STRING,
			allowNull: true,
			defaultValue: ''
		},
		content : {
			type : DataTypes.TEXT,
			allowNull: false,
			defaultValue: ''
		},
		status: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 1,
			comment : '1: active, 0 deactive'
		},
		isNew: {
			type: DataTypes.INTEGER,
			allowNull: true,
			defaultValue: 0
		},
		isHot: {
			type: DataTypes.INTEGER,
			allowNull: true,
			defaultValue: 0
		},
		views: {
			type: DataTypes.INTEGER,
			allowNull: true,
			defaultValue: 0
		},
		deepLink : {
			type : DataTypes.STRING,
			allowNull: true,
			defaultValue: ''
		},
		promotionId: {
			type: DataTypes.INTEGER,
			allowNull: true,
			defaultValue: 0
		}
	}, {
		tableName: 'Alert',
		classMethods: {
			associate: function(models) {
			}
		}
	});
	return Alert;
};