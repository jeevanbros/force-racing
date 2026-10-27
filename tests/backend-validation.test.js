import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSubmission, validateGoogle } from '../worker/submissions.js';
import { validateSettings, campaignState, DEFAULT_SETTINGS } from '../worker/settings.js';
import { chunks, notificationText } from '../worker/telegram.js';

const key = 'k'.repeat(24);
const valid = { type: 'contact', name: 'Asha', email: 'asha@example.com', message: 'Hello team', consent: true, website: '', idempotencyKey: key };

test('validateSubmission accepts a minimal valid contact enquiry', () => {
  const out = validateSubmission(valid);
  assert.equal(out.type, 'contact');
  assert.equal(out.name, 'Asha');
  assert.equal(out.phone, '');
});

test('validateSubmission rejects bad type, missing consent and honeypot', () => {
  assert.throws(() => validateSubmission({ ...valid, type: 'other' }), /valid submission type/);
  assert.throws(() => validateSubmission({ ...valid, consent: false }), /Consent/);
  assert.throws(() => validateSubmission({ ...valid, website: 'spam-bot' }), /could not be accepted/);
});

test('validateSubmission requires name, valid email and request key', () => {
  assert.throws(() => validateSubmission({ ...valid, name: '  ' }), /Name/);
  assert.throws(() => validateSubmission({ ...valid, email: 'nope' }), /valid email/);
  assert.throws(() => validateSubmission({ ...valid, idempotencyKey: 'short' }), /request key/i);
});

test('validateSubmission enforces registration phone/organization and phone shape', () => {
  const reg = { ...valid, type: 'registration', message: '', phone: '+91 80083 91525', organization: 'KITSW' };
  assert.equal(validateSubmission(reg).organization, 'KITSW');
  assert.throws(() => validateSubmission({ ...reg, phone: '' }), /Phone/);
  assert.throws(() => validateSubmission({ ...reg, phone: '123' }), /valid phone/);
  assert.throws(() => validateSubmission({ ...reg, phone: 'not a phone !!' }), /valid phone/);
  assert.throws(() => validateSubmission({ ...reg, organization: '' }), /Organisation/);
});

test('validateSubmission requires message for enquiries but not registration', () => {
  assert.throws(() => validateSubmission({ ...valid, message: ' ' }), /Message/);
  assert.doesNotThrow(() => validateSubmission({ ...valid, type: 'registration', message: '', phone: '8008391525', organization: 'KITSW' }));
});

test('validateSubmission caps field lengths', () => {
  assert.throws(() => validateSubmission({ ...valid, name: 'x'.repeat(101) }), /Name/);
  assert.throws(() => validateSubmission({ ...valid, message: 'x'.repeat(4001) }), /Message/);
});

const googleValid = {
  responseId: '2_ABaOnuex123', submittedAt: '2026-10-27T10:00:00Z',
  respondentEmail: 'student@example.com', answers: [{ question: 'Name', answer: 'Asha' }]
};

test('validateGoogle accepts a bounded signed payload', () => {
  const out = validateGoogle(googleValid);
  assert.equal(out.answers.length, 1);
  assert.equal(out.submittedAt, '2026-10-27T10:00:00.000Z');
});

test('validateGoogle rejects bad IDs, future timestamps and oversized answers', () => {
  assert.throws(() => validateGoogle({ ...googleValid, responseId: 'bad id!' }), /response ID/i);
  assert.throws(() => validateGoogle({ ...googleValid, submittedAt: 'not-a-date' }), /timestamp/);
  assert.throws(() => validateGoogle({ ...googleValid, submittedAt: new Date(Date.now() + 3600e3).toISOString() }), /timestamp/);
  assert.throws(() => validateGoogle({ ...googleValid, answers: [] }), /1–40/);
  assert.throws(() => validateGoogle({ ...googleValid, answers: Array(41).fill({ question: 'q', answer: 'a' }) }), /1–40/);
  assert.throws(() => validateGoogle({ ...googleValid, answers: [{ question: '', answer: 'a' }] }), /Question/);
  assert.doesNotThrow(() => validateGoogle({ ...googleValid, respondentEmail: '' }));
  assert.throws(() => validateGoogle({ ...googleValid, respondentEmail: 'bad' }), /email/i);
});

function settingsPayload(overrides = {}) {
  return {
    formsEnabled: true,
    campaign: { ...DEFAULT_SETTINGS.campaign, enabled: true, expiresAt: null },
    contact: { ...DEFAULT_SETTINGS.contact },
    privacy: { retentionDays: 90 },
    ...overrides
  };
}

test('validateSettings accepts a complete valid payload', () => {
  const out = validateSettings(settingsPayload());
  assert.equal(out.campaign.title, 'F1 Sim Racing');
  assert.equal(out.formsEnabled, true);
});

test('validateSettings rejects unknown fields and wrong types', () => {
  assert.throws(() => validateSettings(settingsPayload({ unknown: true })), /settings fields/);
  assert.throws(() => validateSettings(settingsPayload({ formsEnabled: 'yes' })), /true or false/);
  const bad = settingsPayload();
  bad.campaign = { ...bad.campaign, hacking: true };
  assert.throws(() => validateSettings(bad), /campaign fields/);
});

test('validateSettings enforces URL, date, expiry and retention rules', () => {
  const withUrl = url => { const p = settingsPayload(); p.campaign.registrationUrl = url; return p; };
  assert.throws(() => validateSettings(withUrl('http://example.com/form')), /HTTPS/);
  assert.throws(() => validateSettings(withUrl('https://user:pass@example.com/')), /HTTPS/);
  assert.equal(validateSettings(withUrl('https://docs.google.com/forms/x')).campaign.registrationUrl, 'https://docs.google.com/forms/x');
  const art = settingsPayload(); art.campaign.artwork = '/assets/images/campaign.webp';
  assert.equal(validateSettings(art).campaign.artwork, '/assets/images/campaign.webp');
  const badArt = settingsPayload(); badArt.campaign.artwork = '/assets/../secret.png';
  assert.throws(() => validateSettings(badArt), /Artwork/);
  const badDate = settingsPayload(); badDate.campaign.date = '2026-02-30';
  assert.throws(() => validateSettings(badDate), /YYYY-MM-DD/);
  const badExpiry = settingsPayload(); badExpiry.campaign.expiresAt = 'soon';
  assert.throws(() => validateSettings(badExpiry), /Expiry/);
  assert.throws(() => validateSettings(settingsPayload({ privacy: { retentionDays: 0 } })), /Retention/);
  assert.throws(() => validateSettings(settingsPayload({ privacy: { retentionDays: 731 } })), /Retention/);
  const noTitle = settingsPayload(); noTitle.campaign.title = '';
  assert.throws(() => validateSettings(noTitle), /Campaign title/);
});

test('campaignState reflects disabled, expired and active', () => {
  const base = settingsPayload().campaign;
  assert.equal(campaignState({ campaign: { ...base, enabled: false } }), 'disabled');
  assert.equal(campaignState({ campaign: { ...base, enabled: true, expiresAt: '2020-01-01T00:00:00Z' } }), 'expired');
  assert.equal(campaignState({ campaign: { ...base, enabled: true, expiresAt: null } }), 'active');
  assert.equal(campaignState({ campaign: { ...base, enabled: true, expiresAt: new Date(Date.now() + 86400e3).toISOString() } }), 'active');
});

test('chunks splits long text without breaking surrogate pairs', () => {
  assert.deepEqual(chunks('short'), ['short']);
  const long = ('line of text\n'.repeat(400));
  const parts = chunks(long);
  assert.ok(parts.length > 1);
  assert.ok(parts.every(p => p.length <= 3500));
  assert.equal(parts.join(''), long);
  const emoji = '🏎️'.repeat(3000);
  for (const part of chunks(emoji)) {
    assert.ok(part.length <= 3500);
    assert.ok(!/[\uD800-\uDBFF]$/.test(part), 'no trailing lone surrogate');
  }
});

test('notificationText includes reference, fields, answers and honest disclaimer', () => {
  const text = notificationText({
    reference: 'FR-ABC123', type: 'registration', source: 'website', submitted_at: '2026-10-27T10:00:00Z',
    name: 'Asha', email: 'asha@example.com', phone: '8008391525', organization: 'KITSW', message: '',
    answers_json: JSON.stringify([{ question: 'Year', answer: '2nd' }])
  });
  assert.match(text, /FR-ABC123/);
  assert.match(text, /Name: Asha/);
  assert.match(text, /Year: 2nd/);
  assert.match(text, /team confirmation/i);
  assert.ok(!text.includes('Message:'), 'empty fields are omitted');
});
