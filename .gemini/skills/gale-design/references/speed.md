# Images, fonts and speed

Big sites are fast because of discipline at the edge and in the page, not because of
frameworks (research-16 §3). Our static files on Cloudflare already give us the edge. The page
discipline is below.

## Budgets (set from our best build, Greenland Bistro: HTML 23 KB, CSS 18.5 KB, JS 12.8 KB gzipped)

| Measure | Budget |
|---|---|
| HTML per page, gzipped | ≤ 35 KB |
| CSS total, gzipped | ≤ 25 KB, one file (plus the small inline theme script) |
| JS total, gzipped | ≤ 25 KB, vanilla, `defer`, and the page works before it runs |
| Fonts | ≤ 2 families, ≤ 4 woff2 files, ≤ 150 KB together |
| Hero / LCP image | ≤ 150 KB at the 390px-wide variant |
| Any other image | ≤ 200 KB at its largest served size |
| First view total (390px, before scrolling) | ≤ 1 MB |
| Core Web Vitals, p75 mobile | LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 |

The check script measures the file budgets and the image rules. The Core Web Vitals are measured
on the live site with PageSpeed Insights once it is public.

## Images

- AVIF or WebP, with JPEG only as a fallback in `<picture>`. Produce 480, 800, 1200 and 1600px widths
  and serve them with `srcset` and an honest `sizes`.
- Every `<img>` has `width` and `height` (or `aspect-ratio` in CSS) and a real `alt` ("Wood-fired
  margherita on the counter"); a purely decorative image gets `alt=""`.
- **Exactly one** `fetchpriority="high"`: the LCP image (usually the hero). Two or more "high"
  images compete and slow each other. Greenland Bistro had five on 27 Sep 2026.
- Below the first screen: `loading="lazy" decoding="async"`. Never lazy-load the hero.
- Do not put the hero in a CSS `background-image`: the browser finds it late. Use `<img>` or preload it.
- Strip EXIF location from owner photos before publishing.

## Fonts

Self-hosted woff2, subset to the scripts in use, `font-display: swap`, and the one or two
first-view faces preloaded with `<link rel="preload" as="font" type="font/woff2" crossorigin>`.
No Google Fonts link at runtime: demos run offline, and a third-party request slows the first paint.

## Scripts and CSS

- No framework and no runtime CDN. Anything we need is vendored in `site/`.
- The theme `<head>` script is inline and tiny. Everything else is `defer`.
- Third-party embeds (Maps, Instagram) are **click-to-load**: show a static image with a
  button, and load the iframe only on tap. Why: one Maps iframe weighs more than the whole site.

## Caching (`_headers`)

Hashed or versioned assets (`/img/*`, `/fonts/*`): `public, max-age=31536000, immutable`.
HTML, CSS, JS and data files are revalidated (`max-age=0, must-revalidate`, or a short `max-age`), so a
change shows at once. The security headers are in the gale skill's publish reference.
