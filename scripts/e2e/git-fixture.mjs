// 9b. bare-remote git 픽스처 — packages/mcp-proxy/src/proxy.test.ts:27-45 의
// createGitRepo 빌더 패턴을 scripts/e2e 용 독립 모듈로 옮긴 것.
// 임시 작업 레포(main) + bare remote(origin) + push -u 까지 구성한다.
import { execFileSync } from "node:child_process"
import { writeFileSync } from "node:fs"
import { join } from "node:path"

import { tempDir } from "./lib/util.mjs"

/**
 * @param {string} cwd
 * @param {readonly string[]} args
 * @returns {string}
 */
export function git(cwd, args) {
  return execFileSync("git", [...args], { cwd, encoding: "utf8", timeout: 30_000 }).trim()
}

/**
 * upstream(bare remote)이 연결된 작업 레포를 만든다.
 * @param {Array<() => void>} cleanups
 * @returns {{ repo: string, remote: string, firstCommit: string }}
 */
export function createGitFixture(cleanups) {
  const repo = tempDir("specraft-e2e-repo", cleanups)
  git(repo, ["init", "-b", "main"])
  git(repo, ["config", "user.email", "e2e@specraft.local"])
  git(repo, ["config", "user.name", "Specraft E2E"])
  git(repo, ["config", "commit.gpgsign", "false"])
  writeFileSync(
    join(repo, "README.md"),
    "# E2E Fixture App\n\nSpecraft E2E smoke fixture repository.\n",
  )
  writeFileSync(join(repo, ".specraft.json"), '{"server_url":"http://127.0.0.1:4311"}\n')
  git(repo, ["add", "-A"])
  git(repo, ["commit", "-m", "initial"])
  const firstCommit = git(repo, ["rev-parse", "HEAD"])
  const remote = tempDir("specraft-e2e-remote", cleanups)
  git(remote, ["init", "--bare"])
  git(repo, ["remote", "add", "origin", remote])
  git(repo, ["push", "-u", "origin", "main"])
  return { firstCommit, remote, repo }
}

/**
 * 픽스처 레포의 server_url 설정을 실제 백엔드 주소로 덮어쓴다.
 * (.specraft.json은 proxy의 server URL 해석 체인 2순위 — credentials.ts 참조)
 * @param {string} repo
 * @param {string} serverUrl
 * @param {{ strictMode?: boolean }} [options]
 */
export function writeSpecraftConfig(repo, serverUrl, options = {}) {
  const config = { server_url: serverUrl, strict_mode: options.strictMode ?? true }
  writeFileSync(join(repo, ".specraft.json"), `${JSON.stringify(config, null, 2)}\n`)
  git(repo, ["add", ".specraft.json"])
  git(repo, ["commit", "-m", "e2e: point .specraft.json at ephemeral backend"])
  git(repo, ["push"])
}
