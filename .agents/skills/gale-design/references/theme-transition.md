# Theme change: glide on a choice, never flicker

Standard for every client site with a dark mode (27 Sep 2026). Reference implementations:
Greenland Bistro (`clients/hospitality/greenland-bistro-saligao/site/styles.css`, "theme change")
and the demo-kit presenter (`gale-presenter/scripts/demo-kit/tools/present.html`, `motion()`).
galeport.com is the exception: it changes theme instantly (Krishna's call), with the same
no-flicker guard (`company/website/SITE-DESIGN.md` §11).

## The rules

1. **A chosen theme glides; nothing else moves.** The page animates only when a person
   chooses a theme: the presenter's Light / Dark / Auto (buttons or keys L, D, A), or a theme
   button on the site. A page load, reload, back/forward restore, another tab's choice or the
   device's own setting changing is **instant**. A dark-mode visitor who watches every page
   fade from light to dark is seeing a flicker.
2. **Never let an element fade on its own.** Buttons, links and fields have short colour
   transitions for hover. If the theme changes after they were styled, they fade from the
   old theme's colours while the page snaps. That was the galeport.com "Contact us" flicker.
   Every non-chosen change goes under `.theme-instant`.
3. **Reduced motion** (`prefers-reduced-motion: reduce`): the choice is instant too.
4. **What cannot interpolate still changes cleanly.** Two logo images: stack them and
   cross-fade `opacity` (never `display`, which snaps and may decode mid-change). Shadows:
   put their colours in registered tokens. Icons that flip: rotate, don't swap.

## The pattern (CSS)

Register every colour token that differs between light and dark, so the browser can
interpolate the custom property itself; every colour drawn from it follows, borders and
shadows included:

```css
@property --bg  { syntax: "<color>"; inherits: true; initial-value: #F6EFE5; }
@property --ink { syntax: "<color>"; inherits: true; initial-value: #2A2521; }
/* … one per changing colour token; shadow colours as --shadow-1 / --shadow-2 … */

:root { --t-theme: 900ms; --ease-theme: cubic-bezier(0.4, 0, 0.2, 1); }

/* instant path: load, reload, device setting, back/forward */
.theme-instant, .theme-instant *, .theme-instant *::before, .theme-instant *::after { transition: none !important; }

/* chosen path: the tokens glide on the element that defines them */
.theme-animating { transition: --bg var(--t-theme) var(--ease-theme), --ink var(--t-theme) var(--ease-theme) /* , … */; }
/* elements follow the tokens directly; their own short transitions would lag */
.theme-animating body, .theme-animating body *, .theme-animating body *::before,
.theme-animating body *::after { transition: none !important; }
/* then re-enable only what cannot ride a token, e.g. a cross-faded logo: */
.theme-animating .logo img { transition: opacity var(--t-theme) var(--ease-theme) !important; }
```

900 ms with `cubic-bezier(0.4, 0, 0.2, 1)` is the demo standard (Baked in Goa, Greenland
Bistro). Keep the transition list and the `@property` list identical: a token that is
registered but not listed snaps; one listed but not registered snaps too.

Browsers without `@property` (Safari before 16.4) simply snap. That is acceptable, never broken.

## Who adds the classes

- **The presenter** (`tools/present.html`, from the gale-presenter demo kit) adds `theme-animating` to the
  site's `<html>` for 1.4 s when Light/Dark/Auto is chosen, and makes load-time changes under
  its own injected `.theme-instant` rule. A site therefore needs only the CSS above.
- **A theme button on the site** does the same in its own script: `theme-animating` inside the
  tap handler only (removed on the root's `transitionend` for `--bg`, with a timeout
  fallback), `theme-instant` around every other change (`matchMedia` change, `storage` event,
  `pageshow` with `persisted`), then force a style flush (`void root.offsetHeight`) and remove
  it two animation frames later. Set the first theme in a `<head>` script before any
  stylesheet, so the first paint is already right.

## Prove it before showing

Playwright, Chromium and WebKit, light and dark device:

- load, reload, navigate, back: `transitionrun` fires for nothing (hover aside) and the page
  ground is one colour from the first frame;
- a choice: the ground passes through many colours over about 0.9 s, the class is gone after;
- reduced motion: one step;
- through the presenter with a remembered Dark: no fade on load (WebKit shows it if present).

Frame-by-frame evidence is the standard, not an eyeball: sample `getComputedStyle` per
`requestAnimationFrame`, or record a CDP screencast and diff the frames.

Both proofs are automated: `gale-design/scripts/check-site.mjs` fails any colour transition on
load, and `gale-presenter/scripts/check-demo.mjs` samples the ground every frame during a
choice, on a reload with Dark remembered, and under reduced motion (Chromium). Safari is
still checked by hand.
