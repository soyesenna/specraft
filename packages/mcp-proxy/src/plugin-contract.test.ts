import { existsSync, readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"
import { z } from "zod"

const JsonObjectSchema = z.record(z.string(), z.unknown())

function repoPath(path: string): URL {
  return new URL(`../../../${path}`, import.meta.url)
}

function readJson(path: string): Record<string, unknown> {
  return JsonObjectSchema.parse(JSON.parse(readFileSync(repoPath(path), "utf8")))
}

describe("plugin packaging contracts", () => {
  it("ships Claude Code metadata, MCP registration, and commands", () => {
    const plugin = readJson("plugins/claude-code/.claude-plugin/plugin.json")
    const mcp = readJson("plugins/claude-code/.mcp.json")
    expect(plugin["name"]).toBe("specraft")
    expect(JSON.stringify(plugin)).toContain("SessionStart")
    expect(JSON.stringify(plugin)).toContain("Stop")
    expect(JSON.stringify(mcp)).toContain("specraft-mcp-proxy")
    expect(existsSync(repoPath("plugins/claude-code/commands/specraft-setup.md"))).toBe(true)
    expect(existsSync(repoPath("plugins/claude-code/commands/specraft-init.md"))).toBe(true)
  })

  it("ships Codex manifest, matcher-free hooks, and setup/init skills", () => {
    const plugin = readJson("plugins/codex/.codex-plugin/plugin.json")
    const hooks = readJson("plugins/codex/hooks.json")
    expect(plugin["name"]).toBe("specraft")
    expect(JSON.stringify(hooks)).toContain("UserPromptSubmit")
    expect(JSON.stringify(hooks)).not.toContain("matcher")
    expect(existsSync(repoPath("plugins/codex/skills/specraft-setup/SKILL.md"))).toBe(true)
    expect(existsSync(repoPath("plugins/codex/skills/specraft-init/SKILL.md"))).toBe(true)
  })
})
