-- Standalone diagnostic runs: controlled, isolated experiments against the
-- bulk copyMessages/forwardMessages endpoints, decoupled from any task's
-- cursor/progress, to empirically measure Telegram's real bulk behavior.
CREATE TABLE diagnostic_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('copyMessages', 'forwardMessages')),
  source_chat_id TEXT NOT NULL,
  dest_chat_id TEXT NOT NULL,
  requested_start_id INTEGER NOT NULL,
  requested_end_id INTEGER NOT NULL,
  requested_count INTEGER NOT NULL,
  started_at_ms INTEGER NOT NULL,
  finished_at_ms INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  http_status INTEGER,
  ok INTEGER NOT NULL,
  result_count INTEGER,
  error_code INTEGER,
  error_description TEXT,
  retry_after INTEGER,
  raw_response_json TEXT,
  at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_diagnostic_runs_bot_id ON diagnostic_runs(bot_id, at DESC);
