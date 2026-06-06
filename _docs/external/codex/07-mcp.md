# MCP 통합

> MCP(Model Context Protocol)는 모델을 도구와 컨텍스트에 연결하는 개방형 표준입니다. Codex에서 서드파티 문서에 접근하거나 브라우저, Figma 등 개발자 도구와 상호작용할 수 있게 합니다.

**참조:** [Model Context Protocol - Codex | OpenAI Developers](https://developers.openai.com/codex/mcp)

---

## 1. MCP 개요

MCP(Model Context Protocol)는 모델을 도구와 컨텍스트에 연결하는 개방형 표준입니다. Codex는 CLI와 IDE 확장 모두에서 MCP 서버를 지원합니다.

Codex는 `config.toml`에 MCP 설정을 저장하며, 기본 위치는 `~/.codex/config.toml`입니다. 신뢰된 프로젝트의 경우 `.codex/config.toml`로 프로젝트 범위 지정도 가능합니다. CLI와 IDE 확장이 이 설정을 공유하므로, 한 번 설정하면 두 클라이언트 간 전환 시 재설정이 필요 없습니다.

---

## 2. 지원 전송 방식

| 전송 방식 | 설명 | 인증 방식 |
|---|---|---|
| **STDIO 서버** | 명령으로 시작되는 로컬 프로세스 | 환경변수 |
| **Streamable HTTP 서버** | 주소로 접근하는 원격 서버 | Bearer 토큰, OAuth |

---

## 3. STDIO 서버 설정

로컬 프로세스로 실행되는 MCP 서버입니다. `config.toml`의 `[mcp_servers.<server-name>]` 테이블로 설정합니다.

### 3.1 설정 필드

| 필드 | 필수 여부 | 설명 |
|---|---|---|
| `command` | **필수** | 서버를 시작하는 명령 |
| `args` | 선택 | 서버에 전달할 인수 배열 |
| `env` | 선택 | 서버에 설정할 환경변수 맵 |
| `env_vars` | 선택 | 허용 및 전달할 환경변수 |
| `cwd` | 선택 | 서버를 시작할 작업 디렉토리 |
| `experimental_environment` | 선택 | `remote`로 설정 시 원격 실행 환경을 통해 STDIO 서버 시작 |

### 3.2 env_vars 형식

`env_vars`는 일반 변수명 문자열 또는 `source`가 있는 객체를 포함할 수 있습니다:

```toml
env_vars = ["LOCAL_TOKEN", { name = "REMOTE_TOKEN", source = "remote" }]
```

| 항목 형식 | 동작 |
|---|---|
| 문자열 (예: `"LOCAL_TOKEN"`) | Codex의 로컬 환경에서 읽음 |
| `{ name = "...", source = "local" }` | 로컬 환경에서 읽음 (문자열과 동일) |
| `{ name = "...", source = "remote" }` | 원격 실행 환경에서 읽음. 원격 MCP STDIO 필요 |

### 3.3 STDIO 설정 예시

```toml
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]
env_vars = ["LOCAL_TOKEN"]

[mcp_servers.context7.env]
MY_ENV_VAR = "MY_ENV_VALUE"
```

---

## 4. Streamable HTTP 서버 설정

원격 주소로 접근하는 MCP 서버입니다.

### 4.1 설정 필드

| 필드 | 필수 여부 | 설명 |
|---|---|---|
| `url` | **필수** | 서버 주소 |
| `bearer_token_env_var` | 선택 | `Authorization` 헤더에 전송할 Bearer 토큰의 환경변수 이름 |
| `http_headers` | 선택 | 헤더 이름 -> 정적 값 맵 |
| `env_http_headers` | 선택 | 헤더 이름 -> 환경변수 이름 맵 (환경에서 값 가져옴) |

### 4.2 Streamable HTTP 설정 예시

```toml
[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
bearer_token_env_var = "FIGMA_OAUTH_TOKEN"
http_headers = { "X-Figma-Region" = "us-east-1" }
```

---

## 5. 공통 설정 옵션

STDIO와 Streamable HTTP 모두에 적용되는 공통 설정입니다.

| 필드 | 기본값 | 설명 |
|---|---|---|
| `startup_timeout_sec` | `10` | 서버 시작 타임아웃 (초) |
| `tool_timeout_sec` | `60` | 도구 실행 타임아웃 (초) |
| `enabled` | `true` | `false`로 설정 시 삭제 없이 서버 비활성화 |
| `required` | `false` | `true` 시 활성화된 서버가 초기화되지 않으면 시작 실패 |
| `enabled_tools` | - | 도구 허용 목록 |
| `disabled_tools` | - | 도구 차단 목록 (`enabled_tools` 적용 후 적용) |
| `default_tools_approval_mode` | - | 서버의 모든 도구에 대한 기본 승인 동작. 값: `auto`, `prompt`, `approve` |
| `tools.<tool>.approval_mode` | - | 개별 도구 승인 동작 오버라이드 |

### 도구 승인 모드 값

| 모드 | 설명 |
|---|---|
| `auto` | 자동 승인 |
| `prompt` | 사용자에게 확인 |
| `approve` | 승인됨 |

### 공통 설정 예시

```toml
[mcp_servers.chrome_devtools]
url = "http://localhost:3000/mcp"
enabled_tools = ["open", "screenshot"]
disabled_tools = ["screenshot"]  # enabled_tools 적용 후 적용됨
default_tools_approval_mode = "prompt"
startup_timeout_sec = 20
tool_timeout_sec = 45
enabled = true

[mcp_servers.chrome_devtools.tools.open]
approval_mode = "approve"
```

### MCP 도구 승인 기본값

`default_tools_approval_mode`로 서버의 모든 도구에 기본 승인 동작을 설정하고, 개별 도구별 `approval_mode`로 예외를 지정합니다:

```toml
[mcp_servers.docs]
command = "docs-server"
default_tools_approval_mode = "approve"

[mcp_servers.docs.tools.search]
approval_mode = "prompt"
```

---

## 6. OAuth 인증

MCP 서버가 OAuth를 지원하는 경우:

### 6.1 로그인

```bash
codex mcp login <server-name>
```

### 6.2 OAuth 콜백 설정

```toml
# OAuth 콜백 포트 오버라이드 (선택)
mcp_oauth_callback_port = 5555

# OAuth 콜백 URL 오버라이드 (선택)
mcp_oauth_callback_url = "https://devbox.example.internal/callback"
```

| 설정 | 설명 |
|---|---|
| `mcp_oauth_callback_port` | OAuth 제공자가 고정 콜백 포트를 요구하는 경우 설정. 미설정 시 임시 포트 사용 |
| `mcp_oauth_callback_url` | OAuth `redirect_uri`로 사용할 콜백 URL. 로컬 URL(`localhost`)은 로컬 인터페이스에 바인딩, 비로컬 URL은 `0.0.0.0`에 바인딩 |

MCP 서버가 `scopes_supported`를 광고하면 Codex는 OAuth 로그인 시 서버 광고 스코프를 우선 사용합니다. 그렇지 않으면 `config.toml`에 설정된 스코프를 사용합니다.

---

## 7. 플러그인 제공 MCP 서버

설치된 플러그인은 플러그인 매니페스트에 MCP 서버를 번들링할 수 있습니다. 이 서버들은 플러그인에서 시작되므로 사용자 설정에서 전송 명령을 지정하지 않습니다.

사용자 설정에서 서버의 켜기/끄기 상태와 도구 정책을 제어할 수 있습니다:

```toml
[plugins."sample@test".mcp_servers.sample]
enabled = true
default_tools_approval_mode = "prompt"
enabled_tools = ["read", "search"]

[plugins."sample@test".mcp_servers.sample.tools.search]
approval_mode = "approve"
```

---

## 8. MCP CLI 명령어

### 8.1 MCP 서버 추가

```bash
codex mcp add <server-name> --env VAR1=VALUE1 --env VAR2=VALUE2 -- <stdio server-command>
```

**예시 - Context7 추가:**

```bash
codex mcp add context7 -- npx -y @upstash/context7-mcp
```

### 8.2 기타 명령어

```bash
codex mcp --help       # 모든 MCP 명령어 보기
```

### 8.3 TUI에서 확인

Codex TUI에서 `/mcp`를 입력하여 활성 MCP 서버를 확인합니다.

---

## 9. Server Instructions

MCP 서버는 초기화 시 반환되는 `instructions` 필드를 지원합니다. Codex는 이를 서버 전반의 지침으로 서버의 도구와 함께 사용합니다.

### 작성 권장사항

- `instructions`를 사용하여 서버 전체에 적용되는 **크로스 도구 워크플로, 제약 조건, 속도 제한**을 작성하세요.
- 처음 **512자 이내**에 가장 중요한 지침을 자체 완결형으로 작성하세요. Codex가 서버 사용 방법을 결정할 때 이 부분이 사용 가능합니다.

---

## 10. 공식 MCP 서버 목록

| 서버 | 설명 |
|---|---|
| **OpenAI Docs MCP** | OpenAI 개발자 문서 검색 및 읽기 |
| **Context7** | 최신 개발자 문서에 연결 |
| **Figma (Local & Remote)** | Figma 디자인에 접근 |
| **Playwright** | Playwright를 사용한 브라우저 제어 및 검사 |
| **Chrome Developer Tools** | Chrome 제어 및 검사 |
| **Sentry** | Sentry 로그에 접근 |
| **GitHub** | `git`이 지원하지 않는 PR, 이슈 등 GitHub 관리 |

---

## 11. 실전 설정 예제

### 예제 1: Context7 (개발자 문서)

```toml
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]
```

### 예제 2: Figma (원격 HTTP)

```toml
[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
bearer_token_env_var = "FIGMA_OAUTH_TOKEN"
http_headers = { "X-Figma-Region" = "us-east-1" }
```

### 예제 3: Chrome DevTools (세부 제어)

```toml
[mcp_servers.chrome_devtools]
url = "http://localhost:3000/mcp"
enabled_tools = ["open", "screenshot"]
default_tools_approval_mode = "prompt"
startup_timeout_sec = 20
tool_timeout_sec = 45
enabled = true

[mcp_servers.chrome_devtools.tools.open]
approval_mode = "approve"
```

### 예제 4: 커스텀 STDIO 서버 (환경변수 포함)

```toml
[mcp_servers.my-api]
command = "/usr/local/bin/my-api-mcp"
args = ["--verbose", "--port", "8080"]
startup_timeout_sec = 15
tool_timeout_sec = 120

[mcp_servers.my-api.env]
API_ENDPOINT = "https://api.example.com"
LOG_LEVEL = "info"
```

### 예제 5: OAuth 인증이 필요한 서버

```toml
[mcp_servers.sentry]
url = "https://sentry-mcp.example.com/mcp"
startup_timeout_sec = 15

# 로그인 명령어 실행: codex mcp login sentry
```

### 예제 6: 다중 MCP 서버 설정

```toml
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]

[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
bearer_token_env_var = "FIGMA_OAUTH_TOKEN"

[mcp_servers.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
env_vars = ["GITHUB_TOKEN"]

[mcp_servers.playwright]
command = "npx"
args = ["-y", "@playwright/mcp@latest"]
startup_timeout_sec = 15
```

---

## 12. 설정 위치 및 범위

| 위치 | 범위 | 설명 |
|---|---|---|
| `~/.codex/config.toml` | 전역 | 모든 Codex 세션에 적용 |
| `.codex/config.toml` | 프로젝트 | 신뢰된 프로젝트에만 적용 |

IDE 확장에서는 기어 메뉴에서 **MCP settings > Open config.toml**을 선택하여 직접 편집할 수 있습니다.
