import fetch from "node-fetch";
import fs from "fs";
import { parse } from "csv-parse/sync";

module.exports = (app) => {
  app.command("/handoff", async ({ ack, body, client }) => {
    await ack();

    const user = body.user_name;
    const listUrl = "https://printhouseusa.slack.com/api/lists.listView";
    const session = process.env.SLACK_SESSION_TOKEN;

    try {
      // 1️⃣ Cere conținutul listei direct din Slack (API intern)
      const response = await fetch(listUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cookie": `d=${session}`,
        },
        body: new URLSearchParams({
          token: session,
          list_id: "F09LRJTVD3Q",
          view_id: "View09LM99CAAF",
        }),
      });

      const data = await response.json();

      if (!data.ok || !data.list) {
        await client.chat.postMessage({
          channel: "#handoff",
          text: `⚠️ ${user}, I couldn't access the list. Slack returned: ${data.error || "unknown error"}`,
        });
        return;
      }

      // 2️⃣ Extragem coloanele utile (Job, Status, Assignee, Notes)
      const items = data.list.rows.map((row) => {
        const fields = row.cells.map((c) => c.value.text || "").filter(Boolean);
        return {
          job: fields[0] || "—",
          status: fields[1] || "—",
          assignee: fields[2] || "—",
          notes: fields[3] || "—",
        };
      });

      // 3️⃣ Filtrăm doar proiectele active
      const active = items.filter(
        (p) => !["COMPLETED", "DELIVERED", "PAID"].includes(p.status.toUpperCase())
      );

      // 4️⃣ Construim mesajul
      const summary = active
        .slice(0, 15)
        .map(
          (p) =>
            `• *${p.job}* — ${p.status}\n   ${p.notes || "_no notes_"} → *${p.assignee}*`
        )
        .join("\n\n");

      // 5️⃣ Trimitem mesajul în canalul #handoff
      await client.chat.postMessage({
        channel: "#handoff",
        text: `✅ Live handoff summary by ${user}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:arrow_right: *PHUSA HANDOFF SUMMARY*\n_Triggered by ${user}_\n\n${summary}`,
            },
          },
        ],
      });
    } catch (error) {
      console.error(error);
      await client.chat.postMessage({
        channel: "#handoff",
        text: `⚠️ Error reading Slack list: ${error.message}`,
      });
    }
  });
};
