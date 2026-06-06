# RALPLAN: specraft v1 구현 계획

- Status: **CONSENSUS APPROVED — pending approval (실행은 별도 명시 승인 필요)**
- Consensus: Planner → Architect(APPROVE_WITH_IMPROVEMENTS, 8건 반영) → Critic(REVISE×2 → 전건 반영 → **APPROVED**, iteration 3/5)
- Critic 최종 점수: 일관성 10/10 · 리스크 10/10 · 대안 9/10 · 테스트 가능성 9/10 · 검증 구체성 9/10 · 신규 모순 0
- Source spec: `.omc/specs/deep-interview-specraft.md` (Deep Interview 20라운드, 최종 모호도 4.6%, Status PASSED — 부록 A 포함)
- Mode: RALPLAN-DR short (그린필드 셀프호스트 도구, 명시적 고위험 신호 없음)
- 작성: 2026-06-05 (KST)

## Requirements Summary

specraft는 AI-Driven Development 팀의 단일 spec source 서버다. 5개 컴포넌트:

1. **server-core** — llm-wiki 저장소(bare git, SoT) + LLM 문서 엔진(직접 API 호출 에이전트 루프, provider 추상화 + v1 OpenRouter). Ingest/Query/Merge/Init 4종 에이전트.
2. **git-sync** — 코드 repo bare mirror(read-only fetch), 문서 브랜치 1:1 미러링, 요청 시 lazy merge 전파, conflict 시 브랜치 락, commit DAG 순서 보장(P1)·존재 검증(P2).
3. **plugins** — CC/Codex 대칭: `SessionStart` 주입 + `PostCompact` 재주입 + `Stop` hard 게이트(clean·pushed·ingested 3검사, read-only 세션 면제), stdio MCP 프록시(`specraft_query`/`specraft_ingest`/`specraft_status`) → 서버 REST, `/specraft-setup`·`/specraft-init` 커맨드, `strict_mode` 설정.
4. **frontend** — React: 브랜치별 wiki 열람(읽기 전용)·자연어 쿼리·ingest/query 로그·conflict 센터(자연어 지시 → Merge Agent 재시도).
5. **auth** — admin 부트스트랩, 초대 링크 가입, admin/member 2역할, api-key(1회 노출, 해시 저장, `sk-spcrft-` prefix), argon2 + httpOnly 세션 쿠키.

확정 제약: TypeScript 통합 모노레포, 1 인스턴스 = 1 프로젝트, Docker compose 배포, SQLite 운영 DB, 호스팅 중립 git credential, **spec 무결성 > 가용성**(hard Stop 게이트).

## RALPLAN-DR Summary

### Principles (5)
1. **Spec 무결성 > 가용성** — 게이트는 hard, ingest 누락 불허 (사용자 확정 가치, spec §Goal)
2. **git이 할 수 있는 일은 git에 위임** — 브랜치/머지/conflict/이력 재발명 금지 (spec R5 Contrarian 통과)
3. **CC/Codex 대칭성** — 공통 로직은 `packages/`로, 플랫폼 어댑터는 최대한 얇게 (spec §9.6)
4. **지능은 가장 잘 아는 주체에게** — 세션 요약은 로컬 에이전트, wiki 통합은 서버 에이전트 (spec R7)
5. **v1 최소 인프라** — 웹훅·폴링·벡터검색 없음, lazy 감지 + index/ripgrep (spec §Non-Goals)

### Decision Drivers (top 3)
1. acceptance criteria **S1~S7 + P1·P2 전부**를 충족하는 최단·최저위험 경로
2. 5개 컴포넌트 병렬 작업이 가능하도록 **계약(타입·API 스키마) 우선 확정**
3. spec의 확정 기술 결정(TS·bare git·OpenRouter 추상화·Docker 1:1·hard 게이트) **무수정 계승**

### Viable Options

**Option A — 수직 슬라이스 (시나리오 단위 E2E 우선)**
- 접근: S1부터 S7까지 시나리오 하나씩 풀스택 관통 구현
- Pros: 매 단계 데모 가능, 통합 리스크 조기 노출
- Cons: git/LLM 인프라를 얕게 여러 번 재방문 — 재작업 유발, 컴포넌트 경계 산만, 병렬화 어려움

**Option B — 레이어드 빌드업 (인프라→엔진→API→플러그인→UI)**
- 접근: 각 레이어를 한 번에 완성하고 다음 레이어로
- Pros: 레이어당 1회 방문, 경계 명확, 레이어 내 병렬화 용이
- Cons: E2E 검증이 후반 집중 — 통합 리스크 늦게 발견 (특히 훅↔게이트↔서버 상호작용)

**Option C — 계약 우선 + 레이어 빌드업 + 시나리오 체크포인트 (채택)**
- 접근: M1에서 공유 타입·API 계약·DB 스키마를 먼저 고정 → 레이어 순서로 빌드 → 각 마일스톤 종료 시 해당 acceptance 시나리오를 체크포인트로 검증
- Pros: 계약 고정으로 컴포넌트 병렬 작업 안전, 체크포인트가 통합 리스크를 마일스톤 단위로 분산, B의 구조적 명확성 유지
- Cons: M1 계약 설계 선투자 필요 — 단 spec §9.3~9.8이 이미 계약 초안이므로 비용 낮음

> Option A·B 기각 근거: A는 bare git/LLM 엔진 같은 공유 인프라의 반복 재방문 비용이 그린필드에서 과대, B는 hard 게이트(Stop hook)와 서버의 상호작용이라는 최대 통합 리스크를 마지막까지 미룸. C가 두 결함을 모두 보완.

## Architecture Decisions (spec 계승 + 위임 해소)

| 결정 | 근거 (spec) |
|------|-------------|
| **서버 프레임워크 = Fastify** | 사용자 확정 2026-06-06 — spec §9.10 위임 해소. Hono 대비 생태계·플러그인(인증/쿠키/정적 서빙) 성숙도와 장기 실행 프로세스 검증 이력. Next.js 기각: per-branch 큐 워커·LLM 루프·worktree/SQLite 로컬 상태와 실행 모델 충돌 |
| wiki SoT = bare git repo | R5 (Contrarian 통과 — 브랜치/머지/이력 공짜) |
| 운영 데이터 = SQLite (better-sqlite3) | §9.8 — 단일 프로젝트 셀프호스트에 과한 DB 불필요 |
| LLM = 자체 루프 + ProviderAdapter, v1 OpenRouter | R1·R9 |
| merge 감지 = 요청 시 lazy fetch | R10 — 웹훅/폴링 인프라 제거 |
| conflict 락 = 브랜치 단위 409 | R10 |
| MCP = stdio 프록시 → REST | §9.5 D7 — CC/Codex 동작 동일성 보장 |
| 게이트 = Stop hook hard block | R18 — spec 무결성 > 가용성 |

## Implementation Steps (Milestones)

### M0. 모노레포 스캐폴딩
- [ ] pnpm workspace + TypeScript strict + ESLint/Prettier + vitest 셋업
- [ ] 구조: `apps/backend`(**Fastify** — 2026-06-06 확정), `apps/frontend`(React/Vite), `packages/shared`, `packages/mcp-proxy`, `plugins/claude-code`, `plugins/codex` (spec §9.9)
- [ ] `docker-compose.yml` 골격 (backend + `/data` 볼륨), `Dockerfile` (멀티스테이지: frontend 빌드 → backend가 정적 서빙)
- 검증: `pnpm -r build` 통과, `docker compose up`으로 Fastify 헬스 엔드포인트 응답

### M0.5. Walking-Skeleton Spike (Architect 합의 반영 — 최대 통합 리스크 선검증)
- [ ] **CC·Codex 훅 공식 스키마 재검증** (M7/M8에서 이동): SessionStart/PostCompact/UserPromptSubmit/Stop의 현행 I/O 형태를 공식 문서·실세션으로 확정 — 번들 참고문서(docs/external/claude-code-codex-docs/)의 "CC 5종 훅" 정보는 구버전임이 확인됨
- [ ] 일회용 CC 미니 플러그인: `SessionStart` → stub `/context`(하드코딩 문자열) 주입 + `Stop` → stub `/status` 대상 3검사 block-and-continue 루프
- [ ] 실제 CC 세션에서 검증: ① SessionStart/PostCompact가 실제 발화하는가 ② Stop hook이 사용자를 가두지 않고 block→지시→재시도 루프를 안정적으로 수행하는가 (R4 조기 검증)
- [ ] **합격 기준 (정량, Critic 반영)**: ① 주입 — 새 세션·compact 후 각 3회 연속 컨텍스트 주입 확인 ② 게이트 — block→지시→(조건 충족)→통과 루프 3회 연속 성공 + 미충족 상태 5회 연속 block에서 탈출 수단(조건 충족 또는 strict 해제) 동작 확인
- [ ] **컨틴전시 (Critic 반영)**: 만약 CC에 SessionStart/PostCompact가 실제로 없다고 판명되면 — 주입은 `UserPromptSubmit`(세션 첫 턴 감지 + compact 후 턴 감지, 로컬 상태 파일 기반)으로 대체. 이 경우 spec §9.6 매핑 표를 해당 방식으로 갱신하고 M1 계약에 반영 (주입 메커니즘 재설계 수준임을 인지 — "미세 조정" 아님)
- 산출물: **검증된 훅 I/O 스키마 문서** (M1 계약·M7/M8 어댑터의 입력). 스파이크 코드는 폐기 허용
- 검증: 합격 기준 ①② 충족 기록 + 게이트 block 루프 실연

### M1. 계약 고정 (packages/shared)
- [ ] spec §9.3 REST API 전체의 요청/응답 TS 타입 + zod 스키마 (M0.5의 검증된 훅 I/O 스키마 반영)
- [ ] spec §9.4 `IngestPayload` zod 스키마
- [ ] **에러 표현 통일** (Architect m-1 반영): 락 = HTTP 409 + body `{error:"branch_locked", conflict_id}`, P2 커밋 미발견 = HTTP 422 + body `{status:"rejected", reason:"commit_not_found"}`, 인증 = 401. ingest 거부는 "HTTP 4xx + body status/reason 병행" 단일 표현으로 고정 — spec §9.3·§9.4와 정합, mcp-proxy/frontend 클라이언트 처리 일원화
- [ ] API 클라이언트(fetch 래퍼) — mcp-proxy·frontend·훅 스크립트 공용
- 검증: 타입 체크 통과, 스키마 단위 테스트 (P2 거부 케이스 포함)

### M2. auth + 운영 DB (apps/backend) → **S1 체크포인트**
- [ ] SQLite 스키마 마이그레이션 (spec §9.8: members/invites/api_keys/ingest_logs/query_logs/conflicts/branch_locks/settings)
- [ ] 최초 기동 감지 → admin 생성 플로우, 초대 링크 발급/검증/가입, 로그인(세션 쿠키)
- [ ] api-key 발급(1회 노출·argon2 해시·`sk-spcrft-` prefix)/폐기, Bearer 인증 미들웨어
- [ ] admin settings API (git URL/credential 암호화 저장, model 슬러그)
- [ ] **서버 시크릿 정의** (Architect m-3 반영): `SPECRAFT_SECRET` 필수 env(부재 시 기동 거부 fail-fast), credential 암호화 키와 세션 서명 키를 이로부터 파생(HKDF), 시크릿 분실 시 결과(저장 credential 복호 불가 → admin 재입력) 문서화
- 검증: **S1 통합 테스트** (기동→admin→초대→가입→key 발급) + 시크릿 부재 fail-fast 테스트

### M3. git-sync 코어 (apps/backend)
- [ ] code-mirror bare clone/fetch (simple-git; credential은 settings에서)
- [ ] wiki.git 초기화 (골격 3파일 커밋: index.md/log.md/overview.md 템플릿)
- [ ] **Worktree & Concurrency Model** (Architect B-1·M-2 반영 — 설계 선행 태스크):
  - 브랜치당 worktree 단일 체크아웃 불변식 + worktree 풀(요청 시 생성·재사용·사용 후 정리)
  - 기동 시 `git worktree prune` + stale lock 제거 (크래시 복구)
  - 큐 모델 확정: **per-branch 큐** (글로벌 큐 아님 — spec "타 브랜치 정상 동작" 보장), 브랜치 간 병렬·브랜치 내 직렬
  - **lazy merge 전파를 per-branch 큐 안으로 편입** (요청 핸들러 인라인 실행 금지) — 락 설정(Merge)과 작업 실행(Ingest)이 동일 직렬화 지점 공유
  - 큐 워커는 dequeue 첫 단계에서 `branch_locks` 재검사 (HTTP 진입 시 검사만으로는 불충분 — 레이스 차단)
- [ ] 브랜치 미러링: 코드 브랜치 발견 시 문서 브랜치 lazy 분기 (D2 — 부모 commit 기준)
- [ ] lazy merge 감지: 요청 진입 시 fetch → 코드 merge 발견 → 문서 merge 작업을 해당 브랜치 큐에 적재 (fast-forward/clean만; conflict는 M6에서)
- [ ] **in-request fetch 바운딩** (Architect Tension 3 + Critic MINOR-1 반영): fetch 타임아웃 설정 + 타임아웃 시 동작 정의. **stale-fallback은 read 경로(`/context`·`/query`)에만 적용** — "서버 도달 가능하나 upstream git 지연" 시 마지막 성공 fetch 기준 stale 데이터로 응답(stale 헤더 표시). **Stop 게이트가 의존하는 무결성 경로(`/ingest`의 P2 커밋 검증, `/status`의 락 확인)는 stale 금지** — fetch 실패는 fresh 실패로 처리해 spec "hard block" 가치 유지 (read를 stale로 견디는 것과 게이트가 무결성 검증을 stale로 우회하는 것은 별개. 참고: P2의 거부 조건은 "커밋 미발견"이므로 stale 스냅샷에서도 fail-closed — 이 분리는 방어선 명문화)
- [ ] 브랜치 작업 큐 + commit DAG 위상 정렬 (P1) + 커밋 존재 검증 (P2)
- [ ] force-push 감지(non-fast-forward) → 브랜치 락 (D3)
- 검증: P1·P2 단위 테스트 (fixture repo로 역순 ingest·미push 커밋 시뮬레이션) + worktree 크래시 복구 테스트 + 락 레이스 테스트(merge 락 적재 중 동시 ingest)

### M4. LLM 엔진 (apps/backend)
- [ ] `LLMProvider` 인터페이스 + `MockProvider`(테스트·CI용 결정적 스파인)
- [ ] **OpenRouter 구현체** (Architect M-3 반영: `docs/external/openrouter/` 13개 문서 **이미 존재 확인** — "도착 대기" 전제 폐기, 본 마일스톤에서 즉시 구현. 도구 호출은 `03-tool-calling.md`의 에이전트 루프 패턴 준수)
- [ ] 도구 실행 루프 (tool-call 파싱·실행·재투입, max-turns 가드)
- [ ] wiki 도구: `wiki_read/wiki_write/wiki_list/wiki_search(ripgrep)/wiki_delete`, `code_log/code_diff` (worktree 단위, spec §9.7)
- [ ] **Ingest Agent**: payload → 관련 페이지 갱신 + index/log 필수 갱신 → 단일 commit(author=member)
- [ ] **Query Agent**: index → 드릴다운 → 인용 포함 응답
- [ ] **Init Agent**: 대량 ingest 묶음 → 초기 overview/index 편성. **P1/P2 면제 명시** (Critic 반영): 부트스트랩은 빈 wiki에 단일 시점 투입이므로 commit DAG 정렬(P1) 면제, 단 P2(커밋 존재 검증)는 동일 적용 — init 요청의 commit hash도 push 검증
- [ ] **실 LLM 품질 평가 하네스 병행 트랙** (Architect Tension 2 반영): 진짜 충돌하는 마크다운 spec 페이지 fixture 세트로 Merge/Ingest Agent의 fail-closed율·품질을 실 OpenRouter 모델로 측정 — CI 블로킹 아님, M6 Merge Agent 프롬프트 튜닝의 입력 (R1을 M10 절벽에서 연속 신호로 전환). **M6 진입 게이트 (Critic 반영): 충돌 fixture에서 fail-closed율 ≥95% (잘못된 자동 병합 ≤5%, 미달 시 프롬프트 튜닝 후 재측정)**
- 검증: MockProvider로 에이전트 루프 단위 테스트 (도구 호출 시퀀스·커밋 산출 검증) + 실 provider 평가 하네스 1회전 결과

### M5. REST API 조립 (apps/backend) → **S3·P1·P2 체크포인트**
*(경로는 spec §9.3의 `/api/v1` prefix 축약 표기 — 정본은 M1 계약)*
- [ ] `POST /context` (lazy 감지 트리거 + overview/index 반환), `POST /query`, `POST /ingest`, `GET /status`
- [ ] 락 검사 미들웨어 (409 BRANCH_LOCKED), ingest/query 로그 기록
- [ ] wiki 열람 API (`/wiki/:branch/tree`, `/wiki/:branch/page`)
- 검증: **S3 통합 테스트** + P1·P2 시나리오 테스트 (MockProvider)

### M6. merge 전파 + conflict (apps/backend) → **S5·S6(서버측) 체크포인트**
- [ ] **Merge Agent**: git merge conflict 파일 의미 병합 시도 → 불확실 시 실패 선언(보수적 프롬프트)
- [ ] 실패 시: conflicts 레코드 + branch_locks + 409 응답 체계
- [ ] `POST /conflicts/:id/resolve` — ResolutionDirective 반영 재시도 → 성공 시 락 해제
- 검증: **S5 통합 테스트** + S6 서버측 (의도적 conflict fixture → 락 → 지시 → 해제)

### M7. MCP 프록시 + CC 플러그인 → **S2·S4(CC) 체크포인트**
- [ ] packages/mcp-proxy: stdio MCP 서버 (`specraft_query`/`specraft_ingest`/`specraft_status`), branch/HEAD 자동 수집, push 사전 확인, 세션 상태 파일(`~/.specraft/sessions/`) — 훅 스키마는 M0.5 산출물 사용
- [ ] plugins/claude-code: `.claude-plugin` 매니페스트, hooks(`SessionStart` 주입, `PostCompact` 재주입, `UserPromptSubmit` strict 차단 집행, `Stop` 게이트), `.mcp.json`, `/specraft-setup`·`/specraft-init` 커맨드
- [ ] **게이트 판정 매트릭스** (Architect m-4 + Critic MAJOR-1 반영): 기본 4축(clean × 신규커밋 × pushed × ingested) 전 조합 + **dirty-uncommitted 셀 명시** — 워킹트리 변경 있음 & 커밋 없음 = clean 검사(①)에서 차단하고 "commit→push→ingest" 지시. **D-패키지 게이트 셀은 spec 부록 A의 분류를 정본으로 사용** (D1=hard block 동작 그 자체, D9=read-only 면제 — "워킹트리 clean AND 신규 커밋 0 AND 세션 중 변경 이력 없음"일 때만, D7=ingested 판정의 프록시 마킹 의존 / D2~D6·D8은 게이트 비관련로 분류 완료). 서버 도달 불가 vs git 지연 구분(M3 바운딩과 연동)
- [ ] **비정상 종료 pending-replay** (Critic CRITICAL-1 / spec 부록 A D1 반영): 세션 마커 생명주기를 §9.5 세션 상태 파일(`~/.specraft/sessions/{id}.json`)에 통합 — 세션 시작 시 `{started_at, branch, ingested:false}` 생성, `specraft_ingest` 성공 시 `ingested:true`, 게이트 통과 시(read-only 면제 포함) resolved 마킹. **SessionStart(컨틴전시 시 UserPromptSubmit 첫 턴)가 직전 미해소 마커(`ingested:false`·미resolved) 스캔 → "직전 세션(시각·브랜치) 미전송 ingest 존재 — 직전 작업 요약을 포함해 ingest하라" 지시를 주입 컨텍스트에 추가.** 마커 정리 규칙: resolved는 7일 후 삭제, 미해소는 해소 시까지 유지 (SIGKILL은 Stop hook을 실행시키지 않으므로 정상 게이트로 못 막는 유일한 ingest 소실 경로를 닫음)
- [ ] `.specraft.json` 로더 (`server_url`, `strict_mode` 기본 true)
- 검증: **S2·S4 수동 E2E** (실제 CC 세션) + 게이트 단위 테스트 (판정 매트릭스 전 셀) + **비정상 종료 E2E: 세션 중 프로세스 강제 킬 → 다음 세션 시작 시 pending 지시 주입 확인 — 합격 기준: 주입 컨텍스트에 직전 세션 시각·브랜치 문자열 + "ingest하라" 지시 포함을 문자열 단언 (S4 인접 시나리오)**. 다중 미해소 마커(연속 SIGKILL) 시 스캔은 **모든 미해소 마커를 나열 지시** (최신 1개 아님 — v1 안전 기본값)

### M8. Codex 플러그인 → **S2·S4(Codex) 체크포인트**
- [ ] plugins/codex: `.codex-plugin` 매니페스트, hooks.json (JSON stdin/stdout 프로토콜), skills(`specraft-setup`/`specraft-init`), MCP 등록 — mcp-proxy·게이트 로직 재사용, 훅 스키마는 M0.5 산출물 사용
- 검증: **S2·S4 수동 E2E** (실제 Codex 세션)

### M9. 프론트엔드 (apps/frontend) → **S6·S7 체크포인트**
- [ ] React(Vite) + 세션 인증: 로그인/가입(초대 링크 랜딩) 페이지
- [ ] wiki 뷰어 (브랜치 선택, 마크다운 렌더, 내부 링크 탐색), 자연어 쿼리 패널, ingest/query 로그 테이블, conflict 센터(목록·상세·지시 입력), admin 설정·멤버·초대 관리, api-key 관리
- [ ] UI 세부는 구현 재량 (spec §9.10 위임)
- 검증: **S7 수동 E2E** + **S6 전체 E2E** (프론트엔드 경유 conflict 해소)

### M10. 통합 검증 + 패키징
- [ ] S1~S7 + P1·P2 전체 체크리스트 실행 (CC·Codex 각각)
- [ ] OpenRouter 실 provider 종합 스모크 (M4 평가 하네스 최종 회전)
- [ ] **운영 안전장치** (Architect m-2 반영): wiki.git/specraft.db 백업 가이드(볼륨 스냅샷) 문서화, 기동 시 wiki.git integrity check(`git fsck` + 골격 3파일 존재) 및 복구 안내
- [ ] README(설치·온보딩·운영·시크릿/백업), docker compose 최종화, 데모 시나리오 문서
- 검증: acceptance criteria 전 항목 ✓

> 의존성: M0→**M0.5**→M1→(M2 ∥ M3)→M4→M5→M6→(M7 ∥ M8 — mcp-proxy 공통부 선행)→M9→M10. M2와 M3은 병렬 가능, M4의 실 LLM 평가 하네스는 M5~M6와 병행 트랙.

## Risks and Mitigations

| # | Risk | 영향 | Mitigation |
|---|------|------|------------|
| R1 | LLM merge 해결 품질 미달 — 잘못된 병합이 wiki 오염 | 高 | 보수적 프롬프트("불확실하면 실패 선언"), 실패 시 즉시 락(안전 기본값), 모든 병합은 git 커밋이므로 revert 가능, 사람 지시 경로(S6) 확보. **M4부터 실 provider 평가 하네스로 fail-closed율 연속 측정** (M10 절벽 제거) |
| R2 | CC/Codex 훅·플러그인 스키마 변동 (참고문서 구버전 확인됨) | 高→中 | **M0.5 walking-skeleton spike에서 선검증** (M7/M8에서 전진 배치), 검증된 스키마가 M1 계약의 입력. 어댑터 레이어 최소화 |
| R3 | ~~OpenRouter 문서 미도착~~ → **전제 폐기**: `docs/external/openrouter/` 13개 문서 존재 확인됨 | 解消 | 엔지니어링 리스크는 MockProvider(CI 결정성)로, **모델 품질 리스크(R1)는 M4 실 provider 평가 하네스로** 분리 대응 |
| R4 | Stop 게이트 무한 block 루프 (ingest 불가 상황) | 中 | **M0.5에서 block-and-continue 루프 실세션 선검증**, 게이트 메시지에 원인·해결책 명시(`specraft_status` 자가진단 유도), **동일 사유 3회(기본값, 설정 가능) 반복 시 안내 강화 — M0.5 실측으로 보정**, strict_mode=false 탈출구 문서화, 서버 다운 vs git 지연 구분(M3 fetch 바운딩) |
| R5 | P1 직렬화·DAG 정렬 동시성 버그 + worktree 경합 | 中 | **per-branch 큐**(브랜치 간 병렬·브랜치 내 직렬 — spec "타 브랜치 정상 동작" 보장), 큐 내 락 재검사, lazy-merge 큐 편입, worktree 풀 + 기동 시 prune, fixture repo 결정적 테스트 |
| R6 | wiki 품질 드리프트 (LLM 자율 영역 비대화) | 低 | 에이전트 시스템 프롬프트에 진화 규칙·index/log 필수 갱신 강제, log.md로 추적 가능성 확보 (v2: lint 패스) |
| R7 | git credential 평문 노출 / 서버 시크릿 분실 | 中 | `SPECRAFT_SECRET` 필수 env(부재 시 fail-fast) + HKDF 키 파생 암호화, 로그 마스킹, SSH key 권한 600, 시크릿 분실 시 credential 재입력 절차 문서화 |
| R8 | **비정상 종료(SIGKILL) 시 ingest 무음 소실** — Stop hook 미실행 경로라 정상 게이트로 차단 불가 | 中 | **세션 마커 + 다음 세션 pending-replay 지시(M7, spec 부록 A D1)** — 세션 상태 파일에 ingested/resolved 추적, 다음 세션 시작 훅이 미해소 마커 스캔 후 에이전트에게 직전 작업 ingest 지시. 비정상 종료 E2E로 검증 |

## Verification Steps

0. **스파이크**: M0.5 — 훅 발화·게이트 block 루프 실세션 검증 (최대 통합 리스크 선해소)
1. **단위**: M1 스키마(P2 거부·에러 표현), M3 P1 정렬·force-push 감지·worktree 크래시 복구·락 레이스, M4 에이전트 루프(mock), M7 게이트 판정 매트릭스(**dirty-uncommitted 셀 포함** 전 조합)
2. **통합**: M2-S1(+시크릿 fail-fast), M5-S3·P1·P2, M6-S5·S6(서버측) — fixture git repo + MockProvider로 CI 가능
3. **품질 (병행)**: M4~ 실 OpenRouter 평가 하네스 — 충돌 fixture 세트로 Merge Agent fail-closed율 측정
4. **E2E (수동)**: M7-S2·S4(CC) + **비정상 종료 pending-replay(S4 인접 — 강제 킬 → 다음 세션 지시 주입)**, M8-S2·S4(Codex), M9-S6·S7 — 실제 에이전트 세션
5. **최종**: M10에서 spec Acceptance Criteria 체크리스트 전 항목 서명

## Open Items (계획 수준에서 인지)

- CC/Codex 훅 스키마는 M0.5 검증 결과가 정본 — CC에 SessionStart/PostCompact 부재 판명 시 M0.5 컨틴전시(UserPromptSubmit 대체) 발동, §9.6 매핑 갱신 (주입 메커니즘 재설계 수준 — spec의 가치 결정 자체는 불변)
- 운영 관측(구조화 요청 로그 + LLM 에이전트 tool-call 트레이스 — R1 merge 실패 디버깅에 필요): v1은 최소(요청 로그 + 에이전트 트레이스 파일), 고도화는 v2
- wiki.git/specraft.db 백업·복구: v1은 가이드 문서 + 기동 integrity check(M10), 자동 백업은 v2
- spec 경로 정정: 참고문서가 `docs/external/` 하위로 재편됨 (claude-code-codex-docs, openrouter) — spec 본문의 `docs/openrouter/` 표기는 `docs/external/openrouter/`를 가리킴
- ~~D1~D8 원문 미상~~ → **해소됨**: spec 부록 A에 D1~D9 원문 + 게이트 영향 분류 복원 (Deep Interview Round 18·19 대화 기록 기반, Critic MAJOR-1 대응)

## ADR

**Decision**: specraft v1을 "계약 우선 + 레이어 빌드업 + 시나리오 체크포인트 + 선행 통합 스파이크"(Option C + M0.5)로 구현한다. wiki SoT는 bare git repo, LLM은 자체 추상화 + OpenRouter 즉시 구현(+MockProvider CI 스파인), 동시성은 per-branch 큐 + worktree 풀, 게이트는 hard block(무결성 경로 stale 금지)이다.

**Drivers**: ① S1~S7+P1·P2 전부 충족하는 최단·최저위험 경로 ② 컴포넌트 병렬 작업을 위한 계약 선확정 ③ spec 확정 결정(TS·bare git·OpenRouter·1:1 Docker·hard 게이트) 무수정 계승.

**Alternatives considered**:
- *Option A (수직 슬라이스)*: 기각 — 공유 인프라(bare git/worktree/LLM 루프) 반복 재방문 비용 과대. 단 A의 핵심 통찰("최대 통합 리스크를 가장 먼저 검증")은 M0.5 walking-skeleton으로 흡수 (Architect steelman 합의).
- *Option B (순수 레이어드)*: 기각 — hard Stop 게이트×훅 발화라는 최대 통합 리스크를 최후로 미룸.
- *wiki SoT를 DB로*: 기각 (spec R5 Contrarian 라운드) — 브랜치/머지/conflict/이력 재발명 비용 > 구조화 쿼리 이득.
- *글로벌 작업 큐*: 기각 (Architect Tension 1) — spec의 "타 브랜치 정상 동작" 보장 위반. per-branch 큐 채택.
- *MockProvider만으로 M9까지 진행 후 실 LLM은 M10 스모크*: 기각 (Architect M-3) — OpenRouter 문서가 이미 존재하고, R1(merge 품질)은 mock으로 측정 불가한 핵심 가치 리스크. M4부터 실 provider 평가 하네스 병행.

**Why chosen**: C+M0.5는 B의 구조적 명확성·병렬성을 유지하면서, A의 조기 통합 검증(스파이크)과 품질 신호 연속화(평가 하네스)를 접목해 두 옵션의 결함을 모두 보완한다. 모든 결정이 사용자 승인 spec의 가치 위계(spec 무결성 > 가용성, git 위임, CC/Codex 대칭)와 정합한다.

**Consequences**:
- (+) 최대 리스크 2건(훅 실동작, 게이트 UX)이 M0.5(저비용·폐기 가능)에서 조기 판명 — 실패해도 손실 제한적
- (+) M1 계약 고정 후 M2∥M3, M7∥M8 병렬 가능
- (+) R1이 M4부터 연속 측정 신호로 전환, M6 진입 게이트(fail-closed ≥95%) 확보
- (−) M0.5·계약 설계의 선투자 (단 spec §9.3~9.8이 계약 초안이라 비용 낮음)
- (−) worktree 풀·per-branch 큐는 글로벌 큐 대비 구현 복잡도 증가 — spec의 브랜치 독립성 보장을 위한 수용 비용
- (−) hard 게이트는 서버 장애 시 팀 작업 중단을 의미 — 사용자가 명시적으로 선택한 트레이드오프 (D1)

**Follow-ups**: M0.5 결과에 따른 §9.6 매핑 확정(컨틴전시 포함 — **발동 시 pending-replay 스캔도 UserPromptSubmit 경로로 동반 이전**), v2 후보(자동 백업, wiki lint 패스, 관측 고도화, 임베딩 검색, 멀티 프로젝트)는 Non-Goals 유지.

## Changelog

- 2026-06-06 사용자 확정 (consensus 후 위임 해소 — 합의 결정 변경 아님):
  - **서버 프레임워크 = Fastify** (spec §9.10 위임 범위 내 결정. Architecture Decisions 표·M0에 반영. Next.js 검토 후 기각: 상태 보유 장기 실행 프로세스와 실행 모델 충돌)
- Critic 2차 리뷰(REVISE — 신규 CRITICAL 1건) 대응:
  - **M7에 비정상 종료 pending-replay 태스크 신설** (CRITICAL-1: 부록 A D1의 pending-마커 절을 §9.5 세션 상태 파일에 통합 구현 — 정본과 실행계획 일치 회복). 출처 검증: 해당 절은 가필이 아닌 Round 18 제시 표 원문으로, hard block 전환 후 SIGKILL 경로에 한해 유효 — spec 부록 A에 출처 각주 추가
  - **R8 리스크 행 추가** (MINOR-1: 비정상 종료 ingest 소실 + 완화 추적), Verification에 비정상 종료 E2E 추가
- Critic 1차 리뷰(REVISE → 반영 후 재평가) 대응:
  - **spec 부록 A 신설** (MAJOR-1: D1~D9 원문 + 게이트 영향 분류 복원 — Round 18·19 대화 기록 기반), M7 "완전 열거" 문구를 부록 A 참조로 정정
  - **M3 stale-fallback 경로 분리 명문화** (MINOR-1: read 경로만 stale 허용, 게이트/P2 무결성 경로는 fresh 실패 처리)
  - M5 `/api/v1` 축약 표기 명시(MINOR-2), R4 N=3 기본값(MINOR-3), M0.5 합격 기준 정량화 + CC SessionStart 부재 컨틴전시, M4 Init Agent P1 면제·P2 적용 명시, M6 진입 게이트(fail-closed ≥95%), ADR 작성
- v1 draft → Architect 리뷰(APPROVE_WITH_IMPROVEMENTS) 반영:
  - **M0.5 Walking-Skeleton Spike 신설** (M-1: 최대 통합 리스크였던 훅 발화·게이트 루프를 M7→M0.5로 전진, 훅 스키마 재검증도 M7/M8에서 이동)
  - **M3에 Worktree & Concurrency Model 태스크 신설** (B-1: worktree 풀·단일 체크아웃 불변식·기동 시 prune / M-2: per-branch 큐 확정 + 큐 내 락 재검사 + lazy-merge 큐 편입으로 레이스 차단)
  - **M3 in-request fetch 바운딩** (Tension 3: 타임아웃 + 서버 다운 vs git 지연 구분 — 게이트 오발동 방지)
  - **M4에 OpenRouter 구현체 즉시 편입 + 실 provider 품질 평가 병행 트랙** (M-3: docs/external/openrouter/ 존재 확인으로 R3 전제 폐기, Tension 2: R1 품질 리스크를 연속 신호화)
  - **M1 에러 표현 통일** (m-1: 409 락 / 422+body rejected 단일 규약)
  - **M2 서버 시크릿 정의** (m-3: SPECRAFT_SECRET 필수 env + fail-fast + HKDF)
  - **M7 게이트 판정 매트릭스에 dirty-uncommitted 셀 명시** (m-4: D9 면제 조건 엄밀화)
  - **M10 운영 안전장치 + Open Items 확장** (m-2: 백업 가이드·integrity check·관측 최소선)
