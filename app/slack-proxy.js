import config from 'config';
import EventEmitter from 'eventemitter3';
import Slack from 'slack-node';
import db from 'montydb';

class SlackProxy extends EventEmitter {
  constructor() {
    super();
    this.console = new Slack('xoxb-158388941842-KpXzYKLEHORZV9UywyaTLofy');
  }

  sendToSlack({uid, msgData, type}) {
    let _response = [];
    let _attachment;
    let _channel;
    console.log('sendToSlack', msgData, type);

    if (type === 0) {
      _attachment = {
        fallback: 'ARRR.',
        color: '#36a64f',
        text: msgData.text,
        mrkdwn_in: ['text', 'pretext'],
      };
    // msgData.text = speech;
    // promise = bot.say(uid, msgData.text, {
    //   typing: true,
    // });
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
    // msgData = cards;
    // promise = bot.sendGenericTemplate(uid, msgData, {
    //   typing: true,
    // });
    }
    if (type === 2) {
      // msgData = {
      //   text: title,
      //   quickReplies: replies,
      // };
      // promise = bot.say(uid, msgData, {
      //   typing: true,
      // });
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
      },
    })
      .then((channel) => {
        _channel = channel;
        return new Promise((resolve, reject) => {
          console.log('HELLO1: ', channel.channel_id);
          global.cache.get(`channel:${uid}`, (error, channel) => {
            console.log('HELLO2: ', channel.channel_id, resolve);
            console.log('here?????', channel, uid)
            if (channel.length >= 1) {
              console.log('????? 2', channel.channel_id);
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
              console.log('it worked!!!');
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

module.exports = new SlackProxy();
