'use strict';
module.exports = function(sequelize, DataTypes) {
  var TasteProfileNames = sequelize.define('TasteProfileNames', {
    name: {
      type: DataTypes.STRING
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        TasteProfileNames.belongsToMany(models.BaseAttributes, {
          through: 'TasteAttributes'
        });
      }
    }
  });
  return TasteProfileNames;
};
