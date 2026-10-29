import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(__dirname, '../site');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, 'http://127.0.0.1:8081');
  let filePath = path.join(siteDir, parsed.pathname === '/' ? 'support.html' : parsed.pathname);
  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) filePath += '.html';

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(8081, '127.0.0.1', async () => {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const tempDir = path.resolve(__dirname, '../.edge-temp-sponsor');
  if (fs.existsSync(tempDir)) {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }

  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + tempDir
  ]);

  let versionData = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 250));
    try {
      const resp = await fetch('http://127.0.0.1:9223/json/version');
      if (resp.ok) { versionData = await resp.json(); break; }
    } catch {}
  }

  if (!versionData) {
    console.error('Edge DevTools connection failed');
    edge.kill(); server.close(); process.exit(1);
  }

  const newTabResp = await fetch('http://127.0.0.1:9223/json/new?http://127.0.0.1:8081/support.html', { method: 'PUT' });
  const tab = await newTabResp.json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);

  let msgId = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = msgId++;
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === id) {
        ws.removeEventListener('message', handler);
        resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await new Promise(r => ws.addEventListener('open', r));
  await send('Page.enable');
  await send('Runtime.enable');

  await new Promise(r => setTimeout(r, 1200));

  // Run DOM assertions in page context
  const evalResult = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const results = [];
        const cards = document.querySelectorAll('#tiers .tier-card');
        results.push({ name: 'Four tier cards exist', pass: cards.length === 4, detail: cards.length });

        const hud = document.querySelector('.fr-tier-hud-bar');
        results.push({ name: 'HUD bar mounted', pass: !!hud });

        const bronzeCard = document.querySelector('#tiers .tier-card[data-tier="bronze"]');
        const silverCard = document.querySelector('#tiers .tier-card[data-tier="silver"]');
        const goldCard = document.querySelector('#tiers .tier-card[data-tier="gold"]');
        const titleCard = document.querySelector('#tiers .tier-card[data-tier="title"]');

        results.push({ name: 'Bronze card detected', pass: !!bronzeCard });
        results.push({ name: 'Silver card detected', pass: !!silverCard });
        results.push({ name: 'Gold card detected', pass: !!goldCard });
        results.push({ name: 'Title card detected', pass: !!titleCard });

        // Test click Bronze
        bronzeCard.click();
        const sponsorSection = document.getElementById('sponsor');
        const sponsorSelect = document.getElementById('sponsor-tier');
        const hudName = document.getElementById('fr-hud-tier-name');

        results.push({
          name: 'Click Bronze selects bronze tier',
          pass: bronzeCard.classList.contains('is-selected') &&
                bronzeCard.getAttribute('aria-checked') === 'true' &&
                !goldCard.classList.contains('is-selected'),
          detail: bronzeCard.className
        });

        results.push({
          name: 'Click Bronze updates HUD',
          pass: hudName && hudName.textContent.includes('BRONZE PARTNER') && hudName.textContent.includes('40%'),
          detail: hudName ? hudName.textContent : 'none'
        });

        results.push({
          name: 'Click Bronze unhides sponsor form',
          pass: sponsorSection && !sponsorSection.hidden && sponsorSection.style.display !== 'none'
        });

        results.push({
          name: 'Click Bronze pre-fills sponsor-tier dropdown',
          pass: sponsorSelect && sponsorSelect.value === 'Bronze Partner',
          detail: sponsorSelect ? sponsorSelect.value : 'none'
        });

        results.push({
          name: 'Click Bronze sets sponsor tierTheme',
          pass: sponsorSection && sponsorSection.dataset.tierTheme === 'bronze',
          detail: sponsorSection ? sponsorSection.dataset.tierTheme : 'none'
        });

        // Test click Title Partner
        titleCard.click();
        results.push({
          name: 'Click Title selects Title VIP',
          pass: titleCard.classList.contains('is-selected') &&
                sponsorSelect.value === 'Title Partner' &&
                sponsorSection.dataset.tierTheme === 'title',
          detail: sponsorSelect.value + ' / ' + sponsorSection.dataset.tierTheme
        });

        // Test two-way sync: changing select dropdown back to Silver Partner
        sponsorSelect.value = 'Silver Partner';
        sponsorSelect.dispatchEvent(new Event('change', { bubbles: true }));
        results.push({
          name: 'Changing select dropdown syncs back to Silver card',
          pass: silverCard.classList.contains('is-selected') &&
                silverCard.getAttribute('aria-checked') === 'true' &&
                !titleCard.classList.contains('is-selected')
        });

        return results;
      })()
    `,
    returnByValue: true
  });

  const testResults = evalResult.result.value;
  let allPassed = true;
  for (const t of testResults) {
    if (t.pass) {
      console.log('  PASS: ' + t.name + (t.detail ? ' (' + t.detail + ')' : ''));
    } else {
      console.error('  FAIL: ' + t.name + (t.detail ? ' (' + t.detail + ')' : ''));
      allPassed = false;
    }
  }

  ws.close();
  edge.kill();
  server.close();

  if (allPassed) {
    console.log('\nALL SPONSORSHIP BROWSER INTERACTIONS VERIFIED 100% SUCCESS!');
    process.exit(0);
  } else {
    process.exit(1);
  }
});
