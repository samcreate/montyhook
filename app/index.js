import newrelic from 'newrelic';
import config from 'config';
import BootBot from 'bootbot';
import APIAI from './api-ai';
import db from 'montydb';
import fb from './util/facebook';
import postBacks from './post-back-handlers';
import user from './user';
import Slack from 'slack-node';
import propLookUp from './util/property-lookup';
import stats from './util/statistics';
import redis from 'redis';
import cacher from 'sequelize-redis-cache';
import Botmetrics from 'botmetrics';
import wineResGEN from './util/wineprodres-gen';
import request from 'request';
import DashBot from 'dashbot';


let dashbot = DashBot('2qZGV9kSH8XU6GLM06X0rtAKNqHAOxt9qPUvRGHy').facebook;

global.redisCache = redis.createClient(config.get('REDIS'));

redisCache.on('error', (err)=>{
  console.log('err: ', err);
});



const slack = new Slack(config.get('SLACKYPOO'));
const bot = new BootBot({
  accessToken: config.get('FBACCESSTOKEN'),
  verifyToken: 'verify_this_biotch',
  appSecret: config.get('FBAPPSECRET'),
});



bot.app.post('/webhook', (req, res, next) =>{
  if (config.util.getEnv('NODE_ENV') === 'production'){
    dashbot.logIncoming(req.body);
  }
  next();
});
bot.on('attachment', (payload, chat) => {
  // Send an attachment
  console.log(payload.message.attachments[0])
  if (payload.message.hasOwnProperty('sticker_id') && payload.message.sticker_id === 369239263222822){
    chat.say('👍',{typing:true});
  }
  if (payload.message.attachments[0].type === 'image'){
    chat.say('I wish I could see but I was born without 👁👁',{typing:true});
  }
  if (payload.message.attachments[0].type === 'audio'){
    chat.say('I wish I could hear but I was born without 👂\'s',{typing:true});
  }
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

  user.findOrCreate(uid).catch(errorHandler);
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
    title: '🍾 Find wine by style',
    payload: 'FIND_WINEBY_STYLE~{}',
  },
  {
    type: 'postback',
    title: '🍇 Explore varietals',
    payload: 'EXPLORE_VARIETALS~{}',
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


bot.setGreetingText('I\'m Monty: A sommelier in your pocket. I can help you...Pair wine and food\n—Find wine by "style"\n—And learn about wine as you go.')
.then((res)=>{
  console.log('positive res: ', res);
})
.catch((err)=>{
  console.log('negative res: ', err);
});
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
  console.log('properties1-->', properties);
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


  let cacheObj = cacher(db.sequelize, redisCache)
    .model('Wines')
    .ttl(config.get('CACHE_TIME'));
  cacheObj.findAll({
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
      console.log('Cached?: -->', cacheObj.cacheHit);
      let resBottles = [];

      if (properties.length >= 1) {
        console.log('wines going through scoring process')
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
        resBottles = bottles;
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

        let tmpCard = {
          title: `${place} ${wine.vintage} ${wine.producer}, ${wine.name}`,
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
  let cacheObj = cacher(db.sequelize, redisCache)
    .model('Intents')
    .ttl(config.get('CACHE_TIME'));
  cacheObj.findAll(options)
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
  let {intent_id} = apiResponse.result.parameters;
  if (intent_id.length > 1 ){
    console.log('hereeee')
    return APIAI.triggerMissingIntent(originalRequest, apiResponse);
  } else {
    intent_id = intent_id[0];
  }
  let cards = [];
  let response = [];
  let IntentsQRY = cacher(db.sequelize, redisCache)
    .model('Intents')
    .ttl(3600);
  IntentsQRY.findAll({
    where: {
      id: intent_id,
    },
    include: [{
      model: db.Varietals,
    }, {
      model: db.BaseAttributes,
    }],
    order: [[db.Varietals, db.IntentVarietals, 'weight', 'ASC']],
  })
    .then((intent) => {
      intent = intent[0];
      console.log('IntentsQRY cached?', IntentsQRY.cacheHit);
      //console.log('intent?', intent);
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
          $like: '%' + Varietal + '%',
        },
        synonyms: {
          $like: '%' + Varietal + '%',
        },
      }],
    },
  };
  let cacheObj = cacher(db.sequelize, redisCache)
    .model('Varietals')
    .ttl(config.get('CACHE_TIME'));
  cacheObj.findOne(options)
    .then((varietal) => {
      console.log('`_handleVarietalLearningCold`: result:', varietal);
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
  let msgData = {};
  let promise;

  if (type === 0) {
    msgData.text = speech;
    promise = bot.say(uid, msgData.text, {
      typing: true,
    });
  }
  if (type === 1) {
    msgData = cards;
    promise = bot.sendGenericTemplate(uid, msgData, {
      typing: true,
    });
  }
  if (type === 2) {
    msgData = {
      text: title,
      quickReplies: replies,
    };
    promise = bot.say(uid, msgData, {
      typing: true,
    });
  }
  if (type === 3) {
    msgData = {
      attachment: 'image',
      url: imageUrl,
    };
    promise = bot.say(uid, msgData, {
      typing: true,
    });
  }
  if (type === 'buttons') {
    msgData = {
      text: title,
      buttons,
    };
    promise = bot.say(uid, msgData, {
      typing: true,
    });
  }

  if (messages.length >= 1) {
    promise.then((res) => {
      handleResponse({
        uid,
        messages,
      });
      track(uid,msgData,res);
    }).catch((err) => {
      //@TODO
      // - Send slack messages
      // - Send error to user
      errorHandler({
        err,
        uid,
      });
    });
  } else {
    promise.then((res) => {
      track(uid,msgData,res);
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
    //console.log('slack.api', response, err, config.get('SLACKYPOO'));
  });
  handleResponse({
    uid,
    messages: [message]
  });
});

const track = ((id,msgData, res) => {
  if (config.util.getEnv('NODE_ENV') === 'production'){
    if ( Object.prototype.toString.call( msgData ) === '[object Array]' ) {
      msgData = fb.getGenericTemplate(msgData);
    } else if ( Object.prototype.toString.call( msgData ) === '[object Object]' && msgData.hasOwnProperty('attachment')){
      msgData = fb.getAttachment(msgData, 'image');
    }
    const requestData = {
      url: `https://graph.facebook.com/v2.6/me/messages?access_token=${config.get('FBACCESSTOKEN')}`,
      qs: {access_token: config.get('FBACCESSTOKEN')},
      method: 'POST',
      json: {
        recipient: {id},
        message: msgData,
      },
    };

    dashbot.logOutgoing(requestData, res);
  }
});


bot.start(process.env.PORT || 3000);
