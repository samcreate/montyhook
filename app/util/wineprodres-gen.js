module.exports = () => {
  let _res =  ['Some smashing wines that match your request. 😊',
  'These superb wines will certainly do the trick. 😊',
  '😋 These excellent wines should fit the bill.',
  'Perfect. Check out these fabulous wines! 😋',
  'Super! These fantastic wines will hit the spot. 🎯',
  'Righty-ho. 🤗 In that case, these will all do you proud.',
  'Excellent. These fab wines will be just the ticket. 🎟️',
  'Check these out. 👀',
  'Lovely. These yummy wines are right on the money. 🤑',
  'Here are some perfect matches... 💘'];
  return _res[Math.floor(Math.random() * _res.length)];
};
