-- Per-message log: one row per individual copy/forward attempt (live or
-- backfill), so throughput/failures can be diagnosed precisely instead of
-- inferred from aggregate batch counts.
CREATE TABLE task_message_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  message_id INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('live', 'backfill')),
  ok INTEGER NOT NULL,
  error TEXT,
  at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_task_message_log_task_id ON task_message_log(task_id, at DESC);
