import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('sponsorship-tiers CSS adheres to SpaceX engineering standards', async () => {
  const css = await readFile(join(ROOT, 'site/modules/sponsorship-tiers/sponsorship-tiers.css'), 'utf8');

  // Verify hardware acceleration (transform and opacity only)
  assert.match(css, /transform: translateY\(-6px\) translateZ\(0\)/, 'Card hover lift is hardware-accelerated');
  assert.match(css, /transform: scale\(0\.98\) translateZ\(0\)/, 'Card active press is hardware-accelerated');
  assert.match(css, /will-change: transform/, 'will-change transform is specified for sub-50ms render budget');

  // Verify Bronze has first-class burnished bronze and combustion glow, not cheap
  assert.match(css, /\[data-tier="bronze"\]/, 'Bronze tier has dedicated styling');
  assert.match(css, /#cd7f32/, 'Bronze uses warm burnished bronze hex #cd7f32');
  assert.match(css, /rgba\(205, 127, 50, 0\.35\)/, 'Bronze has subtle combustion glow');

  // Verify Silver has precision-milled aerospace aluminum styling
  assert.match(css, /\[data-tier="silver"\]/, 'Silver tier has dedicated styling');
  assert.match(css, /#e0e0e0/, 'Silver uses precision chrome hex #e0e0e0');

  // Verify Gold has championship gold styling
  assert.match(css, /\[data-tier="gold"\]/, 'Gold tier has dedicated styling');
  assert.match(css, /#ffd700/, 'Gold uses championship gold hex #ffd700');

  // Verify VIP / Title has obsidian carbon weave and crimson telemetry
  assert.match(css, /\[data-tier="title"\]/, 'Title / VIP tier has dedicated styling');
  assert.match(css, /#d9231d/, 'Title / VIP uses racing crimson hex #d9231d');
  assert.match(css, /repeating-linear-gradient/, 'Title / VIP uses carbon weave pattern');

  // Verify Light mode support exists for all 4 tiers
  assert.match(css, /:root\[data-theme="light"\].*?\[data-tier="bronze"\]/s, 'Light mode Bronze is defined');
  assert.match(css, /:root\[data-theme="light"\].*?\[data-tier="silver"\]/s, 'Light mode Silver is defined');
  assert.match(css, /:root\[data-theme="light"\].*?\[data-tier="gold"\]/s, 'Light mode Gold is defined');
  assert.match(css, /:root\[data-theme="light"\].*?\[data-tier="title"\]/s, 'Light mode Title is defined');

  // Verify A11y reduced motion
  assert.match(css, /prefers-reduced-motion: reduce/, 'prefers-reduced-motion is supported');
});

test('sponsorship-tiers JS module adheres to modular plug-and-play standards', async () => {
  const js = await readFile(join(ROOT, 'site/modules/sponsorship-tiers/sponsorship-tiers.js'), 'utf8');

  // Verify all 4 tiers configured equally
  assert.match(js, /title: \{/, 'Title tier configured');
  assert.match(js, /gold: \{/, 'Gold tier configured');
  assert.match(js, /silver: \{/, 'Silver tier configured');
  assert.match(js, /bronze: \{/, 'Bronze tier configured');

  // Verify ARIA radiogroup pattern
  assert.match(js, /role.*radiogroup/, 'Grid is assigned radiogroup role');
  assert.match(js, /role.*radio/, 'Cards are assigned radio role');
  assert.match(js, /aria-checked/, 'aria-checked state is managed');

  // Verify interactive two-way sync
  assert.match(js, /sponsor-tier/, 'Syncs with sponsor-tier element');
  assert.match(js, /selectSponsorshipTier/, 'Calls window.selectSponsorshipTier');
  assert.match(js, /fr-sync-highlight/, 'Applies tactile sync highlight feedback');
  assert.match(js, /window\.ForceSponsorshipTiers =/, 'Exposes clean modular API');
});

test('support.html correctly integrates modular sponsorship tiers', async () => {
  const html = await readFile(join(ROOT, 'site/support.html'), 'utf8');

  assert.match(html, /<link rel="stylesheet" href="modules\/sponsorship-tiers\/sponsorship-tiers\.css">/, 'sponsorship-tiers.css is included in support.html');
  assert.match(html, /<script src="modules\/sponsorship-tiers\/sponsorship-tiers\.js" defer><\/script>/, 'sponsorship-tiers.js is included in support.html');
  assert.match(html, /data-tier="title"/, 'Title tier card has data-tier attribute');
  assert.match(html, /data-tier="gold"/, 'Gold tier card has data-tier attribute');
  assert.match(html, /data-tier="silver"/, 'Silver tier card has data-tier attribute');
  assert.match(html, /data-tier="bronze"/, 'Bronze tier card has data-tier attribute');

  // Bronze must not have inferior wording like "Entry-level"
  assert.doesNotMatch(html, /Entry-level patron tier/, 'Bronze does not have inferior "Entry-level" copy');
  assert.match(html, /Foundation patron partner/, 'Bronze is dignified with Foundation patron partner copy');
});
