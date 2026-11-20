import fs from 'node:fs';

const portalPath = 'C:/Users/ijk11/forceracing-website/site/portal.html';
const samplePath = 'C:/Users/ijk11/forceracing-website/site/portal-sample.html';

let html = fs.readFileSync(portalPath, 'utf8');

// 1. Fix the syntax error in handleLoginSubmit
const brokenLogin = `    function handleLoginSubmit(e) {
      e.preventDefault();
      const id = document.getElementById('login-identifier').value.trim().toLowerCase();
      let u = ALL_TEAM_MEMBERS.find(x => x.id === id || x.email.toLowerCase() === id);
      if (!u) {
                else if (id.includes('capt') && !id.includes('vice')) u = ALL_TEAM_MEMBERS.find(x => x.id === 'captain');`;

const fixedLogin = `    function handleLoginSubmit(e) {
      e.preventDefault();
      const id = document.getElementById('login-identifier').value.trim().toLowerCase();
      let u = ALL_TEAM_MEMBERS.find(x => x.id === id || (x.email && x.email.toLowerCase() === id));
      if (!u) {
        if (id.includes('capt') && !id.includes('vice')) u = ALL_TEAM_MEMBERS.find(x => x.id === 'captain');`;

if (html.includes(brokenLogin)) {
  html = html.replace(brokenLogin, fixedLogin);
  console.log('Fixed handleLoginSubmit syntax error');
} else {
  // Try regex replace for any broken if (!u) { else if pattern
  html = html.replace(/if \(!u\) \{\s*else if/g, 'if (!u) {\n        if');
  console.log('Replaced broken if (!u) { else if pattern with if (!u) { if');
}

// 2. Remove disabled attribute from btn-reg-submit so button is always clickable with proper validation
html = html.replace(
  '<button type="submit" class="btn-submit" id="btn-reg-submit" disabled>COMPLETE SIGN UP & ENTER</button>',
  '<button type="submit" class="btn-submit" id="btn-reg-submit">COMPLETE SIGN UP & ENTER</button>'
);

// 3. Update checkPasswordStrength to not disable button
const oldCheckPw = `      if (!hasUpper || !hasSpecial) {
        bar.style.background = 'var(--gp-accent)';
        statusText.innerHTML = '<span style="color:var(--gp-accent);">⚠️ Needs at least 1 uppercase & 1 symbol</span>';
        submitBtn.disabled = true;
      } else {
        bar.style.background = 'var(--gp-ok)';
        statusText.innerHTML = '<span style="color:var(--gp-ok);">✓ Password strength valid</span>';
        submitBtn.disabled = false;
      }`;

const newCheckPw = `      if (!hasUpper || !hasSpecial) {
        if (bar) bar.style.background = 'var(--gp-accent)';
        if (statusText) statusText.innerHTML = '<span style="color:var(--gp-accent);">⚠️ Needs at least 1 uppercase & 1 symbol</span>';
      } else {
        if (bar) bar.style.background = 'var(--gp-ok)';
        if (statusText) statusText.innerHTML = '<span style="color:var(--gp-ok);">✓ Password strength valid</span>';
      }`;

if (html.includes(oldCheckPw)) {
  html = html.replace(oldCheckPw, newCheckPw);
  console.log('Updated checkPasswordStrength to provide visual guidance without breaking submit');
}

// 4. In handleSignupSubmit, add password validation check and visual error toast if requirements not met
const oldSignupStart = `    function handleSignupSubmit(e) {
      e.preventDefault();
      const name = document.getElementById('reg-name').value;`;

const newSignupStart = `    function handleSignupSubmit(e) {
      e.preventDefault();
      const pw = document.getElementById('reg-password').value;
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

      const name = document.getElementById('reg-name').value;`;

if (html.includes(oldSignupStart)) {
  html = html.replace(oldSignupStart, newSignupStart);
  console.log('Added explicit password check in handleSignupSubmit');
}

// Write to both files
fs.writeFileSync(portalPath, html, 'utf8');
fs.writeFileSync(samplePath, html, 'utf8');

console.log('Validating JavaScript syntax of portal.html...');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/g);
for (let i = 0; i < scriptMatch.length; i++) {
  const code = scriptMatch[i].replace(/<\/?script>/g, '');
  new Function(code);
  console.log(`Script ${i}: VALID SYNTAX`);
}
