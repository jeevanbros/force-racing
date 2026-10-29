-- Migration 0002: Pass Checker Auth and Visitor Telemetry Analytics

CREATE TABLE IF NOT EXISTS checker_accounts (
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
CREATE INDEX IF NOT EXISTS idx_checker_email ON checker_accounts(email);
CREATE INDEX IF NOT EXISTS idx_checker_status ON checker_accounts(status);

CREATE TABLE IF NOT EXISTS checker_auth_logs (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('login','logout','failed_login')),
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  timestamp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_checker_logs ON checker_auth_logs(email, timestamp DESC);

CREATE TABLE IF NOT EXISTS site_analytics (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL DEFAULT '',
  path TEXT NOT NULL DEFAULT '/',
  country TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  max_scroll_percent INTEGER NOT NULL DEFAULT 0,
  timestamp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analytics_time ON site_analytics(timestamp DESC);
