/**
 * Created by vietanha34 on 1/19/16.
 */


/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('GuildConfig', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    sIcon: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    fee: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue : 10000,
      comment: "phí tạo mới hội quán"
    },
    level : {
      type : DataTypes.INTEGER,
      allowNull:false,
      defaultValue : 0,
      comment : "level cần thiết để tạo hội quán"
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
