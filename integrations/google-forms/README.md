# Existing poster → existing Google Form → team Telegram alerts

The poster's QR is preserved. This optional connector handles responses submitted through that existing form. Native website submissions already go directly to the Worker; do not send them through this script too.

Installation needs **editor access to the original Google Form**, not the domain login. It has not been installed or authorized in this project. Without it, Google Form responses remain in Google Forms and do not produce this website's alerts.

1. Deploy the Worker and configure its `GOOGLE_FORMS_SECRET` with a new random secret of at least 32 characters.
2. Open the original Google Form as its owner/editor, then its Apps Script editor. Use a **Form-bound** script, not a response-spreadsheet script.
3. Paste `Code.gs`. Under Project Settings → Script Properties, set `FORCE_WORKER_URL` to the HTTPS Worker origin (no trailing path), and `GOOGLE_FORMS_SECRET` to the matching secret. Never commit these values.
4. Run `installForceRacingTriggers` once and authorize the requested Google permissions. This installs form submission and five-minute retry triggers. Running it again replaces only this connector's two triggers.
5. With owner approval, submit one clearly labelled test response. Verify it in Google Forms, the website admin inbox, and the approved recipients' Telegram chats. No test response has been submitted by the build agents.
6. If migrating to a custom domain, the workers.dev origin can remain configured while active. If it is disabled, update `FORCE_WORKER_URL` and repeat the test; the signing secret need not change.

The connector sends labelled answers, respondent email if Google collects it, submission time, and response ID. It sends no authentication token belonging to the respondent. Files uploaded to Google Forms remain Google Drive references; the connector does not download them or make them public. Questions/answers are bounded; large responses stay in Google Forms and produce a retry error requiring operator review.

Requests are signed with HMAC-SHA256 over `timestamp + '.' + raw JSON body`. Headers: `X-Force-Timestamp` (Unix seconds), `X-Force-Signature` (hex). The Worker rejects stale signatures and deduplicates response IDs. The retry queue stores response IDs and attempt metadata in Script Properties, not copied personal answers. Script failures appear in Apps Script Executions; monitor the trigger owner's failure notifications. `queueLatestResponseForRecovery` deliberately replays only the latest response; use it only for an intended recovery/test. Accepted response IDs are deduplicated by the Worker.

This connector cannot bypass Google sign-in, open a closed form, change payment rules, or grant form ownership. Those remain Google Form owner settings.
