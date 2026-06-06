# 05. Skills

> **참조**: [https://code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)
>
> **이전 참조**: [https://docs.anthropic.com/en/docs/claude-code/slash-commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands)

---

## 1. Skills 개요

Skills는 Claude가 할 수 있는 일을 확장합니다. `SKILL.md` 파일에 지시사항을 작성하면 Claude가 자동으로 툴킷에 추가합니다. Claude는 관련 시점에 Skills를 자동으로 사용하거나, `/skill-name`으로 직접 호출할 수 있습니다.

Skill은 다음 상황에 만들면 유용합니다:
- 동일한 지시사항, 체크리스트, 다단계 절차를 채팅에 반복해서 붙여넣을 때
- CLAUDE.md의 한 섹션이 사실이 아닌 절차로 성장했을 때

CLAUDE.md 콘텐츠와 달리 Skill의 본문은 사용할 때만 로드되므로, 긴 참조 자료는 필요할 때까지 거의 비용이 들지 않습니다.

> **참고**: 커스텀 명령어(Custom Commands)는 Skills로 통합되었습니다. `.claude/commands/deploy.md` 파일과 `.claude/skills/deploy/SKILL.md` 모두 `/deploy`를 생성하며 동일하게 동작합니다. 기존 `.claude/commands/` 파일은 계속 작동합니다. Skills는 선택적 기능을 추가합니다: 보조 파일용 디렉토리, 사용자 또는 Claude의 호출 여부를 제어하는 frontmatter, 관련 시점에 Claude가 자동 로드하는 기능.

Claude Code Skills는 **Agent Skills 개방 표준**을 따르며, 여러 AI 도구에서 공통으로 작동합니다. Claude Code는 호출 제어, 서브에이전트 실행, 동적 컨텍스트 주입 등 추가 기능으로 표준을 확장합니다.

---

## 2. Bundled Skills

Claude Code에는 모든 세션에서 사용할 수 있는 bundled skills가 포함되어 있습니다: `/code-review`, `/batch`, `/debug`, `/loop`, `/claude-api` 등. 대부분의 내장 명령어가 고정 로직을 직접 실행하는 것과 달리, bundled skills는 프롬프트 기반입니다. Claude에게 상세한 지시사항을 제공하고 도구를 사용해 작업을 오케스트레이션합니다. 다른 Skill과 동일한 방식으로 `/` 뒤에 Skill 이름을 입력하여 호출합니다.

Bundled skills는 명령어 참조에서 **Skill**으로 표시되어 나열됩니다.

### 앱 실행 및 검증

세 개의 bundled skills가 함께 작동하여 앱을 실행하고 테스트 대신 실행 중인 앱으로 변경 사항을 확인합니다.

| Skill | 용도 |
|-------|------|
| `/run` | 앱을 실행하고 변경 사항이 작동하는지 확인 |
| `/verify` | 앱을 빌드/실행하여 코드 변경이 의도대로 동작하는지 검증 (테스트나 타입 체크에 의존하지 않음) |
| `/run-skill-generator` | `/run`과 `/verify`가 프로젝트를 빌드하고 실행하는 방법을 학습하도록 설정 |

세 Skill 모두 Claude Code v2.1.145 이상이 필요합니다.

`/run`과 `/verify`는 설정 없이 작동합니다. 프로젝트 유형(CLI, server, TUI, browser-driven)과 README, `package.json`, `Makefile`의 내용에서 실행 방법을 추론합니다. 이 추론은 데이터베이스, 환경변수 파일, 그래픽 세션, 다단계 빌드 등 표준 실행을 넘어서는 프로젝트에서는 불안정해집니다.

`/run-skill-generator`는 레시피를 기록합니다. 깨끗한 환경에서 앱을 실행하고, 성공한 내용(설치 명령어, 환경변수, 실행 스크립트)을 캡처하여 `.claude/skills/run-<name>/`에 프로젝트별 Skill으로 커밋합니다. 이후 `/run`, `/verify`, 리포지토리 내 다른 에이전트가 기록된 레시피를 따릅니다. 프로젝트당 한 번, 빌드나 실행 프로세스가 변경되면 다시 실행합니다.

---

## 3. 시작하기

### 첫 Skill 만들기

이 예제는 git 저장소의 커밋되지 않은 변경 사항을 요약하고 위험한 부분을 표시하는 Skill을 만듭니다.

**1단계: Skill 디렉토리 생성**

```bash
mkdir -p ~/.claude/skills/summarize-changes
```

**2단계: SKILL.md 작성**

모든 Skill에는 두 부분으로 구성된 `SKILL.md` 파일이 필요합니다: Claude가 언제 Skill을 사용할지 알려주는 `---` 마커 사이의 YAML frontmatter와, Skill 실행 시 Claude가 따르는 마크다운 콘텐츠.

`~/.claude/skills/summarize-changes/SKILL.md`에 저장:

```markdown
---
description: Summarizes uncommitted changes and flags anything risky. Use when the user asks what changed, wants a commit message, or asks to review their diff.
---

## Current changes

!`git diff HEAD`

## Instructions

Summarize the changes above in two or three bullet points, then list any risks you notice such as missing error handling, hardcoded values, or tests that need updating. If the diff is empty, say there are no uncommitted changes.
```

`!`git diff HEAD`` 라인은 **동적 컨텍스트 주입**을 사용합니다: Claude Code가 명령어를 실행하고 Claude가 Skill 콘텐츠를 읽기 전에 출력으로 해당 라인을 교체합니다.

**3단계: Skill 테스트**

git 프로젝트를 열고 아무 파일에 작은 편집을 한 뒤 `claude`를 실행합니다.

**Claude가 자동으로 호출하게 하려면** description에 맞는 요청을 합니다:

```
What did I change?
```

**또는 직접 호출합니다:**

```
/summarize-changes
```

---

## 4. Skill 저장 위치 (Skills Scope Hierarchy)

Skill을 저장하는 위치에 따라 사용할 수 있는 대상이 결정됩니다.

| 위치 | 경로 | 적용 범위 |
|------|------|-----------|
| Enterprise | 관리 설정(Managed Settings) 참조 | 조직의 모든 사용자 |
| Personal | `~/.claude/skills/<skill-name>/SKILL.md` | 사용자의 모든 프로젝트 |
| Project | `.claude/skills/<skill-name>/SKILL.md` | 해당 프로젝트만 |
| Plugin | `<plugin>/skills/<skill-name>/SKILL.md` | Plugin이 활성화된 곳 |

이름이 같은 Skill이 여러 수준에 존재할 때, **Enterprise > Personal > Project** 순으로 우선순위가 적용됩니다. Plugin Skills는 `plugin-name:skill-name` 네임스페이스를 사용하므로 다른 수준과 충돌하지 않습니다. `.claude/commands/`에 파일이 있는 경우에도 동일하게 작동하지만, Skill과 명령어가 같은 이름을 공유하면 **Skill이 우선**합니다.

Skill 폴더에 `.claude-plugin/plugin.json`을 추가하면 `<name>@skills-dir`이라는 이름의 Plugin으로 로드되어 에이전트, 훅, MCP 서버를 번들할 수 있습니다. 프로젝트의 `.claude/skills/`에서는 워크스페이스 신뢰 대화상자 수락이 필요합니다.

### 디렉토리 구조

각 Skill은 `SKILL.md`를 엔트리포인트로 하는 디렉토리입니다:

```
my-skill/
├── SKILL.md           # 메인 지시사항 (필수)
├── template.md        # Claude가 채울 템플릿
├── examples/
│   └── sample.md      # 예상 형식의 예제 출력
└── scripts/
    └── validate.sh    # Claude가 실행할 스크립트
```

`SKILL.md`는 메인 지시사항을 포함하며 필수입니다. 다른 파일은 선택 사항이며 더 강력한 Skill을 만들 수 있습니다: Claude가 채울 템플릿, 예상 형식의 예제 출력, Claude가 실행할 스크립트, 상세 참조 문서. `SKILL.md`에서 이 파일들을 참조하면 Claude가 각 파일의 내용과 로드 시기를 알 수 있습니다.

`.claude/commands/`의 파일도 계속 작동하며 동일한 frontmatter를 지원합니다. 보조 파일 등 추가 기능을 지원하는 Skills가 권장됩니다.

### Live Change Detection

Claude Code는 Skill 디렉토리의 파일 변경을 감시합니다. `~/.claude/skills/`, 프로젝트 `.claude/skills/`, 또는 `--add-dir` 내 `.claude/skills/`에 Skill을 추가, 편집, 제거하면 **현재 세션 내에서 재시작 없이 즉시 적용**됩니다.

단, 세션 시작 시 존재하지 않았던 최상위 Skills 디렉토리를 새로 만든 경우에는 재시작이 필요합니다.

Live change detection은 `SKILL.md` 텍스트만 해당됩니다. Skill 폴더가 Plugin인 경우 `hooks/`, `.mcp.json`, `agents/`, `output-styles/`의 변경은 `/reload-plugins`가 필요합니다.

### 상위 및 하위 디렉토리 자동 탐색

프로젝트 Skills는 **시작 디렉토리**와 **리포지토리 루트까지의 모든 상위 디렉토리**에 있는 `.claude/skills/`에서 로드됩니다. 따라서 하위 디렉토리에서 Claude를 시작해도 루트에 정의된 Skills를 사용할 수 있습니다.

시작 디렉토리 아래 하위 디렉토리의 파일을 작업할 때, Claude Code는 **필요에 따라(on demand)** 중첩된 `.claude/skills/` 디렉토리의 Skills도 탐색합니다. 예를 들어 `packages/frontend/`의 파일을 편집하면 `packages/frontend/.claude/skills/`의 Skills도 검색합니다. 이는 패키지마다 자체 Skills가 있는 모노레포 설정을 지원합니다.

탐색 규칙 요약:

| 탐색 방향 | 조건 | 예시 |
|----------|------|------|
| 상위 (시작 -> 루트) | 항상 | `packages/frontend/`에서 시작 -> 루트 `.claude/skills/`까지 로드 |
| 하위 (시작 -> 중첩) | 해당 경로의 파일 작업 시 | `packages/frontend/` 파일 편집 -> `packages/frontend/.claude/skills/` 탐색 |

### 추가 디렉토리의 Skills

`--add-dir` 플래그와 `/add-dir` 명령어는 파일 접근 권한을 부여하지만 Skills는 예외입니다: 추가된 디렉토리 내의 `.claude/skills/`가 자동으로 로드됩니다. 이 예외는 `--add-dir`과 `/add-dir`에만 적용됩니다. `settings.json`의 `permissions.additionalDirectories` 설정은 파일 접근만 권한을 부여하며 Skills를 로드하지 않습니다.

다른 `.claude/` 구성(서브에이전트, 명령어, 출력 스타일)은 추가 디렉토리에서 로드되지 않습니다.

> **참고**: `--add-dir` 디렉토리의 CLAUDE.md 파일은 기본적으로 로드되지 않습니다. 이를 로드하려면 환경변수 `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`을 설정하세요.

---

## 5. Skill 구성 (Frontmatter Reference)

Skills는 `SKILL.md` 상단의 YAML frontmatter와 그 뒤의 마크다운 콘텐츠로 구성됩니다.

```yaml
---
name: my-skill
description: What this skill does
disable-model-invocation: true
allowed-tools: Read Grep
---

Your skill instructions here...
```

모든 필드는 선택 사항입니다. Claude가 Skill 사용 시기를 알 수 있도록 `description`만 권장됩니다.

| 필드 | 필수 | 설명 |
|------|------|------|
| `name` | No | Skill 목록에 표시되는 이름. 기본값은 디렉토리 이름. 명령어 이름과 다를 수 있음 (명령어 이름 규칙은 아래 참조) |
| `description` | 권장 | Skill의 기능과 사용 시기. Claude가 Skill 적용 시기를 결정하는 데 사용. 생략 시 마크다운 콘텐츠의 첫 번째 문단 사용. `description`과 `when_to_use`의 결합 텍스트는 컨텍스트 사용량을 줄이기 위해 Skill 목록에서 1,536자로 잘림 |
| `when_to_use` | No | Claude가 Skill을 호출해야 하는 추가 컨텍스트 (트리거 문구, 예제 요청 등). `description`에 추가되어 Skill 목록에 표시되며 1,536자 제한에 포함 |
| `argument-hint` | No | 자동완성 시 표시되는 예상 인자 힌트. 예: `[issue-number]`, `[filename] [format]` |
| `arguments` | No | Skill 콘텐츠에서 `$name` 치환에 사용할 명명된 위치 인자. 공백으로 구분된 문자열 또는 YAML 목록. 이름이 인자 위치에 순서대로 매핑 |
| `disable-model-invocation` | No | `true`로 설정하면 Claude가 자동으로 이 Skill을 로드하지 않음. `/name`으로 수동 트리거하는 워크플로우에 사용. 서브에이전트에도 프리로드되지 않음. 기본값: `false` |
| `user-invocable` | No | `false`로 설정하면 `/` 메뉴에서 숨김. 사용자가 직접 호출할 필요 없는 배경지식에 사용. 기본값: `true` |
| `allowed-tools` | No | Skill 활성 시 Claude가 승인 없이 사용할 수 있는 도구. 공백 또는 쉼표로 구분된 문자열, 또는 YAML 목록 |
| `disallowed-tools` | No | Skill 활성 시 Claude의 사용 가능 풀에서 제거할 도구. 자율 Skill이 특정 도구(예: `AskUserQuestion`)를 절대 호출하지 않도록 할 때 사용. 공백 또는 쉼표로 구분된 문자열, 또는 YAML 목록. 다음 메시지 전송 시 제한 해제 |
| `model` | No | Skill 활성 시 사용할 모델. 현재 턴의 나머지 기간에 적용되며 설정에 저장되지 않음. `/model`과 동일한 값 또는 `inherit`(활성 모델 유지) |
| `effort` | No | Skill 활성 시의 effort level. 세션 effort level을 오버라이드. 기본값: 세션에서 상속. 옵션: `low`, `medium`, `high`, `xhigh`, `max` (사용 가능한 수준은 모델에 따라 다름) |
| `context` | No | `fork`로 설정하면 포크된 서브에이전트 컨텍스트에서 실행 |
| `agent` | No | `context: fork` 설정 시 사용할 서브에이전트 유형 |
| `hooks` | No | Skill의 라이프사이클에 범위가 지정된 훅. Hooks in skills and agents 참조 |
| `paths` | No | Skill 활성화를 제한하는 glob 패턴. 쉼표로 구분된 문자열 또는 YAML 목록. 설정 시 일치하는 파일을 작업할 때만 Claude가 자동 로드 |
| `shell` | No | Skill의 `` !`command` `` 및 ```` ```! ```` 블록에 사용할 셸. `bash`(기본값) 또는 `powershell`. `powershell` 설정 시 Windows에서 PowerShell로 인라인 셸 명령 실행. `CLAUDE_CODE_USE_POWERSHELL_TOOL=1` 필요 |

### Skill 명령어 이름 규칙

`/` 뒤에 입력하는 명령어 이름은 Skill 파일의 위치에서 결정됩니다. frontmatter의 `name` 필드는 Skill 목록에 표시되는 라벨이며, Plugin 루트 `SKILL.md`를 제외하고는 입력하는 명령어 이름을 변경하지 않습니다.

| Skill 위치 | 명령어 이름 출처 | 예시 |
|-----------|---------------|------|
| `~/.claude/skills/` 또는 `.claude/skills/` 아래 Skill 디렉토리 | 디렉토리 이름 | `.claude/skills/deploy-staging/SKILL.md` -> `/deploy-staging` |
| `.claude/commands/` 아래 파일 | 확장자를 제외한 파일명 | `.claude/commands/deploy.md` -> `/deploy` |
| Plugin `skills/` 하위 디렉토리 | Plugin에 의해 네임스페이스된 디렉토리 이름 | `my-plugin/skills/review/SKILL.md` -> `/my-plugin:review` |
| Plugin 루트 `SKILL.md` | frontmatter `name`, 대체로 Plugin 디렉토리 이름 | `my-plugin/SKILL.md`에 `name: review` -> `/my-plugin:review` |

---

## 6. Skill 콘텐츠 유형

Skill 파일에는 어떤 지시사항이든 포함할 수 있지만, 호출 방식에 따라 내용을 구성하면 도움이 됩니다.

### 참조 콘텐츠 (Reference Content)

Claude가 현재 작업에 적용할 지식을 추가합니다. 규칙, 패턴, 스타일 가이드, 도메인 지식 등. 이 콘텐츠는 인라인으로 실행되어 대화 컨텍스트와 함께 사용할 수 있습니다.

```markdown
---
name: api-conventions
description: API design patterns for this codebase
---

When writing API endpoints:
- Use RESTful naming conventions
- Return consistent error formats
- Include request validation
```

### 작업 콘텐츠 (Task Content)

배포, 커밋, 코드 생성 등 특정 작업에 대한 단계별 지시사항을 제공합니다. 주로 `/skill-name`으로 직접 호출하는 작업에 사용합니다. Claude가 자동으로 실행하지 않도록 `disable-model-invocation: true`를 추가합니다.

```markdown
---
name: deploy
description: Deploy the application to production
context: fork
disable-model-invocation: true
---

Deploy the application:
1. Run the test suite
2. Build the application
3. Push to the deployment target
```

> **팁**: Skill 본문은 간결하게 유지하세요. Skill이 로드되면 턴 전반에 걸쳐 콘텐츠가 컨텍스트에 남아 있으므로 모든 줄이 반복적인 토큰 비용입니다. 무엇을 해야 하는지 서술하고, 방법이나 이유는 서술하지 마세요.

---

## 7. 문자열 치환 (String Substitutions)

Skills는 동적 값을 위한 문자열 치환을 지원합니다.

| 변수 | 설명 |
|------|------|
| `$ARGUMENTS` | Skill 호출 시 전달된 모든 인자. 콘텐츠에 `$ARGUMENTS`가 없으면 인자가 `ARGUMENTS: <value>`로 끝에 추가됨 |
| `$ARGUMENTS[N]` | 0부터 시작하는 인덱스로 특정 인자에 접근. 예: `$ARGUMENTS[0]`은 첫 번째 인자 |
| `$N` | `$ARGUMENTS[N]`의 약어. 예: `$0`은 첫 번째 인자, `$1`은 두 번째 인자 |
| `$name` | frontmatter `arguments` 목록에 선언된 명명된 인자. 이름이 순서대로 위치에 매핑됨. `arguments: [issue, branch]`면 `$issue`는 첫 번째 인자, `$branch`는 두 번째 인자로 확장 |
| `${CLAUDE_SESSION_ID}` | 현재 세션 ID. 로깅, 세션별 파일 생성, 세션과 Skill 출력 연관에 유용 |
| `${CLAUDE_EFFORT}` | 현재 effort level: `low`, `medium`, `high`, `xhigh`, `max`. Ultracode는 별도 수준이 아니며 `xhigh`로 보고됨 |
| `${CLAUDE_SKILL_DIR}` | Skill의 `SKILL.md` 파일이 있는 디렉토리. Plugin Skills의 경우 Plugin 루트가 아닌 Skill의 하위 디렉토리. 현재 작업 디렉토리와 관계없이 Skill에 번들된 스크립트나 파일을 참조할 때 사용 |

인덱스 인자는 셸 스타일 인용을 사용하므로, 여러 단어 값을 단일 인자로 전달하려면 따옴표로 감쌉니다. 예: `/my-skill "hello world" second`는 `$0`이 `hello world`, `$1`이 `second`로 확장됩니다.

```markdown
---
name: session-logger
description: Log activity for this session
---

Log the following to logs/${CLAUDE_SESSION_ID}.log:

$ARGUMENTS
```

---

## 8. 동적 컨텍스트 주입

`!`<command>`` 구문은 Skill 콘텐츠가 Claude에게 전송되기 전에 셸 명령을 실행합니다. 명령 출력이 플레이스홀더를 대체하므로 Claude는 명령어가 아닌 실제 데이터를 수신합니다.

```markdown
---
name: pr-summary
description: Summarize changes in a pull request
context: fork
agent: Explore
allowed-tools: Bash(gh *)
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## Your task
Summarize this pull request...
```

실행 순서:

1. 각 `` !`<command>` `` 이 즉시 실행됨 (Claude가 아무것도 보기 전)
2. 출력이 Skill 콘텐츠의 플레이스홀더를 대체
3. Claude가 실제 PR 데이터가 포함된 완전히 렌더링된 프롬프트를 수신

이것은 전처리이며 Claude가 실행하는 것이 아닙니다. Claude는 최종 결과만 봅니다.

치환은 원본 파일에 대해 한 번 실행됩니다. 명령 출력은 일반 텍스트로 삽입되며, 추가 `` !`<command>` `` 플레이스홀더를 위해 다시 스캔되지 않습니다.

멀티라인 명령에는 인라인 대신 ```` ```! ```` 로 시작하는 펜스 코드 블록을 사용합니다:

````
## Environment
```!
node --version
npm --version
git status --short
```
````

인라인 형식은 `!`가 줄의 시작이나 공백 바로 뒤에 나타날 때만 인식됩니다. `!`가 다른 문자 뒤에 오면 (예: `KEY=!`cmd``) 플레이스홀더가 리터럴 텍스트로 남고 명령이 실행되지 않습니다.

사용자, 프로젝트, Plugin, 추가 디렉토리 소스의 Skills 및 커스텀 명령어에 대해 이 동작을 비활성화하려면 설정에 `"disableSkillShellExecution": true`를 설정합니다. 각 명령은 실행 대신 `[shell command execution disabled by policy]`로 대체됩니다. Bundled 및 관리 Skills는 영향을 받지 않습니다.

> **참고**: Skill이 실행될 때 더 깊은 추론을 요청하려면, Skill 콘텐츠 어디에나 `ultrathink`를 포함하세요. 자세한 내용은 [Use ultrathink for one-off deep reasoning](https://code.claude.com/docs/en/skills)을 참조하세요.

---

## 9. 보조 파일 추가

Skills는 디렉토리에 여러 파일을 포함할 수 있습니다. `SKILL.md`는 핵심 사항에 집중하고, Claude가 필요할 때만 상세 참조 자료에 접근할 수 있습니다.

```
my-skill/
├── SKILL.md (필수 - 개요 및 탐색)
├── reference.md (상세 API 문서 - 필요시 로드)
├── examples.md (사용 예제 - 필요시 로드)
└── scripts/
    └── helper.py (유틸리티 스크립트 - 로드가 아닌 실행)
```

`SKILL.md`에서 보조 파일을 참조하면 Claude가 각 파일의 내용과 로드 시기를 알 수 있습니다:

```markdown
## Additional resources

- For complete API details, see [reference.md](reference.md)
- For usage examples, see [examples.md](examples.md)
```

`SKILL.md`는 500줄 이하로 유지하고, 상세 참조 자료는 별도 파일로 이동하세요.

---

## 10. Skill 호출 제어

기본적으로 사용자와 Claude 모두 Skill을 호출할 수 있습니다. 두 frontmatter 필드로 제한할 수 있습니다:

- **`disable-model-invocation: true`**: 사용자만 호출 가능. 배포, Slack 메시지 전송 등 부작용이 있거나 타이밍을 제어하려는 워크플로우에 사용
- **`user-invocable: false`**: Claude만 호출 가능. 사용자가 직접 실행할 필요 없는 배경지식에 사용 (예: 레거시 시스템 설명)

| Frontmatter | 사용자 호출 | Claude 호출 | 컨텍스트에 로드되는 시점 |
|-------------|-----------|-----------|---------------------|
| (기본값) | 가능 | 가능 | description은 항상 컨텍스트에 있음, 전체 Skill은 호출 시 로드 |
| `disable-model-invocation: true` | 가능 | 불가 | description이 컨텍스트에 없음, 사용자가 호출 시 전체 Skill 로드 |
| `user-invocable: false` | 불가 | 가능 | description은 항상 컨텍스트에 있음, 전체 Skill은 호출 시 로드 |

일반 세션에서는 Skill description이 컨텍스트에 로드되어 Claude가 사용 가능한 Skill을 알지만, 전체 Skill 콘텐츠는 호출 시에만 로드됩니다. 프리로드된 Skills를 가진 서브에이전트는 다르게 작동합니다: 전체 Skill 콘텐츠가 시작 시 주입됩니다.

---

## 11. Skill 콘텐츠 라이프사이클

Skill이 호출되면 렌더링된 `SKILL.md` 콘텐츠가 단일 메시지로 대화에 들어가며, 세션의 나머지 기간 동안 유지됩니다. Claude Code는 이후 턴에서 Skill 파일을 다시 읽지 않으므로, 작업 전반에 적용해야 하는 지침은 일회성 단계가 아닌 상태 지침으로 작성하세요.

자동 압축(Auto-compaction)은 토큰 예산 내에서 호출된 Skills를 앞으로 전달합니다. 대화가 요약되면 Claude Code는 각 Skill의 가장 최근 호출을 요약 뒤에 다시 첨부하며, 각각의 처음 5,000 토큰을 유지합니다. 재첨부된 Skills는 25,000 토큰의 결합 예산을 공유합니다. Claude Code는 가장 최근에 호출된 Skill부터 이 예산을 채우므로, 한 세션에서 여러 Skill을 호출하면 오래된 Skill은 압축 후 완전히 삭제될 수 있습니다.

---

## 12. 서브에이전트에서 Skill 실행

frontmatter에 `context: fork`를 추가하면 Skill이 격리된 환경에서 실행됩니다. Skill 콘텐츠가 서브에이전트를 구동하는 프롬프트가 되며, 대화 기록에 접근할 수 없습니다.

`context: fork`는 명시적인 작업 지시사항이 있는 Skill에만 적합합니다. API 규칙 같은 지침만 있는 경우 서브에이전트가 지침을 받지만 실행 가능한 프롬프트가 없어 의미 있는 출력 없이 반환됩니다.

Skills와 서브에이전트의 관계:

| 접근 방식 | 시스템 프롬프트 | 작업 | 추가 로드 |
|----------|--------------|------|---------|
| `context: fork`가 있는 Skill | 에이전트 유형에서 | SKILL.md 콘텐츠 | CLAUDE.md (에이전트가 Explore나 Plan인 경우 제외) |
| `skills` 필드가 있는 서브에이전트 | 서브에이전트의 마크다운 본문 | Claude의 위임 메시지 | 프리로드된 Skills + CLAUDE.md |

`agent` 필드는 사용할 서브에이전트 구성을 지정합니다. 옵션에는 내장 에이전트(`Explore`, `Plan`, `general-purpose`) 또는 `.claude/agents/`의 커스텀 서브에이전트가 있습니다. 생략하면 `general-purpose`를 사용합니다.

```markdown
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---

Research $ARGUMENTS thoroughly:

1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
```

---

## 13. Claude의 Skill 접근 제한

기본적으로 Claude는 `disable-model-invocation: true`가 설정되지 않은 모든 Skill을 호출할 수 있습니다. 세 가지 방법으로 제어할 수 있습니다.

**모든 Skill 비활성화**: `/permissions`에서 Skill 도구 거부:

```
# 거부 규칙에 추가:
Skill
```

**특정 Skill만 허용/거부**: 권한 규칙 사용:

```
# 특정 Skills만 허용
Skill(commit)
Skill(review-pr *)

# 특정 Skills 거부
Skill(deploy *)
```

권한 구문: `Skill(name)`은 정확한 일치, `Skill(name *)`은 접두사 일치.

**개별 Skill 숨기기**: frontmatter에 `disable-model-invocation: true` 추가.

### 설정에서 Skill 공개 오버라이드

`skillOverrides` 설정은 Skill의 frontmatter가 아닌 설정에서 공개 여부를 제어합니다. 공유 프로젝트 리포지토리에 체크인된 Skill이나 MCP 서버가 제공하는 Skill처럼 편집할 수 없는 SKILL.md에 사용합니다. `/skills` 메뉴에서도 작성할 수 있습니다: Skill을 강조 표시하고 `Space`를 눌러 상태를 순환한 뒤 `Enter`로 `.claude/settings.local.json`에 저장합니다.

| 값 | Claude에게 표시 | `/` 메뉴에 표시 |
|----|--------------|--------------|
| `"on"` | 이름과 설명 | 표시 |
| `"name-only"` | 이름만 | 표시 |
| `"user-invocable-only"` | 숨김 | 표시 |
| `"off"` | 숨김 | 숨김 |

`skillOverrides`에 없는 Skill은 `"on"`으로 처리됩니다.

```json
{
  "skillOverrides": {
    "legacy-context": "name-only",
    "deploy": "off"
  }
}
```

Plugin Skills는 `skillOverrides`의 영향을 받지 않습니다. `/plugin`으로 관리합니다.

---

## 14. Skill 공유

Skills는 대상에 따라 다양한 범위로 배포할 수 있습니다:

- **프로젝트 Skills**: `.claude/skills/`를 버전 관리에 커밋
- **Plugins**: Plugin에 `skills/` 디렉토리 생성
- **Managed**: 관리 설정(Managed Settings)을 통해 조직 전체에 배포

### 시각적 출력 생성 (Generate Visual Output)

Skills는 모든 언어의 스크립트를 번들하고 실행할 수 있어, 단일 프롬프트로는 불가능한 Claude의 기능을 제공합니다. 특히 강력한 패턴은 **시각적 출력 생성**입니다: 데이터 탐색, 디버깅, 리포트 생성을 위해 브라우저에서 열리는 대화형 HTML 파일을 만듭니다.

다음 예제는 코드베이스 탐색기를 만듭니다: 디렉토리를 확장/축소하고, 파일 크기를 한눈에 확인하고, 파일 유형별로 색상으로 식별할 수 있는 대화형 트리 뷰입니다.

**Skill 디렉토리 생성:**

```bash
mkdir -p ~/.claude/skills/codebase-visualizer/scripts
```

**`~/.claude/skills/codebase-visualizer/SKILL.md`:**

```markdown
---
name: codebase-visualizer
description: Generate an interactive collapsible tree visualization of your codebase. Use when exploring a new repo, understanding project structure, or identifying large files.
allowed-tools: Bash(python3 *)
---

# Codebase Visualizer

Generate an interactive HTML tree view that shows your project's file structure with collapsible directories.

## Usage

Run the visualization script from your project root:

!`python3 ${CLAUDE_SKILL_DIR}/scripts/visualize.py .`

This creates `codebase-map.html` in the current directory and opens it in your default browser.

## What the visualization shows

- **Collapsible directories**: Click folders to expand/collapse
- **File sizes**: Displayed next to each file
- **Colors**: Different colors for different file types
- **Directory totals**: Shows aggregate size of each folder
```

위 예제에서 스크립트 경로는 `${CLAUDE_SKILL_DIR}`을 사용하여, Skill이 Personal, Project, Plugin 수준 중 어디에 설치되든 올바르게 해석됩니다.

테스트하려면 Claude Code를 프로젝트에서 열고 "Visualize this codebase"라고 요청합니다. Claude가 스크립트를 실행하여 `codebase-map.html`을 생성하고 브라우저에서 엽니다.

이 패턴은 모든 시각적 출력에 적용됩니다: 의존성 그래프, 테스트 커버리지 리포트, API 문서, 데이터베이스 스키마 시각화 등. 번들된 스크립트가 작업을 수행하고 Claude가 오케스트레이션을 처리합니다.

---

## 15. 트러블슈팅

### Skill이 트리거되지 않을 때

1. description에 사용자가 자연스럽게 말할 키워드가 포함되어 있는지 확인
2. `What skills are available?`로 Skill이 나타나는지 확인
3. 요청을 description에 더 가깝게 다시 표현
4. Skill이 user-invocable이면 `/skill-name`으로 직접 호출

### Skill이 너무 자주 트리거될 때

1. description을 더 구체적으로 작성
2. 수동 호출만 원하면 `disable-model-invocation: true` 추가

### Skill 설명이 잘릴 때

Skill 설명은 컨텍스트에 로드되어 Claude가 사용 가능한 Skill을 알 수 있습니다. 모든 Skill 이름은 항상 포함되지만, Skill이 많으면 설명이 문자 예산에 맞춰 짧아져 Claude가 요청을 매칭하는 데 필요한 키워드가 제거될 수 있습니다. 예산은 모델의 컨텍스트 윈도우의 1%로 조정됩니다. 오버플로우 시 가장 적게 호출한 Skill의 설명이 먼저 삭제됩니다.

예산을 늘리려면 `skillListingBudgetFraction` 설정 (예: `0.02` = 2%) 또는 `SLASH_COMMAND_TOOL_CHAR_BUDGET` 환경변수를 고정 문자 수로 설정. 다른 Skills의 예산을 확보하려면 `skillOverrides`에서 우선순위가 낮은 항목을 `"name-only"`로 설정. `description`과 `when_to_use` 텍스트는 예산과 관계없이 각 항목의 결합 텍스트가 1,536자로 제한됩니다. 이 제한은 `maxSkillDescriptionChars`로 구성 가능합니다.
