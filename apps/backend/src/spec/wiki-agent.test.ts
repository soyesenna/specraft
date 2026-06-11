import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { createSkeletonWiki } from "../git/sync.js"
import { MockProvider } from "../llm/provider.js"
import {
  answerWikiQuestionWithAgent,
  answerWikiQuestionWithAgentStream,
  ingestWikiWithAgent,
} from "./wiki-agent.js"

function newWiki(prefix: string) {
  return createSkeletonWiki({ dataDir: mkdtempSync(join(tmpdir(), prefix)), branch: "main" })
}

function toolNames(provider: MockProvider): readonly string[] {
  return (provider.requests[0]?.tools ?? []).map((tool) => tool.name)
}

describe("wiki agent tool exposure (M3.4)", () => {
  it("query agent (sync) only receives read-only wiki tools", async () => {
    const provider = new MockProvider([
      { role: "assistant", content: "Answer. [overview.md#Overview]" },
    ])
    await answerWikiQuestionWithAgent({
      provider,
      queryId: "q-1",
      question: "What is specraft?",
      wiki: newWiki("specraft-agent-q-"),
    })
    const names = toolNames(provider)
    expect(names).toEqual(["wiki_read", "wiki_list", "wiki_search"])
    expect(names).not.toContain("wiki_write")
    expect(names).not.toContain("wiki_delete")
  })

  it("query agent (stream) only receives read-only wiki tools", async () => {
    const provider = new MockProvider([
      { role: "assistant", content: "Answer. [overview.md#Overview]" },
    ])
    await answerWikiQuestionWithAgentStream({
      provider,
      queryId: "q-2",
      question: "What is specraft?",
      wiki: newWiki("specraft-agent-s-"),
      onDelta: () => {},
      onToolCall: () => {},
      onToolResult: () => {},
    })
    const names = toolNames(provider)
    expect(names).toEqual(["wiki_read", "wiki_list", "wiki_search"])
    expect(names).not.toContain("wiki_write")
    expect(names).not.toContain("wiki_delete")
  })

  it("ingest agent keeps write-capable wiki tools", async () => {
    const provider = new MockProvider([{ role: "assistant", content: "done" }])
    await ingestWikiWithAgent({
      member: { id: "mem-1", email: "member@example.com", name: "Member One", role: "admin" },
      payload: {
        branch: "main",
        commit_hash: "abc123",
        agent: "codex",
        session_id: "session-tools",
        summary: "Tool exposure test.",
        spec_changes: [
          { type: "added", area: "backend", description: "Test.", reasoning: "Test." },
        ],
        progress_updates: [],
        open_questions: [],
      },
      provider,
      wiki: newWiki("specraft-agent-i-"),
    })
    const names = toolNames(provider)
    expect(names).toContain("wiki_write")
    expect(names).toContain("wiki_delete")
  })
})
