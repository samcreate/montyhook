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
import DashBot from 'dashbot';
import Cache from 'express-redis-cache';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import shortid from 'shortid';
import wineCardGen from './util/wine-card-gen';
import cardGen from './util/cards-gen';
import stopword from 'stopword';
import SlackProxy from './slack-proxy';


global.redisCache = redis.createClient(config.get('REDIS'));
const slackProxy = new SlackProxy(APIAI);
// four hours 14400
let dashbot = DashBot('2qZGV9kSH8XU6GLM06X0rtAKNqHAOxt9qPUvRGHy').facebook;
global.cache = Cache({client: global.redisCache, expire: 14400});


redisCache.on('error', (err)=>{
  console.log('err: ', err);
});

redisCache.on('ready', (res)=>{
  console.log('redis ready: ');
});


const montySlack = new Slack('xoxb-158388941842-KpXzYKLEHORZV9UywyaTLofy');
const slack = new Slack('xoxp-62934831171-62994946897-157077774481-b58e19cdb2401f99634885f754985da5');

BootBot.prototype._verifyRequestSignature = function(req, res, buf){

  if (req.headers['user-agent'] !== 'Slackbot 1.0 (+https://api.slack.com/robots)') {
    let signature = req.headers['x-hub-signature'];
    if (!signature) {
      throw new Error('Couldn\'t validate the request signature.');
    } else {
      let elements = signature.split('=');
      let signatureHash = elements[1];
      let expectedHash = crypto.createHmac('sha1', this.appSecret)
        .update(buf)
        .digest('hex');

      if (signatureHash !== expectedHash) {
        throw new Error('Couldn\'t validate the request signature.');
      }
    }
  }
};

const bot = new BootBot({
  accessToken: config.get('FBACCESSTOKEN'),
  verifyToken: 'verify_this_biotch',
  appSecret: config.get('FBAPPSECRET'),
});

bot.app.use(bodyParser.urlencoded({ extended: false }));
bot.app.post('/send-message', (req, res, next) =>{
  console.log('/send-message', req.body);
  db.Channel.findOne({
    where: {
      channel_id: req.body.channel_id,
    },
  })
  .then((channel)=>{
    if (channel){
      bot.say(channel.UserUid, req.body.text);
    }
  })
  .then(()=>{
    montySlack.api('chat.postMessage', {
      text: req.body.text,
      channel: req.body.channel_id,
      username: `${req.body.user_name} replied`,
      icon_emoji: ':wine_glass:',
    }, function(err, response) {
      if (response.ok === true) {

      } else {

      }
    });
  })
  .catch(()=>{

  });

  //reset the cache time

  res.status(200).send('');
});
bot.app.get('/startchat/:uid', (req, res, next) => {
  //
  let uid = req.params.uid;
  let channelID;
  let ourUser;
  console.log('looking for:', `users:${uid}`);
  db.User.findOne({
    where: {
      uid,
    },
    include: [
      {
        model: db.Channel,
      },
    ],
  })
    .then((user) => {
      ourUser = user;
      if (!ourUser){
        return false;
      }
      console.log('user found');
      if (user.Channel) {
        //return existing channel
        console.log('channel found');
        return new Promise((resolve, reject) => {
          console.log('trying unarchive channel');
          slack.api('channels.unarchive', {
            channel: user.Channel.channel_id,
          }, function(err, response) {
            if (response.ok === true) {
              console.log('unarchive inviting monty back in');
              slack.api('channels.invite', {
                channel: user.Channel.channel_id,
                user: 'U4NBETPQS',
              }, function(err, response) {

                if (response.ok === true) {
                  console.log('all good, lets go');
                  resolve(user.Channel);
                } else {
                  reject(response);
                }
              });
            } else {
              if (response.error === 'not_archived'){
                console.log('not_archived');
                resolve(user.Channel);
              } else {
                reject(response);
              }
            }
          });
        });
      } else {
        console.log('create a chatroom and send on through');
        //create a chatroom and send on through
        return new Promise((resolve, reject) => {
          slack.api('channels.create', {
            name: `M_${user.first_name}_${user.last_name}`,
          }, function(err, response) {
            if (response.ok === true) {
              console.log('slack channgel created');
              db.Channel.create({
                channel_id: response.channel.id,
              })
                .then((dbChannel) => {
                  return ourUser.setChannel(dbChannel);
                })
                .then((setChannel) => {
                  console.log('try to sjoin channel');
                  return new Promise((resolve, reject) => {
                    slack.api('channels.invite', {
                      channel: setChannel.channel_id,
                      user: 'U4NBETPQS',
                    }, function(err, response) {
                      if (response.ok === true) {
                        resolve(setChannel);
                      } else {
                        reject(response);
                      }
                    });
                  });
                })
                .then((setChannel) => {
                  resolve(setChannel);
                });
            } else {
              console.log('slack channgel rejected')
              reject(response);
            }
            console.log('slack.api', response);
          });
        });
      }
    })
    .then((setResponse) => {
      channelID = setResponse.channel_id;
      let _html = `<html><head> <meta http-equiv="content-type" content="text/html; charset=UTF-8"> <meta name="robots" content="noindex, nofollow"> <meta name="googlebot" content="noindex, nofollow"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>Monty Slack Opener</title></head><body> <style> html, body { height: 100%; margin: 0px; font-family: "andale mono"; } #monty { margin-top: 30px; } h2{ font-size: 34px;} #message { background: white; width: 380px; height: 200px; border-radius: 15px; box-shadow: 0px 0px 0px 6px rgba(0, 0, 0, 0.1); position: absolute; top: 0; bottom: 0; left: 0; right: 0; margin: auto; padding: 20px; text-align: center; line-height: 31px; letter-spacing: 0px; } a { letter-spacing: 0px; text-decoration: none; }</style><div id="wrapper" style="width: 100%; height: 100%; background: linear-gradient(0deg,#ff0566,#ff3737);"> <div id="message"> <div id="monty"> <h2>🎉</h2><h3> Slack Channel opended. </h3> <h4>Plz close this window.</h4> </div> </div></div><script>window.location = 'slack://channel?id=${setResponse.channel_id}&team=T1UTGQF51';</script></body></html>`;
      res.send(_html);

    })
    .then(() =>{
      return new Promise((resolve, reject) => {
        cache.add(`channel:${uid}`, JSON.stringify({uid}), {
          type: 'json',
        }, (error, added) => {
          console.log('add channel:',uid,'to cache');
          resolve();
        });
      });
    })
    .then(() => {
      return new Promise((resolve, reject) => {

        let _response = [{
          fallback: '',
          color: '#000000',
          author_name: `${ourUser.first_name} ${ourUser.last_name}`,
          author_icon: `${ourUser.profile_pic}`,
          title: 'View Profile Photo',
          title_link: ourUser.profile_pic,
          text: `Gender: ${ourUser.gender}, Locale: ${ourUser.locale}, Locale: ${ourUser.timezone}`,
          footer: 'Monty\'s Pager',
          ts: (new Date).getTime(),
        }];
        _response.push({
          fallback: 'ARRR.',
          color: '#36a64f',
          text: '_`/r [TEXT]` to reply_',
          mrkdwn_in: ['text', 'pretext'],
        });
        _response.push({
          fallback: 'ARRR.',
          color: '#36a64f',
          text: `_\`/pause\` to recieve messages from ${ourUser.first_name} in slack_`,
          mrkdwn_in: ['text', 'pretext'],
        });
        _response.push({
          fallback: 'ARRR.',
          color: '#36a64f',
          text: `_\`/unpause\` to allow the bot handle the messages from ${ourUser.first_name}_`,
          mrkdwn_in: ['text', 'pretext'],
        });
        _response.push({
          fallback: 'ARRR.',
          color: '#36a64f',
          text: `_\`/sendwine 22,34,2\` to send wine cards to ${ourUser.first_name}_`,
          mrkdwn_in: ['text', 'pretext'],
        });
        _response.push({
          fallback: 'ARRR.',
          color: '#36a64f',
          text: `_\`/sendcards 69,666,1\` to send cards to ${ourUser.first_name}_`,
          mrkdwn_in: ['text', 'pretext'],
        });
        _response.push({
          fallback: 'ARRR.',
          color: '#36a64f',
          text: `_\`/sendintent 33\` to send an intent flow to ${ourUser.first_name}_`,
          mrkdwn_in: ['text', 'pretext'],
        });
        _response.push({
          fallback: 'ARRR.',
          color: '#36a64f',
          text: `_\`/sendtada 222\` to send a tada to ${ourUser.first_name}_`,
          mrkdwn_in: ['text', 'pretext'],
        });
        montySlack.api('chat.postMessage', {
          text: 'User Info:',
          attachments: JSON.stringify(_response),
          as_user: true,
          channel: channelID,
        }, function(err, response) {
          if (response.ok === true) {
            resolve(response);
          } else {
            reject(response);
          }
        });

      });
    })
    .then(()=>{
      console.log('set channel to arhived false');
      return db.Channel.findOne({
        where: {
          channel_id: channelID
        },
      });
    })
    .then((channel)=>{
      console.log('channel');
      channel.archived = false;
      channel.updatedAt = new Date();
       return channel.save();
    })
    .then((res) =>{
      console.log('channel saved!');
    })
    .catch((err) => {
      console.log('err', err);
      res.status(500).send('Something broke!' + JSON.stringify(err));
    });
});
bot.app.post('/unpause', (req, res, next) => {

  db.Channel.findOne({
    where: {
      channel_id: req.body.channel_id,
    },
  })
    .then((channel) => {
      if (channel) {
        cache.del(`users:${channel.UserUid}`, function(error) {
          console.log('user unpaused;');
          res.status(200).send('user is no longer paused.');
        });
      }
    });
});
bot.app.post('/pause', (req, res, next) => {

  db.Channel.findOne({
    where: {
      channel_id: req.body.channel_id,
    },
  })
    .then((channel) => {
      if (channel) {
        cache.add(`users:${channel.UserUid}`, JSON.stringify(channel.get({
          raw: true
        })), {
          type: 'json',
        }, (error, added) => {
          res.status(200).send('user has been paused.');
        });
      }
    });
});
bot.app.post('/sendwine', (req, res, next) => {

  let wineIds = req.body.text.split(',').map(function(item) {
    return parseInt(item, 10);
  }).splice(0, 10);
  let resBottles;
  db.Wines.findAll({
    where: {
      id: wineIds,
    },
  })
  .then((bottles) =>{
    console.log(bottles);
    if (bottles && bottles.length >= 1){
      resBottles = bottles;
      return  db.Channel.findOne({
        where: {
          channel_id: req.body.channel_id,
        },
      });
    } else {
      return res.status(200).send('☹️ Could not find any matching wine for: ' + JSON.stringify(wineIds));
    }
  })
  .then((channel) =>{
    if (channel){
      let wineRes = wineCardGen(resBottles);
      handleResponse({
        uid: channel.UserUid,
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
    } // if channel
    res.status(200).send('Wine sent! 🍷 💌 ✈️');
  })
  .catch((err) =>{
    res.status(200).send('☹️ There was an Error with your request: ' + JSON.stringify(err));
  });
});
bot.app.post('/sendcards', (req, res, next) => {

  let cardIds = req.body.text.split(',').map(function(item) {
    return parseInt(item, 10);
  })
  .splice(0, 10);
  console.log('/sendcards: ',cardIds);
  slackProxy.sendCards({channelId: req.body.channel_id, cardIds})
  .then((response) => {
    if (response.ok){
      handleResponse({
        uid: response.uid,
        messages: [
          {
            cards: response.cards,
            type: 1,
          },
        ],
      });
    }
    res.status(200).json({
      response_type: 'ephemeral',
      text: response.responseCopy,
    });
  });

});
bot.app.post('/getuser', (req, res, next) => {
  console.log('/getuser',req.body.text);
  if (req.body.text.toLowerCase() === 'donald trump'){
    return res.status(200).json({
      response_type: 'ephemeral',
      text: '!!!',
      attachments: [{
        title: 'Here\'s Donny! :tangerine:',
        title_link: `https://files.slack.com/files-pri/T1UTGQF51-F4T1U9YS0/pasted_image_at_2017_03_31_04_05_pm.png?pub_secret=d6b3ec8f96`,
        image_url: 'https://files.slack.com/files-pri/T1UTGQF51-F4T1U9YS0/pasted_image_at_2017_03_31_04_05_pm.png?pub_secret=d6b3ec8f96',
      }],
    });

  }
  let name = req.body.text.split(' ').map(function(item) {
    return item.trim();
  });
  let _where = {
    $and: [],
  };
  _where.$and.push({
    first_name: {
      $iLike: name[0],
    },
  });
  if (name.length > 1){
    _where.$and.push({
      last_name: {
        $iLike: name[1],
      },
    });
  }
  db.User.findAll({
    where: _where,
  })
  .then((users)=>{
    if(users && users.length >= 1){
      let _response = [];
      users.forEach((user)=>{
        _response.push(
          {
            fallback: '',
            color: '#000000',
            author_name: `${user.first_name} ${user.last_name}`,
            author_icon: `${user.profile_pic}`,
            title: 'Start Chat?',
            title_link: `https://${config.get('HOST')}/startchat/${user.uid}`,
            text: `Gender: ${user.gender}, Locale: ${user.locale}, Locale: ${user.timezone}`,
          }
        );
      });
      res.status(200).json({
        response_type: 'ephemeral',
        text: 'Results: ',
        attachments: _response,
      });
    } else {
      res.status(200).json({
        response_type: 'ephemeral',
        text: 'Results: ',
        attachments: [{
          fallback: '',
          color: '#FF0000',
          text: `No user found!`,
        }],
      });
    }
  })
  .catch((err)=>{
    console.log(err);
    res.status(200).send(err);
  });
});
bot.app.post('/sendintent', (req, res, next) => {
  let intentId = parseInt(req.body.text);
  slackProxy.sendIntent({channelId: req.body.channel_id, intentId})
  .then((text) => {
    res.status(200).json({
      response_type: 'ephemeral',
      text,
    });
  });
});
bot.app.post('/search', (req, res, next) => {


  let slackResponse = [];
  let searchTerms = req.body.text.split(' ');
  let intentSearchOptions = {
    order: 'title ASC',
    limit: 5,
    where: {
      $and: (function() {
        let _tmparr = [];
        searchTerms.forEach((key) => {
          if (key.length > 3) {
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
  db.Intents.findAll(intentSearchOptions)
  .then((results)=>{
    console.log('Intents resluts: ',results.length);
    if (results && results.length >= 1){
      slackResponse.push({
        fallback: `Montymin Results.`,
        text: `*Intents resluts for :* ${searchTerms.toString()}`,
        color: '#36a64f',
        mrkdwn_in: ['text'],
      });
      results.forEach((item)=>{
        slackResponse.push(
          {
            fallback: `Montymin Results.`,
            text: `   <https://${config.get('HOSTADMIN')}/intents/edit/${item.id}|${item.title.substring(0,35)}...> \`${item.id}\``,
            mrkdwn_in: ['text'],
          }
        )
      });
    }
    let wineSearchOptions = {
      limit: 5,
      where: {
        $or: (function() {
          let _tmparr = [];
          searchTerms.forEach((key) => {
            if (key.length >= 3) {
              _tmparr.push({
                name: {
                  $iLike: '%' + key + '%',
                },
              });
              _tmparr.push({
                producer: {
                  $iLike: '%' + key + '%',
                },
              });
              if (!isNaN(parseInt(key))){
                _tmparr.push({
                  vintage: {
                    $eq: key,
                  },
                });
              }
              if (key === 'white' || key === 'red' || key === 'rose'){
                _tmparr.push({
                  type: {
                    $eq: key,
                  },
                });
              }
              if (key === 'sparkling' || key === 'dessert' || key === 'fortified' || key === 'natural'){
                let _style = {};
                _style[key] = true;
                _tmparr.push(_style);
              }
            }
          });
          return _tmparr;
        }()),
      },
    };
    return db.Wines.findAll(wineSearchOptions);
  })
  .then((results)=>{
    console.log('Wine resluts: ',results.length);
    if (results && results.length >= 1){
      slackResponse.push({
        fallback: `Montymin Results.`,
        text: `*Wine resluts for :* ${searchTerms.toString()}`,
        color: '#bad',
        mrkdwn_in: ['text'],
      });
      results.forEach((item)=>{
        let _wineTitle = `${item.vintage} ${item.producer}, ${item.name}`;
        slackResponse.push(
          {
            fallback: `Montymin Results.`,
            text: `<https://${config.get('HOSTADMIN')}/wines/edit/${item.id}|${_wineTitle.substring(0,35)}...> \`${item.id}\``,
            mrkdwn_in: ['text'],
          }
        )
      });
    }
    let varietalSearchOptions = {
      limit: 5,
      where: {
        $and: (function() {
          let _tmparr = [];
          searchTerms.forEach((key) => {
            if (key.length >= 3) {
              _tmparr.push({
                name: {
                  $iLike: '%' + key + '%',
                },
              });
              _tmparr.push({
                synonyms: {
                  $iLike: '%' + key + '%',
                },
              });
            }
          });
          return _tmparr;
        }()),
      },
    };
    return db.Varietals.findAll(varietalSearchOptions);
  })
  .then((results) => {
    console.log('Card resluts: ',results.length);
    if (results && results.length >= 1){
      slackResponse.push({
        fallback: `Montymin Results for: ${searchTerms.toString()}.`,
        text: `*Card resluts for :* ${searchTerms.toString()}`,
        color: '#36a64f',
        mrkdwn_in: ['text'],
      });
      results.forEach((item)=>{
        slackResponse.push(
          {
            fallback: `Montymin Results.`,
            text: `   <https://${config.get('HOSTADMIN')}/varietals/edit/${item.id}|${item.name.substring(0,35)}...> \`${item.id}\``,
            mrkdwn_in: ['text'],
          }
        )
      });
    }
    if(slackResponse.length < 1){
      slackResponse.push(
        {
          fallback: `Montymin Results.`,
          text: `_ Zero results for: ${searchTerms.toString()}_`,
          mrkdwn_in: ['text'],
        }
      )
    }
    return res.status(200).json({
      response_type: 'ephemeral',
      text: 'Results: ',
      attachments: slackResponse,
    });


  })
  .catch((err)=>{
    return res.status(200).json({
      response_type: 'ephemeral',
      text: 'Results: ' + JSON.stringify(err),
    });
  });
});
bot.app.post('/sendtada', (req, res, next) => {
  let intentId = parseInt(req.body.text);
  slackProxy.sendIntentAsTada({channelId: req.body.channel_id, intentId})
  .then((response) => {
    if (response.ok){
      handleResponse({
        uid: response.uid,
        messages: [
          {
            cards: response.cards,
            type: 1,
          },
        ],
      });
    }
    res.status(200).send(response.responseCopy);
  });
});
bot.app.post('/webhook', (req, res, next) => {
  if (config.util.getEnv('NODE_ENV') === 'production') {
    dashbot.logIncoming(req.body);
  }
  //
  new Promise((resolve) => {

    let data = req.body;
    if (data.object === 'page') {
      //console.log('---> it\'s from a page');
      //console.log('---> its a meesage to check and we have paused users');
      data.entry.forEach((entry) => {
        //console.log('---> data entry loop',entry.messaging);
        entry.messaging.forEach((event, i) => {
          //console.log('---> event loop',i);
          if (event.message && event.message.text) {
            //console.log('---> event.message true');
            let sender = event.sender.id;
            let message = event.message;
            // console.log('::::: message::::::', event,users);
            cache.get(`users:${sender}`, function (error, user) {
              if (user.length >= 1) {
                //console.log('!!!!!!!!---> mark message as paused');
                message.paused = true;
              }
              resolve();
            });
          } else {
            resolve();
          }
        });
      });

    }

  })
    .then(() => {
      next();
    })
    .catch(() => {
      next();
    });
});
bot.app.post('/wine', (req, res, next) => {
  let slackResponse = [];
  let searchTerms = req.body.text.split(' ');

  let wineSearchOptions = {
    limit: 10,
    where: {
      $or: [
        {
          $and: [],
        },
        {
          $or: [],
        },
      ],
    },
  };
  let $and = wineSearchOptions.where['$or'][0]['$and'];
  let $or = wineSearchOptions.where['$or'][1]['$or'];
  searchTerms.forEach((key) => {
    if (key === 'sparkling' || key === 'dessert' || key === 'fortified' || key === 'natural') {
      let _style = {};
      _style[key] = true;
      $and.push(_style);
    }
    if (!isNaN(parseInt(key))) {
      $and.push({
        vintage: {
          $eq: key,
        },
      });
    }
    if (key === 'white' || key === 'red' || key === 'rose') {
      $and.push({
        type: {
          $eq: key,
        },
      });
    }
    if (key.length >= 3) {
      $or.push({
        name: {
          $iLike: '%' + key + '%',
        },
      });
      $or.push({
        producer: {
          $iLike: '%' + key + '%',
        },
      });
    }
  });

  db.Wines.findAll(wineSearchOptions)
    .then((results) => {
      console.log('Intents resluts: ', results.length);
      if (results && results.length >= 1) {

        results.forEach((item) => {
          let _wineTitle = `${item.vintage} ${item.producer}, ${item.name}`
          slackResponse.push(
            {
              pretext: `*${_wineTitle}*`,
              text: `${item.description}`,
              fallback: 'Result',
              callback_id: 'sendwine',
              color: '#3AA3E3',
              attachment_type: 'default',
              mrkdwn_in: ['text', 'pretext'],
              thumb_url: item.hero,
              actions: [
                {
                  name: 'wine',
                  text: 'Send To User',
                  style: 'danger',
                  type: 'button',
                  value: item.id,
                  confirm: {
                    title: 'Confirm',
                    text: `${_wineTitle} will be sent to a live user.`,
                    ok_text: 'Yes',
                    dismiss_text: 'No',
                  },
                },
              ],
            }
          );
        });
        return res.status(200).json({
          response_type: 'ephemeral',
          text: 'Results: ',
          attachments: slackResponse,
        });

      } else {
        return res.status(200).json({
          response_type: 'ephemeral',
          text: '👻 No results!',
        });
      }
    });
});
bot.app.post('/intent', (req, res, next) => {

  let slackResponse = [];
  let searchTerms = req.body.text.split(' ');
  let intentSearchOptions = {
    order: 'title ASC',
    limit: 10,
    where: {
      $and: (function() {
        let _tmparr = [];
        searchTerms.forEach((key) => {
          if (key.length > 3) {
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
  db.Intents.findAll(intentSearchOptions)
    .then((results) => {
      console.log('Intents resluts: ', results.length);
      if (results && results.length >= 1) {

        results.forEach((item) => {

          slackResponse.push(
            {
              text: `${item.title}`,
              fallback: 'Result',
              callback_id: 'sendintent',
              color: '#3AA3E3',
              attachment_type: 'default',
              mrkdwn_in: ['text'],
              actions: [
                {
                  name: 'intent',
                  text: 'Send To User',
                  style: 'danger',
                  type: 'button',
                  value: item.id,
                  confirm: {
                    title: 'Confirm',
                    text: `${item.title} will be sent to a live user.`,
                    ok_text: 'Yes',
                    dismiss_text: 'No',
                  },
                },
                {
                  name: 'intent_tada',
                  text: 'Send As a Tada 🎉',
                  style: 'danger',
                  type: 'button',
                  value: item.id,
                  confirm: {
                    title: 'Confirm',
                    text: `${item.title} will be sent to a live user as a Tada 🎉.`,
                    ok_text: 'Yes',
                    dismiss_text: 'No',
                  },
                },
              ],
            }
          );
        });
        return res.status(200).json({
          response_type: 'ephemeral',
          text: 'Results: ',
          attachments: slackResponse,
        });

      }
    });
});
bot.app.post('/card', (req, res, next) => {

  let slackResponse = [];
  let searchTerms = req.body.text.split(' ');
  let varietalSearchOptions = {
    order: 'name ASC',
    limit: 10,
    where: {
      $or: (function() {
        let _tmparr = [];
        searchTerms.forEach((key) => {
          if (key.length >= 0) {
            _tmparr.push({
              name: {
                $iLike: '%' + key + '%',
              },
            });
            _tmparr.push({
              synonyms: {
                $iLike: '%' + key + '%',
              },
            });
          }
        });
        return _tmparr;
      }()),
    },
  };
  db.Varietals.findAll(varietalSearchOptions)
    .then((results) => {
      console.log('card resluts: ', results.length);
      if (results && results.length >= 1) {

        results.forEach((item) => {

          slackResponse.push(
            {
              text: `${item.name}`,
              fallback: 'Result',
              callback_id: 'sendcard',
              color: '#3AA3E3',
              attachment_type: 'default',
              mrkdwn_in: ['text'],
              actions: [
                {
                  name: 'card',
                  text: 'Send To User',
                  style: 'danger',
                  type: 'button',
                  value: item.id,
                  confirm: {
                    title: 'Confirm',
                    text: `${item.name} will be sent to a live user.`,
                    ok_text: 'Yes',
                    dismiss_text: 'No',
                  },
                },
              ],
            }
          );
        });
        return res.status(200).json({
          response_type: 'ephemeral',
          text: 'Results: ',
          attachments: slackResponse,
        });

      }
    });
});
bot.app.post('/message_actions', (req, res, next) => {
  let {payload} =  req.body;
  payload = JSON.parse(payload);
  let channelId = payload.channel.id;
  console.log('payload',  payload )
  if (payload.callback_id === 'sendintent'){
    let action = payload.actions[0].name;
    let intentId = payload.actions[0].value;
    if (action === 'intent') {
      slackProxy.sendIntent({channelId, intentId})
      .then((text) => {
        res.status(200).json({
          response_type: 'ephemeral',
          text,
        });
      });
    } else if (action === 'intent_tada') {
      slackProxy.sendIntentAsTada({channelId, intentId})
      .then((response) => {
        if (response.ok){
          handleResponse({
            uid: response.uid,
            messages: [
              {
                cards: response.cards,
                type: 1,
              },
            ],
          });
        }
        res.status(200).json({
          response_type: 'ephemeral',
          text: response.responseCopy,
        });
      });
    }
  } //send intent

  if (payload.callback_id === 'sendcard'){
    let action = payload.actions[0].name;
    let cardId = payload.actions[0].value;
    if ( action === 'card' ) {
      slackProxy.sendCards({channelId, cardIds: [cardId]})
      .then((response) => {
        if (response.ok){
          handleResponse({
            uid: response.uid,
            messages: [
              {
                cards: response.cards,
                type: 1,
              },
            ],
          });
        }
        res.status(200).json({
          response_type: 'ephemeral',
          text: response.responseCopy,
        });
      });
    }
  } //cards

  if (payload.callback_id === 'sendwine'){
    let wineId = payload.actions[0].value;
    slackProxy.sendWine({channelId, wineIds: [wineId]})
    .then((response) => {
      if (response.ok){
        console.log('here:::: ', response.speech)
        handleResponse({
          uid: response.uid,
          messages: [
            {
              speech: response.speech,
              type: 0,
            },
            {
              cards: response.cards,
              type: 1,
            },
          ],
        });
      }
      res.status(200).json({
        response_type: 'ephemeral',
        text: response.responseCopy,
      });
    });

  } //wine
});


bot.on('attachment', (payload, chat) => {
  // Send an attachment
  if (payload.message.hasOwnProperty('sticker_id') && payload.message.sticker_id === 369239263222822 ||  payload.message.sticker_id === 369239343222814 ||  payload.message.sticker_id === 369239383222810){
    chat.say('👍',{typing:true});
  }
  if (payload.message.attachments[0].type === 'image' && payload.message.hasOwnProperty('sticker_id') === false){
    let imageCopyRes = [
      'Nice 📸 . Would you like me to send it to sommelier for their thoughts?',
      'Lovely 📸. Shall I send it to a sommelier for their thoughts?',
      'Smashing 📸. Do you want me to send it to a sommelier for their thoughts?',
    ];

    chat.say({
      text: imageCopyRes[Math.floor(Math.random() * imageCopyRes.length)],
      buttons: [{
        'type': 'postback',
        'payload': 'IMAGECHECK~' + JSON.stringify({
          image: payload.message.attachments[0].payload.url,
          id: shortid.generate(),
        }),
        'title': 'Ask now 🛎️',
      }],
    },{typing: true});

  }
  if (payload.message.attachments[0].type === 'audio'){
    chat.say('I wish I could hear but I was born without 👂\'s',{typing:true});
  }
});
bot.on('message', (payload) => {
  let text = payload.message.text;
  const uid = payload.sender.id;

  if (payload.message.hasOwnProperty('paused') !== true){
    APIAI.get({
      uid,
      text,
    })
      .then(handleResponse);
      cache.get(`channel:${uid}`, function (error, channelUser) {
        if (channelUser.length >= 1) {
          text = `${text} - *User is not paused.*`;
          sendAsUserToSlack({uid, text});
        }
      });
  } else {
    console.log('user paused');
    sendAsUserToSlack({uid, text});
  }
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
    bot.say(uid,'Hmmm? Let me calculate the best match!...',{
      typing: true,
    })
    .then((re)=>{
      return bot.sendAttachment(uid, 'image', 'https://media.giphy.com/media/vglJc9Bc9DtJe/giphy.gif');
    })
    .then((res)=>{
      postBacks.shopbyVarietalAll({
        queryParams,
        uid,
      })
        .then(handleResponse)
        .catch(errorHandler);
    });

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

  if (buttonData.indexOf('IMAGECHECK') !== -1) {
    postBacks.imageCheck({
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

  if (buttonData.indexOf('MENU') !== -1) {
    APIAI.get({
      uid,
      text: queryParams.trigger,
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
bot.setGreetingText('I\'m Monty: A sommelier in your pocket. I can help you...Pair wine and food\n—Find wine by "style"\n—And learn about wine as you go.')


APIAI.on('get-winesby-style', (originalRequest, apiResponse) => {
  let {locations, vintage, properties, styles, varietals, type, price, direction, price_threshold} = apiResponse.result.parameters;
  let tmpYear = vintage || '';
  let $locOR = [];
  let $varOR = [];
  let dessertBool = [false, true];
  let sparklingBool = [false, true];
  let fortifiedBool = [false, true];
  let naturalBool = [false, true];
  let types = ['white', 'red', 'rose', 'sparkling', 'dessert'];
  let propsOG = properties;
  vintage = `%${tmpYear}%`;
  varietals = varietals || [''];
  locations = locations || [''];

  //convert the value from api.ai to an array
  if (price_threshold && price_threshold.length > 2 ){
    price_threshold = price_threshold.split('-');
  }

  if (type.length < 1) {
    type = types;
  }
  console.log('properties1-->', properties);

  properties = properties.map(prop => {
    let newProp = {};
    prop = prop.toLowerCase();
    newProp.variance = propLookUp[prop];
    newProp.original = prop;
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
  varietals.forEach((varietalId) => {
    $varOR.push(
      {
        $eq: `${varietalId}`,
      }
    );
  });


  let cacheObj = cacher(db.sequelize, redisCache)
    .model('Wines')
    .ttl(config.get('CACHE_TIME'));
    console.log('$varOR',$varOR)

  let _where = {
    $or: [
      {
        '$Varietals.id$': {
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
  };

  // for wines between 10 and 15 dolloars
  if (price &&  price.length > 1 || price_threshold){
    //limit it to two numbers and sort for lesst to greatest
    price = price_threshold || price.slice(0,2).sort((a, b) => a - b);
    console.log('price_threshold',typeof price_threshold)
    _where.$or[0].price = {
      $between: price,
    };
  }

  //for wines greater or less than. defualt is lessthan
  if (price && price.length === 1) {
    _where.$or[0].price = {
      $lte: price[0],
    };
    if (direction && direction === 'greaterthan'){
      _where.$or[0].price = {
        $gte: price[0],
      };
    }
    if (price_threshold){
      _where.$or[0].price = {
        $gte: price[0],
      };
    }
  }
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
    where: _where,
  })
    .then((bottles) => {
      //
      console.log('How many: -->', bottles.length);
      console.log('Cached?: -->', cacheObj.cacheHit);
      let resBottles = [];
      console.log('properties: ', properties)
      if (properties.length >= 1) {
      //  console.log('wines going through scoring process')
        bottles.forEach((bottle) => {
          let _tmpBottle = {};
          _tmpBottle.bottle = bottle;
          _tmpBottle.attr = {};
          console.log(`${bottle.vintage} ${bottle.producer}, ${bottle.name}`)
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
            //console.log('_tmpBottle.attr[param].score',param,  stats.variance([_bottleWeight, _queryWeight]))
            _tmpBottle.attr[param].score = stats.variance([_bottleWeight, _queryWeight]);
          }

          //tally the score per bottle
          for (let param in _tmpBottle.attr) {
            _scoreTotal += _tmpBottle.attr[param].score;

          }
          console.log('-->SCORE TOTAl: ', _scoreTotal);

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

        //filter based on threshold
        resBottles = resBottles.filter((el) =>{
          if (el.score < 4){
            return el;
          }
        });
        resBottles = resBottles.map(el => {
          return el.bottle;
        });
      } else {
        resBottles = bottles;
      }

      resBottles = resBottles.splice(0, 10);

      // let test = resBottles.map(el=>{
      //
      //   console.log(el)
      //     return el.score;
      // });
      //console.log('STINKS: ',test)
      if (resBottles.length < 1) {

        slack.api('chat.postMessage', {
          text: `No Stock or match found for user's request: ${originalRequest.text}`,
          username: 'Monty\'s Pager',
          icon_emoji: ':pager:',
          channel: config.get('SLACK_CHANNEL'),
        }, function(err, response) {
          console.log('slack.api', response, err, config.get('SLACKYPOO'));
        });

        let lowStockReplies = [
          'I\'m sorry. 🤔 We currently don\'t have anything in stock that matches your request.',
          'Hmm. 😔 We don\'t actually have anything in stock that matches your request.',
          'Oh no! 😱 We seem to have nothing in stock that matches your request.',
        ];

        let lowStockMessage = {
          speech: lowStockReplies[Math.floor(Math.random() * lowStockReplies.length)],
          type: 0,
        };

        handleResponse({
          uid: originalRequest.uid,
          messages: [lowStockMessage],
        });

        return false;
      }
      let wineRes = wineCardGen(resBottles);

      handleResponse({
        uid: originalRequest.uid,
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

  missedMsgArr = stopword.removeStopwords(missedMsgArr);
  let options = {
    limit: 9,
    order: 'title ASC',
    where: {
      $or: (function() {
        let _tmparr = [];
        missedMsgArr.forEach((key) => {
          if (key.length > 3) {
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
      let randomResCopy = [
        'I haven\'t learned what that is yet.',
        'Hmm. It seems I don\'t know that yet. 😶',
        'You have found something I don\'t know yet. 💡',
      ];
      if (results.length === 0 || results.length === undefined){
        responses.push({
            speech: randomResCopy[Math.floor(Math.random() * randomResCopy.length)],
          type: 0,
        });
      } else {
        let swipeRright = [
          'I don’t know that yet. Swipe for close matches or ask a sommelier. 👉',
          'I don’t have a match. Swipe for near misses or ask a sommelier. 👉',
          'I am yet to learn that. Swipe for something similar or ask a sommelier. 👉',
        ];
        responses.push({
          speech: swipeRright[Math.floor(Math.random() * swipeRright.length)],
          type: 0,
        });
      }

      cards.push(fb.cardGen(
        'ASK A SOMMELIER',
        '',
        'Have a real sommelier answer your question as quick as humanly possible. 💪',
        [{
          'type': 'postback',
          'payload': 'SOMMELIER~' + JSON.stringify({
            missedIntent: missedMsg,
            id: shortid.generate(),
          }),
          'title': 'Ask now 🛎️',
        }]
      ));
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

      let formattedCards = cardGen(intent.Varietals,wineParams);
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
      console.log('formattedCards ',formattedCards);
      response.push({
        cards: formattedCards,
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
  // console.log('varietal-learning-cold ', Varietal);
  let options = {
    where: {
      $or: [
        {
          id: {
            $eq: Varietal,
          },
        },
      ],
    },
  };
  let cacheObj = cacher(db.sequelize, redisCache)
    .model('Varietals')
    .ttl(config.get('CACHE_TIME'));
  cacheObj.findOne(options)
    .then((varietal) => {
      console.log('`_handleVarietalLearningCold`: result:');
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
      slackProxy.sendToSlack({uid,msgData,type});
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
      slackProxy.sendToSlack({uid,msgData,type})
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
const sendAsUserToSlack = ({uid, text}) => {
  db.User.findOne({
    where: {
      uid,
    },
    include: [
      {
        model: db.Channel,
      },
    ],
  })
  .then((user)=>{
    // console.log('##### user',user.Channel);
    slack.api('chat.postMessage', {
      username: `${user.first_name} ${user.last_name}`,
      icon_url: user.profile_pic,
      channel: user.Channel.channel_id,
      attachments: JSON.stringify([
        {
          fallback: `sent a message.`,
          color: '#36a64f',
          pretext: `${text}`,
          text: '_Use `/r [TEXT]` to reply_',
          mrkdwn_in: ['text', 'pretext'],
        },
      ]),
    }, function(err, response) {
      if (response.ok){
        bot.sendAction(uid, 'mark_seen');
      }
    });
  })
  .catch((err)=>{
    console.log(err);
  });
};

bot.start(process.env.PORT || 3000);
