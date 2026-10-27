# Layout and type

## Page structure

The skeleton every one-page local-business site starts from. It is the same shape apple.com
uses (measured 27 Sep 2026: one `h1`, `nav[aria-label]`, `main`, sections, `footer`):

```html
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header>
    <a href="/" aria-label="Business name, home">…logo…</a>
    <nav aria-label="Main">…</nav>
  </header>
  <main id="main">
    <section aria-labelledby="hero-h"><h1 id="hero-h">…</h1>…primary action…</section>
    <section aria-labelledby="menu-h"><h2 id="menu-h">…</h2>…</section>
    …
    <section aria-labelledby="visit-h"><h2 id="visit-h">Visit</h2>address, hours, map link, call</section>
  </main>
  <footer>…NAP exactly as on the Business Profile, legal lines…</footer>
</body>
```

- One `<main>`, one `<h1>`, and headings that never skip a level. Why: screen readers and Google both read the outline.
- Landmarks are elements (`header`, `nav`, `main`, `footer`), not `div` with roles.
- The primary action (WhatsApp, call, book) is visible in the first screen at 390px width,
  and again at the end. On phones, a sticky bottom action bar is allowed when it is the
  business's main job (ordering, booking). It must keep the safe area: `padding-bottom: max(12px, env(safe-area-inset-bottom))`.
- Headings carry the point: "Wood-fired pizza, open till midnight", not "Our Menu". Visitors scan headings (NN/g layer-cake).
- One layout per idea. Never repeat the same "words left, picture right" block down the page.

## Width and grid

- Page content max `--gp-container` (1100–1240px); text columns max `--gp-measure` (60–70ch). Why:
  lines longer than ~75 characters make readers lose their place.
- Side gutter at least 16px at 320px (`padding-inline: max(16px, env(safe-area-inset-left))`).
- No horizontal scroll at any width from 320px up. The check measures this at 320, 390, 768 and 1440.
- Layout breakpoints go where the **content** breaks. Resize and watch, and add a media query at the
  first ugly width. 320/390/768/1440 are *test* widths, not breakpoints to copy.
  Prefer intrinsic layouts that need no breakpoint:
  `grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr))`.
- Use container queries (`@container`) for a component that must adapt to its column, not the window.

## Spacing and grouping

- Every gap comes from `--gp-space-*`.
- Grouping order: space first, then a background shape, then a separator line, only where
  space cannot carry the structure (better-layout).
- The gap between groups is at least 2× the gap inside a group, e.g. 8px within and 16px or more between.
  If it is less, the grouping reads as noise.
- Section rhythm: `--gp-space-7` between sections, `--gp-space-8` around the hero.
- A horizontal scroller lets the next item peek 16–32px past the edge, or has a visible
  control. Hidden content with no cue does not exist for the visitor.
- Concentric corners: outer radius = inner radius + padding (better-ui). A 12px card with 8px
  padding holds a 4px-radius image.

## Type

- Body `--gp-text-base` (16→18px), and 17px or more for Telugu and other Indic scripts, whose glyphs
  read smaller at the same size. Nothing under 12px anywhere. Buttons 15px or more. Inputs 16px
  or more, because iOS Safari zooms the page when an input is smaller.
- Line height: body 1.5–1.65; anything that wraps to three or more lines is at least 1.4; big display
  headings 1.05–1.2.
- `text-wrap: balance` on headings, `text-wrap: pretty` on short descriptions and card text,
  neither on long running text (it costs layout time and does nothing there).
- Weight 400 or more below 18px. Light and thin weights are for display sizes only.
- Numbers that line up (prices, hours) use `font-variant-numeric: tabular-nums`.
- Links in text are underlined: `text-decoration-thickness: from-font; text-underline-offset: .18em;`.
  Why: colour alone does not mark a link (WCAG 1.4.1).
- Avoid ALL CAPS body text. Small caps and uppercase labels get `letter-spacing: .04–.08em`.
- Fonts: at most two families and four woff2 files, self-hosted, subset to the scripts used,
  `font-display: swap`, and the first-view face preloaded. Size the fallback with
  `size-adjust`/`ascent-override` so the swap does not shift the layout. Check the licence
  (OFL is fine) and keep it next to the font.
- Indic text: the font must contain the script (Noto Sans Telugu, Tiro, Anek). Never let the
  browser fall back silently. Set `lang="te"` on those elements.
