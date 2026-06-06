import { execFileSync, spawnSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { dirname, join } from "node:path"

import { type BranchLock, BranchLockSchema } from "@specraft/shared"

import type { SpecraftDatabase } from "../storage/database.js"

export type GitMirror = {
  readonly path: string
}

export type WikiRepository = {
  readonly branch: string
  readonly gitDir: string
  readonly root: string
}

export type LockBranchInput = {
  readonly branch: string
  readonly conflictId: string
  readonly detail: string
}

const serverEmail = "server@specraft.local"
const serverName = "specraft-server"

function git(cwd: string, args: readonly string[]): string {
  return execFileSync("git", [...args], { cwd, encoding: "utf8" }).trim()
}

function gitDir(gitDirectory: string, args: readonly string[]): string {
  return execFileSync("git", ["--git-dir", gitDirectory, ...args], {
    encoding: "utf8",
  }).trim()
}

function gitStatus(gitDirectory: string, args: readonly string[]): number {
  return spawnSync("git", ["--git-dir", gitDirectory, ...args], { encoding: "utf8" }).status ?? 1
}

function safeBranchPath(branch: string): string {
  return branch.replaceAll("/", "__")
}

function ensureGitIdentity(repo: string): void {
  git(repo, ["config", "user.email", serverEmail])
  git(repo, ["config", "user.name", serverName])
}

function skeleton(): readonly (readonly [string, string])[] {
  return [
    ["overview.md", "# specraft overview\n\nspecraft keeps one source of project truth.\n"],
    [
      "index.md",
      "# Index\n\n- [Overview](overview.md) - project summary\n- [Log](log.md) - ingest history\n",
    ],
    ["log.md", "# Log\n\n"],
  ]
}

function initializeBareWiki(dataDir: string): string {
  const barePath = join(dataDir, "wiki.git")
  if (existsSync(barePath)) {
    return barePath
  }
  mkdirSync(dataDir, { recursive: true })
  const seedPath = join(dataDir, "wiki-seed")
  rmSync(seedPath, { force: true, recursive: true })
  mkdirSync(seedPath, { recursive: true })
  git(seedPath, ["init", "-b", "main"])
  ensureGitIdentity(seedPath)
  for (const [path, content] of skeleton()) {
    writeFileSync(join(seedPath, path), content)
  }
  git(seedPath, ["add", "."])
  git(seedPath, ["commit", "-m", "init wiki skeleton"])
  git(dataDir, ["init", "--bare", barePath])
  git(seedPath, ["remote", "add", "origin", barePath])
  git(seedPath, ["push", "origin", "main"])
  rmSync(seedPath, { force: true, recursive: true })
  return barePath
}

function ensureWikiBranch(gitDirectory: string, branch: string): void {
  if (gitStatus(gitDirectory, ["show-ref", "--verify", `refs/heads/${branch}`]) === 0) {
    return
  }
  gitDir(gitDirectory, ["branch", branch, "main"])
}

function ensureWikiWorktree(dataDir: string, gitDirectory: string, branch: string): string {
  const root = join(dataDir, "workspace", "wiki", safeBranchPath(branch))
  if (existsSync(join(root, ".git"))) {
    git(root, ["checkout", branch])
    return root
  }
  mkdirSync(dirname(root), { recursive: true })
  gitDir(gitDirectory, ["worktree", "add", root, branch])
  ensureGitIdentity(root)
  return root
}

export function createCodeMirror(input: {
  readonly dataDir: string
  readonly remoteUrl: string
}): GitMirror {
  mkdirSync(input.dataDir, { recursive: true })
  const mirrorPath = join(input.dataDir, "code-mirror.git")
  if (existsSync(mirrorPath)) {
    gitDir(mirrorPath, ["fetch", "--prune"])
  } else {
    git(input.dataDir, ["clone", "--mirror", input.remoteUrl, mirrorPath])
  }
  return { path: mirrorPath }
}

export function commitExists(mirror: GitMirror, commitHash: string): boolean {
  return gitStatus(mirror.path, ["cat-file", "-e", `${commitHash}^{commit}`]) === 0
}

export function sortCommitsTopologically(
  mirror: GitMirror,
  commits: readonly string[],
): readonly string[] {
  return [...commits].sort((left, right) => {
    const leftCount = Number.parseInt(gitDir(mirror.path, ["rev-list", "--count", left]), 10)
    const rightCount = Number.parseInt(gitDir(mirror.path, ["rev-list", "--count", right]), 10)
    return leftCount - rightCount
  })
}

export function createSkeletonWiki(input: {
  readonly dataDir: string
  readonly branch: string
}): WikiRepository {
  const gitDirectory = initializeBareWiki(input.dataDir)
  ensureWikiBranch(gitDirectory, input.branch)
  return {
    branch: input.branch,
    gitDir: gitDirectory,
    root: ensureWikiWorktree(input.dataDir, gitDirectory, input.branch),
  }
}

export function listWikiFiles(wiki: WikiRepository): readonly string[] {
  const entries: string[] = []
  const walk = (directory: string): void => {
    for (const name of readdirSync(directory).sort()) {
      if (name === ".git") {
        continue
      }
      const path = join(directory, name)
      const relative = path.slice(wiki.root.length + 1)
      if (statSync(path).isDirectory()) {
        walk(path)
      } else {
        entries.push(relative)
      }
    }
  }
  walk(wiki.root)
  return entries
}

export function readWikiFile(wiki: WikiRepository, path: string): string {
  return readFileSync(join(wiki.root, path), "utf8")
}

export function writeWikiFile(wiki: WikiRepository, path: string, content: string): void {
  const target = join(wiki.root, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
}

export function commitWiki(
  wiki: WikiRepository,
  input: { readonly message: string; readonly authorName: string; readonly authorEmail: string },
): string {
  git(wiki.root, ["add", "."])
  if (git(wiki.root, ["status", "--porcelain"]) === "") {
    return wikiHead(wiki)
  }
  git(wiki.root, [
    "-c",
    `user.name=${input.authorName}`,
    "-c",
    `user.email=${input.authorEmail}`,
    "commit",
    "--author",
    `${input.authorName} <${input.authorEmail}>`,
    "-m",
    input.message,
  ])
  git(wiki.root, ["push", wiki.gitDir, `HEAD:${wiki.branch}`])
  return wikiHead(wiki)
}

export function wikiHead(wiki: WikiRepository): string {
  return git(wiki.root, ["rev-parse", "HEAD"])
}

export function lockBranch(database: SpecraftDatabase, input: LockBranchInput): void {
  const now = new Date().toISOString()
  database
    .prepare<[string, string, string, string]>(
      "INSERT OR REPLACE INTO conflicts (id, branch, state, detail, created_at) VALUES (?, ?, 'open', ?, ?)",
    )
    .run(input.conflictId, input.branch, input.detail, now)
  database
    .prepare<[string, string, string]>(
      "INSERT OR REPLACE INTO branch_locks (branch, conflict_id, locked_at) VALUES (?, ?, ?)",
    )
    .run(input.branch, input.conflictId, now)
}

export function unlockBranch(database: SpecraftDatabase, branch: string): void {
  database.prepare<[string]>("DELETE FROM branch_locks WHERE branch = ?").run(branch)
}

export function branchLock(database: SpecraftDatabase, branch: string): BranchLock | null {
  const row = database
    .prepare<[string], unknown>(
      "SELECT branch, conflict_id, 'manual merge required' AS reason FROM branch_locks WHERE branch = ?",
    )
    .get(branch)
  const parsed = BranchLockSchema.safeParse(row)
  return parsed.success ? parsed.data : null
}

export function listBranchLocks(database: SpecraftDatabase): readonly BranchLock[] {
  const rows = database
    .prepare<[], unknown>(
      "SELECT branch, conflict_id, 'manual merge required' AS reason FROM branch_locks ORDER BY branch",
    )
    .all()
  return BranchLockSchema.array().parse(rows)
}
