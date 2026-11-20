import fs from 'node:fs';

const portalPath = 'C:/Users/ijk11/forceracing-website/site/portal.html';
const samplePath = 'C:/Users/ijk11/forceracing-website/site/portal-sample.html';
const workerPortalPath = 'C:/Users/ijk11/forceracing-website/worker/portal.js';

// =========================================================================
// 1. RESET BACKEND worker/portal.js TO 0, 0, 0, 0 CLEAN SLATE
// =========================================================================
let workerJs = fs.readFileSync(workerPortalPath, 'utf8');

const workerNotifRegex = /const inMemoryNotifications = \[[\s\S]*?\];\s*const inMemoryTasks = \[[\s\S]*?\];/;
const cleanWorkerStores = `const inMemoryNotifications = [];\n\nconst inMemoryTasks = [];`;

if (workerNotifRegex.test(workerJs)) {
  workerJs = workerJs.replace(workerNotifRegex, cleanWorkerStores);
  fs.writeFileSync(workerPortalPath, workerJs, 'utf8');
  console.log('Reset worker/portal.js in-memory tasks & notifications to 0');
}

// =========================================================================
// 2. FRONTEND portal.html REFINEMENT
// =========================================================================
let html = fs.readFileSync(portalPath, 'utf8');

// Reset default metric counters in HTML to 0
html = html.replace(/<div class="metric-num" id="stat-total-tasks">.*?<\/div>/, '<div class="metric-num" id="stat-total-tasks">0</div>');
html = html.replace(/<div class="metric-num"[^>]*id="stat-pending-tasks">.*?<\/div>/, '<div class="metric-num" style="color:var(--gp-accent);" id="stat-pending-tasks">0</div>');
html = html.replace(/<div class="metric-num"[^>]*id="stat-done-tasks">.*?<\/div>/, '<div class="metric-num" style="color:var(--gp-ok);" id="stat-done-tasks">0</div>');
html = html.replace(/<div class="metric-num"[^>]*id="stat-priority-tasks">.*?<\/div>/, '<div class="metric-num" style="color:var(--gp-gold);" id="stat-priority-tasks">0</div>');

// Reset subsystem telemetry labels in HTML
html = html.replace(/id="sub-stat-chassis">.*?<\/span>/, 'id="sub-stat-chassis">0 Pending · 0 Done</span>');
html = html.replace(/id="sub-stat-powertrain">.*?<\/span>/, 'id="sub-stat-powertrain">0 Pending · 0 Done</span>');
html = html.replace(/id="sub-stat-aero">.*?<\/span>/, 'id="sub-stat-aero">0 Pending · 0 Done</span>');
html = html.replace(/id="sub-stat-elec">.*?<\/span>/, 'id="sub-stat-elec">0 Pending · 0 Done</span>');

// Replace ALL_TEAM_MEMBERS, tasks, notifications, sharedFiles
const officialRosterCode = `    // ============================================================
    // OFFICIAL FORCE RACING CREW ROSTER (FROM WEBSITE)
    // ============================================================
    const OFFICIAL_WEBSITE_ROSTER = [
      { id: "dhanush", uniqueCode: "FR26-LEAD-01", name: "Dhanush", role: "Captain", subsystem: "Leadership", authority: "captain", email: "captain@forceracing.in", phone: "+91 98765 00001", online: true },
      { id: "arun", uniqueCode: "FR26-LEAD-02", name: "Arun", role: "Vice Captain", subsystem: "Leadership", authority: "vicecaptain", email: "vicecaptain@forceracing.in", phone: "+91 98765 00002", online: true },
      { id: "sohail", uniqueCode: "FR26-MGT-01", name: "Md. Sohail", role: "Team Manager", subsystem: "Management", authority: "manager", email: "manager@forceracing.in", phone: "+91 80083 91525", online: false },
      { id: "hanumanth", uniqueCode: "FR26-CHS-01", name: "Hanumanth", role: "Chassis Lead", subsystem: "Chassis", authority: "lead", email: "hanumanth@forceracing.in", phone: "+91 98765 10001", online: true },
      { id: "jeevan", uniqueCode: "FR26-CHS-02", name: "Jeevan", role: "Chassis · Logistics", subsystem: "Chassis", authority: "member", email: "jeevan@forceracing.in", phone: "+91 98765 10002", online: true },
      { id: "navya", uniqueCode: "FR26-CHS-03", name: "Navya", role: "Team Member", subsystem: "Chassis", authority: "member", email: "navya@forceracing.in", phone: "+91 98765 10003", online: false },
      { id: "j_harsha", uniqueCode: "FR26-SUS-01", name: "J Harsha", role: "Suspension Lead", subsystem: "Suspension & Braking", authority: "lead", email: "jharsha@forceracing.in", phone: "+91 98765 10004", online: true },
      { id: "prashanth", uniqueCode: "FR26-SUS-02", name: "Prashanth", role: "Team Member", subsystem: "Suspension & Braking", authority: "member", email: "prashanth@forceracing.in", phone: "+91 98765 10005", online: false },
      { id: "karthik", uniqueCode: "FR26-POW-01", name: "Karthik", role: "Powertrain Lead", subsystem: "Powertrain", authority: "lead", email: "karthik@forceracing.in", phone: "+91 98765 10006", online: true },
      { id: "rakesh", uniqueCode: "FR26-POW-02", name: "Rakesh", role: "Team Member", subsystem: "Powertrain", authority: "member", email: "rakesh@forceracing.in", phone: "+91 98765 10007", online: false },
      { id: "dhanya", uniqueCode: "FR26-POW-03", name: "Dhanya", role: "Public Relations · Powertrain", subsystem: "Powertrain", authority: "member", email: "dhanya@forceracing.in", phone: "+91 98765 10008", online: true },
      { id: "mahidhar", uniqueCode: "FR26-BRK-01", name: "Mahidhar", role: "Brakes · Finance", subsystem: "Suspension & Braking", authority: "member", email: "mahidhar@forceracing.in", phone: "+91 98765 10009", online: false },
      { id: "p_harsha", uniqueCode: "FR26-BRK-02", name: "P Harsha", role: "Team Member", subsystem: "Suspension & Braking", authority: "member", email: "pharsha@forceracing.in", phone: "+91 98765 10010", online: false },
      { id: "ruthvik", uniqueCode: "FR26-STR-01", name: "Ruthvik", role: "Steering & Wheels", subsystem: "Chassis", authority: "member", email: "ruthvik@forceracing.in", phone: "+91 98765 10011", online: false },
      { id: "ashish", uniqueCode: "FR26-MED-01", name: "Ashish", role: "Social Media", subsystem: "Management", authority: "member", email: "ashish@forceracing.in", phone: "+91 98765 10012", online: false }
    ];

    let ALL_TEAM_MEMBERS = [...OFFICIAL_WEBSITE_ROSTER];
    let currentUser = null;
    let activeDrawerMember = null;
    let replyQuoteContext = null;

    // ALL INITIAL DATA RESET TO 0, 0, 0, 0 (CLEAN SLATE)
    let tasks = [];
    let notifications = [];
    let sharedFiles = [];
    let offlineQueuedMessages = [];
    let chatThreads = {};
`;

// Helper to generate unique code for new signups
const uniqueCodeGenHelper = `
    function generateUniqueCode(subsystem) {
      const subMap = {
        'Chassis': 'CHS',
        'Powertrain': 'POW',
        'Aerodynamics': 'AER',
        'Electronics': 'ELE',
        'Suspension & Braking': 'SUS',
        'Management': 'MGT',
        'Leadership': 'LEAD'
      };
      const code = subMap[subsystem] || 'MEM';
      const count = ALL_TEAM_MEMBERS.filter(m => m.uniqueCode && m.uniqueCode.includes(code)).length + 1;
      const numStr = count < 10 ? '0' + count : String(count);
      return 'FR26-' + code + '-' + numStr;
    }
`;

const oldDataBlockRegex = /const ALL_SUBSYSTEMS = \[[\s\S]*?let tasks = \[[\s\S]*?\];/;
const newSubsystemsBlock = `const ALL_SUBSYSTEMS = [
      "Chassis",
      "Powertrain",
      "Aerodynamics",
      "Electronics",
      "Suspension & Braking",
      "Management"
    ];\n\n` + officialRosterCode + '\n' + uniqueCodeGenHelper;

if (oldDataBlockRegex.test(html)) {
  html = html.replace(oldDataBlockRegex, newSubsystemsBlock);
  console.log('Replaced roster and reset tasks/files/notifs to 0');
}

// =========================================================================
// 3. DISPLAY UNIQUE CODE IN VIEW PROFILE & MEMBER DRAWER
// =========================================================================
// In Account Section Profile Details: Add Unique Code field
const oldProfSubsystemRow = `          <div class="form-row">
            <div class="form-group">
              <label>Subsystem (Locked)</label>`;

const newProfSubsystemRow = `          <div class="form-group" style="margin-bottom:12px;">
            <label>Official Member Code (Unique ID)</label>
            <input type="text" id="prof-unique-code" class="form-control" disabled style="opacity:0.9; font-weight:700; color:var(--gp-cyan); cursor:not-allowed;">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Subsystem (Locked)</label>`;

if (html.includes(oldProfSubsystemRow) && !html.includes('prof-unique-code')) {
  html = html.replace(oldProfSubsystemRow, newProfSubsystemRow);
  console.log('Added prof-unique-code to Account modal');
}

// In openAccountSection: populate prof-unique-code
const oldOpenAccount = `      document.getElementById('prof-name').value = currentUser.name;
      document.getElementById('prof-email').value = currentUser.email;
      document.getElementById('prof-phone').value = currentUser.phone;
      document.getElementById('prof-subsystem').value = currentUser.subsystem;
      document.getElementById('prof-role').value = currentUser.role;`;

const newOpenAccount = `      document.getElementById('prof-name').value = currentUser.name;
      document.getElementById('prof-email').value = currentUser.email;
      document.getElementById('prof-phone').value = currentUser.phone;
      document.getElementById('prof-subsystem').value = currentUser.subsystem;
      document.getElementById('prof-role').value = currentUser.role;
      const uCodeInput = document.getElementById('prof-unique-code');
      if (uCodeInput) uCodeInput.value = currentUser.uniqueCode || generateUniqueCode(currentUser.subsystem);`;

if (html.includes(oldOpenAccount)) {
  html = html.replace(oldOpenAccount, newOpenAccount);
  console.log('Populated prof-unique-code in openAccountSection');
}

// In Member Drawer: display Unique Code badge
const oldDrawerAcademic = `<p id="drawer-member-academic">Mechanical · 3rd Year</p>`;
const newDrawerAcademic = `<p id="drawer-member-academic">Mechanical · 3rd Year</p>
          <div style="margin:4px 0;"><span id="drawer-member-code" class="badge-authority" style="background:rgba(0,240,255,0.12); border:1px solid var(--gp-cyan); color:var(--gp-cyan); font-size:0.75rem; padding:3px 10px;">FR26-MEM-01</span></div>`;

if (html.includes(oldDrawerAcademic) && !html.includes('drawer-member-code')) {
  html = html.replace(oldDrawerAcademic, newDrawerAcademic);
  console.log('Added drawer-member-code to Member Profile Drawer');
}

// In openMemberDrawer: populate drawer-member-code
const oldDrawerPopulate = `      document.getElementById('drawer-member-name').innerText = m.name;
      document.getElementById('drawer-member-role-sub').innerText = \`\${m.role} · \${m.subsystem}\`;
      document.getElementById('drawer-member-academic').innerText = \`\${m.branch || 'Engineering'} · \${m.year || 'Member'}\`;
      document.getElementById('drawer-member-contact').innerText = \`\${m.email || 'team@forceracing.in'} · \${m.phone || 'Active'}\`;`;

const newDrawerPopulate = `      document.getElementById('drawer-member-name').innerText = m.name;
      document.getElementById('drawer-member-role-sub').innerText = \`\${m.role} · \${m.subsystem}\`;
      document.getElementById('drawer-member-academic').innerText = \`\${m.branch || 'Engineering'} · \${m.year || 'Member'}\`;
      document.getElementById('drawer-member-contact').innerText = \`\${m.email || 'team@forceracing.in'} · \${m.phone || 'Active'}\`;
      const codeBadge = document.getElementById('drawer-member-code');
      if (codeBadge) codeBadge.innerText = '🏷️ ' + (m.uniqueCode || generateUniqueCode(m.subsystem));`;

if (html.includes(oldDrawerPopulate)) {
  html = html.replace(oldDrawerPopulate, newDrawerPopulate);
  console.log('Populated drawer-member-code in openMemberDrawer');
}

// =========================================================================
// 4. SIGNUP: GENERATE UNIQUE CODE & ANTI-MISMANAGEMENT CHECK
// =========================================================================
const cleanSignupLogic = `function handleSignupSubmit(e) {
      e.preventDefault();
      const name = (document.getElementById('reg-name').value || '').trim();
      const branch = (document.getElementById('reg-branch').value || '').trim();
      const year = (document.getElementById('reg-year').value || '').trim();
      const email = (document.getElementById('reg-email').value || '').trim();
      const phone = (document.getElementById('reg-phone').value || '').trim();
      let subsystem = (document.getElementById('reg-subsystem').value || '').trim();
      let baseRole = (document.getElementById('reg-role').value || '').trim();
      const pw = (document.getElementById('reg-password').value || '').trim();

      // Everything is mandatory validation
      if (!name || !branch || !year || !email || !phone || !subsystem || !baseRole || !pw) {
        showToast('⚠️ All fields are mandatory. Please fill in all required details.');
        return;
      }

      // Password requirements: 1 uppercase and 1 special symbol
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

      // ANTI-MISMANAGEMENT CHECK: Match against official website crew roster
      const nameLower = name.toLowerCase();
      const officialMatch = OFFICIAL_WEBSITE_ROSTER.find(m => 
        m.name.toLowerCase() === nameLower || 
        nameLower.includes(m.name.toLowerCase()) || 
        (m.email && m.email.toLowerCase() === email.toLowerCase())
      );

      if (officialMatch) {
        if (officialMatch.role !== baseRole && (baseRole === 'Captain' || baseRole === 'Vice Captain' || baseRole === 'Team Manager')) {
          showToast('🔒 Roster Locked: Matched official website crew. Assigned as ' + officialMatch.role + ' (' + officialMatch.subsystem + ').');
        }
        baseRole = officialMatch.role;
        subsystem = officialMatch.subsystem;
      } else {
        if (baseRole === 'Captain' || baseRole === 'Vice Captain' || baseRole === 'Team Manager') {
          showToast('⚠️ Leadership positions are designated to the official website roster leads.');
          return;
        }
      }

      const generatedCode = officialMatch ? (officialMatch.uniqueCode || generateUniqueCode(subsystem)) : generateUniqueCode(subsystem);

      const newUser = {
        id: "usr_" + Date.now(),
        uniqueCode: generatedCode,
        name: name,
        role: baseRole,
        subsystem: subsystem,
        email: email,
        phone: phone,
        branch: branch,
        year: year,
        online: true,
        avatarUrl: null,
        authority: baseRole.includes('Head') || baseRole.includes('Lead') ? 'lead' : (baseRole === 'Captain' ? 'captain' : (baseRole === 'Vice Captain' ? 'vicecaptain' : (baseRole === 'Team Manager' ? 'manager' : 'member')))
      };

      ALL_TEAM_MEMBERS.push(newUser);
      saveState();

      // Clean, immediate in-app entry: NO bot popups, NO external email dispatching
      showToast('✓ Welcome, ' + name + '! Assigned Code: ' + generatedCode);
      loginSuccess(newUser);
    }`;

html = html.replace(/function handleSignupSubmit\(e\) \{[\s\S]*?loginSuccess\(newUser\);\s*\}/, cleanSignupLogic);

// =========================================================================
// 5. CLEAN EVERYTHING ON LOGOUT: WIPE SIGNUP & SIGNIN FORMS COMPLETELY
// =========================================================================
const cleanLogoutLogic = `    function handleLogout() {
      // Clear current user state
      if (currentUser) {
        currentUser.online = false;
      }
      currentUser = null;
      activeDrawerMember = null;
      replyQuoteContext = null;
      localStorage.removeItem('force_portal_current_user');
      localStorage.removeItem('force_portal_session_expiry');
      localStorage.removeItem('force_portal_last_active');

      // Stop any notification polling
      if (typeof stopNotificationPolling === 'function') {
        stopNotificationPolling();
      }

      // WIPE EVERYTHING FROM SIGNUP AND SIGNIN FORMS
      const signupForm = document.getElementById('form-signup');
      if (signupForm) signupForm.reset();

      const loginForm = document.getElementById('form-login');
      if (loginForm) loginForm.reset();

      // Explicitly clear every single input field
      const fieldsToClear = [
        'reg-name', 'reg-branch', 'reg-year', 'reg-email', 'reg-phone', 
        'reg-subsystem', 'reg-role', 'reg-password', 
        'login-identifier', 'login-password'
      ];
      fieldsToClear.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });

      // Reset password strength bar and hint
      const pwBar = document.getElementById('pw-bar-fill');
      if (pwBar) {
        pwBar.style.width = '0%';
        pwBar.style.background = 'transparent';
      }
      const pwStatus = document.getElementById('pw-text-status');
      if (pwStatus) {
        pwStatus.innerHTML = 'Needs uppercase letter & special symbol';
      }

      // Switch back to clean Sign In tab
      switchAuthTab('login');

      // Show auth view and hide dashboard
      document.getElementById('dashboard-view').style.display = 'none';
      document.getElementById('auth-view').style.display = 'block';

      // Reset header slot
      const headerSlot = document.getElementById('header-user-slot');
      if (headerSlot) {
        headerSlot.innerHTML = '<span style="font-size:0.85rem; color:var(--gp-ink-2);">🔒 Secure Pit Gateway</span>';
      }

      showToast('Logged out securely. All session data and form inputs cleared.');
    }`;

html = html.replace(/function handleLogout\(\) \{[\s\S]*?showToast\('Logged out securely\.'\);\s*\}/, cleanLogoutLogic);

// =========================================================================
// 6. VALIDATE JAVASCRIPT SYNTAX IN ALL <SCRIPT> BLOCKS
// =========================================================================
const scriptMatches = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi);
for (let i = 0; i < scriptMatches.length; i++) {
  const code = scriptMatches[i].replace(/<script\b[^>]*>|<\/script>/gi, '');
  try {
    new Function(code);
    console.log(`Script ${i + 1}: Valid syntax (${code.length} chars)`);
  } catch(e) {
    console.error(`Script ${i + 1} syntax error:`, e.message);
    process.exit(1);
  }
}

fs.writeFileSync(portalPath, html, 'utf8');
fs.writeFileSync(samplePath, html, 'utf8');

console.log('Successfully applied all updates: Clean 0 Tasks, Official Roster Anti-Mismanagement, Unique Code Badge, and Full Form Wipe on Logout!');
