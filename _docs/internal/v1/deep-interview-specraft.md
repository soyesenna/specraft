# Deep Interview Spec: specraft — AI-Driven Development를 위한 단일 Spec Source

## Metadata
- Interview ID: 77113756-19ad-4915-bcd5-46bdf32213bc
- Rounds: 19 (+ Round 0 토폴로지 게이트, + Round 20 최종 spec 검토)
- Final Ambiguity Score: **4.6%** (Round 20 spec 전체 승인 — 목표 5% 미만 달성)
- Type: greenfield
- Generated: 2026-06-05 (KST) / 2026-06-04T18:40:00Z (UTC)
- Threshold: 0.05 (5%)
- Threshold Source: user-arguments("목표 모호도 5% 미만"; `~/.claude/settings.json`·`./.claude/settings.json`에 `omc.deepInterview.ambiguityThreshold` 미설정 — default 0.2를 사용자 명시값으로 오버라이드)
- Initial Context Summarized: no (raw-spec.md 적정 크기)
- Status: PASSED (Round 20에서 spec 전체 승인 — §9 계약 정의 및 §9.6·D9 판단 포함)
- Revision: 2026-06-06 — §9.10 위임 항목이던 서버 프레임워크를 **Fastify**로 확정(위임 해소, spec 결정 재론 아님) + stale 표기 2곳 사실 정정(OpenRouter 문서 존재, DESIGN.md 정본 등장) + 앱 네이밍을 `backend`/`frontend`로 정리

## Clarity Breakdown (최종 — Round 20 승인 후)

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.96 | 0.40 | 0.384 |
| Constraint Clarity | 0.95 | 0.30 | 0.285 |
| Success Criteria | 0.95 | 0.30 | 0.285 |
| **Total Clarity** | | | **0.954** |
| **Ambiguity** | | | **0.046 (4.6%) ✓ ≤ 5%** |

> 크리스탈라이즈 시점 잔여 11.4%는 "사용자 의도의 모호함"이 아니라 "문서가 명문화해야 할 계약"이었으며, Technical Context §9에서 전부 정의하고 Round 20에서 사용자가 spec 전체(§9.6 차단 설계·§9.11 D9 포함)를 승인함으로써 해소됨. 잔여 4.6%는 §9.10에 명시적으로 위임된 구현 재량.

## Topology

| Component | Status | Description | Coverage / Deferral Note |
|-----------|--------|-------------|--------------------------|
| server-core | active | llm-wiki 저장소 + LLM 문서 엔진 (ingest 통합·갱신, query 탐색·응답) | S2~S4, P1·P2로 커버. 엔진=직접 API(R1), 저장=bare git(R5), provider=자체 추상화+OpenRouter(R9), wiki 골격(R12), bootstrap(R17) |
| git-sync | active | 코드↔문서 브랜치 1:1 미러링, merge 전파, LLM conflict 해결+브랜치 락, commit 순서 보장 | S5·S6, P1·P2로 커버. 서버 clone/fetch(R2), lazy 감지+브랜치 락(R10), 호스팅 중립 credential(R13), force-push 정책(R18 D3) |
| plugins | active | CC/Codex 플러그인 — 세션 시작 맥락 주입, 작업 중 query, 종료 시 ingest 게이트 | S2~S4로 커버. 훅 구조(R3), ingest=에이전트 작성+Stop 게이트(R7), 설치·설정(R14), init(R17), hard 게이트(R18)+strict_mode(R19) |
| frontend | active | 사람용 웹 UI — 문서 열람(읽기 전용)·자연어 쿼리·이력/로그·conflict 센터 | S6·S7로 커버. 기능 4종(R4), React 스택(R8). UI 세부는 구현 재량(§9.10) |
| auth | active | admin 부트스트랩, 초대 링크 가입, api-key 발급, 작성자 기록·로그 | S1로 커버. admin/member 2역할(R15), 보안 기본값(R18 D5) |

Deferral: 없음 (R0·R11에서 5컴포넌트/7시나리오 전부 v1 필수 확정)

## Goal

**specraft는 AI-Driven Development 팀의 "단일 spec source" 서버다.** 프로젝트의 기능 spec·아키텍처·결정 근거·구현 진도를 llm-wiki 방법론(LLM이 문서를 전적으로 작성·유지보수하고 사람은 열람만)으로 관리한다.

핵심 가치 루프:
1. **주입**: 팀원이 Claude Code/Codex 세션을 시작하면 플러그인이 specraft 서버에서 프로젝트의 포괄적 최신 맥락(overview + index)을 자동 주입받는다 — 에이전트가 매번 repo를 탐색하는 비효율 제거.
2. **질의**: 작업 중 에이전트가 구체 spec이 필요하면 MCP 도구 `specraft_query`로 서버에 질의하고, 서버 LLM이 wiki를 탐색해 상세·최신 정보를 응답한다.
3. **환류**: 세션 종료 시 Stop 게이트가 commit→push→ingest를 강제하고, 에이전트가 작성한 구조화 요약을 서버 LLM이 wiki에 통합한다 — spec이 항상 코드와 함께 진화.
4. **동기화**: 문서 브랜치는 코드 git 브랜치와 1:1 미러링되고, 코드 merge 시 문서도 merge된다(LLM이 conflict 1차 해결, 실패 시 브랜치 락 + 사람이 프론트엔드에서 자연어 지시로 해소).

**시스템의 성격 규정 결정: spec 무결성 > 가용성** — 서버 접근 불가 시 종료 게이트는 hard block(ingest 누락 절대 불허), 세션 시작 차단 여부는 `strict_mode` 설정(기본 hard).

## Constraints

- **테넌시**: 1 서버 인스턴스 = 1 프로젝트(코드 repo 1개). Docker(compose)로 셀프호스트.
- **스택**: TypeScript 통합 — 백엔드(Node + **Fastify**, 2026-06-06 §9.10 위임 해소로 확정), 프론트엔드(React), MCP 프록시·훅 스크립트까지 단일 언어.
- **LLM**: 자체 provider 추상화 인터페이스 + v1 구현체는 OpenRouter만. `OPENROUTER_API_KEY`는 env, 모델 슬러그는 env 기본값 + admin 프론트엔드에서 변경(ingest용/query용 분리 설정 가능). *(참고: `docs/external/openrouter/` 13개 문서 제공 완료)*
- **wiki 저장**: 서버 관리 bare git repo가 source of truth. 운영 데이터(계정·키·로그·락·설정)는 SQLite.
- **git 연동**: 서버가 코드 repo를 bare mirror로 clone/fetch. 호스팅 중립 — admin이 remote URL + credential(HTTPS PAT 또는 SSH deploy key) 등록. 표준 git 프로토콜만 사용.
- **merge 감지**: 요청 시 lazy fetch (웹훅·폴링 인프라 없음). conflict 락은 **브랜치 단위** (타 브랜치 정상 동작).
- **플러그인 훅**: CC·Codex 모두 `SessionStart`(주입) + `PostCompact`(재주입) + `Stop`(게이트) — 양 플랫폼 대칭. query/ingest는 플러그인 동봉 **로컬 stdio MCP 프록시 → 서버 REST** 경유.
- **설정 위치**: 팀 공유(`.specraft.json` — 서버 URL 등)는 repo 커밋, api-key는 개인 영역(`SPECRAFT_API_KEY` env 또는 `~/.specraft/credentials`). `/specraft-setup` 대화형 온보딩 명령 제공.
- **장애 정책**: Stop 게이트 = hard block (서버 불가 시 종료 차단, 서버 장애 = 작업 중단 감수). 세션 시작 주입 실패 = `.specraft.json`의 `strict_mode`로 선택 (기본 `true` = 세션 차단).
- **권한**: admin/member 2역할. conflict 해결 지시는 모든 member 가능. api-key는 본인이 발급·재발급·폐기.
- **보안 기본값**: argon2 비밀번호 해시, httpOnly 세션 쿠키(프론트엔드), api-key는 1회 노출 + 해시 저장 + `sk-spcrft-` prefix.
- **force-push/rebase**: v1 미지원 — non-fast-forward 감지 시 해당 브랜치 락 + conflict 센터 표시, 사람 지시로 문서 브랜치 리셋.
- **명칭**: raw-spec의 "ibstrom"은 specraft와 동일 대상 (specraft로 통일).

## Non-Goals

- 멀티 프로젝트/멀티테넌시 (v1은 1인스턴스=1프로젝트, 스키마 확장 여지도 v1 범위 아님)
- SaaS/클라우드 호스팅 운영
- **사람의 wiki 직접 편집** (영구 원칙 — 사람은 열람과 자연어 지시만)
- 웹훅/실시간 push 알림 (lazy 감지로 충분)
- force-push/rebase 이력 재작성 추적
- 임베딩/벡터 검색 (v1은 index.md + ripgrep; llm-wiki.md의 "moderate scale이면 index로 충분" 원칙)
- CC/Codex 외 에이전트 지원 (Cursor, Windsurf 등)
- viewer(열람 전용) 역할
- 코드 repo에 대한 쓰기 작업 (서버는 코드 repo에 read-only)

## Acceptance Criteria

**E2E 시나리오 (S1~S7):**

- [ ] **S1 (auth)**: `docker compose up` → 최초 접속 시 admin 생성 화면 → admin이 초대 링크 생성 → 그 링크로 email/password/name 가입 성공 → 프론트엔드에서 api-key 발급(1회 노출)
- [ ] **S2 (plugins)**: CC·Codex **각각에서** — 새 세션 첫 턴에 "이 프로젝트가 뭔지 아니?" 질문 시 에이전트가 repo 탐색 없이 wiki(overview) 기반으로 답변. `/compact` 후 턴에서도 동일 (재주입 확인)
- [ ] **S3 (query)**: 에이전트가 `specraft_query` 호출 → 응답에 wiki 페이지 인용 포함 → 서버 query 로그에 호출자(api-key 주인) 기록
- [ ] **S4 (ingest 게이트)**: ingest 없이 세션 종료 시도 → Stop 게이트 차단(continuePrompt/지시 발동). ingest+commit+push 완료 후 종료 허용 → wiki repo 해당 브랜치에 새 commit + `log.md` 엔트리 + 프론트엔드 이력에 작성자 표시
- [ ] **S5 (merge 전파)**: `feat/x`→`dev` 코드 merge 후 dev에서 첫 요청 → 문서 브랜치 `feat/x`가 `dev`로 merge됨 (wiki git log로 검증)
- [ ] **S6 (conflict)**: 의도적 충돌 케이스 → LLM 해결 실패 → 해당 브랜치 query/ingest가 409 거부 + conflict 센터 표시 → 사람 지시 입력 → 재병합 성공 + 락 해제 (타 브랜치는 내내 정상)
- [ ] **S7 (frontend)**: 브랜치 선택 → 렌더링된 wiki 열람·링크 탐색, 자연어 쿼리 → 응답, ingest/query 로그 목록 조회

**정책 검증 (P1~P2):**

- [ ] **P1 (순서 보장)**: 같은 브랜치에 부모 커밋 A·자식 커밋 B의 ingest가 역순 도착해도 wiki 처리 순서는 A→B (git 이력 기준 정렬)
- [ ] **P2 (push 강제의 서버측 검증)**: push 안 된 commit hash로 ingest 요청 시 서버가 fetch 후에도 해당 커밋을 못 찾으면 거부 — 클라이언트 훅 우회까지 차단

## Assumptions Exposed & Resolved

| # | Assumption/미정 | Challenge | Resolution |
|---|----------------|-----------|------------|
| R0 | 토폴로지 형태 | 5컴포넌트 열거 확인 | server-core/git-sync/plugins/frontend/auth 확정, deferral 없음 |
| R1 | "LLM에게 맡긴다"의 실체 | 엔진 구동 방식 3택 | **직접 LLM API 호출** (자체 에이전트 루프 + 자체 wiki 도구) |
| R2 | "서버가 git을 안다"의 실체 | 정보 소스 4택 | **서버가 repo clone/fetch** (bare mirror, git DAG 직접 판정) |
| R3 | 플러그인 메커니즘 | 훅 vs MCP vs 파일 동기화 | **훅 주입(세션당 1회) + MCP query + Stop ingest + compact 후 재주입** |
| R4 | 막힌 conflict는 누가 푸나 (spec상 사람은 수정 불가) | 프론트엔드 기능 범위 | 열람+쿼리+로그+**conflict 센터(사람이 자연어 지시→LLM 재병합)** 전부 채택 |
| R5 | 브랜치 시스템을 직접 만들어야 한다는 가정 | 🔥Contrarian: "그냥 git을 쓰면?" | **bare git repo가 wiki source of truth** — 브랜치/머지/conflict/이력 전부 git 위임 |
| R6 | 배포·테넌시 | 1:1 vs 1:N vs SaaS | **1 인스턴스 = 1 프로젝트**, Docker 셀프호스트 |
| R7 | ingest 페이로드 작성 주체 | 훅(셸)은 지능이 없음 | **에이전트가 구조화 요약 작성 + Stop 게이트가 강제** (transcript 전송 아님) |
| R8 | 기술 스택 | 4택 | **TypeScript 통합** (백엔드 Node + 프론트엔드 React + 프록시/훅 TS) |
| R9 | provider 전략 (R1 동기 확인) | 추상화 수준 3택 | **자체 추상화 + v1은 OpenRouter만** (docs/openrouter/ 추가 예정) |
| R10 | merge 감지 시점 + "모든 요청 거부"의 범위 | 문구 그대로(전역)인가? | **요청 시 lazy 감지 + 브랜치 단위 락** (raw-spec 22행은 브랜치 스코프로 해석 확정) |
| R11 | v1 범위 | 🔪Simplifier: 줄일 수 있나? | **7개 시나리오 전부 v1 필수** (축소 거부) |
| R12 | wiki 페이지 구조 | 고정 스키마 vs 자율 | **골격만 고정(index/log/overview) + 하위 구조는 서버 LLM 자율 진화** |
| R13 | git 호스팅·credential | GitHub 종속 여부 | **호스팅 중립** — admin이 URL+PAT/SSH key 등록 |
| R14 | 설치·설정 위치 | repo vs 개인 vs 대화형 | **URL은 repo 파일 + key는 개인 env + `/specraft-setup` 대화형 온보딩** |
| R15 | 권한 경계 | conflict 지시 권한 | **admin/member 2역할, conflict 지시는 모두 가능** |
| R16 | 판정 기준의 기계화 | S1~S7+P1·P2 초안 검토 | **전부 확정** |
| R17 | 최초 wiki는 어떻게 생기나 (raw-spec에 없던 구멍) | 생성 주체 3택 | **`/specraft-init` — 로컬 에이전트가 repo 분석 후 구조화 대량 ingest** |
| R18 | 엣지 정책 8건 (D1~D8) | 기본값 패키지 | **수용, 단 D1은 hard block** (spec 무결성 > 가용성) |
| R19 | hard block의 파생: 주입 실패 시 | hard vs soft vs 설정 | **`strict_mode` 설정으로 선택 (기본 hard)** |

## 부록 A: 기본값 패키지 D1~D9 원문 (Round 18·19 제시·승인 기록 — Critic MAJOR-1 해소를 위한 복원)

| # | 항목 | 확정 내용 | Stop 게이트 영향 |
|---|------|----------|----------------|
| D1 | 서버 장애 정책 | **hard block** (사용자가 soft-fail 제안을 hard로 변경): 서버 접근 불가 시 Stop 게이트가 종료를 계속 차단 — ingest 누락 절대 불허, 서버 장애 = 작업 중단 감수. 비정상 종료(프로세스 강제 킬) 대비 미전송 ingest는 로컬 pending 마커로 보관, 다음 세션 시작 시 에이전트에게 작성·전송 지시 | **직접** (게이트 동작 그 자체) |
| D2 | 새 브랜치 문서 분기 | 새 코드 브랜치에서 첫 요청 시 lazy 분기 — 요청 commit hash 기준 부모 브랜치에서 | 없음 (git-sync) |
| D3 | force-push/rebase | v1 미지원 — fetch 시 non-fast-forward 감지하면 해당 브랜치 락 + conflict 센터 표시, 사람 지시로 문서 브랜치 리셋 | 없음 (git-sync — 단 락된 브랜치는 ingest 409로 게이트에 표면화) |
| D4 | 모델·키 설정 | `OPENROUTER_API_KEY`는 env, 모델 슬러그는 env 기본값 + admin 프론트엔드에서 변경 (ingest용/query용 분리 설정 가능) | 없음 (server-core 설정) |
| D5 | 비밀번호·키 보안 | argon2 해시 + httpOnly 세션 쿠키. api-key는 발급 시 1회 노출, 서버엔 해시 저장, `sk-spcrft-` prefix | 없음 (auth) |
| D6 | merge된 문서 브랜치 | 삭제하지 않고 보존 (git이라 저렴, 이력 가치) | 없음 (git-sync) |
| D7 | MCP 연결 방식 | 플러그인 동봉 로컬 stdio MCP 프록시 → 서버 REST API 호출 (CC·Codex 양쪽 동일 동작 보장) | **간접** (게이트의 "ingested" 판정이 프록시의 세션 상태 마킹에 의존 — §9.5) |
| D8 | 명칭 통일 | raw-spec의 "ibstrom" = specraft로 통일 | 없음 (문서) |
| D9 | read-only 세션 면제 | 워킹트리 clean **AND** 신규 커밋 0 **AND** 세션 중 변경 이력 없음 → Stop 게이트의 ingest 강제 면제 (노이즈 ingest 방지). dirty-uncommitted(변경 있음·커밋 없음)는 면제 아님 — clean 검사에서 차단 후 commit→push→ingest 지시 | **직접** (게이트 판정 매트릭스 셀) |

> 게이트 판정 매트릭스에 들어가는 D-항목은 **D1, D9** (+D7 간접). 나머지(D2~D6, D8)는 게이트 비관련으로 각 담당 컴포넌트에 귀속.

**출처 각주 (복원 충실도):** 이 표는 Round 18에서 제시되고 사용자가 "수용하되 D1은 hard block"으로 패키지 승인한 표의 복원이다. D1의 pending-마커 절("미전송 ingest 로컬 보관, 다음 세션 재전송")과 D6("merge된 브랜치 보존")은 본문 Constraints에 누락되었으나 **Round 18 제시 표의 원문에 실재**한다 — 인터뷰 트랜스크립트(R18 요약 행)는 라벨만 기록했고 제시 표 전문은 플래너 대화 기록이 정본. D1의 pending 절은 원래 soft-fail 옵션 문맥이었으나, hard block 전환 후에도 **비정상 종료(SIGKILL — Stop hook 미실행) 경로**에 한해 유효하게 재맥락화됨: 정상 종료는 게이트가 ingest를 강제하므로 pending이 생기지 않고, 강제 킬 경로의 무음 소실만 이 절이 방어한다.

## Technical Context

### 9.1 시스템 아키텍처

```
┌─────────────────────────────┐          ┌──────────────────────────────────────┐
│  팀원 로컬 (CC / Codex)        │          │  specraft 서버 (Docker, TS/Node)       │
│                             │          │                                      │
│  SessionStart ──────────────┼─────────►│  POST /api/v1/context                │
│  PostCompact  (재주입)        │          │   ├─ lazy fetch → merge 전파 시도      │
│                             │          │   └─ overview.md + index.md 반환      │
│  에이전트 ── MCP(stdio proxy) ┼─────────►│  POST /api/v1/query                  │
│              specraft_query │          │   └─ Query Agent: index→drill→인용응답 │
│              specraft_ingest│          │  POST /api/v1/ingest                 │
│  Stop hook (게이트:           │          │   └─ Ingest Agent: wiki 통합→commit   │
│   clean? pushed? ingested?) │          │                                      │
└─────────────────────────────┘          │  ┌────────────┐  ┌────────────────┐  │
                                         │  │ wiki.git    │  │ code-mirror/   │  │
┌─────────────────────────────┐          │  │ (bare, SoT) │  │ (bare, RO)     │  │
│  브라우저 (프론트엔드, React)      │─────────►│  └────────────┘  └────────────────┘  │
│  열람/쿼리/로그/conflict센터    │ session  │  ┌────────────┐  ┌────────────────┐  │
└─────────────────────────────┘  cookie  │  │ SQLite      │  │ LLM Engine     │  │
                                         │  │ (운영데이터)   │  │ (OpenRouter)   │  │
        코드 호스팅 (GitHub/GitLab/사내) ◄──┼──┤fetch (RO)                          │
                                         └──────────────────────────────────────┘
```

### 9.2 wiki 컨벤션 (골격 고정 + LLM 자율)

```
wiki.git (브랜치별로 이 트리 존재)
├── index.md      # [골격·고정] 전 페이지 카탈로그 — 링크 + 한 줄 요약. 매 ingest 시 갱신
├── log.md        # [골격·고정] append-only: "## [YYYY-MM-DD HH:mm] ingest|query|merge|conflict|init | 요약 | by {member}"
├── overview.md   # [골격·고정] 프로젝트 개요·아키텍처·현황 — 세션 시작 주입의 본체
└── (이하 자율)    # 서버 LLM이 프로젝트 특성에 맞게 생성·진화 (예: specs/, architecture/, decisions/, progress.md)
```

- 세션 시작 주입 페이로드 = `overview.md` 전문 + `index.md` 전문 (+ 브랜치·HEAD 메타). 상세는 query로 유도.
- wiki 커밋 author = ingest 요청자의 member 이름/이메일, committer = `specraft-server`.

### 9.3 REST API 계약 (v1)

인증: 플러그인 = `Authorization: Bearer sk-spcrft-...` / 프론트엔드 = 세션 쿠키.

| Method | Path | Body → Response | 비고 |
|--------|------|-----------------|------|
| POST | `/api/v1/context` | `{branch, commit_hash}` → `{overview, index, branch_status, wiki_head}` | lazy fetch + merge 전파 트리거. 409 if locked |
| POST | `/api/v1/query` | `{branch, commit_hash, question}` → `{answer, citations[], query_id}` | 409 if locked |
| POST | `/api/v1/ingest` | IngestPayload(§9.4) → `{status: accepted\|rejected, wiki_commit?, reason?}` | P1 순서 정렬, P2 커밋 존재 검증. 409 if locked |
| GET | `/api/v1/status` | → `{server: ok, branch_locks[], wiki_head_by_branch}` | 게이트·setup 헬스체크 |
| POST | `/api/v1/auth/signup` | `{invite_token, email, password, name}` | 초대 링크 경유만 가입 가능 |
| POST | `/api/v1/auth/login` | `{email, password}` → 세션 쿠키 | |
| POST/GET/DELETE | `/api/v1/keys` | api-key 발급(1회 노출)/목록/폐기 | member 본인 것만 |
| POST | `/api/v1/admin/invites` | → `{invite_url, expires_at}` | admin |
| PUT | `/api/v1/admin/settings` | `{git_remote_url?, git_credential?, model_ingest?, model_query?}` | admin. credential은 암호화 저장 |
| PUT | `/api/v1/admin/members/:id/disable` | | admin |
| GET | `/api/v1/conflicts` · POST `/api/v1/conflicts/:id/resolve` | `{directive}` → 재병합 시도 결과 | 지시는 모든 member 가능 |
| GET | `/api/v1/logs/ingests` · `/api/v1/logs/queries` | 페이지네이션 | |
| GET | `/api/v1/wiki/:branch/tree` · `/api/v1/wiki/:branch/page?path=` | 프론트엔드 열람용 (read-only) | |

### 9.4 IngestPayload 스키마

```jsonc
{
  "branch": "feat/abc",
  "commit_hash": "abc123...",          // 프록시가 로컬 HEAD에서 자동 수집
  "agent": "claude-code" | "codex",
  "session_id": "...",                  // 프록시 생성
  "summary": "이번 세션 작업의 자연어 요약",
  "spec_changes": [{
    "type": "added" | "modified" | "removed",
    "area": "기능/모듈 영역명",
    "description": "무엇이 어떻게 바뀌었나",
    "reasoning": "왜 그렇게 결정했나"
  }],
  "progress_updates": [{ "feature": "...", "status": "planned|in_progress|done|blocked", "note": "..." }],
  "open_questions": ["미해결 사항·후속 확인 필요 항목"]
}
```

### 9.5 MCP 도구 (플러그인 동봉 stdio 프록시)

| Tool | 입력 | 동작 |
|------|------|------|
| `specraft_query` | `{question}` | 프록시가 branch/HEAD 자동 수집 → `/api/v1/query` → 인용 포함 응답 반환 |
| `specraft_ingest` | IngestPayload의 summary/spec_changes/progress_updates/open_questions | 프록시가 branch/HEAD 수집, **로컬 push 여부 사전 확인** → `/api/v1/ingest` → 성공 시 세션 상태 파일에 "ingested" 마킹 |
| `specraft_status` | — | `/api/v1/status` — 락/연결 확인 (게이트 디버깅·에이전트 자가진단용) |

프록시는 `~/.specraft/sessions/{session_id}.json`에 세션 상태(ingested 여부)를 기록 — Stop 게이트가 이 파일로 판정.

### 9.6 훅 매핑 (CC ↔ Codex 대칭)

| 동작 | Claude Code | Codex | 공통 로직 (TS 스크립트) |
|------|-------------|-------|------------------------|
| 세션 시작 주입 | `SessionStart` | `SessionStart` | `/context` 호출 → 컨텍스트 출력(주입). 실패 시 `strict_mode`에 따라: true→차단 플래그 기록, false→경고 주입 |
| strict 차단 집행 | `UserPromptSubmit` (차단 플래그 시 block) | `UserPromptSubmit` (decision: deny) | CC의 SessionStart는 차단 불가하므로 차단은 UserPromptSubmit에서 집행 |
| compact 후 재주입 | `PostCompact` | `PostCompact` | `/context` 재호출 → 재주입 |
| 종료 게이트 | `Stop` (block + 지시) | `Stop` (`decision: block` + `continuePrompt`) | 검사: ① 워킹트리 clean ② HEAD push됨 ③ 세션 ingest 마킹 존재. 미충족 → block + "commit/push/ingest를 완료하라" 지시. **read-only 세션(변경·커밋 0건)은 ingest 면제(D9)** |
| 온보딩 | `/specraft-setup` 커맨드 | `specraft-setup` 스킬 | 초대링크/URL 입력 → key 발급 → 로컬 저장 |
| 초기화 | `/specraft-init` 커맨드 | `specraft-init` 스킬 | 에이전트가 repo 분석 → 구조화 대량 ingest |

> 참고: 인터뷰 중 검증된 사실 — 참고문서(03-hooks-comparison.md)의 "CC 훅 5종"은 구버전 정보. 실사용 settings.json에서 `SessionStart`·`PreCompact`·`PostCompact`·`SubagentStart/Stop` 작동 확인. 구현 시 양 플랫폼 최신 훅 스키마 재검증 필요.

### 9.7 서버 LLM 엔진 (직접 API 호출 에이전트 루프)

- Provider 추상화: `interface LLMProvider { complete(req): ...; }` — v1 구현체 `OpenRouterProvider` (OpenAI 호환 API). 도구 호출 루프는 자체 구현.
- 에이전트 도구(서버 내부): `wiki_read(path)`, `wiki_write(path, content)`, `wiki_list()`, `wiki_search(pattern)`(ripgrep), `wiki_delete(path)`, `code_log(range)`, `code_diff(range)`(코드 미러 read-only 조회)
- **Ingest Agent**: payload + 대상 브랜치 worktree → 관련 페이지 갱신(여러 파일 가능) + index.md/log.md 필수 갱신 → 단일 commit(author=member)
- **Query Agent**: index.md → 관련 페이지 드릴다운 → 인용(`파일#섹션`) 포함 응답. 응답을 wiki에 환류하지는 않음(v1) — 로그만 기록
- **Merge Agent**: `git merge` 시도 → conflict 파일을 의미 단위로 병합 시도 → 자신 없으면 실패 선언 → 브랜치 락 + conflict 레코드 생성. ResolutionDirective 수신 시 지시 반영 재시도
- **Init Agent**: `/specraft-init`의 대량 ingest 묶음을 받아 초기 overview/index 편성
- 직렬화: 브랜치당 단일 작업 큐. 동일 브랜치 동시 ingest는 commit DAG 위상 순서로 정렬(P1). 큐 처리 전 fetch로 커밋 존재 검증(P2)

### 9.8 데이터 모델 (SQLite)

```
members(id, email UNIQUE, password_hash, name, role[admin|member], disabled_at)
invites(token UNIQUE, created_by→members, expires_at, used_at, used_by→members)
api_keys(id, member_id→members, key_hash, prefix, name, created_at, revoked_at)
ingest_logs(id, member_id, branch, commit_hash, status[accepted|rejected], summary, wiki_commit, created_at)
query_logs(id, member_id, branch, question, created_at)
conflicts(id, branch, source_branch, state[open|resolving|resolved], detail, created_at, resolved_at, resolved_by, directive)
branch_locks(branch UNIQUE, conflict_id→conflicts, locked_at)
settings(key UNIQUE, value)   -- git_remote_url, git_credential(암호화), model_ingest, model_query 등
```

### 9.9 저장소·배포 구조

```
서버 데이터 볼륨: /data/{code-mirror/(bare,RO), wiki.git/(bare,SoT), workspace/(임시 worktree), specraft.db}

모노레포:
specraft/
├── apps/backend/       # Fastify API + LLM 엔진 + git-sync (+ 프론트엔드 정적 서빙)
├── apps/frontend/      # React (Vite)
├── packages/shared/    # 공유 타입·API 클라이언트
├── packages/mcp-proxy/ # stdio MCP 프록시 (플러그인 동봉)
├── plugins/claude-code/ # .claude-plugin (hooks + commands + .mcp.json)
├── plugins/codex/      # .codex-plugin (hooks + skills + mcp)
└── docker-compose.yml
```

### 9.10 구현 재량 위임 (모호함이 아닌 명시적 위임)

- 프론트엔드 세부 UI/UX — 단 2026-06-06부터 루트 `DESIGN.md` + `specraft-ui.pen`이 UI 정본 (이 위임은 해당 정본 범위 내 세부 재량으로 축소. 기능 요건 §R4·S7 충족 전제)
- ~~서버 프레임워크 선택 (Fastify/Hono/Express 등 — TS이면 무방)~~ → **Fastify로 확정** (2026-06-06 사용자 결정 — 본 항목의 위임 범위 내 해소. Next.js 검토 후 기각: 상태 보유 장기 실행 프로세스(per-branch 큐·LLM 루프·worktree/SQLite)와 실행 모델 충돌)
- query 응답 스트리밍 여부, 컨텍스트 캐싱, 큐 구현 방식
- wiki 자율 영역의 디렉토리 명명 (서버 LLM 시스템 프롬프트가 진화 규칙 보유)
- 에러 메시지 문구, 로그 포맷 상세

### 9.11 추가 확정 디테일 (D9)

- **read-only 세션 면제**: 워킹트리 변경도 신규 커밋도 없는 세션(질문만 한 세션)은 Stop 게이트의 ingest 강제를 면제 — 노이즈 ingest 방지. (Round 20 검토 대상)

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| Project | core domain | code remote URL, credential | has one WikiRepo, one CodeRepoMirror, many Members |
| WikiRepo | core domain | bare git, 브랜치들 | mirrors CodeRepoMirror branches 1:1 |
| WikiSkeleton | supporting | index.md, log.md, overview.md | fixed core of WikiRepo per branch |
| WikiPage | core domain | path, content(markdown) | belongs to branch; linked via index |
| CodeRepoMirror | supporting | bare clone, fetch-only | source of commit DAG |
| DocBranch | core domain | name(=code branch) | 1:1 with code branch; may have BranchLock |
| Member | core domain | email, password_hash, name, role | has many ApiKeys, IngestLogs, QueryLogs |
| Admin | supporting (role) | — | Member with admin role; creates InviteLinks, Settings |
| InviteLink | supporting | token, expiry | created by Admin; consumed at signup |
| ApiKey | core domain | key_hash, prefix, revoked_at | identifies ingest/query author |
| IngestSummary | core domain | summary, spec_changes[], progress[], open_questions[], commit_hash | written by local Agent; processed by Ingest Agent |
| QueryRequest | core domain | question, branch, commit_hash | answered by Query Agent with citations |
| Conflict | core domain | branch, state, detail | locks DocBranch; resolved via ResolutionDirective |
| ResolutionDirective | core domain | 자연어 지시, author | input to Merge Agent retry |
| BranchLock | supporting | branch, conflict_id | blocks query/ingest/context on that branch |
| MergeEvent | supporting | source→target | code merge detected → doc merge |
| CommitHash | supporting | sha | ordering key (P1), existence check (P2) |
| LLMEngine | supporting | ProviderAdapter, agents(Ingest/Query/Merge/Init) | operates on WikiRepo |
| ProviderAdapter | supporting | OpenRouter(v1) | abstraction interface |
| Plugin | core domain | CC/Codex, hooks, MCP proxy | injects context; enforces gate |
| CompactEvent | supporting | — | triggers re-injection |
| SetupCommand | supporting | /specraft-setup | onboarding flow |
| InitCommand | supporting | /specraft-init | bootstrap mass-ingest |
| Frontend | core domain | 열람/쿼리/로그/conflict센터 | human read-only surface |

## Ontology Convergence

| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|-----------------|
| 1 | 16 | 16 | - | - | N/A |
| 2 | 18 | 2 (CodeRepoMirror, GitCredential) | 0 | 16 | 89% |
| 3 | 19 | 1 (CompactEvent) | 0 | 18 | 95% |
| 4 | 20 | 1 (ResolutionDirective) | 0 | 19 | 95% |
| 5 | 20 | 0 | 0 | 20 | 100% |
| 6 | 20 | 0 | 0 | 20 | 100% |
| 7 | 20 | 0 | 1 (IngestRequest→IngestSummary) | 19 | 100% |
| 8 | 20 | 0 | 0 | 20 | 100% |
| 9 | 21 | 1 (ProviderAdapter) | 0 | 20 | 95% |
| 10 | 21 | 0 | 0 (BranchLock은 Conflict 속성으로 흡수) | 21 | 100% |
| 11 | 21 | 0 | 0 | 21 | 100% |
| 12 | 21 | 0 | 1 (WikiPage→WikiSkeleton 정밀화) | 20 | 100% |
| 13 | 21 | 0 | 0 | 21 | 100% |
| 14 | 22 | 1 (SetupCommand) | 0 | 21 | 95% |
| 15 | 22 | 0 | 0 | 22 | 100% |
| 16 | 22 | 0 | 0 | 22 | 100% |
| 17 | 23 | 1 (InitCommand) | 0 | 22 | 96% |
| 18 | 23 | 0 | 0 | 23 | 100% |
| 19 | 23 | 0 | 0 | 23 | 100% |

5라운드 연속(R15~R19) 신규 0~1·안정 95%+ — **도메인 모델 완전 수렴.**

## Interview Transcript

<details>
<summary>Full Q&A (Round 0 + 19 rounds)</summary>

### Round 0 — 토폴로지
**Q:** 5개 토폴로지(server-core/git-sync/plugins/frontend/auth)가 맞나? 추가·삭제·병합·defer?
**A:** 5개 모두 맞아요.

### Round 1 — server-core/Goal
**Q:** ingest/query를 처리하는 LLM 엔진의 구동 방식은? (Agent SDK / 직접 API / CLI spawn)
**A:** 직접 LLM API 호출.
**Ambiguity:** 76.5%

### Round 2 — git-sync/Goal
**Q:** 서버가 git 상태(브랜치·커밋 선후·merge)를 어떻게 아는가?
**A:** 서버가 repo clone/fetch.
**Ambiguity:** 74.5%

### Round 3 — plugins/Goal
**Q:** 주입/query/ingest 각각의 메커니즘은?
**A:** 훅 주입(세션당 1회) + MCP query + Stop ingest. **단 compact 후에도 훅으로 재주입 필수** (compact 시 기존 주입 맥락 소실).
**Ambiguity:** 74.5%

### Round 4 — frontend/Goal
**Q:** 프론트엔드 기능 범위는? 특히 막힌 conflict를 누가 푸나? (multiSelect)
**A:** 문서 열람 + 자연어 쿼리 + 이력/로그 뷰 + conflict 센터(사람 개입) 전부.
**Ambiguity:** 67.5%

### Round 5 — server-core/Goal 🔥Contrarian
**Q:** 브랜치 시스템을 직접 만들지 말고 그냥 진짜 git을 wiki 저장소로 쓰면?
**A:** bare git repo (source of truth).
**Ambiguity:** 63.5%

### Round 6 — 전역/Constraints
**Q:** 배포·테넌시 모델은? (1:1 / 1:N / SaaS)
**A:** 1 인스턴스 = 1 프로젝트.
**Ambiguity:** 59.0%

### Round 7 — plugins/Goal
**Q:** ingest 페이로드는 무엇을 누가 만들어 보내나?
**A:** 에이전트 작성 + Stop 게이트 강제.
**Ambiguity:** 57.0%

### Round 8 — 전역/Constraints
**Q:** 기술 스택은?
**A:** TypeScript 통합.
**Ambiguity:** 52.5%

### Round 9 — server-core/Constraints
**Q:** LLM provider 전략은?
**A:** 자체 추상화 + v1은 OpenRouter만. OpenRouter 문서는 docs/openrouter/에 추가 예정.
**Ambiguity:** 52.5%

### Round 10 — git-sync/Goal
**Q:** merge 감지 시점과 conflict 차단 범위는?
**A:** 요청 시 lazy 감지 + 브랜치 단위 락.
**Ambiguity:** 50.2%

### Round 11 — 전체/Criteria 🔪Simplifier
**Q:** 7개 E2E 시나리오가 v1 골격으로 맞나? 줄일 것은?
**A:** 7개 전부 v1 필수.
**Ambiguity:** 38.2%

### Round 12 — server-core/Goal
**Q:** wiki 구조 — 고정 스키마 vs LLM 자율?
**A:** 골격만 고정(index/log/overview), 나머지 LLM 자율.
**Ambiguity:** 37.0%

### Round 13 — git-sync/Constraints
**Q:** git 호스팅 범위·credential 방식은?
**A:** 호스팅 중립 — URL + credential 등록.
**Ambiguity:** 37.0%

### Round 14 — plugins/Constraints
**Q:** 플러그인 설치 채널과 설정 위치는?
**A:** 1+3 결합 — URL은 repo 파일 + key는 개인 env + 대화형 setup 명령.
**Ambiguity:** 35.5%

### Round 15 — auth/Goal
**Q:** 권한 모델은? conflict 지시 권한과 api-key 수명은?
**A:** admin/member 2역할, conflict 지시는 모두 가능.
**Ambiguity:** 31.3%

### Round 16 — 전체/Criteria
**Q:** S1~S7 + P1·P2 판정 기준 확정?
**A:** 전부 확정.
**Ambiguity:** 21.4%

### Round 17 — server-core/Goal
**Q:** 최초 wiki는 누가 어떻게 만드나? (raw-spec에 없던 구멍)
**A:** 로컬 에이전트가 분석·대량 ingest (/specraft-init).
**Ambiguity:** 19.8%

### Round 18 — 전역/Constraints
**Q:** 기본값 패키지 D1~D8 수용?
**A:** 수용하되 D1은 hard block (spec 무결성 > 가용성).
**Ambiguity:** 11.4%

### Round 19 — plugins/Constraints
**Q:** 주입 실패 시 hard/soft/설정?
**A:** 설정으로 선택 (strict_mode, 기본 hard).
**Ambiguity:** 11.4% → 크리스탈라이즈

</details>
