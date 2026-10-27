#!/usr/bin/env node
// gale-design check-site: the pre-show check for a Galeport client page.
//
//   node check-site.mjs <url> [--out <dir>] [--pages /,/menu/] [--widths 320,390,768,1440]
//
// Opens each page in Chromium at every width, light and dark; runs axe (bundled, offline) and
// the gale-design rules that can be measured; writes screenshots, report.md and report.json
// into --out, and prints the verdict. Exit code 1 = Block, 0 = Approve.
// It checks what a script can measure. States, taste and real devices are listed under
// "Not verified" for a person to walk.
import { createRequire } from "node:module";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../..");   // the Galeport company root

function loadPlaywright() {
  const tries = [
    () => createRequire(import.meta.url)("playwright"),
    () => createRequire(join(ROOT, "company/website/package.json"))("playwright"),
  ];
  for (const t of tries) { try { return t(); } catch {} }
  console.error("Playwright not found. Install it once: npm i -g playwright && npx playwright install chromium");
  process.exit(2);
}

// ---- arguments -------------------------------------------------------------------------------
const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith("--")) {
  console.error("usage: node check-site.mjs <url> [--out dir] [--pages /,/menu/] [--widths 320,390,768,1440]");
  process.exit(2);
}
const opt = (k, d) => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : d; };
const base = new URL(args[0]);
const OUT = resolve(opt("--out", "check-out"));
const WIDTHS = opt("--widths", "320,390,768,1440").split(",").map(Number);
const PAGES = opt("--pages", base.pathname).split(",");
const THEMES = ["light", "dark"];
const AXE = readFileSync(join(HERE, "vendor/axe.min.js"), "utf8");
const KB = 1024;
const BUDGET = { html: 35 * KB, css: 25 * KB, js: 25 * KB, fontFiles: 4, fontBytes: 150 * KB, heroImg: 150 * KB, img: 200 * KB, firstLoad: 1024 * KB };

mkdirSync(join(OUT, "shots"), { recursive: true });
// check output is evidence, not source: it ignores itself so it never lands in a client commit
writeFileSync(join(OUT, ".gitignore"), "*\n");

// ---- findings --------------------------------------------------------------------------------
const findings = new Map();   // one row per root cause, with every place it appears
function add(sev, rule, what, where, fix) {
  const k = rule + "|" + what;
  const f = findings.get(k) || { sev, rule, what, fix, where: new Set() };
  if (rank(sev) < rank(f.sev)) f.sev = sev;
  f.where.add(where);
  findings.set(k, f);
}
const rank = (s) => ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[s]);

// ---- in-page measurements (run in the browser) -----------------------------------------------
function measure() {
  const out = { overflow: 0, smallText: [], smallInputs: [], targets: [], borders: [], h1: 0, allTransitions: [] };
  const vw = document.documentElement.clientWidth;
  out.overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - vw;
  const sel = (el) => {
    if (el.id) return "#" + el.id;
    let s = el.tagName.toLowerCase();
    if (el.classList.length) s += "." + [...el.classList].slice(0, 2).join(".");
    const p = el.parentElement;
    return p && p !== document.body ? sel(p).split(" > ").slice(-1)[0] + " > " + s : s;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && parseFloat(cs.opacity) > 0;
  };
  // text under 12px
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const n = walker.currentNode, el = n.parentElement;
    if (!el || seen.has(el) || !n.textContent.trim()) continue;
    seen.add(el);
    if (el.closest("[aria-hidden=true], script, style, noscript, svg")) continue;
    if (!visible(el)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) out.smallText.push({ sel: sel(el), fs, text: n.textContent.trim().slice(0, 40) });
  }
  // inputs under 16px (iOS zooms) and their border contrast
  const lum = (c) => {
    const m = c.match(/[\d.]+/g); if (!m) return null;
    const [r, g, b] = m.slice(0, 3).map((v) => { v = v / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return { L: 0.2126 * r + 0.7152 * g + 0.0722 * b, a: m[3] === undefined ? 1 : parseFloat(m[3]) };
  };
  const groundOf = (el) => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const bg = getComputedStyle(n).backgroundColor, l = lum(bg);
      if (l && l.a > 0.5) return bg;
    }
    return getComputedStyle(document.documentElement).backgroundColor || "rgb(255,255,255)";
  };
  const ratio = (a, b) => { const x = lum(a).L, y = lum(b).L; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea").forEach((el) => {
    if (!visible(el)) return;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    if (fs < 16) out.smallInputs.push({ sel: sel(el), fs });
    const bw = parseFloat(cs.borderBottomWidth);
    const own = lum(cs.backgroundColor);
    const ground = groundOf(el);
    // a field shows itself by its border, or by a fill that contrasts with the ground
    const fillR = own && own.a > 0.5 ? ratio(cs.backgroundColor, ground) : 1;
    const borderR = bw > 0 && lum(cs.borderBottomColor).a > 0 ? ratio(cs.borderBottomColor, own && own.a > 0.5 ? cs.backgroundColor : ground) : 1;
    if (Math.max(fillR, borderR) < 3) out.borders.push({ sel: sel(el), ratio: +Math.max(fillR, borderR).toFixed(2) });
  });
  // tap targets (links inside running text are exempt)
  document.querySelectorAll("a[href], button, [role=button], summary, input, select, textarea, label[for]").forEach((el) => {
    if (!visible(el)) return;
    if (el.matches("a") && getComputedStyle(el).display === "inline") {
      const p = el.parentElement, txt = p ? p.textContent.replace(el.textContent, "").trim() : "";
      if (txt.length > 0) return;   // a link in a sentence
    }
    if (el.matches("input[type=checkbox], input[type=radio]") && el.labels && el.labels.length) return;   // its label is the target
    const r = el.getBoundingClientRect();
    if (r.width < 44 || r.height < 44) out.targets.push({ sel: sel(el), w: +r.width.toFixed(1), h: +r.height.toFixed(1) });
  });
  out.h1 = document.querySelectorAll("h1").length;
  // `transition: all` in same-origin stylesheets
  for (const sh of document.styleSheets) {
    let rules; try { rules = sh.cssRules; } catch { continue; }
    const scan = (list) => { for (const r of list) {
      if (r.cssRules) scan(r.cssRules);
      if (!r.style) continue;
      const tp = r.style.transitionProperty || "";
      const dur = r.style.transitionDuration || "";
      if (/(^|,\s*)all(\s*,|$)/.test(tp) && !/^0m?s$/.test(dur.trim())) out.allTransitions.push(r.selectorText);
    } };
    scan(rules);
  }
  // images
  const imgs = [...document.images].map((im) => {
    const r = im.getBoundingClientRect();
    return { src: im.currentSrc || im.src, sel: sel(im), fp: im.getAttribute("fetchpriority"), lazy: im.loading === "lazy",
      sized: im.hasAttribute("width") && im.hasAttribute("height") || getComputedStyle(im).aspectRatio !== "auto",
      firstView: r.top < innerHeight && r.bottom > 0 && r.width > 0, alt: im.getAttribute("alt") };
  });
  out.imgs = imgs;
  return out;
}

// ---- run -------------------------------------------------------------------------------------
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const net = { byType: {}, fonts: [], imgs: {}, external: new Set(), total390: 0 };
const loadFades = [];
let pagesChecked = 0;

for (const path of PAGES) {
  const url = new URL(path, base).href;
  for (const theme of THEMES) {
    for (const w of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width: w, height: w < 768 ? 844 : 900 }, colorScheme: theme,
        deviceScaleFactor: w < 768 ? 2 : 1, hasTouch: w < 768, isMobile: w < 768 });
      const page = await ctx.newPage();
      const first = w === 390 && theme === "light";
      // count every transition that starts while nothing was touched: that is a fade on load
      await page.addInitScript(() => {
        window.__fades = []; window.__cls = 0; window.__lcp = null;
        const name = (t) => t && t.tagName ? (t.id ? "#" + t.id : t.tagName.toLowerCase() + (t.classList.length ? "." + [...t.classList][0] : "")) : "?";
        document.addEventListener("transitionrun", (e) => window.__fades.push({ el: name(e.target), prop: e.propertyName }), true);
        try {
          new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; }))
            .observe({ type: "layout-shift", buffered: true });
          new PerformanceObserver((l) => { const e = l.getEntries().pop(); if (e) window.__lcp = { el: name(e.element),
            img: e.element && e.element.tagName === "IMG", fp: e.element && e.element.getAttribute("fetchpriority"), size: e.size }; })
            .observe({ type: "largest-contentful-paint", buffered: true });
        } catch {}
      });
      if (first) page.on("response", async (res) => {
        try {
          const u = new URL(res.url());
          if (u.origin !== base.origin && !u.protocol.startsWith("data")) { net.external.add(u.origin); return; }
          const type = res.request().resourceType();
          const body = await res.body().catch(() => null);
          if (!body) return;
          net.total390 += body.length;
          if (["document", "stylesheet", "script"].includes(type)) {
            const k = { document: "html", stylesheet: "css", script: "js" }[type];
            net.byType[k] = net.byType[k] || [];
            net.byType[k].push({ url: u.pathname, gz: gzipSync(body).length });
          }
          if (type === "font") net.fonts.push({ url: u.pathname, bytes: body.length });
          if (type === "image") net.imgs[res.url()] = body.length;
        } catch {}
      });
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      } catch (e) {
        add("HIGH", "Page loads", `could not load ${url}: ${e.message.split("\n")[0]}`, `${w}/${theme}`, "start the demo server and check the URL");
        await ctx.close(); continue;
      }
      await page.waitForTimeout(400);
      const where = `${w}px ${theme} ${path}`;
      const tag = `${path.replace(/\W+/g, "_") || "root"}-${w}-${theme}`;
      await page.screenshot({ path: join(OUT, "shots", tag + ".png"), fullPage: true });

      // colour changing on load = a theme flicker (HIGH); transform/opacity = an entrance (allowed once)
      const fades = await page.evaluate(() => window.__fades);
      const COLOUR = /color|background|border|fill|stroke|shadow|outline|^--/;
      const flick = fades.filter((f) => COLOUR.test(f.prop)), enter = fades.filter((f) => !COLOUR.test(f.prop));
      const list = (a) => [...new Set(a.map((f) => f.el + " " + f.prop))].slice(0, 4).join(", ");
      // a theme flicker hits the root, a colour token or many elements at once; one control easing into its state is smaller
      const flickEls = new Set(flick.map((f) => f.el));
      const themeWide = flick.some((f) => /^--/.test(f.prop) || /^(html|body)\b/.test(f.el)) || flickEls.size >= 5;
      if (flick.length) { loadFades.push(where); add(themeWide ? "HIGH" : "MEDIUM", themeWide ? "Theme: no fade on load" : "State: no fade on load",
        `${flick.length} colour transition(s) on ${flickEls.size} element(s) ran on load with no interaction: ${list(flick)}`,
        where, themeWide ? "wrap non-chosen changes in .theme-instant (theme-transition.md)" : "set the initial state before first paint, or without transition"); }
      if (enter.length) add("LOW", "Motion: one entrance on load", `entrance animation on load: ${list(enter)}`, where,
        "fine if it is the one deliberate hero entrance; remove any other");
      const perf = await page.evaluate(() => ({ cls: window.__cls, lcp: window.__lcp }));
      if (perf.cls > 0.1) add("HIGH", "Speed: layout shift", `CLS ${perf.cls.toFixed(3)} on load (good ≤ 0.1)`, where, "give images/embeds their size; size-adjust fallback fonts");
      else if (perf.cls > 0.05) add("MEDIUM", "Speed: layout shift", `CLS ${perf.cls.toFixed(3)} on load (aim ≤ 0.05)`, where, "find the shifting element (DevTools → Performance → Layout shifts)");
      if (first) { net.lcp = perf.lcp; net.cls = perf.cls;
        if (perf.lcp && perf.lcp.img && perf.lcp.fp !== "high") add("MEDIUM", "Speed: LCP image priority", `the LCP element ${perf.lcp.el} is an image without fetchpriority="high"`, where, 'add fetchpriority="high" to it (and to nothing else)'); }

      const m = await page.evaluate(measure);
      if (m.overflow > 1) add("HIGH", "No horizontal scroll", `page is ${m.overflow}px wider than the screen`, where, "find the wide element; use min(100%, …) and overflow-wrap");
      m.smallText.slice(0, 6).forEach((t) => add("HIGH", "Type floor", `text at ${t.fs}px ("${t.text}")`, `${where} ${t.sel}`, "nothing under 12px; use --gp-text-sm"));
      if (w < 768) {
        m.smallInputs.forEach((t) => add("MEDIUM", "Inputs ≥ 16px", `field text ${t.fs}px (iOS zooms the page)`, `${where} ${t.sel}`, "font-size: var(--gp-text-base)"));
        m.targets.forEach((t) => add(Math.min(t.w, t.h) < 24 ? "HIGH" : "MEDIUM", "Tap targets",
          `${t.w}×${t.h}px (${Math.min(t.w, t.h) < 24 ? "under the WCAG 24px floor" : "under 44px"})`, `${where} ${t.sel}`, "min 44×44: padding or ::after hit area"));
      }
      m.borders.forEach((b) => add("MEDIUM", "Control contrast (WCAG 1.4.11)", `field edge only ${b.ratio}:1 against its ground`, `${where} ${b.sel}`, "border ≥ 3:1: use --gp-ink-3, not the library --gp-line-2"));

      // axe: WCAG 2.2 A/AA plus best practice (heading order, one main, landmarks)
      await page.addScriptTag({ content: AXE });
      const axe = await page.evaluate(async () => (await window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
        resultTypes: ["violations"] })).violations);
      axe.forEach((v) => {
        const sev = v.impact === "critical" || v.impact === "serious" ? "HIGH" : v.impact === "moderate" ? "MEDIUM" : "LOW";
        v.nodes.slice(0, 5).forEach((n) => add(sev, "axe: " + v.id, v.help, `${where} ${n.target.join(" ")}`, v.helpUrl));
      });

      if (first) {
        if (m.h1 !== 1) add("MEDIUM", "Structure", `${m.h1} <h1> elements (want exactly one)`, where, "one h1 per page");
        m.allTransitions.forEach((s) => add("MEDIUM", "Motion: no transition: all", "transition: all", `${path} ${s}`, "name the properties (motion.md)"));
        const high = m.imgs.filter((i) => i.fp === "high");
        if (high.length !== 1) add("MEDIUM", "Speed: one LCP priority", `${high.length} images with fetchpriority="high" (want exactly 1: the hero)`,
          `${path} ${high.map((i) => i.sel).slice(0, 5).join(", ") || "none"}`, "keep it only on the first-view hero image");
        m.imgs.filter((i) => !i.sized).slice(0, 8).forEach((i) => add("LOW", "Speed: images sized", "img has no width/height attributes (fine if CSS fixes its box; CLS above is the real test)", `${path} ${i.sel}`, "add width and height"));
        m.imgs.filter((i) => i.firstView && i.lazy).forEach((i) => add("MEDIUM", "Speed: no lazy hero", "first-view image is loading=lazy", `${path} ${i.sel}`, "remove loading=lazy above the fold"));
        m.imgs.filter((i) => i.alt === null).slice(0, 8).forEach((i) => add("HIGH", "Images have alt", "img with no alt attribute", `${path} ${i.sel}`, 'real alt text, or alt="" if decorative'));
        m.imgs.forEach((i) => {
          const b = net.imgs[i.src]; if (!b) return;
          const lim = i.fp === "high" ? BUDGET.heroImg : BUDGET.img;
          if (b > lim) add("MEDIUM", "Speed: image weight", `${Math.round(b / 1024)} KB (budget ${Math.round(lim / 1024)} KB)`, `${path} ${i.sel}`, "AVIF/WebP, srcset, right size");
        });
      }
      await ctx.close();
    }
  }
  pagesChecked++;
}
await browser.close();

// ---- budgets (measured at 390px light) -------------------------------------------------------
const sum = (a) => (a || []).reduce((s, x) => s + x.gz, 0);
const perHtml = Math.max(0, ...(net.byType.html || []).map((x) => x.gz));
if (perHtml > BUDGET.html) add("MEDIUM", "Speed budget", `HTML ${(perHtml / 1024).toFixed(1)} KB gz (budget 35)`, "html", "move repeated data out, trim inline SVG");
if (sum(net.byType.css) > BUDGET.css) add("MEDIUM", "Speed budget", `CSS ${(sum(net.byType.css) / 1024).toFixed(1)} KB gz (budget 25)`, "css", "remove unused rules");
if (sum(net.byType.js) > BUDGET.js) add("MEDIUM", "Speed budget", `JS ${(sum(net.byType.js) / 1024).toFixed(1)} KB gz (budget 25)`, "js", "vanilla only; cut what the page does not need");
const fontBytes = net.fonts.reduce((s, f) => s + f.bytes, 0);
if (net.fonts.length > BUDGET.fontFiles || fontBytes > BUDGET.fontBytes)
  add("MEDIUM", "Speed budget", `${net.fonts.length} font files, ${Math.round(fontBytes / 1024)} KB on first load (budget 4 files, 150 KB)`, "fonts", "two families max, subset, woff2");
if (net.total390 > BUDGET.firstLoad) add("MEDIUM", "Speed budget", `first load ${(net.total390 / KB / KB).toFixed(2)} MB at 390px (budget 1 MB)`, "all", "lazy-load below the fold; smaller images");
net.external.forEach((o) => add("MEDIUM", "Runs offline", `runtime request to ${o}`, "network", "vendor it into site/ (demos run offline) or click-to-load"));

// ---- report ----------------------------------------------------------------------------------
const rows = [...findings.values()].sort((a, b) => rank(a.sev) - rank(b.sev));
const highs = rows.filter((r) => r.sev === "HIGH").length;
const verdict = highs ? "Block" : "Approve";
const esc = (s) => String(s).replace(/\|/g, "\\|");
const md = [
  `# Design check: ${base.href}`,
  "",
  `${new Date().toISOString().slice(0, 16).replace("T", " ")} · pages ${PAGES.join(", ")} · widths ${WIDTHS.join("/")} · light and dark · Chromium`,
  "",
  `**${verdict}**: ${highs} high, ${rows.filter((r) => r.sev === "MEDIUM").length} medium, ${rows.filter((r) => r.sev === "LOW").length} low.`,
  "",
  "| Severity | Rule | Finding | Where | Fix |",
  "|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.sev} | ${esc(r.rule)} | ${esc(r.what)} | ${esc([...r.where].slice(0, 6).join("; "))}${r.where.size > 6 ? ` (+${r.where.size - 6})` : ""} | ${esc(r.fix)} |`),
  "",
  "## Measured",
  "",
  `- HTML ${(perHtml / 1024).toFixed(1)} KB gz · CSS ${(sum(net.byType.css) / 1024).toFixed(1)} KB · JS ${(sum(net.byType.js) / 1024).toFixed(1)} KB · fonts ${net.fonts.length} files ${Math.round(fontBytes / 1024)} KB · first load ${(net.total390 / 1024).toFixed(0)} KB at 390px`,
  `- Colour transitions on load: ${loadFades.length ? loadFades.join("; ") : "none"} · CLS at 390 light ${net.cls === undefined ? "n/a" : net.cls.toFixed(3)} · LCP element ${net.lcp ? net.lcp.el + (net.lcp.fp ? " (fetchpriority " + net.lcp.fp + ")" : "") : "n/a"}`,
  `- Screenshots: shots/ (${PAGES.length * WIDTHS.length * THEMES.length})`,
  "",
  "## Not verified by this script (a person must)",
  "",
  "- Look at every screenshot: hierarchy, spacing rhythm, concentric corners, photo quality, copy.",
  "- Hover, focus-visible, press, error, empty and loading states on every control (keyboard: Tab through the page).",
  "- The theme glide on a choice, and reduced motion: frame-by-frame proof per theme-transition.md.",
  "- WebKit / Safari and a real phone (safe areas, the sticky bar, iOS zoom).",
  "- Core Web Vitals on the live site (PageSpeed Insights) once it is public.",
  "- Contrast of text over photos (axe cannot see the pixels under text).",
].join("\n");
writeFileSync(join(OUT, "report.md"), md + "\n");
writeFileSync(join(OUT, "report.json"), JSON.stringify({ verdict, findings: rows.map((r) => ({ ...r, where: [...r.where] })), net: { ...net, external: [...net.external] } }, null, 2));
console.log(md.split("\n## Measured")[0]);
console.log(`\nReport: ${join(OUT, "report.md")}`);
process.exit(highs ? 1 : 0);
