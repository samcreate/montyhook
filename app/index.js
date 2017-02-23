import config from 'config';
import BootBot from 'bootbot';
import cookieParser from 'cookie-parser';
import cookieSession from 'cookie-session';

const bot = new BootBot({
  accessToken: config.get('FBACCESSTOKEN'),
  verifyToken: 'verify_this_biotch',
  appSecret: 'd72e85f0a433b179925473bf431df2fd'
});

bot.on('message', (payload, chat) => {
    const text = payload.message.text;
    console.log(`The user said: ${text}`, payload);
});
bot.app.use(cookieParser('khfe984375rsdfkhds'));
bot.app.use(cookieSession({
  name: 'session',
  keys: ['khfe984375rsdfkhds22'],
  maxAge: 24 * 60 * 60 * 1000,
  secureProxy: true
}));
bot.app.use(function printSession(req, res, next) {
  console.log('req.session', req.session);
  return next();
});
console.log(bot.app)
bot.start();
