-- Pending messages queue: buffers live messages arriving during rate-limit
-- cooldowns so they are never dropped and get drained by the scheduled cron worker.
CREATE TABLE task_pending_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  message_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_pending_messages_task_id ON task_pending_messages(task_id, id ASC);
