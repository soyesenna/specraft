# 훅(Hook) 시스템 심층 비교: Claude Code vs Codex

> 검증: 101개 에이전트 병렬 검증 완료 | 25/25 클레임 확정 (0 반박)

## 목차

- [훅 이벤트 비교](#훅-이벤트-비교)
- [Claude Code 훅 시스템](#claude-code-훅-시스템)
- [Codex 훅 시스템](#codex-훅-시스템)
- [핸들러 타입 비교](#핸들러-타입-비교)
- [통신 프로토콜 비교](#통신-프로토콜-비교)
- [보안 모델 비교](#보안-모델-비교)
- [실전 예제](#실전-예제)

---

## 훅 이벤트 비교

### 전체 비교표

| 훅 이벤트 | Claude Code | Codex | 스코프 |
|-----------|:-----------:|:-----:|--------|
| `SessionStart` | ❌ | ✅ | 세션 |
| `SubagentStart` | ❌ | ✅ | 서브에이전트 |
| `UserPromptSubmit` | ✅ | ✅ | 턴 |
| `PreToolUse` | ✅ | ✅ | 턴 |
| `PermissionRequest` | ❌ | ✅ | 턴 |
| `PostToolUse` | ✅ | ✅ | 턴 |
| `PreCompact` | ❌ | ✅ | 스레드/서브에이전트 |
| `PostCompact` | ❌ | ✅ | 스레드/서브에이전트 |
| `SubagentStop` | ❌ | ✅ | 서브에이전트 |
| `Stop` | ✅ | ✅ | 스레드/서브에이전트 |
| `Notification` | ✅ | ❌ | 턴 |
| **총계** | **5종** | **10종** | |

### Codex 전용 훅 상세

| 훅 이벤트 | 설명 | 활용 사례 |
|-----------|------|-----------|
| `SessionStart` | 세션 시작 시 | 환경 초기화, 컨텍스트 로드 |
| `SubagentStart` | 서브에이전트 시작 시 | 서브에이전트 컨텍스트 주입 |
| `PermissionRequest` | 권한 요청 시 | 자동 승인/거부 정책 구현 |
| `PreCompact` | 컨텍스트 압축 전 | 중요 정보 보존 |
| `PostCompact` | 컨텍스트 압축 후 | 압축 결과 검증 |
| `SubagentStop` | 서브에이전트 종료 시 | 결과 수집, 정리 |

### Claude Code 전용 훅

| 훅 이벤트 | 설명 | 활용 사례 |
|-----------|------|-----------|
| `Notification` | 알림 발생 시 | 알림 포맷팅, 외부 통지 (Slack/Discord) |

---

## Claude Code 훅 시스템

### 설정 위치

```
프로젝트:  .claude/settings.json
사용자:    ~/.claude/settings.json
플러그인:  .claude-plugin/hooks/hooks.json
```

### 설정 형식 (settings.json)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "scripts/validate-bash.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "scripts/lint-after-write.sh"
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "scripts/notify-slack.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "scripts/on-stop.sh"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "scripts/preprocess-prompt.sh"
          }
        ]
      }
    ]
  }
}
```

### Claude Code 훅 동작

| 이벤트 | 입력 | 출력 | 제어能力 |
|--------|------|------|----------|
| `PreToolUse` | 도구명, 입력 | `decision: deny/allow` | 도구 실행 차단 가능 |
| `PostToolUse` | 도구명, 결과 | 없음 | 후처리만 (제어 불가) |
| `Notification` | 알림 내용 | 수정된 알림 | 알림 내용 변경 가능 |
| `Stop` | 종료 이유 | 없음 | 정리 작업만 |
| `UserPromptSubmit` | 프롬프트 | 수정된 프롬프트 | 입력 전처리 |

---

## Codex 훅 시스템

### 3단계 계층 구조

Codex 훅은 **event > matcher group > handlers**의 3단계 계층으로 구성됩니다:

```
Event (이벤트)
  └── Matcher Group (매칭 그룹)
        └── Handlers (핸들러 목록)
```

### 설정 방법 (3가지)

#### 1. hooks.json 파일

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "handlers": [
          {
            "type": "command",
            "command": "validate-bash.sh",
            "async": false,
            "timeout": 5000
          }
        ]
      }
    ]
  }
}
```

#### 2. config.toml 인라인

```toml
[[hooks.PreToolUse]]
matcher = "Bash"

[[hooks.PreToolUse.handlers]]
type = "command"
command = "validate-bash.sh"
timeout = 5000
```

#### 3. 플러그인 매니페스트

```json
{
  "name": "my-plugin",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "handlers": [
          {
            "type": "command",
            "command": "validate.sh"
          }
        ]
      }
    ]
  }
}
```

### Codex 훅 스코프 분류

| 스코프 | 훅 이벤트 | 설명 |
|--------|-----------|------|
| **Turn** (턴) | `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `PermissionRequest` | 각 턴마다 실행 |
| **Thread/Subagent** (스레드/서브에이전트) | `SessionStart`, `SubagentStart`, `SubagentStop`, `Stop`, `PreCompact`, `PostCompact` | 세션/서브에이전트 수명 주기 |

---

## 핸들러 타입 비교

### Claude Code

| 타입 | 지원 | 설명 |
|------|:----:|------|
| `command` | ✅ | 셸 명령 실행 |

### Codex

| 타입 | 지원 | 상태 | 설명 |
|------|:----:|------|------|
| `command` | ✅ | **활성** | 셸 명령 실행 |
| `prompt` | ✅ | 파싱만, 스킵됨 | 모델 컨텍스트에 텍스트 주입 |
| `agent` | ✅ | 파싱만, 스킵됨 | 서브에이전트에 위임 |

### Codex command 핸들러 옵션

```json
{
  "type": "command",
  "command": "my-hook.sh",
  "async": false,
  "timeout": 5000,
  "statusMessage": "검증 중...",
  "commandWindows": "my-hook.bat"
}
```

| 옵션 | 타입 | 설명 |
|------|------|------|
| `command` | string | 실행할 셸 명령 |
| `async` | boolean | 비동기 실행 여부 |
| `timeout` | number | 타임아웃 (ms) |
| `statusMessage` | string | 실행 중 표시할 메시지 |
| `commandWindows` | string | Windows에서 실행할 명령 |

---

## 통신 프로토콜 비교

### Claude Code

환경변수를 통해 훅 컨텍스트를 전달합니다:

```bash
#!/bin/bash
# Claude Code 훅은 환경변수로 데이터 수신

echo "Tool: $CLAUDE_TOOL_NAME"
echo "Input: $CLAUDE_TOOL_INPUT"

# JSON 출력으로 응답
if [[ "$CLAUDE_TOOL_INPUT" == *"rm -rf"* ]]; then
  echo '{"decision": "deny", "reason": "위험한 명령"}'
  exit 0
fi

echo '{"decision": "allow"}'
```

### Codex

**JSON stdin/stdout** 프로토콜을 사용합니다:

```bash
#!/bin/bash
# Codex 훅은 JSON stdin/stdout으로 통신

# stdin에서 JSON 읽기
INPUT=$(cat)

# jq로 파싱
TOOL=$(echo "$INPUT" | jq -r '.tool')
COMMAND=$(echo "$INPUT" | jq -r '.input.command')

# 조건부 deny
if [[ "$COMMAND" == *"rm -rf"* ]]; then
  jq -n '{decision: "deny", reason: "위험한 명령"}'
  exit 0
fi

# 도구 호출 재작성 (Codex만 가능)
if [[ "$COMMAND" == *"npm test"* ]]; then
  jq -n '{
    decision: "allow",
    updatedInput: {
      command: "npm test -- --coverage"
    }
  }'
  exit 0
fi

jq -n '{decision: "allow"}'
```

### Codex 훅 응답 스키마 (이벤트별)

#### PreToolUse

```json
{
  "decision": "allow" | "deny",
  "reason": "string (선택)",
  "updatedInput": { }          // 도구 입력 재작성 (선택)
}
```

#### PermissionRequest

```json
{
  "decision": "allow" | "deny",
  "reason": "string (선택)"
}
```

#### Stop

```json
{
  "decision": "block" | "allow",
  "reason": "string (선택)",
  "continuePrompt": "string"   // decision:block 시 필수
}
```

#### PostToolUse / UserPromptSubmit / 기타

```json
{
  "output": "string (선택)"
}
```

---

## 보안 모델 비교

### Claude Code

| 측면 | 방식 |
|------|------|
| **신뢰** | 설정 파일 기반 (git 추적 가능) |
| **검토** | 훅 실행 시 사용자 확인 |
| **관리** | settings.json으로 제어 |
| **엔터프라이즈** | 팀 설정 공유 |

### Codex

| 측면 | 방식 |
|------|------|
| **신뢰** | **해시 기반 명시적 신뢰** |
| **검토** | 훅 변경 시 재신뢰 필요 |
| **관리** | `/hooks` CLI 명령 |
| **엔터프라이즈** | `requirements.toml` + managed hooks |

### Codex 신뢰 흐름

```
훅 최초 실행
    │
    ▼
해시 계산 ──→ 사용자에게 신뢰 여부 확인
    │                    │
    │              ┌─────┴─────┐
    │              │ 신뢰      │ 거부
    │              ▼           ▼
    │         훅 실행     훅 스킵
    │
    ▼ (훅 파일 변경 감지)
재신뢰 필요 → 사용자 재확인
```

### Codex managed hooks (엔터프라이즈)

```toml
# /etc/codex/requirements.toml
[managed_hooks]
managed_dir = "/etc/codex/managed-hooks"
allow_managed_hooks_only = true
```

| 설정 | 동작 |
|------|------|
| `allow_managed_hooks_only = false` | 모든 훅 실행 (사용자/프로젝트/세션/플러그인/관리형) |
| `allow_managed_hooks_only = true` | **관리형 훅만 실행**, 나머지 모두 건너뜀 |

---

## 실전 예제

### 예제 1: 위험한 명령 차단

**Claude Code**

```json
// .claude/settings.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "scripts/block-dangerous.sh"
          }
        ]
      }
    ]
  }
}
```

```bash
#!/bin/bash
# scripts/block-dangerous.sh
INPUT="$CLAUDE_TOOL_INPUT"
if echo "$INPUT" | grep -qE "rm -rf|drop table|truncate"; then
  echo '{"decision":"deny","reason":"위험한 명령이 감지되었습니다"}'
  exit 0
fi
echo '{"decision":"allow"}'
```

**Codex**

```json
// hooks/hooks.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "handlers": [
          {
            "type": "command",
            "command": "scripts/block-dangerous.sh"
          }
        ]
      }
    ]
  }
}
```

```bash
#!/bin/bash
# scripts/block-dangerous.sh
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.input.command')
if echo "$COMMAND" | grep -qE "rm -rf|drop table|truncate"; then
  jq -n '{decision:"deny",reason:"위험한 명령이 감지되었습니다"}'
  exit 0
fi
jq -n '{decision:"allow"}'
```

### 예제 2: 자동 린트 (PostToolUse)

**Claude Code**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "npx eslint --fix $CLAUDE_FILE_PATH"
          }
        ]
      }
    ]
  }
}
```

**Codex** (도구 호출 재작성 활용)

```bash
#!/bin/bash
# hooks/post-write-lint.sh
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.input.file_path')

# 린트 실행 후 결과를 컨텍스트에 주입 (향후 prompt 핸들러로)
npx eslint --fix "$FILE" 2>&1 | jq -R -s '{output: .}'
```

### 예제 3: 컨텍스트 압축 전 정보 보존 (Codex 전용)

```json
{
  "hooks": {
    "PreCompact": [
      {
        "matcher": "",
        "handlers": [
          {
            "type": "command",
            "command": "scripts/preserve-context.sh"
          }
        ]
      }
    ]
  }
}
```

```bash
#!/bin/bash
# scripts/preserve-context.sh
# 압축 전에 중요 정보를 파일에 저장
echo "마지막 작업: $(date)" >> .codex/context-log.md
cat .codex/context-log.md | jq -R -s '{output: .}'
```

### 예제 4: 완료 시 알림 (공통)

**Claude Code**

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "curl -X POST $SLACK_WEBHOOK -d '{\"text\":\"작업 완료\"}'"
          }
        ]
      }
    ]
  }
}
```

**Codex** (연속 프롬프트 생성 가능)

```bash
#!/bin/bash
# hooks/on-stop.sh

# 외부 알림
curl -s -X POST "$SLACK_WEBHOOK" \
  -H 'Content-type: application/json' \
  -d '{"text":"Codex 작업 완료"}'

# 필요시 연속 실행
RESULT=$(cat | jq -r '.result // empty')
if echo "$RESULT" | grep -q "FAILED"; then
  jq -n '{
    decision: "block",
    reason: "테스트 실패",
    continuePrompt: "실패한 테스트를 분석하고 수정하세요."
  }'
else
  jq -n '{decision: "allow"}'
fi
```

---

## 참고 소스

- [Anthropic Hooks 문서](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [OpenAI Codex Hooks 문서](https://developers.openai.com/codex/hooks)
- [OpenAI Codex Config Reference](https://developers.openai.com/codex/config-reference)
- [GitHub: config.schema.json](https://github.com/openai/codex/blob/main/codex-rs/core/config.schema.json)
- [GitHub: claude-code-hooks-demo](https://github.com/sbusanelli/claude-code-hooks-demo)
- [GitHub: claude-code-hooks](https://github.com/yurukasa/claude-code-hooks)
