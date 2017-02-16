'use strict';
module.exports = function(sequelize, DataTypes) {
  var VarietalsChats = sequelize.define('VarietalsChats', {
    title: DataTypes.STRING,
    chat: DataTypes.TEXT,
    intent_id: DataTypes.STRING,
    context_name: DataTypes.STRING,
    order: DataTypes.INTEGER
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        VarietalsChats.belongsTo(models.Varietals);
      }
    }
  });
  return VarietalsChats;
};
