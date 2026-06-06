import { isHeadPushed, isWorktreeClean, readGitSnapshot } from "./git.js"
import { readSessionOrNull } from "./session-state.js"

export type GateInput = {
  readonly strictMode: boolean
  readonly worktreeClean: boolean
  readonly hasNewCommits: boolean
  readonly headPushed: boolean
  readonly ingested: boolean
  readonly backgroundTasksRunning?: boolean
  readonly sessionCronsRunning?: boolean
}

export type GateDecision =
  | { readonly decision: "allow"; readonly reason: string }
  | { readonly decision: "block"; readonly reason: string }

export type GateStateInput = {
  readonly cwd: string
  readonly home: string
  readonly sessionId: string
  readonly strictMode: boolean
}

export function readGitGateState(input: GateStateInput): GateInput {
  const snapshot = readGitSnapshot(input.cwd)
  const session = readSessionOrNull(input.home, input.sessionId)
  return {
    hasNewCommits: session?.started_head ? session.started_head !== snapshot.head : true,
    headPushed: isHeadPushed(input.cwd),
    ingested: session?.ingested ?? false,
    strictMode: input.strictMode,
    worktreeClean: isWorktreeClean(input.cwd),
  }
}

export function evaluateStopGate(input: GateInput): GateDecision {
  if (!input.strictMode) {
    return { decision: "allow", reason: "strict_mode=false" }
  }
  if (input.backgroundTasksRunning || input.sessionCronsRunning) {
    return { decision: "block", reason: "background_tasks/session_crons still running" }
  }
  if (!input.worktreeClean) {
    return { decision: "block", reason: "working tree is dirty; commit, push, then ingest" }
  }
  if (!input.hasNewCommits) {
    return { decision: "allow", reason: "read-only session exemption" }
  }
  if (!input.headPushed) {
    return { decision: "block", reason: "HEAD is not pushed; push before ingest" }
  }
  if (!input.ingested) {
    return { decision: "block", reason: "session has pushed commits but no specraft ingest marker" }
  }
  return { decision: "allow", reason: "clean, pushed, ingested" }
}
