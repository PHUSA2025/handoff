module.exports = (app) => {
  // Când cineva scrie /handoff
  app.command('/handoff', async ({ ack, body, client }) => {
    await ack();
    const user = body.user_name;

    await client.chat.postMessage({
      channel: '#handoff',
      text: `Hey ${user}, click below to open and export the latest PHUSA Projects list 👇`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*📤 Open PHUSA Projects List*`,
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Open List',
              emoji: true,
            },
            url: 'https://slack.com/shortcuts/Ft09SA9QQAGG/6c5fc89d30f075fcdf29889be9a81dd9',
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Once you export the list as CSV and upload it here, the bot will automatically process and generate the *handoff summary*.`,
            },
          ],
        },
      ],
    });
  });

  // Restul codului pentru procesarea CSV-ului rămâne neschimbat
  // (secțiunea cu app.event('file_shared', ...) etc.)
};
