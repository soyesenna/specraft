# Codex - 설치 및 설정

> 시스템 요구사항, 설치 방법(App / IDE 확장 프로그램 / CLI / Cloud), 인증 설정, 설정 파일 위치, 트러블슈팅 가이드

**참조**: [developers.openai.com/codex/quickstart](https://developers.openai.com/codex/quickstart) | [developers.openai.com/codex/app/windows](https://developers.openai.com/codex/app/windows) | [developers.openai.com/codex/app/features](https://developers.openai.com/codex/app/features) | [github.com/openai/codex - docs/install.md](https://github.com/openai/codex/blob/main/docs/install.md)

---

## 시스템 요구사항

| 요구사항 | 상세 |
| --- | --- |
| **운영체제** | macOS 12+, Ubuntu 20.04+ / Debian 10+, Windows 11 (네이티브 App 또는 WSL2) |
| **Git (권장)** | 2.23+ (내장 PR 헬퍼, 리뷰 패널 사용 시) |
| **RAM** | 최소 4GB (권장 8GB) |
| **Node.js** | npm 설치 시 22+ 필요 |

> **참고**: Windows 11에서는 네이티브 앱(PowerShell + Windows 샌드박스) 또는 WSL2 환경 중 선택할 수 있습니다. WSL1은 Codex 0.114까지만 지원되며, 0.115부터 Linux 샌드박스가 `bubblewrap`으로 전환되어 WSL1은 더 이상 지원되지 않습니다.

---

## 설치 방법

> **모든 ChatGPT 플랜에는 Codex가 포함되어 있습니다.** API 크레딧으로도 OpenAI API 키로 로그인하여 사용할 수 있습니다.

### 방법 1: Codex App (권장)

Codex App은 macOS와 Windows에서 사용할 수 있는 데스크톱 애플리케이션입니다. 병렬 에이전트 스레드 실행, worktree, 자동화, Git 기능, 인앱 브라우저, 아티팩트 미리보기, 플러그인, 스킬 등을 지원합니다.

#### macOS

| 아키텍처 | 다운로드 |
| --- | --- |
| Apple Silicon (M1/M2/M3/M4) | [Download for macOS (Apple Silicon)](https://chatgpt.com/codex) |
| Intel (x86_64) | [Download for macOS (Intel)](https://chatgpt.com/codex) |

#### Windows

| 설치 방법 | 명령어 |
| --- | --- |
| Microsoft Store | Microsoft Store에서 "Codex" 검색 후 설치 |
| winget | `winget install Codex -s msstore` |

**Windows 엔터프라이즈 배포**: 관리자는 Microsoft Store 앱 배포를 통해 엔터프라이즈 관리 도구로 배포할 수 있습니다.

#### 최초 실행

1. Codex App을 열고 ChatGPT 계정 또는 OpenAI API 키로 로그인합니다.
2. 작업할 프로젝트 폴더를 선택합니다.
3. **Local**이 선택된 상태에서 Codex에 첫 메시지를 보냅니다.

> **참고**: API 키로 로그인 시 일부 기능이 제한될 수 있습니다.

### 방법 2: IDE 확장 프로그램

Codex IDE 확장 프로그램은 지원하는 에디터 내에서 바로 Codex를 사용할 수 있게 합니다.

#### 지원 에디터

| 에디터 | 다운로드 |
| --- | --- |
| Visual Studio Code | [Download for VS Code](https://chatgpt.com/codex) |
| Cursor | [Download for Cursor](https://chatgpt.com/codex) |
| Windsurf | [Download for Windsurf](https://chatgpt.com/codex) |
| Visual Studio Code Insiders | [Download for VS Code Insiders](https://chatgpt.com/codex) |

#### 설정 및 사용

1. 확장 프로그램을 설치하면 사이드바에 Codex 패널이 나타납니다. (접힌 섹션에 숨겨져 있을 수 있으며, 오른쪽으로 이동 가능)
2. ChatGPT 계정 또는 API 키로 로그인합니다.
3. Codex는 기본적으로 **Agent mode**로 시작합니다 — 파일 읽기, 명령 실행, 프로젝트 디렉토리 내 변경 사항 작성이 가능합니다.
4. **Git 체크포인트 권장**: Codex가 코드베이스를 수정할 수 있으므로, 각 작업 전후로 Git 체크포인트를 생성하여 필요 시 쉽게 되돌릴 수 있도록 합니다.

> **App과 IDE 확장 프로그램 동기화**: Codex App과 IDE 확장 프로그램이 같은 프로젝트에 열려 있으면 자동으로 동기화됩니다. App의 작성기에서 **IDE context** 옵션이 나타나며, "Auto context" 활성화 시 현재 보고 있는 파일을 추적합니다.

### 방법 3: Cloud (브라우저)

웹 브라우저에서 [chatgpt.com/codex](https://chatgpt.com/codex)에 접속하여 바로 사용할 수 있습니다.

1. **Codex 열기**: [chatgpt.com/codex](https://chatgpt.com/codex)에 접속합니다. GitHub Pull Request 댓글에서 `@codex`를 태그하여 작업을 위임할 수도 있습니다 (ChatGPT 로그인 필요).
2. **환경 설정**: 첫 작업 전, 환경 설정에서 GitHub 리포지토리를 연결합니다.
3. **작업 실행 및 모니터링**: 환경이 준비되면 Codex 인터페이스에서 코딩 작업을 시작합니다. 로그를 실시간으로 확인하거나 백그라운드에서 실행할 수 있습니다.
4. **변경 검토 및 PR 생성**: 작업 완료 후 diff 뷰에서 제안된 변경 사항을 검토합니다. 결과를 반복하거나 GitHub 리포지토리에 직접 PR을 생성할 수 있습니다.

PR 브랜치를 로컬에서 테스트하려면:

```shell
git fetch
git checkout <branch-name>
```

### 방법 4: CLI (공식 설치 스크립트)

**macOS / Linux**:

```shell
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

**Windows** (PowerShell):

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"
```

**무인 설치** (CI/CD 환경):

```shell
# macOS / Linux
curl -fsSL https://chatgpt.com/codex/install.sh | CODEX_NON_INTERACTIVE=1 sh

# Windows PowerShell
$env:CODEX_NON_INTERACTIVE=1; irm https://chatgpt.com/codex/install.ps1 | iex
```

### 방법 5: npm

```shell
npm install -g @openai/codex
```

Node.js 22+가 필요합니다. Node.js가 설치되어 있지 않다면 [nodejs.org](https://nodejs.org)에서 설치하세요.

### 방법 6: Homebrew (macOS)

```shell
brew install --cask codex
```

### 방법 7: GitHub Release 바이너리

[최신 릴리스](https://github.com/openai/codex/releases/latest)에서 플랫폼에 맞는 바이너리를 다운로드합니다.

| 플랫폼 | 파일명 |
| --- | --- |
| macOS Apple Silicon | `codex-aarch64-apple-darwin.tar.gz` |
| macOS Intel (x86_64) | `codex-x86_64-apple-darwin.tar.gz` |
| Linux x86_64 | `codex-x86_64-unknown-linux-musl.tar.gz` |
| Linux arm64 | `codex-aarch64-unknown-linux-musl.tar.gz` |

압축 해제 후 바이너리 이름을 `codex`로 변경하여 PATH에 추가합니다.

### DotSlash 지원

GitHub Release에는 `codex`라는 DotSlash 파일도 포함되어 있습니다. DotSlash 파일을 사용하면 소스 컨트롤에 가벼운 커밋을 추가하여, 모든 기여자가 개발 플랫폼에 관계없이 동일한 버전의 실행 파일을 사용하도록 보장할 수 있습니다.

### 방법 8: 소스에서 빌드 (Rust)

```shell
# 리포지토리 클론
git clone https://github.com/openai/codex.git
cd codex/codex-rs

# Rust 툴체인 설치
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
rustup component add rustfmt clippy

# 빌드 도구 설치
cargo install --locked just
cargo install --locked cargo-nextest  # 선택사항

# 빌드
cargo build

# 실행
cargo run --bin codex -- "이 코드베이스를 설명해줘"
```

---

## Windows 전용 가이드

> 출처: [developers.openai.com/codex/app/windows](https://developers.openai.com/codex/app/windows)

### 에이전트 환경 선택

Windows에서는 에이전트가 실행되는 환경을 선택할 수 있습니다:

| 환경 | 샌드박스 | 설명 |
| --- | --- | --- |
| **Windows Native** (기본값) | Windows 샌드박스 | PowerShell에서 명령 실행 |
| **WSL2** | Linux 샌드박스 (`bubblewrap`) | Linux 환경에서 명령 실행 |

WSL2로 전환하려면 **Settings**에서 에이전트를 Windows native에서 WSL로 전환한 후 **앱을 재시작**합니다. 변경 사항은 재시작 후에 적용됩니다.

> **WSL1은 지원 종료**: WSL1은 Codex 0.114까지만 지원됩니다. 0.115부터 Linux 샌드박스가 `bubblewrap`으로 전환되어 WSL1은 더 이상 지원되지 않습니다.

### Windows 권장 개발자 도구

```powershell
winget install --id Git.Git
winget install --id OpenJS.NodeJS.LTS
winget install --id Python.Python.3.14
winget install --id Microsoft.DotNet.SDK.10
winget install --id GitHub.cli
```

GitHub CLI 설치 후 `gh auth login`을 실행하여 GitHub 기능을 활성화합니다.

| 도구 | 역할 |
| --- | --- |
| **Git** | 리뷰 패널, 변경 검사 및 되돌리기 |
| **Node.js** | 에이전트 작업 효율 향상 |
| **Python** | 에이전트 작업 효율 향상 |
| **.NET SDK** | 네이티브 Windows 앱 빌드 시 필요 |
| **GitHub CLI** | GitHub 연동 기능 |

### Windows 트러블슈팅

#### PowerShell 실행 정책 오류

Node.js, npm 등을 처음 사용하거나 Codex가 PowerShell 스크립트를 생성할 때 실행 정책 오류가 발생할 수 있습니다:

```
npm.ps1 cannot be loaded because running scripts is disabled on this system.
```

**해결 방법**: 실행 정책을 `RemoteSigned`로 변경:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned
```

#### 관리자 권한으로 실행

상승된 권한이 필요한 명령을 실행하려면 Codex 앱 자체를 관리자로 시작합니다. 시작 메뉴에서 Codex를 찾아 **Run as administrator**를 선택합니다. Codex 에이전트가 해당 권한 수준을 상속합니다.

#### WSL 프로젝트 접근

WSL 파일 시스템의 프로젝트를 열려면 **Add new project**(`Ctrl`+`O`)를 누르고 파일 탐색기에 `\\wsl$\\`를 입력한 후 Linux 배포판과 폴더를 선택합니다.

Windows Native 에이전트를 계속 사용하는 경우, 프로젝트를 **Windows 파일 시스템**에 저장하고 WSL에서 `/mnt/<drive>/...`로 접근하는 것이 더 안정적입니다.

#### WSL과 Windows 간 설정 공유

Windows 앱은 `%USERPROFILE%\.codex`를 홈 디렉토리로 사용합니다. WSL 내부에서 Codex CLI를 실행하면 Linux 홈 디렉토리를 사용하므로 설정이 자동으로 공유되지 않습니다.

공유하려면:

```shell
# WSL에서 Windows Codex 홈 디렉토리를 가리키도록 설정
export CODEX_HOME=/mnt/c/Users/<WINDOWS_USER>/.codex
```

이 설정을 영구적으로 하려면 `~/.bashrc` 또는 `~/.zshrc`에 추가합니다.

#### Git 기능을 사용할 수 없는 경우

Windows에 Git이 설치되어 있지 않으면 일부 기능을 사용할 수 없습니다. PowerShell이나 cmd.exe에서 설치:

```powershell
winget install Git.Git
```

#### `\\wsl$`에서 프로젝트를 열 때 Git이 감지되지 않는 경우

Windows Native 에이전트를 WSL에서도 접근 가능한 프로젝트와 함께 사용하려면, 프로젝트를 **네이티브 Windows 드라이브**에 저장하고 WSL에서 `/mnt/<drive>/...`로 접근하는 것이 가장 안정적인 해결 방법입니다.

---

## API 키 설정

### 방법 1: 환경변수

```shell
export OPENAI_API_KEY="sk-..."
```

영구적으로 설정하려면 셸 설정 파일(`~/.zshrc`, `~/.bashrc` 등)에 추가합니다:

```shell
echo 'export OPENAI_API_KEY="sk-..."' >> ~/.zshrc
source ~/.zshrc
```

### 방법 2: ChatGPT 계정 로그인

```shell
codex
```

실행 후 **Sign in with ChatGPT**를 선택합니다. 다음 플랜이 지원됩니다:

| 플랜 | 설명 |
| --- | --- |
| ChatGPT Plus | 개인 사용자 |
| ChatGPT Pro | 고급 사용자 |
| ChatGPT Business | 팀/비즈니스 |
| ChatGPT Edu | 교육 기관 |
| ChatGPT Enterprise | 기업 |

> API 키 로그인 시 일부 기능이 제한될 수 있습니다.

---

## 설정 파일 위치

### 글로벌 설정

| 파일 | 경로 | 설명 |
| --- | --- | --- |
| config.toml | `~/.codex/config.toml` | 사용자 글로벌 설정 |
| managed_config.toml | `~/.codex/managed_config.toml` | 엔터프라이즈 관리 설정 (우선순위 높음) |

### 프로젝트 설정

| 파일 | 경로 | 설명 |
| --- | --- | --- |
| config.toml | `.codex/config.toml` | 프로젝트별 설정 |

### 우선순위 (높은 순)

```
managed_config.toml > CLI 플래그 > .codex/config.toml > ~/.codex/config.toml
```

---

## 세션 데이터 위치

### 기본 경로

- 세션 홈: `$CODEX_HOME` (기본값: `~/.codex`)
- 세션 기록: `$CODEX_HOME/sessions/`
- 설정 파일: `$CODEX_HOME/config.toml`

### 환경변수로 변경

```shell
export CODEX_HOME="/custom/path/to/codex-home"
```

---

## 로그 및 디버깅

### 로그 위치

| 항목 | 경로 |
| --- | --- |
| TUI 로그 | `~/.codex/log/codex-tui.log` |
| 세션 기록 | `~/.codex/sessions/` |

### 로그 확인

```shell
tail -F ~/.codex/log/codex-tui.log
```

### 로그 수준 조정

`RUST_LOG` 환경변수로 제어합니다:

```shell
# 상세 로그
export RUST_LOG=codex_core=debug,codex_tui=debug

# 기본값
export RUST_LOG=codex_core=info,codex_tui=info,codex_rmcp_client=info
```

비대화형 모드(`codex exec`)의 기본값은 `RUST_LOG=error`이며, 인라인으로 출력됩니다.

### 로그 디렉토리 변경

```shell
codex -c log_dir=./.codex-log
```

---

## 셸 자동완성 설정

```shell
# Bash
codex completion bash >> ~/.bashrc

# Zsh
echo 'eval "$(codex completion zsh)"' >> ~/.zshrc
# compdef 오류 발생 시:
echo 'autoload -Uz compinit && compinit' >> ~/.zshrc

# Fish
codex completion fish > ~/.config/fish/completions/codex.fish
```

---

## 업데이트 방법

### 설치 스크립트로 설치한 경우

```shell
# 최신 버전으로 재설치
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

### npm으로 설치한 경우

```shell
npm update -g @openai/codex
```

### Homebrew로 설치한 경우

```shell
brew upgrade --cask codex
```

### 버전 확인

```shell
codex --version
```

---

## 트러블슈팅 기본

### 일반적인 문제 해결

| 문제 | 해결 방법 |
| --- | --- |
| `command not found: codex` | PATH에 설치 경로가 포함되어 있는지 확인. npm 설치 시 `-g` 플래그 사용 |
| 인증 실패 | `OPENAI_API_KEY`가 올바른지 확인. `codex` 실행 후 ChatGPT 로그인 재시도 |
| 권한 오류 | `~/.codex/` 디렉토리 권한 확인: `chmod -R 755 ~/.codex` |
| 샌드박스 오류 | `--sandbox` 플래그로 모드 변경 시도 |
| macOS 보안 경고 | `xattr -d com.apple.quarantine $(which codex)` 로 격리 속성 제거 |

### 설정 진단

```shell
# 설정 계층 및 정책 요구사항 디버그
codex --help

# 세션 내에서 설정 상태 확인
codex
> /status

# 설정 레이어 디버그
> /debug-config
```

### 로그 분석

```shell
# 최근 에러 로그 확인
grep -i error ~/.codex/log/codex-tui.log | tail -20

# 세션 기록 확인
ls -lt ~/.codex/sessions/ | head -10
```

### 세션 복구

```shell
# 이전 세션 목록 확인
codex resume

# 특정 세션 재개
codex resume <SESSION_ID>

# 가장 최근 세션 재개
codex resume --last
```

---

## macOS 로그 위치 (Native 앱)

Native macOS 앱을 사용하는 경우 로그는 다음 위치에 저장됩니다:

```
~/Library/Logs/com.openai.codex/
```

---

> **최종 업데이트**: 2026-06-06
> **출처**: [developers.openai.com/codex/quickstart](https://developers.openai.com/codex/quickstart), [developers.openai.com/codex/app/windows](https://developers.openai.com/codex/app/windows), [developers.openai.com/codex/app/features](https://developers.openai.com/codex/app/features), [github.com/openai/codex - docs/install.md](https://github.com/openai/codex/blob/main/docs/install.md)
