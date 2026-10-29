import { HttpError, json, secure, background } from './core.js';
import { publicConfig } from './settings.js';
import { submit, googleForm } from './submissions.js';
import { webhook, housekeeping } from './telegram.js';
import { adminApi, adminPage } from './admin.js';
import { 
  requestCheckerAccess, 
  handleCheckerStatus,
  handleCheckerDiag,
  handleAdminDecision, 
  handleCheckerLogin, 
  handleCheckerLogout, 
  handleTrackAnalytics 
} from './checker-auth.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400'
};

export function formatDriveUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('data:image/')) return url;
  const matchFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile && matchFile[1]) {
    return `https://drive.google.com/thumbnail?id=${matchFile[1]}&sz=w1200`;
  }
  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) {
    return `https://drive.google.com/thumbnail?id=${matchId[1]}&sz=w1200`;
  }
  return url;
}

export async function route(request, env, ctx) {
  const url = new URL(request.url), path = url.pathname;
  if (path === '/admin' || path.startsWith('/admin/')) return adminPage(request, env);
  if (path.startsWith('/api/admin/')) return adminApi(request, env, ctx);
  if (path === '/api/public/config' && request.method === 'GET') return json(await publicConfig(env, request));
  if (path === '/api/verify') {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== 'GET') {
      return json({ ok: false, error: 'Method not allowed.' }, 405, { ...CORS_HEADERS, Allow: 'GET, OPTIONS' });
    }
    const rawInput = (url.searchParams.get('pass') || '').trim();
    if (!rawInput) return json({ ok: false, error: 'Pass parameter required.' }, 400, CORS_HEADERS);

    // Normalize input: strip leading #, "pass", "id", punctuation, and spaces around dashes
    let clean = rawInput.replace(/^(pass\s*#?|id\s*#?|#)\s*/i, '').replace(/[.,;:!?]+$/, '').trim();
    clean = clean.replace(/\s*-\s*/g, '-');
    const upperClean = clean.toUpperCase();
    const withSimPrefix = upperClean.startsWith('FR26-SIM-') ? upperClean : ('FR26-SIM-' + upperClean);
    const withFrPrefix = upperClean.startsWith('FR-') ? upperClean : ('FR-' + upperClean);
    const phoneDigits = rawInput.replace(/\D/g, '');
    const emailLower = rawInput.toLowerCase();

    let row = null;
    try {
      // Comprehensive match in D1 database:
      // 1. Exact raw reference
      // 2. Cleaned uppercase reference
      // 3. Prepend FR26-SIM-
      // 4. Prepend FR-
      // 5. Partial wildcard match
      // 6. External ID
      // 7. Email address
      // 8. Phone number digits
      row = await env.DB.prepare(`
        SELECT reference AS passId, name, organization, email, phone, answers_json, created_at 
        FROM submissions 
        WHERE UPPER(reference) = ? 
           OR UPPER(reference) = ? 
           OR UPPER(reference) = ? 
           OR UPPER(reference) = ?
           OR UPPER(reference) LIKE ?
           OR UPPER(external_id) = ?
           OR LOWER(email) = ?
           OR (length(?) >= 7 AND replace(replace(replace(replace(phone, ' ', ''), '-', ''), '+', ''), '(', '') LIKE ?)
        ORDER BY created_at DESC LIMIT 1
      `).bind(
        rawInput.toUpperCase(),
        upperClean,
        withSimPrefix,
        withFrPrefix,
        '%' + upperClean + '%',
        upperClean,
        emailLower,
        phoneDigits,
        '%' + (phoneDigits.length >= 10 ? phoneDigits.slice(-10) : phoneDigits) + '%'
      ).first();

      if (row && row.answers_json) {
        try {
          const ans = JSON.parse(row.answers_json);
          Object.assign(row, ans);
          if (ans.screenshotBase64 && !row.screenshotUrl) {
            row.screenshotUrl = ans.screenshotBase64;
          }
        } catch(e) {}
      }
    } catch (e) {}

    // Check Google Apps Script for live Google Sheet / Drive proof & full registration details
    const queryPass = row ? row.passId : (upperClean.startsWith('FR') ? upperClean : withSimPrefix);
    try {
      const scriptUrl = 'https://script.google.com/macros/s/AKfycbyD9CNFpiQo41pQn1KARMFg1G03iMlkfumR6hFYWBZpCDDAahlCFej90HHjMrojlwtw/exec?action=verify&pass=' + encodeURIComponent(queryPass);
      const scriptRes = await fetch(scriptUrl, { signal: AbortSignal.timeout(8000), redirect: 'follow' });
      if (scriptRes.ok) {
        const scriptData = await scriptRes.json();
        if (scriptData && scriptData.status === 'found') {
          const merged = Object.assign({}, row || {}, scriptData);
          if (merged.driveUrl) merged.driveUrl = formatDriveUrl(merged.driveUrl);
          if (merged.screenshotUrl) merged.screenshotUrl = formatDriveUrl(merged.screenshotUrl);
          return json({ ok: true, status: 'found', record: merged }, 200, CORS_HEADERS);
        }
      }
    } catch (err) {}

    // Fallback: If not found yet and rawInput is different from queryPass, try rawInput with Google Apps Script
    if (!row && rawInput.trim() !== queryPass) {
      try {
        const scriptUrl2 = 'https://script.google.com/macros/s/AKfycbyD9CNFpiQo41pQn1KARMFg1G03iMlkfumR6hFYWBZpCDDAahlCFej90HHjMrojlwtw/exec?action=verify&pass=' + encodeURIComponent(rawInput.trim());
        const scriptRes2 = await fetch(scriptUrl2, { signal: AbortSignal.timeout(8000), redirect: 'follow' });
        if (scriptRes2.ok) {
          const scriptData2 = await scriptRes2.json();
          if (scriptData2 && scriptData2.status === 'found') {
            if (scriptData2.driveUrl) scriptData2.driveUrl = formatDriveUrl(scriptData2.driveUrl);
            if (scriptData2.screenshotUrl) scriptData2.screenshotUrl = formatDriveUrl(scriptData2.screenshotUrl);
            return json({ ok: true, status: 'found', record: scriptData2 }, 200, CORS_HEADERS);
          }
        }
      } catch (err) {}
    }

    if (row) {
      if (row.driveUrl) row.driveUrl = formatDriveUrl(row.driveUrl);
      if (row.screenshotUrl) row.screenshotUrl = formatDriveUrl(row.screenshotUrl);
      return json({ ok: true, status: 'found', record: row }, 200, CORS_HEADERS);
    }
    return json({ ok: false, status: 'not_found' }, 404, CORS_HEADERS);
  }
  // Pass Checker Access Control & Authentication
  if (path === '/api/checker/request-access') return requestCheckerAccess(request, env, ctx);
  if (path === '/api/checker/status') return handleCheckerStatus(request, env, ctx);
  if (path === '/api/checker/diag') return handleCheckerDiag(request, env, ctx);
  if (path === '/api/checker/decision') return handleAdminDecision(request, env, ctx);
  if (path === '/api/checker/login') return handleCheckerLogin(request, env, ctx);
  if (path === '/api/checker/logout') return handleCheckerLogout(request, env, ctx);

  // Real-Time Visitor & Engagement Analytics
  if (path === '/api/analytics/track') return handleTrackAnalytics(request, env, ctx);

  if (path === '/api/submissions' && request.method === 'POST') return submit(request, env, ctx);
  if (path === '/api/integrations/google-forms' && request.method === 'POST') return googleForm(request, env, ctx);
  if (path === '/api/telegram/webhook' && request.method === 'POST') return webhook(request, env, ctx);
  if (path.startsWith('/api/')) throw new HttpError(404, 'API route not found.');
  if (!['GET', 'HEAD'].includes(request.method)) throw new HttpError(405, 'Method not allowed.', { Allow: 'GET, HEAD' });
  return env.ASSETS.fetch(request);
}
export default {
  async fetch(request, env, ctx) {
    let response;
    try { response = await route(request, env, ctx); }
    catch (error) {
      if (error instanceof HttpError) response = json({ ok: false, error: error.message }, error.status, error.headers);
      else {
        // Never log requests, passwords, Telegram URLs, upstream errors or PII.
        console.error('The service could not complete a request.');
        response = json({ ok: false, error: 'The service is temporarily unavailable. Please retry; do not assume your request was received.' }, 503);
      }
    }
    return secure(response, request, { admin: new URL(request.url).pathname.startsWith('/admin') || new URL(request.url).pathname.startsWith('/api/admin/') });
  },
  scheduled(event, env, ctx) { background(ctx, housekeeping(env)); }
};
