# 06. 훅 시스템 (Hooks)

> **원문**: [https://code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks) (Reference)
> **가이드**: [https://code.claude.com/docs/en/hooks-guide](https://code.claude.com/docs/en/hooks-guide) (Guide)
> **기존 참조**: [https://docs.anthropic.com/en/docs/claude-code/hooks](https://docs.anthropic.com/en/docs/claude-code/hooks)

---

## 1. 훅 개요

Hooks는 Claude Code의 수명 주기 중 특정 지점에서 자동으로 실행되는 사용자 정의 셸 명령, HTTP 엔드포인트 또는 LLM 프롬프트입니다. 결정론적 제어를 제공하여 LLM이 실행할지 선택하도록 맡기는 대신, 특정 동작이 항상 발생하도록 보장합니다. 프로젝트 규칙을 강제하고, 반복 작업을 자동화하며, 기존 도구와 Claude Code를 통합하는 데 사용합니다.

판단이 필요한 결정에는 prompt 기반 훅(`type: "prompt"`)이나 agent 기반 훅(`type: "agent"`)을 사용할 수도 있습니다.

---

## 2. 설정 구조

훅은 JSON 설정 파일에서 정의합니다. 설정은 세 단계의 중첩 구조를 가집니다:

1. 응답할 훅 이벤트 선택 (예: `PreToolUse`, `Stop`)
2. 실행 시기를 필터링하는 matcher 그룹 추가 (예: "Bash 도구만")
3. 매칭될 때 실행할 하나 이상의 훅 핸들러 정의

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "if": "Bash(rm *)",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/block-rm.sh",
            "args": []
          }
        ]
      }
    ]
  }
}
```

### 설정 파일 위치

| 위치 | 범위 | 공유 가능 |
|------|------|-----------|
| `~/.claude/settings.json` | 모든 프로젝트 | 아니오, 로컬 전용 |
| `.claude/settings.json` | 단일 프로젝트 | 예, 커밋 가능 |
| `.claude/settings.local.json` | 단일 프로젝트 | 아니오, gitignored |
| 관리 정책 설정 | 조직 전체 | 예, 관리자 제어 |
| Plugin `hooks/hooks.json` | 플러그인 활성 시 | 예, 플러그인에 포함 |
| Skill 또는 agent frontmatter | 컴포넌트 활성 중 | 예, 컴포넌트 파일에 정의 |

엔터프라이즈 관리자는 `allowManagedHooksOnly`를 사용하여 사용자, 프로젝트, 플러그인 훅을 차단할 수 있습니다.

---

## 3. 훅 핸들러 타입 5가지

각 훅 핸들러는 다음 다섯 가지 타입 중 하나입니다:

| 타입 | 설명 |
|------|------|
| `command` | 셸 명령 실행. stdin으로 JSON 입력 수신, exit code와 stdout으로 결과 반환 |
| `http` | HTTP POST 요청으로 이벤트 JSON 데이터 전송. 응답 본문으로 결과 반환 |
| `mcp_tool` | 이미 연결된 MCP 서버의 도구 호출. 도구의 텍스트 출력을 command stdout과 동일하게 처리 |
| `prompt` | Claude 모델에 단일 턴 평가 요청. yes/no 결정을 JSON으로 반환 |
| `agent` | 도구 접근이 가능한 서브에이전트를 생성하여 다중 턴 검증 수행. 실험적 기능 |

### 공통 필드

모든 훅 타입에 적용되는 필드:

| 필드 | 필수 | 설명 |
|------|------|------|
| `type` | 예 | `"command"`, `"http"`, `"mcp_tool"`, `"prompt"`, `"agent"` |
| `if` | 아니오 | 권한 규칙 문법으로 실행 조건 필터링. 예: `"Bash(git *)"`, `"Edit(*.ts)"`. tool 이벤트에만 평가됨: `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied`. 다른 이벤트에 설정하면 훅이 실행되지 않음 |
| `timeout` | 아니오 | 취소 전 대기 시간(초). 기본값: `command`/`http`/`mcp_tool`은 600초, `prompt`는 30초, `agent`는 60초. `UserPromptSubmit`은 command/http/mcp_tool 기본값을 30초로 낮추고, `MessageDisplay`는 10초로 낮춤 |
| `statusMessage` | 아니오 | 훅 실행 중 표시할 커스텀 스피너 메시지 |
| `once` | 아니오 | `true`면 세션당 한 번 실행 후 제거. skill frontmatter에서만 적용됨 |

### Command 훅 전용 필드

| 필드 | 필수 | 설명 |
|------|------|------|
| `command` | 예 | 실행할 셸 명령. `args`가 있으면 실행 파일 경로 |
| `args` | 아니오 | 인수 목록. 있으면 `command`를 실행 파일로 직접 실행 (셸 없음) |
| `async` | 아니오 | `true`면 백그라운드에서 차단 없이 실행 |
| `asyncRewake` | 아니오 | `true`면 백그라운드 실행 후 exit code 2에서 Claude를 깨움. `async`를 암시 |
| `shell` | 아니오 | 사용할 셸. `"bash"`(기본) 또는 `"powershell"`. `args` 설정 시 무시됨 |

#### Exec 폼과 Shell 폼

- **Exec 폼** (`args` 있음): 셸 없이 직접 실행. 각 `args` 요소가 인수 그대로 전달되어 따옴표 처리 불필요
- **Shell 폼** (`args` 없음): `sh -c`(macOS/Linux) 또는 Git Bash(Windows)로 실행. 파이프, `&&`, 리다이렉트 사용 가능

```json
// Exec 폼 - 경로에 공백/특수문자 있어도 안전
{
  "type": "command",
  "command": "node",
  "args": ["${CLAUDE_PLUGIN_ROOT}/scripts/format.js", "--fix"]
}

// Shell 폼 - 셸 기능 필요 시
{
  "type": "command",
  "command": "node \"${CLAUDE_PLUGIN_ROOT}\"/scripts/format.js --fix"
}
```

### HTTP 훅 전용 필드

| 필드 | 필수 | 설명 |
|------|------|------|
| `url` | 예 | POST 요청을 보낼 URL |
| `headers` | 아니오 | 추가 HTTP 헤더. 값에 `$VAR_NAME` 환경변수 보간 지원 |
| `allowedEnvVars` | 아니오 | 헤더 값에 보간할 환경변수 이름 목록 |

### MCP Tool 훅 전용 필드

| 필드 | 필수 | 설명 |
|------|------|------|
| `server` | 예 | 설정된 MCP 서버 이름 |
| `tool` | 예 | 호출할 도구 이름 |
| `input` | 아니오 | 도구에 전달할 인수. `${path}` 치환 지원 |

### Prompt/Agent 훅 전용 필드

| 필드 | 필수 | 설명 |
|------|------|------|
| `prompt` | 예 | 모델에 보낼 프롬프트 텍스트. `$ARGUMENTS`를 훅 입력 JSON의 플레이스홀더로 사용 |
| `model` | 아니오 | 평가에 사용할 모델. 기본값은 빠른 모델 |

---

## 4. Matcher 규칙

`matcher` 필드는 훅이 실행되는 시기를 필터링합니다.

### Matcher 평가 방식

| Matcher 값 | 평가 방식 | 예시 |
|------------|----------|------|
| `"*"`, `""`, 생략 | 모두 매치 | 이벤트의 모든 발생에 실행 |
| 문자, 숫자, `_`, `\|`만 포함 | 정확한 문자열 또는 `\|`로 구분된 목록 | `Bash`는 Bash 도구만 매치; `Edit\|Write`는 둘 중 하나 |
| 다른 문자 포함 | JavaScript 정규식 | `^Notebook`은 Notebook으로 시작하는 도구 매치 |

> `FileChanged` 이벤트는 감시 목록 구성 시 이 규칙을 따르지 않습니다.

### 이벤트별 matcher 필터링 대상

| 이벤트 | matcher 필터링 대상 | 예시 값 |
|--------|-------------------|---------|
| `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied` | 도구 이름 | `Bash`, `Edit\|Write`, `mcp__.*` |
| `SessionStart` | 세션 시작 방식 | `startup`, `resume`, `clear`, `compact` |
| `Setup` | CLI 플래그 | `init`, `maintenance` |
| `SessionEnd` | 세션 종료 사유 | `clear`, `resume`, `logout`, `prompt_input_exit`, `bypass_permissions_disabled`, `other` |
| `Notification` | 알림 타입 | `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`, `elicitation_complete`, `elicitation_response` |
| `SubagentStart` | 에이전트 타입 | `general-purpose`, `Explore`, `Plan`, 커스텀 에이전트 이름 |
| `PreCompact`, `PostCompact` | 압축 트리거 | `manual`, `auto` |
| `SubagentStop` | 에이전트 타입 | `SubagentStart`와 동일 |
| `ConfigChange` | 설정 소스 | `user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills` |
| `StopFailure` | 에러 타입 | `rate_limit`, `overloaded`, `authentication_failed`, `oauth_org_not_allowed`, `billing_error`, `invalid_request`, `model_not_found`, `server_error`, `max_output_tokens`, `unknown` |
| `InstructionsLoaded` | 로드 사유 | `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact` |
| `Elicitation` | MCP 서버 이름 | 설정된 MCP 서버 이름 |
| `ElicitationResult` | MCP 서버 이름 | `Elicitation`과 동일 |
| `FileChanged` | 감시할 파일명(리터럴) | `.envrc\|.env` |
| `UserPromptExpansion` | 명령 이름 | 스킬 또는 명령 이름 |
| `UserPromptSubmit`, `PostToolBatch`, `Stop`, `TeammateIdle`, `TaskCreated`, `TaskCompleted`, `WorktreeCreate`, `WorktreeRemove`, `CwdChanged`, `MessageDisplay` | matcher 미지원 | 항상 실행 |

### `if` 필드로 상세 필터링

`if` 필드는 권한 규칙 문법을 사용하여 도구 이름과 인수를 함께 필터링합니다. matcher보다 세밀한 제어가 가능합니다.

```json
{
  "matcher": "Bash",
  "hooks": [
    {
      "type": "command",
      "if": "Bash(git *)",
      "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/check-git-policy.sh"
    }
  ]
}
```

- `if`는 tool 이벤트에만 작동: `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied`
- Bash 명령은 각 하위 명령어 단위로 평가 (예: `npm test && git push`에서 `git push` 매칭)
- 명령어가 너무 복잡하여 파싱할 수 없으면 항상 실행

### MCP 도구 matcher

MCP 도구는 `mcp__<server>__<tool>` 네이밍 패턴을 사용합니다:

- `mcp__memory__.*` - memory 서버의 모든 도구 매치
- `mcp__.*__write.*` - 모든 서버에서 `write`로 시작하는 도구 매치

> `.*`이 필요합니다. `mcp__memory`는 문자/밑줄만 포함하므로 정확한 문자열 비교가 되어 아무 도구도 매치하지 않습니다.

---

## 5. 훅 이벤트 30종 전체 표

| # | 이벤트 | 설명 | matcher | 차단 가능 |
|---|--------|------|---------|-----------|
| 1 | **SessionStart** | 세션 시작 또는 재개 시 | `startup`, `resume`, `clear`, `compact` | 아니오 |
| 2 | **Setup** | `--init-only` 또는 `-p` 모드에서 `--init`/`--maintenance`로 시작 시 | `init`, `maintenance` | 아니오 |
| 3 | **InstructionsLoaded** | CLAUDE.md 또는 `.claude/rules/*.md` 파일이 컨텍스트에 로드될 때 | `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact` | 아니오 |
| 4 | **UserPromptSubmit** | 프롬프트 제출 시, Claude 처리 전 | 없음 | 예 |
| 5 | **UserPromptExpansion** | 사용자 입력 명령이 프롬프트로 확장되기 전 | 명령 이름 | 예 |
| 6 | **MessageDisplay** | 어시스턴트 메시지가 화면에 표시되는 동안 | 없음 | 아니오 |
| 7 | **PreToolUse** | 도구 호출 실행 전 | 도구 이름 | 예 |
| 8 | **PermissionRequest** | 권한 다이얼로그가 나타날 때 | 도구 이름 | 예 |
| 9 | **PermissionDenied** | 자동 모드 분류기가 도구 호출을 거부할 때 | 도구 이름 | 아니오 |
| 10 | **PostToolUse** | 도구 호출 성공 후 | 도구 이름 | 아니오 |
| 11 | **PostToolUseFailure** | 도구 호출 실패 후 | 도구 이름 | 아니오 |
| 12 | **PostToolBatch** | 병렬 도구 호출 배치가 완료된 후, 다음 모델 호출 전 | 없음 | 예 |
| 13 | **Notification** | 알림 발생 시 | 알림 타입 | 아니오 |
| 14 | **SubagentStart** | 서브에이전트 생성 시 | 에이전트 타입 | 아니오 |
| 15 | **SubagentStop** | 서브에이전트 완료 시 | 에이전트 타입 | 예 |
| 16 | **TaskCreated** | TaskCreate로 작업이 생성될 때 | 없음 | 예 |
| 17 | **TaskCompleted** | 작업이 완료로 표시될 때 | 없음 | 예 |
| 18 | **Stop** | 메인 에이전트 응답 완료 시 | 없음 | 예 |
| 19 | **StopFailure** | API 에러로 턴이 종료될 때 | 에러 타입 | 아니오 |
| 20 | **TeammateIdle** | 팀 에이전트가 유휴 상태가 되기 직전 | 없음 | 예 |
| 21 | **ConfigChange** | 설정 파일이 세션 중 변경될 때 | 설정 소스 | 예 |
| 22 | **CwdChanged** | 작업 디렉토리가 변경될 때 | 없음 | 아니오 |
| 23 | **FileChanged** | 감시 중인 파일이 디스크에서 변경될 때 | 파일명 | 아니오 |
| 24 | **WorktreeCreate** | worktree가 생성될 때 | 없음 | 예 |
| 25 | **WorktreeRemove** | worktree가 제거될 때 | 없음 | 아니오 |
| 26 | **PreCompact** | 컨텍스트 압축 전 | `manual`, `auto` | 예 |
| 27 | **PostCompact** | 컨텍스트 압축 완료 후 | `manual`, `auto` | 아니오 |
| 28 | **Elicitation** | MCP 서버가 사용자 입력을 요청할 때 | MCP 서버 이름 | 예 |
| 29 | **ElicitationResult** | MCP elicitation에 사용자가 응답한 후 | MCP 서버 이름 | 예 |
| 30 | **SessionEnd** | 세션 종료 시 | 종료 사유 | 아니오 |

---

## 6. 훅 입력 (JSON stdin / POST body)

### 공통 입력 필드

모든 이벤트가 수신하는 공통 필드:

| 필드 | 설명 |
|------|------|
| `session_id` | 현재 세션 식별자 |
| `transcript_path` | 대화 JSON 파일 경로 |
| `cwd` | 훅 호출 시 현재 작업 디렉토리 |
| `permission_mode` | 현재 권한 모드: `"default"`, `"plan"`, `"acceptEdits"`, `"auto"`, `"dontAsk"`, `"bypassPermissions"` |
| `effort` | `{ "level": "low"\|"medium"\|"high"\|"xhigh"\|"max" }` 객체. `$CLAUDE_EFFORT` 환경변수로도 사용 가능 |
| `hook_event_name` | 발생한 이벤트 이름 |

서브에이전트 내부(`--agent` 또는 subagent 호출)에서 추가 필드:

| 필드 | 설명 |
|------|------|
| `agent_id` | 서브에이전트 고유 식별자 |
| `agent_type` | 에이전트 이름 (예: `"Explore"`, `"security-reviewer"`) |

### 주요 이벤트 입력 예시

#### PreToolUse 입력

```json
{
  "session_id": "abc123",
  "transcript_path": "/home/user/.claude/projects/.../transcript.jsonl",
  "cwd": "/home/user/my-project",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm test"
  }
}
```

#### PostToolUse 입력

```json
{
  "session_id": "abc123",
  "transcript_path": "/home/user/.claude/projects/.../transcript.jsonl",
  "cwd": "/home/user/my-project",
  "permission_mode": "default",
  "hook_event_name": "PostToolUse",
  "tool_name": "Write",
  "tool_input": { "file_path": "/path/to/file.txt", "content": "file content" },
  "tool_response": { "filePath": "/path/to/file.txt", "success": true },
  "tool_use_id": "toolu_01ABC123...",
  "duration_ms": 12
}
```

#### SessionStart 입력

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../transcript.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "SessionStart",
  "source": "startup",
  "model": "claude-sonnet-4-6"
}
```

#### UserPromptSubmit 입력

```json
{
  "session_id": "abc123",
  "transcript_path": "/home/user/.claude/projects/.../transcript.jsonl",
  "cwd": "/home/user/...",
  "permission_mode": "default",
  "hook_event_name": "UserPromptSubmit",
  "prompt": "Write a function to calculate the factorial of a number"
}
```

#### Stop 입력

```json
{
  "session_id": "abc123",
  "transcript_path": "~/.claude/projects/.../abc123.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "Stop",
  "stop_hook_active": true,
  "last_assistant_message": "I've completed the refactoring. Here's a summary...",
  "background_tasks": [
    { "id": "task-001", "type": "shell", "status": "running", "description": "tail logs", "command": "tail -f /var/log/syslog" }
  ],
  "session_crons": [
    { "id": "cron-001", "schedule": "0 9 * * 1-5", "recurring": true, "prompt": "check the build" }
  ]
}
```

---

## 7. 훅 출력 방식

### 종료 코드 출력

| 종료 코드 | 의미 | 동작 |
|-----------|------|------|
| **0** | 성공 | stdout에서 JSON 출력 필드를 파싱. `UserPromptSubmit`, `UserPromptExpansion`, `SessionStart`에서는 stdout이 Claude의 컨텍스트에 추가됨 |
| **2** | 차단 에러 | stdout을 무시하고 stderr를 Claude에게 에러 메시지로 전달. 이벤트에 따라 효과가 다름 |
| **기타** | 비차단 에러 | transcript에 `<hook name> hook error` 알림 표시 후 실행 계속 |

### 이벤트별 종료 코드 2 동작

| 이벤트 | 차단 가능? | 종료 코드 2 시 동작 |
|--------|-----------|-------------------|
| `PreToolUse` | 예 | 도구 호출 차단 |
| `PermissionRequest` | 예 | 권한 거부 |
| `UserPromptSubmit` | 예 | 프롬프트 처리 차단 및 프롬프트 삭제 |
| `UserPromptExpansion` | 예 | 확장 차단 |
| `Stop` | 예 | Claude 종료 방지, 대화 계속 |
| `SubagentStop` | 예 | 서브에이전트 종료 방지 |
| `TeammateIdle` | 예 | 팀원이 계속 작업 |
| `TaskCreated` | 예 | 작업 생성 롤백 |
| `TaskCompleted` | 예 | 완료 표시 방지 |
| `ConfigChange` | 예 | 설정 변경 차단 (`policy_settings` 제외) |
| `PostToolBatch` | 예 | 다음 모델 호출 전 에이전트 루프 중지 |
| `PreCompact` | 예 | 압축 차단 |
| `Elicitation` | 예 | elicitation 거부 |
| `ElicitationResult` | 예 | 응답 차단 (action이 decline이 됨) |
| `WorktreeCreate` | 예 | 0이 아닌 종료 코드 시 worktree 생성 실패 |
| `PostToolUse` | 아니오 | stderr를 Claude에 표시 (도구 이미 실행됨) |
| `PostToolUseFailure` | 아니오 | stderr를 Claude에 표시 |
| `PermissionDenied` | 아니오 | 종료 코드와 stderr 무시. `retry: true`는 JSON으로만 반환 가능 |
| `Notification` | 아니오 | stderr를 사용자에게만 표시 |
| `SessionStart` | 아니오 | stderr를 사용자에게만 표시 |
| `Setup` | 아니오 | stderr를 사용자에게만 표시 |
| `SessionEnd` | 아니오 | stderr를 사용자에게만 표시 |
| `SubagentStart` | 아니오 | stderr를 사용자에게만 표시 |
| `CwdChanged` | 아니오 | stderr를 사용자에게만 표시 |
| `FileChanged` | 아니오 | stderr를 사용자에게만 표시 |
| `PostCompact` | 아니오 | stderr를 사용자에게만 표시 |
| `StopFailure` | 아니오 | 출력과 종료 코드 무시 |
| `InstructionsLoaded` | 아니오 | 종료 코드 무시 |
| `MessageDisplay` | 아니오 | 원본 텍스트가 표시됨 |
| `WorktreeRemove` | 아니오 | 실패는 디버그 모드에서만 로그 |

### JSON 출력

종료 코드 0과 함께 stdout에 JSON 객체를 출력하면 더 정밀한 제어가 가능합니다.

#### 범용 JSON 필드

| 필드 | 기본값 | 설명 |
|------|--------|------|
| `continue` | `true` | `false`면 훅 실행 후 Claude가 처리를 완전히 중지 |
| `stopReason` | 없음 | `continue`가 `false`일 때 사용자에게 표시할 메시지. Claude에게는 표시되지 않음 |
| `suppressOutput` | `false` | `true`면 transcript에서 훅의 stdout 숨김 |
| `systemMessage` | 없음 | 사용자에게 표시할 경고 메시지 |
| `terminalSequence` | 없음 | Claude Code가 대신 실행할 터미널 이스케이프 시퀀스. 데스크톱 알림, 창 제목, 벨 등. OSC 0/1/2/9/99/777과 BEL만 허용 |

#### 컨텍스트 추가

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "이 파일은 자동 생성됨. src/schema.ts를 수정하고 bun generate를 실행하세요."
  }
}
```

#### 결정 제어 요약

| 이벤트 | 결정 패턴 | 주요 필드 |
|--------|----------|-----------|
| `UserPromptSubmit`, `UserPromptExpansion`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`, `Stop`, `SubagentStop`, `ConfigChange`, `PreCompact` | 최상위 `decision` | `decision: "block"`, `reason` |
| `TeammateIdle`, `TaskCreated`, `TaskCompleted` | 종료 코드 또는 `continue: false` | 종료 코드 2로 stderr 피드백. `{"continue": false, "stopReason": "..."}`로 완전 중지 |
| `PreToolUse` | `hookSpecificOutput` | `permissionDecision` (allow/deny/ask/defer), `permissionDecisionReason`, `updatedInput` |
| `PermissionRequest` | `hookSpecificOutput` | `decision.behavior` (allow/deny), `updatedPermissions` |
| `PermissionDenied` | `hookSpecificOutput` | `retry: true`로 재시도 허용 |
| `WorktreeCreate` | 경로 반환 | Command 훅은 stdout에 경로 출력; HTTP 훅은 `hookSpecificOutput.worktreePath` 반환 |
| `Elicitation` | `hookSpecificOutput` | `action` (accept/decline/cancel), `content` |
| `ElicitationResult` | `hookSpecificOutput` | `action`, `content`로 사용자 응답 오버라이드 |
| `MessageDisplay` | `hookSpecificOutput` | `displayContent`로 화면에 표시되는 텍스트 교체. 트랜스크립트와 Claude가 보는 내용은 원본 유지 |
| `SessionStart`, `Setup`, `SubagentStart` | 컨텍스트만 | `additionalContext`. SessionStart는 `initialUserMessage`, `watchPaths`, `sessionTitle`, `reloadSkills`도 지원 |

---

## 8. 주요 이벤트 상세

### SessionStart

세션 시작 또는 재개 시 실행. `type: "command"`와 `type: "mcp_tool"`만 지원.

**결정 제어**: stdout의 모든 텍스트가 Claude의 컨텍스트에 추가됩니다.

| 필드 | 설명 |
|------|------|
| `additionalContext` | 대화 시작 부분에 추가할 문자열 |
| `initialUserMessage` | 비대화형 모드(`-p`)에서 세션의 첫 번째 사용자 메시지로 사용 |
| `sessionTitle` | 세션 제목 설정 (`/rename`과 동일). `startup`/`resume`에서만 적용 |
| `watchPaths` | FileChanged 이벤트를 감시할 절대 경로 배열 |
| `reloadSkills` | `true`면 SessionStart 완료 후 skill/command 디렉토리 재스캔 |

`CLAUDE_ENV_FILE` 환경변수를 통해 환경변수를 영속화할 수 있습니다:

```bash
#!/bin/bash
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo 'export NODE_ENV=production' >> "$CLAUDE_ENV_FILE"
  echo 'export PATH="$PATH:./node_modules/.bin"' >> "$CLAUDE_ENV_FILE"
fi
```

### Setup

`--init-only` 또는 `-p` 모드에서 `--init`/`--maintenance`로 시작할 때만 실행. CI/스크립트에서의 일회성 준비용.

`CLAUDE_ENV_FILE`에 접근 가능. `type: "command"`와 `type: "mcp_tool"`만 지원.

### PreToolUse

도구 매개변수 생성 후, 실행 전에 실행. 도구 호출을 허용, 거부, 확인 요청 또는 연기할 수 있습니다.

**`permissionDecision` 값**:
- `"allow"`: 권한 프롬프트 건너뜀 (deny/ask 규칙은 여전히 평가됨)
- `"deny"`: 도구 호출 차단, 이유를 Claude에 전달
- `"ask"`: 사용자에게 확인 요청
- `"defer"`: 비대화형 모드에서 프로세스를 종료하고 나중에 재개할 수 있도록 보존

여러 PreToolUse 훅이 서로 다른 결정을 반환하면 우선순위: `deny` > `defer` > `ask` > `allow`

**updatedInput**으로 도구의 입력 매개변수를 실행 전에 수정 가능.

### PermissionRequest

권한 다이얼로그가 표시되기 직전에 실행. 사용자를 대신하여 허용/거부 결정 가능.

`updatedPermissions` 배열로 권한 규칙 추가, 모드 변경 등 가능:

| `type` | 필드 | 효과 |
|--------|------|------|
| `addRules` | `rules`, `behavior`, `destination` | 권한 규칙 추가 |
| `replaceRules` | `rules`, `behavior`, `destination` | 해당 동작의 모든 규칙 교체 |
| `removeRules` | `rules`, `behavior`, `destination` | 일치하는 규칙 제거 |
| `setMode` | `mode`, `destination` | 권한 모드 변경 |
| `addDirectories` | `directories`, `destination` | 작업 디렉토리 추가 |
| `removeDirectories` | `directories`, `destination` | 작업 디렉토리 제거 |

### Notification

알림 발생 시 실행. 차단 불가. 외부 서비스로 알림을 전달하는 등 부수 효과용.

matcher 값:

| Matcher | 실행 시점 |
|---------|----------|
| `permission_prompt` | 도구 사용 승인 필요 시 |
| `idle_prompt` | Claude가 완료되고 다음 프롬프트 대기 중 |
| `auth_success` | 인증 완료 시 |
| `elicitation_dialog` | MCP 서버가 elicitation 폼을 열 때 |
| `elicitation_complete` | MCP elicitation 폼 제출 또는 해제 시 |
| `elicitation_response` | MCP elicitation 응답이 서버로 전송될 때 |

### Stop / SubagentStop

Claude가 응답을 마친 후 실행. `decision: "block"`과 `reason`으로 Claude가 계속 작업하도록 할 수 있습니다.

Claude Code는 8회 연속 차단 후 훅을 오버라이드합니다. `stop_hook_active` 필드를 확인하여 무한 루프를 방지하세요.

`background_tasks`와 `session_crons` 배열(Claude Code v2.1.145+)로 세션이 완전히 종료된 것인지, 백그라운드 작업 대기 중인지 구분할 수 있습니다.

### PreCompact / PostCompact

- **PreCompact**: 압축 전 실행. `decision: "block"`으로 압축 차단 가능
- **PostCompact**: 압축 완료 후 실행. 차단 불가. `compact_summary` 필드로 요약 접근 가능

### CwdChanged / FileChanged

- **CwdChanged**: 디렉토리 변경 시. `CLAUDE_ENV_FILE` 접근 가능. `watchPaths`로 동적 감시 목록 설정 가능
- **FileChanged**: 감시 중인 파일 변경 시. matcher 값이 리터럴 파일명으로 분할되어 감시 목록 구성에도 사용됨

### Elicitation / ElicitationResult

- **Elicitation**: MCP 서버가 사용자 입력을 요청할 때. `action` (accept/decline/cancel)과 `content`로 프로그래밍 방식 응답 가능
- **ElicitationResult**: 사용자가 MCP elicitation에 응답한 후. `action`과 `content`로 사용자 응답 오버라이드 가능

### SessionEnd

세션 종료 시 실행. 차단 불가. 정리 작업만 수행.

기본 타임아웃 1.5초. 개별 훅 `timeout` 설정으로 상향 가능 (최대 60초). `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` 환경변수로 명시적 오버라이드 가능.

---

## 9. Prompt 기반 훅

`type: "prompt"` 훅은 Claude 모델(Haiku 기본)에 단일 턴 평가를 요청하여 yes/no 결정을 JSON으로 반환합니다.

### 응답 스키마

```json
{ "ok": true | false, "reason": "설명" }
```

`ok: false` 시 이벤트별 동작:

| 이벤트 | `ok: false` 동작 |
|--------|-----------------|
| `Stop`, `SubagentStop` | 이유가 Claude에게 다음 명령으로 전달되고 턴 계속 |
| `PreToolUse` | 도구 호출이 거부되고 이유가 도구 에러로 반환 |
| `PostToolUse` | 기본적으로 턴 종료. `continueOnBlock: true` 시 이유가 Claude에게 전달되고 턴 계속 |
| `PostToolBatch`, `UserPromptSubmit`, `UserPromptExpansion` | 턴 종료, 경고 라인으로 이유 표시 |
| `TeammateIdle` | 기본적으로 팀원 정지. `continueOnBlock: true` 시 팀원 계속 작업 |

### 설정 예시

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "모든 작업이 완료되었는지 평가하세요: $ARGUMENTS. 완료되지 않았으면 {\"ok\": false, \"reason\": \"남은 작업 설명\"}으로 응답하세요.",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `type` | 예 | `"prompt"` |
| `prompt` | 예 | LLM에 보낼 프롬프트. `$ARGUMENTS`를 훅 입력 JSON의 플레이스홀더로 사용 |
| `model` | 아니오 | 평가에 사용할 모델. 기본값은 빠른 모델 |
| `timeout` | 아니오 | 타임아웃(초). 기본 30초 |
| `continueOnBlock` | 아니오 | `ok: false` 시 종료 대신 Claude에게 이유를 전달하고 턴 계속. 기본 `false` |

---

## 10. Agent 기반 훅

`type: "agent"` 훅은 prompt 훅과 유사하지만 다중 턴 도구 접근이 가능합니다. 파일 읽기, 코드 검색, 코드베이스 검사가 가능한 서브에이전트를 생성합니다.

최대 50턴까지 도구 사용 후 `{ "ok": true/false }` 결정을 반환합니다.

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "agent",
            "prompt": "모든 단위 테스트가 통과하는지 검증하세요. 테스트 스위트를 실행하고 결과를 확인하세요. $ARGUMENTS",
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

---

## 11. 비동기 훅

`"async": true`를 command 훅에 추가하면 Claude의 실행을 차단하지 않고 백그라운드에서 실행합니다.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/run-tests.sh",
            "async": true,
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

**`asyncRewake`**: `true`면 백그라운드에서 실행하고 exit code 2에서 세션이 유휴 상태여도 Claude를 즉시 깨웁니다. `async`를 암시합니다.

### 비동기 훅 제한사항

- `type: "command"`만 `async` 지원. Prompt 훅은 비동기 불가
- 도구 호출을 차단하거나 결정을 반환할 수 없음
- 출력은 다음 대화 턴에 전달됨
- 동일한 비동기 훅의 여러 실행 간에 중복 제거 없음

---

## 12. HTTP 훅 상세

HTTP 훅은 이벤트 JSON을 POST 요청 본문으로 전송합니다:

| 응답 | 처리 |
|------|------|
| 2xx + 빈 본문 | 성공 (exit code 0과 동일) |
| 2xx + 텍스트 본문 | 성공, 텍스트가 컨텍스트에 추가 |
| 2xx + JSON 본문 | 성공, command 훅과 동일한 JSON 출력 스키마로 파싱 |
| Non-2xx | 비차단 에러, 실행 계속 |
| 연결 실패/타임아웃 | 비차단 에러, 실행 계속 |

> HTTP 상태 코드만으로는 차단할 수 없습니다. 차단하려면 2xx 응답과 함께 JSON 본문에 `decision: "block"` 또는 `permissionDecision: "deny"`를 포함해야 합니다.

---

## 13. 이벤트별 훅 타입 지원

### 모든 5가지 타입 지원 (command, http, mcp_tool, prompt, agent)

`PermissionDenied`, `PermissionRequest`, `PostToolBatch`, `PostToolUse`, `PostToolUseFailure`, `PreToolUse`, `Stop`, `SubagentStop`, `TaskCompleted`, `TaskCreated`, `TeammateIdle`, `UserPromptExpansion`, `UserPromptSubmit`

### command, http, mcp_tool만 지원 (prompt/agent 불가)

`ConfigChange`, `CwdChanged`, `Elicitation`, `ElicitationResult`, `FileChanged`, `InstructionsLoaded`, `Notification`, `PostCompact`, `PreCompact`, `SessionEnd`, `StopFailure`, `SubagentStart`, `WorktreeCreate`, `WorktreeRemove`

### command와 mcp_tool만 지원 (http/prompt/agent 불가)

`SessionStart`, `Setup`

---

## 14. 스크립트 경로 참조

| 플레이스홀더 | 설명 |
|-------------|------|
| `${CLAUDE_PROJECT_DIR}` | 프로젝트 루트 절대 경로 |
| `${CLAUDE_PLUGIN_ROOT}` | 플러그인 설치 디렉토리 |
| `${CLAUDE_PLUGIN_DATA}` | 플러그인 영속 데이터 디렉토리 |

Exec 폼 사용 시 각 `args` 요소가 인수 그대로 전달되어 따옴표 처리가 불필요합니다. Shell 폼에서는 플레이스홀더를 큰따옴표로 감싸세요.

---

## 15. 훅 비활성화

- 개별 훅 제거: 설정 JSON 파일에서 항목 삭제
- 전체 비활성화: `"disableAllHooks": true` 설정
- 관리 정책 설정의 훅은 관리 수준에서 `disableAllHooks`를 설정해야만 비활성화 가능
- 설정 파일 직접 수정은 파일 워처가 자동 감지합니다

---

## 16. 훅과 권한 모드

PreToolUse 훅은 권한 모드 확인 전에 실행됩니다. `permissionDecision: "deny"`를 반환하면 `bypassPermissions` 모드 또는 `--dangerously-skip-permissions`에서도 도구가 차단됩니다.

반대로 `permissionDecision: "allow"`는 설정의 deny 규칙을 우회하지 않습니다. 훅은 제한을 강화할 수 있지만, 권한 규칙이 허용하는 것 이상으로 완화할 수는 없습니다.

---

## 17. 실전 예제

### 예제 1: Claude가 입력 대기 시 데스크톱 알림 (macOS)

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Claude Code needs your attention\" with title \"Claude Code\"'"
          }
        ]
      }
    ]
  }
}
```

### 예제 2: 파일 편집 후 자동 포맷팅

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write"
          }
        ]
      }
    ]
  }
}
```

### 예제 3: 압축 후 컨텍스트 재주입

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Reminder: use Bun, not npm. Run bun test before committing. Current sprint: auth refactor.'"
          }
        ]
      }
    ]
  }
}
```

### 예제 4: 설정 변경 감사

```json
{
  "hooks": {
    "ConfigChange": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "jq -c '{timestamp: now | todate, source: .source, file: .file_path}' >> ~/claude-config-audit.log"
          }
        ]
      }
    ]
  }
}
```

### 예제 5: 디렉토리 변경 시 환경변수 리로드 (direnv)

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "direnv export bash > \"$CLAUDE_ENV_FILE\"" }
        ]
      }
    ],
    "CwdChanged": [
      {
        "hooks": [
          { "type": "command", "command": "direnv export bash > \"$CLAUDE_ENV_FILE\"" }
        ]
      }
    ]
  }
}
```

### 예제 6: 특정 권한 프롬프트 자동 승인

```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "matcher": "ExitPlanMode",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\": {\"hookEventName\": \"PermissionRequest\", \"decision\": {\"behavior\": \"allow\"}}}'"
          }
        ]
      }
    ]
  }
}
```

### 예제 7: Bash 명령어 검증 (종료 코드 방식)

```bash
#!/bin/bash
# .claude/hooks/block-rm.sh
COMMAND=$(jq -r '.tool_input.command')

if echo "$COMMAND" | grep -q 'rm -rf'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Destructive command blocked by hook"
    }
  }'
else
  exit 0
fi
```

### 예제 8: 비동기 테스트 실행

```bash
#!/bin/bash
# .claude/hooks/run-tests-async.sh
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.js ]]; then
  exit 0
fi

RESULT=$(npm test 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  MSG="Tests passed after editing $FILE_PATH"
else
  MSG="Tests failed after editing $FILE_PATH: $RESULT"
fi
jq -nc --arg msg "$MSG" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $msg}}'
```

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/run-tests-async.sh",
            "args": [],
            "async": true,
            "timeout": 300
          }
        ]
      }
    ]
  }
}
```

### 예제 9: MessageDisplay로 마크다운 제거

```bash
#!/bin/bash
# .claude/hooks/plain-display.sh
jq '{hookSpecificOutput: {hookEventName: "MessageDisplay", displayContent: (.delta | gsub("\\*\\*"; "") | gsub("`"; ""))}}'
```

### 예제 10: HTTP 훅으로 외부 서비스에 로깅

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "http",
            "url": "http://localhost:8080/hooks/tool-use",
            "headers": { "Authorization": "Bearer $MY_TOKEN" },
            "allowedEnvVars": ["MY_TOKEN"]
          }
        ]
      }
    ]
  }
}
```

### 예제 11: MCP Tool 훅으로 보안 스캔

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "mcp_tool",
            "server": "my_server",
            "tool": "security_scan",
            "input": { "file_path": "${tool_input.file_path}" }
          }
        ]
      }
    ]
  }
}
```

---

## 18. 디버깅

### 기본 문제 해결

- `/hooks` 실행하여 훅 등록 확인
- matcher 패턴이 도구 이름과 정확히 일치하는지 확인 (대소문자 구분)
- 올바른 이벤트 타입인지 확인 (`PreToolUse`는 실행 전, `PostToolUse`는 실행 후)
- 비대화형 모드(`-p`)에서는 `PermissionRequest` 대신 `PreToolUse` 사용
- 스크립트 실행 권한 확인 (`chmod +x`)
- `jq` 설치 확인

### 상세 디버깅

```bash
claude --debug-file /tmp/claude.log
# 또는
claude --debug  # 로그 경로: ~/.claude/debug/<session-id>.txt
```

`CLAUDE_CODE_DEBUG_LOG_LEVEL=verbose`로 더 상세한 로깅 가능.

### Stop 훅 차단 한도

Claude Code은 8회 연속 차단 후 훅을 오버라이드합니다. `stop_hook_active` 필드를 확인하세요:

```bash
#!/bin/bash
INPUT=$(cat)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0
fi
# ... 나머지 훅 로직
```

`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`로 한도 상향 가능.

### JSON 유효성 검사 실패

셸 프로필에 무조건 `echo`가 있으면 훅의 JSON 앞에 출력이 붙을 수 있습니다:

```bash
# ~/.zshrc 또는 ~/.bashrc에서 수정
if [[ $- == *i* ]]; then
  echo "Shell ready"
fi
```

---

## 19. 보안 고려사항

Command 훅은 시스템 사용자의 전체 권한으로 실행됩니다.

### 보안 모범 사례

1. **입력 검증 및 정제**: 입력 데이터를 무조건 신뢰하지 마세요
2. **셸 변수 인용**: `$VAR` 대신 `"$VAR"` 사용
3. **경로 순회 차단**: 파일 경로에 `..`가 있는지 확인
4. **절대 경로 사용**: 스크립트에 전체 경로 지정. Exec 폼에서 `${CLAUDE_PROJECT_DIR}` 사용 시 따옴표 불필요
5. **민감 파일 건너뛰기**: `.env`, `.git/`, 키 파일 등 피하기

Windows에서는 `"shell": "powershell"` 설정으로 개별 훅을 PowerShell에서 실행할 수 있습니다.

---

## 20. Skill과 Agent에서 훅 사용

설정 파일과 플러그인 외에도 skill과 subagent의 frontmatter에서 훅을 직접 정의할 수 있습니다. 이 훅들은 컴포넌트의 수명 주기 동안만 활성화됩니다.

```yaml
---
name: secure-operations
description: Perform operations with security checks
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/security-check.sh"
---
```

서브에이전트에서 `Stop` 훅은 자동으로 `SubagentStop`으로 변환됩니다.

`/hooks` 명령으로 모든 설정된 훅을 읽기 전용으로 탐색할 수 있습니다. 각 훅에는 타입(`[command]`, `[prompt]`, `[agent]`, `[http]`, `[mcp_tool]`)과 소스(User, Project, Local, Plugin, Session, Built-in)가 표시됩니다.
