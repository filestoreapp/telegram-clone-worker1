-- Forward is dropped: it's mechanically identical in speed to copy (both
-- go through the same per-message loop) and copy is strictly better since
-- it never shows source attribution. Only copy remains, so the `method`
-- column is no longer needed. tasks/task_activity_log/task_message_log are
-- all empty at this point (confirmed before writing this migration), so a
-- straight drop-and-recreate is safe — no data migration required.
DROP TABLE IF EXISTS task_message_log;
DROP TABLE IF EXISTS task_activity_log;
DROP TABLE IF EXISTS tasks;

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  source_chat_id TEXT NOT NULL,
  source_chat_title TEXT,
  dest_chat_id TEXT NOT NULL,
  dest_chat_title TEXT,
  scope TEXT NOT NULL CHECK (scope IN ('live', 'live_and_backfill', 'backfill_only')),
  live_enabled INTEGER NOT NULL DEFAULT 0,
  backfill_mode TEXT CHECK (backfill_mode IN ('range', 'lastN')),
  start_id INTEGER,
  end_id INTEGER,
  cursor INTEGER,
  total INTEGER,
  processed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  backfill_status TEXT NOT NULL DEFAULT 'not_applicable'
    CHECK (backfill_status IN ('not_applicable', 'pending', 'running', 'paused', 'complete', 'cancelled', 'failed')),
  pacing_batch_size INTEGER NOT NULL DEFAULT 20,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_tasks_bot_id ON tasks(bot_id);
CREATE INDEX idx_tasks_source_chat ON tasks(bot_id, source_chat_id);
CREATE INDEX idx_tasks_backfill_running ON tasks(backfill_status) WHERE backfill_status = 'running';

CREATE TABLE task_activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('live_forward', 'backfill_batch')),
  detail TEXT,
  ok INTEGER NOT NULL,
  error TEXT,
  at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_task_activity_log_task_id ON task_activity_log(task_id, at DESC);

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
