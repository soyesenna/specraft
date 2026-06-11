import { execFileSync, spawnSync } from "node:child_process"
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import type { StatusResponse } from "@specraft/shared"
import { describe, expect, it } from "vitest"

import {
  CONSUMED_DEFER_RETENTION_MS,
  consumeDefer,
  countConsumedDefers,
  defersDir,
  listDeferHistory,
  REPEATED_DEFER_WARNING_THRESHOLD,
  recordDefer,
} from "./defer-state.js"
import {
  decideStop,
  decideUserPrompt,
  evaluateStopGate,
  type GateInput,
  INGESTED_ALLOW_REASON,
} from "./gate.js"
import { headPushState, readDirtyHash, readRepoRoot } from "./git.js"
import {
  markIngested,
  pendingReplaySessions,
  readSessionOrNull,
  sessionsDir,
  startSession,
} from "./session-state.js"

function git(cwd: string, args: readonly string[]): string {
  return execFileSync("git", [...args], { cwd, encoding: "utf8" }).trim()
}

function createGitRepo(): {
  readonly remote: string
  readonly repo: string
  readonly first: string
} {
  const repo = mkdtempSync(join(tmpdir(), "specraft-matrix-repo-"))
  git(repo, ["init", "-b", "main"])
  git(repo, ["config", "user.email", "test@example.com"])
  git(repo, ["config", "user.name", "Test User"])
  writeFileSync(join(repo, "README.md"), "# App\n")
  git(repo, ["add", "README.md"])
  git(repo, ["commit", "-m", "initial"])
  const first = git(repo, ["rev-parse", "HEAD"])
  const remote = mkdtempSync(join(tmpdir(), "specraft-matrix-remote-"))
  git(remote, ["init", "--bare"])
  git(repo, ["remote", "add", "origin", remote])
  git(repo, ["push", "-u", "origin", "main"])
  return { remote, repo, first }
}

function makeHome(): string {
  return mkdtempSync(join(tmpdir(), "specraft-matrix-home-"))
}

function startTrackedSession(home: string, repo: string, sessionId: string) {
  return startSession({
    branch: git(repo, ["rev-parse", "--abbrev-ref", "HEAD"]),
    home,
    repoPath: readRepoRoot(repo),
    sessionId,
    startedDirtyHash: readDirtyHash(repo),
    startedHead: git(repo, ["rev-parse", "HEAD"]),
  })
}

function commitAndPush(repo: string, fileName: string): string {
  writeFileSync(join(repo, fileName), `${fileName} content\n`)
  git(repo, ["add", "-A"])
  git(repo, ["commit", "-m", `add ${fileName}`])
  git(repo, ["push"])
  return git(repo, ["rev-parse", "HEAD"])
}

function stopInput(repo: string, home: string, sessionId: string | null) {
  return { cwd: repo, home, sessionId, strictMode: true }
}

function okStatus(): StatusResponse {
  return { server: "ok", branch_locks: [], wiki_head_by_branch: {} }
}

function lockedStatus(branch: string): StatusResponse {
  return {
    server: "ok",
    branch_locks: [{ branch, conflict_id: "cfl_1" }],
    wiki_head_by_branch: {},
  }
}

const baseGateInput: GateInput = {
  strictMode: true,
  worktreeClean: true,
  dirtyUnchangedSinceStart: true,
  hasNewCommits: true,
  headPushState: "pushed",
  ingested: true,
}

describe("M3 gate matrix — evaluateStopGate semantics", () => {
  it("allows the fully clean+pushed+ingested path with the canonical reason", () => {
    expect(evaluateStopGate(baseGateInput)).toEqual({
      decision: "allow",
      reason: INGESTED_ALLOW_REASON,
    })
  })

  it("separates missing upstream from unpushed HEAD with git push -u guidance", () => {
    const decision = evaluateStopGate({ ...baseGateInput, headPushState: "no-upstream" })
    expect(decision.decision).toBe("block")
    expect(decision.reason).toContain("no upstream")
    expect(decision.reason).toContain("git push -u")

    const unpushed = evaluateStopGate({ ...baseGateInput, headPushState: "not-pushed" })
    expect(unpushed.decision).toBe("block")
    expect(unpushed.reason).toContain("not pushed")
  })

  it("exempts question sessions: zero commits and unchanged dirty snapshot, even when dirty", () => {
    expect(
      evaluateStopGate({
        ...baseGateInput,
        hasNewCommits: false,
        worktreeClean: false,
        dirtyUnchangedSinceStart: true,
        ingested: false,
      }).decision,
    ).toBe("allow")
  })

  it("blocks zero-commit sessions whose dirty snapshot changed (no boolean comparison)", () => {
    const decision = evaluateStopGate({
      ...baseGateInput,
      hasNewCommits: false,
      worktreeClean: false,
      dirtyUnchangedSinceStart: false,
      ingested: false,
    })
    expect(decision.decision).toBe("block")
    expect(decision.reason).toContain("dirty")
  })

  it("keeps the safe-mode ingest skip on clean+pushed repos", () => {
    const decision = evaluateStopGate({ ...baseGateInput, ingested: false, safeMode: true })
    expect(decision.decision).toBe("allow")
    expect(decision.reason).toContain("safe mode")
  })
})

describe("M3 gate matrix — started_dirty snapshot (git-backed)", () => {
  it("question session: dirty at start, untouched, zero commits -> allow", async () => {
    const fixture = createGitRepo()
    const home = makeHome()
    writeFileSync(join(fixture.repo, "NOTES.md"), "question scratchpad\n")
    startTrackedSession(home, fixture.repo, "s-question")

    const decision = await decideStop(stopInput(fixture.repo, home, "s-question"))
    expect(decision.decision).toBe("allow")
    expect(decision.reason).toContain("read-only")
  })

  it("clean start -> dirty end with zero commits -> block", async () => {
    const fixture = createGitRepo()
    const home = makeHome()
    startTrackedSession(home, fixture.repo, "s-clean-start")
    writeFileSync(join(fixture.repo, "WIP.md"), "uncommitted edit\n")

    const decision = await decideStop(stopInput(fixture.repo, home, "s-clean-start"))
    expect(decision.decision).toBe("block")
    expect(decision.reason).toContain("dirty")
  })

  it("dirty start -> additional edits with zero commits -> block", async () => {
    const fixture = createGitRepo()
    const home = makeHome()
    writeFileSync(join(fixture.repo, "EXISTING.md"), "pre-session dirt\n")
    startTrackedSession(home, fixture.repo, "s-dirty-start")
    writeFileSync(join(fixture.repo, "ANOTHER.md"), "new in-session edit\n")

    const decision = await decideStop(stopInput(fixture.repo, home, "s-dirty-start"))
    expect(decision.decision).toBe("block")
    expect(decision.reason).toContain("dirty")
  })

  it("legacy marker without started_dirty_hash keeps the old clean-based exemption", async () => {
    const fixture = createGitRepo()
    const home = makeHome()
    mkdirSync(sessionsDir(home), { recursive: true })
    writeFileSync(
      join(sessionsDir(home), "s-legacy.json"),
      `${JSON.stringify({
        session_id: "s-legacy",
        started_at: new Date().toISOString(),
        branch: "main",
        started_head: fixture.first,
        ingested: false,
        resolved: false,
      })}\n`,
    )

    const marker = readSessionOrNull(home, "s-legacy")
    expect(marker?.started_dirty_hash).toBeNull()
    expect(marker?.repo_path).toBeNull()
    expect(marker?.ingested_head).toBeNull()

    const cleanDecision = await decideStop(stopInput(fixture.repo, home, "s-legacy"))
    expect(cleanDecision.decision).toBe("allow")

    writeFileSync(join(fixture.repo, "WIP.md"), "dirty now\n")
    const dirtyDecision = await decideStop(stopInput(fixture.repo, home, "s-legacy"))
    expect(dirtyDecision.decision).toBe("block")
  })
})

describe("M3 gate matrix — push states (git-backed)", () => {
  it("blocks with no-upstream guidance when the branch has no upstream", async () => {
    const fixture = createGitRepo()
    const home = makeHome()
    git(fixture.repo, ["checkout", "-b", "feature/topic"])
    startTrackedSession(home, fixture.repo, "s-no-upstream")
    writeFileSync(join(fixture.repo, "feature.md"), "feature work\n")
    git(fixture.repo, ["add", "-A"])
    git(fixture.repo, ["commit", "-m", "feature commit"])

    expect(headPushState(fixture.repo)).toBe("no-upstream")
    const decision = await decideStop(stopInput(fixture.repo, home, "s-no-upstream"))
    expect(decision.decision).toBe("block")
    expect(decision.reason).toContain("no upstream")
    expect(decision.reason).toContain("git push -u")
  })

  it("protected branch: rejected push leaves HEAD unpushed with a push reason", async () => {
    const fixture = createGitRepo()
    const home = makeHome()
    const hookPath = join(fixture.remote, "hooks", "pre-receive")
    writeFileSync(hookPath, "#!/bin/sh\necho 'protected branch' >&2\nexit 1\n")
    chmodSync(hookPath, 0o755)
    startTrackedSession(home, fixture.repo, "s-protected")
    writeFileSync(join(fixture.repo, "blocked.md"), "change on protected branch\n")
    git(fixture.repo, ["add", "-A"])
    git(fixture.repo, ["commit", "-m", "blocked commit"])
    const push = spawnSync("git", ["push"], { cwd: fixture.repo, encoding: "utf8" })
    expect(push.status).not.toBe(0)

    expect(headPushState(fixture.repo)).toBe("not-pushed")
    const decision = await decideStop(stopInput(fixture.repo, home, "s-protected"))
    expect(decision.decision).toBe("block")
    expect(decision.reason).toContain("not pushed")
  })
})

describe("M3 gate matrix — ingested_head binding", () => {
  it("allows when the ingest marker is bound to the current HEAD", async () => {
    const fixture = createGitRepo()
    const home = makeHome()
    startTrackedSession(home, fixture.repo, "s-bind")
    const head = commitAndPush(fixture.repo, "change-1.md")
    markIngested(home, "s-bind", head)

    const decision = await decideStop(stopInput(fixture.repo, home, "s-bind"))
    expect(decision).toEqual({ decision: "allow", reason: INGESTED_ALLOW_REASON })
  })

  it("blocks again after commits made past the ingest (HEAD binding closes the hole)", async () => {
    const fixture = createGitRepo()
    const home = makeHome()
    startTrackedSession(home, fixture.repo, "s-rebind")
    const head = commitAndPush(fixture.repo, "change-1.md")
    markIngested(home, "s-rebind", head)
    commitAndPush(fixture.repo, "change-2.md")

    const decision = await decideStop(stopInput(fixture.repo, home, "s-rebind"))
    expect(decision.decision).toBe("block")
    expect(decision.reason).toContain("ingest")
  })

  it("does not trust legacy boolean ingested markers without ingested_head", async () => {
    const fixture = createGitRepo()
    const home = makeHome()
    startTrackedSession(home, fixture.repo, "s-legacy-ingest")
    commitAndPush(fixture.repo, "change-1.md")
    markIngested(home, "s-legacy-ingest")

    const decision = await decideStop(stopInput(fixture.repo, home, "s-legacy-ingest"))
    expect(decision.decision).toBe("block")
    expect(decision.reason).toContain("ingest")
  })
})

describe("M3 gate matrix — server status recheck on the ingested allow path", () => {
  async function ingestedFixture() {
    const fixture = createGitRepo()
    const home = makeHome()
    startTrackedSession(home, fixture.repo, "s-recheck")
    const head = commitAndPush(fixture.repo, "change-1.md")
    markIngested(home, "s-recheck", head)
    return { fixture, home }
  }

  it("blocks when the server reports a lock on the current branch", async () => {
    const { fixture, home } = await ingestedFixture()
    const decision = await decideStop(stopInput(fixture.repo, home, "s-recheck"), {
      serverStatus: async () => lockedStatus("main"),
    })
    expect(decision.decision).toBe("block")
    expect(decision.reason).toContain("lock")
    expect(decision.reason).toContain("cfl_1")
  })

  it("ignores locks held by other branches", async () => {
    const { fixture, home } = await ingestedFixture()
    const decision = await decideStop(stopInput(fixture.repo, home, "s-recheck"), {
      serverStatus: async () => lockedStatus("other-branch"),
    })
    expect(decision).toEqual({ decision: "allow", reason: INGESTED_ALLOW_REASON })
  })

  it("fail-open: keeps the local allow when the server is unreachable", async () => {
    const { fixture, home } = await ingestedFixture()
    const decision = await decideStop(stopInput(fixture.repo, home, "s-recheck"), {
      serverStatus: async () => {
        throw new Error("ECONNREFUSED")
      },
    })
    expect(decision).toEqual({ decision: "allow", reason: INGESTED_ALLOW_REASON })
  })

  it("does not call the server on non-ingested allow paths (read-only exemption)", async () => {
    const fixture = createGitRepo()
    const home = makeHome()
    startTrackedSession(home, fixture.repo, "s-readonly-norecheck")
    let called = false
    const decision = await decideStop(stopInput(fixture.repo, home, "s-readonly-norecheck"), {
      serverStatus: async () => {
        called = true
        return okStatus()
      },
    })
    expect(decision.decision).toBe("allow")
    expect(called).toBe(false)
  })

  it("allows escaping a server-recheck block through specraft_defer", async () => {
    const { fixture, home } = await ingestedFixture()
    recordDefer(
      home,
      {
        branch: "main",
        head: git(fixture.repo, ["rev-parse", "HEAD"]),
        repoPath: readRepoRoot(fixture.repo),
      },
      "demo in 5 minutes",
    )
    const decision = await decideStop(stopInput(fixture.repo, home, "s-recheck"), {
      serverStatus: async () => lockedStatus("main"),
    })
    expect(decision.decision).toBe("allow")
    expect(decision.reason).toContain("deferred: demo in 5 minutes")
  })
})

describe("M3 defer history, retention GC, and repeated-defer warning", () => {
  it("keeps consumed markers as history instead of deleting them as stale", () => {
    const home = makeHome()
    const keyOne = { branch: "main", head: "a".repeat(40), repoPath: "/repo/x" }
    recordDefer(home, keyOne, "first")
    expect(consumeDefer(home, keyOne)).not.toBeNull()

    expect(consumeDefer(home, { ...keyOne, head: "b".repeat(40) })).toBeNull()
    const history = listDeferHistory(home, { repoPath: "/repo/x", branch: "main" })
    expect(history).toHaveLength(1)
    expect(history[0]?.consumed).toBe(true)
    expect(history[0]?.consumed_at).not.toBeNull()
    expect(countConsumedDefers(home, { repoPath: "/repo/x", branch: "main" })).toBe(1)
  })

  it("records separate history entries for repeated defers on the same key", () => {
    const home = makeHome()
    const key = { branch: "main", head: "a".repeat(40), repoPath: "/repo/x" }
    recordDefer(home, key, "first")
    expect(consumeDefer(home, key)).not.toBeNull()
    recordDefer(home, key, "second")
    expect(consumeDefer(home, key)).not.toBeNull()

    expect(countConsumedDefers(home, { repoPath: "/repo/x", branch: "main" })).toBe(2)
  })

  it("GCs consumed markers older than the retention window on lookups", () => {
    const home = makeHome()
    mkdirSync(defersDir(home), { recursive: true })
    const expired = new Date(Date.now() - CONSUMED_DEFER_RETENTION_MS - 86_400_000).toISOString()
    writeFileSync(
      join(defersDir(home), "old-consumed.json"),
      `${JSON.stringify({
        repo_path: "/repo/x",
        branch: "main",
        head: "c".repeat(40),
        reason: "ancient",
        created_at: expired,
        consumed: true,
        consumed_at: expired,
      })}\n`,
    )

    expect(listDeferHistory(home)).toHaveLength(0)
    expect(readdirSync(defersDir(home))).toHaveLength(0)
  })

  it("adds a repeat warning line to the stop allow reason after N consumed defers", async () => {
    const fixture = createGitRepo()
    const home = makeHome()
    const repoPath = readRepoRoot(fixture.repo)
    for (let index = 0; index < REPEATED_DEFER_WARNING_THRESHOLD - 1; index += 1) {
      const key = { branch: "main", head: `${index}`.repeat(40).slice(0, 40), repoPath }
      recordDefer(home, key, `past defer ${index}`)
      expect(consumeDefer(home, key)).not.toBeNull()
    }
    writeFileSync(join(fixture.repo, "WIP.md"), "needs defer\n")
    recordDefer(home, { branch: "main", head: fixture.first, repoPath }, "repeated escape")

    const decision = await decideStop(stopInput(fixture.repo, home, null))
    expect(decision.decision).toBe("allow")
    expect(decision.reason).toContain("deferred: repeated escape")
    expect(decision.reason).toContain("경고")
    expect(decision.reason).toContain(`${REPEATED_DEFER_WARNING_THRESHOLD}회`)
  })

  it("does not warn below the repeat threshold", async () => {
    const fixture = createGitRepo()
    const home = makeHome()
    writeFileSync(join(fixture.repo, "WIP.md"), "needs defer\n")
    recordDefer(
      home,
      { branch: "main", head: fixture.first, repoPath: readRepoRoot(fixture.repo) },
      "single escape",
    )

    const decision = await decideStop(stopInput(fixture.repo, home, null))
    expect(decision).toEqual({
      decision: "allow",
      deferred: true,
      reason: "deferred: single escape",
    })
  })
})

describe("M3 replay scoping and corrupt marker isolation", () => {
  it("scopes pending replay to the current repo: other-repo pending does not block", () => {
    const repoA = createGitRepo()
    const repoB = createGitRepo()
    const home = makeHome()
    startTrackedSession(home, repoB.repo, "s-elsewhere")

    const decision = decideUserPrompt({
      home,
      repoPath: readRepoRoot(repoA.repo),
      sessionId: null,
    })
    expect(decision.decision).toBe("allow")
  })

  it("blocks on same-repo pending from another session with repo, session, and resolution guidance", () => {
    const fixture = createGitRepo()
    const home = makeHome()
    const repoPath = readRepoRoot(fixture.repo)
    startTrackedSession(home, fixture.repo, "s-current")
    startTrackedSession(home, fixture.repo, "s-other")

    const decision = decideUserPrompt({ home, repoPath, sessionId: "s-current" })
    expect(decision.decision).toBe("block")
    expect(decision.reason).toContain("s-other")
    expect(decision.reason).not.toContain("s-current")
    expect(decision.reason).toContain(repoPath)
    expect(decision.reason).toContain("specraft_ingest")
    expect(decision.reason).toContain("resolve")
  })

  it("includes legacy markers without repo_path and labels them as legacy", () => {
    const fixture = createGitRepo()
    const home = makeHome()
    mkdirSync(sessionsDir(home), { recursive: true })
    writeFileSync(
      join(sessionsDir(home), "s-legacy-pending.json"),
      `${JSON.stringify({
        session_id: "s-legacy-pending",
        started_at: new Date().toISOString(),
        branch: "main",
        started_head: fixture.first,
        ingested: false,
        resolved: false,
      })}\n`,
    )

    const decision = decideUserPrompt({
      home,
      repoPath: readRepoRoot(fixture.repo),
      sessionId: null,
    })
    expect(decision.decision).toBe("block")
    expect(decision.reason).toContain("s-legacy-pending")
    expect(decision.reason).toContain("레거시")
  })

  it("filters pendingReplaySessions by repoPath while keeping legacy null markers", () => {
    const fixture = createGitRepo()
    const home = makeHome()
    const repoPath = readRepoRoot(fixture.repo)
    startTrackedSession(home, fixture.repo, "s-here")
    mkdirSync(sessionsDir(home), { recursive: true })
    writeFileSync(
      join(sessionsDir(home), "s-null-repo.json"),
      `${JSON.stringify({
        session_id: "s-null-repo",
        started_at: new Date().toISOString(),
        branch: "main",
        started_head: null,
        ingested: false,
        resolved: false,
      })}\n`,
    )
    startSession({
      branch: "main",
      home,
      repoPath: "/somewhere/else",
      sessionId: "s-foreign",
    })

    const pending = pendingReplaySessions(home, { repoPath })
    expect(pending.map((marker) => marker.session_id).sort()).toEqual(["s-here", "s-null-repo"])
  })

  it("quarantines corrupt markers as .corrupt instead of failing the whole scan", () => {
    const fixture = createGitRepo()
    const home = makeHome()
    startTrackedSession(home, fixture.repo, "s-good")
    mkdirSync(sessionsDir(home), { recursive: true })
    writeFileSync(join(sessionsDir(home), "s-bad.json"), "{not valid json")

    const pending = pendingReplaySessions(home)
    expect(pending.map((marker) => marker.session_id)).toEqual(["s-good"])
    expect(existsSync(join(sessionsDir(home), "s-bad.json"))).toBe(false)
    expect(existsSync(join(sessionsDir(home), "s-bad.json.corrupt"))).toBe(true)
  })

  it("readSessionOrNull quarantines corrupt markers and returns null", () => {
    const home = makeHome()
    mkdirSync(sessionsDir(home), { recursive: true })
    writeFileSync(join(sessionsDir(home), "s-broken.json"), "][")

    expect(readSessionOrNull(home, "s-broken")).toBeNull()
    expect(existsSync(join(sessionsDir(home), "s-broken.json.corrupt"))).toBe(true)
  })

  it("parallel sessions: both same-repo sessions stay pending without blocking each other's stop", async () => {
    const fixture = createGitRepo()
    const home = makeHome()
    startTrackedSession(home, fixture.repo, "s-par-1")
    startTrackedSession(home, fixture.repo, "s-par-2")

    const stopOne = await decideStop(stopInput(fixture.repo, home, "s-par-1"))
    expect(stopOne.decision).toBe("allow")
    const stopTwo = await decideStop(stopInput(fixture.repo, home, "s-par-2"))
    expect(stopTwo.decision).toBe("allow")

    const repoPath = readRepoRoot(fixture.repo)
    expect(decideUserPrompt({ home, repoPath, sessionId: "s-par-1" }).reason).toContain("s-par-2")
    expect(decideUserPrompt({ home, repoPath, sessionId: "s-par-2" }).reason).toContain("s-par-1")
  })
})
