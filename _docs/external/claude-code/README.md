# Claude Code 개발자 문서

> [Anthropic Claude Code 공식 문서](https://code.claude.com/docs/en/overview)를 기반으로 정리한 한국어 개발자 가이드입니다.
> 최종 업데이트: 2026-06-06

Claude Code는 Anthropic이 개발한 에이전트 기반 코딩 도구입니다. 터미널, VS Code, JetBrains, 데스크톱 앱, 웹 브라우저 등 다양한 환경에서 동작하며, 자연어 명령으로 코드 작성·수정·탐색·디버깅이 가능합니다.

---

## 문서 목록

### 시작하기

| # | 문서 | 설명 |
| --- | --- | --- |
| 00 | [개요](./00-overview.md) | Claude Code 소개, 5가지 환경, 설치 방법, 핵심 기능 요약 |
| 14 | [빠른 시작](./14-quickstart.md) | 5분 퀵스타트 — 설치, 로그인, 첫 세션 |
| 01 | [설치 및 설정](./01-installation.md) | 시스템 요구사항, 플랫폼별 설치, Bedrock/Vertex/Foundry 연동, 프록시 |

### 핵심 기능

| # | 문서 | 설명 |
| --- | --- | --- |
| 02 | [CLI 참조](./02-cli-reference.md) | CLI 명령어, 플래그, 슬래시 명령어, 단축키, Vim 모드, 내장 도구 |
| 03 | [설정](./03-settings.md) | 설정 파일 계층, 권한, 샌드박스, 워크트리, 어트리뷰션, 환경 변수 |
| 04 | [플러그인](./04-plugins.md) | 플러그인 시스템, 매니페스트, 마켓플레이스, channels |
| 05 | [스킬 (Skills)](./05-slash-commands.md) | SKILL.md 포맷, 커스텀 슬래시 명령어, 번들 스킬, scope hierarchy |
| 06 | [훅 (Hooks)](./06-hooks.md) | 이벤트 핸들러, 5가지 훅 타입, 필터링, 백그라운드 실행 |
| 07 | [MCP 통합](./07-mcp.md) | Model Context Protocol, OAuth, Tool Search, WebSocket, 자동 재연결 |
| 08 | [서브에이전트 및 에이전트 팀](./08-subagents.md) | 커스텀 에이전트 정의, 에이전트 팀, frontmatter, 모델 선택, isolation |
| 09 | [메모리](./09-memory.md) | CLAUDE.md, .claude/rules/, 자동 메모리, AGENTS.md 통합 |

### 통합 및 플랫폼

| # | 문서 | 설명 |
| --- | --- | --- |
| 10 | [IDE 통합](./10-ide-integrations.md) | VS Code, JetBrains 확장, @-mentions, 프롬프트 박스 |
| 11 | [SDK](./11-sdk.md) | 서브프로세스 SDK, Headless 모드, --bare, 구조화된 출력 |
| 12 | [GitHub Actions](./12-github-actions.md) | CI/CD 파이프라인, GitLab CI/CD, 스킬 사용, 커스텀 GitHub App |
| 23 | [플랫폼](./23-platforms.md) | 데스크톱 앱, 웹, Chrome, Remote Control, Channels, Devcontainer, Slack, 음성 입력 |
| 25 | [Computer Use](./25-computer-use.md) | CLI에서 화면 제어, 네이티브 앱 검증, UI 테스트, 시뮬레이터 구동 |

### 모델 및 출력

| # | 문서 | 설명 |
| --- | --- | --- |
| 17 | [출력 스타일](./17-output-styles.md) | Default, Proactive, Explanatory, Learning — 커스텀 스타일 |
| 18 | [모델 구성](./18-model-configuration.md) | 모델 별칭, effort level, extended thinking, 1M 컨텍스트, fast mode, 프롬프트 캐싱 |
| 19 | [상태 라인](./19-statusline.md) | 상태 라인 구성, 사용 가능 데이터, /statusline 명령어 |

### 고급 기능

| # | 문서 | 설명 |
| --- | --- | --- |
| 15 | [일반 워크플로우](./15-common-workflows.md) | 탐색→계획→코딩 워크플로우, 프롬프트 작성법, 모범 사례, 대규모 코드베이스 |
| 20 | [Agent SDK](./20-agent-sdk.md) | TypeScript/Python SDK, 에이전트 루프, 커스텀 도구, 스트리밍, 마이그레이션 |
| 21 | [Dynamic Workflows](./21-dynamic-workflows.md) | 병렬 에이전트 오케스트레이션, Agent Teams, Agent View, /goal |
| 22 | [세션 및 워크트리](./22-sessions-worktrees.md) | 세션 관리, git worktree 격리, 체크포인트, 딥 링크 |
| 26 | [Routines 및 예약 작업](./26-routines-scheduling.md) | Routines, Scheduled Tasks, CronCreate, /loop, ScheduleWakeup |
| 27 | [Ultraplan & Ultrareview](./27-ultraplan-ultrareview.md) | 클라우드 기반 계획 수립, 다중 에이전트 병렬 코드 리뷰, 세션 리캡 |

### 보안 및 정책

| # | 문서 | 설명 |
| --- | --- | --- |
| 13 | [보안](./13-security.md) | 보안 모델, 샌드박싱, 권한 모드, 데이터 사용, 법률/규정준수, ZDR |
| 24 | [엔터프라이즈 관리](./24-enterprise-admin.md) | 관리형 설정, IAM, LLM 게이트웨이, 비용/사용량 모니터링, 규정 준수 |

### 문제 해결

| # | 문서 | 설명 |
| --- | --- | --- |
| 16 | [트러블슈팅](./16-troubleshooting.md) | 증상 기반 라우팅, 에러 레퍼런스, 설치 문제, 성능 문제 |

---

## 빠른 참조

### 설치
```bash
# macOS / Linux / WSL
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex

# Homebrew (macOS)
brew install --cask claude-code
```

### 기본 명령어
```bash
claude                        # 대화형 모드
claude -p "쿼리"              # 원샷 모드
claude -c                     # 이전 대화 이어서
claude --model opus           # 모델 지정
```

### 핵심 슬래시 명령어
| 명령어 | 설명 |
|--------|------|
| `/help` | 도움말 |
| `/compact` | 대화 압축 |
| `/model` | 모델 변경 |
| `/config` | 설정 관리 |
| `/memory` | CLAUDE.md 편집 |
| `/effort` | 노력 수준 조절 |
| `/fast` | 빠른 모드 토글 |
| `/status` | 계정 상태 |
| `/doctor` | 설치 진단 |

---

## 원문 링크

- 공식 문서: https://code.claude.com/docs/en/overview
- GitHub: https://github.com/anthropics/claude-code
- 릴리스 노트: https://github.com/anthropics/claude-code/releases
- API 레퍼런스: https://docs.anthropic.com/en/api/claude-code
- 상태 페이지: https://status.anthropic.com/
