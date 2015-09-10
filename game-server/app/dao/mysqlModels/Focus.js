/**
 * Created by bi on 7/31/15.
 */

/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('Focus', {
		id: {
			type: DataTypes.BIGINT,
			allowNull: false,
			primaryKey : true,
			autoIncrement : true
		},
		uid: {
			type: DataTypes.BIGINT,
			allowNull: false
		},
		bonus: {
			type: DataTypes.INTEGER,
			allowNull: false,
			default: 0
		},
		title : {
			type : DataTypes.STRING,
			allowNull: false,
			defaultValue: ''
		},
		content: {
			type: DataTypes.TEXT,
			allowNull: false,
			defaultValue: ''
		},
		contentType : {
			type : DataTypes.INTEGER,
			allowNull : false,
			defaultValue : '3'
		},
		btnLabel : {
			type : DataTypes.STRING
		},
		status: {
			type: DataTypes.INTEGER,
			allowNull: false,
      defaultValue : '1',
			comment : '1: kick hoat, 0 disable'
		},
		params : {
			type : DataTypes.TEXT,
			allowNull : true,
			comment : 'JSON string dữ liệu cần truyền lại cho event'
		},
		eventId : {
			type : DataTypes.INTEGER,
			allowNull : true
		},
    action : {
      type : DataTypes.STRING,
      allowNull : true
    },
		eventType : {
			type : DataTypes.INTEGER,
      allowNull : true
		}
	}, {
		tableName: 'Focus',
		classMethods: {
			associate: function(models) {
			}
		}
	});
};