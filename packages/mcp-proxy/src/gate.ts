import { consumeDefer } from "./defer-state.js"
import { isHeadPushed, isWorktreeClean, readGitSnapshot, readRepoRoot } from "./git.js"
import { readSessionOrNull } from "./session-state.js"

export type GateInput = {
  readonly strictMode: boolean
  readonly worktreeClean: boolean
  readonly hasNewCommits: boolean
  readonly headPushed: boolean
  readonly ingested: boolean
  readonly safeMode?: boolean
  readonly backgroundTasksRunning?: boolean
  readonly sessionCronsRunning?: boolean
}

export type GateDecision =
  | { readonly decision: "allow"; readonly reason: string }
  | { readonly decision: "block"; readonly reason: string }

export type StopDecision = GateDecision & { readonly deferred?: boolean }

export const STOP_GATE_RESOLUTION_GUIDANCE =
  "해소: 변경을 commit+push 후 specraft_ingest를 실행하거나, specraft_defer 도구로 사유를 기록해 1회 종료를 허용하거나, .specraft.json에 strict_mode=false를 설정하세요."

function blockDecision(reason: string): GateDecision {
  return { decision: "block", reason: `${reason} — ${STOP_GATE_RESOLUTION_GUIDANCE}` }
}

export type GateStateInput = {
  readonly cwd: string
  readonly home: string
  readonly sessionId: string | null
  readonly strictMode: boolean
}

export function readGitGateState(input: GateStateInput): GateInput {
  const snapshot = readGitSnapshot(input.cwd)
  const session = input.sessionId === null ? null : readSessionOrNull(input.home, input.sessionId)
  return {
    hasNewCommits: session?.started_head ? session.started_head !== snapshot.head : true,
    headPushed: isHeadPushed(input.cwd),
    ingested: session?.ingested ?? false,
    safeMode: input.sessionId === null,
    strictMode: input.strictMode,
    worktreeClean: isWorktreeClean(input.cwd),
  }
}

export function evaluateStopGate(input: GateInput): GateDecision {
  if (!input.strictMode) {
    return { decision: "allow", reason: "strict_mode=false" }
  }
  if (input.backgroundTasksRunning || input.sessionCronsRunning) {
    return blockDecision("background_tasks/session_crons still running")
  }
  if (!input.worktreeClean) {
    return blockDecision("working tree is dirty; commit, push, then ingest")
  }
  if (!input.hasNewCommits) {
    return { decision: "allow", reason: "read-only session exemption" }
  }
  if (!input.headPushed) {
    return blockDecision("HEAD is not pushed; push before ingest")
  }
  if (input.safeMode) {
    return { decision: "allow", reason: "clean and pushed (safe mode: ingest check skipped)" }
  }
  if (!input.ingested) {
    return blockDecision("session has pushed commits but no specraft ingest marker")
  }
  return { decision: "allow", reason: "clean, pushed, ingested" }
}

/**
 * Stop decision with the defer escape hatch: when the gate would block, an
 * unconsumed defer marker matching repo+branch+HEAD converts the result into a
 * one-time allow (consume-on-use). Stale markers (HEAD mismatch) are cleaned
 * up during the lookup. Naturally allowed stops never consume a marker.
 */
export function decideStop(input: GateStateInput): StopDecision {
  const decision = evaluateStopGate(readGitGateState(input))
  if (decision.decision === "allow") {
    return decision
  }
  const snapshot = readGitSnapshot(input.cwd)
  const deferred = consumeDefer(input.home, {
    branch: snapshot.branch,
    head: snapshot.head,
    repoPath: readRepoRoot(input.cwd),
  })
  if (deferred) {
    return { decision: "allow", deferred: true, reason: `deferred: ${deferred.reason}` }
  }
  return decision
}
