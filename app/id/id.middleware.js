module.exports = validateId;

function validateId (req, res, next, value) {
  let reg = /^[0-9a-fA-F]{24}$/;
  let valid = reg.test(value);

  if (!valid) {
    let message = 'invalid id';
    return res
      .status(400)
      .json({message});
  }

  next();
};
