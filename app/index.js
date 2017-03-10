import config from 'config';
import BootBot from 'bootbot';
import APIAI from './api-ai';
import db from 'montydb';
import fb from './util/facebook';
import postBacks from './post-back-handlers';
import Slack from 'slack-node';
import propLookUp from './util/property-lookup';
import stats from './util/statistics';

const slack = new Slack(config.get('SLACKYPOO'));
const bot = new BootBot({
  accessToken: config.get('FBACCESSTOKEN'),
  verifyToken: 'verify_this_biotch',
  appSecret: config.get('FBAPPSECRET'),
});

bot.on('message', (payload) => {
  const text = payload.message.text;
  const uid = payload.sender.id;
  //console.log(`The user said: ${text}`, uid);
  APIAI.get({
    uid,
    text,
  })
    .then(handleResponse);
});
bot.on('postback', (payload) => {
  let buttonData = payload.postback.payload;
  if (buttonData === 'BOOTBOT_GET_STARTED') {
    return;
  }
  let uid = payload.sender.id;
  let queryParams = buttonData.split('~')[1];
  queryParams = JSON.parse(queryParams);
  if (buttonData.indexOf('SHOPBY_VARIETAL') !== -1) {
    postBacks.shopbyVarietal({
      queryParams,
      uid,
    })
      .then(handleResponse)
      .catch(errorHandler);
  }
  if (buttonData.indexOf('SHOPBY_ALL') !== -1) {
    postBacks.shopbyVarietalAll({
      queryParams,
      uid,
    })
      .then(handleResponse)
      .catch(errorHandler);
  }


  if (buttonData.indexOf('VARIETAL_LEARNMORE') !== -1) {
    //console.log('VARIETAL_LEARNMORE', queryParams);
    postBacks.varietalLearning({
      queryParams,
      uid,
    })
      .then(handleResponse)
      .catch(errorHandler);
  }
  if (buttonData.indexOf('SHOW_INTENT') !== -1) {
    let {intent_id} = queryParams;
    APIAI.triggerIntent({
      uid,
      intent_id
    });
  }

  if (buttonData.indexOf('MISSINGINTENT_FOLLOWUP') !== -1) {
    let {text} = queryParams;
    APIAI.get({
      uid,
      text,
    })
      .then(handleResponse);
  }

  if (buttonData.indexOf('SOMMELIER') !== -1) {
    postBacks.notifySommelier({
      queryParams,
      uid,
    })
      .then(handleResponse)
      .catch(errorHandler);
  }
  if (['FIND_WINEBY_STYLE', 'EXPLORE_VARIETALS', 'HELP', 'FIND_A_WINE','HOW_IT_WORKS','ABOUT_MONTYS_PICKS'].indexOf(buttonData.split('~')[0]) !== -1) {
    APIAI.get({
      uid,
      text: buttonData,
    })
      .then(handleResponse);
  }

  if (buttonData.indexOf('SHARE_MONTY') !== -1) {
    postBacks.shareMonty({
      queryParams,
      uid,
    })
      .then(handleResponse)
      .catch(errorHandler);
  }
});
bot.setGetStartedButton((payload) => {
  const uid = payload.sender.id;
  APIAI.get({
    uid,
    text: 'Get Started',
  })
    .then(handleResponse)
    .catch(errorHandler);
});
bot.setPersistentMenu([
  {
    type: 'postback',
    title: '🍷 Pair wine',
    payload: 'FIND_A_WINE~{}',
  },
  {
    type: 'postback',
    title: '🍇 Explore varietals',
    payload: 'EXPLORE_VARIETALS~{}',
  },
  {
    type: 'postback',
    title: '🍾 Find wine by style',
    payload: 'FIND_WINEBY_STYLE~{}',
  },
  {
    type: 'postback',
    title: '🙌 Share Monty',
    payload: 'SHARE_MONTY~{}',
  },
  {
    type: 'postback',
    title: '🆘 Help',
    payload: 'HELP~{}',
  },
]);



APIAI.on('get-winesby-style', (originalRequest, apiResponse) => {
  let {locations, vintage, properties, styles, varietals, type} = apiResponse.result.parameters;
  let tmpYear = vintage || '';
  let $locOR = [];
  let $varOR = [];
  let dessertBool = [false, true];
  let sparklingBool = [false, true];
  let fortifiedBool = [false, true];
  let naturalBool = [false, true];
  let types = ['white', 'red', 'rose', 'sparkling', 'dessert'];

  vintage = `%${tmpYear}%`;
  varietals = varietals || [''];
  locations = locations || [''];

  if (type.length < 1) {
    type = types;
  }

  properties = properties.map(prop => {
    let newProp = {};
    prop = prop.toLowerCase();
    newProp.variance = propLookUp[prop];
    return newProp;
  });
  console.log('properties-->', properties);
  styles.forEach((style) => {
    if (style === 'Dessert') {
      dessertBool = true;
    }
    if (style === 'Sparkling') {
      sparklingBool = true;
    }
    if (style === 'Fortified') {
      fortifiedBool = true;
    }
    if (style === 'Organic') {
      naturalBool = true;
    }
  });

  locations.forEach((loc) => {
    $locOR.push(
      {
        $iLike: `%${loc}%`,
      }
    );
  });
  varietals.forEach((varietal) => {
    $varOR.push(
      {
        $iLike: `%${varietal}%`,
      }
    );
  });


  db.Wines.findAll({
    include: [
      {
        model: db.Varietals,
        as: 'Varietals',
      },
      {
        model: db.Locations,
      },
      {
        model: db.BaseAttributes,
        where: {
          type: 'wine-attr',
        },
      },
    ],
    where: {
      $or: [
        {
          '$Varietals.name$': {
            $or: $varOR,
          },
          '$Locations.name$': {
            $or: $locOR,
          },
          vintage: {
            like: vintage,
          },
          dessert: dessertBool,
          sparkling: sparklingBool,
          fortified: fortifiedBool,
          natural: naturalBool,
          type: type,
        },
      ],
    },
  })
    .then((bottles) => {
      //
      console.log('How many: -->', bottles.length);
      let resBottles = [];
      //console.log('Sample: -->',bottles[0].BaseAttributes);
      bottles.forEach((bottle) => {
        //console.log(bottle.name, bottle.id);
      });

      if (properties.length >= 1) {
        console.log('wines going through scoring process')
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
          // let's get the variance score of each taste profile attribute
          // comparing the incoming to the wines in the db
          for (let param in properties[0].variance) {
            // console.log('queryparm: :', param, ':', properties[0].variance);
            let _queryWeight =  properties[0].variance[param];
            let _bottleWeight = _tmpBottle.attr[param].weight;
            //console.log('_tmpBottle.attr: :', param, ':', _tmpBottle.attr[param].weight)
            _tmpBottle.attr[param].score = stats.variance([_bottleWeight, _queryWeight]);
          }

          //tally the score per bottle

          for (let param in _tmpBottle.attr) {
            _scoreTotal += _tmpBottle.attr[param].score;

          }

          _tmpBottle.total = _scoreTotal;
          resBottles.push({
            bottle: _tmpBottle.bottle,
            score: _scoreTotal,
          });

        });
        //sort the scores from least to greatest
        resBottles = resBottles.sort(function(a, b) {
          return a.score - b.score;
        });
        resBottles = resBottles.map(el => {
          return el.bottle;
        });
      } else {
        resBottles = bottles.map(el =>{
          return el.get({plain: true});
        });
      }

      resBottles = resBottles.splice(0, 10);

      if (resBottles.length < 1) {

        slack.api('chat.postMessage', {
          text: `No Stock or match found for user's request: ${originalRequest.text}`,
          username: 'Monty\'s Pager',
          icon_emoji: ':pager:',
          channel: config.get('SLACK_CHANNEL'),
        }, function(err, response) {
          console.log('slack.api', response, err, config.get('SLACKYPOO'));
        });
        let lowStockMessage = {
          speech: 'I\'m sorry we currently don\'t have anything instock that meets your request.',
          type: 0,
        };
        handleResponse({
          uid: originalRequest.uid,
          messages: [lowStockMessage],
        });

        return false;
      }

      const _metals = ['🥇', '🥈', '🥉'];
      let _tmpCards = [];
      resBottles.forEach((wine, i) => {
        let tmpButtons = [];
        let place = _metals[i] || '';
        tmpButtons.push({
          'type': "web_url",
          'url': wine.url,
          'title': `Shop at ${wine.price}`,
        });

        //description for if there's a varaince applied on the selection
        //and one for not having a variance.
        let description = `${wine.description}`;

        let tmpCard = fb.cardGen(
          `${place} ${wine.vintage} ${wine.producer}, ${wine.name}`,
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

      handleResponse({
        uid: originalRequest.uid,
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
      console.log('error', err);
    });

});
APIAI.on('missing-intent', (originalRequest, apiResponse) => {
  //console.log('_handleMissingIntents', originalRequest, apiResponse);

  let responses = [];
  let missedMsg = originalRequest.text;
  let missedMsgArr = missedMsg.split(' ');
  let cards = [];

  let options = {
    limit: 9,
    where: {
      $or: (function() {
        let _tmparr = [];
        missedMsgArr.forEach((key) => {
          if (key.length > 2 && ('and or has with bit'.indexOf(key)) !== 0) {
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
      responses.push({
        speech: '🤔 Hmm. I don\'t have a match. Are any of these close, or shall I ask a sommelier?',
        type: 0,
      });
      results.forEach((intent) => {
        let _tmpTitle = intent.title.split(',')[0];
        cards.push(fb.cardGen(
          _tmpTitle,
          '',
          intent.bubble1 || '',
          [{
            'type': 'postback',
            'payload': 'SHOW_INTENT~' + JSON.stringify({
                intent_id: intent.id
              }),
            'title': 'See more 👀',
          }]
        ));
      });

      cards.push(fb.cardGen(
        '  No dice? 🎲',
        '',
        'If none of these are close enough, I can ask a sommelier',
        [{
          'type': 'postback',
          'payload': 'SOMMELIER~' + JSON.stringify({
              missedIntent: missedMsg
            }),
          'title': 'Ask a sommelier 🛎',
        }]
      ));
      responses.push({
        cards,
        type: 1,
      });
      handleResponse({
        uid: originalRequest.uid,
        messages: responses,
      });
    });

});
APIAI.on('get-varietals', (originalRequest, apiResponse) => {
  const {intent_id} = apiResponse.result.parameters;
  let cards = [];
  let response = [];
  db.Intents.findById(intent_id, {
    include: [{
      model: db.Varietals,
    }, {
      model: db.BaseAttributes,
    }],
    order: [[db.Varietals, db.IntentVarietals, 'weight', 'ASC']],
  })
    .then((intent) => {
      //gather wine params for buttons
      let wineParams = {};
      intent.BaseAttributes.forEach((attr) => {
        wineParams[attr.name] = attr.IntentsAttributes.weight;
      });

      //limit the number of varietals
      intent.Varietals = intent.Varietals.splice(0, 9);

      //generate the cards
      intent.Varietals.forEach((varietal) => {

        let tmpCard;
        let tmpButtons = [];
        let tmpWineParams = {
          varietal_id: varietal.id,
          variance: wineParams,
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
        cards.push(tmpCard);

      });

      cards.push(
        fb.cardGen(
          ' 💎 Monty’s picks',
          '',
          'Let me surprise you with a variety of wine gems that match your request.',
          [{
            'type': 'postback',
            'payload': 'SHOPBY_ALL~' + JSON.stringify({
                variance: wineParams
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
      response.push({
        imageUrl: intent.hero || '',
        type: 3,
      });
      response.push({
        speech: intent.bubble1,
        type: 0,
      });

      if (intent.bubble2 !== null && intent.bubble2 !== '') {
        response.push({
          speech: intent.bubble2,
          type: 0,
        });
      }
      response.push({
        cards,
        type: 1,
      });
      handleResponse({
        uid: originalRequest.uid,
        messages: response,
      });
    });
});
APIAI.on('varietal-learning-cold', (originalRequest, apiResponse) => {
  const {Varietal} = apiResponse.result.parameters;
  //console.log('varietal-learning-cold ', Varietal);
  let options = {
    where: {
      $or: [{
        name: {
          $iLike: '%' + Varietal + '%',
        },
      }],
    },
  };
  db.Varietals.findOne(options)
    .then((varietal) => {
      console.log('_handleVarietalLearningCold: result:', varietal);
      let wine_params = {
        varietal_id: varietal.id,
        variance: null,
      };
      let queryParams = {
        varietal_id: varietal.id,
        steps: ['bubble1', 'bubble2'],
        step: 1,
        wine_params,
      };
      postBacks.varietalLearning({
        queryParams,
        uid: originalRequest.uid,
      })
        .then(handleResponse)
        .catch(errorHandler);
    });
});

const handleResponse = ({uid, messages}) => {
  let {type, speech, replies, title, cards, imageUrl, buttons} = messages.shift();
  let promise;

  if (type === 0) {
    promise = bot.say(uid, speech, {
      typing: true,
    });
  }
  if (type === 1) {
    promise = bot.sendGenericTemplate(uid, cards, {
      typing: true,
    });
  }
  if (type === 2) {
    promise = bot.say(uid, {
      text: title,
      quickReplies: replies,
    }, {
      typing: true,
    });
  }
  if (type === 3) {
    promise = bot.say(uid, {
      attachment: 'image',
      url: imageUrl,
    }, {
      typing: true,
    });
  }
  if (type === 'buttons') {
    promise = bot.say(uid, {
      text: title,
      buttons,
    }, {
      typing: true,
    });
  }

  if (messages.length >= 1) {
    promise.then(() => {
      handleResponse({
        uid,
        messages,
      });
    }).catch((err) => {
      //@TODO
      // - Send slack messages
      // - Send error to user
      errorHandler({
        err,
        uid,
      });
    });
  }
};
const errorHandler = (({err, uid}) => {
  let _errorMessages = [
    '😳 Oops. I scrambled my hard drive. Try again and I promise to do better.',
    '😳 Hmm. My robot brain must have got confused. Try again and I\'ll do better.',
    '😳 Uh oh! I must have spilt some wine on my motherboard. Try again and I\'ll do better.',
    '😳 Beep. Boop. Burb. That\'s robot for "I\'m sorry but something went wrong. Try again."',
  ];
  let message = {
    speech: _errorMessages[Math.floor(Math.random() * _errorMessages.length)],
    type: 0,
  };
  slack.api('chat.postMessage', {
    text: 'An error has occured on monty for this user: ' + uid + '. Message: ' + JSON.stringify(err),
    username: 'Monty\'s Pager',
    icon_emoji: ':pager:',
    channel: config.get('SLACK_CHANNEL_ERROR'),
  }, function(err, response) {
    console.log('slack.api', response, err, config.get('SLACKYPOO'));
  });
  handleResponse({
    uid,
    messages: [message]
  });
});

bot.start(process.env.PORT || 3000);
