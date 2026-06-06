# 10. IDE 통합 (IDE Integrations)

> **원문**: [Use Claude Code in VS Code](https://code.claude.com/docs/en/vs-code) | [JetBrains IDEs](https://code.claude.com/docs/en/jetbrains)
> **기존**: [Add Claude Code to your IDE - Anthropic](https://docs.anthropic.com/en/docs/claude-code/ide-integrations)

---

## 목차

- [지원 IDE](#지원-ide)
- [VS Code 확장](#vs-code-확장)
- [JetBrains 플러그인](#jetbrains-플러그인)
- [보안 주의사항](#보안-주의사항)

---

## 지원 IDE

### Visual Studio Code 계열

| IDE | 비고 |
|-----|------|
| **Visual Studio Code** | 공식 지원 (1.98.0 이상) |
| **Cursor** | 포크 지원 — 직접 설치 링크 제공 |
| **Devin Desktop** | VS Code 포크 — Extensions 뷰에서 검색 또는 Open VSX 레지스트리로 설치 |
| **Kiro** | VS Code 포크 — Extensions 뷰에서 검색 또는 Open VSX 레지스트리로 설치 |

> 확장을 설치할 수 없는 에디터에서는 통합 터미널에 `claude`를 실행하면 CLI로 사용할 수 있다.

### JetBrains 계열

| IDE | 비고 |
|-----|------|
| **IntelliJ IDEA** | 전체 지원 |
| **PyCharm** | 전체 지원 |
| **Android Studio** | 전체 지원 |
| **WebStorm** | 전체 지원 |
| **PhpStorm** | 전체 지원 |
| **GoLand** | 전체 지원 |

---

## VS Code 확장

VS Code 확장은 Claude Code의 네이티브 그래픽 인터페이스를 IDE에 직접 통합한다. 확장을 통해 plan 리뷰 및 편집, 자동 편집 승인, @-mention으로 파일 참조(행 범위 지정), 대화 기록 접근, 여러 탭/창에서 다중 대화가 가능하다.

### Prerequisites

- VS Code 1.98.0 이상
- Anthropic 계정 (확장 최초 실행 시 로그인). Amazon Bedrock, Google Vertex AI 등 서드파티 제공자를 사용하는 경우 [Use third-party providers](https://code.claude.com/docs/en/vs-code#use-third-party-providers)를 참조.

### 확장 설치

IDE에 맞는 링크로 직접 설치:

- VS Code Marketplace에서 설치
- Cursor용 설치 링크

또는 VS Code에서 `Cmd+Shift+X` (Mac) / `Ctrl+Shift+X` (Windows/Linux)로 Extensions 뷰를 열고 "Claude Code"를 검색한 뒤 **Install** 클릭.

Devin Desktop, Kiro 등 다른 VS Code 포크에서도 에디터의 Extensions 뷰에서 "Claude Code"를 검색하거나 Open VSX 레지스트리에서 설치할 수 있다.

### Prompt box 사용법

Prompt box는 여러 기능을 지원한다.

| 기능 | 설명 |
|------|------|
| **Permission modes** | Prompt box 하단의 모드 표시기를 클릭하여 모드 전환. **Normal mode** — 각 작업 전 권한 요청. **Plan mode** — Claude가 수행할 작업을 설명하고 승인을 대기하며, VS Code가 plan을 전체 markdown 문서로 열어 인라인 코멘트로 피드백 가능. **Auto-accept mode** — Claude가 묻지 않고 편집. 기본값은 VS Code 설정의 `claudeCode.initialPermissionMode`로 지정. |
| **Command menu** | `/`를 클릭하거나 입력하여 명령 메뉴 열기. 파일 첨부, 모델 전환, Extended thinking 토글, `/usage`, `/remote-control` 등. Customize 섹션에서 MCP servers, hooks, memory, permissions, plugins에 접근. 터미널 아이콘이 있는 항목은 통합 터미널에서 열림. |
| **Context indicator** | Prompt box에 Claude의 context window 사용량 표시. 필요 시 자동 compact, 수동으로 `/compact` 실행 가능. |
| **Extended thinking** | Claude가 복잡한 문제를 더 오래 추론할 수 있게 함. Command menu(`/`)에서 토글. Claude의 추론이 대화에서 접힌 블록으로 표시되며, 클릭하여 읽거나 `Ctrl+O`로 모든 thinking block을 펼치거나 접을 수 있음. |
| **Multi-line input** | `Shift+Enter`로 줄바꿈 추가(전송하지 않음). 질문 대화상자의 "Other" 자유 텍스트 입력에서도 동작. |

### Reference files and folders (@-mentions)

`@` 뒤에 파일 또는 폴더 이름을 입력하면 Claude가 해당 콘텐츠를 읽고 질문에 답하거나 변경할 수 있다. Fuzzy matching을 지원하여 부분 이름으로 검색할 수 있다.

```
> Explain the logic in @auth (fuzzy matches auth.js, AuthService.ts, etc.)
> What's in @src/components/ (include a trailing slash for folders)
```

**PDF**: 큰 PDF의 경우 전체 파일 대신 특정 페이지를 읽도록 요청할 수 있다. 단일 페이지, `1-10` 범위, `page 3 onward` 등 지정.

**선택 컨텍스트**: 에디터에서 텍스트를 선택하면 Claude가 하이라이트된 코드를 자동으로 인식한다. Prompt box footer에 선택된 행 수가 표시된다.

| 단축키 | 동작 |
|--------|------|
| `Option+K` (Mac) / `Alt+K` (Windows/Linux) | 파일 경로와 행 번호가 포함된 @-mention 삽입 (예: `@app.ts#5-10`). 에디터가 포커스되어 있어야 함. |
| 클릭 — 선택 표시기 | Claude가 하이라이트된 텍스트를 볼지 토글. 눈 가리기 아이콘 = 선택이 Claude에 숨겨짐. |

`Shift`를 누른 상태로 파일을 prompt box에 드래그하면 첨부파일로 추가할 수 있다. 첨부파일의 X를 클릭하면 컨텍스트에서 제거된다.

### Task management

#### 대화 기록 이어하기

Claude Code 패널 상단의 **Session history** 버튼을 클릭하면 대화 기록에 접근할 수 있다. 키워드 검색 또는 시간별 탐색(Today, Yesterday, Last 7 days 등)이 가능하다. 세션을 클릭하면 전체 메시지 기록과 함께 이어진다. 새 세션은 첫 메시지를 기반으로 AI가 자동 제목을 생성한다. 세션 위에 마우스를 올리면 이름 변경 및 제거 액션이 나타난다.

#### Claude.ai 원격 세션 이어하기

Claude Code on the web을 사용하는 경우, VS Code에서 해당 원격 세션을 바로 이어할 수 있다. 이 기능은 **Claude.ai Subscription**으로 로그인해야 하며, Anthropic Console 계정은 해당하지 않는다.

#### 여러 대화 실행

Command Palette에서 **Open in New Tab** 또는 **Open in New Window**로 추가 대화를 시작할 수 있다. 각 대화는 독립적인 기록과 컨텍스트를 유지하여 서로 다른 작업을 병렬로 수행할 수 있다.

탭 사용 시 spark 아이콘에 작은 색 점으로 상태가 표시된다: 파란색 = 권한 요청 대기 중, 주황색 = 탭이 숨겨진 동안 Claude가 작업을 완료함.

#### Checkpoints로 되돌리기

VS Code 확장은 checkpoint를 지원한다. Checkpoint는 Claude의 파일 편집을 추적하여 이전 상태로 되돌릴 수 있게 한다. 메시지 위에 마우스를 올리면 rewind 버튼이 나타나며, 세 가지 옵션이 있다.

| 옵션 | 설명 |
|------|------|
| **Fork conversation from here** | 코드 변경은 그대로 두고 이 메시지에서 새 대화 분기 시작 |
| **Rewind code to here** | 대화 기록은 유지하면서 파일 변경을 이 시점으로 되돌림 |
| **Fork conversation and rewind code** | 새 대화 분기를 시작하고 파일 변경도 이 시점으로 되돌림 |

### Terminal 사용

#### VS Code 내부에서 CLI 사용

통합 터미널(`Ctrl+`` 또는 `Cmd+``)을 열고 `claude`를 실행하면 CLI가 자동으로 IDE와 연동되어 diff 보기, 진단 공유 등의 기능이 활성화된다.

외부 터미널을 사용하는 경우, Claude Code 내부에서 `/ide` 명령어를 실행하면 VS Code에 연결된다.

#### Extension과 CLI 전환

확장과 CLI는 동일한 대화 기록을 공유한다. 확장 대화를 CLI에서 이어하려면 터미널에서 `claude --resume`을 실행한다. 대화를 검색하고 선택할 수 있는 인터랙티브 picker가 열린다.

#### 터미널 출력 참조

`@terminal:name`으로 터미널 출력을 프롬프트에 참조할 수 있다. `name`은 터미널의 제목이다. 복사/붙여넣기 없이 명령 출력, 에러 메시지, 로그를 Claude에 전달할 수 있다.

#### 백그라운드 프로세스 모니터링

Claude가 장시간 실행되는 명령을 수행하면 확장이 status bar에 진행 상황을 표시한다. 단, 백그라운드 작업의 가시성은 CLI에 비해 제한적이다. 더 나은 가시성이 필요하면 Claude가 명령을 출력하도록 한 뒤 VS Code의 통합 터미널에서 직접 실행하는 것이 좋다.

### VS Code 명령 및 단축키

Command Palette(`Cmd+Shift+P` / `Ctrl+Shift+P`)에서 "Claude Code"를 입력하면 모든 사용 가능한 VS Code 명령을 볼 수 있다. 일부 단축키는 포커스된 패널에 따라 동작한다. `Cmd+Esc` / `Ctrl+Esc`로 에디터와 Claude 간 포커스를 전환할 수 있다.

| Command | Shortcut | Description |
|---------|----------|-------------|
| Focus Input | `Cmd+Esc` (Mac) / `Ctrl+Esc` (Windows/Linux) | 에디터와 Claude 간 포커스 전환 |
| Open in Side Bar | - | Claude를 왼쪽 사이드바에서 열기 |
| Open in Terminal | - | Claude를 터미널 모드로 열기 |
| Open in New Tab | `Cmd+Shift+Esc` (Mac) / `Ctrl+Shift+Esc` (Windows/Linux) | 새 대화를 에디터 탭으로 열기 |
| Open in New Window | - | 새 대화를 별도 창으로 열기 |
| New Conversation | `Cmd+N` (Mac) / `Ctrl+N` (Windows/Linux) | 새 대화 시작. Claude가 포커스되어 있고 `enableNewConversationShortcut`이 `true`여야 함 |
| Reopen Closed Session | `Cmd+Shift+T` (Mac) / `Ctrl+Shift+T` (Windows/Linux) | 가장 최근에 닫은 Claude 세션 탭 다시 열기. 마지막으로 닫은 탭이 Claude 세션이 아니면 VS Code의 기본 reopen-closed-editor 동작으로 폴스루. `enableReopenClosedSessionShortcut`으로 비활성화 가능 |
| Insert @-Mention Reference | `Option+K` (Mac) / `Alt+K` (Windows/Linux) | 현재 파일 및 선택 영역에 대한 참조 삽입 (에디터 포커스 필요) |
| Show Logs | - | 확장 디버그 로그 보기 |
| Logout | - | Anthropic 계정에서 로그아웃 |

#### URI handler로 탭 열기

확장은 `vscode://anthropic.claude-code/open` URI handler를 등록한다. 셸 alias, 브라우저 북마클릿, URL을 열 수 있는 스크립트에서 사용할 수 있다.

| 플랫폼 | 명령어 |
|--------|--------|
| macOS | `open "vscode://anthropic.claude-code/open"` |
| Linux | `xdg-open "vscode://anthropic.claude-code/open"` |
| Windows (PowerShell) | `Start-Process "vscode://anthropic.claude-code/open"` |
| Windows (cmd.exe) | `start "" "vscode://anthropic.claude-code/open"` |

**Query parameters:**

| Parameter | Description |
|-----------|-------------|
| `prompt` | Prompt box에 미리 채울 텍스트. URL-encoded. 자동 전송되지 않음. |
| `session` | 새 대화 대신 이어할 세션 ID. 해당 workspace에 속한 세션이어야 함. 세션을 찾을 수 없으면 새 대화가 시작됨. 이미 탭에 열려 있으면 해당 탭에 포커스. |

예시: `vscode://anthropic.claude-code/open?prompt=review%20my%20changes`

### Settings

확장에는 두 가지 유형의 설정이 있다.

- **Extension settings** (VS Code): VS Code 내 확장 동작 제어. `Cmd+,` / `Ctrl+,` → Extensions → Claude Code. 또는 `/` 입력 후 **General Config** 선택.
- **Claude Code settings** (`~/.claude/settings.json`): 확장과 CLI 공통 설정. 허용 명령, 환경 변수, hooks, MCP servers 등.

#### Extension settings

| Setting | Default | Description |
|---------|---------|-------------|
| `useTerminal` | `false` | 그래픽 패널 대신 터미널 모드로 Claude 실행 |
| `initialPermissionMode` | `default` | 새 대화의 승인 프롬프트 제어: `default`, `plan`, `acceptEdits`, `bypassPermissions` |
| `preferredLocation` | `panel` | Claude가 열리는 위치: `sidebar` (오른쪽) 또는 `panel` (새 탭) |
| `autosave` | `true` | Claude가 파일을 읽거나 쓰기 전에 자동 저장 |
| `useCtrlEnterToSend` | `false` | Enter 대신 Ctrl/Cmd+Enter로 프롬프트 전송 |
| `enableNewConversationShortcut` | `false` | Cmd/Ctrl+N으로 새 대화 시작 활성화 |
| `enableReopenClosedSessionShortcut` | `true` | Cmd/Ctrl+Shift+T로 가장 최근에 닫은 Claude 세션 탭 다시 열기 |
| `hideOnboarding` | `false` | 온보딩 체크리스트 숨김 (학사모 아이콘) |
| `respectGitIgnore` | `true` | 파일 검색에서 .gitignore 패턴 제외 |
| `usePythonEnvironment` | `true` | Claude 실행 시 workspace의 Python 환경 활성화. Python 확장 필요. |
| `environmentVariables` | `[]` | Claude 프로세스의 환경 변수 설정. 공통 설정은 Claude Code settings 사용 권장. |
| `disableLoginPrompt` | `false` | 인증 프롬프트 건너뛰기 (서드파티 제공자 설정용) |
| `allowDangerouslySkipPermissions` | `false` | 모드 선택기에 Bypass permissions 추가. 인터넷 접근이 없는 샌드박스에서만 사용. |
| `claudeProcessWrapper` | - | Claude 프로세스를 시작하는 데 사용할 실행 파일. 번들된 바이너리 경로가 인자로 전달됨. |

#### Claude 패널 위치 변경

Claude 패널을 드래그하여 VS Code 내 원하는 위치로 이동할 수 있다.

| 위치 | 설명 |
|------|------|
| Secondary sidebar | 창 오른쪽. 코딩 중에도 Claude가 계속 보임. |
| Primary sidebar | Explorer, Search 등이 있는 왼쪽 사이드바. |
| Editor area | 파일 옆에 탭으로 열림. 부가 작업에 유용. |

#### 터미널 모드 전환

기본적으로 확장은 그래픽 채팅 패널을 연다. CLI 스타일 인터페이스를 선호하면 **Use Terminal** 설정을 체크한다. `Cmd+,` / `Ctrl+,` → Extensions → Claude Code에서 **Use Terminal** 체크.

### MCP 서버 연결

MCP(Model Context Protocol) 서버를 통해 Claude가 외부 도구, 데이터베이스, API에 접근할 수 있다.

**MCP 서버 추가**: 통합 터미널에서 `claude mcp add` 실행.

```bash
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer YOUR_GITHUB_PAT"
```

**VS Code 내에서 관리**: prompt box에 `/mcp`를 입력하면 MCP 관리 대화상자가 열린다. 서버 활성화/비활성화, 재연결, OAuth 인증 관리가 가능하다.

### Plugins 관리

VS Code 확장에는 plugin 설치 및 관리를 위한 그래픽 인터페이스가 포함되어 있다. Prompt box에 `/plugins`를 입력하면 **Manage plugins** 인터페이스가 열린다.

#### Plugin 설치

Plugin 대화상자에는 **Plugins**와 **Marketplaces** 두 탭이 있다.

**Plugins 탭:**

- 상단에 **Installed plugins**이 토글 스위치와 함께 표시되어 활성화/비활성화 가능
- 하단에 구성된 마켓플레이스의 **Available plugins** 표시
- 이름 또는 설명으로 검색하여 필터링
- 플러그인의 **Install** 클릭

**설치 scope 선택:**

| Scope | 설명 |
|-------|------|
| Install for you | 모든 프로젝트에서 사용 가능 (user scope) |
| Install for this project | 프로젝트 협업자와 공유 (project scope) |
| Install locally | 해당 저장소에서만 나만 사용 (local scope) |

#### Marketplace 관리

**Marketplaces** 탭에서 plugin 소스를 추가하거나 제거할 수 있다.

- GitHub repo, URL, 또는 로컬 경로를 입력하여 새 마켓플레이스 추가
- 새로고침 아이콘으로 마켓플레이스의 plugin 목록 업데이트
- 휴지통 아이콘으로 마켓플레이스 제거

변경 후 배너가 나타나면 Claude Code를 재시작하여 업데이트를 적용한다.

### Chrome 브라우저 자동화

Claude를 Chrome 브라우저에 연결하여 웹 앱 테스트, 콘솔 로그 디버깅, 브라우저 워크플로우 자동화를 VS Code를 떠나지 않고 수행할 수 있다. Claude in Chrome 확장 1.0.36 이상이 필요하다.

```
@browser go to localhost:3000 and check the console for errors
```

첨부 메뉴를 열어 특정 브라우저 도구(새 탭 열기, 페이지 콘텐츠 읽기 등)를 선택할 수도 있다.

### Git 연동

Claude Code는 git과 연동하여 VS Code 내에서 버전 관리 워크플로우를 지원한다.

**Commit 및 Pull Request 생성:**

```
> commit my changes with a descriptive message
> create a pr for this feature
> summarize the changes I've made to the auth module
```

**Git worktree로 병렬 작업:**

`--worktree` (`-w`) 플래그로 Claude를 독립된 worktree에서 시작할 수 있다.

```bash
claude --worktree feature-auth
```

각 worktree는 독립적인 파일 상태를 유지하면서 git 기록을 공유한다. 서로 다른 작업을 수행하는 Claude 인스턴스 간 간섭을 방지할 수 있다.

### 내장 IDE MCP 서버

확장이 활성 상태이면 로컬 MCP 서버가 실행되며 CLI가 자동으로 연결한다. 이를 통해 CLI가 VS Code의 네이티브 diff 뷰어에서 diff를 열고, 현재 선택 영역을 `@`-mention으로 읽으며, Jupyter notebook에서 셀을 실행할 수 있다.

서버 이름은 `ide`이며, 구성할 것이 없으므로 `/mcp`에 숨겨져 있다. 조직에서 `PreToolUse` hook으로 MCP 도구를 허용 목록에 추가하는 경우 이 서버의 존재를 알아야 한다.

**선택 및 열린 파일 컨텍스트**: 연결된 상태에서 CLI는 각 프롬프트에 현재 에디터 선택 영역과 활성 파일 경로를 컨텍스트로 포함한다. 트랜스크립트에 `⧉ Selected N lines from <file>` 행이 표시된다. `.env` 같은 민감한 파일을 제외하려면 해당 경로에 `Read` deny rule을 추가한다.

**전송 및 인증**: 서버는 `127.0.0.1`의 임의 높은 포트에 바인딩되어 다른 머신에서 접근할 수 없다. 확장이 활성화될 때마다 새로운 임의 인증 토큰이 생성되며, 토큰은 `0700` 디렉토리 내 `0600` 권한으로 `~/.claude/ide/` 아래에 기록된다.

**모델에 노출되는 도구:**

| Tool name (hooks에서 보이는 이름) | 기능 | 쓰기 여부 |
|----------------------------------|------|-----------|
| `mcp__ide__getDiagnostics` | 언어 서버 진단 — VS Code Problems 패널의 에러/경고 반환. 파일 단위로 범위 지정 가능. | 아니오 |
| `mcp__ide__executeCode` | 활성 Jupyter notebook의 커널에서 Python 코드 실행. | 예 |

**Jupyter 실행은 항상 사용자 확인**: `mcp__ide__executeCode`는 자동으로 실행할 수 없다. 호출 시마다 코드가 활성 notebook 끝에 새 셀로 삽입되고, VS Code가 스크롤하여 네이티브 Quick Pick으로 **Execute** 또는 **Cancel**을 묻는다. 취소하거나 `Esc`로 닫으면 Claude에 에러가 반환되며 아무것도 실행되지 않는다.

### VS Code extension vs. Claude Code CLI

| Feature | CLI | VS Code Extension |
|---------|-----|-------------------|
| Commands and skills | 전체 | 하위 집합 (`/` 입력으로 확인) |
| MCP server config | 지원 | 부분 (CLI로 서버 추가, 채팅 패널에서 `/mcp`로 기존 서버 관리) |
| Checkpoints | 지원 | 지원 |
| `!` bash shortcut | 지원 | 미지원 |
| Tab completion | 지원 | 미지원 |

### Troubleshooting (VS Code)

#### 확장이 설치되지 않는 경우

- 호환되는 VS Code 버전(1.98.0 이상)인지 확인
- VS Code에 확장 설치 권한이 있는지 확인
- VS Code Marketplace에서 직접 설치 시도

#### Spark 아이콘이 보이지 않는 경우

Spark 아이콘은 파일이 열려 있을 때 **Editor Toolbar**(에디터 우상단)에 나타난다.

1. **파일 열기**: 파일이 열려 있어야 함. 폴더만 열려 있는 것으로는 부족.
2. **VS Code 버전 확인**: 1.98.0 이상 필요 (Help → About)
3. **VS Code 재시작**: Command Palette에서 "Developer: Reload Window" 실행
4. **충돌 확장 비활성화**: 다른 AI 확장(Cline, Continue 등)을 일시적으로 비활성화
5. **Workspace trust 확인**: 확장은 Restricted Mode에서 작동하지 않음

대안으로 **Status Bar**(우하단)의 "✱ Claude Code"를 클릭하거나, Command Palette에서 "Claude Code"를 입력한다.

#### macOS에서 Cmd+Esc가 동작하지 않는 경우

macOS Tahoe 이상에서 시스템 Game Overlay shortcut이 기본적으로 `Cmd+Esc`에 바인딩되어 VS Code보다 먼저 키 입력을 가로챈다.

**해결 방법:**

1. System Settings 열기
2. Keyboard → Keyboard Shortcuts → Game Controllers
3. Game Overlay 체크박스 해제

또는 VS Code Keyboard Shortcuts 편집기(`Cmd+K Cmd+S`)에서 `Claude Code: Focus input`을 검색하여 다른 키로 재할당.

#### Claude Code가 응답하지 않는 경우

1. **인터넷 연결 확인**: 안정적인 연결 확인
2. **새 대화 시작**: 새 대화로 문제 지속 여부 확인
3. **CLI 시도**: 터미널에서 `claude`를 실행하여 더 자세한 에러 메시지 확인

문제가 지속되면 GitHub에 이슈를 제출한다.

#### 확장 제거

1. Extensions 뷰 열기 (`Cmd+Shift+X` / `Ctrl+Shift+X`)
2. "Claude Code" 검색
3. **Uninstall** 클릭

확장 데이터와 모든 설정을 함께 제거하려면 플랫폼별 확장 저장소 디렉토리를 삭제한다.

| 플랫폼 | 명령어 |
|--------|--------|
| macOS | `rm -rf ~/Library/"Application Support"/Code/User/globalStorage/anthropic.claude-code` |
| Linux | `rm -rf ~/.config/Code/User/globalStorage/anthropic.claude-code` |
| Windows (PowerShell) | `Remove-Item -Recurse -Force "$env:APPDATA\Code\User\globalStorage\anthropic.claude-code"` |

---

## JetBrains 플러그인

Claude Code는 전용 플러그인을 통해 JetBrains IDE에 통합되며, 인터랙티브 diff 보기, 선택 컨텍스트 공유 등의 기능을 제공한다.

### 기능

| 기능 | 설명 |
|------|------|
| **빠른 실행** | `Cmd+Esc` (Mac) / `Ctrl+Esc` (Windows/Linux)로 Claude Code를 에디터에서 바로 열거나 UI의 Claude Code 버튼 클릭 |
| **Diff 뷰어** | 코드 변경사항을 터미널 대신 IDE의 내장 Diff 뷰어에 표시 |
| **선택 컨텍스트** | IDE의 현재 선택/탭이 Claude Code에 자동 공유됨. `Read` deny rule이 설정된 파일은 공유 차단 |
| **파일 참조 단축키** | `Cmd+Option+K` (Mac) / `Alt+Ctrl+K` (Linux/Windows)로 파일 참조 삽입 (예: `@src/auth.ts#L1-99`) |
| **진단 공유** | IDE의 린트, 구문 에러 등 진단 정보가 Claude에 자동 공유됨 |

### 설치

JetBrains Marketplace에서 Claude Code 플러그인을 찾아 설치한 후 IDE를 재시작한다.

### 사용법

#### IDE 내부에서

IDE의 통합 터미널에서 `claude`를 실행하면 모든 통합 기능이 활성화된다.

#### 외부 터미널에서

외부 터미널에서 `/ide` 명령어를 사용하여 Claude Code를 JetBrains IDE에 연결할 수 있다. Claude가 IDE와 동일한 파일에 접근하려면 IDE 프로젝트 루트와 같은 디렉토리에서 Claude Code를 시작한다.

### 설정

#### Claude Code 설정

1. `claude` 실행
2. `/config` 명령어 입력
3. Diff 도구를 `auto`로 설정 → IDE에 diff 표시, `terminal`로 설정 → 터미널에 표시

#### Plugin 설정

**Settings → Tools → Claude Code [Beta]**에서 플러그인을 설정한다.

| 설정 항목 | 설명 |
|----------|------|
| **Claude command** | Claude 실행에 사용할 커스텀 명령어 지정 (예: `claude`, `/usr/local/bin/claude`, `npx @anthropic-ai/claude-code`) |
| **Suppress notification for Claude command not found** | Claude 명령어를 찾을 수 없다는 알림 건너뛰기 |
| **Enable using Option+Enter for multi-line prompts** (macOS만) | Option+Enter로 Claude Code 프롬프트에 줄바꿈 삽입. Option 키가 예기치 않게 캡처되는 문제가 있으면 비활성화 (터미널 재시작 필요) |
| **Enable automatic updates** | 플러그인 업데이트 자동 확인 및 설치 (재시작 시 적용) |

### ESC 키 설정

JetBrains 터미널에서 ESC 키가 Claude Code 작업을 중단하지 않는 경우:

1. **Settings → Tools → Terminal**로 이동
2. 다음 중 하나를 선택:
   - "Move focus to the editor with Escape" **체크 해제**
   - "Configure terminal keybindings" 클릭 후 "Switch focus to Editor" 단축키 **삭제**
3. 변경사항 적용

### 특수 구성

#### Remote development

플러그인은 로컬 클라이언트 머신이 아닌 원격 호스트에 설치해야 한다.

#### WSL 구성

WSL2에서 JetBrains IDE와 함께 Claude Code를 사용할 때 "No available IDEs detected"가 표시되는 경우, 원인은 보통 WSL2의 NAT 네트워킹 또는 Windows Firewall이 WSL2와 Windows 호스트의 IDE 간 연결을 차단하는 것이다. WSL1은 호스트의 네트워크를 직접 사용하므로 영향을 받지 않는다.

**해결 방법 1 — Windows Firewall 허용 (권장)**

기존 WSL2 네트워킹 모드를 유지할 수 있다.

**해결 방법 2 — WSL2를 mirrored networking으로 전환**

Windows 11 22H2 이상 필요. Windows 10인 경우 방화벽 규칙을 사용한다.

Windows 사용자 디렉토리의 `.wslconfig`에 추가:

```
[wsl2]
networkingMode=mirrored
```

PowerShell에서 `wsl --shutdown`으로 WSL을 재시작한다.

### Troubleshooting (JetBrains)

#### 플러그인이 작동하지 않는 경우

| 확인 사항 | 해결 방법 |
|----------|----------|
| 작업 디렉토리 | 프로젝트 루트 디렉토리에서 실행 중인지 확인 |
| 플러그인 활성화 | IDE 설정에서 Claude Code 플러그인이 활성화되어 있는지 확인 |
| IDE 재시작 | IDE를 완전히 재시작 (여러 번 필요할 수 있음) |
| 원격 개발 | JetBrains Remote Development의 경우 원격 호스트에 플러그인이 설치되어 있는지 확인 |

#### IDE가 감지되지 않는 경우

`claude` 실행 시 "No available IDEs detected"가 표시되면:

- 플러그인이 설치 및 활성화되어 있는지 확인
- IDE를 완전히 재시작
- 통합 터미널에서 Claude Code를 실행 중인지 확인
- WSL 사용자인 경우 WSL 구성 섹션 참조

#### 명령어를 찾을 수 없는 경우

Claude 아이콘을 클릭했을 때 "command not found"가 표시되면:

1. 터미널에서 `claude --version`을 실행하여 Claude Code가 설치되어 있는지 확인
2. Plugin 설정에서 Claude command 경로를 구성
3. WSL 사용자인 경우 설정 섹션에 설명된 WSL 명령어 형식 사용

---

## 보안 주의사항

### IDE 자동 편집 권한

Claude Code가 자동 편집 권한이 활성화된 IDE에서 실행 중일 때, IDE 구성 파일(예: VS Code의 `settings.json`, `tasks.json` 또는 JetBrains IDE 설정 파일)을 수정할 수 있으며, 이는 IDE에 의해 자동으로 실행될 수 있다.

### 권장 보안 조치

| 조치 | 설명 |
|------|------|
| **Restricted Mode 활성화** | 신뢰할 수 없는 workspace에서 VS Code Restricted Mode 활성화 |
| **수동 승인 모드 사용** | 편집에 auto-accept 대신 수동 승인 모드 사용 |
| **변경사항 신중 검토** | 승인 전에 변경사항을 주의 깊게 검토 |
| **신뢰할 수 있는 프롬프트만 사용** | Claude를 신뢰할 수 있는 프롬프트와 함께 사용 |
| **파일 접근 권한 인지** | Claude Code가 수정할 수 있는 파일의 범위를 인지 |
