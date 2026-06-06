# 11. Claude Code SDK (Agent SDK)

> **참조**: [Run Claude Code programmatically - Claude Code Docs](https://code.claude.com/docs/en/headless)
> · [Agent SDK overview - Claude API Docs](https://code.claude.com/docs/en/sdk)
> · [Legacy SDK - Anthropic](https://docs.anthropic.com/en/docs/claude-code/sdk)

---

## 목차

- [SDK 개요](#sdk-개요)
- [인증](#인증)
- [Headless CLI 기본 사용법](#headless-cli-기본-사용법)
- [Bare 모드로 빠르게 시작하기](#bare-모드로-빠르게-시작하기)
- [Headless CLI 예제](#headless-cli-예제)
- [스트리밍 이벤트](#스트리밍-이벤트)
- [Agent SDK (Python/TypeScript)](#agent-sdk-pythontypescript)
- [Legacy SDK (TypeScript/Python)](#legacy-sdk-typescriptpython)
- [고급 사용법](#고급-사용법)
- [CLI 옵션 전체 표](#cli-옵션-전체-표)
- [출력 형식 상세](#출력-형식-상세)
- [입력 형식](#입력-형식)
- [모범 사례](#모범-사례)

---

## SDK 개요

**Agent SDK**는 Claude Code와 동일한 도구, 에이전트 루프, 컨텍스트 관리 기능을 제공합니다. CLI를 통한 스크립트/CI/CD 용도와 Python/TypeScript 패키지를 통한 완전한 프로그래밍 제어를 모두 지원합니다.

> **참고**: 기존 Claude Code SDK(이하 "Legacy SDK")는 `@anthropic-ai/claude-code` NPM 패키지와 `claude-code-sdk` PyPI 패키지로, Claude Code를 서브프로세스로 실행하는 방식입니다. Agent SDK가 새로운 프라이머리 SDK이며, Legacy SDK는 하위 호환을 위해 유지됩니다.

### 지원 환경

| 환경 | 패키지 | 설명 |
|------|--------|------|
| **CLI** | 내장 | `claude -p` 명령으로 비대화형 실행 |
| **Python (Agent SDK)** | `claude-agent-sdk` | 프로그래밍 제어용 Python 패키지 |
| **TypeScript (Agent SDK)** | `claude-agent-sdk` | 프로그래밍 제어용 TypeScript 패키지 |
| **TypeScript (Legacy)** | `@anthropic-ai/claude-code` | 서브프로세스 기반 NPM 패키지 |
| **Python (Legacy)** | `claude-code-sdk` | 서브프로세스 기반 PyPI 패키지 |

---

## 인증

Claude Code SDK는 여러 인증 방법을 지원합니다.

### Anthropic API 키

전용 API 키 생성을 권장합니다.

**1단계**: [Anthropic Console](https://console.anthropic.com/)에서 API 키 생성

**2단계**: 환경 변수 설정

```bash
export ANTHROPIC_API_KEY="your-api-key"
```

> **보안 팁**: API 키는 GitHub Secret 등을 사용하여 안전하게 보관하세요.

### Amazon Bedrock

```bash
export CLAUDE_CODE_USE_BEDROCK=1
# AWS 자격 증명 구성 필요
```

### Google Vertex AI

```bash
export CLAUDE_CODE_USE_VERTEX=1
# Google Cloud 자격 증명 구성 필요
```

### Microsoft Azure (Foundry)

```bash
export CLAUDE_CODE_USE_FOUNDRY=1
# Azure 자격 증명 구성 필요
```

---

## Headless CLI 기본 사용법

`-p`(또는 `--print`) 플래그를 추가하면 `claude` 명령을 비대화형으로 실행할 수 있습니다. 모든 CLI 옵션은 `-p`와 함께 동작합니다.

```bash
claude -p "Find and fix the bug in auth.py" --allowedTools "Read,Edit,Bash"
```

이 페이지에서는 CLI를 통한 Agent SDK 사용법(`claude -p`)을 다룹니다. 구조화된 출력, 도구 승인 콜백, 네이티브 메시지 객체를 제공하는 Python/TypeScript SDK 패키지는 [Agent SDK (Python/TypeScript)](#agent-sdk-pythontypescript) 섹션을 참조하세요.

### 기본 실행

```bash
claude -p "What does the auth module do?"
```

### 세션 관리

```bash
# 가장 최근 대화 계속
claude -p "Now focus on the database queries" --continue

# 세션 ID로 특정 대화 재개
session_id=$(claude -p "Start a review" --output-format json | jq -r '.session_id')
claude -p "Continue that review" --resume "$session_id"
```

---

## Bare 모드로 빠르게 시작하기

`--bare`를 추가하면 hooks, skills, plugins, MCP 서버, auto memory, CLAUDE.md의 자동 탐색을 건너뛰어 시작 시간을 단축합니다. `--bare`가 없으면 `claude -p`는 대화형 세션과 동일한 컨텍스트를 로드합니다.

Bare 모드는 CI와 스크립트에서 **모든 머신에서 동일한 결과**를 보장해야 할 때 유용합니다. 팀원의 `~/.claude`에 있는 hook이나 프로젝트의 `.mcp.json`에 있는 MCP 서버가 실행되지 않으며, 오직 명시적으로 전달한 플래그만 적용됩니다.

```bash
claude --bare -p "Summarize this file" --allowedTools "Read"
```

Bare 모드에서 Claude는 Bash, 파일 읽기, 파일 편집 도구에 접근할 수 있습니다. 추가 컨텍스트는 플래그로 전달합니다.

| 로드할 항목 | 사용 플래그 |
|------------|-----------|
| System prompt 추가 | `--append-system-prompt`, `--append-system-prompt-file` |
| 설정 | `--settings <file-or-json>` |
| MCP 서버 | `--mcp-config <file-or-json>` |
| 커스텀 에이전트 | `--agents <json>` |
| 플러그인 | `--plugin-dir <path>`, `--plugin-url <url>` |

> **참고**: Bare 모드는 OAuth 및 키체인 읽기를 건너뜁니다. Anthropic 인증은 `ANTHROPIC_API_KEY` 또는 `--settings`에 전달된 JSON의 `apiKeyHelper`를 통해야 합니다. Bedrock, Vertex, Foundry는 각 공급자의 기본 자격 증명을 사용합니다.

---

## Agent SDK (Python/TypeScript)

Agent SDK는 Claude Code와 동일한 도구, 에이전트 루프, 컨텍스트 관리를 Python과 TypeScript로 프로그래밍 방식으로 제공합니다. 파일 읽기, 명령 실행, 코드 편집을 위한 내장 도구가 포함되어 있어 도구 실행을 직접 구현할 필요가 없습니다.

> **참고**: 기존 Claude Code SDK가 **Claude Agent SDK**로 이름이 변경되었습니다. 마이그레이션은 Migration Guide를 참조하세요.

### 설치

**TypeScript:**

```bash
npm install claude-agent-sdk
```

**Python:**

```bash
pip install claude-agent-sdk
```

### Python 예시

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="Find and fix the bug in auth.py",
        options=ClaudeAgentOptions(allowed_tools=["Read", "Edit", "Bash"]),
    ):
        print(message)

asyncio.run(main())
```

### TypeScript 예시

```typescript
import { query, ClaudeAgentOptions } from 'claude-agent-sdk';

const messages = await query({
  prompt: 'Find and fix the bug in auth.py',
  options: { allowedTools: ['Read', 'Edit', 'Bash'] },
});

for await (const message of messages) {
  console.log(message);
}
```

### Agent SDK 기능

Agent SDK는 Claude Code의 강력한 기능을 모두 사용할 수 있습니다.

| 기능 | 설명 |
|------|------|
| **Built-in tools** | 파일 읽기, 명령 실행, 코드 편집 등 내장 도구 |
| **Hooks** | Claude Code의 hook 시스템 활용 |
| **Subagents** | 하위 에이전트 실행 |
| **MCP** | Model Context Protocol 지원 |
| **Permissions** | 세분화된 권한 제어 |
| **Sessions** | 세션 관리 및 대화 이어가기 |

### Claude Code 파일시스템 기능

`setting_sources=["project"]` (Python) 또는 `settingSources: ['project']` (TypeScript)를 설정하면 Claude Code의 파일시스템 기반 설정을 사용할 수 있습니다.

| 기능 | 설명 | 위치 |
|------|------|------|
| Skills | Markdown으로 정의된 특수 기능 | `.claude/skills/*/SKILL.md` |
| Slash commands | 일반 작업용 커스텀 명령 | `.claude/commands/*.md` |
| Memory | 프로젝트 컨텍스트 및 지침 | `CLAUDE.md` 또는 `.claude/CLAUDE.md` |
| Plugins | 커스텀 명령, 에이전트, MCP 서버 확장 | `plugins` 옵션으로 프로그래밍 방식 사용 |

---

## Legacy SDK (TypeScript/Python)

### 설치

```bash
npm install @anthropic-ai/claude-code
```

### 기본 사용법

```typescript
import { claude } from '@anthropic-ai/claude-code';

const result = await claude({
  prompt: 'explain this codebase',
  options: {
    maxTurns: 3,
  },
});

console.log(result);
```

### 옵션 표

| 인자 | 설명 | 기본값 |
|------|------|--------|
| `abortController` | 중단 컨트롤러 | `new AbortController()` |
| `cwd` | 현재 작업 디렉토리 | `process.cwd()` |
| `executable` | JavaScript 런타임 | Node.js에서는 `node`, Bun에서는 `bun` |
| `executableArgs` | 실행 파일에 전달할 인자 | `[]` |
| `pathToClaudeCodeExecutable` | Claude Code 실행 파일 경로 | 패키지에 포함된 실행 파일 |

### 전체 옵션 예시

```typescript
import { claude } from '@anthropic-ai/claude-code';

const result = await claude({
  prompt: 'fix the failing tests',
  options: {
    maxTurns: 5,
    systemPrompt: 'You are a test fixing expert.',
    allowedTools: ['Bash', 'Read', 'Edit'],
    outputFormat: 'json',
    cwd: '/path/to/project',
  },
});
```

---

## Python SDK

### 전제조건

| 요구사항 | 버전 |
|----------|------|
| **Python** | 3.10+ |
| **Node.js** | 설치 필요 |
| **Claude Code CLI** | `npm install -g @anthropic-ai/claude-code` |

### 설치

```bash
pip install claude-code-sdk
```

### 기본 사용법

```python
from claude_code_sdk import ClaudeCode

client = ClaudeCode()

result = client.query("explain this codebase")
print(result)
```

### 옵션 사용

Python SDK는 `ClaudeCodeOptions` 클래스를 통해 CLI의 모든 인자를 지원합니다.

```python
from claude_code_sdk import ClaudeCode, ClaudeCodeOptions

options = ClaudeCodeOptions(
    max_turns=3,
    system_prompt="You are a Python expert.",
    output_format="json",
)

client = ClaudeCode(options=options)
result = client.query("analyze the code for bugs")
```

---

## Headless CLI 예제

아래 예제는 일반적인 CLI 패턴을 보여줍니다. CI 및 스크립트 호출에서는 로컬 설정이 결과에 영향을 주지 않도록 `--bare`를 추가하세요.

### 데이터 파이프로 전달하기

비대화형 모드는 stdin을 읽으므로, 다른 명령줄 도구처럼 데이터를 파이프로 전달하고 응답을 리다이렉트할 수 있습니다.

```bash
cat build-error.txt | claude -p 'concisely explain the root cause of this build error' > output.txt
```

`--output-format json`을 사용하면 응답 페이로드에 `total_cost_usd`와 모델별 비용 분석이 포함되어, 스크립트에서 호출별 비용을 추적할 수 있습니다.

### 빌드 스크립트에 Claude 추가하기

```json
{
  "scripts": {
    "lint:claude": "git diff main | claude -p \"you are a typo linter. for each typo in this diff, report filename:line on one line and the issue on the next. return nothing else.\""
  }
}
```

### 구조화된 출력 얻기

`--output-format`으로 응답 형식을 제어합니다.

| 값 | 설명 |
|----|------|
| `text` (기본값) | 일반 텍스트 출력 |
| `json` | 결과, 세션 ID, 메타데이터가 포함된 구조화된 JSON |
| `stream-json` | 실시간 스트리밍용 개행 구분 JSON |

```bash
claude -p "Summarize this project" --output-format json
```

`--output-format json`과 함께 `--json-schema`를 사용하면 특정 스키마에 맞는 출력을 얻을 수 있습니다. 응답의 `structured_output` 필드에 구조화된 출력이 포함됩니다.

```bash
claude -p "Extract the main function names from auth.py" \
  --output-format json \
  --json-schema '{"type":"object","properties":{"functions":{"type":"array","items":{"type":"string"}}},"required":["functions"]}'
```

### 스트리밍 응답

`--output-format stream-json`과 `--verbose`, `--include-partial-messages`를 조합하면 토큰이 생성되는 대로 수신할 수 있습니다.

```bash
claude -p "Explain recursion" --output-format stream-json --verbose --include-partial-messages
```

jq로 텍스트 델타만 필터링하여 스트리밍 텍스트를 표시할 수 있습니다.

```bash
claude -p "Write a poem" --output-format stream-json --verbose --include-partial-messages | \
  jq -rj 'select(.type == "stream_event" and .event.delta.type? == "text_delta") | .event.delta.text'
```

### 도구 자동 승인

`--allowedTools`로 특정 도구를 승인하면 프롬프트 없이 사용할 수 있습니다.

```bash
claude -p "Run the test suite and fix any failures" \
  --allowedTools "Bash,Read,Edit"
```

세션 전체에 권한 모드를 설정하려면 `--permission-mode`를 사용합니다.

| 모드 | 동작 |
|------|------|
| `dontAsk` | `permissions.allow` 규칙 또는 읽기 전용 명령 세트에 없는 모든 것을 거부. 잠금 CI 실행에 적합 |
| `acceptEdits` | 파일 쓰기와 `mkdir`, `touch`, `mv`, `cp` 등의 파일시스템 명령을 자동 승인. 다른 셸 명령과 네트워크 요청은 여전히 `--allowedTools` 또는 `permissions.allow` 규칙 필요 |

```bash
claude -p "Apply the lint fixes" --permission-mode acceptEdits
```

### 커밋 생성하기

```bash
claude -p "Look at my staged changes and create an appropriate commit" \
  --allowedTools "Bash(git diff *),Bash(git log *),Bash(git status *),Bash(git commit *)"
```

`--allowedTools`는 권한 규칙 구문을 사용합니다. 뒤에 붙은 `*`는 접두사 매칭을 활성화하므로 `Bash(git diff *)`는 `git diff`로 시작하는 모든 명령을 허용합니다. `*` 앞의 공백이 중요합니다: 공백이 없으면 `Bash(git diff*)`는 `git diff-index`도 매칭합니다.

### 시스템 프롬프트 커스터마이즈

```bash
gh pr diff "$1" | claude -p \
  --append-system-prompt "You are a security engineer. Review for vulnerabilities." \
  --output-format json
```

### 대화 이어가기

```bash
# 첫 번째 요청
claude -p "Review this codebase for performance issues"

# 가장 최근 대화 계속
claude -p "Now focus on the database queries" --continue
claude -p "Generate a summary of all issues found" --continue
```

---

## 스트리밍 이벤트

스트리밍 모드에서 API 요청이 재시도 가능한 오류로 실패하면 Claude Code는 재시도 전에 `system/api_retry` 이벤트를 발생시킵니다.

### system/api_retry 이벤트

| 필드 | 타입 | 설명 |
|------|------|------|
| `type` | `"system"` | 메시지 타입 |
| `subtype` | `"api_retry"` | 재시도 이벤트 식별자 |
| `attempt` | integer | 현재 시도 횟수 (1부터 시작) |
| `max_retries` | integer | 허용된 총 재시도 횟수 |
| `retry_delay_ms` | integer | 다음 시도까지의 대기 시간 (밀리초) |
| `error_status` | integer 또는 null | HTTP 상태 코드. HTTP 응답이 없는 연결 오류의 경우 `null` |
| `error` | string | 오류 카테고리: `authentication_failed`, `oauth_org_not_allowed`, `billing_error`, `rate_limit`, `overloaded`, `invalid_request`, `model_not_found`, `server_error`, `max_output_tokens`, `unknown` |
| `uuid` | string | 고유 이벤트 식별자 |
| `session_id` | string | 이벤트가 속한 세션 |

### system/init 이벤트 — 플러그인 필드

`system/init` 이벤트는 모델, 도구, MCP 서버, 로드된 플러그인 등 세션 메타데이터를 보고합니다. `CLAUDE_CODE_SYNC_PLUGIN_INSTALL`이 설정된 경우 `plugin_install` 이벤트가 먼저 발생합니다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `plugins` | array | 성공적으로 로드된 플러그인. 각 항목에 `name`과 `path` 포함 |
| `plugin_errors` | array | 플러그인 로드 시간 오류. 각 항목에 `plugin`, `type`, `message` 포함. 만족되지 않은 종속성 버전 및 `--plugin-dir` 로드 실패(누락된 경로, 잘못된 아카이브 등) 포함. 영향을 받는 플러그인은 강등되어 `plugins`에 나타나지 않음. 오류가 없으면 키가 생략됨 |

### system/plugin_install 이벤트

`CLAUDE_CODE_SYNC_PLUGIN_INSTALL`이 설정된 경우, 마켓플레이스 플러그인이 첫 번째 턴 전에 설치되는 동안 `system/plugin_install` 이벤트가 발생합니다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `type` | `"system"` | 메시지 타입 |
| `subtype` | `"plugin_install"` | 플러그인 설치 이벤트 식별자 |
| `status` | `"started"`, `"installed"`, `"failed"`, `"completed"` | `started`와 `completed`는 전체 설치를 감싸고, `installed`와 `failed`는 개별 마켓플레이스를 보고 |
| `name` | string, 선택 | 마켓플레이스 이름. `installed`와 `failed`에 존재 |
| `error` | string, 선택 | 실패 메시지. `failed`에 존재 |
| `uuid` | string | 고유 이벤트 식별자 |
| `session_id` | string | 이벤트가 속한 세션 |

---

## 고급 사용법

### 멀티턴 대화

세션을 재개하거나 가장 최근 세션에서 계속하여 멀티턴 대화를 구현할 수 있습니다.

```bash
# 세션 ID로 재개
claude --resume <session-id>

# 최근 세션 계속
claude --continue
```

### 커스텀 시스템 프롬프트

Claude의 동작을 가이드하는 커스텀 시스템 프롬프트를 제공할 수 있습니다.

```bash
# 시스템 프롬프트 완전 교체
claude -p --system-prompt "You are a security auditor. Focus only on security issues." "review this code"

# 기본 시스템 프롬프트에 추가
claude -p --append-system-prompt "Always respond in Korean." "explain this function"
```

### MCP 설정

Model Context Protocol (MCP)을 사용하여 Claude Code를 외부 서버의 추가 도구와 리소스로 확장할 수 있습니다.

**1단계**: MCP 서버 JSON 설정 파일 생성

```json
{
  "mcpServers": {
    "database": {
      "command": "node",
      "args": ["./mcp-db-server.js"]
    },
    "api": {
      "command": "python",
      "args": ["./mcp-api-server.py"]
    }
  }
}
```

**2단계**: Claude Code에서 MCP 설정 로드

```bash
claude --mcp-config servers.json
```

### 권한 프롬프트 도구

`--permission-prompt-tool`을 사용하여 MCP 도구로 권한 확인을 커스터마이즈할 수 있습니다.

#### 작동 방식

1. 모델이 도구를 호출하면 먼저 `settings.json`, `--allowedTools`, `--disallowedTools`를 확인
2. 허용/거부가 결정되면 해당 결정에 따라 진행
3. 결정되지 않은 경우 `--permission-prompt-tool`에 지정된 MCP 도구 호출

#### 반환 값

권한 프롬프트 도구는 JSON 문자열 형태의 결과를 반환해야 합니다.

```json
// 승인
{ "behavior": "allow", "updatedInput": {...} }

// 거부
{ "behavior": "deny", "message": "User denied this action" }
}
```

#### TypeScript 구현 예시

```typescript
// MCP 권한 프롬프트 도구 구현
const permissionHandler = async (toolName: string, input: any) => {
  // 사용자에게 권한 요청 로직 구현
  const approved = await askUserPermission(toolName, input);

  if (approved) {
    return JSON.stringify({
      behavior: "allow",
      updatedInput: input, // 입력이 수정되지 않은 경우 원본 반환
    });
  }

  return JSON.stringify({
    behavior: "deny",
    message: "User denied permission",
  });
};
```

#### 사용법

```bash
# MCP 서버 추가 후 권한 프롬프트 도구 지정
claude -p --mcp-config servers.json --permission-prompt-tool mcp__auth__prompt
```

> **참고**: `updatedInput`은 권한 프롬프트가 입력을 수정한 경우에만 변경된 입력을 반환합니다. 수정되지 않은 경우 원본 `input`을 반환하세요.

---

## CLI 옵션 전체 표

| 플래그 | 설명 | 예시 |
|--------|------|------|
| `--print`, `-p` | 비대화형 모드 실행 | `claude -p "query"` |
| `--bare` | hooks, skills, plugins, MCP, CLAUDE.md 자동탐색 건너뛰기 | `claude --bare -p "query"` |
| `--output-format` | 출력 형식 지정 (`text`, `json`, `stream-json`) | `claude -p --output-format json` |
| `--json-schema` | JSON Schema로 구조화된 출력 지정 (`--output-format json`과 함께 사용) | `--json-schema '{"type":"object",...}'` |
| `--permission-mode` | 권한 모드 설정 (`dontAsk`, `acceptEdits`) | `claude --permission-mode acceptEdits` |
| `--resume`, `-r` | 세션 ID로 대화 재개 | `claude --resume abc123` |
| `--continue`, `-c` | 가장 최근 대화 계속 | `claude --continue` |
| `--verbose` | 상세 로깅 활성화 | `claude --verbose` |
| `--include-partial-messages` | 스트리밍에서 부분 메시지 포함 | `claude --include-partial-messages` |
| `--max-turns` | 비대화형 모드에서 에이전트 턴 수 제한 | `claude --max-turns 3` |
| `--system-prompt` | 시스템 프롬프트 재정의 (`--print` 전용) | `claude --system-prompt "Custom"` |
| `--append-system-prompt` | 시스템 프롬프트에 추가 (`--print` 전용) | `claude --append-system-prompt "Extra"` |
| `--append-system-prompt-file` | 파일에서 시스템 프롬프트에 추가 | `claude --append-system-prompt-file prompt.txt` |
| `--allowedTools` | 허용할 도구 목록 | `claude --allowedTools "Bash(npm install),mcp__filesystem"` |
| `--disallowedTools` | 거부할 도구 목록 | `claude --disallowedTools "Bash(git commit),mcp__github"` |
| `--mcp-config` | MCP 서버 JSON 파일 또는 JSON 문자열 로드 | `claude --mcp-config servers.json` |
| `--permission-prompt-tool` | 권한 프롬프트용 MCP 도구 (`--print` 전용) | `claude --permission-prompt-tool mcp__auth__prompt` |
| `--settings` | 설정 파일 또는 JSON 문자열 로드 | `claude --settings settings.json` |
| `--agents` | 커스텀 에이전트 JSON 로드 | `claude --agents '{"agents":[...]}'` |
| `--plugin-dir` | 로컬 디렉토리에서 플러그인 로드 | `claude --plugin-dir ./my-plugin` |
| `--plugin-url` | URL에서 플러그인 로드 | `claude --plugin-url https://...` |

### 도구 문자열 형식

`--allowedTools`와 `--disallowedTools`는 공백으로 구분된 목록 또는 쉼표로 구분된 문자열을 지원합니다.

```bash
# 공백으로 구분
claude --allowedTools mcp__slack mcp__filesystem

# 쉼표로 구분된 문자열
claude --allowedTools "Bash(npm install),mcp__filesystem"
```

괄호 안의 인자는 특정 명령어만 허용/거부할 때 사용합니다.

---

## 출력 형식 상세

### Text 출력 (기본값)

응답 텍스트만 반환합니다.

```bash
claude -p "explain this function"
```

```
이 함수는 사용자 입력을 검증하고 데이터베이스에 저장합니다...
```

### JSON 출력

메타데이터를 포함한 구조화된 데이터를 반환합니다.

```bash
claude -p --output-format json "list all files"
```

```json
{
  "type": "result",
  "subtype": "success",
  "cost_usd": 0.003,
  "is_error": false,
  "duration_ms": 1500,
  "duration_api_ms": 1200,
  "num_turns": 2,
  "result": "다음 파일들이 발견되었습니다: ...",
  "session_id": "abc123"
}
```

### 스트리밍 JSON 출력

메시지가 수신될 때마다 스트리밍됩니다.

```bash
claude -p --output-format stream-json "analyze the code"
```

각 대화는 초기 `init` 시스템 메시지로 시작하고, 사용자 및 어시스턴트 메시지 목록이 이어지며, 통계가 포함된 최종 `result` 시스템 메시지로 끝납니다. 각 메시지는 별도의 JSON 객체로 출력됩니다.

```jsonl
{"type":"system","subtype":"init","session_id":"abc123","tools":[...]}
{"type":"user","message":{"role":"user","content":[...]}}
{"type":"assistant","message":{"role":"assistant","content":[...]}}
{"type":"system","subtype":"result","cost_usd":0.003,"duration_ms":1500,"num_turns":2}
```

---

## 입력 형식

### 텍스트 입력 (기본값)

인자로 텍스트를 직접 제공합니다.

```bash
claude -p "explain this function"
```

또는 stdin 파이프를 통해 제공합니다.

```bash
cat main.py | claude -p "explain this code"
```

### 스트리밍 JSON 입력

`stdin`을 통해 메시지 스트림을 제공합니다. 각 메시지는 사용자 턴을 나타냅니다. 이를 통해 `claude` 바이너리를 재실행하지 않고도 여러 턴의 대화를 진행할 수 있습니다.

- 각 메시지는 출력 메시지 스키마와 동일한 형식의 JSON 'User message' 객체
- JSONL 형식 (각 줄이 완전한 JSON 객체)
- `-p` 및 `--output-format stream-json` 필요

> **현재 제한사항**: 텍스트 전용 사용자 메시지만 지원됩니다.

---

## 모범 사례

### 1. JSON 출력 형식 사용

프로그래밍 방식으로 응답을 파싱하려면 JSON 출력 형식을 사용하세요.

```bash
claude -p --output-format json "list all files"
```

### 2. 에러 우아하게 처리

종료 코드와 stderr를 확인하세요.

```bash
result=$(claude -p --output-format json "query" 2>&1)
if [ $? -ne 0 ]; then
  echo "Error: $result"
  exit 1
fi
```

### 3. 세션 관리 사용

멀티턴 대화에서 컨텍스트를 유지하려면 세션 관리를 사용하세요.

```bash
# 첫 번째 턴
claude -p --output-format json "analyze this code" > session.json
SESSION_ID=$(jq -r '.session_id' session.json)

# 다음 턴
claude --resume $SESSION_ID -p "now fix the issues"
```

### 4. 타임아웃 고려

장시간 실행되는 작업에 대한 타임아웃을 설정하세요.

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 30000); // 30초 타임아웃

const result = await claude({
  prompt: 'long running task',
  options: {
    abortController: controller,
  },
});
```

### 5. 속도 제한 준수

여러 요청을 보낼 때는 호출 간에 지연을 추가하여 속도 제한을 준수하세요.

---

## 요약

**Agent SDK**는 Claude Code와 동일한 도구, 에이전트 루프, 컨텍스트 관리를 제공하는 새로운 프라이머리 SDK입니다. CLI(`claude -p`), Python(`claude-agent-sdk`), TypeScript(`claude-agent-sdk`) 환경에서 사용할 수 있으며, `--bare` 모드, `--permission-mode`, `--json-schema` 구조화된 출력, 스트리밍 이벤트(`system/api_retry`, `system/plugin_install`) 등을 통해 CI/CD 파이프라인과 스크립트에 강력하게 통합할 수 있습니다. 기존 Legacy SDK(`@anthropic-ai/claude-code`, `claude-code-sdk`)는 하위 호환을 위해 유지됩니다.
