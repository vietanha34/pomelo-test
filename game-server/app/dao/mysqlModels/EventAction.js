/**
 * Created by bi on 7/31/15.
 */

/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('EventAction', {
		action: {
			type: DataTypes.STRING,
			allowNull: false,
			primaryKey : true
		},
		name : {
			type : DataTypes.STRING
		},
		template: {
			type: DataTypes.TEXT,
			allowNull: false,
			defaultValue: ''
		},
		status: {
			type: DataTypes.INTEGER,
			allowNull: false,
			comment : '1: kick hoat, 0 disable'
		},
		eventType : {
      type : DataTypes.INTEGER,
      allowNull : true
    }
	}, {
		tableName: 'EventActions',
		classMethods: {
			associate: function(models) {
			}
		}
	});
};

