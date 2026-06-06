# 배포 및 생태계 비교: Claude Code vs Codex

> 101개 에이전트로 조사한 두 플랫폼의 배포 모델, 생태계 성숙도, 커뮤니티 리소스 비교

## 목차

- [배포 모델 비교](#배포-모델-비교)
- [플러그인 아키텍처 비교](#플러그인-아키텍처-비교)
- [확장성 매트릭스](#확장성-매트릭스)
- [커뮤니티 리소스](#커뮤니티-리소스)
- [플러그인 개발 체크리스트](#플러그인-개발-체크리스트)
- [마이그레이션 가이드](#마이그레이션-가이드)
- [공식 문서 전체 링크](#공식-문서-전체-링크)

---

## 배포 모델 비교

### Claude Code

```
┌──────────────────────────────────────┐
│         Claude Code 배포 모델          │
│                                      │
│  ┌──────────┐    ┌────────────────┐  │
│  │ 마켓플레이스 │───►│  공식 배포 채널  │  │
│  └──────────┘    └────────────────┘  │
│       │                              │
│       ▼                              │
│  ┌──────────┐    ┌────────────────┐  │
│  │팀 설정 공유 │───►│  리포지토리 신뢰  │  │
│  │.claude/   │    │  시 자동 설치   │  │
│  └──────────┘    └────────────────┘  │
│                                      │
│  ┌──────────┐                        │
│  │ 로컬 개발  │                       │
│  │--plugin   │                       │
│  └──────────┘                        │
└──────────────────────────────────────┘
```

| 배포 방법 | 설명 | 대상 |
|-----------|------|------|
| **마켓플레이스** | 공식 플러그인 마켓플레이스에 등록 | 전체 사용자 |
| **팀 설정** | `.claude/settings.json`에 플러그인 명시 | 팀/조직 |
| **로컬 테스트** | `--plugin` 플래그로 직접 로드 | 개발자 |

### Codex

```
┌──────────────────────────────────────┐
│          Codex 배포 모델               │
│                                      │
│  ┌──────────┐    ┌────────────────┐  │
│  │플러그인 번들 │───►│ 단일 배포 패키지  │  │
│  │.codex-plugin/│  │                │  │
│  └──────────┘    └────────────────┘  │
│                                      │
│  ┌──────────┐    ┌────────────────┐  │
│  │ 로컬 스킬   │───►│  REPO/USER     │  │
│  │ .agents/  │    │  스코프 배포    │  │
│  └──────────┘    └────────────────┘  │
│                                      │
│  ┌──────────┐    ┌────────────────┐  │
│  │ GitHub    │───►│  스킬 공유       │  │
│  │ 저장소     │    │                │  │
│  └──────────┘    └────────────────┘  │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ requirements.toml (엔터프라이즈) │    │
│  │ /etc/codex/ managed hooks     │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

| 배포 방법 | 설명 | 대상 |
|-----------|------|------|
| **플러그인 번들** | 스킬+앱+MCP+훅 단일 패키지 | 전체 사용자 |
| **로컬 스킬** | `.agents/skills/` 디렉토리 | 프로젝트/사용자 |
| **GitHub 공유** | 리포지토리를 통한 스킬 배포 | 커뮤니티 |
| **관리형 배포** | `requirements.toml` + managed hooks | 엔터프라이즈 |

---

## 플러그인 아키텍처 비교

### 구조 비교

```
Claude Code Plugin              Codex Plugin
─────────────────              ────────────
my-plugin/                     my-plugin/
├── .claude-plugin/            ├── .codex-plugin/
│   └── plugin.json    ←→      │   └── plugin.json
├── commands/          ←→      ├── skills/        (SKILL.md)
│   └── cmd.md                 │   └── agents/openai.yaml
├── agents/            ←→      ├── apps/
│   └── agent.md               │   └── app.json
├── skills/            ←→      ├── hooks/
│   └── skill.md                │   └── hooks.json
├── hooks/             ←→      └── mcp/
│   └── hooks.json              │   └── config.json
└── .mcp.json          ←→
```

### 컴포넌트 매핑

| 기능 | Claude Code | Codex | 호환성 |
|------|-------------|-------|--------|
| **명령어/스킬** | `.claude/commands/*.md` | `skills/*/SKILL.md` | 개념 유사, 형식 상이 |
| **에이전트** | `agents/*.md` | `skills/*/agents/openai.yaml` | Codex는 YAML 메타데이터 추가 |
| **훅** | `hooks/hooks.json` | `hooks/hooks.json` | JSON 형식 공유, 이벤트 수 차이 |
| **MCP** | `.mcp.json` | `config.toml [mcpServers]` | 설정 형식 다름 (JSON vs TOML) |
| **앱 연동** | ❌ | `apps/*.json` | Codex 전용 |

---

## 확장성 매트릭스

### 기능 확장성

| 확장 영역 | Claude Code | Codex | 비고 |
|-----------|:-----------:|:-----:|------|
| **커스텀 명령어** | ✅ 마크다운 | ✅ SKILL.md | 둘 다 마크다운 기반 |
| **커스텀 에이전트** | ✅ .md + frontmatter | ✅ openai.yaml | Codex는 더 세밀한 제어 |
| **도구 확장** | ✅ MCP | ✅ MCP + Apps | Codex가 더 다양한 옵션 |
| **라이프사이클 제어** | ✅ 5종 훅 | ✅ 10종 훅 | Codex가 2배 더 세분화 |
| **도구 호출 재작성** | ❌ | ✅ | Codex 전용 |
| **권한 자동 승인** | ❌ | ✅ PermissionRequest | Codex 전용 |
| **컨텍스트 제어** | ❌ | ✅ PreCompact/PostCompact | Codex 전용 |
| **세션 초기화** | ❌ | ✅ SessionStart | Codex 전용 |
| **서브에이전트 추적** | ❌ | ✅ SubagentStart/Stop | Codex 전용 |
| **MCP 서버 모드** | ❌ | ✅ (실험적) | Codex 전용 |
| **OAuth 인증** | ❌ | ✅ | Codex 전용 |
| **HTTP 전송** | ❌ | ✅ Streamable HTTP | Codex 전용 |
| **엔터프라이즈 관리** | ⚠️ 팀 설정 공유 | ✅ requirements.toml | Codex가 더 강력 |
| **마켓플레이스** | ✅ | ❌ | Claude Code 전용 |

### 보안 확장성

| 보안 기능 | Claude Code | Codex |
|-----------|:-----------:|:-----:|
| **훅 신뢰 검토** | 설정 파일 기반 | 해시 기반 명시적 신뢰 |
| **훅 변경 감지** | ❌ | ✅ 재신뢰 필요 |
| **관리형 훅** | ❌ | ✅ managed_dir |
| **훅 전용 제한** | ❌ | ✅ allow_managed_hooks_only |
| **도구별 승인** | ❌ | ✅ per-tool approval |
| **환경 격리** | 설정 스코프 | config.toml 스코프 |

---

## 커뮤니티 리소스

### Claude Code

| 리소스 | 링크 | 설명 |
|--------|------|------|
| **공식 문서** | [docs.anthropic.com](https://docs.anthropic.com/en/docs/claude-code) | 플러그인, 훅, MCP, 설정 |
| **claude-code-hooks-demo** | [GitHub](https://github.com/sbusanelli/claude-code-hooks-demo) | 훅 데모 및 예제 |
| **claude-code-hooks** | [GitHub](https://github.com/yurukusa/claude-code-hooks) | 유용한 훅 컬렉션 |
| **claude-skills** | [GitHub](https://github.com/alirezarezvani/claude-skills) | 커뮤니티 스킬 모음 |
| **claw-orchestrator** | [GitHub](https://github.com/Enderfga/claw-orchestrator) | 에이전트 오케스트레이션 |
| **tool-engrams** | [GitHub](https://github.com/jpcarranza94/tool-engrams) | 도구 메모리 패턴 |
| **agent-manual** | [GitHub](https://github.com/Ar9av/agent-manual) | 에이전트 매뉴얼 |

### Codex

| 리소스 | 링크 | 설명 |
|--------|------|------|
| **공식 문서** | [developers.openai.com](https://developers.openai.com/codex) | 플러그인, 훅, 스킬, 설정 |
| **openai/codex** | [GitHub](https://github.com/openai/codex) | 오픈소스 CLI (Rust) |
| **openai/skills** | [GitHub](https://github.com/openai/skills) | 공식 스킬 저장소 |
| **config.schema.json** | [GitHub](https://github.com/openai/codex/blob/main/codex-rs/core/config.schema.json) | 설정 JSON Schema |

---

## 플러그인 개발 체크리스트

### Claude Code 플러그인 배포 체크리스트

```markdown
## Claude Code 플러그인 배포 준비

### 필수
- [ ] `.claude-plugin/plugin.json` 매니페스트 작성
  - [ ] name, version, description, author 필드
- [ ] 최소 1개 이상의 컴포넌트 포함
  - [ ] commands/ (슬래시 명령어) 또는
  - [ ] agents/ (커스텀 에이전트) 또는
  - [ ] hooks/ (라이프사이클 훅)

### 권장
- [ ] README.md 작성
- [ ] 슬래시 명령어에 frontmatter 메타데이터 추가
  - [ ] description
  - [ ] allowed-tools (최소 권한)
  - [ ] argument-hint
- [ ] MCP 서버 포함 시 .mcp.json 작성
- [ ] 환경변수는 `${VAR}` 형식 사용
- [ ] 훅 핸들러에 적절한 matcher 설정

### 배포
- [ ] 마켓플레이스 제출 가이드 확인
- [ ] 팀 설정 테스트 (.claude/settings.json)
- [ ] `--plugin` 플래그로 로컬 테스트
```

### Codex 플러그인 배포 체크리스트

```markdown
## Codex 플러그인 배포 준비

### 필수
- [ ] `.codex-plugin/plugin.json` 매니페스트 작성
  - [ ] name, version, description, author 필드
  - [ ] components 필드에 포함할 컴포넌트 명시
- [ ] 최소 1개 이상의 컴포넌트 포함
  - [ ] skills/ (SKILL.md 필수) 또는
  - [ ] apps/ 또는
  - [ ] hooks/ 또는
  - [ ] MCP 서버

### 권장
- [ ] README.md 작성
- [ ] 스킬에 agents/openai.yaml 포함
  - [ ] invocation 정책 (allow_implicit_invocation)
  - [ ] mcp_tools 의존성 선언
- [ ] 훅 핸들러에 타임아웃 설정
- [ ] MCP 서버에 승인 모드 설정
  - [ ] per-server 또는 per-tool
  - [ ] enabled_tools / disabled_tools
- [ ] Windows 호환성 필요시 commandWindows 설정

### 배포
- [ ] 로컬 스코프 테스트 (REPO, USER)
- [ ] 훅 신뢰 검토 테스트 (/hooks)
- [ ] 엔터프라이즈 배포 시 requirements.toml 확인
```

---

## 마이그레이션 가이드

### Claude Code → Codex 마이그레이션

#### 슬래시 명령어 → 스킬

```bash
# Claude Code
.claude/commands/review.md

# ↓ 마이그레이션 ↓

# Codex
.agents/skills/review/SKILL.md
.agents/skills/review/agents/openai.yaml
```

#### 훅 마이그레이션

```json
// Claude Code (.claude/settings.json)
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "validate.sh" }]
      }
    ]
  }
}

// ↓ 마이그레이션 ↓

// Codex (hooks/hooks.json)
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "handlers": [
          {
            "type": "command",
            "command": "validate.sh",
            "timeout": 5000
          }
        ]
      }
    ]
  }
}
```

#### MCP 설정 마이그레이션

```json
// Claude Code (.mcp.json)
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["server.js"],
      "env": { "KEY": "${API_KEY}" }
    }
  }
}

// ↓ 마이그레이션 ↓

// Codex (config.toml)
// [mcpServers.my-server]
// command = "node"
// args = ["server.js"]
// startup_timeout_sec = 30
// tool_timeout_sec = 60
//
// [mcpServers.my-server.env]
// KEY = "${API_KEY}"
```

### Codex → Claude Code 마이그레이션

#### 스킬 → 슬래시 명령어

```bash
# Codex
.agents/skills/review/SKILL.md

# ↓ 마이그레이션 ↓

# Claude Code
.claude/commands/review.md
```

> **주의**: Codex의 agents/openai.yaml 메타데이터(호출 정책, MCP 의존성)는 Claude Code에서 직접 지원하지 않으므로, 수동으로 변환해야 합니다.

#### Codex 전용 기능 제한

다음 Codex 기능은 Claude Code에 직접 대응되지 않습니다:

| Codex 기능 | Claude Code 대응 |
|-----------|-----------------|
| PermissionRequest 훅 | 없음 (수동 권한 관리) |
| PreCompact/PostCompact 훅 | 없음 |
| SubagentStart/Stop 훅 | 없음 |
| 도구 호출 재작성 (updatedInput) | 없음 |
| MCP 서버 모드 | 없음 |
| Streamable HTTP MCP | 없음 (stdio만) |
| OAuth MCP 인증 | 없음 |
| requirements.toml | 팀 설정 공유로 대체 |
| 해시 기반 훅 신뢰 | 설정 파일 기반 신뢰 |

---

## 공식 문서 전체 링크

### Anthropic (Claude Code)

| 문서 | URL |
|------|-----|
| Plugins | https://docs.anthropic.com/en/docs/claude-code/plugins |
| Slash Commands | https://docs.anthropic.com/en/docs/claude-code/slash-commands |
| Hooks | https://docs.anthropic.com/en/docs/claude-code/hooks |
| MCP | https://docs.anthropic.com/en/docs/claude-code/mcp |
| Settings | https://docs.anthropic.com/en/docs/claude-code/settings |
| Subagents | https://docs.anthropic.com/en/docs/claude-code/subagents |

### OpenAI (Codex)

| 문서 | URL |
|------|-----|
| Plugins | https://developers.openai.com/codex/plugins |
| Plugin Build | https://developers.openai.com/codex/plugins/build |
| Hooks | https://developers.openai.com/codex/hooks |
| Skills | https://developers.openai.com/codex/skills |
| Config Reference | https://developers.openai.com/codex/config-reference |
| GitHub: codex | https://github.com/openai/codex |
| GitHub: skills | https://github.com/openai/skills |
| GitHub: config.schema.json | https://github.com/openai/codex/blob/main/codex-rs/core/config.schema.json |

### MCP (공통)

| 문서 | URL |
|------|-----|
| MCP 공식 사이트 | https://modelcontextprotocol.io |
| Build Server | https://modelcontextprotocol.io/docs/develop/build-server |

### 커뮤니티 (보조 소스)

| 리소스 | URL |
|--------|-----|
| claude-code-hooks-demo | https://github.com/sbusanelli/claude-code-hooks-demo |
| claude-code-hooks | https://github.com/yurukusa/claude-code-hooks |
| claude-skills | https://github.com/alirezarezvani/claude-skills |
| claw-orchestrator | https://github.com/Enderfga/claw-orchestrator |
| tool-engrams | https://github.com/jpcarranza94/tool-engrams |
| agent-manual | https://github.com/Ar9av/agent-manual |

---

## 조사 통계

| 항목 | 수치 |
|------|------|
| **조사 에이전트 수** | 101개 |
| **검색 각도** | 5개 |
| **수집 소스** | 19개 |
| **추출 클레임** | 95개 |
| **검증 클레임** | 25개 |
| **확정 클레임** | 25개 (100%) |
| **반박 클레임** | 0개 |
| **최종 합성 결과** | 7개 |
| **소스 중복 제거** | 7개 |
| **예산 초과 드롭** | 3개 |
