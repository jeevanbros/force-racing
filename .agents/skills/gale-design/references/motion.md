# Motion

Motion on a local-business site does one of three jobs: **confirm** an action (a press, a
sent), **connect** two states (a menu opening from its button), or **direct** attention once
(the hero's first entrance). If it does none of these, cut it. Owners and their customers are
on mid-range Android phones. Motion that stutters there looks cheaper than no motion at all.

## Choosing duration and easing

Use the tokens (tokens.md) and choose by **usage**:

| Motion | Duration | Easing | Moves |
|---|---|---|---|
| Hover, press, colour change | `--gp-dur-quick` 150ms | `--gp-ease-out` | colour, background, `scale(.96)` |
| Menu/dropdown open | `--gp-dur-fast` 250ms | `--gp-ease-out` | opacity, `scale(.97)`→1, from the trigger (`transform-origin`) |
| Menu/dropdown close | `--gp-dur-quick` 150ms | `--gp-ease-out` | opacity, `scale(.99)` |
| Dialog open / close | 250ms / 150ms | `--gp-ease-out` | opacity, `scale(.96)`→1 |
| Accordion (`details`) | 250ms | `--gp-ease-out` | `grid-template-rows: 0fr → 1fr`, or `interpolate-size: allow-keywords` |
| Toast in / out | 400ms / 350ms | `--gp-ease-out` | `translateY(8px)`→0 plus opacity |
| Icon swap | 250ms | `--gp-ease-out` | opacity, scale .25→1, blur 4px→0 |
| Text swap ("Copied") | 150ms | ease-in-out | `translateY(4px)` plus opacity |
| Hero entrance (once) | 500ms, stagger 40–100ms | `--gp-ease-out` | `translateY(12px)` plus opacity, in 2–4 semantic chunks |
| Theme change (a person's choice) | 900ms | `--gp-ease-std` | registered colour tokens (theme-transition.md) |

(Values from Transitions.dev's usage-based scale and better-ui, verified at source on 27 Sep 2026.)

## Rules

- **A close is faster than its open, and never bounces.** Opening invites; closing gets out of the way.
- **Exits are small.** Leave with a fixed 4–12px shift and a fade, never a full-height slide.
- **Animate only `transform`, `opacity` and `filter`.** Size and position changes use transforms
  or `grid-template-rows`. Animating `height`, `top` or `box-shadow` on scroll makes the page janky on phones.
- **Name the properties:** `transition: opacity 250ms …, transform 250ms …`. Never `transition: all`:
  it animates things you did not mean to, including the theme.
- **Use transitions for interaction, keyframes for one-off sequences.** Transitions can be
  interrupted halfway; keyframes cannot.
- **`will-change` only after you see a first-frame stutter**, only on transform, opacity or filter,
  and only while animating.
- **Nothing animates on page load** except one deliberate hero entrance. Nothing loops except a
  loading indicator. No parallax, no scroll-jacking, no autoplaying carousel. A scroll reveal is
  allowed only as a single 400ms fade-up per section, triggered once by `IntersectionObserver`,
  and the content must already be visible if the script fails.
- **Every animated change also has a static cue** (colour, icon or label). Motion is never the only feedback.
- **Reduced motion:** under `@media (prefers-reduced-motion: reduce)` every transition and
  animation becomes instant or a plain opacity change of 150ms or less, and the theme change is instant.
  Put one global guard at the end of the stylesheet:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 1ms !important; animation-iteration-count: 1 !important;
      transition-duration: 1ms !important; scroll-behavior: auto !important; }
  }
  ```
- **CSS only on client sites.** No GSAP, Framer Motion, Lottie or scroll libraries: everything
  in the table above is CSS, and a library adds weight to every page on a mid-range phone. The
  GSAP skills on this machine are for HyperFrames video and pitch clips, not client pages.
- **Review at 10% speed** (DevTools → Animations → 10%). What looks slightly off at full speed is obviously wrong there.
