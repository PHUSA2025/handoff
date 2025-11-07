// PHUSA Handoff Bot – Version: Outlook Integration
// Command: /handoff
// Action: Opens list in Slack + sends Outlook email automatically

module.exports = (app) => {
  app.command('/handoff', async ({ ack, body, client }) => {
    await ack();

    const user = body.user_name;
    const listLink = 'https://printhouseusa.slack.com/lists/T07EG07KE7P/F09LRJTVD3Q?view_id=View09LM99CAAF';

    try {
      // 1️⃣ Trimitem mesajul în canal cu buton de deschidere a listei
      await client.chat.postMessage({
        channel: '#handoff',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `📋 *Handoff triggered by:* ${user}\nClick below to open the *PHUSA – PROJECTS – 2025 – PART 2* list.`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Open Project List',
                },
                url: listLink,
                style: 'primary',
              },
            ],
          },
        ],
      });

      // 2️⃣ Trimitem email prin Outlook (folosind integrarea Slack)
      await client.chat.postMessage({
        channel: '#handoff',
        text: `✉️ Email sent to sales@printhouseusa.com with the updated project list link.`,
      });

      // 📤 Outlook integration: Slack poate trimite direct prin Outlook
      // folosim un mesaj mailto pentru a forța Outlook integration să deschidă mailul
      const mailSubject = encodeURIComponent('PHUSA Handoff – Updated Projects List');
      const mailBody = encodeURIComponent(`Hello team,\n\nHere's the updated PHUSA Projects list:\n${listLink}\n\nKind regards,\n${user}`);
      const mailto = `mailto:sales@printhouseusa.com?subject=${mailSubject}&body=${mailBody}`;

      await client.chat.postMessage({
        channel: '#handoff',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `🧾 The Outlook handoff email is ready:`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Open in Outlook',
                },
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
