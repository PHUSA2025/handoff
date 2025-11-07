module.exports = (app) => {
  app.command('/handoff', async ({ ack, body, client }) => {
    await ack();

    const user = body.user_name;

    try {
      // test: check if lists API works
      const test = await client.apiCall('lists.items.list', {
        list_id: 'F09LRJTVD3Q'
      });

      if (!test || !test.items) {
        await client.chat.postMessage({
          channel: '#handoff',
          text: `⚠️ Hey ${user}, I can't access the PHUSA project list right now. 
Lists API might not be enabled in this workspace, or list_id is invalid.`,
        });
        return;
      }

      // (if someday Lists API works, this section will execute)
      const active = test.items.filter(item =>
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
        text: `✅ Handoff summary by ${user}`,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `:arrow_right: *PHUSA HANDOFF SUMMARY*\n_Triggered by ${user}_\n\n${summary}` }
          }
        ]
      });

    } catch (error) {
      console.error(error);
      await client.chat.postMessage({
        channel: '#handoff',
        text: `⚠️ Error: ${error.message}`,
      });
    }
  });
};
