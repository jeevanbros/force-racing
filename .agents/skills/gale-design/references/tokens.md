# The token vocabulary

Every client site defines these names in one `:root` block. The names and meanings are fixed;
the values are the client's. Component CSS uses `var(--gp-*)` only, so restyling a site means
editing this block and nothing else. The first 19 are the library contract
(`company/website/library-tools/SPEC.md`). The rest were added on 27 Sep 2026; each one has a
default, so older templates keep working.

## The contract (library, unchanged)

| Token | Meaning |
|---|---|
| `--gp-bg`, `--gp-bg-sunk`, `--gp-surface` | page ground, quiet band, card |
| `--gp-ink`, `--gp-ink-2`, `--gp-ink-3` | headings/body, secondary, captions. Each ≥ 4.5:1 on `--gp-bg` and `--gp-bg-sunk` |
| `--gp-line`, `--gp-line-2` | hairline, stronger border / input outline (≥ 3:1 on its ground when it marks a control) |
| `--gp-accent`, `--gp-accent-ink`, `--gp-accent-sunk` | the thing you click, text on it (≥ 4.5:1), pressed/hover |
| `--gp-radius`, `--gp-radius-lg`, `--gp-border` | small and large corner, border width |
| `--gp-font-head`, `--gp-font-body` | the two families (at most two) |
| `--gp-scale` | multiplies every size |
| `--gp-container`, `--gp-measure` | max page width, reading width (60–70ch) |

## Added: states

```css
  --gp-focus:       var(--gp-accent);   /* focus ring; ≥ 3:1 against every ground it sits on */
  --gp-danger:      #B42318;            /* error text/border; ≥ 4.5:1 on --gp-bg */
  --gp-danger-sunk: #FEF3F2;            /* error field ground */
  --gp-ok:          #067647;            /* success text; ≥ 4.5:1 on --gp-bg */
  --gp-shadow-1:    0 1px 2px oklch(0 0 0 / .06), 0 1px 1px oklch(0 0 0 / .04);   /* resting card */
  --gp-shadow-2:    0 8px 24px -8px oklch(0 0 0 / .18), 0 2px 6px oklch(0 0 0 / .06); /* raised, menus */
```

Danger and success are never shown by colour alone (see components-and-states.md). Give each a
dark-theme value too.

## Added: fluid type (Utopia method: 16→18px body, ratio 1.2 at 320px → 1.25 at 1440px)

```css
  --gp-text-sm:   clamp(0.875rem, 0.8571rem + 0.08929vw, 0.9375rem); /* 14→15  labels, meta */
  --gp-text-base: clamp(1rem, 0.9643rem + 0.1786vw, 1.125rem);       /* 16→18  body, inputs */
  --gp-text-lg:   clamp(1.2rem, 1.141rem + 0.2946vw, 1.406rem);      /* 19→22  lead, h4 */
  --gp-text-xl:   clamp(1.44rem, 1.349rem + 0.4536vw, 1.758rem);     /* 23→28  h3 */
  --gp-text-2xl:  clamp(1.728rem, 1.594rem + 0.6705vw, 2.197rem);    /* 28→35  h2 */
  --gp-text-3xl:  clamp(2.074rem, 1.881rem + 0.9616vw, 2.747rem);    /* 33→44  h1 */
  --gp-text-4xl:  clamp(2.488rem, 2.218rem + 1.35vw, 3.433rem);      /* 40→55  hero display */
```

Why fluid rather than breakpoint sizes: the type grows smoothly with the screen, so there is no
width where a heading suddenly jumps or wraps badly, and there are fewer rules to get wrong. A
client may use a different ratio (a bold hero might run to 72px), but must keep body at 16px or
more and nothing under 12px. The Telugu body minimum is 17px.

## Added: fluid space

```css
  --gp-space-1: 0.25rem;                                        /* 4       icon↔label */
  --gp-space-2: 0.5rem;                                         /* 8       inside a group */
  --gp-space-3: clamp(0.75rem, 0.7143rem + 0.1786vw, 0.875rem); /* 12→14   control padding */
  --gp-space-4: clamp(1rem, 0.9286rem + 0.3571vw, 1.25rem);     /* 16→20   between groups, card padding */
  --gp-space-5: clamp(1.5rem, 1.357rem + 0.7143vw, 2rem);       /* 24→32   between blocks */
  --gp-space-6: clamp(2rem, 1.714rem + 1.429vw, 3rem);          /* 32→48   section inner */
  --gp-space-7: clamp(3rem, 2.571rem + 2.143vw, 4.5rem);        /* 48→72   between sections */
  --gp-space-8: clamp(4rem, 3.143rem + 4.286vw, 7rem);          /* 64→112  hero, major breaks */
```

Any gap must be one of these. The scale gets its rhythm from each gap being clearly different
from its neighbour; an in-between value such as 18px or 22px blurs it.

## Added: motion

```css
  --gp-dur-stagger:  40ms;   /* offset between items of one entrance */
  --gp-dur-quick:    150ms;  /* hover/press, closes, text swap, tooltip in */
  --gp-dur-fast:     250ms;  /* opens, icon swap, tabs, page slide */
  --gp-dur-slow:     400ms;  /* panel open, content reveal */
  --gp-dur-emphasis: 500ms;  /* one rare success or reveal moment */
  --gp-dur-theme:    900ms;  /* theme glide only */
  --gp-ease-out:     cubic-bezier(0.22, 1, 0.36, 1);  /* surfaces opening and closing */
  --gp-ease-std:     cubic-bezier(0.4, 0, 0.2, 1);    /* theme glide, colour changes */
```

Choose a duration by **what the motion is for**, not by how the number feels: a menu closing is
`--gp-dur-quick` because it is a close. (This idea and these numbers come from Transitions.dev;
the code is ours, because that repo carries no licence.)

## Two clients, one vocabulary (the proof)

```css
/* Goa beach bistro: warm, soft, serif */            /* Dental clinic: calm, crisp, sans */
--gp-bg: #F6EFE5;  --gp-ink: #2A2521;                 --gp-bg: #FFFFFF;  --gp-ink: #0F1B2D;
--gp-accent: #B5532C; --gp-accent-ink: #FFF8F0;       --gp-accent: #0B5CAD; --gp-accent-ink: #FFFFFF;
--gp-radius: 14px; --gp-radius-lg: 22px;              --gp-radius: 8px;  --gp-radius-lg: 12px;
--gp-font-head: "Cormorant", serif;                   --gp-font-head: "Inter", sans-serif;
--gp-text-4xl: clamp(2.8rem, 2.3rem + 2.5vw, 4.5rem); /* default --gp-text-4xl */
```

The same `.btn { background: var(--gp-accent); border-radius: var(--gp-radius); }` gives a
terracotta pill-ish button to one and a clinical blue one to the other.

## Dark theme

Dark is a second set of *values* for the same names, under `@media (prefers-color-scheme: dark)`
and `[data-theme="dark"]`. See colour.md for deriving it and theme-transition.md for switching
it. Colour tokens that differ between themes are registered with `@property`, so the theme can glide.
