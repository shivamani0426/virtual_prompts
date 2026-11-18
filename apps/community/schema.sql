CREATE TABLE IF NOT EXISTS community_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS community_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_rate ON community_events(session_id,action,created_at);
CREATE TABLE IF NOT EXISTS community_reports (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  city TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('garbage_burning','construction_dust','traffic_smoke','other')),
  description TEXT NOT NULL CHECK(length(description) BETWEEN 25 AND 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','deleted')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reports_city_review ON community_reports(city,status,created_at);
CREATE TABLE IF NOT EXISTS challenge_members (
  session_id TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY(session_id,challenge_id)
);
CREATE TABLE IF NOT EXISTS challenge_checkins (
  session_id TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  day TEXT NOT NULL,
  PRIMARY KEY(session_id,challenge_id,day)
);
CREATE TABLE IF NOT EXISTS alert_preferences (
  session_id TEXT PRIMARY KEY,
  city TEXT NOT NULL,
  threshold INTEGER NOT NULL CHECK(threshold BETWEEN 51 AND 400),
  enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
  updated_at TEXT NOT NULL
);
