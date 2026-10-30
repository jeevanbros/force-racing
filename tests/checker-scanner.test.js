import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { route, formatDriveUrl } from '../worker/index.js';
import { validateSubmission } from '../worker/submissions.js';

test('QR Code Pass ID extraction logic handles URLs, queries, and raw codes', () => {
  function extractPassId(raw) {
    if (!raw) return '';
    const text = String(raw).trim();
    try {
      if (text.startsWith('http://') || text.startsWith('https://')) {
        const url = new URL(text);
        const p = url.searchParams.get('pass');
        if (p) return p.trim().toUpperCase();
      }
    } catch(e) {}
    const paramMatch = text.match(/[?&]pass=([^&]+)/i);
    if (paramMatch) {
      return decodeURIComponent(paramMatch[1]).trim().toUpperCase();
    }
    const simMatch = text.match(/\b(FR26-SIM-[A-Z0-9]+)\b/i);
    if (simMatch) return simMatch[1].toUpperCase();
    const frMatch = text.match(/\b(FR26-[A-Z0-9-]+)\b/i) || text.match(/\b(FR-[A-Z0-9-]+)\b/i);
    if (frMatch) return frMatch[1].toUpperCase();
    let clean = text.replace(/^(pass\s*#?|id\s*#?|#)\s*/i, '').replace(/[.,;:!?]+$/, '').trim();
    clean = clean.replace(/\s*-\s*/g, '-');
    return clean.toUpperCase();
  }

  assert.equal(
    extractPassId('https://force-racing.force-racing-revival.workers.dev/verify.html?pass=FR26-SIM-83733F88'),
    'FR26-SIM-83733F88'
  );
  assert.equal(
    extractPassId('https://forceracing.org/verify.html?pass=FR26-SIM-12345&source=qr'),
    'FR26-SIM-12345'
  );
  assert.equal(
    extractPassId('FR26-SIM-99999'),
    'FR26-SIM-99999'
  );
  assert.equal(
    extractPassId('pass # FR26-SIM-45678'),
    'FR26-SIM-45678'
  );
  assert.equal(
    extractPassId('FR-A1B2C3D4'),
    'FR-A1B2C3D4'
  );
});

function createMockD1() {
  const state = {
    checker_accounts: new Map(),
    checker_auth_logs: [],
    site_analytics: [],
    recipients: [{ chat_id: '11223344', status: 'approved' }]
  };

  return {
    state,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            run: async () => {
              if (sql.includes('INSERT INTO checker_accounts')) {
                const [id, name, email, phone, organization, reason, token, created_at, updated_at] = args;
                state.checker_accounts.set(email.toLowerCase(), {
                  id, name, email: email.toLowerCase(), phone, organization, reason, status: 'pending', password: '', token, created_at, updated_at
                });
                return { success: true };
              }
              if (sql.includes("status = 'approved'")) {
                const [password, approved_at, updated_at, id] = args;
                for (const acc of state.checker_accounts.values()) {
                  if (acc.id === id) {
                    acc.status = 'approved';
                    acc.password = password;
                    acc.approved_at = approved_at;
                    acc.updated_at = updated_at;
                  }
                }
                return { success: true };
              }
              if (sql.includes("status = 'rejected'")) {
                const [updated_at, id] = args;
                for (const acc of state.checker_accounts.values()) {
                  if (acc.id === id) {
                    acc.status = 'rejected';
                    acc.updated_at = updated_at;
                  }
                }
                return { success: true };
              }
              if (sql.includes('INSERT INTO checker_auth_logs')) {
                const action = sql.includes("'failed_login'") ? 'failed_login' : (sql.includes("'logout'") ? 'logout' : 'login');
                const [id, email, ip, user_agent, timestamp] = args;
                state.checker_auth_logs.push({ id, email, action, ip, user_agent, timestamp });
                return { success: true };
              }
              if (sql.includes('INSERT INTO site_analytics')) {
                const [id, ip, path, country, user_agent, duration_seconds, max_scroll_percent, timestamp] = args;
                state.site_analytics.push({ id, ip, path, country, user_agent, duration_seconds, max_scroll_percent, timestamp });
                return { success: true };
              }
              return { success: true };
            },
            first: async () => {
              if (sql.includes('FROM checker_accounts WHERE token = ?')) {
                const [token] = args;
                for (const acc of state.checker_accounts.values()) {
                  if (acc.token === token) return { ...acc };
                }
                return null;
              }
              if (sql.includes('FROM checker_accounts WHERE LOWER(email) = ?') || sql.includes('FROM checker_accounts WHERE LOWER(TRIM(email)) = ?')) {
                const [email] = args;
                const acc = state.checker_accounts.get(String(email).toLowerCase().trim());
                return acc ? { ...acc } : null;
              }
              return null;
            },
            all: async () => ({ results: [] })
          };
        },
        first: async () => null,
        all: async () => {
          if (sql.includes("FROM recipients WHERE status='approved'")) {
            return { results: state.recipients.filter(r => r.status === 'approved') };
          }
          return { results: [] };
        },
        run: async () => ({ success: true })
      };
    }
  };
}

test('/api/checker/request-access correctly sets status to pending in D1 and triggers Telegram and email notifications', async () => {
  const dispatchedFetch = [];
  const mockD1 = createMockD1();
  const mockEnv = {
    GOOGLE_SHEETS_WEBHOOK_URL: 'https://script.google.com/test-webhook',
    TELEGRAM_BOT_TOKEN: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
    TELEGRAM_ADMIN_CHAT_ID: '987654321',
    DB: mockD1,
    __fetch: async (url, options) => {
      dispatchedFetch.push({ url, options, body: options.body ? JSON.parse(options.body) : null });
      return new Response(JSON.stringify({ ok: true, status: 'success' }), { status: 200 });
    }
  };

  const req = new Request('http://localhost:8787/api/checker/request-access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rohan Sharma',
      email: 'rohan@kitsw.ac.in',
      phone: '+91 98765 43210',
      role: 'Central Workshop Gate 2',
      reason: 'Pass Verification Desk'
    })
  });

  const res = await route(req, mockEnv, {});
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.message, 'Access request submitted.');
  assert.equal(JSON.stringify(data).includes('jeevanko83'), false, 'Response must not disclose admin email');

  // Verify D1 checker_accounts state: pending
  const account = mockD1.state.checker_accounts.get('rohan@kitsw.ac.in');
  assert.ok(account, 'Must save checker account in D1');
  assert.equal(account.status, 'pending', 'Initial status must be pending');
  assert.equal(account.name, 'Rohan Sharma');
  assert.equal(account.phone, '+91 98765 43210');
  assert.equal(account.organization, 'Central Workshop Gate 2');
  assert.equal(account.reason, 'Pass Verification Desk');
  assert.ok(account.token, 'Must generate unique decision token');

  // 1. Verify Admin Email payload carries decision URLs and full applicant details
  const gasCall = dispatchedFetch.find(c => c.url.includes('script.google.com'));
  assert.ok(gasCall, 'Must call Google Apps Script to dispatch email notification');
  const emailHtml = gasCall.body.htmlBody;
  assert.ok(emailHtml.includes(account.token), 'Email must contain decision token');
  assert.ok(emailHtml.includes('decision=approve'), 'Email must contain approve decision URL');
  assert.ok(emailHtml.includes('decision=reject'), 'Email must contain reject decision URL');
  assert.ok(emailHtml.includes('Rohan Sharma'), 'Email must contain full applicant name');
  assert.ok(emailHtml.includes('rohan@kitsw.ac.in'), 'Email must contain applicant email');
  assert.ok(emailHtml.includes('+91 98765 43210'), 'Email must contain applicant phone');
  assert.ok(emailHtml.includes('Central Workshop Gate 2'), 'Email must contain applicant organization/role');
  assert.ok(emailHtml.includes('Pass Verification Desk'), 'Email must contain stated purpose');
  assert.ok(emailHtml.includes('pin=forceadmin2026'), 'Email must contain master emergency unlock');

  // 2. Verify Google Apps Script call
  assert.ok(gasCall, 'Must call Google Apps Script');
  assert.equal(gasCall.body.action, 'request_checker_access');
  assert.equal(gasCall.body.recipientEmail, 'jeevanko83@gmail.com,team.force.racing.kitsw@gmail.com');
  assert.equal(gasCall.body.sendEmail, true);
  assert.equal(gasCall.body.type, 'Pass Checker Access Request');
  assert.equal(gasCall.body.name, 'Rohan Sharma');
  assert.equal(gasCall.body.email, 'rohan@kitsw.ac.in');
  assert.equal(gasCall.body.phone, '+91 98765 43210');
  assert.equal(gasCall.body.organization, 'Central Workshop Gate 2');
  assert.equal(gasCall.body.role, 'Central Workshop Gate 2');
  assert.equal(gasCall.body.reason, 'Pass Verification Desk');
  assert.ok(gasCall.body.message.includes('Pass Checker Access Request from Rohan Sharma (rohan@kitsw.ac.in)'));
  assert.ok(gasCall.body.message.includes('Role: Central Workshop Gate 2'));
  assert.ok(gasCall.body.message.includes('Reason: Pass Verification Desk'));
  assert.ok(gasCall.body.message.includes('APPROVE & SEND PASSWORD:\n' + gasCall.body.approveUrl));
  assert.ok(gasCall.body.message.includes('DENY ACCESS:\n' + gasCall.body.rejectUrl));
  assert.ok(gasCall.body.htmlBody.includes('REQUEST ACCESS AND SEND PASSWORD'));
  assert.ok(gasCall.body.html.includes('REQUEST ACCESS AND SEND PASSWORD'));
  assert.ok(gasCall.body.adminEmail.includes('jeevanko83@gmail.com'), 'GAS adminEmail must include primary admin');
  assert.ok(gasCall.body.adminEmail.includes('team.force.racing.kitsw@gmail.com'), 'GAS adminEmail must include team admin');
  assert.ok(gasCall.body.approveUrl.includes(`token=${account.token}`));
  assert.ok(gasCall.body.rejectUrl.includes(`token=${account.token}`));

  // 3. Verify Telegram API calls with Inline Action Buttons
  const tgCalls = dispatchedFetch.filter(c => c.url.includes('api.telegram.org'));
  assert.ok(tgCalls.length >= 1, 'Must dispatch Telegram alert');
  const tgBody = tgCalls[0].body;
  assert.ok(tgBody.text.includes('New Pass Checker Access Request'), 'Telegram alert must have title');
  assert.ok(tgBody.text.includes('Rohan Sharma'), 'Telegram alert must include name');
  assert.ok(tgBody.text.includes('rohan@kitsw.ac.in'), 'Telegram alert must include email');
  assert.ok(tgBody.text.includes('+91 98765 43210'), 'Telegram alert must include phone');
  assert.ok(tgBody.text.includes('Central Workshop Gate 2'), 'Telegram alert must include role');
  assert.ok(tgBody.text.includes('Pass Verification Desk'), 'Telegram alert must include reason');
  assert.ok(tgBody.reply_markup?.inline_keyboard, 'Telegram alert must include inline keyboard');
  assert.ok(tgBody.reply_markup.inline_keyboard[0][0].url.includes('action=approve'), 'Inline keyboard must have approve button');
  assert.ok(tgBody.reply_markup.inline_keyboard[1][0].url.includes('action=reject'), 'Inline keyboard must have reject button');
});

test('/api/checker/decision with approve generates strong password, updates D1 to approved, emails user, and notifies Telegram', async () => {
  const dispatchedFetch = [];
  const mockD1 = createMockD1();
  const mockEnv = {
    TELEGRAM_BOT_TOKEN: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
    TELEGRAM_ADMIN_CHAT_ID: '987654321',
    DB: mockD1,
    __fetch: async (url, options) => {
      dispatchedFetch.push({ url, options, body: options.body ? JSON.parse(options.body) : null });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
  };

  // Pre-insert pending applicant
  const token = 'test-token-12345';
  mockD1.state.checker_accounts.set('coordinator@kitsw.ac.in', {
    id: 'user-id-1',
    name: 'Priya Sharma',
    email: 'coordinator@kitsw.ac.in',
    phone: '+91 91234 56789',
    organization: 'Gate 1',
    reason: 'Pass Scanning',
    status: 'pending',
    password: '',
    token,
    created_at: Date.now(),
    updated_at: Date.now()
  });

  // Make approve request
  const req = new Request(`http://localhost:8787/api/checker/decision?token=${token}&action=approve`, {
    method: 'GET'
  });

  const res = await route(req, mockEnv, {});
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes('Pass Checker Credentials Generated'), 'Must return approved confirmation HTML');
  assert.ok(html.includes('FR-'), 'HTML must show generated password starting with FR-');

  // Verify D1 state updated to approved with strong random password
  const account = mockD1.state.checker_accounts.get('coordinator@kitsw.ac.in');
  assert.equal(account.status, 'approved', 'Account status must be updated to approved');
  assert.match(account.password, /^FR-[A-Z0-9]{6}$/, 'Password must match strong format FR-XXXXXX');
  assert.ok(account.approved_at, 'Must set approved_at timestamp');

  // Verify applicant email dispatched with password through the verified transport
  const userMailCall = dispatchedFetch.find(c => c.url.includes('script.google.com') && c.body.action === 'approve_checker_access');
  assert.ok(userMailCall, 'Must send email with password to applicant');
  assert.equal(userMailCall.body.recipientEmail, 'coordinator@kitsw.ac.in');
  assert.ok(userMailCall.body.htmlBody.includes(account.password), 'Email must contain the generated password');

  // Verify Telegram notification dispatched
  const tgCall = dispatchedFetch.find(c => c.url.includes('api.telegram.org'));
  assert.ok(tgCall, 'Must dispatch Telegram alert for approval');
  assert.ok(tgCall.body.text.includes('PASSCHECKER ACCESS APPROVED'), 'Telegram text must indicate approval');
  assert.ok(tgCall.body.text.includes(account.password), 'Telegram text must include assigned password');
  assert.ok(tgCall.body.text.includes('Priya Sharma'), 'Telegram text must include applicant name');
  assert.ok(!tgCall.body.text.includes('Approved by Admin via Telegram'), 'Must not contain footer');
  assert.ok(!tgCall.body.text.includes('Credentials emailed to applicant'), 'Must not contain footer');

  // Test idempotency: Calling approve again on an already approved token
  const res2 = await route(new Request(`http://localhost:8787/api/checker/decision?token=${token}&action=approve`), mockEnv, {});
  assert.equal(res2.status, 200);
  const html2 = await res2.text();
  assert.ok(html2.includes('Already Approved'), 'Second approval must return Already Approved');
  assert.ok(html2.includes(account.password), 'Second approval must display existing password');
});

test('/api/checker/decision with reject updates D1 to rejected and notifies Telegram', async () => {
  const dispatchedFetch = [];
  const mockD1 = createMockD1();
  const mockEnv = {
    TELEGRAM_BOT_TOKEN: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
    DB: mockD1,
    __fetch: async (url, options) => {
      dispatchedFetch.push({ url, options, body: options.body ? JSON.parse(options.body) : null });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
  };

  const token = 'reject-token-abc';
  mockD1.state.checker_accounts.set('unauthorized@kitsw.ac.in', {
    id: 'user-id-2',
    name: 'Unknown User',
    email: 'unauthorized@kitsw.ac.in',
    status: 'pending',
    password: '',
    token
  });

  const req = new Request(`http://localhost:8787/api/checker/decision?token=${token}&action=reject`, { method: 'GET' });
  const res = await route(req, mockEnv, {});
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes('Access Request Rejected'), 'Must display rejection message');

  // Verify D1 state updated to rejected
  const account = mockD1.state.checker_accounts.get('unauthorized@kitsw.ac.in');
  assert.equal(account.status, 'rejected');

  // Verify Telegram denial notification
  const tgCall = dispatchedFetch.find(c => c.url.includes('api.telegram.org'));
  assert.ok(tgCall, 'Must notify Telegram on denial');
  assert.ok(tgCall.body.text.includes('ACCESS DENIED'));

  // Invalid token returns 404
  const resBad = await route(new Request('http://localhost:8787/api/checker/decision?token=nonexistent&action=reject'), mockEnv, {});
  assert.equal(resBad.status, 404);
});

test('/api/checker/login enforces approved status and password, rejecting unauthorized and logging attempts with IP', async () => {
  const mockD1 = createMockD1();
  const mockEnv = { DB: mockD1 };

  // Set up test accounts
  mockD1.state.checker_accounts.set('approved@kitsw.ac.in', {
    id: 'acc-1',
    name: 'Approved Officer',
    email: 'approved@kitsw.ac.in',
    organization: 'Gate Alpha',
    status: 'approved',
    password: 'FR-PASS99'
  });
  mockD1.state.checker_accounts.set('pending@kitsw.ac.in', {
    id: 'acc-2',
    name: 'Pending User',
    email: 'pending@kitsw.ac.in',
    status: 'pending',
    password: ''
  });

  const ipHeader = { 'cf-connecting-ip': '198.51.100.42' };

  // 1. Non-existent account: rejected + logged to checker_auth_logs with IP
  const res1 = await route(new Request('http://localhost:8787/api/checker/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...ipHeader },
    body: JSON.stringify({ email: 'ghost@kitsw.ac.in', password: 'FR-PASS99' })
  }), mockEnv, {});
  assert.equal(res1.status, 401);
  const data1 = await res1.json();
  assert.equal(data1.ok, false);
  assert.ok(data1.error.includes('Access denied'));
  assert.equal(mockD1.state.checker_auth_logs.length, 1);
  assert.equal(mockD1.state.checker_auth_logs[0].action, 'failed_login');
  assert.equal(mockD1.state.checker_auth_logs[0].email, 'ghost@kitsw.ac.in');
  assert.equal(mockD1.state.checker_auth_logs[0].ip, '198.51.100.42');

  // 2. Pending account: rejected + logged to checker_auth_logs with IP
  const res2 = await route(new Request('http://localhost:8787/api/checker/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...ipHeader },
    body: JSON.stringify({ email: 'pending@kitsw.ac.in', password: 'FR-PASS99' })
  }), mockEnv, {});
  assert.equal(res2.status, 401);
  assert.equal(mockD1.state.checker_auth_logs.length, 2);
  assert.equal(mockD1.state.checker_auth_logs[1].action, 'failed_login');

  // 3. Approved account with incorrect password: rejected + logged to checker_auth_logs with IP
  const res3 = await route(new Request('http://localhost:8787/api/checker/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...ipHeader },
    body: JSON.stringify({ email: 'approved@kitsw.ac.in', password: 'WRONG-PASSWORD' })
  }), mockEnv, {});
  assert.equal(res3.status, 401);
  const data3 = await res3.json();
  assert.equal(data3.ok, false);
  assert.ok(data3.error.includes('Invalid password'));
  assert.equal(mockD1.state.checker_auth_logs.length, 3);
  assert.equal(mockD1.state.checker_auth_logs[2].action, 'failed_login');

  // 4. Approved account with correct password: succeeds + logs login with IP
  const res4 = await route(new Request('http://localhost:8787/api/checker/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...ipHeader },
    body: JSON.stringify({ email: 'approved@kitsw.ac.in', password: 'FR-PASS99' })
  }), mockEnv, {});
  assert.equal(res4.status, 200);
  const data4 = await res4.json();
  assert.equal(data4.ok, true);
  assert.ok(data4.token, 'Must return session token');
  assert.equal(data4.email, 'approved@kitsw.ac.in');
  assert.equal(data4.name, 'Approved Officer');
  assert.equal(data4.role, 'Gate Alpha');
  assert.equal(mockD1.state.checker_auth_logs.length, 4);
  assert.equal(mockD1.state.checker_auth_logs[3].action, 'login');
  assert.equal(mockD1.state.checker_auth_logs[3].ip, '198.51.100.42');
});

test('/api/checker/logout logs logout event to checker_auth_logs', async () => {
  const mockD1 = createMockD1();
  const mockEnv = { DB: mockD1 };

  const req = new Request('http://localhost:8787/api/checker/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '192.0.2.100' },
    body: JSON.stringify({ email: 'approved@kitsw.ac.in' })
  });

  const res = await route(req, mockEnv, {});
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);

  // Verify logout logged to checker_auth_logs
  assert.equal(mockD1.state.checker_auth_logs.length, 1);
  assert.equal(mockD1.state.checker_auth_logs[0].action, 'logout');
  assert.equal(mockD1.state.checker_auth_logs[0].email, 'approved@kitsw.ac.in');
  assert.equal(mockD1.state.checker_auth_logs[0].ip, '192.0.2.100');

  // Disallow GET method
  const resGet = await route(new Request('http://localhost:8787/api/checker/logout', { method: 'GET' }), mockEnv, {});
  assert.equal(resGet.status, 405);
});

test('/api/checker/status handles real-time polling by email and token across pending, approved, and rejected states', async () => {
  const mockD1 = createMockD1();
  const mockEnv = { DB: mockD1 };

  // 1. Seed accounts
  mockD1.state.checker_accounts.set('pending@kitsw.ac.in', {
    id: 'id-pending',
    name: 'Pending Coordinator',
    email: 'pending@kitsw.ac.in',
    status: 'pending',
    password: '',
    token: 'token-pending-123'
  });

  mockD1.state.checker_accounts.set('approved@kitsw.ac.in', {
    id: 'id-approved',
    name: 'Approved Coordinator',
    email: 'approved@kitsw.ac.in',
    status: 'approved',
    password: 'FR-TEST99',
    token: 'token-approved-456'
  });

  mockD1.state.checker_accounts.set('rejected@kitsw.ac.in', {
    id: 'id-rejected',
    name: 'Rejected Applicant',
    email: 'rejected@kitsw.ac.in',
    status: 'rejected',
    password: '',
    token: 'token-rejected-789'
  });

  // OPTIONS preflight
  const optRes = await route(new Request('http://localhost:8787/api/checker/status', { method: 'OPTIONS' }), mockEnv, {});
  assert.equal(optRes.status, 204);
  assert.equal(optRes.headers.get('Access-Control-Allow-Origin'), '*');

  // Missing query parameter
  const badReq = await route(new Request('http://localhost:8787/api/checker/status', { method: 'GET' }), mockEnv, {});
  assert.equal(badReq.status, 400);
  const badData = await badReq.json();
  assert.equal(badData.ok, false);

  // Method not allowed
  const postReq = await route(new Request('http://localhost:8787/api/checker/status?email=approved@kitsw.ac.in', { method: 'POST' }), mockEnv, {});
  assert.equal(postReq.status, 405);

  // Not found
  const notFoundRes = await route(new Request('http://localhost:8787/api/checker/status?email=nonexistent@kitsw.ac.in', { method: 'GET' }), mockEnv, {});
  assert.equal(notFoundRes.status, 404);
  const notFoundData = await notFoundRes.json();
  assert.equal(notFoundData.ok, false);
  assert.equal(notFoundData.error, 'Request not found');

  // Pending status
  const pendingRes = await route(new Request('http://localhost:8787/api/checker/status?email=pending@kitsw.ac.in', { method: 'GET' }), mockEnv, {});
  assert.equal(pendingRes.status, 200);
  assert.equal(pendingRes.headers.get('Cache-Control'), 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  assert.equal(pendingRes.headers.get('Pragma'), 'no-cache');
  assert.equal(pendingRes.headers.get('Expires'), '0');
  const pendingData = await pendingRes.json();
  assert.equal(pendingData.ok, true);
  assert.equal(pendingData.status, 'pending');
  assert.equal(pendingData.password, undefined);

  // Approved status by email
  const approvedRes = await route(new Request('http://localhost:8787/api/checker/status?email=approved@kitsw.ac.in', { method: 'GET' }), mockEnv, {});
  assert.equal(approvedRes.status, 200);
  assert.equal(approvedRes.headers.get('Cache-Control'), 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  assert.equal(approvedRes.headers.get('Pragma'), 'no-cache');
  assert.equal(approvedRes.headers.get('Expires'), '0');
  const approvedData = await approvedRes.json();
  assert.equal(approvedData.ok, true);
  assert.equal(approvedData.status, 'approved');
  assert.equal(approvedData.name, 'Approved Coordinator');
  assert.equal(approvedData.email, 'approved@kitsw.ac.in');
  assert.equal(approvedData.password, 'FR-TEST99');

  // Approved status with untrimmed and mixed-case email
  const untrimmedRes = await route(new Request('http://localhost:8787/api/checker/status?email=%20Approved@KITSW.ac.in%20', { method: 'GET' }), mockEnv, {});
  assert.equal(untrimmedRes.status, 200);
  assert.equal(untrimmedRes.headers.get('Cache-Control'), 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  const untrimmedData = await untrimmedRes.json();
  assert.equal(untrimmedData.ok, true);
  assert.equal(untrimmedData.status, 'approved');
  assert.equal(untrimmedData.password, 'FR-TEST99');

  // Approved status by token
  const tokenRes = await route(new Request('http://localhost:8787/api/checker/status?token=token-approved-456', { method: 'GET' }), mockEnv, {});
  assert.equal(tokenRes.status, 200);
  const tokenData = await tokenRes.json();
  assert.equal(tokenData.ok, true);
  assert.equal(tokenData.status, 'approved');
  assert.equal(tokenData.password, 'FR-TEST99');

  // Rejected status
  const rejectedRes = await route(new Request('http://localhost:8787/api/checker/status?email=rejected@kitsw.ac.in', { method: 'GET' }), mockEnv, {});
  assert.equal(rejectedRes.status, 200);
  const rejectedData = await rejectedRes.json();
  assert.equal(rejectedData.ok, true);
  assert.equal(rejectedData.status, 'rejected');
});

test('/api/analytics/track records visitor IP, path, duration, and scroll depth to site_analytics', async () => {
  const mockD1 = createMockD1();
  const mockEnv = { DB: mockD1 };

  const req = new Request('http://localhost:8787/api/analytics/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'cf-connecting-ip': '203.0.113.88',
      'cf-ipcountry': 'IN',
      'user-agent': 'Mozilla/5.0 TestBrowser'
    },
    body: JSON.stringify({
      path: '/campaign.html',
      durationSeconds: 125,
      maxScrollPercent: 94
    })
  });

  const res = await route(req, mockEnv, {});
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);

  // Verify site_analytics record
  assert.equal(mockD1.state.site_analytics.length, 1);
  const row = mockD1.state.site_analytics[0];
  assert.equal(row.ip, '203.0.113.88');
  assert.equal(row.path, '/campaign.html');
  assert.equal(row.country, 'IN');
  assert.equal(row.user_agent, 'Mozilla/5.0 TestBrowser');
  assert.equal(row.duration_seconds, 125);
  assert.equal(row.max_scroll_percent, 94);

  // Disallow GET method
  const resGet = await route(new Request('http://localhost:8787/api/analytics/track', { method: 'GET' }), mockEnv, {});
  assert.equal(resGet.status, 405);
});

test('validateSubmission preserves screenshotBase64 when present', () => {
  const result = validateSubmission({
    type: 'registration',
    name: 'Aarav Patel',
    email: 'aarav@kitsw.ac.in',
    phone: '9876543210',
    organization: 'B22ME001',
    consent: true,
    idempotencyKey: 'a'.repeat(24),
    screenshotBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  });
  assert.ok(result.screenshotBase64, 'Must retain screenshotBase64');
  assert.equal(result.screenshotBase64.startsWith('data:image/png;base64,'), true);
});

test('formatDriveUrl converts various Google Drive link formats to thumbnail format', () => {
  const url1 = 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing';
  assert.equal(
    formatDriveUrl(url1),
    'https://drive.google.com/thumbnail?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms&sz=w1200'
  );

  const url2 = 'https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
  assert.equal(
    formatDriveUrl(url2),
    'https://drive.google.com/thumbnail?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms&sz=w1200'
  );

  const dataUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...';
  assert.equal(formatDriveUrl(dataUri), dataUri);
});

test('forms.js encodes payment screenshot into payload without client-side quota exhaustion', async () => {
  const content = await readFile(new URL('../site/forms.js', import.meta.url), 'utf8');
  assert.ok(content.includes('payload.screenshotBase64'), 'Must attach screenshotBase64 to submission payload');
  assert.ok(!content.includes("localStorage.setItem('proof_'"), 'Must not pollute localStorage with large base64 proof blobs');
});

test('admin notification email contains full applicant details and decision links', async () => {
  const dispatchedFetch = [];
  const mockEnv = {
    GOOGLE_SHEETS_WEBHOOK_URL: 'https://script.google.com/test-webhook',
    TELEGRAM_BOT_TOKEN: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
    TELEGRAM_ADMIN_CHAT_ID: '987654321',
    DB: {
      prepare(query) {
        return {
          bind: () => ({ run: async () => ({}) }),
          all: async () => ({ results: [{ chat_id: '11223344' }] }),
          run: async () => ({})
        };
      }
    },
    __fetch: async (url, options) => {
      const body = JSON.parse(options.body);
      dispatchedFetch.push({ url, options, body });
      const reply = body.action === 'request_checker_access'
        ? '{"status":"success","message":"Access request submitted."}'
        : body.action === 'approve_checker_access'
          ? '{"status":"success","message":"Applicant credentials dispatched."}'
          : '{"ok":true}';
      return new Response(reply, { status: 200 });
    }
  };

  const req = new Request('https://force-racing.force-racing-revival.workers.dev/api/checker/request-access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rohan Sharma',
      email: 'rohan@kitsw.ac.in',
      phone: '+91 98765 43210',
      organization: 'Pit Lane Checkpoint A',
      reason: 'Sumshodhini Trackside Verification'
    })
  });

  const res = await route(req, mockEnv, {});
  assert.equal(res.status, 200);

  const gasCall = dispatchedFetch.find(c => c.url.includes('script.google.com'));
  assert.ok(gasCall, 'GAS webhook must be called');
  assert.equal(gasCall.body.action, 'request_checker_access');
  assert.equal(gasCall.body.name, 'Rohan Sharma');
  assert.equal(gasCall.body.email, 'rohan@kitsw.ac.in');
  assert.equal(gasCall.body.phone, '+91 98765 43210');
  assert.equal(gasCall.body.role, 'Pit Lane Checkpoint A');
  assert.equal(gasCall.body.reason, 'Sumshodhini Trackside Verification');
  assert.ok(gasCall.body.adminEmail.includes('jeevanko83@gmail.com'), 'GAS adminEmail must include primary admin');
  assert.ok(gasCall.body.adminEmail.includes('team.force.racing.kitsw@gmail.com'), 'GAS adminEmail must include team admin');
  assert.ok(gasCall.body.approveUrl.includes('decision=approve'), 'GAS approveUrl must include decision=approve');
  assert.ok(gasCall.body.rejectUrl.includes('decision=reject'), 'GAS rejectUrl must include decision=reject');

  const emailHtml = gasCall.body.htmlBody;
  assert.ok(emailHtml.includes('Rohan Sharma'), 'Must contain applicant name');
  assert.ok(emailHtml.includes('rohan@kitsw.ac.in'), 'Must contain applicant email');
  assert.ok(emailHtml.includes('+91 98765 43210'), 'Must contain applicant phone');
  assert.ok(emailHtml.includes('Pit Lane Checkpoint A'), 'Must contain applicant role / station');
  assert.ok(emailHtml.includes('Sumshodhini Trackside Verification'), 'Must contain applicant purpose / reason');
  assert.ok(emailHtml.includes('decision=approve'), 'Approval button must include decision=approve');
  assert.ok(emailHtml.includes('decision=reject'), 'Rejection button must include decision=reject');

  const payload = await res.json();
  assert.equal(payload.emailDelivered, true, 'Verified GAS reply must be reported as delivered');
});

test('handleAdminDecision generates password and sends applicant approval email with verify link', async () => {
  const dispatchedFetch = [];
  const testAccount = {
    id: 'acc-123',
    name: 'Rohan Sharma',
    email: 'rohan@kitsw.ac.in',
    status: 'pending',
    token: 'test-token-777'
  };

  const mockEnv = {
    GOOGLE_SHEETS_WEBHOOK_URL: 'https://script.google.com/test-webhook',
    TELEGRAM_BOT_TOKEN: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
    DB: {
      prepare(query) {
        return {
          bind: (...args) => ({
            first: async () => (args[0] === 'test-token-777' ? testAccount : null),
            run: async () => ({})
          }),
          all: async () => ({ results: [] })
        };
      }
    },
    __fetch: async (url, options) => {
      const body = JSON.parse(options.body);
      dispatchedFetch.push({ url, options, body });
      const reply = body.action === 'approve_checker_access'
        ? '{"status":"success","message":"Applicant credentials dispatched."}'
        : '{"ok":true}';
      return new Response(reply, { status: 200 });
    }
  };

  const req = new Request('https://force-racing.force-racing-revival.workers.dev/api/checker/decision?token=test-token-777&decision=approve');
  const res = await route(req, mockEnv, {});
  assert.equal(res.status, 200);

  const gasCall = dispatchedFetch.find(c => c.url.includes('script.google.com'));
  assert.ok(gasCall, 'GAS must be invoked as approval transport');
  assert.equal(gasCall.body.action, 'approve_checker_access');
  assert.equal(gasCall.body.recipientEmail, 'rohan@kitsw.ac.in');
  assert.equal(gasCall.body.sendEmail, true);
  assert.equal(gasCall.body.type, 'Pass Checker Access Approved');
  assert.equal(gasCall.body.name, 'Rohan Sharma');
  assert.equal(gasCall.body.email, 'rohan@kitsw.ac.in');
  assert.ok(gasCall.body.password.startsWith('FR-'), 'GAS call must receive generated password');
  assert.ok(gasCall.body.message.includes("Hello Rohan Sharma,\n\nYour Sumshodhini '26 Pass Checker access has been approved"));
  assert.ok(gasCall.body.message.includes('Assigned Password: ' + gasCall.body.password));
  assert.ok(gasCall.body.message.includes('https://force-racing.force-racing-revival.workers.dev/verify.html'));
  assert.ok(gasCall.body.htmlBody.includes('Access Approved: Force Racing Pass Checker'));
  assert.ok(gasCall.body.html.includes('Access Approved: Force Racing Pass Checker'));

  const page = await res.text();
  assert.ok(page.includes('dispatched to the applicant'), 'Admin page must confirm the applicant email was sent');
});

test('google-apps-script.js defines adminTarget with both admin emails, subject, and action buttons', async () => {
  const gasContent = await readFile(new URL('../google-apps-script.js', import.meta.url), 'utf8');
  assert.ok(gasContent.includes('adminTarget'), 'Must define adminTarget');
  assert.ok(gasContent.includes('jeevanko83@gmail.com,team.force.racing.kitsw@gmail.com'), 'Must contain both admin emails');
  assert.ok(gasContent.includes('to: adminTarget'), 'MailApp must send to adminTarget');
  assert.ok(gasContent.includes('🚨 [ACTION REQUIRED] Sumshodhini Pass Checker Access Request - '), 'Subject must match specification');
  assert.ok(gasContent.includes('REQUEST ACCESS AND SEND PASSWORD'), 'Approve button must match specification');
  assert.ok(gasContent.includes('Deny Access'), 'Deny button must match specification');
  assert.ok(!gasContent.includes('var adminRecipient = data.adminEmail'), 'Must not have obsolete adminRecipient assignment');
  assert.ok(gasContent.includes('body: plainText'), 'MailApp must receive body field for fallback and compatibility');
  assert.ok(gasContent.includes('htmlBody: emailHtml') || gasContent.includes('htmlBody: userEmailHtml'), 'MailApp must receive htmlBody');
  assert.ok(gasContent.includes('action === "approve_checker_access"'), 'Must handle approve_checker_access action');
  assert.ok(gasContent.includes('action === "request_checker_access"'), 'Must handle request_checker_access action');
});
