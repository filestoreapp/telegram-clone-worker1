-- Bots: one row per configured Telegram bot. Token lives here only —
-- API handlers must select columns explicitly and never return it.
CREATE TABLE bots (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  bot_id INTEGER NOT NULL,
  bot_username TEXT NOT NULL,
  label TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Tasks: unifies live forwarding and historical backfill for one
-- bot + source chat + destination chat pairing.
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  source_chat_id TEXT NOT NULL,
  source_chat_title TEXT,
  dest_chat_id TEXT NOT NULL,
  dest_chat_title TEXT,
  method TEXT NOT NULL CHECK (method IN ('copy', 'forward')),
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

-- Per-event activity log: live forwards and backfill batch outcomes,
-- bounded/pruned per task.
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

-- Bounded raw webhook log, for debugging/inspection only.
CREATE TABLE updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  update_id INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  received_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_updates_bot_id ON updates(bot_id, received_at DESC);
