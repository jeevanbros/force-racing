-- Fresh Database Reset and Schema Initialization

DROP TABLE IF EXISTS checker_auth_logs;
DROP TABLE IF EXISTS checker_accounts;
DROP TABLE IF EXISTS site_analytics;
DROP TABLE IF EXISTS notification_jobs;
DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS recipients;
DROP TABLE IF EXISTS admin_sessions;
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS telegram_updates;
DROP TABLE IF EXISTS settings;

PRAGMA foreign_keys = ON;

CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value TEXT NOT NULL CHECK (json_valid(value)),
  updated_at INTEGER NOT NULL
);

CREATE TABLE submissions (
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
CREATE INDEX submissions_created ON submissions(created_at DESC, id);
CREATE INDEX submissions_status_type ON submissions(status, type, created_at DESC);

CREATE TABLE recipients (
  chat_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','revoked')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE notification_jobs (
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
CREATE INDEX notification_due ON notification_jobs(status, next_attempt_at, lease_until);

CREATE TABLE admin_sessions (
  id_hash TEXT PRIMARY KEY,
  csrf_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX sessions_expiry ON admin_sessions(expires_at);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX rate_expiry ON rate_limits(expires_at);

CREATE TABLE telegram_updates (
  update_id INTEGER PRIMARY KEY,
  received_at INTEGER NOT NULL
);

-- Checker Access Accounts (Strict Auth for Pass Verification)
CREATE TABLE checker_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  password TEXT NOT NULL DEFAULT '',
  token TEXT NOT NULL UNIQUE,
  approved_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_checker_email ON checker_accounts(email);
CREATE INDEX idx_checker_status ON checker_accounts(status);

-- Checker Login & Logout Activity Logs (With IPs and Timestamps)
CREATE TABLE checker_auth_logs (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('login','logout','failed_login')),
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  timestamp INTEGER NOT NULL
);
CREATE INDEX idx_checker_logs ON checker_auth_logs(email, timestamp DESC);

-- Real-Time Site Analytics (IPs, Visit Durations, Scroll Tracking)
CREATE TABLE site_analytics (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL DEFAULT '',
  path TEXT NOT NULL DEFAULT '/',
  country TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  max_scroll_percent INTEGER NOT NULL DEFAULT 0,
  timestamp INTEGER NOT NULL
);
CREATE INDEX idx_analytics_time ON site_analytics(timestamp DESC);

-- Initial Approved Recipient (Jeevan kumar)
INSERT INTO recipients (chat_id, user_id, username, display_name, status, created_at, updated_at)
VALUES ('6421850922', '6421850922', 'jeevankumar', 'Jeevan kumar', 'approved', strftime('%s','now'), strftime('%s','now'));

-- Initial Settings
INSERT INTO settings (id, value, updated_at)
VALUES (1, '{"formsEnabled":true,"gmailEnabled":true,"campaign":{"enabled":true,"title":"F1 SIM RACING","programme":"SUMSHODHINI ’26","date":"2026-10-31","venue":"Central Workshop","fee":"₹99 per student","registrationUrl":"https://force-racing.force-racing-revival.workers.dev/campaign.html#register"},"contact":{"email":"team.force.racing.kitsw@gmail.com","phone":"+91 80083 91525"}}', strftime('%s','now'));
