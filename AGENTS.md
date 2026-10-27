# Force Racing Revival — Agent Operating Rules & Handoff Directive

> **IMPORTANT**: Always read [HANDOFF.md](file:///HANDOFF.md) for the complete skills operating manual, user requirement checklist, and step-by-step handoff guide.

## 1. Project Context & Identity
- **Team**: Force Racing — Formula Student team of Kakatiya Institute of Technology & Science (KITS), Warangal (established 2009).
- **Motto**: *Dream. Build. Race.*
- **Mission**: Student-built open-wheel combustion race cars, sprint karts, and endurance prototypes.
- **Tech Stack**:
  - Frontend: Vanilla HTML/CSS/JS (`site/`), static page generator (`site/design/build.py`).
  - Backend: Cloudflare Workers + D1 SQLite (`worker/`, `migrations/0001_backend.sql`).
  - Presentation: Gale Presenter on port 8769 (`http://127.0.0.1:8769/__present.html`).
  - Video Engine: Hyperframes (`skills/brag`, `skills/hyperframes`).

---

## 2. Hard Architectural Rules & Standards
1. **Preserve Source Integrity**:
   - Never fabricate car specifications, competition results, or team roster entries.
   - 15 verified cars, 15 verified team roster members, 13 verified sponsors from source inventory.
2. **Portability**:
   - Zero hardcoded machine paths (`/Users/megha` or `C:\Users\...`). All links and asset references must be relative.
3. **Apple-Grade Mobile Ergonomics**:
   - All car photos are standardized to a 16:10 aspect ratio (`1200×750` wide, `800×500` phone) with coordinate-aware vertical centering.
   - **Zero black bars and zero blurry mirrored sidebars**.
   - Touch targets: inputs minimum 52px height, 16px font-size (prevents iOS auto-zoom), buttons 56px height.
   - Hardware sections (e.g. F1 simulator steering wheel) must NEVER have typography superimposed on hardware dials or displays.
4. **Three Categorized Chapters on Cars Page**:
   - `#formula` — Formula Student (FR 26, FR 19, FR 18, FR 17, FR 16, Legions’ F1)
   - `#karting` — Sprint Karting (Kart 3, Kart 2, Kart 1)
   - `#exploration` — Pioneering & BAJA (Ratham, Efficycle, Phoenix Racing, Ashwasena, Terranaut, Maiden Mob)

---

## 3. The Two-Phase Execution Protocol (MANDATORY)

The user has given an explicit sequential protocol. You MUST follow this order:

### Phase 1 (CURRENT): Website Completion & Module Integration
* The user is bringing this codebase to a Windows PC to integrate a few modules residing on that computer.
* **Your primary focus right now is the website**. Listen to the user's feedback, integrate their new modules, and refine the site until it is flawless.
* Do NOT start video generation or brag video production until the user explicitly approves the website.

### Phase 2 (TRIGGERED ONLY AFTER USER CONFIRMATION): Launch Brag Video
* When and ONLY WHEN the user explicitly states:
  *"I am satisfied with the site"* / *"The website is done"* / *"Let's make the launch video"*,
  immediately transition to the video production phase.
* **Launch Video Objectives**:
  - High-energy, trailer-scale boast/brag video celebrating Force Racing.
  - Tone: `/brag --tone cinematic` (dramatic, high-octane racing music, fast-in pacing, hyper-precision UI callouts).
  - Highlight the 2009–2026 journey: KITS Warangal workshop to national Formula Student circuits, the FR 26 reveal, and SUMSHODHINI ’26 F1 Sim Racing.
* **Parallel Orchestration via Herdr**:
  - You MUST parallelize the work using the **Herdr CLI** (`herdr`).
  - Split panes: `herdr pane split --current --direction right --no-focus`
  - Spin up subagents in separate panes: `herdr agent start <name> --kind <agy|codex|claude|gemini> --pane <pane_id>`
  - Read output: `herdr pane read <pane_id> --source visible`
  - Allow the user to visually observe progress in real time across separate terminal panes.

---

## 4. Local Commands & Verification
- **Windows Preview**: Double-click `start.bat` (or `START-HERE-WINDOWS.bat` from USB root).
- **Windows Stop**: Double-click `stop.bat`.
- **Rebuild Static Pages**: `python site/design/build.py`
- **Unit Tests**: `npm test` (14/14 tests)
- **Local Dev Stack (Worker + D1)**: `npm run test:local` (29/29 smoke checks)
- **Skills Directory**: Look in `.gemini/skills/` or run `install-skills-windows.bat` from the USB drive.
