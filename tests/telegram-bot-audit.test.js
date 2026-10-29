import test from 'node:test';
import assert from 'node:assert/strict';
import { send, editMessage, answerCallback, notificationText, chunks, buildSettingsCard, webhook } from '../worker/telegram.js';
import { requestCheckerAccess, approveCheckerAccount, rejectCheckerAccount, escapeHtml } from '../worker/checker-auth.js';

test('1. Registration submission Telegram notification formatting', () => {
  // Test basic registration submission
  const sub1 = {
    reference: 'FR26-SIM-83733F88',
    type: 'registration',
    source: 'website',
    submitted_at: '2026-10-28T18:00:00Z',
    name: 'Tejaswi Rao',
    email: 'tejaswi@kitsw.ac.in',
    phone: '+91 9876543210',
    organization: 'KITSW Dept of ME',
    message: ''
  };
  const text1 = notificationText(sub1);
  assert.ok(text1.includes('Force Racing • FR26-SIM-83733F88'), 'Must include reference');
  assert.ok(text1.includes('Type: registration'), 'Must include submission type');
  assert.ok(text1.includes('Name: Tejaswi Rao'), 'Must include applicant name');
  assert.ok(text1.includes('Email: tejaswi@kitsw.ac.in'), 'Must include email');
  assert.ok(text1.includes('Phone: +91 9876543210'), 'Must include phone');
  assert.ok(text1.includes('Organisation: KITSW Dept of ME'), 'Must include organisation');
  assert.ok(text1.includes('team confirmation'), 'Must include disclaimer');
  assert.ok(!text1.includes('Message:'), 'Empty message field must be omitted');

  // Test registration submission with tier & payment screenshot
  const sub2 = {
    reference: 'FR26-SIM-PAY12345',
    type: 'registration',
    source: 'website',
    submitted_at: '2026-10-28T18:30:00Z',
    name: 'Rahul Varma',
    email: 'rahul@kitsw.ac.in',
    phone: '9123456780',
    organization: 'B22CS042',
    answers_json: JSON.stringify({
      tier: 'Solo Time Attack',
      screenshotBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
      utrNumber: 'UTR-987654321'
    })
  };
  const text2 = notificationText(sub2);
  assert.ok(text2.includes('FR26-SIM-PAY12345'), 'Must include reference');
  assert.ok(text2.includes('Tier / Event: Solo Time Attack'), 'Must include tier');
  assert.ok(text2.includes('Payment Screenshot: Attached'), 'Must include payment screenshot indicator');
  assert.ok(text2.includes('utrNumber: UTR-987654321'), 'Must include extra fields');
  assert.ok(!text2.includes('data:image/jpeg;base64'), 'Base64 data must not be leaked into notification text');

  // Test chunks chunking for large messages
  const longText = 'Line ' + 'x'.repeat(100) + '\n';
  const bigSubmission = longText.repeat(50); // ~5000 chars
  const splitParts = chunks(bigSubmission);
  assert.ok(splitParts.length >= 2, 'Must split text exceeding 3500 characters');
  assert.ok(splitParts.every(p => p.length <= 3500), 'All parts must be <= 3500 characters');
});

test('2. Checker access request Telegram notification formatting and inline buttons', async () => {
  const dispatchedRequests = [];
  const mockEnv = {
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
      dispatchedRequests.push({ url, options, body: options.body ? JSON.parse(options.body) : null });
      return new Response(JSON.stringify({ ok: true, result: { message_id: 101 } }), { status: 200 });
    }
  };

  const req = new Request('http://localhost:8787/api/checker/request-access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Aditi Deshmukh',
      email: 'aditi@kitsw.ac.in',
      phone: '+91 98480 12345',
      organization: 'Security & Paddock Gate 1',
      reason: 'Paddock Pass Inspection'
    })
  });

  const res = await requestCheckerAccess(req, mockEnv, {});
  assert.equal(res.status, 200);

  // Check Telegram dispatch
  const tgCall = dispatchedRequests.find(r => r.url.includes('api.telegram.org/bot'));
  assert.ok(tgCall, 'Must dispatch Telegram alert');
  const payload = tgCall.body;

  // Verify text formatting
  assert.ok(payload.text.includes('New Pass Checker Access Request'), 'Must contain header');
  assert.ok(payload.text.includes('Aditi Deshmukh'), 'Must contain applicant name');
  assert.ok(payload.text.includes('aditi@kitsw.ac.in'), 'Must contain email');
  assert.ok(payload.text.includes('+91 98480 12345'), 'Must contain phone');
  assert.ok(payload.text.includes('Security &amp; Paddock Gate 1'), 'Must properly escape HTML entities in role');
  assert.ok(payload.text.includes('Paddock Pass Inspection'), 'Must contain reason');
  assert.equal(payload.parse_mode, 'HTML', 'Must use HTML parse mode');

  // Verify inline keyboard buttons
  assert.ok(payload.reply_markup?.inline_keyboard, 'Must include inline keyboard');
  const keyboard = payload.reply_markup.inline_keyboard;

  // Confirm "Approve Access" button
  const approveBtn = keyboard[0][0];
  assert.ok(approveBtn.text.includes('Approve Access'), 'Must have Approve Access button');
  assert.ok(approveBtn.url.includes('action=approve'), 'Approve button must contain approve URL');

  // Confirm "Deny Access" button
  const denyBtn = keyboard[1][0];
  assert.ok(denyBtn.text.includes('Deny Access'), 'Must have Deny Access button');
  assert.ok(denyBtn.url.includes('action=reject'), 'Deny button must contain reject URL');

  // Confirm Instant callback_data buttons
  const instantRow = keyboard[2];
  assert.ok(instantRow, 'Must provide instant Telegram callback buttons');
  assert.ok(instantRow[0].text.includes('Approve'), 'Must have instant approve button');
  assert.ok(instantRow[0].callback_data.startsWith('approve_access:'), 'Must have approve_access callback_data');
  assert.ok(instantRow[1].text.includes('Deny'), 'Must have instant deny button');
  assert.ok(instantRow[1].callback_data.startsWith('deny_access:'), 'Must have deny_access callback_data');
});

test('3. send() handles text messages, invalid HTML fallback, and inline buttons without 400 errors', async () => {
  const fetchCalls = [];

  const mockEnv = {
    TELEGRAM_BOT_TOKEN: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
    __fetch: async (url, options) => {
      const body = JSON.parse(options.body);
      fetchCalls.push({ url, body });

      // Simulate Telegram API 400 when text contains unclosed HTML tag in parse_mode: 'HTML'
      if (body.parse_mode === 'HTML' && body.text.includes('<broken_tag>')) {
        return new Response(JSON.stringify({
          ok: false,
          error_code: 400,
          description: "Bad Request: can't parse entities: Unexpected end tag"
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({
        ok: true,
        result: { message_id: 202 }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  };

  // Test 3.1: Clean text message with HTML formatting
  fetchCalls.length = 0;
  const res1 = await send(mockEnv, '12345', '<b>Hello World</b>');
  assert.equal(res1.ok, true);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].body.text, '<b>Hello World</b>');
  assert.equal(fetchCalls[0].body.parse_mode, 'HTML');

  // Test 3.2: Text message with invalid HTML triggers automatic fallback without 400 failure
  fetchCalls.length = 0;
  const res2 = await send(mockEnv, '12345', 'Alert: <broken_tag> unclosed entity');
  assert.equal(res2.ok, true, 'Fallback must succeed cleanly');
  assert.equal(fetchCalls.length, 2, 'Must make initial attempt + 1 fallback attempt');
  assert.equal(fetchCalls[0].body.parse_mode, 'HTML', 'First attempt has HTML parse_mode');
  assert.equal(fetchCalls[1].body.parse_mode, undefined, 'Fallback attempt removes parse_mode');
  assert.equal(fetchCalls[1].body.text, 'Alert: <broken_tag> unclosed entity');

  // Test 3.3: Text message with inline keyboard buttons (callback_data)
  fetchCalls.length = 0;
  const markupWithCallback = {
    inline_keyboard: [
      [
        { text: 'Approve Access', callback_data: 'approve_access:tok-abc-123' },
        { text: 'Deny Access', callback_data: 'deny_access:tok-abc-123' }
      ]
    ]
  };
  const res3 = await send(mockEnv, '12345', 'Checker access request', { reply_markup: markupWithCallback });
  assert.equal(res3.ok, true);
  assert.equal(fetchCalls.length, 1);
  assert.deepEqual(fetchCalls[0].body.reply_markup, markupWithCallback);

  // Test 3.4: Text with invalid HTML AND inline buttons preserves buttons during 400 recovery
  fetchCalls.length = 0;
  const res4 = await send(mockEnv, '12345', '<broken_tag> Button test with bad HTML', { reply_markup: markupWithCallback });
  assert.equal(res4.ok, true, 'Recovery must succeed with buttons preserved');
  assert.equal(fetchCalls.length, 2, 'Initial 400 + retry');
  assert.equal(fetchCalls[1].body.parse_mode, undefined, 'Retry strips parse_mode');
  assert.deepEqual(fetchCalls[1].body.reply_markup, markupWithCallback, 'Retry MUST retain reply_markup');

  // Test 3.5: Explicit parse_mode: "" or null cleanly deletes parse_mode
  fetchCalls.length = 0;
  const res5 = await send(mockEnv, '12345', 'Plain text only', { parse_mode: '' });
  assert.equal(res5.ok, true);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].body.parse_mode, undefined, 'parse_mode must be absent from payload');
});

test('4. Webhook callback query handlers process approve_access and deny_access', async () => {
  const accountDb = new Map();
  accountDb.set('token-test-111', {
    id: 'acc-1',
    name: 'Suresh Kumar',
    email: 'suresh@kitsw.ac.in',
    status: 'pending',
    token: 'token-test-111'
  });

  const dispatchedFetch = [];
  const mockEnv = {
    TELEGRAM_WEBHOOK_SECRET: 'webhook-secret-xyz-123456789012345',
    TELEGRAM_BOT_TOKEN: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
    DB: {
      prepare(query) {
        return {
          bind(...args) {
            return {
              first: async () => {
                if (query.includes('FROM recipients')) {
                  return { status: 'approved' };
                }
                if (query.includes('FROM checker_accounts') && query.includes('WHERE token = ?')) {
                  return accountDb.get(args[0]) || null;
                }
                return null;
              },
              all: async () => ({ results: [] }),
              run: async () => {
                if (query.includes('UPDATE checker_accounts') && query.includes('status = \'approved\'')) {
                  const accId = args[3];
                  const acc = Array.from(accountDb.values()).find(a => a.id === accId) || accountDb.get('token-test-111');
                  if (acc) {
                    acc.status = 'approved';
                    acc.password = args[0];
                  }
                }
                if (query.includes('UPDATE checker_accounts') && query.includes('status = \'rejected\'')) {
                  const accId = args[1];
                  const acc = Array.from(accountDb.values()).find(a => a.id === accId) || accountDb.get('token-test-222');
                  if (acc) acc.status = 'rejected';
                }
                return { success: true };
              }
            };
          }
        };
      }
    },
    __fetch: async (url, options) => {
      dispatchedFetch.push({ url, options, body: options?.body ? JSON.parse(options.body) : null });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
  };

  const pending1 = [];
  const ctx1 = { waitUntil: p => { pending1.push(p); return p; } };

  // Test Approve Access callback query
  const approveUpdate = {
    update_id: 1001,
    callback_query: {
      id: 'cb-query-1',
      from: { id: 987654321 },
      message: { message_id: 55, chat: { id: 987654321 } },
      data: 'approve_access:token-test-111'
    }
  };

  const req1 = new Request('http://localhost:8787/api/telegram/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': 'webhook-secret-xyz-123456789012345'
    },
    body: JSON.stringify(approveUpdate)
  });

  const res1 = await webhook(req1, mockEnv, ctx1);
  assert.equal(res1.status, 200);
  await Promise.all(pending1);

  const updatedAccount = accountDb.get('token-test-111');
  assert.equal(updatedAccount.status, 'approved', 'Must update account to approved');
  assert.ok(updatedAccount.password.startsWith('FR-'), 'Must assign FR- password');

  // Verify Telegram editMessageText payload formatting for Approval
  const editApprove = dispatchedFetch.find(c => c.url.includes('/editMessageText') && c.body?.message_id === 55);
  assert.ok(editApprove, 'Must call editMessageText for approval');
  assert.ok(editApprove.body.text.includes('✅ <b>PASSCHECKER ACCESS APPROVED</b> 🏁'), 'Header must be PASSCHECKER ACCESS APPROVED');
  assert.ok(editApprove.body.text.includes('👤 <b>User:</b> Suresh Kumar'), 'Must contain user name');
  assert.ok(editApprove.body.text.includes('📧 <b>Email:</b> <code>suresh@kitsw.ac.in</code>'), 'Must contain formatted email');
  assert.ok(editApprove.body.text.includes(`🔑 <b>Assigned Password:</b> <code>${updatedAccount.password}</code>`), 'Must contain assigned password');
  assert.equal(editApprove.body.text.includes('Approved by Admin via Telegram'), false, 'Must not contain Telegram admin approval footer');
  assert.equal(editApprove.body.text.includes('Credentials emailed to applicant'), false, 'Must not contain credentials emailed footer');

  // Verify answerCallbackQuery toast confirmation for approval
  const answerApprove = dispatchedFetch.find(c => c.url.includes('/answerCallbackQuery') && c.body?.callback_query_id === 'cb-query-1');
  assert.ok(answerApprove, 'Must call answerCallbackQuery for approval');
  assert.equal(answerApprove.body.text, `✅ Approved Suresh Kumar! Password: ${updatedAccount.password}`, 'Toast confirmation must match format');

  // Test Deny Access callback query
  accountDb.set('token-test-222', {
    id: 'acc-2',
    name: 'Manoj Reddy',
    email: 'manoj@kitsw.ac.in',
    status: 'pending',
    token: 'token-test-222'
  });

  const pending2 = [];
  const ctx2 = { waitUntil: p => { pending2.push(p); return p; } };

  const denyUpdate = {
    update_id: 1002,
    callback_query: {
      id: 'cb-query-2',
      from: { id: 987654321 },
      message: { message_id: 56, chat: { id: 987654321 } },
      data: 'deny_access:token-test-222'
    }
  };

  const req2 = new Request('http://localhost:8787/api/telegram/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': 'webhook-secret-xyz-123456789012345'
    },
    body: JSON.stringify(denyUpdate)
  });

  const res2 = await webhook(req2, mockEnv, ctx2);
  assert.equal(res2.status, 200);
  await Promise.all(pending2);

  // Verify Telegram editMessageText payload formatting for Denial
  const editDeny = dispatchedFetch.find(c => c.url.includes('/editMessageText') && c.body?.message_id === 56);
  assert.ok(editDeny, 'Must call editMessageText for denial');
  assert.ok(editDeny.body.text.includes('❌ <b>PASSCHECKER ACCESS DENIED</b>'), 'Header must be PASSCHECKER ACCESS DENIED');
  assert.ok(editDeny.body.text.includes('👤 <b>User:</b> Manoj Reddy'), 'Must contain user name');
  assert.ok(editDeny.body.text.includes('📧 <b>Email:</b> <code>manoj@kitsw.ac.in</code>'), 'Must contain user email');
  assert.equal(editDeny.body.text.includes('Approved by Admin via Telegram'), false, 'Must not contain Telegram admin approval footer');

  // Test Approve Checker callback query with approve_checker: prefix
  accountDb.set('token-test-333', {
    id: 'acc-3',
    name: 'Priya Sharma',
    email: 'priya@kitsw.ac.in',
    status: 'pending',
    token: 'token-test-333'
  });

  const pending3 = [];
  const ctx3 = { waitUntil: p => { pending3.push(p); return p; } };

  const approveCheckerUpdate = {
    update_id: 1003,
    callback_query: {
      id: 'cb-query-3',
      from: { id: 987654321 },
      message: { message_id: 57, chat: { id: 987654321 } },
      data: 'approve_checker:token-test-333'
    }
  };

  const req3 = new Request('http://localhost:8787/api/telegram/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': 'webhook-secret-xyz-123456789012345'
    },
    body: JSON.stringify(approveCheckerUpdate)
  });

  const res3 = await webhook(req3, mockEnv, ctx3);
  assert.equal(res3.status, 200);
  await Promise.all(pending3);

  const priyaAccount = accountDb.get('token-test-333');
  assert.equal(priyaAccount.status, 'approved', 'approve_checker must update account to approved');
  assert.ok(priyaAccount.password.startsWith('FR-'), 'approve_checker must assign password');

  const toastChecker = dispatchedFetch.find(c => c.url.includes('/answerCallbackQuery') && c.body?.callback_query_id === 'cb-query-3');
  assert.ok(toastChecker, 'Must call answerCallbackQuery for approve_checker');
  assert.equal(toastChecker.body.text, `✅ Approved Priya Sharma! Password: ${priyaAccount.password}`);

  const editChecker = dispatchedFetch.find(c => c.url.includes('/editMessageText') && c.body?.message_id === 57);
  assert.ok(editChecker, 'Must edit message for approve_checker');
  assert.ok(editChecker.body.text.includes('✅ <b>PASSCHECKER ACCESS APPROVED</b> 🏁'));
  assert.ok(editChecker.body.text.includes('👤 <b>User:</b> Priya Sharma'));
  assert.ok(editChecker.body.text.includes('📧 <b>Email:</b> <code>priya@kitsw.ac.in</code>'));
  assert.ok(editChecker.body.text.includes(`🔑 <b>Assigned Password:</b> <code>${priyaAccount.password}</code>`));

  // Test that missing cb.message doesn't crash or throw exceptions
  const pending4 = [];
  const ctx4 = { waitUntil: p => { pending4.push(p); return p; } };
  const noMessageUpdate = {
    update_id: 1004,
    callback_query: {
      id: 'cb-query-4',
      from: { id: 987654321 },
      data: 'approve_checker:token-test-333' // already approved
    }
  };
  const req4 = new Request('http://localhost:8787/api/telegram/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': 'webhook-secret-xyz-123456789012345'
    },
    body: JSON.stringify(noMessageUpdate)
  });
  const res4 = await webhook(req4, mockEnv, ctx4);
  assert.equal(res4.status, 200);
  await Promise.all(pending4);
});
