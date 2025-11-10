const { App } = require("@slack/bolt");
const handoff = require("./handoff");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

handoff(app);

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("🚀 PHUSA Daily Handoff bot is running!");
})();
