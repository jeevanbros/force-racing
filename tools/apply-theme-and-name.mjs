import fs from 'node:fs';

const portalPath = 'C:/Users/ijk11/forceracing-website/site/portal.html';
const samplePath = 'C:/Users/ijk11/forceracing-website/site/portal-sample.html';

let html = fs.readFileSync(portalPath, 'utf8');

// 1. Add Theme Sync Script in <head>
const themeScript = `<script>
    (function() {
      function syncWebsiteTheme() {
        try {
          const stored = localStorage.getItem("force_theme");
          const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
          const activeTheme = stored || (prefersLight ? "light" : "dark");
          document.documentElement.setAttribute("data-theme", activeTheme);
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
  console.log('Added syncWebsiteTheme script to <head>');
}

// 2. Replace Heading & Titles: "Pitwall portal" -> "Engineering Operations Hub"
html = html.replace(
  '<title>Pit Wall Portal — Force Racing // Team Operations Hub</title>',
  '<title>Engineering Operations Hub — Force Racing</title>'
);
html = html.replace(
  '<small>PIT WALL OPERATIONS PORTAL</small>',
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

// 3. Add explicit [data-theme="light"] rules matching website theme
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
    [data-theme="light"] .form-control:focus {
      border-color: var(--gp-cyan);
      background: #ffffff;
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
    [data-theme="light"] .member-card.selected {
      background: rgba(2, 132, 199, 0.1);
      border-color: var(--gp-cyan);
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
    [data-theme="light"] .chat-reply-quote {
      background: rgba(0, 0, 0, 0.04);
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
  console.log('Added light theme CSS overrides');
}

// Save both portal.html and portal-sample.html
fs.writeFileSync(portalPath, html, 'utf8');
fs.writeFileSync(samplePath, html, 'utf8');

console.log('Successfully updated theme sync and heading in portal.html and portal-sample.html!');
