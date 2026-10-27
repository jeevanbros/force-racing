import { HttpError, now, stmt, rows, json, parseJSON, readBody, string, background } from './core.js';
import { login, cookie, requireSession, session, authReady } from './auth.js';
import { settings, saveSettings, readiness, campaignState } from './settings.js';
import { deliverDue } from './telegram.js';
import { loginPage, dashboardPage } from '../admin/pages.js';
import { styles } from '../admin/styles.js';
import { client } from '../admin/client.js';

const html = (body, status = 200, headers = {}) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', ...headers } });
export async function adminPage(request, env) {
  const path = new URL(request.url).pathname;
  if (path === '/admin/login' && request.method === 'POST') {
    try {
      if ((request.headers.get('Content-Type') || '').split(';')[0] !== 'application/x-www-form-urlencoded') throw new HttpError(415, 'Use the owner login form.');
      const body = new URLSearchParams(await readBody(request, 2048, false));
      const result = await login(env, request, body.get('password'));
      return new Response(null, { status: 303, headers: { Location: '/admin', 'Set-Cookie': result.cookie } });
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      return html(loginPage(error.message), error.status, error.headers);
    }
  }
  if (request.method !== 'GET') throw new HttpError(405, 'Method not allowed.', { Allow: 'GET' });
  if (path === '/admin' || path === '/admin/') {
    const user = await session(env, request);
    return html(user ? dashboardPage(user.csrf_token) : loginPage(authReady(env) ? '' : 'Owner login must be configured before signing in.'));
  }
  await requireSession(env, request);
  if (path === '/admin/styles.css') return new Response(styles, { headers: { 'Content-Type': 'text/css; charset=utf-8' } });
  if (path === '/admin/app.js') return new Response(client, { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
  throw new HttpError(404, 'Admin page not found.');
}

export async function adminApi(request, env, ctx) {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  if (path === '/api/admin/login' && method === 'POST') {
    const data = parseJSON(await readBody(request, 2048));
    const result = await login(env, request, data.password);
    return json({ ok: true, csrfToken: result.csrfToken }, 200, { 'Set-Cookie': result.cookie });
  }
  const user = await requireSession(env, request, method !== 'GET');
  if (path === '/api/admin/session' && method === 'GET') return json({ ok: true, csrfToken: user.csrf_token, expiresAt: new Date(user.expires_at * 1000).toISOString() });
  if (path === '/api/admin/logout' && method === 'POST') {
    await stmt(env, 'DELETE FROM admin_sessions WHERE id_hash=?', user.id_hash).run();
    return json({ ok: true }, 200, { 'Set-Cookie': cookie('', env, request, true) });
  }
  if (path === '/api/admin/metrics' && method === 'GET') {
    const submissions = await stmt(env, "SELECT COUNT(*) AS total,COALESCE(SUM(status='new'),0) AS new FROM submissions").first();
    const notifications = await rows(env, 'SELECT status,COUNT(*) AS count FROM notification_jobs GROUP BY status');
    const recipients = await rows(env, 'SELECT status,COUNT(*) AS count FROM recipients GROUP BY status');
    return json({ submissions, notifications: Object.fromEntries(notifications.map(r => [r.status, r.count])), recipients: Object.fromEntries(recipients.map(r => [r.status, r.count])) });
  }
  if (path === '/api/admin/submissions' && method === 'GET') {
    const clauses = [], args = [];
    for (const [key, values] of [['status', ['new', 'in_progress', 'resolved', 'spam']], ['type', ['contact', 'sponsor', 'donate', 'registration']], ['source', ['website', 'google_form']]]) {
      const value = url.searchParams.get(key);
      if (value) { if (!values.includes(value)) throw new HttpError(400, `Invalid ${key} filter.`); clauses.push(`${key}=?`); args.push(value); }
    }
    const search = string(url.searchParams.get('q') || '', 'Search', 100);
    if (search) { clauses.push('(name LIKE ? OR email LIKE ? OR reference LIKE ? OR organization LIKE ?)'); args.push(...Array(4).fill('%' + search + '%')); }
    const offset = Number(url.searchParams.get('offset') || 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 1000000) throw new HttpError(400, 'Invalid page.');
    const where = clauses.length ? ' WHERE ' + clauses.join(' AND ') : '';
    const count = await stmt(env, 'SELECT COUNT(*) AS count FROM submissions' + where, ...args).first();
    const items = await rows(env, 'SELECT id,reference,source,type,name,email,organization,status,submitted_at,created_at FROM submissions' + where + ' ORDER BY created_at DESC,id DESC LIMIT 30 OFFSET ?', ...args, offset);
    return json({ items, total: count.count, offset, limit: 30 });
  }
  const submission = path.match(/^\/api\/admin\/submissions\/([a-f0-9-]{36})$/i);
  if (submission) {
    const record = await stmt(env, 'SELECT * FROM submissions WHERE id=?', submission[1]).first();
    if (!record) throw new HttpError(404, 'Submission not found.');
    if (method === 'GET') {
      const notifications = await rows(env, 'SELECT j.*,r.display_name,r.status AS recipient_status FROM notification_jobs j JOIN recipients r ON r.chat_id=j.recipient_id WHERE submission_id=? ORDER BY created_at,id', record.id);
      const { payload_hash, idempotency_key, answers_json, ...item } = record;
      return json({ item: { ...item, answers: answers_json ? JSON.parse(answers_json) : [] }, notifications });
    }
    if (method === 'PATCH') {
      const data = parseJSON(await readBody(request, 10000));
      if (!['new', 'in_progress', 'resolved', 'spam'].includes(data.status)) throw new HttpError(400, 'Choose a valid status.');
      const notes = string(data.notes, 'Notes', 5000);
      await stmt(env, 'UPDATE submissions SET status=?,notes=?,updated_at=? WHERE id=?', data.status, notes, now(), record.id).run();
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      const data = parseJSON(await readBody(request, 1000));
      if (data.confirmation !== record.reference) throw new HttpError(400, 'Confirm the exact reference before deletion.');
      await stmt(env, 'DELETE FROM submissions WHERE id=?', record.id).run();
      return json({ ok: true });
    }
  }
  if (path === '/api/admin/recipients' && method === 'GET') return json({ items: await rows(env, 'SELECT * FROM recipients ORDER BY created_at DESC,chat_id') });
  const recipient = path.match(/^\/api\/admin\/recipients\/(\d{1,20})$/);
  if (recipient && method === 'PATCH') {
    const data = parseJSON(await readBody(request, 1000));
    if (!['approved', 'revoked'].includes(data.status)) throw new HttpError(400, 'Choose approved or revoked.');
    const prior = await stmt(env, 'SELECT chat_id FROM recipients WHERE chat_id=?', recipient[1]).first();
    if (!prior) throw new HttpError(404, 'Ask this person to send /start to the bot first.');
    await env.DB.batch([
      stmt(env, 'UPDATE recipients SET status=?,updated_at=? WHERE chat_id=?', data.status, now(), recipient[1]),
      stmt(env, "UPDATE notification_jobs SET status='cancelled',lease_until=0 WHERE recipient_id=? AND status IN ('pending','retry','sending','dead') AND ?='revoked'", recipient[1], data.status)
    ]);
    return json({ ok: true });
  }
  if (path === '/api/admin/settings' && method === 'GET') {
    const config = await settings(env);
    return json({ settings: config, campaignState: campaignState(config), service: await readiness(env, request) });
  }
  if (path === '/api/admin/settings' && method === 'PUT') return json({ ok: true, settings: await saveSettings(env, parseJSON(await readBody(request, 12000))) });
  if (path === '/api/admin/notifications/retry' && method === 'POST') {
    const data = parseJSON(await readBody(request, 1000));
    const id = data.submissionId === undefined ? null : string(data.submissionId, 'Submission ID', 36, true);
    if (id && !/^[a-f0-9-]{36}$/i.test(id)) throw new HttpError(400, 'Invalid submission ID.');
    const result = await stmt(env, `UPDATE notification_jobs SET status='retry',attempts=0,next_attempt_at=?,last_error=NULL,lease_until=0
      WHERE status IN ('retry','dead') AND (? IS NULL OR submission_id=?) AND EXISTS(SELECT 1 FROM recipients WHERE chat_id=recipient_id AND status='approved')`, now(), id, id).run();
    background(ctx, deliverDue(env, id));
    return json({ ok: true, queued: result.meta.changes });
  }
  throw new HttpError(404, 'Admin API route not found.');
}
