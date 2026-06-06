# Agent Skills

> 스킬(Skills)은 오픈 에이전트 스킬 표준에 기반하여, 지시사항, 리소스, 선택적 스크립트를 패키징하여 Codex에 작업별 기능을 확장하는 시스템입니다.

**참조:** [Agent Skills - Codex | OpenAI Developers](https://developers.openai.com/codex/skills)

---

## 1. 스킬 개요

스킬은 Codex가 특정 워크플로를 안정적으로 수행할 수 있도록 지시사항, 리소스, 선택적 스크립트를 패키징한 단위입니다. 스킬은 **오픈 에이전트 스킬 표준(Open Agent Skills Standard)**에 기반합니다.

- **스킬(Skills)**: 재사용 가능한 워크플로의 **작성 포맷**입니다. 워크플로 자체를 설계할 때 사용합니다.
- **플러그인(Plugins)**: 재사용 가능한 스킬과 앱을 Codex에 설치하는 **배포 단위**입니다.

스킬을 먼저 설계한 다음, 다른 개발자가 설치할 수 있도록 플러그인으로 패키징합니다.

스킬은 Codex CLI, IDE 확장, Codex 앱 모두에서 사용할 수 있습니다.

---

## 2. 점진적 공개 (Progressive Disclosure)

스킬은 컨텍스트를 효율적으로 관리하기 위해 **점진적 공개**를 사용합니다:

1. **초기 로드:** Codex는 각 스킬의 `name`, `description`, 파일 경로만 로드합니다.
2. **사용 시 전체 로드:** Codex가 스킬을 사용하기로 결정하면 전체 `SKILL.md` 지시사항을 로드합니다.

### 컨텍스트 예산

- 스킬 목록은 모델 컨텍스트 윈도우의 **약 2%** (컨텍스트 윈도우를 알 수 없는 경우 8,000자)로 제한됩니다.
- 스킬이 많이 설치된 경우 Codex가 설명을 먼저 줄입니다.
- 매우 큰 스킬 세트의 경우 일부 스킬이 초기 목록에서 생략될 수 있으며, 경고가 표시됩니다.
- 이 예산은 **초기 스킬 목록에만** 적용됩니다. 스킬이 선택되면 전체 `SKILL.md`가 로드됩니다.

---

## 3. 스킬 디렉토리 구조

스킬은 `SKILL.md` 파일과 선택적 스크립트 및 참조 자료를 포함하는 디렉토리입니다. `SKILL.md` 파일에는 `name`과 `description`이 반드시 포함되어야 합니다.

```
my-skill/
├── SKILL.md              # 필수: 지시사항 + 메타데이터
├── scripts/              # 선택: 실행 가능한 코드
├── references/           # 선택: 참조 문서
├── assets/               # 선택: 템플릿, 리소스
└── agents/
    └── openai.yaml       # 선택: 외관 메타데이터 및 종속성
```

| 파일/디렉토리 | 필수 여부 | 설명 |
|---|---|---|
| `SKILL.md` | **필수** | 지시사항과 메타데이터 (frontmatter + 본문). `name`과 `description` 필드 포함 |
| `scripts/` | 선택 | 실행 가능한 보조 스크립트 |
| `references/` | 선택 | 참조 문서 및 자료 |
| `assets/` | 선택 | 템플릿, 이미지 등 리소스 |
| `agents/openai.yaml` | 선택 | UI 메타데이터, 호출 정책, 도구 종속성 |

---

## 4. SKILL.md 형식

`SKILL.md`는 YAML frontmatter와 Markdown 본문으로 구성됩니다.

### frontmatter (필수 필드)

| 필드 | 필수 여부 | 설명 |
|---|---|---|
| `name` | **필수** | 스킬 이름 |
| `description` | **필수** | 스킬이 언제 트리거되어야 하고 언제 트리거되지 않아야 하는지 정확히 설명 |

### 본문

본문에는 Codex가 따라야 할 지시사항을 작성합니다.

### 예시

```markdown
---
name: skill-name
description: Explain exactly when this skill should and should not trigger.
---

Skill instructions for Codex to follow.
```

---

## 5. 스킬 활성화 방식

Codex는 두 가지 방식으로 스킬을 활성화할 수 있습니다:

### 5.1 명시적 호출 (Explicit Invocation)

사용자가 프롬프트에서 스킬을 직접 지정합니다:

- CLI/IDE에서 `/skills` 명령어를 실행하거나 `$`를 입력하여 스킬을 언급합니다.

### 5.2 암시적 호출 (Implicit Invocation)

Codex가 사용자의 작업이 스킬의 `description`과 일치한다고 판단하면 자동으로 스킬을 선택합니다.

**중요:** 암시적 매칭은 `description`에 의존하므로, 핵심 사용 사례와 트리거 단어를 앞에 배치한 간결한 설명을 작성해야 합니다. 설명이 단축되더라도 스킬을 매칭할 수 있도록 해야 합니다.

---

## 6. 스킬 검색 위치

Codex는 저장소, 사용자, 관리자, 시스템 위치에서 스킬을 읽습니다. 저장소의 경우 현재 작업 디렉토리부터 저장소 루트까지 모든 디렉토리의 `.agents/skills`를 스캔합니다.

| 범위 | 위치 | 권장 용도 |
|---|---|---|
| **REPO** | `$CWD/.agents/skills` (현재 작업 디렉토리) | 마이크로서비스나 모듈에 관련된 스킬을 체크인 |
| **REPO** | `$CWD/../.agents/skills` (상위 폴더, Git 저장소 내) | 중첩 폴더가 있는 저장소에서 공유 영역의 스킬을 체크인 |
| **REPO** | `$REPO_ROOT/.agents/skills` (저장소 최상단) | 저장소의 모든 하위 폴더에서 사용 가능한 공통 스킬. 루트 스킬 역할 |
| **USER** | `$HOME/.agents/skills` | 사용자 개인 폴더. 모든 저장소에 적용되는 개인 스킬 |
| **ADMIN** | `/etc/codex/skills` | 머신/컨테이너의 모든 사용자에게 제공되는 관리자 스킬 |
| **SYSTEM** | Codex에 내장 (OpenAI 제공) | `skill-creator`, `plan` 등 광범위한 대상을 위한 스킬 |

- 두 스킬이 같은 `name`을 가지면 **병합하지 않으며**, 둘 다 스킬 선택기에 나타납니다.
- Codex는 **심볼릭 링크된 스킬 폴더**를 지원하며, 스캔 시 링크 대상을 따릅니다.

이러한 위치는 **작성 및 로컬 검색**을 위한 것입니다. 재사용 가능한 스킬을 단일 저장소 이상으로 배포하거나 앱 통합과 함께 번들링하려면 **플러그인**을 사용하세요.

---

## 7. 스킬과 플러그인의 관계

직접 스킬 폴더는 **로컬 작성과 저장소 범위 워크플로**에 가장 적합합니다. 재사용 가능한 스킬을 배포하거나, 둘 이상의 스킬을 함께 번들링하거나, 스킬을 앱 통합과 함께 제공하려면 **플러그인**으로 패키징하세요.

플러그인은 하나 이상의 스킬을 포함할 수 있으며, 선택적으로 앱 매핑, MCP 서버 구성, 프레젠테이션 에셋을 단일 패키지로 번들링할 수 있습니다.

---

## 8. openai.yaml 메타데이터

`agents/openai.yaml` 파일을 추가하여 Codex 앱의 UI 메타데이터, 호출 정책, 도구 종속성을 구성할 수 있습니다. 이를 통해 스킬 사용 경험을 더 매끄럽게 만들 수 있습니다.

```yaml
interface:
  display_name: "Optional user-facing name"
  short_description: "Optional user-facing description"
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

### 필드 설명

| 필드 | 설명 |
|---|---|
| `interface.display_name` | 사용자에게 표시되는 이름 |
| `interface.short_description` | 사용자에게 표시되는 짧은 설명 |
| `interface.icon_small` | 작은 아이콘 경로 |
| `interface.icon_large` | 큰 아이콘 경로 |
| `interface.brand_color` | 브랜드 색상 |
| `interface.default_prompt` | 스킬 사용 시 기본 프롬프트 |
| `policy.allow_implicit_invocation` | 암시적 호출 허용 여부 (기본값: `true`). `false`로 설정 시 명시적 `$skill` 호출만 가능 |
| `dependencies.tools` | 스킬이 의존하는 도구 목록 (예: MCP 서버) |

---

## 9. 스킬 비활성화

`~/.codex/config.toml`에서 `[[skills.config]]` 항목을 사용하여 스킬을 삭제하지 않고 비활성화할 수 있습니다:

```toml
[[skills.config]]
path = "/path/to/skill/SKILL.md"
enabled = false
```

`~/.codex/config.toml` 변경 후 **Codex를 재시작**해야 합니다.

---

## 10. 스킬 생성 및 설치

### 10.1 내장 크리에이터 사용

가장 빠른 방법은 내장 크리에이터를 사용하는 것입니다:

```
$skill-creator
```

크리에이터가 스킬의 기능, 트리거 조건, 지시사항 전용인지 스크립트 포함인지를 묻고 자동으로 생성합니다. **지시사항 전용(instruction-only)**이 기본값입니다.

### 10.2 수동 생성

스킬 폴더와 `SKILL.md` 파일을 직접 생성할 수도 있습니다:

```bash
mkdir -p my-skill
cat > my-skill/SKILL.md << 'EOF'
---
name: skill-name
description: Explain exactly when this skill should and should not trigger.
---

Skill instructions for Codex to follow.
EOF
```

Codex는 스킬 변경을 **자동으로 감지**합니다. 업데이트가 반영되지 않으면 Codex를 재시작하세요.

### 10.3 skill-installer 사용

내장 스킬 외에 추가 스킬을 로컬에 설치하려면 `$skill-installer`를 사용합니다:

```bash
$skill-installer linear
```

다른 저장소에서 스킬을 다운로드하도록 설치 프로그램에 프롬프트할 수도 있습니다. Codex는 새로 설치된 스킬을 자동으로 감지하며, 나타나지 않으면 Codex를 재시작합니다.

**참고:** 이 방법은 **로컬 설정과 실험**용입니다. 자체 스킬의 재사용 가능한 배포에는 **플러그인**을 사용하는 것이 좋습니다.

---

## 11. 스킬 작성 모범 사례

1. **각 스킬은 하나의 작업에 집중하세요.**
2. **지시사항을 우선하세요.** 결정론적 동작이나 외부 도구가 필요한 경우가 아니면 스크립트보다 지시사항을 선호합니다.
3. **명시적 입력과 출력으로 필수 단계를 작성하세요.**
4. **설명을 테스트하세요.** 스킬 설명에 대해 다양한 프롬프트로 테스트하여 올바른 트리거 동작을 확인합니다.

---

## 12. 공식 스킬 저장소

더 많은 예시는 다음에서 확인할 수 있습니다:

- **GitHub:** [github.com/openai/skills](https://github.com/openai/skills)
- **에이전트 스킬 사양:** 공식 에이전트 스킬 명세 문서 참조
