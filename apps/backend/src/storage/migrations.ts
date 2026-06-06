import type Database from "better-sqlite3"

export function migrateDatabase(database: Database.Database): void {
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
      disabled_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invites (
      token TEXT PRIMARY KEY,
      created_by TEXT NOT NULL REFERENCES members(id),
      expires_at TEXT NOT NULL,
      used_at TEXT,
      used_by TEXT REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
      key_hash TEXT NOT NULL,
      prefix TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS ingest_logs (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
      branch TEXT NOT NULL,
      commit_hash TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('accepted', 'rejected')),
      summary TEXT NOT NULL,
      wiki_commit TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS query_logs (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
      branch TEXT NOT NULL,
      question TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conflicts (
      id TEXT PRIMARY KEY,
      branch TEXT NOT NULL,
      source_branch TEXT,
      state TEXT NOT NULL CHECK (state IN ('open', 'resolving', 'resolved')),
      detail TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      resolved_by TEXT REFERENCES members(id),
      directive TEXT
    );

    CREATE TABLE IF NOT EXISTS branch_locks (
      branch TEXT PRIMARY KEY,
      conflict_id TEXT NOT NULL REFERENCES conflicts(id),
      locked_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}
