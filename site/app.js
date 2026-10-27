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
        if (typeof campaign[key] === 'string') el.textContent = key === 'date' ? readableDate(campaign[key]) : campaign[key];
      });
    }
    document.querySelectorAll('[data-register]').forEach(link => {
      try { const url = new URL(campaign.registrationUrl); if (url.protocol === 'https:') link.href = url.href; } catch { /* Keep static fallback. */ }
    });
    const hero = document.querySelector('[data-home-hero]');
    if (hero) {
      hero.dataset.campaignActive = String(on);
      hero.querySelector('[data-home-eyebrow]').textContent = on ? `${campaign.programme || 'Campus event'} · KITS Warangal` : 'Formula Student · KITS Warangal';
      hero.querySelector('[data-home-meta]').textContent = on ? `${readableDate(campaign.date)} · ${campaign.venue}` : 'Student built. Race driven.';
      const title = hero.querySelector('[data-home-title]');
      title.replaceChildren();
      if (on) {
        const words = String(campaign.title).toUpperCase().split(' ');
        const emphasis = document.createElement('span'); emphasis.textContent = `${words.pop()}.`;
        title.append(`${words.join(' ')} `, emphasis);
      } else { title.innerHTML = 'DREAM. BUILD. <span>RACE.</span>'; }
      const picture = hero.querySelector('[data-home-picture]');
      const img = hero.querySelector('[data-home-artwork]');
      img.src = on ? campaign.artwork : 'assets/images/hero-landscape.webp';
      img.alt = on ? campaign.artworkAlt || 'Campaign concept artwork for sim racing.' : 'Force Racing FR 26 on the pit lane at Buddh International Circuit.';
      const source = picture.querySelector('source');
      source.srcset = on ? campaign.artworkMobile || campaign.artwork : 'assets/images/hero-landscape.webp';
      const description = hero.querySelector('[data-home-description]');
      description.textContent = on ? `Your turn at the wheel. ${campaign.fee}.` : 'From a workshop in Warangal. To a world of possibility.';
      const cta = hero.querySelector('[data-home-cta]');
      cta.href = on ? 'campaign.html#register' : 'cars.html';
      const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      arrow.setAttribute('class', 'icon-arrow');
      arrow.setAttribute('width', '15');
      arrow.setAttribute('height', '15');
      arrow.setAttribute('viewBox', '0 0 16 16');
      arrow.setAttribute('fill', 'none');
      arrow.setAttribute('stroke', 'currentColor');
      arrow.setAttribute('stroke-width', '2.2');
      arrow.setAttribute('stroke-linecap', 'round');
      arrow.setAttribute('stroke-linejoin', 'round');
      arrow.setAttribute('aria-hidden', 'true');
      const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      arrowPath.setAttribute('d', 'M3.5 12.5L12.5 3.5M12.5 3.5H5.5M12.5 3.5V10.5');
      arrow.appendChild(arrowPath);
      cta.replaceChildren(on ? campaign.cta || 'Explore & register' : 'Meet the machines', arrow);
      hero.querySelector('[data-home-artwork-label]').textContent = on ? campaign.artworkLabel || 'Campaign concept artwork' : 'FR 26 / SUPRA SAE INDIA 2026';
    }
    document.querySelectorAll('[data-campaign-cta]').forEach(el => { el.textContent = campaign.cta || 'Register for sim racing'; });
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
})();
