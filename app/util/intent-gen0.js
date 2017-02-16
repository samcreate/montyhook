var phraseGen = require('./phrase-gen');
module.exports = (title_n_synonyms, intent_id) => {

  var userSays = [];
  var templates = [];

  for (var i = 1; i < 350; i++) {
    for (var z = 1; z < 6; z++) {
      var thing = `SHOPBY_VARIETAL~{"varietal_id":${i},"variance":{"Body":${z},"Tannin":${z},"ResidualSugar":${z},"Acidity":${z},"Intensity":${z},"Fruit":${z},"Oak":${z}}}`
      templates.push(
        thing
      )
      userSays.push(
        {
          data: [
            {
              text: thing
            }
          ],
          isTemplate: false,
          count: 0
        }
      )
    }
  }

  console.log('userSays: ', userSays.length)

  //
  return {
  templates: templates,
  userSays: userSays,
  name: "08 Browse Varietal Button",
  auto: true,
  contexts: [],
  responses: [
    {
      resetContexts: false,
      action: "wines-by-variance",
      affectedContexts: [],
      parameters: [],
      messages: [
        {
          type: 0,
          speech: []
        }
      ]
    }
  ],
  priority: 1000000,
  cortanaCommand: {
    navigateOrService: "NAVIGATE",
    target: ""
  },
  webhookUsed: true,
  webhookForSlotFilling: false,
  lastUpdate: 1486531177,
  fallbackIntent: false,
  events: []
}
}
