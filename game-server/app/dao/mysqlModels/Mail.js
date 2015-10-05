/**
 * Created by bi on 7/29/15.
 */


module.exports = function(sequelize, DataTypes) {
	return sequelize.define('Mail', {
		id: {
			type: DataTypes.BIGINT,
			allowNull: false,
			primaryKey : true,
			autoIncrement : true
		},
		fromUid: {
			type: DataTypes.BIGINT,
			allowNull: true,
			defaultValue: 0
		},
		fromName : {
			type : DataTypes.STRING,
			allowNull: true,
			defaultValue: ''
		},
		uid: {
			type: DataTypes.BIGINT,
			allowNull: false
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
		deepLink : {
			type : DataTypes.STRING,
			allowNull: true,
			defaultValue: ''
		},
		status: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 1,
			comment : '1: active, 0 deleted, 2: viewed'
		}
	}, {
		tableName: 'Mail',
		classMethods: {
			associate: function(models) {
			}
		}
	});
};
