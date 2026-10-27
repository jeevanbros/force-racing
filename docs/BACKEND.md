# Backend — implemented API and module boundaries

Cloudflare Worker (ES modules, no runtime dependencies) + D1. Entry: `worker/index.js`.
Static site is served through the ASSETS binding (`wrangler.jsonc`, `run_worker_first: true`).

## Modules and their interfaces
| Part | Files | Boundary / how to connect |
|---|---|---|
| Public site | `site/` | Static assets; `site/forms.js` calls `GET /api/public/config` and `POST /api/submissions` on the same origin. No secrets client-side. |
| Campaign module | `site/campaign-config.js`, `site/app.js` (`window.ForceCampaign`), `site/design/build.py` | Static fallback config + live override from `/api/public/config`. Owner toggles/expiry via admin settings; `campaignState()` in `worker/settings.js` decides `disabled`/`expired`/`active`. Inactive campaigns publish no copy/artwork and reject registrations. |
| Submissions | `worker/submissions.js`, table `submissions` | `POST /api/submissions` `{type,name,email,phone,organization,message,consent:true,website:'',turnstileToken?,idempotencyKey}`. Validated, honeypot + IP rate limit (local dev bypassed), Turnstile when not local, stored before success, idempotent on `(source,idempotency_key)`; `201 {ok,reference:'FR-…'}` or `4xx/503 {ok:false,error}`. |
| Admin panel | `admin/pages.js`, `admin/styles.js`, `admin/client.js`, `worker/admin.js`, `worker/auth.js` | Served at `/admin` by the Worker (never inside `site/`). Password login (`ADMIN_PASSWORD` + `SESSION_SECRET`), DB-backed signed session cookie (8 h), CSRF token per session, owner only. |
| Telegram alerts | `worker/telegram.js`, tables `recipients`, `notification_jobs`, `telegram_updates` | Webhook `POST /api/telegram/webhook` with `X-Telegram-Bot-Api-Secret-Token`. `/start` → pending; owner approves in admin; `/stop` → revoked (cannot self-restore). Durable per-submission/per-recipient outbox: immediate `ctx.waitUntil` attempt, cron (`scheduled`) retries with backoff and 429 `retry_after`. Failed delivery never loses the submission. |
| Google Forms bridge | `integrations/google-forms/`, `worker/submissions.js` `googleForm()` | `POST /api/integrations/google-forms` with `X-Force-Timestamp` (Unix s, 10-min window) and `X-Force-Signature` (hex HMAC-SHA256 of `timestamp.body`, secret `GOOGLE_FORMS_SECRET`). Response-ID deduplication. Optional; install per `integrations/google-forms/README.md`. |
| Settings | `worker/settings.js`, table `settings` | Typed, allow-listed; campaign/contact/privacy only. Secrets never enter settings or the UI. |

## Service readiness (fail closed)
`readiness()` in `worker/settings.js` gates `formsEnabled` in `/api/public/config` on: session secret,
Telegram configured (or local mock), ≥1 approved recipient, and Turnstile keys outside local dev.
If any check fails the public forms stay off and submissions return 503.

## Environment
- Vars (`wrangler.jsonc`): `LOCAL_DEV=false`, `TELEGRAM_MOCK=false`, `TURNSTILE_SITE_KEY`.
- Secrets (`wrangler secret put`): `ADMIN_PASSWORD`, `SESSION_SECRET`, `TELEGRAM_BOT_TOKEN`,
  `TELEGRAM_WEBHOOK_SECRET`, `GOOGLE_FORMS_SECRET`, `TURNSTILE_SECRET_KEY`.
- Local: `npm run setup:local` writes ignored `.dev.vars` (`LOCAL_DEV=true`, `TELEGRAM_MOCK=true`,
  random credentials). Optional `TELEGRAM_MOCK_FAIL=true` simulates a failing Telegram API to verify retries.

## Tests
- `npm test` — unit tests for validation, settings, campaign state, notification text (`tests/backend-validation.test.js`, fake-D1 helper in `tests/helpers.mjs`).
- `npm run test:local` — boots `wrangler dev` on 127.0.0.1:8787 against local D1 and walks the full
  visitor → stored receipt → admin flow with mocked Telegram (`tests/backend-local.mjs`): auth, CSRF,
  webhook secret, pending/approve/revoke, idempotency, honeypot, campaign off, signed bridge, logout.

## Known limits
- Rate limiting is skipped under `LOCAL_DEV=true` (production stays limited at 5 submissions / 10 min / IP).
- Notification jobs are created for recipients approved at submit time; later approval does not resend history.
- `npm run deploy` exists but has NOT been run; no cloud resources exist yet.
