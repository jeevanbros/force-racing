import fs from 'node:fs';

const portalPath = 'C:/Users/ijk11/forceracing-website/site/portal.html';
const samplePath = 'C:/Users/ijk11/forceracing-website/site/portal-sample.html';

let html = fs.readFileSync(portalPath, 'utf8');

// =========================================================================
// 1. COMPLETELY REMOVE DEMO SWITCHER & DEMO CSS
// =========================================================================
const demoCssRegex = /\/\* Demo Quick Testing Bar \*\/[\s\S]*?\.btn-demo-pill:hover \{[\s\S]*?\}/;
html = html.replace(demoCssRegex, '/* Demo bar removed for production deployment */');

const demoHtmlRegex = /<!-- 1-Click Demo Testing Account Switcher -->[\s\S]*?<div class="demo-role-bar">[\s\S]*?<\/div>\s*<\/div>/;
html = html.replace(demoHtmlRegex, '');

// =========================================================================
// 2. THEME SYNC SCRIPT IN <HEAD> & CSS OVERRIDES
// =========================================================================
const themeScript = `<script>
    (function() {
      function syncWebsiteTheme() {
        try {
          const stored = localStorage.getItem("force_theme");
          const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
          const active = stored || (prefersLight ? "light" : "dark");
          document.documentElement.setAttribute("data-theme", active);
        } catch(e) {}
      }
      syncWebsiteTheme();
      window.addEventListener("storage", function(e) {
        if (e.key === "force_theme") syncWebsiteTheme();
      });
      window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", function() {
        if (!localStorage.getItem("force_theme")) syncWebsiteTheme();
      });
    })();
  </script>`;

if (!html.includes('syncWebsiteTheme')) {
  html = html.replace('<head>', '<head>\n  ' + themeScript);
}

// Ensure professional title & brand heading
html = html.replace(
  /<title>.*?<\/title>/,
  '<title>Engineering Operations Hub — Force Racing // KITS Warangal</title>'
);
html = html.replace(
  /<small>PIT WALL OPERATIONS PORTAL<\/small>/g,
  '<small>ENGINEERING OPERATIONS HUB</small>'
);
html = html.replace(
  'title="Click to refresh Pit Wall operations"',
  'title="Click to refresh Operations Hub"'
);
html = html.replace(
  '<button type="submit" class="btn-submit">ENTER PIT WALL</button>',
  '<button type="submit" class="btn-submit">ENTER OPERATIONS HUB</button>'
);
html = html.replace(
  /showToast\('Pit Wall Portal refreshed\.'\);/g,
  "showToast('Engineering Operations Hub refreshed.');"
);

// Light theme overrides matching website
const lightThemeCss = `
    /* ========================================================
       WEBSITE THEME SYNC: LIGHT THEME OVERRIDES
       Matches website theme when data-theme="light"
       ======================================================== */
    [data-theme="light"] {
      --gp-bg: #f8fafc;
      --gp-bg-sunk: #edf2f7;
      --gp-surface: #ffffff;
      --gp-surface-elevated: #f1f5f9;
      --gp-surface-hover: #e2e8f0;
      --gp-ink: #0b0f19;
      --gp-ink-2: #334155;
      --gp-ink-3: #64748b;
      --gp-line: rgba(15, 23, 42, 0.12);
      --gp-line-2: rgba(15, 23, 42, 0.22);
      --gp-accent: #e10600;
      --gp-accent-sunk: #b80500;
      --gp-cyan: #0284c7;
      --gp-gold: #d97706;
      --gp-ok: #059669;
      --gp-offline: #dc2626;
      --gp-card-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
    }

    [data-theme="light"] body {
      background-color: var(--gp-bg);
      background-image: 
        radial-gradient(circle at 50% 0%, rgba(225, 6, 0, 0.05) 0%, transparent 45%),
        radial-gradient(circle at 90% 20%, rgba(2, 132, 199, 0.04) 0%, transparent 35%);
      color: var(--gp-ink);
    }
    [data-theme="light"] header {
      background: #ffffff;
      border-bottom: 1px solid var(--gp-line);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    }
    [data-theme="light"] .form-control {
      background: #ffffff;
      border-color: rgba(15, 23, 42, 0.18);
      color: #0b0f19;
    }
    [data-theme="light"] .chat-input {
      background: #ffffff;
      border-color: rgba(15, 23, 42, 0.18);
      color: #0b0f19;
    }
    [data-theme="light"] .member-card {
      background: #f8fafc;
    }
    [data-theme="light"] .member-card:hover {
      background: #f1f5f9;
    }
    [data-theme="light"] .task-card {
      background: #f8fafc;
    }
    [data-theme="light"] .task-file-box {
      background: #ffffff;
      border-color: var(--gp-line);
    }
    [data-theme="light"] .chat-msg-received {
      background: #f1f5f9;
      color: #0b0f19;
      border-color: var(--gp-line);
    }
    [data-theme="light"] .chat-reply-banner {
      background: #edf2f7;
      border-color: var(--gp-line);
    }
    [data-theme="light"] .file-card {
      background: #f8fafc;
    }
    [data-theme="light"] .history-item {
      background: #f8fafc;
    }
`;

if (!html.includes('WEBSITE THEME SYNC: LIGHT THEME OVERRIDES')) {
  html = html.replace('/* Automatic OS Light Mode Synchronization */', lightThemeCss + '\n    /* Automatic OS Light Mode Synchronization */');
}

// =========================================================================
// 3. EXIT CONFIRMATION MODAL & AUTO-LOGOUT TIMER (15 MINUTES)
// =========================================================================
const exitModalHtml = `
  <!-- ========================================================== -->
  <!-- EXIT CONFIRMATION MODAL (BACK BUTTON INTERCEPTION)         -->
  <!-- ========================================================== -->
  <div class="modal-overlay" id="exit-confirm-modal" style="display:none; z-index:9999;">
    <div class="modal-card" style="max-width:480px; text-align:center; padding:28px 24px;">
      <div style="font-size:2.8rem; margin-bottom:12px;">🛡️</div>
      <h3 style="font-family:var(--gp-font-head); font-size:1.6rem; margin-bottom:8px;">LEAVING OPERATIONS HUB?</h3>
      <p style="font-size:0.9rem; color:var(--gp-ink-2); margin-bottom:20px; line-height:1.5;" id="exit-modal-desc">
        You are currently signed in. Choose how you would like to proceed:
      </p>

      <div style="display:flex; flex-direction:column; gap:10px;">
        <button type="button" class="btn-submit" style="margin-top:0; background:var(--gp-cyan); color:#000;" onclick="handleStayOnHub()">
          🛡️ Stay on Operations Hub
        </button>

        <button type="button" class="btn-submit" style="margin-top:0; background:transparent; border:1px solid var(--gp-line-2); color:var(--gp-ink);" onclick="handleStaySignedInAndExit()">
          ⏳ Stay Signed In & Exit (Auto Signs Out in 15 Min)
        </button>

        <button type="button" class="btn-submit" style="margin-top:0; background:rgba(239,68,68,0.15); border:1px solid var(--gp-offline); color:var(--gp-offline);" onclick="handleSignOutAndExit()">
          🚪 Sign Out & Exit Now
        </button>
      </div>
    </div>
  </div>
`;

if (!html.includes('id="exit-confirm-modal"')) {
  html = html.replace('</body>', exitModalHtml + '\n</body>');
}

// JavaScript logic for exit modal and 15-minute auto-signout
const exitJsCode = `
    // ============================================================
    // EXIT INTERCEPTION & 15-MINUTE AUTO-LOGOUT ENGINE
    // ============================================================
    let lastUserActivity = Date.now();
    const AUTO_LOGOUT_MS = 15 * 60 * 1000; // 15 minutes (between 10-20 min)

    function updateActivityTimestamp() {
      lastUserActivity = Date.now();
      if (currentUser) {
        localStorage.setItem('force_portal_last_active', String(lastUserActivity));
      }
    }

    // Track user interaction
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
      window.addEventListener(evt, updateActivityTimestamp, { passive: true });
    });

    // Inactivity checker every 20 seconds
    setInterval(() => {
      if (!currentUser) return;
      const lastActive = parseInt(localStorage.getItem('force_portal_last_active') || String(lastUserActivity), 10);
      if (Date.now() - lastActive > AUTO_LOGOUT_MS) {
        handleAutoLogoutDueToInactivity();
      }
    }, 20000);

    function handleAutoLogoutDueToInactivity() {
      showToast('⏳ Session expired after 15 minutes of inactivity. Signed out.');
      handleLogout();
    }

    // Browser back button interception
    function setupBackNavigationProtection() {
      if (window.history && window.history.pushState) {
        window.history.pushState({ inPortal: true }, document.title, window.location.href);
        window.addEventListener('popstate', function(e) {
          if (currentUser) {
            // User tried to navigate back while signed in!
            window.history.pushState({ inPortal: true }, document.title, window.location.href);
            promptExitOptions();
          }
        });
      }
    }

    function promptExitOptions() {
      if (!currentUser) return;
      const modal = document.getElementById('exit-confirm-modal');
      const desc = document.getElementById('exit-modal-desc');
      if (desc) {
        desc.innerHTML = 'You are currently active as <strong>' + currentUser.name + '</strong> (' + currentUser.role + ').<br>Do you want to stay working, exit while staying signed in (expires in 15 min), or sign out?';
      }
      if (modal) modal.style.display = 'flex';
    }

    function handleStayOnHub() {
      const modal = document.getElementById('exit-confirm-modal');
      if (modal) modal.style.display = 'none';
      updateActivityTimestamp();
      showToast('Continuing session in Operations Hub.');
    }

    function handleSignOutAndExit() {
      const modal = document.getElementById('exit-confirm-modal');
      if (modal) modal.style.display = 'none';
      handleLogout();
      window.location.href = '/';
    }

    function handleStaySignedInAndExit() {
      const modal = document.getElementById('exit-confirm-modal');
      if (modal) modal.style.display = 'none';
      // Mark session expiry for 15 minutes
      localStorage.setItem('force_portal_session_expiry', String(Date.now() + AUTO_LOGOUT_MS));
      window.location.href = '/';
    }

    // Check on startup if session expired
    function checkStoredSessionExpiry() {
      const expiry = parseInt(localStorage.getItem('force_portal_session_expiry') || '0', 10);
      if (expiry && Date.now() > expiry) {
        localStorage.removeItem('force_portal_session_expiry');
        localStorage.removeItem('force_portal_current_user');
      }
    }
    checkStoredSessionExpiry();
`;

if (!html.includes('handleAutoLogoutDueToInactivity')) {
  html = html.replace('function handleLogout() {', exitJsCode + '\n    function handleLogout() {');
}

// In setup or window.onload, call setupBackNavigationProtection()
if (!html.includes('setupBackNavigationProtection()')) {
  html = html.replace('renderNotifications();', 'renderNotifications();\n      setupBackNavigationProtection();');
}

fs.writeFileSync(portalPath, html, 'utf8');
fs.writeFileSync(samplePath, html, 'utf8');

console.log('Successfully applied clean production exit protection, 15-min auto-logout, and removed demo bar!');
