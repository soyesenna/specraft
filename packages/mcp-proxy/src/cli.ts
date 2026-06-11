import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { createSpecraftClient } from "@specraft/shared"

import { findSpecraftConfig } from "./config.js"
import { decideStop } from "./gate.js"
import { isHeadPushed, readGitSnapshot, readRepoRoot } from "./git.js"
import { createSpecraftMcpServer } from "./mcp.js"
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

function findServerUrl(cwd: string): string | null {
  return process.env["SPECRAFT_SERVER_URL"] ?? findSpecraftConfig(cwd)?.server_url ?? null
}

function serverUrl(cwd: string): string {
  const url = findServerUrl(cwd)
  if (!url) {
    throw new Error("SPECRAFT_SERVER_URL or .specraft.json server_url is required")
  }
  return url
}

function strictMode(cwd: string): boolean {
  return findSpecraftConfig(cwd)?.strict_mode ?? true
}

function writeHook(output: HookOutput): void {
  process.stdout.write(`${JSON.stringify(output)}\n`)
}

function pendingForSession(home: string, currentSessionId: string | null) {
  return currentSessionId === null
    ? pendingReplaySessions(home)
    : pendingReplaySessions(home, { excludeSessionId: currentSessionId })
}

function replayInstruction(home: string, currentSessionId: string | null): string {
  const pending = pendingForSession(home, currentSessionId)
  if (pending.length === 0) {
    return ""
  }
  const lines = pending.map(
    (marker) =>
      `- ${marker.session_id} (${marker.started_at}, branch ${marker.branch}) requires specraft_ingest`,
  )
  return `Pending specraft replay from previous sessions:\n${lines.join("\n")}\n`
}

function runStopHook(cwd: string): void {
  const currentHome = homeDir()
  const currentSessionId = resolveSessionId()
  const decision = decideStop({
    cwd,
    home: currentHome,
    sessionId: currentSessionId,
    strictMode: strictMode(cwd),
  })
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

function runUserPromptHook(): void {
  const pending = pendingForSession(homeDir(), resolveSessionId())
  if (pending.length > 0) {
    writeHook({
      decision: "block",
      reason: "pending specraft ingest replay exists; resolve or ingest before continuing",
    })
    return
  }
  writeHook({ decision: "approve", reason: "no pending specraft replay" })
}

async function runSessionStartHook(cwd: string): Promise<void> {
  const snapshot = readGitSnapshot(cwd)
  const currentHome = homeDir()
  const currentSessionId = resolveSessionId()
  if (currentSessionId !== null) {
    startSession({
      branch: snapshot.branch,
      home: currentHome,
      sessionId: currentSessionId,
      startedHead: snapshot.head,
    })
  }
  const pending = replayInstruction(currentHome, currentSessionId)
  const apiKey = process.env["SPECRAFT_API_KEY"]
  const url = findServerUrl(cwd)
  if (!apiKey || !url) {
    process.stdout.write(
      `${pending}Use specraft context before repository answers. Run specraft_status if context injection is unavailable.\n`,
    )
    return
  }
  const client = createSpecraftClient({ apiKey, baseUrl: url })
  const context = await client.context({ branch: snapshot.branch, commit_hash: snapshot.head })
  process.stdout.write(
    `${pending}Specraft context for ${snapshot.branch}@${snapshot.head}:\n\n${context.overview}\n\n${context.index}\n`,
  )
}

async function runContextHook(cwd: string): Promise<void> {
  const snapshot = readGitSnapshot(cwd)
  const apiKey = process.env["SPECRAFT_API_KEY"]
  const url = findServerUrl(cwd)
  if (!apiKey || !url) {
    process.stdout.write("Rehydrate specraft context with specraft_query before continuing.\n")
    return
  }
  const client = createSpecraftClient({ apiKey, baseUrl: url })
  const context = await client.context({ branch: snapshot.branch, commit_hash: snapshot.head })
  process.stdout.write(
    `Specraft context for ${snapshot.branch}@${snapshot.head}:\n\n${context.overview}\n\n${context.index}\n`,
  )
}

async function runMcp(cwd: string): Promise<void> {
  const apiKey = process.env["SPECRAFT_API_KEY"]
  if (!apiKey) {
    throw new Error("SPECRAFT_API_KEY is required")
  }
  const client = createSpecraftClient({ apiKey, baseUrl: serverUrl(cwd) })
  const server = createSpecraftMcpServer({
    client,
    gitSnapshot: async () => readGitSnapshot(cwd),
    headPushed: async () => isHeadPushed(cwd),
    home: homeDir(),
    repoRoot: () => readRepoRoot(cwd),
    sessionId: resolveSessionId(),
  })
  await server.connect(new StdioServerTransport())
}

async function main(): Promise<void> {
  const cwd = process.cwd()
  const [command, subcommand] = process.argv.slice(2)
  if (command === "hook" && subcommand === "stop") {
    runStopHook(cwd)
    return
  }
  if (command === "hook" && subcommand === "user-prompt-submit") {
    runUserPromptHook()
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
