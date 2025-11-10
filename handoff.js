// handoff.js
// Slack Bolt handlers for /handoff multi-entry modal (Add Another + Send Handoff Form)
const HANDOFF_LIST_LINK = 'https://printhouseusa.slack.com/lists/T07EG07KE7P/F09LRJTVD3Q?view_id=View09LM99CAAF';
const TARGET_CHANNEL = '#handoff'; // or channel ID if you prefer

// In-memory sessions: { [userId]: { projects: [ {name,notes,assignee,status} ] } }
const userSessions = {};

module.exports = function handoff(app) {
  // Helper: build the modal view
  function buildHandoffModal(savedCount = 0) {
    return {
      type: 'modal',
      callback_id: 'handoff_submission',
      title: { type: 'plain_text', text: 'Daily Handoff' },
      submit: { type: 'plain_text', text: 'Send Handoff Form' },
      close: { type: 'plain_text', text: 'Cancel' },
      blocks: [
        ...(savedCount > 0 ? [{
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `✅ You have *${savedCount}* project(s) added in this session. Use *Add Another Project* to add more.` }
          ]
        }] : []),
        {
          type: 'input',
          block_id: 'job_name',
          element: {
            type: 'plain_text_input',
            action_id: 'job_name_input',
            placeholder: { type: 'plain_text', text: 'e.g. 28479 - Box Showstopper' }
          },
          label: { type: 'plain_text', text: 'Project / Job Name' }
        },
        {
          type: 'input',
          block_id: 'notes',
          element: {
            type: 'plain_text_input',
            action_id: 'notes_input',
            multiline: true,
            placeholder: { type: 'plain_text', text: 'Short update or comment' }
          },
          label: { type: 'plain_text', text: 'Notes' }
        },
        {
          type: 'input',
          block_id: 'assignee',
          element: {
            type: 'plain_text_input',
            action_id: 'assignee_input',
            placeholder: { type: 'plain_text', text: 'e.g. Daniela, Jean Carlos' }
          },
          label: { type: 'plain_text', text: 'Assignee' }
        },
        {
          type: 'input',
          block_id: 'status',
          element: {
            type: 'static_select',
            action_id: 'status_select',
            placeholder: { type: 'plain_text', text: 'Select status' },
            options: [
              { text: { type: 'plain_text', text: 'Waiting Client' }, value: 'Waiting Client' },
              { text: { type: 'plain_text', text: 'Need Proof' }, value: 'Need Proof' },
              { text: { type: 'plain_text', text: 'To Send to Production' }, value: 'To Send to Production' },
              { text: { type: 'plain_text', text: 'Completed' }, value: 'Completed' }
            ]
          },
          label: { type: 'plain_text', text: 'Status' }
        },
        {
          type: 'actions',
          block_id: 'actions_block',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Add Another Project' },
              action_id: 'add_another'
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Open Project List' },
              url: HANDOFF_LIST_LINK,
              action_id: 'open_list' // note: url button will open link
            }
          ]
        }
      ]
    };
  }

  // /handoff command: open modal + send ephemeral link message to the user
  app.command('/handoff', async ({ ack, body, client, respond }) => {
    await ack();

    try {
      // Initialize session
      const userId = body.user_id;
      if (!userSessions[userId]) userSessions[userId] = { projects: [] };

      // Open modal
      await client.views.open({
        trigger_id: body.trigger_id,
        view: buildHandoffModal(userSessions[userId].projects.length)
      });

      // Send ephemeral message with the list link (only visible to the user)
      await client.chat.postEphemeral({
        channel: body.channel_id,
        user: userId,
        text: `📂 Open the project list here: <${HANDOFF_LIST_LINK}|PHUSA – PROJECTS – 2025 – PART 2>`
      });
    } catch (err) {
      console.error('Error opening handoff modal:', err);
      // Notify user
      await client.chat.postEphemeral({
        channel: body.channel_id,
        user: body.user_id,
        text: `⚠️ Sorry, something went wrong while opening the form.`
      });
    }
  });

  // Action: Add Another Project (button inside modal)
  app.action('add_another', async ({ ack, body, client }) => {
    await ack();

    try {
      const userId = body.user.id;
      const view = body.view;
      const values = view.state.values;

      // Extract current inputs (careful with optional/missing values)
      const jobName = values.job_name?.job_name_input?.value || '(no name)';
      const notes = values.notes?.notes_input?.value || '';
      const assignee = values.assignee?.assignee_input?.value || '';
      const status = values.status?.status_select?.selected_option?.value || '';

      // Push to session
      if (!userSessions[userId]) userSessions[userId] = { projects: [] };
      userSessions[userId].projects.push({ jobName, notes, assignee, status });

      const savedCount = userSessions[userId].projects.length;

      // Update the modal to show saved count and clear fields for next entry
      await client.views.update({
        view_id: view.id,
        hash: view.hash,
        view: buildHandoffModal(savedCount)
      });
    } catch (err) {
      console.error('Error in add_another action:', err);
      // Try to notify user in modal (fallback as ephemeral)
      await client.chat.postEphemeral({
        channel: body.channel?.id || TARGET_CHANNEL,
        user: body.user.id,
        text: `⚠️ Could not save the project. Please try again.`
      });
    }
  });

  // View submission (Submit button: "Send Handoff Form")
  app.view('handoff_submission', async ({ ack, body, view, client }) => {
    await ack();

    const userId = body.user.id;
    const userName = body.user.name;
    const values = view.state.values;

    // Extract the last entry from the modal (the one currently filled)
    const jobName = values.job_name?.job_name_input?.value || '(no name)';
    const notes = values.notes?.notes_input?.value || '';
    const assignee = values.assignee?.assignee_input?.value || '';
    const status = values.status?.status_select?.selected_option?.value || '';

    // Ensure session exists and push last entry
    if (!userSessions[userId]) userSessions[userId] = { projects: [] };
    userSessions[userId].projects.push({ jobName, notes, assignee, status });

    const projects = userSessions[userId].projects.slice(); // copy
    // Build message blocks for channel post
    const blocks = [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*🎯 New Daily Handoff from <@${userId}>*` }
      },
      { type: 'divider' }
    ];

    projects.forEach((p, idx) => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*${idx + 1}.* *${p.jobName}*\n` +
            (p.notes ? `📝 ${p.notes}\n` : '') +
            (p.assignee ? `🙋 *Assignee:* ${p.assignee}\n` : '') +
            (p.status ? `📦 *Status:* ${p.status}` : '')
        }
      });
      blocks.push({ type: 'divider' });
    });

    // Add link and action buttons at the end
    blocks.push({
      type: 'actions',
      block_id: 'final_actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Open PHUSA – PROJECTS – 2025 – PART 2' },
          url: HANDOFF_LIST_LINK,
          action_id: 'open_list_final'
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Mark as Read' },
          action_id: 'mark_read' // placeholder for possible future action
        }
      ]
    });

    try {
      // Post to channel
      await client.chat.postMessage({
        channel: TARGET_CHANNEL,
        blocks,
        text: `New Daily Handoff from ${userName}` // fallback text
      });

      // Clear session
      delete userSessions[userId];

      // Optional: send ephemeral confirmation to user
      await client.chat.postEphemeral({
        channel: body.view.root_view_id ? body.view.root_view_id : TARGET_CHANNEL,
        user: userId,
        text: `✅ Handoff sent successfully to ${TARGET_CHANNEL}.`
      });
    } catch (err) {
      console.error('Error posting handoff to channel:', err);
      // Notify user of failure
      await client.chat.postEphemeral({
        channel: TARGET_CHANNEL,
        user: userId,
        text: `⚠️ Sorry ${userName}, something went wrong while posting the handoff.`
      });
    }
  });

  // Optional: handle mark_read button or others here
  app.action('mark_read', async ({ ack, body, client }) => {
    await ack();
    try {
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: body.user.id,
        text: 'Marked as read (placeholder).'
      });
    } catch (err) {
      console.error('mark_read error', err);
    }
  });
};
