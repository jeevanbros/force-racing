#!/usr/bin/env node
/* Portability check for the deployable surface (site/ + worker + admin + config).
   Static scan only: prints failures, never deletes. Run: node tools/check-portability.mjs */
import { readdir, readFile, access } from 'node:fs/promises';
import { join, relative, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCAN_DIRS = ['site', 'worker', 'admin', 'migrations', 'integrations', 'tests', 'tools'];
const SCAN_FILES = ['package.json', 'wrangler.jsonc', '.dev.vars.example', 'start.command', 'stop.command', 'start-on-phone.command'];
const TEXT_EXT = new Set(['.html', '.css', '.js', '.mjs', '.cjs', '.json', '.jsonc', '.md', '.sql', '.py', '.command', '.gs', '']);
const SECRET_NAMES = /^(\.env|\.dev\.vars$|.*\.(pem|key|p12)$|.*credentials.*|.*secret.*)/i;

const failures = [];
const fail = (file, message) => failures.push(`${relative(ROOT, file)}: ${message}`);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) yield* walk(path); }
    else yield path;
  }
}

// 1. No absolute developer-machine paths or credential filenames in scanned files.
const files = [];
for (const dir of SCAN_DIRS) for await (const f of walk(join(ROOT, dir))) files.push(f);
files.push(...SCAN_FILES.map(f => join(ROOT, f)));
for (const file of files) {
  const name = basename(file);
  if (SECRET_NAMES.test(name) && name !== '.dev.vars.example') fail(file, 'credential-like filename inside a scanned/deployable path');
  if (!TEXT_EXT.has(extname(file))) continue;
  const text = await readFile(file, 'utf8').catch(() => null);
  if (text === null) continue;
  const hits = text.match(/\/Users\/[A-Za-z0-9._-]+/g);
  if (hits) fail(file, `absolute machine path(s): ${[...new Set(hits)].join(', ')}`);
}

// 2. site/ must only contain public web assets (no source archives, SQL, docs, secrets).
for await (const file of walk(join(ROOT, 'site'))) {
  if (/\.(sql|sqlite|env|toml|log|pid)$/i.test(file)) fail(file, 'non-public file inside site/');
}

// 3. Every local asset referenced by site HTML/CSS/JS must exist.
const refRe = /(?:src|href|srcset)="(assets\/[^"?'\s]+)"/g;
const srcsetRe = /(?:srcset)="([^"]+)"/g;
const seen = new Set();
for await (const file of walk(join(ROOT, 'site'))) {
  if (!/\.(html|css|js)$/.test(file)) continue;
  const text = await readFile(file, 'utf8');
  const refs = new Set();
  for (const m of text.matchAll(refRe)) refs.add(m[1]);
  for (const m of text.matchAll(srcsetRe)) for (const part of m[1].split(',')) {
    const url = part.trim().split(/\s+/)[0];
    if (url.startsWith('assets/')) refs.add(url);
  }
  for (const ref of refs) {
    if (seen.has(ref)) continue;
    seen.add(ref);
    await access(join(ROOT, 'site', ref)).catch(() => fail(join(ROOT, 'site', file.split('/').pop()), `missing local asset: ${ref}`));
  }
}

if (failures.length) {
  console.log('Portability check FAILED:\n' + failures.map(f => '  - ' + f).join('\n'));
  process.exit(1);
}
console.log(`Portability check passed (${files.length} files scanned, ${seen.size} asset references verified).`);
