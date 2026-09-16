-- Saved task templates: a durable snapshot taken at "Save & Start" time,
-- fully decoupled from bots/tasks so it survives deletion of either.
-- No FK to bots at all (by design — the token is a standalone snapshot,
-- not a live reference). task_id is an optional, non-cascading pointer
-- back to the task that was created alongside this template, purely so a
-- "Saved Tasks" list can show whether that live task still exists;
-- ON DELETE SET NULL (not CASCADE) because deleting the task must never
-- delete the template.
CREATE TABLE saved_tasks (
  id TEXT PRIMARY KEY,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  bot_token TEXT NOT NULL,
  bot_label TEXT NOT NULL,
  bot_username TEXT NOT NULL,
  source_chat_id TEXT NOT NULL,
  source_chat_title TEXT,
  dest_chat_id TEXT NOT NULL,
  dest_chat_title TEXT,
  scope TEXT NOT NULL CHECK (scope IN ('live', 'live_and_backfill', 'backfill_only')),
  backfill_mode TEXT CHECK (backfill_mode IN ('range', 'lastN')),
  start_id INTEGER,
  end_id INTEGER,
  n INTEGER,
  pacing_batch_size INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_saved_tasks_task_id ON saved_tasks(task_id);
