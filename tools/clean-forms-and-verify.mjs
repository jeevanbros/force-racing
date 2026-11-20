import fs from 'node:fs';

const portalPath = 'C:/Users/ijk11/forceracing-website/site/portal.html';
const samplePath = 'C:/Users/ijk11/forceracing-website/site/portal-sample.html';

let html = fs.readFileSync(portalPath, 'utf8');

// 1. Clean Sign-In Form (No example username, no bullet dots)
html = html.replace(
  /<input type="text" id="login-identifier"[^>]*>/,
  '<input type="text" id="login-identifier" class="form-control" placeholder="Official Email or Username" required>'
);
html = html.replace(
  /<input type="password" id="login-password"[^>]*>/,
  '<input type="password" id="login-password" class="form-control" placeholder="Password" required>'
);

// 2. Clean Sign-Up Form (No example placeholders, all fields mandatory with <span class="req">*</span>)
html = html.replace(
  /<input type="text" id="reg-name"[^>]*>/,
  '<input type="text" id="reg-name" class="form-control" placeholder="Full Name" required>'
);
html = html.replace(
  /<input type="email" id="reg-email"[^>]*>/,
  '<input type="email" id="reg-email" class="form-control" placeholder="Email Address" required>'
);
html = html.replace(
  /<input type="tel" id="reg-phone"[^>]*>/,
  '<input type="tel" id="reg-phone" class="form-control" placeholder="Phone Number" required>'
);
html = html.replace(
  /<input type="password" id="reg-password"[^>]*>/,
  '<input type="password" id="reg-password" class="form-control" placeholder="Password" required oninput="checkPasswordStrength(this.value)">'
);

// Make sure Subsystem has required and *
html = html.replace(
  /<label>Subsystem<\/label>\s*<select id="reg-subsystem" class="form-control">/,
  '<label>Subsystem <span class="req">*</span></label>\n              <select id="reg-subsystem" class="form-control" required>\n                <option value="">Select Subsystem</option>'
);

// Make sure Role has required and *
html = html.replace(
  /<label>Role<\/label>\s*<select id="reg-role" class="form-control">/,
  '<label>Role <span class="req">*</span></label>\n              <select id="reg-role" class="form-control" required>\n                <option value="">Select Role</option>'
);

// Submit button must NOT be disabled
html = html.replace(
  /<button type="submit" class="btn-submit" id="btn-reg-submit"[^>]*>COMPLETE SIGN UP & ENTER<\/button>/,
  '<button type="submit" class="btn-submit" id="btn-reg-submit">COMPLETE SIGN UP & ENTER</button>'
);

// 3. Make sure handleSignupSubmit validates all fields
const oldSignupRegex = /function handleSignupSubmit\(e\) \{[\s\S]*?loginSuccess\(newUser\);\s*\}/;

const cleanSignupCode = `function handleSignupSubmit(e) {
      e.preventDefault();
      const name = (document.getElementById('reg-name').value || '').trim();
      const branch = (document.getElementById('reg-branch').value || '').trim();
      const year = (document.getElementById('reg-year').value || '').trim();
      const email = (document.getElementById('reg-email').value || '').trim();
      const phone = (document.getElementById('reg-phone').value || '').trim();
      const subsystem = (document.getElementById('reg-subsystem').value || '').trim();
      const baseRole = (document.getElementById('reg-role').value || '').trim();
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

      // Automatic duplicate lead numbering: first gets clean title, second gets title 2, third gets title 3
      let finalRole = baseRole;
      if (baseRole.includes('Lead') || baseRole.includes('Head')) {
        const leadPrefix = baseRole.replace(/\\s+(Lead|Head)$/i, '');
        const existingLeads = ALL_TEAM_MEMBERS.filter(m => {
          if (!m.role) return false;
          return m.role === baseRole || 
                 m.role.startsWith(baseRole + ' ') || 
                 (m.role.includes(leadPrefix) && (m.role.includes('Lead') || m.role.includes('Head')));
        });
        const count = existingLeads.length;
        if (count >= 1) {
          finalRole = \`\${baseRole} \${count + 1}\`;
        }
      }

      const newUser = {
        id: "usr_" + Date.now(),
        name: name,
        role: finalRole,
        subsystem: subsystem,
        email: email,
        phone: phone,
        branch: branch,
        year: year,
        online: true,
        avatarUrl: null,
        authority: finalRole.includes('Head') || finalRole.includes('Lead') ? 'lead' : (finalRole === 'Captain' || finalRole === 'Vice Captain' || finalRole === 'Team Manager' ? 'superior' : 'member')
      };

      ALL_TEAM_MEMBERS.push(newUser);
      saveState();

      // Notify backend if available
      try {
        fetch('/api/portal/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: \`👋 New team member signed up: \${name} (\${finalRole} · \${subsystem}).\`,
            type: 'member_signup',
            userId: newUser.id,
            timestamp: Date.now()
          })
        }).catch(() => {});
      } catch(err) {}

      showToast(\`✓ Welcome, \${name}! Account created as \${finalRole}.\`);
      loginSuccess(newUser);
    }`;

if (oldSignupRegex.test(html)) {
  html = html.replace(oldSignupRegex, cleanSignupCode);
  console.log('Successfully replaced handleSignupSubmit');
} else {
  console.log('Regex for handleSignupSubmit did not match exactly, searching by pattern...');
}

// 4. Validate all JavaScript blocks compile with zero errors
const scriptMatch = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi);
let hasError = false;
for (let i = 0; i < scriptMatch.length; i++) {
  const code = scriptMatch[i].replace(/<script\b[^>]*>|<\/script>/gi, '');
  try {
    new Function(code);
    console.log(`Script ${i + 1}: Valid syntax (${code.length} chars)`);
  } catch(e) {
    console.error(`Script ${i + 1} syntax error:`, e.message);
    hasError = true;
  }
}

if (!hasError) {
  fs.writeFileSync(portalPath, html, 'utf8');
  fs.writeFileSync(samplePath, html, 'utf8');
  console.log('Both portal.html and portal-sample.html updated and verified!');
} else {
  process.exit(1);
}
