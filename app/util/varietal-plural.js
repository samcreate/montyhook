
module.exports = (name) => {
  if (name === 'Arneis' || name === 'Pinot Gris') {
    return name;
  } else {
    return name + 's';
  }
};
