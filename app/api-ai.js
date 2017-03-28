import ApiAi from 'apiai';
import config from 'config';
import EventEmitter from 'eventemitter3';


class ApiGet extends EventEmitter {
  constructor() {
    super();
    this.apiai = ApiAi(config.get('APIAI_CLIENT_TOKEN'), {
      language: 'en',
      requestSource: 'fb',
    });
  }

  triggerIntent({uid, intent_id}) {
    this.emit('get-varietals', {
      uid,
      text: '',
    }, {
      result: {
        parameters: {intent_id: [intent_id]},
      },
    });
  }

  triggerMissingIntent(originalRequest, apiResponse) {
    this.emit('missing-intent', originalRequest, apiResponse);
  }

  get({uid, text}) {
    return new Promise((resolve, reject) => {
      this.apiai.textRequest(text, {
        sessionId: uid,
      }).on('response', (response) => {
        //let resMsg = response.result.fulfillment.messages || [response.result.fulfillment]
        //console.log(response);

        if (response.result.action !== '' && response.result.action !== 'input.welcome') {
          this.emit(response.result.action, {
            uid,
            text,
          }, response);
        } else {
          let notCards = [];
          let cards = [];
          response.result.fulfillment.messages.forEach((msg)=>{
            if (msg.type === 4 && msg.payload.hasOwnProperty('cards')){
              cards.push(msg.payload);
            } else {
              notCards.push(msg);
            }
          });

          notCards = notCards.concat(cards);
          console.log('notCards', notCards)
          resolve({
            uid,
            messages: notCards,
          });
        }
      })
        .on('error', (error) => {
          console.error('!!!!error!!!!', error);
          reject(error);
        })
        .end();
    });
  }
}

module.exports = new ApiGet();
