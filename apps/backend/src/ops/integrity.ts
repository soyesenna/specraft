import { execFileSync } from "node:child_process"

import { createSkeletonWiki, listWikiFiles } from "../git/sync.js"

export type WikiIntegrityReport = {
  readonly status: "ok"
  readonly files: readonly string[]
}

export class WikiIntegrityError extends Error {}

const requiredFiles = ["index.md", "log.md", "overview.md"] as const

export function verifyWikiIntegrity(dataDir: string): WikiIntegrityReport {
  const wiki = createSkeletonWiki({ dataDir, branch: "main" })
  execFileSync("git", ["--git-dir", wiki.gitDir, "fsck"], { encoding: "utf8" })
  const files = listWikiFiles(wiki)
  const missing = requiredFiles.filter((file) => !files.includes(file))
  if (missing.length > 0) {
    throw new WikiIntegrityError(
      `wiki.git is missing required skeleton files: ${missing.join(", ")}`,
    )
  }
  return { status: "ok", files }
}
