# 08. 서브에이전트 (Subagents)

> **참조**: [Create custom subagents](https://code.claude.com/docs/en/sub-agents) | [Orchestrate agent teams](https://code.claude.com/docs/en/agent-teams)

---

## 목차

- [서브에이전트 개요](#서브에이전트-개요)
- [핵심 이점](#핵심-이점)
- [빌트인 서브에이전트](#빌트인-서브에이전트)
- [Quickstart: 첫 서브에이전트 만들기](#quickstart-첫-서브에이전트-만들기)
- [/agents 명령어로 관리](#agents-명령어로-관리)
- [서브에이전트 범위 선택](#서브에이전트-범위-선택)
- [서브에이전트 파일 작성](#서브에이전트-파일-작성)
- [Frontmatter 필드](#frontmatter-필드)
- [모델 선택](#모델-선택)
- [도구 접근 제어](#도구-접근-제어)
- [사용 불가 도구](#사용-불가-도구)
- [MCP 서버 스코프](#mcp-서버-스코프)
- [권한 모드](#권한-모드)
- [스킬 프리로드](#스킬-프리로드)
- [영구 메모리](#영구-메모리)
- [Isolation (Worktree) 모드](#isolation-worktree-모드)
- [Hooks로 조건부 제어](#hooks로-조건부-제어)
- [CLI를 통한 동적 정의](#cli를-통한-동적-정의)
- [특정 서브에이전트 비활성화](#특정-서브에이전트-비활성화)
- [명시적 서브에이전트 호출](#명시적-서브에이전트-호출)
- [서브에이전트 작업 패턴](#서브에이전트-작업-패턴)
- [시작 시 로드되는 항목](#시작-시-로드되는-항목)
- [포그라운드와 백그라운드 실행](#포그라운드와-백그라운드-실행)
- [서브에이전트 재개](#서브에이전트-재개)
- [대화 Fork](#대화-fork)
- [서브에이전트 제약사항](#서브에이전트-제약사항)
- [실전 예시](#실전-예시)
- [서브에이전트 모범 사례](#서브에이전트-모범-사례)
- [Agent Teams](#agent-teams)
  - [Agent Teams 개요](#agent-teams-개요)
  - [Agent Teams 활성화](#agent-teams-활성화)
  - [Agent Teams 시작하기](#agent-teams-시작하기)
  - [Agent Teams 제어](#agent-teams-제어)
  - [Agent Teams 작동 방식](#agent-teams-작동-방식)
  - [서브에이전트 정의를 팀원으로 활용](#서브에이전트-정의를-팀원으로-활용)
  - [Agent Teams 사용 사례](#agent-teams-사용-사례)
  - [Agent Teams 모범 사례](#agent-teams-모범-사례)
  - [Agent Teams 트러블슈팅](#agent-teams-트러블슈팅)
  - [Agent Teams 제한사항](#agent-teams-제한사항)

---

## 서브에이전트 개요

서브에이전트(Subagent)는 Claude Code에서 특정 작업에 특화된 AI 어시스턴트입니다. 메인 대화와 **분리된 컨텍스트 윈도우**에서 동작하며, 작업이 끝나면 결과만 메인 대화로 반환합니다. 서브에이전트는 자체 시스템 프롬프트, 특정 도구 접근, 독립적인 권한을 가지고 실행됩니다.

Claude는 작업이 서브에이전트의 `description`과 일치하면 자동으로 해당 서브에이전트에 위임합니다.

### 작동 방식

```
사용자 요청 → Claude Code → 적절한 서브에이전트에 작업 위임
                                ↓
                    서브에이전트가 독립 컨텍스트에서 작업 수행
                                ↓
                    결과를 메인 대화로 반환
```

---

## 핵심 이점

서브에이전트는 다음과 같은 이점을 제공합니다.

| 이점 | 설명 |
|------|------|
| **Preserve context** | 탐색과 구현 결과를 메인 대화 밖에 유지하여 컨텍스트 보존 |
| **Enforce constraints** | 서브에이전트가 사용할 수 있는 도구를 제한하여 제약 강제 |
| **Reuse configurations** | 사용자 레벨 서브에이전트로 여러 프로젝트에서 설정 재사용 |
| **Specialize behavior** | 특정 도메인에 집중된 시스템 프롬프트로 행동 특화 |
| **Control costs** | Haiku 같은 빠르고 저렴한 모델로 작업을 라우팅하여 비용 제어 |

---

## 빌트인 서브에이전트

Claude Code에는 Claude가 상황에 맞게 자동으로 사용하는 빌트인 서브에이전트가 포함되어 있습니다. 각 서브에이전트는 부모 대화의 권한을 상속하며, 추가적인 도구 제한이 적용됩니다.

### Explore

빠르고 읽기 전용으로 코드베이스 검색 및 분석에 최적화된 에이전트입니다.

| 항목 | 값 |
|------|-----|
| **모델** | Haiku (빠르고 저지연) |
| **도구** | 읽기 전용 도구 (Write, Edit 접근 거부) |
| **용도** | 파일 검색, 코드 탐색, 코드베이스 분석 |

Claude는 코드베이스를 변경 없이 검색하거나 이해해야 할 때 Explore에 위임합니다. 호출 시 Claude는 **thoroughness level**을 지정합니다: `quick` (타겟팅된 조회), `medium` (균형 잡힌 탐색), `very thorough` (포괄적 분석).

### Plan

Plan 모드에서 계획을 제시하기 전 컨텍스트를 수집하는 리서치 에이전트입니다.

| 항목 | 값 |
|------|-----|
| **모델** | 메인 대화에서 상속 |
| **도구** | 읽기 전용 도구 (Write, Edit 접근 거부) |
| **용도** | 계획 수립을 위한 코드베이스 리서치 |

### General-purpose

탐색과 실행이 모두 필요한 복잡한 다단계 작업을 위한 에이전트입니다.

| 항목 | 값 |
|------|-----|
| **모델** | 메인 대화에서 상속 |
| **도구** | 전체 도구 |
| **용도** | 복잡한 리서치, 다단계 작업, 코드 수정 |

### 기타 빌트인 에이전트

| 에이전트 | 모델 | 사용 시점 |
|----------|------|-----------|
| `statusline-setup` | Sonnet | `/statusline` 실행 시 |
| `claude-code-guide` | Haiku | Claude Code 기능에 대해 질문할 때 |

> **참고**: Explore와 Plan은 CLAUDE.md 파일과 부모 세션의 git status를 건너뛰어 리서치를 빠르고 저렴하게 유지합니다. 다른 모든 빌트인 및 커스텀 서브에이전트는 둘 다 로드합니다.

---

## Quickstart: 첫 서브에이전트 만들기

서브에이전트는 YAML frontmatter가 포함된 Markdown 파일로 정의됩니다. 직접 생성하거나 `/agents` 명령어를 사용할 수 있습니다.

`/agents` 명령어를 사용하면 안내된 설정으로 사용자 레벨 서브에이전트를 쉽게 만들 수 있습니다. 생성된 서브에이전트는 머신의 모든 프로젝트에서 사용할 수 있습니다.

수동으로 Markdown 파일을 직접 생성하거나, CLI 플래그로 정의하거나, 플러그인을 통해 배포할 수도 있습니다.

---

## /agents 명령어로 관리

`/agents` 명령어는 서브에이전트를 관리하는 탭 형태의 인터페이스를 엽니다.

### Running 탭

현재 실행 중인 서브에이전트를 보여주며, 열거나 중지할 수 있습니다.

### Library 탭

- 사용 가능한 모든 서브에이전트 조회 (빌트인, 사용자, 프로젝트, 플러그인)
- 안내된 설정 또는 Claude 생성으로 새 서브에이전트 생성
- 기존 서브에이전트의 설정 및 도구 접근 편집
- 커스텀 서브에이전트 삭제
- 중복 존재 시 어떤 서브에이전트가 활성 상태인지 확인

서브에이전트를 생성하고 관리하는 데 권장되는 방법입니다.

---

## 서브에이전트 범위 선택

서브에이전트는 YAML frontmatter가 포함된 Markdown 파일입니다. 범위에 따라 다른 위치에 저장합니다. 여러 서브에이전트가 같은 이름을 공유하면 높은 우선순위 위치가 우선합니다.

| 위치 | 범위 | 우선순위 | 생성 방법 |
|------|------|----------|-----------|
| Managed settings | 조직 전체 | 1 (최고) | Managed settings를 통해 배포 |
| `--agents` CLI 플래그 | 현재 세션 | 2 | Claude Code 실행 시 JSON 전달 |
| `.claude/agents/` | 현재 프로젝트 | 3 | 대화형 또는 수동 |
| `~/.claude/agents/` | 모든 프로젝트 | 4 | 대화형 또는 수동 |
| 플러그인 `agents/` 디렉터리 | 플러그인이 활성화된 곳 | 5 (최저) | 플러그인과 함께 설치 |

**프로젝트 서브에이전트** (`.claude/agents/`)는 코드베이스에 특화된 서브에이전트에 이상적입니다. 버전 관리에 체크인하면 팀 전체가 공동으로 사용하고 개선할 수 있습니다.

프로젝트 서브에이전트는 **현재 작업 디렉터리에서 위로(walk up)** 탐색하여 발견됩니다. `--add-dir`로 추가된 디렉터리는 파일 접근만 허용할 뿐 서브에이전트 스캔 대상이 아닙니다. 여러 프로젝트에서 서브에이전트를 공유하려면 `~/.claude/agents/` 또는 플러그인을 사용하세요.

**사용자 서브에이전트** (`~/.claude/agents/`)는 모든 프로젝트에서 사용할 수 있는 개인 서브에이전트입니다.

Claude Code는 `.claude/agents/`와 `~/.claude/agents/`를 재귀적으로 스캔하므로, `agents/review/`나 `agents/research/` 같은 하위 폴더로 정의를 정리할 수 있습니다. 하위 디렉터리 경로는 서브에이전트 식별에 영향을 주지 않으며, 식별은 `name` frontmatter 필드로만 결정됩니다. 한 스코프 내에서 두 파일이 같은 `name`을 선언하면 Claude Code는 경고 없이 하나만 유지합니다.

플러그인 `agents/` 디렉터리도 재귀적으로 스캔됩니다. 프로젝트 및 사용자 스코프와 달리 플러그인의 `agents/` 하위 폴더는 스코프된 식별자의 일부가 됩니다. 예: 플러그인 `my-plugin`의 `agents/review/security.md` 파일은 `my-plugin:review:security`로 등록됩니다.

---

## 서브에이전트 파일 작성

서브에이전트 파일은 설정을 위한 YAML frontmatter와 시스템 프롬프트 역할을 하는 Markdown 본문으로 구성됩니다.

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: sonnet
---

You are a code reviewer. When invoked, analyze the code and provide
specific, actionable feedback on quality, security, and best practices.
```

Frontmatter는 서브에이전트의 메타데이터와 설정을 정의합니다. 본문은 서브에이전트의 행동을 안내하는 시스템 프롬프트가 됩니다. 서브에이전트는 이 시스템 프롬프트(작업 디렉터리 같은 기본 환경 정보 포함)만 수신하며, Claude Code의 전체 시스템 프롬프트는 수신하지 않습니다.

서브에이전트는 메인 대화의 현재 작업 디렉터리에서 시작합니다. 서브에이전트 내에서 `cd` 명령은 Bash 도구 호출 간에 유지되지 않으며 메인 대화의 작업 디렉터리에도 영향을 주지 않습니다. 격리된 저장소 사본을 제공하려면 `isolation: worktree`를 설정하세요.

---

## Frontmatter 필드

| 필드 | 필수 | 설명 |
|------|------|------|
| `name` | **예** | 소문자와 하이픈을 사용한 고유 식별자. Hooks에서 `agent_type`으로 이 값을 수신. 파일명과 일치할 필요 없음 |
| `description` | **예** | Claude가 언제 이 서브에이전트에 위임할지를 설명 |
| `tools` | 아니오 | 서브에이전트가 사용할 수 있는 도구. 생략시 모든 도구 상속. Skills를 컨텍스트에 프리로드하려면 `skills` 필드를 사용 |
| `disallowedTools` | 아니오 | 거부할 도구. 상속 또는 지정된 목록에서 제거 |
| `model` | 아니오 | 사용할 모델: `sonnet`, `opus`, `haiku`, 전체 모델 ID(예: `claude-opus-4-8`), 또는 `inherit`. 기본값 `inherit` |
| `permissionMode` | 아니오 | 권한 모드: `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, `plan`. 플러그인 서브에이전트에는 무시됨 |
| `maxTurns` | 아니오 | 서브에이전트가 중단되기 전 최대 에이전트 턴 수 |
| `skills` | 아니오 | 시작 시 서브에이전트의 컨텍스트에 프리로드할 스킬. 전체 스킬 콘텐츠가 주입됨. 나열되지 않은 스킬도 Skill 도구로 호출 가능 |
| `mcpServers` | 아니오 | 이 서브에이전트가 사용할 수 있는 MCP 서버. 플러그인 서브에이전트에는 무시됨 |
| `hooks` | 아니오 | 이 서브에이전트에 스코프된 라이프사이클 훅. 플러그인 서브에이전트에는 무시됨 |
| `memory` | 아니오 | 영구 메모리 스코프: `user`, `project`, `local`. 세션 간 학습 활성화 |
| `background` | 아니오 | `true`로 설정 시 이 서브에이전트를 항상 백그라운드 작업으로 실행. 기본값: `false` |
| `effort` | 아니오 | 이 서브에이전트가 활성 상태일 때의 effort level. 세션 effort level을 오버라이드. 기본값: 세션에서 상속. 옵션: `low`, `medium`, `high`, `xhigh`, `max` |
| `isolation` | 아니오 | `worktree`로 설정 시 임시 git worktree에서 서브에이전트를 실행. 기본 브랜치에서 브랜치된 격리된 저장소 사본 제공. 변경사항이 없으면 worktree는 자동 정리됨 |
| `color` | 아니오 | 작업 목록과 트랜스크립트에서 서브에이전트의 표시 색상. `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan` |
| `initialPrompt` | 아니오 | 이 에이전트가 메인 세션 에이전트로 실행될 때(`--agent` 또는 `agent` 설정) 첫 번째 사용자 턴으로 자동 제출됨. 명령어와 스킬이 처리됨 |

---

## 모델 선택

`model` 필드는 서브에이전트가 사용할 AI 모델을 제어합니다.

| 설정 방식 | 설명 |
|-----------|------|
| **모델 별칭** | `sonnet`, `opus`, `haiku` 중 하나 사용 |
| **전체 모델 ID** | `claude-opus-4-8`, `claude-sonnet-4-6` 등. `--model` 플래그와 동일한 값 |
| **`inherit`** | 메인 대화와 동일한 모델 사용 |
| **생략** | 기본값 `inherit` (메인 대화와 동일한 모델) |

### 모델 해결 순서

Claude가 서브에이전트를 호출할 때 모델은 다음 순서로 결정됩니다.

```
1. CLAUDE_CODE_SUBAGENT_MODEL 환경 변수 (설정된 경우)
2. 호출 시 전달된 model 파라미터
3. 서브에이전트 정의의 model frontmatter
4. 메인 대화의 모델
```

---

## 도구 접근 제어

서브에이전트는 기본적으로 메인 대화에서 사용 가능한 내부 도구와 MCP 도구를 상속합니다.

### Available tools

도구 접근을 제한하려면 `tools` 필드(허용 목록) 또는 `disallowedTools` 필드(거부 목록)를 사용합니다.

**허용 목록 예시** - `tools`로 지정된 도구만 사용:

```markdown
---
name: safe-researcher
description: Research agent with restricted capabilities
tools: Read, Grep, Glob, Bash
---
```

**거부 목록 예시** - `disallowedTools`로 지정된 도구만 제외:

```markdown
---
name: no-writes
description: Inherits every tool except file writes
disallowedTools: Write, Edit
---
```

> **참고**: 두 필드가 모두 설정된 경우 `disallowedTools`가 먼저 적용된 후 `tools`가 나머지 풀에서 해결됩니다. 양쪽에 모두 나열된 도구는 제거됩니다.

### 특정 서브에이전트 스폰 제한

`claude --agent`로 메인 스레드로 실행되는 에이전트는 Agent 도구로 서브에이전트를 스폰할 수 있습니다. 스폰할 수 있는 서브에이전트 유형을 제한하려면 `tools` 필드에 `Agent(agent_type)` 구문을 사용합니다.

```markdown
---
name: coordinator
description: Coordinates work across specialized agents
tools: Agent(worker, researcher), Read, Bash
---
```

이것은 허용 목록입니다: `worker`와 `researcher` 서브에이전트만 스폰할 수 있습니다. 괄호 없이 `Agent`를 사용하면 모든 서브에이전트를 제한 없이 스폰할 수 있습니다. `tools` 목록에서 `Agent`를 완전히 생략하면 어떤 서브에이전트도 스폰할 수 없습니다.

---

## 사용 불가 도구

다음 도구는 메인 대화의 UI나 세션 상태에 의존하므로 `tools` 필드에 나열해도 서브에이전트에서 사용할 수 없습니다.

| 도구 | 비고 |
|------|------|
| `Agent` | 서브에이전트는 다른 서브에이전트를 스폰할 수 없음 |
| `AskUserQuestion` | 메인 UI에 의존 |
| `EnterPlanMode` | 메인 UI에 의존 |
| `ExitPlanMode` | `permissionMode`가 `plan`인 경우 예외적으로 사용 가능 |
| `ScheduleWakeup` | 메인 세션 스케줄러에 의존 |
| `WaitForMcpServers` | 메인 세션에 의존 |

---

## MCP 서버 스코프

`mcpServers` 필드를 사용하면 메인 대화에서 사용할 수 없는 MCP 서버를 서브에이전트에 제공할 수 있습니다. 인라인으로 정의된 서버는 서브에이전트 시작 시 연결되고 종료 시 해제됩니다. 문자열 참조는 부모 세션의 연결을 공유합니다.

```markdown
---
name: browser-tester
description: Tests features in a real browser using Playwright
mcpServers:
  # 인라인 정의: 이 서브에이전트에만 스코프
  - playwright:
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
  # 이름으로 참조: 이미 설정된 서버 재사용
  - github
---

Use the Playwright tools to navigate, screenshot, and interact with pages.
```

인라인 정의는 `.mcp.json` 서버 항목과 동일한 스키마(`stdio`, `http`, `sse`, `ws`)를 사용합니다.

MCP 서버를 메인 대화에서 완전히 제외하고 해당 도구 설명이 컨텍스트를 소모하지 않게 하려면, `.mcp.json` 대신 여기서 인라인으로 정의하세요. 서브에이전트는 도구를 받고, 부모 대화는 받지 않습니다.

### MCP 서버 제한 사항 (v2.1.153+)

v2.1.153부터 메인 세션에 적용되는 MCP 제한이 서브에이전트 frontmatter에 선언된 서버에도 적용됩니다.

- `--strict-mcp-config` 및 `--bare`
- 엔터프라이즈 관리형 MCP 구성
- `allowedMcpServers` 및 `deniedMcpServers` 정책

이 제한들 중 하나가 서버를 차단하면 Claude Code는 해당 서버를 건너뛰고 차단된 서버 이름을 경고로 표시합니다.

**관리 설정 제한**은 서브에이전트가 어떻게 정의되었는지와 관계없이 모든 서브에이전트에 적용됩니다.

**예외**: `--strict-mcp-config`는 `--agents` 또는 SDK `agents` 옵션을 통해 인라인으로 전달된 서버는 필터링하지 않습니다. 이들은 명시적인 호출자 입력으로 간주되기 때문입니다.

---

## 권한 모드

`permissionMode` 필드는 서브에이전트가 권한 프롬프트를 처리하는 방식을 제어합니다. 서브에이전트는 메인 대화의 권한 컨텍스트를 상속하며 모드를 오버라이드할 수 있습니다.

| 모드 | 동작 |
|------|------|
| `default` | 프롬프트와 함께 표준 권한 확인 |
| `acceptEdits` | 작업 디렉터리 또는 `additionalDirectories` 경로의 파일 편집 및 일반 파일시스템 명령 자동 수락 |
| `auto` | 백그라운드 분류기가 명령과 보호 디렉터리 쓰기를 검토 |
| `dontAsk` | 권한 프롬프트 자동 거부 (명시적으로 허용된 도구는 여전히 작동) |
| `bypassPermissions` | 권한 프롬프트 건너뜀 |
| `plan` | Plan 모드 (읽기 전용 탐색) |

> **참고**: 부모가 `bypassPermissions` 또는 `acceptEdits`를 사용하면 이것이 우선하며 오버라이드할 수 없습니다. 부모가 `auto` 모드를 사용하면 서브에이전트도 `auto` 모드를 상속하며 frontmatter의 `permissionMode`는 무시됩니다.

---

## 스킬 프리로드

`skills` 필드를 사용하면 시작 시 서브에이전트의 컨텍스트에 스킬 콘텐츠를 주입할 수 있습니다.

```markdown
---
name: api-developer
description: Implement API endpoints following team conventions
skills:
  - api-conventions
  - error-handling-patterns
---

Implement API endpoints. Follow the conventions and patterns from the preloaded skills.
```

나열된 각 스킬의 전체 콘텐츠가 시작 시 컨텍스트에 주입됩니다. 이 필드는 프리로드할 스킬을 제어할 뿐, 서브에이전트가 접근할 수 있는 스킬을 제한하지는 않습니다. 나열되지 않은 스킬도 실행 중에 Skill 도구로 호출할 수 있습니다.

---

## 영구 메모리

`memory` 필드는 서브에이전트에 세션 간에 유지되는 디렉터리를 부여합니다. 서브에이전트는 이 디렉터리를 사용하여 시간이 지남에 따라 지식을 축적합니다.

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
memory: user
---

You are a code reviewer. As you review code, update your agent memory with
patterns, conventions, and recurring issues you discover.
```

| 스코프 | 위치 | 사용 시기 |
|--------|------|-----------|
| `user` | `~/.claude/agent-memory/<name-of-agent>/` | 모든 프로젝트에 걸쳐 학습 내용을 기억해야 할 때 |
| `project` | `.claude/agent-memory/<name-of-agent>/` | 프로젝트 특화 지식, 버전 관리로 공유 가능 |
| `local` | `.claude/agent-memory-local/<name-of-agent>/` | 프로젝트 특화지만 버전 관리에 체크인하지 않을 때 |

메모리가 활성화되면:
- 서브에이전트의 시스템 프롬프트에 메모리 디렉터리 읽기/쓰기 지침이 포함됨
- 메모리 디렉터리의 `MEMORY.md` 첫 200줄 또는 25KB(먼저 도달하는 쪽)가 시스템 프롬프트에 포함됨
- Read, Write, Edit 도구가 자동으로 활성화되어 메모리 파일 관리 가능

---

## Isolation (Worktree) 모드

`isolation` 필드를 `worktree`로 설정하면 서브에이전트가 임시 git worktree에서 실행됩니다. 이것은 부모 세션의 `HEAD`가 아닌 기본 브랜치에서 브랜치된 저장소의 격리된 사본을 서브에이전트에 제공합니다.

```markdown
---
name: safe-experimenter
description: Experiments with changes in isolation
isolation: worktree
tools: Read, Edit, Write, Bash
---
```

서브에이전트가 변경사항을 만들지 않으면 worktree는 자동으로 정리됩니다. 변경사항이 있는 경우 worktree가 유지됩니다.

---

## Hooks로 조건부 제어

### 서브에이전트 Frontmatter의 Hooks

서브에이전트의 Markdown 파일에 직접 hooks를 정의할 수 있습니다. 이 hooks는 해당 서브에이전트가 활성 상태일 때만 실행되며, 완료되면 정리됩니다.

| 이벤트 | Matcher 입력 | 실행 시점 |
|--------|-------------|-----------|
| `PreToolUse` | 도구 이름 | 서브에이전트가 도구를 사용하기 전 |
| `PostToolUse` | 도구 이름 | 서브에이전트가 도구를 사용한 후 |
| `Stop` | (없음) | 서브에이전트가 완료될 때 (런타임에 `SubagentStop`으로 변환) |

```markdown
---
name: code-reviewer
description: Review code changes with automatic linting
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-command.sh $TOOL_INPUT"
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/run-linter.sh"
---
```

### 프로젝트 레벨 서브에이전트 이벤트 Hooks

`settings.json`에서 메인 세션의 서브에이전트 라이프사이클 이벤트에 응답하는 hooks를 구성할 수 있습니다.

| 이벤트 | Matcher 입력 | 실행 시점 |
|--------|-------------|-----------|
| `SubagentStart` | 에이전트 타입 이름 | 서브에이전트가 실행을 시작할 때 |
| `SubagentStop` | 에이전트 타입 이름 | 서브에이전트가 완료될 때 |

```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "db-agent",
        "hooks": [
          { "type": "command", "command": "./scripts/setup-db-connection.sh" }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          { "type": "command", "command": "./scripts/cleanup-db-connection.sh" }
        ]
      }
    ]
  }
}
```

---

## CLI를 통한 동적 정의

CLI를 통해 JSON 형식으로 서브에이전트를 동적으로 정의할 수 있습니다. `--agents` 플래그를 사용합니다. CLI 정의 서브에이전트는 해당 세션에만 존재하며 디스크에 저장되지 않습니다.

**macOS / Linux / WSL:**

```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer. Use proactively after code changes.",
    "prompt": "You are a senior code reviewer. Focus on code quality, security, and best practices.",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  },
  "debugger": {
    "description": "Debugging specialist for errors and test failures.",
    "prompt": "You are an expert debugger. Analyze errors, identify root causes, and provide fixes."
  }
}'
```

`--agents` 플래그는 파일 기반 서브에이전트와 동일한 frontmatter 필드를 JSON으로 받습니다: `description`, `prompt`, `tools`, `disallowedTools`, `model`, `permissionMode`, `mcpServers`, `hooks`, `maxTurns`, `skills`, `initialPrompt`, `memory`, `effort`, `background`, `isolation`, `color`. `prompt` 필드는 시스템 프롬프트 역할을 하며 파일 기반 서브에이전트의 markdown 본문과 동일합니다.

**Managed 서브에이전트**는 조직 관리자가 배포합니다. managed settings 디렉터리 내의 `.claude/agents/`에 마크다운 파일을 배치하며, 프로젝트 및 사용자 서브에이전트와 동일한 frontmatter 형식을 사용합니다. 같은 이름의 프로젝트/사용자 서브에이전트보다 우선합니다.

**플러그인 서브에이전트**는 설치된 플러그인에서 제공됩니다. `/agents`에 커스텀 서브에이전트와 함께 나타납니다.

> **참고**: 모든 스코프의 서브에이전트 정의는 에이전트 팀에서도 사용할 수 있습니다. 팀원을 스폰할 때 서브에이전트 타입을 참조하면 팀원이 해당 `tools`와 `model`을 사용하며, 정의의 본문이 팀원의 시스템 프롬프트에 추가 지침으로 덧붙여집니다.

---

## 특정 서브에이전트 비활성화

Claude가 특정 서브에이전트를 사용하지 못하도록 설정의 `deny` 배열에 추가할 수 있습니다. `Agent(subagent-name)` 형식을 사용합니다.

```json
{
  "permissions": {
    "deny": ["Agent(Explore)", "Agent(my-custom-agent)"]
  }
}
```

빌트인 및 커스텀 서브에이전트 모두에 작동합니다. CLI 플래그로도 가능합니다:

```bash
claude --disallowedTools "Agent(Explore)"
```

---

## 명시적 서브에이전트 호출

자동 위임만으로 충분하지 않을 때 세 가지 패턴으로 직접 요청할 수 있습니다.

### 자연어 / @-멘션 / 세션 전체

| 패턴 | 방법 | 보장 수준 |
|------|------|-----------|
| 자연어 | 서브에이전트 이름을 프롬프트에 언급 | Claude가 위임 여부 결정 |
| @-멘션 | `@` 입력 후 타입어헤드에서 선택, 또는 `@agent-<name>` 수동 입력 | 특정 서브에이전트 실행 보장 |
| 세션 전체 | `claude --agent <name>` 또는 `.claude/settings.json`에 `agent` 설정 | 전체 세션이 해당 서브에이전트로 실행 |

@-멘션 시 전체 메시지는 Claude에게 전달되며, Claude가 서브에이전트의 작업 프롬프트를 작성합니다. 플러그인 서브에이전트는 스코프된 이름으로 나타납니다: `my-plugin:code-reviewer`.

```bash
# 세션 전체 실행
claude --agent code-reviewer
claude --agent my-plugin:security-reviewer     # 플러그인 충돌 시 스코프 이름
claude --agent my-plugin:review:security       # 하위 폴더 포함
```

`--agent` 시 서브에이전트의 시스템 프롬프트가 Claude Code 기본 시스템 프롬프트를 완전히 대체합니다(`--system-prompt`와 동일). CLAUDE.md와 프로젝트 메모리는 정상 로드됩니다. 세션 재개 시에도 유지됩니다.

settings.json 기본값:

```json
{ "agent": "code-reviewer" }
```

CLI 플래그가 설정보다 우선합니다.

---

## 서브에이전트 작업 패턴

| 패턴 | 설명 |
|------|------|
| 대용량 출력 격리 | 테스트 실행, 문서 가져오기 등 장황한 출력을 서브에이전트 컨텍스트에 격리. 요약만 메인에 반환 |
| 병렬 리서치 | 독립적인 조사를 여러 서브에이전트로 동시에 수행. 지속적인 병렬 처리가 필요하면 Agent Teams 사용 |
| 체이닝 | 다단계 워크플로우를 서브에이전트 순차 연결로 처리. 각 단계의 결과가 다음 단계로 전달 |

| 메인 대화 사용 | 서브에이전트 사용 |
|----------------|-------------------|
| 잦은 피드백/반복 정제 필요 | 장황한 출력이 메인 컨텍스트에 불필요 |
| 여러 단계가 컨텍스트 공유 | 도구 제한이나 권한 강제 필요 |
| 빠르고 타겟팅된 변경 | 독립적이고 요약으로 반환 가능 |
| 지연 시간이 중요 | — |

---

## 시작 시 로드되는 항목

각 서브에이전트는 깨끗하고 격리된 컨텍스트 윈도우로 시작합니다. 대화 기록, 이미 호출한 스킬, Claude가 이미 읽은 파일을 볼 수 없습니다. Claude는 작업을 요약하는 위임 메시지를 작성하고, 서브에이전트는 그 메시지를 기반으로 작업합니다. 예외는 fork이며, fork는 새로 시작하는 대신 부모 대화를 상속합니다.

Non-fork 서브에이전트의 초기 컨텍스트:

| 항목 | 설명 | Explore/Plan 제외 |
|------|------|-------------------|
| 시스템 프롬프트 | 에이전트 자체 프롬프트 + 환경 세부정보 (Claude Code 전체 시스템 프롬프트가 아님) | 아니오 |
| 작업 메시지 | Claude가 작성한 위임 프롬프트 | 아니오 |
| CLAUDE.md 및 메모리 | `~/.claude/CLAUDE.md`, 프로젝트 규칙, `CLAUDE.local.md`, 관리 정책 파일 | **예** |
| Git 상태 | 부모 세션 시작 시점 스냅샷. Git 저장소가 아니거나 `includeGitInstructions`가 `false`면 제외 | **예** |
| 프리로드된 스킬 | `skills` 필드에 명명된 스킬의 전체 콘텐츠. 빌트인 에이전트는 미프리로드 | 아니오 |

Explore와 Plan은 CLAUDE.md와 git status를 생략하는 유일한 서브에이전트입니다. 이 동작을 변경하는 설정은 없습니다.

> **참고**: 메인 대화는 Explore/Plan의 결과를 전체 CLAUDE.md 컨텍스트와 함께 읽으므로 대부분의 규칙은 서브에이전트 자체에 도달할 필요가 없습니다. 규칙을 반드시 전달해야 하는 경우(예: "`vendor/` 디렉터리는 무시") 위임 프롬프트에 직접 명시하세요.

---

## 포그라운드와 백그라운드 실행

서브에이전트는 포그라운드(블로킹) 또는 백그라운드(동시 실행)로 실행할 수 있습니다.

| 모드 | 동작 |
|------|------|
| **포그라운드** | 메인 대화를 완료될 때까지 차단. 권한 프롬프트가 사용자에게 전달됨 |
| **백그라운드** | 작업을 계속하면서 동시에 실행. 이미 부여된 권한으로 실행되며 프롬프트가 필요한 도구 호출은 자동 거부됨 |

백그라운드 서브에이전트가 권한 부족으로 실패하면, 동일한 작업으로 새로운 포그라운드 서브에이전트를 시작하여 대화형 프롬프트로 재시도할 수 있습니다.

수동 제어:
- Claude에게 "백그라운드에서 실행해"라고 요청
- 실행 중인 작업에 **Ctrl+B**를 눌러 백그라운드로 전환

`CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` 환경 변수를 `1`로 설정하면 모든 백그라운드 작업 기능을 비활성화할 수 있습니다.

---

## 서브에이전트 재개

각 서브에이전트 호출은 새로운 컨텍스트의 새로운 인스턴스를 생성합니다. 기존 서브에이전트를 재개하면 전체 대화 기록(도구 호출, 결과, 추론)을 유지한 채 정확히 중단한 지점에서 이어서 작업합니다.

> **중요**: 재개에는 `SendMessage` 도구가 필요하며, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 환경 변수로 에이전트 팀을 활성화해야 사용할 수 있습니다.

```
code-reviewer 서브에이전트로 인증 모듈을 리뷰하세요
[에이전트 완료]
그 코드 리뷰를 이어서 인가 로직도 분석하세요
[Claude가 이전 컨텍스트를 가진 서브에이전트를 재개]
```

중단된 서브에이전트가 `SendMessage`를 수신하면 새로운 `Agent` 호출 없이 백그라운드에서 자동 재개됩니다.

에이전트 ID는 Claude에게 요청하거나 `~/.claude/projects/{project}/{sessionId}/subagents/` 경로의 트랜스크립트(`agent-{agentId}.jsonl`)에서 확인할 수 있습니다. 트랜스크립트는 메인 대화 압축과 무관하게 유지되며 `cleanupPeriodDays`(기본 30일) 후 자동 정리됩니다.

### 자동 압축 (Auto-compaction)

기본적으로 약 95% 용량에서 자동 압축이 트리거됩니다. 더 일찍 트리거하려면 `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`를 낮은 백분율(예: `50`)로 설정하세요. 압축 이벤트는 트랜스크립트에 `compact_boundary` 항목으로 기록됩니다.

---

## 대화 Fork

Fork는 전체 대화를 상속하는 서브에이전트로, 일반 서브에이전트의 입력 격리 대신 메인 세션과 동일한 시스템 프롬프트, 도구, 모델, 메시지 기록을 볼 수 있습니다. Fork의 도구 호출은 메인 컨텍스트에 남지 않으며 결과만 반환됩니다.

`CLAUDE_CODE_FORK_SUBAGENT` 설정 시:
- Claude가 general-purpose 서브에이전트 대신 fork를 스폰 (Explore 등 네임드 서브에이전트는 기존과 동일)
- 모든 서브에이전트 스폰이 백그라운드에서 실행

직접 fork: `/fork draft unit tests for the parser changes so far`

| 항목 | Fork | 네임드 서브에이전트 |
|------|------|---------------------|
| 컨텍스트 | 전체 대화 기록 | 전달된 프롬프트만으로 새로운 컨텍스트 |
| 시스템 프롬프트/도구 | 메인 세션과 동일 | 서브에이전트 정의 파일에서 가져옴 |
| 모델 | 메인 세션과 동일 | 서브에이전트의 `model` 필드에서 가져옴 |
| 권한 | 터미널에 프롬프트 표시 | 백그라운드 실행 시 자동 거부 |
| 프롬프트 캐시 | 메인 세션과 공유 | 별도 캐시 |

Fork는 부모와 동일한 시스템 프롬프트와 도구 정의를 가지므로 첫 요청이 부모의 프롬프트 캐시를 재사용합니다. 이로 인해 동일한 컨텍스트가 필요한 작업에서는 새 서브에이전트 스폰보다 저렴합니다. Fork는 재귀 불가(중첩 fork 금지)합니다.

---

## 서브에이전트 제약사항

> **중요**: 서브에이전트는 다른 서브에이전트를 생성할 수 **없습니다**.

이 제한은 무한 중첩(Infinite Nesting)을 방지하기 위해 존재합니다. 서브에이전트는 1단계까지만 허용됩니다.

```
메인 대화 → 서브에이전트 (가능)
서브에이전트 → 또 다른 서브에이전트 (불가능)
```

---

## 실전 예시

### 코드 리뷰어 (읽기 전용)

```markdown
---
name: code-reviewer
description: Expert code review specialist. Proactively reviews code for quality, security, and maintainability. Use immediately after writing or modifying code.
tools: Read, Grep, Glob, Bash
model: inherit
---

You are a senior code reviewer. Run git diff, focus on modified files,
review for: readability, naming, duplication, error handling, secrets exposure,
input validation, test coverage, performance. Report by priority: critical/warning/suggestion.
```

### 디버거 (수정 가능)

```markdown
---
name: debugger
description: Debugging specialist for errors, test failures, and unexpected behavior. Use proactively when encountering any issues.
tools: Read, Edit, Bash, Grep, Glob
---

You are an expert debugger. Capture error + stack trace, identify reproduction steps,
isolate failure location, implement minimal fix, verify solution.
Provide: root cause, evidence, code fix, testing approach, prevention.
```

### 데이터 과학자

`model: sonnet`으로 더 강력한 분석을 수행하는 도메인 특화 서브에이전트입니다.

```markdown
---
name: data-scientist
description: Data analysis expert for SQL queries, BigQuery operations, and data insights. Use proactively for data analysis tasks and queries.
tools: Bash, Read, Write
model: sonnet
---

You are a data scientist specializing in SQL and BigQuery analysis.
Write optimized queries, use BigQuery CLI tools (bq), and present data-driven recommendations.
```

### DB 쿼리 검증기

`PreToolUse` hook으로 쓰기 작업을 차단하는 읽기 전용 서브에이전트입니다.

```markdown
---
name: db-reader
description: Execute read-only database queries. Use when analyzing data or generating reports.
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly-query.sh"
---

You are a database analyst with read-only access. Execute SELECT queries only.
```

검증 스크립트는 stdin으로 JSON을 받아 `tool_input.command`에서 SQL 쓰기 작업(INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE)을 감지하고 exit code 2로 차단합니다.

---

## 서브에이전트 모범 사례

| 사례 | 설명 |
|------|------|
| Claude로 초기 생성 후 반복 개선 | Claude를 통해 서브에이전트를 생성하고 개인화하며 발전 |
| 단일 책임 원칙 | 한 가지 일만 하는 집중된 서브에이전트 생성 |
| 상세한 프롬프트 | 구체적인 지침, 예시, 제약사항을 시스템 프롬프트에 포함 |
| 도구 접근 최소화 | 목적에 필요한 도구만 부여하여 보안 강화 |
| 버전 관리 | 프로젝트 서브에이전트를 버전 관리에 체크인하여 팀 공유 |
| 서브에이전트 체이닝 | 복잡한 워크플로우는 여러 서브에이전트를 순차 연결 |

| 성능 항목 | 설명 |
|-----------|------|
| 컨텍스트 효율성 | 메인 컨텍스트를 보존하여 더 긴 세션 가능 |
| 지연 시간 | 매번 깨끗한 상태에서 시작하므로 컨텍스트 수집에 지연 추가 |

---
---

# Agent Teams

## Agent Teams 개요

Agent Teams는 여러 Claude Code 인스턴스가 함께 작동하도록 조정하는 기능입니다. 하나의 세션이 **팀 리드** 역할을 하여 작업을 조정하고, 작업을 할당하며, 결과를 종합합니다. 팀원들은 각자 자신의 컨텍스트 윈도우에서 독립적으로 작업하며 서로 직접 소통합니다.

서브에이전트는 단일 세션 내에서 실행되며 메인 에이전트에게만 결과를 보고하는 반면, Agent Teams에서는 리드를 거치지 않고 개별 팀원과 직접 상호작용할 수 있습니다.

### 서브에이전트 vs Agent Teams 비교

| 항목 | 서브에이전트 | Agent Teams |
|------|-------------|-------------|
| **컨텍스트** | 자체 컨텍스트 윈도우; 결과를 호출자에게 반환 | 자체 컨텍스트 윈도우; 완전히 독립적 |
| **통신** | 메인 에이전트에게만 결과 보고 | 팀원 간 직접 메시지 |
| **조정** | 메인 에이전트가 모든 작업 관리 | 공유 태스크 리스트로 자체 조정 |
| **적합한 경우** | 결과만 중요한 집중 작업 | 논의와 협업이 필요한 복잡한 작업 |
| **토큰 비용** | 낮음: 결과가 메인 컨텍스트로 요약됨 | 높음: 각 팀원이 별도의 Claude 인스턴스 |

Agent Teams가 가장 효과적인 경우:
- **리서치 및 리뷰**: 여러 팀원이 문제의 다른 측면을 동시에 조사
- **새 모듈/기능**: 각 팀원이 서로 다른 부분을 독립적으로 담당
- **경쟁 가설 디버깅**: 팀원들이 서로 다른 이론을 병렬로 테스트
- **크로스 레이어 조정**: 프론트엔드, 백엔드, 테스트를 각각 다른 팀원이 담당

> **주의**: Agent Teams는 조정 오버헤드가 추가되며 단일 세션보다 훨씬 많은 토큰을 사용합니다. 순차 작업, 동일 파일 편집, 의존성이 많은 작업에는 단일 세션 또는 서브에이전트가 더 효과적입니다.

---

## Agent Teams 활성화

Agent Teams는 기본적으로 비활성화되어 있습니다. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` 환경 변수를 `1`로 설정하여 활성화합니다.

**셸 환경변수:**

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

**settings.json을 통한 설정:**

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

---

## Agent Teams 시작하기

활성화 후 Claude에게 자연어로 Agent Team을 생성하라고 요청합니다. 작업과 팀 구조를 설명하면 Claude가 팀을 생성하고 팀원을 스폰하여 작업을 조정합니다.

```
코드베이스에서 TODO 주석을 추적하는 CLI 도구를 설계 중입니다.
Agent Team을 만들어 서로 다른 각도에서 탐색해주세요:
UX, 기술 아키텍처, 반대 의견(Devil's advocate) 각각 한 명씩.
```

Claude가 공유 태스크 리스트가 있는 팀을 생성하고, 각 관점에 대한 팀원을 스폰하여 탐색을 수행한 뒤 결과를 종합합니다.

리드의 터미널에 모든 팀원과 작업 내용이 나열됩니다. **Shift+Down**으로 팀원 간을 순환하며 직접 메시지를 보낼 수 있습니다. 마지막 팀원 다음에는 리드로 돌아갑니다.

---

## Agent Teams 제어

리드에게 자연어로 원하는 것을 말하면 팀 조정, 작업 할당, 위임을 처리합니다.

### 디스플레이 모드 선택

| 모드 | 설명 |
|------|------|
| **in-process** | 모든 팀원이 메인 터미널 내에서 실행. Shift+Down으로 순환. 추가 설정 없이 모든 터미널에서 작동 |
| **split panes** | 각 팀원이 별도의 pane을 가짐. 모든 출력을 동시에 보고 pane을 클릭하여 직접 상호작용. tmux 또는 iTerm2 필요 |

기본값은 `"auto"`로, tmux 세션 내부에서 실행 중이면 split panes을 사용하고 그렇지 않으면 in-process를 사용합니다.

**settings.json 설정:**

```json
{
  "teammateMode": "in-process"
}
```

**단일 세션 플래그:**

```bash
claude --teammate-mode in-process
```

Split-pane 모드에는 tmux 또는 iTerm2(`it2` CLI)가 필요합니다:
- **tmux**: 시스템 패키지 매니저로 설치
- **iTerm2**: `it2` CLI 설치 후 __iTerm2 -> Settings -> General -> Magic -> Enable Python API__ 활성화

### 팀원 및 모델 지정

Claude가 작업에 따라 팀원 수를 결정하거나, 직접 지정할 수 있습니다:

```
4명의 팀원으로 팀을 만들어 이 모듈들을 병렬로 리팩토링하세요.
각 팀원에 Sonnet 모델을 사용하세요.
```

팀원은 기본적으로 리드의 `/model` 선택을 상속하지 **않습니다**. 프롬프트에 모델을 지정하지 않았을 때 사용할 기본 모델을 변경하려면 `/config`에서 __Default teammate model__을 설정하세요. __Default (leader's model)__을 선택하면 팀원이 리드의 현재 모델을 따릅니다.

### Plan Approval 요구

복잡하거나 위험한 작업의 경우 팀원에게 구현 전 계획을 수립하도록 요구할 수 있습니다. 팀원은 plan mode에서 읽기 전용으로 작업하며 리드가 접근 방식을 승인할 때까지 대기합니다:

```
인증 모듈 리팩토링을 위해 아키텍트 팀원을 스폰하세요.
변경 사항을 만들기 전에 plan approval을 요구하세요.
```

팀원이 계획을 완료하면 리드에게 plan approval request를 보냅니다. 리드는 계획을 검토하고 승인하거나 피드백과 함께 거부할 수 있습니다. 거부되면 팀원은 plan mode에 머물며 피드백을 반영하여 재제출합니다. 승인되면 plan mode를 종료하고 구현을 시작합니다.

리드는 자율적으로 승인 결정을 내립니다. 리드의 판단에 영향을 주려면 프롬프트에 기준을 제시하세요(예: "테스트 커버리지가 포함된 계획만 승인하세요").

### 팀원과 직접 대화

각 팀원은 완전히 독립적인 Claude Code 세션입니다. 추가 지시, 후속 질문, 접근 방식 변경을 위해 직접 메시지를 보낼 수 있습니다.

- **in-process 모드**: Shift+Down으로 팀원 순환 후 타이핑. Enter로 팀원 세션 보기, Escape로 현재 턴 중단. Ctrl+T로 태스크 리스트 토글.
- **split-pane 모드**: 팀원 pane을 클릭하여 직접 상호작용.

### 작업 할당 및 클레임

공유 태스크 리스트가 팀 전체의 작업을 조정합니다. 리드가 작업을 생성하고 팀원이 작업을 수행합니다.

| 상태 | 설명 |
|------|------|
| `pending` | 아직 시작되지 않음 |
| `in progress` | 작업 중 |
| `completed` | 완료됨 |

작업은 다른 작업에 의존할 수 있습니다. 의존성이 해결되지 않은 pending 작업은 의존하는 작업이 완료될 때까지 클레임할 수 없습니다.

할당 방식:
- **리드 할당**: 리드에게 어떤 작업을 어떤 팀원에게 줄지 지시
- **자체 클레임**: 작업 완료 후 팀원이 스스로 다음 미할당, 미차단 작업을 선택

태스크 클레임은 파일 잠금을 사용하여 여러 팀원이 동시에 같은 작업을 클레임하는 경쟁 조건을 방지합니다.

### 팀원 종료

```
researcher 팀원에게 종료를 요청하세요
```

리드가 shutdown request를 보냅니다. 팀원은 승인(정상 종료)하거나 이유와 함께 거부할 수 있습니다.

### 팀 정리

작업이 끝나면 리드에게 정리를 요청하세요. 공유 팀 리소스가 제거됩니다. 정리 시 활성 팀원이 있으면 실패하므로 먼저 팀원을 종료하세요.

### Hooks로 품질 게이트 강제

Agent Teams에서 다음 hook 이벤트를 사용하여 팀원이 작업을 마치거나 태스크가 생성/완료될 때 규칙을 강제할 수 있습니다:

| 이벤트 | Matcher 입력 | 실행 시점 | 동작 |
|--------|-------------|-----------|------|
| `TeammateIdle` | (팀원) | 팀원이 idle 상태가 되려 할 때 | exit code 2로 피드백을 보내고 팀원을 계속 작동시킴 |
| `TaskCreated` | (태스크) | 태스크가 생성될 때 | exit code 2로 생성을 차단하고 피드백 전송 |
| `TaskCompleted` | (태스크) | 태스크가 완료로 표시될 때 | exit code 2로 완료를 차단하고 피드백 전송 |

---

## Agent Teams 작동 방식

### 시작 흐름

| 시작 방식 | 설명 |
|-----------|------|
| **사용자 요청** | 병렬 작업이 유익한 작업을 주며 Agent Team을 명시적으로 요청 |
| **Claude 제안** | Claude가 작업이 병렬 작업에 적합하다고 판단하여 팀 생성 제안 |

두 경우 모두 Claude가 승인 없이 팀을 만들지 않습니다.

### 아키텍처

| 구성 요소 | 역할 |
|-----------|------|
| **Team lead** | 팀을 생성하고 팀원을 스폰하며 작업을 조정하는 메인 Claude Code 세션 |
| **Teammates** | 할당된 작업을 수행하는 별도의 Claude Code 인스턴스 |
| **Task list** | 팀원이 클레임하고 완료하는 공유 작업 항목 목록 |
| **Mailbox** | 에이전트 간 통신을 위한 메시징 시스템 |

**저장 위치:**

| 항목 | 경로 |
|------|------|
| 팀 설정 | `~/.claude/teams/{team-name}/config.json` |
| 태스크 리스트 | `~/.claude/tasks/{team-name}/` |

Claude Code가 팀 생성 시 이 파일들을 자동으로 생성하고 업데이트합니다. 팀 설정에는 세션 ID, tmux pane ID 같은 런타임 상태가 포함되므로 수동 편집하지 마세요.

팀 설정의 `members` 배열에는 각 팀원의 `name`, `agent ID`, `agent type`이 포함됩니다. 팀원은 이 파일을 읽어 다른 팀원을 발견할 수 있습니다.

> **참고**: 프로젝트 레벨의 팀 설정 파일(예: `.claude/teams/teams.json`)은 인식되지 않습니다. Claude는 이를 일반 파일로 취급합니다. 재사용 가능한 팀원 역할을 정의하려면 서브에이전트 정의를 사용하세요.

### 권한

팀원은 리드의 권한 설정으로 시작합니다. 리드가 `--dangerously-skip-permissions`로 실행 중이면 모든 팀원도 동일합니다. 스폰 후 개별 팀원의 모드를 변경할 수 있지만, 스폰 시점에 팀원별 모드를 설정할 수는 없습니다.

### 컨텍스트 및 통신

각 팀원은 자체 컨텍스트 윈도우를 가집니다. 스폰 시 프로젝트 컨텍스트(CLAUDE.md, MCP 서버, 스킬)를 일반 세션과 동일하게 로드합니다. 리드의 대화 기록은 전달되지 않습니다.

**정보 공유 방식:**

| 방식 | 설명 |
|------|------|
| 자동 메시지 전달 | 팀원이 메시지를 보내면 수신자에게 자동 전달. 리드가 폴링할 필요 없음 |
| Idle 알림 | 팀원이 작업을 마치고 멈추면 리드에게 자동으로 알림 |
| 공유 태스크 리스트 | 모든 에이전트가 태스크 상태를 보고 사용 가능한 작업을 클레임 |
| 팀원 메시징 | 이름으로 특정 팀원에게 메시지 전송. 전체에게 알리려면 수신자별로 개별 메시지 필요 |

리드는 스폰 시 각 팀원에 이름을 할당하며, 팀원은 이름으로 서로 메시지를 보낼 수 있습니다.

### 토큰 사용량

Agent Teams는 단일 세션보다 훨씬 많은 토큰을 사용합니다. 각 팀원이 자체 컨텍스트 윈도우를 가지며, 토큰 사용량은 활성 팀원 수에 비례합니다.

| 작업 유형 | 권장 사항 |
|-----------|-----------|
| 리서치, 리뷰, 새 기능 | 추가 토큰 비용이 일반적으로 가치 있음 |
| 루틴 작업 | 단일 세션이 더 비용 효율적 |

---

## 서브에이전트 정의를 팀원으로 활용

팀원을 스폰할 때 서브에이전트 타입(project, user, plugin, CLI-defined)을 참조할 수 있습니다. 이를 통해 `security-reviewer`나 `test-runner` 같은 역할을 한 번 정의하고, 위임된 서브에이전트와 에이전트 팀 팀원 양쪽에서 재사용할 수 있습니다.

```
security-reviewer 에이전트 타입을 사용하여 팀원을 스폰하고 auth 모듈을 감사하세요.
```

팀원은 해당 정의의 `tools` 허용 목록과 `model`을 준수합니다. 정의의 본문이 팀원의 시스템 프롬프트에 추가 지침으로 덧붙여집니다(대체가 아님). `SendMessage`와 태스크 관리 도구 같은 팀 조정 도구는 `tools`가 다른 도구를 제한하더라도 항상 사용 가능합니다.

---

## Agent Teams 사용 사례

### 병렬 코드 리뷰

```
PR #142를 리뷰하기 위한 Agent Team을 만드세요. 세 명의 리뷰어를 스폰하세요:
- 보안 영향에 집중하는 한 명
- 성능 영향을 확인하는 한 명
- 테스트 커버리지를 검증하는 한 명
각자 리뷰하고 결과를 보고하게 하세요.
```

각 리뷰어가 같은 PR에서 다른 필터를 적용합니다. 리드가 세 명의 결과를 종합합니다.

### 경쟁 가설로 조사

```
사용자들이 앱이 한 메시지 후 연결을 끊는다고 보고합니다.
5명의 팀원을 스폰하여 서로 다른 가설을 조사하게 하세요.
서로의 이론을 반박하려 과학적 토론처럼 대화하게 하세요.
합의가 형성되면 findings 문서를 업데이트하세요.
```

순차 조사는 한 이론이 탐색되면 후속 조사가 편향되는 문제(anchoring)가 있습니다. 여러 독립적인 조사자가 서로의 이론을 적극적으로 반박하면, 살아남는 이론이 실제 원인일 가능성이 훨씬 높아집니다.

---

## Agent Teams 모범 사례

| 사례 | 설명 |
|------|------|
| 충분한 컨텍스트 제공 | 스폰 프롬프트에 작업 특정 세부사항 포함. 리드의 대화 기록은 상속되지 않음 |
| 3-5명 팀원으로 시작 | 팀원당 5-6개 태스크가 적절. 15개 독립 태스크면 3명이 좋은 시작점 |
| 태스크 크기 적절히 설정 | 함수/테스트 파일/리뷰 같은 자완결 단위가 적합. 너무 작으면 오버헤드, 너무 크면 낭비 위험 |
| 팀원 완료 대기 | 리드가 직접 구현을 시작하면 "팀원들이 작업을 완료할 때까지 기다린 후 진행하세요"라고 지시 |
| 리서치/리뷰로 시작 | 처음이라면 코드 작성 없는 작업(PR 리뷰, 리서치, 버그 조사)부터 시작 |
| 파일 충돌 방지 | 각 팀원이 서로 다른 파일 세트를 담당하도록 분할 |
| 모니터링 및 조정 | 진행 상황을 확인하고, 작동하지 않는 접근은 리디렉트 |

---

## Agent Teams 트러블슈팅

| 문제 | 해결 방법 |
|------|-----------|
| 팀원이 보이지 않음 | in-process: Shift+Down로 순환. 작업이 충분히 복잡한지 확인. split panes: tmux/iTerm2 설치 확인 |
| 권한 프롬프트 과다 | 스폰 전 공통 작업을 권한 설정에서 미리 승인 |
| 팀원이 에러로 중지 | Shift+Down 또는 pane 클릭으로 확인 후 추가 지시 또는 대체 팀원 스폰 |
| 리드가 조기 종료 | "계속 진행하세요"라고 지시 |
| 고아 tmux 세션 | `tmux ls` 확인 후 `tmux kill-session -t <name>`으로 정리 |

---

## Agent Teams 제한사항

Agent Teams는 **실험적 기능**입니다. 현재 알려진 제한사항:

| 제한 | 설명 |
|------|------|
| in-process 팀원의 세션 재개 불가 | `/resume`과 `/rewind`가 in-process 팀원을 복원하지 못함. 재개 후 리드가 존재하지 않는 팀원에게 메시지를 보낼 수 있음 |
| 태스크 상태 지연 | 팀원이 태스크를 완료로 표시하지 않아 의존 태스크가 차단될 수 있음. 수동으로 상태를 업데이트하거나 리드에게 팀원에게 알림을 보내라고 지시 |
| 종료가 느릴 수 있음 | 팀원이 현재 요청이나 도구 호출을 완료한 후 종료되므로 시간이 걸릴 수 있음 |
| 한 번에 한 팀 | 리드는 하나의 팀만 관리 가능. 새 팀을 만들려면 먼저 현재 팀을 정리 |
| 중첩 팀 불가 | 팀원은 자체 팀이나 팀원을 스폰할 수 없음 |
| 리드 고정 | 팀을 생성한 세션이 리드. 팀원을 리드로 승격하거나 리더십을 이전할 수 없음 |
| 스폰 시 권한 설정 | 모든 팀원이 리드의 권한 모드로 시작. 스폰 후 개별 변경은 가능하지만 스폰 시점에 팀원별 모드 설정은 불가 |
| Split panes에 tmux/iTerm2 필요 | 기본 in-process 모드는 모든 터미널에서 작동. VS Code 통합 터미널, Windows Terminal, Ghostty에서는 split-pane 미지원 |
