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
    matchMedia('(min-width: 981px)').addEventListener('change', () => close());
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
        if (typeof campaign[key] === 'string') el.textContent = key === 'date' ? readableDate(campaign[key]) : campaign[key];
      });
    }
    document.querySelectorAll('[data-register]').forEach(link => {
      try { const url = new URL(campaign.registrationUrl); if (url.protocol === 'https:') link.href = url.href; } catch { /* Keep static fallback. */ }
    });
    const hero = document.querySelector('[data-home-hero]');
    if (hero) {
      hero.dataset.campaignActive = String(on);
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
      title.replaceChildren(`${words.join(' ')} `, last);
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

  // Seamless Interactive Navigation & Quick Link Transitions
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.addEventListener('click', e => {
      const a = e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href) return;

      // Quick Link / Anchor smooth scroll & race glow pulse
      if (href.startsWith('#') && href.length > 1) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          target.classList.remove('target-highlighted');
          void target.offsetWidth;
          target.classList.add('target-highlighted');
          try { history.pushState(null, '', href); } catch(err) {}
        }
        return;
      }

      // Cross-page navigation transition
      if (a.target || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
        return;
      }
      if ('startViewTransition' in document) {
        return;
      }
      e.preventDefault();
      document.body.classList.add('page-exit');
      setTimeout(() => {
        window.location.href = href;
      }, 160);
    });

    window.addEventListener('pageshow', () => {
      document.body.classList.remove('page-exit');
    });
  }

  // Theme Toggle: Dark and Light Mode for Mobile & Windows/Desktop
  const updateThemeUI = (theme) => {
    const isLight = theme === 'light';
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isLight ? '#f8fafc' : '#090b10');
    }
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      const icon = btn.querySelector('.theme-icon');
      const text = btn.querySelector('.theme-text');
      if (icon) icon.textContent = isLight ? '☀️' : '🌙';
      if (text) text.textContent = isLight ? 'LIGHT' : 'DARK';
      btn.setAttribute('aria-label', isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode');
      btn.setAttribute('title', isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode');
    });
  };

  const initTheme = () => {
    let saved = null;
    try { saved = localStorage.getItem('force_theme'); } catch(e) {}
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const current = saved || (prefersLight ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', current);
    updateThemeUI(current);
  };

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('force_theme', next); } catch(e) {}
    updateThemeUI(next);
  };

  document.addEventListener('click', e => {
    const btn = e.target.closest('.theme-toggle');
    if (btn) {
      e.preventDefault();
      toggleTheme();
    }
  });

  try {
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
        if (!localStorage.getItem('force_theme')) {
          const next = e.matches ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', next);
          updateThemeUI(next);
        }
      });
    }
  } catch(e) {}

  initTheme();

  // Real-Time Visitor & Engagement Analytics (IP, Scroll Depth, Dwell Time)
  (() => {
    const startTime = Date.now();
    let maxScroll = 0;

    const calcScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (h <= 0) return 100;
      const pct = Math.min(100, Math.max(0, Math.round((window.scrollY / h) * 100)));
      if (pct > maxScroll) maxScroll = pct;
    };

    window.addEventListener('scroll', calcScroll, { passive: true });
    calcScroll();

    // Initial visit ping (captures IP and path immediately)
    const sendPing = (final = false) => {
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      const payload = JSON.stringify({
        path: window.location.pathname || '/',
        durationSeconds,
        maxScrollPercent: maxScroll
      });
      if (final && navigator.sendBeacon) {
        try {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon('/api/analytics/track', blob);
        } catch {
          navigator.sendBeacon('/api/analytics/track', payload);
        }
      } else {
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true
        }).catch(() => {});
      }
    };

    // First ping after 1 second
    setTimeout(() => sendPing(false), 1000);

    // Heartbeat every 20 seconds
    setInterval(() => sendPing(false), 20000);

    // Final exit beacon
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') sendPing(true);
    });
    window.addEventListener('pagehide', () => sendPing(true));
  })();
})();
