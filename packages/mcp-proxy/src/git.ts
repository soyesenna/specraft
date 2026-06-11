import { execFileSync, spawnSync } from "node:child_process"
import { createHash } from "node:crypto"

import type { GitSnapshot } from "./tools.js"

const gitTimeoutMs = 30_000

function git(cwd: string, args: readonly string[]): string {
  return execFileSync("git", [...args], { cwd, encoding: "utf8", timeout: gitTimeoutMs }).trim()
}

function gitStatus(cwd: string, args: readonly string[]): number {
  return spawnSync("git", [...args], { cwd, encoding: "utf8", timeout: gitTimeoutMs }).status ?? 1
}

export function readGitSnapshot(cwd: string): GitSnapshot {
  return {
    branch: git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]),
    head: git(cwd, ["rev-parse", "HEAD"]),
  }
}

export function readRepoRoot(cwd: string): string {
  return git(cwd, ["rev-parse", "--show-toplevel"])
}

export type DirtyState = {
  readonly clean: boolean
  /** sha256 of the `git status --porcelain` output — the dirty-file-set snapshot (plan M3.1). */
  readonly hash: string
}

export function readDirtyState(cwd: string): DirtyState {
  const porcelain = git(cwd, ["status", "--porcelain"])
  return {
    clean: porcelain === "",
    hash: createHash("sha256").update(porcelain).digest("hex"),
  }
}

export function isWorktreeClean(cwd: string): boolean {
  return readDirtyState(cwd).clean
}

export function readDirtyHash(cwd: string): string {
  return readDirtyState(cwd).hash
}

/**
 * 변경 파일 수집(M4+ specraft_analyze): HEAD 대비 작업트리 diff와 staged diff의
 * 합집합을 레포 루트 상대 경로로 반환한다(중복 제거, 정렬).
 */
export function readChangedFiles(cwd: string): readonly string[] {
  const files = new Set<string>()
  for (const args of [
    ["diff", "--name-only", "HEAD"],
    ["diff", "--name-only", "--cached"],
  ] as const) {
    for (const line of git(cwd, args).split("\n")) {
      if (line !== "") {
        files.add(line)
      }
    }
  }
  return [...files].sort()
}

export type HeadPushState = "pushed" | "not-pushed" | "no-upstream"

/**
 * Distinguishes a missing upstream (`@{u}` unset) from an unpushed HEAD so the
 * stop gate can give `git push -u` guidance instead of a generic push reason.
 */
export function headPushState(cwd: string): HeadPushState {
  if (gitStatus(cwd, ["rev-parse", "--abbrev-ref", "@{u}"]) !== 0) {
    return "no-upstream"
  }
  return gitStatus(cwd, ["merge-base", "--is-ancestor", "HEAD", "@{u}"]) === 0
    ? "pushed"
    : "not-pushed"
}

export function isHeadPushed(cwd: string): boolean {
  return headPushState(cwd) === "pushed"
}
