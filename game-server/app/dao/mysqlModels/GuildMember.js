/**
 * Created by vietanha34 on 1/19/16.
 */


/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('GuildMember', {
    uid: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey : true
    },
    guildId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    gold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue : 0
    },
    role : {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    fame: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1000
    },
    dateJoin: {
      type: DataTypes.DATE
      //defaultValue: 'CURRENT_TIMESTAMP'
    },
    dateRequest: {
      type: DataTypes.DATE
      //defaultValue: 'CURRENT_TIMESTAMP'
    },
    lastActive: {
      type: DataTypes.DATE
      //defaultValue: 'CURRENT_TIMESTAMP'
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        models.User.hasOne(models.GuildMember, { foreignKey : 'uid'});
        models.GuildMember.belongsTo(models.User, { foreignKey : 'uid'});
        models.GuildMember.belongsTo(models.Guild,  { foreignKey : 'guildId'});
      }
    }
  });
};
