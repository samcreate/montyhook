'use strict';
module.exports = function(sequelize, DataTypes) {
  var Appellation = sequelize.define('Appellation', {
    name: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        Appellation.belongsTo(models.Countries);
      }
    }
  });
  return Appellation;
};
