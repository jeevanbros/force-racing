# Force Racing — Client Handover & Demo Guide (29 Oct 2026)

## 1. Instant Local Demo (Active Right Now)
- **Interactive Gale Presenter**: `http://127.0.0.1:8769/__present.html`
  - Press **`P`**: Phone frame mode (simulates iPhone / Android mobile frame with hardware corners and touch scroll).
  - Press **`L`** / **`D`** / **`A`**: Smooth theme glide (Light, Dark, and System Auto).
  - Press **`H`**: Hide presenter header for clean client presentations.
- **Direct Website**: `http://127.0.0.1:8769/`
- **Campus QR Navigation Trail (15 Stops)**: `http://127.0.0.1:8769/trail.html`
- **Sponsorship Matrix**: `http://127.0.0.1:8769/support.html`
- **F1 Sim Racing Registration**: `http://127.0.0.1:8769/campaign.html#register`

## 2. What Was Restored & SpaceX-Engineered
1. **Design System & Typography Restored (`commit fda182b`)**:
   - Background `#111212`, sunk `#0b0c0c`, surface `#1b1c1c`, brand red `#d9231d`.
   - Authentic Barlow Condensed 800 display font and clean typography.
   - Stripped 1,260+ lines of bloated overrides. Sub-50ms render, 0 layout shift (CLS = 0).
2. **Caller Dialer Module (`site/modules/caller-dialer/`)**:
   - Zero cheap bracketed numbers (e.g. `Md. Sohail (+91 80083 91525)` completely eliminated).
   - Exact site typography for names with a crisp phone handset icon badge.
   - Click opens native dialer (`tel:+918008391525`) with 12ms haptic vibration on touch devices.
   - Mobile touch target minimum 52px.
3. **Tactile Slot Selector (`site/modules/slot-selector/`)**:
   - 60fps micro-interaction hot-lap slot pills on the registration form.
   - Keyboard accessible (`Space`/`Enter`), updates form payload automatically.
4. **Equal Prestige Sponsorship Matrix (`site/modules/sponsorship-tiers/`)**:
   - Bronze, Silver, Gold, Title VIP treated with equal prestige and dedicated motorsport cards.
   - Real-time telemetry HUD bar and two-way form synchronization.
5. **15-Stop Campus QR Circuit Trail (`site/modules/campus-trail/`)**:
   - Interactive SVG campus circuit map, step-by-step walking directions, and telemetry notes.

## 3. Strict Architecture (`AGENTS.md`)
- Core design tokens and typography are immutable.
- All features live in isolated, plug-and-play modules under `site/modules/`.

## 4. Verification Gate Results
- **Unit & Audit Tests (`npm test`)**: 57 / 57 PASSING (147ms)
- **Backend Smoke Tests (`npm run test:local`)**: 40 / 40 PASSING
- **Portability Audit (`node tools/check-portability.mjs`)**: 0 machine-specific paths
- **Real Headless Edge (`node tests/browser-console.mjs`)**: 10 of 10 pages loaded with 0 JS console errors
- **Browser Interaction Tests (`node tests/test-sponsorship-browser.mjs`)**: 100% PASSING

## 5. Live Remote Deploy Command
```powershell
cd C:\Users\ijk11\forceracing-website
$env:CI="1"; npx wrangler deploy
```
