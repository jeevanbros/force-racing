import { HttpError, now, stmt, rows, equal, secretReady, readBody, parseJSON, background, json } from './core.js';
import { settings, saveSettings } from './settings.js';

async function send(env, chatId, text, options = {}) {
  if (env.LOCAL_DEV === 'true' && env.TELEGRAM_MOCK === 'true') {
    // TELEGRAM_MOCK_FAIL simulates a transient upstream 429 so retry behaviour can be tested locally.
    if (env.TELEGRAM_MOCK_FAIL === 'true') return { ok: false, error_code: 429, parameters: { retry_after: 1 } };
    return { ok: true, result: { message_id: 0 } };
  }
  if (!/^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(env.TELEGRAM_BOT_TOKEN || '')) return { ok: false, error_code: 503 };
  try {
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: options.parse_mode || 'HTML',
      link_preview_options: { is_disabled: true },
      ...options
    };
    const response = await (env.__fetch || fetch)(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(10000)
    });
    const result = await response.json();
    return result && typeof result === 'object' ? result : { ok: false, error_code: response.status };
  } catch { return { ok: false, error_code: 503 }; }
}

async function editMessage(env, chatId, messageId, text, reply_markup) {
  if (env.LOCAL_DEV === 'true' && env.TELEGRAM_MOCK === 'true') return { ok: true };
  if (!/^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(env.TELEGRAM_BOT_TOKEN || '')) return { ok: false };
  try {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      reply_markup
    };
    const response = await (env.__fetch || fetch)(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(10000)
    });
    return await response.json();
  } catch { return { ok: false }; }
}

async function answerCallback(env, callbackQueryId, text = '') {
  if (env.LOCAL_DEV === 'true' && env.TELEGRAM_MOCK === 'true') return { ok: true };
  if (!/^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(env.TELEGRAM_BOT_TOKEN || '')) return { ok: false };
  try {
    await (env.__fetch || fetch)(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
      signal: AbortSignal.timeout(10000)
    });
  } catch {}
}

export function buildSettingsCard(config) {
  const gmail = config.gmailEnabled !== false ? '🟢 ACTIVE' : '🔴 DISABLED';
  const forms = config.formsEnabled ? '🟢 ENABLED' : '🔴 DISABLED';
  const campaign = config.campaign?.enabled ? '🟢 ACTIVE' : '🔴 DISABLED';
  const email = config.contact?.email || 'team.force.racing.kitsw@gmail.com';

  const text = 
    `⚙️ <b>FORCE RACING TELEMETRY & CONTROLS</b> 🏁\n` +
    `<i>Central System Configuration</i>\n\n` +
    `📧 <b>Gmail Bot Alerts:</b> ${gmail}\n` +
    `📬 <b>Target Alert Email:</b> <code>${email}</code>\n` +
    `📝 <b>On-Site Forms:</b> ${forms}\n` +
    `🏎️ <b>F1 Sim Campaign:</b> ${campaign}\n\n` +
    `<i>Tap buttons below to toggle live settings:</i>`;

  const reply_markup = {
    inline_keyboard: [
      [
        { text: `📧 Gmail: ${config.gmailEnabled !== false ? '✅ ON' : '❌ OFF'}`, callback_data: 'toggle_gmail' },
        { text: `📝 Forms: ${config.formsEnabled ? '✅ ON' : '❌ OFF'}`, callback_data: 'toggle_forms' }
      ],
      [
        { text: `🏎️ Campaign: ${config.campaign?.enabled ? '🟢 ON' : '🔴 OFF'}`, callback_data: 'toggle_campaign' },
        { text: `🔄 Refresh`, callback_data: 'refresh_settings' }
      ]
    ]
  };

  return { text, reply_markup };
}
export function notificationText(submission) {
  const lines = [`Force Racing • ${submission.reference}`, `Type: ${submission.type}`, `Source: ${submission.source}`, `Submitted: ${submission.submitted_at}`];
  for (const [label, key] of [['Name', 'name'], ['Email', 'email'], ['Phone', 'phone'], ['Organisation', 'organization'], ['Message', 'message']]) {
    if (submission[key]) lines.push(`${label}: ${submission[key]}`);
  }
  if (submission.answers_json) {
    lines.push('Google Form answers:');
    for (const item of JSON.parse(submission.answers_json)) lines.push(`${item.question}: ${item.answer}`);
  }
  lines.push('Request received only. Payment/participation requires team confirmation.');
  return lines.join('\n');
}
export function chunks(text) {
  const result = [];
  while (text.length > 3500) {
    let cut = text.lastIndexOf('\n', 3500);
    if (cut < 1000) cut = 3500;
    if (/[\uD800-\uDBFF]/.test(text[cut - 1])) cut--;
    result.push(text.slice(0, cut)); text = text.slice(cut);
  }
  if (text) result.push(text);
  return result;
}
export async function deliverDue(env, submissionId = null) {
  const due = await rows(env, `SELECT j.id FROM notification_jobs j JOIN recipients r ON r.chat_id=j.recipient_id
    WHERE r.status='approved' AND ((j.status IN ('pending','retry') AND j.next_attempt_at<=?) OR (j.status='sending' AND j.lease_until<=?))
    AND (? IS NULL OR j.submission_id=?) ORDER BY j.next_attempt_at,j.id LIMIT 25`, now(), now(), submissionId, submissionId);
  for (const candidate of due) {
    const time = now();
    const job = await stmt(env, `UPDATE notification_jobs SET status='sending',lease_until=?,attempts=attempts+1
      WHERE id=? AND ((status IN ('pending','retry') AND next_attempt_at<=?) OR (status='sending' AND lease_until<=?))
      AND EXISTS(SELECT 1 FROM recipients WHERE chat_id=recipient_id AND status='approved') RETURNING *`, time + 120, candidate.id, time, time).first();
    if (!job) continue;
    const submission = await stmt(env, 'SELECT * FROM submissions WHERE id=?', job.submission_id).first();
    const parts = chunks(notificationText(submission));
    let failed = false;
    for (let index = job.next_part; index < parts.length; index++) {
      const recipient = await stmt(env, "SELECT chat_id FROM recipients WHERE chat_id=? AND status='approved'", job.recipient_id).first();
      if (!recipient) { await stmt(env, "UPDATE notification_jobs SET status='cancelled',lease_until=0 WHERE id=?", job.id).run(); failed = true; break; }
      const result = await send(env, recipient.chat_id, parts.length > 1 ? `(${index + 1}/${parts.length})\n${parts[index]}` : parts[index]);
      if (!result.ok) {
        const permanent = [400, 403].includes(Number(result.error_code));
        const retryAfter = Number(result.parameters?.retry_after);
        const delay = result.error_code === 429 && Number.isFinite(retryAfter) ? Math.max(1, Math.min(retryAfter, 86400)) : Math.min(3600, 30 * 2 ** Math.min(job.attempts, 7));
        // Never persist upstream descriptions: they can include tokens or user content.
        await stmt(env, 'UPDATE notification_jobs SET status=?,next_attempt_at=?,lease_until=0,last_error=? WHERE id=? AND status=\'sending\'',
          permanent || job.attempts >= 10 ? 'dead' : 'retry', now() + delay, `Telegram delivery failed (${Number(result.error_code) || 503}).`, job.id).run();
        failed = true; break;
      }
      await stmt(env, "UPDATE notification_jobs SET next_part=?,telegram_message_id=?,lease_until=? WHERE id=? AND status='sending'", index + 1, String(result.result?.message_id || ''), now() + 120, job.id).run();
    }
    if (!failed) await stmt(env, "UPDATE notification_jobs SET status='sent',sent_at=?,lease_until=0,last_error=NULL WHERE id=? AND status='sending'", now(), job.id).run();
  }
}

export async function webhook(request, env, ctx) {
  if (!secretReady(env.TELEGRAM_WEBHOOK_SECRET) || !await equal(request.headers.get('X-Telegram-Bot-Api-Secret-Token') || '', env.TELEGRAM_WEBHOOK_SECRET)) throw new HttpError(401, 'Invalid webhook secret.');
  const update = parseJSON(await readBody(request, 16000));
  if (!Number.isSafeInteger(update.update_id) || update.update_id < 0) throw new HttpError(400, 'Invalid update ID.');

  // Handle inline keyboard button callbacks
  if (update.callback_query) {
    const cb = update.callback_query;
    const chat = String(cb.message?.chat?.id || cb.from?.id);
    const recipient = await stmt(env, "SELECT status FROM recipients WHERE chat_id=?", chat).first();
    if (!recipient || recipient.status !== 'approved') {
      background(ctx, answerCallback(env, cb.id, 'Unauthorized: Admin approval required.'));
      return json({ ok: true });
    }
    const conf = await settings(env);
    let toast = '';
    if (cb.data === 'toggle_gmail') {
      conf.gmailEnabled = !conf.gmailEnabled;
      await saveSettings(env, conf);
      toast = conf.gmailEnabled ? 'Gmail alerts turned ON' : 'Gmail alerts turned OFF';
    } else if (cb.data === 'toggle_forms') {
      conf.formsEnabled = !conf.formsEnabled;
      await saveSettings(env, conf);
      toast = conf.formsEnabled ? 'Forms turned ON' : 'Forms turned OFF';
    } else if (cb.data === 'toggle_campaign') {
      conf.campaign.enabled = !conf.campaign.enabled;
      await saveSettings(env, conf);
      toast = conf.campaign.enabled ? 'F1 Sim Campaign ACTIVE' : 'F1 Sim Campaign OFF';
    } else if (cb.data === 'refresh_settings') {
      toast = 'Telemetry refreshed';
    }
    background(ctx, answerCallback(env, cb.id, toast));
    const card = buildSettingsCard(conf);
    background(ctx, editMessage(env, chat, cb.message.message_id, card.text, card.reply_markup));
    return json({ ok: true });
  }

  const msg = update.message;
  if (!msg || msg.chat?.type !== 'private' || !Number.isSafeInteger(msg.chat.id) || msg.chat.id <= 0 || !Number.isSafeInteger(msg.from?.id) || msg.from.id !== msg.chat.id || msg.from.is_bot) return json({ ok: true });

  const text = typeof msg.text === 'string' ? msg.text.trim() : '';
  const commandMatch = text.match(/^\/([a-zA-Z0-9_]+)(?:@[A-Za-z0-9_]+)?(?:\s+(.*))?$/);
  if (!commandMatch) return json({ ok: true });

  const command = commandMatch[1].toLowerCase();
  const commandArgs = (commandMatch[2] || '').trim();
  const chat = String(msg.chat.id), time = now();
  const username = String(msg.from.username || '').slice(0, 64);
  const name = [msg.from.first_name, msg.from.last_name].filter(s => typeof s === 'string').join(' ').slice(0, 150);

  // Settings & Config Control Card
  if (command === 'settings' || command === 'config') {
    const recipient = await stmt(env, 'SELECT status FROM recipients WHERE chat_id=?', chat).first();
    if (!recipient || recipient.status !== 'approved') {
      background(ctx, send(env, chat, '⚠️ <i>Access restricted. Send /start first and request administrator approval.</i>'));
      return json({ ok: true });
    }
    const conf = await settings(env);
    const card = buildSettingsCard(conf);
    background(ctx, send(env, chat, card.text, { reply_markup: card.reply_markup }));
    return json({ ok: true });
  }

  // Update target alert email
  if (command === 'email') {
    const recipient = await stmt(env, 'SELECT status FROM recipients WHERE chat_id=?', chat).first();
    if (!recipient || recipient.status !== 'approved') {
      background(ctx, send(env, chat, '⚠️ <i>Access restricted.</i>'));
      return json({ ok: true });
    }
    if (!commandArgs || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(commandArgs)) {
      background(ctx, send(env, chat, 'ℹ️ <b>Usage:</b> <code>/email name@example.com</code>\nPlease provide a valid destination email address.'));
      return json({ ok: true });
    }
    const conf = await settings(env);
    conf.contact.email = commandArgs;
    await saveSettings(env, conf);
    background(ctx, send(env, chat, `✅ <b>Target alert email updated:</b>\n<code>${commandArgs}</code>\n\nGmail alerts and website inquiries will route here.`));
    return json({ ok: true });
  }

  // Live status telemetry
  if (command === 'status') {
    const totalSubs = await stmt(env, "SELECT COUNT(*) as count FROM submissions").first();
    const conf = await settings(env);
    const reply = 
      `📊 <b>FORCE RACING LIVE TELEMETRY</b> 🏁\n\n` +
      `📥 <b>Total Submissions Logged:</b> ${totalSubs?.count || 0}\n` +
      `🏎️ <b>Campaign Mode:</b> ${conf.campaign.enabled ? '🟢 ACTIVE' : '🔴 DISABLED'}\n` +
      `📧 <b>Gmail Dispatch:</b> ${conf.gmailEnabled !== false ? '🟢 ON' : '🔴 OFF'}\n` +
      `📬 <b>Alert Email:</b> <code>${conf.contact.email}</code>\n` +
      `📝 <b>On-Site Forms:</b> ${conf.formsEnabled ? '🟢 OPEN' : '🔴 CLOSED'}`;
    background(ctx, send(env, chat, reply));
    return json({ ok: true });
  }

  if (command !== 'start' && command !== 'stop') return json({ ok: true });

  // Conditional on this update receipt: a Telegram retry cannot repeat a command.
  const results = await env.DB.batch([
    stmt(env, 'INSERT INTO telegram_updates(update_id,received_at) VALUES(?,?) ON CONFLICT DO NOTHING', update.update_id, time),
    stmt(env, `INSERT INTO recipients(chat_id,user_id,username,display_name,status,created_at,updated_at)
      SELECT ?,?,?,?,?,?,? WHERE changes()>0
      ON CONFLICT(chat_id) DO UPDATE SET username=excluded.username,display_name=excluded.display_name,updated_at=excluded.updated_at,
      status=CASE WHEN excluded.status='revoked' THEN 'revoked' ELSE recipients.status END`, chat, chat, username, name, command === 'stop' ? 'revoked' : 'pending', time, time),
    stmt(env, "UPDATE notification_jobs SET status='cancelled',lease_until=0 WHERE recipient_id=? AND status IN ('pending','retry','sending','dead') AND EXISTS(SELECT 1 FROM recipients WHERE chat_id=? AND status='revoked')", chat, chat)
  ]);
  if (results[0].meta.changes) {
    const recipient = await stmt(env, 'SELECT status FROM recipients WHERE chat_id=?', chat).first();
    const text = command === 'stop' ? 'Your Force Racing alerts are stopped. Only the owner can approve access again.'
      : recipient.status === 'approved' ? 'You are approved for Force Racing form alerts. Send /settings to open the control panel, or /stop to stop alerts.'
      : recipient.status === 'revoked' ? 'Your access remains revoked. Ask the owner to approve you again; /start cannot restore access.'
      : 'Your request is pending. The Force Racing owner must approve you before you receive any form alerts. Send /stop to withdraw.';
    background(ctx, send(env, chat, text));
  }
  return json({ ok: true });
}

export async function housekeeping(env) {
  await env.DB.batch([
    stmt(env, 'DELETE FROM admin_sessions WHERE expires_at<=?', now()),
    stmt(env, 'DELETE FROM rate_limits WHERE expires_at<?', now() - 86400),
    stmt(env, 'DELETE FROM telegram_updates WHERE received_at<?', now() - 30 * 86400)
  ]);
  await deliverDue(env);
}
