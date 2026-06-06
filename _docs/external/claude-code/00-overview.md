# Claude Code 개요

> Anthropic의 에이전트 기반 코딩 도구 — 터미널, IDE, 데스크톱 앱, 브라우저 어디서나

**참고**: [Claude Code Overview (code.claude.com)](https://code.claude.com/docs/en/overview) | [이전 문서 (docs.anthropic.com)](https://docs.anthropic.com/en/docs/claude-code/overview)

---

## Claude Code란?

Claude Code는 Anthropic이 개발한 **에이전트 기반 코딩 도구**입니다. 코드베이스 전체를 이해하고, 파일을 편집하고, 명령을 실행하며, 개발 도구와 통합할 수 있습니다. 터미널, IDE, 데스크톱 앱, 브라우저 등 다양한 환경에서 사용할 수 있습니다.

---

## 시작하기

사용 환경을 선택하세요. 대부분의 환경은 Claude 구독 또는 Anthropic Console 계정이 필요합니다. Terminal CLI와 VS Code는 서드파티 프로바이더도 지원합니다.

| 환경 | 설명 | 설치 방법 |
|------|------|-----------|
| **Terminal** | 터미널에서 직접 동작하는 풀 기능 CLI. 파일 편집, 명령 실행, 프로젝트 관리 | 네이티브 설치 / Homebrew / WinGet |
| **VS Code** | 인라인 diff, @-멘션, 계획 리뷰, 대화 기록을 에디터 내에서 제공 | 확장 프로그램 설치 |
| **Desktop 앱** | IDE나 터미널 외부에서 Claude Code를 실행하는 독립 앱. diff 시각 검토, 다중 세션, 예약 작업, 클라우드 세션 지원 | 다운로드 설치 |
| **Web** | 브라우저에서 로컬 설정 없이 Claude Code 실행. 장기 실행 작업, 원격 저장소, 병렬 작업에 적합 | claude.ai/code 접속 |
| **JetBrains** | IntelliJ IDEA, PyCharm, WebStorm 등 JetBrains IDE용 플러그인. 대화형 diff 뷰잉, 컨텍스트 공유 | JetBrains Marketplace 설치 |

---

## 설치

### Terminal — 네이티브 설치 (권장)

**macOS, Linux, WSL:**

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Windows PowerShell:**

```powershell
irm https://claude.ai/install.ps1 | iex
```

**Windows CMD:**

```cmd
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
```

> `The token '&&' is not a valid statement separator` 오류가 나오면 PowerShell이 아닌 CMD를 사용 중인 것입니다. 반대로 `'irm' is not recognized` 오류가 나오면 CMD가 아닌 PowerShell을 사용하세요. 프롬프트가 `PS C:\`이면 PowerShell, `C:\`이면 CMD입니다.
>
> Windows에서는 Git for Windows 설치를 권장합니다(설치되어 있지 않으면 Claude Code가 PowerShell을 셸 도구로 사용합니다). WSL 환경에서는 Git for Windows가 필요하지 않습니다.

### Homebrew

```bash
brew install --cask claude-code
```

Homebrew는 두 가지 cask를 제공합니다:
- `claude-code` — 안정 릴리즈 채널. 보통 약 1주일 뒤에 반영되며, 심각한 회귀가 있는 버전은 건너뜁니다.
- `claude-code@latest` — 최신 채널. 새 버전이 출시되는 즉시 반영됩니다.

### WinGet

```cmd
winget install Anthropic.ClaudeCode
```

### Linux 패키지 매니저

Debian, Fedora, RHEL, Alpine에서 `apt`, `dnf`, `apk`로도 설치할 수 있습니다.

### 시작

```bash
cd your-project
claude
```

최초 실행 시 로그인 프롬프트가 표시됩니다. 설치가 완료되면 [Quickstart](14-quickstart.md)를 진행하세요.

### VS Code

VS Code 확장 프로그램 또는 Cursor용으로 설치할 수 있습니다. 확장 프로그램 뷰(`Cmd+Shift+X` / `Ctrl+Shift+X`)에서 "Claude Code"를 검색하세요. 설치 후 커맨드 팔레트(`Cmd+Shift+P` / `Ctrl+Shift+P`)에서 "Claude Code"를 입력하고 **Open in New Tab**을 선택하세요.

### Desktop 앱

독립 실행 앱으로, IDE나 터미널 외부에서 Claude Code를 실행합니다. 다운로드 링크:

- macOS (Intel 및 Apple Silicon)
- Windows (x64)
- Windows ARM64

설치 후 Claude를 실행하고 로그인한 다음, __Code__ 탭을 클릭하세요. 유료 구독이 필요합니다.

### Web

claude.ai/code에서 브라우저로 Claude Code를 실행합니다. 로컬 설정 없이 장기 실행 작업을 시작하고 완료 후 확인하거나, 로컬에 없는 저장소에서 작업하거나, 여러 작업을 병렬로 실행할 수 있습니다. 데스크톱 브라우저와 Claude iOS 앱에서 사용 가능합니다.

### JetBrains

JetBrains Marketplace에서 Claude Code 플러그인을 설치하고 IDE를 재시작하세요. IntelliJ IDEA, PyCharm, WebStorm 및 기타 JetBrains IDE에서 사용할 수 있습니다.

---

## Claude Code가 할 수 있는 일

| 기능 | 설명 |
|------|------|
| **기능 빌드** | 자연어로 설명하면 계획을 수립하고 코드를 작성하여 동작을 확인합니다 |
| **디버깅 및 수정** | 버그를 설명하거나 에러 메시지를 붙여넣으면 코드베이스를 분석하여 원인을 파악하고 수정합니다 |
| **코드베이스 탐색** | 팀의 코드베이스에 대해 질문하면 프로젝트 구조를 파악하고 답변합니다 |
| **반복 작업 자동화** | 린트 문제 수정, 머지 충돌 해결, 릴리스 노트 작성 등을 단일 명령으로 처리합니다 |
| **CI/CD 통합** | GitHub Actions, GitLab CI/CD에서 자동으로 실행할 수 있습니다 |
| **웹 검색** | 최신 정보를 웹에서 검색할 수 있습니다 |
| **외부 서비스 연동** | MCP를 통해 Google Drive, Figma, Slack 등 외부 데이터 소스에 접근할 수 있습니다 |

---

## 어디서나 Claude Code 사용하기

각 환경은 동일한 Claude Code 엔진에 연결되므로, CLAUDE.md 파일, 설정, MCP 서버가 모든 환경에서 공통으로 동작합니다.

Terminal, VS Code, JetBrains, Desktop, Web 외에도 Claude Code는 CI/CD, 채팅, 브라우저 워크플로우와 통합됩니다.

| 목적 | 최적 옵션 |
|------|-----------|
| 휴대폰이나 다른 기기에서 로컬 세션 계속하기 | Remote Control |
| Telegram, Discord, iMessage 또는 웹훅 이벤트를 세션으로 푸시 | Channels |
| 로컬에서 작업 시작, 모바일에서 계속 | Web 또는 Claude iOS 앱 |
| 정기 일정으로 Claude 실행 | Routines 또는 Desktop 예약 작업 |
| PR 리뷰 및 이슈 분류 자동화 | GitHub Actions 또는 GitLab CI/CD |
| 모든 PR에 자동 코드 리뷰 | GitHub Code Review |
| Slack에서 버그 리포트를 PR로 라우팅 | Slack |
| 라이브 웹 애플리케이션 디버깅 | Chrome |
| 커스텀 에이전트 빌드 | Agent SDK |

---

## 다음 단계

Claude Code를 설치했다면 다음 가이드를 참고하세요.

| 가이드 | 설명 |
|--------|------|
| [Quickstart](14-quickstart.md) | 첫 번째 실제 작업 — 코드베이스 탐색부터 커밋까지 |
| [CLAUDE.md 및 메모리](09-memory.md) | CLAUDE.md 파일과 자동 메모리로 Claude에 지속적 지침 제공 |
| [일반 워크플로우](13-common-workflows.md) | Claude Code를 최대한 활용하는 패턴 |
| [설정](03-settings.md) | 워크플로우에 맞게 Claude Code 커스터마이징 |
| [트러블슈팅](15-troubleshooting.md) | 일반적인 문제 해결 |
| [code.claude.com](https://code.claude.com) | 데모, 가격, 제품 상세 정보 |

---

## 공식 문서 링크 모음

| 문서 | URL |
|------|-----|
| Claude Code 개요 | https://code.claude.com/docs/en/overview |
| 기능 확장 개요 | https://code.claude.com/docs/en/features-overview |
| 빠른 시작 (Quickstart) | https://code.claude.com/docs/en/quickstart |
| 일반 워크플로우 | https://code.claude.com/docs/en/common-workflows |
| 설치 및 설정 | https://code.claude.com/docs/en/install |
| CLI 참조 | https://code.claude.com/docs/en/cli-reference |
| 대화형 모드 | https://code.claude.com/docs/en/interactive-mode |
| 슬래시 명령어 | https://code.claude.com/docs/en/slash-commands |
| 설정 | https://code.claude.com/docs/en/settings |
| 플러그인 | https://code.claude.com/docs/en/plugins |
| Hooks | https://code.claude.com/docs/en/hooks |
| MCP | https://code.claude.com/docs/en/mcp |
| 서브에이전트 | https://code.claude.com/docs/en/sub-agents |
| 메모리 | https://code.claude.com/docs/en/memory |
| IDE 통합 | https://code.claude.com/docs/en/ide-integrations |
| Bedrock & Vertex | https://code.claude.com/docs/en/bedrock-vertex |
| SDK | https://code.claude.com/docs/en/sdk |
| GitHub Actions | https://code.claude.com/docs/en/github-actions |
| 보안 | https://code.claude.com/docs/en/security |
| 트러블슈팅 | https://code.claude.com/docs/en/troubleshooting |

> 이전 docs.anthropic.com 문서: https://docs.anthropic.com/en/docs/claude-code/overview
