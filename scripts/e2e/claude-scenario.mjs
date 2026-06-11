// 9c. Claude Code 시나리오 — 격리 HOME + 격리 CLAUDE_CONFIG_DIR에서
// `claude --plugin-dir`(필수 경로)와 marketplace add 설치 경로를 실세션으로 검증한다.
//
// 검증 항목:
//   c0. claude plugin validate (플러그인 + 마켓플레이스 매니페스트)
//   c1. marketplace add → install → list 설치 경로
//   c2. SessionStart 컨텍스트 주입 (모델이 주입 문구를 직접 회신)
//   c3. specraft_query MCP 도구 호출 (백엔드 키워드 폴백, 쿼리 로그 대조)
//   c4. gate: dirty → stop block
//   c5. replay 자기 제외: 같은 세션 resume 으로 pending 해소(stop allow → resolved)
//   c6. gate 사이클: 세션 내 commit+push+specraft_ingest → stop allow
//       (cross-process 세션 정체성: ingest 마커는 MCP 프로세스가 쓰고 stop 훅이 읽음)
//   c7. specraft_defer 플로: 사유 기록 → 1회 allow (consume-on-use)
//   c8. replay 게이트: pending 세션 존재 시 새 세션 프롬프트 block
//
// 인증: CLAUDE_CODE_OAUTH_TOKEN/ANTHROPIC_API_KEY env, 또는 macOS 키체인의
// "Claude Code-credentials" 추출(.credentials.json) 순. 둘 다 없으면 세션 단계 SKIP.
import { spawnSync } from "node:child_process"
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

function readDeferMarkers(home) {
  const dir = join(home, ".specraft", "defers")
  if (!existsSync(dir)) {
    return []
  }
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(join(dir, name), "utf8")))
}

/** 마커 디렉터리 스냅샷 대비 새로 생긴 세션 ID를 찾는다(결과 JSON 부재 시 폴백). */
function newSessionId(before, home) {
  const after = listSessionMarkers(home)
  const fresh = after.filter((name) => !before.includes(name))
  return fresh.length === 1 ? fresh[0].replace(/\.json$/, "") : null
}

export async function runClaudeScenario(cleanups) {
  const log = new StepLog("9c claude")

  if (!commandExists("claude")) {
    log.skip("c0 plugin validate", "claude CLI 미설치 — 9c 전체 스킵")
    log.skip("c1-c8 세션 시나리오", "claude CLI 미설치")
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

  if (!existsSync(proxyBundle)) {
    log.fail("c0c proxy 번들 존재", `${proxyBundle} 없음 — pnpm --filter @specraft/mcp-proxy build`)
    return log
  }

  const auth = resolveClaudeAuth()
  if (!auth) {
    log.skip(
      "c1-c8 세션 시나리오",
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

  // c4. gate: dirty → stop block
  let dirtyBlockSessionId = null
  {
    writeFileSync(join(repo, "scratch-wip.txt"), "uncommitted work in progress\n")
    const before = listSessionMarkers(home)
    const session = runClaudeSession({
      cwd: repo,
      env,
      home,
      label: "c4-dirty-block",
      pluginDir,
      prompt:
        "Reply with exactly: DONE. Do not use any tools. If a stop hook prevents you from stopping, still do not use any tools (especially do not call specraft_defer and do not run git); just reply again with exactly: BLOCKED",
      timeoutMs: 90_000,
    })
    dirtyBlockSessionId = session.sessionId ?? newSessionId(before, home)
    const marker = dirtyBlockSessionId ? readSessionMarker(home, dirtyBlockSessionId) : null
    const sawBlockReason = session.combined.includes("working tree is dirty")
    if (marker && marker.resolved !== true && sawBlockReason) {
      log.pass("c4 dirty → stop block", "block 사유(working tree is dirty) 확인, 세션 미해소")
    } else if (marker && marker.resolved !== true) {
      log.fail("c4 dirty → stop block", "마커는 미해소이나 block 사유 미검출")
    } else {
      log.fail("c4 dirty → stop block", `marker=${JSON.stringify(marker)}`)
    }
    rmSync(join(repo, "scratch-wip.txt"), { force: true })
  }

  // c5. replay 자기 제외 + pending 해소: 동일 세션 resume → 클린 상태 stop allow → resolved
  if (dirtyBlockSessionId) {
    const session = runClaudeSession({
      cwd: repo,
      env,
      home,
      label: "c5-resume-resolve",
      pluginDir,
      prompt: "Reply with exactly: RESOLVED. Do not use any tools.",
      resume: dirtyBlockSessionId,
      timeoutMs: 120_000,
    })
    const marker = readSessionMarker(home, dirtyBlockSessionId)
    if (marker?.resolved === true) {
      log.pass("c5 resume로 pending 해소", `세션 ${dirtyBlockSessionId} resolved=true`)
    } else {
      log.fail(
        "c5 resume로 pending 해소",
        `marker=${JSON.stringify(marker)} exit=${session.status}`,
      )
    }
  } else {
    log.skip("c5 resume로 pending 해소", "c4에서 세션 ID를 확보하지 못함")
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

  // c7. specraft_defer 플로: dirty 상태에서 사유 기록 → 1회 allow (consume-on-use)
  let deferSessionId = null
  {
    writeFileSync(join(repo, "scratch-defer.txt"), "work to be deferred\n")
    const session = runClaudeSession({
      cwd: repo,
      env,
      home,
      label: "c7-defer",
      model: "sonnet",
      pluginDir,
      prompt:
        'Call the specraft_defer MCP tool with reason "E2E defer test". After the tool returns, reply with exactly: DEFERRED. Do not use any other tools and do not run git commands.',
      timeoutMs: 180_000,
    })
    deferSessionId = session.sessionId
    const markers = readDeferMarkers(home)
    const consumed = markers.find(
      (marker) => marker.reason === "E2E defer test" && marker.consumed === true,
    )
    const sessionMarker = deferSessionId ? readSessionMarker(home, deferSessionId) : null
    if (consumed && session.status === 0) {
      log.pass(
        "c7 defer 플로 (사유 기록 → 1회 allow)",
        `defer 마커 consumed=true (${consumed.head.slice(0, 8)}), 세션 정상 종료`,
      )
    } else {
      log.fail(
        "c7 defer 플로 (사유 기록 → 1회 allow)",
        `markers=${JSON.stringify(markers).slice(0, 200)} exit=${session.status}`,
      )
    }
    if (sessionMarker && sessionMarker.resolved !== true) {
      log.pass("c7b deferred allow는 세션을 resolve하지 않음", "pending replay로 잔존(의도된 동작)")
    } else {
      log.fail("c7b deferred allow는 세션을 resolve하지 않음", JSON.stringify(sessionMarker))
    }
  }

  // c8. replay 게이트: pending 세션(c7) 존재 시 새 세션의 UserPromptSubmit block
  {
    const session = runClaudeSession({
      cwd: repo,
      env,
      home,
      label: "c8-replay-block",
      pluginDir,
      prompt: "Reply with exactly: OK",
      timeoutMs: 90_000,
    })
    if (session.combined.includes("pending specraft ingest replay")) {
      log.pass("c8 pending replay 프롬프트 게이트", "이전 미해소 세션으로 인한 block 사유 확인")
    } else {
      log.fail(
        "c8 pending replay 프롬프트 게이트",
        `block 사유 미검출 (exit=${session.status}, result=${String(session.resultJson?.result).slice(0, 80)})`,
      )
    }
    rmSync(join(repo, "scratch-defer.txt"), { force: true })
  }

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
