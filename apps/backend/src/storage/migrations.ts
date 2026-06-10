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

    CREATE TABLE IF NOT EXISTS graph_layouts (
      member_id TEXT NOT NULL REFERENCES members(id),
      branch TEXT NOT NULL,
      positions TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (member_id, branch)
    );

    CREATE TABLE IF NOT EXISTS wiki_graph_cache (
      branch TEXT PRIMARY KEY,
      head TEXT NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  // invites.created_at — 출시 후 추가된 컬럼. 기존 DB에는 ALTER로 보강한다 (레거시 행은 NULL 유지).
  addColumnIfMissing(database, "invites", "created_at", "TEXT")

  // 상세 로그 컬럼 — Activity 상세 페이지(변경 문서·저장된 답변·도구 타임라인)용. 모두 nullable JSON 문자열.
  addColumnIfMissing(database, "ingest_logs", "spec_changes", "TEXT")
  addColumnIfMissing(database, "ingest_logs", "progress_updates", "TEXT")
  addColumnIfMissing(database, "ingest_logs", "open_questions", "TEXT")
  addColumnIfMissing(database, "query_logs", "answer", "TEXT")
  addColumnIfMissing(database, "query_logs", "citations", "TEXT")
  addColumnIfMissing(database, "query_logs", "tool_calls", "TEXT")
}

// PRAGMA table_info로 컬럼 존재를 확인하고 없을 때만 ALTER하는 멱등 보강 헬퍼.
function addColumnIfMissing(
  database: Database.Database,
  table: string,
  column: string,
  type: string,
): void {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (!columns.some((existing) => existing.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
  }
}
