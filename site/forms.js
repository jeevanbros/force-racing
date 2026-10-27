/* Public forms: same-origin API with Google Apps Script fallback. No API secrets. */
(() => {
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyD9CNFpiQo41pQn1KARMFg1G03iMlkfumR6hFYWBZpCDDAahlCFej90HHjMrojlwtw/exec';
  const forms = [...document.querySelectorAll('[data-form]')];
  const states = new Map(forms.map(form => [form, { enabled: true, busy: false, key: null, token: '', widget: null }]));

  const status = (form, message, state = '', focus = false) => {
    const el = form.querySelector('.form-status');
    if (!el) return;
    el.innerHTML = message;
    el.dataset.state = state;
    if (focus) el.focus();
  };

  const fields = form => ['name', 'email', 'phone', 'organization', 'message', 'consent'].map(name => form.elements.namedItem(name));

  function clearErrors(form) {
    fields(form).forEach(field => {
      if (!field) return;
      field.removeAttribute('aria-invalid');
      const hint = document.getElementById(`${field.id}-error`);
      if (hint) {
        hint.hidden = true;
        hint.textContent = '';
      }
    });
    const summary = form.querySelector('.error-summary');
    if (summary) {
      summary.hidden = true;
      summary.replaceChildren();
    }
  }

  function validate(form) {
    clearErrors(form);
    const errors = [];
    const registration = form.dataset.form === 'registration';
    const check = (name, message, invalid) => {
      if (!invalid) return;
      const field = form.elements.namedItem(name);
      if (!field) return;
      field.setAttribute('aria-invalid', 'true');
      const hint = document.getElementById(`${field.id}-error`);
      if (hint) {
        hint.textContent = `Error: ${message}`;
        hint.hidden = false;
      }
      errors.push({ field, message });
    };
    const value = name => {
      const el = form.elements.namedItem(name);
      return el ? el.value.trim() : '';
    };

    check('name', 'Enter your name.', !value('name'));
    check('email', 'Enter a valid email address (mandatory).', !value('email') || (form.elements.email && form.elements.email.validity.typeMismatch) || value('email').length > 200);
    check('phone', 'Enter your mobile number with 7 to 15 digits (mandatory).', !value('phone') || !/^\+?[\d\s().-]+$/.test(value('phone')) || value('phone').replace(/\D/g, '').length < 7 || value('phone').replace(/\D/g, '').length > 15);
    check('organization', 'Enter your college, institution or organization (mandatory).', !value('organization'));
    check('message', 'Enter a message for the team.', !registration && !value('message'));
    check('consent', 'Please agree to the privacy notice to send this request.', form.elements.consent && !form.elements.consent.checked);

    if (!errors.length) return true;
    const summary = form.querySelector('.error-summary');
    if (summary) {
      const title = document.createElement('p');
      title.textContent = `Please fix ${errors.length === 1 ? 'this field' : 'these fields'} before sending:`;
      const list = document.createElement('ul');
      errors.forEach(({field, message}) => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#${field.id}`;
        link.textContent = message;
        link.addEventListener('click', e => { e.preventDefault(); field.focus(); });
        li.append(link); list.append(li);
      });
      summary.append(title, list); summary.hidden = false; summary.focus();
    }
    return false;
  }

  // Pre-enable submit buttons
  forms.forEach(form => {
    const btn = form.querySelector('button[type=submit]');
    if (btn) {
      btn.disabled = false;
      btn.setAttribute('aria-disabled', 'false');
    }
  });

  for (const form of forms) {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const state = states.get(form);
      if (state.busy) return;
      if (!validate(form)) return;

      if (!state.key) state.key = crypto.randomUUID();
      const payload = Object.fromEntries(
        ['name', 'email', 'phone', 'organization', 'message', 'website', 'tier']
          .filter(name => form.elements.namedItem(name))
          .map(name => [name, form.elements.namedItem(name).value.trim()])
      );
      Object.assign(payload, { type: form.dataset.form, consent: form.elements.consent ? form.elements.consent.checked : true, idempotencyKey: state.key });
      if (state.token) payload.turnstileToken = state.token;

      // Handle optional screenshot file
      const fileInput = form.querySelector('input[type=file]');
      if (fileInput && fileInput.files && fileInput.files[0]) {
        try {
          const file = fileInput.files[0];
          payload.screenshotBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
        } catch (e) {}
      }

      state.busy = true;
      const button = form.querySelector('button[type=submit]');
      const originalLabel = button.innerHTML;
      button.disabled = true; button.setAttribute('aria-busy', 'true'); button.textContent = 'Transmitting…';
      form.setAttribute('aria-busy', 'true');
      status(form, 'Transmitting to race control…');

      let successData = null;

      // Try worker API first
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        const response = await fetch('/api/submissions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload), signal: controller.signal, credentials: 'same-origin'
        });
        clearTimeout(timer);
        if (response.ok) {
          successData = await response.json();
        }
      } catch (err) {}

      // Fallback directly to Google Apps Script if worker endpoint failed or local preview
      if (!successData || !successData.ok) {
        try {
          const scriptRes = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
          });
          const resJson = await scriptRes.json();
          if (resJson.status === 'success') {
            successData = { ok: true, reference: resJson.passId || resJson.reference, verifyUrl: resJson.verifyUrl, qrUrl: resJson.qrUrl };
          }
        } catch (errFallback) {}
      }

      state.busy = false; button.disabled = false; button.removeAttribute('aria-busy'); button.innerHTML = originalLabel;
      form.removeAttribute('aria-busy');

      if (successData && (successData.ok || successData.reference)) {
        const ref = successData.reference || successData.passId || 'CONFIRMED';
        form.reset(); clearErrors(form); state.key = null;
        if (form.dataset.form === 'registration') {
          const verifyLink = `verify.html?pass=${encodeURIComponent(ref)}`;
          status(form, `<strong>🏁 REGISTRATION SUCCESSFUL!</strong><br>Your Official Pilot Pass: <span style="font-family:monospace;font-size:1.2rem;color:#00f0ff;font-weight:900;">${ref}</span><br>A confirmation email with your scannable QR Pass has been dispatched to your email address.<br><a href="${verifyLink}" style="display:inline-block;margin-top:8px;color:#fff;font-weight:bold;text-decoration:underline;">View Trackside Credential & Upload Payment Screenshot &rarr;</a>`, 'success', true);
        } else if (form.dataset.form === 'recruitment') {
          status(form, `<strong>🏁 APPLICATION TRANSMITTED!</strong><br>Candidate Reference: <span style="font-family:monospace;font-size:1.2rem;color:#ff1801;font-weight:900;">${ref}</span><br>A welcoming email with your Interview Pass and preparation guidelines has been dispatched to your email. Subsystem leads will contact you shortly for your Central Workshop interview.`, 'success', true);
        } else {
          status(form, `Your enquiry has been received. Reference: <strong>${ref}</strong>. The Force Racing management team will follow up promptly.`, 'success', true);
        }
      } else {
        status(form, 'Submission failed. Please check your network connection or contact team organizers directly at <a href="mailto:team.force.racing.kitsw@gmail.com">team.force.racing.kitsw@gmail.com</a>.', 'error', true);
      }
    });
  }

  window.selectSponsorshipTier = function(tier) {
    const select = document.getElementById('sponsor-tier');
    if (select) select.value = tier;
    const formSection = document.getElementById('sponsor');
    if (formSection) {
      const slug = tier.toLowerCase().includes('title') ? 'title' :
                   tier.toLowerCase().includes('gold') ? 'gold' :
                   tier.toLowerCase().includes('silver') ? 'silver' :
                   tier.toLowerCase().includes('bronze') ? 'bronze' : 'custom';
      formSection.dataset.tierTheme = slug;
      const heading = formSection.querySelector('.form-heading h2');
      const eyebrow = formSection.querySelector('.form-heading .eyebrow');
      if (heading && eyebrow) {
        if (slug === 'title') {
          eyebrow.textContent = '👑 VIP Executive Partnership // Exclusive Protocol';
          heading.innerHTML = 'PARTNER WITH<br><span style="color:#ff1801;text-shadow:0 0 20px rgba(255,24,1,0.6)">TITLE VIP.</span>';
        } else if (slug === 'gold') {
          eyebrow.textContent = '🏆 Championship Gold Partner // Aerodynamics Suite';
          heading.innerHTML = 'PARTNER WITH<br><span style="color:#ffd700;text-shadow:0 0 20px rgba(255,215,0,0.5)">GOLD TIER.</span>';
        } else if (slug === 'silver') {
          eyebrow.textContent = '⚡ Championship Silver Partner // Chassis Suite';
          heading.innerHTML = 'PARTNER WITH<br><span style="color:#e0e0e0;text-shadow:0 0 20px rgba(220,220,220,0.5)">SILVER TIER.</span>';
        } else if (slug === 'bronze') {
          eyebrow.textContent = '🛡️ Grassroots Patron Partner // Team Foundation';
          heading.innerHTML = 'PARTNER WITH<br><span style="color:#cd7f32;text-shadow:0 0 20px rgba(205,127,50,0.5)">BRONZE TIER.</span>';
        }
      }
      formSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  function applyCampaign(campaign) {
    if (!campaign || typeof campaign !== 'object') return;
    window.ForceCampaign?.update(campaign);
  }

  async function configure() {
    if (location.protocol === 'file:') return;
    try {
      const response = await fetch('/api/public/config', { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
      if (!response.ok) return;
      const config = await response.json();
      applyCampaign(config.campaign);
    } catch {}
  }

  configure();
})();
