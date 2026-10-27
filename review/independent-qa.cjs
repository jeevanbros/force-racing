/* Read-only site review. Run from the project root with node review/independent-qa.cjs. */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('/Users/megha/Documents/Work/Galeport/company/website/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8769/';
const ROUTES = ['index.html', 'cars.html', 'team.html', 'support.html', 'contact.html', 'campaign.html', 'privacy.html'];
const WIDTHS = [320, 390, 768, 1440, 1920];
const FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSdojQE57Sd9rPsMwwrRuy-RQVNfyL4LaRf8h7srZAYWspcVcw/viewform?usp=dialog';
const AXE = '/Users/megha/Documents/Work/Galeport/AI/skills/gale-design/scripts/vendor/axe.min.js';
const output = { started: new Date().toISOString(), base: BASE, registrationExpected: FORM, viewports: [], keyboard: [], noJavaScript: [], reducedMotion: [], localLinks: [], source: {}, errors: [] };
fs.mkdirSync(path.join(__dirname, 'screenshots'), { recursive: true });
const normalize = value => value.replace(/\s+/g, ' ').trim();
const comparable = value => normalize(value.toUpperCase().replace(/[’‘]/g, "'").replace(/[–—‑]/g, '-').replace(/POWERTRAIN/g, 'POWER-TRAIN'));

async function inspect(page) {
  return page.evaluate(() => {
    const visible = e => !!(e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none');
    const text = e => e.innerText?.replace(/\s+/g, ' ').trim();
    return {
      title: document.title, lang: document.documentElement.lang,
      description: document.querySelector('meta[name="description"]')?.content,
      robots: document.querySelector('meta[name="robots"]')?.content,
      h1: [...document.querySelectorAll('h1')].map(e => ({ text: text(e), visible: visible(e) })),
      main: document.querySelectorAll('main').length,
      documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth,
      bodyText: document.body.innerText,
      overflowElements: [...document.querySelectorAll('body *')].filter(visible).filter(e => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1) && getComputedStyle(e).position !== 'fixed';
      }).slice(0, 15).map(e => ({ tag: e.tagName, class: e.className?.baseVal ?? e.className, text: text(e)?.slice(0, 100), left: e.getBoundingClientRect().left, right: e.getBoundingClientRect().right })),
      brokenImages: [...document.images].filter(e => !e.complete || !e.naturalWidth).map(e => ({ src: e.currentSrc || e.src, alt: e.alt })),
      images: [...document.images].map(e => ({ src: e.currentSrc || e.src, alt: e.getAttribute('alt'), width: e.naturalWidth, renderedWidth: e.getBoundingClientRect().width })),
      links: [...document.querySelectorAll('a')].map(e => ({ href: e.getAttribute('href'), text: text(e), ariaLabel: e.getAttribute('aria-label'), visible: visible(e), current: e.getAttribute('aria-current') })),
      buttons: [...document.querySelectorAll('button')].map(e => ({ text: text(e), ariaLabel: e.getAttribute('aria-label'), expanded: e.getAttribute('aria-expanded'), visible: visible(e) })),
      formCount: document.forms.length, iframeCount: document.querySelectorAll('iframe').length,
      storage: { local: Object.keys(localStorage), session: Object.keys(sessionStorage), cookies: document.cookie },
      motion: [...document.querySelectorAll('body *')].filter(visible).filter(e => {
        const s = getComputedStyle(e);
        return s.animationName !== 'none' && parseFloat(s.animationDuration) > .01;
      }).slice(0, 10).map(e => ({ tag: e.tagName, class: e.className, duration: getComputedStyle(e).animationDuration })),
    };
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  output.browser = browser.version();
  try {
    for (const route of ROUTES) {
      for (const width of WIDTHS) {
        const page = await browser.newPage({ viewport: { width, height: width >= 1440 ? 1000 : 844 }, deviceScaleFactor: 1 });
        const errors = [], failedResponses = [], externalRequests = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('response', r => { if (r.status() >= 400) failedResponses.push({ url: r.url(), status: r.status() }); });
        page.on('request', r => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) externalRequests.push({ url: r.url(), method: r.method() }); });
        const response = await page.goto(BASE + route, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        // Load native lazy images and reveal sections using normal viewport intersection.
        for (let y = 0; y < await page.evaluate(() => document.body.scrollHeight); y += 700) {
          await page.evaluate(y => scrollTo(0, y), y);
          await page.waitForTimeout(35);
        }
        await page.waitForTimeout(350);
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForTimeout(350);
        const result = { route, width, status: response.status(), ...(await inspect(page)), errors, failedResponses, externalRequests };
        if (width === 390 || width === 1440) {
          await page.addScriptTag({ path: AXE });
          result.axe = await page.evaluate(async () => {
            const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
            return { passes: r.passes.length, incomplete: r.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), violations: r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) };
          });
          result.screenshot = `review/screenshots/${route.replace('.html', '')}-${width}.png`;
          await page.screenshot({ path: path.join(ROOT, result.screenshot), fullPage: true });
        }
        output.viewports.push(result);
        console.log(`${route} ${width}: HTTP ${result.status}; overflow ${result.documentWidth > width}; broken images ${result.brokenImages.length}; axe ${result.axe?.violations.length ?? '—'}`);
        await page.close();
      }
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(BASE + route, { waitUntil: 'networkidle' });
      const trigger = page.locator('button[aria-expanded]').first();
      const keyboard = { route, triggerCount: await trigger.count() };
      if (keyboard.triggerCount && await trigger.isVisible()) {
        await trigger.focus();
        await page.keyboard.press('Enter');
        keyboard.expandedAfterEnter = await trigger.getAttribute('aria-expanded');
        const focusPath = [];
        for (let i = 0; i < 10; i++) {
          await page.keyboard.press('Tab');
          focusPath.push(await page.evaluate(() => ({ tag: document.activeElement.tagName, text: document.activeElement.innerText?.trim(), href: document.activeElement.getAttribute('href'), outline: getComputedStyle(document.activeElement).outline })));
        }
        keyboard.focusPath = focusPath;
        await page.keyboard.press('Escape');
        keyboard.expandedAfterEscape = await trigger.getAttribute('aria-expanded');
        keyboard.focusRestored = await trigger.evaluate(e => e === document.activeElement);
        await trigger.focus();
        await page.keyboard.press('Space');
        keyboard.expandedAfterSpace = await trigger.getAttribute('aria-expanded');
        const navLink = page.locator('nav a').filter({ hasText: /^Cars$/i }).first();
        if (await navLink.isVisible()) {
          await navLink.focus();
          await page.keyboard.press('Enter');
          await page.waitForLoadState('networkidle');
          keyboard.carsNavigationUrl = page.url();
        }
      }
      output.keyboard.push(keyboard);
      await page.close();
      const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      await reduced.goto(BASE + route, { waitUntil: 'networkidle' });
      output.reducedMotion.push({ route, ...(await inspect(reduced)), reduceMatches: await reduced.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches) });
      await reduced.close();
      const nojs = await browser.newPage({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
      await nojs.goto(BASE + route, { waitUntil: 'networkidle' });
      output.noJavaScript.push({ route, ...(await inspect(nojs)) });
      await nojs.close();
    }
    const linkSet = new Set(output.viewports.filter(v => v.width === 390).flatMap(v => v.links.filter(l => l.href && !/^(https?:|mailto:|tel:|data:|javascript:)/.test(l.href)).map(l => new URL(l.href, BASE + v.route).href)));
    const page = await browser.newPage();
    for (const href of linkSet) {
      const url = new URL(href);
      const response = await page.goto(href, { waitUntil: 'domcontentloaded' });
      const anchorExists = !url.hash || await page.evaluate(id => !!document.getElementById(id), decodeURIComponent(url.hash.slice(1)));
      output.localLinks.push({ href, status: response ? response.status() : 200, anchorExists });
    }
    // Read the archived source documents as data; never execute their scripts or remote embeds.
    for (const [route, selector, key] of [['cars.html', '.cars .box', 'cars'], ['team.html', '.team .boxx', 'roster']]) {
      const html = fs.readFileSync(path.join(ROOT, 'source', 'originals', 'www.forceracing.in', route), 'utf8');
      await page.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '').replace(/<link\b[^>]*>/gi, '').replace(/<img\b[^>]*>/gi, ''));
      const records = await page.locator(selector).evaluateAll(es => es.map(e => ({ name: e.querySelector('h1')?.textContent.trim(), details: [...e.querySelectorAll('h4,p')].map(p => p.textContent.trim()) })));
      const actual = comparable(output.viewports.find(v => v.route === route && v.width === 390).bodyText);
      output.source[key] = records.map(record => ({ ...record, namePresent: actual.includes(comparable(record.name)), detailsPresent: record.details.map(detail => ({ text: detail, present: actual.includes(comparable(detail)) })) }));
    }
    const originalHome = fs.readFileSync(path.join(ROOT, 'source', 'originals', 'www.forceracing.in', 'index.html'), 'utf8');
    const partners = (originalHome.match(/<div class="partnerimg">([\s\S]*?)<\/div>/) || [])[1] || '';
    const expectedSponsors = [...partners.matchAll(/src="images\/([^".]+)\.[^"]+"/g)].map(m => m[1]);
    output.source.sponsors = expectedSponsors.map(name => ({ name, presentOn: output.viewports.filter(v => v.width === 390 && v.images.some(img => decodeURIComponent(img.src).toLowerCase().includes('/' + name.toLowerCase() + '-'))).map(v => v.route) }));
    output.registration = output.viewports.filter(v => v.width === 390).map(v => ({ route: v.route, directLinks: v.links.filter(l => l.href?.includes('docs.google.com/forms')).map(l => ({ ...l, exact: l.href === FORM })), hasSignInNote: /sign[ -]?in|Google account/i.test(v.bodyText), formCount: v.formCount }));
    await page.close();
  } finally {
    await browser.close();
    output.finished = new Date().toISOString();
    fs.writeFileSync(path.join(__dirname, 'independent-qa-results.json'), JSON.stringify(output, null, 2));
  }
}
run().catch(e => { console.error(e); process.exitCode = 1; });
