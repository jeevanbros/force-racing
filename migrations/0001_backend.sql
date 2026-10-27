PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value TEXT NOT NULL CHECK (json_valid(value)),
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK (source IN ('website','google_form')),
  type TEXT NOT NULL CHECK (type IN ('contact','sponsor','donate','registration')),
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
CREATE INDEX IF NOT EXISTS submissions_created ON submissions(created_at DESC, id);
CREATE INDEX IF NOT EXISTS submissions_status_type ON submissions(status, type, created_at DESC);

CREATE TABLE IF NOT EXISTS recipients (
  chat_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','revoked')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_jobs (
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
CREATE INDEX IF NOT EXISTS notification_due ON notification_jobs(status, next_attempt_at, lease_until);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id_hash TEXT PRIMARY KEY,
  csrf_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON admin_sessions(expires_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_expiry ON rate_limits(expires_at);

CREATE TABLE IF NOT EXISTS telegram_updates (
  update_id INTEGER PRIMARY KEY,
  received_at INTEGER NOT NULL
);
