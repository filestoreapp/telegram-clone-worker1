-- Separate live forwarding counters from historical backfill metrics
ALTER TABLE tasks ADD COLUMN live_processed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN live_failed INTEGER NOT NULL DEFAULT 0;
