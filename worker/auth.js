import { HttpError, now, random, sha, hmac, equal, stmt, local, secretReady, sameOrigin, rate } from './core.js';

export function authReady(env) {
  const password = env.ADMIN_PASSWORD || '';
  const groups = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(re => re.test(password)).length;
  return password.length >= 16 && password.length <= 256 && groups >= 3 && !password.startsWith('REPLACE_') && secretReady(env.SESSION_SECRET);
}
export function cookie(value, env, request, clear = false) {
  return `${local(env, request) ? 'force_session' : '__Host-force_session'}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 28800}${local(env, request) ? '' : '; Secure'}`;
}
function token(request, env) {
  const name = local(env, request) ? 'force_session' : '__Host-force_session';
  return (request.headers.get('Cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(name + '='))?.slice(name.length + 1) || '';
}
export async function session(env, request) {
  if (!authReady(env)) return null;
  const parts = token(request, env).split('.');
  if (parts.length !== 3 || !/^[a-f0-9]{64}$/.test(parts[0]) || !/^\d{10}$/.test(parts[1]) || !/^[a-f0-9]{64}$/.test(parts[2])) return null;
  if (Number(parts[1]) <= now() || !(await equal(parts[2], await hmac(env.SESSION_SECRET, parts[0] + '.' + parts[1])))) return null;
  const row = await stmt(env, 'SELECT * FROM admin_sessions WHERE id_hash=? AND expires_at>?', await sha(parts[0]), now()).first();
  if (!row || row.expires_at !== Number(parts[1])) return null;
  return row;
}
export async function requireSession(env, request, mutation = false) {
  const user = await session(env, request);
  if (!user) throw new HttpError(401, 'Sign in as the owner.');
  if (mutation) {
    sameOrigin(request);
    const csrf = request.headers.get('X-CSRF-Token') || '';
    if (!await equal(csrf, user.csrf_token)) throw new HttpError(403, 'The security token expired. Reload the admin page.');
  }
  return user;
}
export async function login(env, request, password) {
  sameOrigin(request);
  if (!authReady(env)) throw new HttpError(503, 'Owner login is not configured.');
  await rate(env, request, 'login', 5, 900);
  if (typeof password !== 'string' || password.length > 256 || !await equal(password, env.ADMIN_PASSWORD)) throw new HttpError(401, 'The password is incorrect.');
  const id = random(), expires = now() + 28800, csrfToken = random();
  await stmt(env, 'INSERT INTO admin_sessions(id_hash,csrf_token,expires_at,created_at) VALUES(?,?,?,?)', await sha(id), csrfToken, expires, now()).run();
  return { csrfToken, cookie: cookie(`${id}.${expires}.${await hmac(env.SESSION_SECRET, `${id}.${expires}`)}`, env, request) };
}
