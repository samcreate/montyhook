import config from 'config';
import BootBot from 'bootbot';
import APIAI from './api-ai';
import db from 'montydb';
import fb from './util/facebook';
import varietalPluralizer from './util/varietal-plural';

const bot = new BootBot({
  accessToken: config.get('FBACCESSTOKEN'),
  verifyToken: 'verify_this_biotch',
  appSecret: 'd72e85f0a433b179925473bf431df2fd',
});

bot.on('message', (payload, chat) => {
  const text = payload.message.text;
  const uid = payload.sender.id;
  console.log(`The user said: ${text}`, uid);
  APIAI.get({
    uid,
    text
  })
    .then(handleResponse);
// chat.say(text);
});

bot.setGetStartedButton((payload, chat) => {
  const uid = payload.sender.id;
  APIAI.get({
    uid,
    text: 'Get Started'
  })
    .then(handleResponse);
});


APIAI.on('get-varietals', (originalRequest, apiResponse) => {

  const {intent_id} = apiResponse.result.parameters;
  let cards = [];

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
              'payload': 'About Monty\'s Picks',
              'title': 'About Monty\'s Picks',
            }]
        )
      );

      handleResponse({uid: originalRequest.uid, messages: [{cards,type: 1}]});
    });
});


const handleResponse = ({uid, messages}) => {
  console.log('handleResponse: ', messages);

  let {type, speech, replies, title, cards} = messages.shift();
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

  if (messages.length >= 1) {
    promise.then(() => {
      handleResponse({
        uid,
        messages
      });
    }).catch((err) => {
      //@TODO
      // - Send slack messages
      // - Send error to user
    });
  }
};

bot.start();
