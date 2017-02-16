import crypto from 'crypto';

module.exports = EncodeHelper;

function EncodeHelper (str='') {
  return crypto
    .createHash('md5')
    .update(str)
    .digest('hex');
};
