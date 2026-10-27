# Colour and dark mode

## Where a palette comes from

From the business itself: the shopfront paint, the signboard, the menu card, the uniforms, the
logo. Photograph or sample it; do not pick from a trend palette. Record each source in
`design/DESIGN.md` ("accent = the door's green, sampled from IMG_2231").

Build it as roles, not swatches: ground, sunk ground, surface, three inks, two lines, accent
with its ink and pressed state, danger, ok, focus (tokens.md). One accent. A second accent is
allowed only when the business has two genuine identities (e.g. veg / non-veg markers).

## Contrast (pass or fail = WCAG 2.2 AA)

| What | Minimum | Why |
|---|---|---|
| Body and small text | 4.5:1 | WCAG 1.4.3 |
| Large text (≥ 24px, or ≥ 18.66px bold) | 3:1 | WCAG 1.4.3 |
| Control borders, focus ring, icons that carry meaning | 3:1 against what is next to them | WCAG 1.4.11 |
| Text on photos | 4.5:1 measured on the lightest part under the text | use a scrim, never hope |

APCA may be used to *tune* (it models weight and polarity better), but WCAG 2 decides pass or
fail, because WCAG 2 is the legal and procurement standard. The check script runs axe for text
contrast and measures control borders itself.

**Fixing a failure:** change **lightness** only, in OKLCH, and keep hue and chroma. This keeps the
brand recognisable (better-colors). Example: `oklch(0.62 0.13 150)` fails on white → `oklch(0.52 0.13 150)`.

Library default warning: `--gp-line-2: #d2d2ce` on white is about 1.5:1. That is fine for a
decorative divider, but it fails as an input border. Input borders use `--gp-ink-3` or a
line-2 dark enough for 3:1.

## Authoring

- Write palettes in OKLCH (`oklch(L C H)`): equal steps of L look like equal steps, which hex
  and HSL do not. Hex is fine as the stored value if the tooling needs it.
- Gradients interpolate in OKLCH: `linear-gradient(in oklch, …)`. Why: sRGB gradients between two
  saturated colours pass through a grey dead zone.
- Image outline: `outline: 1px solid oklch(0 0 0 / .1); outline-offset: -1px` in light, `oklch(1 0 0 / .1)` in dark.
  Always pure black or white at low alpha, never a tinted grey, which reads as dirt on the edge (better-ui).
- Shadows use black at low alpha, layered (tokens `--gp-shadow-1/2`). Use a shadow for elevation and a
  border for structure (a divider, a selected state).

## Dark mode

Offer dark mode when the business lives at night or on phones in the evening (bars, bistros,
late cafés), or when the client wants it. It is not compulsory. When offered:

- **Derive it; do not invert it.** Ground: a very dark tint of the brand hue, L 0.16–0.22 with
  C ≤ 0.03, never pure `#000` on large areas (it smears on OLED screens when scrolling). Inks: L 0.92–0.96
  for body and 0.75–0.82 for secondary. Accent: raise L until the accent ink passes 4.5:1, and
  lower C a little, because saturated colours glow on dark grounds.
- Surfaces get *lighter* as they rise (surface above ground), not darker, because shadows are
  nearly invisible on dark.
- Re-check every pair: a colour that passed in light often fails in dark.
- Photos: no filter by default. Only a logo or illustration with a baked white box needs a dark
  variant. Cross-fade two images (theme-transition.md), never swap `display`.
- `color-scheme: light dark` on `:root`, so form controls and scrollbars follow the theme.
- The first theme is set by a tiny `<head>` script before any stylesheet, so the first paint is already
  correct. Changing theme follows theme-transition.md exactly.
