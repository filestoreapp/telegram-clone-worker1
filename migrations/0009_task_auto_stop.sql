-- Token-revocation auto-stop. Both columns are nullable adds (no rebuild of
-- the tasks table — D1/SQLite can't ALTER a CHECK constraint in place).
-- stop_reason is freeform TEXT rather than CHECK-constrained: today only
-- 'unauthorized' is ever written, but this should extend to other fatal
-- ErrorReasons later without another migration — validity is enforced by
-- the ErrorReason type at the app layer instead. stopped_at doubles as a
-- general "reached a terminal state" timestamp (also set on natural
-- completion/cancellation, not just auto-stops) so the Completed Tasks
-- panel has something to sort by.
ALTER TABLE tasks ADD COLUMN stop_reason TEXT;
ALTER TABLE tasks ADD COLUMN stopped_at INTEGER;
