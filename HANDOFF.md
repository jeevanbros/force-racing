# Force Racing Revival — Handoff Directive & Skills Operating Manual

> **FOR INCOMING AGENTS ON WINDOWS PC**: Read this document first. This document is your authoritative operational directive. It details the exact sequence of actions, all user requirements for the website, and a complete catalog of every available skill, explaining **exactly when and how to use each one**.

---

## 1. The Two-Phase Directive (MANDATORY EXECUTION ORDER)

You must execute the work in two strictly sequential phases. **Do not begin Phase 2 until Phase 1 is explicitly confirmed by the user.**

```
[Phase 1: ACTIVE NOW]                                    [Phase 2: TRIGGERED ON APPROVAL]
Website Refinement & Module Integration                  Cinematic Launch Brag Video
  ├── Listen to user feedback                              ├── User says: "I am satisfied with the site"
  ├── Integrate modules from Windows PC                    ├── Spin up Herdr parallel panes
  ├── Perfect mobile ergonomics & forms                    ├── Run /brag --tone cinematic
  └── Verify with tests (npm test, test:local)             └── Render high-octane launch video via Hyperframes
```

### Phase 1 (CURRENT FOCUS): Website Completion & Module Integration
1. **Primary Goal**: The user has brought this codebase to a Windows PC to integrate new modules residing on that machine (e.g. telemetry, 3D viewer, widgets, or live data).
2. **First Action**: Receive the user's instructions and files for the new modules, integrate them cleanly into the modular boundaries, and polish the website until it is completely flawless.
3. **Ergonomic Standards**: Meet every single design and mobile requirement listed in [Section 2](#2-complete-user-requirements-for-phase-1).
4. **Verification**: Run `python site/design/build.py`, `npm test`, and `npm run test:local` after every change to ensure 100% test passing and zero broken assets.

### Phase 2: Launch Brag Video (WAIT FOR EXPLICIT APPROVAL)
* **Trigger Condition**: When and ONLY WHEN the user explicitly states:
  > *"I am satisfied with the site"* / *"The website is done"* / *"Let's make the launch video"*
* **Action**: Transition immediately into producing a high-energy, trailer-scale boast/brag video celebrating Force Racing.
* **Orchestration**: Orchestrate parallel subagents using **Herdr CLI** across visible split panes so the user can watch progress live.

---

## 2. Complete User Requirements for Phase 1 (Website & Modules)

The user has given explicit, strict instructions regarding the website design, ergonomics, and features. You must enforce these at all times:

### A. Mobile-First Ergonomics (Top Priority)
* **Context**: The vast majority of college students and sponsors browse from mobile phones. Desktop is already tuned; mobile must be Apple Pro-grade.
* **Touch Targets**:
  - All form inputs, selects, and textareas must have a minimum height of `52px` and `font-size: 16px` (prevents iOS Safari auto-zoom).
  - All interactive buttons must have a minimum height of `56px` with ample tap padding.
* **Zero Horizontal Scroll**: Strictly no element may overflow viewport width at `320px`, `375px`, `390px`, or `414px`.
* **Testing Tool**: Use the **Gale Presenter** on port 8769 (`http://127.0.0.1:8769/__present.html`). Press `P` on your keyboard to instantly preview inside the iPhone 15 frame.

### B. Form Simplicity & Ergonomics
* All registration, support, sponsorship, and contact forms must be dead simple, clean, and distraction-free.
* High-contrast focus rings, clear error states, and responsive single-column mobile layouts.
* In local static preview (`tools/serve.py`), forms show the honest "unavailable in static preview" state. In local Worker mode (`npm run dev`), forms connect to the local SQLite D1 database.

### C. Car Photography & Visual Standards
* **Aspect Ratio**: Standardized uniform **16:10 ratio** (`1200×750` widescreen, `800×500` phone).
* **Zero Black Bars & Zero Blurry Mirrored Sides**:
  - No letterbox black bars (like earlier FR 26).
  - No blurred mirrored borders (like earlier FR 19/FR 18).
  - If an image needs width, outpaint or blend the background cleanly using `tools/extend_car_photos.py`.
* **No Head Clipping**:
  - For car photos with people standing behind the vehicle (specifically **FR 18** / `ffs18`), the vertical crop must anchor at top ($y_0 = 0$) so that all team members' heads, foreheads, and faces remain 100% visible.
* **Aerodynamic Arrows**: Custom aerodynamic racing SVG arrows for callouts and registration CTA buttons; never use plain unicode characters like `↗` or `↓`.

### D. Hardware Section Ergonomics (`.simulator-card`)
* In the F1 Simulator section featuring the custom racing steering wheel:
  - **NEVER superimpose text, buttons, or unicode arrows over the hardware steering wheel dials, LEDs, or LCD display**.
  - On mobile, enforce the strict 3-tier vertical hierarchy:
    1. **Top**: Title, badge, and simulator specs.
    2. **Center**: Steering wheel photograph cleanly framed with generous breathing room.
    3. **Bottom**: Solid CTA action button ("REGISTER FOR HOT LAP").

### E. Cars Archive Categorization (3 Chapters)
The Cars archive (`site/cars.html`) must organize the 15 cars into three distinct thematic chapters:
1. `#formula` — **Formula Student Combustion & EV** (FR 26, FR 19, FR 18, FR 17, FR 16, Legions’ F1).
2. `#karting` — **Sprint & Endurance Karting** (Kart 3, Kart 2, Kart 1).
3. `#exploration` — **Pioneering & BAJA Prototypes** (Ratham, Efficycle, Phoenix Racing, Ashwasena, Terranaut, Maiden Mob).

### F. Source Facts Integrity
* **Never fabricate specifications, awards, or team members**.
* Maintain absolute fidelity to `docs/SOURCE-INVENTORY.md`:
  - 15 verified cars (from 2009 Maiden Mob to 2026 FR 26).
  - 15 verified team roster members.
  - 13 verified sponsors (KTM, Hoosier, Lotus, etc.).

---

## 3. Skills Directory & How/When to Use Each Skill

There are **25 curated skills** installed in `.gemini/skills/`, `.agents/skills/`, and `/skills/`. The agent must use them actively:

### Group 1: Web Design, Interface Standards & Presentation

| Skill Name | What It Is & What It Contains | When to Use It | How to Use It |
| :--- | :--- | :--- | :--- |
| **`web-design-guidelines`** | Web Interface Guidelines & design auditing rules (accessibility, contrast, touch targets, layout). | Whenever designing, refining, or auditing UI elements, forms, cards, or mobile layouts. | Run code reviews against its guidelines to ensure 52px+ inputs, WCAG 2.1 AA contrast, and zero layout overflow. |
| **`gale-design`** | Craft rules and `--gp-*` design tokens for spacing, typography, theme glide, and component states. | Whenever styling buttons, forms, badges, modals, cards, or updating dark/light theme CSS. | Reference `site/design/DESIGN.md` and use the `--gp-*` token variables in `site/styles.css`. Run pre-show checks. |
| **`gale-presenter`** | Galeport demo kit, presenter interface (`/__present.html`), phone frame launcher, and theme switcher. | Whenever presenting or testing the website locally on desktop or mobile phone view. | Start with `start.bat` on port 8769. Navigate to `http://127.0.0.1:8769/__present.html`. Press `P` for Phone mode, `L`/`D`/`A` for theme toggles. |

### Group 2: Web Animation & Motion Engineering (GSAP)

| Skill Name | What It Is & What It Contains | When to Use It | How to Use It |
| :--- | :--- | :--- | :--- |
| **`gsap-core`** | Core GSAP 3 API: `gsap.to()`, `gsap.from()`, `gsap.fromTo()`, eases, durations, stagger. | Whenever adding UI animations, hover states, entrance reveals, or dynamic counters to the site. | Use `gsap.to(selector, { duration: 0.6, ease: "power2.out", ... })`. Respect `prefers-reduced-motion`. |
| **`gsap-timeline`** | Choreographed multi-step animation sequencing without nested callbacks. | Whenever orchestrating complex multi-element reveals (e.g. hero section entrance, card reveals). | `const tl = gsap.timeline(); tl.to(...).to(..., "-=0.2")`. |
| **`gsap-scrolltrigger`** | Scroll-driven animations, parallax, pinning, and scrub tweens. | Whenever creating scroll-linked car reveals, telemetry stat counters, or pinned timeline sections. | Register `ScrollTrigger`. Attach `scrollTrigger: { trigger: ".element", start: "top 80%" }`. |
| **`gsap-performance`** | Optimization rules for 60fps silky smooth transforms and zero layout thrashing. | Whenever animating on mobile to eliminate stutter or battery drain. | Animate only transforms (`x`, `y`, `scale`) and `opacity`. Use `will-change` judiciously. |
| **`gsap-plugins`** | Registration and usage for ScrollTo, Flip, Draggable, and SVG plugins. | When adding smooth page scrolling, layout morphs, or SVG path animations. | Register plugin via `gsap.registerPlugin(...)` and initialize. |
| **`gsap-utils`** | Mathematical utilities: `clamp`, `mapRange`, `normalize`, `interpolate`, `wrap`. | When computing telemetry gauge angles, scroll percentages, or dynamic values. | Use `gsap.utils.clamp(min, max, val)` or `gsap.utils.mapRange(inMin, inMax, outMin, outMax, val)`. |
| **`gsap-frameworks`** & **`gsap-react`** | Lifecycle hooks, cleanup on unmount, and scoped selector rules. | If any new module brought from Windows uses React, Vue, or Svelte components. | Wrap GSAP calls in lifecycle cleanup (`gsap.context()` or `useGSAP`). |

### Group 3: Parallel Terminal Orchestration (Herdr CLI)

| Skill Name | What It Is & What It Contains | When to Use It | How to Use It |
| :--- | :--- | :--- | :--- |
| **`herdr`** | Terminal workspace and pane manager (`~/.local/bin/herdr` or `herdr.exe`). | When parallelizing tasks across multiple subagents so the user can watch each job live in separate panes. | • Split pane: `herdr pane split --current --direction right --no-focus`<br>• Launch subagent: `herdr agent start <name> --kind <agy\|codex\|claude\|gemini> --pane <pane_id>`<br>• Monitor: `herdr pane read <pane_id> --source visible` |

### Group 4: Launch Video Production (Hyperframes & Brag — For Phase 2)

| Skill Name | What It Is & What It Contains | When to Use It | How to Use It |
| :--- | :--- | :--- | :--- |
| **`brag`** & **`brag-slim`** | Automated launch video generator reading directly from project code. | When the user triggers Phase 2 ("Make the launch video" / "I am satisfied with the site"). | Execute `/brag --tone cinematic`. Reads `site/` assets, crafts storyboard, mixes racing music, and outputs `brag.mp4`. |
| **`hyperframes`** | Mandatory entry point for building, inspecting, and rendering HTML motion graphic videos. | Core video rendering engine used by `brag`. | Scaffolds Hyperframes compositions using HTML/CSS/JS with deterministic rendering. |
| **`hyperframes-core`** | Composition timing tags (`data-start`, `data-duration`), clips, and tracks. | Structuring video scenes, synchronizing video tracks, and managing determinism. | Build compositions with `<div class="clip" data-start="0s" data-duration="4s">`. |
| **`hyperframes-animation`** | Scene transitions, atomic motion blueprints, and text effects. | Choreographing fast cuts, speedlines, and dynamic title cards in the launch video. | Compose animation blueprints for high-octane racing aesthetics. |
| **`hyperframes-audio`** | Audio mixing, volume automation, ducking, and track EQ. | Mixing the dramatic racing soundtrack with engine revs and UI sound effects. | Mix BGM and SFX tracks with automated ducking during voice or title stings. |
| **`hyperframes-cli`** | CLI tools for `hyperframes init`, `check`, `preview`, and `render`. | Validating and rendering video compositions to MP4. | Run `hyperframes check` to validate, `hyperframes render` to output final video. |
| **`hyperframes-creative`** | Art direction, color grading, beat planning, and typography. | Setting the bold, dark, neon-accented racing aesthetic for the video. | Define palettes, fonts, and beat maps aligned with Force Racing's brand identity. |
| **`hyperframes-keyframes`** | 2D/3D camera punch-ins, zoom reframes, whip pans, and Ken Burns moves. | Adding dynamic camera moves across the FR 26 car photos and telemetry dials. | Apply keyframed camera transforms to simulate high-speed trackside tracking. |
| **`hyperframes-registry`** | Library of ~400 pre-built blocks (glitch, CRT, charts, speedlines). | Adding racing telemetry HUDs, HUD speedometers, and speed effects. | Search and install blocks: `hyperframes add <block-name>`. |
| **`hyperframes-studio`** | Storyboarding, safe-zone layouts, and timeline organization. | Planning scene structure (2009 foundation → car evolution → FR 26 reveal → Sim Racing). | Layout scenes ensuring text sits safely inside broadcast margins. |
| **`media-use`** | Audio and asset resolution (BGM tracks, engine sound effects, logos). | Sourcing royalty-free high-octane racing music and impact sound effects. | Use `media-use` to resolve audio files and sound effects into the composition. |
| **`motion-graphics`** | Kinetic typography, stat count-ups, and logo reveals under 30s. | Rendering telemetry counters (0–100 km/h in 3.8s) and year timelines (2009–2026). | Create design-led motion graphics with GSAP-powered SVG and canvas. |

---

## 4. Module Boundaries & File Map

The repository is modular and decoupled so that new Windows modules can be dropped in without regression:

```
force-racing-revival/
├── site/                     Frontend website (HTML/CSS/JS)
│   ├── index.html            Homepage (Hero, FR 26, Simulator, Sponsors)
│   ├── cars.html             Machine Archive (Formula, Karting, Exploration)
│   ├── team.html             Team Roster (15 verified members)
│   ├── support.html          Sponsorship tiers & bank details
│   ├── contact.html          General contact & team headquarters
│   ├── campaign.html         SUMSHODHINI ’26 Sim Racing hot-lap registration
│   ├── privacy.html          Data privacy policy
│   ├── styles.css            Master responsive CSS & Apple Pro mobile tokens
│   ├── app.js                Navigation, theme glide, interactive behavior
│   ├── forms.js              Form submission logic (connects to worker API)
│   └── design/
│       └── build.py          Static generator (python site/design/build.py)
├── worker/                   Backend API (Cloudflare Worker + D1 SQLite)
│   ├── index.js              Router & endpoint dispatch
│   ├── core.js               Honeypot, rate limiting, validation
│   ├── submissions.js        Enquiry & registration ingestion
│   ├── admin.js              Admin API & recipient management
│   ├── auth.js               Password hashing & CSRF tokens
│   └── telegram.js           Telegram broadcast alerts
├── admin/                    Private admin panel served at /admin
├── migrations/
│   └── 0001_backend.sql      D1 SQLite schema (submissions, audit log)
├── integrations/
│   └── google-forms/         Optional Google Forms Apps Script bridge
├── tools/
│   ├── serve.py              Port 8769 preview server (Gale Presenter)
│   ├── present.html          Presenter UI with phone toggle ('P')
│   ├── extend_car_photos.py  16:10 car photo outpainter & vertical crop tool
│   └── check-portability.mjs Zero-hardcoded-path portability auditor
└── tests/
    ├── backend-validation.test.js  14 unit tests
    └── backend-local.mjs           29 local D1/Worker smoke tests
```

---

## 5. Local Commands & Verification Suite

Always verify your changes on Windows using these exact commands:

| Command | Environment | Purpose | Target Result |
| :--- | :--- | :--- | :--- |
| `start.bat` | Command Prompt / PowerShell | Launches local preview on port 8769 (`http://127.0.0.1:8769/__present.html`) | Opens Presenter with Phone frame (`P`) |
| `stop.bat` | Command Prompt / PowerShell | Gracefully stops the preview server | Ports 8769 freed |
| `python site/design/build.py` | Python 3 | Re-bakes static pages from template and campaign config | 7 HTML pages updated |
| `npm test` | Node.js >= 22 | Runs backend validation unit tests | **14/14 tests pass** |
| `npm run test:local` | Node.js >= 22 | Runs full end-to-end local D1 + Worker smoke checks | **29/29 smoke checks pass** |
| `node tools/check-portability.mjs` | Node.js | Scans all files for machine-specific hardcoded paths | **0 hardcoded paths** |

---

## 6. Summary for the Incoming Windows Agent

1. **You are currently in Phase 1**. Focus strictly on the website, user feedback, and integrating the user's Windows modules.
2. **Follow all mobile and ergonomic rules** (16:10 photos, no head clipping, no text on simulator wheel, 52px+ inputs).
3. **Use the 25 curated skills actively** when styling, animating, auditing, or presenting.
4. **Do not create the launch video until the user explicitly says they are satisfied with the website**. When approved, trigger Phase 2 using `/brag --tone cinematic` and parallelize across Herdr panes.
