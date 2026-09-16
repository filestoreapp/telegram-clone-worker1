-- Bot-wide rate-limit cooldown: when Telegram 429s any task under a bot,
-- pause that bot's active tasks for a short window so the tick job and the
-- live-forward webhook stop making doomed calls instead of tripping the
-- same limit again next minute. Nullable add, no default — same reasoning
-- as 0009_task_auto_stop.sql/0010_task_lease.sql: D1/SQLite can't ALTER a
-- CHECK constraint in place, so straight additive columns are this table's
-- established pattern.
ALTER TABLE tasks ADD COLUMN rate_limited_until INTEGER;
