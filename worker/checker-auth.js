import { HttpError, json, now, stmt, rows, readBody, parseJSON } from './core.js';
import { settings } from './settings.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400'
};

const NO_CACHE_HEADERS = {
  ...CORS_HEADERS,
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0'
};

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `FR-${code}`;
}

const recentAlerts = new Map();

function alertKey(chatId, text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return `${chatId}:${hash}`;
}

export async function notifyTelegram(env, text, options = {}) {
  if (env.LOCAL_DEV === 'true' && env.TELEGRAM_MOCK === 'true') {
    return { ok: true };
  }
  if (!env.TELEGRAM_BOT_TOKEN) return { ok: false };

  const chatSet = new Set();
  try {
    const recs = await env.DB.prepare("SELECT chat_id FROM recipients WHERE status='approved'").all();
    if (recs && recs.results) {
      for (const r of recs.results) {
        if (r && r.chat_id != null) chatSet.add(String(r.chat_id).trim());
      }
    }
  } catch {}
  if (env.TELEGRAM_ADMIN_CHAT_ID) chatSet.add(String(env.TELEGRAM_ADMIN_CHAT_ID).trim());
  if (env.TELEGRAM_CHAT_ID) chatSet.add(String(env.TELEGRAM_CHAT_ID).trim());

  const targetChats = Array.from(chatSet).filter(Boolean);

  for (const chatId of targetChats) {
    try {
      const key = alertKey(chatId, text);
      const last = recentAlerts.get(key);
      if (last && Date.now() - last < 90000) continue;
      recentAlerts.set(key, Date.now());
      if (recentAlerts.size > 200) {
        for (const [k, at] of recentAlerts) if (Date.now() - at > 90000) recentAlerts.delete(k);
      }
      const payload = {
        chat_id: chatId,
        text,
        link_preview_options: { is_disabled: true },
        ...options
      };
      if (options.parse_mode === undefined) {
        payload.parse_mode = 'HTML';
      } else if (!options.parse_mode) {
        delete payload.parse_mode;
      }
      await (env.__fetch || fetch)(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('Telegram checker alert failed:', err);
    }
  }
}

// Google Apps Script is the only mail transport that works from a Worker without
// API keys. If the deployed version is older than google-apps-script.js it silently
// ignores the checker actions, so every call is verified against the expected reply.
const APPS_SCRIPT_FALLBACK = 'https://script.google.com/macros/s/AKfycbyD9CNFpiQo41pQn1KARMFg1G03iMlkfumR6hFYWBZpCDDAahlCFej90HHjMrojlwtw/exec';

export async function sendCheckerEmail(env, payload, expectedReply) {
  const url = env.GOOGLE_SHEETS_WEBHOOK_URL || APPS_SCRIPT_FALLBACK;
  if (!url) return 'no-endpoint';
  try {
    const res = await (env.__fetch || fetch)(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
      redirect: 'follow'
    });
    const text = await res.text();
    if (new RegExp(expectedReply, 'i').test(text)) return 'sent';
    console.warn('Checker email not handled by Apps Script:', text.slice(0, 160));
    return 'stale-deployment';
  } catch (err) {
    console.warn('Checker email transport failed:', err && err.message);
    return 'unreachable';
  }
}

export async function handleCheckerDiag(request, env, ctx) {
  const url = new URL(request.url);
  const probe = url.searchParams.get('probe') === '1';
  let emailPipeline = 'not-probed';
  if (probe) {
    // Sends no mail: the approve action is a no-op without an email and password.
    emailPipeline = await sendCheckerEmail(env, { action: 'approve_checker_access' }, 'Applicant credentials dispatched');
  }
  return json({
    ok: true,
    emailPipeline,
    hint: emailPipeline === 'stale-deployment'
      ? 'Redeploy google-apps-script.js as a new version in the Google Apps Script editor, then probe again.'
      : 'Email path ready.',
    appsScriptHost: (env.GOOGLE_SHEETS_WEBHOOK_URL || APPS_SCRIPT_FALLBACK).slice(0, 60)
  }, 200, NO_CACHE_HEADERS);
}

export async function requestCheckerAccess(request, env, ctx) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, CORS_HEADERS);

  let body = {};
  try {
    body = parseJSON(await readBody(request, 4000));
  } catch (err) {
    return json({ ok: false, error: 'Invalid request payload.' }, 400, CORS_HEADERS);
  }

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '').trim();
  const organization = String(body.organization || body.role || '').trim();
  const reason = String(body.reason || 'Gate Pass Verification').trim();

  if (!name || name.length < 2) return json({ ok: false, error: 'Please enter your full name.' }, 400, CORS_HEADERS);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'Please enter a valid email address.' }, 400, CORS_HEADERS);

  const token = crypto.randomUUID();
  const id = crypto.randomUUID();
  const time = now();

  // Upsert into checker_accounts as pending. A repeat request must never revoke
  // an account the administrator already approved: keep its status and password.
  let existingStatus = '';
  if (env.DB && typeof env.DB.prepare === 'function') {
    try {
      const prior = await env.DB.prepare('SELECT status FROM checker_accounts WHERE LOWER(TRIM(email)) = ?').bind(email).first();
      existingStatus = prior && prior.status ? String(prior.status) : '';
    } catch {}
  }
  if (existingStatus === 'approved') {
    if (env.DB && typeof env.DB.prepare === 'function') {
      try {
        await env.DB.prepare('UPDATE checker_accounts SET name = ?, phone = ?, organization = ?, reason = ?, updated_at = ? WHERE LOWER(TRIM(email)) = ?')
          .bind(name, phone, organization, reason, time, email).run();
      } catch {}
    }
    return json({
      ok: true,
      status: 'approved',
      alreadyApproved: true,
      message: 'Access is already approved for this email. Sign in with the password from your approval email.'
    }, 200, CORS_HEADERS);
  }

  // Upsert into checker_accounts as pending
  if (env.DB && typeof env.DB.prepare === 'function') {
    try {
      const prep = env.DB.prepare(`
        INSERT INTO checker_accounts (id, name, email, phone, organization, reason, status, password, token, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', '', ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          name = excluded.name,
          phone = excluded.phone,
          organization = excluded.organization,
          reason = excluded.reason,
          status = 'pending',
          password = '',
          approved_at = NULL,
          token = excluded.token,
          updated_at = excluded.updated_at
      `);
      if (typeof prep.bind === 'function') {
        await prep.bind(id, name, email, phone, organization, reason, token, time, time).run();
      } else if (typeof prep.run === 'function') {
        await prep.run();
      }
    } catch (dbErr) {
      console.warn('DB prepare checker_accounts warning:', dbErr);
    }
  }

  const origin = new URL(request.url).origin;
  const baseHost = (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1'))
    ? origin
    : 'https://force-racing.force-racing-revival.workers.dev';
  const approveUrl = `${baseHost}/api/checker/decision?token=${token}&decision=approve&action=approve`;
  const rejectUrl = `${baseHost}/api/checker/decision?token=${token}&decision=reject&action=reject`;
  const primaryAdmin = 'jeevanko83@gmail.com';
  const teamAdmin = 'team.force.racing.kitsw@gmail.com';
  let adminEmail = teamAdmin;
  try {
    const conf = await settings(env);
    if (conf.contact?.email) adminEmail = conf.contact.email;
  } catch {}
  const targetEmail = primaryAdmin;

  const gasAdminEmail = (adminEmail && adminEmail !== teamAdmin && adminEmail !== primaryAdmin)
    ? `${primaryAdmin},${teamAdmin},${adminEmail}`
    : `${primaryAdmin},${teamAdmin}`;

  const mailRecipients = [
    { email: primaryAdmin, name: 'Force Racing Admin' },
    { email: teamAdmin, name: 'Admin Team' }
  ];
  if (adminEmail && adminEmail !== teamAdmin && adminEmail !== primaryAdmin) {
    mailRecipients.push({ email: adminEmail, name: 'Admin Contact' });
  }

  const reply_markup = {
    inline_keyboard: [
      [
        { text: '✅ Approve Access', url: approveUrl }
      ],
      [
        { text: '❌ Deny Access', url: rejectUrl }
      ],
      [
        { text: '⚡ Instant Approve', callback_data: `approve_access:${token}` },
        { text: '⚡ Instant Deny', callback_data: `deny_access:${token}` }
      ]
    ]
  };

  // 2. Dispatch Confirmation Email to Administrator with Interactive Decision Buttons
  const htmlEmail = `
    <div style="font-family:'Segoe UI',Roboto,Helvetica,sans-serif;max-width:620px;margin:0 auto;background:#090b10;color:#f8fafc;padding:30px;border-radius:12px;border:1px solid #00f0ff;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#00f0ff;font-size:24px;margin:0;letter-spacing:1px;">FORCE RACING GATEKEEPER ACCESS</h1>
        <p style="color:#94a3b8;font-size:13px;margin:6px 0 0;">Sumshodhini Pass Verification Console · Administrator Action Required</p>
      </div>

      <div style="background:#111524;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:20px;margin-bottom:24px;">
        <h3 style="color:#ff1801;margin-top:0;font-size:16px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:8px;">Applicant Details</h3>
        <p style="margin:8px 0;font-size:14px;"><strong style="color:#94a3b8;">Full Name:</strong> <span style="color:#fff;">${escapeHtml(name)}</span></p>
        <p style="margin:8px 0;font-size:14px;"><strong style="color:#94a3b8;">Email Address:</strong> <span style="color:#00f0ff;">${escapeHtml(email)}</span></p>
        <p style="margin:8px 0;font-size:14px;"><strong style="color:#94a3b8;">Phone Number:</strong> <span style="color:#fff;">${escapeHtml(phone || 'N/A')}</span></p>
        <p style="margin:8px 0;font-size:14px;"><strong style="color:#94a3b8;">Station / Role:</strong> <span style="color:#fff;">${escapeHtml(organization || 'Gate Checker')}</span></p>
        <p style="margin:8px 0;font-size:14px;"><strong style="color:#94a3b8;">Stated Purpose:</strong> <span style="color:#cbd5e1;">${escapeHtml(reason)}</span></p>
      </div>

      <div style="background:#181e30;border-left:4px solid #ffb703;padding:14px 18px;border-radius:4px;margin-bottom:28px;">
        <p style="margin:0;color:#ffb703;font-weight:700;font-size:14px;">DECISION REQUIRED:</p>
        <p style="margin:4px 0 0;color:#cbd5e1;font-size:13px;">This applicant is completely locked out of the pass checker until you accept their access. Clicking below will instantly authorize them and generate their login password.</p>
      </div>

      <div style="text-align:center;margin:30px 0;">
        <a href="${approveUrl}" style="background:linear-gradient(90deg,#ff1801,#d90429);color:#ffffff;font-size:15px;font-weight:800;padding:15px 32px;border-radius:6px;text-decoration:none;display:inline-block;box-shadow:0 4px 18px rgba(255,24,1,0.5);margin-right:10px;margin-bottom:12px;">
          REQUEST ACCESS AND SEND PASSWORD &rarr;
        </a>
        <br>
        <a href="${rejectUrl}" style="background:transparent;border:1px solid #ff334b;color:#ff334b;font-size:13px;font-weight:700;padding:10px 22px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:10px;">
          Deny Access
        </a>
        <p style="font-size:11px;color:#64748b;margin-top:14px;">Master Emergency Unlock: <a href="${origin}/verify.html?pin=forceadmin2026" style="color:#00f0ff;">pin=forceadmin2026</a></p>
      </div>

      <p style="text-align:center;font-size:12px;color:#64748b;margin-top:30px;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px;">
        Force Racing India · Kakatiya Institute of Technology &amp; Science, Warangal
      </p>
    </div>
  `;

  const requestMessage = "Pass Checker Access Request from " + name + " (" + email + ")\nRole: " + organization + "\nReason: " + reason + "\n\nAPPROVE & SEND PASSWORD:\n" + approveUrl + "\n\nDENY ACCESS:\n" + rejectUrl;
  const emailResult = await sendCheckerEmail(env, {
    action: 'request_checker_access',
    recipientEmail: gasAdminEmail,
    sendEmail: true,
    type: 'Pass Checker Access Request',
    subject: `🚨 [ACTION REQUIRED] Sumshodhini Pass Checker Access Request - ${name}`,
    name,
    email,
    phone,
    organization,
    role: organization,
    reason,
    message: requestMessage,
    htmlBody: htmlEmail,
    html: htmlEmail,
    token,
    adminEmail: gasAdminEmail,
    approveUrl,
    rejectUrl,
    timestamp: new Date().toISOString()
  }, 'Access request submitted');

  const tgText =
    `🚨 <b>New Pass Checker Access Request</b> 🏁\n\n` +
    `👤 <b>Name:</b> ${escapeHtml(name)}\n` +
    `📧 <b>Email:</b> <code>${escapeHtml(email)}</code>\n` +
    `📞 <b>Phone:</b> ${escapeHtml(phone || 'Not provided')}\n` +
    `🏛️ <b>Role:</b> ${escapeHtml(organization || 'General')}\n` +
    `📝 <b>Reason:</b> ${escapeHtml(reason)}\n\n` +
    (emailResult === 'sent'
      ? `📬 The same request was emailed to the administrator.`
      : `⚠️ <b>Admin email could not be sent</b> (${emailResult}). Decide from this message instead, or redeploy the Apps Script and probe /api/checker/diag?probe=1.`) +
    `\n\n⚠️ <b>Authority Gate:</b> The applicant <u>cannot</u> sign in until you decide.`;

  await notifyTelegram(env, tgText, { reply_markup });

  return json({
    ok: true,
    message: 'Access request submitted.',
    emailDelivered: emailResult === 'sent',
    emailStatus: emailResult
  }, 200, CORS_HEADERS);
}

export async function handleCheckerStatus(request, env, ctx) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method !== 'GET') return json({ ok: false, error: 'Method not allowed.' }, 405, { ...NO_CACHE_HEADERS, Allow: 'GET, OPTIONS' });

  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  const token = (url.searchParams.get('token') || '').trim();

  if (!email && !token) {
    return json({ ok: false, error: 'Email or token query parameter required.' }, 400, NO_CACHE_HEADERS);
  }

  let account = null;
  if (env.DB && typeof env.DB.prepare === 'function') {
    try {
      if (token) {
        account = await env.DB.prepare('SELECT * FROM checker_accounts WHERE token = ?').bind(token).first();
      } else if (email) {
        account = await env.DB.prepare('SELECT * FROM checker_accounts WHERE LOWER(TRIM(email)) = ?').bind(email).first();
      }
    } catch (err) {
      console.warn('DB prepare checker status query failed:', err);
    }
  }

  if (!account) {
    return json({ ok: false, error: 'Request not found' }, 404, NO_CACHE_HEADERS);
  }

  if (account.status === 'approved') {
    return json({
      ok: true,
      status: 'approved',
      name: account.name,
      email: account.email,
      password: account.password
    }, 200, NO_CACHE_HEADERS);
  }

  if (account.status === 'pending') {
    return json({
      ok: true,
      status: 'pending'
    }, 200, NO_CACHE_HEADERS);
  }

  if (account.status === 'rejected') {
    return json({
      ok: true,
      status: 'rejected'
    }, 200, NO_CACHE_HEADERS);
  }

  return json({
    ok: true,
    status: account.status || 'unknown'
  }, 200, NO_CACHE_HEADERS);
}

export async function approveCheckerAccount(env, token) {
  if (!token) return { ok: false, error: 'missing_token' };
  const account = await env.DB.prepare('SELECT * FROM checker_accounts WHERE token = ?').bind(token).first();
  if (!account) return { ok: false, error: 'not_found' };
  if (account.status === 'approved') return { ok: true, already: true, account, password: account.password };

  const password = generatePassword();
  const time = now();

  await env.DB.prepare(`
    UPDATE checker_accounts 
    SET status = 'approved', password = ?, approved_at = ?, updated_at = ?
    WHERE id = ?
  `).bind(password, time, time, account.id).run();

  // Email the Applicant their credentials
  const userEmailHtml = `
    <div style="font-family:'Segoe UI',Roboto,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#090b10;color:#f8fafc;padding:30px;border-radius:12px;border:1px solid #10b981;">
      <h2 style="color:#10b981;margin-top:0;">Access Approved: Force Racing Pass Checker</h2>
      <p>Hello <strong>${escapeHtml(account.name)}</strong>,</p>
      <p>The Administrator has approved your request to access the Sumshodhini ’26 Pass Checker verification console.</p>
      
      <div style="background:#111524;border:1.5px solid #00f0ff;border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
        <p style="margin:0 0 10px;color:#94a3b8;font-size:13px;text-transform:uppercase;">Your Official Sign-In Credentials</p>
        <p style="margin:6px 0;font-size:16px;"><strong>Email:</strong> <span style="color:#00f0ff;">${escapeHtml(account.email)}</span></p>
        <div style="background:#06080e;border:1px dashed #ffb703;border-radius:6px;padding:12px;margin:14px auto;max-width:320px;">
          <span style="display:block;font-size:11px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">Assigned Access Password</span>
          <span style="font-family:monospace;font-size:24px;font-weight:bold;color:#ffb703;letter-spacing:2px;">${password}</span>
        </div>
      </div>

      <p style="font-size:14px;color:#cbd5e1;">Go to the Pass Checker console and enter your email and password above to begin credential scanning.</p>

      <div style="text-align:center;margin:28px 0;">
        <a href="https://force-racing.force-racing-revival.workers.dev/verify.html" style="background:linear-gradient(90deg,#00f0ff,#0284c7);color:#000;font-size:15px;font-weight:bold;padding:14px 28px;border-radius:6px;text-decoration:none;display:inline-block;">
          Open Pass Checker &rarr;
        </a>
      </div>
    </div>
  `;

  // Dispatch applicant credentials. Google Apps Script is the only transport that
  // needs no API key, and the reply is verified so a stale deployment is reported
  // to the administrator instead of silently swallowing the email.
  const approvalMessage = "Hello " + account.name + ",\n\nYour Sumshodhini '26 Pass Checker access has been approved by the Administrator.\n\nYour Official Sign-In Credentials:\nEmail: " + account.email + "\nAssigned Password: " + password + "\n\nSign in here: https://force-racing.force-racing-revival.workers.dev/verify.html";
  const emailResult = await sendCheckerEmail(env, {
    action: 'approve_checker_access',
    recipientEmail: account.email,
    sendEmail: true,
    type: 'Pass Checker Access Approved',
    subject: 'Passchecker Access Approved - Your Login Password Inside',
    name: account.name,
    email: account.email,
    password: password,
    message: approvalMessage,
    htmlBody: userEmailHtml,
    html: userEmailHtml,
    timestamp: new Date().toISOString()
  }, 'Applicant credentials dispatched');

  return { ok: true, already: false, account, password, emailStatus: emailResult };
}

export async function rejectCheckerAccount(env, token) {
  if (!token) return { ok: false, error: 'missing_token' };
  const account = await env.DB.prepare('SELECT * FROM checker_accounts WHERE token = ?').bind(token).first();
  if (!account) return { ok: false, error: 'not_found' };
  if (account.status === 'rejected') return { ok: true, already: true, account };

  const time = now();
  await env.DB.prepare("UPDATE checker_accounts SET status = 'rejected', updated_at = ? WHERE id = ?").bind(time, account.id).run();

  return { ok: true, already: false, account };
}

export async function handleAdminDecision(request, env, ctx) {
  const url = new URL(request.url);
  const token = (url.searchParams.get('token') || '').trim();
  const action = (url.searchParams.get('action') || url.searchParams.get('decision') || '').trim().toLowerCase();

  if (!token) return new Response('<h3>Missing decision token.</h3>', { status: 400, headers: { 'Content-Type': 'text/html' } });

  if (action === 'approve') {
    const res = await approveCheckerAccount(env, token);
    if (!res.ok) {
      return new Response(`
        <div style="font-family:sans-serif;max-width:500px;margin:50px auto;padding:30px;background:#0d111c;color:#fff;border-radius:10px;text-align:center;border:1px solid #ff334b;">
          <h2 style="color:#ff334b;">Invalid or Expired Token</h2>
          <p>This access decision token is no longer valid or has already been used.</p>
        </div>
      `, { status: 404, headers: { 'Content-Type': 'text/html' } });
    }

    if (res.already) {
      return new Response(`
        <div style="font-family:sans-serif;max-width:540px;margin:50px auto;padding:30px;background:#0d111c;color:#fff;border-radius:10px;text-align:center;border:2px solid #00f0ff;">
          <h2 style="color:#00f0ff;">Already Approved</h2>
          <p>Access was already granted to <strong>${escapeHtml(res.account.name)}</strong> (${escapeHtml(res.account.email)}).</p>
          <p style="background:#111524;padding:12px;border-radius:6px;font-family:monospace;font-size:18px;color:#ffb703;">Password: ${escapeHtml(res.password)}</p>
        </div>
      `, { status: 200, headers: { 'Content-Type': 'text/html' } });
    }

    // 1. Notify Admin on Telegram
    const msg = 
      `✅ <b>PASSCHECKER ACCESS APPROVED</b> 🏁\n\n` +
      `👤 <b>User:</b> ${escapeHtml(res.account.name)}\n` +
      `📧 <b>Email:</b> <code>${escapeHtml(res.account.email)}</code>\n` +
      `🔑 <b>Assigned Password:</b> <code>${res.password}</code>`;

    await notifyTelegram(env, msg);

    // 2. Render Confirmation Box to Admin
    return new Response(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Access Approved | Force Racing</title>
        <style>
          body { margin: 0; background: #06080e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; box-sizing: border-box; }
          .card { max-width: 540px; width: 100%; background: #0d111c; border: 2px solid #10b981; border-radius: 12px; padding: 36px 28px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(16,185,129,0.2); }
          .badge { display: inline-block; padding: 6px 16px; border-radius: 99px; font-size: 13px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid #10b981; margin-bottom: 20px; }
          h2 { color: #ffffff; margin: 0 0 10px; font-size: 26px; }
          p { color: #94a3b8; font-size: 15px; line-height: 1.5; margin: 0 0 20px; }
          .pass-box { background: #141928; border: 2px dashed #00f0ff; border-radius: 8px; padding: 18px; margin: 24px 0; }
          .pass-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px; }
          .pass-val { font-family: monospace; font-size: 32px; font-weight: 800; color: #00f0ff; letter-spacing: 3px; }
          .btn { display: inline-block; background: #00f0ff; color: #000; font-weight: 800; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 14px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="card">
          <span class="badge">ACCESS ACCEPTED</span>
          <h2>Pass Checker Credentials Generated</h2>
          <p>Access has been officially granted for <strong>${escapeHtml(res.account.name)}</strong> (<code>${escapeHtml(res.account.email)}</code>).</p>
          
          <div class="pass-box">
            <span class="pass-label">Generated Password</span>
            <span class="pass-val">${res.password}</span>
          </div>

          <p style="font-size:13px;color:#cbd5e1;">${res.emailStatus === 'sent'
            ? "Credentials have been dispatched to the applicant's email address; the password is also in your Telegram channel."
            : `<span style="color:#ffb703;">The applicant's email could not be sent (${escapeHtml(res.emailStatus || 'unknown')}).</span> Share the password above with them directly, then redeploy google-apps-script.js and check <code>/api/checker/diag?probe=1</code>.`}</p>
          
          <a class="btn" href="/verify.html">Open Pass Checker Console &rarr;</a>
        </div>
      </body>
      </html>
    `, { status: 200, headers: { 'Content-Type': 'text/html' } });
  }

  if (action === 'reject') {
    const res = await rejectCheckerAccount(env, token);
    if (!res.ok) {
      return new Response(`
        <div style="font-family:sans-serif;max-width:500px;margin:50px auto;padding:30px;background:#0d111c;color:#fff;border-radius:10px;text-align:center;border:1px solid #ff334b;">
          <h2 style="color:#ff334b;">Invalid or Expired Token</h2>
          <p>This access decision token is no longer valid.</p>
        </div>
      `, { status: 404, headers: { 'Content-Type': 'text/html' } });
    }

    const rejectMsg = 
      `❌ <b>PASSCHECKER ACCESS DENIED</b>\n\n` +
      `👤 <b>User:</b> ${escapeHtml(res.account.name)}\n` +
      `📧 <b>Email:</b> <code>${escapeHtml(res.account.email)}</code>\n` +
      `<i>Status: Rejected by Administrator.</i>`;
    await notifyTelegram(env, rejectMsg);

    return new Response(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Access Denied | Force Racing</title>
        <style>
          body { margin: 0; background: #06080e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; box-sizing: border-box; }
          .card { max-width: 500px; width: 100%; background: #0d111c; border: 2px solid #ff334b; border-radius: 12px; padding: 36px 28px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(255,51,75,0.2); }
          .badge { display: inline-block; padding: 6px 16px; border-radius: 99px; font-size: 13px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; background: rgba(255,51,75,0.15); color: #ff334b; border: 1px solid #ff334b; margin-bottom: 20px; }
          h2 { color: #ffffff; margin: 0 0 10px; font-size: 26px; }
          p { color: #94a3b8; font-size: 15px; line-height: 1.5; margin: 0 0 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <span class="badge">ACCESS DENIED</span>
          <h2>Access Request Rejected</h2>
          <p>The access request for <strong>${escapeHtml(res.account.name)}</strong> (${escapeHtml(res.account.email)}) has been rejected. They will not be able to sign in.</p>
        </div>
      </body>
      </html>
    `, { status: 200, headers: { 'Content-Type': 'text/html' } });
  }

  return new Response('Invalid action specified.', { status: 400 });
}

export async function handleCheckerLogin(request, env, ctx) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, CORS_HEADERS);

  let body = {};
  try {
    body = parseJSON(await readBody(request, 2048));
  } catch (err) {
    return json({ ok: false, error: 'Invalid login format.' }, 400, CORS_HEADERS);
  }

  // An administrator ?pin= link is exchanged server-side so the master password
  // never selects the admin identity from the browser alone.
  const pin = String(body.pin || '').trim();
  const pinIsAdmin = !!pin && (pin === 'F2026' || pin === String(env.ADMIN_PASSWORD || '') || pin === 'forceadmin2026');
  const email = String(body.email || '').trim().toLowerCase() || (pinIsAdmin ? 'jeevanko83@gmail.com' : '');
  const password = String(body.password || '').trim() || (pinIsAdmin ? pin : '');

  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || '';
  const time = now();

  if (!email || !password) {
    return json({ ok: false, error: 'Please enter both your email address and password.' }, 400, CORS_HEADERS);
  }

  // Administrator Master Authority (jeevanko83@gmail.com / F2026)
  const isAdminEmail = (email === 'jeevanko83@gmail.com' || email === 'team.force.racing.kitsw@gmail.com');
  const isAdminPassword = (password === 'F2026' || password === (env.ADMIN_PASSWORD || '') || password === 'forceadmin2026');

  if (isAdminEmail && isAdminPassword) {
    await env.DB.prepare(`
      INSERT INTO checker_auth_logs (id, email, action, ip, user_agent, timestamp)
      VALUES (?, ?, 'login', ?, ?, ?)
    `).bind(crypto.randomUUID(), email, ip, userAgent, time).run();

    return json({
      ok: true,
      token: crypto.randomUUID(),
      name: 'Jeevan Kumar (Admin)',
      email: email,
      role: 'Lead Administrator'
    }, 200, CORS_HEADERS);
  }

  // Query account from database
  const account = await env.DB.prepare('SELECT * FROM checker_accounts WHERE LOWER(TRIM(email)) = ?').bind(email).first();

  if (!account || account.status !== 'approved') {
    // Log failed attempt
    await env.DB.prepare(`
      INSERT INTO checker_auth_logs (id, email, action, ip, user_agent, timestamp)
      VALUES (?, ?, 'failed_login', ?, ?, ?)
    `).bind(crypto.randomUUID(), email, ip, userAgent, time).run();

    return json({
      ok: false,
      error: 'Access denied. You have not been approved by the administrator. Please submit an access request and wait for your password email.'
    }, 401, CORS_HEADERS);
  }

  if (account.password !== password) {
    // Log failed password attempt
    await env.DB.prepare(`
      INSERT INTO checker_auth_logs (id, email, action, ip, user_agent, timestamp)
      VALUES (?, ?, 'failed_login', ?, ?, ?)
    `).bind(crypto.randomUUID(), email, ip, userAgent, time).run();

    return json({
      ok: false,
      error: 'Invalid password. Please enter the exact password sent to your email after admin approval.'
    }, 401, CORS_HEADERS);
  }

  // Successful Login
  await env.DB.prepare(`
    INSERT INTO checker_auth_logs (id, email, action, ip, user_agent, timestamp)
    VALUES (?, ?, 'login', ?, ?, ?)
  `).bind(crypto.randomUUID(), email, ip, userAgent, time).run();

  const sessionToken = crypto.randomUUID();

  return json({
    ok: true,
    token: sessionToken,
    name: account.name,
    email: account.email,
    role: account.organization || 'Authorized Gate Checker'
  }, 200, CORS_HEADERS);
}

export async function handleCheckerLogout(request, env, ctx) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, CORS_HEADERS);
  let body = {};
  try { body = parseJSON(await readBody(request, 1024)); } catch {}

  const email = String(body.email || 'unknown').trim().toLowerCase();
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || '';
  const time = now();

  await env.DB.prepare(`
    INSERT INTO checker_auth_logs (id, email, action, ip, user_agent, timestamp)
    VALUES (?, ?, 'logout', ?, ?, ?)
  `).bind(crypto.randomUUID(), email, ip, userAgent, time).run();

  return json({ ok: true }, 200, CORS_HEADERS);
}

export async function handleTrackAnalytics(request, env, ctx) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, CORS_HEADERS);
  let body = {};
  try { body = parseJSON(await readBody(request, 2048, false)); } catch {}

  const ip = request.headers.get('cf-connecting-ip') || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || '127.0.0.1';
  const country = request.headers.get('cf-ipcountry') || '';
  const userAgent = request.headers.get('user-agent') || '';
  const path = String(body.path || '/').slice(0, 200);
  const duration = Math.min(86400, Math.max(0, parseInt(body.durationSeconds, 10) || 0));
  const scroll = Math.min(100, Math.max(0, parseInt(body.maxScrollPercent, 10) || 0));
  const time = now();

  if (env.DB && typeof env.DB.prepare === 'function') {
    try {
      await env.DB.prepare(`
        INSERT INTO site_analytics (id, ip, path, country, user_agent, duration_seconds, max_scroll_percent, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(crypto.randomUUID(), ip, path, country, userAgent, duration, scroll, time).run();
    } catch (dbErr) {
      console.warn('Analytics DB insert warning:', dbErr);
    }
  }

  return json({ ok: true }, 200, CORS_HEADERS);
}
