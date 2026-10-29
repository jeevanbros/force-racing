import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load trail modules into globalThis
await import('../site/modules/campus-trail/trail-data.js');
await import('../site/modules/campus-trail/campus-trail.js');

test('Campus Trail: Module files exist in site/modules/campus-trail and trail.html exists', () => {
  const dataPath = resolve(ROOT, 'site/modules/campus-trail/trail-data.js');
  const cssPath = resolve(ROOT, 'site/modules/campus-trail/campus-trail.css');
  const jsPath = resolve(ROOT, 'site/modules/campus-trail/campus-trail.js');
  const htmlPath = resolve(ROOT, 'site/trail.html');

  assert.ok(existsSync(dataPath), 'trail-data.js should exist');
  assert.ok(existsSync(cssPath), 'campus-trail.css should exist');
  assert.ok(existsSync(jsPath), 'campus-trail.js should exist');
  assert.ok(existsSync(htmlPath), 'trail.html should exist');
});

test('Campus Trail Data: Exactly 15 checkpoints with 10 route and 5 bonus stations', () => {
  const trailData = globalThis.CampusTrailData;

  assert.ok(trailData && trailData.event, 'trailData.event must be defined');
  assert.equal(trailData.event.venue, 'Central Workshop');
  assert.equal(trailData.event.name, 'SUMSHODHINI');

  assert.ok(Array.isArray(trailData.sectors), 'trailData.sectors must be an array');
  assert.equal(trailData.sectors.length, 15, 'Total sectors must equal 15');

  const routeSectors = trailData.sectors.filter(s => s.kind === 'route');
  const bonusSectors = trailData.sectors.filter(s => s.kind === 'bonus');

  assert.equal(routeSectors.length, 10, 'Must have exactly 10 route sectors');
  assert.equal(bonusSectors.length, 5, 'Must have exactly 5 bonus stations');

  // Sector 01 check
  assert.equal(routeSectors[0].sector, '01');
  assert.equal(routeSectors[0].location, 'Main Gate');
  assert.ok(routeSectors[0].directions.length > 0, 'Sector 01 must have walking directions');

  // Sector 10 check
  assert.equal(routeSectors[9].sector, '10');
  assert.equal(routeSectors[9].location, 'Central Workshop');

  // Bonus checks B1-B5
  const bonusCodes = bonusSectors.map(b => b.sector);
  assert.deepEqual(bonusCodes, ['B1', 'B2', 'B3', 'B4', 'B5']);

  // Coordinates validation
  trailData.sectors.forEach(s => {
    assert.ok(typeof s.map.x === 'number' && s.map.x >= 0 && s.map.x <= 100, `Sector ${s.sector} x-coord out of bounds`);
    assert.ok(typeof s.map.y === 'number' && s.map.y >= 0 && s.map.y <= 135, `Sector ${s.sector} y-coord out of bounds`);
    assert.ok(s.plain && s.plain.length > 5, `Sector ${s.sector} must have exact-spot clue`);
    assert.ok(s.trivia && s.trivia.prompt, `Sector ${s.sector} must have trivia/telemetry note`);
  });
});

test('Campus Trail Engine: Renders SVG schematic map, telemetry stats, inspector, and filters', () => {
  const CampusTrail = globalThis.CampusTrail;
  assert.ok(CampusTrail, 'CampusTrail module must be attached to globalThis');
  assert.ok(typeof CampusTrail.CampusTrailApp === 'function', 'CampusTrailApp constructor must exist');

  // Instantiate with mock DOM container
  const mockContainer = { innerHTML: '', addEventListener: () => {}, querySelectorAll: () => [] };
  const app = new CampusTrail.CampusTrailApp(mockContainer);

  assert.equal(app.activeId, 1, 'Default active sector should be Sector 01');

  // Telemetry bar render check
  const telemetryHtml = app.renderTelemetryBar();
  assert.ok(telemetryHtml.includes('CIRCUIT LENGTH'), 'Telemetry bar must show circuit length');
  assert.ok(telemetryHtml.includes('ROUTE SECTORS'), 'Telemetry bar must show route sectors');
  assert.ok(telemetryHtml.includes('Central Workshop'), 'Telemetry bar must show target terminal');

  // Filter bar render check
  const filterHtml = app.renderFilterBar();
  assert.ok(filterHtml.includes('Pit Lane Route (01–10)'), 'Filter bar must include route tab');
  assert.ok(filterHtml.includes('Bonus Points (B1–B5)'), 'Filter bar must include bonus tab');

  // Map render check
  const mapHtml = app.renderMap();
  assert.ok(mapHtml.includes('viewBox="0 0 100 135"'), 'Map must render SVG with 0 0 100 135 viewBox');
  assert.ok(mapHtml.includes('cm-road'), 'Map must render circuit road path');
  assert.ok(mapHtml.includes('CENTRAL WORKSHOP // PADDOCK ARENA'), 'Map must render paddock arena label');
  assert.ok(mapHtml.includes('MAIN GATE // START GRID'), 'Map must render main gate grid line');

  // Verify all 15 sectors appear in SVG map
  for (let i = 1; i <= 15; i++) {
    assert.ok(mapHtml.includes(`data-sector-id="${i}"`), `SVG map must contain pin for sector id ${i}`);
  }

  // Inspector card check for Sector 01
  const inspectorHtml = app.renderInspector();
  assert.ok(inspectorHtml.includes('SECTOR 01'), 'Inspector must render SECTOR 01 badge');
  assert.ok(inspectorHtml.includes('Main Gate'), 'Inspector must show Main Gate location');
  assert.ok(inspectorHtml.includes('Navigate on Google Maps'), 'Inspector must include Google Maps navigation button');
  assert.ok(inspectorHtml.includes('PILOT WALKING DIRECTIONS'), 'Inspector must show walking directions');
  assert.ok(inspectorHtml.includes('TELEMETRY') && inspectorHtml.includes('RACING INSIGHT'), 'Inspector must display racing trivia');

  // Matrix check
  const matrixHtml = app.renderMatrix();
  assert.ok(matrixHtml.includes('CHECKPOINT SELECTOR MATRIX'), 'Matrix card must render');
  assert.ok(matrixHtml.includes('BONUS'), 'Matrix must show BONUS badges');

  // Sector switching test
  app.setActiveSector(10);
  assert.equal(app.activeId, 10);
  const s10Inspector = app.renderInspector();
  assert.ok(s10Inspector.includes('SECTOR 10'));
  assert.ok(s10Inspector.includes('Central Workshop'));

  // Bonus sector test
  app.setActiveSector(11); // B1
  assert.equal(app.activeId, 11);
  const b1Inspector = app.renderInspector();
  assert.ok(b1Inspector.includes('BONUS STATION B1'));
  assert.ok(b1Inspector.includes('Registration Desk'));

  // Filter test
  app.setFilter('route');
  assert.equal(app.getFilteredSectors().length, 10);
  app.setFilter('bonus');
  assert.equal(app.getFilteredSectors().length, 5);
  app.setFilter('all');
  assert.equal(app.getFilteredSectors().length, 15);
});

test('Campus Trail CSS: Scoped strictly and enforces 52px+ touch targets', () => {
  const css = readFileSync(resolve(ROOT, 'site/modules/campus-trail/campus-trail.css'), 'utf8');

  // Check scoping
  assert.ok(css.includes('.ct-container'), 'CSS must include .ct-container');
  assert.ok(css.includes('.cm-pin'), 'CSS must style .cm-pin');
  assert.ok(css.includes('.ct-card'), 'CSS must include .ct-card');

  // Check 52px+ touch targets
  assert.ok(css.includes('min-height: 52px') || css.includes('min-height: 54px'), 'Buttons and tabs must specify 52px+ touch targets');
  assert.ok(css.includes('touch-action: pan-y pinch-zoom'), 'Map viewport must optimize touch gestures');
});

test('Campus Trail Page (trail.html): Integrates header, footer, and modular scripts', () => {
  const html = readFileSync(resolve(ROOT, 'site/trail.html'), 'utf8');

  // Check header & navigation
  assert.ok(html.includes('FORCE RACING'), 'Header must contain Force Racing brand');
  assert.ok(html.includes('campus-trail-root'), 'Must contain #campus-trail-root mount point');
  assert.ok(html.includes('modules/campus-trail/campus-trail.css'), 'Must link campus-trail.css');
  assert.ok(html.includes('modules/campus-trail/trail-data.js'), 'Must link trail-data.js');
  assert.ok(html.includes('modules/campus-trail/campus-trail.js'), 'Must link campus-trail.js');
  assert.ok(html.includes('footer'), 'Must contain footer element');
  assert.ok(html.includes('+91 80083 91525'), 'Must contain organizer contact');
});
