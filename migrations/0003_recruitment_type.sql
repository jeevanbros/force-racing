-- 0003: allow the true 'recruitment' submission type.
--
-- 0001 constrained submissions.type to (contact, sponsor, donate, registration),
-- so worker/submissions.js relabelled recruitment rows as 'contact'. That made
-- the Telegram alert and the admin console report the wrong type. SQLite cannot
-- alter a CHECK constraint in place, so both dependent tables are rebuilt with
-- identical data. Existing FR26-REC-* rows are reclassified as recruitment.

PRAGMA defer_foreign_keys = true;

CREATE TABLE submissions_new (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK (source IN ('website','google_form')),
  type TEXT NOT NULL CHECK (type IN ('contact','sponsor','donate','registration','recruitment')),
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  answers_json TEXT CHECK (answers_json IS NULL OR json_valid(answers_json)),
  consent INTEGER NOT NULL DEFAULT 0 CHECK (consent IN (0,1)),
  external_id TEXT,
  idempotency_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','resolved','spam')),
  notes TEXT NOT NULL DEFAULT '',
  submitted_at TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (source, idempotency_key),
  UNIQUE (source, external_id)
);

INSERT INTO submissions_new (
  id, reference, source, type, name, email, phone, organization, message,
  answers_json, consent, external_id, idempotency_key, payload_hash,
  status, notes, submitted_at, created_at, updated_at
)
SELECT
  id, reference, source,
  CASE WHEN type = 'contact' AND reference LIKE 'FR26-REC-%' THEN 'recruitment' ELSE type END,
  name, email, phone, organization, message,
  answers_json, consent, external_id, idempotency_key, payload_hash,
  status, notes, submitted_at, created_at, updated_at
FROM submissions;

CREATE TABLE notification_jobs_new (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES recipients(chat_id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','retry','sent','dead','cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_part INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  lease_until INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  telegram_message_id TEXT,
  created_at INTEGER NOT NULL,
  sent_at INTEGER,
  UNIQUE (submission_id, recipient_id)
);

INSERT INTO notification_jobs_new (
  id, submission_id, recipient_id, status, attempts, next_part,
  next_attempt_at, lease_until, last_error, telegram_message_id, created_at, sent_at
)
SELECT
  id, submission_id, recipient_id, status, attempts, next_part,
  next_attempt_at, lease_until, last_error, telegram_message_id, created_at, sent_at
FROM notification_jobs;

DROP TABLE notification_jobs;
DROP TABLE submissions;

ALTER TABLE submissions_new RENAME TO submissions;
ALTER TABLE notification_jobs_new RENAME TO notification_jobs;

CREATE INDEX IF NOT EXISTS submissions_created ON submissions(created_at DESC, id);
CREATE INDEX IF NOT EXISTS submissions_status_type ON submissions(status, type, created_at DESC);
