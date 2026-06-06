# 16. 문제 해결 (Troubleshooting)

> **원문**: [Troubleshooting](https://code.claude.com/docs/en/troubleshooting) | [Troubleshoot installation and login](https://code.claude.com/docs/en/troubleshoot-install) | [Error reference](https://code.claude.com/docs/en/errors) | [Debug your configuration](https://code.claude.com/docs/en/debug-your-config)
>
> **기존 참조**: [Troubleshooting - Anthropic](https://docs.anthropic.com/en/docs/claude-code/troubleshooting)

---

## 증상 기반 라우팅 테이블

어떤 문제인지 모르겠다면, 아래 표에서 증상에 해당하는 섹션을 찾으세요. Claude Code 내부에서 `/doctor`를 실행하면 설치, 설정, MCP 서버, 컨텍스트 사용량을 자동으로 점검합니다. `claude`가 아예 시작되지 않으면 쉘에서 `claude doctor`를 실행하세요.

| 증상 | 이동 |
|------|------|
| `command not found`, 설치 실패, PATH 문제, `EACCES`, TLS 에러 | [일반적인 설치 문제](#일반적인-설치-문제) |
| 로그인 루프, OAuth 에러, `403 Forbidden`, "organization disabled", Bedrock/Vertex/Foundry 자격 증명 | [인증 문제](#인증-문제) |
| 설정이 적용되지 않음, 훅이 실행되지 않음, MCP 서버 로딩 안 됨 | 설정 디버깅 |
| `API Error: 5xx`, `529 Overloaded`, `429`, 요청 검증 에러 | [에러 레퍼런스](#에러-레퍼런스) |
| `model not found` 또는 `you may not have access to it` | [에러 레퍼런스 - 요청 에러](#요청-에러) |
| VS Code 확장이 연결되지 않거나 Claude를 감지하지 못함 | VS Code 통합 |
| JetBrains 플러그인 또는 IDE 미감지 | JetBrains 통합 |
| 높은 CPU/메모리, 느린 응답, 멈춤, 검색 불가 | [성능 및 안정성](#성능-및-안정성) |

---

## 일반적인 설치 문제

설치에 실패하거나 로그인할 수 없는 경우, 아래에서 해당 에러를 찾으세요.

### 설치 에러 빠른 찾기

| 메시지 | 해결 방법 |
|--------|-----------|
| `command not found: claude` 또는 `'claude' is not recognized` | [PATH 수정](#path-확인) |
| `syntax error near unexpected token '<'` | 설치 스크립트가 HTML 반환 |
| `curl: (22) The requested URL returned error: 403` | 설치 스크립트 403 에러 |
| `curl: (23)` 또는 `curl: (56) Failure writing output to destination` | 연결 확인 또는 대체 설치 프로그램 사용 |
| `Killed` (Linux 설치 시) | 스왑 공간 추가 |
| `TLS connect error` 또는 `SSL/TLS secure channel` | CA 인증서 업데이트 |
| `Failed to fetch version` 또는 다운로드 서버에 연결 불가 | 네트워크 및 프록시 설정 확인 |
| `irm is not recognized` 또는 `&& is not valid` | 올바른 쉘 명령어 사용 |
| `'bash' is not recognized as the name of a cmdlet` | Windows 설치 명령어 사용 |
| `Claude Code does not support 32-bit Windows` | Windows PowerShell (x86 아님) 열기 |
| `The process cannot access the file ... being used by another process` | 다운로드 폴더 비우고 재시도 |
| `Error loading shared library` | 시스템에 맞지 않는 바이너리 변형 |
| `Illegal instruction` | 아키텍처 또는 CPU 명령어 집합 불일치 |
| `cannot execute binary file: Exec format error` (WSL) | WSL1 네이티브 바이너리 회귀 |
| `Claude Code on Windows requires either Git for Windows (for bash) or PowerShell` | 쉘 설치 |
| `The process cannot access the file ... being used by another process` | 다운로드 폴더 비우고 재시도 |
| `Error loading shared library` | 시스템에 맞지 않는 바이너리 변형 |
| `Illegal instruction` | 아키텍처 또는 CPU 명령어 집합 불일치 |
| `cannot execute binary file: Exec format error` (WSL) | WSL1 네이티브 바이너리 회귀 |
| PowerShell 설치 완료 후 `claude` 미인식 또는 구버전 표시 | 터미널 재시작 후 PATH 확인 |
| `dyld: cannot load`, `dyld: Symbol not found`, `Abort trap` (macOS) | 바이너리 비호환성 |
| `Invoke-Expression: Missing argument in parameter list` | 설치 스크립트가 HTML 반환 |
| `App unavailable in region` | 해당 국가에서 Claude Code 사용 불가 |
| `unable to get local issuer certificate` | 기업 CA 인증서 구성 |
| `OAuth error` 또는 `403 Forbidden` | [인증 문제](#인증-문제) 확인 |
| `Could not load the default credentials` 또는 `Could not load credentials from any providers` | Bedrock, Vertex, Foundry 자격 증명 |
| `ChainedTokenCredential authentication failed` 또는 `CredentialUnavailableError` | Bedrock, Vertex, Foundry 자격 증명 |
| `API Error: 500`, `529 Overloaded`, `429` | [에러 레퍼런스](#에러-레퍼런스) 확인 |

### 네이티브 설치 (권장)

```bash
# macOS, Linux, WSL
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex
```

대체 설치 방법:

```bash
# macOS - Homebrew
brew install --cask claude-code

# Windows - WinGet
winget install Anthropic.ClaudeCode
```

### 네트워크 연결 확인

설치 프로그램은 `downloads.claude.ai`에서 다운로드합니다. 연결을 확인하세요.

```bash
curl -sI https://downloads.claude.ai/claude-code-releases/latest
```

`HTTP/2 200`이 보이면 서버에 연결된 것입니다. 출력이 없거나 `Could not resolve host`, 연결 타임아웃이면 네트워크가 연결을 차단하고 있는 것입니다.

기업 프록시 뒤에 있는 경우, 설치 전에 `HTTPS_PROXY`와 `HTTP_PROXY`를 설정하세요.

```bash
# macOS/Linux
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
$env:HTTP_PROXY = 'http://proxy.example.com:8080'
$env:HTTPS_PROXY = 'http://proxy.example.com:8080'
irm https://claude.ai/install.ps1 | iex
```

### PATH 확인

설치는 성공했지만 `command not found` 또는 `not recognized` 에러가 나면, 설치 디렉토리가 PATH에 없는 것입니다. 설치 위치는 macOS/Linux에서 `~/.local/bin/claude`, Windows에서 `%USERPROFILE%\.local\bin\claude.exe`입니다.

**macOS/Linux - Zsh (macOS 기본):**

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**macOS/Linux - Bash (대부분의 Linux 기본):**

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Windows PowerShell:**

```powershell
$currentPath = [Environment]::GetEnvironmentVariable('PATH', 'User')
[Environment]::SetEnvironmentVariable('PATH', "$currentPath;$env:USERPROFILE\.local\bin", 'User')
```

변경 후 터미널을 재시작하세요.

### 충돌하는 설치 확인

여러 Claude Code 설치가 버전 불일치나 예상치 못한 동작을 일으킬 수 있습니다.

```bash
# macOS/Linux: 설치 위치 확인
ls -la ~/.local/bin/claude          # 네이티브 설치 프로그램
npm -g ls @anthropic-ai/claude-code  # npm 전역 설치
```

```powershell
# Windows PowerShell
Test-Path "$env:USERPROFILE\.local\bin\claude.exe"
```

여러 설치가 발견되면 하나만 남기세요. 네이티브 설치(`~/.local/bin/claude`)가 권장됩니다.

```bash
# npm 전역 설치 제거
npm uninstall -g @anthropic-ai/claude-code

# 레거시 로컬 npm 설치 제거 (macOS/Linux)
rm -rf ~/.claude/local

# Homebrew 설치 제거 (macOS)
brew uninstall --cask claude-code

# WinGet 설치 제거 (Windows)
winget uninstall Anthropic.ClaudeCode
```

### 디렉토리 권한 확인

macOS/Linux에서 설치 프로그램은 `~/.local/bin/`과 `~/.claude/`에 쓰기 권한이 필요합니다.

```bash
test -w ~/.local/bin && echo "writable" || echo "not writable"
test -w ~/.claude && echo "writable" || echo "not writable"
```

쓰기 불가인 경우:

```bash
sudo mkdir -p ~/.local/bin
sudo chown -R $(whoami) ~/.local
```

### TLS/SSL 연결 에러

`curl: (35) TLS connect error`, `schannel: next InitializeSecurityContext failed`, `Could not establish trust relationship for the SSL/TLS secure channel` 등의 에러는 TLS 핸드셰이크 실패를 나타냅니다.

**시스템 CA 인증서 업데이트 (Ubuntu/Debian):**

```bash
sudo apt-get update && sudo apt-get install ca-certificates
```

**Windows에서 TLS 1.2 활성화:**

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
irm https://claude.ai/install.ps1 | iex
```

**기업 프록시 환경에서 CA 번들 사용:**

```bash
# 설치 시
curl --cacert /path/to/corporate-ca.pem -fsSL https://claude.ai/install.sh | bash

# Claude Code 실행 시
export NODE_EXTRA_CA_CERTS=/path/to/corporate-ca.pem
```

### 저메모리 Linux 서버에서 설치 시 Killed

Linux OOM killer가 프로세스를 종료한 것입니다. Claude Code는 최소 4GB RAM이 필요합니다.

```bash
# 2GB 스왑 파일 생성
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 설치 재시도
curl -fsSL https://claude.ai/install.sh | bash
```

### Docker에서 설치 시 멈춤

Docker 컨테이너에서 루트로 `/`에 설치하면 멈출 수 있습니다.

```dockerfile
WORKDIR /tmp
RUN curl -fsSL https://claude.ai/install.sh | bash
```

```bash
# Docker Desktop을 사용하는 경우 메모리 한도 증가
docker build --memory=4g .
```

### macOS에서 `dyld: cannot load`

`dyld: cannot load`, `dyld: Symbol not found`, `Abort trap: 6` 에러는 바이너리가 macOS 버전 또는 하드웨어와 호환되지 않음을 의미합니다. Claude Code는 macOS 13.0 이상이 필요합니다. macOS 버전을 확인하고 필요하면 업데이트하세요.

### WSL1에서 `Exec format error`

WSL에서 `cannot execute binary file: Exec format error`가 나타나면 WSL1에서 알려진 네이티브 바이너리 회귀입니다.

```powershell
# PowerShell에서 WSL2로 변환
wsl --set-version <DistroName> 2
```

WSL1을 유지해야 하는 경우, 동적 링커를 통해 실행하는 함수를 `~/.bashrc`에 추가하세요.

```bash
claude() {
  /lib64/ld-linux-x86-64.so.2 "$(readlink -f "$HOME/.local/bin/claude")" "$@"
}
```

### WSL에서 npm 설치 에러

WSL 내에서 `npm install -g`로 설치한 경우 해당됩니다. 네이티브 설치 프로그램을 사용했다면 이 섹션을 건너뛰세요.

- **OS/플랫폼 감지 문제**: npm이 플랫폼 불일치를 보고하면 WSL이 Windows `npm`을 사용하고 있을 수 있습니다. `npm config set os linux` 실행 후 `npm install -g @anthropic-ai/claude-code --force`로 설치하세요. `sudo`는 사용하지 마세요.
- **`exec: node: not found`**: WSL이 Windows의 Node.js를 사용하고 있을 수 있습니다. `which npm`과 `which node`로 확인하세요. `/mnt/c/`로 시작하면 Windows 바이너리입니다. Linux 배포판의 패키지 매니저나 `nvm`으로 Node를 설치하세요.
- **nvm 버전 충돌**: WSL과 Windows 양쪽에 nvm이 있으면 버전 전환이 깨질 수 있습니다. `~/.bashrc` 또는 `~/.zshrc`에 nvm 로더를 추가하세요:

  ```bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
  ```

  nvm이 로드되었는데도 Windows 경로가 우선이면 Linux Node 경로를 명시적으로 앞에 추가하세요:

  ```bash
  export PATH="$HOME/.nvm/versions/node/$(node -v)/bin:$PATH"
  ```

### npm 설치 후 네이티브 바이너리를 찾을 수 없음

`Could not find native binary package "@anthropic-ai/claude-code-<platform>"`이 나타나면:

- **선택적 의존성 비활성화**: npm의 `--omit=optional`, pnpm의 `--no-optional`, yarn의 `--ignore-optional`을 제거하고 `.npmrc`에 `optional=false`가 없는지 확인 후 재설치하세요. 네이티브 바이너리는 선택적 의존성으로만 제공됩니다.
- **미지원 플랫폼**: 사전 빌드 바이너리는 `darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`, `linux-x64-musl`, `linux-arm64-musl`, `win32-x64`, `win32-arm64`용으로만 게시됩니다.
- **기업 npm 미러**: 레지스트리가 8개의 `@anthropic-ai/claude-code-*` 플랫폼 패키지를 모두 미러링하는지 확인하세요.

### 설치 중 권한 에러

네이티브 설치 프로그램이 권한 에러로 실패하면 [디렉토리 권한 확인](#디렉토리-권한-확인)을 참조하세요. 이전에 npm으로 설치했고 npm 관련 권한 에러가 발생하면 네이티브 설치 프로그램으로 전환하세요:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

### Linux musl/glibc 바이너리 불일치

`libstdc++.so.6` 등의 공유 라이브러리 누락 에러가 나타나면, 설치 프로그램이 잘못된 바이너리 변형을 다운로드했을 수 있습니다.

```bash
# 시스템 libc 확인
ldd --version 2>&1 | head -1
# GNU libc/GLIBC = glibc, musl = musl
```

Alpine Linux (musl)인 경우:

```bash
apk add libgcc libstdc++ ripgrep
```

### `Illegal instruction`

아키텍처 불일치이거나 CPU가 AVX 명령어 집합을 지원하지 않는 것입니다. 2013년 이전 Intel/AMD 프로세서 또는 하이퍼바이저가 AVX를 게스트에 전달하지 않는 VM에서 발생할 수 있습니다.

```bash
# VPS/VM에서 AVX 가용성 확인
grep -m1 -ow avx /proc/cpuinfo
```

### Windows에서 Claude Desktop이 `claude` 명령어 덮어쓰기

이전 버전의 Claude Desktop이 `WindowsApps` 디렉토리에 `Claude.exe`를 등록하여 Claude Code CLI보다 PATH 우선순위가 높을 수 있습니다. Claude Desktop을 최신 버전으로 업데이트하세요.

### Windows에서 잘못된 설치 명령어

`'irm' is not recognized`, `The token '&&' is not valid`, `'bash' is not recognized as the name of a cmdlet`가 나타나면 다른 쉘이나 운영체제용 설치 명령어를 복사한 것입니다.

- **`irm` not recognized**: CMD에 있습니다. PowerShell을 열어 원래 설치 명령어를 실행하거나, CMD 설치 명령어를 사용하세요:

  ```cmd
  curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
  ```

- **`&&` not valid**: PowerShell에서 CMD 설치 명령어를 실행한 것입니다. PowerShell 설치 명령어를 사용하세요:

  ```powershell
  irm https://claude.ai/install.ps1 | iex
  ```

- **`bash` not recognized**: macOS/Linux 설치 명령어를 Windows에서 실행한 것입니다. PowerShell 설치 명령어를 사용하세요.

### Windows에서 Claude Code 실행에 쉘 필요

`Claude Code on Windows requires either Git for Windows (for bash) or PowerShell` 에러가 나타나면 PowerShell과 Git Bash 모두 감지되지 않은 것입니다.

- **PowerShell이 PATH에 없으면**: 기본 위치는 `C:\Windows\System32\WindowsPowerShell\v1.0\`입니다. PATH에 추가하거나 PowerShell 7(`pwsh`)을 설치하세요.
- **Git for Windows를 설치하려면**: git-scm.com/downloads/win에서 다운로드하세요. 설치 중 "Add to PATH"를 선택하고 터미널을 재시작하세요. Bash 기반 스크립트와 도구를 사용할 수 있습니다.
- **Git이 설치되어 있지만 감지되지 않으면**: `settings.json`에 경로를 설정하세요:

  ```json
  {
    "env": {
      "CLAUDE_CODE_GIT_BASH_PATH": "C:\\Program Files\\Git\\bin\\bash.exe"
    }
  }
  ```

### Claude Code does not support 32-bit Windows

Windows 시작 메뉴에 `Windows PowerShell`과 `Windows PowerShell (x86)` 두 항목이 있습니다. x86 항목은 32비트 프로세스로 실행되어 64비트 머신에서도 이 에러를 트리거합니다. 어떤 경우인지 확인하려면:

```powershell
[Environment]::Is64BitOperatingSystem
```

`True`이면 운영체제는 문제없습니다. x86 창을 닫고 x86 접미사가 없는 `Windows PowerShell`을 열어 설치 명령어를 다시 실행하세요. `False`이면 32비트 Windows를 사용 중이며, Claude Code는 64비트 운영체제가 필요합니다.

### Windows에서 설치 스크립트가 HTML을 반환하는 경우

```
bash: line 1: syntax error near unexpected token `<'
bash: line 1: `<!DOCTYPE html>'
```

PowerShell에서는 다음과 같이 나타납니다:

```
Invoke-Expression: Missing argument in parameter list.
```

설치 URL이 설치 스크립트 대신 HTML 페이지를 반환한 것입니다. "App unavailable in region"이면 해당 국가에서 사용할 수 없는 것입니다. 본문 없는 403은 기업 프록시나 방화벽이 다운로드를 차단한 것일 수도 있습니다.

**해결책:** 대체 설치 방법을 사용하거나 몇 분 후 재시도하세요.

### Windows에서 인증서 해지 확인 우회

`CRYPT_E_NO_REVOCATION_CHECK (0x80092012)` 또는 `CRYPT_E_REVOCATION_OFFLINE (0x80092013)`이 나타나면 기업 방화벽이 인증서 해지 조회를 차단하는 것입니다.

```cmd
curl --ssl-revoke-best-effort -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
```

또는 `winget install Anthropic.ClaudeCode`로 curl을 우회하세요.

### Windows에서 파일 접근 에러

`The process cannot access the file ... because it is being used by another process` 에러가 나타나면:

```powershell
Remove-Item -Recurse -Force "$env:USERPROFILE\.claude\downloads"
irm https://claude.ai/install.ps1 | iex
```

---

## 인증 문제

### 로그인 초기화

로그인이 실패하고 원인이 명확하지 않으면, 깨끗한 재인증이 대부분의 문제를 해결합니다.

1. `/logout` 실행하여 완전히 로그아웃
2. Claude Code 종료
3. `claude`로 재시작 후 인증 프로세스 다시 진행

브라우저가 자동으로 열리지 않으면 `c`를 눌러 OAuth URL을 클립보드에 복사한 후 브라우저에 수동으로 붙여넣으세요.

### OAuth 에러: Invalid code

`OAuth error: Invalid code. Please make sure the full code was copied`가 나타나면 로그인 코드가 만료되었거나 복사 중 잘린 것입니다.

- 브라우저가 열린 후 빠르게 로그인 완료
- 브라우저가 자동으로 열리지 않으면 `c`를 눌러 URL 복사
- 원격/SSH 세션에서는 터미널에 표시된 URL을 로컬 브라우저에서 열기

### 로그인 후 403 Forbidden

`API Error: 403 {"error":{"type":"forbidden","message":"Request not allowed"}}`가 나타나면:

- **Claude Pro/Max 사용자**: claude.ai/settings에서 구독이 활성 상태인지 확인
- **Anthropic Console 사용자**: 계정에 "Claude Code" 또는 "Developer" 역할이 있는지 확인. 관리자가 Anthropic Console Settings > Members에서 할당
- **프록시 뒤에 있는 경우**: 기업 프록시가 API 요청을 방해할 수 있음

### 비활성화된 조직 에러

활성 Claude 구독이 있음에도 `API Error: 400 ... "This organization has been disabled"`가 나타나면, `ANTHROPIC_API_KEY` 환경변수가 구독을 덮어쓰고 있는 것입니다.

```bash
unset ANTHROPIC_API_KEY
claude
```

`~/.zshrc`, `~/.bashrc`, `~/.profile`에서 `export ANTHROPIC_API_KEY=...` 줄을 제거하세요. Claude Code 내부에서 `/status`를 실행하여 활성 인증 방식을 확인할 수 있습니다.

### WSL2, SSH, 컨테이너에서 OAuth 로그인 실패

브라우저가 다른 호스트에서 열려 리다이렉트가 Claude Code의 로컬 콜백 서버에 도달하지 못합니다. 브라우저에 로그인 코드가 표시되면 터미널의 `Paste code here if prompted` 프롬프트에 붙여넣으세요.

WSL2에서 브라우저가 아예 열리지 않으면:

```bash
export BROWSER="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
claude
```

대화형 프롬프트에 붙여넣기가 작동하지 않으면 `claude auth login`을 대신 사용하세요.

### 로그인 만료 또는 토큰 만료

`/login`으로 재인증하세요. 자주 발생하면 시스템 시계가 정확한지 확인하세요. 토큰 검증은 올바른 타임스탬프에 의존합니다.

macOS에서 Keychain이 잠겨 있거나 비밀번호가 동기화되지 않아 자격 증명 저장에 실패할 수 있습니다. `claude doctor`로 Keychain 접근을 확인하고, 필요하면 `security unlock-keychain ~/Library/Keychains/login.keychain-db`로 수동 잠금 해제하세요.

### Bedrock, Vertex, Foundry 자격 증명 로딩 실패

클라우드 제공자를 구성했는데 자격 증명 에러가 나타나면:

**Bedrock:**

```bash
aws sts get-caller-identity
```

**Vertex AI:**

```bash
# 환경변수 확인
echo $ANTHROPIC_VERTEX_PROJECT_ID
echo $CLOUD_ML_REGION

# 애플리케이션 기본 자격 증명 설정
gcloud auth application-default login
```

**Microsoft Foundry:**

`ANTHROPIC_FOUNDRY_API_KEY`가 설정되어 있는지 확인하거나, Azure CLI로 로그인하여 기본 자격 증명 체인이 계정을 찾을 수 있도록 하세요.

IDE 확장에서 작동하지 않으면 IDE 프로세스가 쉘 환경을 상속받지 않은 것입니다. IDE 자체 설정에서 제공자 환경변수를 설정하거나, 이미 export된 터미널에서 IDE를 실행하세요.

---

## 설정 디버깅

Claude가 명령을 무시하거나 구성한 기능이 나타나지 않으면, 원인은 보통 파일이 로드되지 않았거나 예상과 다른 위치에서 로드되었거나 다른 파일이 덮어쓴 것입니다. 이 가이드는 Claude Code가 실제로 무엇을 로드했는지 확인하여 원인을 좁히는 방법을 보여줍니다.

### 컨텍스트에 로드된 항목 확인

`/context` 명령은 현재 세션의 컨텍스트 윈도우를 점유하는 모든 항목을 카테고리별로 보여줍니다: 시스템 프롬프트, 메모리 파일, 스킬, MCP 도구, 대화 메시지. `CLAUDE.md`, 규칙, 스킬 설명이 실제로 존재하는지 먼저 확인하세요.

특정 카테고리의 세부 정보는 전용 명령으로 확인합니다:

| 명령어 | 표시 내용 |
|--------|-----------|
| `/memory` | 로드된 `CLAUDE.md` 및 규칙 파일, 자동 메모리 항목 |
| `/skills` | 프로젝트, 사용자, 플러그인 소스의 사용 가능한 스킬 |
| `/agents` | 구성된 서브에이전트 및 설정 |
| `/hooks` | 활성 훅 구성 |
| `/mcp` | 연결된 MCP 서버 및 상태 |
| `/permissions` | 현재 적용 중인 allow/deny 규칙 |
| `/doctor` | 구성 진단: 잘못된 키, 스키마 에러, 설치 상태 |
| `/debug [issue]` | 세션의 디버그 로깅을 활성화하고 Claude가 로그 출력과 설정 경로를 사용하여 진단 |
| `/status` | 활성 설정 소스, 관리형 설정 적용 여부 포함 |

`/memory`에 파일이 누락되어 있으면, 파일 위치가 CLAUDE.md 파일 로드 방식과 일치하는지 확인하세요. 하위 디렉토리의 `CLAUDE.md` 파일은 세션 시작 시가 아니라 Claude가 해당 디렉토리의 파일을 Read 도구로 읽을 때 온디맨드로 로드됩니다.

`/memory`에서 파일이 로드된 것을 확인했는데도 특정 명령을 따르지 않으면, 문제는 로드 여부가 아니라 명령의 작성 방식일 가능성이 높습니다. CLAUDE.md는 새 팀원에게 주는 종류의 안내(프로젝트 규칙, 빌드 명령, 파일 위치)에 효과적입니다. 지시사항이 여러 가지로 해석될 수 있을 만큼 모호하거나, 두 파일이 충돌하는 지시를 주거나, 파일이 너무 길어져 개별 규칙의 주목도가 떨어질 때 준수도가 낮아집니다.

### 해결된 설정 확인

설정은 managed, user, project, local 스코프에 걸쳐 병합됩니다. Managed 설정은 항상 우선합니다. 나머지 중에서는 local, project, user 순서로 가까운 스코프가 넓은 스코프를 덮어씁니다. 일부 설정은 명령줄 플래그나 환경변수로도 설정할 수 있으며, 이는 또 다른 오버라이드 레이어입니다. 설정이 적용되지 않는 것 같으면, 설정한 값이 다른 스코프나 환경변수에 의해 덮어쓰이고 있는 경우가 많습니다.

- `/doctor`를 실행하여 구성 파일의 유효성을 검사하고 잘못된 키나 스키마 에러를 확인하세요. `/doctor`가 문제를 보고하면 `f`를 눌러 진단 보고서를 Claude에게 보내 수정을 함께 진행할 수 있습니다.
- `/status`를 실행하여 어떤 설정 소스가 활성 상태인지, 관리형 설정이 적용되고 있는지 확인하세요.

### MCP 서버 확인

`/mcp`를 실행하여 구성된 모든 서버, 연결 상태, 현재 프로젝트에 승인되었는지 확인하세요. 서버가 올바르게 정의되었지만 도구를 제공하지 않는 몇 가지 일반적인 원인이 있습니다:

- `.mcp.json`의 프로젝트 스코프 서버는 일회성 승인이 필요합니다. 프롬프트가 닫혔으면 `/mcp`에서 승인할 때까지 서버가 비활성화됩니다.
- 서버가 시작에 실패하면 `/mcp`에 실패로 표시됩니다. `command`나 `args`의 상대 파일 경로가 흔한 원인입니다. 경로는 `.mcp.json`의 위치가 아니라 Claude Code를 실행한 디렉토리 기준으로 해석됩니다.
- 서버가 연결된 것으로 표시되지만 도구가 0개이면 시작은 성공했지만 도구 목록을 반환하지 않는 것입니다. `/mcp`에서 __Reconnect__ 를 선택하세요. 도구 수가 계속 0이면 `claude --debug mcp`로 서버의 stderr 출력을 확인하세요.

### 훅 확인

`/hooks`를 실행하여 현재 세션에 등록된 모든 훅을 이벤트별로 그룹화하여 나열하세요. 정의한 훅이 나타나지 않으면 읽히지 않은 것입니다. 훅은 독립 실행형 파일이 아니라 설정 파일의 `"hooks"` 키 아래에 있어야 합니다.

훅이 나타나지만 실행되지 않으면 matcher가 일반적인 원인입니다. `matcher` 필드는 `|`를 사용하여 여러 도구 이름을 매칭하는 단일 문자열입니다(예: `"Edit|Write"`). 도구 이름의 오타는 matcher가 매칭되지 않아 조용히 실패합니다. 배열 값은 스키마 에러입니다. Claude Code가 설정 에러 알림을 표시하고, `/doctor`가 유효성 검사 실패를 보고하며, 해당 훅 항목이 삭제되어 `/hooks`에 나타나지 않습니다.

`settings.json` 편집은 짧은 파일 안정성 지연 후 현재 세션에 즉시 적용됩니다. 재시작이 필요 없습니다. 저장 후 몇 초가 지났는데도 `/hooks`에 이전 정의가 표시되면 `/hooks`를 다시 실행하여 새로고침하세요.

`/hooks`에 훅이 표시되는데도 여전히 실행되지 않으면, 훅 평가를 실시간으로 관찰하세요. `claude --debug hooks`로 세션을 시작하고 도구 호출을 트리거하세요. 디버그 로그에 각 이벤트, 확인된 matcher, 훅의 종료 코드와 출력이 기록됩니다.

### 클린 설정으로 테스트

대상화된 점검으로 원인을 찾을 수 없거나 구성 상태를 알 수 없는 경우, 일반 설정을 로드하지 않는 세션과 비교하세요. `CLAUDE_CONFIG_DIR`을 빈 디렉토리로 지정하여 `~/.claude`의 모든 항목을 우회하고, `.claude` 폴더, `.mcp.json`, `CLAUDE.md`가 없는 디렉토리에서 실행하여 프로젝트 구성도 건너뛰세요.

```bash
cd /tmp && CLAUDE_CONFIG_DIR=/tmp/claude-clean claude
```

클린 세션에는 사용자/프로젝트 설정, 훅, MCP 서버, 플러그인, 메모리가 없습니다.

- 조직에서 managed 설정을 배포 중이면 계속 적용됩니다. managed 설정은 `~/.claude` 외부의 시스템 경로에 있습니다.
- Linux와 Windows에서는 자격 증명이 구성 디렉토리에 저장되므로 다시 로그인해야 합니다.
- macOS에서는 자격 증명이 Keychain에 있으므로 클린 세션으로 전달됩니다.

문제가 여기서 사라지면 원인은 실제 `~/.claude` 또는 프로젝트 `.claude` 파일에 있습니다. 파일을 하나씩 임시 디렉토리에 복사하거나 프로젝트에서 실행하여 원인을 찾으세요. 클린 세션에서도 지속되면 원인은 사용자/프로젝트 구성 외부에 있습니다. `/status`로 managed 설정이 적용 중인지 확인하고, Claude Code에 영향을 주는 환경변수를 찾으세요.

### 일반적인 구성 문제 원인

대부분의 구성 문제는 적은 수의 위치 및 구문 규칙으로 추적됩니다. 버그로 가정하기 전에 아래를 확인하세요:

| 증상 | 원인 | 해결 |
|------|------|------|
| 훅이 실행되지 않음 | `matcher`가 문자열이 아닌 JSON 배열 | 여러 도구를 매칭하려면 `|`가 포함된 단일 문자열을 사용. 예: `"Edit\|Write"` |
| 훅이 실행되지 않음 | `matcher` 값이 소문자 (예: `"bash"`) | 매칭은 대소문자 구분. 도구 이름: `Bash`, `Edit`, `Write`, `Read` |
| 훅이 실행되지 않음 | 훅이 `settings.json`이 아닌 독립 실행형 파일에 정의됨 | 프로젝트/사용자 설정용 독립 훅 파일은 없습니다. `settings.json`의 `"hooks"` 키 아래에 정의하세요 |
| 권한, 훅, env가 무시됨 | 구성이 `~/.claude.json`에 추가됨 | `~/.claude.json`은 앱 상태 및 UI 토글입니다. `permissions`, `hooks`, `env`는 `~/.claude/settings.json`에 있어야 합니다 |
| `settings.json` 값이 무시됨 | 같은 키가 `settings.local.json`에 설정됨 | `settings.local.json`이 `settings.json`을 덮어씀 |
| 스킬이 `/skills`에 없음 | 스킬 파일이 `.claude/skills/name.md`에 있음 | 폴더 안에 `SKILL.md`를 사용: `.claude/skills/name/SKILL.md` |
| 스킬은 있지만 Claude가 호출하지 않음 | `disable-model-invocation: true`이거나 설명이 요청과 매칭되지 않음 | `/skills`에서 배지 확인. "user-only" 라벨은 Claude가 자동 트리거하지 않음 |
| 하위 디렉토리 `CLAUDE.md` 무시됨 | 하위 디렉토리 파일은 온디맨드 로드 | Claude가 해당 디렉토리의 파일을 Read 도구로 읽을 때 로드됨 |
| 서브에이전트가 `CLAUDE.md` 무시 | 내장 Explore/Plan 에이전트는 `CLAUDE.md`를 건너뜀 | 해당 에이전트에는 프롬프트에 직접 명령을 포함하세요 |
| 세션 종료 시 정리 로직 미실행 | `SessionEnd` 훅 미구성 | `settings.json`에 `SessionEnd` 훅 추가 |
| `.mcp.json`의 MCP 서버 로드 안 됨 | 파일이 `.claude/` 아래에 있거나 Claude Desktop 형식 사용 | 프로젝트 MCP 구성은 리포지토리 루트에 `.mcp.json`으로 |
| `settings.json`의 `mcpServers` 미인식 | `settings.json`은 `mcpServers` 키를 읽지 않음 | `.mcp.json` 또는 `claude mcp add --scope user` 사용 |
| 프로젝트 MCP 서버 추가 후 미표시 | 일회성 승인 프롬프트가 닫힘 | `/mcp`에서 상태 확인 후 승인 |
| 일부 디렉토리에서 MCP 서버 시작 실패 | `command`/`args`에 상대 경로 사용 | 로컬 스크립트에는 절대 경로 사용. `npx`, `uvx` 등은 PATH에서 작동 |
| MCP 서버에 환경변수 누락 | 변수가 `settings.json`의 `env`에 있음 | `settings.json`의 `env`는 MCP 자식 프로세스에 전파되지 않음. `.mcp.json`의 서버별 `env`에 설정 |
| `Bash(rm *)` deny 규칙이 `/bin/rm` 차단 안 함 | 접두사 규칙은 실행 파일이 아닌 명령어 문자열 매칭 | 각 변형에 대한 명시적 패턴 추가 또는 PreToolUse 훅/샌드박스 사용 |

---

## 성능 및 안정성

Claude Code가 실행 중일 때의 성능, 안정성, 검색 동작과 관련된 문제를 다룹니다.

### 높은 CPU 또는 메모리 사용량

Claude Code는 대부분의 개발 환경에서 작동하지만, 대규모 코드베이스를 처리할 때 상당한 리소스를 소모할 수 있습니다.

1. `/compact`을 정기적으로 사용하여 컨텍스트 크기 감소
2. 주요 작업 사이에 Claude Code 재시작
3. 대규모 빌드 디렉토리를 `.gitignore`에 추가

이 단계 후에도 메모리 사용량이 계속 높으면, `/heapdump`를 실행하여 JavaScript 힙 스냅샷과 메모리 분석 결과를 `~/Desktop`에 저장하세요. Linux에서 Desktop 폴더가 없으면 홈 디렉토리에 저장됩니다.

분석 결과는 상주 세트 크기, JS 힙, 배열 버퍼, 비할당 네이티브 메모리를 보여주어, 성장이 JavaScript 객체에 있는지 네이티브 코드에 있는지 식별하는 데 도움이 됩니다. Retainer를 조사하려면 Chrome DevTools의 Memory > Load에서 `.heapsnapshot` 파일을 여세요. GitHub에 메모리 문제를 보고할 때 두 파일을 모두 첨부하세요.

### Auto-compaction이 thrashing 에러로 중지되는 경우

`Autocompact is thrashing: the context refilled to the limit...` 메시지가 보이면, 자동 compaction은 성공했지만 파일이나 도구 출력이 즉시 컨텍스트 윈도우를 여러 번 연속으로 다시 채운 것입니다. Claude Code는 진행되지 않는 루프에서 API 호출을 낭비하지 않기 위해 재시도를 중지합니다.

**해결 방법:**

1. 대형 파일을 전체 대신 작은 청크(특정 라인 범위나 함수)로 읽도록 Claude에게 요청
2. `/compact`에 초점을 맞춰 대형 출력을 제거. 예: `/compact keep only the plan and the diff`
3. 대형 파일 작업을 서브에이전트로 이동하여 별도의 컨텍스트 윈도우에서 실행
4. 이전 대화가 더 이상 필요 없으면 `/clear` 실행

### 명령어 멈춤 또는 중단

Claude Code가 응답하지 않는 것 같으면:

1. `Ctrl+C`로 현재 작업 취소 시도
2. 응답이 없으면 터미널을 닫고 재시작

재시작해도 대화가 손실되지 않습니다. 같은 디렉토리에서 `claude --resume`을 실행하여 세션을 이어갈 수 있습니다.

### 에디터 통합 터미널에서 깨진 텍스트

VS Code, Cursor, Devin Desktop의 통합 터미널에서 Claude Code를 실행할 때 문자가 상자, 번짐, 잘못된 글리프로 렌더링되면, 터미널의 GPU 렌더러가 원인일 가능성이 높습니다.

Claude Code 내부에서 `/terminal-setup`을 실행하여 `terminal.integrated.gpuAcceleration`을 `"off"`로 설정하거나, 에디터 설정에서 수동으로 설정한 후 창을 다시 로드하세요.

### 검색 및 탐색 문제

검색 도구, `@file` 멘션, 커스텀 에이전트, 커스텀 스킬이 파일을 찾지 못하면, 번들된 `ripgrep` 바이너리가 시스템에서 실행되지 않는 것일 수 있습니다. 시스템의 `ripgrep` 패키지를 설치하고 Claude Code에 사용하도록 지정하세요.

```bash
# macOS
brew install ripgrep

# Ubuntu/Debian
sudo apt install ripgrep

# Alpine
apk add ripgrep

# Arch
pacman -S ripgrep

# Windows
winget install BurntSushi.ripgrep.MSVC
```

환경변수 `USE_BUILTIN_RIPGREP=0`을 설정하세요.

### WSL에서 느리거나 불완전한 검색 결과

WSL에서 파일 시스템 간 작업 시 디스크 읽기 성능 저하로 인해 예상보다 적은 결과가 반환될 수 있습니다.

| 해결 방법 | 설명 |
|-----------|------|
| 더 구체적인 검색 사용 | 디렉토리나 파일 유형 지정. 예: "Search for JWT validation logic in the auth-service package" |
| 프로젝트를 Linux 파일시스템으로 이동 | `/home/`에 프로젝트 위치 (`/mnt/c/` 대신) |
| 네이티브 Windows 사용 | WSL 대신 네이티브 Windows에서 실행 |

---

## 에러 레퍼런스

Claude Code가 표시하는 런타임 에러와 복구 방법을 정리합니다. 설치 에러(예: `command not found`, TLS 실패)는 [일반적인 설치 문제](#일반적인-설치-문제)를 참조하세요.

이 에러와 복구 명령어는 CLI, 데스크톱 앱, 웹의 Claude Code 모두에 적용됩니다. 세 가지 모두 동일한 Claude Code CLI를 래핑합니다.

### 에러 빠른 찾기

| 메시지 | 섹션 |
|--------|------|
| `API Error: 500 Internal server error` | 서버 에러 |
| `API Error: Repeated 529 Overloaded errors` | 서버 에러 |
| `Request timed out` | 서버 에러 (또는 인터넷 연결 언급 시 네트워크) |
| `<model> is temporarily unavailable, so auto mode cannot determine the safety of...` | 서버 에러 |
| `Auto mode could not evaluate this action and is blocking it for safety` | 서버 에러 |
| `Auto mode classifier transcript exceeded context window` | 서버 에러 |
| `You've hit your session limit` / `You've hit your weekly limit` | 사용량 제한 |
| `Server is temporarily limiting requests` | 사용량 제한 |
| `Request rejected (429)` | 사용량 제한 |
| `Credit balance is too low` | 사용량 제한 |
| `Not logged in · Please run /login` | 인증 에러 |
| `Invalid API key` | 인증 에러 |
| `This organization has been disabled` | 인증 에러 |
| `Your organization has disabled Claude subscription access` | 인증 에러 |
| `Routines are disabled by your organization's policy` | 인증 에러 |
| `OAuth token revoked` / `OAuth token has expired` | 인증 에러 |
| `does not meet scope requirement user:profile` | 인증 에러 |
| `Unable to connect to API` | 네트워크 에러 |
| `SSL certificate verification failed` | 네트워크 에러 |
| `403` with `x-deny-reason: host_not_allowed` (클라우드/루틴 세션) | 네트워크 에러 |
| `Prompt is too long` | 요청 에러 |
| `Error during compaction: Conversation too long` | 요청 에러 |
| `Request too large` | 요청 에러 |
| `Image was too large` | 요청 에러 |
| `Unable to resize image` | 요청 에러 |
| `PDF too large` / `PDF is password protected` | 요청 에러 |
| `Extra inputs are not permitted` | 요청 에러 |
| `There's an issue with the selected model` | 요청 에러 |
| `Claude Opus is not available with the Claude Pro plan` | 요청 에러 |
| `thinking.type.enabled is not supported for this model` | 요청 에러 |
| `max_tokens must be greater than thinking.budget_tokens` | 요청 에러 |
| `API Error: 400 due to tool use concurrency issues` | 요청 에러 |
| `Claude Code is unable to respond to this request, which appears to violate our Usage Policy` | 요청 에러 |
| 응답 품질이 평소보다 낮아 보임 | 응답 품질 |

### 자동 재시도

Claude Code는 에러를 표시하기 전에 일시적 실패를 재시도합니다. 서버 에러, 과부하 응답, 요청 타임아웃, 임시 429 스로틀, 연결 끊김은 모두 최대 10회 지수 백오프로 재시도됩니다. 재시도 중에는 스피너에 `Retrying in Ns · attempt x/y` 카운트다운이 표시됩니다.

이 페이지의 에러가 보이면 이미 재시도가 모두 소진된 것입니다. 두 가지 환경변수로 동작을 조정할 수 있습니다.

| 변수 | 기본값 | 효과 |
|------|--------|------|
| `CLAUDE_CODE_MAX_RETRIES` | 10 | 재시도 횟수. 스크립트에서 빠른 실패를 원하면 낮추고, 긴 장애를 기다리려면 높이세요 |
| `API_TIMEOUT_MS` | 600000 | 요청당 타임아웃 (밀리초). 느린 네트워크나 프록시에서 높이세요 |

### 서버 에러

추론 제공자 측의 에러입니다. Anthropic API에서는 Anthropic 인프라, Bedrock/Vertex AI/Foundry/커스텀 게이트웨이에서는 해당 제공자의 인프라를 의미합니다.

#### API Error: 500 Internal server error

```
API Error: 500 Internal server error. This is a server-side issue, usually temporary — try again in a moment. If it persists, check https://status.claude.com.
```

프롬프트, 설정, 계정이 원인이 아닌 API 내부의 예상치 못한 실패입니다.

**해결 방법:**

- status.claude.com (또는 메시지에 명시된 제공자 상태 페이지)에서 활성 인시던트 확인
- 잠시 기다린 후 메시지 재전송. 긴 프롬프트의 경우 전체를 다시 붙여넣지 않고 `try again` 입력
- 에러가 지속되면 `/feedback` 실행

#### API Error: Repeated 529 Overloaded errors

API가 일시적으로 모든 사용자에 대해 용량 한계에 도달했습니다. Claude Code가 이 메시지를 표시하기 전에 이미 여러 번 재시도했습니다.

```
API Error: Repeated 529 Overloaded errors. The API is at capacity — this is usually temporary. Try again in a moment. If it persists, check https://status.claude.com.
```

529는 사용량 제한이 아니며 할당량에 포함되지 않습니다.

**해결 방법:**

- status.claude.com에서 용량 공지 확인
- 몇 분 후 재시도
- `/model`로 다른 모델로 전환. 용량은 모델별로 추적됨

#### Request timed out

API가 연결 기한 전에 응답하지 않았습니다. 기본 요청 타임아웃은 10분입니다.

**해결 방법:**

- 요청 재시도
- 장기 실행 작업은 더 작은 프롬프트로 분할
- 느린 네트워크/프록시가 원인이면 `API_TIMEOUT_MS` 증가
- 타임아웃이 빈번하고 네트워크가 정상이면 네트워크 에러 섹션 확인

#### Auto mode가 작업의 안전성을 판단할 수 없음

Auto mode가 작업을 분류하는 데 사용하는 모델이 결정을 내리지 못해, auto mode가 해당 작업을 자동 승인하지 않았습니다. 표시되는 메시지는 분류기가 실패한 원인에 따라 다릅니다.

작업 디렉토리 내의 읽기, 검색, 편집은 분류기를 거치지 않으므로 모든 경우에 정상 작동합니다.

**분류기 모델이 과부하 상태일 때:**

```
<model> is temporarily unavailable, so auto mode cannot determine the safety of <tool> right now. Wait briefly and then try this action again.
```

**해결 방법:**

- 몇 초 후 재시도. Claude는 같은 메시지를 보고 보통 자체적으로 재시도함
- 재시도가 계속 실패하면 읽기 전용 작업을 계속하고 차단된 작업은 나중에 다시 시도
- 이는 일시적이며 auto mode 자격과 무관. 설정 변경 불필요

**분류기가 파싱 불가능한 응답을 반환했을 때:**

```
Auto mode could not evaluate this action and is blocking it for safety — run with --debug for details
```

**해결 방법:**

- 작업 재시도. 보통 다음 시도에서 성공함
- `claude --debug`로 실행하고 작업을 반복하여 디버그 로그에서 분류기 응답 확인

**대화가 분류기의 컨텍스트 윈도우보다 커졌을 때:**

```
Auto mode classifier transcript exceeded context window — falling back to manual approval (try /compact to reduce conversation size)
```

대화형 세션에서는 auto mode가 해당 작업에 대해 일반 권한 프롬프트로 대체(fallback)되어 수동으로 승인 또는 거부할 수 있습니다. 비대화형 모드에서는 트랜스크립트가 계속 커지기만 하므로 재시도해도 성공할 수 없어 실행이 중단됩니다.

**해결 방법:**

- 표시되는 프롬프트에서 작업 승인 또는 거부
- `/compact`을 실행하여 대화 크기를 줄이면 이후 작업이 분류기 윈도우 내에 다시 들어감

### 사용량 제한

계정이나 플랜에 연결된 할당량에 도달했음을 의미합니다. 서버 에러(모든 사용자에게 영향)와는 다릅니다.

#### 세션 한도 도달

구독 플랜에는 롤링 사용 허용량이 포함됩니다. 소진 시:

```
You've hit your session limit · resets 3:45pm
You've hit your weekly limit · resets Mon 12:00am
You've hit your Opus limit · resets 3:45pm
```

**해결 방법:**

- 에러에 표시된 초기화 시간까지 대기
- `/usage`로 플랜 한도 및 초기화 시점 확인
- `/usage-credits`로 추가 사용량 구매 (Pro/Max) 또는 관리자에게 요청 (Team/Enterprise)
- 플랜 업그레이드: claude.com/pricing

#### Server is temporarily limiting requests

플랜 할당량과 무관한 단기 스로틀입니다. 자동 재시도 후 표시됩니다.

```
API Error: Server is temporarily limiting requests (not your usage limit)
```

**해결 방법:** 잠시 대기 후 재시도. 지속되면 status.claude.com 확인.

#### Request rejected (429)

API 키, Amazon Bedrock 프로젝트, Google Vertex AI 프로젝트에 구성된 속도 제한에 도달했습니다.

```
API Error: Request rejected (429) · this may be a temporary capacity issue. If it persists, check https://status.claude.com.
```

**해결 방법:**

- `/status`로 활성 자격 증명이 예상한 것인지 확인. 환경에 `ANTHROPIC_API_KEY`가 있으면 저등급 키로 요청이 전달될 수 있음
- 제공자 콘솔에서 활성 한도 확인 및 필요시 상위 등급 요청
- 동시성 감소: `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` 낮추기, 병렬 서브에이전트 실행 자제, `/model`로 더 작은 모델로 전환

#### Credit balance is too low

Console 조직의 선불 크레딧이 소진되었습니다.

```
Credit balance is too low
```

**해결 방법:**

- platform.claude.com/settings/billing에서 크레딧 추가. 자동 리로드 활성화 권장
- Pro, Max, Team, Enterprise 플랜이 있으면 `/login`으로 구독 인증으로 전환
- Console에서 워크스페이스별 지출 한도 설정

### 인증 에러

Claude Code가 API에 신원을 증명할 수 없음을 의미합니다. 언제든 `/status`로 현재 활성 자격 증명을 확인할 수 있습니다.

#### Not logged in

```
Not logged in · Please run /login
```

**해결 방법:**

- `/login`으로 인증
- 환경변수로 인증하려면 `ANTHROPIC_API_KEY`가 설정 및 export되어 있는지 확인
- CI/자동화에서는 `apiKeyHelper` 스크립트 구성

#### Invalid API key

```
Invalid API key · Fix external API key
```

**해결 방법:**

- 오타 확인 및 Console에서 키가 취소되지 않았는지 확인
- `env | grep ANTHROPIC`으로 환경변수 확인. `.env` 파일에서 오래된 키가 로드될 수 있음
- `ANTHROPIC_API_KEY` unset 후 `/login`으로 구독 인증 사용
- `/status`로 실제 사용 중인 자격 증명 소스 확인

#### This organization has been disabled

비활성화된 Console 조직의 오래된 `ANTHROPIC_API_KEY`가 구독 로그인을 덮어쓰고 있습니다. 환경변수는 `/login`보다 우선합니다.

**해결 방법:**

- `ANTHROPIC_API_KEY` unset 및 쉘 프로필에서 제거 후 `claude` 재시작
- `/status`로 활성 자격 증명이 구독인지 확인
- 환경변수가 설정되어 있지 않은데도 에러가 지속되면 비활성화된 조직이 `/login`에 연결된 것입니다. 지원팀에 문의하거나 다른 계정으로 로그인

#### Your organization has disabled Claude subscription access

Claude 조직에서 구독 로그인으로 Claude Code에 로그인하는 것을 허용하지 않습니다. 같은 계정으로 `/login`을 반복해도 동일한 에러가 반환됩니다.

```
Your organization has disabled Claude subscription access for Claude Code · Use an Anthropic API key instead, or ask your admin to enable access
```

이는 서버 측 조직 설정이므로 로컬 설정, 환경변수, CLI 플래그로 재정의할 수 없습니다. Agent SDK와 `-p` 비대화형 모드에서는 `oauth_org_not_allowed` 에러 코드로 표시됩니다.

**해결 방법:**

- 관리자에게 조직의 Claude Code 접근 활성화를 요청
- 구독 대신 Console API 키로 인증. Claude Console 인증 참조
- 관리자인데 활성화 옵션이 보이지 않으면 Anthropic 지원팀에 문의

#### Routines are disabled by your organization's policy

Team 또는 Enterprise 관리자가 조직 수준에서 루틴을 비활성화했습니다. `/schedule`이나 claude.ai/code의 Routines UI에서 루틴을 생성하거나 실행하려고 할 때 이 에러가 나타납니다.

```
Routines are disabled by your organization's policy.
```

이는 서버 측 설정이므로 로컬 설정, 환경변수, CLI 플래그로 재정의할 수 없습니다.

**해결 방법:**

- 관리자에게 claude.ai/admin-settings/claude-code에서 __Routines__ 토글 활성화를 요청
- 조직 수준 루틴이 필요 없는 일회성 예약 작업은 scheduled tasks 참조

#### OAuth 토큰 취소 또는 만료

```
OAuth token revoked · Please run /login
OAuth token has expired · Please run /login
```

**해결 방법:**

- `/login`으로 재로그인
- 같은 세션에서 재인증 후에도 에러가 반복되면 `/logout` 후 `/login`
- 여러 실행에서 반복적으로 로그인 프롬프트가 나타나면 시스템 시계 및 macOS Keychain 확인

#### OAuth scope 요구사항

저장된 토큰이 새 기능에 필요한 권한 범위보다 이전 것입니다. `/usage`와 상태 표시줄 사용량 표시기에서 가장 자주 나타납니다.

```
OAuth token does not meet scope requirement: user:profile
```

**해결 방법:** `/login`으로 현재 범위가 포함된 새 토큰 발급. 로그아웃할 필요 없음.

### 네트워크 에러

Claude Code의 네트워크 요청이 대상에 도달하지 못했음을 의미합니다. 보통 로컬 네트워크, 프록시, 방화벽 또는 클라우드 환경의 네트워크 정책이 원인입니다.

#### Unable to connect to API

```
Unable to connect to API. Check your internet connection
Unable to connect to API (ECONNREFUSED)
Unable to connect to API (ECONNRESET)
Unable to connect to API (ETIMEDOUT)
fetch failed
```

**해결 방법:**

- 같은 쉘에서 `curl -I https://api.anthropic.com`으로 API 호스트 연결 확인. Windows PowerShell에서는 `curl.exe -I` 사용
- 기업 프록시 뒤에 있으면 `HTTPS_PROXY` 설정 후 Claude Code 실행
- LLM 게이트웨이/릴레이를 사용하면 `ANTHROPIC_BASE_URL` 설정
- 방화벽이 필요한 호스트를 허용하는지 확인
- 간헐적 실패는 자동 재시도됨. 지속적 실패는 로컬 네트워크 문제

`curl`은 성공하지만 Claude Code가 실패하면:

- Linux/WSL: `/etc/resolv.conf`에서 접근 불가능한 네임서버 확인
- macOS: 연결이 끊기거나 제거된 VPN 클라이언트가 터널 인터페이스나 라우팅 규칙을 남겼을 수 있음. `ifconfig`에서 오래된 `utun` 인터페이스 확인
- Docker Desktop 등 컨테이너 런타임이 아웃바운드 트래픽을 가로챌 수 있음. 종료 후 재시도

#### SSL 인증서 에러

```
Unable to connect to API: SSL certificate verification failed. Check your proxy or corporate SSL certificates
Unable to connect to API: Self-signed certificate detected
```

**해결 방법:**

- 조직의 CA 번들을 export하고 `NODE_EXTRA_CA_CERTS=/path/to/ca-bundle.pem` 설정
- `NODE_TLS_REJECT_UNAUTHORIZED=0`은 설정하지 마세요. 인증서 검증이 완전히 비활성화됨

#### 클라우드 세션에서 호스트가 허용되지 않음

클라우드 세션 또는 루틴의 아웃바운드 HTTP 요청이 환경의 네트워크 정책에 의해 차단되었습니다.

```
HTTP 403
x-deny-reason: host_not_allowed
```

대상의 실제 인증서와 일치하지 않는 TLS 인증서가 표시될 수도 있습니다. 클라우드 환경이 아웃바운드 트래픽을 네트워크 정책을 적용하는 프록시로 라우팅하므로, 인증서 불일치는 프록시가 연결을 종료했음을 의미합니다.

이는 클라이언트 측 네트워크 문제가 아닙니다. 클라우드 세션과 루틴은 샌드박스 환경에서 실행되며, 아웃바운드 트래픽이 환경의 허용 목록으로 필터링됩니다. __Default__ 환경은 __Trusted__ 액세스를 사용하며, 패키지 레지스트리, 클라우드 제공자 API, 컨테이너 레지스트리, 일반 개발 도메인의 기본 허용 목록을 허용하지만 그 외에는 모두 차단합니다.

**해결 방법:**

- 루틴을 편집용으로 열거나 클라우드 세션을 시작합니다. 환경 이름(예: __Default__)을 표시하는 클라우드 아이콘을 선택하여 선택기를 엽니다. 환경 위에 마우스를 올리고 설정 아이콘을 클릭합니다.
- __클라우드 환경 업데이트__ 대화상자에서 __네트워크 액세스__ 를 __Trusted__ 에서 __Custom__ 으로 변경한 후, 차단된 도메인을 __허용된 도메인__ 에 추가합니다. 도메인을 한 줄에 하나씩 입력하세요. __일반 패키지 매니저 기본 목록도 포함__ 을 체크하면 기본 허용 목록을 커스텀 도메인과 함께 유지할 수 있습니다. 무제한 액세스를 원하면 __Full__ 을 선택하세요.
- __변경 사항 저장__ 을 클릭합니다. 다음 실행부터 업데이트된 허용 목록이 사용됩니다.

Network access에서 액세스 수준과 기본 허용 목록을 확인할 수 있습니다. 로컬 CLI 세션은 이 정책의 영향을 받지 않습니다.

### 요청 에러

API가 요청을 수신했지만 내용을 거부한 것입니다.

#### Prompt is too long

대화와 첨부 파일이 모델의 컨텍스트 윈도우를 초과했습니다.

**해결 방법:**

- `/compact`으로 이전 턴 요약 및 공간 확보, 또는 `/clear`로 새로 시작
- `/context`로 윈도우를 소비하는 항목(시스템 프롬프트, 도구, 메모리 파일, 메시지) 확인
- 사용하지 않는 MCP 서버는 `/mcp disable <name>`으로 비활성화하여 도구 정의를 컨텍스트에서 제거
- 대형 `CLAUDE.md` 파일 정리
- 서브에이전트는 부모 세션의 모든 MCP 도구 정의를 상속하므로, 서브에이전트를 스폰하기 전에 사용하지 않는 MCP 서버 비활성화
- `DISABLE_AUTO_COMPACT`를 설정한 경우 다시 활성화하거나 윈도우가 채워지기 전에 `/compact` 수동 실행

#### Error during compaction: Conversation too long

```
Error during compaction: Conversation too long. Press esc twice to go up a few messages and try again.
```

`/compact` 자체가 실패한 것입니다. 요약을 생성할 여유 컨텍스트가 부족합니다.

**해결 방법:**

- Esc를 두 번 눌러 메시지 목록을 열고 여러 턴 뒤로 이동. 그 후 `/compact` 재실행
- 뒤로 이동해도 공간이 부족하면 `/clear`로 새 세션 시작. 이전 대화는 보존되며 `/resume`으로 다시 열 수 있음

#### Request too large

```
Request too large (max 30 MB). Double press esc to go back and remove or shrink the attached content.
```

HTTP 요청의 바이트 한도를 초과한 것으로, 컨텍스트 윈도우 한도와는 별개입니다.

**해결 방법:** Esc를 두 번 눌러 과대한 콘텐츠가 추가된 턴 이전으로 이동. 대형 파일은 내용을 붙여넣지 않고 경로로 참조.

#### Image was too large

```
Image was too large. Double press esc to go back and try again with a smaller image.
API Error: 400 ... image dimensions exceed max allowed size
```

에러 후에도 이미지가 대화 기록에 남아 있어, 제거할 때까지 후속 메시지도 같은 에러로 실패합니다.

**해결 방법:**

- Esc를 두 번 눌러 이미지가 추가된 턴 이전으로 이동
- 이미지 리사이즈. API는 단일 이미지 최대 8000px (긴 변), 다수 이미지 시 2000px 허용
- 전체 화면 대신 관련 영역만 타이트하게 캡처

#### Unable to resize image

Claude Code가 첨부된 이미지를 다운스케일링하지 못했습니다. 네이티브 이미지 프로세서가 로드되지 않았거나 에러를 반환한 것입니다.

**해결 방법:**

- 이미지 변환을 요청하는 메시지: PNG, JPEG, GIF 또는 WebP로 변환 후 다시 첨부
- 크기/용량 한도를 보고하는 메시지: 해당 한도 이하로 리사이즈 후 첨부

#### PDF 에러

```
PDF too large (max 100 pages, 32 MB). Try splitting it or extracting text first.
PDF is password protected. Try removing protection or extracting text first.
The PDF file was not valid. Try converting to a different format first.
```

**해결 방법:** 과대한 PDF는 전체 첨부 대신 Read 도구로 페이지 범위를 읽도록 요청하거나, `pdftotext` 등으로 텍스트를 추출하여 출력 파일을 경로로 참조하세요.

#### Extra inputs are not permitted

```
API Error: 400 ... Extra inputs are not permitted ... context_management
```

프록시나 LLM 게이트웨이가 `anthropic-beta` 요청 헤더를 제거하여 API가 관련 필드를 인식하지 못하는 것입니다.

**해결 방법:**

- 게이트웨이에서 `anthropic-beta` 헤더를 전달하도록 구성
- 대체로 `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1` 설정 후 실행. 베타 헤더가 필요한 기능이 비활성화됨

#### 모델 관련 에러

**선택한 모델에 문제가 있는 경우:**

```
There's an issue with the selected model (claude-...). It may not exist or you may not have access to it. Run /model to pick a different model.
```

**해결 방법:**

- `/model`로 계정에서 사용 가능한 모델 선택
- 정식 버전 ID 대신 `sonnet` 또는 `opus` 같은 별칭 사용. 별칭은 최신 릴리스를 추적함
- CLI에서 잘못된 모델이 계속 돌아오면, 우선순위 순서로 확인: `--model` 플래그, `ANTHROPIC_MODEL` 환경변수, `.claude/settings.local.json`의 `model` 필드, 프로젝트 `.claude/settings.json`, `~/.claude/settings.json`

**Claude Pro 플랜에서 Opus 사용 불가:**

```
Claude Opus is not available with the Claude Pro plan · Select a different model in /model
```

**해결 방법:** `/model`로 플랜에 포함된 모델 선택. 최근 플랜을 업그레이드했는데도 이 에러가 나면 `/logout` 후 `/login` 실행. 저장된 토큰은 로그인 시점의 플랜을 반영하므로 웹에서 업그레이드해도 기존 세션에 즉시 반영되지 않음.

#### thinking.type.enabled is not supported

```
API Error: 400 ... "thinking.type.enabled" is not supported for this model. Use "thinking.type.adaptive" and "output_config.effort" to control thinking behavior.
```

Claude Code 버전이 Opus 4.7 이상의 최소 버전보다 오래된 것입니다.

**해결 방법:**

- `claude update` 실행 후 Claude Code 재시작. Opus 4.7은 v2.1.111 이상, Opus 4.8은 v2.1.154 이상 필요
- 업그레이드할 수 없으면 `/model`로 Opus 4.6 또는 Sonnet 선택

#### Thinking budget이 output limit을 초과

```
API Error: 400 ... max_tokens must be greater than thinking.budget_tokens
```

확장 사고(thinking) 예산이 최대 응답 길이를 초과하여 실제 답변을 위한 공간이 없는 것입니다.

**해결 방법:**

- `MAX_THINKING_TOKENS` 낮추기, 또는 `CLAUDE_CODE_MAX_OUTPUT_TOKENS`를 사고 예산보다 높이기

#### 도구 사용 또는 thinking 블록 불일치

```
API Error: 400 due to tool use concurrency issues. Run /rewind to recover the conversation.
```

대화 기록이 일관성 없는 상태로 API에 도달한 것입니다. 보통 도구 호출이 중단되거나 턴이 중간에 편집된 후 발생합니다.

**해결 방법:**

- Opus 4.7 또는 4.8을 사용 중이면 먼저 `claude update` 실행. v2.1.156 이전 버전은 정상적인 도구 사용 중에도 이 에러가 발생할 수 있음
- `/rewind` 또는 Esc 두 번 눌러 손상된 턴 이전 체크포인트로 돌아가기

#### 사용 정책 거부

```
API Error: Claude Code is unable to respond to this request, which appears to violate our Usage Policy (https://www.anthropic.com/legal/aup).
```

대화 내용이 사용 정책 검사를 트리거한 것입니다. 같은 세션에서 새 메시지를 보내면 같은 거부가 반복됩니다.

**해결 방법:**

- Esc 두 번 누르거나 `/rewind`로 거부를 트리거한 턴 이전으로 돌아가서 다시 시도
- 원인이 되는 턴을 식별할 수 없으면 `/clear`로 새 대화 시작. 이전 대화는 디스크에 보존되며 `/resume`으로 접근 가능

### 응답 품질이 평소보다 낮아 보일 때

에러가 표시되지 않는데 응답 품질이 기대보다 낮으면, 원인은 보통 모델 자체보다 대화 상태입니다. Claude Code는 자동으로 모델 버전을 변경하지 않습니다. 단, Opus 할당량 초과 또는 Bedrock/Vertex AI 리전에서 모델을 사용할 수 없는 등 특정한 경우에는 폴백(fallback) 모델로 전환할 수 있습니다. 아래의 모델 선택 확인이 이를 감지하며, Model configuration에서 폴백 적용 시점을 설명합니다.

다음을 먼저 확인하세요:

- **모델 선택**: `/model`로 원하는 모델인지 확인. 이전 `/model` 선택이나 `ANTHROPIC_MODEL` 환경변수로 의도치 않은 작은 모델에 있을 수 있음
- **노력 수준**: `/effort`로 현재 추론 수준 확인. 어려운 디버깅이나 설계 작업에는 높이세요
- **컨텍스트 압력**: `/context`로 윈도우가 얼마나 찼는지 확인. 용량에 가까우면 `/compact` 또는 `/clear`
- **오래된 명령어**: 대형/오래된 `CLAUDE.md` 파일과 MCP 도구 정의가 컨텍스트를 소모하고 응답을 왜곡할 수 있음. `/doctor`로 오버사이즈 메모리 파일 확인, `/context`로 MCP 도구 토큰 사용량 확인

응답이 잘못되었을 때 정정 메시지로 답장하는 것보다 되감기가 더 효과적입니다. Esc를 두 번 누르거나 `/rewind`로 잘못된 턴 이전으로 돌아간 후 더 구체적인 프롬프트로 다시 시도하세요.

---

## IDE 통합 문제

### WSL2에서 JetBrains IDE 미감지

WSL2의 NAT 네트워킹 또는 Windows 방화벽이 연결을 차단할 수 있습니다.

**옵션 1: Windows 방화벽 설정 (권장)**

```bash
# WSL2 IP 주소 확인
hostname -I
```

```powershell
# PowerShell (관리자 권한)에서 방화벽 규칙 생성
New-NetFirewallRule -DisplayName "WSL2 Claude Code" -Direction Inbound -InterfaceAlias "vEthernet (WSL)" -Action Allow
```

**옵션 2: 미러드 네트워킹 전환**

`.wslconfig` 파일 (Windows 사용자 디렉토리)에 추가:

```ini
[wsl2]
networkingMode=mirrored
```

```powershell
# WSL 재시작
wsl --shutdown
```

### ESC 키가 JetBrains에서 작동하지 않는 경우

1. **Settings > Tools > Terminal**로 이동
2. 다음 중 하나 선택:
   - "Move focus to the editor with Escape" **체크 해제**
   - 또는 "Configure terminal keybindings" 클릭 후 "Switch focus to Editor" 단축키 **삭제**
3. 변경사항 적용

---

## 추가 도움

위의 에러는 Claude API에서 발생하는 것들입니다. 다른 Claude Code 컴포넌트의 에러는 해당 가이드를 참조하세요:

- MCP 서버 연결 또는 인증 실패: MCP 가이드 참조
- 훅 스크립트 실패 또는 도구 차단: Debug hooks 가이드 참조
- 설치 중 권한 거부 또는 파일시스템 에러: [일반적인 설치 문제](#일반적인-설치-문제) 및 Troubleshoot installation and login 참조

에러가 여기에 나열되지 않았거나 제안된 해결 방법으로 해결되지 않으면:

| 방법 | 설명 |
|------|------|
| `/feedback` | Claude Code 내부에서 Anthropic에 문제를 보고합니다. 대화 내용과 설명이 함께 전송되며, prefilled GitHub 이슈 생성도 제안합니다. Bedrock, Vertex AI, Foundry 및 기타 타사 제공자에서는 `/feedback`이 로컬 아카이브를 저장하며, 이를 Anthropic 계정 담당자에게 전달할 수 있습니다. |
| `/doctor` | 로컬 설정 문제를 점검합니다. 설치 상태, 설정 유효성, MCP 구성, 컨텍스트 사용량을 한 번에 확인합니다. |
| `/bug` | GitHub 이슈로 보고합니다. |
| status.claude.com | 활성 인시던트를 확인합니다. |
| GitHub 이슈 검색 | 기존에 보고된 문제인지 확인합니다. |
| Claude에게 질문 | Claude는 자체 문서에 접근할 수 있습니다. |
