/**
 * Created by bi on 7/24/15.
 */

/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('EventExtra', {
		id: {
			type: DataTypes.INTEGER,
			allowNull: false,
			primaryKey : true,
			autoIncrement : true
		},
		title : {
			type : DataTypes.STRING
		},
		eventId : {
			type : DataTypes.INTEGER,
			allowNull : false
		},
		status: {
			type: DataTypes.INTEGER,
			allowNull: false,
			comment : '1: kick hoat, 0 disable'
		},
		action : {
			type : DataTypes.STRING,
			allowNull : true
		},
		content: {
			type: DataTypes.TEXT,
			allowNull: false,
			defaultValue: ''
		},
		contentType: {
			type: DataTypes.INTEGER,
			allowNull: false
		},
		rank : {
			type : DataTypes.INTEGER(4),
			allowNull : true,
			defaultValue: 0
		}
	}, {
		tableName: 'EventExtra',
		classMethods: {
			associate: function(models) {
			}
		}
	});
};
