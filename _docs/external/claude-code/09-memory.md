# 09. 메모리 시스템 (Memory)

> **참조**: [How Claude remembers your project - Claude Code Docs](https://code.claude.com/docs/en/memory) | [Explore the .claude directory - Claude Code Docs](https://code.claude.com/docs/en/claude-directory)

---

## 목차

- [메모리 개요](#메모리-개요)
- [CLAUDE.md vs Auto Memory](#claudemd-vs-auto-memory)
- [메모리 계층 구조](#메모리-계층-구조)
- [CLAUDE.md 작성 가이드](#claudemd-작성-가이드)
- [CLAUDE.md Import 기능](#claudemd-import-기능)
- [AGENTS.md 통합](#agentsmd-통합)
- [CLAUDE.md 파일 로딩 방식](#claudemd-파일-로딩-방식)
- [--add-dir 플래그](#--add-dir-플래그)
- [.claude/rules/ 디렉토리](#clauderrules-디렉토리)
- [/memory 명령어](#memory-명령어)
- [# 단축키로 메모리 빠르게 추가](#-단축키로-메모리-빠르게-추가)
- [/init 명령어](#init-명령어)
- [대규모 팀을 위한 CLAUDE.md 관리](#대규모-팀을-위한-claudemd-관리)
- [Auto Memory](#auto-memory)
- [.claude/ 디렉토리 구조](#claude-디렉토리-구조)
- [애플리케이션 데이터 자동 정리](#애플리케이션-데이터-자동-정리)
- [보관됨 (자동 정리 대상 외)](#보관됨-자동-정리-대상-외)
- [로컬 데이터 삭제](#로컬-데이터-삭제)
- [모범 사례](#모범-사례)
- [포함 및 제외 가이드](#포함-및-제외-가이드)
- [문제 해결](#문제-해결)

---

## 메모리 개요

각 Claude Code 세션은 새로운 컨텍스트 윈도우로 시작됩니다. 세션 간에 지식을 전달하는 두 가지 메커니즘이 있습니다:

- **CLAUDE.md 파일**: Claude에게 지속적인 컨텍스트를 제공하기 위해 사용자가 작성하는 지침
- **Auto memory**: 사용자의 수정 사항과 선호도를 기반으로 Claude가 스스로 작성하는 메모

이 문서에서는 다음 내용을 다룹니다:

- CLAUDE.md 파일 작성 및 구성
- `.claude/rules/`로 특정 파일 유형에 규칙 범위 지정
- Auto memory를 구성하여 Claude가 자동으로 메모를 작성하도록 설정
- 지침이 따르지 않을 때 문제 해결

---

## CLAUDE.md vs Auto Memory

Claude Code는 두 가지 보완적인 메모리 시스템을 제공합니다. 두 시스템 모두 모든 대화의 시작에 로드됩니다. Claude는 이를 컨텍스트로 처리하며, 강제 구성은 아닙니다. Claude의 결정과 무관하게 동작을 차단하려면 PreToolUse hook을 대신 사용하세요. 지침이 구체적이고 간결할수록 Claude가 더 일관되게 따릅니다.

|  | CLAUDE.md 파일 | Auto Memory |
| --- | --- | --- |
| **작성자** | 사용자 | Claude |
| **내용** | 지침 및 규칙 | 학습 내용 및 패턴 |
| **범위** | 프로젝트, 사용자, 또는 조직 | 리포지토리별, worktree 간 공유 |
| **세션 로드** | 모든 세션에 로드 | 모든 세션에 로드 (첫 200줄 또는 25KB) |
| **용도** | 코딩 표준, 워크플로우, 프로젝트 아키텍처 | 빌드 명령, 디버깅 인사이트, Claude가 발견한 선호도 |

CLAUDE.md 파일은 Claude의 동작을 안내할 때 사용하세요. Auto memory는 수동 노력 없이 Claude가 수정 사항으로부터 학습하게 합니다. Subagent도 자체 auto memory를 유지할 수 있습니다.

---

## 메모리 계층 구조

CLAUDE.md 파일은 여러 위치에 존재할 수 있으며, 각각 다른 범위를 가집니다. 아래 표는 로드 순서대로(가장 넓은 범위에서 가장 구체적인 범위로) 나열되어 있어, 프로젝트 지침이 사용자 지침 다음에 컨텍스트에 나타납니다.

| 범위 | 위치 | 목적 | 활용 사례 | 공유 대상 |
|------|------|------|-----------|----------|
| **관리형 정책** | macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`<br>Linux/WSL: `/etc/claude-code/CLAUDE.md`<br>Windows: `C:\ProgramData\ClaudeCode\CLAUDE.md` | IT/DevOps가 관리하는 조직 전체 지침 | 회사 코딩 표준, 보안 정책, 컴플라이언스 요구사항 | 조직 내 모든 사용자 |
| **사용자 지침** | `~/.claude/CLAUDE.md` | 모든 프로젝트에 적용되는 개인 설정 | 코드 스타일링 선호도, 개인 도구 단축키 | 본인만 (모든 프로젝트) |
| **프로젝트 지침** | `./CLAUDE.md` 또는 `./.claude/CLAUDE.md` | 프로젝트의 팀 공유 지침 | 프로젝트 아키텍처, 코딩 표준, 공통 워크플로우 | 소스 컨트롤을 통한 팀원 |
| **로컬 지침** | `./CLAUDE.local.md` | _(Deprecated)_ 프로젝트별 개인 설정 (`.gitignore`에 추가) | 샌드박스 URL, 테스트 데이터 | 본인만 (현재 프로젝트) |

### 계층 로딩 순서

작업 디렉토리 상위의 CLAUDE.md 및 CLAUDE.local.md 파일은 시작 시 전체 로드됩니다. 하위 디렉토리의 파일은 Claude가 해당 디렉토리의 파일을 읽을 때 온디맨드로 로드됩니다.

```
1. 관리형 정책          ← 조직 전체 (최우선 로드)
2. 사용자 지침          ← 개인 설정
3. 프로젝트 지침        ← 팀 공유
4. 로컬 지침            ← 개인 프로젝트 설정
```

발견된 모든 파일은 서로를 재정의하지 않고 컨텍스트에 연결됩니다. 디렉토리 트리 전체에서 내용은 파일시스템 루트에서 작업 디렉토리 방향으로 정렬됩니다. 각 디렉토리 내에서 `CLAUDE.local.md`는 `CLAUDE.md` 다음에 추가됩니다.

### 로딩 상세 규칙

| 로딩 규칙 | 설명 |
| --- | --- |
| **상위 디렉토리** | 작업 디렉토리 상위의 CLAUDE.md 및 CLAUDE.local.md는 시작 시 전체 로드 |
| **하위 디렉토리** | 작업 디렉토리 하위의 파일은 Claude가 해당 디렉토리의 파일을 읽을 때 온디맨드 로드 |
| **연결 방식** | 재정의가 아닌 컨텍스트에 순차적으로 연결 (concat) |
| **정렬 순서** | 파일시스템 루트에서 작업 디렉토리 방향. 실행 위치에 가까운 지침이 마지막에 읽힘 |
| **로컬 파일 위치** | 각 디렉토리 내에서 `CLAUDE.local.md`는 `CLAUDE.md` 다음에 추가 |
| **모노레포 제외** | `claudeMdExcludes`로 관련 없는 팀의 CLAUDE.md 건너뛰기 가능 |
| **Import 결합** | `@path` import로 추가 파일을 로드 (최대 5단계 깊이) |

---

## CLAUDE.md 작성 가이드

### CLAUDE.md에 추가해야 할 때

CLAUDE.md는 다시 설명해야 할 내용을 적어두는 곳으로 취급하세요. 다음 상황에 추가하세요:

- Claude가 같은 실수를 두 번째 반복할 때
- 코드 리뷰에서 Claude가 이 코드베이스에 대해 알았어야 할 사항을 발견할 때
- 이전 세션에서 입력했던 것과 같은 수정이나 설명을 다시 입력할 때
- 새 팀원이 생산성을 발휘하기 위해 같은 컨텍스트가 필요한 경우

모든 세션에서 Claude가 가져야 할 사실로 유지하세요: 빌드 명령, 컨벤션, 프로젝트 레이아웃, "항상 X 하기" 규칙. 항목이 다단계 절차이거나 코드베이스의 일부분에만 해당되는 경우, skill이나 path-scoped rule으로 이동하세요.

### 효과적인 지침 작성법

CLAUDE.md 파일은 모든 세션 시작 시 컨텍스트 윈도우에 로드되어 대화와 함께 토큰을 소비합니다. CLAUDE.md는 강제 구성이 아닌 컨텍스트이므로, 지침을 어떻게 작성하느냐가 Claude가 얼마나 안정적으로 따르는지에 영향을 미칩니다. 구체적이고 간결하며 잘 구조화된 지침이 가장 효과적입니다.

**크기**: CLAUDE.md 파일당 200줄 미만을 목표로 하세요. 긴 파일은 더 많은 컨텍스트를 소비하고 준수도를 낮춥니다. 지침이 커지면 path-scoped rules을 사용하여 일치하는 파일로 작업할 때만 로드되도록 하세요.

**구조**: 마크다운 헤더와 불릿을 사용하여 관련 지침을 그룹화하세요.

**구체성**: 검증 가능할 만큼 구체적인 지침을 작성하세요:

- "코드를 적절히 포맷하세요" 대신 "2-space 들여쓰기를 사용하세요"
- "변경 사항을 테스트하세요" 대신 "커밋 전에 `npm test`를 실행하세요"
- "파일을 정리하세요" 대신 "API 핸들러는 `src/api/handlers/`에 있습니다"

**일관성**: 두 규칙이 모순되면 Claude가 임의로 하나를 선택할 수 있습니다. CLAUDE.md 파일, 하위 디렉토리의 중첩 CLAUDE.md 파일, `.claude/rules/`를 정기적으로 검토하여 오래되거나 충돌하는 지침을 제거하세요. 모노레포에서는 `claudeMdExcludes`를 사용하여 관련 없는 다른 팀의 CLAUDE.md 파일을 건너뛰세요.

---

## CLAUDE.md Import 기능

CLAUDE.md 파일은 `@path/to/import` 구문을 사용하여 추가 파일을 가져올 수 있습니다.

### 기본 사용법

```markdown
# CLAUDE.md 예시

이 프로젝트는 다음 설정을 사용합니다:

@./docs/coding-standards.md
@./docs/architecture.md
@~/.claude/personal-preferences.md
```

### Import 규칙

| 규칙 | 설명 |
|------|------|
| **상대 경로** | CLAUDE.md 파일 위치를 기준으로 상대 경로 사용 가능 |
| **절대 경로** | `~/.claude/...` 와 같은 절대 경로 사용 가능 |
| **재귀 깊이** | 최대 5단계까지 재귀적 Import 가능 |
| **코드 블록 제외** | 마크다운 코드 스팬(`` ` ``)과 코드 블록 내의 Import는 평가되지 않음 |

### Import 활용 팁

사용자 홈 디렉토리의 파일을 Import하는 것은 팀원 각자가 개별 지침을 제공하는 편리한 방법입니다. `CLAUDE.local.md`는 이전에 비슷한 목적이었으나, Import 기능이 여러 git worktree에서 더 잘 동작하므로 현재는 deprecated 되었으며 Import 사용이 권장됩니다.

---

---

## AGENTS.md 통합

Claude Code는 `CLAUDE.md`를 읽으며, `AGENTS.md`는 읽지 않습니다. 리포지토리에서 이미 다른 코딩 에이전트용으로 `AGENTS.md`를 사용 중이라면, `CLAUDE.md`를 생성하여 `AGENTS.md`를 import하면 두 도구가 동일한 지침을 중복 없이 읽을 수 있습니다. Claude-specific 지침을 import 아래에 추가할 수도 있습니다.

```markdown
@AGENTS.md

## Claude Code

`src/billing/` 하위 변경은 plan mode를 사용하세요.
```

Claude-specific 콘텐츠가 필요 없다면 symlink도 사용할 수 있습니다:

```bash
ln -s AGENTS.md CLAUDE.md
```

Windows에서 symlink 생성에는 관리자 권한 또는 개발자 모드가 필요하므로, 대신 `@AGENTS.md` import를 사용하세요.

이미 `AGENTS.md`가 있는 리포지토리에서 `/init`을 실행하면, Claude는 이를 읽고 관련 부분을 생성된 `CLAUDE.md`에 반영합니다. `.cursorrules`, `.devin/rules/`, `.windsurfrules` 등 다른 도구 설정 파일도 함께 읽습니다.

### AGENTS.md vs CLAUDE.md 전략 비교

| 전략 | 명령어 | 장단점 |
| --- | --- | --- |
| **Import** | CLAUDE.md에 `@AGENTS.md` 작성 후 Claude-specific 내용 추가 가능 | 가장 유연. 두 도구가 동일한 지침 공유 |
| **Symlink** | `ln -s AGENTS.md CLAUDE.md` | 간단하지만 Claude-specific 내용 추가 불가 |
| **/init** | `/init` 실행 | 기존 AGENTS.md + 다른 도구 설정을 자동 통합. 별도 CLAUDE.md 생성 |

---

## CLAUDE.md 파일 로딩 방식

Claude Code는 현재 작업 디렉토리에서 디렉토리 트리를 따라 올라가며, 각 디렉토리에서 `CLAUDE.md`와 `CLAUDE.local.md` 파일을 확인합니다. 예를 들어 `foo/bar/`에서 Claude Code를 실행하면 `foo/bar/CLAUDE.md`, `foo/CLAUDE.md` 및 그 옆의 `CLAUDE.local.md` 파일을 로드합니다.

발견된 모든 파일은 서로를 재정의하지 않고 컨텍스트에 연결됩니다. 디렉토리 트리 전체에서 내용은 파일시스템 루트에서 작업 디렉토리 방향으로 정렬됩니다. 따라서 `foo/CLAUDE.md`가 `foo/bar/CLAUDE.md`보다 먼저 나타나며, Claude를 실행한 위치에 가까운 지침이 마지막에 읽힙니다. 각 디렉토리 내에서 `CLAUDE.local.md`는 `CLAUDE.md` 다음에 추가되어, 해당 레벨에서 개인 메모가 Claude가 마지막으로 읽는 내용이 됩니다.

Claude는 현재 작업 디렉토리 아래 하위 디렉토리의 `CLAUDE.md` 및 `CLAUDE.local.md` 파일도 발견합니다. 이 파일들은 시작 시 로드되지 않고 Claude가 해당 하위 디렉토리의 파일을 읽을 때 포함됩니다.

대규모 모노레포에서 다른 팀의 CLAUDE.md 파일이 로드되는 것을 방지하려면 `claudeMdExcludes`를 사용하세요.

### HTML 주석 스트리핑

CLAUDE.md 파일의 블록 수준 HTML 주석(`<!-- maintainer notes -->`)은 Claude의 컨텍스트에 주입되기 전에 제거됩니다. 이를 활용하면 컨텍스트 토큰을 소비하지 않고도 유지보수자를 위한 메모를 남길 수 있습니다. 코드 블록 안의 주석은 보존됩니다. Read 도구로 CLAUDE.md 파일을 직접 열면 주석이 그대로 보입니다.

### --add-dir 플래그

`--add-dir` 플래그는 기본 작업 디렉토리 외부의 추가 디렉토리에 Claude가 접근할 수 있도록 합니다. 기본적으로 이 디렉토리의 CLAUDE.md 파일은 로드되지 않습니다.

추가 디렉토리에서 메모리 파일도 로드하려면 `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` 환경 변수를 설정하세요:

```bash
CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1 claude --add-dir ../shared-config
```

이렇게 하면 추가 디렉토리에서 `CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/rules/*.md`, `CLAUDE.local.md`가 로드됩니다. `--setting-sources`에서 `local`을 제외하면 `CLAUDE.local.md`는 건너뜁니다.

---

## .claude/rules/ 디렉토리

대규모 프로젝트에서는 `.claude/rules/` 디렉토리를 사용하여 지침을 여러 파일로 구성할 수 있습니다. 지침을 모듈식으로 유지하고 팀이 관리하기 쉽게 만듭니다. 규칙은 특정 파일 경로로 범위를 지정할 수 있어, Claude가 일치하는 파일로 작업할 때만 로드되어 노이즈를 줄이고 컨텍스트 공간을 절약합니다.

### 규칙 설정

프로젝트의 `.claude/rules/` 디렉토리에 마크다운 파일을 배치합니다. 각 파일은 하나의 주제를 다루며, `testing.md`나 `api-design.md`와 같이 설명적인 파일 이름을 사용하세요. 모든 `.md` 파일은 재귀적으로 발견되므로 `frontend/`나 `backend/` 같은 하위 디렉토리로 구성할 수 있습니다:

```
your-project/
├── .claude/
│   ├── CLAUDE.md           # 주요 프로젝트 지침
│   └── rules/
│       ├── code-style.md   # 코드 스타일 가이드라인
│       ├── testing.md      # 테스트 컨벤션
│       └── security.md     # 보안 요구사항
```

`paths` frontmatter가 없는 규칙은 `.claude/CLAUDE.md`와 동일한 우선순위로 시작 시 로드됩니다.

### 규칙 파일 포맷 (Frontmatter)

규칙 파일은 선택적으로 YAML frontmatter를 포함할 수 있습니다. 현재 공식 문서에서 지원하는 frontmatter 필드는 `paths`뿐입니다.

```markdown
---
paths:
  - "src/api/**/*.ts"
  - "lib/**/*.ts"
---

# 규칙 제목

- 규칙 내용
```

| Frontmatter 필드 | 유형 | 필수 | 설명 |
| --- | --- | --- | --- |
| `paths` | 문자열 배열 | 아니오 | 규칙이 적용될 파일 경로 glob 패턴. 생략 시 모든 파일에 무조건 적용 |

Frontmatter가 없는 규칙 파일도 정상적으로 동작하며, 모든 파일에 무조건 로드됩니다.

### Path-specific 규칙

YAML frontmatter의 `paths` 필드를 사용하여 특정 파일에 규칙을 범위 지정할 수 있습니다. 이 조건부 규칙은 Claude가 지정된 패턴과 일치하는 파일로 작업할 때만 적용됩니다.

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API 개발 규칙

- 모든 API 엔드포인트에 입력 유효성 검사 포함
- 표준 에러 응답 형식 사용
- OpenAPI 문서 주석 포함
```

`paths` 필드가 없는 규칙은 무조건 로드되어 모든 파일에 적용됩니다. Path-scoped 규칙은 Claude가 패턴과 일치하는 파일을 읽을 때 트리거되며, 모든 도구 사용 시마다 트리거되는 것은 아닙니다.

Glob 패턴을 사용하여 확장자, 디렉토리 또는 조합별로 파일을 매칭할 수 있습니다:

| 패턴 | 매칭 대상 |
| --- | --- |
| `**/*.ts` | 모든 디렉토리의 TypeScript 파일 |
| `src/**/*` | `src/` 디렉토리 아래의 모든 파일 |
| `*.md` | 프로젝트 루트의 마크다운 파일 |
| `src/components/*.tsx` | 특정 디렉토리의 React 컴포넌트 |

여러 패턴을 지정하고 brace expansion을 사용할 수 있습니다:

```markdown
---
paths:
  - "src/**/*.{ts,tsx}"
  - "lib/**/*.ts"
  - "tests/**/*.test.ts"
---
```

`.claude/rules/` 디렉토리는 symlink를 지원하므로, 공유 규칙 세트를 유지하고 여러 프로젝트에 링크할 수 있습니다. Symlink는 정상적으로 확인 및 로드되며, 순환 symlink는 감지되어 안전하게 처리됩니다.

```bash
ln -s ~/shared-claude-rules .claude/rules/shared
ln -s ~/company-standards/security.md .claude/rules/security.md
```

### 사용자 수준 규칙

`~/.claude/rules/`의 개인 규칙은 머신의 모든 프로젝트에 적용됩니다. 프로젝트에 국한되지 않는 선호도에 사용하세요:

```
~/.claude/rules/
├── preferences.md    # 개인 코딩 선호도
└── workflows.md      # 선호하는 워크플로우
```

사용자 수준 규칙은 프로젝트 규칙보다 먼저 로드되어, 프로젝트 규칙이 더 높은 우선순위를 갖습니다.

---

## /memory 명령어

`/memory` 명령어는 현재 세션에 로드된 모든 CLAUDE.md, CLAUDE.local.md, rules 파일을 나열하고, auto memory를 켜거나 끌 수 있는 토글을 제공하며, auto memory 폴더를 여는 링크를 제공합니다. 파일을 선택하면 에디터에서 열 수 있습니다.

### 기능

- 현재 로드된 CLAUDE.md, CLAUDE.local.md, rules 파일 나열
- Auto memory 토글 (켜기/끄기)
- Auto memory 폴더 열기 링크 제공
- 파일 선택 시 에디터에서 열기

```
> /memory
```

Claude에게 무언가를 기억해달라고 요청하면(예: "pnpm을 사용해, npm 말고" 또는 "API 테스트에 로컬 Redis가 필요하다는 걸 기억해"), Claude는 auto memory에 저장합니다. CLAUDE.md에 추가하려면 Claude에게 직접 "이걸 CLAUDE.md에 추가해"라고 요청하거나, `/memory`를 통해 직접 편집하세요.

---

## # 단축키로 메모리 빠르게 추가

입력을 `#` 문자로 시작하면 메모리를 가장 빠르게 추가할 수 있습니다. 어떤 메모리 파일에 저장할지 선택하는 프롬프트가 나타납니다.

예시:

```
> # pnpm을 사용해, npm 말고
```

이렇게 입력하면 저장할 메모리 파일(CLAUDE.md, CLAUDE.local.md 등)을 선택할 수 있으며, 선택한 파일에 해당 내용이 추가됩니다.

---

## /init 명령어

코드베이스에 CLAUDE.md 파일을 부트스트랩합니다.

### 사용법

```bash
> /init
```

이 명령어는 프로젝트의 중요 정보, 컨벤션, 자주 사용하는 명령어를 저장하는 CLAUDE.md 파일을 생성합니다. Claude가 코드베이스를 분석하여 적절한 초기 내용을 자동으로 작성합니다.

---

## 대규모 팀을 위한 CLAUDE.md 관리

엔터프라이즈 조직은 팀 전체에 Claude Code를 배포할 때 지침을 중앙 집중화하고 로드되는 CLAUDE.md 파일을 제어할 수 있습니다.

### 조직 전체 CLAUDE.md 배포

엔터프라이즈 조직은 모든 사용자에게 적용되는 중앙 관리 CLAUDE.md 파일을 배포할 수 있습니다. 이 파일은 개인 설정에서 제외할 수 없습니다.

| OS | 파일 위치 |
|----|----------|
| **macOS** | `/Library/Application Support/ClaudeCode/CLAUDE.md` |
| **Linux/WSL** | `/etc/claude-code/CLAUDE.md` |
| **Windows** | `C:\ProgramData\ClaudeCode\CLAUDE.md` |

배포는 구성 관리 시스템을 통해 진행합니다:

| 배포 도구 | 설명 |
|----------|------|
| **MDM** (Mobile Device Management) | macOS/iOS 기기 관리 |
| **Group Policy** | Windows 도메인 환경 |
| **Ansible** | Linux/다중 플랫폼 환경 |

### managed-settings.json 인라인 배포

`claudeMd` 키를 사용하면 별도의 파일을 배포하지 않고도 `managed-settings.json` 내부에 관리 CLAUDE.md 콘텐츠를 직접 넣을 수 있습니다.

- **범위**: 해당 머신의 모든 Claude Code 세션, 모든 리포지토리. 리포지토리별 지침은 프로젝트 CLAUDE.md를 커밋하세요.
- **우선순위**: 관리 CLAUDE.md 파일과 동일. 사용자 및 프로젝트 CLAUDE.md보다 먼저 로드.
- **적용 위치**: 관리 및 정책 설정에서만 적용. 사용자, 프로젝트 또는 로컬 설정에서 `claudeMd`를 설정해도 효과가 없습니다.

```json
{
  "claudeMd": "커밋 전 항상 `make lint`를 실행하세요.\nmain에 직접 push하지 마세요."
}
```

관리 CLAUDE.md와 관리 설정은 서로 다른 목적을 가집니다:

| 관심사 | 구성 위치 |
|--------|-----------|
| 특정 도구, 명령 또는 파일 경로 차단 | 관리 설정: `permissions.deny` |
| 샌드박스 격리 강제 | 관리 설정: `sandbox.enabled` |
| 환경 변수 및 API 공급자 라우팅 | 관리 설정: `env` |
| 인증 방법 및 조직 잠금 | 관리 설정: `forceLoginMethod`, `forceLoginOrgUUID` |
| 코드 스타일 및 품질 가이드라인 | 관리 CLAUDE.md |
| 데이터 처리 및 컴플라이언스 알림 | 관리 CLAUDE.md |
| Claude에 대한 행동 지침 | 관리 CLAUDE.md |

설정 규칙은 Claude가 결정하는 내용과 무관하게 클라이언트에 의해 강제됩니다. CLAUDE.md 지침은 Claude의 동작을 형성하지만 강제 레이어는 아닙니다.

### 특정 CLAUDE.md 파일 제외 (claudeMdExcludes)

대규모 모노레포에서 상위 CLAUDE.md 파일에 현재 작업과 관련 없는 지침이 포함될 수 있습니다. `claudeMdExcludes` 설정을 사용하면 경로 또는 glob 패턴으로 특정 파일을 건너뛸 수 있습니다.

`.claude/settings.local.json`에 추가하여 제외가 로컬 머신에만 적용되도록 합니다:

```json
{
  "claudeMdExcludes": [
    "**/monorepo/CLAUDE.md",
    "/home/user/monorepo/other-team/.claude/rules/**"
  ]
}
```

패턴은 glob 구문을 사용하여 절대 파일 경로와 매칭됩니다. `claudeMdExcludes`는 모든 설정 계층(user, project, local, 관리 정책)에서 구성할 수 있습니다. 배열은 계층 간에 병합됩니다.

관리 정책 CLAUDE.md 파일은 제외할 수 없습니다. 이를 통해 조직 전체 지침이 개인 설정과 무관하게 항상 적용됩니다.

### 배포 예시 (Ansible)

```yaml
- name: Deploy enterprise CLAUDE.md
  ansible.builtin.copy:
    src: files/CLAUDE.md
    dest: /etc/claude-code/CLAUDE.md
    owner: root
    group: root
    mode: '0644'
```

---

## Auto Memory

Auto memory는 Claude가 사용자가 작성할 필요 없이 세션 간에 지식을 축적할 수 있게 합니다. Claude는 작업하면서 빌드 명령, 디버깅 인사이트, 아키텍처 노트, 코드 스타일 선호도, 워크플로 습관 등을 자신을 위해 메모를 저장합니다. Claude는 매 세션마다 무언가를 저장하는 것은 아니며, 해당 정보가 향후 대화에서 유용할지 여부를 기준으로 기억할 가치가 있는지 판단합니다.

### Auto memory 활성화/비활성화

Auto memory는 기본적으로 켜져 있습니다. 토글하려면 세션에서 `/memory`를 열고 auto memory 토글을 사용하거나, 프로젝트 설정에서 `autoMemoryEnabled`를 설정하세요:

```json
{
  "autoMemoryEnabled": false
}
```

환경 변수를 통해 비활성화하려면 `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`을 설정하세요.

### 저장 위치

각 프로젝트는 `~/.claude/projects/<project>/memory/`에 자체 메모리 디렉토리를 갖습니다. `<project>` 경로는 git 리포지토리에서 파생되므로, 동일한 리포지토리 내의 모든 worktree와 하위 디렉토리가 하나의 auto memory 디렉토리를 공유합니다. git 리포지토리 외부에서는 프로젝트 루트가 대신 사용됩니다.

다른 위치에 auto memory를 저장하려면 `settings.json`에서 `autoMemoryDirectory`를 설정하세요. 이 값은 모든 설정 범위(user, project, local, policy, `--settings`)에서 읽힙니다.

```json
{
  "autoMemoryDirectory": "~/my-custom-memory-dir"
}
```

값은 절대 경로이거나 `~/`로 시작해야 합니다. 프로젝트의 `.claude/settings.json` 또는 `.claude/settings.local.json`에 설정된 경우, 해당 폴더에 대한 workspace trust 대화상자를 수락한 후에만 적용되며, 이는 hooks와 동일한 게이트입니다.

디렉토리에는 `MEMORY.md` 엔트리포인트와 선택적 토픽 파일이 포함됩니다:

```
~/.claude/projects/<project>/memory/
├── MEMORY.md          # 간결한 인덱스, 모든 세션에 로드
├── debugging.md       # 디버깅 패턴에 대한 상세 노트
├── api-conventions.md # API 설계 결정
└── ...                # Claude가 생성하는 다른 토픽 파일
```

`MEMORY.md`는 메모리 디렉토리의 인덱스 역할을 합니다. Claude는 세션 중에 이 디렉토리의 파일을 읽고 쓰며, `MEMORY.md`를 사용하여 무엇이 어디에 저장되어 있는지 추적합니다.

Auto memory는 머신 로컬입니다. 동일한 git 리포지토리 내의 모든 worktree와 하위 디렉토리가 하나의 auto memory 디렉토리를 공유합니다. 파일은 머신이나 클라우드 환경 간에 공유되지 않습니다.

### 작동 방식

`MEMORY.md`의 처음 200줄 또는 처음 25KB(먼저 도달하는 것)가 모든 대화 시작 시 로드됩니다. 이 임계값을 넘는 콘텐츠는 세션 시작 시 로드되지 않습니다. Claude는 상세한 노트를 별도의 토픽 파일로 이동하여 `MEMORY.md`를 간결하게 유지합니다.

이 제한은 `MEMORY.md`에만 적용됩니다. CLAUDE.md 파일은 길이에 관계없이 전체가 로드되지만, 짧은 파일이 더 나은 준수도를 보입니다.

`debugging.md`나 `patterns.md` 같은 토픽 파일은 시작 시 로드되지 않습니다. Claude는 정보가 필요할 때 표준 파일 도구를 사용하여 온디맨드로 읽습니다.

Claude는 세션 중에 메모리 파일을 읽고 씁니다. Claude Code 인터페이스에서 "Writing memory" 또는 "Recalled memory"가 보이면, Claude가 `~/.claude/projects/<project>/memory/`를 적극적으로 업데이트하거나 읽고 있는 것입니다.

### 세션 간 메모리 지속 메커니즘

Auto memory의 지속은 다음 구조로 보장됩니다:

| 구성 요소 | 역할 | 지속 여부 |
| --- | --- | --- |
| `MEMORY.md` | 메모리 디렉토리의 인덱스. 모든 세션 시작 시 최대 200줄/25KB 로드 | 세션 종료 후에도 디스크에 유지 |
| 토픽 파일 (예: `debugging.md`) | 상세 정보 저장. Claude가 필요할 때 온디맨드로 읽음 | 세션 종료 후에도 디스크에 유지 |
| `<project>` 경로 파생 | git 리포지토리 경로에서 파생. 동일 리포지토리의 모든 worktree와 하위 디렉토리가 하나의 메모리 공유 | 리포지토리 기준으로 일관성 유지 |
| `MEMORY.md` 갱신 | Claude가 세션 중 디렉토리 내 파일을 읽고 쓰며, 무엇이 어디에 저장되었는지 `MEMORY.md`로 추적 | 매 세션마다 갱신 |

Subagent도 자체 auto memory를 유지할 수 있습니다. 자세한 내용은 subagent 설정을 참조하세요.

### 메모리 감사 및 편집

Auto memory 파일은 일반 마크다운으로 언제든 편집하거나 삭제할 수 있습니다. 세션 내에서 `/memory`를 실행하여 메모리 파일을 탐색하고 엽니다.

---

## .claude/ 디렉토리 구조

Claude Code는 프로젝트 디렉토리와 홈 디렉토리의 `~/.claude`에서 지침, 설정, 스킬, 서브에이전트, 메모리를 읽습니다. 프로젝트 파일은 git에 커밋하여 팀과 공유하고, `~/.claude`의 파일은 모든 프로젝트에 적용되는 개인 설정입니다.

Windows에서 `~/.claude`는 `%USERPROFILE%\.claude`로 확인됩니다. `CLAUDE_CONFIG_DIR`을 설정하면 이 페이지의 모든 `~/.claude` 경로가 해당 디렉토리 아래에 위치합니다.

대부분의 사용자는 `CLAUDE.md`와 `settings.json`만 편집합니다. 나머지 디렉토리는 선택 사항이며, 필요에 따라 스킬, 규칙, 서브에이전트를 추가할 수 있습니다.

### 파일 참조

| 파일 | 범위 | 커밋 | 기능 |
| --- | --- | --- | --- |
| `CLAUDE.md` | 프로젝트 및 전역 | O | 모든 세션에 로드되는 지침 |
| `rules/*.md` | 프로젝트 및 전역 | O | 토픽 범위 지침, 선택적 path-gate |
| `settings.json` | 프로젝트 및 전역 | O | 권한, hooks, 환경 변수, 모델 기본값 |
| `settings.local.json` | 프로젝트 전용 | X | 개인 오버라이드, 자동 gitignore |
| `.mcp.json` | 프로젝트 전용 | O | 팀 공유 MCP 서버 |
| `skills/<name>/SKILL.md` | 프로젝트 및 전역 | O | `/name`으로 호출되는 재사용 가능한 프롬프트 |
| `agents/*.md` | 프로젝트 및 전역 | O | 자체 프롬프트와 도구를 가진 서브에이전트 정의 |
| `workflows/*.js` | 프로젝트 및 전역 | O | 동적 워크플로 스크립트 |
| `agent-memory/<name>/` | 프로젝트 및 전역 | O | 서브에이전트용 영구 메모리 |
| `.worktreeinclude` | 프로젝트 전용 | O | 새 worktree에 복사할 gitignore 파일 목록 |
| `commands/*.md` | 프로젝트 및 전역 | O | 단일 파일 프롬프트 (skills와 동일 메커니즘) |
| `output-styles/*.md` | 프로젝트 및 전역 | O | Claude의 응답 포맷을 변경하는 커스텀 system-prompt 섹션 |
| `~/.claude.json` | 전역 전용 | X | 앱 상태, OAuth, UI 토글, 개인 MCP 서버 |
| `keybindings.json` | 전역 전용 | X | 커스텀 키보드 단축키 |
| `themes/*.json` | 전역 전용 | X | 커스텀 컬러 테마 |
| `projects/<project>/memory/` | 전역 전용 | X | Auto memory: Claude가 세션 간 스스로 작성하는 메모 |

### 애플리케이션 데이터

`~/.claude`에는 Claude Code가 세션 중에 작성하는 데이터도 포함됩니다. 이 파일들은 일반 텍스트입니다.

**자동 정리**: 다음 경로의 파일은 `cleanupPeriodDays`(기본 30일)보다 오래되면 시작 시 삭제됩니다:

| 경로 (`~/.claude/` 하위) | 내용 |
| --- | --- |
| `projects/<project>/<session>.jsonl` | 전체 대화 트랜스크립트 (모든 메시지, 도구 호출, 도구 결과) |
| `projects/<project>/<session>/subagents/` | 서브에이전트 대화 트랜스크립트 (부모 세션 만료 시 함께 삭제) |
| `projects/<project>/<session>/tool-results/` | 대용량 도구 출력이 분리 저장된 파일 |
| `file-history/<session>/` | Claude가 변경한 파일의 사전 편집 스냅샷 (체크포인트 복원에 사용) |
| `plans/` | plan mode에서 작성된 계획 파일 |
| `debug/` | 세션별 디버그 로그 (`--debug` 또는 `/debug`로 시작 시에만 작성) |
| `paste-cache/`, `image-cache/` | 대용량 붙여넣기 및 첨부 이미지의 내용 |
| `session-env/` | 세션별 환경 메타데이터 |
| `tasks/` | 세션별 작업 목록 (task tools에서 작성) |
| `shell-snapshots/` | Bash 도구에서 사용하는 캡처된 셸 환경 (정상 종료 시 제거, 스윕은 비정상 종료 후 잔여분 정리) |
| `backups/` | 설정 마이그레이션 전 타임스탬프가 찍힌 `~/.claude.json` 백업 복사본 |
| `feedback-bundles/` | `/feedback`에서 서드파티 공급자에 대해 작성된 수정된 트랜스크립트 아카이브 (Anthropic 계정 팀에 전송용) |
| `todos/`, `statsig/`, `logs/` | 레거시 디렉토리 (현재 버전에서는 더 이상 작성되지 않음. 스윕이 내용물과 빈 디렉토리를 제거) |

### 보관됨 (자동 정리 대상 외)

다음 경로는 자동 정리에 포함되지 않으며 무기한 보관됩니다.

| 경로 (`~/.claude/` 하위) | 내용 |
| --- | --- |
| `history.jsonl` | 입력한 모든 프롬프트 기록 (타임스탬프 및 프로젝트 경로 포함). 위쪽 화살표 키 회상에 사용 |
| `stats-cache.json` | `/usage`에 표시되는 집계된 토큰 및 비용 카운트 |
| `remote-settings.json` | 조직의 서버 관리 설정 캐시 복사본. 조직에서 구성한 경우에만 존재. 매 실행 시 새로고침됨 |

### 일반 텍스트 저장

트랜스크립트와 기록은 저장 시 암호화되지 않습니다. OS 파일 권한이 유일한 보호 수단입니다. 도구가 `.env` 파일을 읽거나 명령이 자격 증명을 출력하면 해당 값이 `projects/<project>/<session>.jsonl`에 기록됩니다. 노출을 줄이려면:

- `cleanupPeriodDays`를 낮춰 트랜스크립트 보관 기간 단축
- `CLAUDE_CODE_SKIP_PROMPT_HISTORY` 환경 변수를 설정하여 모든 모드에서 트랜스크립트 및 프롬프트 기록 작성 건너뛰기. 비대화형 모드에서는 `-p`와 함께 `--no-session-persistence`를 전달하거나, Agent SDK에서 `persistSession: false`를 설정 가능
- 권한 규칙을 사용하여 자격 증명 파일 읽기 거부

### 로컬 데이터 삭제

`claude project purge`를 실행하여 특정 프로젝트의 Claude Code 상태를 삭제할 수 있습니다. 이 명령은 Claude Code v2.1.124 이상이 필요합니다. 삭제 대상:

- `projects/` 아래의 트랜스크립트 및 auto memory
- 세션별 `tasks/`, `debug/`, `file-history/` 항목
- `history.jsonl`의 일치하는 프롬프트 행
- `~/.claude.json`의 프로젝트 항목

명령어는 전체 삭제 계획을 출력하고 삭제 전 확인을 요청합니다.

```bash
# 삭제 계획 미리보기 (실제 삭제 없음)
claude project purge ~/work/my-repo --dry-run

# 확인 프롬프트와 함께 삭제
claude project purge ~/work/my-repo

# 경로 생략 시 인터랙티브 목록에서 프로젝트 선택
claude project purge

# 스크립트용 확인 프롬프트 건너뛰기
claude project purge ~/work/my-repo --yes
```

`--all`을 전달하면 모든 프로젝트의 상태를 일괄 삭제하며, `history.jsonl`을 필터링 대신 통째로 삭제합니다. `-i`를 전달하면 삭제 계획을 항목별로 단계별 확인할 수 있습니다.

이 명령은 `shell-snapshots/`와 `backups/`는 프로젝트 범위가 아니므로 그대로 두며, 계획 출력에서 경고합니다. 일치하는 상태가 없으면 종료 코드 1로 종료됩니다.

| 삭제 대상 | 손실되는 것 |
| --- | --- |
| `~/.claude/projects/` | 과거 세션의 이어하기(Resume), 계속하기(Continue), 되감기(Rewind) |
| `~/.claude/history.jsonl` | 위쪽 화살표 프롬프트 회상 |
| `~/.claude/file-history/` | 과거 세션의 체크포인트 복원 |
| `~/.claude/stats-cache.json` | `/usage`에 표시되는 과거 통계 |
| `~/.claude/remote-settings.json` | 없음. 다음 실행 시 다시 가져옴 |
| `~/.claude/debug/`, `plans/`, `paste-cache/`, `image-cache/`, `session-env/`, `tasks/`, `shell-snapshots/`, `backups/` | 사용자에게 보이는 기능에 영향 없음 |
| `~/.claude/todos/`, `statsig/`, `logs/` | 없음. 현재 버전에서 사용하지 않는 레거시 디렉토리 |

`~/.claude.json`, `~/.claude/settings.json`, `~/.claude/plugins/`은 삭제하지 마세요: 인증, 설정, 설치된 플러그인 정보가 포함되어 있습니다.

---

## 모범 사례

### 구체적으로 작성

| 나쁜 예 | 좋은 예 |
|---------|---------|
| "코드를 적절히 포맷하세요" | "2-space 들여쓰기를 사용하세요" |
| "좋은 코드를 작성하세요" | "함수당 20줄 이내로 유지하세요" |
| "테스트를 작성하세요" | "모든 공개 함수에 단위 테스트를 작성하세요" |

### 구조화하여 정리

- 각 메모리를 불릿 포인트로 작성
- 관련 메모리를 설명이 포함된 마크다운 헤딩 아래에 그룹화

```markdown
# CLAUDE.md

## 코딩 컨벤션
- 2-space 들여쓰기 사용
- 세미콜론 사용 안 함
- 작은따옴표 사용

## 테스트
- 모든 테스트는 `__tests__/` 디렉토리에 배치
- Jest 사용
- 커버리지 80% 이상 유지

## 커밋 규칙
- Conventional Commits 형식 사용
- 한글로 커밋 메시지 작성
```

### 정기 검토

프로젝트가 발전함에 따라 메모리를 업데이트하여 Claude가 항상 최신 정보와 컨텍스트를 사용하도록 하세요.

---

## 포함 및 제외 가이드

### CLAUDE.md에 포함해야 할 내용

| 포함 | 예시 |
|------|------|
| **프로젝트 구조** | 주요 디렉토리, 아키텍처 결정 |
| **코딩 표준** | 네이밍 컨벤션, 포맷팅 규칙 |
| **빌드/테스트 명령** | `npm run build`, `npm test` |
| **배포 절차** | CI/CD 파이프라인, 배포 단계 |
| **주요 종속성** | 프레임워크 버전, 주요 라이브러리 |
| **알려진 이슈** | 해결 방법이 있는 버그 |
| **팀 컨벤션** | PR 규칙, 코드 리뷰 기준 |

### CLAUDE.md에 제외해야 할 내용

| 제외 | 이유 |
|------|------|
| **민감한 정보** | API 키, 비밀번호, 토큰 |
| **자주 변경되는 정보** | 임시 설정, 실험적 코드 |
| **과도하게 긴 설명** | 컨텍스트 윈도우 낭비 |
| **개인 선호도** | 팀 프로젝트 CLAUDE.md에 개인 설정은 부적합 |

---

## 문제 해결

CLAUDE.md 및 auto memory와 관련된 가장 일반적인 문제와 해결 방법입니다.

### Claude가 CLAUDE.md를 따르지 않음

CLAUDE.md 콘텐츠는 시스템 프롬프트의 일부가 아닌 시스템 프롬프트 이후 사용자 메시지로 전달됩니다. Claude는 이를 읽고 따르려고 하지만, 특히 모호하거나 충돌하는 지침의 경우 엄격한 준수를 보장하지 않습니다.

디버깅 방법:

- `/memory`를 실행하여 CLAUDE.md와 CLAUDE.local.md 파일이 로드되고 있는지 확인합니다. 파일이 나열되지 않으면 Claude가 볼 수 없는 것입니다.
- 관련 CLAUDE.md가 세션에 로드되는 위치에 있는지 확인합니다(메모리 계층 구조 참조).
- 지침을 더 구체적으로 만드세요. "코드를 보기 좋게 포맷하세요"보다 "2-space 들여쓰기를 사용하세요"가 더 잘 작동합니다.
- CLAUDE.md 파일 간에 충돌하는 지침이 있는지 확인하세요. 두 파일이 동일한 동작에 대해 다른 지침을 주면 Claude가 임의로 하나를 선택할 수 있습니다.

특정 시점(예: 매 커밋 전 또는 파일 편집 후)에 실행되어야 하는 지침은 hook으로 작성하세요. Hook은 Claude가 하는 결정과 무관하게 고정된 라이프사이클 이벤트에서 셸 명령으로 실행됩니다.

시스템 프롬프트 수준에서 원하는 지침은 `--append-system-prompt`를 사용하세요. 이 값은 매 호출 시 전달해야 하므로 대화형 사용보다는 스크립트와 자동화에 더 적합합니다.

### Auto memory에 무엇이 저장되었는지 모름

`/memory`를 실행하고 auto memory 폴더를 선택하여 Claude가 저장한 내용을 탐색하세요. 모든 것은 읽고, 편집하고, 삭제할 수 있는 일반 마크다운입니다.

### CLAUDE.md가 너무 큼

200줄을 초과하는 파일은 더 많은 컨텍스트를 소비하고 준수도를 낮출 수 있습니다. path-scoped rules을 사용하여 Claude가 일치하는 파일로 작업할 때만 지침이 로드되도록 하거나, 모든 세션에 필요하지 않은 콘텐츠를 줄이세요. `@path` import로 분할하는 것은 구성에 도움이 되지만, import된 파일도 시작 시 로드되므로 컨텍스트를 줄이지는 않습니다.

### /compact 후 지침이 사라짐

프로젝트 루트의 CLAUDE.md는 압축 후에도 유지됩니다: `/compact` 후 Claude가 디스크에서 다시 읽어 세션에 재주입합니다. 하위 디렉토리에 중첩된 CLAUDE.md 파일은 자동으로 재주입되지 않으며, Claude가 해당 하위 디렉토리의 파일을 다시 읽을 때 로드됩니다.

압축 후 지침이 사라졌다면, 대화에서만 주어졌거나 아직 다시 로드되지 않은 중첩 CLAUDE.md에 있을 수 있습니다. 대화 전용 지침을 CLAUDE.md에 추가하여 지속되도록 만드세요.

---

## 요약

Claude Code의 메모리 시스템은 세션 간 일관성을 제공하는 핵심 기능입니다. CLAUDE.md 파일은 사용자가 작성하는 지속적 지침이며, auto memory는 Claude가 스스로 학습 내용을 축적하는 메커니즘입니다. 계층적 구조(관리형 정책 > 사용자 > 프로젝트 > 로컬), Import 기능(최대 5단계), `.claude/rules/`를 통한 path-specific 규칙(frontmatter `paths` 필드), managed CLAUDE.md를 통한 조직 전체 배포를 이해하는 것이 중요합니다. CLAUDE.md의 블록 수준 HTML 주석은 컨텍스트 주입 전에 제거되며, auto memory는 `MEMORY.md` 엔트리포인트 기반으로 최대 200줄/25KB가 로드되고 토픽 파일은 온디맨드로 읽힙니다. `.claude/` 디렉토리는 `.worktreeinclude`, `commands/`, `output-styles/`, `keybindings.json`, `themes/` 등의 파일도 포함하며, 애플리케이션 데이터는 `cleanupPeriodDays`(기본 30일)에 따라 자동 정리되거나 무기한 보관됩니다. 정기적인 검토와 업데이트를 통해 항상 최신 상태를 유지하세요.
