import stats from './statistics';
import wineCardGen from './wine-card-gen';
import config from 'config';
module.exports = (bottles, queryParams, uid, slack) => {
  return new Promise((resolve) => {
    let resBottles = [];
    bottles.forEach((bottle) => {
      let _tmpBottle = {};
      _tmpBottle.bottle = bottle;
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

    if (resBottles.length < 1) {

      slack.api('chat.postMessage', {
        text: `Missing stock for: https://${config.get('HOSTADMIN')}/varietals/edit/${queryParams.varietal_id}`,
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
    resBottles = resBottles.map(item => {
      return item.bottle.bottle;
    });
    let wineRes = wineCardGen(resBottles);
    resolve({
      uid,
      messages: [
        {
          speech: wineRes.speech,
          type: 0,
        },
        {
          cards: wineRes.cards,
          type: 1,
        },
      ],
    });
  });
};
