-- Drop obsolete per-message log table and its index
DROP INDEX IF EXISTS idx_task_message_log_task_id;
DROP TABLE IF EXISTS task_message_log;
