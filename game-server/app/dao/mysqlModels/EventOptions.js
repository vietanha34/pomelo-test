/**
 * Created by bi on 7/31/15.
 */

/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('EventOptions', {
		eventId: {
			type: DataTypes.INTEGER,
			allowNull: false,
			primaryKey : true
		},
		title : {
			type : DataTypes.STRING,
			allowNull: false,
			defaultValue: ''
		},
		content : {
			type : DataTypes.STRING,
			allowNull: false,
			defaultValue: ''
		},
		imgVersion : {
			type : DataTypes.STRING,
			allowNull: true,
			defaultValue: ''
		},
		btnLabel : {
			type : DataTypes.STRING,
			allowNull: true,
			defaultValue: ''
		},
		rank: {
			type: DataTypes.INTEGER,
			allowNull: true,
			defaultValue: 0
		},
		contentType: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 3
		},
		status: {
			type: DataTypes.INTEGER,
			allowNull: false,
			comment : '1: kick hoat, 0 disable'
		}
	}, {
		tableName: 'EventOptions',
		classMethods: {
			associate: function(models) {
			}
		}
	});
};

