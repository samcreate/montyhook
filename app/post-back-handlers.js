import config from 'config';
import EventEmitter from 'eventemitter3';
import db from 'montydb';
import stats from './util/statistics';
import fb from './util/facebook';
import Slack from 'slack-node';

class PostBacksHandler extends EventEmitter {
  constructor() {
    super();
    this.slack = new Slack(config.get('SLACKYPOO'));
  }

  shopbyVarietal({queryParams, uid}) {
    let allWines = true;
    let _options = {
      include: [{
        model: db.BaseAttributes,
        where: {
          type: 'wine-attr',
        },
      },
        {
          model: db.Varietals,
          as: 'Varietals',
          attributes: ['id', 'name'],
        }],
    };

    if (queryParams.hasOwnProperty('varietal_id') === true) {
      allWines = false;
      _options.where = {
        varietal_id: queryParams.varietal_id,
      };
    }
    return new Promise((resolve, reject) => {
      db.Wines.findAll(_options)
        .then((bottles) => {
          let resBottles = [];
          bottles.forEach((bottle) => {
            let _tmpBottle = {};
            _tmpBottle.bottle = bottle.get({
              raw: true,
            });
            _tmpBottle.attr = {};
            //filter the the weight result since it's somewhat barried in the reponse from sequelize
            bottle.BaseAttributes.forEach((attr) => {
              // console.log(attr.name, attr.WinesAttributes.weight)
              _tmpBottle.attr[attr.name] = {
                weight: attr.WinesAttributes.weight,
                score: null,
              };
            });
            let _scoreTotal = 0;
            if (queryParams.hasOwnProperty('variance') === true) {
              // let's get the variance score of each taste profile attribute
              // comparing the incoming to the wines in the db
              for (let param in queryParams.variance) {
                //console.log('queryparm: :', param, ':', queryParams.variance[param])
                let _queryWeight = queryParams.variance[param];
                let _bottleWeight = _tmpBottle.attr[param].weight;
                //console.log('_tmpBottle.attr: :', param, ':', _tmpBottle.attr[param].weight)
                _tmpBottle.attr[param].score = stats.variance([_bottleWeight, _queryWeight]);
              }

              //tally the score per bottle

              for (let param in _tmpBottle.attr) {
                _scoreTotal += _tmpBottle.attr[param].score;

              }
            }
            _tmpBottle.total = _scoreTotal;
            resBottles.push({
              bottle: _tmpBottle,
              score: _scoreTotal,
            });
          });
          //sort the scores from least to greatest
          resBottles = resBottles.sort(function(a, b) {
            return a.score - b.score;
          });
          //console.log('resBottles.sorted', resBottles)
          let _tmpCards = [];

          if (resBottles.length < 1) {

            this.slack.api('chat.postMessage', {
              text: `Missing stock for: https://montymin.herokuapp.com/varietals/edit/${queryParams.varietal_id}`,
              username: 'Monty\'s Pager',
              icon_emoji: ':pager:',
              channel: config.get('SLACK_CHANNEL'),
            }, function(err, response) {
              console.log('slack.api', response, err, config.get('SLACKYPOO'));
            });
            let lowStockMessage = {
              speech: 'I\'m sorry we currently don\'t have that in stock.',
              type: 0,
            };
            resolve({
              uid,
              messages: [lowStockMessage],
            });

            return false;
          } else if (resBottles.length > 10) {
            resBottles = resBottles.splice(0, 10);
          }
          const _metals = ['🥇', '🥈', '🥉'];
          resBottles.forEach((resBottle, i) => {
            let tmpButtons = [];
            let wine = resBottle.bottle.bottle;
            let place = _metals[i] || '';
            tmpButtons.push({
              'type': "web_url",
              'url': wine.url,
              'title': `Shop at ${wine.price}`,
            });

            //description for if there's a varaince applied on the selection
            //and one for not having a variance.
            let description = `${wine.description}`;

            if (queryParams.variance === null) {
              description = `${wine.description}`;
            }

            let tmpCard = fb.cardGen(
              `${place} ${wine.vintage} ${wine.producer}, ${wine.Varietals.name} ${wine.name}`,
              wine.hero_gallery || '',
              description || '',
              tmpButtons
            );

            _tmpCards.push(tmpCard);
          });

          let _tmpSpeech;
          if (_tmpCards.length === 1) {
            _tmpSpeech = 'Here\'s a smashing wine that matches your request';
          } else {
            _tmpSpeech = 'Here\'s some smashing wines that match your request';
          }

          resolve({
            uid,
            messages: [
              {
                speech: _tmpSpeech,
                type: 0,
              },
              {
                cards: _tmpCards,
                type: 1,
              },
            ],
          });
        });
    });
  }
}

module.exports = new PostBacksHandler();
