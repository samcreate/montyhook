'use strict';
module.exports = function(sequelize, DataTypes) {
  var Countries = sequelize.define('Countries', {
    name: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        Countries.hasMany(models.CountryVarietals, { as: 'CountryVarietals' });
        Countries.hasMany(models.Appellation, {as: 'Appellations'});
      }
    }
  });
  return Countries;
};
