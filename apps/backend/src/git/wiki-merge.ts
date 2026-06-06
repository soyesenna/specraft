import { execFileSync, spawnSync } from "node:child_process"
import type { ConflictResolveResponse } from "@specraft/shared"
import { z } from "zod"

import type { SpecraftDatabase } from "../storage/database.js"
import { createSkeletonWiki, type WikiRepository } from "./sync.js"
import { isSafeBranchName } from "./validation.js"

const gitTimeoutMs = 30_000
const serverEmail = "server@specraft.local"
const serverName = "specraft-server"

const ConflictRowSchema = z.object({
  id: z.string(),
  branch: z.string(),
  source_branch: z.string().nullable(),
  detail: z.string(),
})

type MergeResult =
  | { readonly status: "merged" }
  | { readonly status: "locked"; readonly conflictId: string }

function git(cwd: string, args: readonly string[]): string {
  return execFileSync("git", [...args], { cwd, encoding: "utf8", timeout: gitTimeoutMs }).trim()
}

function gitDir(gitDirectory: string, args: readonly string[]): string {
  return execFileSync("git", ["--git-dir", gitDirectory, ...args], {
    encoding: "utf8",
    timeout: gitTimeoutMs,
  }).trim()
}

function gitStatus(cwd: string, args: readonly string[]): number {
  return spawnSync("git", [...args], { cwd, encoding: "utf8", timeout: gitTimeoutMs }).status ?? 1
}

function branchExists(gitDirectory: string, branch: string): boolean {
  return (
    spawnSync("git", ["--git-dir", gitDirectory, "show-ref", "--verify", `refs/heads/${branch}`], {
      encoding: "utf8",
      timeout: gitTimeoutMs,
    }).status === 0
  )
}

function assertSafeBranchName(branch: string): void {
  if (!isSafeBranchName(branch)) {
    throw new RangeError("invalid git branch name")
  }
}

function conflictIdFor(targetBranch: string, sourceBranch: string): string {
  return `conf_${Buffer.from(`${targetBranch}:${sourceBranch}`).toString("base64url").slice(0, 18)}`
}

function lockMergeConflict(
  database: SpecraftDatabase,
  input: { readonly id: string; readonly targetBranch: string; readonly sourceBranch: string },
): void {
  const now = new Date().toISOString()
  database
    .prepare<[string, string, string, string, string]>(
      "INSERT OR REPLACE INTO conflicts (id, branch, source_branch, state, detail, created_at) VALUES (?, ?, ?, 'open', ?, ?)",
    )
    .run(
      input.id,
      input.targetBranch,
      input.sourceBranch,
      `merge conflict from ${input.sourceBranch}`,
      now,
    )
  database
    .prepare<[string, string, string]>(
      "INSERT OR REPLACE INTO branch_locks (branch, conflict_id, locked_at) VALUES (?, ?, ?)",
    )
    .run(input.targetBranch, input.id, now)
}

function ensureIdentity(wiki: WikiRepository): void {
  git(wiki.root, ["config", "user.email", serverEmail])
  git(wiki.root, ["config", "user.name", serverName])
}

function mergeSourceIntoTarget(input: {
  readonly target: WikiRepository
  readonly sourceBranch: string
  readonly strategy?: "ours" | "theirs"
}): boolean {
  ensureIdentity(input.target)
  git(input.target.root, ["fetch", input.target.gitDir, input.sourceBranch])
  const strategyArgs = input.strategy ? ["-X", input.strategy] : []
  const status = gitStatus(input.target.root, ["merge", "--no-edit", ...strategyArgs, "FETCH_HEAD"])
  if (status === 0) {
    git(input.target.root, ["push", input.target.gitDir, `HEAD:${input.target.branch}`])
    return true
  }
  gitStatus(input.target.root, ["merge", "--abort"])
  return false
}

function strategyFromDirective(directive: string): "ours" | "theirs" | undefined {
  const normalized = directive.toLowerCase()
  if (
    normalized.includes("source") ||
    normalized.includes("incoming") ||
    normalized.includes("theirs")
  ) {
    return "theirs"
  }
  if (
    normalized.includes("target") ||
    normalized.includes("current") ||
    normalized.includes("ours")
  ) {
    return "ours"
  }
  return undefined
}

export function createWikiBranchFromParent(input: {
  readonly dataDir: string
  readonly branch: string
  readonly parentBranch: string
}): WikiRepository {
  assertSafeBranchName(input.branch)
  assertSafeBranchName(input.parentBranch)
  const parent = createSkeletonWiki({ dataDir: input.dataDir, branch: input.parentBranch })
  if (!branchExists(parent.gitDir, input.branch)) {
    gitDir(parent.gitDir, ["branch", input.branch, input.parentBranch])
  }
  return createSkeletonWiki({ dataDir: input.dataDir, branch: input.branch })
}

export function mergeWikiBranch(input: {
  readonly database: SpecraftDatabase
  readonly dataDir: string
  readonly targetBranch: string
  readonly sourceBranch: string
}): MergeResult {
  const target = createSkeletonWiki({ dataDir: input.dataDir, branch: input.targetBranch })
  createSkeletonWiki({ dataDir: input.dataDir, branch: input.sourceBranch })
  if (mergeSourceIntoTarget({ target, sourceBranch: input.sourceBranch })) {
    return { status: "merged" }
  }
  const conflictId = conflictIdFor(input.targetBranch, input.sourceBranch)
  lockMergeConflict(input.database, {
    id: conflictId,
    sourceBranch: input.sourceBranch,
    targetBranch: input.targetBranch,
  })
  return { status: "locked", conflictId }
}

export function resolveLockedWikiMerge(
  database: SpecraftDatabase,
  input: {
    readonly dataDir: string
    readonly directive: string
    readonly id: string
    readonly memberId: string
  },
): ConflictResolveResponse {
  const parsed = ConflictRowSchema.safeParse(
    database
      .prepare<[string], unknown>(
        "SELECT id, branch, source_branch, detail FROM conflicts WHERE id = ?",
      )
      .get(input.id),
  )
  if (!parsed.success || parsed.data.source_branch === null) {
    return { status: "still_locked" }
  }
  const target = createSkeletonWiki({ dataDir: input.dataDir, branch: parsed.data.branch })
  const strategy = strategyFromDirective(input.directive)
  const merged = strategy
    ? mergeSourceIntoTarget({ sourceBranch: parsed.data.source_branch, strategy, target })
    : mergeSourceIntoTarget({ sourceBranch: parsed.data.source_branch, target })
  if (!merged) {
    return { status: "still_locked" }
  }
  const now = new Date().toISOString()
  database
    .prepare<[string, string, string, string]>(
      "UPDATE conflicts SET state = 'resolved', resolved_at = ?, resolved_by = ?, directive = ? WHERE id = ?",
    )
    .run(now, input.memberId, input.directive, input.id)
  database.prepare<[string]>("DELETE FROM branch_locks WHERE branch = ?").run(parsed.data.branch)
  return {
    status: "resolved",
    conflict: {
      branch: parsed.data.branch,
      detail: parsed.data.detail,
      id: parsed.data.id,
      source_branch: parsed.data.source_branch,
      state: "resolved",
    },
  }
}
