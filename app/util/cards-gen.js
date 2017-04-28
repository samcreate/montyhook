import fb from './facebook';
module.exports = (cards, variance) => {
  let _cards = [];
  //limit the number of varietals
  cards = cards.splice(0, 9);

  //generate the cards
  cards.forEach((varietal) => {

    let tmpCard;
    let tmpButtons = [];
    let tmpWineParams = {
      varietal_id: varietal.id,
      variance,
    };

    tmpButtons.push(fb.buttonGen('Browse 👀', 'SHOPBY_VARIETAL~' + JSON.stringify(tmpWineParams), 'postback'));

    tmpButtons.push(fb.buttonGen('Learn more 👉', 'VARIETAL_LEARNMORE~' +
    JSON.stringify({
      varietal_id: varietal.id,
      steps: ['bubble1', 'bubble2'],
      step: 1,
      wine_params: tmpWineParams,
    }),
      'postback'
    ));

    tmpCard = fb.cardGen(
      varietal.name,
      '',
      varietal.description,
      tmpButtons
    );
    _cards.push(tmpCard);

  });

  if (variance){
    console.log('Monty\'s picks-------------------------------------------->', variance);
    _cards.push(
      fb.cardGen(
        ' 💎 Monty’s picks',
        '',
        'Let me surprise you with a variety of wine gems that match your request.',
        [{
          'type': 'postback',
          'payload': 'SHOPBY_ALL~' + JSON.stringify({
              variance,
            }),
          'title': 'Browse Monty\'s Picks',
        },
          {
            'type': 'postback',
            'payload': 'ABOUT_MONTYS_PICKS~{}',
            'title': 'About Monty\'s Picks',
          }]
      )
    );
  }
  return _cards;
};
