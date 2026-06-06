import { rmSync } from "node:fs"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { verifyWikiIntegrity, WikiIntegrityError } from "./integrity.js"

describe("wiki integrity check", () => {
  it("initializes and verifies wiki.git skeleton files", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "specraft-integrity-"))
    const report = verifyWikiIntegrity(dataDir)

    expect(report.status).toBe("ok")
    expect(report.files).toEqual(["index.md", "log.md", "overview.md"])
  })

  it("fails with recovery guidance when required skeleton files are missing", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "specraft-integrity-bad-"))
    verifyWikiIntegrity(dataDir)
    rmSync(join(dataDir, "workspace", "wiki", "main", "overview.md"))

    expect(() => verifyWikiIntegrity(dataDir)).toThrow(WikiIntegrityError)
  })
})
