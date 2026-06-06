# 07. MCP 통합 (Model Context Protocol)

> **원문**: [https://code.claude.com/docs/en/mcp](https://code.claude.com/docs/en/mcp) | [https://code.claude.com/docs/en/mcp-quickstart](https://code.claude.com/docs/en/mcp-quickstart)
> **이전**: [https://docs.anthropic.com/en/docs/claude-code/mcp](https://docs.anthropic.com/en/docs/claude-code/mcp)

---

## 1. MCP 개요

Claude Code는 **Model Context Protocol (MCP)** 을 통해 수백 개의 외부 도구와 데이터 소스에 연결할 수 있습니다. MCP는 AI-도구 통합을 위한 오픈소스 표준으로, MCP 서버를 통해 Claude Code가 도구, 데이터베이스, API에 접근할 수 있게 합니다.

> **중요**: Claude Code는 **stdio, HTTP, SSE, WebSocket 전송을 모두 지원**합니다. 로컬 도구에는 stdio를, 원격 서비스에는 HTTP/SSE/WebSocket을 사용할 수 있습니다.

### MCP로 할 수 있는 일

- **이슈 트래커에서 기능 구현**: "JIRA 이슈 ENG-4521에 설명된 기능을 추가하고 GitHub에 PR 생성"
- **모니터링 데이터 분석**: "Sentry와 Statsig에서 ENG-4521 기능의 사용량 확인"
- **데이터베이스 쿼리**: "PostgreSQL에서 ENG-4521 기능을 사용한 사용자 10명의 이메일 찾기"
- **디자인 통합**: "Slack에 게시된 Figma 디자인에 따라 이메일 템플릿 업데이트"
- **워크플로우 자동화**: "10명의 사용자에게 새 기능 피드백 세션 초장하는 Gmail 초안 생성"
- **외부 이벤트에 반응**: MCP 서버가 세션으로 메시지를 푸시하는 채널 역할을 하여, 자리를 비운 사이에 Claude가 Telegram 메시지, Discord 채팅, 웹훅 이벤트에 반응

---

## 2. MCP 서버 찾기 및 빌드

**Anthropic Directory**에서 검토된 커넥터를 찾을 수 있습니다. Directory 커넥터는 Claude Code와 동일한 MCP 인프라를 사용하므로, 나열된 원격 서버는 `claude mcp add`로 바로 추가할 수 있습니다.

직접 서버를 빌드하려면:
- **MCP server guide**에서 프로토콜 기본 사항 확인
- **Claude connector building docs**에서 인증, 테스트, Directory 제출 방법 확인
- 공식 **`mcp-server-dev` 플러그인**으로 Claude에게 서버 스캐폴딩을 맡길 수도 있습니다

---

## 3. MCP 서버 설치 4가지 방법

### 방법 1: 원격 HTTP 서버

HTTP 서버는 원격 MCP 서버 연결에 권장되는 옵션입니다. 클라우드 기반 서비스에 가장 널리 지원되는 전송 방식입니다.

```bash
# 기본 문법
claude mcp add --transport http <name> <url>

# 실제 예시: Notion 연결
claude mcp add --transport http notion https://mcp.notion.com/mcp

# Bearer 토큰 포함 예시
claude mcp add --transport http secure-api https://api.example.com/mcp \
  --header "Authorization: Bearer your-token"
```

### 방법 2: 원격 SSE 서버

SSE (Server-Sent Events) 전송 방식입니다.

```bash
# 기본 문법
claude mcp add --transport sse <name> <url>

# 실제 예시: Asana 연결
claude mcp add --transport sse asana https://mcp.asana.com/sse

# 인증 헤더 포함 예시
claude mcp add --transport sse private-api https://api.company.com/sse \
  --header "X-API-Key: your-key-here"
```

### 방법 3: 원격 WebSocket 서버

WebSocket 서버는 지속적인 양방향 연결을 유지하며, Claude에게 묻지 않아도 이벤트를 푸시하는 원격 MCP 서버에 적합합니다. 서버가 요청에만 응답한다면 HTTP를 사용하세요. HTTP는 OAuth와 `claude mcp add --transport` 플래그를 지원하지만, WebSocket은 둘 다 지원하지 않습니다.

WebSocket 서버는 `.mcp.json` 또는 `claude mcp add-json`으로 구성합니다:

```bash
claude mcp add-json events-server \
  '{"type":"ws","url":"wss://mcp.example.com/socket","headers":{"Authorization":"Bearer YOUR_TOKEN"}}'
```

`type: "ws"` 항목은 `http`와 동일한 `url`, `headers`, `headersHelper`, `timeout`, `alwaysLoad` 필드를 지원합니다. 인증은 헤더 전용이므로 `headers`에 정적 토큰을 전달하거나, 연결 시점에 `headersHelper`로 동적으로 생성합니다. `claude mcp add --transport` 플래그는 `ws`를 허용하지 않습니다.

### 방법 4: 로컬 stdio 서버

stdio 서버는 로컬 프로세스로 실행됩니다. 시스템에 직접 접근해야 하는 도구나 커스텀 스크립트에 적합합니다.

Claude Code는 시작된 서버 프로세스의 환경에 `CLAUDE_PROJECT_DIR`을 설정하여 프로젝트 루트를 전달합니다. 서버 내부에서 `process.env.CLAUDE_PROJECT_DIR`(Node) 또는 `os.environ["CLAUDE_PROJECT_DIR"]`(Python)로 읽을 수 있습니다. 서버는 MCP `roots/list` 요청을 호출할 수도 있습니다.

> 이 변수는 서버 프로세스의 환경에 설정되며 Claude Code 자체의 환경은 아닙니다. 따라서 `.mcp.json`의 `command`나 `args`에서 `${CLAUDE_PROJECT_DIR}` 확장을 사용하려면 `${CLAUDE_PROJECT_DIR:-.}`처럼 기본값이 필요합니다.

```bash
# 기본 문법
claude mcp add --transport stdio <name> <command> [args...]

# 실제 예시: Airtable 서버
claude mcp add --transport stdio airtable --env AIRTABLE_API_KEY=YOUR_KEY \
  -- npx -y airtable-mcp-server

# 데이터베이스 서버 예시
claude mcp add --transport stdio db -- npx -y @bytebase/dbhub \
  --dsn "postgresql://readonly:password@localhost:5432/analytics"
```

> **참고**: `.mcp.json`, `~/.claude.json`, `claude mcp add-json`에서 `type` 필드는 `http`의 별칭으로 `streamable-http`도 허용합니다. MCP 사양이 이 전송에 `streamable-http`라는 이름을 사용하므로, 서버 문서에서 복사한 구성이 수정 없이 작동합니다.

---

## 4. 서버 관리 명령어

```bash
# 모든 구성된 서버 목록
claude mcp list

# 특정 서버 상세 정보
claude mcp get github

# 서버 제거
claude mcp remove github

# 프로젝트 승인 선택 초기화
claude mcp reset-project-choices

# Claude Code 내에서 서버 상태 확인
/mcp
```

- `.mcp.json`의 프로젝트 스코프 서버 중 승인 대기 중인 항목은 `claude mcp list`에서 `⏸ Pending approval`로 표시됩니다. 대화형 모드에서 `claude`를 실행하여 승인할 수 있습니다.
- `/mcp` 패널은 각 연결된 서버 옆에 도구 수를 표시하며, 도구 기능을 광고하지만 노출된 도구가 없는 서버에 플래그를 지정합니다.
- 요청이 아직 백그라운드에서 연결 중인 서버의 도구를 필요로 하는 경우, Claude는 해당 서버가 준비될 때까지 대기합니다. Tool Search가 활성화된 경우(기본값) `ToolSearch` 호출 내에서 대기합니다. 비활성화된 경우 `WaitForMcpServers` 도구를 사용합니다.
- 서버 이름 `workspace`는 내부 사용을 위해 예약되어 있습니다. 해당 이름으로 구성하면 로드 시 건너뛰고 이름 변경 경고가 표시됩니다.

### 동적 도구 업데이트 (list_changed)

Claude Code는 MCP `list_changed` 알림을 지원합니다. MCP 서버가 `list_changed` 알림을 보내면 연결을 끊고 다시 연결할 필요 없이 사용 가능한 도구, 프롬프트, 리소스를 자동으로 새로고침합니다.

### 자동 재연결 (지수 백오프)

HTTP 또는 SSE 서버가 세션 중 연결이 끊기면 Claude Code는 지수 백오프로 자동 재연결을 시도합니다:

| 항목 | 값 |
|------|-----|
| **최대 시도 횟수** | 5회 |
| **초기 지연** | 1초 |
| **지연 증가** | 매 시도마다 2배 |
| **재연결 중 상태** | `/mcp`에서 대기 중(pending)으로 표시 |
| **5회 실패 후** | 실패로 표시, `/mcp`에서 수동 재시도 가능 |

stdio 서버는 로컬 프로세스이므로 자동 재연결 대상이 아닙니다.

v2.1.121부터 초기 연결 시에도 동일한 백오프가 적용됩니다. 일시적 오류(5xx 응답, 연결 거부, 타임아웃)인 경우 최대 3회 재시도하며, 인증 오류나 404는 구성 변경이 필요하므로 재시도하지 않습니다.

### 채널로 푸시 메시지 받기

MCP 서버가 세션에 직접 메시지를 푸시하여 CI 결과, 모니터링 알림, 채팅 메시지 등 외부 이벤트에 Claude가 반응할 수 있습니다. 서버가 `claude/channel` 기능을 선언하고, 시작 시 `--channels` 플래그로 활성화합니다.

서버별 `timeout`은 도구 호출당 하드 월클락 제한이며, 서버의 진행 알림이 이를 연장하지 않습니다. 1000 미만의 값은 무시되고 `MCP_TOOL_TIMEOUT` 또는 기본값(약 28시간)으로 대체됩니다. HTTP 및 SSE 서버의 경우 요청별 첫 번째 바이트 예산은 최소 60초입니다.

---

## 5. JSON 구성으로 MCP 서버 추가 (`claude mcp add-json`)

JSON 구성이 있는 MCP 서버를 직접 추가할 수 있습니다. `claude mcp add` 명령어로 지원하지 않는 고급 옵션(WebSocket 등)을 설정할 때 유용합니다.

```bash
# 기본 문법
claude mcp add-json <name> '<json-configuration>'

# WebSocket 서버 추가 예시
claude mcp add-json events-server \
  '{"type":"ws","url":"wss://mcp.example.com/socket","headers":{"Authorization":"Bearer YOUR_TOKEN"}}'

# HTTP 서버 추가 예시
claude mcp add-json my-api \
  '{"type":"http","url":"https://api.example.com/mcp","headers":{"Authorization":"Bearer YOUR_TOKEN"}}'
```

`.mcp.json`, `~/.claude.json`, `claude mcp add-json`에서 `type` 필드는 `http`의 별칭으로 `streamable-http`도 허용합니다. MCP 사양이 이 전송에 `streamable-http`라는 이름을 사용하므로, 서버 문서에서 복사한 구성이 수정 없이 작동합니다.

---

## 6. Claude Desktop에서 MCP 서버 가져오기

Claude Desktop에서 이미 MCP 서버를 구성한 경우, Claude Code로 가져올 수 있습니다. Claude Desktop의 `claude_desktop_config.json`에 있는 서버 구성을 Claude Code에서 사용 가능한 형식으로 변환하여 추가합니다.

---

## 7. 설치 스코프 3가지 및 우선순위

MCP 서버는 세 가지 스코프 수준에서 구성할 수 있습니다. 관리자는 관리 구성을 통해 엔터프라이즈 수준에서도 배포할 수 있습니다.

| 스코프 | 로드 범위 | 팀 공유 | 저장 위치 |
|--------|-----------|---------|-----------|
| **Local** | 현재 프로젝트만 | 아니오 | `~/.claude.json` (해당 프로젝트 항목 하위) |
| **Project** | 현재 프로젝트만 | 예 (버전 관리) | `.mcp.json` (프로젝트 루트) |
| **User** | 모든 프로젝트 | 아니오 | `~/.claude.json` (최상위 `mcpServers`) |

### Local 스코프 (기본값)

`~/.claude.json`에 저장되며, 현재 프로젝트 디렉토리에서만 접근 가능합니다. 개인 개발 서버, 실험적 구성, 민감한 자격 증명이 포함된 서버에 적합합니다.

```bash
# 로컬 스코프 서버 추가 (기본값)
claude mcp add --transport http stripe https://mcp.stripe.com

# 명시적 지정
claude mcp add --transport http stripe --scope local https://mcp.stripe.com
```

### Project 스코프

프로젝트 루트의 `.mcp.json` 파일에 저장됩니다. 버전 관리에 체크인되어 모든 팀원이 동일한 MCP 도구에 접근할 수 있습니다.

```bash
# 프로젝트 스코프 서버 추가
claude mcp add --transport http paypal --scope project https://mcp.paypal.com/mcp
```

### User 스코프

`~/.claude.json`에 저장되며, 모든 프로젝트에서 접근 가능합니다. 개인 유틸리티 서버, 자주 사용하는 서비스에 적합합니다.

```bash
# 사용자 스코프 서버 추가
claude mcp add --transport http hubspot --scope user https://mcp.hubspot.com/anthropic
```

### 스코프 선택 가이드

| 스코프 | 적합한 경우 |
|--------|-------------|
| **Local** | 개인 서버, 실험적 구성, 민감한 자격 증명 (프로젝트별) |
| **Project** | 팀 공유 서버, 프로젝트별 도구, 협업 필수 서비스 |
| **User** | 여러 프로젝트에서 필요한 개인 유틸리티, 자주 사용하는 서비스 |

### 우선순위 (Precedence)

같은 서버가 여러 곳에 정의된 경우, Claude Code는 한 번만 연결하며 가장 높은 우선순위의 소스에 있는 정의 전체를 사용합니다. 필드는 스코프 간에 병합되지 않습니다.

1. **Local 스코프**
2. **Project 스코프**
3. **User 스코프**
4. **플러그인 제공 서버**
5. **claude.ai 커넥터**

세 가지 스코프는 이름으로 중복을 식별합니다. 플러그인과 커넥터는 엔드포인트로 매칭하므로, 위에 있는 서버와 같은 URL이나 명령어를 가리키면 중복으로 처리됩니다.

---

## 8. .mcp.json 파일 형식

프로젝트 스코프 서버는 `.mcp.json` 파일로 관리됩니다.

```json
{
  "mcpServers": {
    "shared-server": {
      "command": "/path/to/server",
      "args": [],
      "env": {}
    }
  }
}
```

### HTTP 서버 예시

```json
{
  "mcpServers": {
    "api-server": {
      "type": "http",
      "url": "${API_BASE_URL:-https://api.example.com}/mcp",
      "headers": {
        "Authorization": "Bearer ${API_KEY}"
      }
    }
  }
}
```

`type` 필드는 `http` 대신 `streamable-http`도 허용합니다. 서버 문서에서 복사한 구성이 그대로 작동합니다.

### stdio 서버 예시

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

### WebSocket 서버 예시

```json
{
  "mcpServers": {
    "events-server": {
      "type": "ws",
      "url": "wss://mcp.example.com/socket",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      }
    }
  }
}
```

> **보안**: Claude Code는 `.mcp.json` 파일의 프로젝트 스코프 서버를 사용하기 전에 승인을 요청합니다.

---

## 9. 환경변수 확장

`.mcp.json` 파일에서 환경변수 확장을 지원합니다. 팀이 구성을 공유하면서 머신별 경로와 API 키 등을 유연하게 관리할 수 있습니다.

### 지원 문법

| 문법 | 설명 |
|------|------|
| `${VAR}` | 환경변수 `VAR`의 값으로 확장 |
| `${VAR:-default}` | `VAR`이 설정되어 있으면 그 값, 없으면 `default` 사용 |

### 확장 적용 위치

- `command` - 서버 실행 파일 경로
- `args` - 명령줄 인자
- `env` - 서버에 전달되는 환경변수
- `url` - HTTP 서버 타입의 URL
- `headers` - HTTP 서버 인증 헤더

> 필수 환경변수가 설정되지 않고 기본값도 없으면 Claude Code가 구성 파싱에 실패합니다.

---

## 10. 플러그인 제공 MCP 서버

플러그인은 MCP 서버를 번들로 포함할 수 있으며, 플러그인이 활성화되면 자동으로 도구와 통합을 제공합니다.

### `.mcp.json` 방식 (플러그인 루트)

```json
{
  "database-tools": {
    "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
    "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
    "env": {
      "DB_URL": "${DB_URL}"
    }
  }
}
```

### `plugin.json` 인라인 방식

```json
{
  "name": "my-plugin",
  "mcpServers": {
    "plugin-api": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/api-server",
      "args": ["--port", "8080"]
    }
  }
}
```

### 플러그인 MCP 기능

| 기능 | 설명 |
|------|------|
| **자동 수명 주기** | 세션 시작 시 활성화된 플러그인의 서버가 자동으로 연결됨. 세션 중 플러그인을 활성화/비활성화한 경우 `/reload-plugins` 실행으로 MCP 서버를 연결/해제할 수 있음 |
| **환경변수** | `${CLAUDE_PLUGIN_ROOT}`로 플러그인 상대 경로, `${CLAUDE_PLUGIN_DATA}`로 업데이트에도 유지되는 상태, `${CLAUDE_PROJECT_DIR}`로 안정적인 프로젝트 루트 경로 사용 |
| **사용자 환경 접근** | 수동 구성 서버와 동일한 환경변수 접근 |
| **다중 전송 타입** | stdio, SSE, HTTP, WebSocket 전송 지원 (서버별 지원 여부 다를 수 있음) |

---

## 11. Claude Code 자체를 MCP 서버로 사용

Claude Code 자체를 MCP 서버로 실행하여 다른 애플리케이션에서 연결할 수 있습니다.

```bash
# stdio MCP 서버로 Claude 시작
claude mcp serve
```

### Claude Desktop에서 사용

`claude_desktop_config.json`에 다음 설정을 추가합니다.

```json
{
  "mcpServers": {
    "claude-code": {
      "type": "stdio",
      "command": "claude",
      "args": ["mcp", "serve"],
      "env": {}
    }
  }
}
```

---

## 12. MCP 출력 제한

MCP 도구가 대량의 출력을 생성할 때 토큰 사용을 관리합니다.

| 항목 | 값 |
|------|-----|
| **출력 경고 임계값** | MCP 도구 출력이 10,000 토큰 초과 시 경고 표시 |
| **기본 최대 제한** | 25,000 토큰 |
| **설정 변수** | `MAX_MCP_OUTPUT_TOKENS` 환경변수 |
| **적용 범위** | `MAX_MCP_OUTPUT_TOKENS`는 자체 한도를 선언하지 않은 도구에 적용됨. `anthropic/maxResultSizeChars`를 설정한 도구는 `MAX_MCP_OUTPUT_TOKENS` 값과 관계없이 해당 값을 텍스트 콘텐츠에 사용. 이미지 데이터를 반환하는 도구는 여전히 `MAX_MCP_OUTPUT_TOKENS`의 적용을 받음 |

```bash
# MCP 출력 제한 증가
export MAX_MCP_OUTPUT_TOKENS=50000
claude
```

대량 출력이 발생하는 경우:
- 대규모 데이터셋 또는 데이터베이스 쿼리
- 상세한 보고서 또는 문서 생성
- 광범위한 로그 파일 또는 디버깅 정보

### 개별 도구 출력 한도 상향 (`anthropic/maxResultSizeChars`)

MCP 서버를 개발하는 경우, 도구의 `tools/list` 응답 항목에 `_meta["anthropic/maxResultSizeChars"]`를 설정하여 개별 도구가 기본 디스크 저장 임계값보다 큰 결과를 반환할 수 있도록 허용할 수 있습니다. Claude Code는 해당 도구의 임계값을 주석에 지정된 값까지 올리며, **최대 500,000자**가 하드 상한선입니다.

이는 데이터베이스 스키마나 전체 파일 트리와 같이 본질적으로 크지만 필요한 출력을 반환하는 도구에 유용합니다. 주석이 없으면 기본 임계값을 초과하는 결과는 디스크에 저장되고 대화에서 파일 참조로 대체됩니다.

```json
{
  "name": "get_schema",
  "description": "전체 데이터베이스 스키마를 반환합니다",
  "_meta": {
    "anthropic/maxResultSizeChars": 200000
  }
}
```

이 주석은 텍스트 콘텐츠에 대해 `MAX_MCP_OUTPUT_TOKENS`와 독립적으로 적용되므로, 사용자가 이 주석을 선언한 도구에 대해 환경변수를 올릴 필요가 없습니다. 이미지 데이터를 반환하는 도구는 여전히 토큰 제한의 적용을 받습니다.

---

## 13. 엔터프라이즈 MCP 설정

조직에서 MCP 서버를 중앙 집중식으로 제어할 수 있습니다. IT 관리자가 승인된 MCP 서버를 배포하고, 사용자가 임의로 서버를 추가하지 못하도록 제한할 수 있습니다.

### managed-mcp.json 설정

시스템 관리자가 관리 설정 파일과 함께 엔터프라이즈 MCP 설정 파일을 배포합니다.

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "sentry": {
      "type": "http",
      "url": "https://mcp.sentry.dev/mcp"
    },
    "company-internal": {
      "type": "stdio",
      "command": "/usr/local/bin/company-mcp-server",
      "args": ["--config", "/etc/company/mcp-config.json"],
      "env": {
        "COMPANY_API_URL": "https://internal.company.com"
      }
    }
  }
}
```

---

## 14. 허용/차단 목록 상세

관리 설정 파일에서 `allowedMcpServers`와 `deniedMcpServers`를 사용하여 사용자가 구성할 수 있는 MCP 서버를 제어합니다.

### 매칭 키: URL, 명령어, 이름

`allowedMcpServers`와 `deniedMcpServers`는 항목 목록입니다. 각 항목은 서버를 URL, 명령어 또는 이름으로 식별하는 단일 키를 가진 객체입니다:

| 키 | 매칭 대상 | 용도 |
|------|------|------|
| `serverUrl` | 원격 서버 URL. 정확한 매칭 또는 `*` 와일드카드 지원 | HTTP 및 SSE 서버 |
| `serverCommand` | stdio 서버를 시작하는 정확한 명령어 및 인자 | Stdio 서버 |
| `serverName` | 사용자가 지정한 레이블. 정확한 매칭만 지원. 와일드카드 확장 불가 | 모든 타입 (아래 경고 참고) |

> **중요**: 각 항목은 `serverUrl`, `serverCommand`, `serverName` 중 **하나만** 가져야 합니다.

`allowedMcpServers`를 설정하지 않는 것과 빈 배열로 설정하는 것은 다릅니다:

| 설정 | 미설정 (기본값) | 빈 배열 `[]` | 항목 있음 |
|------|-----------------|-------------|-----------|
| `allowedMcpServers` | 모든 서버 허용 | 어떤 서버도 허용 안 함 | 매칭되는 서버만 허용 |
| `deniedMcpServers` | 차단되는 서버 없음 | 차단되는 서버 없음 | 지정된 서버 차단 |

### 설정 예시

```json
{
  "allowedMcpServers": [
    { "serverUrl": "https://api.githubcopilot.com/*" },
    { "serverUrl": "https://mcp.sentry.dev/*" },
    { "serverCommand": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "."] },
    { "serverCommand": ["python", "/usr/local/bin/approved-server.py"] },
    { "serverUrl": "https://mcp.example.com/*" },
    { "serverUrl": "https://*.internal.example.com/*" }
  ],
  "deniedMcpServers": [
    { "serverName": "dangerous-server" },
    { "serverCommand": ["npx", "-y", "unapproved-package"] },
    { "serverUrl": "https://*.untrusted.example.com/*" }
  ]
}
```

- 허용 목록에 첫 번째 `serverUrl` 항목이 있으면, 모든 원격 서버는 URL 패턴과 매칭되어야 합니다. 사용자가 허용된 이름을 부여해도 목록에 없는 원격 서버를 통과시킬 수 없습니다.
- 허용 목록에 첫 번째 `serverCommand` 항목이 있으면, 모든 stdio 서버는 나열된 명령어 중 하나와 정확히 매칭되어야 합니다.
- 차단 목록의 `serverName` 항목은 URL이나 명령어와 관계없이 항상 적용됩니다.

### 서버 평가 방식

서버를 로드하기 전에 Claude Code는 세 가지 검사를 순서대로 실행합니다:

1. **목록 병합**: 모든 설정 소스의 허용 목록과 차단 목록 항목이 하나의 목록으로 병합됩니다.
2. **차단 목록 확인**: URL, 명령어 또는 이름으로 차단 목록 항목과 매칭되는 서버는 차단됩니다. 차단 목록 매칭을 재정의할 수 있는 것은 없습니다.
3. **허용 목록 확인**: `allowedMcpServers`가 어디에도 설정되어 있지 않으면 차단 목록을 통과한 모든 서버가 로드됩니다. 설정된 경우 서버가 매칭해야 하는 항목은 서버 타입에 따라 다릅니다:

| 서버 타입 | 허용 조건 |
|-----------|----------|
| 원격 (HTTP 또는 SSE) | `serverUrl` 항목과 매칭. `serverName` 매칭은 허용 목록에 `serverUrl` 항목이 없을 때만 인정됨 |
| Stdio | `serverCommand` 항목과 매칭. `serverName` 매칭은 허용 목록에 `serverCommand` 항목이 없을 때만 인정됨 |

**두 가지 매칭 규칙**:
- **명령어는 정확히 매칭**: 모든 인자가 순서대로 정확히 일치해야 함. `["npx", "-y", "server"]`은 `["npx", "server"]` 또는 `["npx", "-y", "server", "--flag"]`와 매치되지 않음
- **URL은 `*` 와일드카드 지원**: 패턴 어디에서나 사용 가능하며 스킴 포함. 호스트명 매칭은 대소문자 구분 없으며 후행 FQDN 점을 무시함. 경로는 대소문자 구분 유지

| 패턴 | 허용 범위 |
|------|----------|
| `https://mcp.example.com/*` | 특정 도메인의 모든 경로 |
| `https://mcp.example.com` | 동일하게 특정 도메인의 모든 경로. 경로가 없는 패턴은 모든 경로와 매칭 |
| `https://*.example.com/*` | example.com의 모든 서브도메인 |
| `http://localhost:*/*` | localhost의 모든 포트 |
| `*://mcp.example.com/*` | 특정 도메인의 모든 스킴 |

### 허용 목록 동작 (`allowedMcpServers`)

| 값 | 동작 |
|----|------|
| `undefined` (기본값) | 제한 없음 - 모든 MCP 서버 구성 가능 |
| 빈 배열 `[]` | 전체 잠금 - 어떤 MCP 서버도 구성 불가 |
| 항목 목록 | 이름 또는 명령어와 매치되는 서버만 구성 가능 |

### 차단 목록 동작 (`deniedMcpServers`)

| 값 | 동작 |
|----|------|
| `undefined` (기본값) | 차단되는 서버 없음 |
| 빈 배열 `[]` | 차단되는 서버 없음 |
| 항목 목록 | 지정된 서버가 모든 스코프에서 명시적으로 차단됨 |

### 우선순위 규칙

- 모든 스코프에 적용: user, project, local, 엔터프라이즈 `managed-mcp.json` 포함
- **차단 목록이 절대 우선**: 서버가 차단 목록 항목과 매치되면 허용 목록에 있어도 차단됨
- 이름 기반과 명령어 기반 제한은 함께 작동: 서버는 이름 항목 **또는** 명령어 항목 중 하나와 매치되면 통과 (차단 목록에 없는 한)

---

## 15. MCP 서버 개발 기본

### Node.js MCP 서버 예제

```javascript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0",
});

// 도구 등록
server.tool(
  "get_data",
  "데이터를 조회합니다",
  { query: { type: "string", description: "검색 쿼리" } },
  async ({ query }) => {
    return {
      content: [{ type: "text", text: `검색 결과: ${query}` }],
    };
  }
);

// 서버 시작
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Claude Code에 등록

```bash
claude mcp add --transport stdio my-server -- node /path/to/server.js
```

---

## 16. 실전 예제

### 예제 1: 파일시스템 MCP 서버

```bash
# 파일시스템 서버 추가
claude mcp add --transport stdio filesystem \
  -- npx -y @modelcontextprotocol/server-filesystem /home/user/projects

# Claude Code에서 사용
> "프로젝트 디렉토리의 모든 TypeScript 파일을 나열하세요"
> "README.md 파일을 읽고 요약하세요"
```

### 예제 2: Sentry로 에러 모니터링

```bash
# 1. Sentry MCP 서버 추가
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

# 2. 인증
> /mcp

# 3. 프로덕션 이슈 디버깅
> "최근 24시간 동안 가장 많이 발생한 에러는 무엇인가요?"
> "에러 ID abc123의 스택 트레이스를 보여주세요"
> "어떤 배포에서 이 에러들이 새로 발생했나요?"
```

### 예제 3: GitHub으로 코드 리뷰

GitHub 원격 MCP 서버는 personal access token을 헤더로 전달하여 인증합니다. GitHub 토큰 설정에서 세밀한 권한(fine-grained token)을 생성한 뒤 아래와 같이 추가합니다.

```bash
# 1. GitHub MCP 서버 추가 (PAT 포함)
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer YOUR_GITHUB_PAT"

# 2. GitHub 작업
> "PR #456을 리뷰하고 개선점을 제안해주세요"
> "방금 발견한 버그에 대한 이슈를 생성해주세요"
> "나에게 할당된 열린 PR을 모두 보여주세요"
```

### 예제 4: PostgreSQL 데이터베이스 쿼리

```bash
# 1. 데이터베이스 서버 추가
claude mcp add --transport stdio db -- npx -y @bytebase/dbhub \
  --dsn "postgresql://readonly:password@localhost:5432/analytics"

# 2. 자연어로 쿼리
> "이번 달 총 수익은 얼마인가요?"
> "orders 테이블의 스키마를 보여주세요"
> "90일 동안 구매하지 않은 고객을 찾아주세요"
```

### 예제 5: 원격 API 통합 (HTTP)

```bash
# Bearer 토큰 인증이 필요한 API 서버
claude mcp add --transport http my-api https://api.mycompany.com/mcp \
  --header "Authorization: Bearer ${API_TOKEN}"

# 헤더 인증이 필요한 SSE 서버
claude mcp add --transport sse monitoring https://monitoring.mycompany.com/sse \
  --header "X-API-Key: ${MONITORING_KEY}"
```

---

## 17. MCP 리소스 및 프롬프트

### MCP 리소스 참조

MCP 서버가 노출하는 리소스를 `@` 멘션으로 참조할 수 있습니다. 파일 참조와 유사한 방식입니다.

### MCP 프롬프트를 슬래시 명령어로 사용

MCP 서버가 노출하는 프롬프트는 Claude Code에서 슬래시 명령어로 사용할 수 있습니다.

```
/mcp__<server-name>__<prompt-name> [arguments]
```

자세한 내용은 [슬래시 명령어 문서](./05-slash-commands.md)를 참조하세요.

---

## 18. 원격 MCP 서버 인증 (OAuth 2.0)

많은 클라우드 기반 MCP 서버는 인증이 필요합니다. Claude Code는 OAuth 2.0을 통한 안전한 연결을 지원합니다.

### 자동 인증 감지

Claude Code는 원격 서버가 `401 Unauthorized` 또는 `403 Forbidden`으로 응답하면 해당 서버에 인증이 필요함을 표시합니다. 두 상태 코드 중 하나가 서버에 플래그를 지정하여 `/mcp`에서 OAuth 흐름을 완료할 수 있습니다. 사용자 정의 서버가 `WWW-Authenticate` 헤더를 반환하면 다른 원격 서버와 동일한 자동 검색이 적용됩니다.

서버에 `headers.Authorization`을 구성했는데 서버가 해당 헤더를 거부하면, Claude Code는 OAuth로 대체하지 않고 연결 실패로 보고합니다. 토큰이 MCP 엔드포인트에 유효한지 확인하거나, OAuth 흐름을 사용하려면 해당 헤더를 제거하세요.

### 고정 OAuth 콜백 포트 (`--callback-port`)

일부 MCP 서버는 사전 등록된 특정 리디렉트 URI가 필요합니다. 기본적으로 Claude Code는 OAuth 콜백에 사용 가능한 임의 포트를 선택합니다. `--callback-port`로 포트를 고정하여 `http://localhost:PORT/callback` 형태의 사전 등록된 리디렉트 URI와 일치시킬 수 있습니다.

`--callback-port`는 단독으로 사용(동적 클라이언트 등록)하거나 `--client-id`와 함께 사용(사전 구성된 자격 증명)할 수 있습니다.

```bash
# 동적 클라이언트 등록과 함께 고정 콜백 포트
claude mcp add --transport http \
  --callback-port 8080 \
  my-server https://mcp.example.com/mcp
```

### 사전 구성된 OAuth 자격 증명 (`--client-id`)

일부 MCP 서버는 Dynamic Client Registration을 통한 자동 OAuth 설정을 지원하지 않습니다. "Incompatible auth server: does not support dynamic client registration" 오류가 나타나면 사전 구성된 자격 증명이 필요합니다. 서버의 개발자 포털에서 OAuth 앱을 등록한 후 자격 증명을 제공하세요.

Claude Code는 CIMD(Client ID Metadata Document)를 사용하는 서버도 자동으로 검색합니다.

### OAuth 메타데이터 재정의 (`authServerMetadataUrl`)

기본 OAuth 검색 체인을 우회하여 특정 OAuth 인증 서버 메타데이터 URL을 지정할 수 있습니다. MCP 서버의 표준 엔드포인트에 오류가 있거나 내부 프록시를 통해 검색을 라우팅하려는 경우에 사용합니다.

기본적으로 Claude Code는 먼저 `/.well-known/oauth-protected-resource`에서 RFC 9728 Protected Resource Metadata를 확인하고, 실패하면 `/.well-known/oauth-authorization-server`에서 RFC 8414 인증 서버 메타데이터로 대체합니다.

`.mcp.json`의 서버 구성에 있는 `oauth` 객체에 `authServerMetadataUrl`을 설정합니다:

```json
{
  "mcpServers": {
    "my-server": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "oauth": {
        "authServerMetadataUrl": "https://auth.example.com/.well-known/openid-configuration"
      }
    }
  }
}
```

- URL은 `https://`를 사용해야 합니다.
- `authServerMetadataUrl`은 Claude Code v2.1.64 이상에서 지원됩니다.
- 메타데이터 URL의 `scopes_supported`가 업스트림 서버가 광고하는 범위를 재정의합니다.

### OAuth 범위 제한 (`oauth.scopes`)

`oauth.scopes`를 설정하여 Claude Code가 인증 흐름 중 요청하는 범위를 고정할 수 있습니다. 업스트림 인증 서버가 허용하려는 것보다 더 많은 범위를 광고할 때, 보안 팀이 승인한 하위 집합으로 MCP 서버를 제한하는 지원되는 방법입니다. 값은 RFC 6749 3.3절의 `scope` 매개변수 형식과 일치하는 공백으로 구분된 단일 문자열입니다.

```json
{
  "mcpServers": {
    "slack": {
      "type": "http",
      "url": "https://mcp.slack.com/mcp",
      "oauth": {
        "scopes": "channels:read chat:write search:read"
      }
    }
  }
}
```

- `oauth.scopes`는 `authServerMetadataUrl`과 서버가 `/.well-known`에서 검색하는 범위 모두보다 우선합니다.
- 인증 서버가 `scopes_supported`에 `offline_access`를 광고하면, Claude Code는 액세스 토큰을 새 브라우저 로그인 없이 갱신할 수 있도록 고정 범위에 `offline_access`를 추가합니다.
- 서버가 나중에 도구 호출에 대해 403 `insufficient_scope`를 반환하면 Claude Code는 동일한 고정 범위로 재인증합니다. 필요한 범위가 고정값을 벗어나면 `oauth.scopes`를 넓히세요.

### 비OAuth 인증 (`headersHelper`)

MCP 서버가 OAuth가 아닌 인증 방식(Kerberos, 단기 토큰, 내부 SSO 등)을 사용하는 경우, `headersHelper`를 사용하여 연결 시점에 요청 헤더를 동적으로 생성할 수 있습니다.

```json
{
  "mcpServers": {
    "internal-api": {
      "type": "http",
      "url": "https://mcp.internal.example.com",
      "headersHelper": "/opt/bin/get-mcp-auth-headers.sh"
    }
  }
}
```

인라인 명령어도 가능합니다:

```json
{
  "mcpServers": {
    "internal-api": {
      "type": "http",
      "url": "https://mcp.internal.example.com",
      "headersHelper": "echo '{\"Authorization\": \"Bearer '\"$(get-token)\"'\"}'"
    }
  }
}
```

**요구 사항**:
- 명령어는 문자열 키-값 쌍의 JSON 객체를 stdout에 출력해야 합니다
- 명령어는 셸에서 10초 타임아웃으로 실행됩니다
- 동적 헤더는 같은 이름의 정적 `headers`를 재정의합니다

`headersHelper`는 각 연결(세션 시작 및 재연결) 시마다 새로 실행됩니다. 캐싱이 없으므로 스크립트가 토큰 재사용을 관리해야 합니다.

Claude Code는 `headersHelper` 실행 시 다음 환경변수를 설정합니다:

| 변수 | 값 |
|------|-----|
| `CLAUDE_CODE_MCP_SERVER_NAME` | MCP 서버 이름 |
| `CLAUDE_CODE_MCP_SERVER_URL` | MCP 서버 URL |

여러 MCP 서버를 지원하는 단일 헬퍼 스크립트를 작성할 수 있습니다.

---

## 19. 도구 검색 (Tool Search) — 지연 로딩

도구 검색은 MCP 도구 정의를 Claude가 필요로 할 때까지 지연시켜 컨텍스트 사용량을 최소화합니다. 세션 시작 시에는 도구 이름과 서버 지침만 로드되므로, MCP 서버를 더 많이 추가해도 컨텍스트 창에 미치는 영향이 최소화됩니다.

### 작동 방식

도구 검색은 기본적으로 활성화되어 있습니다. MCP 도구는 사전에 컨텍스트에 로드되지 않고 지연되며, Claude는 작업에 필요할 때 검색 도구를 사용하여 관련 도구를 발견합니다. Claude가 실제로 사용하는 도구만 컨텍스트에 들어갑니다. 사용자 관점에서 MCP 도구는 이전과 정확히 동일하게 작동합니다.

임계값 기반 로딩을 선호한다면 `ENABLE_TOOL_SEARCH=auto`를 설정하여 스키마가 컨텍스트 창의 10% 이내에 들어오면 사전 로드하고 초과분만 지연시킬 수 있습니다.

### 서버 지침 (Server Instructions) 권장 사항

MCP 서버를 개발하는 경우, 도구 검색이 활성화되면 서버 지침 필드가 더욱 유용해집니다. 서버 지침은 Claude가 도구를 언제 검색해야 하는지 이해하는 데 도움이 되며, 스킬이 작동하는 방식과 유사합니다.

다음 내용을 포함하는 명확하고 설명적인 서버 지침을 추가하세요:

- 서버 도구가 처리하는 작업 범주
- Claude가 서버 도구를 검색해야 하는 시기
- 서버가 제공하는 주요 기능

Claude Code는 도구 설명과 서버 지침을 각각 2KB에서 자릅니다. 잘림을 방지하려면 간결하게 유지하고 중요한 세부 사항은 앞부분에 배치하세요.

### 도구 검색 구성 (`ENABLE_TOOL_SEARCH`)

도구 검색은 기본적으로 활성화되며, MCP 도구는 지연되어 필요 시 발견됩니다. Claude Code는 Vertex AI에서는 기본적으로 비활성화합니다. `ANTHROPIC_BASE_URL`이 자사 호스트가 아닌 다른 호스트를 가리킬 때도 비활성화됩니다. 대부분의 프록시가 `tool_reference` 블록을 전달하지 않기 때문입니다. 두 대체 동작 모두 `ENABLE_TOOL_SEARCH`를 명시적으로 설정하여 재정의할 수 있습니다.

도구 검색은 `tool_reference` 블록을 지원하는 모델이 필요합니다: Sonnet 4 이상 또는 Opus 4 이상. Haiku 모델은 지원하지 않습니다. Vertex AI에서는 Claude Sonnet 4.5 이상 및 Claude Opus 4.5 이상에서 도구 검색이 지원됩니다.

`ENABLE_TOOL_SEARCH` 환경변수로 도구 검색 동작을 제어합니다:

| 값 | 동작 |
|------|------|
| (미설정) | 모든 MCP 도구 지연 및 필요 시 로드. Vertex AI 또는 `ANTHROPIC_BASE_URL`이 자사가 아닌 호스트인 경우 사전 로드로 대체 |
| `true` | 모든 MCP 도구 지연. Vertex AI 및 프록시에서도 베타 헤더 전송. Vertex AI의 Sonnet 4.5/Opus 4.5 이전 모델이나 `tool_reference` 블록을 지원하지 않는 프록시에서는 요청 실패 |
| `auto` | 임계값 모드: 컨텍스트 창의 10% 이내에 들어오면 사전 로드, 초과하면 지연 |
| `auto:N` | 사용자 정의 백분율 임계값 모드. `N`은 0~100. 예: `auto:5`는 5% |
| `false` | 모든 MCP 도구를 사전 로드, 지연 없음 |

```bash
# 5% 커스텀 임계값 사용
ENABLE_TOOL_SEARCH=auto:5 claude

# 도구 검색 완전 비활성화
ENABLE_TOOL_SEARCH=false claude
```

또는 `settings.json`의 `env` 필드에 값을 설정할 수도 있습니다.

`ToolSearch` 도구 자체를 개별적으로 비활성화할 수도 있습니다:

```json
{
  "permissions": {
    "deny": ["ToolSearch"]
  }
}
```

### 서버 지연 로딩 제외 (`alwaysLoad`)

서버의 도구가 검색 단계 없이 항상 Claude에 표시되어야 하는 경우, 서버 구성에서 `alwaysLoad`를 `true`로 설정합니다. 해당 서버의 모든 도구는 `ENABLE_TOOL_SEARCH` 설정과 관계없이 세션 시작 시 컨텍스트에 로드됩니다. Claude가 매 턴마다 필요로 하는 소수의 도구에 사용하세요. 사전 로드되는 각 도구는 대화에 사용할 수 있는 컨텍스트를 소비합니다.

```json
{
  "mcpServers": {
    "core-tools": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "alwaysLoad": true
    }
  }
}
```

`alwaysLoad` 필드는 모든 서버 타입에서 사용 가능하며 Claude Code v2.1.121 이상이 필요합니다. MCP 서버는 개별 도구의 `_meta` 객체에 `"anthropic/alwaysLoad": true`를 포함하여 도구 단위로 항상 로드되도록 표시할 수도 있습니다.

`alwaysLoad: true`를 설정하면 서버가 연결될 때까지 시작이 차단되며, 표준 5초 연결 타임아웃이 적용됩니다. 첫 번째 프롬프트가 구성될 때 도구가 반드시 존재해야 하므로, MCP 시작이 기본적으로 비차단인 경우에도 이 설정은 차단 동작을 적용합니다. 다른 서버는 백그라운드에서 계속 연결됩니다.

---

## 20. Claude.ai 커넥터에서 MCP 서버 사용

Claude.ai 계정으로 Claude Code에 로그인한 경우, Claude.ai에서 추가한 MCP 서버(커넥터)가 Claude Code에서 자동으로 사용 가능합니다.

### 미사용 커넥터 접기 (v2.1.161+)

v2.1.161부터 한 번도 로그인하지 않은 커넥터는 claude.ai 섹션 끝의 `Show unused connectors` 행 뒤에 접혀 표시되어, 조직에서 프로비저닝한 목록이 패널을 채우지 않습니다. 해당 행을 선택하여 펼칠 수 있습니다. 이전에 로그인한 커넥터는 현재 재인증이 필요한 상태라도 계속 표시됩니다.

### 커넥터 로딩 조건

Claude.ai 커넥터는 활성 인증 방법이 Claude.ai 구독인 경우에만 가져옵니다. `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `apiKeyHelper` 또는 Bedrock, Vertex 등 타사 제공자가 활성 상태이면 커넥터가 로드되지 않습니다. 이전에 `/login`을 실행했더라도 마찬가지입니다. `/mcp`에 추가한 커넥터가 표시되지 않으면 `/status`를 실행하여 활성 인증 방법을 확인하고, 해당 환경변수를 해제하거나 `apiKeyHelper` 설정을 제거한 후 `/login`으로 Claude.ai 계정을 선택하세요.

### 호스트별 인증 제한 (v2.1.162+)

일부 Anthropic 호스팅 커넥터(Microsoft 365, Gmail, Google Calendar 등)는 업스트림 ID 제공자가 claude.ai에서 등록한 리디렉트 URL만 수락하므로 Claude Code에서 로컬 OAuth를 지원하지 않습니다. v2.1.162부터 `/mcp`에서 이러한 호스트 중 하나를 인증하면 claude.ai의 Settings > Connectors에서 연결하라는 메시지가 표시됩니다. 연결 후 해당 커넥터는 Claude Code에 자동으로 나타납니다.

### 커넥터 비활성화

Claude.ai MCP 서버를 Claude Code에서 비활성화하려면 `ENABLE_CLAUDEAI_MCP_SERVERS` 환경변수를 `false`로 설정합니다:

```bash
ENABLE_CLAUDEAI_MCP_SERVERS=false claude
```

Claude Code에서 추가한 서버는 동일한 URL을 가리키는 claude.ai 커넥터보다 우선합니다. 이 경우 `/mcp`는 해당 커넥터를 숨김으로 표시하고, 커넥터를 사용하려면 중복을 제거하는 방법을 안내합니다.

---

## 21. MCP Elicitation (유도 요청에 응답)

MCP 서버는 작업 중 사용자에게 구조화된 입력을 요청(유도)할 수 있습니다. 서버가 단독으로 얻을 수 없는 정보가 필요할 때, Claude Code는 대화형 대화상자를 표시하고 사용자의 응답을 서버에 다시 전달합니다. 별도의 구성이 필요하지 않으며, 서버가 요청하면 유도 대화상자가 자동으로 나타납니다.

### 요청 모드

서버는 두 가지 방식으로 입력을 요청할 수 있습니다:

- **폼 모드 (Form mode)**: Claude Code가 서버가 정의한 양식 필드가 있는 대화상자를 표시합니다(예: 사용자 이름 및 비밀번호 프롬프트). 필드를 채우고 제출하세요.
- **URL 모드 (URL mode)**: Claude Code가 인증 또는 승인을 위해 브라우저 URL을 엽니다. 브라우저에서 흐름을 완료한 후 CLI에서 확인합니다.

### 자동 응답 (Elicitation Hook)

대화상자를 표시하지 않고 유도 요청에 자동으로 응답하려면 `Elicitation` 훅을 사용하세요.

MCP 서버를 개발 중이고 유도를 사용하는 경우, 프로토콜 세부 사항과 스키마 예제는 [MCP elicitation 사양](https://modelcontextprotocol.io/specification/2025-03-26/basic/elicitation)을 참조하세요.
