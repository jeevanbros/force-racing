/* Owner dashboard client. All user data is rendered with textContent only. */
export const client = String.raw`(() => {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const notice = document.getElementById('notice');
  const say = (message, error = false) => {
    notice.textContent = message;
    notice.classList.toggle('error', error);
    notice.focus();
  };
  async function api(path, options = {}) {
    const init = { credentials: 'same-origin', headers: {}, ...options };
    if (init.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      if (init.method && init.method !== 'GET') init.headers['X-CSRF-Token'] = csrf;
    }
    let response;
    try { response = await fetch(path, init); }
    catch { throw new Error('Network error. Check your connection and retry.'); }
    let data = {};
    try { data = await response.json(); } catch { /* keep default */ }
    if (!response.ok || data.ok === false) {
      if (response.status === 401) { location.reload(); throw new Error('Your session expired. Sign in again.'); }
      throw new Error(typeof data.error === 'string' ? data.error : 'The request failed (' + response.status + ').');
    }
    return data;
  }
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const fmtTime = value => {
    const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString() : String(value || '');
  };

  /* Metrics */
  async function loadMetrics() {
    const data = await api('/api/admin/metrics');
    const box = document.getElementById('metrics');
    box.replaceChildren();
    const failed = (data.notifications.retry || 0) + (data.notifications.dead || 0);
    const cards = [
      [data.submissions.total, 'Total requests'],
      [data.submissions.new, 'New requests'],
      [failed, 'Alerts needing retry'],
      [(data.recipients.approved || 0) + ' / ' + (data.recipients.pending || 0), 'Approved / pending recipients']
    ];
    for (const [value, label] of cards) {
      const card = el('div', undefined, 'metric');
      card.append(el('strong', String(value)), el('span', label));
      box.append(card);
    }
  }

  /* Tabs */
  const panels = ['submissions', 'recipients', 'settings'];
  document.querySelector('.tabs').addEventListener('click', event => {
    const button = event.target.closest('button[data-tab]');
    if (!button) return;
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    for (const name of panels) document.getElementById(name).hidden = name !== button.dataset.tab;
    if (button.dataset.tab === 'recipients') loadRecipients().catch(e => say(e.message, true));
    if (button.dataset.tab === 'settings') loadSettings().catch(e => say(e.message, true));
  });

  /* Submissions */
  let offset = 0, lastTotal = 0;
  const stateName = { new: 'New', in_progress: 'In progress', resolved: 'Resolved', spam: 'Spam' };
  async function loadSubmissions() {
    const params = new URLSearchParams(new FormData(document.getElementById('filters')));
    for (const [key, value] of [...params]) if (!value) params.delete(key);
    params.set('offset', String(offset));
    const data = await api('/api/admin/submissions?' + params);
    lastTotal = data.total;
    const body = document.getElementById('submission-list');
    body.replaceChildren();
    if (!data.items.length) {
      const row = el('tr');
      const cell = el('td', 'No requests match these filters.');
      cell.colSpan = 5;
      row.append(cell); body.append(row);
    }
    for (const item of data.items) {
      const row = el('tr');
      const ref = el('td');
      ref.append(el('strong', item.reference), el('small', fmtTime(item.created_at)));
      const person = el('td');
      person.append(el('span', item.name || '(no name)'), el('small', (item.email || '') + (item.organization ? ' · ' + item.organization : '')));
      person.append(el('small', item.source === 'google_form' ? 'Google Form bridge' : 'Website'));
      const type = el('td', item.type);
      const status = el('td', stateName[item.status] || item.status);
      const action = el('td');
      const open = el('button', 'Open', 'secondary');
      open.type = 'button';
      open.addEventListener('click', () => openDetails(item.id).catch(e => say(e.message, true)));
      action.append(open);
      row.append(ref, person, type, status, action);
      body.append(row);
    }
    document.getElementById('page-info').textContent =
      lastTotal ? 'Showing ' + (offset + 1) + '–' + Math.min(offset + data.limit, lastTotal) + ' of ' + lastTotal : '0 results';
    document.getElementById('previous').disabled = offset <= 0;
    document.getElementById('next').disabled = offset + data.limit >= lastTotal;
  }
  document.getElementById('filters').addEventListener('submit', event => {
    event.preventDefault(); offset = 0;
    loadSubmissions().catch(e => say(e.message, true));
  });
  document.getElementById('previous').addEventListener('click', () => { offset = Math.max(0, offset - 30); loadSubmissions().catch(e => say(e.message, true)); });
  document.getElementById('next').addEventListener('click', () => { if (offset + 30 < lastTotal) offset += 30; loadSubmissions().catch(e => say(e.message, true)); });

  /* Details dialog */
  const dialog = document.getElementById('details');
  let current = null;
  document.getElementById('close-detail').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  async function openDetails(id) {
    const data = await api('/api/admin/submissions/' + id);
    current = data.item;
    document.getElementById('detail-title').textContent = data.item.reference + ' · ' + data.item.type;
    const box = document.getElementById('detail-content');
    box.replaceChildren();
    const list = el('dl');
    const rows = [
      ['Received', fmtTime(data.item.submitted_at)], ['Status', stateName[data.item.status] || data.item.status],
      ['Source', data.item.source === 'google_form' ? 'Google Form bridge' : 'Website'],
      ['Name', data.item.name], ['Email', data.item.email], ['Phone', data.item.phone],
      ['Organization', data.item.organization], ['Message', data.item.message]
    ];
    for (const [label, value] of rows) {
      if (!value) continue;
      list.append(el('dt', label), el('dd', value));
    }
    box.append(list);
    if (data.item.answers && data.item.answers.length) {
      box.append(el('h3', 'Google Form answers'));
      const answers = el('dl');
      for (const pair of data.item.answers) answers.append(el('dt', pair.question), el('dd', pair.answer || '—'));
      box.append(answers);
    }
    box.append(el('h3', 'Alert deliveries'));
    if (!data.notifications.length) box.append(el('p', 'No alert deliveries were recorded for this request.', 'muted'));
    for (const job of data.notifications) {
      const line = el('p', undefined, 'muted');
      const who = job.display_name || job.recipient_id;
      const detail = job.status === 'sent' ? 'sent ' + fmtTime(job.sent_at)
        : job.status + (job.attempts ? ' after ' + job.attempts + ' attempt(s)' : '') + (job.last_error ? ' — ' + job.last_error : '');
      line.textContent = who + ' (' + job.recipient_status + '): ' + detail;
      box.append(line);
    }
    const form = document.getElementById('detail-form');
    form.elements.status.value = data.item.status;
    form.elements.notes.value = data.item.notes || '';
    dialog.showModal();
  }
  document.getElementById('detail-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!current) return;
    try {
      await api('/api/admin/submissions/' + current.id, {
        method: 'PATCH',
        body: JSON.stringify({ status: event.target.elements.status.value, notes: event.target.elements.notes.value })
      });
      say('Saved ' + current.reference + '.');
      dialog.close();
      loadSubmissions().catch(() => {}); loadMetrics().catch(() => {});
    } catch (e) { say(e.message, true); }
  });
  document.getElementById('retry-one').addEventListener('click', async () => {
    if (!current) return;
    try {
      const result = await api('/api/admin/notifications/retry', { method: 'POST', body: JSON.stringify({ submissionId: current.id }) });
      say(result.queued ? 'Queued ' + result.queued + ' alert(s) for retry.' : 'No failed alerts for this request.');
    } catch (e) { say(e.message, true); }
  });
  document.getElementById('delete-one').addEventListener('click', async () => {
    if (!current) return;
    const typed = window.prompt('This permanently deletes ' + current.reference + ' and its delivery records. Type the reference to confirm:');
    if (typed === null) return;
    try {
      await api('/api/admin/submissions/' + current.id, { method: 'DELETE', body: JSON.stringify({ confirmation: typed }) });
      say('Deleted ' + current.reference + '.');
      dialog.close();
      loadSubmissions().catch(() => {}); loadMetrics().catch(() => {});
    } catch (e) { say(e.message, true); }
  });
  document.getElementById('retry-all').addEventListener('click', async () => {
    try {
      const result = await api('/api/admin/notifications/retry', { method: 'POST', body: JSON.stringify({}) });
      say(result.queued ? 'Queued ' + result.queued + ' failed alert(s) for retry.' : 'No failed alerts to retry.');
      loadMetrics().catch(() => {});
    } catch (e) { say(e.message, true); }
  });

  /* Recipients */
  async function loadRecipients() {
    const data = await api('/api/admin/recipients');
    const box = document.getElementById('recipient-list');
    box.replaceChildren();
    if (!data.items.length) box.append(el('p', 'No one has messaged the bot yet. Ask each organiser to send /start, then approve them here.', 'muted'));
    for (const person of data.items) {
      const card = el('div', undefined, 'recipient');
      card.append(el('h3', person.display_name || person.username || 'Telegram user ' + person.chat_id));
      const meta = el('p', undefined, 'muted');
      meta.textContent = (person.username ? '@' + person.username + ' · ' : '') + 'chat ' + person.chat_id + ' · requested ' + fmtTime(person.created_at);
      card.append(meta, el('p', 'Status: ' + person.status));
      const actions = el('div', undefined, 'actions');
      if (person.status !== 'approved') {
        const approve = el('button', 'Approve alerts');
        approve.type = 'button';
        approve.addEventListener('click', () => setRecipient(person.chat_id, 'approved'));
        actions.append(approve);
      }
      if (person.status !== 'revoked') {
        const revoke = el('button', 'Revoke alerts', 'danger');
        revoke.type = 'button';
        revoke.addEventListener('click', () => setRecipient(person.chat_id, 'revoked'));
        actions.append(revoke);
      }
      card.append(actions);
      box.append(card);
    }
  }
  async function setRecipient(chatId, status) {
    try {
      await api('/api/admin/recipients/' + chatId, { method: 'PATCH', body: JSON.stringify({ status }) });
      say('Recipient ' + status + '.');
      loadRecipients().catch(() => {}); loadMetrics().catch(() => {});
    } catch (e) { say(e.message, true); }
  }

  /* Settings */
  const settingsForm = document.getElementById('settings-form');
  function setField(name, value) {
    const field = settingsForm.elements[name];
    if (!field) return;
    if (field.type === 'checkbox') field.checked = value === true;
    else field.value = value === null || value === undefined ? '' : String(value);
  }
  async function loadSettings() {
    const data = await api('/api/admin/settings');
    const s = data.settings;
    setField('formsEnabled', s.formsEnabled);
    for (const key of ['enabled', 'title', 'subtitle', 'description', 'cta', 'date', 'venue', 'fee', 'registrationUrl', 'artwork', 'expiresAt'])
      setField('campaign.' + key, s.campaign[key]);
    setField('contact.email', s.contact.email);
    setField('contact.phone', s.contact.phone);
    setField('contact.address', s.contact.address);
    setField('privacy.retentionDays', s.privacy.retentionDays);
    const checks = Object.entries(data.service.checks).map(([name, ok]) => (ok ? '✓ ' : '✗ ') + name).join('   ');
    document.getElementById('readiness').textContent =
      'Campaign state: ' + data.campaignState + '. Service checks: ' + checks +
      (data.service.ready ? '. Forms go live when you enable them and every check passes.' : '. On-site forms stay off until every check passes.');
  }
  settingsForm.addEventListener('submit', async event => {
    event.preventDefault();
    const f = settingsForm.elements;
    const payload = {
      formsEnabled: f['formsEnabled'].checked,
      campaign: {
        enabled: f['campaign.enabled'].checked,
        title: f['campaign.title'].value, subtitle: f['campaign.subtitle'].value,
        description: f['campaign.description'].value, cta: f['campaign.cta'].value,
        date: f['campaign.date'].value, venue: f['campaign.venue'].value, fee: f['campaign.fee'].value,
        registrationUrl: f['campaign.registrationUrl'].value, artwork: f['campaign.artwork'].value,
        expiresAt: f['campaign.expiresAt'].value.trim() || null
      },
      contact: { email: f['contact.email'].value, phone: f['contact.phone'].value, address: f['contact.address'].value },
      privacy: { retentionDays: f['privacy.retentionDays'].value === '' ? 90 : Number(f['privacy.retentionDays'].value) }
    };
    try {
      await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(payload) });
      say('Settings saved. The public site picks up changes on its next load.');
      loadSettings().catch(() => {});
    } catch (e) { say(e.message, true); }
  });

  /* Logout */
  document.getElementById('logout').addEventListener('click', async () => {
    try { await api('/api/admin/logout', { method: 'POST', body: '{}' }); } catch { /* leave anyway */ }
    location.href = '/admin';
  });

  loadMetrics().then(loadSubmissions).catch(e => say(e.message, true));
})();
`;
