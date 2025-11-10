// handoff.js
const { App } = require("@slack/bolt");
const axios = require("axios");

// Load environment variables from Render
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Airtable config
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE = "Daily Handoff";

// ---------- SLASH COMMAND: /handoff ----------
app.command("/handoff", async ({ ack, body, client }) => {
  await ack();

  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: "modal",
        callback_id: "handoff_submission",
        title: { type: "plain_text", text: "Daily Handoff" },
        submit: { type: "plain_text", text: "Submit" },
        close: { type: "plain_text", text: "Cancel" },
        blocks: [
          {
            type: "input",
            block_id: "job_number",
            element: {
              type: "plain_text_input",
              action_id: "job_number_input",
              placeholder: { type: "plain_text", text: "e.g. 28479" },
            },
            label: { type: "plain_text", text: "Job #" },
          },
          {
            type: "input",
            block_id: "client_name",
            element: {
              type: "plain_text_input",
              action_id: "client_name_input",
              placeholder: { type: "plain_text", text: "e.g. The Real Autograph" },
            },
            label: { type: "plain_text", text: "Client Name" },
          },
          {
            type: "input",
            block_id: "status",
            element: {
              type: "static_select",
              action_id: "status_select",
              placeholder: { type: "plain_text", text: "Select status" },
              options: [
                { text: { type: "plain_text", text: "Waiting Client" }, value: "WAITING CLIENT" },
                { text: { type: "plain_text", text: "Need Proof" }, value: "NEED PROOF" },
                { text: { type: "plain_text", text: "Completed" }, value: "COMPLETED" },
                { text: { type: "plain_text", text: "To Send to Production" }, value: "TO SEND TO PRODUCTION" },
              ],
            },
            label: { type: "plain_text", text: "Status" },
          },
        ],
      },
    });
  } catch (error) {
    console.error("Error opening modal:", error);
  }
});

// ---------- HANDLE FORM SUBMISSION ----------
app.view("handoff_submission", async ({ ack, body, view, client }) => {
  await ack();

  const user = body.user.name;
  const jobNumber = view.state.values.job_number.job_number_input.value;
  const clientName = view.state.values.client_name.client_name_input.value;
  const status = view.state.values.status.status_select.selected_option.value;

  const record = {
    fields: {
      "JOB #": jobNumber,
      "Client": clientName,
      "STATUS": status,
      "Date": new Date().toISOString(),
      "Submitted By": user,
    },
  };

  try {
    await axios.post(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`,
      { records: [record] },
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    await client.chat.postMessage({
      channel: body.user.id,
      text: `✅ *${user}*, your update for job *${jobNumber}* (${clientName} – ${status}) was recorded successfully.`,
    });
  } catch (error) {
    console.error("Error saving to Airtable:", error);
    await client.chat.postMessage({
      channel: body.user.id,
      text: `⚠️ Sorry ${user}, I couldn't save your handoff. Please try again later.`,
    });
  }
});

// ---------- START APP ----------
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ PHUSA Daily Handoff bot is running!");
})();
