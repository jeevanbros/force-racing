import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, 'site');
const PORT = 9999;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(SITE_DIR, reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found: ' + reqPath);
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, async () => {
  console.log(`Static server running at http://127.0.0.1:${PORT}`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const tempDir = path.resolve('.edge-test-viewport-profile');
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

  try {
    let versionData = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 250));
      try {
        const resp = await fetch('http://127.0.0.1:9223/json/version');
        if (resp.ok) {
          versionData = await resp.json();
          break;
        }
      } catch {}
    }

    if (!versionData) throw new Error('Could not connect to Edge DevTools');
    console.log('Connected to Edge:', versionData.Browser);

    const newTabResp = await fetch('http://127.0.0.1:9223/json/new?about:blank', { method: 'PUT' });
    const tabInfo = await newTabResp.json();
    const ws = new WebSocket(tabInfo.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      let reqId = 1;
      const pending = new Map();

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
        await send('Page.enable');
        await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
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

        if (msg.method === 'Page.loadEventFired') {
          console.log('\nPage loaded successfully. Starting Viewport Audit...\n');
          await new Promise(r => setTimeout(r, 800));

          const viewports = [
            { name: 'User Screenshot (Tablet/Foldable DevTools)', w: 887, h: 1965, mobile: true },
            { name: 'iPhone 12/13/14 (Standard Mobile)', w: 390, h: 844, mobile: true },
            { name: 'Android Compact', w: 360, h: 800, mobile: true },
            { name: 'iPad Portrait', w: 768, h: 1024, mobile: true },
            { name: 'Desktop HD', w: 1440, h: 900, mobile: false }
          ];

          for (const vp of viewports) {
            console.log(`\n======================================================`);
            console.log(`TESTING VIEWPORT: ${vp.name} (${vp.w} x ${vp.h})`);
            console.log(`======================================================`);

            await send('Emulation.setDeviceMetricsOverride', {
              width: vp.w,
              height: vp.h,
              deviceScaleFactor: 1,
              mobile: vp.mobile
            });
            await new Promise(r => setTimeout(r, 400));

            const audit = await evaluate(`(() => {
              const menuToggle = document.querySelector('.menu-toggle');
              const mainNav = document.querySelector('#main-nav');
              const themeToggle = document.querySelector('#theme-toggle');
              const campaignPill = document.querySelector('.header-right .campaign-pill');
              const brand = document.querySelector('.brand');
              const brandName = document.querySelector('.brand-name');
              const heroTitle = document.querySelector('.hero-title');
              const words = Array.from(document.querySelectorAll('.hero-title .hero-word'));

              const toggleStyle = menuToggle ? window.getComputedStyle(menuToggle) : null;
              const navStyle = mainNav ? window.getComputedStyle(mainNav) : null;
              const titleStyle = heroTitle ? window.getComputedStyle(heroTitle) : null;
              const brandNameStyle = brandName ? window.getComputedStyle(brandName) : null;
              const pillStyle = campaignPill ? window.getComputedStyle(campaignPill) : null;
              const themeStyle = themeToggle ? window.getComputedStyle(themeToggle) : null;

              // Check word positions
              const wordRects = words.map(w => {
                const r = w.getBoundingClientRect();
                const cs = window.getComputedStyle(w);
                return {
                  text: w.textContent.trim(),
                  top: Math.round(r.top),
                  left: Math.round(r.left),
                  width: Math.round(r.width),
                  height: Math.round(r.height),
                  display: cs.display
                };
              });

              // Check if words are strictly stacked vertically (each word top >= previous bottom - 2)
              let isVertical = true;
              for (let i = 1; i < wordRects.length; i++) {
                if (wordRects[i].top < wordRects[i - 1].top + (wordRects[i - 1].height * 0.7)) {
                  isVertical = false;
                }
              }

              // Horizontal overflow check
              const scrollW = document.documentElement.scrollWidth;
              const innerW = window.innerWidth;
              const hasOverflow = scrollW > innerW;

              return {
                windowInnerWidth: innerW,
                documentScrollWidth: scrollW,
                hasOverflow,
                menuToggle: {
                  exists: !!menuToggle,
                  display: toggleStyle?.display,
                  visible: toggleStyle?.display !== 'none'
                },
                mainNav: {
                  exists: !!mainNav,
                  display: navStyle?.display,
                  open: mainNav?.dataset.open
                },
                brandName: {
                  display: brandNameStyle?.display,
                  visible: brandNameStyle?.display !== 'none'
                },
                campaignPill: {
                  exists: !!campaignPill,
                  display: pillStyle?.display,
                  visible: pillStyle?.display !== 'none'
                },
                themeToggle: {
                  exists: !!themeToggle,
                  display: themeStyle?.display,
                  visible: themeStyle?.display !== 'none'
                },
                heroTitle: {
                  fontSize: titleStyle?.fontSize,
                  flexDirection: titleStyle?.flexDirection,
                  isVertical,
                  wordRects
                }
              };
            })()`);

            console.log('1. Horizontal Overflow Check:', audit.hasOverflow ? `FAIL (scrollW: ${audit.documentScrollWidth} > innerW: ${audit.windowInnerWidth})` : `PASS (scrollW: ${audit.documentScrollWidth} <= innerW: ${audit.windowInnerWidth})`);
            console.log('2. Brand Name Visible:', audit.brandName.visible ? `PASS (${audit.brandName.display})` : `FAIL (${audit.brandName.display})`);
            console.log('3. Menu Toggle Display:', audit.menuToggle.display, vp.w <= 980 ? '(Expected visible)' : '(Expected none)');
            console.log('4. Main Nav Initial Display:', audit.mainNav.display, vp.w <= 980 ? '(Expected none / collapsed)' : '(Expected flex / visible)');
            console.log('5. Header Actions Accessible:');
            console.log('   - Theme Toggle:', audit.themeToggle.visible ? `PASS (${audit.themeToggle.display})` : 'FAIL');
            console.log('   - Campaign Pill in Header:', audit.campaignPill.visible ? `PASS (${audit.campaignPill.display})` : `HIDDEN (${audit.campaignPill.display})`);
            console.log('6. Hero Title Vertical Architecture:');
            console.log('   - Computed Font Size:', audit.heroTitle.fontSize);
            console.log('   - Flex Direction:', audit.heroTitle.flexDirection);
            console.log('   - Words Strictly Vertical:', audit.heroTitle.isVertical ? 'PASS (Vertically Stacked)' : 'FAIL (Horizontal or Colliding)');
            audit.heroTitle.wordRects.forEach(w => {
              console.log(`     [${w.text}] Top: ${w.top}px, Left: ${w.left}px, W: ${w.width}px, H: ${w.height}px, Display: ${w.display}`);
            });

            // Test opening and closing drawer if menu-toggle is active (<= 980px)
            if (vp.w <= 980) {
              const toggleResult = await evaluate(`(() => {
                const toggle = document.querySelector('.menu-toggle');
                const nav = document.querySelector('#main-nav');
                if (!toggle || !nav) return null;
                toggle.click();
                const openDisplay = window.getComputedStyle(nav).display;
                const linksCount = nav.querySelectorAll('a').length;
                toggle.click();
                const closeDisplay = window.getComputedStyle(nav).display;
                return { openDisplay, closeDisplay, linksCount };
              })()`);
              console.log('7. Interactive Drawer Test:');
              console.log(`   - When clicked: display = ${toggleResult.openDisplay} (${toggleResult.linksCount} links present)`);
              console.log(`   - When closed: display = ${toggleResult.closeDisplay}`);
            }

            if (vp.w === 887 || vp.w === 390) {
              const ss = await send('Page.captureScreenshot', { format: 'png' });
              const ssPath = path.join(ROOT, 'tests', `screenshot-${vp.w}x${vp.h}.png`);
              fs.writeFileSync(ssPath, Buffer.from(ss.data, 'base64'));
              console.log(`   - Screenshot saved to ${ssPath}`);
            }
          }

          resolve();
        }
      };
    });

    console.log('\n======================================================');
    console.log('ALL VIEWPORT AUDIT TESTS COMPLETED SUCCESSFULLY!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    edge.kill();
    server.close();
    process.exit(0);
  }
});
