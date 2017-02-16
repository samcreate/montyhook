var config = require('config');
var fetch = require('node-fetch');
var fb = {}

  var normalizeString = (str) => (
  str.replace(/[^a-zA-Z0-9]+/g, '').toUpperCase()
  );

  var _formatButtons = (buttons) =>{
    return buttons && buttons.map((button) => {
        if (typeof button === 'string') {
          return {
            payload: normalizeString(button)
          };
        } else if (button && button.title) {
          return button;
        }
        return {};
      });
  }

  var _formatQuickReplies = (quickReplies)=> {
    return quickReplies && quickReplies.map((reply) => {
        // console.log('reply', reply);
        if (typeof reply === 'string' && reply != 'location') {
          return {
            content_type: 'text',
            title: reply,
            payload: reply
          };
        } else if (reply && reply.title && reply != 'location') {
          return {
            content_type: reply.content_type || 'text',
            title: reply.title,
            payload: reply.payload || normalizeString(reply.title)
          };
        }else if(reply === 'location'){
          return {
            content_type: 'location'
          };
        }
        return {};
      });
  }

  fb.getButtonTemplate = (text, buttons) => {
    var payload = {
      template_type: 'button',
      text:text
    };
    var formattedButtons = _formatButtons(buttons);
    payload.buttons = formattedButtons;
    return fb.getTemplate(payload);
  }


  fb.getListTemplate = (elements)  => {
    var payload = {
      template_type: 'list',
      top_element_style: 'compact',
      elements:elements
    };
    return fb.getTemplate( payload);
  }

  fb.getGenericTemplate = (elements)  => {
    var payload = {
      template_type: 'generic',
      elements: elements
    };
    return fb.getTemplate(payload);
  }

  fb.getImageTemplate = (url)  => {
    var payload = {
      url: url
    };
    return fb.getAttachment(payload, 'image');
  }

  fb.getTemplate = (payload)  => {
    var message = {
      attachment: {
        type: 'template',
        payload:payload
      }
    };
    return message;
  }

  fb.getAttachment = (payload, type)  => {
    var message = {
      attachment: {
        type: type,
        payload: payload
      }
    };
    return message;
  }

  fb.buttonGen = (title, payload, type) => {
    var button = {
      "type": type,
      "title": title,
      "payload": payload
    }
    return button;
  };


  fb.cardGen = (title, hero, subtitle, buttons) =>{
    var card = {
      "title": title,
      "image_url": hero,
      "subtitle": subtitle,
      "buttons": buttons
    }
    return card;
  }


  fb.addTyping = (res, amount)=>{
    for (var i = 0; i < amount; i++) {
      res.push({
        sender_action: 'typing_on'
      });
    }
  }

  fb.sendTextMessage = (recipientId, text, quickReplies, options) =>{
    var message = {
      text
    };
    var formattedQuickReplies = _formatQuickReplies(quickReplies);
    if (formattedQuickReplies && formattedQuickReplies.length > 0) {
      message.quick_replies = formattedQuickReplies;
    }
    return fb.sendMessage(recipientId, message, options);
  }

  fb.sendMessage = (recipientId, message, options) => {
    var onDelivery = options && options.onDelivery;
    var onRead = options && options.onRead;
    var req = () => (
    fb.sendRequest({
      recipient: {
        id: recipientId
      },
      message
    }).then((json) => {
      // console.log(json)
      var requestData = {
        url: `https://graph.facebook.com/v2.6/me/messages?access_token=${config.get('FBACCESSTOKEN')}`,
        qs: {access_token: config.get('FBACCESSTOKEN')},
        method: 'POST',
        json: {
          recipient: {id: recipientId},
          message
        }
      };
      return json;
    })
    );
    // if (options && options.typing) {
    //   var autoTimeout = (message && message.text) ? message.text.length * 25 : 1000;
    //   var timeout = (typeof options.typing === 'number') ? options.typing : autoTimeout;
    //   return this.sendTypingIndicator(recipientId, timeout).then(req);
    // }
    return req();
  }

  fb.sendRequest = (body, endpoint, method) => {

    endpoint = endpoint || 'messages';
    method = method || 'POST';
    return fetch(`https://graph.facebook.com/v2.6/me/${endpoint}?access_token=${config.get('FBACCESSTOKEN')}`, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
      .then(res => res.json())
      // .catch(err => console.log(`Error sending message: ${err}`));
  }

  module.exports = fb;
