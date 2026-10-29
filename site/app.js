(() => {
  const root = document.documentElement;
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  if (toggle && nav) {
    root.classList.add('js');
    const close = (returnFocus = false) => {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = 'Menu +';
      nav.dataset.open = 'false';
      if (returnFocus) toggle.focus();
    };
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close −' : 'Menu +';
      nav.dataset.open = String(open);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') close(true);
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.site-header') && toggle.getAttribute('aria-expanded') === 'true') close();
    });
    nav.addEventListener('click', e => { if (e.target.closest('a')) close(); });
    matchMedia('(min-width: 761px)').addEventListener('change', () => close());
  }
  const baseCampaign = { ...window.FORCE_CAMPAIGN };
  let campaign = { ...baseCampaign };
  const readableDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '')
    ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z')) : value;

  let expiryTimer;
  const active = () => campaign.enabled === true && (!campaign.expiresAt || Number.isFinite(Date.parse(campaign.expiresAt)) && Date.parse(campaign.expiresAt) > Date.now());
  function renderCampaign() {
    const on = active();
    root.dataset.campaignActive = String(on);
    document.querySelectorAll('[data-campaign-promo]').forEach(el => { el.hidden = !on; });
    document.querySelectorAll('a[href="campaign.html"]').forEach(link => {
      if (!link.closest('[data-campaign-content]') && !link.closest('[data-campaign-promo]')) link.hidden = !on;
    });
    for (const key of ['title', 'programme', 'date', 'venue', 'fee']) {
      document.querySelectorAll(`[data-campaign="${key}"], [data-campaign="${key === 'title' ? 'name' : key}"]`).forEach(el => {
        if (el.hasAttribute('data-home-title')) return; // Never overwrite home hero brand title
        if (typeof campaign[key] === 'string') el.textContent = key === 'date' ? readableDate(campaign[key]) : campaign[key];
      });
    }
    document.querySelectorAll('[data-register]').forEach(link => {
      try { const url = new URL(campaign.registrationUrl); if (url.protocol === 'https:') link.href = url.href; } catch { /* Keep static fallback. */ }
    });
    const hero = document.querySelector('[data-home-hero]');
    if (hero) {
      hero.dataset.campaignActive = String(on);
      // Ensure data-home-title is NOT overwritten by campaign render so DREAM. BUILD. RACE. stays permanent
      const homeTitle = hero.querySelector('[data-home-title]');
      if (homeTitle && !homeTitle.innerHTML.includes('DREAM.')) {
        homeTitle.innerHTML = 'DREAM. <span class="text-accent">BUILD.</span> <span class="text-outline">RACE.</span>';
      }
      const cta = hero.querySelector('[data-home-cta]');
      if (cta) {
        if (on) {
          cta.href = '#event';
          cta.innerHTML = '<svg class="icon-bolt" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block;vertical-align:-2px;margin-right:6px;" aria-hidden="true"><path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.08-.14C8.56 10.9 11.5 5.5 13 2h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C14.86 13.9 12 19.5 11 21z"/></svg> F1 Sim Racing Event <span class="hero-btn-pill">' + (campaign.programme || 'SUMSHODHINI ’26') + '</span>';
        } else {
          cta.href = 'cars.html';
          cta.innerHTML = 'Explore Fleet <svg class="icon-arrow" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 12.5L12.5 3.5M12.5 3.5H5.5M12.5 3.5V10.5"/></svg>';
        }
      }
    }
    document.querySelectorAll('[data-campaign-cta]').forEach(el => { el.textContent = campaign.cta || 'On-Spot Registration'; });
    document.querySelectorAll('[data-campaign-poster]').forEach(el => {
      el.hidden = !on || !campaign.poster;
      if (campaign.poster) {
        const img = el.querySelector('img'); img.src = campaign.poster;
        const link = el.querySelector('a'); if (link) link.href = campaign.posterOriginal || campaign.poster;
      }
    });
    document.querySelectorAll('[data-campaign-heading]').forEach(title => {
      const words = String(campaign.title).toUpperCase().split(' ');
      const last = document.createElement('span'); last.textContent = `${words.pop()}.`;
      const lead = words.join(' ');
      if (lead.startsWith('F1')) {
        const f = document.createElement('span');
        f.className = 'f-char';
        f.textContent = 'F';
        title.replaceChildren(f, `1${lead.slice(2)} `, last);
      } else {
        title.replaceChildren(`${lead} `, last);
      }
    });
    const content = document.querySelector('[data-campaign-content]');
    const inactive = document.querySelector('.campaign-inactive');
    if (content && inactive) {
      content.hidden = !on; inactive.hidden = on;
      const inactiveHeading = inactive.querySelector('.inactive-heading');
      if (on) { inactiveHeading.removeAttribute('role'); inactiveHeading.removeAttribute('aria-level'); }
      else { inactiveHeading.setAttribute('role', 'heading'); inactiveHeading.setAttribute('aria-level', '1'); }
      // Keep exactly one h1 while the inactive page uses the same accessible heading hierarchy.
      const heading = content.querySelector('h1');
      if (heading) heading.hidden = !on;
    }
    clearTimeout(expiryTimer);
    if (on && campaign.expiresAt) {
      const delay = Date.parse(campaign.expiresAt) - Date.now();
      expiryTimer = setTimeout(renderCampaign, Math.min(delay + 20, 2147483647));
    }
    document.dispatchEvent(new CustomEvent('force:campaign', { detail: { ...campaign, active: on } }));
  }
  window.ForceCampaign = {
    update(values) {
      if (!values || typeof values !== 'object') return;
      const next = { ...values };
      if (next.subtitle !== undefined) next.programme = next.subtitle;
      if (next.artwork) {
        try {
          const art = new URL(next.artwork, location.href);
          if (art.protocol !== 'https:' && art.origin !== location.origin) delete next.artwork;
          else if (!next.artworkMobile && next.artwork !== campaign.artwork) next.artworkMobile = next.artwork;
        } catch { delete next.artwork; }
      } else delete next.artwork;
      if (next.title && next.title !== baseCampaign.title && !('poster' in next)) next.poster = null;
      campaign = { ...campaign, ...next };
      renderCampaign();
    },
    get active() { return active(); },
    get config() { return { ...campaign }; }
  };
  renderCampaign();

  // Theme Toggle: Dark and Light Mode, remembered, with a token glide.
  const THEME_KEY = 'force_theme';
  const LEGACY_THEME_KEY = 'fr-theme';
  const rootEl = document.documentElement;
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const isLightTheme = () => rootEl.getAttribute('data-theme') === 'light';

  const savedTheme = () => {
    try {
      const saved = localStorage.getItem(THEME_KEY) || localStorage.getItem(LEGACY_THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {}
    return null;
  };

  const syncThemeUI = (theme) => {
    const light = theme === 'light';
    document.querySelectorAll('.theme-toggle').forEach((btn) => {
      const icon = btn.querySelector('.theme-icon');
      const text = btn.querySelector('.theme-text');
      if (icon) icon.textContent = String.fromCharCode(light ? 0x2600 : 0x263e);
      if (text) text.textContent = light ? 'LIGHT' : 'DARK';
      btn.setAttribute('aria-pressed', String(light));
      const label = light ? 'Switch to dark mode' : 'Switch to light mode';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    });
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      if ((m.getAttribute('media') || '').indexOf('light') !== -1) m.setAttribute('content', light ? '#f8fafc' : '#090b10');
    });
  };

  let glowTimer = null;
  const paintTheme = (theme, animate) => {
    if (animate && !reduced()) {
      rootEl.classList.add('theme-animating');
      clearTimeout(glowTimer);
      glowTimer = setTimeout(() => rootEl.classList.remove('theme-animating'), 640);
    } else {
      rootEl.classList.remove('theme-animating');
    }
    rootEl.setAttribute('data-theme', theme);
    syncThemeUI(theme);
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-toggle');
    if (!btn) return;
    e.preventDefault();
    const next = isLightTheme() ? 'dark' : 'light';
    paintTheme(next, true);
    try { localStorage.setItem(THEME_KEY, next); } catch (err) {}
  });

  if (window.matchMedia) {
    try {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      const onChange = (e) => { if (!savedTheme()) paintTheme(e.matches ? 'light' : 'dark', false); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    } catch (e) {}
  }

  // The inline head script already set the attribute, so this only paints the label.
  syncThemeUI(isLightTheme() ? 'light' : 'dark');

  // Seamless navigation: cross-page fade and in-page anchor glide.
  if (!reduced()) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href) return;

      // In-page anchor: smooth scroll, then a short glow on the target.
      if (href.charAt(0) === '#' && href.length > 1) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          target.classList.remove('target-highlighted');
          void target.offsetWidth;
          target.classList.add('target-highlighted');
          try { history.pushState(null, '', href); } catch (err) {}
        }
        return;
      }

      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target || a.hasAttribute('download')) return;
      let url;
      try { url = new URL(href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      // Modern browsers cross-fade the documents themselves.
      if ('startViewTransition' in document) return;
      e.preventDefault();
      document.body.classList.add('page-exit');
      setTimeout(() => { location.href = url.href; }, 170);
    });

    window.addEventListener('pageshow', () => {
      document.body.classList.remove('page-exit');
    });
  }
})();
