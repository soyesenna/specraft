# Codex CLI 플러그인 개발 완전 가이드

> 공식 문서: https://developers.openai.com/codex/plugins

## 목차

- [플러그인 구조](#플러그인-구조)
- [plugin.json 매니페스트](#pluginjson-매니페스트)
- [컴포넌트 타입](#컴포넌트-타입)
  - [스킬 (Skills)](#스킬-skills)
  - [앱 연동 (Apps)](#앱-연동-apps)
  - [MCP 서버](#mcp-서버)
  - [라이프사이클 훅 (Hooks)](#라이프사이클-훅-hooks)
- [설정 (config.toml)](#설정-configtoml)
- [보안 및 신뢰 모델](#보안-및-신뢰-모델)
- [엔터프라이즈 관리](#엔터프라이즈-관리)
- [배포 방법](#배포-방법)

---

## 플러그인 구조

Codex 플러그인은 **디렉토리 기반 번들**로, 여러 컴포넌트를 단일 배포 가능 패키지로 묶습니다:

```
my-codex-plugin/
├── .codex-plugin/
│   └── plugin.json          # 필수 매니페스트
├── skills/                   # 재사용 가능한 지침 (선택)
│   ├── my-skill/
│   │   ├── SKILL.md          # 필수
│   │   ├── agents/
│   │   │   └── openai.yaml   # UI 메타데이터 + 호출 정책
│   │   ├── scripts/          # 실행 스크립트 (선택)
│   │   ├── references/       # 참조 문서 (선택)
│   │   └── assets/           # 정적 자원 (선택)
│   └── another-skill/
│       └── SKILL.md
├── apps/                     # 도구 연동 (선택)
│   └── my-app.json
├── hooks/
│   └── hooks.json           # 라이프사이클 훅 (선택)
└── mcp/                      # MCP 서버 설정 (선택)
    └── config.json
```

## plugin.json 매니페스트

```json
{
  "name": "my-codex-plugin",
  "version": "1.0.0",
  "description": "내 Codex 플러그인 설명",
  "author": "개발자명",
  "components": {
    "skills": ["skills/my-skill"],
    "apps": ["apps/my-app.json"],
    "hooks": ["hooks/hooks.json"],
    "mcpServers": {
      "my-server": {
        "command": "node",
        "args": ["mcp/server.js"]
      }
    }
  }
}
```

---

## 컴포넌트 타입

Codex 플러그인은 **4가지 컴포넌트 타입**을 지원합니다:

### 1. 스킬 (Skills)

**오픈 에이전트 스킬 표준**을 따르는 재사용 가능한 지침 모음입니다.

> 공식 문서: https://developers.openai.com/codex/skills
> GitHub: https://github.com/openai/skills

#### 스킬 디렉토리 구조

```
my-skill/
├── SKILL.md              # 필수: 스킬 지침 (마크다운)
├── agents/
│   └── openai.yaml       # UI 메타데이터, 호출 정책, MCP 의존성
├── scripts/              # 선택: 실행 스크립트
├── references/           # 선택: 참조 문서
└── assets/               # 선택: 정적 자원
```

#### SKILL.md

스킬의 핵심 지침을 정의하는 마크다운 파일:

```markdown
---
name: code-review
description: "코드 리뷰를 수행하는 스킬"
tags: ["review", "quality"]
---

# 코드 리뷰 스킬

코드를 다음 기준으로 검토합니다:

## 검토 항목
1. 정확성 (Correctness)
2. 보안 (Security)
3. 성능 (Performance)
4. 가독성 (Readability)

## 출력 형식
각 항목별로 심각도(High/Medium/Low)와 함께 피드백을 제공합니다.
```

#### agents/openai.yaml

UI 메타데이터, 호출 정책, MCP 도구 의존성을 선언합니다:

```yaml
name: code-review
description: "코드 리뷰 전문 에이전트"
invocation:
  allow_implicit_invocation: true    # 암시적 호출 허용
  triggers:
    - "코드 리뷰"
    - "code review"
ui:
  icon: "🔍"
  category: "quality"
mcp_tools:
  required:
    - "read_file"
    - "search_code"
  optional:
    - "web_search"
```

#### 스킬 발견 스코프 (4가지)

| 스코프 | 경로 | 설명 |
|--------|------|------|
| **REPO** | `.agents/skills/` | 리포지토리 범위 (CWD→루트 상향 스캔) |
| **USER** | `$HOME/.agents/skills/` | 사용자 범위 |
| **ADMIN** | `/etc/codex/skills/` | 관리자 범위 |
| **SYSTEM** | (Codex 번들) | 시스템 기본 |

#### REPO 스코프 동작

```
/home/user/project/src/components/
  → .agents/skills/          # 검색
/home/user/project/src/
  → .agents/skills/          # 검색
/home/user/project/
  → .agents/skills/          # 검색 (리포지토리 루트)
```

현재 작업 디렉토리에서 리포지토리 루트까지 상향 스캔합니다.

### 2. 앱 연동 (Apps)

사전 구축된 도구 커넥터를 통해 외부 서비스와 연동합니다.

#### 지원 앱

| 앱 | 기능 |
|----|------|
| **GitHub** | PR 생성/리뷰, 이슈 관리, 코드 검색 |
| **Slack** | 메시지 전송, 채널 관리 |
| **Google Drive** | 문서 읽기/쓰기, 파일 관리 |

#### 앱 정의 예시

```json
{
  "name": "my-github-app",
  "type": "github",
  "config": {
    "permissions": ["repo", "read:org"],
    "default_repo": "owner/repo"
  }
}
```

> **참고**: 앱 커넥터의 구체적인 개발 API는 현재 공식 문서에서 충분히 다루어지지 않았습니다.
> 향후 업데이트에서 상세한 개발 가이드가 제공될 예정입니다.

### 3. MCP 서버

Codex는 MCP **클라이언트** 및 **서버** 모드를 모두 지원합니다.

> MCP에 대한 자세한 내용은 [04-mcp-integration.md](./04-mcp-integration.md) 참조

#### config.toml 내 MCP 설정

```toml
[mcpServers.my-server]
command = "node"
args = ["server.js"]
startup_timeout_sec = 30
tool_timeout_sec = 60

[mcpServers.my-server.env]
API_KEY = "${API_KEY}"
```

#### Streamable HTTP 전송

```toml
[mcpServers.remote-server]
url = "https://mcp.example.com/sse"
scopes = ["read", "write"]
oauth_resource = "https://api.example.com"
mcp_oauth_callback_port = 8080
```

#### 서버별 승인 모드

```toml
[mcpServers.my-server.approval]
mode = "per-server"          # "per-server" | "per-tool"
enabled_tools = ["read_file", "search"]
disabled_tools = ["delete"]
```

#### per-tool 승인 오버라이드

```toml
[mcpServers.my-server.approval.tools.read_file]
require_approval = false

[mcpServers.my-server.approval.tools.delete]
require_approval = true
```

### 4. 라이프사이클 훅 (Hooks)

**10종**의 세분화된 라이프사이클 훅을 제공합니다.

> 훅에 대한 자세한 내용은 [03-hooks-comparison.md](./03-hooks-comparison.md) 참조

---

## 설정 (config.toml)

Codex의 주요 설정 파일은 `config.toml` 형식입니다.

### 기본 구조

```toml
# ~/.codex/config.toml

# 모델 설정
[model]
name = "gpt-5"

# MCP 서버
[mcpServers.my-server]
command = "node"
args = ["server.js"]

# 훅 (인라인)
[hooks]
  [[hooks.PreToolUse]]
  matcher = "Bash"
  command = "validate.sh"
```

### 주요 설정 항목

| 설정 | 설명 |
|------|------|
| `[model]` | 기본 모델 설정 |
| `[mcpServers.*]` | MCP 서버 설정 |
| `[hooks]` | 인라인 훅 정의 |
| `[permissions]` | 권한 설정 |
| `[plugins]` | 플러그인 관리 |

### 환경변수

```toml
[mcpServers.my-server.env]
API_KEY = "${API_KEY}"           # 환경변수 참조
BASE_URL = "https://api.example.com"  # 직접 값
NODE_ENV = "production"
```

---

## 보안 및 신뢰 모델

### 해시 기반 훅 신뢰 추적

Codex는 **비관리 훅에 대해 명시적 신뢰 검토**를 요구합니다:

1. **최초 실행**: 훅의 해시를 계산하고 사용자에게 신뢰 여부 확인
2. **변경 감지**: 훅 파일이 변경되면 재신뢰 필요
3. **CLI 관리**: `/hooks` 명령으로 신뢰 상태 관리

```bash
# 훅 신뢰 관리
codex /hooks list          # 신뢰된 훅 목록
codex /hooks trust <id>    # 훅 신뢰
codex /hooks revoke <id>   # 훅 신뢰 취소
```

### 플러그인 훅 신뢰

플러그인 훅은 **설치 시 자동 신뢰되지 않으며**, 동일한 검토 프로세스를 거칩니다:

```
플러그인 설치 → 훅 해시 계산 → 사용자 신뢰 확인 → 활성화
```

---

## 엔터프라이즈 관리

### requirements.toml 시스템

관리자가 조직 전체에 설정을 강제 적용할 수 있습니다:

```toml
# /etc/codex/requirements.toml

[managed_hooks]
managed_dir = "/etc/codex/managed-hooks"
allow_managed_hooks_only = true  # 관리형 훅만 실행
```

#### allow_managed_hooks_only 동작

| 설정값 | 효과 |
|--------|------|
| `false` (기본) | 모든 훅 실행 (사용자/프로젝트/세션/플러그인/관리형) |
| `true` | 관리형 훅만 실행, 나머지 모두 건너뜀 |

### managed_hooks 디렉토리

```
/etc/codex/managed-hooks/
├── pre-tool-use.sh
├── post-tool-use.sh
└── stop.sh
```

관리자가 배포한 훅은 자동으로 신뢰되며, 사용자가 수정할 수 없습니다.

---

## 배포 방법

### 1. 플러그인 번들 배포

스킬, 앱, MCP 서버, 훅을 단일 패키지로 번들링:

```
my-plugin/
├── .codex-plugin/plugin.json
├── skills/
├── apps/
├── hooks/
└── mcp/
```

### 2. 로컬 스킬 배포

로컬 스킬 폴더는 저작 및 리포지토리 범위 워크플로우에 적합합니다:

```bash
# REPO 스코프
.agents/skills/my-skill/SKILL.md

# USER 스코프
~/.agents/skills/my-skill/SKILL.md

# ADMIN 스코프
/etc/codex/skills/my-skill/SKILL.md
```

### 3. 스킬 공유

GitHub 리포지토리를 통해 스킬 공유:

```bash
git clone https://github.com/user/codex-skills.git ~/.agents/skills/shared-skills
```

---

## JSON stdin/stdout 훅 통신 프로토콜

Codex 훅은 **JSON stdin/stdout**으로 통신합니다:

### 입력 (stdin)

```json
{
  "event": "PreToolUse",
  "tool": "Bash",
  "input": {
    "command": "rm -rf /tmp/test"
  },
  "session": {
    "id": "abc123",
    "cwd": "/home/user/project"
  }
}
```

### 출력 (stdout)

```json
{
  "decision": "deny",
  "reason": "위험한 명령입니다"
}
```

### 도구 호출 재작성 (PreToolUse)

```json
{
  "decision": "allow",
  "updatedInput": {
    "command": "rm -rf /tmp/test --dry-run"
  }
}
```

### 권한 자동 승인/거부 (PermissionRequest)

```json
{
  "decision": "allow",
  "reason": "사전 승인된 명령입니다"
}
```

### 연속 프롬프트 생성 (Stop)

```json
{
  "decision": "block",
  "reason": "테스트가 실패했습니다",
  "continuePrompt": "테스트가 실패한 원인을 분석하고 수정하세요."
}
```

---

## 참고 소스

- [OpenAI Codex 플러그인 문서](https://developers.openai.com/codex/plugins)
- [OpenAI Codex 플러그인 빌드 가이드](https://developers.openai.com/codex/plugins/build)
- [OpenAI Codex 스킬 문서](https://developers.openai.com/codex/skills)
- [OpenAI Codex 훅 문서](https://developers.openai.com/codex/hooks)
- [OpenAI Codex 설정 참조](https://developers.openai.com/codex/config-reference)
- [GitHub: openai/codex](https://github.com/openai/codex)
- [GitHub: openai/skills](https://github.com/openai/skills)
- [GitHub: config.schema.json](https://github.com/openai/codex/blob/main/codex-rs/core/config.schema.json)
