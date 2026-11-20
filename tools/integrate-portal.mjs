import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function main() {
  console.log('>>> 1. Updating site/support.html for sponsorship-tiers compliance...');
  let supportHtml = await readFile('site/support.html', 'utf8');

  // Insert modular sponsorship-tiers stylesheet and script if not present
  if (!supportHtml.includes('modules/sponsorship-tiers/sponsorship-tiers.css')) {
    supportHtml = supportHtml.replace('</head>', '<link rel="stylesheet" href="modules/sponsorship-tiers/sponsorship-tiers.css">\n<script src="modules/sponsorship-tiers/sponsorship-tiers.js" defer></script>\n</head>');
  }

  // Ensure all data-tier attributes and correct bronze wording
  supportHtml = supportHtml.replace(/class="tier-card title-tier"(?! data-tier)/g, 'class="tier-card title-tier" data-tier="title"');
  supportHtml = supportHtml.replace(/class="tier-card featured-tier"(?! data-tier)/g, 'class="tier-card featured-tier" data-tier="gold"');
  supportHtml = supportHtml.replace(/class="tier-card">\s*<div class="tier-badge">AERODYNAMICS<\/div>/g, 'class="tier-card" data-tier="silver"><div class="tier-badge">AERODYNAMICS</div>');
  supportHtml = supportHtml.replace(/class="tier-card">\s*<div class="tier-badge">GRASSROOTS<\/div>/g, 'class="tier-card" data-tier="bronze"><div class="tier-badge">GRASSROOTS</div>');
  supportHtml = supportHtml.replace('Entry-level patron tier supporting young engineering talent.', 'Foundation patron partner supporting young engineering talent.');

  await writeFile('site/support.html', supportHtml, 'utf8');
  console.log('    ✓ site/support.html updated.');

  console.log('>>> 2. Updating site/styles.css for .nav-portal and .portal-badge...');
  let stylesCss = await readFile('site/styles.css', 'utf8');
  const portalStyles = `
/* ========================================================
   PIT WALL PORTAL NAVIGATION & TELEMETRY BADGE
   ======================================================== */
.main-nav .nav-portal {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  font-weight: 700 !important;
  letter-spacing: 0.02em;
}
.main-nav .portal-badge {
  display: inline-flex;
  align-items: center;
  font-family: var(--gp-font-head, Barlow, sans-serif);
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(255, 24, 1, 0.16);
  border: 1px solid rgba(255, 24, 1, 0.45);
  color: var(--gp-accent, #ff1801);
  text-transform: uppercase;
  line-height: 1.2;
  transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}
@media (hover: hover) {
  .main-nav .nav-portal:hover .portal-badge {
    background: rgba(0, 240, 255, 0.18);
    border-color: var(--gp-cyan, #00f0ff);
    color: var(--gp-cyan, #00f0ff);
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.35);
  }
}
[data-theme="light"] .main-nav .portal-badge {
  background: rgba(217, 4, 41, 0.1);
  border-color: rgba(217, 4, 41, 0.35);
  color: #d90429;
}
@media (max-width: 980px) {
  .main-nav[data-open="true"] .nav-portal {
    grid-column: span 2 !important;
    justify-content: center !important;
    background: rgba(255, 24, 1, 0.08) !important;
    border-color: rgba(255, 24, 1, 0.3) !important;
    color: #ffffff !important;
  }
  [data-theme="light"] .main-nav[data-open="true"] .nav-portal {
    background: rgba(217, 4, 41, 0.06) !important;
    border-color: rgba(217, 4, 41, 0.25) !important;
    color: #0b0f19 !important;
  }
}
@media (max-width: 380px) {
  .main-nav[data-open="true"] .nav-portal {
    grid-column: span 1 !important;
  }
}
`;

  if (!stylesCss.includes('PIT WALL PORTAL NAVIGATION')) {
    stylesCss += '\n' + portalStyles;
    await writeFile('site/styles.css', stylesCss, 'utf8');
    console.log('    ✓ site/styles.css updated with portal navigation styles.');
  }

  console.log('>>> 3. Adding Pit Wall / Portal link to navigation in HTML pages...');
  const navPages = ['index.html', 'cars.html', 'team.html', 'contact.html', 'recruitment.html', 'support.html', 'privacy.html', 'trail.html'];
  const portalNavLink = '<a href="/portal.html" class="nav-portal">Pit Wall <span class="portal-badge">PORTAL</span></a>';

  for (const page of navPages) {
    const filePath = `site/${page}`;
    if (!existsSync(filePath)) continue;
    let content = await readFile(filePath, 'utf8');

    if (!content.includes('/portal.html') && !content.includes('class="nav-portal"')) {
      // Find the closing </nav> in the main-nav element
      content = content.replace(/(<nav class="main-nav"[^>]*>[\s\S]*?)(<\/nav>)/, `$1${portalNavLink}$2`);
      await writeFile(filePath, content, 'utf8');
      console.log(`    ✓ ${page}: added Pit Wall portal navigation link.`);
    } else {
      console.log(`    - ${page}: already has portal navigation link.`);
    }
  }

  console.log('>>> 4. Enhancing site/portal-sample.html with Photo Viewer & Offline Queue UI...');
  let portalContent = await readFile('site/portal-sample.html', 'utf8');

  // Check if Photo Viewer modal is present
  if (!portalContent.includes('id="photo-viewer-modal"')) {
    const photoViewerModalHtml = `
  <!-- ========================================================== -->
  <!-- PHOTO VIEWER MODAL (FULLSCREEN HIGH-RES LIGHTBOX)          -->
  <!-- ========================================================== -->
  <div class="modal-overlay" id="photo-viewer-modal" onclick="if(event.target===this)closePhotoViewer()">
    <div class="modal-box" style="max-width:440px; text-align:center;">
      <div class="modal-head">
        <h3>TEAM DOSSIER PHOTO VIEWER</h3>
        <button class="btn-close-modal" onclick="closePhotoViewer()">×</button>
      </div>
      <div style="padding:24px 12px; display:flex; flex-direction:column; align-items:center;">
        <div class="viewer-avatar-frame" id="viewer-avatar-frame" style="width:160px; height:160px; border-radius:50%; border:3px solid var(--gp-cyan); box-shadow:0 0 25px rgba(0, 240, 255, 0.35); overflow:hidden; display:flex; align-items:center; justify-content:center; background:var(--gp-surface-elevated); margin-bottom:16px;">
          <!-- Rendered dynamically -->
        </div>
        <h4 id="viewer-name" style="font-size:1.4rem; font-family:var(--gp-font-head); letter-spacing:0.02em;">Dhanush V.</h4>
        <p id="viewer-role" style="color:var(--gp-cyan); font-weight:700; font-size:0.9rem; margin-top:4px;">Captain · Leadership</p>
        <p id="viewer-sub" style="color:var(--gp-ink-2); font-size:0.8rem; margin-top:2px;">Force Racing // KITS Warangal Formula Student</p>
        <div style="margin-top:20px; display:flex; gap:10px;">
          <button type="button" class="btn-submit" style="width:auto; padding:8px 24px;" onclick="closePhotoViewer()">Close Photo</button>
        </div>
      </div>
    </div>
  </div>
`;
    // Insert before </body
    portalContent = portalContent.replace('</body>', photoViewerModalHtml + '\n</body>');
  }

  // Ensure acc-photo-frame has click handler and View Photo button
  if (!portalContent.includes('openPhotoViewer()')) {
    portalContent = portalContent.replace(
      'id="acc-photo-frame"',
      'id="acc-photo-frame" onclick="openPhotoViewer()" style="cursor:pointer;" title="Click to view full photo"'
    );
    portalContent = portalContent.replace(
      '<label for="avatar-file-input"',
      '<button type="button" class="btn-quick-chat" style="display:inline-block; padding:3px 10px; cursor:pointer; margin-right:6px;" onclick="openPhotoViewer()">🔍 View Photo</button>\n            <label for="avatar-file-input"'
    );
  }

  // Ensure notification drawer has Offline Queue tabs
  if (!portalContent.includes('id="tab-notif-queue"')) {
    const oldNotifHead = `<div class="notif-head">\n      <h4>🔔 Operational Alerts</h4>\n      <button class="btn-close-modal" onclick="toggleNotifDrawer()">×</button>\n    </div>`;
    const newNotifHead = `<div class="notif-head">
      <h4>🔔 In-App Dispatch & Alerts</h4>
      <button class="btn-close-modal" onclick="toggleNotifDrawer()">×</button>
    </div>
    <div class="notif-tabs" style="display:flex; gap:8px; margin-bottom:12px; border-bottom:1px solid var(--gp-line); padding-bottom:8px;">
      <button type="button" class="notif-tab active" id="tab-notif-live" onclick="switchNotifTab('live')" style="background:transparent; border:none; color:var(--gp-ink); font-weight:700; font-size:0.82rem; cursor:pointer; padding:4px 8px; border-bottom:2px solid var(--gp-accent);">LIVE ALERTS (<span id="notif-tab-count">0</span>)</button>
      <button type="button" class="notif-tab" id="tab-notif-queue" onclick="switchNotifTab('queue')" style="background:transparent; border:none; color:var(--gp-ink-2); font-weight:700; font-size:0.82rem; cursor:pointer; padding:4px 8px; border-bottom:2px solid transparent;">OFFLINE QUEUE (<span id="queue-tab-count">0</span>)</button>
    </div>
    <div id="notif-live-view">`;

    portalContent = portalContent.replace(oldNotifHead, newNotifHead);
    portalContent = portalContent.replace(
      `<div id="notif-list-container">\n      <!-- Populated dynamically -->\n    </div>\n  </div>`,
      `<div id="notif-list-container">\n      <!-- Populated dynamically -->\n    </div>\n    </div>
    <div id="notif-queue-view" style="display:none;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <span style="font-size:0.75rem; color:var(--gp-ink-2);">Messages queued for offline recipients</span>
        <button type="button" class="btn-quick-chat" style="padding:2px 8px; font-size:0.75rem;" onclick="dispatchAllOfflineQueue()">🚀 Dispatch All</button>
      </div>
      <div id="queue-list-container"></div>
    </div>\n  </div>`
    );
  }

  // Add JS helper functions for photo viewer and offline queue if not yet included
  if (!portalContent.includes('function openPhotoViewer')) {
    const helperFunctions = `
    // ============================================================
    // PHOTO VIEWER & LIGHTBOX
    // ============================================================
    function openPhotoViewer(user) {
      const u = user || currentUser;
      if (!u) return;

      const frame = document.getElementById('viewer-avatar-frame');
      if (u.avatarUrl) {
        frame.innerHTML = \`<img src="\${u.avatarUrl}" alt="\${u.name}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">\`;
      } else {
        frame.innerHTML = \`<span style="font-size:4rem; font-weight:800; color:#fff; font-family:var(--gp-font-head);">\${u.name.charAt(0).toUpperCase()}</span>\`;
      }

      document.getElementById('viewer-name').innerText = u.name;
      document.getElementById('viewer-role').innerText = \`\${u.role} · \${u.subsystem}\`;
      document.getElementById('viewer-sub').innerText = \`\${u.email} · Force Racing Formula Student\`;
      document.getElementById('photo-viewer-modal').style.display = 'flex';
    }

    function closePhotoViewer() {
      document.getElementById('photo-viewer-modal').style.display = 'none';
    }

    // ============================================================
    // OFFLINE MESSAGE QUEUE DRAWER TAB
    // ============================================================
    function switchNotifTab(tab) {
      const liveBtn = document.getElementById('tab-notif-live');
      const queueBtn = document.getElementById('tab-notif-queue');
      if (liveBtn && queueBtn) {
        liveBtn.style.borderBottomColor = tab === 'live' ? 'var(--gp-accent)' : 'transparent';
        liveBtn.style.color = tab === 'live' ? 'var(--gp-ink)' : 'var(--gp-ink-2)';
        queueBtn.style.borderBottomColor = tab === 'queue' ? 'var(--gp-accent)' : 'transparent';
        queueBtn.style.color = tab === 'queue' ? 'var(--gp-ink)' : 'var(--gp-ink-2)';
      }

      const liveView = document.getElementById('notif-live-view');
      const queueView = document.getElementById('notif-queue-view');
      if (liveView && queueView) {
        liveView.style.display = tab === 'live' ? 'block' : 'none';
        queueView.style.display = tab === 'queue' ? 'block' : 'none';
      }
      if (tab === 'queue') renderOfflineQueue();
    }

    function renderOfflineQueue() {
      const queueCont = document.getElementById('queue-list-container');
      const queueTabCount = document.getElementById('queue-tab-count');
      if (queueTabCount) queueTabCount.innerText = offlineQueuedMessages.length;
      if (!queueCont) return;

      if (offlineQueuedMessages.length === 0) {
        queueCont.innerHTML = '<p style="font-size:0.8rem; color:var(--gp-ink-3); text-align:center; padding:16px;">Offline queue empty. When you message an offline member, messages are safely queued here until delivery.</p>';
        return;
      }

      queueCont.innerHTML = '';
      offlineQueuedMessages.forEach(m => {
        const toUser = ALL_TEAM_MEMBERS.find(x => x.id === m.toId);
        const toName = toUser ? toUser.name : m.toId;
        const item = document.createElement('div');
        item.className = 'notif-item';
        item.style.borderLeftColor = 'var(--gp-gold)';
        const dateStr = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        item.innerHTML = \`
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
            <strong style="color:var(--gp-ink); font-size:0.82rem;">To: \${toName}</strong>
            <span style="font-size:0.7rem; color:var(--gp-gold); font-weight:700;">🕒 QUEUED</span>
          </div>
          <div style="font-size:0.8rem; color:var(--gp-ink-2);">\${m.text}</div>
          \${m.file ? \`<div style="font-size:0.75rem; color:var(--gp-cyan); margin-top:2px;">📎 Attached: \${m.file}</div>\` : ''}
          <div style="font-size:0.7rem; color:var(--gp-ink-3); margin-top:4px;">\${dateStr} · Pending member reconnection</div>
        \`;
        queueCont.appendChild(item);
      });
    }

    function dispatchAllOfflineQueue() {
      if (offlineQueuedMessages.length === 0) {
        showToast("Offline queue is currently empty.");
        return;
      }
      const count = offlineQueuedMessages.length;
      offlineQueuedMessages.forEach(m => {
        const key = getChatRoomKey(m.fromId, m.toId);
        if (!directChats[key]) directChats[key] = [];
        const timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        directChats[key].push({
          id: Date.now() + Math.random(),
          senderId: m.fromId,
          senderName: m.fromName,
          recipientId: m.toId,
          text: m.text,
          fileName: m.file,
          time: timeStr
        });
      });
      offlineQueuedMessages = [];
      saveState();
      notifications.unshift({
        id: Date.now(),
        text: \`✓ Dispatched \${count} queued offline message(s) to team members upon network sync.\`
      });
      renderNotifications();
      renderOfflineQueue();
      if (activeDrawerMember) renderDirectChatStream();
      showToast(\`🚀 Dispatched \${count} queued message(s)!\`);
    }
`;
    portalContent = portalContent.replace('</script>', helperFunctions + '\n  </script>');
  }

  // Update renderNotifications to also update notif-tab-count and queue-tab-count
  portalContent = portalContent.replace(
    `if (badge) badge.innerText = notifications.length;`,
    `if (badge) badge.innerText = notifications.length;\n      const tabLiveCount = document.getElementById('notif-tab-count');\n      if (tabLiveCount) tabLiveCount.innerText = notifications.length;\n      const tabQueueCount = document.getElementById('queue-tab-count');\n      if (tabQueueCount) tabQueueCount.innerText = offlineQueuedMessages.length;`
  );

  await writeFile('site/portal-sample.html', portalContent, 'utf8');
  console.log('    ✓ site/portal-sample.html updated.');

  console.log('>>> 5. Synchronizing site/portal.html with site/portal-sample.html...');
  await writeFile('site/portal.html', portalContent, 'utf8');
  console.log('    ✓ site/portal.html created and synchronized.');

  console.log('>>> 6. Updating worker/index.js for /portal and /pitwall routing...');
  let workerIndex = await readFile('worker/index.js', 'utf8');
  if (!workerIndex.includes("path === '/portal'")) {
    workerIndex = workerIndex.replace(
      `if (path === '/admin' || path.startsWith('/admin/')) return adminPage(request, env);`,
      `if (path === '/portal' || path === '/pitwall' || path === '/pit-wall') {\n    url.pathname = '/portal.html';\n    return env.ASSETS.fetch(new Request(url.toString(), request));\n  }\n  if (path === '/admin' || path.startsWith('/admin/')) return adminPage(request, env);`
    );
    await writeFile('worker/index.js', workerIndex, 'utf8');
    console.log('    ✓ worker/index.js routing updated.');
  }

  console.log('>>> Integration complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
