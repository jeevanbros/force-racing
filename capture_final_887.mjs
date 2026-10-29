import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const tempDir = path.resolve('.edge-live-pin-verify2');
if (fs.existsSync(tempDir)) {
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
}

const edge = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9227',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=' + tempDir
]);

let versionData = null;
for (let i = 0; i < 20; i++) {
  await new Promise(r => setTimeout(r, 250));
  try {
    const resp = await fetch('http://127.0.0.1:9227/json/version');
    if (resp.ok) {
      versionData = await resp.json();
      break;
    }
  } catch {}
}

const newTabResp = await fetch('http://127.0.0.1:9227/json/new?about:blank', { method: 'PUT' });
const tabInfo = await newTabResp.json();
const ws = new WebSocket(tabInfo.webSocketDebuggerUrl);

await new Promise((res, rej) => {
  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const curId = id++;
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === curId) {
        ws.removeEventListener('message', handler);
        resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  ws.onopen = async () => {
    try {
      await send('Page.enable');
      await send('Emulation.setDeviceMetricsOverride', {
        width: 887,
        height: 1965,
        deviceScaleFactor: 2,
        mobile: false
      });
      await send('Page.navigate', { url: 'https://force-racing.force-racing-revival.workers.dev/?v=' + Date.now() });
      await new Promise(r => setTimeout(r, 2200));

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const buf = Buffer.from(shot.data, 'base64');
      const brainDir = 'C:\\Users\\ijk11\\.gemini\\antigravity-cli\\brain\\c48b967f-4ddf-41d0-b2a9-94874f2d1478';
      fs.writeFileSync(path.join(brainDir, 'final-live-user-887x1965.png'), buf);
      ws.close();
      res();
    } catch (err) {
      ws.close();
      rej(err);
    }
  };
});

edge.kill();
console.log('Capture 887x1965 done!');
process.exit(0);
