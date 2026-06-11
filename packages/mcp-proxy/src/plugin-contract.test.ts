import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Path + parsing helpers
// ---------------------------------------------------------------------------

function repoPath(path: string): string {
  return fileURLToPath(new URL(`../../../${path}`, import.meta.url))
}

function readText(path: string): string {
  return readFileSync(repoPath(path), "utf8")
}

function readJson(path: string): unknown {
  return JSON.parse(readText(path))
}

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`expected ${label} to be present`)
  }
  return value
}

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---/

function parseFrontmatter(markdown: string): Record<string, string> {
  const match = FRONTMATTER_PATTERN.exec(markdown)
  const body = match?.[1]
  if (body === undefined) return {}
  const fields: Record<string, string> = {}
  for (const line of body.split("\n")) {
    const separator = line.indexOf(":")
    if (separator === -1) continue
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim()
  }
  return fields
}

// ---------------------------------------------------------------------------
// Shared schema building blocks
// ---------------------------------------------------------------------------

const NonEmptyString = z.string().min(1)
const SemverString = z.string().regex(/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/, "expected semver")
const AuthorSchema = z.object({ name: NonEmptyString })

const ALLOWED_HOOK_EVENTS = ["SessionStart", "UserPromptSubmit", "Stop"] as const

// biome-ignore lint/suspicious/noTemplateCurlyInString: literal Claude Code expansion token, not a template
const CLAUDE_PROXY_ENTRYPOINT = "${CLAUDE_PLUGIN_ROOT}/proxy/cli.js"
const CODEX_PROXY_ENTRYPOINT = "./proxy/cli.js"

// ① Claude Code plugin.json
const ClaudePluginManifestSchema = z.object({
  name: z.literal("specraft"),
  version: SemverString,
  description: NonEmptyString,
  author: AuthorSchema,
  userConfig: z.object({
    api_key: z.object({
      type: z.literal("string"),
      title: NonEmptyString,
      description: NonEmptyString,
      sensitive: z.literal(true),
    }),
  }),
})

// ② / ⑤ hooks/hooks.json — matcher-group structure rooted at the plugin root token
function buildHooksFileSchema(rootToken: "CLAUDE_PLUGIN_ROOT" | "PLUGIN_ROOT") {
  const commandPattern = new RegExp(`^node "\\$\\{${rootToken}\\}/hooks/[a-z0-9-]+\\.js"$`)
  const HookCommandSchema = z.object({
    type: z.literal("command"),
    command: z.string().regex(commandPattern, `expected node "\${${rootToken}}/hooks/<script>.js"`),
    timeout: z.number().int().positive(),
    statusMessage: NonEmptyString.optional(),
  })
  const MatcherGroupSchema = z.object({
    matcher: NonEmptyString.optional(),
    hooks: z.array(HookCommandSchema).min(1),
  })
  return z.object({
    description: NonEmptyString.optional(),
    hooks: z.record(NonEmptyString, z.array(MatcherGroupSchema).min(1)),
  })
}

type HooksFile = z.infer<ReturnType<typeof buildHooksFileSchema>>

// ③ .mcp.json — node + proxy/cli.js entrypoint
function buildMcpConfigSchema(expectedEntrypoint: string) {
  return z.object({
    mcpServers: z.object({
      specraft: z.object({
        command: z.literal("node"),
        args: z
          .array(NonEmptyString)
          .min(1)
          .refine((args) => args[0] === expectedEntrypoint, {
            message: `args[0] must be ${expectedEntrypoint}`,
          }),
        cwd: z.string().optional(),
      }),
    }),
  })
}

// ④ Codex plugin.json — pointer fields + interface metadata
const CodexPluginManifestSchema = z.object({
  name: z.literal("specraft"),
  version: SemverString,
  description: NonEmptyString,
  author: AuthorSchema,
  skills: NonEmptyString,
  hooks: NonEmptyString,
  mcpServers: NonEmptyString,
  interface: z.object({
    displayName: NonEmptyString,
    shortDescription: NonEmptyString,
    longDescription: NonEmptyString,
    developerName: NonEmptyString,
    category: NonEmptyString,
    capabilities: z.array(NonEmptyString).min(1),
  }),
})

// ⑥ marketplace manifests
const ClaudeMarketplaceSchema = z.object({
  name: NonEmptyString,
  owner: z.object({ name: NonEmptyString }),
  version: SemverString,
  plugins: z
    .array(
      z.object({
        name: NonEmptyString,
        description: NonEmptyString,
        version: SemverString,
        author: AuthorSchema,
        source: z.string().regex(/^\.\//, "expected repo-relative ./ source"),
      }),
    )
    .min(1),
})

const CodexMarketplaceSchema = z.object({
  name: NonEmptyString,
  plugins: z
    .array(
      z.object({
        name: NonEmptyString,
        source: z.string().regex(/^\.\//, "expected repo-relative ./ source"),
      }),
    )
    .min(1),
})

// ⑦ frontmatter
const CommandFrontmatterSchema = z.object({ description: NonEmptyString })
const SkillFrontmatterSchema = z.object({ name: NonEmptyString, description: NonEmptyString })

const ProxyPackageSchema = z.object({
  name: z.literal("@specraft/mcp-proxy"),
  version: SemverString,
})

// ---------------------------------------------------------------------------
// Parsed fixtures (parse once, reuse across tests)
// ---------------------------------------------------------------------------

const claudePlugin = ClaudePluginManifestSchema.parse(
  readJson("plugins/claude-code/.claude-plugin/plugin.json"),
)
const claudeHooks = buildHooksFileSchema("CLAUDE_PLUGIN_ROOT").parse(
  readJson("plugins/claude-code/hooks/hooks.json"),
)
const codexPlugin = CodexPluginManifestSchema.parse(
  readJson("plugins/codex/.codex-plugin/plugin.json"),
)
const codexHooks = buildHooksFileSchema("PLUGIN_ROOT").parse(
  readJson("plugins/codex/hooks/hooks.json"),
)

function collectHookCommands(hooksFile: HooksFile): string[] {
  return Object.values(hooksFile.hooks).flatMap((groups) =>
    groups.flatMap((group) => group.hooks.map((hook) => hook.command)),
  )
}

function hookScriptRelativePath(command: string): string {
  const match = /\$\{(?:CLAUDE_)?PLUGIN_ROOT\}\/(hooks\/[a-z0-9-]+\.js)/.exec(command)
  return required(match?.[1], `hook script path in command: ${command}`)
}

function matcherCovers(matcher: string | undefined, source: string): boolean {
  return matcher?.split("|").includes(source) ?? false
}

// ---------------------------------------------------------------------------
// ① ~ ③ + ⑦ Claude Code plugin
// ---------------------------------------------------------------------------

describe("Claude Code plugin contracts", () => {
  it("plugin.json matches the standard manifest schema", () => {
    // Schema already parsed at module scope; assert M1.1 key removals on the raw object.
    const raw = z
      .record(z.string(), z.unknown())
      .parse(readJson("plugins/claude-code/.claude-plugin/plugin.json"))
    expect(raw).not.toHaveProperty("hooks")
    expect(raw).not.toHaveProperty("commands")
    expect(claudePlugin.name).toBe("specraft")
  })

  it("hooks/hooks.json uses matcher groups rooted at CLAUDE_PLUGIN_ROOT with timeouts", () => {
    expect(Object.keys(claudeHooks.hooks).sort()).toEqual([...ALLOWED_HOOK_EVENTS].sort())
    const sessionStart = required(claudeHooks.hooks["SessionStart"], "SessionStart groups")
    const compactGroup = sessionStart.find((group) => matcherCovers(group.matcher, "compact"))
    expect(compactGroup, "SessionStart must re-inject context on compact").toBeDefined()
    expect(compactGroup?.hooks[0]?.command).toContain("post-compact.js")
    const startupGroup = sessionStart.find((group) => matcherCovers(group.matcher, "startup"))
    expect(startupGroup?.hooks[0]?.command).toContain("session-start.js")
  })

  it(".mcp.json launches the bundled proxy via node", () => {
    const mcp = buildMcpConfigSchema(CLAUDE_PROXY_ENTRYPOINT).parse(
      readJson("plugins/claude-code/.mcp.json"),
    )
    expect(mcp.mcpServers.specraft.command).toBe("node")
  })

  it("commands ship YAML frontmatter with a description", () => {
    const commandFiles = readdirSync(repoPath("plugins/claude-code/commands")).filter((file) =>
      file.endsWith(".md"),
    )
    expect(commandFiles).toEqual(expect.arrayContaining(["specraft-setup.md", "specraft-init.md"]))
    for (const file of commandFiles) {
      const frontmatter = parseFrontmatter(readText(`plugins/claude-code/commands/${file}`))
      expect(() => CommandFrontmatterSchema.parse(frontmatter), file).not.toThrow()
    }
  })
})

// ---------------------------------------------------------------------------
// ④ ~ ⑤ + ⑦ Codex plugin
// ---------------------------------------------------------------------------

describe("Codex plugin contracts", () => {
  it("plugin.json pointers reference real files and interface metadata is complete", () => {
    for (const pointer of [codexPlugin.skills, codexPlugin.hooks, codexPlugin.mcpServers]) {
      const resolved = repoPath(`plugins/codex/${pointer.replace(/^\.\//, "")}`)
      expect(existsSync(resolved), `pointer ${pointer} must exist`).toBe(true)
    }
    expect(codexPlugin.hooks).toBe("./hooks/hooks.json")
    expect(codexPlugin.interface.capabilities).toContain("Hooks")
  })

  it("hooks/hooks.json uses matcher groups rooted at PLUGIN_ROOT with timeouts", () => {
    expect(Object.keys(codexHooks.hooks).sort()).toEqual([...ALLOWED_HOOK_EVENTS].sort())
    const sessionStart = required(codexHooks.hooks["SessionStart"], "SessionStart groups")
    const compactGroup = sessionStart.find((group) => matcherCovers(group.matcher, "compact"))
    expect(compactGroup, "SessionStart must re-inject context on compact").toBeDefined()
    expect(compactGroup?.hooks[0]?.command).toContain("post-compact.js")
  })

  it(".mcp.json launches the relative bundled proxy from the plugin root", () => {
    const mcp = buildMcpConfigSchema(CODEX_PROXY_ENTRYPOINT).parse(
      readJson("plugins/codex/.mcp.json"),
    )
    expect(mcp.mcpServers.specraft.cwd).toBe(".")
  })

  it("skills ship SKILL.md frontmatter with name and description", () => {
    const skillDirs = readdirSync(repoPath("plugins/codex/skills"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
    expect(skillDirs).toEqual(expect.arrayContaining(["specraft-setup", "specraft-init"]))
    for (const dir of skillDirs) {
      const frontmatter = parseFrontmatter(readText(`plugins/codex/skills/${dir}/SKILL.md`))
      expect(() => SkillFrontmatterSchema.parse(frontmatter), dir).not.toThrow()
      expect(frontmatter["name"]).toBe(dir)
    }
  })
})

// ---------------------------------------------------------------------------
// ⑥ marketplace manifests
// ---------------------------------------------------------------------------

describe("marketplace manifests", () => {
  it("Claude marketplace entry points at a real plugin source matching plugin.json", () => {
    const marketplace = ClaudeMarketplaceSchema.parse(readJson(".claude-plugin/marketplace.json"))
    const entry = required(
      marketplace.plugins.find((plugin) => plugin.name === claudePlugin.name),
      "specraft entry in Claude marketplace",
    )
    const sourceDir = entry.source.replace(/^\.\//, "")
    expect(existsSync(repoPath(sourceDir))).toBe(true)
    expect(existsSync(repoPath(`${sourceDir}/.claude-plugin/plugin.json`))).toBe(true)
    expect(entry.version).toBe(claudePlugin.version)
    expect(marketplace.version).toBe(claudePlugin.version)
  })

  it("Codex marketplace entry points at a real plugin source matching plugin.json", () => {
    const marketplace = CodexMarketplaceSchema.parse(readJson(".agents/plugins/marketplace.json"))
    const entry = required(
      marketplace.plugins.find((plugin) => plugin.name === codexPlugin.name),
      "specraft entry in Codex marketplace",
    )
    const sourceDir = entry.source.replace(/^\.\//, "")
    expect(existsSync(repoPath(sourceDir))).toBe(true)
    expect(existsSync(repoPath(`${sourceDir}/.codex-plugin/plugin.json`))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Derived invariants
// ---------------------------------------------------------------------------

describe("derived invariants", () => {
  it("every hook command points at an existing executable script", () => {
    const targets: Array<{ root: string; hooksFile: HooksFile }> = [
      { root: "plugins/claude-code", hooksFile: claudeHooks },
      { root: "plugins/codex", hooksFile: codexHooks },
    ]
    for (const { root, hooksFile } of targets) {
      for (const command of collectHookCommands(hooksFile)) {
        const scriptPath = repoPath(`${root}/${hookScriptRelativePath(command)}`)
        expect(existsSync(scriptPath), `${scriptPath} must exist`).toBe(true)
        const mode = statSync(scriptPath).mode
        expect(mode & 0o111, `${scriptPath} must be executable`).not.toBe(0)
      }
    }
  })

  it("plugin, marketplace, and proxy package versions stay in lockstep", () => {
    const marketplace = ClaudeMarketplaceSchema.parse(readJson(".claude-plugin/marketplace.json"))
    const marketplaceEntry = required(marketplace.plugins[0], "first Claude marketplace entry")
    const proxyPackage = ProxyPackageSchema.parse(readJson("packages/mcp-proxy/package.json"))
    const versions = new Set([
      claudePlugin.version,
      codexPlugin.version,
      marketplace.version,
      marketplaceEntry.version,
      proxyPackage.version,
    ])
    expect([...versions]).toEqual([claudePlugin.version])
  })

  it("hook events stay within the supported event set", () => {
    const allowed = new Set<string>(ALLOWED_HOOK_EVENTS)
    for (const event of [...Object.keys(claudeHooks.hooks), ...Object.keys(codexHooks.hooks)]) {
      expect(allowed.has(event), `unsupported hook event: ${event}`).toBe(true)
    }
  })

  it("PostCompact never reappears in plugin configuration (regression guard)", () => {
    const configFiles = [
      "plugins/claude-code/.claude-plugin/plugin.json",
      "plugins/claude-code/hooks/hooks.json",
      "plugins/claude-code/.mcp.json",
      "plugins/codex/.codex-plugin/plugin.json",
      "plugins/codex/hooks/hooks.json",
      "plugins/codex/.mcp.json",
    ]
    const hookScripts = (["plugins/claude-code", "plugins/codex"] as const).flatMap((root) =>
      readdirSync(repoPath(`${root}/hooks`))
        .filter((file) => file.endsWith(".js"))
        .map((file) => `${root}/hooks/${file}`),
    )
    for (const file of [...configFiles, ...hookScripts]) {
      expect(readText(file), `${file} must not mention PostCompact`).not.toContain("PostCompact")
    }
  })

  it("hook entrypoints keep the proxy CLI wrapper contract", () => {
    for (const root of ["plugins/claude-code", "plugins/codex"]) {
      const stopHook = readText(`${root}/hooks/stop.js`)
      const promptHook = readText(`${root}/hooks/user-prompt-submit.js`)
      expect(stopHook).toContain("specraft-mcp-proxy")
      expect(stopHook).toContain("hook stop")
      expect(promptHook).toContain("hook user-prompt-submit")
    }
  })
})
