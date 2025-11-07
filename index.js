// PHUSA Handoff Bot – Index
// Loads Bolt app and mounts the handoff command

const { App } = require("@slack/bolt");
const handoff = require("./handoff");

// 🔹 Initialize Slack Bolt app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
  appToken: process.env.SLACK_APP_TOKEN, // optional, if used
  port: process.env.PORT || 3000,
});

// 🔹 Load the /handoff command
handoff(app);

// 🔹 Start server
(async () => {
  await app.start();
  console.log("⚡️ PHUSA Handoff bot is running!");
})();
