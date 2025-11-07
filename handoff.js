// PHUSA Smart Handoff – 36h Summary
// Command: /handoff
// Author: Daniela & Ștefan

const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

module.exports = (app) => {
  app.command('/handoff', async ({ ack, body, client }) => {
    await ack();

    const user = body.user_name;
    const listLink = 'https://printhouseusa.slack.com/lists/T07EG07KE7P/F09LRJTVD3Q?view_id=View09LM99CAAF';
    const toEmail = 'sales@printhouseusa.com';
    const timeWindowHours = 36;

    try {
      // 🔹 Fetch your list data via Slack Lists API (or local cache)
      // In real implementation, replace with Slack internal fetch / cached data
      // Simulated local data for demo purpose
      const projects = [
        {
          job: '28046',
          assignee: 'Jean Carlos',
          status: 'Printing Started',
          comment: '',
          handoffDate: '2025-11-07T08:30:00Z',
        },
        {
          job: '28047',
          assignee: 'Daniela',
          status: 'Design Approved',
          comment: 'Added a new comment about client approval',
          handoffDate: '2025-11-06T20:15:00Z',
        },
      ];

      // 🔹 Filter projects modified in the last 36 hours
      const now = Date.now();
      const cutoff = now - timeWindowHours * 60 * 60 * 1000;

      const recent = projects.filter(p => new Date(p.handoffDate).getTime() >= cutoff);

      if (recent.length === 0) {
        await client.chat.postMessage({
          channel: '#handoff',
          text: `✅ ${user}, there are no project updates in the last ${timeWindowHours} hours.`,
        });
        return;
      }

      // 🔹 Format the handoff summary
      const summary = recent.map(p => {
        if (p.comment && p.comment.trim() !== '') {
          return `• Job #${p.job} – Assignee: ${p.assignee} → ${p.comment}`;
        }
        return `• Job #${p.job} – Assignee: ${p.assignee} → Status changed to “${p.status}”`;
      }).join('\n');

      // 🔹 Email subject and body
      const subject = encodeURIComponent('PHUSA Handoff – Updated Projects (Last 36h)');
      const body = encodeURIComponent(
        `Hello team,\n\nHere are the latest project updates from the last ${timeWindowHours} hours:\n\n${summary}\n\nView the full list here:\n${listLink}\n\nKind regards,\n${user}`
      );

      const mailto = `mailto:${toEmail}?subject=${subject}&body=${body}`;

      // 🔹 Post message to Slack
      await client.chat.postMessage({
        channel: '#handoff',
        text: `✅ Handoff summary ready for email.`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `📋 *Handoff Summary (Last ${timeWindowHours}h)*\n_Triggered by ${user}_\n\n${summary}`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Open in Outlook ✉️' },
                url: mailto,
                style: 'primary',
              },
            ],
          },
        ],
      });
    } catch (error) {
      console.error('Error during handoff:', error);
      await client.chat.postMessage({
        channel: '#handoff',
        text: `⚠️ ${user}, something went wrong while processing the handoff: ${error.message}`,
      });
    }
  });
};
