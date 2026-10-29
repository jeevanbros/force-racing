# AGENTS.md — Autonomous Agent Directives & Engineering Standard

> **MANDATORY INSTRUCTION FOR ALL AGENTS & SUB-AGENTS**: Read this file in full before proposing or applying ANY changes. Violations of these directives will cause immediate task failure.

---

## 1. Prime Directive: Strict Design Immutability
1. **Never alter the baseline design**: The core visual identity, design tokens (`--gp-*`), font definitions (Barlow Condensed 800 for display/headings, clean sans-serif for body), color palette (`#111212` base, `#1b1c1c` surface, `#d9231d` accent), hero geometry, and layout grids were meticulously crafted and are strictly **IMMUTABLE**.
2. **Never pollute global CSS**: Do NOT append arbitrary styling overrides, ad-hoc inline styles, or monolithic CSS blobs to `site/styles.css`.
3. **No Redesign without Explicit User Approval**: If a new design or layout change is ever conceived, it must first be rendered in preview, shown to the user, and explicitly approved ("Go") before any file on the main site is modified.

---

## 2. SpaceX Engineering Quality Standard
Approach every element, micro-interaction, and layout as aerospace flight software engineers:
1. **Zero Cheap Hacks**: No ugly brackets around phone numbers (e.g. `Name (+91 1234567890)` is strictly forbidden). Every contact must render with consistent typography and a dedicated, elegant caller icon that directly triggers `tel:` dialer interaction.
2. **Tactile Micro-Interactions**: Slot selections, tier choices, and buttons must have instantaneous feedback (60fps active press scale, subtle border glow, zero layout shift / CLS).
3. **Sub-50ms Render Budget**: Initial paint must be lightning-fast. All animations must be hardware-accelerated (`transform` and `opacity` only).
4. **First-Class Tier Equality**: In sponsorship and participation matrices (Bronze, Silver, Gold, VIP), every tier must receive an equally premium, first-class tactile experience. No tier may look or feel second-rate.
5. **Ergonomic Precision**: Minimum 52px touch targets on mobile/Android. No horizontal scroll at 320px–414px viewports.

---

## 3. Plug-and-Play Modular Architecture
Every new feature must be developed as a self-contained, isolated module before integration:
```
site/
├── modules/
│   ├── caller-dialer/        # Caller icon & dialer integration
│   ├── sponsorship-tiers/    # Sponsorship tier cards & interactive matrix
│   └── campus-trail/         # Interactive QR trail & campus navigation map
```
- **Independent Testing**: Each module must be verifiable in isolation.
- **Hot-Unplug Capability**: If a module encounters an error, it can be detached cleanly without destabilizing or degrading the baseline site.
- **Verification Gate**: Any change must pass:
  1. `py -3 site/design/build.py`
  2. `npm test`
  3. `npm run test:local`
  4. `node tools/check-portability.mjs`

---

## 4. Multi-Agent Orchestration Protocol
- **Lead Orchestrator**: Manages state, assigns isolated scopes to sub-agents, audits code quality, runs verification suites, and handles user sign-off.
- **Sub-Agents**: Work strictly within their assigned module boundaries. Do not cross into sibling module files.
