// handoff.js
// PHUSA - Automatic Handoff Summary
// Author: Daniela & Laurentiu - November 2025

const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

module.exports = (app) => {
  app.command('/handoff', async ({ ack, body, client }) => {
    await ack();

    const user = body.user_name;
    const listUrl = 'https://printhouseusa.slack.com/api/lists.activity';
    const session = process.env.SLACK_SESSION_TOKEN;

    try {
      // 🔹 Request activitate Slack List (endpoint intern)
      const response = await fetch(listUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': `d=${session}`,
        },
        body: new URLSearchParams({
          token: session,
          list_id: 'F09LRJTVD3Q', // ID-ul listei PHUSA PROJECTS 2025 PART 2
          view_id: 'View09LM99CAAF', // ID-ul view-ului curent
        }),
      });

      const data = await response.json();

      // 🔹 Validare răspuns
      if (!data.ok || !data.activities) {
        await client.chat.postMessage({
          channel: '#handoff',
          text: `⚠️ ${user}, I couldn't access the activity log. Slack returned: ${data.error || 'unknown_method'}`,
        });
        return;
      }

      // 🔹 Filtrăm activitățile din ultimele 24 ore
      const now = Date.now() / 1000;
      const yesterday = now - 24 * 60 * 60;
      const recent = data.activities.filter(a => Number(a.ts) >= yesterday);

      // 🔹 Dacă nu există schimbări recente
      if (recent.length === 0) {
        await client.chat.postMessage({
          channel: '#handoff',
          text: `✅ ${user}, no changes detected in the last 24 hours.`,
        });
        return;
      }

      // 🔹 Formatare frumoasă a modificărilor
      const formatted = recent.map(a => {
        const who = a.user || 'someone';
        const job = a.row || 'Unknown';
        const field = a.field || 'field';
        const oldVal = a.old_value || '—';
        const newVal = a.new_value || '—';

        switch (a.type) {
          case 'update_cell':
            return `• *#${job}* – ${field} changed: “${oldVal}” → “${newVal}” by *${who}*`;
          case 'add_row':
            return `• *#${job}* – new project added by *${who}*`;
          case 'delete_row':
            return `• *#${job}* – project deleted by *${who}*`;
          default:
            return `• *#${job}* – ${a.type} by *${who}*`;
        }
      }).join('\n\n');

      // 🔹 Trimitem mesajul final în canal
      await client.chat.postMessage({
        channel: '#handoff',
        text: `✅ PHUSA Handoff Summary`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:arrow_right: *PHUSA HANDOFF SUMMARY (last 24h)*\n_Triggered by ${user}_\n\n${formatted}`,
            },
          },
        ],
      });

    } catch (error) {
      console.error('Handoff error:', error);
      await client.chat.postMessage({
        channel: '#handoff',
        text: `⚠️ ${user}, an unexpected error occurred while fetching handoff data: ${error.message}`,
      });
    }
  });
};
