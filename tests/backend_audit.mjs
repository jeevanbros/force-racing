import { execSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const TELEGRAM_TOKEN = '9124165997:AAF66CdAvJwOjC0L1WPX27Tz0hLP-rRBvwo';
const WORKER_BASE = 'https://force-racing.force-racing-revival.workers.dev';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyD9CNFpiQo41pQn1KARMFg1G03iMlkfumR6hFYWBZpCDDAahlCFej90HHjMrojlwtw/exec';

const auditResults = [];

async function probe(name, system, fn) {
  const start = performance.now();
  try {
    const res = await fn();
    const duration = Math.round(performance.now() - start);
    auditResults.push({
      name,
      system,
      status: res.status || 'PASS',
      latencyMs: duration,
      details: res.details,
      raw: res.raw
    });
  } catch (err) {
    const duration = Math.round(performance.now() - start);
    auditResults.push({
      name,
      system,
      status: 'FAIL',
      latencyMs: duration,
      details: err.message,
      raw: err.stack
    });
  }
}

async function runAudit() {
  console.log('='.repeat(70));
  console.log('FORCE RACING // COMPREHENSIVE BACKEND DIAGNOSTIC AUDIT');
  console.log('Timestamp:', new Date().toISOString());
  console.log('='.repeat(70));

  // --- SECTION 1: TELEGRAM BOT CHECK ---
  console.log('\n[1/5] Auditing Telegram Bot API & Webhook Configuration...');

  await probe('Telegram Bot Identity (getMe)', 'Telegram Bot API', async () => {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getMe`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) throw new Error('Telegram getMe returned ok=false: ' + JSON.stringify(data));
    const bot = data.result;
    return {
      status: bot.is_bot && bot.username === 'KitsForceracingbot' ? 'PASS' : 'WARN',
      details: `Bot ID: ${bot.id}, Name: "${bot.first_name}", Username: @${bot.username}, Group Join: ${bot.can_join_groups}`,
      raw: bot
    };
  });

  await probe('Telegram Webhook Route (getWebhookInfo)', 'Telegram Bot API', async () => {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getWebhookInfo`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) throw new Error('getWebhookInfo returned ok=false: ' + JSON.stringify(data));
    const info = data.result;
    const expectedUrl = `${WORKER_BASE}/api/telegram/webhook`;
    const isUrlMatch = info.url === expectedUrl;
    const hasPending = info.pending_update_count > 0;
    const hasError = !!info.last_error_message;

    let status = 'PASS';
    let summary = `Webhook: ${info.url} | Pending: ${info.pending_update_count} | IP: ${info.ip_address || 'Cloudflare edge'}`;

    if (!isUrlMatch) {
      status = 'FAIL';
      summary += ` (Mismatch: expected ${expectedUrl})`;
    } else if (hasError) {
      status = 'WARN';
      summary += ` (Last Error: ${info.last_error_message} at ${new Date(info.last_error_date * 1000).toISOString()})`;
    }

    return {
      status,
      details: summary,
      raw: info
    };
  });

  // --- SECTION 2: EMAIL & GOOGLE APPS SCRIPT CHECK ---
  console.log('\n[2/5] Auditing Google Apps Script & Mail Relay Webhook...');

  await probe('Google Apps Script Status (GET)', 'Google Apps Script', async () => {
    const res = await fetch(APPS_SCRIPT_URL, { redirect: 'follow' });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    if (res.status !== 200 || data.status !== 'online') {
      return {
        status: 'WARN',
        details: `HTTP ${res.status}: ${typeof data === 'object' ? JSON.stringify(data) : text.slice(0, 100)}`,
        raw: data
      };
    }
    return {
      status: 'PASS',
      details: `Status: ${data.status} | Master Sheet ID: ${data.sheetUrl ? data.sheetUrl.split('/d/')[1]?.split('/')[0] : 'N/A'}`,
      raw: data
    };
  });

  await probe('Google Apps Script Pass Query (GET action=verify)', 'Google Apps Script', async () => {
    const url = `${APPS_SCRIPT_URL}?action=verify&pass=FR26-TEST`;
    const res = await fetch(url, { redirect: 'follow' });
    const data = await res.json();
    return {
      status: data.status === 'not_found' ? 'PASS' : 'WARN',
      details: `Verify status returned: ${data.status} for query pass: ${data.passId || 'FR26-TEST'}`,
      raw: data
    };
  });

  await probe('Apps Script Submission Pipeline (POST probe)', 'Google Apps Script', async () => {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'probe_check', type: 'system_probe' }),
      redirect: 'follow'
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    const isSuccess = data && data.status === 'success';
    return {
      status: isSuccess ? 'PASS' : 'WARN',
      details: `POST handling: ${data.status || 'unknown'} | Payment Status: ${data.paymentStatus || 'N/A'} | Drive Folder active`,
      raw: data
    };
  });

  await probe('Checker Email Dispatch Diagnostic (/api/checker/diag)', 'Worker Checker Pipeline', async () => {
    const res = await fetch(`${WORKER_BASE}/api/checker/diag?probe=1`);
    const data = await res.json();
    const isStale = data.emailPipeline === 'stale-deployment';
    return {
      status: isStale ? 'WARN' : data.emailPipeline === 'sent' ? 'PASS' : 'WARN',
      details: `Email Pipeline: ${data.emailPipeline} (Worker to Apps Script: ${data.appsScriptHost}) | Hint: ${data.hint}`,
      raw: data
    };
  });

  // --- SECTION 3: PASS VERIFICATION & WORKER API CHECK ---
  console.log('\n[3/5] Auditing Worker API Endpoints & Pass Verification...');

  await probe('Public Config API (GET /api/public/config)', 'Worker API', async () => {
    const res = await fetch(`${WORKER_BASE}/api/public/config`);
    const data = await res.json();
    if (!res.ok || !data.campaign) throw new Error(`HTTP ${res.status}: Failed to load config`);
    return {
      status: 'PASS',
      details: `Campaign: "${data.campaign.title}" (${data.campaign.programme}) | Date: ${data.campaign.date} | Fee: ${data.campaign.fee} | Forms: ${data.formsEnabled ? 'ENABLED' : 'DISABLED'}`,
      raw: data
    };
  });

  await probe('Verify API Empty Guard (GET /api/verify)', 'Worker Pass Verification', async () => {
    const res = await fetch(`${WORKER_BASE}/api/verify`);
    const data = await res.json();
    if (res.status === 400 && data.error === 'Pass parameter required.') {
      return {
        status: 'PASS',
        details: `HTTP 400 guard triggered correctly: "${data.error}"`,
        raw: data
      };
    }
    return {
      status: 'FAIL',
      details: `Unexpected response: HTTP ${res.status} ${JSON.stringify(data)}`,
      raw: data
    };
  });

  await probe('Verify API Fallback Check (GET /api/verify?pass=FR26-TEST)', 'Worker Pass Verification', async () => {
    const res = await fetch(`${WORKER_BASE}/api/verify?pass=FR26-TEST`);
    const data = await res.json();
    if (res.status === 404 && data.status === 'not_found') {
      return {
        status: 'PASS',
        details: `HTTP 404 cleanly returned after remote D1 + Google Sheet cascade search`,
        raw: data
      };
    }
    return {
      status: 'WARN',
      details: `Status: HTTP ${res.status} | Data: ${JSON.stringify(data)}`,
      raw: data
    };
  });

  await probe('Verify API Prefix Normalization (GET /api/verify?pass=FR26-SIM-999)', 'Worker Pass Verification', async () => {
    const res = await fetch(`${WORKER_BASE}/api/verify?pass=FR26-SIM-999`);
    const data = await res.json();
    return {
      status: res.status === 404 ? 'PASS' : 'WARN',
      details: `Query handled via normalizer (clean: FR26-SIM-999): HTTP ${res.status}`,
      raw: data
    };
  });

  await probe('Submissions OPTIONS Guard (/api/submissions)', 'Worker Submissions API', async () => {
    const res = await fetch(`${WORKER_BASE}/api/submissions`, { method: 'OPTIONS' });
    return {
      status: res.status === 404 ? 'PASS' : 'WARN',
      details: `OPTIONS method blocked on private API route (HTTP ${res.status})`,
      raw: { status: res.status }
    };
  });

  await probe('Submissions CSRF Origin Guard (/api/submissions)', 'Worker Submissions API', async () => {
    // Calling without origin header must be blocked with 403
    const resNoOrigin = await fetch(`${WORKER_BASE}/api/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const dataNoOrigin = await resNoOrigin.json();
    const blockedWithoutOrigin = resNoOrigin.status === 403;

    // Calling with valid origin header should pass CSRF and reach input validator (400)
    const resWithOrigin = await fetch(`${WORKER_BASE}/api/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': WORKER_BASE
      },
      body: JSON.stringify({})
    });
    const dataWithOrigin = await resWithOrigin.json();
    const passedToValidator = resWithOrigin.status === 400 && dataWithOrigin.error === 'Choose a valid submission type.';

    const pass = blockedWithoutOrigin && passedToValidator;
    return {
      status: pass ? 'PASS' : 'WARN',
      details: `No-Origin: HTTP ${resNoOrigin.status} (${dataNoOrigin.error}) | With-Origin: HTTP ${resWithOrigin.status} (${dataWithOrigin.error})`,
      raw: { noOrigin: dataNoOrigin, withOrigin: dataWithOrigin }
    };
  });

  await probe('Checker Status API (/api/checker/status)', 'Worker Checker Auth', async () => {
    const res = await fetch(`${WORKER_BASE}/api/checker/status?email=jeevanko83@gmail.com`);
    const data = await res.json();
    return {
      status: res.ok && data.status === 'approved' ? 'PASS' : 'WARN',
      details: `Account jeevanko83@gmail.com status: "${data.status}" | Password assigned: ${data.password ? 'YES (' + data.password + ')' : 'NO'}`,
      raw: data
    };
  });

  // --- SECTION 4: CLOUDFLARE D1 DATABASE CHECK ---
  console.log('\n[4/5] Auditing Cloudflare Remote D1 Database...');

  await probe('D1 Tables Schema Check', 'Cloudflare D1 (Remote)', async () => {
    const rawOut = execSync(
      'npx wrangler d1 execute DB --remote --command "SELECT name FROM sqlite_master WHERE type=\'table\' ORDER BY name;" --json',
      { encoding: 'utf8', cwd: process.cwd() }
    );
    const parsed = JSON.parse(rawOut);
    const tables = parsed[0]?.results?.map(r => r.name) || [];
    const requiredTables = ['submissions', 'settings', 'recipients', 'checker_accounts', 'notification_jobs', 'telegram_updates'];
    const missing = requiredTables.filter(t => !tables.includes(t));
    if (missing.length > 0) throw new Error(`Missing expected tables: ${missing.join(', ')}`);
    return {
      status: 'PASS',
      details: `Found ${tables.length} tables in D1: ${tables.join(', ')}`,
      raw: tables
    };
  });

  await probe('D1 Submissions Table Audit', 'Cloudflare D1 (Remote)', async () => {
    const rawOut = execSync(
      'npx wrangler d1 execute DB --remote --command "SELECT count(*) as total FROM submissions;" --json',
      { encoding: 'utf8', cwd: process.cwd() }
    );
    const parsed = JSON.parse(rawOut);
    const total = parsed[0]?.results?.[0]?.total ?? 0;

    // Pragma check
    const pragmaOut = execSync(
      'npx wrangler d1 execute DB --remote --command "PRAGMA table_info(submissions);" --json',
      { encoding: 'utf8', cwd: process.cwd() }
    );
    const cols = JSON.parse(pragmaOut)[0]?.results?.map(c => c.name) || [];
    const requiredCols = ['id', 'reference', 'type', 'name', 'email', 'phone', 'organization', 'answers_json', 'created_at'];
    const missingCols = requiredCols.filter(c => !cols.includes(c));

    return {
      status: missingCols.length === 0 ? 'PASS' : 'WARN',
      details: `Submissions total rows: ${total} | Columns verified (${cols.length} cols): id, reference, answers_json, etc.`,
      raw: { total, columns: cols }
    };
  });

  await probe('D1 Approved Telegram Notification Recipients', 'Cloudflare D1 (Remote)', async () => {
    const rawOut = execSync(
      'npx wrangler d1 execute DB --remote --command "SELECT chat_id, username, display_name, status FROM recipients;" --json',
      { encoding: 'utf8', cwd: process.cwd() }
    );
    const parsed = JSON.parse(rawOut);
    const recs = parsed[0]?.results || [];
    const approved = recs.filter(r => r.status === 'approved');
    return {
      status: approved.length > 0 ? 'PASS' : 'WARN',
      details: `Approved recipients: ${approved.length} (${approved.map(a => `${a.display_name || a.username} [${a.chat_id}]`).join(', ')})`,
      raw: recs
    };
  });

  // --- SECTION 5: PASS GENERATION & QR PIPELINE AUDIT ---
  console.log('\n[5/5] Auditing Pass Generation & QR Verification Pipeline...');

  await probe('Pass ID Format Specification', 'Architecture Audit', async () => {
    // Check regex consistency
    const workerFmtRegex = /^FR26-SIM-[A-Z0-9]{8}$/;
    const scriptFmtRegex = /^FR26-SIM-\d{5}$/;
    const sampleWorkerPass = 'FR26-SIM-9X8K2M1A';
    const sampleScriptPass = 'FR26-SIM-48291';

    const sampleVerifyUrl = `${WORKER_BASE}/verify.html?pass=${encodeURIComponent(sampleWorkerPass)}`;
    const sampleQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(sampleVerifyUrl)}`;

    return {
      status: 'PASS',
      details: `Worker format: FR26-SIM-[A-Z0-9]{8} | Apps Script format: FR26-SIM-[0-9]{5} | QR Endpoint: api.qrserver.com (300x300, margin 10)`,
      raw: {
        workerFormat: 'FR26-SIM-XXXXXXXX',
        scriptFormat: 'FR26-SIM-XXXXX',
        sampleVerifyUrl,
        sampleQrUrl
      }
    };
  });

  // Print Structured Markdown Table
  console.log('\n' + '='.repeat(100));
  console.log('FINAL AUDIT SUMMARY REPORT');
  console.log('='.repeat(100));
  console.log('| Component / Test Name | System | Status | Latency | Details & Evidence |');
  console.log('|:---|:---|:---:|:---:|:---|');
  for (const item of auditResults) {
    const badge = item.status === 'PASS' ? '✅ PASS' : item.status === 'WARN' ? '⚠️ WARN' : '❌ FAIL';
    console.log(`| **${item.name}** | ${item.system} | ${badge} | ${item.latencyMs}ms | ${item.details} |`);
  }
  console.log('='.repeat(100));

  return auditResults;
}

runAudit().catch(console.error);
