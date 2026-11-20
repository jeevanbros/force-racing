import fs from 'node:fs';

const portalPath = 'C:/Users/ijk11/forceracing-website/site/portal.html';
const samplePath = 'C:/Users/ijk11/forceracing-website/site/portal-sample.html';
const workerPortalPath = 'C:/Users/ijk11/forceracing-website/worker/portal.js';

// -------------------------------------------------------------
// 1. UPDATE BACKEND worker/portal.js
// -------------------------------------------------------------
let workerJs = fs.readFileSync(workerPortalPath, 'utf8');
const workerNotifRegex = /const inMemoryNotifications = \[[\s\S]*?\];\s*const inMemoryTasks = \[[\s\S]*?\];/;
const cleanWorkerStores = `const inMemoryNotifications = [];\n\nconst inMemoryTasks = [];`;
if (workerNotifRegex.test(workerJs)) {
  workerJs = workerJs.replace(workerNotifRegex, cleanWorkerStores);
  fs.writeFileSync(workerPortalPath, workerJs, 'utf8');
  console.log('✓ Reset worker/portal.js in-memory stores to 0');
}

// -------------------------------------------------------------
// 2. UPDATE FRONTEND site/portal.html
// -------------------------------------------------------------
let html = fs.readFileSync(portalPath, 'utf8');

// A. Update Account Modal HTML to display Unique Code prominently
const oldAccHeaderBadge = `<span class="acc-badge" id="acc-modal-badge">Captain · Leadership</span>`;
const newAccHeaderBadge = `<div style="display:flex; align-items:center; gap:8px; margin:4px 0;">
            <span class="acc-badge" id="acc-modal-badge">Captain · Leadership</span>
            <span id="acc-modal-unique-code" style="font-size:0.75rem; font-weight:700; color:var(--gp-cyan); background:rgba(0,240,255,0.12); border:1px solid var(--gp-cyan); padding:2px 8px; border-radius:4px;">FR26-LEAD-01</span>
          </div>`;

if (html.includes(oldAccHeaderBadge) && !html.includes('id="acc-modal-unique-code"')) {
  html = html.replace(oldAccHeaderBadge, newAccHeaderBadge);
  console.log('✓ Added acc-modal-unique-code badge in account header');
}

const oldProfNameGroup = `          <div class="form-group">
            <label>Full Name</label>
            <input type="text" id="prof-name" class="form-control" required>
          </div>`;

const newProfNameGroup = `          <div class="form-group" style="margin-bottom:12px;">
            <label>Official Member Code (Unique ID)</label>
            <input type="text" id="prof-unique-code" class="form-control" disabled style="opacity:0.95; font-weight:700; color:var(--gp-cyan); background:rgba(0,240,255,0.06); border-color:var(--gp-cyan); cursor:not-allowed;">
          </div>
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" id="prof-name" class="form-control" required>
          </div>`;

if (html.includes(oldProfNameGroup) && !html.includes('id="prof-unique-code"')) {
  html = html.replace(oldProfNameGroup, newProfNameGroup);
  console.log('✓ Added prof-unique-code input in Edit Profile form');
}

// Replace Admin reference in hint
html = html.replace(/🔒 Subsystem locked\. Managed by Captain & Admin\./g, '🔒 Subsystem locked. Managed by Captain, Vice Captain & Subsystem Leads.');

// B. Equip Notification Drawer with Dispatch Alert Composer
const notifDrawerHeaderRegex = /<div class="notif-head">[\s\S]*?<\/div>\s*<div class="notif-tabs"/;
const newNotifHeaderWithComposer = `<div class="notif-head">
      <h4>🔔 In-App Dispatch & Alerts</h4>
      <button class="btn-close-modal" onclick="toggleNotifDrawer()">×</button>
    </div>

    <!-- Live Operational Alert Composer -->
    <div class="dispatch-composer" style="margin:10px 0 14px 0; padding:12px; background:var(--gp-surface); border:1px solid var(--gp-line); border-radius:8px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-size:0.75rem; font-weight:700; color:var(--gp-ink); text-transform:uppercase; letter-spacing:0.5px;">📢 Dispatch Team Alert</span>
        <select id="dispatch-alert-priority" style="font-size:0.72rem; padding:2px 6px; background:var(--gp-bg); color:var(--gp-ink); border:1px solid var(--gp-line); border-radius:4px;">
          <option value="normal">Normal Alert</option>
          <option value="urgent">🚨 Urgent Broadcast</option>
        </select>
      </div>
      <div style="display:flex; gap:6px;">
        <input type="text" id="dispatch-alert-input" class="form-control" placeholder="Broadcast operational alert to entire team..." style="font-size:0.8rem; padding:6px 10px; flex:1;">
        <button type="button" class="btn-submit" onclick="dispatchCustomAlert()" style="padding:6px 12px; font-size:0.78rem; width:auto; white-space:nowrap; margin-top:0;">Broadcast</button>
      </div>
    </div>

    <div class="notif-tabs"`;

if (notifDrawerHeaderRegex.test(html) && !html.includes('dispatchCustomAlert()')) {
  html = html.replace(notifDrawerHeaderRegex, newNotifHeaderWithComposer);
  console.log('✓ Equipped Notification Drawer with Dispatch Alert composer');
}

// C. Replace data and login/logout blocks in main script
// Locate the start from "const SUBSYSTEM_LIST =" or "let ALL_TEAM_MEMBERS =" up to "function handleLoginSubmit"
const dataBlockRegex = /const SUBSYSTEM_LIST = \[[\s\S]*?function handleLoginSubmit\(e\) \{[\s\S]*?loginSuccess\(u\);\s*\}/;

const cleanDataAndAuthBlock = `    // ============================================================
    // SUBSYSTEM TAXONOMY
    // ============================================================
    const SUBSYSTEM_LIST = [
      "Chassis",
      "Powertrain",
      "Aerodynamics",
      "Electronics",
      "Suspension & Braking",
      "Management"
    ];

    // ============================================================
    // OFFICIAL FORCE RACING CREW ROSTER (FROM WEBSITE team.html)
    // ============================================================
    const OFFICIAL_WEBSITE_ROSTER = [
      { id: "dhanush", uniqueCode: "FR26-LEAD-01", name: "Dhanush", role: "Captain", subsystem: "Steering & Wheels", branch: "Mechanical", year: "Final Year", online: true, email: "captain@forceracing.in", phone: "+91 98765 00001", authority: "captain", avatarUrl: null },
      { id: "arun", uniqueCode: "FR26-LEAD-02", name: "Arun", role: "Vice Captain", subsystem: "Powertrain", branch: "Mechanical", year: "Final Year", online: true, email: "vicecaptain@forceracing.in", phone: "+91 98765 00002", authority: "vicecaptain", avatarUrl: null },
      { id: "sohail", uniqueCode: "FR26-MGT-01", name: "Md. Sohail", role: "Team Manager", subsystem: "Chassis", branch: "Mechanical", year: "Final Year", online: false, email: "manager@forceracing.in", phone: "+91 80083 91525", authority: "manager", avatarUrl: null },
      { id: "hanumanth", uniqueCode: "FR26-CHS-01", name: "Hanumanth", role: "Chassis Lead", subsystem: "Chassis", branch: "Mechanical", year: "3rd Year", online: true, email: "hanumanth@forceracing.in", phone: "+91 98765 10001", authority: "lead", avatarUrl: null },
      { id: "jeevan", uniqueCode: "FR26-CHS-02", name: "Jeevan", role: "Chassis · Logistics", subsystem: "Chassis", branch: "Mechanical", year: "3rd Year", online: true, email: "jeevan@forceracing.in", phone: "+91 98765 10002", authority: "member", avatarUrl: null },
      { id: "navya", uniqueCode: "FR26-CHS-03", name: "Navya", role: "Team Member", subsystem: "Chassis", branch: "Mechanical", year: "3rd Year", online: false, email: "navya@forceracing.in", phone: "+91 98765 10003", authority: "member", avatarUrl: null },
      { id: "j_harsha", uniqueCode: "FR26-SUS-01", name: "J Harsha", role: "Suspension Lead", subsystem: "Suspension & Braking", branch: "Mechanical", year: "3rd Year", online: true, email: "jharsha@forceracing.in", phone: "+91 98765 10004", authority: "lead", avatarUrl: null },
      { id: "prashanth", uniqueCode: "FR26-SUS-02", name: "Prashanth", role: "Team Member", subsystem: "Suspension & Braking", branch: "Mechanical", year: "3rd Year", online: false, email: "prashanth@forceracing.in", phone: "+91 98765 10005", authority: "member", avatarUrl: null },
      { id: "karthik", uniqueCode: "FR26-POW-01", name: "Karthik", role: "Powertrain Lead", subsystem: "Powertrain", branch: "Mechanical", year: "3rd Year", online: true, email: "karthik@forceracing.in", phone: "+91 98765 10006", authority: "lead", avatarUrl: null },
      { id: "rakesh", uniqueCode: "FR26-POW-02", name: "Rakesh", role: "Team Member", subsystem: "Powertrain", branch: "Mechanical", year: "3rd Year", online: false, email: "rakesh@forceracing.in", phone: "+91 98765 10007", authority: "member", avatarUrl: null },
      { id: "dhanya", uniqueCode: "FR26-POW-03", name: "Dhanya", role: "Public Relations · Powertrain", subsystem: "Powertrain", branch: "Mechanical", year: "3rd Year", online: true, email: "dhanya@forceracing.in", phone: "+91 98765 10008", authority: "member", avatarUrl: null },
      { id: "mahidhar", uniqueCode: "FR26-BRK-01", name: "Mahidhar", role: "Brakes · Finance", subsystem: "Suspension & Braking", branch: "Mechanical", year: "3rd Year", online: false, email: "mahidhar@forceracing.in", phone: "+91 98765 10009", authority: "member", avatarUrl: null },
      { id: "p_harsha", uniqueCode: "FR26-BRK-02", name: "P Harsha", role: "Team Member", subsystem: "Suspension & Braking", branch: "Mechanical", year: "3rd Year", online: false, email: "pharsha@forceracing.in", phone: "+91 98765 10010", authority: "member", avatarUrl: null },
      { id: "ruthvik", uniqueCode: "FR26-STR-01", name: "Ruthvik", role: "Steering & Wheels", subsystem: "Chassis", branch: "Mechanical", year: "3rd Year", online: false, email: "ruthvik@forceracing.in", phone: "+91 98765 10011", authority: "member", avatarUrl: null },
      { id: "ashish", uniqueCode: "FR26-MED-01", name: "Ashish", role: "Social Media", subsystem: "Management", branch: "Mechanical", year: "3rd Year", online: false, email: "ashish@forceracing.in", phone: "+91 98765 10012", authority: "member", avatarUrl: null }
    ];

    let ALL_TEAM_MEMBERS = OFFICIAL_WEBSITE_ROSTER.map(m => ({ ...m }));
    let currentUser = null;
    let activeDrawerMember = null;
    let notifPollTimer = null;
    let activeReply = null;

    // ALL DATA RESET TO CLEAN REGISTERED SLATE (0, 0, 0, 0)
    let notifications = [];
    let tasks = [];
    let sharedFiles = [];
    let directChats = {};
    let offlineQueuedMessages = [];

    // Unique Code Generator (Format: FR26-[SUBSYSTEM_CODE]-[NUM])
    function generateUniqueCode(subsystem) {
      const subMap = {
        'Chassis': 'CHS',
        'Powertrain': 'POW',
        'Aerodynamics': 'AER',
        'Electronics': 'ELE',
        'Suspension & Braking': 'SUS',
        'Management': 'MGT',
        'Leadership': 'LEAD',
        'Steering & Wheels': 'STR'
      };
      const code = subMap[subsystem] || 'MEM';
      const count = ALL_TEAM_MEMBERS.filter(m => m.uniqueCode && m.uniqueCode.includes(code)).length + 1;
      const numStr = count < 10 ? '0' + count : String(count);
      return 'FR26-' + code + '-' + numStr;
    }

    // Clean out deprecated sample keys
    try {
      localStorage.removeItem('fr_tasks_v2');
      localStorage.removeItem('fr_files_v2');
      localStorage.removeItem('fr_queue_v2');
      localStorage.removeItem('fr_members_v2');
    } catch(e) {}

    // Load persisted state if exists
    try {
      const savedMembers = localStorage.getItem('fr_members_v3');
      if (savedMembers) {
        const parsed = JSON.parse(savedMembers);
        OFFICIAL_WEBSITE_ROSTER.forEach(off => {
          if (!parsed.find(p => p.id === off.id)) parsed.push({ ...off });
        });
        ALL_TEAM_MEMBERS = parsed;
      }

      const savedTasks = localStorage.getItem('fr_tasks_v3');
      if (savedTasks) tasks = JSON.parse(savedTasks);

      const savedFiles = localStorage.getItem('fr_files_v3');
      if (savedFiles) sharedFiles = JSON.parse(savedFiles);

      const savedChats = localStorage.getItem('fr_chats_v3');
      if (savedChats) directChats = JSON.parse(savedChats);

      const savedNotifs = localStorage.getItem('fr_notifs_v3');
      if (savedNotifs) notifications = JSON.parse(savedNotifs);
    } catch(e) {
      console.warn("Could not load localStorage:", e);
    }

    function saveState() {
      try {
        localStorage.setItem('fr_members_v3', JSON.stringify(ALL_TEAM_MEMBERS));
        localStorage.setItem('fr_tasks_v3', JSON.stringify(tasks));
        localStorage.setItem('fr_files_v3', JSON.stringify(sharedFiles));
        localStorage.setItem('fr_chats_v3', JSON.stringify(directChats));
        localStorage.setItem('fr_notifs_v3', JSON.stringify(notifications));
      } catch(e) {
        console.warn("Storage quota or error:", e);
      }
    }

    // ============================================================
    // AUTHENTICATION & PASSWORD STRENGTH
    // ============================================================
    function switchAuthTab(tab) {
      document.getElementById('tab-login').classList.toggle('active', tab === 'login');
      document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
      document.getElementById('form-login').style.display = tab === 'login' ? 'block' : 'none';
      document.getElementById('form-signup').style.display = tab === 'signup' ? 'block' : 'none';
    }

    function checkPasswordStrength(pw) {
      const hasUpper = /[A-Z]/.test(pw);
      const hasSpecial = /[!@#$%^&*()_+\\-=\\[\\]{};':"\\\\|,.<>\\/?]/.test(pw);

      let score = 0;
      if (pw.length >= 6) score += 20;
      if (hasUpper) score += 40;
      if (hasSpecial) score += 40;

      const bar = document.getElementById('pw-bar-fill');
      const statusText = document.getElementById('pw-text-status');

      if (bar) bar.style.width = score + '%';

      if (!hasUpper || !hasSpecial) {
        if (bar) bar.style.background = 'var(--gp-accent)';
        if (statusText) statusText.innerHTML = '<span style="color:var(--gp-accent);">⚠️ Needs at least 1 uppercase & 1 symbol</span>';
      } else {
        if (bar) bar.style.background = 'var(--gp-ok)';
        if (statusText) statusText.innerHTML = '<span style="color:var(--gp-ok);">✓ Password strength valid</span>';
      }
    }

    function handleLoginSubmit(e) {
      e.preventDefault();
      const rawInput = (document.getElementById('login-identifier').value || '').trim();
      const pw = (document.getElementById('login-password').value || '').trim();
      if (!rawInput) {
        showToast('⚠️ Please enter your official email, name, or Member Code.');
        return;
      }

      const idLower = rawInput.toLowerCase();

      // Find member by uniqueCode, id, email, or exact/partial name
      let u = ALL_TEAM_MEMBERS.find(x => 
        (x.uniqueCode && x.uniqueCode.toLowerCase() === idLower) ||
        x.id.toLowerCase() === idLower ||
        (x.email && x.email.toLowerCase() === idLower) ||
        x.name.toLowerCase() === idLower
      );

      if (!u) {
        u = ALL_TEAM_MEMBERS.find(x => x.name.toLowerCase().includes(idLower) || idLower.includes(x.name.toLowerCase()));
      }

      if (!u) {
        showToast('❌ Unregistered member "' + rawInput + '". Please sign up first via the SIGN UP tab.');
        return;
      }

      loginSuccess(u);
    }`;

if (dataBlockRegex.test(html)) {
  html = html.replace(dataBlockRegex, cleanDataAndAuthBlock);
  console.log('✓ Successfully replaced data block and login handler');
} else {
  console.error('⚠️ Could not match dataBlockRegex');
}

// D. Clean Signup logic: anti-mismanagement lock + unique code generation + zero bot/email popups
const oldSignupRegex = /function handleSignupSubmit\(e\) \{[\s\S]*?loginSuccess\(newUser\);\s*\}/;

const cleanSignupLogic = `function handleSignupSubmit(e) {
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

      // ANTI-MISMANAGEMENT ROSTER LOCK: Cross-check against official website crew
      const nameLower = name.toLowerCase();
      const officialMatch = OFFICIAL_WEBSITE_ROSTER.find(m => 
        m.name.toLowerCase() === nameLower || 
        nameLower.includes(m.name.toLowerCase()) || 
        (m.email && m.email.toLowerCase() === email.toLowerCase())
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

      let existingMember = ALL_TEAM_MEMBERS.find(m => 
        (officialMatch && m.id === officialMatch.id) || 
        (m.email && m.email.toLowerCase() === email.toLowerCase()) ||
        m.name.toLowerCase() === nameLower
      );

      if (existingMember) {
        existingMember.uniqueCode = existingMember.uniqueCode || uniqueCode;
        existingMember.branch = branch;
        existingMember.year = year;
        existingMember.phone = phone;
        existingMember.email = email;
        existingMember.online = true;
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

if (oldSignupRegex.test(html)) {
  html = html.replace(oldSignupRegex, cleanSignupLogic);
  console.log('✓ Replaced handleSignupSubmit with anti-mismanagement & unique code logic');
} else {
  console.error('⚠️ Could not match oldSignupRegex');
}

// E. Clean Logout logic: wipe all fields, reset password meter, clean session
const oldLogoutRegex = /function logout\(\) \{[\s\S]*?document\.getElementById\('header-user-slot'\)\.innerHTML = '<span style="font-size:0\.85rem; color:var\(--gp-ink-2\);">🔒 Secure Pit Gateway<\/span>';\s*\}/;

const cleanLogoutLogic = `function logout() {
      if (currentUser) {
        currentUser.online = false;
      }
      currentUser = null;
      activeDrawerMember = null;
      activeReply = null;
      localStorage.removeItem('force_portal_current_user');
      localStorage.removeItem('force_portal_session_expiry');
      localStorage.removeItem('force_portal_last_active');

      if (typeof stopNotificationPolling === 'function') {
        stopNotificationPolling();
      }

      // COMPLETE FORM WIPE: CLEAR ALL SIGNUP & LOGIN INPUTS
      const signupForm = document.getElementById('form-signup');
      if (signupForm) signupForm.reset();

      const loginForm = document.getElementById('form-login');
      if (loginForm) loginForm.reset();

      const fieldsToClear = [
        'reg-name', 'reg-branch', 'reg-year', 'reg-email', 'reg-phone', 
        'reg-subsystem', 'reg-role', 'reg-password', 
        'login-identifier', 'login-password',
        'dispatch-alert-input'
      ];
      fieldsToClear.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.value = '';
          el.style.borderColor = '';
        }
      });

      // Reset password meter and hints
      const pwBar = document.getElementById('pw-bar-fill');
      if (pwBar) {
        pwBar.style.width = '0%';
        pwBar.style.background = 'transparent';
      }
      const pwStatus = document.getElementById('pw-text-status');
      if (pwStatus) {
        pwStatus.innerHTML = 'Needs uppercase letter & special symbol';
        pwStatus.style.color = '';
      }

      // Return to clean sign in tab
      switchAuthTab('login');

      // Hide dashboard, show authentication gateway
      document.getElementById('dashboard-view').style.display = 'none';
      document.getElementById('auth-view').style.display = 'block';

      // Reset header slot
      const headerSlot = document.getElementById('header-user-slot');
      if (headerSlot) {
        headerSlot.innerHTML = '<span style="font-size:0.85rem; color:var(--gp-ink-2);">🔒 Secure Pit Gateway</span>';
      }

      saveState();
      showToast('Logged out securely. Form fields and session wiped.');
    }`;

if (oldLogoutRegex.test(html)) {
  html = html.replace(oldLogoutRegex, cleanLogoutLogic);
  console.log('✓ Replaced logout() with complete form wipe logic');
} else {
  console.error('⚠️ Could not match oldLogoutRegex');
}

// F. In openAccountSection: populate acc-modal-unique-code & prof-unique-code
const oldOpenAccountTarget = `document.getElementById('prof-subsystem').value = currentUser.subsystem;\n      document.getElementById('prof-role').value = currentUser.role;`;
const newOpenAccountTarget = `document.getElementById('prof-subsystem').value = currentUser.subsystem;
      document.getElementById('prof-role').value = currentUser.role;
      const codeVal = currentUser.uniqueCode || generateUniqueCode(currentUser.subsystem);
      const codeBadge = document.getElementById('acc-modal-unique-code');
      if (codeBadge) codeBadge.innerText = codeVal;
      const codeInput = document.getElementById('prof-unique-code');
      if (codeInput) codeInput.value = codeVal;`;

if (html.includes(oldOpenAccountTarget)) {
  html = html.replace(oldOpenAccountTarget, newOpenAccountTarget);
  console.log('✓ Populated unique codes in openAccountSection');
}

// G. In openMemberDrawer: populate drawer-member-code
const oldDrawerTarget = `document.getElementById('drawer-member-academic').innerText = \`\${member.branch || 'Mechanical'} · \${member.year || '3rd Year'}\`;`;
const newDrawerTarget = `document.getElementById('drawer-member-academic').innerText = \`\${member.branch || 'Mechanical'} · \${member.year || '3rd Year'}\`;
      const codeBadge = document.getElementById('drawer-member-code');
      if (codeBadge) codeBadge.innerText = '🏷️ ' + (member.uniqueCode || generateUniqueCode(member.subsystem));`;

if (html.includes(oldDrawerTarget) && !html.includes("codeBadge.innerText = '🏷️ '")) {
  html = html.replace(oldDrawerTarget, newDrawerTarget);
  console.log('✓ Populated drawer-member-code in openMemberDrawer');
}

// H. In loginSuccess: display unique code in header slot
const oldHeaderSlotLogin = `document.getElementById('header-user-slot').innerHTML = \`\n        <div class="user-profile-badge" onclick="openAccountSection()" title="Account & Activities">\n          <div class="badge-avatar">\n            \${user.avatarUrl ? \`<img src="\${user.avatarUrl}" class="avatar-img" alt="\${user.name}">\` : \`<span>\${user.name.charAt(0).toUpperCase()}</span>\`}\n          </div>\n          <div class="badge-info">\n            <h5>\${user.name}</h5>\n            <span>\${user.role} · \${user.subsystem}</span>\n          </div>\n        </div>\n        <button class="notif-btn" onclick="toggleNotifDrawer()" title="Alerts">\n          🔔\n          <span class="notif-badge" id="notif-count">\${notifications.length}</span>\n        </button>\n        <button class="btn-logout" onclick="logout()">Logout</button>\n      \`;`;

const newHeaderSlotLogin = `document.getElementById('header-user-slot').innerHTML = \`
        <div class="user-profile-badge" onclick="openAccountSection()" title="Account & Activities">
          <div class="badge-avatar">
            \${user.avatarUrl ? \`<img src="\${user.avatarUrl}" class="avatar-img" alt="\${user.name}">\` : \`<span>\${user.name.charAt(0).toUpperCase()}</span>\`}
          </div>
          <div class="badge-info">
            <h5>\${user.name} <span style="font-size:0.7rem; color:var(--gp-cyan); font-weight:700;">[\${user.uniqueCode || generateUniqueCode(user.subsystem)}]</span></h5>
            <span>\${user.role} · \${user.subsystem}</span>
          </div>
        </div>
        <button class="notif-btn" onclick="toggleNotifDrawer()" title="Alerts">
          🔔
          <span class="notif-badge" id="notif-count">\${notifications.length}</span>
        </button>
        <button class="btn-logout" onclick="logout()">Logout</button>
      \`;`;

if (html.includes(oldHeaderSlotLogin)) {
  html = html.replace(oldHeaderSlotLogin, newHeaderSlotLogin);
  console.log('✓ Displayed unique code in header-user-slot');
}

// I. Empty states for Tasks, Shared Files, and Notifications
// Tasks empty state in renderTasks
const oldRenderTasksEmpty = `      const cont = document.getElementById('task-cards-container');\n      cont.innerHTML = '';\n      document.getElementById('active-tasks-label').innerText = \`\${tasks.length} Active Pit Tasks\`;`;

const newRenderTasksEmpty = `      const cont = document.getElementById('task-cards-container');
      cont.innerHTML = '';
      document.getElementById('active-tasks-label').innerText = \`\${tasks.length} Active Pit Tasks\`;

      if (tasks.length === 0) {
        cont.innerHTML = \`
          <div style="grid-column: 1 / -1; padding: 48px 24px; text-align: center; background: var(--gp-surface); border: 1px dashed var(--gp-line); border-radius: 12px;">
            <div style="font-size: 2.2rem; margin-bottom: 8px;">📋</div>
            <h3 style="font-size: 1.05rem; color: var(--gp-ink); margin-bottom: 4px; font-weight:700;">0 Active Engineering Directives</h3>
            <p style="font-size: 0.82rem; color: var(--gp-ink-2); max-width: 440px; margin: 0 auto;">No tasks registered in the operations log. Captain, Vice Captain, Manager, or Subsystem Leads can assign tasks above.</p>
          </div>
        \`;
        return;
      }`;

if (html.includes(oldRenderTasksEmpty)) {
  html = html.replace(oldRenderTasksEmpty, newRenderTasksEmpty);
  console.log('✓ Added 0-state handler for renderTasks');
}

// Shared Files empty state in renderFilesHub
const oldRenderFilesEmpty = `      const cont = document.getElementById('file-grid-container');\n      cont.innerHTML = '';`;

const newRenderFilesEmpty = `      const cont = document.getElementById('file-grid-container');
      cont.innerHTML = '';

      if (sharedFiles.length === 0) {
        cont.innerHTML = \`
          <div style="grid-column: 1 / -1; padding: 36px 20px; text-align: center; background: var(--gp-surface); border: 1px dashed var(--gp-line); border-radius: 10px;">
            <div style="font-size: 2rem; margin-bottom: 6px;">📂</div>
            <h4 style="font-size: 0.95rem; color: var(--gp-ink); margin-bottom: 4px; font-weight:700;">0 Central Files Uploaded</h4>
            <p style="font-size: 0.8rem; color: var(--gp-ink-2);">No documents or CAD packages in repository. Upload team files using the button above.</p>
          </div>
        \`;
        return;
      }`;

if (html.includes(oldRenderFilesEmpty)) {
  html = html.replace(oldRenderFilesEmpty, newRenderFilesEmpty);
  console.log('✓ Added 0-state handler for renderFilesHub');
}

// Notifications empty state and dispatchCustomAlert function
const oldRenderNotifHead = `    function renderNotifications() {\n      const cont = document.getElementById('notif-list-container');`;

const newRenderNotifHead = `    function dispatchCustomAlert() {
      const input = document.getElementById('dispatch-alert-input');
      const prioSelect = document.getElementById('dispatch-alert-priority');
      const text = (input ? input.value : '').trim();
      if (!text) {
        showToast('⚠️ Please enter an alert message before dispatching.');
        return;
      }
      const isUrgent = prioSelect && prioSelect.value === 'urgent';
      const sender = currentUser ? \`\${currentUser.name} (\${currentUser.role})\` : 'Pit Operations';
      const fullText = (isUrgent ? '🚨 [URGENT DISPATCH] ' : '📢 [TEAM ALERT] ') + sender + ': ' + text;

      const newNotif = {
        id: Date.now(),
        text: fullText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        urgent: isUrgent
      };

      notifications.unshift(newNotif);
      saveState();
      renderNotifications();
      if (input) input.value = '';

      if (typeof playAudioVisualPing === 'function') {
        playAudioVisualPing();
      }
      showToast(fullText);

      fetch('/api/portal/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fullText,
          sender: sender,
          urgent: isUrgent
        })
      }).catch(e => console.warn('Worker notif sync:', e));
    }

    function renderNotifications() {
      const cont = document.getElementById('notif-list-container');`;

if (html.includes(oldRenderNotifHead) && !html.includes('function dispatchCustomAlert()')) {
  html = html.replace(oldRenderNotifHead, newRenderNotifHead);
  console.log('✓ Added dispatchCustomAlert function');
}

const oldNotifForeach = `      cont.innerHTML = '';\n      notifications.forEach(n => {`;
const newNotifForeach = `      cont.innerHTML = '';
      if (notifications.length === 0) {
        cont.innerHTML = \`
          <div style="padding: 30px 16px; text-align: center; color: var(--gp-ink-2); font-size: 0.82rem;">
            <div style="font-size: 1.8rem; margin-bottom: 6px;">🔔</div>
            <div style="font-weight: 600; color: var(--gp-ink);">0 Active Dispatches</div>
            <div>All operational alerts and team directives will appear here live.</div>
          </div>
        \`;
        return;
      }
      notifications.forEach(n => {`;

if (html.includes(oldNotifForeach)) {
  html = html.replace(oldNotifForeach, newNotifForeach);
  console.log('✓ Added 0-state handler for renderNotifications');
}

// -------------------------------------------------------------
// 3. SYNTAX VALIDATION
// -------------------------------------------------------------
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

console.log('🎉 Successfully applied all complete updates to site/portal.html and site/portal-sample.html!');
