import fs from 'node:fs';

const portalPath = 'C:/Users/ijk11/forceracing-website/site/portal.html';
const samplePath = 'C:/Users/ijk11/forceracing-website/site/portal-sample.html';
const workerPortalPath = 'C:/Users/ijk11/forceracing-website/worker/portal.js';

// =========================================================================
// 1. RESET BACKEND worker/portal.js TO 0, 0, 0, 0
// =========================================================================
let workerJs = fs.readFileSync(workerPortalPath, 'utf8');

// Replace inMemoryNotifications and inMemoryTasks with clean empty arrays
const workerNotifRegex = /const inMemoryNotifications = \[[\s\S]*?\];\s*const inMemoryTasks = \[[\s\S]*?\];/;
const cleanWorkerStores = `const inMemoryNotifications = [];\n\nconst inMemoryTasks = [];`;

if (workerNotifRegex.test(workerJs)) {
  workerJs = workerJs.replace(workerNotifRegex, cleanWorkerStores);
  fs.writeFileSync(workerPortalPath, workerJs, 'utf8');
  console.log('Successfully reset worker/portal.js in-memory tasks and notifications to 0!');
} else {
  console.log('Worker stores pattern not matched, checking exact replacement');
}

// =========================================================================
// 2. RESET FRONTEND portal.html TO 0, 0, 0, 0 & OFFICIAL WEBSITE ROSTER
// =========================================================================
let html = fs.readFileSync(portalPath, 'utf8');

// Clear default metrics to 0 in HTML
html = html.replace(/<div class="metric-num" id="stat-total-tasks">.*?<\/div>/, '<div class="metric-num" id="stat-total-tasks">0</div>');
html = html.replace(/<div class="metric-num"[^>]*id="stat-pending-tasks">.*?<\/div>/, '<div class="metric-num" style="color:var(--gp-accent);" id="stat-pending-tasks">0</div>');
html = html.replace(/<div class="metric-num"[^>]*id="stat-done-tasks">.*?<\/div>/, '<div class="metric-num" style="color:var(--gp-ok);" id="stat-done-tasks">0</div>');
html = html.replace(/<div class="metric-num"[^>]*id="stat-priority-tasks">.*?<\/div>/, '<div class="metric-num" style="color:var(--gp-gold);" id="stat-priority-tasks">0</div>');

// Reset subsystem telemetry text
html = html.replace(/id="sub-stat-chassis">.*?<\/span>/, 'id="sub-stat-chassis">0 Pending · 0 Done</span>');
html = html.replace(/id="sub-stat-powertrain">.*?<\/span>/, 'id="sub-stat-powertrain">0 Pending · 0 Done</span>');
html = html.replace(/id="sub-stat-aero">.*?<\/span>/, 'id="sub-stat-aero">0 Pending · 0 Done</span>');
html = html.replace(/id="sub-stat-elec">.*?<\/span>/, 'id="sub-stat-elec">0 Pending · 0 Done</span>');

// Replace ALL_TEAM_MEMBERS, tasks, notifications, sharedFiles with official website crew & 0 tasks
const officialRosterCode = `    // ============================================================
    // OFFICIAL FORCE RACING CREW ROSTER (FROM WEBSITE)
    // ============================================================
    const OFFICIAL_WEBSITE_ROSTER = [
      { id: "dhanush", name: "Dhanush", role: "Captain", subsystem: "Leadership", authority: "captain", email: "captain@forceracing.in", phone: "+91 98765 00001", online: true },
      { id: "arun", name: "Arun", role: "Vice Captain", subsystem: "Leadership", authority: "vicecaptain", email: "vicecaptain@forceracing.in", phone: "+91 98765 00002", online: true },
      { id: "sohail", name: "Md. Sohail", role: "Team Manager", subsystem: "Management", authority: "manager", email: "manager@forceracing.in", phone: "+91 80083 91525", online: false },
      { id: "hanumanth", name: "Hanumanth", role: "Chassis Lead", subsystem: "Chassis", authority: "lead", email: "hanumanth@forceracing.in", phone: "+91 98765 10001", online: true },
      { id: "jeevan", name: "Jeevan", role: "Chassis · Logistics", subsystem: "Chassis", authority: "member", email: "jeevan@forceracing.in", phone: "+91 98765 10002", online: true },
      { id: "navya", name: "Navya", role: "Team Member", subsystem: "Chassis", authority: "member", email: "navya@forceracing.in", phone: "+91 98765 10003", online: false },
      { id: "j_harsha", name: "J Harsha", role: "Suspension Lead", subsystem: "Suspension & Braking", authority: "lead", email: "jharsha@forceracing.in", phone: "+91 98765 10004", online: true },
      { id: "prashanth", name: "Prashanth", role: "Team Member", subsystem: "Suspension & Braking", authority: "member", email: "prashanth@forceracing.in", phone: "+91 98765 10005", online: false },
      { id: "karthik", name: "Karthik", role: "Powertrain Lead", subsystem: "Powertrain", authority: "lead", email: "karthik@forceracing.in", phone: "+91 98765 10006", online: true },
      { id: "rakesh", name: "Rakesh", role: "Team Member", subsystem: "Powertrain", authority: "member", email: "rakesh@forceracing.in", phone: "+91 98765 10007", online: false },
      { id: "dhanya", name: "Dhanya", role: "Public Relations · Powertrain", subsystem: "Powertrain", authority: "member", email: "dhanya@forceracing.in", phone: "+91 98765 10008", online: true },
      { id: "mahidhar", name: "Mahidhar", role: "Brakes · Finance", subsystem: "Suspension & Braking", authority: "member", email: "mahidhar@forceracing.in", phone: "+91 98765 10009", online: false },
      { id: "p_harsha", name: "P Harsha", role: "Team Member", subsystem: "Suspension & Braking", authority: "member", email: "pharsha@forceracing.in", phone: "+91 98765 10010", online: false },
      { id: "ruthvik", name: "Ruthvik", role: "Steering & Wheels", subsystem: "Chassis", authority: "member", email: "ruthvik@forceracing.in", phone: "+91 98765 10011", online: false },
      { id: "ashish", name: "Ashish", role: "Social Media", subsystem: "Management", authority: "member", email: "ashish@forceracing.in", phone: "+91 98765 10012", online: false }
    ];

    let ALL_TEAM_MEMBERS = [...OFFICIAL_WEBSITE_ROSTER];
    let currentUser = null;
    let activeDrawerMember = null;
    let replyQuoteContext = null;

    // ALL INITIAL TASKS RESET TO ZERO (CLEAN SLATE)
    let tasks = [];
    let notifications = [];
    let sharedFiles = [];
    let offlineQueuedMessages = [];
    let chatThreads = {};
`;

// Replace the old team members and tasks declaration
const oldMembersRegex = /const ALL_SUBSYSTEMS = \[[\s\S]*?let tasks = \[[\s\S]*?\];/;
const newSubsystemsAndRoster = `const ALL_SUBSYSTEMS = [
      "Chassis",
      "Powertrain",
      "Aerodynamics",
      "Electronics",
      "Suspension & Braking",
      "Management"
    ];\n\n` + officialRosterCode;

if (oldMembersRegex.test(html)) {
  html = html.replace(oldMembersRegex, newSubsystemsAndRoster);
  console.log('Replaced team members and reset tasks to 0!');
}

// =========================================================================
// 3. ENFORCE ANTI-MISMANAGEMENT ON SIGNUP & LOGIN
// =========================================================================
// Cross-check: If Raju (Chassis Lead on website) tries to sign up as Captain, prevent it!
const oldSignupSubmitStart = `function handleSignupSubmit(e) {
      e.preventDefault();
      const name = (document.getElementById('reg-name').value || '').trim();
      const branch = (document.getElementById('reg-branch').value || '').trim();
      const year = (document.getElementById('reg-year').value || '').trim();
      const email = (document.getElementById('reg-email').value || '').trim();
      const phone = (document.getElementById('reg-phone').value || '').trim();
      const subsystem = (document.getElementById('reg-subsystem').value || '').trim();
      const baseRole = (document.getElementById('reg-role').value || '').trim();
      const pw = (document.getElementById('reg-password').value || '').trim();`;

const newSignupSubmitStart = `function handleSignupSubmit(e) {
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

      // ANTI-MISMANAGEMENT CHECK AGAINST OFFICIAL WEBSITE ROSTER:
      // If a member is registered on the website (e.g. Raju as Chassis Lead),
      // they cannot falsely sign up as Captain or Vice Captain!
      const nameLower = name.toLowerCase();
      const officialMatch = OFFICIAL_WEBSITE_ROSTER.find(m => 
        m.name.toLowerCase() === nameLower || 
        nameLower.includes(m.name.toLowerCase()) || 
        (m.email && m.email.toLowerCase() === email.toLowerCase())
      );

      if (officialMatch) {
        // Enforce their official website role & subsystem to prevent hierarchy tampering
        if (officialMatch.role !== baseRole && (baseRole === 'Captain' || baseRole === 'Vice Captain' || baseRole === 'Team Manager')) {
          showToast('🔒 Roster Locked: Matched as ' + officialMatch.role + ' on the website. Role assigned to official department to prevent mismanagement.');
        }
        baseRole = officialMatch.role;
        subsystem = officialMatch.subsystem;
      } else {
        // If not on official roster, block unauthorized Captain / Vice Captain claims
        if (baseRole === 'Captain' || baseRole === 'Vice Captain' || baseRole === 'Team Manager') {
          showToast('⚠️ Leadership roles are reserved for designated website roster leads. Please select your engineering subsystem role.');
          return;
        }
      }`;

if (html.includes(oldSignupSubmitStart)) {
  html = html.replace(oldSignupSubmitStart, newSignupSubmitStart);
  console.log('Added anti-mismanagement check to handleSignupSubmit');
}

// In handleLoginSubmit: match official roster easily by name or email
const cleanLoginHandler = `    function handleLoginSubmit(e) {
      e.preventDefault();
      const id = (document.getElementById('login-identifier').value || '').trim().toLowerCase();
      let u = ALL_TEAM_MEMBERS.find(x => x.id === id || (x.email && x.email.toLowerCase() === id) || x.name.toLowerCase() === id);
      if (!u) {
        const official = OFFICIAL_WEBSITE_ROSTER.find(x => x.name.toLowerCase().includes(id) || (x.email && x.email.toLowerCase().includes(id)));
        if (official) u = official;
        else u = ALL_TEAM_MEMBERS[0];
      }
      loginSuccess(u);
    }`;

html = html.replace(/function handleLoginSubmit\(e\) \{[\s\S]*?loginSuccess\(u\);\s*\}/, cleanLoginHandler);

// =========================================================================
// 4. IN-APP NOTIFICATION APP & DISPATCH ALERTS
// =========================================================================
// Enhance notification drawer with a dedicated "Dispatch Team Alert" form for leadership
const notifDrawerHeader = `<div class="notif-head">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:1.3rem;">🔔</span>
        <h3>PIT WALL NOTIFICATION APP</h3>
      </div>
      <button class="btn-close-modal" onclick="toggleNotifDrawer()">×</button>
    </div>

    <!-- Notification App Tabs -->
    <div style="display:flex; border-bottom:1px solid var(--gp-line); background:var(--gp-surface-elevated);">
      <button id="tab-notif-live" class="auth-tab active" style="flex:1; padding:10px; font-size:0.8rem;" onclick="switchNotifTab('live')">LIVE ALERTS</button>
      <button id="tab-notif-dispatch" class="auth-tab" style="flex:1; padding:10px; font-size:0.8rem;" onclick="switchNotifTab('dispatch')">📢 DISPATCH ALERT</button>
      <button id="tab-notif-queue" class="auth-tab" style="flex:1; padding:10px; font-size:0.8rem;" onclick="switchNotifTab('queue')">OFFLINE QUEUE</button>
    </div>

    <!-- Tab 2: Dispatch Team Alert Composer -->
    <div id="notif-view-dispatch" style="display:none; padding:16px;">
      <h4 style="font-family:var(--gp-font-head); font-size:1.1rem; margin-bottom:8px;">DISPATCH TEAM BROADCAST ALERT</h4>
      <p style="font-size:0.75rem; color:var(--gp-ink-2); margin-bottom:12px;">Instant high-priority notification broadcast to all online team members with sound chime.</p>
      
      <div class="form-group" style="margin-bottom:10px;">
        <label style="font-size:0.75rem;">Target Audience</label>
        <select id="dispatch-target-audience" class="form-control" style="padding:8px; font-size:0.85rem;">
          <option value="all">Entire Race Team (All Subsystems)</option>
          <option value="Chassis">Chassis Department</option>
          <option value="Powertrain">Powertrain Department</option>
          <option value="Aerodynamics">Aerodynamics Department</option>
          <option value="Suspension & Braking">Suspension & Braking</option>
          <option value="Management">Management & Logistics</option>
        </select>
      </div>

      <div class="form-group" style="margin-bottom:12px;">
        <label style="font-size:0.75rem;">Alert Message</label>
        <textarea id="dispatch-alert-msg" class="form-control" rows="3" placeholder="e.g. Bulkhead weld inspection commencing in Workshop at 14:00..." style="padding:8px; font-size:0.85rem; resize:vertical;"></textarea>
      </div>

      <button type="button" class="btn-submit" style="margin-top:0; padding:10px; font-size:0.95rem; background:var(--gp-accent);" onclick="handleDispatchTeamAlert()">
        🚀 DISPATCH LIVE ALERT
      </button>
    </div>`;

html = html.replace(/<div class="notif-head">[\s\S]*?<\/div>\s*<!-- Notification Center Tabs -->[\s\S]*?<\/div>/, notifDrawerHeader);

// Add switchNotifTab and handleDispatchTeamAlert JS
const notifAppJs = `
    function switchNotifTab(tab) {
      document.getElementById('tab-notif-live').classList.toggle('active', tab === 'live');
      const tabDisp = document.getElementById('tab-notif-dispatch');
      if (tabDisp) tabDisp.classList.toggle('active', tab === 'dispatch');
      document.getElementById('tab-notif-queue').classList.toggle('active', tab === 'queue');

      const liveList = document.getElementById('notif-list-container');
      const queueList = document.getElementById('notif-queue-container');
      const dispView = document.getElementById('notif-view-dispatch');

      if (liveList) liveList.style.display = tab === 'live' ? 'block' : 'none';
      if (queueList) queueList.style.display = tab === 'queue' ? 'block' : 'none';
      if (dispView) dispView.style.display = tab === 'dispatch' ? 'block' : 'none';
    }

    function handleDispatchTeamAlert() {
      const msgInput = document.getElementById('dispatch-alert-msg');
      const targetSelect = document.getElementById('dispatch-target-audience');
      const msg = (msgInput ? msgInput.value : '').trim();
      const target = targetSelect ? targetSelect.value : 'all';

      if (!msg) {
        showToast('⚠️ Please write an alert message before dispatching.');
        return;
      }

      const alertText = '📢 ' + (currentUser ? currentUser.name + ' (' + currentUser.role + ')' : 'Leadership') + ': ' + msg;
      
      const notif = {
        id: Date.now(),
        text: alertText,
        type: 'team_alert',
        target: target,
        timestamp: Date.now()
      };

      notifications.unshift(notif);
      saveState();

      // Dispatch to backend
      try {
        fetch('/api/portal/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notif)
        }).catch(() => {});
      } catch(e) {}

      playAudioVisualPing();
      showToast('🚀 Alert dispatched to ' + (target === 'all' ? 'entire team' : target + ' subsystem') + '!');
      if (msgInput) msgInput.value = '';
      switchNotifTab('live');
      renderNotifications();
    }
`;

if (!html.includes('function handleDispatchTeamAlert()')) {
  html = html.replace('function renderNotifications() {', notifAppJs + '\n    function renderNotifications() {');
}

// In renderTasks: if tasks.length === 0, display clean empty state
const cleanEmptyTasks = `      if (tasks.length === 0) {
        cont.innerHTML = '<div style="text-align:center; padding:36px 20px; border:1px dashed var(--gp-line-2); border-radius:var(--gp-radius); color:var(--gp-ink-2);"><div style="font-size:2.2rem; margin-bottom:8px;">📋</div><h4 style="font-family:var(--gp-font-head); font-size:1.2rem; color:var(--gp-ink);">0 Active Engineering Tasks</h4><p style="font-size:0.85rem; margin-top:4px;">No deliverables assigned yet. System ready for official team dispatch.</p></div>';
        return;
      }`;

html = html.replace("if (tasks.length === 0) {\n        cont.innerHTML = '<p style=\"font-size:0.85rem; color:var(--gp-ink-2); padding:10px;\">No tasks currently assigned.</p>';\n        return;\n      }", cleanEmptyTasks);

// Write to portal.html and portal-sample.html
fs.writeFileSync(portalPath, html, 'utf8');
fs.writeFileSync(samplePath, html, 'utf8');

console.log('Successfully applied Official Website Roster, Anti-Mismanagement Lock, 0 Tasks Reset, and In-App Notification Dispatch App!');
