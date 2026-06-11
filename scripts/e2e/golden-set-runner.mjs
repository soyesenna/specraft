// M2.5 — golden-set 10질의 러너 (기록 모드 + M4+ 게이트 모드).
// ephemeral 백엔드 픽스처에 golden-set.json의 시드 8건을 ingest하고 질의 10개를 실행해
// citation 정확도(기대 path 포함 여부)를 채점, 결과 JSON을 stdout에 출력한다.
//
// 모드:
// - 기본(플래그 없음): 베이스라인 기록(M2와 동일). 점수 미달이어도 exit 0,
//   인프라 실패(시드 ingest 실패·백엔드 기동 실패)만 exit 1.
// - --gate (M4+): ① 점수 < GATE_THRESHOLD(8/10) → exit 1,
//   ② scripts/e2e/golden-set-baseline.json 대비 점수 열등 → exit 1.
//   베이스라인 파일이 없으면 현재 점수로 생성한다(생성된 파일은 커밋 대상).
//   provider 미설정 → 키워드 폴백 고정이라 무키(CI secrets 없이)로도 결정적이다.
//
// 사용: node scripts/e2e/golden-set-runner.mjs [--gate]
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { backendFetch, startBackendFixture } from "./backend-fixture.mjs"
import { createGitFixture } from "./git-fixture.mjs"
import { runCleanups } from "./lib/util.mjs"

const GATE_THRESHOLD = 8
const baselinePath = fileURLToPath(new URL("./golden-set-baseline.json", import.meta.url))

const goldenSet = JSON.parse(readFileSync(new URL("./golden-set.json", import.meta.url), "utf8"))

async function seedWiki(backend, head) {
  for (const seed of goldenSet.seed) {
    const response = await backendFetch(backend.url, "/api/v1/ingest", {
      apiKey: backend.apiKey,
      body: {
        agent: "claude-code",
        branch: "main",
        commit_hash: head,
        ...seed,
      },
    })
    if (response.status !== 200 || response.json?.status !== "accepted") {
      throw new Error(
        `seed ingest failed (${seed.session_id}): ${response.status} ${response.text.slice(0, 200)}`,
      )
    }
  }
}

async function runQueries(backend, head) {
  const results = []
  for (const query of goldenSet.queries) {
    const response = await backendFetch(backend.url, "/api/v1/query", {
      apiKey: backend.apiKey,
      body: { branch: "main", commit_hash: head, question: query.question },
    })
    const citations = Array.isArray(response.json?.citations) ? response.json.citations : []
    const citedPaths = citations.map((citation) => citation.path)
    const hit = query.expected_paths.every((path) => citedPaths.includes(path))
    results.push({
      cited_paths: citedPaths,
      expected_paths: query.expected_paths,
      hit,
      id: query.id,
      question: query.question,
    })
  }
  return results
}

/**
 * --gate 평가: 임계 미달·베이스라인 열등을 판정하고, 베이스라인이 없으면 현재 점수로 생성한다.
 * @param {number} score
 * @param {Array<{ id: string, hit: boolean }>} results
 * @returns {string[]} 실패 사유 목록(비어 있으면 게이트 통과)
 */
function evaluateGate(score, results) {
  let baseline = null
  if (existsSync(baselinePath)) {
    baseline = JSON.parse(readFileSync(baselinePath, "utf8"))
  } else {
    baseline = {
      provider: "keyword-fallback",
      queries: Object.fromEntries(results.map((result) => [result.id, result.hit])),
      recorded_at: new Date().toISOString(),
      score,
      total: results.length,
    }
    writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`)
    process.stdout.write(
      `[golden-set] 베이스라인 없음 — 현재 점수 ${score}/${results.length}로 생성(${baselinePath}, 커밋 대상)\n`,
    )
  }
  const failures = []
  if (score < GATE_THRESHOLD) {
    failures.push(`점수 ${score}/${results.length} < 임계 ${GATE_THRESHOLD}`)
  }
  if (typeof baseline.score === "number" && score < baseline.score) {
    failures.push(`베이스라인 ${baseline.score}/${baseline.total ?? results.length} 대비 열등`)
  }
  return failures
}

async function main() {
  const gateMode = process.argv.includes("--gate")
  const cleanups = []
  try {
    const gitFx = createGitFixture(cleanups)
    // provider 미설정 → 키워드 폴백 고정(결정적). 러너는 전부 async HTTP라 in-process 백엔드로 충분.
    const backend = await startBackendFixture({ cleanups, codeRemoteUrl: gitFx.remote })
    const head = gitFx.firstCommit
    await seedWiki(backend, head)
    const results = await runQueries(backend, head)
    const score = results.filter((result) => result.hit).length
    const report = {
      baseline: !gateMode,
      gate_threshold: GATE_THRESHOLD,
      gate_active: gateMode,
      provider: "keyword-fallback",
      score,
      total: results.length,
      queries: results,
    }
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    if (!gateMode) {
      process.stdout.write(
        `[golden-set] baseline ${score}/${results.length} (게이트는 --gate로 실행 — 기록 모드, exit 0)\n`,
      )
      return
    }
    const failures = evaluateGate(score, results)
    if (failures.length > 0) {
      for (const failure of failures) {
        process.stdout.write(`[golden-set] GATE FAIL — ${failure}\n`)
      }
      process.exitCode = 1
      return
    }
    process.stdout.write(
      `[golden-set] GATE PASS — ${score}/${results.length} (임계 ≥${GATE_THRESHOLD}, 베이스라인 이상)\n`,
    )
  } finally {
    runCleanups(cleanups)
  }
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(`file://${process.argv[1]}`)

if (invokedDirectly) {
  await main()
}
