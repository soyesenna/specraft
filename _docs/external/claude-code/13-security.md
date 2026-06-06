# 13. 보안 (Security)

> **원문**: [Security](https://code.claude.com/docs/en/security) | [Sandboxing](https://code.claude.com/docs/en/sandboxing) | [Data Usage](https://code.claude.com/docs/en/data-usage) | [Legal and Compliance](https://code.claude.com/docs/en/legal-and-compliance) | [Zero Data Retention](https://code.claude.com/docs/en/zero-data-retention)
>
> **참조(구)**: [Security - Anthropic](https://docs.anthropic.com/en/docs/claude-code/security)

---

## 목차

- [보안 기본 원칙](#보안-기본-원칙)
- [권한 기반 아키텍처](#권한-기반-아키텍처)
- [내장 보호 기능](#내장-보호-기능)
- [프롬프트 인젝션 방지](#프롬프트-인젝션-방지)
- [개인정보 보호 조치](#개인정보-보호-조치)
- [MCP 보안](#mcp-보안)
- [IDE 보안](#ide-보안)
- [클라우드 실행 보안](#클라우드-실행-보안)
- [샌드박싱](#샌드박싱)
- [샌드박스 환경 비교](#샌드박스-환경-비교)
- [데이터 사용](#데이터-사용)
- [법률 및 규정 준수](#법률-및-규정-준수)
- [Zero Data Retention](#zero-data-retention)
- [보안 모범 사례](#보안-모범-사례)

---

## 보안 기본 원칙

Claude Code는 보안을 핵심으로 설계되었습니다. Anthropic의 포괄적인 보안 프로그램에 따라 개발되었습니다.

### 인증 및 규정 준수

| 인증 | 설명 |
|------|------|
| **SOC 2 Type 2** | 서비스 조직 통제 보고서 |
| **ISO 27001** | 정보보호관리체계 인증 |

자세한 내용은 [Anthropic Trust Center](https://www.anthropic.com/trust-center)에서 확인할 수 있습니다.

---

## 권한 기반 아키텍처

Claude Code는 **기본적으로 읽기 전용** 권한을 사용합니다.

### 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **기본 읽기 전용** | 추가 작업이 필요한 경우에만 쓰기 권한 요청 |
| **명시적 권한 요청** | 파일 편집, 테스트 실행, 명령 실행 시 반드시 권한 요청 |
| **사용자 제어** | 사용자가 동작을 한 번 승인할지, 자동으로 허용할지 결정 |
| **Bash 승인** | Bash 명령은 실행 전 반드시 승인 필요 |

### 투명한 설계

Claude Code는 투명하고 안전하게 설계되었습니다. 예를 들어, Bash 명령은 실행 전 승인을 요구하여 사용자가 직접 제어할 수 있습니다.

### 권한 구성

사용자와 조직은 권한을 직접 구성할 수 있습니다. 자세한 권한 구성은 Identity and Access Management 문서를 참조하세요.

---

## 내장 보호 기능

에이전트 시스템의 위험을 완화하기 위한 내장 보호 기능입니다.

### Sandboxed Bash Tool

Bash 명령을 파일시스템 및 네트워크 격리와 함께 샌드박스에서 실행하여, 권한 프롬프트를 줄이면서 보안을 유지합니다. `/sandbox` 명령으로 활성화하며, Claude Code가 자율적으로 작업할 수 있는 경계를 정의합니다. 자세한 구성은 [샌드박싱](#샌드박싱) 섹션을 참조하세요.

### 쓰기 접근 제한

| 항목 | 설명 |
|------|------|
| **쓰기 범위** | Claude Code는 시작된 폴더와 하위 폴더에만 쓰기 가능 |
| **상위 디렉토리** | 명시적 권한 없이 상위 디렉토리의 파일 수정 불가 |
| **읽기 범위** | 작업 디렉토리 외부의 파일은 읽기 가능 (시스템 라이브러리, 종속성 접근에 유용) |
| **보안 경계** | 쓰기 작업은 프로젝트 범위로 엄격히 제한되어 명확한 보안 경계 생성 |

### 프롬프트 피로 완화

자주 사용하는 안전한 명령을 사용자별, 코드베이스별, 조직별로 허용 목록(Allowlist)에 등록할 수 있습니다.

### Accept Edits 모드

파일 편집과 작업 디렉토리 내 경로에 대한 고정된 파일시스템 Bash 명령(`mkdir`, `touch`, `rm`, `mv`, `cp`, `sed` 등)을 자동 승인합니다. 다른 Bash 명령과 범위 밖 경로는 여전히 권한 프롬프트를 표시합니다.

### 안전한 자격 증명 저장소

API 키와 토큰은 암호화되어 저장됩니다. 자세한 내용은 Credential Management 문서를 참조하세요.

### 사용자 책임

Claude Code는 사용자가 부여한 권한만 가집니다. 승인 전에 제안된 코드와 명령의 안전성을 검토하는 것은 **사용자의 책임**입니다.

---

## 프롬프트 인젝션 방지

프롬프트 인젝션은 공격자가 악의적인 텍스트를 삽입하여 AI 어시스턴트의 지침을 재정의하거나 조작하려는 기술입니다.

### 핵심 보호 기능

| 보호 기능 | 설명 |
|----------|------|
| **권한 시스템** | 민감한 작업에는 명시적 승인 필요 |
| **컨텍스트 인식 분석** | 전체 요청을 분석하여 잠재적으로 유해한 지침 감지 |
| **입력 정제** | 사용자 입력을 처리하여 명령 인젝션 방지 |
| **명령 블록리스트** | `curl`, `wget` 등 웹에서 임의 콘텐츠를 가져오는 위험한 명령 차단 |

### 추가 보호 기능

| 보호 기능 | 설명 |
|----------|------|
| **네트워크 요청 승인** | 네트워크 요청을 수행하는 도구는 기본적으로 사용자 승인 필요 |
| **격리된 컨텍스트 윈도우** | Web Fetch는 별도의 컨텍스트 윈도우를 사용하여 악의적인 프롬프트 주입 방지 |
| **신뢰 검증** | 처음 실행하는 코드베이스와 새 MCP 서버는 신뢰 검증 필요 |
| **명령 인젝션 감지** | 의심스러운 Bash 명령은 이전에 허용 목록에 있어도 수동 승인 필요 |
| **Fail-closed 매칭** | 일치하지 않는 명령은 수동 승인 필요 (기본 거부) |
| **자연어 설명** | 복잡한 Bash 명령에 사용자 이해를 돕는 설명이 포함됨 |
| **안전한 자격 증명 저장소** | API 키와 토큰은 암호화되어 저장됨. Credential Management 참조 |

> **참고**: `-p` 플래그로 비대화형 모드로 실행할 때는 신뢰 검증이 비활성화됩니다. 단, `--worktree`는 예외로, 해당 디렉토리에 대해 신뢰가 이미 수락되어 있어야 합니다.
>
> **참고**: 홈 디렉토리에서 Claude Code를 직접 시작하면 신뢰 수락이 현재 세션에만 유지되며 디스크에 기록되지 않아, 실행할 때마다 프롬프트가 다시 나타납니다. 이 동작을 영구적으로 변경하는 설정은 없습니다. 대신 프로젝트 하위 디렉토리에서 시작하면 디렉토리별로 신뢰 수락이 저장됩니다.

### 신뢰할 수 없는 콘텐츠 작업 모범 사례

1. 승인 전에 제안된 명령을 검토
2. 신뢰할 수 없는 콘텐츠를 Claude에 직접 파이프하지 않기
3. 중요 파일에 대한 변경사항 확인
4. 특히 외부 웹 서비스와 상호작용할 때 가상 머신(VM)에서 스크립트 및 도구 호출 실행
5. 의심스러운 동작은 `/feedback`으로 보고

---

## 개인정보 보호 조치

| 조치 | 설명 |
|------|------|
| **민감 정보 보유 기간 제한** | 민감한 정보의 보유 기간이 제한되어 있음 |
| **세션 데이터 접근 제한** | 사용자 세션 데이터에 대한 접근이 제한됨 |
| **데이터 학습 선호도 제어** | 사용자가 데이터 학습 여부를 제어할 수 있음. 소비자 사용자는 언제든지 개인정보 설정 변경 가능 |

자세한 내용은 [Privacy Center](https://www.anthropic.com/privacy) 및 Anthropic의 이용약관, 개인정보 보호정책을 참조하세요.

- Commercial Terms of Service: Team, Enterprise, API 사용자
- Consumer Terms: Free, Pro, Max 사용자

---

## MCP 보안

### MCP 서버 구성

| 항목 | 설명 |
|------|------|
| **구성 위치** | 허용된 MCP 서버 목록은 소스 코드의 Claude Code 설정에 구성 |
| **버전 관리** | 설정 파일을 소스 컨트롤에 체크인 |
| **권한 구성** | MCP 서버에 대한 Claude Code 권한을 구성할 수 있음 |

### 보안 권장사항

| 권장사항 | 설명 |
|----------|------|
| **직접 작성 또는 신뢰할 수 있는 제공자 사용** | MCP 서버는 직접 작성하거나 신뢰할 수 있는 제공자의 것만 사용 |
| **Anthropic Directory 검증** | Anthropic은 커넥터를 listing 기준에 따라 검토하지만, MCP 서버의 보안 감사나 관리는 수행하지 않음 |
| **권한 구성** | MCP 서버에 대한 권한을 적절히 설정 |

---

## IDE 보안

IDE에서 Claude Code를 실행하는 방법에 대한 자세한 내용은 VS Code 보안 및 개인정보 보호 문서를 참조하세요.

> **참고**: IDE 보안에 대한 자세한 내용은 [VS Code security and privacy](https://code.claude.com/docs/en/ide-security)를 참조하세요.

---

## 클라우드 실행 보안

Claude Code on the web을 사용할 때 추가적인 보안 제어가 적용됩니다.

### 클라우드 보안 제어

| 제어 | 설명 |
|------|------|
| **격리된 가상 머신** | 각 클라우드 세션은 격리된 Anthropic 관리 VM에서 실행 |
| **네트워크 접근 제어** | 기본적으로 네트워크 접근이 제한되며, 비활성화하거나 특정 도메인만 허용하도록 구성 가능 |
| **자격 증명 보호** | 인증은 보안 프록시를 통해 처리되며, 샌드박스 내부에서는 스코프가 제한된 자격 증명을 사용하고 이를 실제 GitHub 인증 토큰으로 변환 |
| **브랜치 제한** | Git push 작업은 현재 작업 브랜치로만 제한됨 |
| **감사 로깅** | 클라우드 환경의 모든 작업이 규정 준수 및 감사 목적으로 로깅됨 |
| **자동 정리** | 세션 완료 후 클라우드 환경이 자동으로 종료됨 |

### Remote Control 세션

Remote Control 세션은 다르게 동작합니다. 웹 인터페이스가 로컬 머신에서 실행 중인 Claude Code 프로세스에 연결됩니다. 모든 코드 실행과 파일 접근은 로컬에 유지되며, 로컬 Claude Code 세션 중에 흐르는 것과 동일한 데이터가 TLS를 통해 Anthropic API로 전송됩니다. 클라우드 VM이나 샌드박싱은 관여하지 않습니다. 연결은 여러 개의 수명이 짧고 스코프가 좁은 자격 증명을 사용하며, 각각 특정 목적으로 제한되고 독립적으로 만료되어 단일 자격 증명이 손상될 경우의 영향 범위를 제한합니다.

> 자세한 내용은 Claude Code on the web 문서를 참조하세요.

---

## 샌드박싱

Bash 샌드박스는 Claude가 대부분의 셸 명령을 권한 요청 없이 실행할 수 있게 합니다. 대신 명령이 접근할 수 있는 파일과 네트워크 도메인을 정의하면, 운영체제가 모든 Bash 명령과 그 자식 프로세스에 대해 해당 경계를 강제합니다.

### 시작하기

샌드박스는 Claude Code에 내장되어 있으며 macOS, Linux, WSL2에서 실행됩니다. Native Windows는 지원되지 않으며, Windows에서는 WSL2 배포 내에서 실행해야 합니다.

| 플랫폼 | 프레임워크 | 추가 설치 |
|--------|-----------|-----------|
| **macOS** | Seatbelt (내장) | 없음 |
| **Linux / WSL2** | bubblewrap + socat | 패키지 매니저로 설치 필요 |

Linux/WSL2 설치:

```bash
# Ubuntu/Debian
sudo apt-get install bubblewrap socat

# Fedora
sudo dnf install bubblewrap socat
```

> `bubblewrap`은 파일시스템 격리를 강제하는 비특권 샌드박싱 도구이며, `socat`은 네트워크 트래픽을 샌드박스 프록시로 라우팅하는 릴레이입니다.

`/sandbox` 명령으로 패널을 열어 모드를 선택합니다. 선택한 모드는 프로젝트 로컬 설정(`.claude/settings.local.json`)에 기록됩니다. 모든 프로젝트에 적용하려면 사용자 설정(`~/.claude/settings.json`)에서 `sandbox.enabled`를 `true`로 설정하세요.

의존성 탭에서 `ripgrep`, `bubblewrap`, `socat`, seccomp 필터의 가용성을 확인할 수 있습니다. Ripgrep은 Claude Code 바이너리에 번들로 포함되어 있습니다. Seccomp 필터는 선택 사항이며 Unix domain socket 차단 기능을 추가합니다. 누락된 경우 `npm install -g @anthropic-ai/sandbox-runtime`으로 설치하세요.

### 샌드박스 모드

| 모드 | 동작 |
|------|------|
| **Auto-allow** | Bash 명령이 샌드박스 내에서 자동으로 실행되며 권한 없이 허용됨. 샌드박스 불가 명령은 일반 권한 흐름으로 폴백 |
| **Regular permissions** | 샌드박스된 명령도 포함하여 모든 Bash 명령이 일반 권한 흐름을 거침 |

> Auto-allow 모드에서도 명시적 거부 규칙은 항상 존중되며, `/`, 홈 디렉토리 등 중요 시스템 경로를 대상으로 하는 `rm`/`rmdir`은 여전히 권한 프롬프트를 트리거합니다. Ask 규칙은 폴백된 명령에도 적용됩니다.

샌드박스에서 실행할 수 없는 명령(호환되지 않는 도구, 허용되지 않은 호스트 필요 등)은 `dangerouslyDisableSandbox` 매개변수로 재시도할 수 있습니다. 이 이스케이프 해치를 비활성화하려면 `"allowUnsandboxedCommands": false`를 설정하세요(Strict sandbox mode).

### 파일시스템 격리

샌드박스된 Bash Tool은 파일시스템 접근을 특정 디렉토리로 제한합니다.

| 동작 | 설명 |
|------|------|
| **기본 쓰기** | 작업 디렉토리와 하위 디렉토리에 읽기/쓰기 허용 |
| **기본 읽기** | 전체 컴퓨터 읽기 허용 (일부 디렉토리 제외). 단 `~/.aws/credentials`, `~/.ssh/` 등 자격 증명 파일은 기본적으로 읽기 허용되므로 `denyRead`로 차단해야 함 |
| **차단** | 작업 디렉토리 외부 파일은 명시적 권한 없이 수정 불가. `.bashrc` 등 셸 설정 파일, `/bin/` 등 시스템 바이너리 포함 |
| **Git Worktree** | 작업 디렉토리가 linked git worktree인 경우, 메인 리포지토리의 공유 `.git` 디렉토리에 쓰기 허용(`git commit` 등). 단 `hooks/`와 `config`에 대한 쓰기는 여전히 차단됨 |
| **구성 가능** | 설정을 통해 커스텀 허용/차단 경로 정의 가능 |

#### 파일시스템 구성

```json
{
  "sandbox": {
    "enabled": true,
    "filesystem": {
      "allowWrite": ["~/.kube", "/tmp/build"],
      "denyWrite": ["~/secrets"],
      "denyRead": ["~/"],
      "allowRead": ["."]
    }
  }
}
```

| 설정 | 설명 |
|------|------|
| `sandbox.filesystem.allowWrite` | 작업 디렉토리 외부 경로에 대한 하위 프로세스 쓰기 접근 허용 |
| `sandbox.filesystem.denyWrite` | 특정 경로에 대한 하위 프로세스 쓰기 차단 |
| `sandbox.filesystem.denyRead` | 특정 경로에 대한 하위 프로세스 읽기 차단 |
| `sandbox.filesystem.allowRead` | `denyRead` 영역 내에서 특정 경로 재허용 |

경로 접두사 규칙:

| 접두사 | 의미 | 예시 |
|--------|------|------|
| `/` | 파일시스템 루트의 절대 경로 | `/tmp/build` |
| `~/` | 홈 디렉토리 상대 | `~/.kube` -> `$HOME/.kube` |
| `./` 또는 없음 | 프로젝트 루트 상대 (프로젝트 설정) 또는 `~/.claude` 상대 (사용자 설정) | `./output` -> `<project-root>/output` |

> 동일한 파일시스템 배열이 여러 설정 스코프에 정의된 경우 배열은 병합됩니다. 경로는 Read/Edit 권한 규칙의 `//path`(절대), `/path`(프로젝트 상대) 구문과 다르며, 샌드박스 파일시스템 경로는 표준 규칙(`/tmp/build`가 절대 경로)을 사용합니다.

### 네트워크 격리

네트워크 접근은 샌드박스 외부에서 실행되는 프록시 서버를 통해 제어됩니다.

| 동작 | 설명 |
|------|------|
| **도메인 제한** | 기본적으로 사전 허용된 도메인이 없음. 새 도메인이 필요할 때마다 Claude Code가 승인을 요청함 |
| **Managed lockdown** | `allowManagedDomainsOnly`가 관리 설정에 지정되면, 프롬프트 대신 자동으로 차단되며 관리 설정의 `allowedDomains`만 적용됨 |
| **커스텀 프록시** | 고급 사용자는 발신 트래픽에 커스텀 규칙 구현 가능 |
| **포괄적 커버리지** | 명령으로 생성된 모든 스크립트, 프로그램, 하위 프로세스에 제한 적용 |

#### 네트워크 구성

```json
{
  "sandbox": {
    "enabled": true,
    "network": {
      "allowedDomains": ["api.github.com", "registry.npmjs.org"],
      "deniedDomains": ["evil.example.com"],
      "httpProxyPort": 8080,
      "socksProxyPort": 8081
    }
  }
}
```

| 설정 | 설명 |
|------|------|
| `sandbox.network.allowedDomains` | Bash 명령이 접근할 수 있는 도메인 사전 허용 |
| `sandbox.network.deniedDomains` | `allowedDomains` 와일드카드보다 우선하여 차단할 도메인 |
| `sandbox.network.httpProxyPort` | 커스텀 HTTP 프록시 포트 |
| `sandbox.network.socksProxyPort` | 커스텀 SOCKS 프록시 포트 |

#### 커스텀 프록시 구성

조직의 고급 네트워크 보안 요구사항에 맞게 커스텀 프록시를 구현할 수 있습니다:

- HTTPS 트래픽 복호화 및 검사
- 커스텀 필터링 규칙 적용
- 모든 네트워크 요청 로깅
- 기존 보안 인프라와 통합

### OS 수준 강제

샌드박스된 Bash Tool은 운영체제 보안 프리미티브를 활용합니다:

| 플랫폼 | 프레임워크 | 설명 |
|--------|-----------|------|
| **macOS** | Seatbelt | 샌드박스 강제에 사용 |
| **Linux** | bubblewrap | 격리에 사용 |
| **WSL2** | bubblewrap | Linux와 동일 |

> WSL1은 bubblewrap에 필요한 커널 기능이 WSL2에만 있으므로 지원되지 않습니다.

### 제외 명령

```json
{
  "sandbox": {
    "enabled": true,
    "excludedCommands": ["docker *", "terraform *"]
  }
}
```

`excludedCommands`에 나열된 명령은 샌드박스 외부에서 실행됩니다. `docker`는 샌드박스와 호환되지 않으므로 `docker *`를 추가하여 샌드박스 외부에서 실행하세요.

### 권한 규칙과의 관계

| 계층 | 제어 대상 | 강제 시점 |
|------|----------|----------|
| **권한 규칙** | Claude Code가 사용할 수 있는 도구 제어. Bash, Read, Edit, WebFetch, MCP 등 모든 도구에 적용 | 명령 실행 전 평가 |
| **샌드박싱** | Bash 명령이 파일시스템/네트워크 수준에서 접근할 수 있는 대상 제한. OS 수준 강제. Bash 명령과 자식 프로세스에만 적용 | 실행 중 강제 |

설정과 권한 규칙의 대응:

| 설정 또는 규칙 | 기능 |
|---------------|------|
| `sandbox.filesystem.allowWrite` | 작업 디렉토리 외부 경로에 하위 프로세스 쓰기 접근 허용 |
| `sandbox.filesystem.denyWrite` / `denyRead` | 특정 경로에 대한 하위 프로세스 접근 차단 |
| `sandbox.filesystem.allowRead` | `denyRead` 영역 내 특정 경로 재허용 |
| `Edit` 허용 규칙 | 특정 경로에 쓰기 접근 허용 (`allowWrite`와 동일) |
| `Read` / `Edit` 거부 규칙 | 특정 파일/디렉토리 접근 차단 |
| `WebFetch` 허용/거부 규칙 | 도메인 접근 제어 |
| 샌드박스 `allowedDomains` | Bash 명령이 접근할 수 있는 도메인 제어 |
| 샌드박스 `deniedDomains` | `allowedDomains` 와일드카드보다 우선하여 차단 |

두 계층의 파일시스템/네트워크 경로는 병합되어 최종 샌드박스 구성을 형성합니다.

### 조직 전체 샌드박스 강제

관리 설정을 통해 모든 개발자에게 샌드박스를 강제할 수 있습니다.

```json
{
  "sandbox": {
    "enabled": true,
    "failIfUnavailable": true,
    "allowUnsandboxedCommands": false
  }
}
```

| 키 | 설명 |
|-----|------|
| `failIfUnavailable` | 샌드박스 의존성(예: Linux의 bubblewrap) 누락 시 Claude Code 시작 차단 |
| `allowUnsandboxedCommands: false` | `dangerouslyDisableSandbox` 이스케이프 해치 무시 |

권장 추가 설정:

- `excludedCommands`: 조직 승인 도구 중 격리 없이 실행해야 하는 것 추가
- `denyRead`: `~/.aws`, `~/.ssh` 등 자격 증명 디렉토리 추가 (기본 읽기 정책이 여전히 허용하므로)

> 개발자가 정책을 확장하는 것을 방지하려면 `allowManagedReadPathsOnly`와 `allowManagedDomainsOnly`를 사용하세요. 단 `excludedCommands`는 관리 전용 잠금이 없으므로 관리 목록을 좁게 유지하세요.
>
> 샌드박스는 Native Windows에서 실행되지 않으므로, Windows 호스트가 포함된 경우 macOS와 Linux로 스코프를 제한하거나 WSL2/컨테이너 내에서 실행하세요.

### 트러블슈팅

| 문제 | 해결 방법 |
|------|----------|
| host-not-allowed 오류 | 프롬프트에서 권한을 부여하면 호스트가 허용 목록에 추가됨 |
| `jest` 중단/실패 | `watchman`이 샌드박스와 호환되지 않음. `jest --no-watchman` 사용 |
| Go 기반 CLI TLS 실패 (macOS) | `gh`, `gcloud`, `terraform` 등을 `excludedCommands`에 추가하거나 `enableWeakerNetworkIsolation: true` 설정 |
| `docker` 명령 실패 | `excludedCommands`에 `docker *` 추가 |
| 컨테이너 내 bubblewrap 실패 | `enableWeakerNestedSandbox: true` 설정. 외부 컨테이너가 이미 격리 경계를 제공하는 경우에만 사용 |
| seccomp 필터 누락 (Linux) | `npm install -g @anthropic-ai/sandbox-runtime`으로 설치 |
| `--dangerously-skip-permissions`가 root에서 실패 | root + 권한 프롬프트 없음은 시스템의 모든 파일/서비스 수정 가능. 인식된 샌드박스 내에서는 자동으로 건너뜀 |

### 제한 사항

#### 보안 제한 사항

- **네트워크 필터링**: 네트워크 필터링은 프로세스가 연결할 수 있는 도메인을 제한하는 방식으로 동작합니다. 내장 프록시는 아웃바운드 트래픽에 대해 TLS 종료 또는 검사를 수행하지 않으므로 암호화된 연결의 내용은 검사되지 않습니다. 신뢰할 수 있는 도메인만 허용하세요.
- **Unix 소켓 권한 상승**: `allowUnixSockets` 설정은 강력한 시스템 서비스에 접근을 허용할 수 있어 샌드박스 우회로 이어질 수 있습니다. 예: `/var/run/docker.sock` 허용 시 호스트 시스템 접근 가능. 허용하는 Unix 소켓을 신중히 고려하세요.
- **파일시스템 권한 상승**: `$PATH` 내 실행 파일 디렉토리, 시스템 구성 디렉토리, 셸 구성 파일(`.bashrc`, `.zshrc`)에 대한 광범위한 쓰기 권한은 권한 상승 공격을 가능하게 합니다.
- **Linux 샌드박스 강도**: Linux 구현은 강력한 파일시스템/네트워크 격리를 제공하지만, `enableWeakerNestedSandbox` 모드가 포함되어 있습니다. 이 모드는 Docker 환경이나 비특권 사용자 네임스페이스가 비활성화된 Linux 호스트에서 작동하게 하지만 보안이 상당히 약화됩니다. 추가 격리가 이미 제공되는 경우에만 사용하세요.
- **설정 파일 보호**: 샌드박스는 Claude Code의 `settings.json` 파일(모든 스코프) 및 관리 설정 디렉토리에 대한 쓰기를 자동으로 차단합니다. 샌드박스된 명령이 자체 정책을 수정할 수 없습니다.

#### 적용 범위

- **내장 파일 도구**: Read, Edit, Write는 권한 시스템을 통해 직접 제어되며 샌드박스를 거치지 않습니다.
- **Computer use**: Claude가 앱을 열고 화면을 제어할 때 실제 데스크톱에서 실행됩니다. 앱별 권한 프롬프트가 각 애플리케이션에 적용됩니다.
- **환경 변수**: 샌드박스된 Bash 명령은 기본적으로 부모 프로세스의 환경 변수를 상속하며, 여기에는 자격 증명이 포함될 수 있습니다. Anthropic 및 클라우드 제공자의 자격 증명을 하위 프로세스에서 제거하려면 `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` 환경 변수를 설정하세요.
- **하위 에이전트**: 하위 에이전트는 부모 세션과 동일한 프로세스에서 실행되며 동일한 샌드박스 구성을 사용합니다. 샌드박싱이 부모 세션에서 활성화된 경우 하위 에이전트 내의 Bash 명령도 샌드박스됩니다.
- **플랫폼**: macOS, Linux, WSL2 지원. WSL1 및 Native Windows는 미지원. 성능 오버헤드는 최소이지만 일부 파일시스템 작업이 약간 느릴 수 있습니다.

---

## 샌드박스 환경 비교

Claude Code를 격리하는 방법은 경량 per-command 샌드박스부터 완전한 가상 머신까지 여러 가지가 있습니다.

### 접근 방식 비교

| 접근 방식 | 격리 대상 | Docker 필요 | 설정 난이도 |
|-----------|----------|-------------|------------|
| **Sandboxed Bash tool** | Bash 명령과 자식 프로세스 | 아니요 | macOS: 최소, Linux/WSL2: 낮음 |
| **Sandbox runtime** | Claude Code 전체 프로세스 (파일 도구, MCP 서버, 훅 포함) | 아니요 | 낮음 |
| **Dev container** | 전체 개발 환경 | 예 | 중간 |
| **Custom container** | 전체 개발 환경 | 예 | 중간~높음 |
| **가상 머신** | 전체 운영체제 | 아니요 | 높음 |
| **Claude Code on the web** | 전체 운영체제 (Anthropic 호스팅) | 아니요 | 없음 (Claude 구독 및 GitHub 필요) |

> Sandboxed Bash tool은 Bash 명령만 제한합니다. 내장 파일 도구, MCP 서버, 훅은 호스트에서 직접 실행됩니다. 나머지 방식은 Claude Code 전체 프로세스를 격리 경계 내에 배치합니다.

### 목적별 선택 가이드

| 목적 | 추천 방식 |
|------|----------|
| 일상 작업 중 권한 프롬프트 감소 | Sandboxed Bash tool (`/sandbox`로 활성화) |
| `--dangerously-skip-permissions` 또는 auto mode로 무인 실행 | Dev container, 컨테이너, VM, 또는 sandbox runtime |
| Docker 없이 MCP 서버와 훅까지 격리 | Sandbox runtime |
| 신뢰할 수 없는 리포지토리 작업 | 전용 가상 머신 또는 Claude Code on the web |
| 팀 전체에 샌드박스 환경 표준화 | Preconfigured dev container를 리포지토리에 커밋 |
| 로컬 설정 없는 기기에서 사용 | Claude Code on the web |
| 조직 내 모든 개발자에게 격리 강제 | 관리 설정으로 샌드박스 강제 |

### 격리와 권한 모드의 관계

권한 모드는 도구 호출이 실행되는지와 사전 프롬프트 여부를 결정합니다. 격리는 명령이 실행된 후 접근할 수 있는 대상을 제한합니다. 두 가지는 함께 작동합니다.

| | 제어 대상 | 프롬프트 대체 |
|---|----------|-------------|
| `/sandbox` | Bash 명령이 실행 후 접근할 수 있는 대상 | 샌드박스 경계 자체 (auto-allow 모드) |
| Auto mode | 각 도구 호출의 실행 여부 | 동작을 검토하는 분류기 |
| `--dangerously-skip-permissions` | 각 도구 호출의 실행 여부 | 없음. 보호 경로 검사도 생략 |

> 샌드박스의 auto-allow 모드는 auto mode와 별개입니다. auto-allow는 샌드박스 경계가 포함하고 있으므로 Bash 명령을 승인하지만, auto mode는 분류기를 사용하여 동작을 검토합니다. 두 가지는 독립적으로 작동하며 결합할 수 있습니다.

> `--dangerously-skip-permissions`를 사용할 때는 반드시 컨테이너, VM, 또는 sandbox runtime 내에서 실행하세요.

### Sandbox Runtime

`@anthropic-ai/sandbox-runtime` 패키지는 전체 프로세스를 Seatbelt 또는 bubblewrap 격리로 래핑합니다. Bash뿐만 아니라 모든 도구, 훅, MCP 서버를 제한합니다.

```bash
npx @anthropic-ai/sandbox-runtime claude
```

`~/.srt-settings.json`에서 최소한 프로젝트 디렉토리와 Claude Code 구성 경로(`~/.claude`, `~/.claude.json`)에 쓰기 접근을 허용하고, `api.anthropic.com` 등 필요한 네트워크 도메인을 허용하세요.

### Dev Container

Dev container는 Docker 컨테이너 내부에서 Claude Code를 실행하며, 프로젝트가 마운트됩니다. `.devcontainer/` 디렉토리로 정의합니다. claude-code 리포지토리는 default-deny iptables 방화벽이 포함된 예제 dev container를 제공합니다.

### 가상 머신

전용 가상 머신은 자체 커널과 가상화된 하드웨어로 가장 강력한 분리를 제공합니다. 클라우드 인스턴스, 로컬 하이퍼바이저, Firecracker 같은 microVM 등이 포함됩니다. 신뢰할 수 없는 코드를 평가하거나 커널 수준 분리가 필요한 경우에 사용하세요.

---

## 데이터 사용

### 데이터 학습 정책

| 사용자 유형 | 학습 정책 |
|------------|----------|
| **Consumer (Free, Pro, Max)** | 데이터를 미래 Claude 모델 개선에 사용할지 선택 가능. 설정이 켜져 있으면 학습에 사용됨 (Claude Code 사용 포함) |
| **Commercial (Team, Enterprise, API, 3rd-party, Claude Gov)** | Anthropic은 상업 약관 하에 전송된 코드나 프롬프트로 생성형 모델을 학습하지 않음. 단, 고객이 명시적으로 데이터 제공을 선택한 경우(예: Development Partner Program)는 예외 |

### Development Partner Program

명시적으로 학습 자료 제공을 선택한 경우(예: Development Partner Program), 해당 자료를 모델 학습에 사용할 수 있습니다. 조직 관리자가 조직에 대해 명시적으로 옵트인할 수 있습니다.

> 이 프로그램은 Anthropic 자사 API에서만 사용 가능하며, Bedrock 또는 Vertex 사용자에게는 제공되지 않습니다.

### `/feedback` 명령을 통한 피드백

`/feedback` 명령으로 Claude Code에 대한 피드백을 보내면, 피드백을 제품 및 서비스 개선에 사용할 수 있습니다. `/feedback`으로 공유된 대화 내용은 **5년간 보관**됩니다.

제출 전 포함할 기록의 양을 선택할 수 있습니다:

- 현재 세션만 (기본값)
- 같은 프로젝트의 최근 24시간 또는 7일 내 세션 포함

데이터는 TLS를 통해 암호화 전송됩니다. 선택적으로 공개 리포지토리에 GitHub 이슈가 생성됩니다. 옵트아웃하려면 `DISABLE_FEEDBACK_COMMAND=1` 환경 변수를 설정하세요.

> Bedrock, Vertex 등 서드파티 제공자를 사용하거나 Anthropic 자격 증명이 구성되지 않은 경우, `/feedback`은 `~/.claude/feedback-bundles/`에 로컬 아카이브로 저장됩니다. 알려진 API 키 및 토큰 패턴은 아카이브 작성 전에 삭제됩니다. 해당 파일을 Anthropic 계정 담당자에게 전송하거나 지원 요청에 첨부할 때까지 아무것도 외부로 전송되지 않습니다.

### 세션 품질 설문

Claude Code에서 "How is Claude doing this session?" 프롬프트가 표시될 때, 응답(Dismiss 포함)은 평가 점수만 기록합니다. 대화 내용, 입력, 출력, 기타 세션 데이터는 수집/저장하지 않습니다.

평가 프롬프트 이후, 별도의 후속 질문 "Can Anthropic look at your session transcript to help us improve Claude Code?"가 나타납니다:

| 선택 | 동작 |
|------|------|
| **Yes** | 대화 내용, 하위 에이전트 내용, 디스크의 원시 세션 로그 파일을 Anthropic에 업로드. 알려진 API 키/토큰 패턴은 업로드 전 삭제. 소스 코드, 파일 내용 등은 있는 그대로 업로드. 공유된 내용은 **최대 6개월** 보관 |
| **No** | 아무것도 전송하지 않음 |
| **Don't ask again** | 거부하며 향후 세션에서 이 후속 질문이 나타나지 않음 |

> **Yes**를 명시적으로 선택하지 않으면 아무것도 업로드되지 않습니다. ZDR 조직, 제품 피드백이 조직 정책으로 비활성된 조직, 또는 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`이 설정된 조직에서는 이 후속 질문이 표시되지 않습니다.

세션 품질 설문 비활성화: `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY=1`

설문은 `DISABLE_TELEMETRY`, `DO_NOT_TRACK`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`이 설정된 경우에도 비활성화됩니다.

OpenTelemetry 수집기를 통해 설문을 다시 활성화하려면 `CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL=1`을 설정하세요. 이 경우 평가 점수가 구성된 수집기에만 로깅됩니다.

설문 빈도를 제어하려면 설정 파일의 `feedbackSurveyRate`를 `0`~`1` 사이의 확률로 설정하세요.

### 데이터 보유 기간

| 사용자 유형 | 조건 | 보유 기간 |
|------------|------|----------|
| **Consumer** | 모델 개선을 위해 데이터 사용 허용 | **5년** |
| **Consumer** | 모델 개선을 위해 데이터 사용 미허용 | **30일** |
| **Commercial** | 표준 | **30일** |
| **Commercial** | Zero Data Retention (ZDR) | **응답 반환 후 즉시 삭제** (법적 요구/오용 대응 제외) |
| **Local caching** | 모든 계정 | 세션 대화 내용이 `~/.claude/projects/`에 평문으로 30일간 저장. `cleanupPeriodDays`로 조정 가능 |

> Consumer 사용자는 claude.ai/settings/data-privacy-controls에서 언제든지 개인정보 설정을 변경할 수 있습니다.
>
> Claude Code on the web 세션은 언제든지 개별 삭제할 수 있습니다. 세션 삭제는 해당 세션의 이벤트 데이터를 영구적으로 제거합니다.

### 로컬 Claude Code: 데이터 흐름 및 의존성

Claude Code는 로컬에서 실행됩니다. LLM과 상호작용하기 위해 네트워크를 통해 데이터를 전송합니다. 이 데이터에는 모든 사용자 프롬프트와 모델 출력이 포함되며, TLS 1.2+를 통해 암호화 전송됩니다. 대부분의 인기 있는 VPN 및 LLM 프록시와 호환됩니다.

#### 저장 시 암호화

| 제공자 | 저장 시 암호화 |
|--------|---------------|
| **Anthropic API** | 인프라 수준 디스크 암호화 (AES-256). Zero Data Retention 활성화 시 서버 측 영속성 없음 |
| **Amazon Bedrock** | AWS 관리 키로 AES-256. AWS KMS를 통한 고객 관리 키 사용 가능 |
| **Google Cloud Vertex AI** | Google 관리 암호화 키. CMEK 사용 가능 |
| **Microsoft Foundry** | 요청이 AES-256 디스크 암호화를 갖춘 Anthropic 인프라로 라우팅됨 |

### 클라우드 실행: 데이터 흐름 및 의존성

Claude Code on the web을 사용하면 세션이 로컬 대신 Anthropic 관리 가상 머신에서 실행됩니다.

| 항목 | 설명 |
|------|------|
| **코드 및 데이터 저장** | 리포지토리가 격리된 VM에 클론됨. 코드와 세션 데이터는 계정 유형별 보유 및 사용 정책을 따름 |
| **자격 증명** | GitHub 인증은 보안 프록시를 통해 처리. GitHub 자격 증명은 샌드박스에 들어가지 않음 |
| **네트워크 트래픽** | 모든 아웃바운드 트래픽이 감사 로깅 및 남용 방지를 위해 보안 프록시를 통과 |
| **세션 데이터** | 프롬프트, 코드 변경, 출력은 로컬 Claude Code 사용과 동일한 데이터 정책을 따름 |

### Telemetry 서비스

| 서비스 | 설명 | 옵트아웃 |
|--------|------|----------|
| **Anthropic Metrics** | 지연 시간, 안정성, 사용 패턴 등 운영 메트릭 로깅. 코드나 파일 경로는 포함되지 않음 | `DISABLE_TELEMETRY=1` |
| **Sentry (에러)** | 운영 오류 로깅. TLS로 전송 중 암호화, 256-bit AES로 저장 암호화 | `DISABLE_ERROR_REPORTING=1` |

### 제공자별 기본 동작

| 서비스 | Claude API | Vertex API | Bedrock API | Foundry API | Claude Platform on AWS |
|--------|-----------|-----------|------------|------------|----------------------|
| **Anthropic (Metrics)** | 기본 켜짐. `DISABLE_TELEMETRY=1`로 비활성화 | 기본 꺼짐 | 기본 꺼짐 | 기본 꺼짐 | 기본 꺼짐 |
| **Sentry (Errors)** | 기본 켜짐. `DISABLE_ERROR_REPORTING=1`로 비활성화 | 기본 꺼짐 | 기본 꺼짐 | 기본 꺼짐 | 기본 꺼짐 |
| **`/feedback` 보고서** | 기본 켜짐. `DISABLE_FEEDBACK_COMMAND=1`로 비활성화 | 기본 꺼짐 | 기본 꺼짐 | 기본 꺼짐 | 기본 꺼짐 |
| **세션 품질 설문** | 기본 켜짐. `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY=1`로 비활성화 | 기본 켜짐 | 기본 켜짐 | 기본 켜짐 | 기본 켜짐 |
| **WebFetch 도메인 안전 검사** | 기본 켜짐. `skipWebFetchPreflight: true`로 비활성화 | 기본 켜짐 | 기본 켜짐 | 기본 켜짐 | 기본 켜짐 |

> 모든 환경 변수는 `settings.json`에 체크인할 수 있습니다.
>
> v2.1.126부터 호스트 플랫폼이 `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST`를 설정한 경우, Vertex, Bedrock, Foundry에서 메트릭이 기본 켜짐으로 전환되며 표준 `DISABLE_TELEMETRY` 옵트아웃을 따릅니다. Sentry 에러 보고 및 `/feedback` 보고서는 해당 제공자에서 계속 기본 꺼짐입니다.

### WebFetch 도메인 안전 검사

URL을 가져오기 전에 WebFetch 도구가 요청된 호스트명을 `api.anthropic.com`으로 전송하여 Anthropic이 유지 관리하는 안전 블록리스트와 대조합니다. **호스트명만** 전송되며 전체 URL, 경로, 페이지 콘텐츠는 전송되지 않습니다. 결과는 호스트명별로 5분간 캐시됩니다.

이 검사는 **사용하는 모델 제공자에 관계없이 항상 실행**되며 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`의 영향을 받지 않습니다.

네트워크에서 `api.anthropic.com`을 차단하는 경우, WebFetch 요청은 해당 도메인을 허용 목록에 추가하거나 설정에서 `skipWebFetchPreflight: true`를 설정할 때까지 실패합니다. 검사를 비활성화하면 WebFetch가 블록리스트를 참조하지 않고 모든 URL을 가져오려고 시도하므로, Claude가 접근할 수 있는 도메인을 제한해야 하는 경우 `WebFetch` 권한 규칙과 함께 사용하세요.

---

## 법률 및 규정 준수

### 라이선스

| 사용자 유형 | 적용 약관 |
|------------|----------|
| **Team, Enterprise, Claude API** | Commercial Terms |
| **Free, Pro, Max** | Consumer Terms of Service |

### 상업 계약

Claude API를 직접 사용(1P)하거나 Amazon Bedrock, Google Vertex(3P)를 통해 액세스하는 경우, 상호 합의한 바가 없는 한 기존 상업 계약이 Claude Code 사용에도 적용됩니다.

### 의료 규정 준수 (BAA)

고객이 Anthropic과 Business Associate Agreement(BAA)를 체결하고 Claude Code를 사용하려는 경우, 고객이 BAA를 체결하고 **Zero Data Retention(ZDR)**이 활성화되어 있으면 BAA가 Claude Code에 자동으로 확장 적용됩니다. BAA는 해당 고객의 Claude Code를 통한 API 트래픽에 적용됩니다.

> ZDR은 조직별로 활성화되므로, BAA 적용을 받으려면 각 조직이 개별적으로 ZDR을 활성화해야 합니다.

### 사용 정책

Claude Code 사용은 [Anthropic Usage Policy](https://www.anthropic.com/usage-policy)의 적용을 받습니다. Pro 및 Max 플랜의 광고된 사용 한도는 Claude Code 및 Agent SDK의 일반적인 개인 사용을 기준으로 합니다.

### 인증 및 자격 증명 사용

Claude Code는 OAuth 토큰 또는 API 키를 사용하여 Anthropic 서버에 인증합니다.

| 인증 방식 | 용도 |
|----------|------|
| **OAuth 인증** | Claude Free, Pro, Max, Team, Enterprise 구독 플랜 구매자 전용. Claude Code 및 기타 Anthropic 자체 애플리케이션의 일반 사용을 지원 |
| **API 키 인증** | Agent SDK 등 Claude의 기능과 상호작용하는 제품/서비스를 구축하는 개발자용. Claude Console 또는 지원되는 클라우드 제공자를 통해 인증 |

> Anthropic은 서드파티 개발자가 claude.ai 로그인을 제공하거나 Free, Pro, Max 플랜 자격 증명을 통해 사용자를 대신하여 요청을 라우팅하는 것을 허용하지 않습니다. Anthropic은 사전 통지 없이 이러한 제한을 강제할 권리를 보유합니다.

### 보안 및 신뢰

| 리소스 | 설명 |
|--------|------|
| [Anthropic Trust Center](https://www.anthropic.com/trust-center) | SOC 2 Type 2 보고서, ISO 27001 인증서 등 보안 인증 자료 |
| [Anthropic Transparency Hub](https://www.anthropic.com/transparency) | 투명성 관련 정보 |
| [HackerOne](https://hackerone.com/anthropic) | 보안 취약점 보고 프로그램 |

---

## Zero Data Retention

Zero Data Retention(ZDR)은 Claude for Enterprise에서 Claude Code를 사용할 때 사용할 수 있습니다. ZDR이 활성화되면 Claude Code 세션 중 생성된 프롬프트와 모델 응답은 **실시간으로 처리되며 응답 반환 후 Anthropic에 저장되지 않습니다** (법적 준수 또는 오용 대응에 필요한 경우 제외).

### ZDR 포함 기능

Claude for Enterprise의 ZDR은 엔터프라이즈 고객에게 zero data retention과 관리 기능을 제공합니다:

- 사용자별 비용 통제
- Analytics 대시보드
- 서버 관리 설정
- 감사 로그

> ZDR for Claude Code on Claude for Enterprise는 Anthropic 자사 플랫폼에만 적용됩니다. Amazon Bedrock, Google Vertex AI, Microsoft Foundry의 Claude 배포는 해당 플랫폼의 데이터 보유 정책을 참조하세요.

### ZDR 적용 범위

**ZDR이 적용되는 항목**: Claude for Enterprise에서 Claude Code를 통해 이루어지는 모델 추론 호출. 터미널에서 Claude Code를 사용할 때, 전송한 프롬프트와 Claude가 생성한 응답은 Anthropic에 의해 보관되지 않습니다. 사용하는 Claude 모델에 관계없이 적용됩니다.

**ZDR이 적용되지 않는 항목**:

| 기능 | 세부 사항 |
|------|----------|
| **claude.ai 채팅** | Claude for Enterprise 웹 인터페이스의 대화는 ZDR 적용 제외 |
| **Cowork** | Cowork 세션은 ZDR 적용 제외 |
| **Claude Code Analytics** | 프롬프트나 모델 응답을 저장하지 않지만, 계정 이메일 및 사용 통계 등 생산성 메타데이터를 수집. ZDR 조직에서는 기여도 지표를 사용할 수 없으며, Analytics 대시보드에 사용량 메트릭만 표시됨 |
| **사용자 및 좌석 관리** | 계정 이메일, 좌석 할당 등 관리 데이터는 표준 정책에 따라 보관 |
| **서드파티 통합** | 서드파티 도구, MCP 서버, 기타 외부 통합에서 처리되는 데이터는 ZDR 적용 제외. 해당 서비스의 데이터 처리 방식을 독립적으로 검토 필요 |

### ZDR 활성화 시 비활성화되는 기능

ZDR이 Claude Code 조직(Claude for Enterprise)에 대해 활성화되면, 프롬프트나 완성 결과 저장이 필요한 특정 기능이 백엔드에서 자동으로 비활성화됩니다.

| 기능 | 비활성화 사유 |
|------|-------------|
| **Claude Code on the Web** | 대화 기록의 서버 측 저장 필요 |
| **Desktop 앱의 Remote 세션** | 프롬프트와 완성 결과가 포함된 영구 세션 데이터 필요 |
| **`/feedback` 제출** | 피드백 제출 시 대화 데이터가 Anthropic에 전송됨 |

> 이러한 기능은 클라이언트 측 표시와 관계없이 백엔드에서 차단됩니다. 비활성화된 기능을 사용하려고 하면 조직 정책에서 해당 작업을 허용하지 않는다는 오류가 반환됩니다.
>
> 향후 프롬프트나 완성 결과 저장이 필요한 기능도 추가로 비활성화될 수 있습니다.

### 정책 위반 시 데이터 보유

ZDR이 활성화되어 있어도, Anthropic은 법적 요구 또는 Usage Policy 위반 대응을 위해 데이터를 보유할 수 있습니다. 정책 위반으로 세션이 플래그된 경우, Anthropic은 관련 입력 및 출력을 **최대 2년**간 보유할 수 있습니다. 이는 Anthropic의 표준 ZDR 정책과 일치합니다.

### ZDR 요청

Claude for Enterprise에서 Claude Code에 대한 ZDR을 요청하려면 sales 또는 Anthropic 계정 팀에 연락하세요. 계정 팀이 내부적으로 요청을 제출하면, Anthropic이 자격 요건을 확인한 후 조직에 ZDR을 활성화합니다. 모든 활성화 작업은 감사 로그에 기록됩니다.

> 종량제 API 키로 현재 ZDR을 사용 중인 경우, Claude for Enterprise로 전환하여 관리 기능에 접근하면서 ZDR을 유지할 수 있습니다. 계정 팀에 연락하여 마이그레이션을 조율하세요.

---

## 보안 모범 사례

### 민감한 코드 작업 시

| 실천 사항 | 설명 |
|----------|------|
| **변경사항 검토** | 승인 전 모든 제안된 변경사항 검토 |
| **프로젝트별 권한 설정** | 민감한 리포지토리에 프로젝트별 권한 설정 사용 |
| **DevContainer 사용** | 추가 격리를 위해 DevContainer 사용 고려 |
| **권한 정기 감사** | `/permissions`로 권한 설정을 정기적으로 감사 |

### 팀 보안

| 실천 사항 | 설명 |
|----------|------|
| **엔터프라이즈 관리 정책** | 조직 표준을 강제하는 엔터프라이즈 관리 정책 사용 |
| **권한 구성 공유** | 버전 관리를 통해 승인된 권한 구성 공유 |
| **팀원 교육** | 보안 모범 사례에 대한 팀원 교육 |
| **사용량 모니터링** | OpenTelemetry 메트릭을 통해 Claude Code 사용량 모니터링 |
| **설정 변경 감사** | `ConfigChange` 훅으로 세션 중 설정 변경을 감사하거나 차단 |

### 취약점 보고

Claude Code에서 보안 취약점을 발견한 경우:

| 단계 | 행동 |
|------|------|
| **1** | 공개적으로 공개하지 않기 |
| **2** | HackerOne 프로그램을 통해 보고 |
| **3** | 상세한 재현 단계 포함 |
| **4** | 공개 공개 전 해결 시간 허용 |
