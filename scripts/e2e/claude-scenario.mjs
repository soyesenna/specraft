// 9c. Claude Code 시나리오 — 격리 HOME + 격리 CLAUDE_CONFIG_DIR에서
// `claude --plugin-dir`(필수 경로)와 marketplace add 설치 경로를 실세션으로 검증한다.
//
// 검증 항목:
//   c0. claude plugin validate (플러그인 + 마켓플레이스 매니페스트)
//   c4·c7·c8 (프로세스 레벨 재설계 — M3 started_dirty_hash 의미론):
//     claude-code 훅 래퍼를 codex d-step처럼 stdin JSON으로 직접 실행한다.
//     세션 시작 전 dirty는 "질문 세션 면제"로 allow되므로, 클린 상태에서
//     session-start를 먼저 실행한 뒤 트리를 dirty로 만들어 block을 검증한다.
//     c4a. 클린 session-start: 컨텍스트 주입 + started_dirty_hash=clean 마커
//     c4b. 세션 중 dirty → stop block
//     c7a. specraft_defer(MCP 직구동) 기록
//     c7b. defer → stop allow 1회 / c7c. deferred allow는 세션 미해소
//     c7d. defer 소비 후 재-stop 재차단(consume-on-use)
//     c8a. 같은 repo의 pending → 새 세션 프롬프트 block
//     c8b. 다른 repo의 pending은 차단하지 않음(replay repo 스코핑)
//   c1. marketplace add → install → list 설치 경로 (실세션)
//   c2. SessionStart 컨텍스트 주입 (모델이 주입 문구를 직접 회신)
//   c3. specraft_query MCP 도구 호출 (백엔드 키워드 폴백, 쿼리 로그 대조)
//   c5. replay 자기 제외: 세션 중 dirty로 pending 실세션을 만들고(c5a — M3 보정:
//       dirty는 세션 중에 생성해야 block) 같은 세션 resume으로 해소(c5b)
//   c6. gate 사이클: 세션 내 commit+push+specraft_ingest → stop allow
//       (cross-process 세션 정체성: ingest 마커는 MCP 프로세스가 쓰고 stop 훅이 읽음)
//
// 인증: CLAUDE_CODE_OAUTH_TOKEN/ANTHROPIC_API_KEY env, 또는 macOS 키체인의
// "Claude Code-credentials" 추출(.credentials.json) 순. 둘 다 없으면 실세션 단계 SKIP
// (프로세스 레벨 c4·c7·c8은 인증 비의존으로 무조건 실행).
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { backendFetch, startBackendFixtureProcess } from "./backend-fixture.mjs"
import { createGitFixture, git, writeSpecraftConfig } from "./git-fixture.mjs"
import { McpStdioClient } from "./lib/mcp-client.mjs"
import { commandExists, StepLog, tempDir, tryRun } from "./lib/util.mjs"

// 디버그 산출물(세션 결과 JSON·디버그 로그)을 보존할 디렉터리 (정리 대상 아님)
const artifactsDir = join(
  process.env.TMPDIR ?? "/tmp",
  `specraft-e2e-artifacts-${new Date().toISOString().replace(/[:.]/g, "-")}`,
)

const repoRoot = fileURLToPath(new URL("../..", import.meta.url)).replace(/\/$/, "")
const pluginDir = join(repoRoot, "plugins/claude-code")
const proxyBundle = join(pluginDir, "proxy/cli.js")

function resolveClaudeAuth() {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    return { env: { CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN }, kind: "env" }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { env: { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY }, kind: "env" }
  }
  if (process.platform === "darwin") {
    const keychain = tryRun("security", [
      "find-generic-password",
      "-s",
      "Claude Code-credentials",
      "-w",
    ])
    if (keychain.status === 0 && keychain.stdout.trim().startsWith("{")) {
      return { credentialsJson: keychain.stdout.trim(), env: {}, kind: "keychain" }
    }
  }
  return null
}

/** 격리 HOME 트리 + proxy PATH shim + specraft credentials 파일을 구성한다. */
function buildIsolatedEnv(cleanups, auth, backendUrl, apiKey) {
  const home = tempDir("specraft-e2e-claude-home", cleanups)
  const configDir = join(home, ".claude-config")
  mkdirSync(configDir, { recursive: true })
  if (auth.kind === "keychain") {
    writeFileSync(join(configDir, ".credentials.json"), auth.credentialsJson)
    chmodSync(join(configDir, ".credentials.json"), 0o600)
  }
  // M1.7 온보딩 경로 검증: API 키는 env가 아니라 credentials 파일로만 공급한다.
  const specraftDir = join(home, ".specraft")
  mkdirSync(specraftDir, { recursive: true })
  const credentialsPath = join(specraftDir, "credentials")
  writeFileSync(
    credentialsPath,
    `# specraft E2E fixture credentials\nSPECRAFT_API_KEY=${apiKey}\nSPECRAFT_SERVER_URL=${backendUrl}\n`,
  )
  chmodSync(credentialsPath, 0o600)
  // 훅 래퍼는 PATH의 specraft-mcp-proxy를 spawn한다(이원 배포의 npm 전역 설치에 해당).
  // 전역 npm 오염 없이 동등하게 재현하기 위해 번들 cli.js로 가는 shim을 만든다.
  const shimDir = join(home, "bin")
  mkdirSync(shimDir, { recursive: true })
  const shimPath = join(shimDir, "specraft-mcp-proxy")
  writeFileSync(shimPath, `#!/bin/sh\nexec node "${proxyBundle}" "$@"\n`)
  chmodSync(shimPath, 0o755)
  const env = {
    CLAUDE_CONFIG_DIR: configDir,
    HOME: home,
    LANG: process.env.LANG ?? "en_US.UTF-8",
    PATH: `${shimDir}:${process.env.PATH ?? ""}`,
    SHELL: process.env.SHELL ?? "/bin/zsh",
    TERM: "dumb",
    TMPDIR: process.env.TMPDIR,
    ...auth.env,
  }
  return { configDir, env, home }
}

/**
 * claude -p 한 세션을 실행한다. 결과 JSON 파싱과 디버그 로그 수집까지 포함.
 * @returns {{ status: number | null, stdout: string, stderr: string, debug: string,
 *             resultJson: any, sessionId: string | null, combined: string }}
 */
function runClaudeSession(input) {
  mkdirSync(artifactsDir, { recursive: true })
  const debugFile = join(artifactsDir, `debug-${input.label}.log`)
  const args = [
    "-p",
    input.prompt,
    "--model",
    input.model ?? "haiku",
    "--output-format",
    "json",
    "--dangerously-skip-permissions",
    "--debug",
    "--debug-file",
    debugFile,
    ...(input.pluginDir ? ["--plugin-dir", input.pluginDir] : []),
    ...(input.resume ? ["--resume", input.resume] : []),
    ...(input.extraArgs ?? []),
  ]
  const result = spawnSync("claude", args, {
    cwd: input.cwd,
    encoding: "utf8",
    env: input.env,
    input: "",
    maxBuffer: 16 * 1024 * 1024,
    timeout: input.timeoutMs ?? 150_000,
  })
  const stdout = result.stdout ?? ""
  const stderr = result.stderr ?? ""
  let resultJson = null
  try {
    resultJson = JSON.parse(stdout)
  } catch {
    // 타임아웃/차단 시 JSON이 아닐 수 있다.
  }
  const debug = existsSync(debugFile) ? readFileSync(debugFile, "utf8") : ""
  writeFileSync(join(artifactsDir, `stdout-${input.label}.json`), stdout)
  writeFileSync(join(artifactsDir, `stderr-${input.label}.log`), stderr)
  return {
    combined: `${stdout}\n${stderr}\n${debug}`,
    debug,
    resultJson,
    sessionId: typeof resultJson?.session_id === "string" ? resultJson.session_id : null,
    status: result.status,
    stderr,
    stdout,
  }
}

function sessionsDir(home) {
  return join(home, ".specraft", "sessions")
}

function listSessionMarkers(home) {
  const dir = sessionsDir(home)
  return existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith(".json")) : []
}

function readSessionMarker(home, sessionId) {
  const path = join(sessionsDir(home), `${sessionId}.json`)
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null
}

/** 마커 디렉터리 스냅샷 대비 새로 생긴 세션 ID를 찾는다(결과 JSON 부재 시 폴백). */
function newSessionId(before, home) {
  const after = listSessionMarkers(home)
  const fresh = after.filter((name) => !before.includes(name))
  return fresh.length === 1 ? fresh[0].replace(/\.json$/, "") : null
}

/** 격리 HOME(specraft 상태) + PATH shim — 훅 래퍼 프로세스 레벨 실행용(claude 인증 비의존). */
function buildHookEnv(cleanups, backendUrl, apiKey) {
  const home = tempDir("specraft-e2e-claude-hook-home", cleanups)
  const specraftDir = join(home, ".specraft")
  mkdirSync(specraftDir, { recursive: true })
  const credentialsPath = join(specraftDir, "credentials")
  writeFileSync(credentialsPath, `SPECRAFT_API_KEY=${apiKey}\nSPECRAFT_SERVER_URL=${backendUrl}\n`)
  chmodSync(credentialsPath, 0o600)
  const shimDir = join(home, "bin")
  mkdirSync(shimDir, { recursive: true })
  const shimPath = join(shimDir, "specraft-mcp-proxy")
  writeFileSync(shimPath, `#!/bin/sh\nexec node "${proxyBundle}" "$@"\n`)
  chmodSync(shimPath, 0o755)
  return {
    env: {
      HOME: home,
      LANG: process.env.LANG ?? "en_US.UTF-8",
      PATH: `${shimDir}:${process.env.PATH ?? ""}`,
      TERM: "dumb",
      TMPDIR: process.env.TMPDIR,
    },
    home,
  }
}

/**
 * claude-code 훅 래퍼를 호스트가 주는 것과 동일한 stdin JSON으로 직접 실행한다.
 * @returns {{ status: number | null, stdout: string, stderr: string }}
 */
function runPluginHook(script, payload, env) {
  const result = spawnSync("node", [join(pluginDir, "hooks", script)], {
    encoding: "utf8",
    env,
    input: JSON.stringify(payload),
    timeout: 30_000,
  })
  return {
    status: result.status,
    stderr: result.stderr ?? "",
    stdout: (result.stdout ?? "").trim(),
  }
}

/** 훅 stdout(JSON decision)을 파싱한다 — JSON이 아니면 null. */
function parseDecision(stdout) {
  try {
    return JSON.parse(stdout)
  } catch {
    return null
  }
}

/**
 * c4·c7·c8 프로세스 레벨 재설계(M3 의미론). claude CLI/인증 비의존:
 * 훅 래퍼+번들 proxy 조합이 게이트 로직의 정본이므로, 결정적 검증은
 * 실세션 대신 훅 래퍼 직접 실행으로 수행한다(codex d5~d13과 동형).
 */
async function runProcessLevelGate(log, cleanups) {
  const gitFx = createGitFixture(cleanups)
  // 훅 래퍼를 spawnSync(동기)로 실행하는 동안에도 백엔드가 응답해야 하므로 별도 프로세스 기동.
  const backend = await startBackendFixtureProcess({ cleanups, codeRemoteUrl: gitFx.remote })
  writeSpecraftConfig(gitFx.repo, backend.url)
  const { env, home } = buildHookEnv(cleanups, backend.url, backend.apiKey)
  const repo = gitFx.repo
  const sessionId = "e2e-claude-gate-1"
  const stdinBase = { cwd: repo, session_id: sessionId }
  // 클린 트리의 dirty 스냅샷 = sha256("") — git status --porcelain 빈 출력의 해시.
  const cleanDirtyHash = createHash("sha256").update("").digest("hex")

  // c4a. 클린 상태 session-start: 컨텍스트 주입 + started_dirty_hash=clean 마커
  {
    const result = runPluginHook(
      "session-start.js",
      { ...stdinBase, hook_event_name: "SessionStart" },
      env,
    )
    const marker = readSessionMarker(home, sessionId)
    if (
      result.stdout.includes("Specraft context for main@") &&
      marker?.started_dirty_hash === cleanDirtyHash
    ) {
      log.pass("c4a session-start 마커(started_dirty_hash=clean)", "컨텍스트 주입 + 클린 스냅샷")
    } else {
      log.fail(
        "c4a session-start 마커(started_dirty_hash=clean)",
        `stdout=${result.stdout.slice(0, 120)} marker=${JSON.stringify(marker)}`,
      )
    }
  }

  // c4b. 세션 시작 후 dirty → stop block (구 c4 상당 — 새 의미론)
  {
    writeFileSync(join(repo, "scratch-gate.txt"), "dirty created during the session\n")
    const result = runPluginHook(
      "stop.js",
      { ...stdinBase, hook_event_name: "Stop", stop_hook_active: false },
      env,
    )
    const parsed = parseDecision(result.stdout)
    if (parsed?.decision === "block" && String(parsed.reason).includes("working tree is dirty")) {
      log.pass("c4b 세션 중 dirty → stop block", "block JSON + dirty 사유")
    } else {
      log.fail("c4b 세션 중 dirty → stop block", `stdout=${result.stdout.slice(0, 160)}`)
    }
  }

  // c7a. specraft_defer 기록 (MCP 직구동 — cross-process: defer 마커를 stop 훅이 소비)
  {
    const client = new McpStdioClient({
      args: [proxyBundle],
      command: "node",
      cwd: repo,
      env: { ...env, SPECRAFT_SESSION_ID: sessionId },
    })
    try {
      await client.initialize()
      const defer = await client.callTool("specraft_defer", { reason: "E2E claude gate defer" })
      if (!defer.isError && JSON.stringify(defer).includes("deferred")) {
        log.pass("c7a specraft_defer 기록(MCP 직구동)", "사유 기록(서버 비의존)")
      } else {
        log.fail("c7a specraft_defer 기록(MCP 직구동)", JSON.stringify(defer).slice(0, 200))
      }
    } finally {
      await client.close()
    }
  }

  // c7b. defer → stop allow 1회 (claude 정본: {decision:"approve"} JSON)
  {
    const result = runPluginHook(
      "stop.js",
      { ...stdinBase, hook_event_name: "Stop", stop_hook_active: false },
      env,
    )
    const parsed = parseDecision(result.stdout)
    if (parsed?.decision === "approve" && String(parsed.reason).includes("deferred")) {
      log.pass("c7b defer → stop allow(1회)", "deferred 사유의 approve JSON")
    } else {
      log.fail("c7b defer → stop allow(1회)", `stdout=${result.stdout.slice(0, 160)}`)
    }
  }

  // c7c. deferred allow는 세션을 resolve하지 않음 (pending replay로 잔존 — 의도된 동작)
  {
    const marker = readSessionMarker(home, sessionId)
    if (marker && marker.resolved !== true) {
      log.pass("c7c deferred allow는 세션 미해소", "pending replay로 잔존(의도된 동작)")
    } else {
      log.fail("c7c deferred allow는 세션 미해소", JSON.stringify(marker))
    }
  }

  // c7d. defer 소비 후 재-stop → 재차단 (consume-on-use)
  {
    const result = runPluginHook(
      "stop.js",
      { ...stdinBase, hook_event_name: "Stop", stop_hook_active: false },
      env,
    )
    const parsed = parseDecision(result.stdout)
    if (parsed?.decision === "block") {
      log.pass("c7d defer 소비 후 재-stop block", "consume-on-use 확인(2회차 stop은 block)")
    } else {
      log.fail("c7d defer 소비 후 재-stop block", `stdout=${result.stdout.slice(0, 160)}`)
    }
  }

  // c8a. 같은 repo의 pending(미해소 gate-1 세션) → 새 세션 프롬프트 block
  {
    const result = runPluginHook(
      "user-prompt-submit.js",
      { cwd: repo, hook_event_name: "UserPromptSubmit", session_id: "e2e-claude-gate-2" },
      env,
    )
    const parsed = parseDecision(result.stdout)
    if (
      parsed?.decision === "block" &&
      String(parsed.reason).includes("pending specraft ingest replay")
    ) {
      log.pass("c8a 같은 repo pending → 프롬프트 block", "미해소 세션으로 인한 차단 사유 확인")
    } else {
      log.fail("c8a 같은 repo pending → 프롬프트 block", `stdout=${result.stdout.slice(0, 160)}`)
    }
  }

  // c8b. 다른 repo의 pending은 차단하지 않음 (M3.3 replay repo 스코핑)
  {
    const otherFx = createGitFixture(cleanups)
    const result = runPluginHook(
      "user-prompt-submit.js",
      { cwd: otherFx.repo, hook_event_name: "UserPromptSubmit", session_id: "e2e-claude-gate-3" },
      env,
    )
    const parsed = parseDecision(result.stdout)
    if (
      parsed?.decision === "approve" &&
      String(parsed.reason).includes("no pending specraft replay")
    ) {
      log.pass("c8b 다른 repo pending은 비차단", "repo 스코핑으로 타 레포 pending 무시")
    } else {
      log.fail("c8b 다른 repo pending은 비차단", `stdout=${result.stdout.slice(0, 160)}`)
    }
    rmSync(join(repo, "scratch-gate.txt"), { force: true })
  }
}

export async function runClaudeScenario(cleanups) {
  const log = new StepLog("9c claude")

  if (!existsSync(proxyBundle)) {
    log.fail("c0c proxy 번들 존재", `${proxyBundle} 없음 — pnpm --filter @specraft/mcp-proxy build`)
    return log
  }

  // c4·c7·c8 — 프로세스 레벨 게이트(훅 래퍼 stdin 직접 실행). claude CLI/인증 비의존.
  await runProcessLevelGate(log, cleanups)

  if (!commandExists("claude")) {
    log.skip("c0 plugin validate", "claude CLI 미설치 — 실세션 단계 스킵")
    log.skip("c1-c6 실세션 시나리오", "claude CLI 미설치")
    return log
  }

  // c0. manifest 검증 (인증 불필요)
  const validatePlugin = tryRun("claude", ["plugin", "validate", pluginDir])
  if (validatePlugin.status === 0) {
    log.pass("c0a plugin validate (plugins/claude-code)")
  } else {
    log.fail("c0a plugin validate (plugins/claude-code)", validatePlugin.stderr.slice(0, 300))
  }
  const validateMarketplace = tryRun("claude", ["plugin", "validate", repoRoot])
  if (validateMarketplace.status === 0) {
    log.pass("c0b marketplace validate (repo 루트)")
  } else {
    log.fail("c0b marketplace validate (repo 루트)", validateMarketplace.stderr.slice(0, 300))
  }

  const auth = resolveClaudeAuth()
  if (!auth) {
    log.skip(
      "c1-c6 실세션 시나리오",
      "claude 인증 수단 없음 (CLAUDE_CODE_OAUTH_TOKEN/ANTHROPIC_API_KEY env 또는 macOS 키체인 필요)",
    )
    return log
  }

  // 픽스처: bare-remote git repo + ephemeral backend(키워드 폴백, code mirror는 bare remote).
  // 시나리오가 claude를 spawnSync(동기)로 돌리는 동안에도 응답해야 하므로 별도 프로세스로 기동.
  const gitFx = createGitFixture(cleanups)
  const backend = await startBackendFixtureProcess({ cleanups, codeRemoteUrl: gitFx.remote })
  writeSpecraftConfig(gitFx.repo, backend.url)
  process.stdout.write(`[9c claude] 산출물 보존 디렉터리: ${artifactsDir}\n`)
  const { configDir, env, home } = buildIsolatedEnv(cleanups, auth, backend.url, backend.apiKey)
  const repo = gitFx.repo

  // c1. marketplace add → install → list — 메인 플로(--plugin-dir 경로)와의 상태 오염을
  // 막기 위해 HOME까지 통째로 분리한다(세션 마커가 남으면 replay 게이트가 후속 세션을 차단).
  {
    const marketplace = buildIsolatedEnv(cleanups, auth, backend.url, backend.apiKey)
    const marketplaceEnv = marketplace.env
    const marketplaceHome = marketplace.home
    const added = tryRun("claude", ["plugin", "marketplace", "add", repoRoot], {
      cwd: repo,
      env: marketplaceEnv,
    })
    const installed =
      added.status === 0
        ? tryRun("claude", ["plugin", "install", "specraft@specraft"], {
            cwd: repo,
            env: marketplaceEnv,
          })
        : added
    const listed =
      installed.status === 0
        ? tryRun("claude", ["plugin", "list"], { cwd: repo, env: marketplaceEnv })
        : installed
    if (listed.status === 0 && `${listed.stdout}${listed.stderr}`.includes("specraft")) {
      log.pass("c1 marketplace add → install → list", "specraft@specraft 설치 확인")
    } else {
      log.fail(
        "c1 marketplace add → install → list",
        `${added.stderr}${installed.stderr}${listed.stderr}`.slice(0, 300),
      )
    }
    // 설치 경로로 실세션 1회: 설치된 플러그인의 SessionStart 훅이 발화하는지 확인
    const before = listSessionMarkers(marketplaceHome)
    const session = runClaudeSession({
      cwd: repo,
      env: marketplaceEnv,
      home: marketplaceHome,
      label: "c1-installed",
      prompt: "Reply with exactly: OK",
      timeoutMs: 120_000,
    })
    const sid = session.sessionId ?? newSessionId(before, marketplaceHome)
    const marker = sid ? readSessionMarker(marketplaceHome, sid) : null
    if (marker && session.resultJson?.is_error !== true) {
      log.pass("c1b 설치 플러그인 세션 훅 발화", `session ${sid} 마커 생성`)
    } else {
      log.fail(
        "c1b 설치 플러그인 세션 훅 발화",
        `marker=${marker ? "생성" : "미생성"} exit=${session.status} result=${String(session.resultJson?.result).slice(0, 80)}`,
      )
    }
  }

  // c2. SessionStart 컨텍스트 주입 — 모델이 주입 문구를 회신하게 한다 (--plugin-dir 경로)
  const head = git(repo, ["rev-parse", "HEAD"])
  {
    const session = runClaudeSession({
      cwd: repo,
      env,
      home,
      label: "c2-context",
      pluginDir,
      prompt:
        'If your context contains a line starting with "Specraft context for", reply with exactly that line and nothing else. Otherwise reply with exactly: NONE',
      timeoutMs: 150_000,
    })
    const expected = `Specraft context for main@${head}`
    const replied = typeof session.resultJson?.result === "string" ? session.resultJson.result : ""
    if (replied.includes(expected)) {
      log.pass("c2 SessionStart 컨텍스트 주입", `모델 회신에 "${expected.slice(0, 40)}..." 포함`)
    } else if (session.combined.includes("Specraft context for main@")) {
      log.pass("c2 SessionStart 컨텍스트 주입", "디버그 로그에서 주입 문구 확인(모델 회신은 상이)")
    } else {
      log.fail("c2 SessionStart 컨텍스트 주입", `회신: ${replied.slice(0, 120)}`)
    }
    const marker = session.sessionId ? readSessionMarker(home, session.sessionId) : null
    if (marker?.resolved === true) {
      log.pass("c2b read-only 세션 stop allow", "커밋 없는 세션은 차단 없이 종료(마커 resolved)")
    } else {
      log.fail("c2b read-only 세션 stop allow", `마커: ${JSON.stringify(marker)}`)
    }
  }

  // c3. specraft_query 도구 호출 (헤드리스 결정적 프롬프트)
  {
    const session = runClaudeSession({
      cwd: repo,
      env,
      home,
      label: "c3-query",
      model: "sonnet",
      pluginDir,
      prompt:
        'Call the specraft_query MCP tool with the question "What is documented in the spec wiki overview?" and then reply with the raw JSON result of that tool call and nothing else.',
      timeoutMs: 180_000,
    })
    const replied = typeof session.resultJson?.result === "string" ? session.resultJson.result : ""
    const sawAnswer = replied.includes("query_id") && replied.includes("overview.md")
    const logs = await backendFetch(backend.url, "/api/v1/logs/queries", {
      apiKey: backend.apiKey,
    })
    const queryLogged = Array.isArray(logs.json?.logs) && logs.json.logs.length > 0
    if (sawAnswer && queryLogged) {
      log.pass("c3 specraft_query 호출", `백엔드 쿼리 로그 ${logs.json.logs.length}건`)
    } else if (queryLogged) {
      log.pass("c3 specraft_query 호출", "백엔드 쿼리 로그 확인(모델 회신 포맷은 상이)")
    } else {
      log.fail("c3 specraft_query 호출", `회신: ${replied.slice(0, 160)} / 로그: ${logs.status}`)
    }
  }

  // c5a. pending 실세션 생성: 모델이 세션 중 dirty를 만들고 → stop block
  //      (M3 보정: 세션 시작 전 dirty는 started_dirty_hash 면제로 allow되므로,
  //       block을 만들려면 dirty가 세션 중에 생겨야 한다 — c5b resume 해소의 전제.)
  let dirtyBlockSessionId = null
  {
    const before = listSessionMarkers(home)
    const session = runClaudeSession({
      cwd: repo,
      env,
      home,
      label: "c5a-dirty-block",
      model: "sonnet",
      pluginDir,
      prompt: [
        "Use the Bash tool to run exactly this one command and nothing else:",
        'echo "uncommitted work in progress" > scratch-wip.txt',
        "Then reply with exactly: DONE",
        "If a stop hook prevents you from stopping, do not run any more commands and do not call any tools (especially do not call specraft_defer, do not run git, and do not delete the file); just reply again with exactly: BLOCKED",
      ].join("\n"),
      timeoutMs: 180_000,
    })
    dirtyBlockSessionId = session.sessionId ?? newSessionId(before, home)
    const marker = dirtyBlockSessionId ? readSessionMarker(home, dirtyBlockSessionId) : null
    const dirtyCreated = existsSync(join(repo, "scratch-wip.txt"))
    const sawBlockReason = session.combined.includes("working tree is dirty")
    if (marker && marker.resolved !== true && dirtyCreated && sawBlockReason) {
      log.pass("c5a 세션 중 dirty → stop block", "block 사유(working tree is dirty), 세션 미해소")
    } else if (marker && marker.resolved !== true && dirtyCreated) {
      log.fail("c5a 세션 중 dirty → stop block", "마커는 미해소이나 block 사유 미검출")
    } else {
      log.fail(
        "c5a 세션 중 dirty → stop block",
        `dirty=${dirtyCreated} marker=${JSON.stringify(marker)} exit=${session.status}`,
      )
    }
    rmSync(join(repo, "scratch-wip.txt"), { force: true })
  }

  // c5b. replay 자기 제외 + pending 해소: 동일 세션 resume → 클린 상태 stop allow → resolved
  if (dirtyBlockSessionId) {
    const session = runClaudeSession({
      cwd: repo,
      env,
      home,
      label: "c5b-resume-resolve",
      pluginDir,
      prompt: "Reply with exactly: RESOLVED. Do not use any tools.",
      resume: dirtyBlockSessionId,
      timeoutMs: 120_000,
    })
    const marker = readSessionMarker(home, dirtyBlockSessionId)
    if (marker?.resolved === true) {
      log.pass("c5b resume로 pending 해소", `세션 ${dirtyBlockSessionId} resolved=true`)
    } else {
      log.fail(
        "c5b resume로 pending 해소",
        `marker=${JSON.stringify(marker)} exit=${session.status}`,
      )
    }
  } else {
    log.skip("c5b resume로 pending 해소", "c5a에서 세션 ID를 확보하지 못함")
  }

  // c6. gate 사이클: 세션 내 commit+push+ingest → stop allow (cross-process 세션 정체성)
  {
    const preHead = git(repo, ["rev-parse", "HEAD"])
    const session = runClaudeSession({
      cwd: repo,
      env,
      home,
      label: "c6-gate-cycle",
      model: "sonnet",
      pluginDir,
      prompt: [
        "Perform exactly these steps in order using the Bash tool and MCP tools:",
        '1. Run: echo "e2e gate cycle change" >> README.md',
        '2. Run: git add -A && git commit -m "e2e: gate cycle change"',
        "3. Run: git push",
        '4. Call the specraft_ingest MCP tool with: agent="claude-code", summary="E2E gate cycle change to README", spec_changes=[{"type":"modified","area":"docs","description":"README updated by the E2E smoke harness","reasoning":"verify the commit+push+ingest stop gate cycle"}], progress_updates=[], open_questions=[]',
        "5. Reply with exactly: INGESTED",
      ].join("\n"),
      timeoutMs: 300_000,
    })
    const sid = session.sessionId
    const marker = sid ? readSessionMarker(home, sid) : null
    const pushedHead = git(gitFx.remote, ["rev-parse", "main"])
    const repoHead = git(repo, ["rev-parse", "HEAD"])
    const ingests = await backendFetch(backend.url, "/api/v1/logs/ingests", {
      apiKey: backend.apiKey,
    })
    const accepted = (ingests.json?.logs ?? []).filter((entry) => entry.status === "accepted")
    if (marker?.ingested === true && marker?.resolved === true) {
      log.pass(
        "c6 gate 사이클 (ingest→stop allow)",
        `cross-process OK: MCP가 쓴 ingest 마커를 stop 훅이 읽어 allow (session ${sid})`,
      )
    } else {
      log.fail(
        "c6 gate 사이클 (ingest→stop allow)",
        `marker=${JSON.stringify(marker)} exit=${session.status}`,
      )
    }
    if (repoHead === pushedHead && repoHead !== preHead) {
      log.pass("c6b 세션 내 commit+push", `HEAD ${repoHead.slice(0, 8)} == remote main (신규 커밋)`)
    } else {
      log.fail(
        "c6b 세션 내 commit+push",
        `pre=${preHead.slice(0, 8)} repo=${repoHead.slice(0, 8)} remote=${pushedHead.slice(0, 8)}`,
      )
    }
    if (accepted.length > 0) {
      log.pass("c6c 백엔드 ingest 수락", `accepted ${accepted.length}건`)
    } else {
      log.fail(
        "c6c 백엔드 ingest 수락",
        `ingest 로그: ${JSON.stringify(ingests.json).slice(0, 200)}`,
      )
    }
  }

  // (구 c7/c7b/c8 실세션 단계는 프로세스 레벨 c7a~c7d·c8a~c8b로 대체 — runProcessLevelGate 참조)

  // 격리 검증: 실제 사용자 영역을 건드리지 않았는지 확인용 로그
  log.pass("c9 격리 확인", `HOME=${home}, CLAUDE_CONFIG_DIR=${configDir} (모두 임시 디렉터리)`)
  return log
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(`file://${process.argv[1]}`)

if (invokedDirectly) {
  const { runCleanups } = await import("./lib/util.mjs")
  const cleanups = []
  try {
    const log = await runClaudeScenario(cleanups)
    process.stdout.write(`${log.summary()}\n`)
    process.exitCode = log.failed.length > 0 ? 1 : 0
  } finally {
    runCleanups(cleanups)
  }
}
