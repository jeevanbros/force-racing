# Icons

## Source and licence

One set per site. Pick by the site's character, then stay with it:

| Set | Licence | Character | Default stroke |
|---|---|---|---|
| Lucide (lucide.dev) | ISC | neutral, friendly, the safe default | 2px on 24px |
| Tabler (tabler.io/icons) | MIT | slightly technical, huge range | 2px |
| Phosphor (phosphoricons.com) | MIT | six weights, good for warm or luxury sites | varies by weight |
| Material Symbols | Apache 2.0 | Google look, variable weight | variable |

All four are free for client work. Keep the licence text in `site/icons/LICENSE-<set>.txt`.
Brand marks (WhatsApp, Instagram, Google Maps, UPI) come from the brand's own asset page or
Simple Icons (CC0), follow the brand's rules, and are never redrawn or recoloured beyond what
the brand allows.

## Format

- Inline `<svg>` for the few icons on a page, or one sprite with `<use href="#i-phone">`
  for many. No icon fonts: they fail to load, render blurry and are read aloud as nonsense.
  **No emoji as icons:** they render differently on every phone and cannot be styled.
- `fill="none" stroke="currentColor"` (or `fill="currentColor"` for solid sets), so the icon
  takes its colour from the text and states come from CSS.
- A decorative icon gets `aria-hidden="true" focusable="false"`. An icon that is the only
  content of a control makes the control carry `aria-label`.
- Vendor the SVG files into the site. Never load an icon CDN at runtime: demos run offline.

## Size and stroke

- Sizes: 16px (inline with small text), 20px (buttons, list rows), 24px (standalone),
  32–48px (feature marks). Keep them on these steps.
- The stroke matches the text beside it: 1.5px next to 400-weight text, 2px next to 500–600,
  2.5px next to 700 (better-ui). Set it once: `.icon { stroke-width: 1.5 }`, and never mix
  strokes within one view.
- Outline is the default; filled marks the active or selected state.
- Align icons to the text's cap height, not the line box (`vertical-align: -0.125em` for
  16–20px beside text), then nudge optically. A play triangle, a chevron or an arrow usually needs
  1px towards its point to look centred.
- Direction icons (arrows, chevrons) flip in RTL with `:dir(rtl) .icon-dir { scale: -1 1 }`. Relevant
  for Urdu content.

## Changing an icon

Two icons in one slot (menu ↔ close, copy ↔ copied): keep both in the DOM, stack them, and
cross-fade with `opacity` 0→1, `scale` .25→1 and `filter: blur(4px)`→0 over `--gp-dur-fast`
with `--gp-ease-out` (better-ui's values). Never toggle `display`. Under reduced motion, swap
with no animation.
