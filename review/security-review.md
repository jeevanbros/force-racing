# Security review — 27 October 2026 (root, code-level)

Reviewed `worker/`, `admin/`, `migrations/`, `site/forms.js` against the backend brief.
Verified by `npm test` (14 unit tests) and `npm run test:local` (29/29 smoke checks against local D1).

## Verified properties
- Admin auth: password ≥16 chars + ≥3 character classes enforced by `authReady()`; constant-time digest
  comparison; sessions are DB rows with signed, expiring, HttpOnly, SameSite=Strict cookies
  (`__Host-` prefixed + Secure outside local dev); logout deletes the server session; login is rate-limited
  (5/15 min/IP) and mutations need a per-session CSRF token plus same-origin check. Smoke-verified: 401
  anonymous, 401 wrong password, 403 missing CSRF, 401 after logout.
- Recipient lifecycle: `/start` only ever creates `pending`; webhook cannot set `approved`; `/stop` revokes
  and a later `/start` cannot self-restore (`status=CASE … WHEN 'revoked' THEN 'revoked'`). Approval never
  grants admin — recipients and admin sessions are separate tables with no shared credential. Smoke-verified.
- Submissions: stored before success; idempotent on `(source, idempotency_key)` with payload-hash conflict
  → 409; honeypot and consent enforced; field length/type caps; JSON-only, 16 KB body cap; rate-limited in
  production. Smoke-verified (201 / 409 / 400 paths).
- Campaign off or expired: `POST /api/submissions` rejects registrations with 400 and `/api/public/config`
  publishes no campaign copy/artwork; other enquiry types stay open. Smoke-verified.
- Telegram durability: per-submission/per-recipient outbox rows are inserted in the same D1 batch as the
  submission; failures set `retry`/`dead` with backoff and 429 `retry_after`, never delete data; cron
  `scheduled()` retries; owner can requeue from `/admin`. Mock-failure path available via
  `TELEGRAM_MOCK_FAIL=true`. Upstream error text is never persisted (token-leak guard).
- Webhook: secret-token header enforced with constant-time compare; `update_id` deduplication makes Telegram
  retries safe; only private chats; bot messages ignored. Smoke-verified 401 without secret.
- Google bridge: HMAC-SHA256 over `timestamp.body`, 10-minute window, response-ID dedupe, bounded payload.
  Smoke-verified 401 bad signature, 201 + dedupe.
- Headers: CSP, nosniff, frame-deny, referrer and permissions policy on every response; `no-store` on
  `/api/*` and `/admin`; admin pages `noindex`. Errors never echo request data, secrets or upstream text.
- Public rendering uses `textContent` only (admin client and site JS); no secrets in `site/` or config.
- Rate limiting and Turnstile are bypassed only under `LOCAL_DEV=true` on loopback; production fails closed
  (503) when `SESSION_SECRET`/Turnstile keys are missing.

## Residual items (accepted / for the deploying agent)
- Rate limits are IP-window based and skip local dev by design; production behavior not yet observed on a
  real account.
- Turnstile, real Telegram delivery and real Google triggers are untestable without accounts — explicitly
  unverified; see HANDOFF.md “Not verified”.
- Dev-time review artifacts moved out of `site/` (`review/site-design/`); only `site/` is deployable.
