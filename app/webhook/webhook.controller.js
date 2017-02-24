import jwt from 'jsonwebtoken';
import encode from '../encode/encode.helper.js';
import fb from '../util/facebook';
import config from 'config';
import Slack from 'slack-node';
import request from'request';
import stats from '../util/statistics';
import numberToWord from '../util/number-to-word';
import db from 'montydb';
import BootBot from 'bootbot';

const slack = new Slack(config.get('SLACKYPOO'));
let publicFields = '-__v -password';


const bot = new BootBot({
  accessToken: config.get('FBACCESSTOKEN'),
  verifyToken: 'verify_this_biotch',
  appSecret: 'd72e85f0a433b179925473bf431df2fd'
});

bot.on('message', (payload, chat) => {
    const text = payload.message.text;
    console.log(`The user said: ${text}`);
});

module.exports = {
  test,
  router,
};

function router(req, res) {
  /**
    * @api {POST} /apiai-webhook
    * @apiDescription Routes the requests comping from api.ai webhook fullfiliment
    */
  console.log('req.body.result',req.body.originalRequest.data)
  const action = req.body.result.action;
  switch (action) {
    case 'wines-by-variance':
      _handleWinesByVariance(req, res);
      break;
    case 'get-varietals':
      _handleGetVarietals(req, res)
      break;
    case 'missing-intent':
      _handleMissingIntents(req, res)
      break;
    case 'notify-missing-intent':
      _handleNotifyMissingIntent(req, res)
      break;
    case 'varietal-learning-cold':
      _handleVarietalLearningCold(req, res)
      break;
    default:

  }
}

function test(req, res) {
  /**
    * @api {GET} /users list
    * @apiDescription Get list of users
    * @apiName list
    * @apiGroup Users
    * @apiPermission Authenticated
    */

  res
    .status(200)
    .json({
      hello: 'test'
    });
}
;

const getFBUserData = (originalRequest) => {
  let fb_id = (function() {
    if (originalRequest === null) {
      return '3431432432432';
    } else {
      return originalRequest.data.sender.id;
    }
  }());
  let fb_url = `https://graph.facebook.com/${fb_id}?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=${config.get('FBACCESSTOKEN')}`;
  let fb_data;
  return new Promise((resolve, reject) => {
    request.get({
      url: fb_url,
    }, function(error, response, body) {
      body = JSON.parse(body)
      body.fullname = `${body.first_name} ${body.last_name}`
      body.id = fb_id;
      if (body.hasOwnProperty('first_name')) {
        resolve(body);
      } else {
        reject('FACEBOOK NAME FAILED')
      }

    });
  })
}

const sendMessage = (req, res, message) => {
  let apiai_tmpl = {};
  apiai_tmpl.data = {};
  apiai_tmpl.data.facebook = [];
  apiai_tmpl.contextOut = [];
  apiai_tmpl.source = 'Monty'
  fb.addTyping(apiai_tmpl.data.facebook, 2);
  apiai_tmpl.data.facebook.push({
    text: message
  });

  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(apiai_tmpl));
}

const _handleNotifyMissingIntent = (req, res) => {
  console.log('_handleNotifyMissingIntent req.body:', req.body)
  let missed_msg = req.body.result.parameters['missing-intent'];
  if (missed_msg === null || missed_msg === '') return;
  let fb_data;
  getFBUserData(req.body.originalRequest)
    .then((fbUser) => {
      fb_data = fbUser;
      return db.PastConversation.create({
        body: req.body
      })
    })
    .then((pastConvo) => {
      let missed_msg_arr = missed_msg.split(' ');
      let options = {
        limit: 10,
        where: {
          $or: (function() {
            let _tmparr = [];
            missed_msg_arr.forEach((key) => {
              _tmparr.push({
                title: {
                  $iLike: '%' + key + '%'
                }
              })
            })
            return _tmparr;
          }())
        }
      };
      db.Intents.findAll(options)
        .then((results) => {
          let _response = [{
            fallback: `Failed intent: ${missed_msg}`,
            color: "#36a64f",
            author_name: `${fb_data.fullname} said:`,
            author_icon: `${fb_data.profile_pic}`,
            title: "👉 Add new to Montymin 👈",
            title_link: `https://${config.get('BASIC_AUTH_USER')}:${config.get('BASIC_AUTH_PASS_ENCODED')}@${config.get('HOST')}/intents/add?intent=${missed_msg}&pastConvoID=${pastConvo.id}`,
            text: `${missed_msg}`,
            footer: "Monty's Pager",
            ts: (new Date).getTime()
          }];

          config.get('BASIC_AUTH_USER')
          results.forEach((intent) => {
            console.log(intent.title)
            _response.push(
              {
                pretext: "Potential Match? 🤔",
                title: intent.title,
                title_link: `https://${config.get('BASIC_AUTH_USER')}:${config.get('BASIC_AUTH_PASS_ENCODED')}@${config.get('HOST')}/intents/edit/${intent.id}?intent_add=${missed_msg}&pastConvoID=${pastConvo.id}`
              }
            )
          })
          console.log(_response)
          slack.api('chat.postMessage', {
            text: 'Help Monty be great again!',
            attachments: JSON.stringify(_response),
            username: "Monty's Pager",
            icon_emoji: ":pager:",
            channel: config.get('SLACK_CHANNEL')
          }, function(err, response) {
            console.log('slack.api', response, err, config.get('SLACKYPOO'));
          });

          let apiai_tmpl = {};
          apiai_tmpl.data = {};
          apiai_tmpl.data.facebook = [];
          apiai_tmpl.contextOut = [];
          apiai_tmpl.source = 'Monty'
          fb.addTyping(apiai_tmpl.data.facebook, 2);
          apiai_tmpl.data.facebook.push({
            text: `I'm on it.`
          });
          apiai_tmpl.data.facebook.push({
            text: `I'll get back to you ASAP! 🚀`
          });
          fb.addTyping(apiai_tmpl.data.facebook, 2);
          apiai_tmpl.data.facebook.push({
            text: `In the meantime, can I can help with something else?`,
            quick_replies: [
              {
                "content_type": "text",
                "title": "🍷 Find a wine",
                "payload": "🍷 Find a wine"
              },
              {
                "content_type": "text",
                "title": "🤖 How it works",
                "payload": "🤖 How it works"
              }
            ]

          });

          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify(apiai_tmpl));
        })

    })
}

const _handleMissingIntents = (req, res) => {

  console.log('_handleMissingIntents', req.body)
  var resQ = req.body.result.resolvedQuery
  if (resQ.indexOf('SHOPBY_VARIETAL~') != -1 || resQ.indexOf('SHOPBY_ALL~') != -1) {
    return _handleWinesByVariance(req, res);
  } else if (resQ.indexOf('VARIETAL_LEARNMORE~') != -1) {
    return _handleVarietalLearning(req, res);
  }


  var missed_msg = req.body.result.resolvedQuery;
  var missed_msg_arr = missed_msg.split(' ');
  var _tmp_cards = [];
  var apiai_tmpl = {};
  apiai_tmpl.data = {};
  apiai_tmpl.data.facebook = [];
  apiai_tmpl.contextOut = [{
    name: "fallback",
    lifespan: 2,
    parameters: {
      message: missed_msg
    }
  }];
  apiai_tmpl.source = 'Monty'
  let options = {
    limit: 9,
    where: {
      $or: (function() {
        var _tmparr = [];
        missed_msg_arr.forEach((key) => {
          if (key.length > 2) {
            _tmparr.push({
              title: {
                $iLike: '%' + key + '%'
              }
            })
          }
        })
        return _tmparr;
      }())
    }
  };
  console.log(options)
  db.Intents.findAll(options)
    .then((results) => {
      fb.addTyping(apiai_tmpl.data.facebook, 2);
      apiai_tmpl.data.facebook.push({
        text: `🤔 Hmm. I don't have a match. Are any of these close, or shall I ask a sommelier?`
      });
      results.forEach((intent) => {
        var _temp_title = intent.title.split(',')[0];
        _tmp_cards.push(fb.cardGen(
          _temp_title,
          '',
          intent.bubble1 || '',
          [{
            "type": "postback",
            "payload": `what wine goes with ${_temp_title}`,
            "title": "See more 👀"
          }]
        ));

      })

      _tmp_cards.push(fb.cardGen(
        `No dice? 🎲`,
        '',
        `If none of these are close enough, I can ask a sommelier`,
        [{
          "type": "postback",
          "payload": `Ask a sommelier 🛎`,
          "title": `Ask a sommelier 🛎`
        }]
      ));

      var tmpl_generic = fb.getGenericTemplate(_tmp_cards);
      fb.addTyping(apiai_tmpl.data.facebook, 2);
      apiai_tmpl.data.facebook.push(tmpl_generic);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(apiai_tmpl));
    })



}

const _handleWinesByVariance = (req, res) => {
  console.log('_handleWinesByVariance called', req.body.result.resolvedQuery)
  let query_params = req.body.result.resolvedQuery.split('~')[1];
  query_params = JSON.parse(query_params)
  let all_wines = true;
  console.log('_handleWinesByVariance query_params', query_params)
  let _options = {
    include: [{
      model: db.BaseAttributes,
      where: {
        type: 'wine-attr'
      }
    },
      {
        model: db.Varietals,
        as: 'Varietals',
        attributes: ['id', 'name']
      }]
  };
  if (query_params.hasOwnProperty('varietal_id') == true) {
    all_wines = false;
    _options.where = {
      varietal_id: query_params.varietal_id
    }
  }
  //query all the bottles that match the incoming varietal
  db.Wines.findAll(_options)
    .then((bottles) => {
      console.log('bottles.length', bottles.length)
      //loop through all the bottles
      let res_bottles = []
      bottles.forEach((bottle) => {
        let _temp_bottle = {}
        _temp_bottle.bottle = bottle.get({
          raw: true
        });
        _temp_bottle.attr = {}
        //filter the the weight result since it's somewhat barried in the reponse from sequelize
        bottle.BaseAttributes.forEach((attr) => {
          // console.log(attr.name, attr.WinesAttributes.weight)
          _temp_bottle.attr[attr.name] = {
            weight: attr.WinesAttributes.weight,
            score: null
          }
        })
        var _score_total = 0;
        if (query_params.hasOwnProperty('variance') == true) {
          //let's get the variance score of each taste profile attribute comparing the incoming to the wines in the db
          for (let param in query_params.variance) {
            //console.log('queryparm: :', param, ':', query_params.variance[param])
            let _query_weight = query_params.variance[param];
            let _bottle_weight = _temp_bottle.attr[param].weight;
            //console.log('_temp_bottle.attr: :', param, ':', _temp_bottle.attr[param].weight)
            _temp_bottle.attr[param].score = stats.variance([_bottle_weight, _query_weight]);
          }

          //tally the score per bottle

          for (let param in _temp_bottle.attr) {
            _score_total += _temp_bottle.attr[param].score

          }
        }
        _temp_bottle.total = _score_total;
        res_bottles.push({
          bottle: _temp_bottle,
          score: _score_total
        })
      })
      //sort the scores from least to greatest
      res_bottles = res_bottles.sort(function(a, b) {
        return a.score - b.score;
      });
      //console.log('res_bottles.sorted', res_bottles)
      let _tmp_cards = []

      if (res_bottles.length < 1) {

        slack.api('chat.postMessage', {
          text: `Missing stock for: https://montymin.herokuapp.com/varietals/edit/${query_params.varietal_id}`,
          username: "Monty's Pager",
          icon_emoji: ":pager:",
          channel: config.get('SLACK_CHANNEL')
        }, function(err, response) {
          console.log('slack.api', response, err, config.get('SLACKYPOO'));
        });
        sendMessage(req, res, `I'm sorry we currently don't have that in stock.`);

        return false;
      } else if (res_bottles.length > 10) {
        res_bottles = res_bottles.splice(0, 10);
      }
      const _metals = ['🥇','🥈','🥉']
      res_bottles.forEach((res_bottle, i) => {
        let tmp_buttons = [];
        let wine = res_bottle.bottle.bottle;
        let place = _metals[i] || '';
        tmp_buttons.push({
          "type": "web_url",
          "url": wine.url,
          "title": `Shop at ${wine.price}`
        })

        //description for if there's a varaince applied on the selection
        //and one for not having a variance.
        let description = `${wine.description}`;

        if (query_params.variance === null) {
          description = `${wine.description}`
        }

        var tmp_card = fb.cardGen(
          `${place} ${wine.vintage} ${wine.producer}, ${wine.Varietals.name} ${wine.name}`,
          wine.hero_gallery || '',
          description || '',
          tmp_buttons
        );

        _tmp_cards.push(tmp_card);
      })

      let tmpl = fb.getGenericTemplate(_tmp_cards);
      let apiai_tmpl = {};
      apiai_tmpl.data = {};
      apiai_tmpl.data.facebook = [];
      apiai_tmpl.contextOut = [];
      apiai_tmpl.source = 'Monty'

      fb.addTyping(apiai_tmpl.data.facebook, 3);

      if (_tmp_cards.length == 1) {
        apiai_tmpl.data.facebook.push({
          text: `Here's a smashing wine that matches your request`
        });
      } else {
        apiai_tmpl.data.facebook.push({
          text: `Here's some smashing wines that match your request`
        });
      }
      fb.addTyping(apiai_tmpl.data.facebook, 2);

      apiai_tmpl.data.facebook.push(tmpl);

      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(apiai_tmpl));

    })
}

const _handleGetVarietals = (req, res) => {
  const _intent_id = req.body.result.parameters.intent_id;

  db.Intents.findById(_intent_id, {
    include: [{
      model: db.Varietals
    }, {
      model: db.BaseAttributes
    }],
    order: [[db.Varietals, db.IntentVarietals, 'weight', 'ASC']]
  })
    .then((intent) => {
      //console.log('intent', intent)
      let wine_params = {};
      intent.BaseAttributes.forEach((attr) => {
        wine_params[attr.name] = attr.IntentsAttributes.weight;
      })

      intent.Varietals = intent.Varietals.splice(0, 9);
      intent.Varietals.forEach((varietal) => {

        let tmp_card;
        let tmp_buttons = [];
        let tmp_wine_params = {
          varietal_id: varietal.id,
          variance: wine_params
        }
        let varietal_name_plural = (() => {

          //Bunch of code...
          if (varietal.name == 'Arneis' || varietal.name === 'Pinot Gris') {
            return varietal.name
          } else {
            return varietal.name + 's'
          }
        })();
        tmp_buttons.push(fb.buttonGen(
          'Browse 👀',
          'SHOPBY_VARIETAL~' + JSON.stringify(tmp_wine_params),
          'postback'
        ))
        tmp_buttons.push(fb.buttonGen(
          'Learn more 👉',
          'VARIETAL_LEARNMORE~' + JSON.stringify({
            varietal_id: varietal.id,
            steps: ['bubble1', 'bubble2'],
            step: 1,
            wine_params: tmp_wine_params
          }),
          'postback'
        ))

        console.log('SHOPBY_VARIETAL~' + JSON.stringify(tmp_wine_params))
        tmp_card = fb.cardGen(
          varietal.name,
          '',
          varietal.description,
          tmp_buttons
        );
        cards.push(tmp_card);

      });
      cards.push(
        fb.cardGen(
          `💎 Monty’s picks`,
          '',
          'Let me surprise you with a variety of wine gems that match your request.',
          [{
            "type": "postback",
            "payload": 'SHOPBY_ALL~' + JSON.stringify({
                variance: wine_params
              }),
            "title": `Browse Monty's Picks`
          },
            {
              "type": "postback",
              "payload": "About Monty's Picks",
              "title": "About Monty's Picks"
            }]
        )
      )

      let tmpl = fb.getGenericTemplate(cards);
      let tmpl_image = fb.getImageTemplate(intent.hero || '')
      let apiai_tmpl = {};
      apiai_tmpl.data = {};
      apiai_tmpl.data.facebook = [];
      apiai_tmpl.contextOut = [];
      apiai_tmpl.source = 'Monty'
      fb.addTyping(apiai_tmpl.data.facebook, 2);
      apiai_tmpl.data.facebook.push(tmpl_image);
      fb.addTyping(apiai_tmpl.data.facebook, 2);
      apiai_tmpl.data.facebook.push({
        text: intent.bubble1
      });

      if (intent.bubble2 != null && intent.bubble2 != '') {
        fb.addTyping(apiai_tmpl.data.facebook, 2);
        apiai_tmpl.data.facebook.push({
          text: intent.bubble2
        });
      }
      fb.addTyping(apiai_tmpl.data.facebook, 3);
      apiai_tmpl.data.facebook.push(tmpl);

      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(apiai_tmpl));
    })
    .catch((err) => {
      console.log(err)
    })
}

const _handleVarietalLearning = (req, res) => {
  let query_params = req.body.result.resolvedQuery.split('~')[1];
  query_params = JSON.parse(query_params)
  db.Varietals.findById(query_params.varietal_id)
    .then((varietal) => {

      let tmpl_buttons = [];

      if (query_params.step == 1) {
        tmpl_buttons.push({
          "type": "postback",
          "payload": 'SHOPBY_VARIETAL~' + JSON.stringify(query_params.wine_params),
          "title": `Browse 👀`
        })
        tmpl_buttons.push({
          "type": "postback",
          "payload": `VARIETAL_LEARNMORE~` + JSON.stringify({
              varietal_id: varietal.id,
              steps: ['bubble3', 'bubble4'],
              step: 2,
              wine_params: query_params.wine_params
            }),
          "title": `Learn More 👉`
        })
      } else {
        tmpl_buttons.push({
          "type": "postback",
          "payload": 'SHOPBY_VARIETAL~' + JSON.stringify(query_params.wine_params),
          "title": `Browse 👀`
        })
      }
      let apiai_tmpl = {};
      let tmpl_image = fb.getImageTemplate(varietal.hero || '');
      tmpl_buttons = fb.getButtonTemplate('What would you like to do?', tmpl_buttons)
      apiai_tmpl.data = {};
      apiai_tmpl.data.facebook = [];
      apiai_tmpl.contextOut = [];
      apiai_tmpl.source = 'Monty'

      if (query_params.step == 1) {
        fb.addTyping(apiai_tmpl.data.facebook, 2);
        apiai_tmpl.data.facebook.push(tmpl_image);
      }
      query_params.steps.forEach((step) => {
        fb.addTyping(apiai_tmpl.data.facebook, 2);
        apiai_tmpl.data.facebook.push({
          text: varietal[step]
        });
      });
      fb.addTyping(apiai_tmpl.data.facebook, 2);
      apiai_tmpl.data.facebook.push(tmpl_buttons);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(apiai_tmpl));
    })
}

const _handleVarietalLearningCold = (req, res) => {
  let options = {
    where: {
      $or: [{
        name: {
          $iLike: '%' + req.body.result.parameters.Varietal + '%'
        }
      }]
    }
  }
  db.Varietals.findOne(options)
    .then((varietal) => {
      console.log('_handleVarietalLearningCold: result:', varietal);
      let wine_params = {
        varietal_id: varietal.id,
        variance: null
      };
      req.body.result.resolvedQuery = `VARIETAL_LEARNMORE~` + JSON.stringify({
        varietal_id: varietal.id,
        steps: ['bubble1', 'bubble2'],
        step: 1,
        wine_params: wine_params
      });
      _handleVarietalLearning(req, res);
    })
};
