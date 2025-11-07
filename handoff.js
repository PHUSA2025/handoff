module.exports = (app) => {
  app.command('/handoff', async ({ ack, body, client }) => {
    await ack();

    const user = body.user_name;

    try {
      const list = await client.lists.items.list({
        list_id: 'F09LRJTVD3Q', // ← înlocuiește cu ID-ul listei PHUSA din Slack
      });

      const active = list.items.filter(item =>
        item.fields.STATUS !== 'COMPLETED' &&
        (item.fields.ASSIGNEE === 'Jean Carlos' ||
         item.fields.NOTES?.includes('@Jean Carlos'))
      );

      const summary = active.map(item => {
        const job = item.fields['JOB #'] || '—';
        const status = item.fields.STATUS || '—';
        const note = item.fields['Manufacture Notes'] || '_no notes_';
        const assignee =
          item.fields.NOTES?.includes('@Isbel') ? '@Isbel' :
          item.fields.NOTES?.includes('@Jean Carlos') ? '@Daniela' :
          item.fields.ASSIGNEE;

        return `• *#${job}* – ${status}\n  Last note: ${note}\n  → assigned to *${assignee}*`;
      }).join('\n\n');

      await client.chat.postMessage({
        channel: '#handoff',
        text: `Handoff summary by ${user}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:arrow_right: *PHUSA HANDOFF SUMMARY*\n_Triggered by ${user}_\n\n${summary}`
            }
          }
        ]
      });

    } catch (error) {
      console.error(error);
      await client.chat.postMessage({
        channel: '#handoff',
        text: `⚠️ Error generating handoff summary: ${error.message}`,
      });
    }
  });
};
