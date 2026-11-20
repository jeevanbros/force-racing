import fs from 'node:fs';

const portalPath = 'C:/Users/ijk11/forceracing-website/site/portal.html';
const samplePath = 'C:/Users/ijk11/forceracing-website/site/portal-sample.html';
const workerPortalPath = 'C:/Users/ijk11/forceracing-website/worker/portal.js';

// =========================================================================
// 1. UPDATE worker/portal.js
// =========================================================================
let workerJs = fs.readFileSync(workerPortalPath, 'utf8');

// A. Remove chat auto-notification in handleChatPost
const oldChatNotifBlock = `      // Automatically create in-app notification for the recipient!
      const notifText = \`💬 Message from \${msg.fromName}: "\${msg.text || (msg.file ? 'Attached file: ' + msg.file : '')}"\`;
      const notif = {
        id: Date.now() + 1,
        text: notifText,
        type: 'chat',
        userId: to,
        toId: to,
        fromId: from,
        fromName: msg.fromName,
        timestamp: Date.now(),
        createdAt: new Date().toISOString()
      };
      inMemoryNotifications.unshift(notif);
      await persistNotificationD1(env, notif);

      return json({ ok: true, message: msg, notification: notif }, 201, CORS_HEADERS);`;

const newChatNotifBlock = `      // Direct chat messages remain isolated to chat threads (never pollute task alerts)
      return json({ ok: true, message: msg }, 201, CORS_HEADERS);`;

if (workerJs.includes(oldChatNotifBlock)) {
  workerJs = workerJs.replace(oldChatNotifBlock, newChatNotifBlock);
  console.log('✓ Isolated chat messages from notifications in worker/portal.js');
}

// B. Add inMemoryMembers and D1 duplicate verification helpers
const memberHelpersCode = `
// Members store & duplicate checking
const inMemoryMembers = [];

async function checkDuplicateMemberD1(env, email, phone, name) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPhone = (phone || '').replace(/\\s+/g, '');
  const cleanName = (name || '').trim().toLowerCase();

  // 1. Check in-memory store
  for (const m of inMemoryMembers) {
    if (cleanEmail && m.email && m.email.toLowerCase() === cleanEmail) {
      return { duplicate: true, field: 'email', member: m };
    }
    if (cleanPhone && m.phone && m.phone.replace(/\\s+/g, '') === cleanPhone) {
      return { duplicate: true, field: 'phone', member: m };
    }
    if (cleanName && m.name && m.name.toLowerCase() === cleanName) {
      return { duplicate: true, field: 'name', member: m };
    }
  }

  // 2. Check D1 database if bound
  if (env?.DB && typeof env.DB.prepare === 'function') {
    try {
      await env.DB.prepare(\`
        CREATE TABLE IF NOT EXISTS portal_members (
          id TEXT PRIMARY KEY,
          unique_code TEXT UNIQUE,
          name TEXT,
          email TEXT UNIQUE,
          phone TEXT,
          subsystem TEXT,
          role TEXT,
          branch TEXT,
          year TEXT,
          created_at TEXT
        )
      \`).run().catch(() => {});

      if (cleanEmail) {
        const row = await env.DB.prepare('SELECT * FROM portal_members WHERE LOWER(TRIM(email)) = ?').bind(cleanEmail).first().catch(() => null);
        if (row) return { duplicate: true, field: 'email', member: row };
      }
      if (cleanPhone) {
        const row = await env.DB.prepare("SELECT * FROM portal_members WHERE REPLACE(phone, ' ', '') = ?").bind(cleanPhone).first().catch(() => null);
        if (row) return { duplicate: true, field: 'phone', member: row };
      }
      if (cleanName) {
        const row = await env.DB.prepare('SELECT * FROM portal_members WHERE LOWER(TRIM(name)) = ?').bind(cleanName).first().catch(() => null);
        if (row) return { duplicate: true, field: 'name', member: row };
      }
    } catch (e) {}
  }

  return { duplicate: false };
}

async function persistMemberD1(env, member) {
  if (env?.DB && typeof env.DB.prepare === 'function') {
    try {
      await env.DB.prepare(\`
        INSERT OR REPLACE INTO portal_members (id, unique_code, name, email, phone, subsystem, role, branch, year, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      \`).bind(
        String(member.id),
        member.uniqueCode || '',
        member.name || '',
        (member.email || '').toLowerCase(),
        member.phone || '',
        member.subsystem || '',
        member.role || '',
        member.branch || '',
        member.year || '',
        member.createdAt || new Date().toISOString()
      ).run().catch(() => {});
    } catch (e) {}
  }
}
`;

if (!workerJs.includes('function checkDuplicateMemberD1')) {
  workerJs = workerJs.replace('async function persistTaskD1', memberHelpersCode + '\nasync function persistTaskD1');
  console.log('✓ Added checkDuplicateMemberD1 and persistMemberD1 to worker/portal.js');
}

// C. Add /api/portal/register endpoint
const registerRouteCode = `
  // 4. /api/portal/register (Double Account Verification & Registration)
  if (path === '/api/portal/register' || path === '/api/portal/register/') {
    if (request.method === 'POST') {
      const body = await parseBody(request);
      const { email, phone, name, subsystem, role, branch, year, uniqueCode } = body;

      if (!email || !phone || !name) {
        return json({ ok: false, error: 'Name, email, and phone number are mandatory.' }, 400, CORS_HEADERS);
      }

      // Cross-check database and memory store for double account prevention
      const dupCheck = await checkDuplicateMemberD1(env, email, phone, name);
      if (dupCheck.duplicate) {
        let errorMsg = 'Account already exists. Duplicate registration is not permitted.';
        if (dupCheck.field === 'email') {
          errorMsg = \`An account with email "\${email}" already exists. Please sign in instead of creating a duplicate account.\`;
        } else if (dupCheck.field === 'phone') {
          errorMsg = \`An account with phone number "\${phone}" is already registered. Double registration is prohibited.\`;
        } else if (dupCheck.field === 'name') {
          errorMsg = \`Member "\${name}" already has an active account. Please sign in with your credentials.\`;
        }
        return json({
          ok: false,
          duplicate: true,
          field: dupCheck.field,
          error: errorMsg
        }, 409, CORS_HEADERS);
      }

      const newMember = {
        id: body.id || ('usr_' + Date.now()),
        uniqueCode: uniqueCode || ('FR26-MEM-' + (inMemoryMembers.length + 1)),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        subsystem: subsystem || 'General',
        role: role || 'Team Member',
        branch: branch || 'Engineering',
        year: year || 'Member',
        createdAt: new Date().toISOString()
      };

      inMemoryMembers.push(newMember);
      await persistMemberD1(env, newMember);

      return json({ ok: true, member: newMember }, 201, CORS_HEADERS);
    }

    if (request.method === 'GET') {
      return json({ ok: true, members: inMemoryMembers }, 200, CORS_HEADERS);
    }

    return json({ ok: false, error: 'Method not allowed.' }, 405, CORS_HEADERS);
  }
`;

if (!workerJs.includes("path === '/api/portal/register'")) {
  const tasksRouteIndex = workerJs.indexOf('// 3. /api/portal/tasks');
  if (tasksRouteIndex !== -1) {
    workerJs = workerJs.replace('// 3. /api/portal/tasks', registerRouteCode + '\n  // 3. /api/portal/tasks');
    console.log('✓ Added /api/portal/register route to worker/portal.js');
  }
}

fs.writeFileSync(workerPortalPath, workerJs, 'utf8');

// =========================================================================
// 2. UPDATE site/portal.html
// =========================================================================
let html = fs.readFileSync(portalPath, 'utf8');

// A. Replace the notification drawer with clean "Task & Assignment Alerts"
// and remove the Dispatch Team Alert composer and queue tabs
const oldDrawerRegex = /<!-- Notification Drawer \(Operational Alerts & Dispatches\) -->[\s\S]*?<div id="notif-live-view">[\s\S]*?<div id="notif-list-container">[\s\S]*?<\/div>\s*<\/div>\s*<div id="notif-queue-view"[\s\S]*?<\/div>\s*<\/div>/;

const cleanAlertsDrawerHtml = `<!-- Notification Drawer (Task & Assignment Alerts Only) -->
  <div class="notif-drawer" id="notif-drawer">
    <div class="notif-head" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--gp-line); padding-bottom:10px; margin-bottom:12px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--gp-accent);">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <h4 style="margin:0; font-size:0.95rem; font-weight:700; color:var(--gp-ink);">Task & Assignment Alerts</h4>
      </div>
      <button class="btn-close-modal" onclick="toggleNotifDrawer()" style="background:none; border:none; font-size:1.4rem; color:var(--gp-ink-2); cursor:pointer;">×</button>
    </div>

    <div id="notif-list-container">
      <!-- Dynamically populated: STRICTLY task assignments, proofs, verifications, and approvals -->
    </div>
  </div>`;

if (oldDrawerRegex.test(html)) {
  html = html.replace(oldDrawerRegex, cleanAlertsDrawerHtml);
  console.log('✓ Replaced drawer with clean Task & Assignment Alerts (removed composer & offline chat queue)');
} else {
  // Direct replace of notif-drawer if regex didn't match
  const manualDrawerStart = html.indexOf('<div class="notif-drawer" id="notif-drawer">');
  const manualDrawerEnd = html.indexOf('</div>\n\n  <div class="main-wrap">');
  if (manualDrawerStart !== -1 && manualDrawerEnd !== -1) {
    html = html.substring(0, manualDrawerStart) + cleanAlertsDrawerHtml.replace('<!-- Notification Drawer (Task & Assignment Alerts Only) -->\n  ', '') + html.substring(manualDrawerEnd + 6);
    console.log('✓ Replaced notif-drawer via substring boundary');
  }
}

// B. Header: Clear SVG notification bell symbol in loginSuccess
const oldHeaderSlotRegex = /document\.getElementById\('header-user-slot'\)\.innerHTML = `[\s\S]*?<button class="notif-btn"[\s\S]*?<\/button>[\s\S]*?<button class="btn-logout"[\s\S]*?<\/button>\s*`;/;

const cleanHeaderSlot = `document.getElementById('header-user-slot').innerHTML = \`
        <button class="notif-btn" onclick="toggleNotifDrawer()" title="Task & Assignment Alerts" aria-label="Notifications" id="btn-header-notif">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--gp-ink);">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span class="notif-badge-count" id="notif-count" style="\${notifications.length > 0 ? 'display:flex;' : 'display:none;'}">\${notifications.length}</span>
        </button>
        <div class="user-account-btn" onclick="openAccountSection()" title="Account & Activities">
          <div class="avatar-wrapper" id="header-avatar-slot">
            \${user.avatarUrl ? \`<img src="\${user.avatarUrl}" class="avatar-img" alt="\${user.name}">\` : \`<span>\${user.name.charAt(0).toUpperCase()}</span>\`}
            <span class="status-dot-indicator dot-online" title="Online Live"></span>
          </div>
          <span style="font-weight:700;">\${user.name}</span>
        </div>
        <button class="btn-logout" onclick="logout()">Logout</button>
      \`;`;

if (oldHeaderSlotRegex.test(html)) {
  html = html.replace(oldHeaderSlotRegex, cleanHeaderSlot);
  console.log('✓ Replaced emoji bell with clear SVG notification symbol in header-user-slot');
}

// C. Remove chat from notifications in sendDirectChat
const oldSendDirectChatNotif = `        const notif = {
          id: Date.now(),
          toId: activeDrawerMember.id,
          text: \`Direct dispatch from \${currentUser.name} to \${activeDrawerMember.name}: "\${text}"\`
        };
        notifications.unshift(notif);
        postPortalNotification(notif);
        renderNotifications();`;

const newSendDirectChatNotif = `        // Direct chat message sent cleanly without polluting task alerts`;

if (html.includes(oldSendDirectChatNotif)) {
  html = html.replace(oldSendDirectChatNotif, newSendDirectChatNotif);
  console.log('✓ Removed chat notification dispatch from sendDirectChat');
}

// D. Remove offline queue dispatch from notifications
const oldQueueNotif = `      notifications.unshift({
        id: Date.now(),
        text: \`✓ Dispatched \${count} queued offline message(s) to team members upon network sync.\`
      });
      renderNotifications();`;

const newQueueNotif = `      // Offline chat messages dispatched directly to recipient threads`;

if (html.includes(oldQueueNotif)) {
  html = html.replace(oldQueueNotif, newQueueNotif);
  console.log('✓ Removed queued chat from renderNotifications');
}

// E. Update renderNotifications to strictly show TASK & ASSIGNMENT alerts only
const oldRenderNotificationsRegex = /function renderNotifications\(\) \{[\s\S]*?cont\.appendChild\(item\);\s*\}\);\s*\}/;

const cleanRenderNotifications = `function renderNotifications() {
      const cont = document.getElementById('notif-list-container');
      if (!cont) return;

      // STRICT ISOLATION: ONLY task assignments, deliverables, verifications, and approvals!
      const taskAlerts = notifications.filter(n => {
        if (!n || !n.text) return false;
        const txt = n.text.toLowerCase();
        const isChat = n.type === 'chat' || txt.includes('direct dispatch') || txt.includes('message from') || txt.includes('queued offline');
        return !isChat;
      });

      const badge = document.getElementById('notif-count');
      if (badge) {
        badge.innerText = taskAlerts.length;
        badge.style.display = taskAlerts.length > 0 ? 'flex' : 'none';
      }

      cont.innerHTML = '';
      if (taskAlerts.length === 0) {
        cont.innerHTML = \`
          <div style="padding: 36px 16px; text-align: center; color: var(--gp-ink-2); font-size: 0.82rem;">
            <div style="margin-bottom: 8px;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.5; color:var(--gp-ink);">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            <div style="font-weight: 700; color: var(--gp-ink); font-size:0.9rem; margin-bottom:4px;">0 Task Alerts</div>
            <div style="line-height:1.4;">Task assignments, proof submissions, lead verifications, and approvals will appear here.</div>
          </div>
        \`;
        return;
      }

      taskAlerts.forEach(n => {
        const item = document.createElement('div');
        item.className = 'notif-item';
        item.style.padding = '10px 12px';
        item.style.marginBottom = '8px';
        item.style.background = 'var(--gp-surface-elevated)';
        item.style.border = '1px solid var(--gp-line)';
        item.style.borderRadius = '8px';
        item.style.fontSize = '0.82rem';
        item.style.lineHeight = '1.45';
        item.style.color = 'var(--gp-ink)';
        item.innerText = n.text;
        cont.appendChild(item);
      });
    }`;

if (oldRenderNotificationsRegex.test(html)) {
  html = html.replace(oldRenderNotificationsRegex, cleanRenderNotifications);
  console.log('✓ Replaced renderNotifications with task-only alerts renderer');
}

// Remove dispatchCustomAlert function if present
html = html.replace(/function dispatchCustomAlert\(\) \{[\s\S]*?fetch\('\/api\/portal\/notifications'[\s\S]*?\}\);\s*\}\n/g, '');

// F. DOUBLE ACCOUNT VERIFICATION & DATABASE CROSS-CHECK in handleSignupSubmit
const oldSignupSubmitRegex = /function handleSignupSubmit\(e\) \{[\s\S]*?loginSuccess\(existingMember\);\s*\}/;

const cleanSignupWithDedup = `async function handleSignupSubmit(e) {
      e.preventDefault();
      const name = (document.getElementById('reg-name').value || '').trim();
      const branch = (document.getElementById('reg-branch').value || '').trim();
      const year = (document.getElementById('reg-year').value || '').trim();
      const email = (document.getElementById('reg-email').value || '').trim();
      const phone = (document.getElementById('reg-phone').value || '').trim();
      let subsystem = (document.getElementById('reg-subsystem').value || '').trim();
      let role = (document.getElementById('reg-role').value || '').trim();
      const pw = (document.getElementById('reg-password').value || '').trim();

      // Mandatory validation
      if (!name || !branch || !year || !email || !phone || !subsystem || !role || !pw) {
        showToast('⚠️ All fields are mandatory. Please complete all registration details.');
        return;
      }

      // Password requirements: 1 uppercase, 1 special symbol
      const hasUpper = /[A-Z]/.test(pw);
      const hasSpecial = /[!@#$%^&*()_+\\-=\\[\\]{};':"\\\\|,.<>\\/?]/.test(pw);
      if (!hasUpper || !hasSpecial) {
        showToast('⚠️ Password must contain at least 1 uppercase letter and 1 special symbol.');
        const pwInput = document.getElementById('reg-password');
        if (pwInput) {
          pwInput.focus();
          pwInput.style.borderColor = 'var(--gp-accent)';
        }
        return;
      }

      const cleanEmail = email.toLowerCase();
      const cleanPhone = phone.replace(/\\s+/g, '');
      const cleanName = name.toLowerCase();

      // ============================================================
      // DOUBLE ACCOUNT VERIFICATION (PREVENT DUPLICATE SIGNUPS)
      // ============================================================
      // 1. Check if email already exists
      const emailExists = ALL_TEAM_MEMBERS.find(m => m.email && m.email.toLowerCase() === cleanEmail && m.hasRegistered);
      if (emailExists) {
        showToast(\`⚠️ Account already exists: Email "\${email}" is already registered to \${emailExists.name} (\${emailExists.uniqueCode || emailExists.role}). Please sign in.\`);
        const el = document.getElementById('reg-email');
        if (el) { el.focus(); el.style.borderColor = 'var(--gp-accent)'; }
        return;
      }

      // 2. Check if phone number already exists
      const phoneExists = ALL_TEAM_MEMBERS.find(m => m.phone && m.phone.replace(/\\s+/g, '') === cleanPhone && m.hasRegistered);
      if (phoneExists) {
        showToast(\`⚠️ Duplicate Account: Phone number "\${phone}" is already registered. Double registration is prohibited.\`);
        const el = document.getElementById('reg-phone');
        if (el) { el.focus(); el.style.borderColor = 'var(--gp-accent)'; }
        return;
      }

      // 3. Check if member name already registered with password
      const nameExists = ALL_TEAM_MEMBERS.find(m => m.name.toLowerCase() === cleanName && m.hasRegistered);
      if (nameExists) {
        showToast(\`⚠️ Account already exists: "\${nameExists.name}" is already registered. Please sign in with your password.\`);
        const el = document.getElementById('reg-name');
        if (el) { el.focus(); el.style.borderColor = 'var(--gp-accent)'; }
        return;
      }

      // ANTI-MISMANAGEMENT ROSTER LOCK: Cross-check against official website crew
      const officialMatch = OFFICIAL_WEBSITE_ROSTER.find(m => 
        m.name.toLowerCase() === cleanName || 
        cleanName.includes(m.name.toLowerCase()) || 
        (m.email && m.email.toLowerCase() === cleanEmail)
      );

      if (officialMatch) {
        if (role !== officialMatch.role) {
          showToast('🔒 Roster Locked: Matched official crew. Designated as ' + officialMatch.role + ' (' + officialMatch.subsystem + ').');
        }
        role = officialMatch.role;
        subsystem = officialMatch.subsystem;
      } else {
        // Unofficial applicant cannot claim leadership positions
        const restricted = ['Captain', 'Vice Captain', 'Team Manager'];
        if (restricted.includes(role)) {
          showToast('⚠️ Leadership positions (Captain, Vice Captain, Team Manager) are designated to official website crew leads.');
          return;
        }
      }

      const uniqueCode = officialMatch ? officialMatch.uniqueCode : generateUniqueCode(subsystem);

      // 4. Cross-check Backend D1 Database for duplicate accounts
      try {
        const resp = await fetch('/api/portal/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email: cleanEmail,
            phone,
            branch,
            year,
            subsystem,
            role,
            uniqueCode
          })
        });
        const result = await resp.json();
        if (!result.ok && result.duplicate) {
          showToast('⚠️ ' + result.error);
          if (result.field === 'email') {
            const el = document.getElementById('reg-email');
            if (el) { el.focus(); el.style.borderColor = 'var(--gp-accent)'; }
          } else if (result.field === 'phone') {
            const el = document.getElementById('reg-phone');
            if (el) { el.focus(); el.style.borderColor = 'var(--gp-accent)'; }
          }
          return;
        }
      } catch (err) {
        console.warn('Backend database cross-check notice:', err);
      }

      let existingMember = ALL_TEAM_MEMBERS.find(m => 
        (officialMatch && m.id === officialMatch.id) || 
        (m.email && m.email.toLowerCase() === cleanEmail) ||
        m.name.toLowerCase() === cleanName
      );

      if (existingMember) {
        existingMember.uniqueCode = existingMember.uniqueCode || uniqueCode;
        existingMember.branch = branch;
        existingMember.year = year;
        existingMember.phone = phone;
        existingMember.email = email;
        existingMember.online = true;
        existingMember.hasRegistered = true;
      } else {
        existingMember = {
          id: "usr_" + Date.now(),
          uniqueCode: uniqueCode,
          name: name,
          role: role,
          subsystem: subsystem,
          email: email,
          phone: phone,
          branch: branch,
          year: year,
          online: true,
          hasRegistered: true,
          avatarUrl: null,
          authority: (role.includes('Head') || role.includes('Lead')) ? 'lead' : (role === 'Captain' ? 'captain' : (role === 'Vice Captain' ? 'vicecaptain' : (role === 'Team Manager' ? 'manager' : 'member')))
        };
        ALL_TEAM_MEMBERS.push(existingMember);
      }

      saveState();

      // Clean in-app entry: ZERO bot popups, ZERO email dispatching
      showToast('✓ Registration complete! Welcome ' + existingMember.name + ' · Unique Code: ' + existingMember.uniqueCode);
      loginSuccess(existingMember);
    }`;

if (oldSignupSubmitRegex.test(html)) {
  html = html.replace(oldSignupSubmitRegex, cleanSignupWithDedup);
  console.log('✓ Replaced handleSignupSubmit with double account verification and database cross-check');
}

// G. Remove dispatch-alert-input from logout wipe
html = html.replace(",\n        'dispatch-alert-input'", '');
html = html.replace(", 'dispatch-alert-input'", '');

// Validate JavaScript syntax in all <script> blocks
const scriptMatches = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi);
for (let i = 0; i < scriptMatches.length; i++) {
  const code = scriptMatches[i].replace(/<script\b[^>]*>|<\/script>/gi, '');
  try {
    new Function(code);
    console.log(`✓ Script ${i + 1}: Valid syntax (${code.length} chars)`);
  } catch(e) {
    console.error(`❌ Script ${i + 1} syntax error:`, e.message);
    process.exit(1);
  }
}

fs.writeFileSync(portalPath, html, 'utf8');
fs.writeFileSync(samplePath, html, 'utf8');

console.log('🎉 Successfully applied Alerts isolation, clear notification symbol, and double account database cross-check!');
