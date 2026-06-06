# 훅 시스템

> 훅(Hooks)은 Codex의 확장성 프레임워크로, 에이전트 루프에 자체 스크립트를 주입하여 로깅, 정책 시행, 메모리 생성, 검증 등의 기능을 구현할 수 있습니다.

**참조:** [Hooks - Codex | OpenAI Developers](https://developers.openai.com/codex/hooks)

---

## 1. 훅 개요

훅은 Codex의 에이전트 루프에 결정론적 스크립트를 주입할 수 있게 합니다. 다음과 같은 용도로 활용할 수 있습니다:

- 대화를 커스텀 로깅/분석 엔진으로 전송
- 팀 프롬프트에서 실수로 API 키가 붙여넣어지는 것을 차단
- 대화를 요약하여 자동으로 영구 메모리 생성
- 대화 턴이 종료될 때 커스텀 검증 실행, 표준 시행
- 특정 디렉토리에서 프롬프트 커스터마이징

---

## 2. 훅 활성화/비활성화

훅은 기본적으로 활성화되어 있습니다. 비활성화하려면 `config.toml`에 다음을 설정합니다:

```toml
[features]
hooks = false
```

- `hooks`가 정식 기능 키입니다. `codex_hooks`는 더 이상 사용되지 않는 별칭으로 여전히 동작합니다.
- 관리자는 `requirements.toml`에서 `[features].hooks = false`로 강제 비활성화할 수 있습니다.

---

## 3. 3단계 구조

훅은 세 가지 수준으로 구성됩니다:

```
훅 이벤트 (Hook Event)
  └── 매처 그룹 (Matcher Group)
        └── 핸들러 (Handler) — 하나 이상
```

1. **훅 이벤트:** `PreToolUse`, `PostToolUse`, `PreCompact` 등
2. **매처 그룹:** 이벤트가 언제 매칭되는지 결정
3. **핸들러:** 매처 그룹이 매칭될 때 실행되는 스크립트

---

## 4. 10종 훅 이벤트 전체 표

| # | 이벤트 | matcher 대상 | 스코프 | 주요 기능 |
|---|---|---|---|---|
| 1 | **SessionStart** | `source` (`startup`, `resume`, `clear`, `compact`) | 스레드/서브에이전트 시작 | 세션 시작 시 컨텍스트 주입 |
| 2 | **SubagentStart** | `agent_type` | 서브에이전트 시작 | 서브에이전트에 컨텍스트 제공 |
| 3 | **PreToolUse** | `tool_name` (Bash, apply_patch, MCP 도구 등) | 턴 | 도구 호출 차단/수정 가능 |
| 4 | **PermissionRequest** | `tool_name` | 턴 | 승인 요청 허용/거부 |
| 5 | **PostToolUse** | `tool_name` | 턴 | 도구 실행 후 검토/피드백 |
| 6 | **PreCompact** | `trigger` (`manual`, `auto`) | 턴 | 압축 전 실행, 차단 가능 |
| 7 | **PostCompact** | `trigger` (`manual`, `auto`) | 턴 | 압축 후 실행 |
| 8 | **UserPromptSubmit** | 미지원 (matcher 무시됨) | 턴 | 프롬프트 차단 가능 |
| 9 | **SubagentStop** | `agent_type` | 턴 | 서브에이전트 계속 진행 가능 |
| 10 | **Stop** | 미지원 (matcher 무시됨) | 턴 | 계속 진행 가능, `decision:"block"` = 새 프롬프트로 계속 |

### 런타임 동작 참고사항

- 여러 파일의 매칭 훅이 모두 실행됩니다.
- 동일 이벤트에 대한 여러 매칭 명령 훅은 **동시에** 시작됩니다. 하나의 훅이 다른 훅의 시작을 막을 수 없습니다.
- 비관리 명령 훅은 실행 전에 검토하고 신뢰해야 합니다.
- `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `UserPromptSubmit`, `SubagentStop`, `Stop`은 턴 스코프에서 실행됩니다.
- `SessionStart`와 `SubagentStart`는 스레드 또는 서브에이전트 시작 스코프에서 실행됩니다.

---

## 5. 핸들러 타입

| 타입 | 상태 | 설명 |
|---|---|---|
| `command` | **활성** | 쉘 명령을 실행합니다. 현재 유일하게 실행되는 핸들러입니다. |
| `prompt` | 파싱만 됨 | 아직 실행되지 않습니다. 건너뜁니다. |
| `agent` | 파싱만 됨 | 아직 실행되지 않습니다. 건너뜁니다. |
| `async: true` | 파싱만 됨 | 비동기 명령 훅은 아직 지원되지 않습니다. 건너뜁니다. |

### 핸들러 속성

| 속성 | 타입 | 설명 |
|---|---|---|
| `type` | `string` | 핸들러 타입 (현재 `"command"`만 활성) |
| `command` | `string` | 실행할 명령 (macOS/Linux) |
| `commandWindows` | `string` | Windows 전용 명령 오버라이드 (TOML: `command_windows`) |
| `timeout` | `number` | 타임아웃 (초). 기본값: **600초** |
| `statusMessage` | `string` | 선택적 상태 메시지 |

**참고:**
- 명령은 세션 `cwd`를 작업 디렉토리로 사용하여 실행됩니다.
- 저장소 로컬 훅의 경우 `.codex/hooks/...` 같은 상대 경로 대신 git 루트에서 해석하는 경로를 권장합니다. Codex가 하위 디렉토리에서 시작될 수 있으므로 git-root 기반 경로가 훅 위치를 안정적으로 유지합니다.

---

## 6. 훅 발견 위치

Codex는 활성 구성 계층의 다음 형식에서 훅을 발견합니다:

- `hooks.json` 파일
- `config.toml` 내 인라인 `[hooks]` 테이블

### 주요 위치

| 위치 | 범위 |
|---|---|
| `~/.codex/hooks.json` | 사용자 |
| `~/.codex/config.toml` | 사용자 |
| `<repo>/.codex/hooks.json` | 프로젝트 (신뢰된 저장소만) |
| `<repo>/.codex/config.toml` | 프로젝트 (신뢰된 저장소만) |
| 플러그인 매니페스트 또는 `hooks/hooks.json` | 플러그인 |

여러 훅 소스가 존재하면 Codex는 모든 매칭 훅을 로드합니다. 더 높은 우선순위의 구성 계층이 하위 훅을 대체하지 않습니다. 단일 계층에 `hooks.json`과 인라인 `[hooks]`가 모두 있으면 병합하며 시작 시 경고를 표시합니다. 계층당 하나의 표현을 권장합니다.

프로젝트 로컬 훅은 프로젝트 `.codex/` 계층이 신뢰된 경우에만 로드됩니다. 신뢰되지 않은 프로젝트에서도 사용자 및 시스템 훅은 로드됩니다.

### 플러그인 훅

플러그인이 활성화되면 Codex는 해당 플러그인에서 수명 주기 훅을 로드할 수 있습니다. 플러그인 번들 훅은 다른 훅 소스와 함께 로드되며, 동일한 신뢰 검토 흐름을 사용합니다.

기본적으로 Codex는 플러그인 루트 내의 `hooks/hooks.json`을 찾습니다. 플러그인 매니페스트(`.codex-plugin/plugin.json`)의 `hooks` 항목으로 기본값을 오버라이드할 수 있습니다.

**매니페스트 `hooks` 항목의 4가지 형태:**

| 형태 | 예시 | 설명 |
|---|---|---|
| `./` 접두 경로 | `"./hooks/hooks.json"` | 단일 파일 경로 |
| `./` 접두 경로 배열 | `["./hooks/a.json", "./hooks/b.json"]` | 여러 파일 경로 |
| 인라인 객체 | `{ "PreToolUse": [...] }` | 직접 hooks 정의 |
| 인라인 객체 배열 | `[{ ... }, { ... }]` | 여러 hooks 정의 |

```json
{
  "name": "repo-policy",
  "hooks": "./hooks/hooks.json"
}
```

- 매니페스트 훅 경로는 플러그인 루트에 상대적으로 해석되며 해당 루트 내에 있어야 합니다.
- 매니페스트에 `hooks`가 정의되어 있으면 기본 `hooks/hooks.json` 대신 매니페스트 항목이 사용됩니다.
- 플러그인 설치/활성화만으로 훅이 자동으로 신뢰되지는 않습니다. 현재 훅 정의를 검토하고 신뢰할 때까지 건너뜁니다.

**플러그인 훅 명령에 제공되는 환경 변수:**

| 환경 변수 | 설명 |
|---|---|
| `PLUGIN_ROOT` | 설치된 플러그인 루트를 가리키는 Codex 확장 |
| `PLUGIN_DATA` | 플러그인의 쓰기 가능한 데이터 디렉토리를 가리키는 Codex 확장 |
| `CLAUDE_PLUGIN_ROOT` | 기존 플러그인 훅 호환성을 위한 `PLUGIN_ROOT` 별칭 |
| `CLAUDE_PLUGIN_DATA` | 기존 플러그인 훅 호환성을 위한 `PLUGIN_DATA` 별칭 |

---

## 7. 신뢰 검토 (Trust Review)

비관리 명령 훅이 실행되려면 **검토 및 신뢰**가 필요합니다.

### 프로세스

1. Codex는 훅 구성 전에 구성된 훅을 나열합니다.
2. 비관리 명령 훅이 실행되기 전에 Codex는 사용자가 정확한 훅 정의를 검토하고 신뢰하도록 요구합니다.
3. 신뢰는 훅의 **현재 해시**에 대해 기록됩니다. 새로운 훅이나 변경된 훅은 검토 대상으로 표시되고 신뢰될 때까지 건너뜁니다.

### CLI 관리

```bash
/hooks   # 훅 소스 검사, 새/변경 훅 검토, 신뢰, 비활성화
```

시작 시 검토가 필요한 훅이 있으면 `/hooks`를 열라는 경고가 출력됩니다.

### 관리형 훅

시스템, MDM, 클라우드, 또는 `requirements.toml` 소스의 관리형 훅은 관리형으로 표시되어 정책에 의해 신뢰되며, 사용자 훅 브라우저에서 비활성화할 수 없습니다.

### 신뢰 바이패스

```bash
--dangerously-bypass-hook-trust
```

일회성 자동화에서 이미 외부에서 훅 소스를 검증한 경우, 이 플래그를 사용하여 영구 훅 신뢰 없이 활성 훅을 실행할 수 있습니다.

---

## 8. hooks.json 구조 예시

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
    "PermissionRequest": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/permission_request.py\"",
            "statusMessage": "Checking approval request"
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
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/user_prompt_submit_data_flywheel.py\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/stop_continue.py\"",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### 동등한 config.toml 인라인 구성

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

---

## 9. stdin/stdout JSON 프로토콜

모든 명령 훅은 `stdin`으로 하나의 JSON 객체를 받습니다. 명령은 세션 `cwd`를 작업 디렉토리로 사용하여 실행됩니다.

### 9.1 공통 입력 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `session_id` | `string` | 현재 Codex 세션 ID. 서브에이전트 훅은 부모 세션 ID를 사용 |
| `transcript_path` | `string \| null` | 세션 트랜스크립트 파일 경로 (있는 경우) |
| `cwd` | `string` | 세션 작업 디렉토리 |
| `hook_event_name` | `string` | 현재 훅 이벤트 이름 |
| `model` | `string` | Codex 확장. 활성 모델 슬러그 |

> **경고:** `transcript_path`는 편의를 위해 대화 트랜스크립트를 가리키지만, 트랜스크립트 형식은 훅을 위한 안정적인 인터페이스가 아니며 시간이 지남에 따라 변경될 수 있습니다. 훅에서 `transcript_path`에 의존하는 파싱 로직을 작성할 때는 주의하세요.

### 턴 스코프 확장 필드

턴 스코프 훅은 `turn_id`를 Codex 확장으로 포함합니다.

### permission_mode

`SessionStart`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `UserPromptSubmit`, `SubagentStart`, `SubagentStop`, `Stop`은 `permission_mode`를 포함합니다. 값: `default`, `acceptEdits`, `plan`, `dontAsk`, `bypassPermissions`.

### 9.2 공통 출력 필드

`SessionStart`, `PreCompact`, `PostCompact`, `UserPromptSubmit`, `SubagentStop`, `Stop`에서 지원:

```json
{
  "continue": true,
  "stopReason": "optional",
  "systemMessage": "optional",
  "suppressOutput": false
}
```

| 필드 | 효과 |
|---|---|
| `continue` | `false`면 해당 훅 실행을 중지로 표시 |
| `stopReason` | 중지 사유로 기록 |
| `systemMessage` | UI 또는 이벤트 스트림에 경고로 표시 |
| `suppressOutput` | 파싱은 되지만 아직 구현되지 않음 |

종료 코드 `0`과 출력 없음은 성공으로 처리되고 Codex가 계속 진행합니다.

### 이벤트별 지원 필드 요약

| 이벤트 | `systemMessage` | `continue: false` | `stopReason` | `suppressOutput` |
|---|---|---|---|---|
| SessionStart | 지원 | 지원 | 지원 | 파싱만 됨 |
| SubagentStart | 지원 | 파싱만 됨 (서브에이전트 시작 불가) | — | — |
| PreToolUse | 지원 | **미지원** | **미지원** | **미지원** |
| PermissionRequest | 지원 | **미지원** | **미지원** | **미지원** |
| PostToolUse | 지원 | **지원** | 지원 | 파싱만 됨 |
| PreCompact | 지원 | 지원 | 지원 | 파싱만 됨 |
| PostCompact | 지원 | 지원 | 지원 | 파싱만 됨 |
| UserPromptSubmit | 지원 | 지원 | 지원 | 파싱만 됨 |
| SubagentStop | 지원 | 지원 | 지원 | 파싱만 됨 |
| Stop | 지원 | 지원 | 지원 | 파싱만 됨 |

---

## 10. 이벤트별 상세 프로토콜

### 10.1 SessionStart

**matcher:** `source`에 적용. 값: `startup`, `resume`, `clear`, `compact`

**추가 입력 필드:**

| 필드 | 타입 | 설명 |
|---|---|---|
| `source` | `string` | 세션 시작 방식: `startup`, `resume`, `clear`, `compact` |

**출력:**
- 일반 텍스트(stdout) -> 추가 개발자 컨텍스트로 추가
- JSON(stdout) -> 공통 출력 필드 + `hookSpecificOutput.additionalContext`

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Load the workspace conventions before editing."
  }
}
```

### 10.2 SubagentStart

**matcher:** `agent_type`에 적용

**추가 입력 필드:**

| 필드 | 타입 | 설명 |
|---|---|---|
| `turn_id` | `string` | Codex 확장. 활성 턴 ID |
| `agent_id` | `string` | 서브에이전트 식별자 |
| `agent_type` | `string` | 서브에이전트 타입/프로필 |
| `permission_mode` | `string` | 현재 권한 모드 |

**출력:**
- 일반 텍스트(stdout) -> 서브에이전트의 추가 개발자 컨텍스트
- JSON(stdout) -> `systemMessage` + `hookSpecificOutput.additionalContext`
- `continue: false`는 파싱되지만 서브에이전트 시작을 막지 않음

### 10.3 PreToolUse

**기능:** Bash, `apply_patch`를 통한 파일 편집, MCP 도구 호출을 가로챕니다. 도구 호출을 **차단**하거나 **수정**할 수 있습니다.

> **참고:** `PreToolUse`는 완전한 시행 경계라기보다는 가드레일입니다. Codex가 다른 지원 도구 경로를 통해 동등한 작업을 수행할 수 있는 경우가 많기 때문입니다.

**unified_exec 제한:** 아직 모든 셸 호출을 가로채지 못하며, 단순한 셸 호출만 가로챕니다. 최신 `unified_exec` 메커니즘은 셸의 더 풍부한 스트리밍 stdin/stdout 처리를 허용하지만, 가로채기가 불완전합니다. 마찬가지로 `WebSearch` 등 비셸/비MCP 도구 호출은 가로챌 수 없습니다.

**matcher:** `tool_name` 및 matcher 별칭에 적용. `apply_patch`의 경우 matcher 값으로 `apply_patch`, `Edit`, `Write`를 사용할 수 있습니다. 단, 훅 입력의 `tool_name`은 항상 `"apply_patch"`로 보고됩니다.

**추가 입력 필드:**

| 필드 | 타입 | 설명 |
|---|---|---|
| `turn_id` | `string` | 활성 턴 ID |
| `tool_name` | `string` | 정식 훅 도구 이름 (`Bash`, `apply_patch`, MCP 이름 등) |
| `tool_use_id` | `string` | 도구 호출 ID |
| `tool_input` | `JSON value` | 도구별 입력. Bash와 apply_patch는 `tool_input.command` 사용 |

**출력:**

일반 텍스트(stdout)는 무시됩니다. JSON 출력은 `systemMessage`를 사용할 수 있습니다.

**차단 (deny) — 현재 형태:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Destructive command blocked by hook."
  }
}
```

**차단 (deny) — 레거시 형태:**
```json
{
  "decision": "block",
  "reason": "Destructive command blocked by hook."
}
```

또는 종료 코드 `2`와 `stderr`에 차단 사유 작성.

**컨텍스트 추가 (차단 없이):**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": "The pending command touches generated files."
  }
}
```

**도구 호출 수정:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": {
      "command": "echo rewritten"
    }
  }
}
```

- `updatedInput`은 `permissionDecision: "allow"`와 함께 사용해야 합니다.
- Bash/apply_patch의 경우 `updatedInput`은 문자열 `command` 필드를 포함해야 합니다.
- MCP 도구의 경우 `updatedInput`은 대체 인수 객체입니다.
- `updatedInput`을 `permissionDecision: "allow"` 외의 값과 함께 반환하면 에러로 보고됩니다.

**미지원 필드 및 실패 동작:**

`PreToolUse`는 `systemMessage`를 지원하지만, 다음 필드는 **파싱만 되고 아직 지원되지 않습니다**:

| 필드 | 상태 | 동작 |
|---|---|---|
| `permissionDecision: "ask"` | 파싱만 됨 | 훅 실행 실패로 처리, 에러 보고 후 도구 호출 계속 진행 |
| `decision: "approve"` (레거시) | 파싱만 됨 | 훅 실행 실패로 처리, 에러 보고 후 도구 호출 계속 진행 |
| `continue: false` | 미지원 | 훅 실행 실패로 처리, 에러 보고 후 도구 호출 계속 진행 |
| `stopReason` | 미지원 | 훅 실행 실패로 처리, 에러 보고 후 도구 호출 계속 진행 |
| `suppressOutput` | 미지원 | 훅 실행 실패로 처리, 에러 보고 후 도구 호출 계속 진행 |

지원되지 않는 필드를 반환하면 Codex는 해당 훅 실행을 **실패**로 표시하고 에러를 보고한 후 도구 호출을 계속 진행합니다.

### 10.4 PermissionRequest

**기능:** 승인 요청을 허용/거부합니다. 승인이 필요 없는 명령에는 실행되지 않습니다.

**matcher:** `tool_name` 및 matcher 별칭에 적용. 현재 정식 값은 `Bash`, `apply_patch`, MCP 도구 이름(`mcp__server__tool` 등)을 포함합니다. `apply_patch`는 `Edit`과 `Write`도 매칭합니다.

**추가 입력 필드:**

| 필드 | 타입 | 설명 |
|---|---|---|
| `turn_id` | `string` | 활성 턴 ID |
| `tool_name` | `string` | 정식 훅 도구 이름 |
| `tool_input` | `JSON value` | 도구별 입력 |
| `tool_input.description` | `string \| null` | 사람이 읽을 수 있는 승인 사유 (있는 경우) |

**출력:**

**허용:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow"
    }
  }
}
```

**거부:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "deny",
      "message": "Blocked by repository policy."
    }
  }
}
```

- 여러 매칭 훅이 결정을 반환하면 **`deny`가 우선**합니다.
- 매칭 훅이 결정하지 않으면 일반 승인 흐름이 진행됩니다.
- `updatedInput`, `updatedPermissions`, `interrupt`는 반환하지 마세요. 이 필드들은 향후 동작을 위해 예약되어 있으며 현재는 fail-closed로 동작합니다.
- 일부 도구 입력에는 사람이 읽을 수 있는 description이 포함될 수 있지만, 모든 도구에서 `tool_input.description` 필드가 존재한다고 가정하지 마세요.

### 10.5 PostToolUse

**기능:** 도구 실행 후 검토 및 피드백 제공. 이미 실행된 도구의 부작용을 취소할 수는 없습니다.

> **참고:** `PostToolUse`는 Bash, `apply_patch`, MCP 도구 호출이 출력을 생성한 후 실행됩니다. Bash의 경우 0이 아닌 종료 코드로 종료된 명령 이후에도 실행됩니다.

**unified_exec 제한:** `PreToolUse`와 동일하게 아직 모든 셸 호출을 가로채지 못합니다. `unified_exec` 메커니즘은 셸의 더 풍부한 스트리밍 stdin/stdout 처리를 허용하지만, 가로채기가 불완전합니다. 마찬가지로 `WebSearch` 등 비셸/비MCP 도구 호출은 가로챌 수 없습니다.

**matcher:** `tool_name` 및 matcher 별칭에 적용. `apply_patch`의 경우 matcher 값으로 `apply_patch`, `Edit`, `Write`를 사용할 수 있습니다. 단, 훅 입력의 `tool_name`은 항상 `"apply_patch"`로 보고됩니다.

**추가 입력 필드:**

| 필드 | 타입 | 설명 |
|---|---|---|
| `turn_id` | `string` | 활성 턴 ID |
| `tool_name` | `string` | 정식 훅 도구 이름 |
| `tool_use_id` | `string` | 도구 호출 ID |
| `tool_input` | `JSON value` | 도구별 입력 |
| `tool_response` | `JSON value` | 도구별 출력. MCP 도구의 경우 MCP 호출 결과 |

**출력:**

일반 텍스트(stdout)는 무시됩니다. JSON(stdout)은 `systemMessage`를 사용할 수 있습니다.

```json
{
  "decision": "block",
  "reason": "The Bash output needs review before continuing.",
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "The command updated generated files."
  }
}
```

- `additionalContext` 텍스트가 추가 개발자 컨텍스트에 추가됩니다.
- `decision: "block"`은 완료된 명령을 취소하지 않습니다. 대신 피드백을 기록하고 도구 결과를 해당 피드백으로 교체한 후 모델이 계속 진행합니다.
- `continue: false`를 반환하면 명령이 이미 실행된 후 원래 도구 결과 처리를 중지하고, 도구 결과를 피드백 또는 중지 텍스트로 교체한 후 거기서부터 계속 진행합니다.
- 종료 코드 `2`와 `stderr`에 피드백 사유를 작성할 수도 있습니다.

**미지원 필드:**

| 필드 | 상태 | 동작 |
|---|---|---|
| `updatedMCPToolOutput` | 파싱만 됨 | 훅 실행 실패로 처리, 에러 보고 후 정상 처리 계속 |
| `suppressOutput` | 파싱만 됨 | 훅 실행 실패로 처리, 에러 보고 후 정상 처리 계속 |

### 10.6 PreCompact

**기능:** 대화 압축 전에 실행됩니다. `continue: false`를 반환하면 압축을 차단합니다.

**matcher:** `trigger`에 적용. 값: `manual`, `auto`

**추가 입력 필드:**

| 필드 | 타입 | 설명 |
|---|---|---|
| `turn_id` | `string` | 활성 턴 ID |
| `trigger` | `string` | 압축 트리거: `manual` 또는 `auto` |

**출력:** 공통 출력 필드. 일반 텍스트(stdout)는 무시됩니다.

### 10.7 PostCompact

**기능:** 대화 압축 후에 실행됩니다.

**matcher:** `trigger`에 적용. 값: `manual`, `auto`

**추가 입력 필드:** `PreCompact`와 동일.

**출력:** 공통 출력 필드. `continue: false`를 반환하면 압축 후 중지합니다.

### 10.8 UserPromptSubmit

**기능:** 사용자 프롬프트가 전송되기 전에 실행됩니다. 프롬프트를 **차단**할 수 있습니다.

**matcher:** 현재 사용되지 않음 (설정된 matcher는 무시됨)

**추가 입력 필드:**

| 필드 | 타입 | 설명 |
|---|---|---|
| `turn_id` | `string` | 활성 턴 ID |
| `prompt` | `string` | 전송될 사용자 프롬프트 |

**출력:**
- 일반 텍스트(stdout) -> 추가 개발자 컨텍스트
- JSON(stdout) -> 공통 출력 필드 + `hookSpecificOutput.additionalContext`

**프롬프트 차단:**
```json
{
  "decision": "block",
  "reason": "Ask for confirmation before doing that."
}
```

또는 종료 코드 `2`와 `stderr`에 차단 사유 작성.

### 10.9 SubagentStop

**기능:** 서브에이전트가 종료될 때 실행됩니다. Codex에게 서브에이전트를 **계속 진행**하도록 요청할 수 있습니다.

**matcher:** `agent_type`에 적용

**추가 입력 필드:**

| 필드 | 타입 | 설명 |
|---|---|---|
| `turn_id` | `string` | 활성 턴 ID |
| `agent_id` | `string` | 서브에이전트 식별자 |
| `agent_type` | `string` | 서브에이전트 타입/프로필 |
| `agent_transcript_path` | `string \| null` | 서브에이전트 트랜스크립트 경로 |
| `stop_hook_active` | `boolean` | 이 서브에이전트가 이미 계속 진행되었는지 |
| `last_assistant_message` | `string \| null` | 최신 서브에이전트 어시스턴트 메시지 |

**출력:** 종료 코드 `0`일 때 JSON만 허용 (일반 텍스트는 이 이벤트에서 유효하지 않음).

**계속 진행:**
```json
{
  "decision": "block",
  "reason": "Run one more focused pass inside the subagent."
}
```

또는 종료 코드 `2`와 `stderr`에 계속 사유 작성.

- 매칭 훅이 `continue: false`를 반환하면 다른 훅의 계속 결정보다 우선합니다.

### 10.10 Stop

**기능:** 턴이 종료될 때 실행됩니다. Codex에게 **계속 진행**하도록 요청할 수 있습니다.

**matcher:** 현재 사용되지 않음

**추가 입력 필드:**

| 필드 | 타입 | 설명 |
|---|---|---|
| `turn_id` | `string` | 활성 턴 ID |
| `stop_hook_active` | `boolean` | 이 턴이 이미 `Stop`에 의해 계속 진행되었는지 |
| `last_assistant_message` | `string \| null` | 최신 어시스턴트 메시지 |

**출력:** 종료 코드 `0`일 때 JSON만 허용 (일반 텍스트는 이 이벤트에서 유효하지 않음).

**계속 진행:**
```json
{
  "decision": "block",
  "reason": "Run one more pass over the failing tests."
}
```

**핵심:** `decision: "block"`은 턴을 거부하는 것이 아닙니다. 대신 `reason`을 새 사용자 프롬프트 텍스트로 사용하여 Codex가 계속 진행하도록 자동으로 새로운 계속 프롬프트를 생성합니다.

또는 종료 코드 `2`와 `stderr`에 계속 사유 작성.

- 매칭 훅이 `continue: false`를 반환하면 다른 훅의 계속 결정보다 우선합니다.

---

## 11. 관리형 훅 (Managed Hooks)

엔터프라이즈 관리 `requirements.toml`에서 인라인 훅을 정의할 수 있습니다. 관리자가 훅 구성을 시행하면서 실제 스크립트는 MDM이나 다른 디바이스 관리 시스템을 통해 전달할 때 유용합니다.

사용자가 로컬에서 훅을 비활성화한 경우에도 관리형 훅을 시행하려면 `requirements.toml`에서 `[features].hooks = true`을 `[hooks]`와 함께 고정합니다. 사용자, 프로젝트, 세션, 플러그인 훅을 무시하고 관리자 관리형 훅만 허용하려면 `allow_managed_hooks_only = true`를 설정합니다.

### requirements.toml 예시

```toml
allow_managed_hooks_only = true

[features]
hooks = true

[hooks]
managed_dir = "/enterprise/hooks"
windows_managed_dir = 'C:\enterprise\hooks'

[[hooks.PreToolUse]]
matcher = "^Bash$"

[[hooks.PreToolUse.hooks]]
type = "command"
command = "python3 /enterprise/hooks/pre_tool_use_policy.py"
command_windows = 'py -3 C:\enterprise\hooks\pre_tool_use_policy.py'
timeout = 30
statusMessage = "Checking managed Bash command"
```

### 관리형 훅 참고사항

| 항목 | 설명 |
|---|---|
| `managed_dir` | macOS/Linux에서 사용 |
| `windows_managed_dir` | Windows에서 사용 |
| `allow_managed_hooks_only = true` | 사용자, 프로젝트, 세션, 플러그인 소스의 훅을 건너뛰고 관리형 훅만 로드. 단, `requirements.toml` 및 기타 관리형 구성 계층의 관리형 훅은 계속 로드 |

- Codex는 `managed_dir`의 스크립트를 배포하지 않습니다. 엔터프라이즈 도구로 별도 설치/업데이트해야 합니다.
- 관리형 훅 명령은 구성된 관리 디렉토리 내의 절대 스크립트 경로를 사용해야 합니다.

---

## 12. matcher 상세

`matcher` 필드는 훅이 실행되는 시점을 필터링하는 정규식 문자열입니다. `"*"`, `""`를 사용하거나 `matcher`를 생략하면 지원 이벤트의 모든 발생과 매칭됩니다.

### 이벤트별 matcher 대상

| 이벤트 | matcher 필터 대상 | 비고 |
|---|---|---|
| `PermissionRequest` | tool name | `Bash`, `apply_patch`*, MCP 도구 이름 포함 |
| `PostToolUse` | tool name | `Bash`, `apply_patch`*, MCP 도구 이름 포함 |
| `PostCompact` | compaction trigger | 값: `manual`, `auto` |
| `PreCompact` | compaction trigger | 값: `manual`, `auto` |
| `PreToolUse` | tool name | `Bash`, `apply_patch`*, MCP 도구 이름 포함 |
| `SessionStart` | start source | 값: `startup`, `resume`, `clear`, `compact` |
| `SubagentStart` | subagent type | 시작되는 서브에이전트에 따라 다름 |
| `SubagentStop` | subagent type | 중단되는 서브에이전트에 따라 다름 |
| `UserPromptSubmit` | 미지원 | 설정된 matcher는 무시됨 |
| `Stop` | 미지원 | 설정된 matcher는 무시됨 |

*\*`apply_patch`의 경우 matcher 값으로 `Edit` 또는 `Write`도 사용할 수 있습니다 (alias).*

### matcher 예시

- `Bash`
- `^apply_patch$`
- `Edit|Write`
- `mcp__filesystem__read_file`
- `mcp__filesystem__.*`
- `startup|resume|clear|compact`
- `manual|auto`

---

## 13. 실전 예제

### 예제 1: API 키 유출 방지

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.codex/hooks/block_secrets.py",
            "statusMessage": "Scanning for secrets"
          }
        ]
      }
    ]
  }
}
```

`block_secrets.py`:
```python
import sys, json, re

data = json.load(sys.stdin)
prompt = data.get("prompt", "")

SECRET_PATTERNS = [
    r'sk-[a-zA-Z0-9]{20,}',
    r'ghp_[a-zA-Z0-9]{36}',
    r'AKIA[0-9A-Z]{16}',
]

for pattern in SECRET_PATTERNS:
    if re.search(pattern, prompt):
        json.dump({
            "decision": "block",
            "reason": "프롬프트에 API 키가 포함되어 있습니다. 제거 후 다시 시도하세요."
        }, sys.stdout)
        sys.exit(0)

json.dump({}, sys.stdout)
```

### 예제 2: Bash 명령 정책 검사

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 .codex/hooks/pre_bash_policy.py",
            "statusMessage": "Checking Bash command policy"
          }
        ]
      }
    ]
  }
}
```

`pre_bash_policy.py`:
```python
import sys, json

data = json.load(sys.stdin)
command = data.get("tool_input", {}).get("command", "")

BLOCKED_COMMANDS = ["rm -rf /", "mkfs", "dd if=/dev/zero"]

for blocked in BLOCKED_COMMANDS:
    if blocked in command:
        json.dump({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": f"위험한 명령이 차단됨: {blocked}"
            }
        }, sys.stdout)
        sys.exit(0)

sys.exit(0)
```

### 예제 3: 턴 종료 시 자동 검증

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 .codex/hooks/validate_on_stop.py",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

`validate_on_stop.py`:
```python
import sys, json, subprocess

data = json.load(sys.stdin)
last_msg = data.get("last_assistant_message", "")

# 파일이 수정된 경우에만 검증 실행
if "```" in last_msg or "edit" in last_msg.lower():
    result = subprocess.run(["npm", "run", "lint"], capture_output=True, text=True)
    if result.returncode != 0:
        json.dump({
            "decision": "block",
            "reason": f"린트 오류가 발견되었습니다. 수정하세요:\n{result.stdout[:500]}"
        }, sys.stdout)
        sys.exit(0)
```

### 예제 4: 세션 시작 시 컨텍스트 로드

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "cat .codex/context.txt",
            "statusMessage": "Loading project context"
          }
        ]
      }
    ]
  }
}
```

`.codex/context.txt`의 일반 텍스트 출력이 자동으로 개발자 컨텍스트에 추가됩니다.

### 예제 5: 관리형 권한 자동 승인

```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 /enterprise/hooks/auto_approve_readonly.py",
            "statusMessage": "Checking readonly commands"
          }
        ]
      }
    ]
  }
}
```

`auto_approve_readonly.py`:
```python
import sys, json

data = json.load(sys.stdin)
command = data.get("tool_input", {}).get("command", "")

READONLY_PREFIXES = ["ls", "cat", "head", "tail", "grep", "find", "git log", "git diff", "git status"]

for prefix in READONLY_PREFIXES:
    if command.strip().startswith(prefix):
        json.dump({
            "hookSpecificOutput": {
                "hookEventName": "PermissionRequest",
                "decision": {
                    "behavior": "allow"
                }
            }
        }, sys.stdout)
        sys.exit(0)
```

---

## 14. 스키마 참조

연결된 `main` 브랜치 스키마는 현재 릴리스에 없는 훅 필드를 포함할 수 있습니다. 이 페이지를 릴리스 동작 기준으로 사용하세요.

정확한 현재 와이어 형식이 필요한 경우, Codex GitHub 저장소의 생성된 스키마를 참조하세요.

- 전체 와이어 형식: [Schemas (GitHub)](https://github.com/openai/codex)
