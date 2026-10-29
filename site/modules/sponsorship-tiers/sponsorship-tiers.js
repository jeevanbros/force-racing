/**
 * FORCE RACING // MODULAR SPONSORSHIP TIER MATRIX
 * SpaceX Standard: Equal First-Class Experience, Distinct Visual Identities,
 * Hardware-Accelerated Micro-Animations, Two-Way Interactive Sync.
 */
(function() {
  'use strict';

  // Tier configuration matrix
  const TIER_CONFIG = {
    title: {
      id: 'title',
      name: 'Title Partner',
      displayName: 'TITLE VIP',
      eyebrow: 'EXCLUSIVE // 1 SLOT',
      color: '#d9231d',
      allocation: '100%',
      focusArea: 'Aero & Driver Suits'
    },
    gold: {
      id: 'gold',
      name: 'Gold Partner',
      displayName: 'GOLD PARTNER',
      eyebrow: 'MOST POPULAR',
      color: '#ffd700',
      allocation: '80%',
      focusArea: 'Rear Wing & Livery'
    },
    silver: {
      id: 'silver',
      name: 'Silver Partner',
      displayName: 'SILVER PARTNER',
      eyebrow: 'AERODYNAMICS',
      color: '#e0e0e0',
      allocation: '60%',
      focusArea: 'Chassis & Sidepods'
    },
    bronze: {
      id: 'bronze',
      name: 'Bronze Partner',
      displayName: 'BRONZE PARTNER',
      eyebrow: 'GRASSROOTS FOUNDATION',
      color: '#cd7f32',
      allocation: '40%',
      focusArea: 'Chassis Patron Decal'
    }
  };

  let activeTierId = 'gold'; // Default popular baseline

  /**
   * Determine tier ID from card element
   */
  function detectTierId(card) {
    if (card.dataset.tier) return card.dataset.tier.toLowerCase();
    const text = card.textContent.toLowerCase();
    if (card.classList.contains('title-tier') || text.includes('title')) return 'title';
    if (card.classList.contains('featured-tier') || text.includes('gold')) return 'gold';
    if (text.includes('silver')) return 'silver';
    if (text.includes('bronze')) return 'bronze';
    return 'bronze';
  }

  /**
   * Mount interactive HUD status bar above tier grid
   */
  function ensureHudBar(grid) {
    const parent = grid.parentElement;
    if (!parent) return null;
    let hud = parent.querySelector('.fr-tier-hud-bar');
    if (!hud) {
      hud = document.createElement('div');
      hud.className = 'fr-tier-hud-bar';
      hud.setAttribute('role', 'status');
      hud.setAttribute('aria-live', 'polite');
      hud.innerHTML = `
        <div class="fr-tier-hud-label">
          <span class="fr-tier-hud-dot" aria-hidden="true"></span>
          <span>TELEMETRY ALLOCATION:</span>
          <span class="fr-tier-hud-val" id="fr-hud-tier-name">GOLD PARTNER // 80% QUOTA</span>
        </div>
        <div class="fr-tier-hud-sub" id="fr-hud-tier-meta" style="font-family:var(--gp-font-mono, monospace);opacity:0.85;">
          REAR WING &amp; LIVERY SUITE
        </div>
      `;
      parent.insertBefore(hud, grid);
    }
    return hud;
  }

  /**
   * Update the HUD display
   */
  function updateHud(tierId) {
    const config = TIER_CONFIG[tierId] || TIER_CONFIG.bronze;
    const nameEl = document.getElementById('fr-hud-tier-name');
    const metaEl = document.getElementById('fr-hud-tier-meta');
    const dotEl = document.querySelector('.fr-tier-hud-dot');

    if (nameEl) {
      nameEl.textContent = `${config.displayName} // ${config.allocation} QUOTA`;
      nameEl.style.color = config.color;
    }
    if (metaEl) {
      metaEl.textContent = `${config.focusArea.toUpperCase()} INTEGRATION`;
    }
    if (dotEl) {
      dotEl.style.background = config.color;
      dotEl.style.boxShadow = `0 0 8px ${config.color}`;
    }
  }

  /**
   * Apply selection state to cards and trigger sync
   */
  function selectTier(tierId, triggerScroll = true) {
    const config = TIER_CONFIG[tierId];
    if (!config) return;

    activeTierId = tierId;
    const cards = document.querySelectorAll('#tiers .tier-card, .fr-tier-card');

    cards.forEach(card => {
      const cardTierId = card.getAttribute('data-tier');
      const isTarget = cardTierId === tierId;
      const pill = card.querySelector('.fr-tier-active-pill');

      if (isTarget) {
        card.classList.add('is-selected');
        card.setAttribute('aria-checked', 'true');
        card.setAttribute('tabindex', '0');
        if (pill) pill.textContent = 'PROTOCOL ENGAGED';
      } else {
        card.classList.remove('is-selected');
        card.setAttribute('aria-checked', 'false');
        card.setAttribute('tabindex', '-1');
        if (pill) pill.textContent = 'SELECT PROTOCOL';
      }
    });

    updateHud(tierId);
    syncWithForm(config, triggerScroll);
  }

  /**
   * Synchronize selection with the proposal form on support.html
   */
  function syncWithForm(config, triggerScroll) {
    const select = document.getElementById('sponsor-tier');
    const formSection = document.getElementById('sponsor');

    if (select) {
      // Find matching option
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value.toLowerCase().includes(config.name.toLowerCase().split(' ')[0])) {
          select.selectedIndex = i;
          break;
        }
      }
    }

    if (formSection) {
      // Reveal form smoothly
      formSection.hidden = false;
      formSection.style.display = '';

      // Delegate to forms.js selectSponsorshipTier if available
      if (typeof window.selectSponsorshipTier === 'function') {
        window.selectSponsorshipTier(config.name);
      } else {
        formSection.dataset.tierTheme = config.id;
      }

      // Add tactile highlight flash
      formSection.classList.remove('fr-sync-highlight');
      // Reflow trigger for restartable animation
      void formSection.offsetWidth;
      formSection.classList.add('fr-sync-highlight');

      if (triggerScroll) {
        // Smooth ergonomic scroll with target offset
        const yOffset = -24;
        const y = formSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });

        // Gently focus the first field or the select element
        const targetInput = formSection.querySelector('#sponsor-name') || select;
        if (targetInput) {
          setTimeout(() => {
            targetInput.focus({ preventScroll: true });
          }, 450);
        }
      }
    }
  }

  /**
   * Initialize module
   */
  function initSponsorshipModule() {
    const grid = document.querySelector('#tiers .tier-grid, .sponsorship-tier-grid');
    if (!grid) return;

    grid.setAttribute('role', 'radiogroup');
    grid.setAttribute('aria-label', 'Championship Partnership Tiers');

    ensureHudBar(grid);

    const cards = grid.querySelectorAll('.tier-card');
    cards.forEach((card, index) => {
      const tierId = detectTierId(card);
      card.setAttribute('data-tier', tierId);
      card.setAttribute('role', 'radio');
      card.classList.add('fr-tier-card');

      const config = TIER_CONFIG[tierId] || TIER_CONFIG.bronze;
      card.setAttribute('aria-label', `${config.displayName} — ${config.allocation} Allocation`);

      // Inject sheen element if absent
      if (!card.querySelector('.fr-tier-sheen')) {
        const sheen = document.createElement('div');
        sheen.className = 'fr-tier-sheen';
        sheen.setAttribute('aria-hidden', 'true');
        card.appendChild(sheen);
      }

      // Inject active indicator pill if absent
      if (!card.querySelector('.fr-tier-active-pill')) {
        const pill = document.createElement('span');
        pill.className = 'fr-tier-active-pill';
        pill.setAttribute('aria-hidden', 'true');
        pill.textContent = 'PROTOCOL ENGAGED';
        card.appendChild(pill);
      }

      // Equal button styling
      const btn = card.querySelector('.tier-btn');
      if (btn) {
        btn.classList.add('fr-tier-btn');
        btn.setAttribute('tabindex', '-1'); // Card itself is the interactive radio
      }

      // Click / Tap listener on whole card
      card.addEventListener('click', function(e) {
        e.preventDefault();
        selectTier(tierId, true);
      });

      // Keyboard navigation (WAI-ARIA Roving Tabindex for Radiogroup)
      card.addEventListener('keydown', function(e) {
        let newIndex = -1;
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          selectTier(tierId, true);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          newIndex = (index + 1) % cards.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          newIndex = (index - 1 + cards.length) % cards.length;
        }

        if (newIndex >= 0) {
          const nextCard = cards[newIndex];
          nextCard.focus();
          const nextTierId = nextCard.getAttribute('data-tier');
          selectTier(nextTierId, false);
        }
      });
    });

    // Two-way sync: listen for changes on the form select dropdown
    const select = document.getElementById('sponsor-tier');
    if (select) {
      select.addEventListener('change', function() {
        const val = select.value.toLowerCase();
        let targetId = 'gold';
        if (val.includes('title')) targetId = 'title';
        else if (val.includes('gold')) targetId = 'gold';
        else if (val.includes('silver')) targetId = 'silver';
        else if (val.includes('bronze')) targetId = 'bronze';
        selectTier(targetId, false);
      });
    }

    // Check URL hash for direct deep-linking
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('bronze')) selectTier('bronze', false);
    else if (hash.includes('silver')) selectTier('silver', false);
    else if (hash.includes('title') || hash.includes('vip')) selectTier('title', false);
    else selectTier('gold', false); // Default active tier
  }

  // Public API
  window.ForceSponsorshipTiers = {
    selectTier: selectTier,
    getActiveTier: () => activeTierId,
    config: TIER_CONFIG
  };

  // Safe DOM ready invocation
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSponsorshipModule);
  } else {
    initSponsorshipModule();
  }
})();
