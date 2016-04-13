/**
 * Created by vietanha34 on 1/19/16.
 */


/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('GuildInvite', {
    uid: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey : true
    },
    guildId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    inviteUid: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue : 0,
      comment:"uid của người mời"
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        models.User.hasOne(models.GuildMember, { foreignKey : 'uid'});
        models.GuildMember.belongsTo(models.User, { foreignKey : 'uid'});
      }
    }
  });
};
