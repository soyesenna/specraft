import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"
import type { SpecraftToolClient } from "./tools.js"
import { specraftIngest } from "./tools.js"

describe("mcp ingest tool", () => {
  it("does not fail after accepted ingest when the local session marker is missing", async () => {
    const client: SpecraftToolClient = {
      query: async () => ({ answer: "ok", citations: [], query_id: "qry_1" }),
      ingest: async () => ({ status: "accepted", wiki_commit: "abc" }),
      status: async () => ({ server: "ok", branch_locks: [], wiki_head_by_branch: {} }),
    }

    await expect(
      specraftIngest(
        {
          client,
          gitSnapshot: async () => ({ branch: "main", head: "abc" }),
          home: mkdtempSync(join(tmpdir(), "specraft-missing-marker-")),
          sessionId: "missing-marker",
        },
        {
          agent: "codex",
          summary: "accepted without marker",
          spec_changes: [{ type: "added", area: "mcp", description: "marker", reasoning: "QA" }],
          progress_updates: [],
          open_questions: [],
        },
      ),
    ).resolves.toEqual({ status: "accepted", wiki_commit: "abc" })
  })
})
