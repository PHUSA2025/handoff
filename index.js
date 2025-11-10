// index.js
const { App } = require('@slack/bolt');
const handoff = require('./handoff');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  // If using socket mode, configure here; we assume HTTP events endpoint on Render
});

handoff(app);

(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`🚀 PHUSA Daily Handoff bot is running on port ${port}`);
})();
