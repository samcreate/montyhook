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


  shareMonty({queryParams, uid}) {
    return new Promise((resolve, reject) => {
      let tmplButtons = [];
      let cards = [];
      tmplButtons.push({
        'type': 'element_share',
      });
      cards.push(fb.cardGen(
        'Share Monty.',
        'http://bit.ly/2mBDxtF',
        'A bot who also happens to be a wine expert.',
        tmplButtons
      ));
      resolve({
        uid,
        messages: [
          {
            cards,
            type: 1,
          },
        ],
      });
    });
  }

  notifySommelier({queryParams, uid}) {
    let fbData;
    let _messages = [];
    let _missedMsg = queryParams.missedIntent;
    return new Promise((resolve, reject) => {
      fb.getUserData({
        uid,
      })
        .then((user) => {
          fbData = user;
          return db.PastConversation.create({
            body: _missedMsg,
          });
        })
        .then((pastConvo) => {
          let missedMsgArra = _missedMsg.split(' ');
          let options = {
            limit: 10,
            where: {
              $or: (function() {
                let _tmparr = [];
                missedMsgArra.forEach((key) => {
                  if (('and or has with bit'.indexOf(key)) !== 0) {
                    _tmparr.push({
                      title: {
                        $iLike: '%' + key + '%',
                      },
                    });
                  }
                });
                return _tmparr;
              }()),
            },
          };
          db.Intents.findAll(options)
            .then((results) => {
              let _response = [{
                fallback: `Failed intent: ${_missedMsg}`,
                color: '#36a64f',
                author_name: `${fbData.fullname} said:`,
                author_icon: `${fbData.profile_pic}`,
                title: '👉 Add new to Montymin 👈',
                title_link: `https://${config.get('BASIC_AUTH_USER')}:${config.get('BASIC_AUTH_PASS_ENCODED')}@${config.get('HOST')}/intents/add?intent=${_missedMsg}&pastConvoID=${pastConvo.id}`,
                text: `${_missedMsg}`,
                footer: 'Monty\'s Pager',
                ts: (new Date).getTime(),
              }];
              results.forEach((intent) => {
                _response.push(
                  {
                    pretext: 'Potential Match? 🤔',
                    title: intent.title,
                    title_link: `https://${config.get('BASIC_AUTH_USER')}:${config.get('BASIC_AUTH_PASS_ENCODED')}@${config.get('HOST')}/intents/edit/${intent.id}?intent_add=${_missedMsg}&pastConvoID=${pastConvo.id}`
                  }
                );
              });
              this.slack.api('chat.postMessage', {
                text: 'Help Monty be great again!',
                attachments: JSON.stringify(_response),
                username: 'Monty\'s Pager',
                icon_emoji: ':pager:',
                channel: config.get('SLACK_CHANNEL'),
              }, function(err, response) {
                console.log('slack.api', response, err, config.get('SLACKYPOO'));
              });
              _messages.push({
                speech: 'I\'m on it.',
                type: 0,
              });
              _messages.push({
                speech: 'I\'ll get back to you ASAP! 🚀',
                type: 0,
              });
              _messages.push({
                type: 2,
                title: 'In the meantime, can I can help with something else?',
                replies: ['🍷 Find a wine', '🤖 How it works'],
              });

              resolve({
                uid,
                messages: _messages,
              });
            })
            .catch((err) => {
              reject({
                err,
                uid,
              });
            });
        });
    });

  }

  varietalLearning({queryParams, uid}) {
    return new Promise((resolve, reject) => {
      db.Varietals.findById(queryParams.varietal_id)
        .then((varietal) => {
          let tmplButtons = [];

          if (queryParams.step === 1) {
            tmplButtons.push({
              'type': 'postback',
              'payload': 'SHOPBY_VARIETAL~' + JSON.stringify(queryParams.wine_params),
              'title': 'Browse 👀',
            });
            tmplButtons.push({
              'type': 'postback',
              'payload': 'VARIETAL_LEARNMORE~' + JSON.stringify({
                  varietal_id: varietal.id,
                  steps: ['bubble3', 'bubble4'],
                  step: 2,
                  wine_params: queryParams.wine_params,
                }),
              'title': 'Learn More 👉',
            });
          } else {
            tmplButtons.push({
              'type': 'postback',
              'payload': 'SHOPBY_VARIETAL~' + JSON.stringify(queryParams.wine_params),
              'title': 'Browse 👀',
            });
          }
          let _messages = [];
          if (queryParams.step === 1 && varietal.hero !== null) {
            _messages.push({
              imageUrl: varietal.hero,
              type: 3,
            });
          }
          queryParams.steps.forEach((step) => {
            _messages.push({
              speech: varietal[step],
              type: 0,
            });
          });

          _messages.push({
            title: 'What would you like to do?',
            buttons: tmplButtons,
            type: 'buttons',
          });

          resolve({
            uid,
            messages: _messages,
          });

        })
        .catch((err) => {
          //@TODO
          // - create error handler
          reject({
            err,
            uid,
          });
        });
    });
  }

  shopbyVarietal({queryParams, uid}) {
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
        })
        .catch((err) => {
          reject({
            err,
            uid
          });
        });
    });
  }
}

module.exports = new PostBacksHandler();
