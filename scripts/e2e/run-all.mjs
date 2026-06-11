// M1.9 E2E 스모크 하니스 오케스트레이터.
// 빌드(생략 가능) → 9c Claude Code 시나리오 → 9d Codex 시나리오 → 9e golden-set 게이트 → 종합 요약.
// FAIL이 하나라도 있으면 exit 1. SKIP은 사유와 함께 허용(인증/CLI 부재 등 환경 제약).
//
// 사용:
//   node scripts/e2e/run-all.mjs                  # 빌드 포함 전체 실행
//   SPECRAFT_E2E_SKIP_BUILD=1 node scripts/e2e/run-all.mjs   # 빌드 생략
import { execSync } from "node:child_process"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { runClaudeScenario } from "./claude-scenario.mjs"
import { runCodexScenario } from "./codex-scenario.mjs"
import { runCleanups, StepLog, tryRun } from "./lib/util.mjs"

const repoRoot = fileURLToPath(new URL("../..", import.meta.url))

function buildWorkspace() {
  if (process.env.SPECRAFT_E2E_SKIP_BUILD === "1") {
    process.stdout.write("[run-all] SPECRAFT_E2E_SKIP_BUILD=1 — 빌드 생략\n")
    return
  }
  process.stdout.write("[run-all] pnpm build (shared/backend/proxy 번들 산출)\n")
  execSync("pnpm build", { cwd: repoRoot, stdio: "inherit" })
}

// 9e. golden-set 게이트 — 실측 약 4초(시드 8건 ingest + 질의 10건, in-process 백엔드)라
// CLI 세션이 수 분 걸리는 run-all 전체 대비 비용이 무시 가능해 기본 연결한다.
// 자식 프로세스로 실행해 게이트 판정(exit code)을 그대로 단계 결과로 기록한다.
function runGoldenSetGate() {
  const log = new StepLog("9e golden-set")
  const startedAt = Date.now()
  const result = tryRun(
    process.execPath,
    [join(repoRoot, "scripts/e2e/golden-set-runner.mjs"), "--gate"],
    { cwd: repoRoot, timeoutMs: 180_000 },
  )
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  const tail = `${result.stdout}\n${result.stderr}`
    .split("\n")
    .filter((line) => line.startsWith("[golden-set]"))
    .join(" / ")
  if (result.status === 0) {
    log.pass("e1 golden-set --gate", `${tail || "통과"} (${elapsed}s)`)
  } else {
    log.fail(
      "e1 golden-set --gate",
      `${tail || result.stderr.slice(0, 200)} (exit=${result.status}, ${elapsed}s)`,
    )
  }
  return log
}

async function main() {
  buildWorkspace()
  const cleanups = []
  const logs = []
  try {
    logs.push(await runClaudeScenario(cleanups))
    logs.push(await runCodexScenario(cleanups))
    logs.push(runGoldenSetGate())
  } finally {
    runCleanups(cleanups)
  }
  process.stdout.write("\n=== M1.9 E2E 스모크 요약 ===\n")
  let failed = 0
  for (const log of logs) {
    process.stdout.write(`${log.summary()}\n`)
    for (const result of log.failed) {
      process.stdout.write(`  FAIL ${result.name} — ${result.detail}\n`)
      failed += 1
    }
  }
  process.exitCode = failed > 0 ? 1 : 0
}

await main()
