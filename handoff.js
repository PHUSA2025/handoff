// PHUSA Smart Handoff (Auto from Slack List)
// Author: Daniela & Ștefan – 2025-11-07

const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

module.exports = (app) => {
  app.command('/handoff', async ({ ack, body, client }) => {
    await ack();

    const user = body.user_name;
    const toEmail = "sales@printhouseusa.com";
    const listToken = process.env.SLACK_SESSION_TOKEN;
    const listId = "F09LRJTVD3Q";
    const viewId = "View09LM99CAAF";
    const hoursWindow = 36;

    try {
      // 1️⃣ Fetch list content directly from Slack internal API
      const response = await fetch("https://slack.com/api/lists.listViewRead", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cookie": `d=${listToken}`,
        },
        body: new URLSearchParams({
          token: listToken,
          list_id: listId,
          view_id: viewId,
        }),
      });

      const data = await response.json();

      if (!data.ok || !data.items) {
        await client.chat.postMessage({
          channel: "#handoff",
          text: `⚠️ ${user}, I couldn't access the project list. Slack returned: ${data.error || "unknown error"}`,
        });
        return;
      }

      // 2️⃣ Extract relevant fields
      const items = data.items.map(i => {
        const fields = i.fields || {};
        return {
          job: fields["Job #"]?.value_text || "N/A",
          assignee: fields["Assignee"]?.value_text || "Unassigned",
          status: fields["Status"]?.value_text || "N/A",
          comments: fields["Notes"]?.value_text || "",
          handoffDate: fields["Handoff Date"]?.value_date || null,
        };
      });

      // 3️⃣ Filter items modified in last 36h
      const now = new Date();
      const cutoff = new Date(now.getTime() - hoursWindow * 60 * 60 * 1000);
      const recent = items.filter(p => p.handoffDate && new Date(p.handoffDate) >= cutoff);

      if (recent.length === 0) {
        await client.chat.postMessage({
          channel: "#handoff",
          text: `✅ ${user}, there are no handoff updates in the last ${hoursWindow} hours.`,
        });
        return;
      }

      // 4️⃣ Build summary text
      const summary = recent.map(p => {
        if (p.comments && p.comments.trim() !== "") {
          return `• Job #${p.job} – Assignee: ${p.assignee} → ${p.comments}`;
        } else {
          return `• Job #${p.job} – Assignee: ${p.assignee} → Status changed to “${p.status}”`;
        }
      }).join("\n");

      // 5️⃣ Prepare Outlook mail
      const subject = encodeURIComponent("PHUSA Handoff – Updated Projects (Last 36h)");
      const body = encodeURIComponent(
        `Hello team,\n\nHere are the project updates from the last ${hoursWindow} hours:\n\n${summary}\n\nView the full list here:\nhttps://printhouseusa.slack.com/lists/T07EG07KE7P/F09LRJTVD3Q?view_id=View09LM99CAAF\n\nKind regards,\n${user}`
      );
      const mailto = `mailto:${toEmail}?subject=${subject}&body=${body}`;

      // 6️⃣ Post confirmation to Slack
      await client.chat.postMessage({
        channel: "#handoff",
        text: `✅ Handoff summary ready!`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `📋 *Handoff Summary (Last ${hoursWindow}h)*\n_Triggered by ${user}_\n\n${summary}`,
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "Open in Outlook ✉️" },
                url: mailto,
                style: "primary",
              },
            ],
          },
        ],
      });

    } catch (err) {
      console.error("Error:", err);
      await client.chat.postMessage({
        channel: "#handoff",
        text: `⚠️ ${user}, an error occurred: ${err.message}`,
      });
    }
  });
};
