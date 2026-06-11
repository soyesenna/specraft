import { createHash } from "node:crypto"
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
})

export type DeferMarker = z.infer<typeof DeferMarkerSchema>

/** Session-independent defer key: repo root + branch + HEAD (plan M1.3 rev3). */
export type DeferKey = {
  readonly repoPath: string
  readonly branch: string
  readonly head: string
}

export function defersDir(home: string): string {
  return join(home, ".specraft", "defers")
}

function markerFileName(key: DeferKey): string {
  const digest = createHash("sha256")
    .update(`${key.repoPath}\n${key.branch}\n${key.head}`)
    .digest("hex")
  return `${digest.slice(0, 40)}.json`
}

function writeMarker(home: string, key: DeferKey, marker: DeferMarker): void {
  mkdirSync(defersDir(home), { recursive: true })
  writeFileSync(join(defersDir(home), markerFileName(key)), `${JSON.stringify(marker, null, 2)}\n`)
}

export function recordDefer(home: string, key: DeferKey, reason: string): DeferMarker {
  const marker: DeferMarker = {
    repo_path: key.repoPath,
    branch: key.branch,
    head: key.head,
    reason,
    created_at: new Date().toISOString(),
    consumed: false,
  }
  writeMarker(home, key, marker)
  return marker
}

/**
 * Consume-on-use defer lookup (plan M1.3 confirmed semantics):
 * - exact key match (repo+branch+HEAD) and not yet consumed -> mark consumed, return marker
 * - same repo+branch but different HEAD -> stale: delete and ignore
 * - cross-session consumption is allowed because the key carries no session identity
 */
export function consumeDefer(home: string, key: DeferKey): DeferMarker | null {
  const dir = defersDir(home)
  if (!existsSync(dir)) {
    return null
  }
  let match: DeferMarker | null = null
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
    if (marker.repo_path !== key.repoPath || marker.branch !== key.branch) {
      continue
    }
    if (marker.head !== key.head) {
      rmSync(path, { force: true })
      continue
    }
    if (marker.consumed || match) {
      continue
    }
    match = { ...marker, consumed: true }
    writeFileSync(path, `${JSON.stringify(match, null, 2)}\n`)
  }
  return match
}
