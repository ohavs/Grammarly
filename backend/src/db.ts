import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config.js";

mkdirSync(dirname(config.databasePath), { recursive: true });

export const db = new Database(config.databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);

  CREATE TABLE IF NOT EXISTS personal_dictionary (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    PRIMARY KEY (user_id, word)
  );

  CREATE TABLE IF NOT EXISTS check_cache (
    text_hash TEXT PRIMARY KEY,
    language TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    language TEXT NOT NULL DEFAULT 'en-US',
    audience TEXT NOT NULL DEFAULT 'general',
    formality TEXT NOT NULL DEFAULT 'neutral',
    intent TEXT NOT NULL DEFAULT 'inform',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
