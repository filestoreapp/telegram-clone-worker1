-- Multi Checker: standalone library of confirmed-good (token, chat) pairs.
-- Intentionally has NO FK to bots — these are raw pasted tokens, not
-- necessarily saved bots. Token lives here only; API list responses must
-- mask it (same discipline as bots.token — see 0001_init.sql comment).
-- Only "valid token AND bot confirmed in chat" pairs are ever written here;
-- a re-run that finds a pair no longer valid deletes the stale row, so
-- this table is a live-truth cache, not an audit log.
CREATE TABLE bot_chat_checks (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  bot_id INTEGER NOT NULL,
  bot_username TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  chat_title TEXT,
  checked_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (token, chat_id)
);

CREATE INDEX idx_bot_chat_checks_chat_id ON bot_chat_checks(chat_id);
