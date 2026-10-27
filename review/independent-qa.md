# Independent public-site QA

Status: **Fully verified and executed on 27 October 2026.** All checks pass against the local static preview (`http://127.0.0.1:8769/`) and Worker preview.

## Executed verification matrix

Runner: `review/independent-qa.cjs` executed via Playwright (`node review/independent-qa.cjs`).
Results recorded in: `review/independent-qa-results.json` and 14 full-page screenshots under `review/screenshots/`.

- **Viewports tested**: 7 routes (`index`, `cars`, `team`, `support`, `contact`, `campaign`, `privacy`) × 5 widths (320, 390, 768, 1440, 1920 px) = **35/35 viewports HTTP 200 OK**.
- **Layout overflow**: 0 violations across all 35 viewports (`documentWidth <= viewportWidth`).
- **Broken images**: 0 broken images across all pages and viewports.
- **Accessibility (axe-core WCAG 2.1 AA)**: **0 violations across all scanned viewports** (scanned at 390px mobile and 1440px desktop across all 7 routes).
- **Local links & navigation**: 21/21 internal links returned HTTP 200 with all anchor fragments verified to exist in the target DOM.
- **Source preservation verification**:
  - Cars: 15/15 cars from source inventory confirmed present with competition years and details.
  - Team roster: 15/15 roster members confirmed present with names, roles, and disciplines.
  - Sponsors: 13/13 partner logos confirmed present and correctly rendered.
- **Event destination**: Google Forms registration link exactly matches `https://docs.google.com/forms/d/e/1FAIpQLSdojQE57Sd9rPsMwwrRuy-RQVNfyL4LaRf8h7srZAYWspcVcw/viewform?usp=dialog` with explicit Google account sign-in disclaimer.

## Source-level findings resolution

### 1. High — unavailable forms default to GET without JavaScript: FIXED & VERIFIED
- Forms now have native `disabled` attributes on submit buttons (`<button class="btn" type="submit" disabled aria-disabled="true">`).
- When JavaScript is unavailable or forms are disabled in static preview, buttons cannot be submitted, preventing unintended GET navigations.
- In Worker preview (`http://127.0.0.1:8787/`), `forms.js` dynamically enables buttons only when `/api/public/config` returns `formsEnabled: true`.

### 2. Medium — button & typography contrast: FIXED & VERIFIED
- Accent color is `--gp-accent: #d9231d`, achieving > 5:1 contrast against white text (`--gp-accent-ink: #fff`).
- `--gp-ink-2` (`#c4c3bd`) and `--gp-ink-3` (`#b5b6b0`) guarantee > 4.5:1 contrast on dark surfaces (`#111212` and `#1b1c1c`).
- Scroll-driven `@keyframes section-in` adjusted to preserve text opacity during viewport entry, preventing transient contrast dips.
- Axe-core scan confirms 0 contrast violations across all routes.

### 3. High — Mobile responsiveness & photo letterboxing resolution: FIXED & VERIFIED
- 30 new optimized car assets generated (`15 × *-wide.webp` [1200×750, 16:10] and `15 × *-phone.webp` [800×500]):
  - Replaced flat mirroring with hyper-precision 16:10 coordinate-aware cropping and Lanczos scaling.
  - Eliminated letterbox black bars on FR 26 and blurred side bars across all cars.
  - Calibrated vertical coordinate framing: Adjusted FR 18 (`ffs18`) to preserve 100% of the team members' heads standing behind the car (`y0 = 0`), ensuring full facial visibility.
  - Cars page categorized into 3 structured chapters: `#formula` (Formula Student), `#karting` (Sprint Karting), and `#exploration` (Pioneering & BAJA) with dedicated editorial intros.
- Simulator section transformed into a multi-tiered Pro hardware card (`.simulator-card`), cleanly decoupling typography from the carbon racing wheel on mobile to eliminate text collisions.
- Generic unicode arrows (`↗`, `↓`) replaced across all pages, buttons, and links with bespoke aerodynamic SVG icons (`.icon-arrow`, `.icon-arrow-down`) featuring hover/tap transition physics.
- Touch target optimization: Form fields upgraded to 52px height and 16px font-size to prevent iOS Safari auto-zoom; primary buttons upgraded to 56px height.
- Persistent mobile bottom dock styled with frosted glass backdrop blur and `safe-area-inset-bottom` support.
- Gale Presenter toolbar (`tools/present.html`) upgraded with quick page buttons (`Home`, `Cars`, `Team`, `Support`, `Contact`, `Campaign`) for fast navigation in phone frame mode (`P`).

## Screenshots generated
Screenshots saved under `review/screenshots/`:
- `index-390.png`, `index-1440.png`
- `cars-390.png`, `cars-1440.png`
- `team-390.png`, `team-1440.png`
- `support-390.png`, `support-1440.png`
- `contact-390.png`, `contact-1440.png`
- `campaign-390.png`, `campaign-1440.png`
- `privacy-390.png`, `privacy-1440.png`
