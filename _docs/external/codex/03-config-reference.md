# Codex CLI - config.toml 설정 전체

> 설정 파일 계층, config.toml 기본 구조, 주요 섹션, 세분화된 승인 정책, 인증, 환경 변수, 권한 프로필, 실행 규칙, 빠른 모드

**참조**: [Config Basics](https://developers.openai.com/codex/config-basics) | [Advanced Config](https://developers.openai.com/codex/advanced-config) | [Config Reference](https://developers.openai.com/codex/config-reference) | [Environment Variables](https://developers.openai.com/codex/environment-variables) | [Sample Config](https://developers.openai.com/codex/sample-config) | [Permissions](https://developers.openai.com/codex/permissions) | [Rules](https://developers.openai.com/codex/rules) | [Speed](https://developers.openai.com/codex/speed) | [Hooks](https://developers.openai.com/codex/hooks)

---

## 설정 파일 계층

Codex는 여러 계층의 설정 파일을 지원하며, 높은 우선순위의 설정이 낮은 것을 덮어씁니다.

```
┌──────────────────────────────────────────────┐
│  requirements.toml (엔터프라이즈 관리)        │ ← 최고 우선순위
├──────────────────────────────────────────────┤
│  CLI 플래그 (-m, -a, -s 등)                  │
├──────────────────────────────────────────────┤
│  .codex/config.toml (프로젝트별)              │
├──────────────────────────────────────────────┤
│  ~/.codex/config.toml (사용자 글로벌)         │ ← 최저 우선순위
└──────────────────────────────────────────────┘
```

### 설정 파일 위치

| 파일 | 경로 | 설명 |
| --- | --- | --- |
| 글로벌 config.toml | `~/.codex/config.toml` | 사용자 전체 설정 |
| 프로젝트 config.toml | `.codex/config.toml` | 프로젝트별 설정 |
| 관리 requirements.toml | `~/.codex/requirements.toml` | 엔터프라이즈 관리 설정 (사용자 재정의 불가) |

> 하위 계층에서 설정하지 않은 필드는 상위 계층의 값으로 채워집니다.
> `requirements.toml`은 보안 관련 설정을 관리자가 강제하며, 사용자가 재정의할 수 없습니다.

### config.schema.json

설정 파일의 JSON 스키마가 `codex-rs/core/config.schema.json`에 제공됩니다. 자세한 필드 정의는 해당 스키마를 참조하세요.

---

## config.toml 기본 구조

```toml
# ~/.codex/config.toml 예시

# 모델 설정
model = "gpt-5.5"

# 승인 정책
approval_policy = "on-request"

# 샌드박스 모드
sandbox_mode = "workspace-write"

# 웹 검색 설정
web_search = "live"

# 리뷰 모델
review_model = "gpt-5.5"
```

---

## 주요 섹션

### model - 모델 설정

모델 선택 및 동작을 제어합니다.

```toml
# 모델 슬러그
model = "gpt-5.5"

# Reasoning effort (reasoning 모델에만 적용)
# 값: 문자열 (예: "minimal", "low", "medium", "high", "xhigh")
model_reasoning_effort = "medium"

# Reasoning 요약 모드
# 값: "auto" | "concise" | "detailed" | "none"
model_reasoning_summary = "auto"

# Reasoning 요약 강제 활성화 오버라이드
model_supports_reasoning_summaries = false

# 출력 상세도 (GPT-5 모델)
# 값: "low" | "medium" | "high"
model_verbosity = "medium"

# 리뷰에 사용할 모델
review_model = "gpt-5.5"

# 서비스 티어
# 값: "flex" | "fast" 등 (catalog-provided tier ID도 사용 가능)
service_tier = "flex"

# 컨텍스트 윈도우 크기 (토큰 수)
model_context_window = 200000

# 자동 압축 토큰 한계
model_auto_compact_token_limit = 150000

# 모델 카탈로그 JSON 경로
model_catalog_json = "/path/to/catalog.json"

# 모델 지시 파일 경로
model_instructions_file = "/path/to/instructions.md"
```

| 파라미터 | 값 | 설명 |
| --- | --- | --- |
| `model` | 모델 슬러그 문자열 | 사용할 모델 (예: `"gpt-5.5"`, `"gpt-5.4"`) |
| `model_reasoning_effort` | 문자열 | Reasoning 모델의 추론 강도 |
| `model_reasoning_summary` | `auto`, `concise`, `detailed`, `none` | Reasoning 요약 생성 모드 |
| `model_supports_reasoning_summaries` | 불리언 | Reasoning 요약 강제 활성화 오버라이드 |
| `model_verbosity` | `low`, `medium`, `high` | GPT-5 모델 출력의 상세도 |
| `review_model` | 모델 슬러그 문자열 | `/review` 기능에 사용할 모델 |
| `service_tier` | 문자열 | 서비스 티어. 빌트인 값은 `flex`, `fast`. legacy `fast` 설정은 요청값 `priority`에 매핑됨. catalog 제공 tier ID도 저장 가능 |
| `model_context_window` | 정수 | 컨텍스트 윈도우 크기 (토큰) |
| `model_auto_compact_token_limit` | 정수 | 자동 압축을 트리거하는 토큰 사용량 임계값 |
| `model_catalog_json` | 경로 | JSON 모델 카탈로그 경로 |
| `model_instructions_file` | 경로 | 모델 지시 파일 경로 |

### model_providers - 모델 제공자 설정

`model_provider` 단일 문자열 대신 `model_providers` 테이블로 여러 제공자를 정의할 수 있습니다. 빌트인 ID는 오버라이드할 수 없습니다.

```toml
# 기본 제공자 선택
model_provider = "oss"

# OSS 로컬 제공자
[model_providers.oss]
name = "Local Studio"

# Ollama 커스텀 제공자
[model_providers.custom]
name = "My Ollama"
base_url = "http://localhost:11434"
env_key = "OLLAMA_API_KEY"
env_key_instructions = "Ollama는 기본적으로 API 키가 필요하지 않습니다"

# AWS Bedrock 인증
[model_providers.amazon-bedrock]
name = "Amazon Bedrock"
base_url = "https://bedrock-runtime.us-east-1.amazonaws.com"
wire_api = "responses"

[model_providers.amazon-bedrock.aws]
region = "us-east-1"
profile = "my-profile"

# Command-backed bearer token 인증
[model_providers.my-provider]
base_url = "https://api.example.com/v1"

[model_providers.my-provider.auth]
command = "aws"
args = ["sso", "get-access-token", "--profile", "my-profile"]
timeout_ms = 5000
refresh_interval_ms = 300000
```

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `model_providers.<id>.name` | 문자열 | 표시 이름 |
| `model_providers.<id>.base_url` | 문자열 | 제공자 API 엔드포인트 URL |
| `model_providers.<id>.env_key` | 문자열 | API 키를 공급하는 환경 변수명 |
| `model_providers.<id>.env_key_instructions` | 문자열 | 환경 변수 설정 안내 |
| `model_providers.<id>.wire_api` | `"responses"` | 제공자가 사용하는 통신 프로토콜 |
| `model_providers.<id>.requires_openai_auth` | 불리언 | OpenAI 인증 필요 여부 (기본값 `false`) |
| `model_providers.<id>.http_headers` | 테이블 | 요청에 포함할 추가 HTTP 헤더 (키-값) |
| `model_providers.<id>.env_http_headers` | 테이블 | 환경 변수에서 읽어올 HTTP 헤더 (키: 헤더명, 값: 환경 변수명) |
| `model_providers.<id>.query_params` | 테이블 | URL에 추가할 쿼리 파라미터 |
| `model_providers.<id>.experimental_bearer_token` | 문자열 | Bearer 토큰 직접 설정 (보안상 `env_key` 권장) |
| `model_providers.<id>.stream_idle_timeout_ms` | 정수 | 스트리밍 응답 idle 타임아웃 (ms) |
| `model_providers.<id>.stream_max_retries` | 정수 | 스트리밍 재연결 최대 횟수 |
| `model_providers.<id>.request_max_retries` | 정수 | HTTP 요청 최대 재시도 횟수 |
| `model_providers.<id>.supports_websockets` | 불리언 | WebSocket 전송 지원 여부 (기본값 `false`) |

#### auth - Command-backed Bearer Token

제공자에 대한 bearer 토큰을 외부 명령어에서 얻을 수 있습니다.

| 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `command` | 문자열 | (필수) | 토큰을 출력할 명령어 |
| `args` | 문자열 배열 | `[]` | 명령어 인수 |
| `cwd` | 경로 | 없음 | 명령어 실행 디렉토리 |
| `timeout_ms` | 정수 | `5000` | 명령어 완료 대기 시간 (ms) |
| `refresh_interval_ms` | 정수 | `300000` | 캐시된 토큰 갱신 주기 (ms). `0`이면 401 재시도 시만 갱신 |

#### aws - AWS SigV4 인증

Amazon Bedrock 등 AWS 기반 제공자에 사용합니다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `region` | 문자열 | AWS 리전 |
| `profile` | 문자열 | AWS 프로필명. 미설정 시 SDK 기본 체인 사용 |

### sandbox_mode - 샌드박스 모드

```toml
# 샌드박스 정책
# 값: "read-only" | "workspace-write" | "danger-full-access"
sandbox_mode = "workspace-write"
```

| 값 | 설명 |
| --- | --- |
| `read-only` | 파일 읽기만 허용 |
| `workspace-write` | 작업 디렉토리 내에서 수정 및 실행 허용 |
| `danger-full-access` | 전체 시스템 접근 허용 |

### approval_policy - 승인 정책

```toml
# 승인 정책
# 값: "untrusted" | "on-request" | "never" | { granular = { ... } }
approval_policy = "on-request"
```

| 값 | 설명 |
| --- | --- |
| `untrusted` | "안전한 것으로 알려진" 읽기 전용 명령만 자동 승인. 나머지는 모두 사용자 승인 필요 |
| `on-request` | 모델이 필요할 때만 승인 요청 |
| `never` | 승인 없이 자동 실행. 실패 시 사용자에게 에스컬레이션하지 않음 |
| `{ granular = { ... } }` | 개별 승인 플로우에 대한 세분화된 제어 |

> **참고**: `on-failure`는 **DEPRECATED**입니다. 대화형 실행에는 `on-request`를, 비대화형 실행에는 `never`를 사용하세요.

#### granular 객체

`approval_policy`를 `{ granular = { ... } }` 형태로 설정하면 특정 승인 카테고리를 개별적으로 제어할 수 있습니다.

```toml
[approval_policy]
# granular 승인 정책

[approval_policy.granular]
# 샌드박스 승격 승인 요청 거부 (필수 필드)
sandbox_approval = true

# execpolicy prompt 규칙에 의해 트리거된 승인 거부 (필수 필드)
rules = true

# MCP elicitation 프롬프트 거부 (필수 필드)
mcp_elicitations = true

# request_permissions 도구로 인한 승인 프롬프트 거부
request_permissions = false

# 스킬 스크립트 실행 승인 프롬프트 거부
skill_approval = false
```

| granular 필드 | 타입 | 기본값 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| `sandbox_approval` | 불리언 | 없음 | 예 | `true` 시 샌드박스 승격 승인 프롬프트를 자동 거부. `with_additional_permissions` 및 `require_escalated` 요청 포함 |
| `rules` | 불리언 | 없음 | 예 | `true` 시 execpolicy `prompt` 규칙에 의한 승인을 자동 거부 |
| `mcp_elicitations` | 불리언 | 없음 | 예 | `true` 시 MCP elicitation 프롬프트를 자동 거부 |
| `request_permissions` | 불리언 | `false` | 아니요 | `true` 시 `request_permissions` 도구로 트리거된 승인 프롬프트 자동 거부 |
| `skill_approval` | 불리언 | `false` | 아니요 | `true` 시 스킬 스크립트 실행 승인 프롬프트 자동 거부 |

### approvals_reviewer - 승인 검토자

```toml
# 승인 검토자 설정
# 값: "user" | "auto_review"
approvals_reviewer = "user"
```

| 값 | 설명 |
| --- | --- |
| `user` | 사용자가 직접 승인 (기본값) |
| `auto_review` | reviewer 서브에이전트가 승인 프롬프트를 검토. 샌드박싱이나 샌드박스 내에서 이미 허용된 검토 액션은 변경하지 않음 |

### auto_review - 자동 검토 정책

```toml
[auto_review]
policy = "샌드박스 외부 명령은 읽기 전용만 승인합니다"
```

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `policy` | 문자열 | guardian 자동 검토자 프롬프트에 삽입되는 추가 정책 지시사항 |

### features - 기능 토글

중앙화된 기능 플래그입니다. 개별 토글 대신 이 섹션을 사용하세요. `codex features list`로 확인할 수 있습니다.

```toml
[features]
# --- 핵심 기능 ---
# 통합 실행기
unified_exec = true

# 셸 스냅샷
shell_snapshot = true

# 셸 도구
shell_tool = true

# 실행 취소 (턴별 git ghost 스냅샷)
undo = true

# 훅 활성화 (기본 활성화)
hooks = true

# --- 웹 검색 (deprecated, 최상위 web_search 설정 사용 권장) ---
web_search = true
web_search_request = true
web_search_cached = true

# --- 앱 / 커넥터 ---
apps = true

# --- 에이전트 ---
multi_agent = true
codex_git_commit = true

# --- 메모리 ---
memories = true

# --- 빠른 모드 ---
fast_mode = true

# --- 압축 ---
enable_request_compression = true

# --- 기타 ---
prevent_idle_sleep = true
skill_mcp_dependency_install = false
personality = true
```

| 플래그 | 타입 | 설명 |
| --- | --- | --- |
| `apps` | 불리언 | ChatGPT Apps/커넥터 지원 활성화 (실험적) |
| `codex_git_commit` | 불리언 | Codex 자동 git 커밋. 활성화 시 `commit_attribution`으로 `Co-authored-by:` 트레일러 추가 |
| `enable_request_compression` | 불리언 | 지원 시 zstd로 스트리밍 요청 본문 압축 (안정, 기본 활성화) |
| `fast_mode` | 불리언 | TUI에서 모델 카탈로그 서비스 티어 선택 활성화, Fast-tier 명령 포함 (안정, 기본 활성화) |
| `hooks` | 불리언 | 훅 활성화. `codex_hooks`는 deprecated alias (안정, 기본 활성화) |
| `memories` | 불리언 | 메모리 서브시스템 (기본 비활성화) |
| `multi_agent` | 불리언 | 멀티 에이전트 협업 도구 활성화 (안정, 기본 활성화) |
| `network_proxy` | 불리언 또는 테이블 | 샌드박스 네트워킹 활성화. 테이블 형태로 `domains` 등 네트워크 정책 설정 가능 (실험적, 기본 비활성화) |
| `personality` | 불리언 | 모델 성격 설정 활성화 (안정, 기본 활성화) |
| `prevent_idle_sleep` | 불리언 | 턴 실행 중 시스템 유휴 수면 방지 (실험적, 기본 비활성화) |
| `shell_snapshot` | 불리언 | 셸 환경 스냅샷으로 반복 명령 속도 향상 (안정, 기본 활성화) |
| `shell_tool` | 불리언 | 기본 `shell` 도구 활성화 (안정, 기본 활성화) |
| `skill_mcp_dependency_install` | 불리언 | 스킬 MCP 의존성 자동 설치 (안정, 기본 활성화) |
| `undo` | 불리언 | 턴별 git ghost 스냅샷으로 undo 활성화 (안정, 기본 비활성화) |
| `unified_exec` | 불리언 | 통합 PTY 기반 실행 도구 (안정, Windows 제외 기본 활성화) |
| `web_search` | 불리언 | (Deprecated) 웹 검색 활성화. 최상위 `web_search` 설정 사용 권장 |
| `web_search_cached` | 불리언 | (Deprecated) `web_search` 미설정 시 `true`면 `web_search = "cached"`에 매핑 |
| `web_search_request` | 불리언 | (Deprecated) `web_search` 미설정 시 `true`면 `web_search = "live"`에 매핑 |

> 생략한 기능 키는 기본값을 유지합니다.
> `config.toml`의 `[features]`에 `feature_name = true`를 추가하거나, CLI에서 `codex --enable feature_name`으로 활성화할 수 있습니다.

### personality - 성격 설정

```toml
# 모델 성격 설정
# 값: "none" | "friendly" | "pragmatic"
personality = "none"
```

| 값 | 설명 |
| --- | --- |
| `none` | 성격 설정 없음 (기본값) |
| `friendly` | 친근한 성격 |
| `pragmatic` | 실용적인 성격 |

> `[features] personality = true`로 활성화해야 사용할 수 있습니다.

### tools - 도구 설정

```toml
[tools]
# 웹 검색 상세 설정
[tools.web_search]
# 허용할 도메인
allowed_domains = ["example.com", "docs.python.org"]

# 컨텍스트 크기
# 값: "low" | "medium" | "high"
context_size = "medium"

# 검색 위치
[tools.web_search.location]
city = "Seoul"
country = "KR"
region = "11"
timezone = "Asia/Seoul"
```

### agents - 에이전트 설정

에이전트 관련 설정 (스레드 제한 등).

```toml
[agents]
# 에이전트 작업 워커의 기본 최대 실행 시간 (초). 미설정 시 워커당 1800초로 폴백
job_max_runtime_seconds = 300

# 최대 중첩 깊이 (루트 세션 = 0, 기본값: 1)
max_depth = 3

# 최대 동시 에이전트 스레드 수 (미설정 시 기본값: 6)
max_threads = 5

# 커스텀 에이전트 역할 정의
[agents.reviewer]
description = "코드 리뷰를 수행하는 에이전트"
config_file = ".codex/agents/reviewer.toml"
nickname_candidates = ["reviewer", "critic"]

[agents.tester]
description = "테스트를 작성하고 실행하는 에이전트"
nickname_candidates = ["tester", "qa"]
```

| 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `job_max_runtime_seconds` | 정수 | `1800` | `spawn_agents_on_csv` 작업의 워커당 기본 타임아웃 (초). 미설정 시 1800초로 폴백 |
| `max_depth` | 정수 | `1` | 에이전트 스레드의 최대 중첩 깊이 (루트 세션은 depth 0에서 시작) |
| `max_threads` | 정수 | `6` | 동시에 열 수 있는 최대 에이전트 스레드 수. 미설정 시 기본값 `6` |

#### 에이전트 역할 정의

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `description` | 문자열 | spawn 도구 가이던스에 사용되는 역할 설명 |
| `config_file` | 경로 | 역할별 config 레이어 경로. 상대 경로는 정의한 `config.toml` 기준으로 해석 |
| `nickname_candidates` | 문자열 배열 | 이 역할로 생성된 에이전트의 후보 닉네임 |

### memories - 메모리 설정

메모리 서브시스템 설정입니다.

```toml
[memories]
# 메모리 생성 활성화
generate_memories = true

# 메모리 사용 활성화
use_memories = true

# 외부 컨텍스트 사용 시 메모리 모드 오염 표시
disable_on_external_context = false

# 메모리 추출에 사용할 모델
extract_model = "gpt-4.1-mini"

# 메모리 통합에 사용할 모델
consolidation_model = "gpt-4.1-mini"

# 통합을 위해 유지되는 최대 원시 메모리 수 (기본값: 256, 상한: 4096)
max_raw_memories_for_consolidation = 256

# 메모리에 사용할 스레드의 최대 사용 기간 (일, 기본값: 30, 범위: 0-90)
max_rollout_age_days = 30

# 시작 시 처리할 최대 롤아웃 후보 수 (기본값: 16, 상한: 128)
max_rollouts_per_startup = 16

# 메모리 미사용 후 자격 상실 일수 (기본값: 30, 범위: 0-365)
max_unused_days = 30

# 메모리 시작 실행 전 필요한 최소 rate limit 잔여 비율 (%, 기본값: 25, 범위: 0-100)
min_rate_limit_remaining_percent = 25

# 마지막 스레드 활동 후 메모리 생성까지의 최소 유휴 시간 (시간, 기본값: 6, 범위: 1-48)
min_rollout_idle_hours = 6
```

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `generate_memories` | 불리언 | `false` 시 새 스레드가 `memory_mode = "disabled"`로 저장됨. 기본값 `true` |
| `use_memories` | 불리언 | `false` 시 developer 프롬프트에 메모리 사용 지시 삽입 생략. 기본값 `true` |
| `disable_on_external_context` | 불리언 | `true` 시 외부 컨텍스트 소스가 스레드 `memory_mode`를 `"polluted"`로 표시. 기본값 `false`. Legacy alias: `no_memories_if_mcp_or_web_search` |
| `extract_model` | 문자열 | 스레드별 메모리 추출에 사용할 모델 오버라이드 |
| `consolidation_model` | 문자열 | 전역 메모리 통합에 사용할 모델 오버라이드 |
| `max_raw_memories_for_consolidation` | 정수 | 전역 통합을 위해 유지되는 최근 원시 메모리 최대 수. 기본값 `256`, 상한 `4096` |
| `max_rollout_age_days` | 정수 | 메모리에 사용할 스레드의 최대 사용 기간 (일). 기본값 `30`, 범위 `0`-`90` |
| `max_rollouts_per_startup` | 정수 | 패스당 처리할 최대 롤아웃 후보 수. 기본값 `16`, 상한 `128` |
| `max_unused_days` | 정수 | 마지막 사용 후 메모리가 통합 대상에서 제외되기까지의 최대 미사용 일수. 기본값 `30`, 범위 `0`-`365` |
| `min_rate_limit_remaining_percent` | 정수 | 메모리 시작 실행 전 필요한 최소 rate limit 잔여 비율. 기본값 `25`, 범위 `0`-`100` |
| `min_rollout_idle_hours` | 정수 | 마지막 스레드 활동 후 메모리 생성까지의 최소 유휴 시간 (시간). 기본값 `6`, 범위 `1`-`48` |

### apps - 앱 설정

앱/커넥터별 설정입니다.

```toml
[apps]
# 모든 앱의 기본 설정
[apps._default]
enabled = true
destructive_enabled = false
open_world_enabled = false

# 개별 앱 설정
[apps.github]
enabled = true
destructive_enabled = false
open_world_enabled = false

[apps.github.tools]
pr_create = { enabled = true, approval_mode = "prompt" }
pr_merge = { enabled = false }

[apps.slack]
enabled = false
```

#### 앱 기본 설정 (`_default`)

| 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `enabled` | 불리언 | `true` | `false` 시 개별 설정에서 오버라이드하지 않는 한 앱 비활성화 |
| `destructive_enabled` | 불리언 | 없음 | `destructive_hint = true`인 도구 기본 허용 여부 |
| `open_world_enabled` | 불리언 | 없음 | `open_world_hint = true`인 도구 기본 허용 여부 |

#### 개별 앱 설정

| 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `enabled` | 불리언 | `true` | `false` 시 해당 앱 노출 안 함 |
| `destructive_enabled` | 불리언 | 없음 | `destructive_hint = true` 도구 허용 여부 |
| `open_world_enabled` | 불리언 | 없음 | `open_world_hint = true` 도구 허용 여부 |
| `default_tools_enabled` | 불리언 | 없음 | 도구 기본 활성화 여부 |
| `default_tools_approval_mode` | `"auto"`, `"prompt"`, `"approve"` | 없음 | 도구 오버라이드가 없을 때의 승인 모드 |
| `tools` | 테이블 | 없음 | 개별 도구 설정 (`tools.<tool_name>.enabled`, `tools.<tool_name>.approval_mode`) |

### shell_environment_policy - 셸 환경 정책

셸 기반 도구로 프로세스를 실행할 때 환경 변수 구성 방식을 제어합니다.

```toml
[shell_environment_policy]
# 상속 방식
# 값: "core" | "all" | "none"
inherit = "all"

# 제외할 환경 변수 (정규식 패턴)
exclude = ["^SECRET_", "^_CODEX_INTERNAL"]

# 포함할 환경 변수만 지정 (정규식 패턴, 설정 시 나머지는 제외)
# include_only = ["^PATH$", "^HOME$", "^LANG"]

# 추가로 설정할 환경 변수
[shell_environment_policy.set]
EDITOR = "vim"
LANG = "en_US.UTF-8"

# 기본 제외 목록 무시
# ignore_default_excludes = false

# 프로파일 사용 (실험적)
# experimental_use_profile = false
```

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `inherit` | `"core"`, `"all"`, `"none"` | `"core"`: HOME, PATH 등 필수 변수만 상속. `"all"`: 부모 프로세스 전체 환경 상속. `"none"`: 환경 변수 상속 안 함 |
| `exclude` | 문자열 배열 | 제외할 환경 변수 패턴 (정규식) |
| `include_only` | 문자열 배열 | 포함할 환경 변수만 지정 (정규식). 설정하면 나머지는 제외 |
| `set` | 테이블 | 추가로 설정할 키-값 환경 변수 |
| `ignore_default_excludes` | 불리언 | 기본 제외 목록 무시 |
| `experimental_use_profile` | 불리언 | 프로파일 사용 (실험적) |

### history - 히스토리 설정

`~/.codex/history.jsonl`에 기록할 히스토리 설정입니다.

```toml
[history]
# 히스토리 지속성
# 값: "save-all" | "none"
persistence = "save-all"

# 히스토리 파일 최대 크기 (바이트)
# 초과 시 가장 오래된 항목부터 삭제
max_bytes = 10485760  # 10 MB
```

| 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `persistence` | `"save-all"`, `"none"` | `"save-all"` | `"save-all"`: 모든 항목을 디스크에 저장. `"none"`: 디스크에 기록하지 않음 |
| `max_bytes` | 정수 | 없음 | 히스토리 파일 최대 크기 (바이트). 초과 시 가장 오래된 항목 삭제 |

### otel - OpenTelemetry 설정

OTEL(OpenTelemetry) 추적 및 메트릭 설정입니다.

```toml
[otel]
# 환경 태그
environment = "dev"

# 사용자 프롬프트 로깅
log_user_prompt = false

# 트레이스 내보내기
trace_exporter = "none"

# 메트릭 내보내기
metrics_exporter = "none"

# 로그 내보내기
exporter = "none"

# OTLP HTTP 내보내기 예시
# [otel.trace_exporter.otlp-http]
# endpoint = "http://localhost:4318/v1/traces"
# protocol = "json"
# [otel.trace_exporter.otlp-http.headers]
# Authorization = "Bearer <YOUR_TOKEN>"
# [otel.trace_exporter.otlp-http.tls]
# ca-certificate = "/path/to/ca.pem"

# OTLP gRPC 내보내기 예시
# [otel.metrics_exporter.otlp-grpc]
# endpoint = "http://localhost:4317"
```

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `environment` | 문자열 | 트레이스에 표시할 환경 (dev, staging, prod, test). 기본값 `dev` |
| `log_user_prompt` | 불리언 | 트레이스에 사용자 프롬프트 로깅 |
| `trace_exporter` | `"none"`, `"otlp-http"`, `"otlp-grpc"` | 트레이스 내보내기 |
| `metrics_exporter` | `"none"`, `"statsig"`, `"otlp-http"`, `"otlp-grpc"` | 메트릭 내보내기. 기본값 `statsig` |
| `exporter` | `"none"`, `"otlp-http"`, `"otlp-grpc"` | 로그 내보내기 |

#### OTLP 내보내기 형식

**OTLP HTTP** (`otlp-http`):

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `endpoint` | 문자열 | 예 | OTLP HTTP 엔드포인트 |
| `protocol` | `"binary"`, `"json"` | 예 | 페이로드 형식 |
| `headers` | 테이블 | 아니요 | 추가 HTTP 헤더 |
| `tls` | 테이블 | 아니요 | TLS 설정 (`ca-certificate`, `client-certificate`, `client-private-key`) |

**OTLP gRPC** (`otlp-grpc`):

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `endpoint` | 문자열 | 예 | OTLP gRPC 엔드포인트 |
| `headers` | 테이블 | 아니요 | 추가 헤더 |
| `tls` | 테이블 | 아니요 | TLS 설정 |

### tui - TUI 설정

터미널 UI의 모양과 동작을 제어합니다.

```toml
[tui]
# 구문 강조 테마
theme = "dracula"

# Vim 모드 기본값
vim_mode_default = false

# Raw 출력 모드 기본값
raw_output_mode = false

# 상태 표시줄 항목
# 값: model, model+reasoning, context_stats, rate_limits, git_branch,
#     token_counters, session_id, current_dir, codex_version
status_line = ["model", "git_branch", "token_counters"]

# 터미널 제목 항목
# 값: app_name, project, spinner, status, thread, git_branch, model, task_progress
terminal_title = ["project", "model"]

# 대체 화면 모드
# 값: "auto" | "always" | "never"
alt_screen_mode = "auto"

# 키맵 커스텀
[tui.keymap]
# 글로벌 단축키
[tui.keymap.global]
# 컨텍스트별 단축키
```

#### 키 바인딩 형식

```
ctrl-a, shift-enter, page-down, alt-r 등
```

### mcp_servers - MCP 서버 설정

Model Context Protocol 서버를 연결합니다.

```toml
# STDIO MCP 서버 예시
[mcp_servers.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]

# 작업 디렉토리
cwd = "/path/to/project"

# 환경 변수 (문자열 형식)
[mcp_servers.filesystem.env]
API_KEY = "<YOUR_API_KEY>"

# 활성화 상태
enabled = true

# 필수 서버 여부
required = false

# 시작 타임아웃 (ms)
startup_timeout_ms = 30000

# 도구 타임아웃 (초)
tool_timeout_sec = 60.0

# Bearer token (환경 변수에서)
bearer_token_env_var = "MCP_BEARER_TOKEN"

# HTTP 헤더 (환경 변수에서)
[mcp_servers.filesystem.env_http_headers]
X-Custom-Header = "MY_HEADER_ENV_VAR"

# 도구 승인 모드 (기본)
default_tools_approval_mode = "prompt"

# 활성화된 도구 목록
enabled_tools = ["read_file", "write_file"]

# 비활성화된 도구 목록
disabled_tools = ["delete_file"]

# 개별 도구 승인 설정
[mcp_servers.filesystem.tools.read_file]
approval_mode = "auto"

[mcp_servers.filesystem.tools.write_file]
approval_mode = "prompt"

# OAuth 스코프
scopes = ["read", "write"]

# OAuth 리소스
oauth_resource = "https://api.example.com"

# HTTP 스트리밍 MCP 서버 예시
[mcp_servers.remote-mcp]
url = "https://mcp.example.com/stream"
bearer_token_env_var = "MCP_AUTH_TOKEN"
enabled = true
```

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `command` | 문자열 | STDIO 서버 실행 명령어 |
| `args` | 문자열 배열 | 명령어 인수 |
| `url` | 문자열 | HTTP 스트리밍 서버 URL |
| `cwd` | 문자열 | 서버 프로세스 작업 디렉토리 |
| `env` | 테이블 | 서버에 전달할 환경 변수 (키-값) |
| `env_vars` | 배열 | 환경 변수 (객체 형식, `name`/`source` 필드). 문자열 항목은 `source = "local"` 기본값 |
| `enabled` | 불리언 | 서버 활성화 상태 |
| `required` | 불리언 | 필수 서버 여부. 시작 실패 시 오류 발생 |
| `bearer_token_env_var` | 문자열 | Bearer token으로 사용할 환경 변수명 |
| `env_http_headers` | 테이블 | 환경 변수에서 읽어올 HTTP 헤더 (키: 헤더명, 값: 환경 변수명) |
| `http_headers` | 테이블 | 직접 설정할 HTTP 헤더 |
| `default_tools_approval_mode` | `"auto"`, `"prompt"`, `"approve"` | 도구 기본 승인 모드 |
| `enabled_tools` | 문자열 배열 | 명시적으로 활성화할 도구 목록 |
| `disabled_tools` | 문자열 배열 | 명시적으로 비활성화할 도구 목록 |
| `tools` | 테이블 | 개별 도구 승인 설정 (`tools.<name>.approval_mode`) |
| `scopes` | 문자열 배열 | OAuth 스코프 |
| `oauth_resource` | 문자열 | OAuth 리소스 식별자 (RFC 8707) |
| `experimental_environment` | `"local"`, `"remote"` | MCP 서버 배치 위치 (실험적). `remote`는 원격 실행기 환경에서 stdio 서버 시작 |
| `startup_timeout_ms` | 정수 | `startup_timeout_sec`의 ms 단위 alias |
| `startup_timeout_sec` | 숫자 | 시작 타임아웃 (초, 기본값 10) |
| `tool_timeout_sec` | 숫자 | 도구 호출 타임아웃 (초, 기본값 60) |

### plugins - 플러그인 관리

```toml
[plugins]
# 플러그인 활성화/비활성화
[plugins.my-plugin]
enabled = true

# 플러그인 MCP 서버 정책 오버라이드
[plugins.my-plugin.mcp_servers]
# 서버별 정책 설정 가능
```

### hooks - 훅 설정

라이프사이클 이벤트에 사용자 정의 스크립트를 연결합니다. 훅은 기본적으로 활성화되어 있으며, `hooks.json` 파일 또는 `config.toml` 내 인라인 `[hooks]` 테이블로 정의합니다.

```toml
# 인라인 훅 예시
[[hooks.PreToolUse]]
matcher = "^Bash$"

[[hooks.PreToolUse.hooks]]
type = "command"
command = '/usr/bin/python3 "check_bash.py"'
timeout = 30
statusMessage = "Checking Bash command"

[[hooks.PostToolUse]]
matcher = "^Bash$"

[[hooks.PostToolUse.hooks]]
type = "command"
command = '/usr/bin/python3 "review_output.py"'
timeout = 30
statusMessage = "Reviewing Bash output"
```

#### 훅 이벤트 유형 (10종)

| 이벤트 | matcher 대상 | 설명 |
| --- | --- | --- |
| `SessionStart` | `source` (`startup`, `resume`, `clear`, `compact`) | 세션 시작/재개 시 |
| `SubagentStart` | `agent_type` | 서브에이전트 시작 시 |
| `PreToolUse` | `tool_name` (`Bash`, `apply_patch`, MCP 도구명 등) | 도구 사용 전 (차단/수정 가능) |
| `PermissionRequest` | `tool_name` | 권한 요청 시 (승인/거부 가능) |
| `PostToolUse` | `tool_name` | 도구 사용 후 |
| `PreCompact` | `trigger` (`manual`, `auto`) | 대화 압축 전 |
| `PostCompact` | `trigger` (`manual`, `auto`) | 대화 압축 후 |
| `UserPromptSubmit` | 미지원 | 사용자 프롬프트 제출 시 (차단 가능) |
| `SubagentStop` | `agent_type` | 서브에이전트 종료 시 (계속 진행 가능) |
| `Stop` | 미지원 | 턴 종료 시 (계속 진행 가능) |

> `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `UserPromptSubmit`, `SubagentStop`, `Stop`은 턴(turn) 스코프에서 실행됩니다. `SessionStart`와 `SubagentStart`는 스레드/서브에이전트 시작 스코프에서 실행됩니다.

#### 훅 핸들러 필드

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | `"command"` | 예 | 핸들러 유형 (현재 `command`만 지원. `prompt`, `agent`는 파싱만 되고 실행 안 됨) |
| `command` | 문자열 | 예 | 실행할 명령어 |
| `timeout` | 숫자 | 아니요 | 타임아웃 (초). 기본값 `600` |
| `statusMessage` | 문자열 | 아니요 | UI에 표시할 상태 메시지 |
| `command_windows` | 문자열 | 아니요 | Windows 전용 명령어 오버라이드 |

#### 훅 신뢰 및 관리

- 관리되지 않는 커맨드 훅은 실행 전 검토 및 신뢰가 필요합니다.
- `/hooks` 명령으로 훅 소스 확인, 신뢰, 비활성화가 가능합니다.
- 관리(managed) 훅은 `requirements.toml`, 시스템, MDM, 클라우드 소스에서 로드되며 자동으로 신뢰됩니다.
- `allow_managed_hooks_only = true` 설정 시 사용자/프로젝트/세션/플러그인 훅을 건너뛰고 관리 훅만 로드합니다.

### skills - 스킬 설정

```toml
# 개별 스킬 설정
[[skills.config]]
path = "/path/to/SKILL.md"
enabled = true
```

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `config` | 배열 | 스킬별 활성화 오버라이드 배열. 각 항목은 `path`와 `enabled` |
| `config[].path` | 경로 | `SKILL.md`가 포함된 스킬 폴더 경로 |
| `config[].enabled` | 불리언 | 해당 스킬의 활성화/비활성화 |

### analytics - 분석 설정

```toml
[analytics]
# 사용 분석 수집
enabled = true
```

### feedback - 피드백 설정

```toml
[feedback]
# 피드백 수집
enabled = true
```

---

## 세분화된 승인 정책 (GranularApprovalConfig)

`approval_policy`를 `{ granular = { ... } }` 형태로 설정하면 특정 승인 카테고리를 개별적으로 제어하면서 나머지는 대화형으로 유지할 수 있습니다.

```toml
# 샌드박스 승격 및 규칙 기반 승인은 자동 거부, MCP elicitation은 사용자에게 표시
approval_policy = { granular = { sandbox_approval = true, rules = true, mcp_elicitations = false } }
```

---

## Permissions (권한 프로필)

**Beta** -- 권한 프로필은 활발히 개발 중이며 변경될 수 있습니다.

권한 프로필은 Codex가 로컬에서 실행하는 명령에 최소 권한 원칙을 적용합니다. 파일시스템 규칙(읽기/쓰기)과 네트워크 규칙(도달 가능한 대상)을 결합한 명명된 정책입니다.

> **참조**: [developers.openai.com/codex/permissions](https://developers.openai.com/codex/permissions)

### 기본 제공 프로필

| 프로필 | 설명 |
| --- | --- |
| `:read-only` | 로컬 명령 실행을 읽기 전용으로 유지 |
| `:workspace` | 활성 작업공간 루트 내에서 쓰기 허용 |
| `:danger-full-access` | 로컬 샌드박스 제한 제거 (의도적인 광범위 접근 시에만 사용) |

### 프로필 정의 및 선택

```toml
default_permissions = "project-edit"

[permissions.project-edit.workspace_roots]
"~/code/app" = true
"~/code/shared-lib" = true

[permissions.project-edit.filesystem]
":minimal" = "read"

[permissions.project-edit.filesystem.":workspace_roots"]
"." = "write"
".devcontainer" = "read"
"**/*.env" = "deny"

[permissions.project-edit.network]
enabled = true

[permissions.project-edit.network.domains]
"api.openai.com" = "allow"
"objects.githubusercontent.com" = "allow"
"*.github.com" = "allow"
"tracking.example.com" = "deny"
```

### 프로필 상속 (extends)

`extends` 키워드로 기존 프로필을 확장할 수 있습니다. 기본 제공 프로필(`:read-only`, `:workspace`)을 상속하는 것을 권장합니다. `:danger-full-access`는 상속할 수 없습니다.

```toml
default_permissions = "project-edit"

[permissions.project-edit]
description = "Project editing with OpenAI API access."
extends = ":workspace"

[permissions.project-edit.filesystem.":workspace_roots"]
"**/*.env" = "deny"

[permissions.project-edit.network]
enabled = true

[permissions.project-edit.network.domains]
"api.openai.com" = "allow"
```

### 권한 프로필 설정 사양

| 항목 | 타입 / 값 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `default_permissions` | 문자열 프로필명 | 없음 | 기본으로 적용할 권한 프로필 이름. `:` 접두사는 빌트인 프로필 |
| `[permissions.<name>]` | 테이블 | 없음 | 프로필 정의. `default_permissions`로 선택 |
| `permissions.<name>.description` | 문자열 | 없음 | 프로필에 대한 설명. `extends`로 상속되지 않음 |
| `permissions.<name>.extends` | 문자열 프로필명 | 없음 | 상속할 부모 프로필. `:read-only`, `:workspace`, 또는 다른 명명된 프로필. `:danger-full-access`, 알 수 없는 부모, 순환 상속은 거부됨 |
| `[permissions.<name>.workspace_roots]` | 테이블 | 없음 | 프로필 정의 작업공간 루트. 런타임 작업공간 루트와 함께 `:workspace_roots` 규칙에 적용 |
| `permissions.<name>.workspace_roots."<path>"` | 불리언 | `false` | `true` 시 해당 경로를 작업공간 루트에 추가 |

### 파일시스템 권한

| 항목 | 타입 / 값 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `[permissions.<name>.filesystem]` | 테이블 | 없음 | 경로 → 접근 값 매핑. 빈 테이블은 파일시스템 접근을 제한하고 시작 경고 출력 |
| `permissions.<name>.filesystem.glob_scan_max_depth` | 정수 | 없음 | Linux/WSL/Windows에서 deny-read glob 확장 최대 깊이. `**/*.env` 등의 unbounded 패턴에 필요 (최소 1) |
| `permissions.<name>.filesystem."<path>"` | `read`, `write`, `deny` | 없음 | 해당 경로의 직접 접근 권한. `deny`가 `write`/`read`보다 우선 |
| `[permissions.<name>.filesystem."<path>"]."<subpath>"` | `read`, `write`, `deny` | 없음 | 하위 경로 접근 권한. `.`은 기본 경로 자체 |

| 접근 | 의미 |
| --- | --- |
| `read` | 파일 읽기 및 디렉토리 나열 허용. 생성/수정/삭제 불가 |
| `write` | 읽기 + 파일 생성/수정/이름변경/삭제 허용 |
| `deny` | 읽기/쓰기 모두 거부. 더 넓은 권한에서 제외 구간 지정 시 사용 |

지원하는 경로 형식:

| 경로 | 의미 | 하위 경로 가능 |
| --- | --- | --- |
| `:root` | 파일시스템 루트 | `.`만 |
| `:minimal` | 일반 개발 도구에 필요한 플랫폼/런타임 경로 | `.`만 |
| `:workspace_roots` | 현재 세션 작업공간 + 프로필 정의 루트 | 예 |
| `:tmpdir` | `$TMPDIR` 위치 | `.`만 |
| `/absolute/path` | 절대 경로 (macOS/Linux/WSL: `/path`, Windows: `C:\path`) | 예 |
| `~/path` | 홈 디렉토리 하위 경로 (Windows: `~\work`도 가능) | 예 |

> **우선순위**: `deny` > `write` > `read`. 더 구체적인 경로가 더 넓은 경로를 덮어씁니다.

### 네트워크 권한

| 항목 | 타입 / 값 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `[permissions.<name>.network]` | 테이블 | 없음 | 네트워크 샌드박스 프록시 및 정책 |
| `permissions.<name>.network.enabled` | 불리언 | `false` | 네트워크 접근 활성화 |
| `permissions.<name>.network.mode` | `"limited"`, `"full"` | 없음 | 네트워크 모드 |
| `[permissions.<name>.network.domains]` | 테이블 | 없음 | 호스트 패턴 → `allow`/`deny` 매핑 |
| `permissions.<name>.network.domains."<pattern>"` | `allow`, `deny` | 없음 | 정확한 호스트, `*.example.com` (서브도메인), `**.example.com` (apex + 서브도메인), `*` (allow-only 전역 와일드카드) |
| `permissions.<name>.network.proxy_url` | URL | `http://127.0.0.1:3128` | HTTP 프록시 리스너 |
| `permissions.<name>.network.enable_socks5` | 불리언 | `true` | SOCKS5 리스너 활성화 |
| `permissions.<name>.network.socks_url` | URL | `http://127.0.0.1:8081` | SOCKS5 리스너 주소 |
| `permissions.<name>.network.enable_socks5_udp` | 불리언 | `true` | SOCKS5 UDP 지원 |
| `permissions.<name>.network.allow_upstream_proxy` | 불리언 | `true` | 상위 `HTTP(S)_PROXY`/`ALL_PROXY` 설정 존중 |
| `permissions.<name>.network.allow_local_binding` | 불리언 | `false` | 로컬/사설망 가드 비활성화 |
| `permissions.<name>.network.dangerously_allow_non_loopback_proxy` | 불리언 | `false` | 프록시 리스너의 non-loopback 바인딩 허용 |
| `permissions.<name>.network.dangerously_allow_all_unix_sockets` | 불리언 | `false` | Unix 소켓 허용 리스트 우회 |
| `[permissions.<name>.network.unix_sockets]` | 테이블 | 없음 | Unix 소켓 허용 리스트 오버라이드 (Docker 등) |
| `permissions.<name>.network.unix_sockets."<path>"` | `allow`, `deny` | 없음 | Unix 소켓 경로 허용/거부 |

```toml
[permissions.project-edit.network]
enabled = true

[permissions.project-edit.network.domains]
"example.com" = "allow"      # 정확한 호스트
"*.example.com" = "allow"    # 서브도메인만
"**.example.com" = "allow"   # apex + 서브도메인
"ads.example.com" = "deny"   # deny가 allow보다 우선
```

> 로컬/사설 네트워크 대상은 기본적으로 차단됩니다. `localhost`, `127.0.0.1` 등을 명시적으로 허용해야 합니다.
> `deny` 항목이 `allow` 항목보다 우선합니다.

### 권한 프로필 마이그레이션

권한 프로필은 이전 `sandbox_mode` + `sandbox_workspace_write` 조합을 대체합니다. 한 세션에서 두 시스템을 혼용할 수 없습니다. `sandbox_mode`가 활성 설정 레이어에 나타나면 기존 샌드박스 설정이 대신 사용됩니다.

---

## Rules (실행 규칙)

**Experimental** -- 규칙은 실험적이며 변경될 수 있습니다.

Rules는 샌드박스 외부에서 Codex가 실행할 수 있는 명령을 제어합니다. `.rules` 파일은 활성 config 레이어 옆 `rules/` 폴더에 생성합니다 (예: `~/.codex/rules/default.rules`).

> **참조**: [developers.openai.com/codex/rules](https://developers.openai.com/codex/rules)

### prefix_rule()

```
# gh pr view 명령에 대해 실행 전 프롬프트 표시
prefix_rule(
    pattern = ["gh", "pr", "view"],
    decision = "prompt",
    justification = "Viewing PRs is allowed with approval",
    match = [
        "gh pr view 7888",
        "gh pr view --repo openai/codex",
        "gh pr view 7888 --json title,body,comments",
    ],
    not_match = [
        "gh pr --repo openai/codex view 7888",
    ],
)
```

### prefix_rule 필드

| 필드 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `pattern` | 예 | - | 명령어 접두사 정의. 각 요소는 리터럴 문자열 또는 리터럴 유니온 |
| `decision` | 아니요 | `"allow"` | 일치 시 동작. `allow`/`prompt`/`forbidden` |
| `justification` | 아니요 | - | 규칙 존재 이유. 승인 프롬프트에 표시될 수 있음 |
| `match` | 아니요 | `[]` | 일치해야 하는 예제 명령어 |
| `not_match` | 아니요 | `[]` | 일치하지 않아야 하는 예제 명령어 |

### decision 우선순위

여러 규칙이 일치하면 가장 제한적인 decision이 적용됩니다:

`forbidden` > `prompt` > `allow`

### 규칙 파일 위치

- `~/.codex/rules/` -- 사용자 글로벌
- `<repo>/.codex/rules/` -- 프로젝트 로컬 (신뢰된 프로젝트만)
- 팀 config 위치의 `rules/`

> `.rules` 파일은 **Starlark** 구문을 사용합니다. Python과 유사하지만 부작용 없이 안전하게 실행되도록 설계되었습니다.

### 명령어 분할

Codex는 `bash -lc`, `bash -c`, `zsh -c`, `sh -c`로 래핑된 스크립트를 특수 처리합니다:

- **안전한 분할**: 일반 단어 + 안전한 연산자(`&&`, `||`, `;`, `|`)로만 구성된 스크립트는 개별 명령어로 분할하여 규칙 적용
- **분할하지 않음**: 리다이렉션(`>`, `>>`), 치환(`$(...)`), 환경변수, 와일드카드, 제어문이 포함된 경우 전체를 단일 호출로 처리

### 정책 테스트

```shell
codex execpolicy check --pretty \
  --rules ~/.codex/rules/default.rules \
  -- gh pr view 7888 --json title,body,comments
```

---

## Speed (빠른 모드)

> **참조**: [developers.openai.com/codex/speed](https://developers.openai.com/codex/speed)

### Fast mode

지원 모델의 속도를 1.5배 향상시키는 기능입니다. 크레딧 소비율이 표준 모드보다 높습니다.

| 모델 | 속도 향상 | 크레딧 소비율 |
| --- | --- | --- |
| GPT-5.5 | 1.5x | 표준의 2.5배 |
| GPT-5.4 | 1.5x | 표준의 2배 |

CLI에서 설정:

```shell
/fast on      # 활성화
/fast off     # 비활성화
/fast status  # 현재 상태 확인
```

config.toml에서 영구 설정:

```toml
service_tier = "fast"

[features]
fast_mode = true
```

> API 키 인증 시에는 표준 API 요금이 적용되며 Fast mode 크레딧을 사용할 수 없습니다.
> Fast mode는 Codex IDE 확장, CLI, 앱에서 ChatGPT 로그인 시 사용 가능합니다.

### Codex-Spark

GPT-5.3-Codex-Spark는 빠르고 가벼운 전용 코덱스 모델입니다. Fast mode와 달리 별도의 모델 선택이며 자체 사용량 제한이 있습니다.

- Research preview 기간 동안 ChatGPT Pro 구독자에게만 제공됩니다.

---

## 인증 저장 모드

Codex는 여러 인증 저장 방식을 지원합니다.

```toml
# CLI 인증 저장 모드
# 값: "file" | "keyring" | "auto"
cli_auth_credentials_store = "auto"
```

| 모드 | 설명 |
| --- | --- |
| `file` | `CODEX_HOME/auth.json`에 인증 정보 저장 |
| `keyring` | OS 키링 (macOS Keychain, Linux Secret Service 등) 사용. 사용 불가 시 오류 |
| `auto` | 키링 사용 가능하면 키링, 아니면 파일 (기본값) |

> MCP OAuth 인증은 별도로 `mcp_oauth_credentials_store` 설정을 사용합니다.

---

## 프로필 (Profiles)

설정 프로필 파일은 `config.toml` 옆에 `$CODEX_HOME/profile-name.config.toml` 형태로 별도 파일로 존재합니다. CLI에서 `--profile` / `-p`로 선택할 수 있습니다.

```shell
# 프로필 사용
codex -p fast
codex --profile safe "리팩토링해줘"
```

프로필 파일은 독립된 `.config.toml` 파일로 작성합니다:

```toml
# ~/.codex/fast.config.toml
model = "gpt-4.1-mini"
approval_policy = "never"

[features]
unified_exec = true
```

```toml
# ~/.codex/safe.config.toml
model = "gpt-5.5"
approval_policy = "untrusted"
sandbox_mode = "read-only"
```

---

## web_search - 웹 검색 최상위 설정

```toml
# 웹 검색 모드
# 값: "disabled" | "cached" | "live"
web_search = "cached"
```

| 값 | 설명 |
| --- | --- |
| `disabled` | 웹 검색 비활성화 |
| `cached` | OpenAI 관리 인덱스를 사용하며 실시간 페이지를 가져오지 않음 (기본값) |
| `live` | 웹에서 최신 데이터를 가져옴 |

> `--yolo` 등 전체 접근(full access) 샌드박스 설정을 사용하면 기본값이 `"live"`가 됩니다.
> `[tools]` 섹션 내의 `web_search` 테이블로 상세 설정(도메인, 컨텍스트 크기, 위치)을 추가할 수 있습니다.

---

## 환경 변수 목록

Codex는 지속 설정에 `config.toml`을 사용합니다. 환경 변수는 셸 범위 오버라이드, 자동화 시크릿, 설치 프로그램 동작, 진단에 사용합니다.

> 이 표는 Codex가 직접 읽는 **안정적 공개 환경 변수**만 나열합니다. 내부 개발 변수, 테스트 변수, 또는 `env_key`로 직접 선택하는 제공자별 시크릿 이름은 포함하지 않습니다.

### Core locations

| 환경 변수 | 사용 주체 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `CODEX_HOME` | CLI, IDE 확장, app-server, 설치 프로그램 | `~/.codex` | 구성, 인증, 로그, 세션, 스킬, 독립 패키지 메타데이터를 포함한 Codex 상태의 루트. 설정 시 디렉토리가 이미 존재해야 함 |
| `CODEX_SQLITE_HOME` | CLI 및 app-server 상태 | `CODEX_HOME` | SQLite 기반 상태가 저장되는 위치. `sqlite_home` config 옵션이 우선. 상대 경로는 현재 작업 디렉토리에서 해석 |

### Installer variables

| 환경 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `CODEX_NON_INTERACTIVE` | `false` | `1`, `true`, `yes`로 설정 시 설치 프로그램 프롬프트를 건너뜀. 프롬프트는 기본 응답을 사용하므로 스크립트 설치 및 업데이트에 사용. 최초 설정에는 부적합 |
| `CODEX_INSTALL_DIR` | macOS/Linux: `~/.local/bin`, Windows: `%LOCALAPPDATA%\Programs\OpenAI\Codex\bin` | `codex` 명령이 설치되는 위치 변경. 독립 패키지 캐시는 `CODEX_HOME/packages/standalone`에 유지 |

```shell
# 무인 설치 예시 (macOS/Linux)
curl -fsSL https://chatgpt.com/codex/install.sh | CODEX_NON_INTERACTIVE=1 sh

# 무인 설치 예시 (Windows PowerShell)
$env:CODEX_NON_INTERACTIVE=1; irm https://chatgpt.com/codex/install.ps1 | iex
```

### Authentication and network

| 환경 변수 | 사용 주체 | 설명 |
| --- | --- | --- |
| `CODEX_API_KEY` | `codex exec` | 단일 비대화형 실행을 위한 API 키. **`codex exec`에서만 지원**. 저장소 제어 코드를 실행할 때 작업 전체가 아닌 인라인으로 설정 |
| `CODEX_ACCESS_TOKEN` | CLI, app-server, 신뢰된 자동화 | ChatGPT 또는 Codex 액세스 토큰 제공. 지속 로그인을 위해 `codex login --with-access-token`으로 파이프 |
| `CODEX_CA_CERTIFICATE` | HTTPS, 로그인, WebSocket 클라이언트 | 기업 TLS 가로채기 또는 사설 루트 CA 환경에서 PEM CA 번들 경로. `SSL_CERT_FILE`보다 우선 |
| `SSL_CERT_FILE` | HTTPS, 로그인, WebSocket 클라이언트 | `CODEX_CA_CERTIFICATE`가 설정되지 않은 경우 대체 PEM CA 번들 경로 |

> 제공자 API 키의 경우 모델 제공자 구성에서 `env_key`를 설정하세요. Codex는 해당 구성으로 명명된 변수를 읽으므로, 변수 이름 자체는 고정된 Codex 환경 변수가 아닙니다.

### Diagnostics

| 환경 변수 | 사용 주체 | 설명 |
| --- | --- | --- |
| `RUST_LOG` | CLI 및 app-server | Rust 로그 필터링 및 상세도 제어. `codex exec`는 더 상세한 값을 설정하지 않는 한 `error` 출력이 기본 |

```shell
# 디버그 로깅 예시
RUST_LOG=debug codex -c log_dir=./.codex-log
tail -F ./.codex-log/codex-tui.log
```

### 환경 변수 사용 예시

```shell
# Codex exec 전용 API 키 (인라인으로 설정, 작업 전체에 설정하지 말 것)
CODEX_API_KEY="<YOUR_API_KEY>" codex exec "작업 설명"

# 액세스 토큰으로 로그인
echo "<YOUR_ACCESS_TOKEN>" | codex login --with-access-token

# SQLite 데이터베이스 경로
export CODEX_SQLITE_HOME="/data/codex/db"

# 커스텀 CA 인증서
export CODEX_CA_CERTIFICATE="/path/to/ca-cert.pem"

# Codex 홈 디렉토리 변경
export CODEX_HOME="/data/codex"

# 디버그 로깅 활성화
export RUST_LOG=codex_core=debug,codex_tui=debug
```

---

## CLI에서 설정 오버라이드

`-c` 플래그로 config.toml 필드를 직접 오버라이드할 수 있습니다.

```shell
# 로그 디렉토리 변경
codex -c log_dir=./.codex-log

# 모델 변경
codex -c model=gpt-4.1-mini
```

---

## 설정 진단

세션 내에서 설정 상태를 확인할 수 있습니다.

```
/status          # 세션 설정 및 토큰 사용량
/debug-config    # 설정 레이어 계층 및 정책 요구사항
```

### `/debug-config` 출력 항목

- 설정 레이어 순서 (낮은 우선순위부터)
- 각 레이어의 활성/비활성 상태
- 정책 소스:
  - `allowed_approval_policies`
  - `allowed_sandbox_modes`
  - `mcp_servers`
  - `rules`
  - `enforce_residency`
  - `experimental_network`

---

## 샘플 config.toml

```toml
# ~/.codex/config.toml - 전체 예시

# 모델 설정
model = "gpt-5.5"
model_reasoning_effort = "medium"
model_reasoning_summary = "auto"
model_verbosity = "medium"
service_tier = "flex"
review_model = "gpt-5.5"

# 승인 및 샌드박스
approval_policy = "on-request"
sandbox_mode = "workspace-write"
approvals_reviewer = "user"

# 성격
personality = "none"

# 웹 검색
web_search = "cached"

# TUI 설정
[tui]
theme = "dracula"
vim_mode_default = false
raw_output_mode = false
status_line = ["model", "git_branch", "token_counters"]
terminal_title = ["project", "model"]

# 에이전트 설정
[agents]
max_depth = 3
max_threads = 5

[agents.reviewer]
description = "코드 리뷰 에이전트"
nickname_candidates = ["reviewer", "critic"]

# 메모리 설정
[memories]
generate_memories = true
use_memories = true

# MCP 서버
[mcp_servers.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
enabled = true
startup_timeout_ms = 30000
default_tools_approval_mode = "prompt"

[mcp_servers.remote-api]
url = "https://mcp.example.com/stream"
bearer_token_env_var = "MCP_AUTH_TOKEN"
enabled = true

# 훅
[[hooks.PostToolUse]]
matcher = "^Bash$"

[[hooks.PostToolUse.hooks]]
type = "command"
command = 'echo "도구 사용 완료"'
timeout = 30

# 기능 플래그
[features]
unified_exec = true
shell_snapshot = true
shell_tool = true
undo = true
hooks = true
memories = true
multi_agent = true
codex_git_commit = true

# 도구 설정
[tools.web_search]
context_size = "medium"

# 셸 환경 정책
[shell_environment_policy]
inherit = "all"
exclude = ["^SECRET_"]

# 히스토리
[history]
persistence = "save-all"
max_bytes = 10485760

# OpenTelemetry
[otel]
environment = "dev"
log_user_prompt = false

# 인증 저장
cli_auth_credentials_store = "auto"

# 분석
[analytics]
enabled = true

# 피드백
[feedback]
enabled = true
```

---

## 엔터프라이즈 관리 설정 (requirements.toml)

엔터프라이즈 관리자는 `requirements.toml`을 통해 조직 전체의 보안 정책을 강제할 수 있습니다. `requirements.toml`은 사용자가 재정의할 수 없는 보안 관련 설정을 제한합니다.

```toml
# requirements.toml

# 허용되는 승인 정책 목록
allowed_approval_policies = ["on-request", "untrusted"]

# 허용되는 승인 검토자 목록
allowed_approvals_reviewers = ["user", "auto_review"]

# 허용되는 샌드박스 모드 목록
allowed_sandbox_modes = ["read-only", "workspace-write"]

# 허용되는 웹 검색 모드
allowed_web_search_modes = ["cached"]

# 관리 훅만 허용 (사용자/프로젝트/세션/플러그인 훅 건너뜀)
allow_managed_hooks_only = true

# MCP 서버 (identity 기반 허용 목록)
[mcp_servers.approved-server]
identity.command = "npx"

# 규칙 (접두사 기반, prompt/forbidden만 허용)
[rules]
[[rules.prefix_rules]]
decision = "forbidden"
justification = "파일 삭제 금지"

[[rules.prefix_rules.pattern]]
token = "rm"

# 피처 플래그 강제
[features]
browser_use = false
computer_use = false

# Guardian 자동 검토 정책
guardian_policy_config = "승인 전 보안 검사 수행"

# 관리 훅 디렉토리
hooks.managed_dir = "/etc/codex/hooks"
```

> `requirements.toml`의 설정은 사용자가 재정의할 수 없습니다. ChatGPT Business/Enterprise의 경우 클라우드에서 가져온 requirements도 적용됩니다.

---

> **최종 업데이트**: 2026-06-06
> **출처**: [Config Basics](https://developers.openai.com/codex/config-basics), [Advanced Config](https://developers.openai.com/codex/advanced-config), [Config Reference](https://developers.openai.com/codex/config-reference), [Environment Variables](https://developers.openai.com/codex/environment-variables), [Sample Config](https://developers.openai.com/codex/sample-config), [Permissions](https://developers.openai.com/codex/permissions), [Rules](https://developers.openai.com/codex/rules), [Speed](https://developers.openai.com/codex/speed), [Hooks](https://developers.openai.com/codex/hooks), [GitHub: codex-rs/core/config.schema.json](https://github.com/openai/codex/blob/main/codex-rs/core/config.schema.json)
