# Codex CLI - 개요 및 빠른 시작

> OpenAI의 에이전트 기반 코딩 도구, Codex에 대한 종합 가이드

**참조**: [developers.openai.com/codex/overview](https://developers.openai.com/codex/overview) | [developers.openai.com/codex/quickstart](https://developers.openai.com/codex/quickstart) | [developers.openai.com/codex/changelog](https://developers.openai.com/codex/changelog) | [developers.openai.com/codex/feature-maturity](https://developers.openai.com/codex/feature-maturity) | [github.com/openai/codex](https://github.com/openai/codex)

---

## Codex 소개

**Codex**는 OpenAI의 코딩 에이전트로, "어디서든 코딩할 수 있는 하나의 에이전트(One agent for everywhere you code)"를 표방합니다. 코드 작성, 디버깅, 리팩토링, 자동화 등 소프트웨어 개발 전반을 지원하며 App, IDE Extension, CLI, Web(클라우드) 네 가지 실행 환경에서 동일한 에이전트를 사용할 수 있습니다.

ChatGPT **Plus, Pro, Business, Edu, Enterprise** 플랜에 Codex가 포함되어 있습니다. 일부 기간 동안 Free, Go 플랜에도 Codex가 포함된 적이 있으나, 공식 개요 페이지에서는 Plus 이상 플랜을 기준으로 명시하고 있습니다. OpenAI API 키를 통해서도 사용할 수 있습니다.

---

## 실행 환경

공식 문서는 App, IDE Extension, CLI, Web(클라우드)을 동등한 실행 환경으로 분류합니다. Quickstart에서는 "IDE, CLI, or the cloud"로 안내합니다.

| 환경 | 설명 |
| --- | --- |
| **App** | macOS/Windows 데스크톱 앱. 프로젝트 사이드바, 스레드 목록, 리뷰 패널 제공. 권장 실행 환경 |
| **IDE Extension** | VS Code, Cursor, Windsurf에서 사이드바 패널로 동작 |
| **CLI** | 터미널에서 직접 실행하는 풀스크린 TUI. macOS, Windows, Linux 지원 |
| **Web (클라우드)** | [chatgpt.com/codex](https://chatgpt.com/codex)에서 브라우저 기반으로 동작. GitHub 리포지토리 연동 |
| **Amazon Bedrock** | AWS 관리 인증·결제로 Codex를 로컬에서 실행. Bedrock을 모델 프로바이더로 구성 |
| **Slack** | Slack 연동을 통해 팀 채널에서 `@Codex`로 작업 지시 |
| **Linear** | Linear 이슈에서 `@Codex` 언급으로 클라우드 작업 시작 |
| **GitHub** | PR 코멘트에서 `@codex` 태그로 코드 리뷰 위임, 이슈에서 작업 시작 |

---

## 빠른 시작

### 1. 설치

**macOS / Linux** (권장 설치 스크립트):

```shell
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

**Windows** (PowerShell):

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"
```

**npm** (Node.js 필요):

```shell
npm install -g @openai/codex
```

**Homebrew** (macOS):

```shell
brew install --cask codex
```

**GitHub Release 바이너리** 직접 다운로드도 지원:

- macOS Apple Silicon: `codex-aarch64-apple-darwin.tar.gz`
- macOS Intel: `codex-x86_64-apple-darwin.tar.gz`
- Linux x86_64: `codex-x86_64-unknown-linux-musl.tar.gz`
- Linux arm64: `codex-aarch64-unknown-linux-musl.tar.gz`

### 2. 인증

```shell
codex
```

실행 후 **Sign in with ChatGPT**를 선택하여 ChatGPT 계정(Plus, Pro, Business, Edu, Enterprise)으로 로그인합니다. API 키를 사용하려면 환경변수를 설정합니다:

```shell
export OPENAI_API_KEY="sk-..."
```

### 3. 첫 실행

```shell
# 대화형 모드로 시작
codex

# 프롬프트와 함께 바로 시작
codex "이 코드베이스를 설명해줘"

# 특정 디렉토리에서 실행
codex --cd /path/to/project "버그를 찾아줘"
```

---

## Codex가 할 수 있는 일

| 기능 | 설명 |
| --- | --- |
| **코드 작성** | 자연어 설명으로 코드를 생성하며, 기존 프로젝트 구조와 컨벤션에 맞게 적응 |
| **코드 이해** | 복잡하거나 레거시 코드를 읽고 설명. 낯선 코드베이스 파악에 유용 |
| **코드 리뷰** | 잠재적 버그, 논리 오류, 엣지 케이스를 분석하여 보고 |
| **디버깅 및 수정** | 실패 추적, 원인 진단, 타겟팅된 수정 제안 |
| **자동화** | 리팩토링, 테스트, 마이그레이션, 설정 작업 등 반복 워크플로우 자동 실행 |
| **이미지 처리** | 스크린샷이나 디자인 스펙을 첨부하여 이미지 세부 정보를 프롬프트와 함께 활용 |
| **이미지 생성** | 아이콘, 배너, 일러스트 등 에셋을 직접 생성 (`gpt-image-2` 사용) |
| **웹 검색** | 내장 웹 검색 도구로 최신 정보를 검색하여 코드 작성에 활용 |

---

## 핵심 기능 요약

| 기능 | 설명 | 관련 문서 |
| --- | --- | --- |
| **Skills (스킬)** | 작업별 특화 동작을 정의하여 Codex 성능 향상 | [Skills 문서](https://developers.openai.com/codex/skills) |
| **Plugins (플러그인)** | 마켓플레이스에서 추가 기능을 설치하여 확장 | [Plugins 문서](https://developers.openai.com/codex/plugins) |
| **Hooks (훅)** | 라이프사이클 이벤트에 사용자 정의 스크립트 실행 | [Hooks 문서](https://developers.openai.com/codex/hooks) |
| **MCP (Model Context Protocol)** | 외부 도구 서버를 연결하여 Codex 도구 생태계 확장 | [MCP 문서](https://developers.openai.com/codex/mcp) |
| **Apps (앱 연동)** | GitHub, Slack, Linear 등 서드파티 앱과 연동 | [Integrations 문서](https://developers.openai.com/codex/integrations) |
| **Sandbox (샌드박스)** | 명령어 실행을 격리된 환경에서 수행하여 시스템 보호 | [Sandbox 문서](https://developers.openai.com/codex/sandboxing) |
| **Auto-review** | 승인 프롬프트를 자동 리뷰 에이전트가 사전 판단하여 승인·거부·중단 | [Auto-review 문서](https://developers.openai.com/codex/sandboxing/auto-review) |
| **Memories / Chronicle** | 과거 작업의 맥락을 기억하여 향후 스레드에 활용 | [Memories 문서](https://developers.openai.com/codex/memories) |
| **Subagents (서브에이전트)** | 큰 작업을 병렬로 분산 처리 | [Subagents 문서](https://developers.openai.com/codex/subagents) |
| **Sites** | 웹사이트, 대시보드, 내부 도구, 게임 등을 빌드하고 배포 (Preview) | [Sites 문서](https://developers.openai.com/codex/sites) |
| **Goal Mode** | 장기 실행 목표를 설정하고 시간·일 단위로 Codex가 자율 진행 | 관련 문서 참조 |
| **Chrome Extension** | Chrome 탭에서 Codex가 앱·웹사이트를 병렬로 조작 | [Chrome extension 문서](https://developers.openai.com/codex/app/chrome-extension) |
| **Appshots** | macOS에서 Command 키 두 번으로 최상단 앱 창을 Codex에 전송 | [Appshots 문서](https://developers.openai.com/codex/app/appshots) |
| **Codex Security** | 플러그인 + 클라우드 보안으로 위협 모델 강화 | [Codex Security 문서](https://developers.openai.com/codex/codex-security) |
| **AGENTS.md** | 프로젝트별 지속적 명령어 파일로 Codex 동작 가이드 | [AGENTS.md 문서](https://developers.openai.com/codex/agents-md) |
| **Codex SDK** | TypeScript SDK로 Codex 에이전트를 자체 도구·워크플로우에 통합 | [Codex SDK 문서](https://developers.openai.com/codex/codex-sdk) |
| **Python SDK** | Python용 SDK. `pip install openai-codex`로 설치 (Beta) | [Python SDK 문서](https://developers.openai.com/codex/codex-sdk) |
| **GitHub Action** | CI/CD 파이프라인에 Codex를 통합하는 GitHub Action | [GitHub Action 문서](https://developers.openai.com/codex/github-action) |
| **Remote Connections** | 모바일(iOS/Android)에서 Mac/Windows 호스트에 원격 연결하여 Codex 사용 | [Remote connections 문서](https://developers.openai.com/codex/remote-connections) |
| **Access Tokens** | Enterprise 관리자가 허용한 멤버가 신뢰할 수 있는 비대화형 워크플로우용 토큰 생성 | [Access tokens 문서](https://developers.openai.com/codex/authentication/access-tokens) |
| **Environment Variables** | Codex 설정을 환경 변수로 구성 | [Environment Variables 문서](https://developers.openai.com/codex/config-file/environment-variables) |
| **Permissions** | 파일시스템 접근·명령어 실행 권한을 프로필 단위로 관리 | [Permissions 문서](https://developers.openai.com/codex/permissions) |
| **Migrate** | 기존 명령어 파일, MCP 서버 설정, 스킬, 서브에이전트를 Codex로 이관 | [Migrate 문서](https://developers.openai.com/codex/migrate) |

---

## 추천 모델

| 모델 | 용도 | 상태 |
| --- | --- | --- |
| **gpt-5.5** | 복잡한 코딩, Computer Use, 지식 작업, 리서치 워크플로우에 권장되는 최신 프론티어 모델 | 권장 |
| **gpt-5.4** | 강력한 코딩·추론·도구 사용·에이전트 워크플로우를 갖춘 범용 프론티어 모델. 최초의 Computer Use 내장 범용 모델 | 권장 |
| **gpt-5.4-mini** | 빠르고 효율적인 미니 모델. 가벼운 작업 및 서브에이전트에 적합. GPT-5.4 대비 약 30% 사용량 | 권장 |
| **gpt-5.3-codex-spark** | ChatGPT Pro 구독자 전용. 1000+ tok/s의 초고속 실시간 코딩 (연구 프리뷰, 텍스트 전용, 128k 컨텍스트) | Pro 전용 |

> **Deprecated 모델 경고**: 2026년 4월 7일부터 `gpt-5.2-codex`, `gpt-5.1-codex-mini`, `gpt-5.1-codex-max`, `gpt-5.1-codex`, `gpt-5.1`, `gpt-5` 모델이 ChatGPT 로그인 시 모델 선택기에서 제거되었으며, 4월 14일에 Codex에서 완전히 제거되었습니다. **`gpt-5.2`는 여전히 사용 가능합니다.** `gpt-5.3-codex` 모델도 ChatGPT 로그인 시 deprecated로 표시됩니다. 실제 deprecated된 모델과 아닌 모델을 혼동하지 마세요. 일부 deprecated 모델은 API에서 여전히 사용할 수 있습니다.

세션 중 `/model` 명령으로 모델을 전환할 수 있습니다.

---

## 공식 문서 링크 모음

| 리소스 | URL |
| --- | --- |
| Codex 개요 | [developers.openai.com/codex/overview](https://developers.openai.com/codex/overview) |
| Codex 모델 | [developers.openai.com/codex/models](https://developers.openai.com/codex/models) |
| Changelog | [developers.openai.com/codex/changelog](https://developers.openai.com/codex/changelog) |
| Feature Maturity | [developers.openai.com/codex/feature-maturity](https://developers.openai.com/codex/feature-maturity) |
| GitHub 리포지토리 | [github.com/openai/codex](https://github.com/openai/codex) |
| 빠른 시작 | [developers.openai.com/codex/quickstart](https://developers.openai.com/codex/quickstart) |
| CLI 기능 | [developers.openai.com/codex/cli/features](https://developers.openai.com/codex/cli/features) |
| 슬래시 명령어 | [developers.openai.com/codex/cli/slash-commands](https://developers.openai.com/codex/cli/slash-commands) |
| 설정 가이드 | [developers.openai.com/codex/config-file/config-basics](https://developers.openai.com/codex/config-file/config-basics) |
| 인증 | [developers.openai.com/codex/authentication](https://developers.openai.com/codex/authentication) |
| 요금 | [developers.openai.com/codex/pricing](https://developers.openai.com/codex/pricing) |
| Amazon Bedrock 배포 | [developers.openai.com/codex/deployment/amazon-bedrock](https://developers.openai.com/codex/deployment/amazon-bedrock) |
| Chrome Extension | [developers.openai.com/codex/app/chrome-extension](https://developers.openai.com/codex/app/chrome-extension) |
| Appshots | [developers.openai.com/codex/app/appshots](https://developers.openai.com/codex/app/appshots) |
| Codex Security | [developers.openai.com/codex/codex-security](https://developers.openai.com/codex/codex-security) |
| Sites | [developers.openai.com/codex/sites](https://developers.openai.com/codex/sites) |
| 챗지피티 Codex | [chatgpt.com/codex](https://chatgpt.com/codex) |
| 커뮤니티 (Discord) | [discord.gg/openai](https://discord.gg/openai) |

---

> **최종 업데이트**: 2026-06-06
> **출처**: [developers.openai.com/codex/overview](https://developers.openai.com/codex/overview), [developers.openai.com/codex/models](https://developers.openai.com/codex/models), [developers.openai.com/codex/changelog](https://developers.openai.com/codex/changelog), [developers.openai.com/codex/feature-maturity](https://developers.openai.com/codex/feature-maturity), [github.com/openai/codex](https://github.com/openai/codex)
