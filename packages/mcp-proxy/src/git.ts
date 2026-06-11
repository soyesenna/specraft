import { execFileSync, spawnSync } from "node:child_process"

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

export function isWorktreeClean(cwd: string): boolean {
  return git(cwd, ["status", "--porcelain"]) === ""
}

export function isHeadPushed(cwd: string): boolean {
  return gitStatus(cwd, ["merge-base", "--is-ancestor", "HEAD", "@{u}"]) === 0
}
