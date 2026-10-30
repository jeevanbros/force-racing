import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());

test('Caller Dialer: Module files exist in site/modules/caller-dialer/', () => {
  const cssPath = resolve(ROOT, 'site/modules/caller-dialer/caller-dialer.css');
  const jsPath = resolve(ROOT, 'site/modules/caller-dialer/caller-dialer.js');
  const readmePath = resolve(ROOT, 'site/modules/caller-dialer/README.md');

  assert.ok(existsSync(cssPath), 'caller-dialer.css must exist');
  assert.ok(existsSync(jsPath), 'caller-dialer.js must exist');
  assert.ok(existsSync(readmePath), 'README.md must exist');
});

test('Caller Dialer CSS: Scoped strictly, micro-interactions & 48px+ touch target', () => {
  const css = readFileSync(resolve(ROOT, 'site/modules/caller-dialer/caller-dialer.css'), 'utf8');

  // Verify scoping and naming
  assert.ok(css.includes('.fr-caller-link'), 'Must define .fr-caller-link base class');
  assert.ok(css.includes('.fr-caller-icon-badge'), 'Must define .fr-caller-icon-badge');
  assert.ok(css.includes('.fr-caller-card'), 'Must define .fr-caller-card variant');
  assert.ok(css.includes('.fr-caller-btn'), 'Must define .fr-caller-btn variant');

  // Verify micro-interactions: hover tilt/glow and active press feedback
  assert.ok(css.includes(':active'), 'Must define active press feedback state');
  assert.ok(css.includes('scale('), 'Must provide hardware-accelerated scale transform');
  assert.ok(css.includes(':focus-visible'), 'Must define accessible focus-visible outline');

  // Verify mobile touch ergonomics (min 48px - 52px touch target)
  assert.ok(css.includes('min-width: 48px') || css.includes('min-height: 48px') || css.includes('min-height: 52px'), 'Must provide minimum 48px touch target');
  assert.ok(css.includes('prefers-reduced-motion'), 'Must support prefers-reduced-motion');
});

test('Caller Dialer JS: cleanTel and render functions generate compliant SpaceX HTML', async () => {
  const jsCode = readFileSync(resolve(ROOT, 'site/modules/caller-dialer/caller-dialer.js'), 'utf8');
  // Evaluate in module context
  const factory = new Function('module', 'exports', jsCode + '; return module.exports;');
  const moduleObj = { exports: {} };
  const CallerDialer = factory(moduleObj, moduleObj.exports);

  assert.ok(CallerDialer, 'CallerDialer export must exist');
  assert.equal(typeof CallerDialer.cleanTel, 'function', 'cleanTel must be a function');
  assert.equal(typeof CallerDialer.render, 'function', 'render must be a function');

  // Test cleanTel
  assert.equal(CallerDialer.cleanTel('+91 80083 91525'), '+918008391525');
  assert.equal(CallerDialer.cleanTel('9951835213'), '+919951835213');

  // Test render inline
  const inlineHtml = CallerDialer.render('Md. Sohail', '+91 80083 91525', { variant: 'inline' });
  assert.ok(inlineHtml.includes('href="tel:+918008391525"'), 'Must have correct tel: href');
  assert.ok(inlineHtml.includes('Md. Sohail'), 'Must render name');
  assert.ok(inlineHtml.includes('fr-caller-icon'), 'Must render caller handset SVG icon');
  assert.ok(!inlineHtml.includes('('), 'Must NEVER include brackets around numbers');
  assert.ok(!inlineHtml.includes('80083 91525<'), 'Must not dump raw phone number in visual text');

  // Test render card
  const cardHtml = CallerDialer.render('Md. Sohail', '+91 80083 91525', { variant: 'card', role: 'Student organizer' });
  assert.ok(cardHtml.includes('fr-caller-card'), 'Must render card variant');
  assert.ok(cardHtml.includes('Student organizer'), 'Must render role');
  assert.ok(cardHtml.includes('href="tel:+918008391525"'), 'Must have dialer href');
});

test('Caller Dialer Audit: Site pages have zero bracketed phone numbers and include caller module', () => {
  const pages = ['index.html', 'recruitment.html', 'team.html', 'contact.html', 'support.html', 'trail.html'];
  const bracketPhoneRegex = /\(\s*\+?91[^\)]*\)|\(\s*[0-9]{5}[^\)]*\)/;

  for (const page of pages) {
    const html = readFileSync(resolve(ROOT, 'site', page), 'utf8');

    // 1. Zero bracketed phone numbers
    const bracketMatch = html.match(bracketPhoneRegex);
    assert.equal(bracketMatch, null, `${page} must NOT contain bracketed phone numbers like (+91...)`);

    // 2. Contains caller dialer CSS link
    assert.ok(html.includes('modules/caller-dialer/caller-dialer.css'), `${page} must link caller-dialer.css`);

    // 3. Contains caller dialer JS
    assert.ok(html.includes('modules/caller-dialer/caller-dialer.js'), `${page} must include caller-dialer.js`);

    // 4. Dialers use tel: link
    assert.ok(html.includes('href="tel:'), `${page} must feature direct tel: dialer links`);
  }
});
