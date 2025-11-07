const { parse } = require('csv-parse/sync');
const fs = require('fs');
const https = require('https');

module.exports = (app) => {
  // 1️⃣ Comanda /handoff
  app.command('/handoff', async ({ ack, body, client }) => {
    await ack();
    const user = body.user_name;

    await client.chat.postMessage({
      channel: '#handoff',
      text: `Hey ${user}, click below to export the latest PHUSA Projects list 👇`,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*📤 Generate live CSV export from PHUSA Projects*` },
          accessory: {
            type: 'button',
            text: { type: 'plain_text', text: 'Export CSV', emoji: true },
            action_id: 'export_csv',
          },
        },
      ],
    });
  });

  // 2️⃣ Evenimentul de apăsare a butonului
  app.action('export_csv', async ({ ack, body, client }) => {
    await ack();

    await client.chat.postMessage({
      channel: '#handoff',
      text: `📦 ${body.user.name} triggered CSV export. Waiting for workflow to upload the file...`,
    });
  });

  // 3️⃣ Când workflow-ul Slack încarcă fișierul CSV în canal
  app.event('file_shared', async ({ event, client }) => {
    try {
      const file = await client.files.info({ file: event.file_id });
      if (!file || !file.file || !file.file.name.endsWith('.csv')) return;

      const url = file.file.url_private_download;
      const csvData = await downloadFile(url, process.env.SLACK_BOT_TOKEN);

      const records = parse(csvData, { columns: true, skip_empty_lines: true });

      const active = records.filter(
        (r) => !['COMPLETED', 'DELIVERED', 'PAID'].includes((r.STATUS || '').toUpperCase())
      );

      const summary = active
        .slice(0, 15)
        .map(
          (r) =>
            `• *${r['JOB #'] || r.Job || '-'}* — ${r.STATUS || '-'}\n   ${r['Manufacture Notes'] || r.Notes || '_no notes_'} → *${r.ASSIGNEE || r.Assignee || '-'}*`
        )
        .join('\n\n');

      await client.chat.postMessage({
        channel: '#handoff',
        text: '✅ PHUSA Handoff Summary',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:arrow_right: *PHUSA HANDOFF SUMMARY*\n_Based on the latest CSV uploaded_\n\n${summary}`,
            },
          },
        ],
      });
    } catch (error) {
      console.error(error);
      await client.chat.postMessage({
        channel: '#handoff',
        text: `⚠️ Error processing CSV: ${error.message}`,
      });
    }
  });
};

// utilitar pentru descărcare CSV
function downloadFile(url, token) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Authorization: `Bearer ${token}` } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
}
