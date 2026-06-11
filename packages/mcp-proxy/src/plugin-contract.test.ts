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
    const hooks = readJson("plugins/claude-code/hooks/hooks.json")
    const mcp = readJson("plugins/claude-code/.mcp.json")
    const stopHook = readFileSync(repoPath("plugins/claude-code/hooks/stop.js"), "utf8")
    const promptHook = readFileSync(
      repoPath("plugins/claude-code/hooks/user-prompt-submit.js"),
      "utf8",
    )
    expect(plugin["name"]).toBe("specraft")
    expect(JSON.stringify(hooks)).toContain("SessionStart")
    expect(JSON.stringify(hooks)).toContain("Stop")
    // biome-ignore lint/suspicious/noTemplateCurlyInString: literal Claude Code expansion token, not a template
    expect(JSON.stringify(mcp)).toContain("${CLAUDE_PLUGIN_ROOT}/proxy/cli.js")
    expect(stopHook).toContain("specraft-mcp-proxy")
    expect(stopHook).toContain("hook stop")
    expect(promptHook).toContain("hook user-prompt-submit")
    expect(existsSync(repoPath("plugins/claude-code/commands/specraft-setup.md"))).toBe(true)
    expect(existsSync(repoPath("plugins/claude-code/commands/specraft-init.md"))).toBe(true)
  })

  it("ships Codex manifest, standard hooks, and setup/init skills", () => {
    const plugin = readJson("plugins/codex/.codex-plugin/plugin.json")
    const hooks = readJson("plugins/codex/hooks/hooks.json")
    const mcp = readJson("plugins/codex/.mcp.json")
    const stopHook = readFileSync(repoPath("plugins/codex/hooks/stop.js"), "utf8")
    const promptHook = readFileSync(repoPath("plugins/codex/hooks/user-prompt-submit.js"), "utf8")
    expect(plugin["name"]).toBe("specraft")
    expect(plugin["hooks"]).toBe("./hooks/hooks.json")
    expect(JSON.stringify(hooks)).toContain("UserPromptSubmit")
    expect(JSON.stringify(hooks)).toContain("SessionStart")
    expect(JSON.stringify(mcp)).toContain("proxy/cli.js")
    expect(stopHook).toContain("specraft-mcp-proxy")
    expect(stopHook).toContain("hook stop")
    expect(promptHook).toContain("hook user-prompt-submit")
    expect(existsSync(repoPath("plugins/codex/skills/specraft-setup/SKILL.md"))).toBe(true)
    expect(existsSync(repoPath("plugins/codex/skills/specraft-init/SKILL.md"))).toBe(true)
  })
})
