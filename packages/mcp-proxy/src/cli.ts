import { createInterface } from "node:readline/promises"

import { createSpecraftClient } from "@specraft/shared"

import { findSpecraftConfig } from "./config.js"
import { evaluateStopGate, readGitGateState } from "./gate.js"
import { readGitSnapshot } from "./git.js"
import { handleMcpRequest } from "./mcp.js"
import { pendingReplaySessions, startSession } from "./session-state.js"
import { createMcpTools } from "./tools.js"

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

function sessionId(): string {
  return (
    process.env["SPECRAFT_SESSION_ID"] ??
    process.env["CODEX_SESSION_ID"] ??
    process.env["CLAUDE_SESSION_ID"] ??
    "default"
  )
}

function serverUrl(cwd: string): string {
  const url = process.env["SPECRAFT_SERVER_URL"] ?? findSpecraftConfig(cwd)?.server_url
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

function runStopHook(cwd: string): void {
  const decision = evaluateStopGate(
    readGitGateState({
      cwd,
      home: homeDir(),
      sessionId: sessionId(),
      strictMode: strictMode(cwd),
    }),
  )
  writeHook({
    decision: decision.decision === "allow" ? "approve" : "block",
    reason: decision.reason,
  })
}

function runUserPromptHook(): void {
  const pending = pendingReplaySessions(homeDir())
  if (pending.length > 0) {
    writeHook({
      decision: "block",
      reason: "pending specraft ingest replay exists; resolve or ingest before continuing",
    })
    return
  }
  writeHook({ decision: "approve", reason: "no pending specraft replay" })
}

function runSessionStartHook(cwd: string): void {
  const snapshot = readGitSnapshot(cwd)
  startSession({
    branch: snapshot.branch,
    home: homeDir(),
    sessionId: sessionId(),
    startedHead: snapshot.head,
  })
  process.stdout.write("specraft session marker created\n")
}

async function runMcp(cwd: string): Promise<void> {
  const apiKey = process.env["SPECRAFT_API_KEY"]
  if (!apiKey) {
    throw new Error("SPECRAFT_API_KEY is required")
  }
  const client = createSpecraftClient({ apiKey, baseUrl: serverUrl(cwd) })
  const tools = createMcpTools({
    client,
    gitSnapshot: async () => readGitSnapshot(cwd),
    home: homeDir(),
    sessionId: sessionId(),
  })
  const input = createInterface({ input: process.stdin })
  for await (const line of input) {
    if (line.trim() === "") {
      continue
    }
    const response = await handleMcpRequest(tools, JSON.parse(line))
    process.stdout.write(`${JSON.stringify(response)}\n`)
  }
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
    runSessionStartHook(cwd)
    return
  }
  await runMcp(cwd)
}

await main()
