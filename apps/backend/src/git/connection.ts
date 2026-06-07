import { spawnSync } from "node:child_process"

export type GitConnectionResult = {
  readonly status: "ok" | "failed"
  readonly message?: string
}

export type GitConnectionInput = {
  readonly remoteUrl: string
  readonly credential?: string
}

export type GitConnectionTester = (input: GitConnectionInput) => GitConnectionResult

const gitTimeoutMs = 15_000

function withCredential(remoteUrl: string, credential: string): string {
  try {
    const url = new URL(remoteUrl)
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return remoteUrl
    }
    url.username = credential
    url.password = ""
    return url.toString()
  } catch {
    return remoteUrl
  }
}

export function testGitConnection(input: GitConnectionInput): GitConnectionResult {
  const effectiveUrl = input.credential
    ? withCredential(input.remoteUrl, input.credential)
    : input.remoteUrl
  const result = spawnSync("git", ["ls-remote", "--heads", effectiveUrl], {
    encoding: "utf8",
    timeout: gitTimeoutMs,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  })
  if (result.status === 0) {
    return { status: "ok" }
  }
  const message = (result.stderr || result.error?.message || "git ls-remote failed").trim()
  return { status: "failed", message }
}
