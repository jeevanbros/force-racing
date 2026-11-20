import fs from 'node:fs';

const portalPath = 'C:/Users/ijk11/forceracing-website/site/portal.html';
const samplePath = 'C:/Users/ijk11/forceracing-website/site/portal-sample.html';
const workerPortalPath = 'C:/Users/ijk11/forceracing-website/worker/portal.js';

// =========================================================================
// 1. UPDATE site/portal.html
// =========================================================================
let html = fs.readFileSync(portalPath, 'utf8');

// A. Structured Unique ID Generator Function (Encodes: Department, Role, Year, Name)
const structuredGenCodeFunction = `    // Structured Unique ID Generator
    // Encodes: Series (FR26) - Department - Role - Academic Year - Name
    function generateUniqueCode(subsystemOrUser, roleArg, yearArg, nameArg) {
      let subsystem = subsystemOrUser;
      let role = roleArg;
      let year = yearArg;
      let name = nameArg;

      if (typeof subsystemOrUser === 'object' && subsystemOrUser !== null) {
        subsystem = subsystemOrUser.subsystem;
        role = subsystemOrUser.role;
        year = subsystemOrUser.year;
        name = subsystemOrUser.name;
      }

      // 1. Department / Subsystem Code
      const subMap = {
        'Chassis': 'CHS',
        'Powertrain': 'POW',
        'Aerodynamics': 'AER',
        'Electronics': 'ELE',
        'Suspension & Braking': 'SUS',
        'Suspension': 'SUS',
        'Brakes': 'BRK',
        'Management': 'MGT',
        'Leadership': 'LEAD',
        'Steering & Wheels': 'STR',
        'Social Media': 'MED'
      };
      let dept = 'GEN';
      if (subsystem) {
        for (const [k, v] of Object.entries(subMap)) {
          if (subsystem.toLowerCase().includes(k.toLowerCase())) {
            dept = v;
            break;
          }
        }
      }

      // 2. Role Code
      let rCode = 'MEM';
      const roleLower = (role || '').toLowerCase();
      if (roleLower.includes('captain') && !roleLower.includes('vice')) {
        rCode = 'CAPT';
      } else if (roleLower.includes('vice') || roleLower.includes('vc')) {
        rCode = 'VC';
      } else if (roleLower.includes('manager')) {
        rCode = 'MGR';
      } else if (roleLower.includes('lead') || roleLower.includes('head')) {
        rCode = 'LEAD';
      } else if (roleLower.includes('logistics')) {
        rCode = 'LOG';
      } else if (roleLower.includes('finance')) {
        rCode = 'FIN';
      } else if (roleLower.includes('public relations') || roleLower.includes('pr')) {
        rCode = 'PR';
      } else {
        rCode = 'MEM';
      }

      // 3. Academic Year Code
      let yCode = 'Y3';
      const yearLower = (year || '').toLowerCase();
      if (yearLower.includes('4') || yearLower.includes('final')) {
        yCode = 'Y4';
      } else if (yearLower.includes('3')) {
        yCode = 'Y3';
      } else if (yearLower.includes('2')) {
        yCode = 'Y2';
      } else if (yearLower.includes('1')) {
        yCode = 'Y1';
      }

      // 4. Name Code
      let nameCode = (name || 'CREW').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!nameCode) nameCode = 'CREW';
      if (nameCode.length > 12) nameCode = nameCode.substring(0, 12);

      return \`FR26-\${dept}-\${rCode}-\${yCode}-\${nameCode}\`;
    }`;

// Replace the old generateUniqueCode
const oldGenCodeRegex = /function generateUniqueCode\(subsystem\) \{[\s\S]*?return 'FR26-' \+ code \+ '-' \+ numStr;\s*\}/;
if (oldGenCodeRegex.test(html)) {
  html = html.replace(oldGenCodeRegex, structuredGenCodeFunction);
  console.log('✓ Replaced generateUniqueCode with structured encoder (Dept, Role, Year, Name)');
}

// B. Update OFFICIAL_WEBSITE_ROSTER with structured Unique Codes
const oldRosterRegex = /const OFFICIAL_WEBSITE_ROSTER = \[[\s\S]*?\];/;
const newStructuredRoster = `const OFFICIAL_WEBSITE_ROSTER = [
      { id: "dhanush", uniqueCode: "FR26-STR-CAPT-Y4-DHANUSH", name: "Dhanush", role: "Captain", subsystem: "Steering & Wheels", branch: "Mechanical", year: "Final Year", online: true, email: "captain@forceracing.in", phone: "+91 98765 00001", authority: "captain", avatarUrl: null },
      { id: "arun", uniqueCode: "FR26-POW-VC-Y4-ARUN", name: "Arun", role: "Vice Captain", subsystem: "Powertrain", branch: "Mechanical", year: "Final Year", online: true, email: "vicecaptain@forceracing.in", phone: "+91 98765 00002", authority: "vicecaptain", avatarUrl: null },
      { id: "sohail", uniqueCode: "FR26-CHS-MGR-Y4-SOHAIL", name: "Md. Sohail", role: "Team Manager", subsystem: "Chassis", branch: "Mechanical", year: "Final Year", online: false, email: "manager@forceracing.in", phone: "+91 80083 91525", authority: "manager", avatarUrl: null },
      { id: "hanumanth", uniqueCode: "FR26-CHS-LEAD-Y3-HANUMANTH", name: "Hanumanth", role: "Chassis Lead", subsystem: "Chassis", branch: "Mechanical", year: "3rd Year", online: true, email: "hanumanth@forceracing.in", phone: "+91 98765 10001", authority: "lead", avatarUrl: null },
      { id: "jeevan", uniqueCode: "FR26-CHS-LOG-Y3-JEEVAN", name: "Jeevan", role: "Chassis · Logistics", subsystem: "Chassis", branch: "Mechanical", year: "3rd Year", online: true, email: "jeevan@forceracing.in", phone: "+91 98765 10002", authority: "member", avatarUrl: null },
      { id: "navya", uniqueCode: "FR26-CHS-MEM-Y3-NAVYA", name: "Navya", role: "Team Member", subsystem: "Chassis", branch: "Mechanical", year: "3rd Year", online: false, email: "navya@forceracing.in", phone: "+91 98765 10003", authority: "member", avatarUrl: null },
      { id: "j_harsha", uniqueCode: "FR26-SUS-LEAD-Y3-JHARSHA", name: "J Harsha", role: "Suspension Lead", subsystem: "Suspension & Braking", branch: "Mechanical", year: "3rd Year", online: true, email: "jharsha@forceracing.in", phone: "+91 98765 10004", authority: "lead", avatarUrl: null },
      { id: "prashanth", uniqueCode: "FR26-SUS-MEM-Y3-PRASHANTH", name: "Prashanth", role: "Team Member", subsystem: "Suspension & Braking", branch: "Mechanical", year: "3rd Year", online: false, email: "prashanth@forceracing.in", phone: "+91 98765 10005", authority: "member", avatarUrl: null },
      { id: "karthik", uniqueCode: "FR26-POW-LEAD-Y3-KARTHIK", name: "Karthik", role: "Powertrain Lead", subsystem: "Powertrain", branch: "Mechanical", year: "3rd Year", online: true, email: "karthik@forceracing.in", phone: "+91 98765 10006", authority: "lead", avatarUrl: null },
      { id: "rakesh", uniqueCode: "FR26-POW-MEM-Y3-RAKESH", name: "Rakesh", role: "Team Member", subsystem: "Powertrain", branch: "Mechanical", year: "3rd Year", online: false, email: "rakesh@forceracing.in", phone: "+91 98765 10007", authority: "member", avatarUrl: null },
      { id: "dhanya", uniqueCode: "FR26-POW-PR-Y3-DHANYA", name: "Dhanya", role: "Public Relations · Powertrain", subsystem: "Powertrain", branch: "Mechanical", year: "3rd Year", online: true, email: "dhanya@forceracing.in", phone: "+91 98765 10008", authority: "member", avatarUrl: null },
      { id: "mahidhar", uniqueCode: "FR26-BRK-FIN-Y3-MAHIDHAR", name: "Mahidhar", role: "Brakes · Finance", subsystem: "Suspension & Braking", branch: "Mechanical", year: "3rd Year", online: false, email: "mahidhar@forceracing.in", phone: "+91 98765 10009", authority: "member", avatarUrl: null },
      { id: "p_harsha", uniqueCode: "FR26-BRK-MEM-Y3-PHARSHA", name: "P Harsha", role: "Team Member", subsystem: "Suspension & Braking", branch: "Mechanical", year: "3rd Year", online: false, email: "pharsha@forceracing.in", phone: "+91 98765 10010", authority: "member", avatarUrl: null },
      { id: "ruthvik", uniqueCode: "FR26-STR-MEM-Y3-RUTHVIK", name: "Ruthvik", role: "Steering & Wheels", subsystem: "Chassis", branch: "Mechanical", year: "3rd Year", online: false, email: "ruthvik@forceracing.in", phone: "+91 98765 10011", authority: "member", avatarUrl: null },
      { id: "ashish", uniqueCode: "FR26-MED-MEM-Y3-ASHISH", name: "Ashish", role: "Social Media", subsystem: "Management", branch: "Mechanical", year: "3rd Year", online: false, email: "ashish@forceracing.in", phone: "+91 98765 10012", authority: "member", avatarUrl: null }
    ];`;

if (oldRosterRegex.test(html)) {
  html = html.replace(oldRosterRegex, newStructuredRoster);
  console.log('✓ Updated OFFICIAL_WEBSITE_ROSTER with structured Unique Codes');
}

// C. Ensure signup generates structured code
html = html.replace(
  'const uniqueCode = officialMatch ? officialMatch.uniqueCode : generateUniqueCode(subsystem);',
  'const uniqueCode = officialMatch ? officialMatch.uniqueCode : generateUniqueCode(subsystem, role, year, name);'
);

// D. Ensure openAccountSection populates structured code
html = html.replace(
  'const codeVal = currentUser.uniqueCode || generateUniqueCode(currentUser.subsystem);',
  'const codeVal = currentUser.uniqueCode || generateUniqueCode(currentUser);'
);

// E. Ensure openMemberDrawer populates structured code
html = html.replace(
  "codeBadge.innerText = '🏷️ ' + (member.uniqueCode || generateUniqueCode(member.subsystem));",
  "codeBadge.innerText = '🏷️ ' + (member.uniqueCode || generateUniqueCode(member));"
);

// F. Ensure header slot uses structured code
html = html.replace(
  '${user.uniqueCode || generateUniqueCode(user.subsystem)}',
  '${user.uniqueCode || generateUniqueCode(user)}'
);

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

// =========================================================================
// 2. UPDATE worker/portal.js
// =========================================================================
let workerJs = fs.readFileSync(workerPortalPath, 'utf8');
workerJs = workerJs.replace(
  "uniqueCode: uniqueCode || ('FR26-MEM-' + (inMemoryMembers.length + 1)),",
  "uniqueCode: uniqueCode || (`FR26-${subsystem || 'CHS'}-${role || 'MEM'}-${year || 'Y3'}-${(name || 'CREW').toUpperCase().replace(/[^A-Z0-9]/g, '')}`),"
);
fs.writeFileSync(workerPortalPath, workerJs, 'utf8');

console.log('🎉 Successfully applied structured unique IDs across portal and worker!');
