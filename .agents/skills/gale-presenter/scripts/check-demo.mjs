#!/usr/bin/env node
// gale-presenter check-demo: prove a client's demo works the way Krishna will use it in a room.
//
//   node check-demo.mjs <client-dir> [--out <dir>] [--keep]
//
// Runs the client's own start.command (twice: a repeat start must be clean), checks what is and
// is not served, drives /__present.html in Chromium (theme keys, the glide, no fade on load, the
// phone frame, corners, hide/show), then runs stop.command and checks the port is free.
// --keep leaves the demo running afterwards. Exit 1 = Block.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../..");
function loadPlaywright() {
  for (const t of [() => createRequire(import.meta.url)("playwright"),
                   () => createRequire(join(ROOT, "company/website/package.json"))("playwright")]) { try { return t(); } catch {} }
  console.error("Playwright not found. Install it once: npm i -g playwright && npx playwright install chromium"); process.exit(2);
}

const args = process.argv.slice(2);
if (!args[0]) { console.error("usage: node check-demo.mjs <client-dir> [--out dir] [--keep]"); process.exit(2); }
const DIR = resolve(args[0]);
const OUT = resolve(args.includes("--out") ? args[args.indexOf("--out") + 1] : join(DIR, "review/check-demo"));
const KEEP = args.includes("--keep");
mkdirSync(OUT, { recursive: true });
// check output is evidence, not source: it ignores itself so it never lands in a client commit
writeFileSync(join(OUT, ".gitignore"), "*\n");

const conf = readFileSync(join(DIR, "tools/demo.conf"), "utf8");
const PORT = +(conf.match(/^PORT=(\d+)/m) || [])[1];
const NAME = (conf.match(/^NAME="?([^"\n]*)/m) || [])[1] || basename(DIR);
const BASE = `http://127.0.0.1:${PORT}`;

const rows = [], passed = [];
const fail = (sev, rule, what, fix) => rows.push({ sev, rule, what, fix });
const ok = (what) => passed.push(what);
// a do-nothing `open` first on PATH: older launchers open a browser tab on start, which a check must not do
const SHIM = join(OUT, ".bin");
mkdirSync(SHIM, { recursive: true });
writeFileSync(join(SHIM, "open"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
writeFileSync(join(SHIM, "clear"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
const sh = (file) => execFileSync("bash", [join(DIR, file)], { cwd: DIR, env: { ...process.env, PATH: SHIM + ":" + process.env.PATH, GALE_NO_OPEN: "1", TERM: "dumb" }, stdio: "pipe", timeout: 30000 }).toString();
const status = async (path) => { try { return (await fetch(BASE + path, { redirect: "manual" })).status; } catch { return 0; } };
const listeners = () => { try { return execFileSync("lsof", ["-nP", `-iTCP:${PORT}`, "-sTCP:LISTEN", "-t"]).toString().trim().split("\n").filter(Boolean).length; } catch { return 0; } };

// ---- launchers -------------------------------------------------------------------------------
for (const f of ["start.command", "stop.command", "start-on-phone.command", "tools/serve.py", "tools/present.html"])
  existsSync(join(DIR, f)) ? ok(`${f} present`) : fail("HIGH", "Standard launchers", `${f} missing`, "run gale-presenter scripts/install-demo-kit.sh");
if (!/GALE_NO_OPEN/.test(readFileSync(join(DIR, "start.command"), "utf8")))
  fail("LOW", "Launcher version", "start.command predates the current kit", "re-run install-demo-kit.sh to refresh the launchers");

try { sh("start.command"); } catch (e) { fail("HIGH", "Start", "start.command failed: " + String(e.message).split("\n")[0], "run it by hand and read the error"); }
(await status("/")) === 200 ? ok("start: / answers 200") : fail("HIGH", "Start", `/ answers ${await status("/")}`, "check tools/serve.py and site/");
try { sh("start.command"); } catch {}
listeners() === 1 && (await status("/")) === 200 ? ok("repeat start: one server, still 200") : fail("HIGH", "Repeat start", `${listeners()} listeners after a second start`, "start.command must kill its previous server");
(await status("/__present.html")) === 200 ? ok("/__present.html answers 200") : fail("HIGH", "Presenter", "/__present.html not served", "serve.py --present tools/present.html");

// what must never be served
for (const p of ["/CLIENT.md", "/tools/demo.conf", "/tools/present.html", "/../CLIENT.md", "/%2e%2e/CLIENT.md", "/pitch/self-PRIVATE.html", "/brief/", "/.git/config"]) {
  const s = await status(p);
  s === 404 || s === 403 || s === 400 ? ok(`private ${p} → ${s}`) : fail("HIGH", "Private stays private", `${p} answers ${s}`, "serve only site/ and the declared mounts");
}

// ---- the presenter in a browser --------------------------------------------------------------
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__fades = []; });
  return { ctx, page };
}
const site = (page) => page.frames().find((f) => f !== page.mainFrame());
const bgOf = (f) => f.evaluate(() => getComputedStyle(document.body).backgroundColor);

// 1. Light / Dark / Auto and the glide
let { ctx, page } = await open({ colorScheme: "light" });
await page.goto(BASE + "/__present.html", { waitUntil: "networkidle" });
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: "networkidle" });
const themed = await page.evaluate(() => { const b = document.querySelector('[data-theme="dark"]'); return !!b && !b.closest("[hidden]") && b.offsetParent !== null; });
const current = await page.evaluate(() => !!document.querySelector('[aria-keyshortcuts="A"]') && !!document.getElementById("themeSeg"));
current ? ok("presenter is the current kit design") : fail("MEDIUM", "Presenter version", "tools/present.html predates the kit (no A key / key feedback / corner awareness)", "replace it with the kit's present.html, keeping the client's colours and title");
ok(themed ? "site has a dark mode: theme buttons shown" : "site has no dark mode: theme buttons hidden (correct)");
await page.screenshot({ path: join(OUT, "desktop-light.png") });
if (themed) {
  const f = site(page);
  const before = await bgOf(f);
  // sample the site's ground every frame while D is pressed
  const sampling = f.evaluate(() => new Promise((res) => {
    const seen = []; const t0 = performance.now();
    (function tick() { seen.push(getComputedStyle(document.body).backgroundColor); performance.now() - t0 < 1300 ? requestAnimationFrame(tick) : res(seen); })();
  }));
  await page.keyboard.press("d");
  const keyFeedback = await page.evaluate(() => !!document.querySelector(".is-key"));
  const frames = await sampling;
  const distinct = new Set(frames).size;
  const after = await bgOf(f);
  const dataTheme = await f.evaluate(() => document.documentElement.getAttribute("data-theme"));
  after !== before ? ok(`D turns the site dark: ${before} → ${after}${dataTheme ? " (data-theme=" + dataTheme + ")" : ""}`)
    : fail("HIGH", "Theme keys", "D did not change the site's ground", "the site needs prefers-color-scheme or [data-theme] rules");
  distinct >= 6 ? ok(`the change glides: ${distinct} distinct grounds over ~1.3 s`)
    : fail("MEDIUM", "Theme glide", `only ${distinct} distinct ground colour(s): the change snaps`, "register colour tokens with @property and list them in .theme-animating (theme-transition.md)");
  keyFeedback ? ok("key press shows on its button") : fail("LOW", "Key feedback", "no .is-key on the pressed button", "refresh tools/present.html from the kit");
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, "desktop-dark.png") });

  // 2. a remembered Dark must not fade in on load
  await page.addInitScript(() => {
    // watch every frame this page makes, from its first style
    if (window === window.top) return;   // the presenter's own buttons may ease; only the site counts
    document.addEventListener("transitionrun", (e) => { (window.top.__fades = window.top.__fades || []).push(e.propertyName + " " + (e.target.tagName || "")); }, true);
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const loadFades = await page.evaluate(() => (window.__fades || []).filter((x) => /color|background|border|fill|stroke|shadow|^--/.test(x)));
  loadFades.length === 0 ? ok("reload with Dark remembered: no colour fades on load")
    : fail("HIGH", "No fade on load", `${loadFades.length} colour transition(s) on load: ${[...new Set(loadFades)].slice(0, 4).join(", ")}`, "theme-instant on every non-chosen change (theme-transition.md)");
}
await ctx.close();

// 3. reduced motion: a choice is one step
if (themed) {
  ({ ctx, page } = await open({ colorScheme: "light", reducedMotion: "reduce" }));
  await page.goto(BASE + "/__present.html", { waitUntil: "networkidle" });
  await page.evaluate(() => { try { localStorage.setItem("present-theme", "light"); } catch (e) {} });
  await page.reload({ waitUntil: "networkidle" });
  const f = site(page);
  const sampling = f.evaluate(() => new Promise((res) => { const seen = []; const t0 = performance.now();
    (function tick() { seen.push(getComputedStyle(document.body).backgroundColor); performance.now() - t0 < 900 ? requestAnimationFrame(tick) : res(seen); })(); }));
  await page.keyboard.press("d");
  const n = new Set(await sampling).size;
  n <= 2 ? ok("reduced motion: the theme changes in one step") : fail("MEDIUM", "Reduced motion", `${n} grounds under reduced motion (should be 1 step)`, "the presenter and the site must honour prefers-reduced-motion");
  await ctx.close();
}

// 4. phone frame, corners, hide/show
({ ctx, page } = await open({ colorScheme: "dark" }));
await page.goto(BASE + "/__present.html", { waitUntil: "networkidle" });
await page.keyboard.press("p");
await page.waitForTimeout(900);
const ph = await page.evaluate(() => {
  const d = (document.querySelector(".device") || document.body).getBoundingClientRect();
  const f = document.querySelector("iframe"), doc = f && f.contentDocument;
  return { phone: document.body.classList.contains("phone"), w: Math.round(d.width), clip: f ? getComputedStyle(f).clipPath : "",
    ground: getComputedStyle(document.documentElement).getPropertyValue("--frame-ground").trim(),
    cuts: doc && doc.documentElement.getAttribute("data-corner-cuts"),
    overflow: doc ? doc.documentElement.scrollWidth - doc.documentElement.clientWidth : 0 };
});
ph.phone && ph.w >= 360 && ph.w <= 440 ? ok(`P opens the phone frame (${ph.w}px)`) : fail("HIGH", "Phone frame", `phone=${ph.phone}, width ${ph.w}px`, "refresh tools/present.html from the kit");
/inset/.test(ph.clip) ? ok("screen corners clipped (clip-path)") : fail("LOW", "Phone corners", "iframe not clipped with clip-path: square corners may peek", "refresh tools/present.html from the kit");
ph.ground ? ok(`frame ground follows the site (${ph.ground})`) : fail("LOW", "Frame ground", "no --frame-ground: the frame may flash white while resizing", "refresh tools/present.html from the kit");
ph.cuts !== null ? ok(`corner awareness ran (${ph.cuts} bar control(s) cleared)`) : fail("LOW", "Corner awareness", "no corner check ran in phone mode", "refresh tools/present.html from the kit");
ph.overflow > 1 ? fail("HIGH", "Phone width", `site is ${ph.overflow}px wider than the phone screen`, "fix the wide element (gale-design check-site at 390)") : ok("no sideways scroll inside the phone");
await page.screenshot({ path: join(OUT, "phone-dark.png") });
await page.keyboard.press("h");
const hidden = await page.evaluate(() => { const b = document.getElementById("bar"); return !!b && b.classList.contains("is-hidden"); });
await page.keyboard.press("h");
const shown = await page.evaluate(() => { const b = document.getElementById("bar"); return !!b && !b.classList.contains("is-hidden"); });
hidden && shown ? ok("H hides and shows the bar") : fail("MEDIUM", "Hide controls", `H: hidden=${hidden}, shown again=${shown}`, "refresh tools/present.html from the kit");
await ctx.close();
await browser.close();

// ---- stop ------------------------------------------------------------------------------------
if (!KEEP) {
  try { sh("stop.command"); } catch {}
  listeners() === 0 ? ok("stop.command frees the port") : fail("HIGH", "Stop", `${listeners()} listener(s) left on ${PORT}`, "stop.command must kill serve.py");
}

const highs = rows.filter((r) => r.sev === "HIGH").length;
const verdict = highs ? "Block" : "Approve";
const md = [`# Demo check: ${NAME} (port ${PORT})`, "", `${new Date().toISOString().slice(0, 16).replace("T", " ")} · Chromium`, "",
  `**${verdict}**: ${highs} high, ${rows.length - highs} other.`, "",
  ...(rows.length ? ["| Severity | Rule | Finding | Fix |", "|---|---|---|---|", ...rows.map((r) => `| ${r.sev} | ${r.rule} | ${r.what} | ${r.fix} |`), ""] : []),
  "## Passed", "", ...passed.map((p) => "- " + p), "",
  "## Not verified by this script", "",
  "- The phone over Wi-Fi (start-on-phone.command): open the printed address on a real phone on a trusted network.",
  "- WebKit / Safari: the glide and the no-fade-on-load rule are browser-sensitive; check once in Safari.",
  "- Look at the three screenshots: does the demo look its best at first glance?",
  `- ${KEEP ? "The demo was left running (--keep)." : "The demo was stopped at the end; start it again for the meeting."}`].join("\n");
writeFileSync(join(OUT, "report.md"), md + "\n");
console.log(md);
process.exit(highs ? 1 : 0);
