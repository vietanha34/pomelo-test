/**
 * Created by vietanha34 on 1/19/16.
 */


/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Guild', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    detail: {
      type: DataTypes.STRING,
      allowNull: true
    },
    gold: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue : 0
    },
    icon:{
      type : DataTypes.STRING,
      allowNull: true,
      comment: 'avatar của hội quán'
    },
    exp: {
      type : DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue : 0
    },
    fame : {
      type: DataTypes.INTEGER,
      defaultValue : 0
    },
    level : {
      type: DataTypes.INTEGER,
      defaultValue : 0
    },
    numMember : {
      type: DataTypes.INTEGER,
      defaultValue : 0
    },
    status:{
      type: DataTypes.INTEGER(1),
      defaultValue : 0
    },
    sIcon : {
      type : DataTypes.STRING
    },
    requireText : {
      type : DataTypes.TEXT,
      comment : "yêu cầu thiết kế"
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        models.Guild.hasMany(models.GuildMember, {as: 'Members', foreignKey : 'guildId'});
      }
    },
    index : [
      {
        fields : ['gold']
      },
      {
        fields : ['fame']
      },
      {
        fields : ['level']
      },
      {
        fields : ['name']
      }
    ]
  });
};
