/**
 * Force Racing — install in the ORIGINAL Google Form's bound Apps Script project.
 * Set Script Properties FORCE_WORKER_URL and GOOGLE_FORMS_SECRET first.
 * Secret must match the Worker's secret. Never paste it into the form or frontend.
 * This file is a deployment artifact; no trigger has been installed by this build.
 */
function installForceRacingTriggers() {
  const form = FormApp.getActiveForm();
  if (!form) throw new Error('Open Apps Script from the original Google Form.');
  getForceSettings_();
  const handlers = ['forceRacingOnSubmit', 'retryForceRacingNotifications'];
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (handlers.indexOf(trigger.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('forceRacingOnSubmit').forForm(form).onFormSubmit().create();
  ScriptApp.newTrigger('retryForceRacingNotifications').timeBased().everyMinutes(5).create();
}

function forceRacingOnSubmit(event) {
  if (!event || !event.response) throw new Error('Use an installable Form submission trigger, not a spreadsheet trigger.');
  queueResponse_(event.response.getId());
  deliverQueuedResponse_(event.response);
}

function getForceSettings_() {
  const properties = PropertiesService.getScriptProperties();
  const base = (properties.getProperty('FORCE_WORKER_URL') || '').replace(/\/+$/, '');
  const secret = properties.getProperty('GOOGLE_FORMS_SECRET') || '';
  if (!/^https:\/\/[a-z0-9.-]+(?::443)?$/i.test(base)) throw new Error('FORCE_WORKER_URL must be an HTTPS origin without a path.');
  if (secret.length < 32) throw new Error('GOOGLE_FORMS_SECRET must contain at least 32 characters.');
  return {base: base, secret: secret};
}

function responseKey_(id) {
  return 'force_pending_' + Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, id)
    .map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}

function queueResponse_(id) {
  const properties = PropertiesService.getScriptProperties();
  const key = responseKey_(id);
  if (!properties.getProperty(key)) properties.setProperty(key, JSON.stringify({id: id, attempts: 0, nextAt: 0}));
}

function buildPayload_(response) {
  const items = response.getItemResponses();
  const answers = items.slice(0, 40).map(function(item) {
    const value = item.getResponse();
    return {
      question: String(item.getItem().getTitle()).slice(0, 200),
      answer: (Array.isArray(value) ? value.join(', ') : String(value == null ? '' : value)).slice(0, 2000)
    };
  });
  const payload = {
    responseId: response.getId(),
    submittedAt: response.getTimestamp().toISOString(),
    respondentEmail: response.getRespondentEmail() || '',
    answers: answers
  };
  const body = JSON.stringify(payload);
  if (Utilities.newBlob(body).getBytes().length > 24000) throw new Error('Response is too large for the connector; original remains saved in Google Forms.');
  return body;
}

function deliverQueuedResponse_(response) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return; // Scheduled retry owns the durable queue.
  const properties = PropertiesService.getScriptProperties();
  const key = responseKey_(response.getId());
  try {
    const settings = getForceSettings_();
    const body = buildPayload_(response);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = Utilities.computeHmacSha256Signature(timestamp + '.' + body, settings.secret)
      .map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
    const result = UrlFetchApp.fetch(settings.base + '/api/integrations/google-forms', {
      method: 'post', contentType: 'application/json', payload: body,
      headers: {'X-Force-Timestamp': timestamp, 'X-Force-Signature': signature},
      muteHttpExceptions: true, followRedirects: false
    });
    let data;
    try { data = JSON.parse(result.getContentText()); } catch (_) { data = {}; }
    if (result.getResponseCode() >= 200 && result.getResponseCode() < 300 && data.ok === true) {
      properties.deleteProperty(key);
      return;
    }
    throw new Error('Worker rejected the connector request (HTTP ' + result.getResponseCode() + ').');
  } catch (error) {
    const entry = JSON.parse(properties.getProperty(key) || JSON.stringify({id: response.getId(), attempts: 0}));
    entry.attempts += 1;
    entry.nextAt = Date.now() + Math.min(3600000, 60000 * Math.pow(2, Math.min(entry.attempts, 6)));
    properties.setProperty(key, JSON.stringify(entry));
    // No response body, personal answers, URL token or secret is written to logs.
    throw new Error('Force Racing delivery failed; response is saved in Google Forms and queued for retry. Check Worker configuration and Apps Script executions.');
  } finally { lock.releaseLock(); }
}

function retryForceRacingNotifications() {
  const properties = PropertiesService.getScriptProperties().getProperties();
  const form = FormApp.getActiveForm();
  if (!form) throw new Error('This script must be bound to the original Google Form.');
  const due = Object.keys(properties).filter(function(key) { return key.indexOf('force_pending_') === 0; })
    .map(function(key) { return JSON.parse(properties[key]); })
    .filter(function(entry) { return entry.nextAt <= Date.now(); }).slice(0, 10);
  let failures = 0;
  due.forEach(function(entry) {
    try { deliverQueuedResponse_(form.getResponse(entry.id)); } catch (_) { failures += 1; }
  });
  if (failures) throw new Error(failures + ' queued Force Racing notification(s) still require delivery.');
}

/** Explicit manual recovery; does not run automatically or replay historical responses. */
function queueLatestResponseForRecovery() {
  const responses = FormApp.getActiveForm().getResponses();
  if (!responses.length) throw new Error('No form responses to recover.');
  const response = responses[responses.length - 1];
  queueResponse_(response.getId());
  deliverQueuedResponse_(response);
}
