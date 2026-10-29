/**
 * CAMPUS NAVIGATION & QR TRAIL — MOTORSPORT SCHEMATIC INTERFACE
 * Force Racing · Sumshodhini '26
 * 
 * Sub-50ms render budget, 100% responsive, zero external libraries.
 * Standalone plug-and-play module.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./trail-data.js'], factory);
  } else if (typeof module === 'object' && module.exports) {
    var td = null;
    try { td = require('./trail-data.js'); } catch (e) {
      td = (typeof globalThis !== 'undefined' ? globalThis.CampusTrailData : null);
    }
    module.exports = factory(td || (typeof globalThis !== 'undefined' ? globalThis.CampusTrailData : null));
  } else {
    var g = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : root);
    g.CampusTrail = factory(g.CampusTrailData);
  }
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this)), function (TrailData) {
  'use strict';

  var DATA = TrailData || (typeof window !== 'undefined' && window.CampusTrailData) || { event: {}, sectors: [] };
  var SECTORS = DATA.sectors || [];
  var EVENT = DATA.event || {};

  var W = 100;
  var H = 135;

  var clamp = function (n, lo, hi) { return n < lo ? lo : n > hi ? hi : n; };
  var r2 = function (n) { return Math.round(n * 100) / 100; };
  var esc = function (s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /**
   * Generates a curved SVG circuit path through route checkpoints
   */
  function buildCircuitTrack(routeStops) {
    if (!routeStops || routeStops.length < 2) return '';
    var d = 'M' + routeStops[0].map.x + ' ' + routeStops[0].map.y;
    for (var i = 1; i < routeStops.length; i++) {
      var prev = routeStops[i - 1].map;
      var cur = routeStops[i].map;
      var mx = (prev.x + cur.x) / 2;
      var my = (prev.y + cur.y) / 2;
      // Introduce subtle curvature for motorsport telemetry feel
      var curve = (i % 2 === 0 ? 3.5 : -3.5);
      d += ' Q' + r2(mx + curve) + ' ' + r2(my - curve) + ' ' + r2(cur.x) + ' ' + r2(cur.y);
    }
    return d;
  }

  /**
   * Generates the active telemetry dashed racing line up to target stop
   */
  function buildRacingLine(routeStops, targetId) {
    var targetIdx = -1;
    for (var i = 0; i < routeStops.length; i++) {
      if (routeStops[i].id === targetId) {
        targetIdx = i;
        break;
      }
    }
    if (targetIdx <= 0) return '';
    var sub = routeStops.slice(0, targetIdx + 1);
    return buildCircuitTrack(sub);
  }

  /**
   * Campus Trail App Instance
   */
  function CampusTrailApp(containerId, options) {
    this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    this.options = options || {};
    this.activeId = 1; // Default: Sector 01
    this.filter = 'all'; // 'all' | 'route' | 'bonus'
    this.init();
  }

  CampusTrailApp.prototype.init = function () {
    if (!this.container) return;

    // Check URL hash for initial deep link (e.g. #04, #sector-04, #b2)
    this.readHash();

    // Render component
    this.render();

    // Bind event listeners if in a browser environment
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.bindEvents();

      var self = this;
      window.addEventListener('hashchange', function () {
        self.readHash();
        self.updateUI();
      });

      // Keyboard navigation (Left / Right arrow keys for sector flipping)
      window.addEventListener('keydown', function (e) {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          self.nextSector();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          self.prevSector();
        }
      });
    }
  };

  CampusTrailApp.prototype.readHash = function () {
    if (typeof window === 'undefined' || !window.location.hash) return;
    var hash = window.location.hash.replace(/^#/, '').toLowerCase().trim();
    if (!hash) return;
    
    // Match sector numbers or B numbers
    var match = SECTORS.find(function (s) {
      var sSec = s.sector.toLowerCase();
      var sNum = sSec.replace(/^0/, '');
      return hash === sSec || hash === ('sector-' + sSec) || hash === sNum || hash === ('sector-' + sNum);
    });

    if (match) {
      this.activeId = match.id;
      if (match.kind === 'bonus' && this.filter === 'route') {
        this.filter = 'all';
      }
    }
  };

  CampusTrailApp.prototype.getActiveSector = function () {
    var self = this;
    var found = SECTORS.find(function (s) { return s.id === self.activeId; });
    return found || SECTORS[0];
  };

  CampusTrailApp.prototype.getFilteredSectors = function () {
    var self = this;
    if (this.filter === 'route') {
      return SECTORS.filter(function (s) { return s.kind === 'route'; });
    }
    if (this.filter === 'bonus') {
      return SECTORS.filter(function (s) { return s.kind === 'bonus'; });
    }
    return SECTORS;
  };

  CampusTrailApp.prototype.setActiveSector = function (id) {
    this.activeId = id;
    var sec = this.getActiveSector();
    if (sec && typeof window !== 'undefined' && window.history && window.history.replaceState) {
      window.history.replaceState(null, null, '#sector-' + sec.sector.toLowerCase());
    }
    this.updateUI();
  };

  CampusTrailApp.prototype.setFilter = function (filter) {
    this.filter = filter;
    var filtered = this.getFilteredSectors();
    // If activeId is not within filtered set, activate the first one
    var stillVisible = filtered.some(function (s) { return s.id === this.activeId; }, this);
    if (!stillVisible && filtered.length > 0) {
      this.activeId = filtered[0].id;
    }
    this.updateUI();
  };

  CampusTrailApp.prototype.nextSector = function () {
    var filtered = this.getFilteredSectors();
    var idx = filtered.findIndex(function (s) { return s.id === this.activeId; }, this);
    if (idx < filtered.length - 1) {
      this.setActiveSector(filtered[idx + 1].id);
    } else {
      this.setActiveSector(filtered[0].id); // Wrap around
    }
  };

  CampusTrailApp.prototype.prevSector = function () {
    var filtered = this.getFilteredSectors();
    var idx = filtered.findIndex(function (s) { return s.id === this.activeId; }, this);
    if (idx > 0) {
      this.setActiveSector(filtered[idx - 1].id);
    } else {
      this.setActiveSector(filtered[filtered.length - 1].id); // Wrap around
    }
  };

  /**
   * Render Top Telemetry Bar
   */
  CampusTrailApp.prototype.renderTelemetryBar = function () {
    var stats = EVENT.stats || {};
    return [
      '<div class="ct-telemetry-bar">',
      '  <div class="ct-stat-item">',
      '    <span class="ct-stat-label">CIRCUIT LENGTH</span>',
      '    <span class="ct-stat-val accent">' + esc(stats.circuitDistance || '~1.2 km Circuit') + '</span>',
      '  </div>',
      '  <div class="ct-stat-item">',
      '    <span class="ct-stat-label">ROUTE SECTORS</span>',
      '    <span class="ct-stat-val">10 <small style="font-size:0.6em;color:var(--ct-accent-cyan)">SECTORS</small></span>',
      '  </div>',
      '  <div class="ct-stat-item">',
      '    <span class="ct-stat-label">VENUE BONUS</span>',
      '    <span class="ct-stat-val gold">5 <small style="font-size:0.6em;color:var(--ct-accent-gold)">PADDOCK STATIONS</small></span>',
      '  </div>',
      '  <div class="ct-stat-item">',
      '    <span class="ct-stat-label">PIT WALK PACE</span>',
      '    <span class="ct-stat-val cyan">' + esc(stats.pitWalkDuration || '15 min Pit Walk') + '</span>',
      '  </div>',
      '  <div class="ct-stat-item">',
      '    <span class="ct-stat-label">TARGET TERMINAL</span>',
      '    <span class="ct-stat-val" style="font-size:clamp(1.1rem,1.8vw,1.4rem);line-height:1.2">Central Workshop</span>',
      '  </div>',
      '</div>'
    ].join('\n');
  };

  /**
   * Render Filter Controls
   */
  CampusTrailApp.prototype.renderFilterBar = function () {
    var isAll = this.filter === 'all' ? ' is-active' : '';
    var isRoute = this.filter === 'route' ? ' is-active' : '';
    var isBonus = this.filter === 'bonus' ? ' is-active' : '';

    return [
      '<div class="ct-filter-bar">',
      '  <div class="ct-filter-tabs" role="tablist" aria-label="Sector Filter Tabs">',
      '    <button class="ct-tab-btn' + isAll + '" data-filter="all" role="tab" aria-selected="' + (this.filter === 'all') + '">',
      '      All Checkpoints <span class="ct-tab-badge">15</span>',
      '    </button>',
      '    <button class="ct-tab-btn' + isRoute + '" data-filter="route" role="tab" aria-selected="' + (this.filter === 'route') + '">',
      '      Pit Lane Route (01–10) <span class="ct-tab-badge">10</span>',
      '    </button>',
      '    <button class="ct-tab-btn' + isBonus + '" data-filter="bonus" role="tab" aria-selected="' + (this.filter === 'bonus') + '">',
      '      Bonus Points (B1–B5) <span class="ct-tab-badge">5</span>',
      '    </button>',
      '  </div>',
      '  <div class="ct-quick-search">',
      '    <span>TAP PINS TO NAVIGATE // [← →] KEYS ACTIVE</span>',
      '  </div>',
      '</div>'
    ].join('\n');
  };

  /**
   * Render SVG Schematic Map
   */
  CampusTrailApp.prototype.renderMap = function () {
    var activeSec = this.getActiveSector();
    var routeStops = SECTORS.filter(function (s) { return s.kind === 'route'; });
    var bonusStops = SECTORS.filter(function (s) { return s.kind === 'bonus'; });

    var circuitTrack = buildCircuitTrack(routeStops);
    var racingLine = buildRacingLine(routeStops, activeSec.id);

    var pinsSvg = SECTORS.map(function (s) {
      var isActive = s.id === activeSec.id;
      var isBonus = s.kind === 'bonus';
      var isRoute = s.kind === 'route';

      var radius = isActive ? 4.8 : (isBonus ? 3.6 : 3.4);
      var cls = 'cm-pin ' + (isBonus ? 'cm-pin--bonus' : 'cm-pin--route') + (isActive ? ' cm-pin--active' : '');
      
      // Determine label offset
      var lx = s.map.x;
      var ly = s.map.y;
      var anchor = 'middle';
      var lOffsetY = -5.2;

      // Smart positioning to avoid overlapping with circuit lines
      if (s.sector === '01') { anchor = 'middle'; lOffsetY = -5.8; }
      else if (s.sector === '02') { anchor = 'end'; lx -= 6; lOffsetY = 1.1; }
      else if (s.sector === '03') { anchor = 'start'; lx += 6; lOffsetY = 1.1; }
      else if (s.sector === '04') { anchor = 'start'; lx += 6; lOffsetY = 1.1; }
      else if (s.sector === '05') { anchor = 'end'; lx -= 6; lOffsetY = 1.1; }
      else if (s.sector === '06') { anchor = 'start'; lx += 6; lOffsetY = 1.1; }
      else if (s.sector === '07') { anchor = 'start'; lx += 6; lOffsetY = 1.1; }
      else if (s.sector === '08') { anchor = 'end'; lx -= 6; lOffsetY = 1.1; }
      else if (s.sector === '09') { anchor = 'start'; lx += 6; lOffsetY = 1.1; }
      else if (s.sector === '10') { anchor = 'end'; lx -= 6.5; lOffsetY = 1.1; }
      else if (s.sector === 'B1') { anchor = 'middle'; lOffsetY = -5.2; }
      else if (s.sector === 'B2') { anchor = 'middle'; lOffsetY = -5.2; }
      else if (s.sector === 'B3') { anchor = 'middle'; lOffsetY = -5.2; }
      else if (s.sector === 'B4') { anchor = 'middle'; lOffsetY = -5.2; }
      else if (s.sector === 'B5') { anchor = 'start'; lx += 5.5; lOffsetY = 1.1; }

      var pulse = isActive ? (
        '<circle class="cm-halo" cx="' + r2(s.map.x) + '" cy="' + r2(s.map.y) + '" r="' + r2(radius + 1.8) + '"/>' +
        '<circle class="cm-pulse" cx="' + r2(s.map.x) + '" cy="' + r2(s.map.y) + '" r="' + r2(radius + 3.2) + '"/>'
      ) : '';

      return [
        '<g class="' + cls + '" data-sector-id="' + s.id + '" role="button" tabindex="0" aria-label="Sector ' + esc(s.sector) + ' - ' + esc(s.location) + '">',
        '  <!-- 52px+ ergonomic touch target area -->',
        '  <circle cx="' + r2(s.map.x) + '" cy="' + r2(s.map.y) + '" r="8.5" fill="transparent" class="cm-hitarea" style="cursor:pointer"/>',
        pulse,
        '  <circle class="cm-dot" cx="' + r2(s.map.x) + '" cy="' + r2(s.map.y) + '" r="' + radius + '"/>',
        '  <text class="cm-num" x="' + r2(s.map.x) + '" y="' + r2(s.map.y + 1.15) + '">' + esc(s.sector) + '</text>',
        '  <text class="cm-label' + (isBonus ? ' cm-label--bonus' : '') + '" x="' + r2(lx) + '" y="' + r2(ly + lOffsetY) + '" text-anchor="' + anchor + '">' + esc(s.location) + '</text>',
        '</g>'
      ].join('\n');
    }).join('\n');

    return [
      '<div class="ct-map-card">',
      '  <div class="ct-map-header">',
      '    <span><b>CIRCUIT SCHEMATIC</b> // KITS WARANGAL</span>',
      '    <span>ACTIVE: SECTOR ' + esc(activeSec.sector) + '</span>',
      '  </div>',
      '  <div class="ct-map-viewport">',
      '    <svg class="ct-map-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Campus Trail Interactive Schematic Map">',
      '      <defs>',
      '        <pattern id="ctGrid" width="10" height="10" patternUnits="userSpaceOnUse">',
      '          <path d="M10 0 H0 V10" fill="none" stroke="rgba(0, 240, 255, 0.05)" stroke-width="0.3"/>',
      '        </pattern>',
      '      </defs>',
      '      <!-- Circuit Background Grid -->',
      '      <rect x="1" y="1" width="98" height="133" rx="4" fill="url(#ctGrid)" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>',
      '      ',
      '      <!-- Workshop Arena / Paddock Zone Rect at Top -->',
      '      <rect class="cm-paddock-zone" x="14" y="4" width="60" height="24" rx="3"/>',
      '      <text class="cm-paddock-label" x="44" y="7.5" text-anchor="middle">CENTRAL WORKSHOP // PADDOCK ARENA</text>',
      '      ',
      '      <!-- Circuit Road Track Ribbon -->',
      '      <path class="cm-road" d="' + circuitTrack + '"/>',
      '      ',
      '      <!-- Active Telemetry Racing Line -->',
      '      ' + (racingLine ? '<path class="cm-leg" d="' + racingLine + '"/>' : ''),
      '      ',
      '      <!-- Gate Start / Finish Line -->',
      '      <line x1="41" y1="126" x2="59" y2="126" stroke="#ffffff" stroke-width="1.2" stroke-dasharray="1.5 1.5"/>',
      '      <text x="50" y="130" text-anchor="middle" font-family="monospace" font-size="2.4px" fill="rgba(255,255,255,0.6)" letter-spacing="0.1em">MAIN GATE // START GRID</text>',
      '      ',
      '      <!-- Checkpoint Pins -->',
      pinsSvg,
      '      ',
      '      <!-- Telemetry Compass Rose -->',
      '      <g class="cm-compass" transform="translate(89, 11)" aria-hidden="true">',
      '        <circle r="6" fill="rgba(17, 18, 18, 0.7)" stroke="rgba(0, 240, 255, 0.3)" stroke-width="0.5"/>',
      '        <line x1="0" y1="5.5" x2="0" y2="1.5" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>',
      '        <path d="M0 -0.8 L1.5 2 L0 1.2 L-1.5 2 Z" fill="#e10600"/>',
      '        <text y="-2.5" text-anchor="middle" font-family="monospace" font-size="2.6px" font-weight="bold" fill="#00f0ff">N</text>',
      '      </g>',
      '    </svg>',
      '  </div>',
      '  <div class="ct-map-footer">',
      '    <span style="font-family:monospace;font-size:0.75rem;color:var(--gp-ink-3)">15 CHECKPOINTS LOADED // LIVE TELEMETRY</span>',
      '    <a class="ct-external-link" href="' + esc(EVENT.mapsUrl) + '" target="_blank" rel="noopener noreferrer">',
      '      Campus on Google Maps <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3.5 12.5L12.5 3.5M12.5 3.5H5.5M12.5 3.5V10.5"/></svg>',
      '    </a>',
      '  </div>',
      '</div>'
    ].join('\n');
  };

  /**
   * Render Sector Details Inspector Card
   */
  CampusTrailApp.prototype.renderInspector = function () {
    var s = this.getActiveSector();
    var isBonus = s.kind === 'bonus';
    var mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((s.mapsQuery || (s.location + ' KITS Warangal')));

    var directionsHtml = '';
    if (s.directions && s.directions.length > 0) {
      directionsHtml = [
        '<div class="ct-section-label">PILOT WALKING DIRECTIONS</div>',
        '<ol class="ct-directions-list">',
        s.directions.map(function (step) {
          return '  <li>' + esc(step) + '</li>';
        }).join('\n'),
        '</ol>'
      ].join('\n');
    }

    var triviaHtml = '';
    if (s.trivia) {
      triviaHtml = [
        '<div class="ct-trivia-box">',
        '  <div class="ct-trivia-title">',
        '    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
        '    TELEMETRY & RACING INSIGHT',
        '  </div>',
        '  <p class="ct-trivia-prompt">' + esc(s.trivia.prompt) + '</p>',
        '  <p class="ct-trivia-answer"><strong style="color:var(--gp-ink)">Benchmark:</strong> ' + esc(s.trivia.answer) + ' — ' + esc(s.trivia.note) + '</p>',
        '</div>'
      ].join('\n');
    }

    return [
      '<div class="ct-card' + (isBonus ? ' is-bonus-card' : ' is-active-card') + '">',
      '  <div class="ct-card-eyebrow">',
      '    <span class="ct-badge' + (isBonus ? ' gold' : '') + '">',
      '      ' + (isBonus ? 'BONUS STATION ' + esc(s.sector) : 'SECTOR ' + esc(s.sector)),
      '    </span>',
      '    <span class="ct-walk-pill">' + esc(s.walk) + '</span>',
      '  </div>',
      '  ',
      '  <h2 class="ct-card-title">' + esc(s.title || s.location) + '</h2>',
      '  <div class="ct-card-location">',
      '    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
      '    ' + esc(s.location) + ' · ' + esc(s.direction),
      '  </div>',
      '  ',
      '  <div class="ct-hint-box">',
      '    <strong>EXACT CHECKPOINT SPOT</strong>',
      '    <p>' + esc(s.plain || s.riddle) + '</p>',
      '  </div>',
      '  ',
      directionsHtml,
      triviaHtml,
      '  ',
      '  <div class="ct-action-row">',
      '    <a class="ct-btn-primary" href="' + esc(mapsUrl) + '" target="_blank" rel="noopener noreferrer">',
      '      <span>Navigate on Google Maps</span>',
      '      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3.5 12.5L12.5 3.5M12.5 3.5H5.5M12.5 3.5V10.5"/></svg>',
      '    </a>',
      '    <div class="ct-nav-group" style="display:inline-flex;gap:8px">',
      '      <button class="ct-btn-nav" id="ctPrevBtn" aria-label="Previous Sector" title="Previous Checkpoint">',
      '        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.5 3.5L5.5 8l5 4.5"/></svg>',
      '      </button>',
      '      <button class="ct-btn-nav" id="ctNextBtn" aria-label="Next Sector" title="Next Checkpoint">',
      '        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5.5 3.5L10.5 8l-5 4.5"/></svg>',
      '      </button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');
  };

  /**
   * Render Quick Matrix Picker
   */
  CampusTrailApp.prototype.renderMatrix = function () {
    var self = this;
    var pills = SECTORS.map(function (s) {
      var isActive = s.id === self.activeId;
      var isBonus = s.kind === 'bonus';
      var cls = 'ct-matrix-pill' + (isActive ? ' is-active' : '') + (isBonus ? ' is-bonus' : '');
      return [
        '<button class="' + cls + '" data-sector-id="' + s.id + '" aria-pressed="' + isActive + '">',
        '  <span>' + esc(s.sector) + '</span>',
        '  <small>' + (isBonus ? 'BONUS' : 'SECTOR') + '</small>',
        '</button>'
      ].join('\n');
    }).join('\n');

    return [
      '<div class="ct-matrix-card">',
      '  <div class="ct-matrix-title">',
      '    <span>CHECKPOINT SELECTOR MATRIX</span>',
      '    <span>15 STATIONS</span>',
      '  </div>',
      '  <div class="ct-matrix-grid">',
      pills,
      '  </div>',
      '</div>'
    ].join('\n');
  };

  /**
   * Master Component Render
   */
  CampusTrailApp.prototype.render = function () {
    this.container.innerHTML = [
      '<div class="campus-trail-root ct-container">',
      this.renderTelemetryBar(),
      this.renderFilterBar(),
      '  <div class="ct-workbench">',
      '    <div id="ctMapArea">' + this.renderMap() + '</div>',
      '    <div class="ct-inspector">',
      '      <div id="ctInspectorArea">' + this.renderInspector() + '</div>',
      '      <div id="ctMatrixArea">' + this.renderMatrix() + '</div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');
  };

  /**
   * Dynamic Partial Update (sub-16ms update without rebuilding entire DOM)
   */
  CampusTrailApp.prototype.updateUI = function () {
    if (typeof document === 'undefined') return;
    var mapArea = document.getElementById('ctMapArea');
    var inspectorArea = document.getElementById('ctInspectorArea');
    var matrixArea = document.getElementById('ctMatrixArea');

    if (mapArea) mapArea.innerHTML = this.renderMap();
    if (inspectorArea) inspectorArea.innerHTML = this.renderInspector();
    if (matrixArea) matrixArea.innerHTML = this.renderMatrix();

    // Re-bind click handlers on newly rendered areas
    this.bindDynamicEvents();
  };

  /**
   * Event Binding
   */
  CampusTrailApp.prototype.bindEvents = function () {
    if (typeof document === 'undefined' || !this.container) return;
    var self = this;

    // Filter Tab Clicks
    this.container.addEventListener('click', function (e) {
      var tab = e.target.closest('.ct-tab-btn');
      if (tab) {
        var filter = tab.getAttribute('data-filter');
        if (filter) {
          self.setFilter(filter);
          // Update active class on tabs
          var tabs = self.container.querySelectorAll('.ct-tab-btn');
          tabs.forEach(function (t) {
            var isCur = t.getAttribute('data-filter') === filter;
            t.classList.toggle('is-active', isCur);
            t.setAttribute('aria-selected', isCur ? 'true' : 'false');
          });
        }
      }
    });

    this.bindDynamicEvents();
  };

  CampusTrailApp.prototype.bindDynamicEvents = function () {
    if (typeof document === 'undefined' || !this.container) return;
    var self = this;

    // Pin click on SVG map
    var pins = this.container.querySelectorAll('.cm-pin, .cm-hitarea');
    pins.forEach(function (el) {
      var pinGroup = el.closest('.cm-pin');
      if (!pinGroup) return;
      var secId = parseInt(pinGroup.getAttribute('data-sector-id'), 10);
      if (isNaN(secId)) return;

      el.addEventListener('click', function (e) {
        e.preventDefault();
        self.setActiveSector(secId);
      });

      pinGroup.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          self.setActiveSector(secId);
        }
      });
    });

    // Matrix pill click
    var matrixPills = this.container.querySelectorAll('.ct-matrix-pill');
    matrixPills.forEach(function (btn) {
      var secId = parseInt(btn.getAttribute('data-sector-id'), 10);
      if (isNaN(secId)) return;
      btn.addEventListener('click', function () {
        self.setActiveSector(secId);
      });
    });

    // Prev / Next Buttons
    var prevBtn = typeof document !== 'undefined' ? document.getElementById('ctPrevBtn') : null;
    var nextBtn = typeof document !== 'undefined' ? document.getElementById('ctNextBtn') : null;

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        self.prevSector();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        self.nextSector();
      });
    }
  };

  // Auto-init helper
  function init(containerId, options) {
    return new CampusTrailApp(containerId, options);
  }

  return {
    init: init,
    CampusTrailApp: CampusTrailApp,
    DATA: DATA
  };
});
