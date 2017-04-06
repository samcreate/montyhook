import config from 'config';
import EventEmitter from 'eventemitter3';
import Slack from 'slack-node';
import db from 'montydb';
import fb from './util/facebook';
import cardGen from './util/cards-gen';
import wineCardGen from './util/wine-card-gen';

class SlackProxy extends EventEmitter {

  constructor(apiai) {
    super();
    this.console = new Slack('xoxb-158388941842-KpXzYKLEHORZV9UywyaTLofy');
    this.apiai = apiai;
  }

  sendWine({channelId, wineIds}) {
    return new Promise((resolve) => {
      let usersChannel;
      db.Channel.findOne({
        where: {
          channel_id: channelId,
        },
      })
        .then((channel) => {
          if (channel) {
            usersChannel = channel
            return db.Wines.findAll({
              where: {
                id: wineIds,
              },
            })
          } else {
            resolve({ok: false, responseCopy: '☹️ Could not find a matching channel'});
          }
        })
        .then((cards)=>{
          if (cards && cards.length >= 1) {
            let resBack2User = wineCardGen(cards);
            resolve({ok: true, cards: resBack2User.cards, speech: resBack2User.speech, uid: usersChannel.UserUid, responseCopy: 'Wine sent! 🍷 💌 ✈️'});
          } else {
            resolve({ok: false, responseCopy: '☹️ Could not find any matching wine'});
          }
        })
        .catch((err) => {
          return resolve({ok: false, responseCopy: '☹️ Something went wrong. WAS IT YOU?!'});

        });
    });
  }

  sendCards({channelId, cardIds}) {
    return new Promise((resolve) => {
      let usersChannel;
      db.Channel.findOne({
        where: {
          channel_id: channelId,
        },
      })
        .then((channel) => {
          if (channel) {
            usersChannel = channel
            return db.Varietals.findAll({
              where: {
                id: cardIds,
              },
            })
          } else {
            resolve({ok: false, responseCopy: '☹️ Could not find a matching channel'});
          }
        })
        .then((cards)=>{
          if (cards && cards.length >= 1) {
            cards = cardGen(cards);
            resolve({ok: true, cards, uid: usersChannel.UserUid, responseCopy: 'Card(s) sent! 🃏 💌 ✈️'});
          } else {
            resolve({ok: false, responseCopy: '☹️ Could not find any matching cards'});
          }
        })
        .catch((err) => {
          return resolve({ok: false, responseCopy: '☹️ Something went wrong. WAS IT YOU?!'});

        });
    });
  }

  sendIntent({channelId, intentId}) {
    return new Promise((resolve) => {

      db.Channel.findOne({
        where: {
          channel_id: channelId,
        },
      })
        .then((channel) => {
          if (channel) {
            this.apiai.triggerIntent({
              uid: channel.UserUid,
              intent_id: intentId,
            });
            resolve('Intent sent! 🤖 💌 ✈️');
          } else {
            resolve('☹️ Could not find a matching channel');
          }
        })
        .catch((err) => {
          return resolve('☹️ Something went wrong. WAS IT YOU?!' + JSON.stringify(err));

        });
    });
  }


  sendIntentAsTada({channelId, intentId}){
    return new Promise((resolve) => {
      let usersChannel;
      db.Channel.findOne({
        where: {
          channel_id: channelId,
        },
      })
        .then((channel) => {
          if (channel) {
            usersChannel = channel;
            return db.Intents.findById(intentId);
          } else {
            resolve({ok: false, responseCopy: '☹️ Could not find a matching channel'});
          }
        })
        .then((intent) => {
          if (intent){
            let intentTitle = intent.title.split(',')[0];
            let fbResponses = [
              `✨ Tada! Your wine recommendation for: '${intentTitle}' is ready. Check it out!`,
              `🎉 Woot! The results are in. Find out what wines are best for: '${intentTitle}'.`,
              `👏 Bravo! My sommeliers have found the perfect wine match for: '${intentTitle}'.`,
            ];
            let resCards = [];
            resCards.push(fb.cardGen(
              fbResponses[Math.floor(Math.random() * fbResponses.length)],
              null,
              intent.bubble1 || '',
              [{
                type: 'postback',
                title: 'See more 👀',
                payload: 'MISSINGINTENT_FOLLOWUP~'+JSON.stringify({text:intentTitle})
              }]
            ));
            resolve({ok: true, cards: resCards, responseCopy: 'Intent Tada! sent! 🎉 💌 ✈️', uid: usersChannel.UserUid});
          } else {
            resolve({ok: false, responseCopy: '☹️ Could not find any matching intents for: ' + JSON.stringify(intentId)});
          }
        })
        .catch((err) => {
          return resolve({ok: false, responseCopy: '☹️ Something went wrong. WAS IT YOU?!' + JSON.stringify(err)});
        });
    });
  }

  sendToSlack({uid, msgData, type}) {
    let _response = [];
    let _attachment;
    let _channel;
    //console.log('sendToSlack', msgData, type);

    if (type === 0) {
      _attachment = {
        fallback: 'ARRR.',
        color: '#36a64f',
        text: msgData.text,
        mrkdwn_in: ['text', 'pretext'],
      };

    }
    if (type === 1) {
      _attachment = {
        text: 'Cards:',
        fallback: 'Cards:',
        callback_id: 'npothing',
        color: '#3AA3E3',
        attachment_type: 'default',
        actions: this._cards2Attachments(msgData),
      };

    }
    if (type === 2) {

      _attachment = {
        text: msgData.text,
        fallback: msgData.text,
        callback_id: 'npothing',
        color: '#3AA3E3',
        attachment_type: 'default',
        actions: this._quickLinksToButtons(msgData.quickReplies),
      };
    }
    if (type === 3) {

      _attachment = {
        title: 'Image:',
        title_link: msgData.url,
        image_url: msgData.url,
      };
    }
    if (type === 'buttons') {

      _attachment = {
        text: msgData.text,
        fallback: msgData.text,
        callback_id: 'npothing',
        color: '#3AA3E3',
        attachment_type: 'default',
        actions: this._fbButtons2SlackButtons(msgData.buttons),
      };
    }

    if (_attachment.length) {
      _response = _attachment;
    } else {
      _response.push(_attachment);
    }

    return db.Channel.findOne({
      where: {
        UserUid: uid,
        archived: false,
      },
    })
      .then((channel) => {

        if (channel === null) return false;

        _channel = channel;

        return new Promise((resolve) => {
          //console.log('HELLO1: ', channel.channel_id);
          global.cache.get(`channel:${uid}`, (error, channel) => {
            //console.log('HELLO2: ', channel.channel_id, resolve);
            //console.log('here?????', channel, uid)
            if (channel.length >= 1) {
              //console.log('????? 2', channel.channel_id);
              resolve({
                ok: true
              });
            } else {
              resolve({
                ok: false
              });
            }
          });
        }); //
      })
      .then((res) => {
        if (res.ok) {
          this.console.api('chat.postMessage', {
            attachments: JSON.stringify(_response),
            as_user: true,
            channel: _channel.channel_id,
          }, function(err, response) {
            if (response.ok === true) {
              //console.log('it worked!!!');
            } else {

            }
          });
        }
      })
      .catch(() => {
      });
  }

  _quickLinksToButtons(replies) {
    let _actions = [];
    replies.forEach((action) => {
      _actions.push(
        {
          name: 'quicklink',
          text: action,
          type: 'button',
          value: 'null',
        }
      );
    });
    return _actions;
  }

  _cards2Attachments(cards) {
    let _actions = [];
    cards.forEach((card) => {
      _actions.push({
        name: 'fbbutton',
        text: card.title,
        type: 'button',
        value: 'null',
      });
    });
    return _actions;
  }

  _fbButtons2SlackButtons(buttons) {
    let _actions = [];
    buttons.forEach((action) => {
      _actions.push(
        {
          name: 'fbbutton',
          text: action.title,
          type: 'button',
          value: 'null',
        }
      );
    });
    return _actions;
  }

}

module.exports = SlackProxy;
