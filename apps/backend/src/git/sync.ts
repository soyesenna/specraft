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

/** 위키 bare 저장소에 커밋이 존재하는지 확인한다 — changes_since의 since 검증용. */
export function wikiCommitExists(wiki: WikiRepository, commitHash: string): boolean {
  if (!/^[0-9a-f]{4,64}$/.test(commitHash)) {
    return false
  }
  return gitStatus(wiki.gitDir, ["cat-file", "-e", `${commitHash}^{commit}`]) === 0
}

/**
 * 위키 브랜치 존재 여부 — 워크트리/브랜치를 생성하지 않고 확인한다 (parent-aware 분기 판단용).
 * 요청 핫패스에서 호출되므로 git 스폰 없이 wikiBranchTip의 loose-ref/packed-refs 읽기를 재사용한다.
 */
export function wikiBranchExists(dataDir: string, branch: string): boolean {
  if (!isSafeBranchName(branch)) {
    return false
  }
  const barePath = join(dataDir, "wiki.git")
  if (!existsSync(barePath)) {
    return false
  }
  return wikiBranchTip({ branch, gitDir: barePath, root: barePath }) !== null
}

/**
 * 코드 미러에서 branch의 parent 브랜치를 추정한다 (M4+.2 parent-aware 위키 분기).
 * 휴리스틱: branch와의 merge-base가 루트에서 가장 깊은(=가장 늦게 갈라진) 다른 브랜치를
 * parent로 본다. 단 merge-base가 branch tip과 같은데 후보 tip이 더 나아간 경우는
 * branch에서 갈라져 나간 자식(descendant) 브랜치이므로 제외한다 — 자식을 parent로
 * 오인해 위키 계보가 역전되는 것을 막는다. 동률이면 main을 우선하고, 그 외에는
 * 이름순으로 결정적이게 고른다. branch가 코드 미러에 없거나 후보가 없으면 null —
 * 호출부는 main 폴백.
 */
export function inferParentBranchFromCode(mirror: GitMirror, branch: string): string | null {
  if (!isSafeBranchName(branch)) {
    return null
  }
  if (gitStatus(mirror.path, ["show-ref", "--verify", `refs/heads/${branch}`]) !== 0) {
    return null
  }
  const branchTip = gitDir(mirror.path, ["rev-parse", `refs/heads/${branch}`])
  const heads = gitDir(mirror.path, ["for-each-ref", "refs/heads", "--format=%(refname:short)"])
    .split("\n")
    .map((name) => name.trim())
    .filter((name) => name !== "" && name !== branch && isSafeBranchName(name))
  let best: { readonly name: string; readonly depth: number } | null = null
  for (const candidate of heads) {
    let mergeBase: string
    let candidateTip: string
    try {
      mergeBase = gitDir(mirror.path, ["merge-base", branch, candidate])
      candidateTip = gitDir(mirror.path, ["rev-parse", `refs/heads/${candidate}`])
    } catch {
      continue // 공통 조상이 없는 브랜치(orphan 등)는 parent 후보가 아니다.
    }
    if (mergeBase === branchTip && candidateTip !== branchTip) {
      continue // branch의 자식(descendant) — parent 후보에서 제외.
    }
    const depth = Number.parseInt(gitDir(mirror.path, ["rev-list", "--count", mergeBase]), 10)
    if (Number.isNaN(depth)) {
      continue
    }
    const wins =
      best === null ||
      depth > best.depth ||
      (depth === best.depth &&
        best.name !== "main" &&
        (candidate === "main" || candidate < best.name))
    if (wins) {
      best = { name: candidate, depth }
    }
  }
  return best?.name ?? null
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

/*
 * 레포 핸들 프로세스 캐시 — createSkeletonWiki는 요청마다 호출되는데,
 * 브랜치/워크트리 보장에 git 서브프로세스(show-ref·checkout)를 띄운다.
 * 한 번 준비된 (dataDir, branch) 워크트리는 그대로 유지되므로 핸들을 재사용해
 * warm 요청에서 스폰 비용을 0으로 만든다. 워크트리가 외부에서 삭제된 경우만 재준비.
 */
const wikiRepoCache = new Map<string, WikiRepository>()

export function createSkeletonWiki(input: {
  readonly dataDir: string
  readonly branch: string
}): WikiRepository {
  const cacheKey = `${input.dataDir}\u0000${input.branch}`
  const cached = wikiRepoCache.get(cacheKey)
  if (cached && existsSync(join(cached.root, ".git"))) {
    return cached
  }
  const gitDirectory = initializeBareWiki(input.dataDir)
  ensureWikiBranch(gitDirectory, input.branch)
  const repo: WikiRepository = {
    branch: input.branch,
    gitDir: gitDirectory,
    root: ensureWikiWorktree(input.dataDir, gitDirectory, input.branch),
  }
  wikiRepoCache.set(cacheKey, repo)
  return repo
}

/**
 * git 스폰 없이 bare 저장소의 브랜치 tip을 읽는다 — loose ref 파일 우선,
 * gc로 packed-refs에 들어간 경우 폴백 파싱. 그래프 캐시 키 검증용 초저비용 경로.
 */
export function wikiBranchTip(wiki: WikiRepository): string | null {
  try {
    const looseRef = join(wiki.gitDir, "refs", "heads", ...wiki.branch.split("/"))
    if (existsSync(looseRef)) {
      const sha = readFileSync(looseRef, "utf8").trim()
      return /^[0-9a-f]{40,64}$/.test(sha) ? sha : null
    }
    const packedPath = join(wiki.gitDir, "packed-refs")
    if (!existsSync(packedPath)) {
      return null
    }
    const wanted = `refs/heads/${wiki.branch}`
    for (const line of readFileSync(packedPath, "utf8").split("\n")) {
      if (line.startsWith("#") || line.startsWith("^")) {
        continue
      }
      const [sha, ref] = line.trim().split(" ")
      if (ref === wanted && sha && /^[0-9a-f]{40,64}$/.test(sha)) {
        return sha
      }
    }
    return null
  } catch {
    return null
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
  readonly commitHash: string
}

/**
 * 브랜치 로그 한 번 순회로 파일별 마지막 수정 시각/author/커밋 해시를 수집한다.
 * sinceCommit을 주면 `since..branch` 범위만 읽는다 — 캐시된 그래프의 증분 갱신용.
 */
export function listWikiLastModified(
  wiki: WikiRepository,
  sinceCommit?: string,
): ReadonlyMap<string, WikiFileTouch> {
  const output = git(wiki.root, [
    "log",
    sinceCommit ? `${sinceCommit}..${wiki.branch}` : wiki.branch,
    "--name-only",
    `--pretty=format:${historyRecordSeparator}%aI${historyFieldSeparator}%an${historyFieldSeparator}%h`,
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
    const [timestamp, author, commitHash] = (header ?? "").split(historyFieldSeparator)
    if (!timestamp) {
      continue
    }
    for (const rawFile of fileLines) {
      const file = rawFile.trim()
      if (file !== "" && !touched.has(file)) {
        touched.set(file, { timestamp, author: author ?? "", commitHash: commitHash ?? "" })
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
