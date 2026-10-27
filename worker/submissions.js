import { HttpError, now, sha, hmac, equal, stmt, random, string, email, readBody, parseJSON, sameOrigin, rate, local, secretReady, background, json } from './core.js';
import { settings, readiness, campaignState } from './settings.js';
import { deliverDue } from './telegram.js';

export function validateSubmission(data) {
  if (!['contact', 'sponsor', 'donate', 'registration'].includes(data.type)) throw new HttpError(400, 'Choose a valid submission type.');
  if (data.consent !== true) throw new HttpError(400, 'Consent is required to send this form.');
  if (data.website !== '' && data.website !== undefined) throw new HttpError(400, 'The form could not be accepted.');
  const name = string(data.name, 'Name', 100, true);
  const address = email(data.email);
  const phone = string(data.phone, 'Phone', 40, data.type === 'registration');
  if (phone && (!/^[+\d() .-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 18)) throw new HttpError(400, 'Enter a valid phone number.');
  const organization = string(data.organization, 'Organisation / college', 160, data.type === 'registration');
  const message = string(data.message, 'Message', 4000, data.type !== 'registration');
  const idempotencyKey = string(data.idempotencyKey, 'Request key', 128, true);
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) throw new HttpError(400, 'Use a valid request key.');
  const turnstileToken = string(data.turnstileToken, 'Security check', 2048);
  return { type: data.type, name, email: address, phone, organization, message, consent: true, idempotencyKey, turnstileToken };
}

async function turnstile(env, request, token) {
  if (local(env, request)) return;
  if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY) return;
  if (!token) throw new HttpError(400, 'Complete the security check.');
  let response, result;
  try {
    const fetcher = env.__fetch || fetch;
    response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: request.headers.get('CF-Connecting-IP') || '' }),
      signal: AbortSignal.timeout(10000)
    });
    result = await response.json();
  } catch { throw new HttpError(503, 'The security check is temporarily unavailable. Please retry.'); }
  if (!response.ok || !result.success || result.hostname !== new URL(request.url).hostname) throw new HttpError(400, 'The security check expired or failed. Please try it again.');
}

export async function existing(env, source, key, payloadHash) {
  const row = await stmt(env, 'SELECT id,reference,payload_hash FROM submissions WHERE source=? AND idempotency_key=?', source, key).first();
  if (row && row.payload_hash !== payloadHash) throw new HttpError(409, 'This request key was already used with different details.');
  return row;
}

export async function store(env, record, payloadHash) {
  const id = crypto.randomUUID(), reference = 'FR-' + random().slice(0, 12).toUpperCase(), time = now();
  // D1 batch is transactional: either the submission and its outbox both persist, or neither does.
  await env.DB.batch([
    stmt(env, `INSERT INTO submissions(id,reference,source,type,name,email,phone,organization,message,answers_json,consent,external_id,idempotency_key,payload_hash,submitted_at,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING`,
    id, reference, record.source, record.type, record.name || '', record.email || '', record.phone || '', record.organization || '', record.message || '', record.answers ? JSON.stringify(record.answers) : null,
    record.consent ? 1 : 0, record.externalId || null, record.key, payloadHash, record.submittedAt || new Date().toISOString(), time, time),
    stmt(env, `INSERT INTO notification_jobs(id,submission_id,recipient_id,next_attempt_at,created_at)
      SELECT lower(hex(randomblob(16))),s.id,r.chat_id,?,? FROM submissions s CROSS JOIN recipients r
      WHERE s.id=? AND r.status='approved' ON CONFLICT(submission_id,recipient_id) DO NOTHING`, time, time, id)
  ]);
  const saved = await existing(env, record.source, record.key, payloadHash);
  if (!saved) throw new HttpError(503, 'The submission could not be saved. Please retry with the same request key.');
  return { ...record, ...saved };
}

export async function forwardToGoogleSheets(env, record) {
  const url = env.GOOGLE_SHEETS_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbxVxjDeHqt0u7xr-6PG0W64NIC8fY78wH9wPjdM9uEVInca7G3VKbMaRr2FLaGLUN6s/exec';
  if (!url) return;
  try {
    const config = await settings(env);
    let eventSheet = 'General_Submissions';
    if (record.type === 'registration') eventSheet = 'F1_Simulator';
    else if (record.type === 'sponsor') eventSheet = 'Sponsorships';
    else if (record.type === 'donate') eventSheet = 'Contributions';
    else if (record.type === 'contact') eventSheet = 'Inquiries';

    const payload = {
      action: 'submit',
      eventSheet,
      type: record.type,
      reference: record.reference,
      id: record.reference,
      name: record.name,
      companyName: record.organization,
      rollNumber: record.organization,
      email: record.email,
      phone: record.phone,
      message: record.message,
      timestamp: record.submitted_at || new Date().toISOString(),
      sendEmail: config.gmailEnabled !== false,
      recipientEmail: config.contact?.email || 'team.force.racing.kitsw@gmail.com'
    };

    const fetcher = env.__fetch || fetch;
    await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });
  } catch (err) {}
}

function receipt(record, ctx, env) {
  background(ctx, deliverDue(env, record.id));
  background(ctx, forwardToGoogleSheets(env, record));
  return json({ ok: true, reference: record.reference, message: 'Your request has been saved. The team will follow up; payment and participation are not confirmed.' }, 201);
}

export async function submit(request, env, ctx) {
  sameOrigin(request);
  await rate(env, request, 'submission', 5, 600);
  const data = validateSubmission(parseJSON(await readBody(request)));
  const { turnstileToken, idempotencyKey, ...fields } = data;
  const hash = await sha(JSON.stringify(fields));
  const prior = await existing(env, 'website', idempotencyKey, hash);
  if (prior) return receipt(prior, ctx, env);
  const config = await settings(env), ready = await readiness(env, request);
  if (!config.formsEnabled || !ready.ready) throw new HttpError(503, 'On-site forms are not ready yet. Please use the published contact routes.');
  if (data.type === 'registration' && campaignState(config) !== 'active') throw new HttpError(400, 'Registration for this campaign is closed.');
  await turnstile(env, request, turnstileToken);
  const saved = await store(env, { ...fields, source: 'website', key: idempotencyKey }, hash);
  return receipt(saved, ctx, env);
}

export function validateGoogle(data) {
  const responseId = string(data.responseId, 'Response ID', 200, true);
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(responseId)) throw new HttpError(400, 'Invalid response ID.');
  const submittedAt = string(data.submittedAt, 'Submission timestamp', 40, true);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(submittedAt) || !Number.isFinite(Date.parse(submittedAt)) || Date.parse(submittedAt) > Date.now() + 600000) throw new HttpError(400, 'Use a valid submission timestamp with timezone.');
  const respondentEmail = email(data.respondentEmail, false);
  if (!Array.isArray(data.answers) || data.answers.length < 1 || data.answers.length > 40) throw new HttpError(400, 'Provide 1–40 labelled answers.');
  const answers = data.answers.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new HttpError(400, 'Each answer needs a question and answer.');
    return { question: string(item.question, 'Question label', 200, true), answer: string(item.answer, 'Answer', 2000) };
  });
  return { responseId, submittedAt: new Date(submittedAt).toISOString(), respondentEmail, answers };
}

export async function googleForm(request, env, ctx) {
  if (!secretReady(env.GOOGLE_FORMS_SECRET)) throw new HttpError(503, 'The Google Forms connector is not configured.');
  await rate(env, request, 'google-forms', 60, 60);
  const raw = await readBody(request, 24000);
  const timestamp = request.headers.get('X-Force-Timestamp') || '';
  const signature = request.headers.get('X-Force-Signature') || '';
  // Timestamp is Unix seconds; allow at most one minute of future clock skew.
  if (!/^\d{10}$/.test(timestamp) || now() - Number(timestamp) > 600 || Number(timestamp) - now() > 60 || !/^[a-f0-9]{64}$/i.test(signature) || !await equal(signature.toLowerCase(), await hmac(env.GOOGLE_FORMS_SECRET, `${timestamp}.${raw}`))) throw new HttpError(401, 'The connector signature is invalid or expired.');
  const data = validateGoogle(parseJSON(raw));
  const hash = await sha(JSON.stringify(data));
  const prior = await existing(env, 'google_form', data.responseId, hash);
  if (prior) return receipt(prior, ctx, env);
  const config = await settings(env);
  if (campaignState(config) !== 'active') throw new HttpError(400, 'Registration for this campaign is closed.');
  // Signed Google submissions bypass browser Turnstile, not the durable outbox.
  // They may be retained while Telegram is temporarily unconfigured; retry sends later.
  const saved = await store(env, { source: 'google_form', type: 'registration', key: data.responseId, externalId: data.responseId,
    email: data.respondentEmail, answers: data.answers, submittedAt: data.submittedAt }, hash);
  return receipt(saved, ctx, env);
}
