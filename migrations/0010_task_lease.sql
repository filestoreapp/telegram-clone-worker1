-- Per-task lease so only one in-flight runTick invocation can process a
-- given task at a time — Cloudflare cron triggers do not guarantee mutual
-- exclusion between scheduled() calls, and without this guard two
-- overlapping invocations can copy the same Telegram message(s) twice.
-- Nullable add, no default — same reasoning as 0009_task_auto_stop.sql:
-- D1/SQLite can't ALTER a CHECK constraint in place, so straight additive
-- columns are this table's established pattern.
ALTER TABLE tasks ADD COLUMN lease_expires_at INTEGER;
