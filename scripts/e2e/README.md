# M1.9 E2E 스모크 하니스

specraft 플러그인(Claude Code / Codex)의 실세션 동작을 검증하는 스모크 하니스다.
계획 정본: `.omc/plans/ralplan-specraft-plugin-enhancement.md` §Phase M1.9 (9a~9e).

## 실행

```sh
# 전체 (빌드 포함)
node scripts/e2e/run-all.mjs

# 빌드 생략 (이미 pnpm build 완료 상태)
SPECRAFT_E2E_SKIP_BUILD=1 node scripts/e2e/run-all.mjs

# 시나리오 단독 실행 (빌드 선행 필요: pnpm build)
node scripts/e2e/claude-scenario.mjs   # 9c
node scripts/e2e/codex-scenario.mjs    # 9d

# 백엔드 픽스처 단독 기동 (수동 디버깅용, Ctrl-C로 정리)
node scripts/e2e/backend-fixture.mjs [--code-remote <bare-remote-path>]
```

종료 코드: FAIL 단계가 하나라도 있으면 1. SKIP(환경 제약)은 사유와 함께 허용된다.
각 Claude 세션의 stdout/stderr/디버그 로그는 `$TMPDIR/specraft-e2e-artifacts-<ts>/`에 보존된다.

## 인증 요구사항 (없으면 해당 단계 SKIP)

| 단계 | 요구 | 해석 순서 |
|---|---|---|
| 9c 세션 단계 (c1~c9) | Claude Code 인증 | `CLAUDE_CODE_OAUTH_TOKEN` → `ANTHROPIC_API_KEY` → macOS 키체인 `Claude Code-credentials` 추출 |
| 9d 호스트 단계 (d2~d3) | Codex 인증 | `~/.codex/auth.json` 존재 시 격리 `CODEX_HOME`으로 복사 |
| 9d 프로세스 레벨 (d4~d13) | 없음 | 항상 실행 (node + git만 필요) |

specraft 백엔드 API 키는 픽스처가 자동 발급한다(외부 키 불필요).
LLM provider는 미설정으로 고정 → 백엔드는 키워드 폴백 모드(결정적, 무키)로 동작한다.

## 구성 요소

| 파일 | 역할 |
|---|---|
| `backend-fixture.mjs` | 9a. 임시 dataDir 백엔드 기동 + admin bootstrap + API 키 발급. **주의**: 시나리오는 자식 프로세스를 동기(spawnSync)로 돌리므로 반드시 `startBackendFixtureProcess`(별도 프로세스)를 사용 — in-process 모드는 이벤트 루프 블로킹으로 교착한다. |
| `git-fixture.mjs` | 9b. bare remote(origin) + push -u 완료된 임시 작업 레포 (proxy.test.ts 빌더 이식). |
| `claude-scenario.mjs` | 9c. 격리 HOME+CLAUDE_CONFIG_DIR에서 `--plugin-dir`/marketplace 설치, SessionStart 주입, specraft_query, gate(블록→ingest→allow), defer, replay 게이트. |
| `codex-scenario.mjs` | 9d. 격리 CODEX_HOME 설치+MCP 핸드셰이크+status 도구, global hooks 설치 스크립트, 훅 래퍼 stdin 직접 실행 프로세스 레벨 게이트 매트릭스. |
| `lib/mcp-client.mjs` | 번들 proxy를 stdio JSON-RPC로 구동하는 최소 MCP 클라이언트 (호스트 비의존 ingest/defer 기록). |
| `run-all.mjs` | 오케스트레이터: 빌드 → 9c → 9d → 요약/종료 코드. |

## 시나리오 설계 노트 (실측 기반)

- Claude Code 2.1.173: 헤드리스 `-p`에서도 plugin 훅(SessionStart/UserPromptSubmit/Stop)이
  발화하고, 플러그인 MCP 서버는 **세션 cwd에서, `CLAUDE_CODE_SESSION_ID` env를 갖고** spawn된다
  — 즉 ingest 마커의 cross-process 세션 정체성(MCP가 쓰고 stop 훅이 읽음)은 네이티브 채널로 성립한다.
- Claude 인증은 `CLAUDE_CONFIG_DIR/.credentials.json` 기준(키체인은 격리 HOME에서 무효).
  macOS에서는 `security find-generic-password -s "Claude Code-credentials" -w`로 추출해 주입한다.
- `codex exec`는 훅을 실행하지 않으므로(M1.6 실측) Codex 훅 게이트는 훅 래퍼를 stdin
  페이로드로 직접 실행해 검증한다. 래퍼+번들 proxy 로직은 Claude Code와 공유라 커버리지 동등.
- 훅 래퍼는 PATH의 `specraft-mcp-proxy`를 spawn하므로(이원 배포의 npm 전역 설치 경로),
  하니스는 전역 npm 오염 없이 번들 `plugins/*/proxy/cli.js`로 가는 PATH shim으로 재현한다.

## CI 정책 (.github/workflows/ci.yml)

- `validate`(claude plugin validate)·`test`(contract/unit/typecheck/build): 무조건 실행.
- `e2e-cli`: 잡은 무조건 실행, 인증 secrets(`CLAUDE_CODE_OAUTH_TOKEN` 또는 `ANTHROPIC_API_KEY`,
  `CODEX_AUTH_JSON`) 존재 시 세션 단계까지 전부 실행(부재 시 해당 단계만 사유와 함께 SKIP).
  **마일스톤 완료 주장은 secrets가 설정된 상태의 e2e-cli green을 전제로 한다** (plan Principle 5).
