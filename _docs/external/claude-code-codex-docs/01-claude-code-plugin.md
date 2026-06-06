# Claude Code 플러그인 개발 완전 가이드

> 공식 문서: https://docs.anthropic.com/en/docs/claude-code/plugins

## 목차

- [플러그인 구조](#플러그인-구조)
- [plugin.json 매니페스트](#pluginjson-매니페스트)
- [컴포넌트 타입](#컴포넌트-타입)
  - [슬래시 명령어 (Commands)](#슬래시-명령어-commands)
  - [커스텀 에이전트 (Agents)](#커스텀-에이전트-agents)
  - [에이전트 스킬 (Skills)](#에이전트-스킬-skills)
  - [훅 (Hooks)](#훅-hooks)
  - [MCP 서버](#mcp-서버)
- [배포 방법](#배포-방법)
- [설정 (Settings)](#설정-settings)

---

## 플러그인 구조

Claude Code 플러그인은 **디렉토리 기반**이며, 필수 매니페스트 파일을 포함합니다:

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # 필수 매니페스트
├── commands/                 # 슬래시 명령어 (선택)
│   ├── review.md
│   └── deploy.md
├── agents/                   # 커스텀 에이전트 (선택)
│   └── code-reviewer.md
├── skills/                   # 에이전트 스킬 (선택)
│   └── testing.md
├── hooks/
│   └── hooks.json           # 라이프사이클 훅 (선택)
└── .mcp.json                 # MCP 서버 설정 (선택)
```

## plugin.json 매니페스트

모든 플러그인의 필수 엔트리포인트입니다:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "내 플러그인 설명",
  "author": "개발자명"
}
```

## 컴포넌트 타입

Claude Code 플러그인은 **5가지 컴포넌트 타입**을 지원합니다:

### 1. 슬래시 명령어 (Commands)

마크다운 파일로 정의되는 커스텀 슬래시 명령어입니다.

#### 스코프

| 스코프 | 경로 | 설명 |
|--------|------|------|
| **프로젝트** | `.claude/commands/` | 특정 프로젝트에 한정 |
| **사용자** | `~/.claude/commands/` | 모든 프로젝트에서 사용 가능 |

#### 파일 형식

```markdown
---
description: "코드 리뷰를 수행합니다"
allowed-tools: ["Read", "Bash"]
argument-hint: "<파일경로>"
model: claude-sonnet-4-6
---

# 코드 리뷰

$ARGUMENTS 파일에 대해 코드 리뷰를 수행하세요.

다음 항목을 확인해주세요:
1. 버그 및 논리적 오류
2. 성능 개선점
3. 보안 취약점
```

#### Frontmatter 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `description` | string | 명령어 설명 (도움말에 표시) |
| `allowed-tools` | string[] | 명령어 실행 시 허용할 도구 목록 |
| `argument-hint` | string | 인자 힌트 (도움말에 표시) |
| `model` | string | 사용할 모델 지정 |

#### 특수 기능

- **`$ARGUMENTS`**: 사용자가 전달한 인자를 본문에 삽입
- **`!` 접두사**: bash 명령 실행 (예: `!npm test`)
- **`@` 접두사**: 파일 참조 (예: `@src/index.ts`)

#### 예시: 복잡한 슬래시 명령어

```markdown
---
description: "프로젝트 테스트 실행 및 결과 분석"
allowed-tools: ["Bash", "Read", "Write"]
argument-hint: "[test-pattern]"
---

# 테스트 실행기

! npm test -- $ARGUMENTS

테스트 결과를 분석하고, 실패한 테스트에 대해:
1. 실패 원인 분석
2. 수정 제안
3. 수정 코드 작성
```

### 2. 커스텀 에이전트 (Agents)

특정 작업에 특화된 에이전트를 정의합니다.

#### 정의 방법

`.claude/agents/` 디렉토리에 마크다운 파일로 정의:

```markdown
---
name: code-reviewer
description: "코드 리뷰 전문 에이전트"
tools:
  - Read
  - Bash
  WebSearch
model: claude-opus-4-8
---

당신은 코드 리뷰 전문가입니다.

다음 기준으로 코드를 검토하세요:
- 정확성 (Correctness)
- 성능 (Performance)
- 보안 (Security)
- 가독성 (Readability)
- SOLID 원칙 준수
```

#### 에이전트 Frontmatter

| 필드 | 설명 |
|------|------|
| `name` | 에이전트 식별자 |
| `description` | 에이전트 설명 |
| `tools` | 허용할 도구 목록 |
| `model` | 사용할 모델 |

#### 서브에이전트로 활용

에이전트는 다른 에이전트 내에서 **서브에이전트**로 호출할 수 있습니다:

```markdown
메인 에이전트에서 코드 리뷰가 필요한 경우,
code-reviewer 에이전트를 서브에이전트로 호출하세요.
```

### 3. 에이전트 스킬 (Skills)

에이전트가 사용할 수 있는 재사용 가능한 지침 모음입니다.

```markdown
---
name: tdd-workflow
description: "TDD 기반 개발 워크플로우"
triggers:
  - "tdd"
  - "test-driven"
---

# TDD 워크플로우

1. **Red**: 실패하는 테스트를 먼저 작성
2. **Green**: 테스트를 통과하는 최소 코드 작성
3. **Refactor**: 코드 품질 개선

각 단계에서 다음을 확인:
- 테스트가 올바르게 실패/성공하는지
- 리팩토링 후에도 테스트가 통과하는지
```

### 4. 훅 (Hooks)

라이프사이클 이벤트에 반응하는 핸들러입니다.

> 훅에 대한 자세한 내용은 [03-hooks-comparison.md](./03-hooks-comparison.md) 참조

#### 지원 훅 이벤트 (5종)

| 이벤트 | 발생 시점 | 용도 |
|--------|-----------|------|
| `PreToolUse` | 도구 실행 전 | 권한 제어, 입력 검증 |
| `PostToolUse` | 도구 실행 후 | 결과 로깅, 후처리 |
| `Notification` | 알림 발생 시 | 알림 커스텀, 외부 통지 |
| `Stop` | 에이전트 종료 시 | 정리 작업, 요약 |
| `UserPromptSubmit` | 사용자 프롬프트 제출 전 | 입력 전처리, 자동 완성 |

#### hooks.json 예시

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "command": "validate-bash-command.sh"
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write",
        "command": "lint-written-file.sh"
      }
    ],
    "Stop": [
      {
        "command": "notify-completion.sh"
      }
    ]
  }
}
```

### 5. MCP 서버

Model Context Protocol 서버를 플러그인에 포함합니다.

> MCP에 대한 자세한 내용은 [04-mcp-integration.md](./04-mcp-integration.md) 참조

#### .mcp.json 형식

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["server.js"],
      "env": {
        "API_KEY": "${API_KEY}"
      }
    }
  }
}
```

#### plugin.json 내 MCP 설정

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["server.js"]
    }
  }
}
```

---

## 배포 방법

### 1. 마켓플레이스 배포 (주요 채널)

Claude Code 플러그인은 **공식 마켓플레이스**를 통해 배포됩니다:

1. 플러그인 디렉토리 준비
2. `plugin.json` 매니페스트 작성
3. 마켓플레이스에 제출

### 2. 팀 레벨 배포

`.claude/settings.json`에 마켓플레이스와 플러그인 구성을 추가:

```json
{
  "plugins": {
    "marketplace": {
      "enabled": true
    },
    "installed": [
      {
        "name": "my-team-plugin",
        "source": "marketplace"
      }
    ]
  }
}
```

리포지토리 폴더를 신뢰하면 플러그인이 자동으로 설치됩니다.

### 3. 로컬 개발 테스트

```bash
# 플러그인 디렉토리에서 직접 테스트
claude --plugin ./my-plugin
```

---

## 설정 (Settings)

### settings.json 구조

```json
{
  "permissions": {
    "allow": ["Bash(npm test)", "Read"],
    "deny": ["Bash(rm -rf)"]
  },
  "hooks": {
    "PreToolUse": [...],
    "PostToolUse": [...]
  },
  "mcpServers": {
    "my-server": {...}
  }
}
```

### 설정 스코프

| 파일 | 위치 | 스코프 |
|------|------|--------|
| `.claude/settings.json` | 프로젝트 루트 | 프로젝트 |
| `.claude/settings.local.json` | 프로젝트 루트 | 프로젝트 (gitignore) |
| `~/.claude/settings.json` | 홈 디렉토리 | 사용자 전역 |

### 커스텀 슬래시 명령어 작성 팁

1. **명확한 description**: 도움말에 표시되므로 간결하게
2. **allowed-tools 최소화**: 필요한 도구만 허용
3. **argument-hint 제공**: 사용자가 인자 형식을 알 수 있게
4. **모델 선택**: 간단한 작업은 `haiku`, 복잡한 작업은 `opus`

---

## 참고 소스

- [Anthropic 공식 플러그인 문서](https://docs.anthropic.com/en/docs/claude-code/plugins)
- [Anthropic 슬래시 명령어 문서](https://docs.anthropic.com/en/docs/claude-code/slash-commands)
- [Anthropic MCP 문서](https://docs.anthropic.com/en/docs/claude-code/mcp)
- [Anthropic Hooks 문서](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Anthropic Settings 문서](https://docs.anthropic.com/en/docs/claude-code/settings)
- [Anthropic Subagents 문서](https://docs.anthropic.com/en/docs/claude-code/subagents)
