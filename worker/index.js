import { HttpError, json, secure, background } from './core.js';
import { publicConfig } from './settings.js';
import { submit, googleForm } from './submissions.js';
import { webhook, housekeeping } from './telegram.js';
import { adminApi, adminPage } from './admin.js';

export async function route(request, env, ctx) {
  const url = new URL(request.url), path = url.pathname;
  if (path === '/admin' || path.startsWith('/admin/')) return adminPage(request, env);
  if (path.startsWith('/api/admin/')) return adminApi(request, env, ctx);
  if (path === '/api/public/config' && request.method === 'GET') return json(await publicConfig(env, request));
  if (path === '/api/verify' && request.method === 'GET') {
    const pass = url.searchParams.get('pass');
    if (!pass) return json({ ok: false, error: 'Pass parameter required.' }, 400);
    const row = await env.DB.prepare('SELECT reference AS passId, name, organization, email, phone, created_at FROM submissions WHERE reference=? OR external_id=?').bind(pass, pass).first();
    if (row) return json({ ok: true, status: 'found', record: row });
    return json({ ok: false, status: 'not_found' }, 404);
  }
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
