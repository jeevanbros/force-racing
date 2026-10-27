# Deployment — connecting the parts on another PC

Everything below is for the deploying agent on a new machine. Nothing here has been run against a real
Cloudflare account, Telegram bot or the live domain; complete these steps in order.

## 0. Prerequisites
- Node.js ≥ 22.13 and npm. Copy this whole folder. `npm ci` (installs only Wrangler).
- A Cloudflare account (free works) and a Telegram account.

## 1. Local verification (no accounts needed)
```sh
npm ci
npm run setup:local          # creates ignored .dev.vars with random local credentials
npm run db:migrate:local     # applies migrations/0001_backend.sql to local D1
npm test                     # unit tests
npm run test:local           # boots wrangler dev and smoke-tests the full flow
npm run dev                  # http://127.0.0.1:8787 (site + API + /admin)
```
Owner password for local `/admin` is in `.dev.vars`. Local mode mocks Telegram and skips
rate limits/Turnstile; never enable `LOCAL_DEV` in production.

## 2. Cloudflare resources (real account)
```sh
npx wrangler login
npx wrangler d1 create force-racing
# paste the returned database_id into wrangler.jsonc (replaces the all-zero placeholder)
npx wrangler d1 migrations apply DB --remote
```

## 3. Secrets (`npx wrangler secret put NAME` each)
- `ADMIN_PASSWORD` — strong, ≥16 chars, mixed classes.
- `SESSION_SECRET` — ≥32 random chars.
- `TELEGRAM_BOT_TOKEN` — from @BotFather (`/newbot`).
- `TELEGRAM_WEBHOOK_SECRET` — ≥32 random chars you invent.
- `GOOGLE_FORMS_SECRET` — ≥32 random chars; only needed for the optional bridge.
- `TURNSTILE_SECRET_KEY` — from a Cloudflare Turnstile widget whose hostname is your workers.dev host;
  also set the public site key as the `TURNSTILE_SITE_KEY` var in `wrangler.jsonc`.

## 4. Deploy and wire Telegram
```sh
npm run deploy               # publishes https://force-racing.<subdomain>.workers.dev
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://YOUR-WORKER.workers.dev/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```
Then in Telegram: each organizer opens the bot and sends `/start` (status stays **pending**).
The owner signs in at `/admin`, approves each recipient under “Alert recipients”, then enables
forms and the campaign under “Campaign & settings”. Approval grants alerts only — never admin access.

## 5. Optional Google Forms bridge
Follow `integrations/google-forms/README.md`: the form's editor installs `Code.gs` with the same
`GOOGLE_FORMS_SECRET`. Until then, the poster's Google Form still works but its notifications are
not integrated — the site copy already says so.

## 6. Go-live checklist
- `/api/public/config` shows `formsEnabled:true` and the campaign when enabled.
- A real test submission arrives in Telegram and appears in `/admin`.
- Campaign `expiresAt` set if the promotion must auto-hide after the event; submissions are preserved.
- Custom domain (`forceracing.in`) comes later via Cloudflare for SaaS/domains — not configured here.

## Rollback / restore
- Redeploy any earlier git state with `npm run deploy`; D1 schema is additive (one migration).
- Disable the campaign or all forms instantly from `/admin` without redeploying.
- D1 backups: `npx wrangler d1 export force-racing --remote --output backup.sql`.

## Honesty notes
- Donation interest is not payment; registration requests are not confirmed slots — the copy and
  receipts say this everywhere. Keep it that way when editing.
- `site/` is the only public asset directory. Never publish the repo root, `source/`, `docs/`,
  `briefs/`, `review/`, `tests/` or `.dev.vars`.
