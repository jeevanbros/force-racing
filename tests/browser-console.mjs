import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
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

const trackedRequests = [];

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, 'http://127.0.0.1:8080');
  
  if (parsed.pathname === '/api/analytics/track') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      trackedRequests.push({
        url: req.url,
        method: req.method,
        headers: req.headers,
        body
      });
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }
  if (parsed.pathname === '/api/public/config') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ ok: true, campaign: { enabled: true, title: "F1 Sim Racing" } }));
    return;
  }

  let filePath = path.join(siteDir, parsed.pathname === '/' ? 'index.html' : parsed.pathname);
  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath += '.html';
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(8080, '127.0.0.1', async () => {
  console.log('HTTP test server listening at http://127.0.0.1:8080');

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const tempDir = path.resolve(__dirname, '../.edge-temp');
  if (fs.existsSync(tempDir)) {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }

  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + tempDir
  ]);

  let versionData = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 250));
    try {
      const resp = await fetch('http://127.0.0.1:9222/json/version');
      if (resp.ok) {
        versionData = await resp.json();
        break;
      }
    } catch {}
  }

  if (!versionData) {
    console.error('Could not connect to Edge DevTools');
    edge.kill();
    server.close();
    process.exit(1);
  }

  console.log('Connected to Edge:', versionData.Browser);

  const pages = [
    'index.html',
    'campaign.html',
    'cars.html',
    'team.html',
    'verify.html',
    'contact.html',
    'recruitment.html',
    'support.html',
    'privacy.html',
    'trail.html'
  ];

  let totalErrors = 0;

  for (const pageName of pages) {
    // Create new tab on about:blank
    const newTabResp = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' });
    const tabInfo = await newTabResp.json();
    const ws = new WebSocket(tabInfo.webSocketDebuggerUrl);

    await new Promise((resolve) => {
      const errors = [];
      let reqId = 1;
      let loaded = false;

      const finish = () => {
        if (loaded) return;
        loaded = true;
        if (errors.length > 0) {
          console.error(`❌ Page ${pageName} had ${errors.length} JS errors:`);
          errors.forEach(e => console.error('   ', e));
          totalErrors += errors.length;
        } else {
          console.log(`✅ Page ${pageName} loaded with 0 JS console errors`);
        }
        ws.close();
        fetch(`http://127.0.0.1:9222/json/close/${tabInfo.id}`).catch(() => {}).finally(resolve);
      };

      const safetyTimer = setTimeout(finish, 2000);

      ws.onopen = () => {
        ws.send(JSON.stringify({ id: reqId++, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: reqId++, method: 'Log.enable' }));
        ws.send(JSON.stringify({ id: reqId++, method: 'Page.enable' }));
        ws.send(JSON.stringify({
          id: reqId++,
          method: 'Page.navigate',
          params: { url: `http://127.0.0.1:8080/${pageName}` }
        }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === 'Runtime.exceptionThrown') {
          const desc = msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text;
          errors.push(`Exception: ${desc}`);
        } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
          const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
          errors.push(`Console error: ${text}`);
        } else if (msg.method === 'Page.loadEventFired') {
          // Wait 1200ms after load so initial 1-second ping (/api/analytics/track) fires!
          setTimeout(() => {
            clearTimeout(safetyTimer);
            finish();
          }, 1200);
        }
      };

      ws.onerror = (e) => {
        clearTimeout(safetyTimer);
        finish();
      };
    });
  }

  // Cleanup
  edge.kill();
  server.close();

  console.log(`\n--- Telemetry Pings Received: ${trackedRequests.length} ---`);
  for (const tr of trackedRequests) {
    console.log(`Ping: body=${tr.body}`);
  }

  if (totalErrors > 0) {
    console.error(`\nFAILED: ${totalErrors} total console errors detected across pages!`);
    process.exit(1);
  } else {
    console.log('\nSUCCESS: All site pages loaded cleanly with ZERO console errors!');
    process.exit(0);
  }
});
