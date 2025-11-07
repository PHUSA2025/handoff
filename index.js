require('dotenv').config();
const { App } = require('@slack/bolt');
const handoffCommand = require('./handoff');

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
  endpoints: '/slack/events',
});

handoffCommand(app);

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ PHUSA Handoff bot is running!');
})();
