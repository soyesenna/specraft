// M4+ — PostToolUse/PreToolUse 훅의 proxy측 로직.
// PostToolUse: 수정 파일과 연관된 위키 페이지 포인터 1~2줄(경로만 — 본문 주입 금지, 토큰 절약).
// PreToolUse: 현재 브랜치가 서버 branch_locks에 잠겨 있으면 경고 1줄(차단 없음).
// 두 경로 모두 서버/proxy 미가용 시 무출력 fail-open이 호출측(cli.ts) 계약이다.
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import type { BranchLock } from "@specraft/shared"
import { z } from "zod"

import { MAX_RELATED_PAGES, rankRelatedPages } from "./analyze.js"

// ---------------------------------------------------------------------------
// PostToolUse — 파일별 10분 스로틀 (~/.specraft/ptu-cache 마커 디렉터리)
// ---------------------------------------------------------------------------

export const PTU_THROTTLE_MS = 10 * 60 * 1000
/** 포인터로 안내하는 연관 페이지 수 — 1~2줄 유지를 위해 analyze보다 좁게 자른다. */
export const PTU_MAX_POINTER_PAGES = 3

const PtuMarkerSchema = z.object({
  repo_path: z.string(),
  file: z.string(),
  notified_at: z.string(),
})

export function ptuCacheDir(home: string): string {
  return join(home, ".specraft", "ptu-cache")
}

function ptuMarkerPath(home: string, repoPath: string, file: string): string {
  const digest = createHash("sha256").update(`${repoPath}\n${file}`).digest("hex")
  return join(ptuCacheDir(home), `${digest.slice(0, 24)}.json`)
}

/** 같은 repo+파일을 10분 내 재안내했는지 — true면 무출력으로 건너뛴다. */
export function isPtuThrottled(home: string, repoPath: string, file: string, now: number): boolean {
  const path = ptuMarkerPath(home, repoPath, file)
  if (!existsSync(path)) {
    return false
  }
  try {
    const marker = PtuMarkerSchema.parse(JSON.parse(readFileSync(path, "utf8")))
    const notifiedAt = Date.parse(marker.notified_at)
    return !Number.isNaN(notifiedAt) && now - notifiedAt < PTU_THROTTLE_MS
  } catch {
    return false
  }
}

/** 안내 직후 마커를 기록하고, 만료된 마커는 기회적으로 GC한다. */
export function markPtuNotified(home: string, repoPath: string, file: string, now: number): void {
  const dir = ptuCacheDir(home)
  mkdirSync(dir, { recursive: true })
  for (const name of readdirSync(dir).filter((entry) => entry.endsWith(".json"))) {
    const path = join(dir, name)
    try {
      const marker = PtuMarkerSchema.parse(JSON.parse(readFileSync(path, "utf8")))
      const notifiedAt = Date.parse(marker.notified_at)
      if (Number.isNaN(notifiedAt) || now - notifiedAt >= PTU_THROTTLE_MS) {
        rmSync(path, { force: true })
      }
    } catch {
      rmSync(path, { force: true })
    }
  }
  const marker = {
    file,
    notified_at: new Date(now).toISOString(),
    repo_path: repoPath,
  }
  writeFileSync(ptuMarkerPath(home, repoPath, file), `${JSON.stringify(marker, null, 2)}\n`)
}

/**
 * 연관 위키 페이지 포인터 1~2줄을 렌더링한다 — 페이지 경로 목록만(본문 주입 금지).
 * 연관 페이지가 없으면 null(무출력).
 */
export function renderSpecPointer(file: string, pagePaths: readonly string[]): string | null {
  const related = rankRelatedPages(pagePaths, [file]).slice(
    0,
    Math.min(PTU_MAX_POINTER_PAGES, MAX_RELATED_PAGES),
  )
  if (related.length === 0) {
    return null
  }
  return [
    `specraft: ${file} has related spec pages — ${related.join(", ")}.`,
    "Check them with specraft_read_page (or specraft_analyze for a drift review) before diverging from the spec.",
  ].join("\n")
}

// ---------------------------------------------------------------------------
// PreToolUse — branch_locks 경고 + status 5분 캐시 (~/.specraft/status-cache)
// ---------------------------------------------------------------------------

export const STATUS_CACHE_TTL_MS = 5 * 60 * 1000

const StatusCacheSchema = z.object({
  server_url: z.string(),
  fetched_at: z.string(),
  branch_locks: z.array(
    z.object({
      branch: z.string(),
      conflict_id: z.string(),
      reason: z.string().optional(),
    }),
  ),
})

export function statusCachePath(home: string): string {
  return join(home, ".specraft", "status-cache")
}

/** 5분 TTL 내의 캐시된 branch_locks를 돌려준다 — 만료·불일치·손상이면 null. */
export function readCachedBranchLocks(
  home: string,
  serverUrl: string,
  now: number,
): readonly BranchLock[] | null {
  const path = statusCachePath(home)
  if (!existsSync(path)) {
    return null
  }
  try {
    const cache = StatusCacheSchema.parse(JSON.parse(readFileSync(path, "utf8")))
    const fetchedAt = Date.parse(cache.fetched_at)
    if (cache.server_url !== serverUrl || Number.isNaN(fetchedAt)) {
      return null
    }
    return now - fetchedAt < STATUS_CACHE_TTL_MS ? cache.branch_locks : null
  } catch {
    return null
  }
}

export function writeCachedBranchLocks(
  home: string,
  serverUrl: string,
  branchLocks: readonly BranchLock[],
  now: number,
): void {
  mkdirSync(join(home, ".specraft"), { recursive: true })
  const cache = {
    branch_locks: branchLocks,
    fetched_at: new Date(now).toISOString(),
    server_url: serverUrl,
  }
  writeFileSync(statusCachePath(home), `${JSON.stringify(cache, null, 2)}\n`)
}

/** 현재 브랜치가 잠겨 있으면 경고 1줄, 아니면 null(무출력). 차단하지 않는다. */
export function renderBranchLockWarning(
  branchLocks: readonly BranchLock[],
  branch: string,
): string | null {
  const lock = branchLocks.find((entry) => entry.branch === branch)
  if (!lock) {
    return null
  }
  const reason = lock.reason !== undefined && lock.reason !== "" ? ` (${lock.reason})` : ""
  return `specraft: branch '${branch}' is locked on the specraft server — conflict ${lock.conflict_id}${reason}. specraft_ingest will be rejected until it is resolved; inspect with specraft_conflicts.`
}
