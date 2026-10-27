import { HttpError, now, stmt, string, email, local, secretReady } from './core.js';

export const DEFAULT_SETTINGS = {
  formsEnabled: false,
  gmailEnabled: true,
  campaign: {
    title: 'F1 Sim Racing', subtitle: 'Sumshodhini ’26',
    description: 'Department of Mechanical Engineering, KITS Warangal.',
    cta: 'Register your interest', date: '2026-10-31', venue: 'Central Workshop', fee: 'INR 99 per student',
    registrationUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdojQE57Sd9rPsMwwrRuy-RQVNfyL4LaRf8h7srZAYWspcVcw/viewform?usp=dialog',
    artwork: '', enabled: false, expiresAt: null
  },
  contact: { email: 'team.force.racing.kitsw@gmail.com', phone: '+91-8008391525', address: 'Central Workshop, KITS Warangal, Warangal 506015, Telangana, India.' },
  privacy: { retentionDays: 90 }
};
export async function settings(env) {
  const row = await stmt(env, 'SELECT value FROM settings WHERE id=1').first();
  const stored = row ? JSON.parse(row.value) : {};
  return { ...DEFAULT_SETTINGS, ...stored, campaign: { ...DEFAULT_SETTINGS.campaign, ...stored.campaign }, contact: { ...DEFAULT_SETTINGS.contact, ...stored.contact }, privacy: { ...DEFAULT_SETTINGS.privacy, ...stored.privacy } };
}
function bool(value, label) { if (typeof value !== 'boolean') throw new HttpError(400, `${label} must be true or false.`); return value; }
function object(value, label, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k))) throw new HttpError(400, `Invalid ${label} fields.`);
  return value;
}
function safeUrl(value, label, allowLocal = false) {
  const text = string(value, label, 2048);
  if (!text) return '';
  if (allowLocal && /^\/assets\/[A-Za-z0-9/_ .%-]+\.(?:png|jpe?g|webp|avif|svg)(?:\?[A-Za-z0-9=&_-]*)?$/i.test(text) && !text.includes('..') && !/%2f|%5c|%2e/i.test(text)) return text;
  let url;
  try { url = new URL(text); } catch { throw new HttpError(400, `${label} must be an HTTPS URL${allowLocal ? ' or /assets/ image path' : ''}.`); }
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.') || /[\s<>]/.test(text)) throw new HttpError(400, `${label} must be a public HTTPS URL.`);
  return url.href;
}
export function validateSettings(data) {
  object(data, 'settings', ['formsEnabled', 'gmailEnabled', 'campaign', 'contact', 'privacy']);
  const c = object(data.campaign, 'campaign', Object.keys(DEFAULT_SETTINGS.campaign));
  const contact = object(data.contact, 'contact', ['email', 'phone', 'address']);
  const privacy = object(data.privacy, 'privacy', ['retentionDays']);
  let expiresAt = null;
  if (c.expiresAt !== null && c.expiresAt !== '' && c.expiresAt !== undefined) {
    const text = string(c.expiresAt, 'Expiry', 40, true);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(text) || !Number.isFinite(Date.parse(text))) throw new HttpError(400, 'Expiry must be an ISO date/time with timezone.');
    expiresAt = new Date(text).toISOString();
  }
  const date = string(c.date, 'Campaign date', 10);
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date)) throw new HttpError(400, 'Use a valid YYYY-MM-DD campaign date.');
  if (!Number.isInteger(privacy.retentionDays) || privacy.retentionDays < 1 || privacy.retentionDays > 730) throw new HttpError(400, 'Retention must be 1–730 days.');
  return {
    formsEnabled: bool(data.formsEnabled, 'Forms enabled'),
    gmailEnabled: data.gmailEnabled !== undefined ? bool(data.gmailEnabled, 'Gmail alerts') : (DEFAULT_SETTINGS.gmailEnabled ?? true),
    campaign: {
      title: string(c.title, 'Campaign title', 100, true), subtitle: string(c.subtitle, 'Subtitle', 160), description: string(c.description, 'Description', 1000),
      cta: string(c.cta, 'CTA label', 60, true), date, venue: string(c.venue, 'Venue', 200), fee: string(c.fee, 'Fee', 120),
      registrationUrl: safeUrl(c.registrationUrl, 'Registration URL'), artwork: safeUrl(c.artwork, 'Artwork', true), enabled: bool(c.enabled, 'Campaign enabled'), expiresAt
    },
    contact: { email: email(contact.email), phone: string(contact.phone, 'Public phone', 40), address: string(contact.address, 'Public address', 500) },
    privacy: { retentionDays: privacy.retentionDays }
  };
}
export function campaignState(config) {
  if (!config.campaign.enabled) return 'disabled';
  if (config.campaign.expiresAt && Date.parse(config.campaign.expiresAt) <= Date.now()) return 'expired';
  return 'active';
}
export async function readiness(env, request) {
  const approved = await stmt(env, "SELECT COUNT(*) AS count FROM recipients WHERE status='approved'").first();
  const isLocal = local(env, request);
  const checks = {
    storage: true,
    sessionSecret: secretReady(env.SESSION_SECRET),
    telegram: (isLocal && env.TELEGRAM_MOCK === 'true') || /^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(env.TELEGRAM_BOT_TOKEN || ''),
    approvedRecipients: (approved?.count || 0) > 0,
    turnstile: isLocal || !env.TURNSTILE_SECRET_KEY || (Boolean(env.TURNSTILE_SITE_KEY) && Boolean(env.TURNSTILE_SECRET_KEY))
  };
  return { ready: Object.values(checks).every(Boolean), checks, local: isLocal };
}
export async function publicConfig(env, request) {
  const config = await settings(env), ready = await readiness(env, request);
  const formsEnabled = config.formsEnabled && ready.ready;
  const state = campaignState(config);
  const enabled = formsEnabled && state === 'active';
  const campaign = enabled
    ? { ...config.campaign, enabled: true, state: 'active' }
    : { title: '', subtitle: '', description: '', cta: '', date: '', venue: '', fee: '', registrationUrl: '', artwork: '', expiresAt: null, enabled: false, state: state === 'active' ? 'unavailable' : state };
  return {
    campaign,
    formsEnabled,
    turnstileSiteKey: formsEnabled && !ready.local && env.TURNSTILE_SECRET_KEY ? env.TURNSTILE_SITE_KEY : '',
    contact: config.contact,
    privacy: config.privacy
  };
}
export async function saveSettings(env, data) {
  const config = validateSettings(data);
  await stmt(env, 'INSERT INTO settings(id,value,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at', JSON.stringify(config), now()).run();
  return config;
}
