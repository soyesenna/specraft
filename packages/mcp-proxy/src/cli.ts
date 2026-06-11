import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { createSpecraftClient, type StatusResponse } from "@specraft/shared"

import { findSpecraftConfig } from "./config.js"
import { resolveApiKey, resolveServerUrl } from "./credentials.js"
import { decideStop, decideUserPrompt } from "./gate.js"
import { isHeadPushed, readDirtyHash, readGitSnapshot, readRepoRoot } from "./git.js"
import { INJECTION_BUDGET_TOKENS, renderContextInjection } from "./injection-budget.js"
import { createSpecraftMcpServer, mcpServerVersion } from "./mcp.js"
import {
  pendingReplaySessions,
  readSessionOrNull,
  resolveSession,
  startSession,
} from "./session-state.js"

type HookOutput = {
  readonly decision: "approve" | "block"
  readonly reason: string
}

function homeDir(): string {
  const home = process.env["HOME"]
  if (!home) {
    throw new Error("HOME is required")
  }
  return home
}

function envOrNull(name: string): string | null {
  const value = process.env[name]
  return value !== undefined && value !== "" ? value : null
}

function sessionId(): string | null {
  return (
    envOrNull("SPECRAFT_SESSION_ID") ??
    envOrNull("CLAUDE_CODE_SESSION_ID") ??
    envOrNull("CODEX_SESSION_ID")
  )
}

function resolveSessionId(): string | null {
  const id = sessionId()
  if (id === null) {
    process.stderr.write(
      "specraft: session id missing; running in safe mode without session tracking (세션 추적 없는 안전 모드)\n",
    )
  }
  return id
}

function strictMode(cwd: string): boolean {
  return findSpecraftConfig(cwd)?.strict_mode ?? true
}

function writeHook(output: HookOutput): void {
  process.stdout.write(`${JSON.stringify(output)}\n`)
}

function repoRootOrNull(cwd: string): string | null {
  try {
    return readRepoRoot(cwd)
  } catch {
    return null
  }
}

/** Reuses the existing credentials/url chain for the stop-time server recheck. */
function serverStatusCheck(cwd: string, home: string): (() => Promise<StatusResponse>) | null {
  const apiKey = resolveApiKey({ home })
  if (!apiKey) {
    return null
  }
  const client = createSpecraftClient({ apiKey, baseUrl: resolveServerUrl({ cwd, home }) })
  return () => client.status()
}

function replayInstruction(
  home: string,
  currentSessionId: string | null,
  repoPath: string | null,
): string {
  const pending = pendingReplaySessions(home, {
    excludeSessionId: currentSessionId ?? undefined,
    repoPath: repoPath ?? undefined,
  })
  if (pending.length === 0) {
    return ""
  }
  const lines = pending.map(
    (marker) =>
      `- ${marker.session_id} (${marker.started_at}, branch ${marker.branch}, repo ${
        marker.repo_path ?? "미기록(레거시 — 전 레포 해당)"
      }) requires specraft_ingest`,
  )
  return `Pending specraft replay from previous sessions:\n${lines.join("\n")}\n`
}

async function runStopHook(cwd: string): Promise<void> {
  const currentHome = homeDir()
  const currentSessionId = resolveSessionId()
  const decision = await decideStop(
    {
      cwd,
      home: currentHome,
      sessionId: currentSessionId,
      strictMode: strictMode(cwd),
    },
    { serverStatus: serverStatusCheck(cwd, currentHome) },
  )
  if (
    decision.decision === "allow" &&
    !decision.deferred &&
    currentSessionId !== null &&
    readSessionOrNull(currentHome, currentSessionId)
  ) {
    resolveSession(currentHome, currentSessionId)
  }
  writeHook({
    decision: decision.decision === "allow" ? "approve" : "block",
    reason: decision.reason,
  })
}

function runUserPromptHook(cwd: string): void {
  const decision = decideUserPrompt({
    home: homeDir(),
    repoPath: repoRootOrNull(cwd),
    sessionId: resolveSessionId(),
  })
  writeHook({
    decision: decision.decision === "allow" ? "approve" : "block",
    reason: decision.reason,
  })
}

async function runSessionStartHook(cwd: string): Promise<void> {
  const snapshot = readGitSnapshot(cwd)
  const currentHome = homeDir()
  const currentSessionId = resolveSessionId()
  const repoPath = repoRootOrNull(cwd)
  if (currentSessionId !== null) {
    startSession({
      branch: snapshot.branch,
      home: currentHome,
      sessionId: currentSessionId,
      startedDirtyHash: readDirtyHash(cwd),
      startedHead: snapshot.head,
      ...(repoPath !== null ? { repoPath } : {}),
    })
  }
  const pending = replayInstruction(currentHome, currentSessionId, repoPath)
  const apiKey = resolveApiKey({ home: currentHome })
  if (!apiKey) {
    process.stdout.write(
      `${pending}Use specraft context before repository answers. Run specraft_status if context injection is unavailable.\n`,
    )
    return
  }
  const client = createSpecraftClient({
    apiKey,
    baseUrl: resolveServerUrl({ cwd, home: currentHome }),
  })
  // M3.6: 주입 본문은 INJECTION_BUDGET_TOKENS 이내로 요청한다(구버전 서버는 무시 — additive 스키마).
  const context = await client.context({
    branch: snapshot.branch,
    budget_tokens: INJECTION_BUDGET_TOKENS,
    commit_hash: snapshot.head,
  })
  process.stdout.write(
    `${pending}${renderContextInjection({ branch: snapshot.branch, context, head: snapshot.head })}`,
  )
}

async function runContextHook(cwd: string): Promise<void> {
  const snapshot = readGitSnapshot(cwd)
  const currentHome = homeDir()
  const apiKey = resolveApiKey({ home: currentHome })
  if (!apiKey) {
    process.stdout.write("Rehydrate specraft context with specraft_query before continuing.\n")
    return
  }
  const client = createSpecraftClient({
    apiKey,
    baseUrl: resolveServerUrl({ cwd, home: currentHome }),
  })
  // M3.6: 재수화 주입도 session-start와 같은 예산을 쓴다.
  const context = await client.context({
    branch: snapshot.branch,
    budget_tokens: INJECTION_BUDGET_TOKENS,
    commit_hash: snapshot.head,
  })
  process.stdout.write(
    renderContextInjection({ branch: snapshot.branch, context, head: snapshot.head }),
  )
}

async function runMcp(cwd: string): Promise<void> {
  const currentHome = homeDir()
  const apiKey = resolveApiKey({ home: currentHome })
  if (!apiKey) {
    throw new Error(
      "SPECRAFT_API_KEY is required: set the env var or add SPECRAFT_API_KEY=<key> to ~/.specraft/credentials",
    )
  }
  const client = createSpecraftClient({
    apiKey,
    baseUrl: resolveServerUrl({ cwd, home: currentHome }),
  })
  const server = createSpecraftMcpServer({
    client,
    gitSnapshot: async () => readGitSnapshot(cwd),
    headPushed: async () => isHeadPushed(cwd),
    home: currentHome,
    repoRoot: () => readRepoRoot(cwd),
    sessionId: resolveSessionId(),
  })
  await server.connect(new StdioServerTransport())
}

async function main(): Promise<void> {
  const cwd = process.cwd()
  const [command, subcommand] = process.argv.slice(2)
  if (command === "--version") {
    process.stdout.write(`${mcpServerVersion()}\n`)
    return
  }
  if (command === "hook" && subcommand === "stop") {
    await runStopHook(cwd)
    return
  }
  if (command === "hook" && subcommand === "user-prompt-submit") {
    runUserPromptHook(cwd)
    return
  }
  if (command === "hook" && subcommand === "session-start") {
    await runSessionStartHook(cwd)
    return
  }
  if (command === "hook" && subcommand === "context") {
    await runContextHook(cwd)
    return
  }
  await runMcp(cwd)
}

await main()
