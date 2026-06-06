import { spawnSync } from "node:child_process"
import { isAbsolute, normalize, resolve, sep } from "node:path"

const gitTimeoutMs = 30_000
const forbiddenBranchCharacters = new Set(["~", "^", ":", "?", "*", "[", "\\", "]"])

function hasInvalidBranchCharacter(branch: string): boolean {
  return [...branch].some((character) => {
    const codePoint = character.codePointAt(0)
    return (
      codePoint === undefined ||
      codePoint < 32 ||
      codePoint === 127 ||
      /\s/u.test(character) ||
      forbiddenBranchCharacters.has(character)
    )
  })
}

export function isSafeBranchName(branch: string): boolean {
  if (
    branch === "" ||
    branch === "@" ||
    branch.startsWith("-") ||
    branch.endsWith("/") ||
    branch.includes("..") ||
    branch.includes("@{") ||
    hasInvalidBranchCharacter(branch)
  ) {
    return false
  }
  return (
    spawnSync("git", ["check-ref-format", "--allow-onelevel", `refs/heads/${branch}`], {
      encoding: "utf8",
      timeout: gitTimeoutMs,
    }).status === 0
  )
}

export function isSafeWikiPath(path: string): boolean {
  if (path === "" || isAbsolute(path) || path.includes("\\") || path.includes("\0")) {
    return false
  }
  const normalized = normalize(path)
  return normalized === path && normalized !== ".." && !normalized.startsWith(`..${sep}`)
}

export function resolveWikiPath(root: string, path: string): string {
  if (!isSafeWikiPath(path)) {
    throw new RangeError("wiki path escapes root")
  }
  const rootPath = resolve(root)
  const target = resolve(rootPath, path)
  if (target !== rootPath && !target.startsWith(`${rootPath}${sep}`)) {
    throw new RangeError("wiki path escapes root")
  }
  return target
}
