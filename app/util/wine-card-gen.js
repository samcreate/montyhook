import wineResGEN from './wineprodres-gen';

module.exports = (resBottles) => {
  const _metals = ['🥇', '🥈', '🥉'];
  let _tmpCards = [];
  resBottles.forEach((wine, i) => {
    let tmpButtons = [];
    let place = _metals[i] || '';
    tmpButtons.push({
      'type': 'web_url',
      'url': wine.url,
      'title': `Shop at ${wine.price}`,
    });

    //description for if there's a varaince applied on the selection
    //and one for not having a variance.
    let description = `${wine.description}`;
    let tmpCard = {
      title: `${place} ${wine.vintage} ${wine.producer}, ${wine.name} - ${wine.Varietals[0].name}`,
      image_url: wine.hero_gallery || '',
      subtitle: description || '',
      item_url: wine.url,
      buttons: tmpButtons,
    };
    _tmpCards.push(tmpCard);
  });

  let _tmpSpeech;
  if (_tmpCards.length === 1) {
    _tmpSpeech = 'Here\'s a smashing wine that matches your request';
  } else {
    _tmpSpeech = wineResGEN();
  }

  return {cards: _tmpCards, speech: _tmpSpeech};
};
