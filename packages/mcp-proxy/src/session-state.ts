import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs"
import { join } from "node:path"

import { z } from "zod"

const SessionMarkerSchema = z.object({
  session_id: z.string(),
  started_at: z.string(),
  branch: z.string(),
  started_head: z.string().nullable().default(null),
  /**
   * sha256 snapshot of `git status --porcelain` at session start (plan M3.1).
   * null = legacy marker: the gate falls back to the old clean-based exemption.
   */
  started_dirty_hash: z.string().nullable().default(null),
  ingested: z.boolean(),
  /**
   * HEAD at the time of the accepted ingest. The gate only trusts the marker
   * when this matches the current HEAD; legacy boolean-only markers (null) are
   * never trusted (closes the "one ingest, then more commits" hole).
   */
  ingested_head: z.string().nullable().default(null),
  resolved: z.boolean().default(false),
  /** Repo root the session ran in. null = legacy marker, treated as matching every repo. */
  repo_path: z.string().nullable().default(null),
})

export type SessionMarker = z.infer<typeof SessionMarkerSchema>

export function sessionsDir(home: string): string {
  return join(home, ".specraft", "sessions")
}

function markerPath(home: string, sessionId: string): string {
  return join(sessionsDir(home), `${sessionId}.json`)
}

function writeMarker(home: string, marker: SessionMarker): void {
  mkdirSync(sessionsDir(home), { recursive: true })
  writeFileSync(markerPath(home, marker.session_id), `${JSON.stringify(marker, null, 2)}\n`)
}

/**
 * Parses a marker file; on corruption the file is quarantined by renaming it to
 * `<name>.json.corrupt` and null is returned, so a single broken marker can
 * never paralyze every hook (plan M3.3).
 */
function readMarkerFileOrQuarantine(path: string): SessionMarker | null {
  try {
    return SessionMarkerSchema.parse(JSON.parse(readFileSync(path, "utf8")))
  } catch {
    try {
      renameSync(path, `${path}.corrupt`)
      process.stderr.write(`specraft: corrupt session marker quarantined: ${path}.corrupt\n`)
    } catch {
      // quarantine is best-effort; never throw from marker reads
    }
    return null
  }
}

export function startSession(input: {
  readonly home: string
  readonly sessionId: string
  readonly branch: string
  readonly startedHead?: string
  readonly startedDirtyHash?: string
  readonly repoPath?: string
}): SessionMarker {
  const marker = {
    session_id: input.sessionId,
    started_at: new Date().toISOString(),
    branch: input.branch,
    started_head: input.startedHead ?? null,
    started_dirty_hash: input.startedDirtyHash ?? null,
    ingested: false,
    ingested_head: null,
    resolved: false,
    repo_path: input.repoPath ?? null,
  }
  writeMarker(input.home, marker)
  return marker
}

export function markIngested(
  home: string,
  sessionId: string,
  ingestedHead: string | null = null,
): SessionMarker | null {
  const marker = readSessionOrNull(home, sessionId)
  if (!marker) {
    return null
  }
  const updated = { ...marker, ingested: true, ingested_head: ingestedHead }
  writeMarker(home, updated)
  return updated
}

export function resolveSession(home: string, sessionId: string): SessionMarker {
  const marker = readSession(home, sessionId)
  const updated = { ...marker, resolved: true }
  writeMarker(home, updated)
  return updated
}

export function readSession(home: string, sessionId: string): SessionMarker {
  return SessionMarkerSchema.parse(JSON.parse(readFileSync(markerPath(home, sessionId), "utf8")))
}

export function readSessionOrNull(home: string, sessionId: string): SessionMarker | null {
  const path = markerPath(home, sessionId)
  if (!existsSync(path)) {
    return null
  }
  return readMarkerFileOrQuarantine(path)
}

export type PendingReplayOptions = {
  readonly excludeSessionId?: string | undefined
  /**
   * When set, only markers recorded for this repo root are returned. Legacy
   * markers without repo_path (null) always match (plan M3.3 phase-1 rule).
   */
  readonly repoPath?: string | undefined
}

export function pendingReplaySessions(
  home: string,
  options: PendingReplayOptions = {},
): readonly SessionMarker[] {
  const dir = sessionsDir(home)
  if (!existsSync(dir)) {
    return []
  }
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => readMarkerFileOrQuarantine(join(dir, name)))
    .filter((marker): marker is SessionMarker => marker !== null)
    .filter((marker) => marker.session_id !== options.excludeSessionId)
    .filter((marker) => !marker.ingested && !marker.resolved)
    .filter(
      (marker) =>
        options.repoPath === undefined ||
        marker.repo_path === null ||
        marker.repo_path === options.repoPath,
    )
    .sort((left, right) => left.started_at.localeCompare(right.started_at))
}
