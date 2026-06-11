import type { StatusResponse } from "@specraft/shared"

import {
  consumeDefer,
  countConsumedDefers,
  REPEATED_DEFER_WARNING_THRESHOLD,
} from "./defer-state.js"
import {
  type HeadPushState,
  headPushState,
  readDirtyState,
  readGitSnapshot,
  readRepoRoot,
} from "./git.js"
import { pendingReplaySessions, readSessionOrNull } from "./session-state.js"

export type GateInput = {
  readonly strictMode: boolean
  readonly worktreeClean: boolean
  /**
   * Whether the dirty-file-set snapshot (sha256 of `git status --porcelain`)
   * is identical to the one recorded at session start. Never a boolean
   * clean/dirty comparison: a session that started dirty and edited further is
   * detected, while an untouched dirty question session is exempt (plan M3.1).
   */
  readonly dirtyUnchangedSinceStart: boolean
  readonly hasNewCommits: boolean
  readonly headPushState: HeadPushState
  /** Only true when the ingest marker's ingested_head matches the current HEAD. */
  readonly ingested: boolean
  readonly safeMode?: boolean
  readonly sessionCronsRunning?: boolean
}

export type GateDecision =
  | { readonly decision: "allow"; readonly reason: string }
  | { readonly decision: "block"; readonly reason: string }

export type StopDecision = GateDecision & { readonly deferred?: boolean }

export const STOP_GATE_RESOLUTION_GUIDANCE =
  "해소: 변경을 commit+push 후 specraft_ingest를 실행하거나, specraft_defer 도구로 사유를 기록해 1회 종료를 허용하거나, .specraft.json에 strict_mode=false를 설정하세요."

/** Canonical reason for the fully verified allow path — decideStop keys the server recheck on it. */
export const INGESTED_ALLOW_REASON = "clean, pushed, ingested"

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
  const dirty = readDirtyState(input.cwd)
  return {
    // Legacy markers (started_dirty_hash null) and untracked sessions fall back
    // to the old clean-based exemption semantics.
    dirtyUnchangedSinceStart:
      session?.started_dirty_hash != null ? session.started_dirty_hash === dirty.hash : dirty.clean,
    hasNewCommits: session?.started_head ? session.started_head !== snapshot.head : true,
    headPushState: headPushState(input.cwd),
    ingested: session?.ingested_head != null && session.ingested_head === snapshot.head,
    safeMode: input.sessionId === null,
    strictMode: input.strictMode,
    worktreeClean: dirty.clean,
  }
}

export function evaluateStopGate(input: GateInput): GateDecision {
  if (!input.strictMode) {
    return { decision: "allow", reason: "strict_mode=false" }
  }
  if (input.sessionCronsRunning) {
    return blockDecision("session_crons still running")
  }
  if (!input.hasNewCommits && input.dirtyUnchangedSinceStart) {
    return { decision: "allow", reason: "read-only session exemption" }
  }
  if (!input.worktreeClean) {
    return blockDecision("working tree is dirty; commit, push, then ingest")
  }
  if (input.headPushState === "no-upstream") {
    return blockDecision("no upstream — git push -u로 업스트림 설정 후 재시도")
  }
  if (input.headPushState === "not-pushed") {
    return blockDecision("HEAD is not pushed; push before ingest")
  }
  if (input.safeMode) {
    return { decision: "allow", reason: "clean and pushed (safe mode: ingest check skipped)" }
  }
  if (!input.ingested) {
    return blockDecision(
      "session has pushed commits but no specraft ingest marker for the current HEAD",
    )
  }
  return { decision: "allow", reason: INGESTED_ALLOW_REASON }
}

export type StopOptions = {
  /**
   * One-shot server `/api/v1/status` recheck used only on the ingested allow
   * path. Failures keep the local verdict (fail-open) to avoid availability
   * incidents; a branch lock converts the allow into a block.
   */
  readonly serverStatus?: (() => Promise<StatusResponse>) | null | undefined
}

function recheckAgainstServer(
  decision: GateDecision,
  branch: string,
  status: StatusResponse,
): GateDecision {
  const lock = status.branch_locks.find((candidate) => candidate.branch === branch)
  if (!lock) {
    return decision
  }
  const detail = lock.reason ? `: ${lock.reason}` : ""
  return {
    decision: "block",
    reason:
      `server status recheck: branch "${branch}" is locked (conflict ${lock.conflict_id}${detail}). ` +
      `specraft_conflicts로 충돌을 확인·해소한 후 다시 종료하세요 — ${STOP_GATE_RESOLUTION_GUIDANCE}`,
  }
}

/**
 * Stop decision with the defer escape hatch: when the gate (or the server
 * recheck) would block, an unconsumed defer marker matching repo+branch+HEAD
 * converts the result into a one-time allow (consume-on-use). Stale markers
 * (HEAD mismatch, unconsumed) are cleaned up during the lookup; consumed
 * markers are preserved as history and feed the repeated-defer warning.
 */
export async function decideStop(
  input: GateStateInput,
  options: StopOptions = {},
): Promise<StopDecision> {
  let decision = evaluateStopGate(readGitGateState(input))
  const snapshot = readGitSnapshot(input.cwd)
  if (
    decision.decision === "allow" &&
    decision.reason === INGESTED_ALLOW_REASON &&
    options.serverStatus
  ) {
    try {
      decision = recheckAgainstServer(decision, snapshot.branch, await options.serverStatus())
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      process.stderr.write(
        `specraft: server status recheck unavailable (${message}); keeping the local allow (fail-open)\n`,
      )
    }
  }
  if (decision.decision === "allow") {
    return decision
  }
  const repoPath = readRepoRoot(input.cwd)
  const deferred = consumeDefer(input.home, {
    branch: snapshot.branch,
    head: snapshot.head,
    repoPath,
  })
  if (deferred) {
    const consumedCount = countConsumedDefers(input.home, {
      branch: snapshot.branch,
      repoPath,
    })
    const warning =
      consumedCount >= REPEATED_DEFER_WARNING_THRESHOLD
        ? `\n경고: 이 레포·브랜치에서 defer가 ${consumedCount}회 누적되었습니다 — 미뤄둔 spec ingest를 정리하세요.`
        : ""
    return { decision: "allow", deferred: true, reason: `deferred: ${deferred.reason}${warning}` }
  }
  return decision
}

export type UserPromptInput = {
  readonly home: string
  readonly sessionId: string | null
  /** Current repo root; null = repo unidentified, so no repo filter is applied. */
  readonly repoPath: string | null
}

function describePendingMarker(marker: {
  readonly session_id: string
  readonly started_at: string
  readonly branch: string
  readonly repo_path: string | null
}): string {
  const repo = marker.repo_path ?? "레포 미기록(레거시 마커 — 전 레포 해당)"
  return `- 세션 ${marker.session_id} @ ${repo} (branch ${marker.branch}, started ${marker.started_at})`
}

/**
 * UserPromptSubmit replay gate, scoped to the current repo so that pending
 * sessions from other repositories can never deadlock this one (plan M3.3 /
 * M1.9 finding). The block reason names the repo, the session, and the way out.
 */
export function decideUserPrompt(input: UserPromptInput): GateDecision {
  const pending = pendingReplaySessions(input.home, {
    excludeSessionId: input.sessionId ?? undefined,
    repoPath: input.repoPath ?? undefined,
  })
  if (pending.length === 0) {
    return { decision: "allow", reason: "no pending specraft replay" }
  }
  const lines = pending.map(describePendingMarker)
  return {
    decision: "block",
    reason:
      "pending specraft ingest replay exists; resolve or ingest before continuing:\n" +
      `${lines.join("\n")}\n` +
      "해소: 해당 레포에서 세션을 재개해 변경을 commit/push 후 specraft_ingest를 실행하거나, " +
      "변경이 없다면 세션을 재개해 그대로 종료(stop allow 시 자동 resolve)하거나, " +
      "마커 파일(~/.specraft/sessions/<세션ID>.json)의 resolved를 true로 설정하세요.",
  }
}
