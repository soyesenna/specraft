// 9d. Codex 시나리오 (재설계 — M1.6 실측: `codex exec`는 훅을 실행하지 않는다)
//
// 구성:
//   d1. 격리 CODEX_HOME에서 marketplace add → plugin add (설치 경로)
//   d2. 세션 기동 시 MCP 핸드셰이크 확인 (RUST_LOG=info, rmcp Service initialized)
//   d3. MCP 도구 노출/호출 확인 (specraft_status 도구를 모델이 호출)
//   d4. global hooks 설치 스크립트(#16430 우회) 적용 상태 검증 (설치/멱등/제거)
//   d5+. 훅 게이트는 훅 래퍼(stop/session-start/user-prompt-submit)를 stdin 페이로드로
//        직접 실행하는 프로세스 레벨 테스트로 대체 — 래퍼+번들 proxy 로직은 Claude Code와
//        공유되므로 게이트 커버리지는 동등하다. MCP 측 기록(ingest/defer)은 번들 proxy를
//        stdio JSON-RPC로 직접 구동해 수행한다(호스트 비의존).
//
// d1~d3은 codex CLI + auth.json이 없으면 SKIP. d4~d5는 무조건 실행(호스트 비의존).
import { spawnSync } from "node:child_process"
import {
  appendFileSync,
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { startBackendFixtureProcess } from "./backend-fixture.mjs"
import { createGitFixture, git, writeSpecraftConfig } from "./git-fixture.mjs"
import { McpStdioClient } from "./lib/mcp-client.mjs"
import { commandExists, StepLog, tempDir, tryRun } from "./lib/util.mjs"

const repoRoot = fileURLToPath(new URL("../..", import.meta.url)).replace(/\/$/, "")
const codexPluginDir = join(repoRoot, "plugins/codex")
const proxyBundle = join(codexPluginDir, "proxy/cli.js")
const hooksInstaller = join(codexPluginDir, "scripts/install-global-hooks.mjs")

/** 격리 HOME(specraft 상태) + PATH shim 구성 — claude 시나리오와 동일한 이원 배포 재현. */
function buildIsolatedHome(cleanups, backendUrl, apiKey) {
  const home = tempDir("specraft-e2e-codex-home", cleanups)
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
 * Codex 훅 래퍼를 호스트가 주는 것과 동일한 stdin JSON으로 직접 실행한다.
 * @returns {{ status: number | null, stdout: string, stderr: string }}
 */
function runHook(script, payload, env) {
  const result = spawnSync("node", [join(codexPluginDir, "hooks", script)], {
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

async function runProcessLevelGate(log, cleanups) {
  const gitFx = createGitFixture(cleanups)
  // 훅 래퍼를 spawnSync(동기)로 실행하는 동안에도 백엔드가 응답해야 하므로 별도 프로세스 기동.
  const backend = await startBackendFixtureProcess({ cleanups, codeRemoteUrl: gitFx.remote })
  writeSpecraftConfig(gitFx.repo, backend.url)
  const { env, home } = buildIsolatedHome(cleanups, backend.url, backend.apiKey)
  const repo = gitFx.repo
  const sessionId = "e2e-codex-session-1"
  const stdinBase = { cwd: repo, session_id: sessionId }

  // d5. SessionStart: 컨텍스트 주입 + 세션 마커 생성
  {
    const result = runHook(
      "session-start.js",
      { ...stdinBase, hook_event_name: "SessionStart" },
      env,
    )
    const marker = join(home, ".specraft", "sessions", `${sessionId}.json`)
    if (result.stdout.includes("Specraft context for main@") && existsSync(marker)) {
      log.pass("d5 SessionStart 주입+마커", "컨텍스트 평문 출력 + 세션 마커 생성")
    } else {
      log.fail("d5 SessionStart 주입+마커", `stdout=${result.stdout.slice(0, 120)}`)
    }
  }

  // d6. UserPromptSubmit: pending 없음 → 무출력 허용(Codex 정본)
  {
    const result = runHook(
      "user-prompt-submit.js",
      { ...stdinBase, hook_event_name: "UserPromptSubmit" },
      env,
    )
    if (result.status === 0 && result.stdout === "") {
      log.pass("d6 UserPromptSubmit allow", "무출력 + exit 0 (Codex allow 정본)")
    } else {
      log.fail(
        "d6 UserPromptSubmit allow",
        `exit=${result.status} stdout=${result.stdout.slice(0, 120)}`,
      )
    }
  }

  // d7. Stop: dirty → block (JSON {decision:"block"})
  {
    appendFileSync(join(repo, "README.md"), "wip change\n")
    const result = runHook(
      "stop.js",
      { ...stdinBase, hook_event_name: "Stop", stop_hook_active: false },
      env,
    )
    let parsed = null
    try {
      parsed = JSON.parse(result.stdout)
    } catch {
      // 그대로 fail 처리
    }
    if (parsed?.decision === "block" && String(parsed.reason).includes("dirty")) {
      log.pass("d7 stop gate: dirty → block", "block JSON + dirty 사유")
    } else {
      log.fail("d7 stop gate: dirty → block", `stdout=${result.stdout.slice(0, 160)}`)
    }
  }

  // d8. Stop: stop_hook_active=true여도 무사유 자동 allow 금지(ADR-3)
  {
    const result = runHook(
      "stop.js",
      { ...stdinBase, hook_event_name: "Stop", stop_hook_active: true },
      env,
    )
    let parsed = null
    try {
      parsed = JSON.parse(result.stdout)
    } catch {
      // fail로 흐름
    }
    if (parsed?.decision === "block") {
      log.pass("d8 stop_hook_active 무사유 allow 금지", "재호출에도 block 유지(ADR-3)")
    } else {
      log.fail("d8 stop_hook_active 무사유 allow 금지", `stdout=${result.stdout.slice(0, 160)}`)
    }
  }

  // d9. commit+push 후에도 ingest 마커 없으면 block
  {
    git(repo, ["add", "-A"])
    git(repo, ["commit", "-m", "e2e: codex gate cycle change"])
    git(repo, ["push"])
    const result = runHook(
      "stop.js",
      { ...stdinBase, hook_event_name: "Stop", stop_hook_active: false },
      env,
    )
    let parsed = null
    try {
      parsed = JSON.parse(result.stdout)
    } catch {
      // fail로 흐름
    }
    if (parsed?.decision === "block" && String(parsed.reason).includes("ingest")) {
      log.pass("d9 push 후 ingest 미수행 → block", "ingest 마커 부재 사유 확인")
    } else {
      log.fail("d9 push 후 ingest 미수행 → block", `stdout=${result.stdout.slice(0, 160)}`)
    }
  }

  // d10. 번들 proxy를 MCP stdio로 직접 구동: tools/list 4종 + specraft_ingest 호출
  //      (cross-process: MCP 프로세스가 쓴 ingest 마커를 stop 훅 프로세스가 읽는다)
  {
    const client = new McpStdioClient({
      args: [proxyBundle],
      command: "node",
      cwd: repo,
      env: { ...env, SPECRAFT_SESSION_ID: sessionId },
    })
    try {
      const initResult = await client.initialize()
      const serverName = initResult?.serverInfo?.name
      const tools = await client.listTools()
      const toolNames = tools.map((tool) => tool.name)
      const expected = ["specraft_query", "specraft_ingest", "specraft_status", "specraft_defer"]
      const hasAll = expected.every((name) => toolNames.includes(name))
      const querySchema = tools.find((tool) => tool.name === "specraft_query")?.inputSchema
      if (serverName === "specraft" && hasAll && querySchema?.properties?.question) {
        log.pass("d10a MCP 핸드셰이크+도구 4종(inputSchema)", `tools=[${toolNames.join(", ")}]`)
      } else {
        log.fail("d10a MCP 핸드셰이크+도구 4종(inputSchema)", `tools=[${toolNames.join(", ")}]`)
      }
      const ingest = await client.callTool("specraft_ingest", {
        agent: "codex",
        open_questions: [],
        progress_updates: [],
        spec_changes: [
          {
            area: "e2e",
            description: "codex process-level gate cycle",
            reasoning: "verify ingest marker cross-process identity",
            type: "modified",
          },
        ],
        summary: "E2E codex gate cycle ingest",
      })
      const ingestText = JSON.stringify(ingest)
      if (!ingest.isError && ingestText.includes('"accepted"')) {
        log.pass("d10b specraft_ingest 수락", "백엔드 accepted + 마커 기록")
      } else {
        log.fail("d10b specraft_ingest 수락", ingestText.slice(0, 200))
      }
    } finally {
      await client.close()
    }
  }

  // d11. ingest 후 stop → allow (Codex 정본: 무출력 + exit 0) — cross-process 정체성 assert
  {
    const result = runHook(
      "stop.js",
      { ...stdinBase, hook_event_name: "Stop", stop_hook_active: false },
      env,
    )
    const marker = JSON.parse(
      readFileSync(join(home, ".specraft", "sessions", `${sessionId}.json`), "utf8"),
    )
    if (result.status === 0 && result.stdout === "" && marker.ingested === true) {
      log.pass(
        "d11 ingest → stop allow (cross-process)",
        "MCP 프로세스가 쓴 마커를 stop 훅이 읽어 무출력 allow",
      )
    } else {
      log.fail(
        "d11 ingest → stop allow (cross-process)",
        `exit=${result.status} stdout=${result.stdout.slice(0, 120)} marker=${JSON.stringify(marker)}`,
      )
    }
  }

  // d12. defer 플로: dirty → MCP specraft_defer → stop allow 1회 → 재-stop 재차단(consume-on-use)
  {
    writeFileSync(join(repo, "scratch-codex.txt"), "deferred work\n")
    const client = new McpStdioClient({
      args: [proxyBundle],
      command: "node",
      cwd: repo,
      env: { ...env, SPECRAFT_SESSION_ID: "e2e-codex-session-2" },
    })
    try {
      await client.initialize()
      const defer = await client.callTool("specraft_defer", { reason: "E2E codex defer test" })
      if (!defer.isError && JSON.stringify(defer).includes("deferred")) {
        log.pass("d12a specraft_defer 기록", "사유 기록(서버 비의존)")
      } else {
        log.fail("d12a specraft_defer 기록", JSON.stringify(defer).slice(0, 200))
      }
    } finally {
      await client.close()
    }
    const first = runHook(
      "stop.js",
      { ...stdinBase, hook_event_name: "Stop", stop_hook_active: false },
      env,
    )
    const second = runHook(
      "stop.js",
      { ...stdinBase, hook_event_name: "Stop", stop_hook_active: false },
      env,
    )
    let secondParsed = null
    try {
      secondParsed = JSON.parse(second.stdout)
    } catch {
      // fail로 흐름
    }
    if (first.status === 0 && first.stdout === "" && secondParsed?.decision === "block") {
      log.pass("d12b defer 1회 allow + 재차단", "consume-on-use 확인(2회차 stop은 block)")
    } else {
      log.fail(
        "d12b defer 1회 allow + 재차단",
        `1차=${first.stdout.slice(0, 80) || "(무출력)"} 2차=${second.stdout.slice(0, 80)}`,
      )
    }
    rmSync(join(repo, "scratch-codex.txt"), { force: true })
  }

  // d13. UserPromptSubmit: 타 세션 pending replay → block
  {
    const otherEnv = env
    runHook(
      "session-start.js",
      { cwd: repo, hook_event_name: "SessionStart", session_id: "e2e-codex-session-3" },
      otherEnv,
    )
    const result = runHook(
      "user-prompt-submit.js",
      { cwd: repo, hook_event_name: "UserPromptSubmit", session_id: "e2e-codex-session-4" },
      otherEnv,
    )
    let parsed = null
    try {
      parsed = JSON.parse(result.stdout)
    } catch {
      // fail로 흐름
    }
    if (parsed?.decision === "block" && String(parsed.reason).includes("replay")) {
      log.pass("d13 pending replay → 프롬프트 block", "타 세션 미해소 마커로 인한 차단")
    } else {
      log.fail("d13 pending replay → 프롬프트 block", `stdout=${result.stdout.slice(0, 160)}`)
    }
  }

  return { backend, env, gitFx, home }
}

function runHostLevel(log, cleanups, fixture) {
  if (!commandExists("codex")) {
    log.skip("d1-d3 codex 호스트 시나리오", "codex CLI 미설치")
    return
  }
  const codexHome = tempDir("specraft-e2e-codex-cfg", cleanups)
  const realAuth = join(homedir(), ".codex", "auth.json")
  const hasAuth = existsSync(realAuth)
  if (hasAuth) {
    copyFileSync(realAuth, join(codexHome, "auth.json"))
    chmodSync(join(codexHome, "auth.json"), 0o600)
  }
  const env = { ...fixture.env, CODEX_HOME: codexHome, RUST_LOG: "info" }

  // d1. marketplace add → plugin add (격리 CODEX_HOME, 인증 불필요)
  {
    const added = tryRun("codex", ["plugin", "marketplace", "add", repoRoot], {
      cwd: fixture.gitFx.repo,
      env,
      timeoutMs: 60_000,
    })
    const installed =
      added.status === 0
        ? tryRun("codex", ["plugin", "add", "specraft@specraft"], {
            cwd: fixture.gitFx.repo,
            env,
            timeoutMs: 60_000,
          })
        : added
    if (installed.status === 0) {
      log.pass("d1 codex marketplace add → plugin add", "격리 CODEX_HOME 설치 완료")
    } else {
      log.fail(
        "d1 codex marketplace add → plugin add",
        `${installed.stderr || installed.stdout}`.slice(0, 300),
      )
    }
  }

  if (!hasAuth) {
    log.skip("d2-d3 codex 세션 단계", "~/.codex/auth.json 없음 — 모델 세션 기동 불가")
    return
  }

  // d2+d3. 세션 기동: MCP 핸드셰이크(RUST_LOG) + specraft_status 도구 호출
  {
    const result = tryRun(
      "codex",
      [
        "exec",
        "--skip-git-repo-check",
        "--dangerously-bypass-hook-trust",
        "-C",
        fixture.gitFx.repo,
        "Call the specraft_status MCP tool and reply with the raw JSON result of that tool call and nothing else.",
      ],
      { cwd: fixture.gitFx.repo, env, timeoutMs: 240_000 },
    )
    const combined = `${result.stdout}\n${result.stderr}`
    const handshake = /Service initialized/.test(combined) && combined.includes("specraft")
    if (handshake) {
      log.pass("d2 MCP 핸드셰이크 (rmcp Service initialized)", "격리 CODEX_HOME에서 완주")
    } else {
      log.fail("d2 MCP 핸드셰이크 (rmcp Service initialized)", combined.slice(-300))
    }
    if (combined.includes('"server"') && combined.includes("ok")) {
      log.pass("d3 specraft_status 도구 호출", "모델 경유 도구 노출/호출 확인")
    } else {
      log.fail("d3 specraft_status 도구 호출", `${result.stdout.slice(-200)}`)
    }
  }
}

function runHooksInstallerChecks(log, cleanups) {
  const codexHome = tempDir("specraft-e2e-codex-hooks", cleanups)
  const env = { ...process.env, CODEX_HOME: codexHome }
  const hooksPath = join(codexHome, "hooks.json")

  const readHooks = () =>
    existsSync(hooksPath) ? JSON.parse(readFileSync(hooksPath, "utf8")) : null

  const install = tryRun("node", [hooksInstaller], { env })
  const installed = readHooks()
  const stopHooks = installed?.hooks?.Stop?.flatMap((group) => group.hooks ?? []) ?? []
  const hasStop = stopHooks.some((hook) => String(hook.command).includes("stop.js"))
  if (
    install.status === 0 &&
    hasStop &&
    installed?.hooks?.SessionStart &&
    installed?.hooks?.UserPromptSubmit
  ) {
    log.pass("d4a global hooks 설치", `${hooksPath}에 SessionStart/UserPromptSubmit/Stop 병합`)
  } else {
    log.fail(
      "d4a global hooks 설치",
      `exit=${install.status} hooks=${JSON.stringify(installed).slice(0, 200)}`,
    )
  }

  // 멱등성: 재실행해도 항목이 중복되지 않는다
  tryRun("node", [hooksInstaller], { env })
  const second = readHooks()
  const stopCount = second?.hooks?.Stop?.flatMap((group) => group.hooks ?? []).length ?? 0
  if (stopCount === 1) {
    log.pass("d4b 설치 스크립트 멱등성", "재실행에도 Stop 훅 1개 유지")
  } else {
    log.fail("d4b 설치 스크립트 멱등성", `Stop 훅 ${stopCount}개`)
  }

  // 제거: --remove로 specraft 항목만 제거
  const removed = tryRun("node", [hooksInstaller, "--remove"], { env })
  const after = readHooks()
  const remaining = after?.hooks?.Stop?.flatMap((group) => group.hooks ?? []).length ?? 0
  if (removed.status === 0 && remaining === 0) {
    log.pass("d4c --remove 제거", "specraft 항목 제거 완료")
  } else {
    log.fail("d4c --remove 제거", `잔존 ${remaining}개`)
  }
}

export async function runCodexScenario(cleanups) {
  const log = new StepLog("9d codex")
  if (!existsSync(proxyBundle)) {
    log.fail("d0 proxy 번들 존재", `${proxyBundle} 없음 — pnpm --filter @specraft/mcp-proxy build`)
    return log
  }
  runHooksInstallerChecks(log, cleanups)
  const fixture = await runProcessLevelGate(log, cleanups)
  runHostLevel(log, cleanups, fixture)
  return log
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(`file://${process.argv[1]}`)

if (invokedDirectly) {
  const { runCleanups } = await import("./lib/util.mjs")
  const cleanups = []
  try {
    const log = await runCodexScenario(cleanups)
    process.stdout.write(`${log.summary()}\n`)
    process.exitCode = log.failed.length > 0 ? 1 : 0
  } finally {
    runCleanups(cleanups)
  }
}
