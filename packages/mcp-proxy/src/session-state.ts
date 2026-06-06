import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { z } from "zod"

const SessionMarkerSchema = z.object({
  session_id: z.string(),
  started_at: z.string(),
  branch: z.string(),
  started_head: z.string().nullable().default(null),
  ingested: z.boolean(),
  resolved: z.boolean().default(false),
})

export type SessionMarker = z.infer<typeof SessionMarkerSchema>

function sessionsDir(home: string): string {
  return join(home, ".specraft", "sessions")
}

function markerPath(home: string, sessionId: string): string {
  return join(sessionsDir(home), `${sessionId}.json`)
}

function writeMarker(home: string, marker: SessionMarker): void {
  mkdirSync(sessionsDir(home), { recursive: true })
  writeFileSync(markerPath(home, marker.session_id), `${JSON.stringify(marker, null, 2)}\n`)
}

export function startSession(input: {
  readonly home: string
  readonly sessionId: string
  readonly branch: string
  readonly startedHead?: string
}): SessionMarker {
  const marker = {
    session_id: input.sessionId,
    started_at: new Date().toISOString(),
    branch: input.branch,
    started_head: input.startedHead ?? null,
    ingested: false,
    resolved: false,
  }
  writeMarker(input.home, marker)
  return marker
}

export function markIngested(home: string, sessionId: string): SessionMarker {
  const marker = readSession(home, sessionId)
  const updated = { ...marker, ingested: true }
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
  return SessionMarkerSchema.parse(JSON.parse(readFileSync(path, "utf8")))
}

export function pendingReplaySessions(home: string): readonly SessionMarker[]
export function pendingReplaySessions(
  home: string,
  options: { readonly excludeSessionId?: string },
): readonly SessionMarker[]
export function pendingReplaySessions(
  home: string,
  options: { readonly excludeSessionId?: string } = {},
): readonly SessionMarker[] {
  const dir = sessionsDir(home)
  if (!existsSync(dir)) {
    return []
  }
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => SessionMarkerSchema.parse(JSON.parse(readFileSync(join(dir, name), "utf8"))))
    .filter((marker) => marker.session_id !== options.excludeSessionId)
    .filter((marker) => !marker.ingested && !marker.resolved)
    .sort((left, right) => left.started_at.localeCompare(right.started_at))
}
