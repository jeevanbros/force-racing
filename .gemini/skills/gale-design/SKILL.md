---
name: gale-design
description: The craft rules and the pre-show checks for every Galeport client website — layout, spacing, type, colour, dark mode and the theme glide, component states, forms, icons, motion, images and speed budgets, expressed as one --gp-* token vocabulary that each client fills with its own values. Use whenever a Galeport client site is designed, styled, restyled, reviewed, polished or checked before it is shown: "make it look premium", "the spacing feels off", "add dark mode", "which icons", "animate this", "review the design", "is it ready to show", a new demo's design/DESIGN.md and tokens, or any CSS work inside clients/. Run its check-site script before a demo or change is shown to Krishna or a client. Not for galeport.com itself, the console, or video.
---

# Gale design

A client's style changes the **values**. It never changes the **rules**. A Goa bistro and a
dental clinic fill the same token names with different colours, fonts and radii, and both pass
the same checks. That is how every site stays premium while each one looks like its owner.

This skill is used inside the **gale** workflow (records, stages, delivery), which decides *what*
to build. This skill decides *how it looks and moves*, and whether it is good enough to show.
Evidence and sources: `research/research-16-2026-09-27-skill-family.md`.

## Art-direction standard

For a new visual direction, substantial redesign or refinement, read
[art-direction.md](references/art-direction.md). Krishna expects category-specific
art direction, excellent image selection, coherent identity and real mobile/desktop
visual iteration by default. ManaMela is the quality reference; each client receives
its own visual language. Preserve an approved design while refining its weak points.

## How to work

1. **Tokens first.** Every client site defines the vocabulary in
   [tokens.md](references/tokens.md) in one place (`site/styles.css` `:root`, or the library
   template's `theme.css`). Component rules use `var(--gp-*)` only, never a raw hex, size or
   duration. Write the values into the client's `design/DESIGN.md` with one line of *why* each
   (the shopfront's green, the menu board's serif).
2. **Build with the rules** of the reference that covers the work:
   - spacing, grids, type, reading width, headings → [layout-and-type.md](references/layout-and-type.md)
   - palettes, contrast, dark mode → [colour.md](references/colour.md), and for any theme change
     [theme-transition.md](references/theme-transition.md)
   - buttons, links, forms, menus, dialogs, states, tap targets → [components-and-states.md](references/components-and-states.md)
   - icons → [icons.md](references/icons.md)
   - any transition or animation → [motion.md](references/motion.md)
   - images, fonts, page weight → [speed.md](references/speed.md)
3. **Prove it before showing it.** Run the check and fix every HIGH:
   ```sh
   node AI/skills/gale-design/scripts/check-site.mjs http://localhost:<port>/ --out <client>/review/check-site
   ```
   It opens the page in Chromium at 320, 390, 768 and 1440 wide, light and dark, runs axe and
   the rules below, writes screenshots and `report.md`, and ends in **Block** or **Approve**.
   Look at the screenshots yourself: the script catches the measurable faults, and your eye
   catches the ugly ones. Then walk every state by hand (hover, focus, press, error, empty, loading).
4. **Review in the fixed format** (below) whenever asked to review, and after the check.
   For a second opinion before a big showing, the `web-design-guidelines` skill and the UI
   Finish-Gate Reviewer and Accessibility Auditor agents may review too. Their findings go into
   this format, and these rules win where they disagree.

## The rules that most often decide premium vs cheap

These are the ones agents miss. Everything else is in the references.

- **One idea per section, one primary action per screen.** A visitor reads headings and skips
  the rest. Every heading must carry its section's point on its own.
- **Space, not boxes, makes groups.** The gap between groups is at least twice the gap inside a
  group. Reach for a card or a line only when space cannot do it.
- **Concentric corners.** Outer radius = inner radius + padding. Mismatched nested radii are the
  most common reason a page "feels off".
- **Real content decides the layout.** Real words and real photos first, never lorem ipsum.
  With no photos, make a strong typography-led design and list the exact shots needed. Never use
  stock images or AI-made premises, staff or food.
- **Nothing moves on load except one deliberate entrance.** Hover and press feedback takes
  150ms or less. A close is faster than its open. `transition: all` is banned.
- **Every state has a static cue.** Colour alone never carries an error, a selection or a
  success: add text or an icon too.
- **The theme glides when a person chooses it, and is instant otherwise.** This is Galeport's
  standard, and it deliberately differs from tools that snap the theme.
- **Speed is part of the design.** Exactly one `fetchpriority="high"` image, the LCP image. Every
  image has a width and height. Fonts are self-hosted woff2, at most two families.
- **Galeport's identity stays on Galeport surfaces.** Its mark, Instrument Sans and palette are
  never used on a client's site.

## Review format

Group findings by the rule each one breaks. Give one row per root cause, listing every place it appears:

| Severity | Location | Before | After | Why |
|---|---|---|---|---|

- **HIGH** breaks a task, access or trust: an unreadable contrast, an unreachable control, a
  layout broken at a test width, a flicker, a fake transaction, a missing state cue.
- **MEDIUM** is a visible inconsistency: spacing, radius, icon stroke, a motion value off-token.
- **LOW** is isolated polish.

`Location` is `path:line` or `width/theme + selector`. End with **Block** if any HIGH remains,
otherwise **Approve**. Then give a **Not verified** list of every state, width or browser you did not
actually check. Never approve what you did not look at. If there are no findings, say "No
actionable design findings" and still list what was verified.

## Setup

`check-site.mjs` needs Node and Playwright. It uses the copy already installed in
`company/website/node_modules` (read only), or any global `playwright`. axe-core 4.13 is
bundled in `scripts/vendor/` (MPL-2.0, unmodified), so the check runs offline.
