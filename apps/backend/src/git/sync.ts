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
import { isSafeBranchName, resolveWikiPath } from "./validation.js"

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
const gitTimeoutMs = 30_000

function git(cwd: string, args: readonly string[]): string {
  return execFileSync("git", [...args], { cwd, encoding: "utf8", timeout: gitTimeoutMs }).trim()
}

function gitDir(gitDirectory: string, args: readonly string[]): string {
  return execFileSync("git", ["--git-dir", gitDirectory, ...args], {
    encoding: "utf8",
    timeout: gitTimeoutMs,
  }).trim()
}

function gitStatus(gitDirectory: string, args: readonly string[]): number {
  return (
    spawnSync("git", ["--git-dir", gitDirectory, ...args], {
      encoding: "utf8",
      timeout: gitTimeoutMs,
    }).status ?? 1
  )
}

function safeBranchPath(branch: string): string {
  return branch.replaceAll("/", "__")
}

function assertSafeBranchName(branch: string): void {
  if (!isSafeBranchName(branch)) {
    throw new RangeError("invalid git branch name")
  }
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
  git(dataDir, ["init", "--bare", "-b", "main", barePath])
  git(seedPath, ["remote", "add", "origin", barePath])
  git(seedPath, ["push", "origin", "main"])
  gitDir(barePath, ["symbolic-ref", "HEAD", "refs/heads/main"])
  rmSync(seedPath, { force: true, recursive: true })
  return barePath
}

function ensureWikiBranch(gitDirectory: string, branch: string): void {
  assertSafeBranchName(branch)
  if (gitStatus(gitDirectory, ["show-ref", "--verify", `refs/heads/${branch}`]) === 0) {
    return
  }
  gitDir(gitDirectory, ["branch", branch, "main"])
}

function ensureWikiWorktree(dataDir: string, gitDirectory: string, branch: string): string {
  assertSafeBranchName(branch)
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

export function detectNonFastForward(
  mirror: GitMirror,
  previousTip: string,
  nextTip: string,
): boolean {
  return gitStatus(mirror.path, ["merge-base", "--is-ancestor", previousTip, nextTip]) !== 0
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
  return readFileSync(resolveWikiPath(wiki.root, path), "utf8")
}

export function writeWikiFile(wiki: WikiRepository, path: string, content: string): void {
  const target = resolveWikiPath(wiki.root, path)
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

export type WikiCommitMeta = {
  readonly commitHash: string
  readonly summary: string
  readonly author: string
  readonly timestamp: string
  readonly addedLines: number
  readonly removedLines: number
}

const historyRecordSeparator = "\x1e"
const historyFieldSeparator = "\x1f"

export type WikiFileTouch = {
  readonly timestamp: string
  readonly author: string
}

/** 브랜치 로그 한 번 순회로 파일별 마지막 수정 시각/author 를 수집한다. */
export function listWikiLastModified(wiki: WikiRepository): ReadonlyMap<string, WikiFileTouch> {
  const output = git(wiki.root, [
    "log",
    wiki.branch,
    "--name-only",
    `--pretty=format:${historyRecordSeparator}%aI${historyFieldSeparator}%an`,
  ])
  const touched = new Map<string, WikiFileTouch>()
  if (output === "") {
    return touched
  }
  for (const block of output.split(historyRecordSeparator)) {
    const trimmed = block.trim()
    if (trimmed === "") {
      continue
    }
    const [header, ...fileLines] = trimmed.split("\n")
    const [timestamp, author] = (header ?? "").split(historyFieldSeparator)
    if (!timestamp) {
      continue
    }
    for (const rawFile of fileLines) {
      const file = rawFile.trim()
      if (file !== "" && !touched.has(file)) {
        touched.set(file, { timestamp, author: author ?? "" })
      }
    }
  }
  return touched
}

export function listWikiFileHistory(wiki: WikiRepository, path: string): readonly WikiCommitMeta[] {
  const target = resolveWikiPath(wiki.root, path)
  const output = git(wiki.root, [
    "log",
    wiki.branch,
    "--numstat",
    `--pretty=format:${historyRecordSeparator}%H${historyFieldSeparator}%s${historyFieldSeparator}%an${historyFieldSeparator}%aI`,
    "--",
    target,
  ])
  if (output === "") {
    return []
  }
  const commits: WikiCommitMeta[] = []
  for (const block of output.split(historyRecordSeparator)) {
    const trimmed = block.trim()
    if (trimmed === "") {
      continue
    }
    const newlineIndex = trimmed.indexOf("\n")
    const header = newlineIndex === -1 ? trimmed : trimmed.slice(0, newlineIndex)
    const statBlock = newlineIndex === -1 ? "" : trimmed.slice(newlineIndex + 1)
    const [commitHash, summary, author, timestamp] = header.split(historyFieldSeparator)
    if (!commitHash || !timestamp) {
      continue
    }
    const stat = statBlock
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line !== "")
    const [addedRaw, removedRaw] = stat ? stat.split("\t") : ["0", "0"]
    commits.push({
      commitHash,
      summary: summary ?? "",
      author: author ?? "",
      timestamp,
      addedLines: Number.parseInt(addedRaw ?? "0", 10) || 0,
      removedLines: Number.parseInt(removedRaw ?? "0", 10) || 0,
    })
  }
  return commits
}

export function wikiFileDiff(
  wiki: WikiRepository,
  commitHash: string,
  path: string,
  maxLines: number,
): { readonly added: readonly string[]; readonly removed: readonly string[] } {
  const target = resolveWikiPath(wiki.root, path)
  if (!/^[0-9a-f]{4,64}$/.test(commitHash)) {
    return { added: [], removed: [] }
  }
  const output = git(wiki.root, [
    "show",
    commitHash,
    "--format=",
    "--unified=0",
    "--no-color",
    "--",
    target,
  ])
  const added: string[] = []
  const removed: string[] = []
  for (const line of output.split("\n")) {
    if (line.startsWith("+++") || line.startsWith("---")) {
      continue
    }
    if (line.startsWith("+") && added.length < maxLines) {
      added.push(line.slice(1))
    } else if (line.startsWith("-") && removed.length < maxLines) {
      removed.push(line.slice(1))
    }
  }
  return { added, removed }
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
