-- Filter configuration on tasks and saved task templates
ALTER TABLE tasks ADD COLUMN filter_media_types TEXT;
ALTER TABLE tasks ADD COLUMN filter_min_size_bytes INTEGER;
ALTER TABLE tasks ADD COLUMN filter_max_size_bytes INTEGER;
ALTER TABLE tasks ADD COLUMN live_skipped INTEGER NOT NULL DEFAULT 0;

ALTER TABLE saved_tasks ADD COLUMN filter_media_types TEXT;
ALTER TABLE saved_tasks ADD COLUMN filter_min_size_bytes INTEGER;
ALTER TABLE saved_tasks ADD COLUMN filter_max_size_bytes INTEGER;

-- Rich metadata on pending queue for live messages
ALTER TABLE task_pending_messages ADD COLUMN media_type TEXT;
ALTER TABLE task_pending_messages ADD COLUMN file_size INTEGER;
ALTER TABLE task_pending_messages ADD COLUMN file_name TEXT;

-- Rich metadata on per-message log
ALTER TABLE task_message_log ADD COLUMN media_type TEXT;
ALTER TABLE task_message_log ADD COLUMN file_size INTEGER;
ALTER TABLE task_message_log ADD COLUMN file_name TEXT;
