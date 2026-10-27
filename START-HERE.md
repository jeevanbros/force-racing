# Force Racing — start here

This is the complete, isolated project folder. Copy **this entire folder** to the other PC. No dependency on the old domain login is required to prepare or deploy the website on Cloudflare workers.dev.

**Next agent: read [HANDOFF.md](HANDOFF.md) first.** It records the latest checkpoint and remaining work. Never infer deployment or Telegram delivery from a working local preview.

## Contents
- `site/` — public website and optimized local artwork.
- `source/` — original website mirror, unmodified source bodies, crawl manifest, supplied campaign poster and generated original PNG artwork.
- `worker/`, `migrations/`, `admin/` — Cloudflare backend, D1 data model and private management interface (being implemented).
- `integrations/google-forms/` — signed connector for the existing poster's Google Form; requires installation by its owner.
- `docs/` — facts, source inventory, design/asset notes and backend instructions.
- `review/`, `tests/` — verification scripts, reports and screenshots.
- `tools/` — local preview controls and supporting tools.
- `briefs/` — implementation briefs retained so another agent understands scope and ownership.

## Local visual preview on this Mac
Double-click `start.command`. The website runs at http://127.0.0.1:8769/ and the presentation frame at http://127.0.0.1:8769/__present.html.

`start-on-phone.command` enables a same-Wi-Fi preview; `stop.command` stops that preview. The visual preview has no backend and must never claim to receive forms. The Cloudflare development server will provide the full backend on port 8787; follow HANDOFF and backend instructions once ready.

Only `site/` is a public asset directory. Never publish this folder's root or its source archive, handoff, tests, database, credentials or private documentation. No cloud deployment has been made in this session.
