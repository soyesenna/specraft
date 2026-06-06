import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { MockProvider, runToolLoop } from "./provider.js"
import { createWikiTools } from "./wiki-tools.js"

describe("LLM provider tool loop", () => {
  it("executes requested wiki tools and returns cited answers", async () => {
    const wikiDir = mkdtempSync(join(tmpdir(), "specraft-wiki-tools-"))
    writeFileSync(join(wikiDir, "overview.md"), "# Overview\nSpecraft keeps one source.\n")
    const provider = new MockProvider([
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "wiki_read", arguments: '{"path":"overview.md"}' },
          },
        ],
      },
      {
        role: "assistant",
        content: "Specraft keeps one source. [overview.md#Overview]",
      },
    ])

    const response = await runToolLoop({
      provider,
      messages: [{ role: "user", content: "What is this project?" }],
      tools: createWikiTools(wikiDir),
      maxTurns: 3,
    })

    expect(response.content).toContain("Specraft keeps one source")
    expect(provider.requests).toHaveLength(2)
  })
})
