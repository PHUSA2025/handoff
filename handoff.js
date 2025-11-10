// handoff.js
const { App } = require("@slack/bolt");
const axios = require("axios");

// ------------------ Slack app setup ------------------
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// ------------------ Airtable config ------------------
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE = "Daily Handoff"; // exact cum apare în Airtable

// ------------------ Slash command: /handoff ------------------
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
            block_id: "job_name",
            element: {
              type: "plain_text_input",
              action_id: "job_name_input",
              placeholder: { type: "plain_text", text: "e.g. Box Showstopper" },
            },
            label: { type: "plain_text", text: "Project / Job Name" },
          },
          {
            type: "input",
            block_id: "notes",
            element: {
              type: "plain_text_input",
              multiline: true,
              action_id: "notes_input",
              placeholder: { type: "plain_text", text: "Short update or comment" },
            },
            label: { type: "plain_text", text: "Notes" },
          },
          {
            type: "input",
            block_id: "assignee",
            element: {
              type: "plain_text_input",
              action_id: "assignee_input",
              placeholder: { type: "plain_text", text: "e.g. Daniela, Jean Carlos" },
            },
            label: { type: "plain_text", text: "Assignee" },
          },
          {
            type: "input",
            block_id: "status",
            element: {
              type: "static_select",
              action_id: "status_select",
              placeholder: { type: "plain_text", text: "Select status" },
              options: [
                { text: { type: "plain_text", text: "Waiting Client" }, value: "Waiting Client" },
                { text: { type: "plain_text", text: "Need Proof" }, value: "Need Proof" },
                { text: { type: "plain_text", text: "Completed" }, value: "Completed" },
                { text: { type: "plain_text", text: "To Send to Production" }, value: "To Send to Production" },
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

// ------------------ Handle submission ------------------
app.view("handoff_submission", async ({ ack, body, view, client }) => {
  await ack();

  const user = body.user.name;
  const jobName = view.state.values.job_name.job_name_input.value;
  const notes = view.state.values.notes.notes_input.value;
  const assignee = view.state.values.assignee.assignee_input.value;
  const status = view.state.values.status.status_select.selected_option.value;

  const record = {
    fields: {
      "Name": jobName,
      "Notes": notes,
      "Assignee": assignee,
      "Status": status,
    },
  };

  try {
    console.log("📤 Sending record to Airtable:", record);

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
      text: `✅ *${user}*, your update for *${jobName}* has been added to Daily Handoff.\n_Status: ${status}_`,
    });
  } catch (error) {
    console.error("❌ Error saving to Airtable:", error.response?.data || error.message);
    await client.chat.postMessage({
      channel: body.user.id,
      text: `⚠️ Sorry ${user}, something went wrong while saving to Airtable.`,
    });
  }
});

// ------------------ Start app ------------------
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ PHUSA Daily Handoff bot is running!");
})();
