const copy = {};

copy.afterHoursSommCopy = (_messages = []) => {
  _messages.push({
    speech: 'I\'m on it.',
    type: 0,
  });
  _messages.push({
    title: 'I\'ll get back to you ASAP. Sommelier response hours are 8am to 10pm PST. In the meantime, can I help you with something else?',
    type: 'buttons',
    buttons: [{
      'type': 'postback',
      'payload': 'MENU~' + JSON.stringify({trigger: "menu"}),
      'title': 'Go to menu 📖',
    }],
  });
  return _messages;
};

copy.SommNotifyCopy = (_messages = []) => {
  _messages.push({
    speech: 'I\'m on it.',
    type: 0,
  });
  _messages.push({
    speech: 'I\'ll get back to you ASAP! 🚀',
    type: 0,
  });
  _messages.push({
    type: 'buttons',
    title: 'In the meantime, can I can help with something else?',
    buttons: [{
      'type': 'postback',
      'payload': 'MENU~' + JSON.stringify({trigger: "menu"}),
      'title': 'Go to menu 📖',
    }],
  });
  return _messages;
};

module.exports = copy;
