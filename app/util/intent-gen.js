var phraseGen = require('./phrase-gen');
module.exports = (title_n_synonyms, intent_id) => {
  console.log('intent gen called')
  var title = title_n_synonyms.substr(0, 149);
  var title_n_synonyms_arr = title_n_synonyms.split(',');
  var userSays = [];
  var templates = [];

  title_n_synonyms_arr.forEach((syn) => {
    var word = syn.trim();
    var new_phrase_arr = phraseGen(word);
    title_n_synonyms_arr = title_n_synonyms_arr.concat(new_phrase_arr);
  });

  console.log('title_n_synonyms_arr',title_n_synonyms_arr)

  title_n_synonyms_arr.forEach((syn) => {
    var word = syn.trim();
    templates.push(word)
    userSays.push(
      {
        data: [
          {
            text: word
          }
        ],
        isTemplate: false,
        count: 0
      }
    )
  });

  //
  return {
    templates: templates,
    userSays: userSays,
    name: title,
    auto: false,
    contexts: [],
    responses: [
      {
        resetContexts: false,
        action: "get-varietals",
        affectedContexts: [],
        parameters: [
          {
            dataType: "@sys.number",
            name: "intent_id",
            value: intent_id
          }
        ],
        messages: [
          {
            type: 0,
            speech: [
              '😳 Oops. I scrambled my hard drive. Try again and I promise to do better.',
              '😳 Hmm. My robot brain must have got confused. Try again and I\'ll do better.',
              '😳 Uh oh! I must have spilt some wine on my motherboard. Try again and I\'ll do better.',
              '😳 Beep. Boop. Burb. That\'s robot for "I\'m sorry but something went wrong. Try again."'
            ]
          }
        ]
      }
    ],
    priority: 500000,
    webhookUsed: true,
    webhookForSlotFilling: false,
    lastUpdate: 1484948383,
    fallbackIntent: false,
    events: []
  }
}
