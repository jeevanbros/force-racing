#!/usr/bin/env node
/* Front-end build: one minified stylesheet (core + caller dialer) and minified JS.
 *
 *   node tools/build-assets.mjs            # inline the CSS in the six main pages
 *   node tools/build-assets.mjs --link     # emit assets/build/site.min.css instead
 *
 * `npm run deploy` runs this first. Editing styles.css or app.js without running
 * the build leaves the deployed pages on the previous output.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { transform } from 'esbuild';

const MODE = process.argv.includes('--link') ? 'link' : 'inline';
const PAGES = ['index', 'cars', 'team', 'recruitment', 'support', 'contact'];
const OUT = 'site/assets/build';
const V = '2.5';

const TARGET = ['chrome100', 'safari15', 'firefox100'];
const minifyCss = async src => (await transform(src, { loader: 'css', minify: true, target: TARGET })).code;
const minifyJs = async src => (await transform(src, { loader: 'js', minify: true, target: TARGET })).code;

await mkdir(OUT, { recursive: true });

// ---- stylesheet: core sheet first, then the caller dialer module (same order as the old links)
const core = await readFile('site/styles.css', 'utf8');
const dialer = await readFile('site/modules/caller-dialer/caller-dialer.css', 'utf8');
const css = await minifyCss(`${core}\n${dialer}`);

if (MODE === 'link') {
  await writeFile(`${OUT}/site.min.css`, css);
  console.log(`css   ${OUT}/site.min.css  ${(css.length / 1024).toFixed(1)} KB`);
} else {
  console.log(`css   inline  ${(css.length / 1024).toFixed(1)} KB per page`);
}

// ---- scripts
const scripts = [
  ['site/app.js', 'app.min.js'],
  ['site/forms.js', 'forms.min.js'],
  ['site/modules/caller-dialer/caller-dialer.js', 'caller-dialer.min.js'],
];
const jsSizes = [];
for (const [from, to] of scripts) {
  const out = await minifyJs(await readFile(from, 'utf8'));
  await writeFile(`${OUT}/${to}`, out);
  jsSizes.push(`${to} ${(out.length / 1024).toFixed(1)} KB`);
}
console.log(`js    ${jsSizes.join('  ')}`);

// ---- rewrite the pages
const CSS_BLOCK = /<!--build:css-->[\s\S]*?<!--\/build:css-->/;
const CSS_LINKS = /<link rel="stylesheet" href="styles\.css(?:\?v=[\d.]+)?"><link rel="stylesheet" href="modules\/caller-dialer\/caller-dialer\.css">/;
const CSS_BUNDLE = /<link rel="stylesheet" href="assets\/build\/site\.min\.css(?:\?v=[\d.]+)?">/;

const cssTag = MODE === 'link'
  ? `<link rel="stylesheet" href="assets/build/site.min.css?v=${V}">`
  : `<!--build:css--><style>${css}</style><!--/build:css-->`;

const scriptMap = [
  [/src="(?:assets\/build\/)?app(?:\.min)?\.js(?:\?v=[\d.]+)?"/g, `src="assets/build/app.min.js?v=${V}"`],
  [/src="(?:assets\/build\/)?forms(?:\.min)?\.js(?:\?v=[\d.]+)?"/g, `src="assets/build/forms.min.js?v=${V}"`],
  [/src="modules\/caller-dialer\/caller-dialer\.js"/g, `src="assets/build/caller-dialer.min.js?v=${V}"`],
];

for (const page of PAGES) {
  const file = `site/${page}.html`;
  let html = await readFile(file, 'utf8');
  const before = html;

  if (CSS_BLOCK.test(html)) html = html.replace(CSS_BLOCK, cssTag);
  else if (CSS_LINKS.test(html)) html = html.replace(CSS_LINKS, cssTag);
  else if (CSS_BUNDLE.test(html)) html = html.replace(CSS_BUNDLE, cssTag);
  else throw new Error(`${file}: could not find the stylesheet links to replace`);

  for (const [re, to] of scriptMap) html = html.replace(re, to);

  if (html === before) {
    console.log(`${file}: already up to date`);
    continue;
  }
  await writeFile(file, html);
  console.log(`${file}: written (${(html.length / 1024).toFixed(0)} KB)`);
}
