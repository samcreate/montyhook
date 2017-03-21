import config from 'config';
import EventEmitter from 'eventemitter3';
import Slack from 'slack-node';


class SlackProxy extends EventEmitter {
  constructor() {
    super();
    this.console = new Slack(config.get('SLACKYPOO'));
  }
}

module.exports = new SlackProxy();
