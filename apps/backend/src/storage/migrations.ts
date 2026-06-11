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

    CREATE TABLE IF NOT EXISTS feature_progress (
      branch TEXT NOT NULL,
      feature TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'done', 'blocked')),
      note TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      source_ingest_id TEXT NOT NULL REFERENCES ingest_logs(id),
      PRIMARY KEY (branch, feature)
    );

    CREATE TABLE IF NOT EXISTS wiki_embeddings (
      branch TEXT NOT NULL,
      path TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      section TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (branch, path, chunk_index)
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

  // progress_updates 컬럼 보강(ALTER) 이후에 실행되어야 한다 — 레거시 DB에는 컬럼이 없다.
  backfillFeatureProgress(database)
}

/*
 * M4+.3 진행률 보드 백필 — 과거 ingest_logs.progress_updates를 feature_progress로 1회 집계한다.
 * 기동 시 별도 훅이 아니라 마이그레이션에서 수행하는 이유: 테이블 생성과 같은 시점에 실행되어
 * "테이블은 있는데 과거 데이터가 빈" 중간 상태가 없고, 멱등 가드(테이블 비어 있을 때만)로
 * 재기동마다 최신 집계를 과거 로그로 덮어쓰는 사고를 차단한다.
 */
function backfillFeatureProgress(database: Database.Database): void {
  const populated = database
    .prepare("SELECT EXISTS (SELECT 1 FROM feature_progress) AS found")
    .get() as { found: number }
  if (populated.found === 1) {
    return
  }
  const rows = database
    .prepare(
      `SELECT id, branch, progress_updates, created_at FROM ingest_logs
       WHERE status = 'accepted' AND progress_updates IS NOT NULL
       ORDER BY created_at ASC, id ASC`,
    )
    .all() as Array<{ id: string; branch: string; progress_updates: string; created_at: string }>
  const upsert = database.prepare(
    `INSERT OR REPLACE INTO feature_progress (branch, feature, status, note, updated_at, source_ingest_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
  const validStatuses = new Set(["planned", "in_progress", "done", "blocked"])
  for (const row of rows) {
    let updates: unknown
    try {
      updates = JSON.parse(row.progress_updates)
    } catch {
      continue
    }
    if (!Array.isArray(updates)) {
      continue
    }
    for (const update of updates) {
      if (
        update !== null &&
        typeof update === "object" &&
        typeof (update as { feature?: unknown }).feature === "string" &&
        typeof (update as { status?: unknown }).status === "string" &&
        validStatuses.has((update as { status: string }).status)
      ) {
        const parsed = update as { feature: string; status: string; note?: unknown }
        upsert.run(
          row.branch,
          parsed.feature,
          parsed.status,
          typeof parsed.note === "string" ? parsed.note : "",
          row.created_at,
          row.id,
        )
      }
    }
  }
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
