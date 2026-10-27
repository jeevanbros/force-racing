/* Local smoke check: boots wrangler dev (port 8787) against local D1 and walks the
   visitor → stored submission → admin flow with mocked Telegram. Run: npm run test:local
   Requires .dev.vars (npm run setup:local) and migrations applied (npm run db:migrate:local). */
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createHmac } from 'node:crypto';

const BASE = 'http://127.0.0.1:8787';
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.log('FAIL  ' + name + (detail ? ' — ' + detail : '')); }
};

const vars = Object.fromEntries((await readFile(new URL('../.dev.vars', import.meta.url), 'utf8'))
  .split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#')).map(l => {
    const idx = l.indexOf('=');
    return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
  }));
const PASSWORD = vars.ADMIN_PASSWORD, HOOK_SECRET = vars.TELEGRAM_WEBHOOK_SECRET, GF_SECRET = vars.GOOGLE_FORMS_SECRET;

const dev = spawn('npx', ['wrangler', 'dev', '--local', '--ip', '127.0.0.1', '--port', '8787'], { stdio: 'pipe', shell: true });
dev.stderr.on('data', () => {});
let ready = false;
dev.stdout.on('data', chunk => { if (String(chunk).includes('Ready on')) ready = true; });

const post = async (path, body, headers = {}) => {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  const response = await fetch(BASE + path, {
    method: 'POST', body: raw, redirect: 'manual',
    headers: { 'Content-Type': 'application/json', Origin: BASE, ...headers }
  });
  return { status: response.status, data: await response.json().catch(() => ({})), headers: response.headers, raw };
};

try {
  for (let i = 0; i < 120 && !ready; i++) await new Promise(r => setTimeout(r, 500));
  if (!ready) throw new Error('wrangler dev did not become ready on ' + BASE);

  // 1. Public config: forms start disabled (default settings), no crash.
  const config1 = await (await fetch(BASE + '/api/public/config')).json();
  check('public config responds, forms disabled by default', config1.formsEnabled === false && config1.campaign.enabled === false);

  // 2. Submission is refused while forms are disabled (fail closed, no fake receipt).
  const early = await post('/api/submissions', { type: 'contact', name: 'Asha', email: 'a@b.co', message: 'Hi', consent: true, website: '', idempotencyKey: 'k'.repeat(24) });
  check('submission refused while forms disabled', early.status === 503, String(early.status));

  // 3. Admin auth: unauthorized, wrong password, then owner login.
  const unauth = await fetch(BASE + '/api/admin/submissions');
  check('admin API rejects anonymous access', unauth.status === 401);
  const badLogin = await post('/api/admin/login', { password: 'wrong' });
  check('wrong owner password rejected', badLogin.status === 401);
  const login = await post('/api/admin/login', { password: PASSWORD });
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
  check('owner login succeeds', login.status === 200 && cookie.includes('force_session='));
  const csrf = login.data.csrfToken;
  const auth = { Cookie: cookie, 'X-CSRF-Token': csrf, Origin: BASE };

  // 4. Telegram webhook: secret enforced, /start creates a PENDING recipient only.
  const noSecret = await post('/api/telegram/webhook', { update_id: 1 });
  check('webhook rejects missing secret', noSecret.status === 401);
  const chatId = String(100000000 + Math.floor(Math.random() * 899999999));
  const hook = p => post('/api/telegram/webhook', p, { 'X-Telegram-Bot-Api-Secret-Token': HOOK_SECRET });
  const start = await hook({ update_id: Date.now(), message: { message_id: 1, chat: { id: Number(chatId), type: 'private' }, from: { id: Number(chatId), first_name: 'Friend' }, text: '/start' } });
  check('/start accepted with valid secret', start.status === 200);
  const recipients1 = await (await fetch(BASE + '/api/admin/recipients', { headers: { Cookie: cookie } })).json();
  const friend = recipients1.items.find(r => r.chat_id === chatId);
  check('/start creates pending recipient, never approved/admin', friend && friend.status === 'pending');

  // 5. Owner enables forms + campaign, then approves the recipient.
  const settingsData = await (await fetch(BASE + '/api/admin/settings', { headers: { Cookie: cookie } })).json();
  const enable = await fetch(BASE + '/api/admin/settings', {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify({ ...settingsData.settings, formsEnabled: true, campaign: { ...settingsData.settings.campaign, enabled: true, expiresAt: null } })
  });
  check('settings save succeeds', enable.status === 200);
  const noCsrf = await fetch(BASE + '/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: '{}' });
  check('mutation without CSRF token rejected', noCsrf.status === 403);
  const approve = await fetch(BASE + '/api/admin/recipients/' + chatId, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify({ status: 'approved' }) });
  check('owner approves recipient', approve.status === 200);

  // 6. Public config now live; registration request stored with receipt reference.
  const config2 = await (await fetch(BASE + '/api/public/config')).json();
  check('config live after approval (forms + campaign on)', config2.formsEnabled === true && config2.campaign.enabled === true);
  const key = crypto.randomUUID();
  const reg = { type: 'registration', name: 'Smoke Tester', email: 'smoke@example.com', phone: '+91 90000 00000', organization: 'KITSW', message: '', consent: true, website: '', idempotencyKey: key };
  const submit1 = await post('/api/submissions', reg);
  check('registration stored, 201 with FR- reference', submit1.status === 201 && /^FR(?:26)?-/.test(submit1.data.reference || ''), JSON.stringify(submit1.data));
  const submit2 = await post('/api/submissions', reg);
  check('idempotent retry returns same reference', submit2.status === 201 && submit2.data.reference === submit1.data.reference);
  const conflict = await post('/api/submissions', { ...reg, name: 'Changed Name' });
  check('same key with different details rejected', conflict.status === 409);
  const honeypot = await post('/api/submissions', { ...reg, website: 'spam', idempotencyKey: crypto.randomUUID() });
  check('honeypot rejected', honeypot.status === 400);
  const noConsent = await post('/api/submissions', { ...reg, consent: false, idempotencyKey: crypto.randomUUID() });
  check('missing consent rejected', noConsent.status === 400);

  // 7. Mock Telegram delivered the alert to the approved recipient.
  const list = await (await fetch(BASE + '/api/admin/submissions?type=registration', { headers: { Cookie: cookie } })).json();
  const record = list.items.find(i => i.reference === submit1.data.reference);
  let detail = { notifications: [] };
  for (let i = 0; i < 10; i++) {
    detail = await (await fetch(BASE + '/api/admin/submissions/' + record.id, { headers: { Cookie: cookie } })).json();
    if (detail.notifications.some(n => n.status === 'sent')) break;
    await new Promise(r => setTimeout(r, 400));
  }
  check('alert job sent to approved recipient (mock)', detail.notifications.some(n => n.status === 'sent' && n.recipient_id === chatId), JSON.stringify(detail.notifications));

  // 8. Campaign off: registrations close, config stops advertising, contact still works.
  const off = await fetch(BASE + '/api/admin/settings', {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify({ ...settingsData.settings, formsEnabled: true, campaign: { ...settingsData.settings.campaign, enabled: false } })
  });
  check('campaign disabled via settings', off.status === 200);
  const closed = await post('/api/submissions', { ...reg, idempotencyKey: crypto.randomUUID() });
  check('registration closed when campaign off', closed.status === 400);
  const config3 = await (await fetch(BASE + '/api/public/config')).json();
  check('campaign advertising hidden when off', config3.campaign.enabled === false && config3.formsEnabled === true);
  const contact = await post('/api/submissions', { type: 'contact', name: 'Still Open', email: 'c@d.co', message: 'Hello', consent: true, website: '', idempotencyKey: crypto.randomUUID() });
  check('contact enquiries still accepted', contact.status === 201);
  await fetch(BASE + '/api/admin/settings', {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify({ ...settingsData.settings, formsEnabled: true, campaign: { ...settingsData.settings.campaign, enabled: true, expiresAt: null } })
  });

  // 9. /stop revokes own alerts; /start cannot undo a revocation.
  await hook({ update_id: Date.now() + 1, message: { message_id: 2, chat: { id: Number(chatId), type: 'private' }, from: { id: Number(chatId) }, text: '/stop' } });
  await hook({ update_id: Date.now() + 2, message: { message_id: 3, chat: { id: Number(chatId), type: 'private' }, from: { id: Number(chatId) }, text: '/start' } });
  const recipients2 = await (await fetch(BASE + '/api/admin/recipients', { headers: { Cookie: cookie } })).json();
  check('/stop revokes and /start cannot self-restore', recipients2.items.find(r => r.chat_id === chatId).status === 'revoked');

  // 10. Signed Google Forms bridge: HMAC + timestamp enforced, response ID deduplicated.
  const gfBody = JSON.stringify({ responseId: 'smoke-' + Date.now(), submittedAt: new Date().toISOString(), respondentEmail: 'g@example.com', answers: [{ question: 'Name', answer: 'Bridge Tester' }] });
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac('sha256', GF_SECRET).update(ts + '.' + gfBody).digest('hex');
  const gfBad = await post('/api/integrations/google-forms', gfBody, { 'X-Force-Timestamp': ts, 'X-Force-Signature': '0'.repeat(64) });
  check('bridge rejects bad signature', gfBad.status === 401);
  const gf1 = await post('/api/integrations/google-forms', gfBody, { 'X-Force-Timestamp': ts, 'X-Force-Signature': sig });
  check('bridge accepts signed payload', gf1.status === 201, JSON.stringify(gf1.data));
  const gf2 = await post('/api/integrations/google-forms', gfBody, { 'X-Force-Timestamp': ts, 'X-Force-Signature': sig });
  check('bridge deduplicates response ID', gf2.status === 201 && gf2.data.reference === gf1.data.reference);

  // 11. Static site + admin page served by the same Worker.
  const home = await fetch(BASE + '/');
  const adminPage = await fetch(BASE + '/admin');
  check('public site served', home.status === 200 && (await home.text()).includes('FORCE RACING'));
  check('admin login page served', adminPage.status === 200 && (await adminPage.text()).includes('Owner password'));

  // 12. Logout invalidates the session.
  await post('/api/admin/logout', {}, auth);
  const afterLogout = await fetch(BASE + '/api/admin/submissions', { headers: { Cookie: cookie } });
  check('logout invalidates session', afterLogout.status === 401);
} catch (error) {
  failed++; console.log('FAIL  smoke run aborted — ' + error.message);
} finally {
  dev.kill('SIGTERM');
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
