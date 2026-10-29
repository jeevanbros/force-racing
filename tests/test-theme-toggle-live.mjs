import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const tempDir = path.resolve('.edge-test-live-verify');
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

// Wait for DevTools port
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
  process.exit(1);
}

console.log('Connected to Edge:', versionData.Browser);

const targetUrl = 'https://force-racing.force-racing-revival.workers.dev/';
console.log('Testing live URL:', targetUrl);

const newTabResp = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' });
const tabInfo = await newTabResp.json();
const ws = new WebSocket(tabInfo.webSocketDebuggerUrl);

await new Promise((resolve) => {
  let reqId = 1;
  const pending = new Map();
  const consoleErrors = [];

  function send(method, params = {}) {
    return new Promise((res, rej) => {
      const id = reqId++;
      pending.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  function evaluate(expr) {
    return send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    }).then(r => r.result?.value);
  }

  ws.onopen = async () => {
    await send('Runtime.enable');
    await send('Log.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: targetUrl });
  };

  ws.onmessage = async (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) rej(msg.error);
      else res(msg.result);
      return;
    }

    if (msg.method === 'Runtime.exceptionThrown') {
      const desc = msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text;
      consoleErrors.push(`Exception: ${desc}`);
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
      consoleErrors.push(`Console error: ${text}`);
    } else if (msg.method === 'Page.loadEventFired') {
      console.log('Page loaded. Waiting 1.5s for initial layout & scripts...');
      await new Promise(r => setTimeout(r, 1500));

      console.log('\n======================================================');
      console.log('STEP 1: VERIFYING INITIAL DARK MODE STATE');
      console.log('======================================================');
      const darkState = await evaluate(`(() => {
        const root = document.documentElement;
        const btn = document.querySelector('.theme-toggle');
        const icon = btn?.querySelector('.theme-icon')?.textContent?.trim();
        const text = btn?.querySelector('.theme-text')?.textContent?.trim();
        const ariaPressed = btn?.getAttribute('aria-pressed');
        const ariaLabel = btn?.getAttribute('aria-label');
        const title = btn?.getAttribute('title');
        const rootTheme = root.getAttribute('data-theme');
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        const bodyColor = window.getComputedStyle(document.body).color;
        const subtitle = document.querySelector('.hero-subtitle');
        const subtitleColor = subtitle ? window.getComputedStyle(subtitle).color : null;
        const subtitleShadow = subtitle ? window.getComputedStyle(subtitle).textShadow : null;

        return {
          rootTheme,
          btnFound: !!btn,
          icon,
          text,
          ariaPressed,
          ariaLabel,
          title,
          bodyBg,
          bodyColor,
          subtitleFound: !!subtitle,
          subtitleColor,
          subtitleShadow
        };
      })()`);
      console.log('Dark State:', JSON.stringify(darkState, null, 2));

      console.log('\n======================================================');
      console.log('STEP 2: CLICKING THEME TOGGLE (SWITCH TO LIGHT MODE)');
      console.log('======================================================');
      await evaluate(`(() => {
        const btn = document.querySelector('.theme-toggle');
        if (btn) btn.click();
      })()`);

      // Wait 600ms for 480ms transition to complete
      await new Promise(r => setTimeout(r, 700));

      const lightState = await evaluate(`(() => {
        const root = document.documentElement;
        const btn = document.querySelector('.theme-toggle');
        const icon = btn?.querySelector('.theme-icon')?.textContent?.trim();
        const text = btn?.querySelector('.theme-text')?.textContent?.trim();
        const ariaPressed = btn?.getAttribute('aria-pressed');
        const ariaLabel = btn?.getAttribute('aria-label');
        const title = btn?.getAttribute('title');
        const rootTheme = root.getAttribute('data-theme');
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        const bodyColor = window.getComputedStyle(document.body).color;
        const header = document.querySelector('.site-header');
        const headerBg = header ? window.getComputedStyle(header).backgroundColor : null;
        const nav = document.querySelector('.main-nav');
        const navLink = document.querySelector('.main-nav a');
        const card = document.querySelector('.event-featured-card') || document.querySelector('.simulator-card');
        const cardBg = card ? window.getComputedStyle(card).backgroundColor : null;
        const cardBorder = card ? window.getComputedStyle(card).borderColor : null;
        const subtitle = document.querySelector('.hero-subtitle');
        const subtitleColor = subtitle ? window.getComputedStyle(subtitle).color : null;
        const subtitleShadow = subtitle ? window.getComputedStyle(subtitle).textShadow : null;

        return {
          rootTheme,
          icon,
          text,
          ariaPressed,
          ariaLabel,
          title,
          bodyBg,
          bodyColor,
          headerBg,
          cardBg,
          cardBorder,
          subtitleColor,
          subtitleShadow,
          transitions: {
            body: window.getComputedStyle(document.body).transition,
            header: header ? window.getComputedStyle(header).transition : null,
            nav: nav ? window.getComputedStyle(nav).transition : null,
            navLink: navLink ? window.getComputedStyle(navLink).transition : null,
            card: card ? window.getComputedStyle(card).transition : null
          }
        };
      })()`);
      console.log('Light State:', JSON.stringify(lightState, null, 2));

      console.log('\n======================================================');
      console.log('STEP 3: CLICKING THEME TOGGLE (SWITCH BACK TO DARK MODE)');
      console.log('======================================================');
      await evaluate(`(() => {
        const btn = document.querySelector('.theme-toggle');
        if (btn) btn.click();
      })()`);

      await new Promise(r => setTimeout(r, 700));

      const backDarkState = await evaluate(`(() => {
        const root = document.documentElement;
        const btn = document.querySelector('.theme-toggle');
        const icon = btn?.querySelector('.theme-icon')?.textContent?.trim();
        const text = btn?.querySelector('.theme-text')?.textContent?.trim();
        const ariaPressed = btn?.getAttribute('aria-pressed');
        const ariaLabel = btn?.getAttribute('aria-label');
        const rootTheme = root.getAttribute('data-theme');
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        const bodyColor = window.getComputedStyle(document.body).color;
        return {
          rootTheme,
          icon,
          text,
          ariaPressed,
          ariaLabel,
          bodyBg,
          bodyColor
        };
      })()`);
      console.log('Back to Dark State:', JSON.stringify(backDarkState, null, 2));

      console.log('\n======================================================');
      console.log('STEP 4: CONSOLE ERROR AUDIT');
      console.log('======================================================');
      console.log(`Total console errors: ${consoleErrors.length}`);
      consoleErrors.forEach(e => console.error('  ', e));

      ws.close();
      await fetch(`http://127.0.0.1:9222/json/close/${tabInfo.id}`).catch(() => {});
      edge.kill();

      // Assertions
      const checks = [
        { desc: 'Initial dark body background is rgb(9, 11, 16)', pass: darkState.bodyBg === 'rgb(9, 11, 16)' },
        { desc: 'Initial dark icon is 🌙', pass: darkState.icon === '🌙' },
        { desc: 'Initial dark label is "Switch to light mode"', pass: darkState.ariaLabel === 'Switch to light mode' },
        { desc: 'Initial aria-pressed is "false"', pass: darkState.ariaPressed === 'false' },
        { desc: 'Light mode data-theme is "light"', pass: lightState.rootTheme === 'light' },
        { desc: 'Light mode body background is rgb(248, 250, 252)', pass: lightState.bodyBg === 'rgb(248, 250, 252)' },
        { desc: 'Light mode body text is rgb(11, 15, 25)', pass: lightState.bodyColor === 'rgb(11, 15, 25)' },
        { desc: 'Light mode header background is rgba(255, 255, 255, 0.92)', pass: lightState.headerBg === 'rgba(255, 255, 255, 0.92)' },
        { desc: 'Light mode card background is rgb(255, 255, 255)', pass: lightState.cardBg === 'rgb(255, 255, 255)' },
        { desc: 'Light mode icon is ☀️', pass: lightState.icon === '☀️' },
        { desc: 'Light mode label is "Switch to dark mode"', pass: lightState.ariaLabel === 'Switch to dark mode' },
        { desc: 'Light mode aria-pressed is "true"', pass: lightState.ariaPressed === 'true' },
        { desc: 'Hero subtitle color in light mode is rgba(255, 255, 255, 0.92)', pass: lightState.subtitleColor === 'rgba(255, 255, 255, 0.92)' },
        { desc: 'Hero subtitle text-shadow in light mode is 0 1px 4px rgba(0,0,0,0.85)', pass: lightState.subtitleShadow.includes('0px 1px 4px') && lightState.subtitleShadow.includes('0.85') },
        { desc: 'Body transition includes 0.48s (480ms)', pass: (lightState.transitions.body || '').includes('0.48s') },
        { desc: 'Header transition includes 0.48s (480ms)', pass: (lightState.transitions.header || '').includes('0.48s') },
        { desc: 'Nav transition includes 0.48s (480ms)', pass: (lightState.transitions.nav || '').includes('0.48s') },
        { desc: 'Nav link transition includes 0.48s (480ms)', pass: (lightState.transitions.navLink || '').includes('0.48s') },
        { desc: 'Card transition includes 0.48s (480ms)', pass: (lightState.transitions.card || '').includes('0.48s') },
        { desc: 'Back to dark root theme is "dark"', pass: backDarkState.rootTheme === 'dark' },
        { desc: 'Back to dark icon is 🌙', pass: backDarkState.icon === '🌙' },
        { desc: 'Back to dark aria-pressed is "false"', pass: backDarkState.ariaPressed === 'false' },
        { desc: 'Back to dark body background is rgb(9, 11, 16)', pass: backDarkState.bodyBg === 'rgb(9, 11, 16)' },
        { desc: 'Zero JS console errors', pass: consoleErrors.length === 0 }
      ];

      console.log('\n======================================================');
      console.log('CHECK RESULTS:');
      console.log('======================================================');
      let allPassed = true;
      for (const c of checks) {
        if (c.pass) {
          console.log(`✅ PASS: ${c.desc}`);
        } else {
          console.error(`❌ FAIL: ${c.desc}`);
          allPassed = false;
        }
      }

      if (allPassed) {
        console.log('\n🎉 ALL 24 VERIFICATION CHECKS PASSED PERFECTLY!');
        resolve(true);
      } else {
        console.error('\n⚠️ SOME CHECKS FAILED!');
        resolve(false);
      }
    }
  };
});
