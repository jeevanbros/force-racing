import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('Task 1: Navigation integration across all main website pages', async () => {
  const pages = ['index.html', 'cars.html', 'team.html', 'contact.html', 'recruitment.html', 'support.html'];

  for (const p of pages) {
    const html = await readFile(join(ROOT, 'site', p), 'utf8');
    assert.match(html, /<nav class="main-nav"[^>]*>/, `${p} has main-nav`);
    assert.match(html, /href="\/portal\.html"/, `${p} has link to /portal.html`);
    assert.match(html, /Pit Wall/, `${p} labels portal link as Pit Wall`);
    assert.match(html, /class="portal-badge">PORTAL<\/span>/, `${p} has PORTAL badge`);
  }

  // Check styles.css has .nav-portal and .portal-badge with Formula Red and Cyan styling
  const css = await readFile(join(ROOT, 'site/styles.css'), 'utf8');
  assert.match(css, /\.main-nav \.nav-portal/, 'styles.css defines .nav-portal');
  assert.match(css, /\.main-nav \.portal-badge/, 'styles.css defines .portal-badge');
  assert.match(css, /#ff1801|var\(--gp-accent\)/, 'styles.css styles portal badge with Formula Red');
  assert.match(css, /#00f0ff|var\(--gp-cyan\)/, 'styles.css styles portal badge hover with Cyan');
});

test('Task 2: Routing & deployment configuration', async () => {
  const wrangler = await readFile(join(ROOT, 'wrangler.jsonc'), 'utf8');
  assert.match(wrangler, /"assets":\s*\{\s*"directory":\s*"\.\/site"/, 'wrangler.jsonc binds ./site to ASSETS');

  const worker = await readFile(join(ROOT, 'worker/index.js'), 'utf8');
  assert.match(worker, /path === '\/portal'/, 'worker/index.js explicitly handles /portal route');
  assert.match(worker, /portal\.html/, 'worker/index.js routes to portal.html');
  assert.match(worker, /env\.ASSETS\.fetch\(request\)/, 'worker/index.js serves static assets via env.ASSETS');

  assert.ok(existsSync(join(ROOT, 'site/portal.html')), 'site/portal.html exists');
  assert.ok(existsSync(join(ROOT, 'site/portal-sample.html')), 'site/portal-sample.html exists');
});

test('Task 3: Quality assurance on portal.html and portal-sample.html', async () => {
  const portalFiles = ['portal.html', 'portal-sample.html'];

  for (const file of portalFiles) {
    const content = await readFile(join(ROOT, 'site', file), 'utf8');

    // 1. Zero live telemetry / RPM / engine dials
    assert.doesNotMatch(content, /id="rpm-gauge"/i, `${file}: Zero live RPM dials`);
    assert.doesNotMatch(content, /class="gauge-rpm"/i, `${file}: Zero RPM gauge classes`);
    assert.doesNotMatch(content, /tachometer/i, `${file}: Zero tachometer elements`);
    assert.doesNotMatch(content, /live\s+telemetry\s+stream/i, `${file}: Zero live telemetry streams`);

    // 2. Only task telemetry (Total, Pending, Done, Priority)
    assert.match(content, /stat-total-tasks/i, `${file}: Has stat-total-tasks metric`);
    assert.match(content, /stat-pending-tasks/i, `${file}: Has stat-pending-tasks metric`);
    assert.match(content, /stat-done-tasks/i, `${file}: Has stat-done-tasks metric`);
    assert.match(content, /stat-priority-tasks/i, `${file}: Has stat-priority-tasks metric`);

    // 3. Online (🟢) / Offline (🔴) sidebar presence dots
    assert.match(content, /dot-online/i, `${file}: Has dot-online presence class`);
    assert.match(content, /dot-offline/i, `${file}: Has dot-offline presence class`);
    assert.match(content, /🟢/, `${file}: Has live online indicator`);
    assert.match(content, /🔴/, `${file}: Has offline indicator`);

    // 4. Profile modal and Direct Chat window for Captain, Vice Captain, and Manager when clicking on any member
    assert.match(content, /id="member-chat-drawer"/, `${file}: Has member profile & direct chat drawer`);
    assert.match(content, /openMemberDrawer/, `${file}: Has openMemberDrawer handler`);
    assert.match(content, /dispatchDirectMessage/, `${file}: Has dispatchDirectMessage for direct messaging`);
    assert.match(content, /Captain|Vice Captain|Manager/, `${file}: Contains leadership roles`);

    // 5. Live in-app notifications and offline message queue
    assert.match(content, /id="notif-drawer"/, `${file}: Has in-app notification drawer`);
    assert.match(content, /offlineQueuedMessages/, `${file}: Has offline message queue data store`);
    assert.match(content, /id="tab-notif-queue"/, `${file}: Has offline queue tab in notification center`);
    assert.match(content, /dispatchAllOfflineQueue/, `${file}: Has offline queue dispatch function`);

    // 6. File upload requirement before marking tasks Done
    assert.match(content, /type="file"/, `${file}: Has file upload inputs`);
    assert.match(content, /uploadedFile/, `${file}: Requires uploadedFile deliverable`);
    assert.match(content, /btn-action-step/, `${file}: Has task action button`);
    assert.match(content, /\$\{!hasFile\s*\?\s*'disabled'\s*:\s*''\}/, `${file}: Enforces disabled state until file proof is attached`);

    // 7. Account section with round avatar, photo viewer, sent files list, and activity timeline
    assert.match(content, /id="account-modal"/, `${file}: Has account section modal`);
    assert.match(content, /acc-photo-frame/, `${file}: Has round avatar photo frame`);
    assert.match(content, /id="photo-viewer-modal"/, `${file}: Has dedicated photo viewer modal`);
    assert.match(content, /openPhotoViewer/, `${file}: Has openPhotoViewer function`);
    assert.match(content, /id="acc-view-files"/, `${file}: Has sent files list view`);
    assert.match(content, /id="acc-view-done"/, `${file}: Has completed activity timeline view`);

    // 8. Locked Subsystem and Role fields for normal members
    assert.match(content, /id="prof-subsystem"[^>]*disabled/, `${file}: prof-subsystem is locked (disabled) by default`);
    assert.match(content, /id="prof-role"[^>]*disabled/, `${file}: prof-role is locked (disabled) by default`);
    assert.match(content, /Subsystem locked|Subsystem managed strictly/, `${file}: Has locked subsystem explanatory message`);

    // 9. Proper OS theme adaptation via prefers-color-scheme
    assert.match(content, /@media\s*\(prefers-color-scheme:\s*light\)/, `${file}: Has prefers-color-scheme light mode support`);
    assert.match(content, /--gp-bg/, `${file}: Uses CSS tokens for responsive themes`);
  }
});
