const check = {};

check.ifAfterHours = () => {
  let today = new Date().getHours();
  if (today >= 8 && today <= 22) {
    return false;
  } else {
    return true;
  }
};

module.exports = check;
