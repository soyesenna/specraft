# 17. 다른 에이전트에서 Codex로 마이그레이션

> **출처**
> - [Migrate to Codex](https://developers.openai.com/codex/migrate) — 마이그레이션 개요, import flow, 항목별 매핑
> - [Configuration Reference](https://developers.openai.com/codex/config-reference) — `config.toml` / `requirements.toml` 전체 스키마
> - [MCP](https://developers.openai.com/codex/mcp) — MCP 서버 설정
> - [Hooks](https://developers.openai.com/codex/hooks) — 훅 설정 이전
> - [Skills](https://developers.openai.com/codex/skills) — 스킬 변환
> - [Subagents](https://developers.openai.com/codex/subagents) — 서브에이전트 / 커스텀 에이전트 설정
> - [Rules](https://developers.openai.com/codex/rules) — 명령 규칙 설정

---

## 1. 마이그레이션 개요

Codex는 다른 에이전트 도구(Claude Code, Cursor, GitHub Copilot 등)에서 사용 중이던 설정을 자동으로 감지하여 Codex 형식으로 가져오는 **import flow**를 제공한다. 사용자 수준(user-level) 설정과 프로젝트 수준(project-level) 설정을 모두 검사한다.

- **사용자 수준**: 머신에 있는 파일에서 감지
- **프로젝트 수준**: 열려 있는 리포지토리의 파일에서 감지

### 마이그레이션 실행 절차

1. Codex 앱에서 **Settings** 열기
2. **General** 페이지에서 **Import other agent setup** 찾기
3. **Import** 또는 **Import again** 선택
4. Codex가 감지한 항목을 검토 후 가져올 항목 선택 → **Import**
5. 완료 후 **View imported files**로 결과 확인

### 마이그레이션 동작 흐름

| 단계 | 설명 |
|------|------|
| 1 | 사용자 및 프로젝트의 기존 설정을 자동 감지 |
| 2 | 선택한 항목을 Codex 형식으로 직접 변환 (1:1 매핑 가능 항목) |
| 3 | import 완료 후 다시 한 번 미변환 항목이 있는지 확인 |
| 4 | 남은 항목은 `migrate-to-codex` 스킬이 포함된 새 스레드에서 후속 작업 제안 |

---

## 2. 항목별 변환 매핑

공식 문서에 명시된 감지 항목과 Codex 목적지 매핑은 다음과 같다.

| 감지된 설정 | Codex 목적지 | 비고 |
|---|---|---|
| Instruction files | `AGENTS.md` | `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md` 등 |
| `settings.json` | `config.toml` | `~/.codex/config.toml` (사용자) / `.codex/config.toml` (프로젝트) |
| Skills | Codex skills | `.agents/skills/` 디렉터리에 `SKILL.md` 기반 스킬 생성 |
| 최근 30일 세션 | Codex threads & projects | 세션 기록을 Codex 스레드로 가져옴 |
| MCP server 설정 | Codex MCP configuration | `config.toml`의 `[mcp_servers.*]` 테이블로 변환 |
| Hooks | Codex hooks | `hooks.json` 또는 `config.toml` 인라인 `[hooks]` |
| Slash commands | Codex skills | 슬래시 명령어를 스킬로 변환 |
| Subagents | Codex agents | `.codex/agents/*.toml` 파일로 변환 |

---

## 3. Instruction 파일 변환 (→ `AGENTS.md`)

### 변환 대상 파일

| 원본 에이전트 | Instruction 파일 | Codex 목적지 |
|---|---|---|
| Claude Code | `CLAUDE.md` | `AGENTS.md` |
| Cursor | `.cursorrules` | `AGENTS.md` |
| GitHub Copilot | `.github/copilot-instructions.md` | `AGENTS.md` |
| 기타 감지된 지시 파일 | — | `AGENTS.md` |

### `AGENTS.md` 위치 및 대체 옵션

| 항목 | 설명 |
|------|------|
| 기본 위치 | 프로젝트 리포지토리 루트에 `AGENTS.md` 배치 |
| 대체 파일명 | `config.toml`의 `project_doc_fallback_filenames`로 대체 파일명 지정 가능 |
| 대체 지시 파일 | `config.toml`의 `model_instructions_file` 키로 `AGENTS.md` 대신 다른 파일 경로 지정 가능 |
| 최대 크기 제한 | `project_doc_max_bytes`로 `AGENTS.md` 최대 읽기 크기 제한 가능 |

### 수동 변환 예시

**원본** — `CLAUDE.md`:

```markdown
# Project Conventions

- Use TypeScript strict mode
- All API calls go through src/api/ layer
- Test files colocated: Component.test.tsx
```

**변환 결과** — `AGENTS.md` (프로젝트 루트):

```markdown
# Project Conventions

- Use TypeScript strict mode
- All API calls go through src/api/ layer
- Test files colocated: Component.test.tsx
```

> 내용 자체는 대부분 그대로 이전된다. Codex는 프로젝트 루트의 `AGENTS.md`를 자동으로 읽어들인다.

`config.toml`에서 대체 instruction 파일 경로를 지정할 수도 있다.

```toml
# model_instructions_file로 AGENTS.md 대체 파일 지정
model_instructions_file = ".codex/instructions.md"
```

> `instructions` 키는 향후 사용을 위해 예약되어 있으며, `model_instructions_file` 또는 `AGENTS.md`를 사용하는 것을 권장한다.

---

## 4. 설정 마이그레이션 (→ `config.toml`)

### 핵심 경로

| 범위 | Codex 경로 | 설명 |
|---|---|---|
| 사용자 수준 | `~/.codex/config.toml` | 전역 설정 |
| 프로젝트 수준 | `.codex/config.toml` | 프로젝트별 오버라이드 (신뢰된 프로젝트만 로드) |
| 프로필 | `$CODEX_HOME/<profile-name>.config.toml` | `--profile` 플래그로 선택 |
| 관리자 강제 | `requirements.toml` | 사용자가 변경할 수 없는 보안 설정 |

### 주요 설정 대응표

| 원본 (`settings.json`) | Codex (`config.toml`) | 타입 / 값 | 설명 |
|---|---|---|---|
| `model` | `model` | `string` | 예: `model = "gpt-5.5"` |
| `permissions.allow` | `approval_policy` | `untrusted \| on-request \| never \| { granular = {...} }` | 명령 실행 전 승인 여부 |
| `sandbox` | `sandbox_mode` | `read-only \| workspace-write \| danger-full-access` | 파일시스템/네트워크 접근 제어 |
| `theme` | `tui.theme` | `string` (kebab-case) | TUI 테마 |
| `file_opener` | `file_opener` | `vscode \| vscode-insiders \| windsurf \| cursor \| none` | 인용 클릭 시 열리는 에디터 |
| `web_search` | `web_search` | `disabled \| cached \| live` | 웹 검색 모드 (기본값: `cached`) |
| `hooks` | `[hooks]` 인라인 또는 `hooks.json` | `table` | 동일한 이벤트 스키마 사용 |
| `mcpServers` | `[mcp_servers.*]` | `table` | MCP 서버 설정 테이블 |
| `instructions` | `developer_instructions` 또는 `AGENTS.md` | `string` | 세션에 주입되는 추가 지침 |
| N/A | `model_reasoning_effort` | `minimal \| low \| medium \| high \| xhigh` | 추론 노력 조정 |
| N/A | `features.hooks` | `boolean` | 훅 활성화 (기본값: 활성) |
| N/A | `features.memories` | `boolean` | Memories 기능 (기본값: 비활성) |
| N/A | `features.multi_agent` | `boolean` | 멀티 에이전트 협업 (기본값: 활성) |
| N/A | `features.codex_git_commit` | `boolean` | Codex 생성 git 커밋 활성화 |
| N/A | `commit_attribution` | `string` | 커밋 co-author 트레일러 (기본값: `Codex <noreply@openai.com>`) |

> `on-failure`는 deprecated이며, 대화형 실행에는 `on-request`를, 비대화형 실행에는 `never`를 사용하라.

### `config.toml` 작성 예시

```toml
#:schema https://developers.openai.com/codex/config-schema.json

model = "gpt-5.5"
sandbox_mode = "workspace-write"
web_search = "cached"
file_opener = "vscode"

[features]
hooks = true
memories = false
multi_agent = true
codex_git_commit = true

[sandbox_workspace_write]
network_access = true
writable_roots = ["/tmp/my-project"]
```

### 프로젝트 수준 설정 제한

프로젝트 수준 `.codex/config.toml`에서는 다음 키가 **무시**된다 (사용자 수준에만 설정 가능):

- `openai_base_url`, `chatgpt_base_url`
- `model_provider`, `model_providers`
- `notify`
- `profile`, `profiles`
- `otel` (OpenTelemetry)
- `apps_mcp_product_sku`
- `experimental_realtime_ws_base_url`

### VS Code 자동완성

`config.toml` 상단에 다음 줄을 추가하면 VS Code / Cursor에서 자동완성과 진단을 사용할 수 있다 (Even Better TOML 확장 필요).

```toml
#:schema https://developers.openai.com/codex/config-schema.json
```

---

## 5. 스킬 변환

### 변환 매핑

| 원본 | Codex 대상 | 설명 |
|------|-----------|------|
| 커스텀 명령어/워크플로 | Codex skills (`SKILL.md`) | 재사용 가능한 워크플로 패키지 |
| 슬래시 명령어 | Codex skills | 슬래시 명령어는 스킬로 변환됨 |

### Codex 스킬 디렉터리 구조

```
my-skill/
  SKILL.md          # 필수: 지침 + 메타데이터
  scripts/          # 선택: 실행 가능한 스크립트
  references/       # 선택: 참조 문서
  assets/           # 선택: 템플릿, 리소스
  agents/
    openai.yaml     # 선택: UI 메타데이터, 정책, 의존성
```

### `SKILL.md` 최소 형식

```markdown
---
name: my-skill-name
description: 이 스킬이 언제 트리거되고 무엇을 하는지 정확히 설명.
---

스킬 지침 본문. Codex가 이 스킬을 선택했을 때 따라야 할 절차.
```

> `description`은 핵심 사용 사례과 트리거 단어를 앞부분에 배치하라. 설명이 길어져 잘리더라도 매칭이 가능하도록 하기 위함이다.

### 스킬 검색 경로

| 범위 | 경로 | 용도 |
|---|---|---|
| `REPO` | `$CWD/.agents/skills` | 현재 작업 디렉터리 기준 |
| `REPO` | `$CWD/../.agents/skills` | Git 리포지토리 내 상위 폴더 |
| `REPO` | `$REPO_ROOT/.agents/skills` | 리포지토리 최상단 (모든 하위 폴더에 적용) |
| `USER` | `$HOME/.agents/skills` | 사용자 전역 |
| `ADMIN` | `/etc/codex/skills` | 머신 전체 관리자 스킬 |
| `SYSTEM` | Codex 번들 | OpenAI 제공 기본 스킬 |

### 스킬 활성화 방식

| 방식 | 설명 |
|------|------|
| **명시적 호출** | CLI/IDE에서 `/skills` 실행 또는 `$`로 스킬 멘션 |
| **암시적 호출** | 작업 설명이 스킬 `description`과 일치하면 Codex가 자동 선택 |

### 스킬 비활성화

삭제하지 않고 `config.toml`에서 비활성화할 수 있다.

```toml
[[skills.config]]
path = "/path/to/skill/SKILL.md"
enabled = false
```

### `openai.yaml` 메타데이터 예시

```yaml
interface:
  display_name: "PR Review"
  short_description: "PR 리뷰 자동화"
  icon_small: "./assets/small-logo.svg"
  icon_large: "./assets/large-logo.png"
  brand_color: "#3B82F6"
  default_prompt: "Optional surrounding prompt to use the skill with"

policy:
  allow_implicit_invocation: false

dependencies:
  tools:
    - type: "mcp"
      value: "openaiDeveloperDocs"
      description: "OpenAI Docs MCP server"
      transport: "streamable_http"
      url: "https://developers.openai.com/mcp"
```

> `allow_implicit_invocation` (기본값: `true`): `false`면 Codex가 프롬프트 기반으로 스킬을 자동 호출하지 않음. 명시적 `$skill` 호출은 여전히 동작.

### 스킬 컨텍스트 예산

- Codex는 사용 가능한 스킬 목록을 컨텍스트에 포함시킴
- 목록 크기는 모델 컨텍스트 윈도우의 약 2% (또는 알 수 없는 경우 8,000자)로 제한
- 스킬이 많으면 설명이 먼저 축소되며, 매우 많으면 일부 스킬이 생략되고 경고 표시

---

## 6. MCP 서버 설정 이전

### 변환 매핑

| 원본 | Codex 대상 | 설명 |
|------|-----------|------|
| MCP 서버 설정 | `config.toml`의 `[mcp_servers.*]` | STDIO / Streamable HTTP 서버 모두 지원 |

### CLI로 MCP 서버 추가

```bash
# STDIO 서버 추가
codex mcp add <server-name> --env VAR1=VALUE1 --env VAR2=VALUE2 -- <stdio-server-command>

# 예시: Context7 MCP 서버 추가
codex mcp add context7 -- npx -y @upstash/context7-mcp
```

TUI에서는 `/mcp` 명령으로 활성 MCP 서버를 확인할 수 있다.

### `config.toml` STDIO 서버 예시

```toml
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]
env_vars = ["LOCAL_TOKEN"]

[mcp_servers.context7.env]
MY_ENV_VAR = "MY_ENV_VALUE"
```

### `config.toml` Streamable HTTP 서버 예시

```toml
[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
bearer_token_env_var = "FIGMA_OAUTH_TOKEN"
http_headers = { "X-Figma-Region" = "us-east-1" }
```

### 고급 MCP 서버 설정 예시

```toml
[mcp_servers.chrome_devtools]
url = "http://localhost:3000/mcp"
enabled_tools = ["open", "screenshot"]
disabled_tools = ["screenshot"]
default_tools_approval_mode = "prompt"
startup_timeout_sec = 20
tool_timeout_sec = 45
enabled = true

[mcp_servers.chrome_devtools.tools.open]
approval_mode = "approve"
```

### OAuth 설정 (필요한 경우)

```toml
# OAuth 콜백 포트 고정 (선택)
mcp_oauth_callback_port = 5555

# OAuth 콜백 URL 오버라이드 (예: devbox 환경)
mcp_oauth_callback_url = "https://devbox.example.internal/callback"
```

### 주요 MCP 설정 필드

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `command` | `string` | STDIO | 서버 시작 명령 |
| `args` | `array<string>` | 아니요 | 명령 인자 |
| `url` | `string` | HTTP | 서버 주소 |
| `env` | `map<string,string>` | 아니요 | 서버에 전달할 환경 변수 |
| `env_vars` | `array<string \| {name, source}>` | 아니요 | 허용/전달할 환경 변수 목록 |
| `bearer_token_env_var` | `string` | 아니요 | Bearer 토큰을 가져올 환경 변수명 |
| `http_headers` | `map<string,string>` | 아니요 | 정적 HTTP 헤더 |
| `env_http_headers` | `map<string,string>` | 아니요 | 환경 변수 기반 HTTP 헤더 |
| `startup_timeout_sec` | `number` | 아니요 | 시작 타임아웃 (기본: 10초) |
| `tool_timeout_sec` | `number` | 아니요 | 툴 실행 타임아웃 (기본: 60초) |
| `enabled` | `boolean` | 아니요 | `false`면 삭제 없이 비활성화 |
| `required` | `boolean` | 아니요 | `true`면 초기화 실패 시 시작 중단 |
| `enabled_tools` | `array<string>` | 아니요 | 툴 허용 목록 |
| `disabled_tools` | `array<string>` | 아니요 | 툴 차단 목록 (`enabled_tools` 이후 적용) |
| `default_tools_approval_mode` | `auto \| prompt \| approve` | 아니요 | 기본 승인 동작 |
| `tools.<tool>.approval_mode` | `auto \| prompt \| approve` | 아니요 | 개별 툴 승인 동작 오버라이드 |

### 자주 사용하는 MCP 서버

| 서버 | 용도 |
|------|------|
| OpenAI Docs MCP | OpenAI 개발자 문서 검색/읽기 |
| Context7 | 최신 개발자 문서 연결 |
| Figma Local/Remote | Figma 디자인 접근 |
| Playwright | 브라우저 제어/검사 |
| Chrome Developer Tools | Chrome 제어/검사 |
| Sentry | Sentry 로그 접근 |
| GitHub | PR, Issue 등 GitHub 관리 |

---

## 7. 훅(Hook) 설정 이전

### 변환 매핑

| 원본 | Codex 대상 | 설명 |
|------|-----------|------|
| 훅 설정 | `hooks.json` 또는 `config.toml` 인라인 `[hooks]` | 수명주기 훅 변환 |

### 훅 파일 위치

| 위치 | 파일 형식 | 비고 |
|---|---|---|
| `~/.codex/hooks.json` | JSON | 사용자 수준 |
| `~/.codex/config.toml` | TOML 인라인 `[hooks]` | 사용자 수준 |
| `<repo>/.codex/hooks.json` | JSON | 프로젝트 수준 (신뢰된 프로젝트만) |
| `<repo>/.codex/config.toml` | TOML 인라인 `[hooks]` | 프로젝트 수준 (신뢰된 프로젝트만) |

> 하나의 설정 레이어에 `hooks.json`과 인라인 `[hooks]`가 모두 있으면 Codex가 병합하며 시작 시 경고를 표시한다. 레이어당 하나의 표현을 사용하는 것을 권장한다.

### 훅 비활성화

```toml
[features]
hooks = false
```

> `features.codex_hooks`는 deprecated alias이다. `features.hooks`를 사용하라.

### JSON 형식 예시

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.codex/hooks/session_start.py",
            "statusMessage": "Loading session notes"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/pre_tool_use_policy.py\"",
            "statusMessage": "Checking Bash command"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/post_tool_use_review.py\"",
            "statusMessage": "Reviewing Bash output"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/stop_continue.py\"",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### 인라인 TOML 형식 예시

```toml
[[hooks.PreToolUse]]
matcher = "^Bash$"

[[hooks.PreToolUse.hooks]]
type = "command"
command = '/usr/bin/python3 "$(git rev-parse --show-toplevel)/.codex/hooks/pre_tool_use_policy.py"'
timeout = 30
statusMessage = "Checking Bash command"

[[hooks.PostToolUse]]
matcher = "^Bash$"

[[hooks.PostToolUse.hooks]]
type = "command"
command = '/usr/bin/python3 "$(git rev-parse --show-toplevel)/.codex/hooks/post_tool_use_review.py"'
timeout = 30
statusMessage = "Reviewing Bash output"
```

### 지원되는 훅 이벤트

| 이벤트 | `matcher` 필터 대상 | 설명 |
|---|---|---|
| `SessionStart` | `startup \| resume \| clear \| compact` | 세션 시작 시 |
| `PreToolUse` | 도구 이름 (`Bash`, `apply_patch`, MCP 도구명) | 도구 실행 전 차단/재작성 가능 |
| `PermissionRequest` | 도구 이름 | 승인 전 자동 허용/거부 가능 |
| `PostToolUse` | 도구 이름 | 툴 실행 후 컨텍스트 추가 가능 |
| `PreCompact` | `manual \| auto` | 컴팩션 전 (중단 가능) |
| `PostCompact` | `manual \| auto` | 컴팩션 후 |
| `UserPromptSubmit` | 미지원 | 사용자 프롬프트 제출 시 |
| `SubagentStart` | subagent type | 서브에이전트 시작 시 |
| `SubagentStop` | subagent type | 서브에이전트 종료 시 |
| `Stop` | 미지원 | 턴 종료 시 (계속 진행 요청 가능) |

### 훅 신뢰(Trust) 흐름

- 비관리(non-managed) 커맨드 훅은 실행 전 **검토 및 신뢰** 과정이 필요
- Codex는 훅의 현재 해시를 기준으로 신뢰 상태를 관리
- 변경된 훅은 재검토 필요
- CLI에서 `/hooks` 명령으로 훅 상태 확인 및 신뢰 관리 가능
- 1회성 자동화에는 `--dangerously-bypass-hook-trust` 플래그 사용 가능

### 훅 입력/출력 요약

모든 커맨드 훅은 `stdin`으로 JSON 객체를 수신한다.

**공통 입력 필드**:

| 필드 | 타입 | 의미 |
|------|------|------|
| `session_id` | `string` | 현재 세션 ID |
| `transcript_path` | `string \| null` | 세션 트랜스크립트 파일 경로 |
| `cwd` | `string` | 작업 디렉터리 |
| `hook_event_name` | `string` | 현재 훅 이벤트명 |
| `model` | `string` | 활성 모델 슬러그 |

**공통 출력 필드**:

| 필드 | 효과 |
|------|------|
| `continue` | `false`면 해당 훅 실행을 중단으로 표시 |
| `stopReason` | 중단 사유로 기록 |
| `systemMessage` | UI 또는 이벤트 스트림에 경고로 표시 |
| `suppressOutput` | 파싱은 되지만 아직 구현되지 않음 |

---

## 8. 슬래시 명령어 이전

### 변환 매핑

| 원본 | Codex 대상 | 설명 |
|------|-----------|------|
| 슬래시 명령어 | Codex skills (`SKILL.md`) | 1:1 매핑이 되지 않는 경우가 많음 |

슬래시 명령어는 1:1 매핑이 어려운 경우가 많다. 이런 항목은 import 완료 후 **Continue in Codex** 옵션으로 `migrate-to-codex` 스킬을 통해 후속 마이그레이션을 진행할 수 있다.

### 변환 흐름

```
외부 에이전트 슬래시 명령어
  → Codex 스킬 (SKILL.md)
  → .agents/skills/<skill-name>/SKILL.md
```

### 스킬 사용 방법

| 방식 | 설명 |
|------|------|
| **명시적 호출** | CLI/IDE에서 `/skills` 실행 후 선택, 또는 `$`로 스킬 멘션 |
| **암시적 호출** | 작업 설명이 스킬 `description`과 일치하면 Codex가 자동으로 선택 |

---

## 9. 서브에이전트 설정 이전

### 변환 매핑

| 원본 | Codex 대상 | 설명 |
|------|-----------|------|
| 서브에이전트 설정 | Codex agents (`~/.codex/agents/` 또는 `.codex/agents/`) | 커스텀 에이전트 파일로 변환 |

### 커스텀 에이전트 파일 위치

| 범위 | 경로 |
|------|------|
| 개인용 | `~/.codex/agents/<agent-name>.toml` |
| 프로젝트용 | `.codex/agents/<agent-name>.toml` |

### 커스텀 에이전트 파일 스키마

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `name` | `string` | 예 | Codex가 에이전트를 식별/참조할 때 사용하는 이름 (파일명과 다를 수 있으며 `name` 필드가 소스 오브 트루스) |
| `description` | `string` | 예 | Codex가 이 에이전트를 언제 사용할지 판단하는 지침 |
| `developer_instructions` | `string` | 예 | 에이전트의 핵심 동작을 정의하는 지침 |
| `nickname_candidates` | `array<string>` | 아니요 | UI에 표시할 표시명 후보 (ASCII 문자, 숫자, 공백, 하이픈, 밑줄) |
| `model` | `string` | 아니요 | 부모 세션에서 상속 |
| `model_reasoning_effort` | `string` | 아니요 | 부모 세션에서 상속 |
| `sandbox_mode` | `string` | 아니요 | 부모 세션에서 상속 |
| `mcp_servers` | `table` | 아니요 | 부모 세션에서 상속 |
| `skills.config` | `array` | 아니요 | 부모 세션에서 상속 |

### 전역 에이전트 설정 (`config.toml`)

```toml
[agents]
max_threads = 6        # 동시에 열 수 있는 에이전트 스레드 상한 (기본값: 6)
max_depth = 1          # 스폰 중첩 깊이 (루트=0, 기본값: 1)
job_max_runtime_seconds = 1800  # spawn_agents_on_csv 작업별 타임아웃
```

| 필드 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `agents.max_threads` | `number` | `6` | 동시에 열 수 있는 에이전트 스레드 상한 |
| `agents.max_depth` | `number` | `1` | 중첩 깊이 (루트=0). 깊이를 높이면 토큰 사용량/지연/리소스 소모 증가 |
| `agents.job_max_runtime_seconds` | `number` | `1800` | `spawn_agents_on_csv` 작업의 기본 워커 타임아웃 |

### 내장 에이전트

| 에이전트 | 설명 |
|----------|------|
| `default` | 범용 폴백 에이전트 |
| `worker` | 실행 중심 구현/수정 에이전트 |
| `explorer` | 읽기 중심 코드베이스 탐색 에이전트 |

> 커스텀 에이전트 이름이 내장 에이전트(예: `explorer`)와 같으면 커스텀 에이전트가 우선한다.

### 커스텀 에이전트 예시 — PR 리뷰 팀

`.codex/agents/pr-explorer.toml`:

```toml
name = "pr_explorer"
description = "Read-only codebase explorer for gathering evidence before changes are proposed."
model = "gpt-5.3-codex-spark"
model_reasoning_effort = "medium"
sandbox_mode = "read-only"
developer_instructions = """
Stay in exploration mode.
Trace the real execution path, cite files and symbols, and avoid proposing fixes unless the parent agent asks for them.
Prefer fast search and targeted file reads over broad scans.
"""
```

`.codex/agents/reviewer.toml`:

```toml
name = "reviewer"
description = "PR reviewer focused on correctness, security, and missing tests."
model = "gpt-5.4"
model_reasoning_effort = "high"
sandbox_mode = "read-only"
developer_instructions = """
Review code like an owner.
Prioritize correctness, security, behavior regressions, and missing test coverage.
Lead with concrete findings, include reproduction steps when possible, and avoid style-only comments unless they hide a real bug.
"""
nickname_candidates = ["Atlas", "Delta", "Echo"]
```

`.codex/agents/docs-researcher.toml`:

```toml
name = "docs_researcher"
description = "Documentation specialist that uses the docs MCP server to verify APIs and framework behavior."
model = "gpt-5.4-mini"
model_reasoning_effort = "medium"
sandbox_mode = "read-only"
developer_instructions = """
Use the docs MCP server to confirm APIs, options, and version-specific behavior.
Return concise answers with links or exact references when available.
Do not make code changes.
"""

[mcp_servers.openaiDeveloperDocs]
url = "https://developers.openai.com/mcp"
```

### 서브에이전트 상속 규칙

- 서브에이전트는 부모 세션의 샌드박스 정책을 상속
- 부모 턴의 라이브 런타임 오버라이드(`/permissions` 변경, `--yolo` 등)도 자식에 재적용
- 개별 커스텀 에이전트 파일에서 샌드박스 설정을 오버라이드할 수 있음 (예: `sandbox_mode = "read-only"`)

---

## 10. 마이그레이션 후 검토 항목

import가 완료된 후, 실제로 사용하기 전에 반드시 다음 항목을 점검한다.

| 검토 항목 | 이유 |
|---|---|
| 가져온 스킬/에이전트의 툴 권한 및 제한 | 권한 모델이 다를 수 있음 |
| MCP 서버의 인증, 헤더, 환경 변수, transport 방식 | 커스텀 인증이나 특수 설정이 누락될 수 있음 |
| 훅의 동작 차이 | 이벤트 스키마나 실행 타이밍이 다를 수 있음 |
| 플러그인, 마켓플레이스 등 수동 설치 항목 | 자동 변환 불가, 수동 후속 작업 필요 |
| 프롬프트 템플릿의 인수, 셸 보간, 파일 경로 placeholder | 인자 전달 방식이 다를 수 있음 |

---

## 11. 마이그레이션 후 다음 단계

1. 가져온 프로젝트 중 하나를 열고 기존 작업을 이어서 진행
2. Codex가 처음이라면 [Quickstart](https://developers.openai.com/codex/quickstart) 가이드를 참고
3. 후속 작업이 필요한 항목은 `migrate-to-codex` 스킬이 포함된 스레드에서 계속 진행

> 마이그레이션 후 Codex는 사용자 수준 설정과 프로젝트 수준 설정을 분리해서 표시하므로, 각 항목이 어디에 속하는지 확인할 수 있다.
