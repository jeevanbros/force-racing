/**
 * FORCE RACING // PIT WALL OPERATIONS
 * Client-Side Telemetry & Motion Graphics Engine
 * Zero external JS dependencies (Vanilla JS)
 */

document.addEventListener('DOMContentLoaded', () => {
  initThemeEngine();
  initSupraCountdown();
  initPasswordUtilities();
  initFlashToasts();
  initDeleteConfirmations();
  initFormSubmitSpinners();
  initMobileNavigation();
  initCameraCapture();
  initSearchHighlighting();
  dismissLockdownGatekeeper();
});

/* --------------------------------------------------------------------------
   1. THEME ENGINE (Dynamic Phone Theme Default & Dark / Light Mode)
   -------------------------------------------------------------------------- */
function initThemeEngine() {
  const STORAGE_KEY = 'force_theme';
  const toggleBtn = document.getElementById('theme-toggle');

  function getPhoneSystemTheme() {
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)
      ? 'light'
      : 'dark';
  }

  function getEffectiveTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }
    // Default strictly to phone/device system theme
    return getPhoneSystemTheme();
  }

  function applyTheme(theme, saveUserPreference = false) {
    document.documentElement.setAttribute('data-theme', theme);
    if (saveUserPreference) {
      localStorage.setItem(STORAGE_KEY, theme);
    }

    const meta = document.getElementById('meta-theme-color') || document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#f4f6fb' : '#090a0f');
    }

    if (toggleBtn) {
      const icon = toggleBtn.querySelector('i');
      if (icon) {
        if (theme === 'light') {
          icon.className = 'fa-solid fa-moon';
          toggleBtn.setAttribute('title', 'Switch to Pit Dark Mode');
          toggleBtn.setAttribute('aria-label', 'Switch to Pit Dark Mode');
        } else {
          icon.className = 'fa-solid fa-sun';
          toggleBtn.setAttribute('title', 'Switch to Aerodynamic Light Mode');
          toggleBtn.setAttribute('aria-label', 'Switch to Aerodynamic Light Mode');
        }
      }
    }
  }

  // 1. Apply initial theme defaulting strictly to phone theme (without forcing localStorage override)
  const initialTheme = getEffectiveTheme();
  applyTheme(initialTheme, false);

  // 2. User manual toggle button
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const active = document.documentElement.getAttribute('data-theme') || getPhoneSystemTheme();
      const nextTheme = active === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme, true);
    });
  }

  // 3. Live listener: Automatically adapt when phone switches between Light/Dark mode
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      // If user hasn't explicitly locked a preference in localStorage, auto-follow phone theme
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(e.matches ? 'light' : 'dark', false);
      }
    });
  }
}

/* --------------------------------------------------------------------------
   2. LIVE SUPRA SAEINDIA 2027 COUNTDOWN
   -------------------------------------------------------------------------- */
function initSupraCountdown() {
  const countdownContainer = document.querySelector('[data-supra-date]');
  const DEFAULT_SUPRA_2027 = '2027-01-22T08:00:00';
  let rawDate = countdownContainer ? countdownContainer.getAttribute('data-supra-date') : null;
  if (!rawDate) rawDate = DEFAULT_SUPRA_2027;

  let targetDate = new Date(rawDate).getTime();
  if (isNaN(targetDate)) {
    targetDate = new Date(DEFAULT_SUPRA_2027).getTime();
  }

  const daysEl = document.getElementById('countdown-days');
  const hoursEl = document.getElementById('countdown-hours');
  const minutesEl = document.getElementById('countdown-minutes');
  const secondsEl = document.getElementById('countdown-seconds');

  if (!daysEl && !hoursEl && !minutesEl && !secondsEl) return;

  function pad(num) {
    return String(num).padStart(2, '0');
  }

  function update() {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance <= 0) {
      if (daysEl) daysEl.textContent = '00';
      if (hoursEl) hoursEl.textContent = '00';
      if (minutesEl) minutesEl.textContent = '00';
      if (secondsEl) secondsEl.textContent = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    if (daysEl) daysEl.textContent = pad(days);
    if (hoursEl) hoursEl.textContent = pad(hours);
    if (minutesEl) minutesEl.textContent = pad(minutes);
    if (secondsEl) secondsEl.textContent = pad(seconds);
  }

  update();
  setInterval(update, 1000);
}

/* --------------------------------------------------------------------------
   3. PASSWORD STRENGTH & SHOW/HIDE
   -------------------------------------------------------------------------- */
function initPasswordUtilities() {
  document.querySelectorAll('input[type="password"]').forEach((pwdInput) => {
    const wrapper = pwdInput.closest('.password-wrapper') || pwdInput.parentElement;
    if (!wrapper || wrapper.querySelector('.password-toggle-btn')) return;

    wrapper.style.position = 'relative';

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'password-toggle-btn';
    toggleBtn.setAttribute('aria-label', 'Toggle password visibility');
    toggleBtn.innerHTML = '<i class="fa-solid fa-eye text-muted"></i>';
    toggleBtn.style.cssText = `
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      z-index: 5;
    `;

    toggleBtn.addEventListener('click', () => {
      const isPassword = pwdInput.type === 'password';
      pwdInput.type = isPassword ? 'text' : 'password';
      toggleBtn.innerHTML = isPassword
        ? '<i class="fa-solid fa-eye-slash text-lime"></i>'
        : '<i class="fa-solid fa-eye text-muted"></i>';
    });

    wrapper.appendChild(toggleBtn);
  });

  const targetPwd = document.querySelector('input[data-password-strength="true"], #password');
  if (targetPwd) {
    const parentGroup = targetPwd.closest('.form-group');
    if (parentGroup && !parentGroup.querySelector('.strength-meter')) {
      const meterEl = document.createElement('div');
      meterEl.className = 'strength-meter';
      meterEl.innerHTML = `
        <div class="strength-bar-track">
          <div class="strength-bar-fill" id="pwd-strength-bar"></div>
        </div>
        <div class="strength-label" id="pwd-strength-label">Password Strength: Empty</div>
      `;
      parentGroup.appendChild(meterEl);

      const barFill = meterEl.querySelector('#pwd-strength-bar');
      const labelText = meterEl.querySelector('#pwd-strength-label');

      targetPwd.addEventListener('input', () => {
        const val = targetPwd.value;
        const res = calculateStrength(val);

        if (barFill && labelText) {
          barFill.style.width = res.percent + '%';
          barFill.style.backgroundColor = res.color;
          labelText.textContent = 'Password Strength: ' + res.label;
          labelText.style.color = res.color;
        }
      });
    }
  }

  function calculateStrength(pwd) {
    if (!pwd) return { percent: 0, color: 'var(--border-default)', label: 'Empty' };
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (pwd.length >= 12) score += 15;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 20;
    if (/\d/.test(pwd)) score += 20;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 20;

    if (score < 40) return { percent: score, color: '#ef4444', label: 'Weak' };
    if (score < 70) return { percent: score, color: '#f59e0b', label: 'Moderate' };
    if (score < 90) return { percent: score, color: '#10b981', label: 'Strong' };
    return { percent: 100, color: 'var(--accent-lime)', label: 'Race Ready (Optimal)' };
  }
}

/* --------------------------------------------------------------------------
   4. TOAST DISMISSAL & UTILITIES
   -------------------------------------------------------------------------- */
function initFlashToasts() {
  document.querySelectorAll('.toast').forEach((toast) => {
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 6000);
  });
}

window.showPitToast = function(msg, category = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${category}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="fa-solid fa-circle-info"></i></div>
    <div class="toast-content">${msg}</div>
    <button type="button" class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
};

/* --------------------------------------------------------------------------
   5. CONFIRMATION MODALS
   -------------------------------------------------------------------------- */
function initDeleteConfirmations() {
  document.querySelectorAll('[data-confirm]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const message = btn.getAttribute('data-confirm');
      const itemTitle = btn.getAttribute('data-item-title') || 'this item';
      e.preventDefault();

      showCustomConfirmModal(message, itemTitle, () => {
        const form = btn.closest('form');
        if (form) form.submit();
      });
    });
  });

  function showCustomConfirmModal(message, itemTitle, onConfirm) {
    let modalEl = document.getElementById('pit-confirm-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'pit-confirm-modal';
      modalEl.className = 'modal-backdrop';
      modalEl.innerHTML = `
        <div class="modal-card card card-accent-red">
          <div class="modal-header">
            <h3 class="modal-title"><i class="fa-solid fa-triangle-exclamation text-red"></i> CONFIRM ACTION</h3>
            <button type="button" class="modal-close-x">&times;</button>
          </div>
          <div class="modal-body">
            <p id="pit-confirm-message"></p>
            <div id="pit-confirm-target" class="font-mono text-cyan" style="margin: 8px 0; font-size: 0.9rem;"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary modal-cancel-btn">CANCEL</button>
            <button type="button" class="btn btn-danger modal-confirm-btn"><i class="fa-solid fa-trash"></i> CONFIRM</button>
          </div>
        </div>
      `;
      document.body.appendChild(modalEl);
    }

    const msgEl = modalEl.querySelector('#pit-confirm-message');
    const targetEl = modalEl.querySelector('#pit-confirm-target');
    const cancelBtn = modalEl.querySelector('.modal-cancel-btn');
    const closeXBtn = modalEl.querySelector('.modal-close-x');
    const confirmBtn = modalEl.querySelector('.modal-confirm-btn');

    if (msgEl) msgEl.textContent = message;
    if (targetEl) targetEl.textContent = itemTitle;

    function closeModal() {
      modalEl.classList.remove('is-active');
      document.removeEventListener('keydown', handleKeydown);
    }

    function handleKeydown(e) {
      if (e.key === 'Escape') closeModal();
    }

    cancelBtn.onclick = closeModal;
    closeXBtn.onclick = closeModal;
    modalEl.onclick = (e) => {
      if (e.target === modalEl) closeModal();
    };

    confirmBtn.onclick = () => {
      closeModal();
      if (typeof onConfirm === 'function') onConfirm();
    };

    document.addEventListener('keydown', handleKeydown);
    modalEl.classList.add('is-active');
  }
}

/* --------------------------------------------------------------------------
   6. BUTTON LOADING SPINNER ON FORM SUBMISSION
   -------------------------------------------------------------------------- */
function initFormSubmitSpinners() {
  const forms = document.querySelectorAll('form:not([data-no-disable])');
  forms.forEach((form) => {
    form.addEventListener('submit', () => {
      if (!form.checkValidity || !form.checkValidity()) return;
      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn) {
        submitBtn.classList.add('is-loading');
        submitBtn.setAttribute('disabled', 'disabled');
        setTimeout(() => {
          submitBtn.classList.remove('is-loading');
          submitBtn.removeAttribute('disabled');
        }, 12000);
      }
    });
  });
}

/* --------------------------------------------------------------------------
   7. MOBILE NAVIGATION TOGGLE
   -------------------------------------------------------------------------- */
function initMobileNavigation() {
  const toggleBtn = document.getElementById('mobile-nav-toggle');
  const navWrapper = document.getElementById('nav-menu-wrapper');

  if (toggleBtn && navWrapper) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = navWrapper.classList.toggle('is-open');
      toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      const icon = toggleBtn.querySelector('i');
      if (icon) {
        icon.className = isOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
      }
    });

    navWrapper.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        navWrapper.classList.remove('is-open');
        const icon = toggleBtn.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-bars';
      });
    });
  }
}

/* --------------------------------------------------------------------------
   8. CAMERA CAPTURE / UPLOAD HANDLERS (CLEANED)
   Auto-injection of "Take Photo / Use Camera" buttons and file upload interception
   have been removed. Engineers select CAD files and engineering documents directly.
   -------------------------------------------------------------------------- */
function initCameraCapture() {
  // Disabled: Auto-injection and file upload interception removed.
  // Direct file selection enabled for all engineering uploads.
}

function openCameraModal() {}
function closeCameraModal() {}
function captureCameraSnapshot() {}
function openCameraSnapshot() {}

window.initCameraCapture = initCameraCapture;
window.openCameraModal = openCameraModal;
window.closeCameraModal = closeCameraModal;
window.captureCameraSnapshot = captureCameraSnapshot;
window.openCameraSnapshot = openCameraSnapshot;

/* --------------------------------------------------------------------------
   9. LIVE SEARCH TERM HIGHLIGHTING
   Interactively highlights search terms across cards, tables, titles, and
   names using <mark class="search-highlight"> without breaking DOM elements.
   -------------------------------------------------------------------------- */
function initSearchHighlighting() {
  // Inject highlighting styles if not already defined
  if (!document.getElementById('search-highlight-style')) {
    const style = document.createElement('style');
    style.id = 'search-highlight-style';
    style.textContent = `
      mark.search-highlight {
        background-color: rgba(227, 24, 55, 0.28);
        color: inherit;
        border-bottom: 2px solid var(--accent-red, #e31837);
        padding: 0 2px;
        border-radius: 2px;
        font-weight: 700;
      }
      [data-theme="dark"] mark.search-highlight,
      html[data-theme="dark"] mark.search-highlight {
        background-color: rgba(200, 255, 0, 0.28);
        border-bottom: 2px solid var(--accent-lime, #c8ff00);
      }
    `;
    document.head.appendChild(style);
  }

  const searchInputSelectors = [
    '#search-input',
    '#universal-search',
    '#garage-filter',
    'input[name="q"]',
    'input[name="search"]',
    '.search-input'
  ];

  const targetSelectors = [
    '.card',
    'table tbody tr',
    'table tr',
    '.car-card',
    '.car-title',
    '.member-name',
    '.search-results'
  ];

  function getTargetContainers() {
    const containers = [];
    targetSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        // Exclude inputs, navbars, and modals
        if (!el.closest('nav, .navbar, .modal-backdrop, #pit-permissions-modal, #camera-snapshot-modal, form')) {
          containers.push(el);
        }
      });
    });
    return Array.from(new Set(containers));
  }

  function unmark(root) {
    const marks = root.querySelectorAll('mark.search-highlight');
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
        parent.normalize();
      }
    });
  }

  function markTextNode(textNode, regex) {
    const text = textNode.nodeValue;
    if (!text || !regex.test(text)) return;
    regex.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIdx = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        fragment.appendChild(document.createTextNode(text.substring(lastIdx, match.index)));
      }
      const mark = document.createElement('mark');
      mark.className = 'search-highlight';
      mark.textContent = match[0];
      fragment.appendChild(mark);
      lastIdx = regex.lastIndex;
    }

    if (lastIdx < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIdx)));
    }

    if (textNode.parentNode) {
      textNode.parentNode.replaceChild(fragment, textNode);
    }
  }

  function highlightInElement(root, regex) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toUpperCase();
          if (['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'SVG', 'I', 'MARK'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.closest('mark.search-highlight, .btn, .badge, script, style')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodesToHighlight = [];
    while (walker.nextNode()) {
      nodesToHighlight.push(walker.currentNode);
    }

    nodesToHighlight.forEach((node) => {
      markTextNode(node, regex);
    });
  }

  function applyHighlighting(query) {
    const targets = getTargetContainers();
    targets.forEach((el) => unmark(el));

    const trimmed = (query || '').trim();
    if (trimmed.length === 0) return;

    const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) return;

    const pattern = '(' + words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')';
    const regex = new RegExp(pattern, 'gi');

    targets.forEach((el) => {
      highlightInElement(el, regex);
    });
  }

  let debounceTimer = null;
  function handleInput(e) {
    const val = e.target.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      applyHighlighting(val);
    }, 150);
  }

  // Attach live input listeners
  searchInputSelectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((input) => {
      input.addEventListener('input', handleInput);
      input.addEventListener('change', handleInput);
    });
  });

  // Highlight initial search query on page load (e.g. on search results page)
  let initialQuery = '';
  for (const sel of searchInputSelectors) {
    const input = document.querySelector(sel);
    if (input && input.value && input.value.trim()) {
      initialQuery = input.value.trim();
      break;
    }
  }

  if (!initialQuery && window.location.search) {
    const params = new URLSearchParams(window.location.search);
    initialQuery = params.get('q') || params.get('search') || '';
  }

  if (initialQuery) {
    setTimeout(() => {
      applyHighlighting(initialQuery);
    }, 100);
  }
}

window.initSearchHighlighting = initSearchHighlighting;

/* --------------------------------------------------------------------------
   10. LOCKDOWN & AUDIO REMOVAL / SAFE FALLBACK STUBS
   Ensures app is never locked or closed on startup.
   Harmless no-op stubs prevent console errors if legacy buttons are clicked.
   -------------------------------------------------------------------------- */
function dismissLockdownGatekeeper() {
  const modal = document.getElementById('pit-permissions-modal');
  if (modal) modal.style.display = 'none';

  const lockdownOverlay = document.getElementById('pit-lockdown-overlay');
  if (lockdownOverlay) lockdownOverlay.style.display = 'none';
}

window.startEngineRev = function() {};
window.stopEngineRev = function() {};
window.playEngineSound = function() {};
window.closeTerminalWindow = function() {};
window.restartPermissionFlow = function() {};
