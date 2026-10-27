export class HttpError extends Error {
  constructor(status, message, headers = {}) { super(message); this.status = status; this.headers = headers; }
}
export const now = () => Math.floor(Date.now() / 1000);
export const bytes = value => new TextEncoder().encode(value);
export const hex = value => Array.from(new Uint8Array(value), b => b.toString(16).padStart(2, '0')).join('');
export const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export async function sha(value) { return hex(await crypto.subtle.digest('SHA-256', bytes(value))); }
export async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', bytes(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, bytes(value)));
}
export async function equal(a, b) {
  // Compare fixed-length digests, including for unequal-length inputs.
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', bytes(String(a))), crypto.subtle.digest('SHA-256', bytes(String(b)))]);
  const left = new Uint8Array(x), right = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}
export const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
export const stmt = (env, sql, ...args) => env.DB.prepare(sql).bind(...args);
export const rows = async (env, sql, ...args) => (await stmt(env, sql, ...args).all()).results;
export function local(env, request) {
  return env.LOCAL_DEV === 'true' && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname);
}
export const secretReady = value => typeof value === 'string' && value.length >= 32 && !value.startsWith('REPLACE_');
export function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (origin !== new URL(request.url).origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') throw new HttpError(403, 'This request must come from this website.');
}
export async function readBody(request, cap = 16000, jsonOnly = true) {
  const contentType = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (jsonOnly && contentType !== 'application/json') throw new HttpError(415, 'Use application/json.');
  const length = request.headers.get('Content-Length');
  if (length && (!/^\d+$/.test(length) || Number(length) > cap)) throw new HttpError(413, 'The request is too large.');
  if (!request.body) throw new HttpError(400, 'A request body is required.');
  const reader = request.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > cap) { await reader.cancel(); throw new HttpError(413, 'The request is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const buffer = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
  catch { throw new HttpError(400, 'Use valid UTF-8.'); }
}
export function parseJSON(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new HttpError(400, 'Use valid JSON.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'A JSON object is required.');
  return data;
}
export function string(value, label, max, required = false) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string') throw new HttpError(400, `${label} must be text.`);
  const text = value.trim();
  if (text.length > max || (required && !text) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) throw new HttpError(400, `${label} is missing or too long.`);
  return text;
}
export function email(value, required = true) {
  const text = string(value, 'Email', 254, required);
  if (text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) throw new HttpError(400, 'Enter a valid email address.');
  return text;
}
export async function rate(env, request, namespace, max, seconds) {
  if (local(env, request)) return; // Local development bypass; production stays limited.
  if (!secretReady(env.SESSION_SECRET)) throw new HttpError(503, 'The service is not configured yet.');
  const ip = request.headers.get('CF-Connecting-IP') || 'local-or-unavailable';
  const window = Math.floor(now() / seconds);
  const key = await hmac(env.SESSION_SECRET, `${namespace}:${ip}:${window}`);
  const result = await stmt(env, 'INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count', key, (window + 1) * seconds).first();
  if (result.count > max) throw new HttpError(429, 'Too many requests. Please try again later.', { 'Retry-After': String((window + 1) * seconds - now()) });
}
export function background(ctx, promise) {
  ctx.waitUntil(promise.catch(() => { console.error('Deferred notification work will be retried.'); }));
}
export function secure(response, request, { admin = false } = {}) {
  const copy = new Response(response.body, response);
  const csp = admin
    ? "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'"
    : "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://challenges.cloudflare.com; frame-src https://www.google.com https://challenges.cloudflare.com; base-uri 'self'; form-action 'self' https://docs.google.com; frame-ancestors 'none'; object-src 'none'";
  copy.headers.set('Content-Security-Policy', csp);
  copy.headers.set('X-Content-Type-Options', 'nosniff');
  copy.headers.set('X-Frame-Options', 'DENY');
  copy.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  copy.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (new URL(request.url).protocol === 'https:') copy.headers.set('Strict-Transport-Security', 'max-age=31536000');
  if (admin || new URL(request.url).pathname.startsWith('/api/')) copy.headers.set('Cache-Control', 'no-store');
  if (admin) copy.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return copy;
}
