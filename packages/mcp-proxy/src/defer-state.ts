import { createHash, randomBytes } from "node:crypto"
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { z } from "zod"

const DeferMarkerSchema = z.object({
  repo_path: z.string(),
  branch: z.string(),
  head: z.string(),
  reason: z.string(),
  created_at: z.string(),
  consumed: z.boolean().default(false),
  consumed_at: z.string().nullable().default(null),
})

export type DeferMarker = z.infer<typeof DeferMarkerSchema>

/** Session-independent defer key: repo root + branch + HEAD (plan M1.3 rev3). */
export type DeferKey = {
  readonly repoPath: string
  readonly branch: string
  readonly head: string
}

/** Consumed markers >= this count on the same repo+branch add a warning line to the stop allow reason. */
export const REPEATED_DEFER_WARNING_THRESHOLD = 3

/** Consumed markers are kept as history for this long, then GCed on lookups (plan M3.2). */
export const CONSUMED_DEFER_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export function defersDir(home: string): string {
  return join(home, ".specraft", "defers")
}

/**
 * One file per recorded defer: key digest + timestamp + random suffix, so a
 * repeated defer on the same key keeps separate history entries instead of
 * overwriting the consumed marker. consumeDefer scans the directory, so legacy
 * digest-only file names keep working.
 */
function deferFileName(key: DeferKey): string {
  const digest = createHash("sha256")
    .update(`${key.repoPath}\n${key.branch}\n${key.head}`)
    .digest("hex")
  return `${digest.slice(0, 16)}-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}.json`
}

export function recordDefer(home: string, key: DeferKey, reason: string): DeferMarker {
  const marker: DeferMarker = {
    repo_path: key.repoPath,
    branch: key.branch,
    head: key.head,
    reason,
    created_at: new Date().toISOString(),
    consumed: false,
    consumed_at: null,
  }
  mkdirSync(defersDir(home), { recursive: true })
  writeFileSync(join(defersDir(home), deferFileName(key)), `${JSON.stringify(marker, null, 2)}\n`)
  return marker
}

type MarkerEntry = {
  readonly path: string
  readonly marker: DeferMarker
}

/**
 * Reads every parseable defer marker, GCing consumed markers whose retention
 * window (consumed_at, falling back to created_at for legacy markers) expired.
 * Unparseable files are skipped.
 */
function scanDefers(home: string, now: number): readonly MarkerEntry[] {
  const dir = defersDir(home)
  if (!existsSync(dir)) {
    return []
  }
  const entries: MarkerEntry[] = []
  for (const name of readdirSync(dir)
    .filter((entry) => entry.endsWith(".json"))
    .sort()) {
    const path = join(dir, name)
    let marker: DeferMarker
    try {
      marker = DeferMarkerSchema.parse(JSON.parse(readFileSync(path, "utf8")))
    } catch {
      continue
    }
    if (marker.consumed) {
      const consumedAt = Date.parse(marker.consumed_at ?? marker.created_at)
      if (!Number.isNaN(consumedAt) && now - consumedAt > CONSUMED_DEFER_RETENTION_MS) {
        rmSync(path, { force: true })
        continue
      }
    }
    entries.push({ marker, path })
  }
  return entries
}

/**
 * Consume-on-use defer lookup (plan M1.3 + M3.2 semantics):
 * - exact key match (repo+branch+HEAD) and not yet consumed -> mark consumed, return marker
 * - same repo+branch but different HEAD and unconsumed -> stale: delete and ignore
 * - consumed markers are preserved as defer history (retention GC applies)
 * - cross-session consumption is allowed because the key carries no session identity
 */
export function consumeDefer(home: string, key: DeferKey): DeferMarker | null {
  let match: DeferMarker | null = null
  for (const { marker, path } of scanDefers(home, Date.now())) {
    if (marker.repo_path !== key.repoPath || marker.branch !== key.branch) {
      continue
    }
    if (marker.head !== key.head) {
      if (!marker.consumed) {
        rmSync(path, { force: true })
      }
      continue
    }
    if (marker.consumed || match) {
      continue
    }
    match = { ...marker, consumed: true, consumed_at: new Date().toISOString() }
    writeFileSync(path, `${JSON.stringify(match, null, 2)}\n`)
  }
  return match
}

export type DeferHistoryFilter = {
  readonly repoPath?: string | undefined
  readonly branch?: string | undefined
}

/** Lists defer markers (newest first), running the retention GC as a side effect. */
export function listDeferHistory(
  home: string,
  filter: DeferHistoryFilter = {},
): readonly DeferMarker[] {
  return scanDefers(home, Date.now())
    .map((entry) => entry.marker)
    .filter((marker) => filter.repoPath === undefined || marker.repo_path === filter.repoPath)
    .filter((marker) => filter.branch === undefined || marker.branch === filter.branch)
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
}

/** Counts consumed defers on the same repo+branch — input for the repeated-defer warning. */
export function countConsumedDefers(
  home: string,
  filter: { readonly repoPath: string; readonly branch: string },
): number {
  return listDeferHistory(home, filter).filter((marker) => marker.consumed).length
}
