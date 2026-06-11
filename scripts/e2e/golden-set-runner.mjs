// M2.5 — golden-set 10질의 베이스라인 러너.
// ephemeral 백엔드 픽스처에 golden-set.json의 시드 8건을 ingest하고 질의 10개를 실행해
// citation 정확도(기대 path 포함 여부)를 채점, 결과 JSON을 stdout에 출력한다.
//
// 모드: 베이스라인 기록(M2). 현 provider(키워드 폴백) 점수를 기록·보고만 하며
// 임계 ≥8/10 게이트는 embedding 도입 후(M4+)에 적용한다 — 점수 미달이어도 exit 0,
// 인프라 실패(시드 ingest 실패·백엔드 기동 실패)만 exit 1.
//
// 사용: node scripts/e2e/golden-set-runner.mjs
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { backendFetch, startBackendFixture } from "./backend-fixture.mjs"
import { createGitFixture } from "./git-fixture.mjs"
import { runCleanups } from "./lib/util.mjs"

const GATE_THRESHOLD = 8 // M4+ embedding 게이트(현재는 기록만)

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

async function main() {
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
      baseline: true,
      gate_threshold: GATE_THRESHOLD,
      gate_active: false,
      provider: "keyword-fallback",
      score,
      total: results.length,
      queries: results,
    }
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    process.stdout.write(
      `[golden-set] baseline ${score}/${results.length} (gate ≥${GATE_THRESHOLD}/10은 M4+ embedding 도입 후 활성화 — 기록 모드, exit 0)\n`,
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
