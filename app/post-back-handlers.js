import config from 'config';
import EventEmitter from 'eventemitter3';
import db from 'montydb';
import stats from './util/statistics';
import fb from './util/facebook';
import Slack from 'slack-node';
import cacher from 'sequelize-redis-cache';
import wineResGEN from './util/wineprodres-gen';
import wineCardGen from './util/wine-card-gen';
import scoreBottles from './util/score-bottles';

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

      cards.push({
        title: 'Monty: A sommelier in your pocket.',
        image_url: 'https://files.slack.com/files-pri/T1UTGQF51-F4JAV5C8K/montyshare.jpg?pub_secret=9921eea359',
        subtitle: 'Friendly, easy-to-follow wine help on your phone. Free, on Facebook Messenger.',
        item_url: 'https://www.messenger.com/t/montysips',
        buttons: tmplButtons,
      });
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

  imageCheck({queryParams, uid}) {
    let _image = queryParams.image;
    let _messages = [];
    let _attachments = [];
    _attachments.push(
      {
        pretext: 'Help user with an image?',
        title: 'Open Chat? 🤳',
        title_link: `https://${config.get('HOST')}/startchat/${uid}`,
        image_url: queryParams.image,
      }
    );
    return new Promise((resolve, reject) => {
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
        replies: ['📖 Back to menu', '🤖 How it works'],
      });
      this.slack.api('chat.postMessage', {
        text: 'Image Check!',
        attachments: JSON.stringify(_attachments),
        username: 'Monty\'s Pager',
        icon_emoji: ':pager:',
        channel: config.get('SLACK_CHANNEL'),
      }, function(err, response) {
        if (response.ok){
          resolve({
            uid,
            messages: _messages,
          });
        } else {
          reject(response);
        }
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
            body: {queryParams, uid},
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
                title_link: `https://${config.get('BASIC_AUTH_USER')}:${config.get('BASIC_AUTH_PASS_ENCODED')}@${config.get('HOSTADMIN')}/intents/add?intent=${_missedMsg}&pastConvoID=${pastConvo.id}`,
                text: `${_missedMsg}`,
                footer: 'Monty\'s Pager',
                ts: (new Date).getTime(),
              }];
              _response.push({
                fallback: 'Chat with user?',
                color: '#36a64f',
                title:  `👉 Open a chat with: ${fbData.fullname} 🤳`,
                title_link: `https://${config.get('HOST')}/startchat/${uid}`,
              });
              results.forEach((intent) => {
                _response.push(
                  {
                    pretext: 'Potential Match? 🤔',
                    title: intent.title,
                    title_link: `https://${config.get('BASIC_AUTH_USER')}:${config.get('BASIC_AUTH_PASS_ENCODED')}@${config.get('HOSTADMIN')}/intents/edit/${intent.id}?intent_add=${_missedMsg}&pastConvoID=${pastConvo.id}`
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
                replies: ['📖 Back to menu', '🤖 How it works'],
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
      let cacheObj = cacher(db.sequelize, redisCache)
        .model('Varietals')
        .ttl(config.get('CACHE_TIME'));
      cacheObj.findById(queryParams.varietal_id)
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
            tmplButtons.push({
              'type': 'postback',
              'payload': 'MENU~' + JSON.stringify({trigger:"menu"}),
              'title': 'Go to menu 📖',
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
    let tmpReject;
    //config.get('CACHE_TIME')
    return new Promise((resolve, reject) => {
      tmpReject = reject;
      let WinesVarietalsQRY = cacher(db.sequelize, redisCache)
        .model('WinesVarietals')
        .ttl(3600);
      WinesVarietalsQRY.findAll({
        where: {
          VarietalId: queryParams.varietal_id,
        },
      })
        .then((wines) => {
          let wineIDs = [];
          if( Object.prototype.toString.call( wines ) === '[object Array]' ) {
              console.log( 'Array!' );
          }
          console.log('@@@@@ WinesVarietalsQRY2',WinesVarietalsQRY.cacheHit);
          console.log('@@@@@ hereeeeee 2', wines);

          wines.forEach((wine) => {
            wineIDs.push(wine.WineId);
          });
          console.log('wineIDs', wineIDs,queryParams.varietal_id);
          let WinesQY = cacher(db.sequelize, redisCache)
            .model('Wines')
            .ttl(config.get('CACHE_TIME'));
          return WinesQY.findAll({
            where: {
              id: wineIDs,
            },
            include: [{
              model: db.BaseAttributes,
              where: {
                type: 'wine-attr',
              },
            }, {
              model: db.Varietals,
              as: 'Varietals',
              attributes: ['id', 'name'],
            }],
          });
        })
        .then((bottles) =>{
          return scoreBottles(bottles, queryParams, uid, this.slack);
        })
        .then((response) => {
          resolve(response);
        })
        .catch((err) => {
          reject({
            err,
            uid,
          });
        });
    })
    .catch((err)=>{
      console.log('err: ', err);
      tmpReject({
        err,
        uid,
      });
    });
  }

  shopbyVarietalAll({queryParams, uid}) {

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
    // give me all the wines that match with varietal.id
    if (queryParams.hasOwnProperty('varietal_id') === true) {
      _options.where = {
        varietal_id: queryParams.varietal_id,
      };
    }
    return new Promise((resolve, reject) => {
      let WinesQY = cacher(db.sequelize, redisCache)
        .model('Wines')
        .ttl(config.get('CACHE_TIME'));
      WinesQY.findAll(_options)
        .then((bottles) =>{
          return scoreBottles(bottles, queryParams, uid, this.slack);
        })
        .then((response) => {
          resolve(response);
        })
        .catch((err) => {
          console.log('FUCK YOUUUUUU')
          reject({
            err,
            uid,
          });
        });
    });
  }
}

module.exports = new PostBacksHandler();
