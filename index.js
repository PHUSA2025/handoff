// index.js
// PHUSA Daily Handoff – main entry point
// Initializes the Slack Bolt app and loads the Handoff logic

const { App } = require("@slack/bolt");
const handoff = require("./handoff");

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
  port: process.env.PORT || 3000,
});

// Load Handoff module
handoff(app);

// Start server
(async () => {
  await app.start();
  console.log("⚡️ PHUSA Daily Handoff bot is running and connected to Slack!");
})();
