# Codex CLI 개발자 문서

> [developers.openai.com/codex](https://developers.openai.com/codex) 및 [github.com/openai/codex](https://github.com/openai/codex)를 기반으로 정리한 한국어 개발자 가이드입니다.
> 최종 업데이트: 2026-06-06

OpenAI **Codex CLI**는 로컬 터미널·IDE·데스크톱 앱·클라우드에서 실행되는 에이전트 기반 코딩 도구입니다. Rust 기반(`codex-rs`)으로 작성되어 빠르고 가볍게 동작하며, 코드 작성·이해·리뷰·디버깅·자동화를 지원합니다.

---

## 문서 목록

### 기본

| # | 문서 | 설명 |
| --- | --- | --- |
| 00 | [개요 및 빠른 시작](./00-overview.md) | 제품 소개, 실행 환경(App/IDE/CLI/Web), 설치, 핵심 기능, 모델 요약 |
| 01 | [설치 및 설정](./01-installation.md) | 시스템 요구사항, App/IDE/CLI/Cloud 설치, API 키, 설정 파일, 트러블슈팅 |
| 17 | [마이그레이션 가이드](./17-migrate.md) | 다른 에이전트 도구(Claude Code, Cursor 등)에서 Codex로 마이그레이션 |
| 15 | [모델 및 요금](./15-models-pricing.md) | 지원 모델(gpt-5.5/5.4/5.3-codex-spark), Fast mode, 요금제, 크레딧 레이트 |

### CLI 참조

| # | 문서 | 설명 |
| --- | --- | --- |
| 02 | [CLI 명령어 및 플래그](./02-cli-reference.md) | CLI 플래그, 슬래시 명령어, 비대화형 모드(exec), SDK, App Server, 자동완성 |

### 설정 및 구성

| # | 문서 | 설명 |
| --- | --- | --- |
| 03 | [config.toml 설정 전체](./03-config-reference.md) | 설정 계층, 모델·샌드박스·승인·권한·규칙·속도·에이전트·메모리·OTel 설정, 환경 변수, 프로필, requirements.toml |
| 13 | [AGENTS.md 가이드](./13-agents-md.md) | AGENTS.md 작성법, 계층 구조, Memories, Chronicle, 유지 관리 |

### 확장 시스템

| # | 문서 | 설명 |
| --- | --- | --- |
| 04 | [플러그인 시스템](./04-plugins.md) | plugin.json 매니페스트, 마켓플레이스, MCP 서버 번들링, 훅 신뢰 모델 |
| 05 | [스킬 시스템](./05-skills.md) | SKILL.md 작성, 점진적 공개, 명시적/암시적 호출, openai.yaml 메타데이터 |
| 06 | [훅 시스템](./06-hooks.md) | 10종 훅 이벤트, stdin/stdout JSON 프로토콜, 플러그인 훅, 관리형 훅, 실전 예제 |
| 07 | [MCP 통합](./07-mcp.md) | STDIO/Streamable HTTP 서버, 공통 설정, OAuth, 플러그인 MCP, 공식 서버 목록 |

### 연동 및 클라우드

| # | 문서 | 설명 |
| --- | --- | --- |
| 08 | [플러그인 및 연동](./08-apps.md) | GitHub Code Review, Slack, Linear, Sites(호스팅), Review, Automations, Worktrees |
| 14 | [Codex Cloud / Web](./14-cloud-web.md) | chatgpt.com/codex, 환경 설정, 인터넷 접근, Sites, @codex 작업 위임 |
| 16 | [IDE 확장 프로그램](./16-ide-extension.md) | VS Code, Cursor, Windsurf, JetBrains 지원, 기능, 설정, 명령어 |

### 에이전트 아키텍처

| # | 문서 | 설명 |
| --- | --- | --- |
| 12 | [서브에이전트 및 멀티 에이전트](./12-subagents.md) | 서브에이전트 설정, MultiAgentV2, AI Teams 구성, 모델 선택, 라이프사이클 |

### 보안 및 정책

| # | 문서 | 설명 |
| --- | --- | --- |
| 09 | [보안 및 샌드박스](./09-security.md) | OS 수준 샌드박스, 승인 정책, Auto-Review, 네트워크 제어, Cyber Safety, Codex Security Plugin/Cloud/FAQ, OTel |
| 10 | [엔터프라이즈 관리](./10-enterprise.md) | requirements.toml, managed_config.toml, MDM 배포, 인증(원격/헤드리스), Access Tokens, Governance, Bedrock |

### 모범 사례

| # | 문서 | 설명 |
| --- | --- | --- |
| 11 | [모범 사례](./11-best-practices.md) | 프롬프트 작성, 추론 수준, AGENTS.md, 검증 루프, MCP/스킬/자동화 활용 |

---

## 빠른 참조

### 설치

```shell
# macOS / Linux (권장)
curl -fsSL https://chatgpt.com/codex/install.sh | sh

# npm
npm install -g @openai/codex

# Homebrew
brew install --cask codex
```

### 핵심 명령어

```shell
codex                          # 대화형 모드
codex exec "작업 설명"          # 비대화형 모드
codex --full-auto              # 자동 편집 모드
codex resume --last            # 세션 재개
codex --profile readonly       # 프로필 선택
```

### 핵심 슬래시 명령어

| 명령어 | 용도 |
| --- | --- |
| `/model` | 모델 전환 |
| `/fast` | Fast 모드 토글 |
| `/plan` | 플랜 모드 |
| `/compact` | 컨텍스트 압축 |
| `/review` | 코드 리뷰 |
| `/goal` | 목표 설정 |
| `/skills` | 스킬 탐색 |
| `/memories` | 메모리 관리 |
| `/permissions` | 권한 관리 |

### 주요 설정

```toml
# ~/.codex/config.toml
model = "gpt-5.5"
approval_policy = "on-request"
sandbox_mode = "workspace-write"
```

---

## 원문 링크

- 공식 문서: [developers.openai.com/codex](https://developers.openai.com/codex)
- GitHub 리포지토리: [github.com/openai/codex](https://github.com/openai/codex)
- Changelog: [developers.openai.com/codex/changelog](https://developers.openai.com/codex/changelog)
- Codex Web: [chatgpt.com/codex](https://chatgpt.com/codex)
- 커뮤니티 (Discord): [discord.gg/openai](https://discord.gg/openai)
