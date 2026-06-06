# MCP 서버 통합 가이드: Claude Code vs Codex

> MCP (Model Context Protocol): AI 에이전트가 외부 도구와 데이터에 접근할 수 있게 하는 개방형 프로토콜
> 공식 사이트: https://modelcontextprotocol.io

## 목차

- [MCP 개요](#mcp-개요)
- [Claude Code MCP 통합](#claude-code-mcp-통합)
- [Codex MCP 통합](#codex-mcp-통합)
- [비교 분석](#비교-분석)
- [MCP 서버 개발](#mcp-서버-개발)
- [실전 예제](#실전-예제)

---

## MCP 개요

MCP (Model Context Protocol)는 AI 에이전트가 외부 도구, 데이터 소스, 서비스에 안전하게 접근할 수 있게 하는 **개방형 표준 프로토콜**입니다.

```
┌─────────────┐     MCP      ┌─────────────┐
│  AI 에이전트  │◄───────────►│  MCP 서버    │
│ (Claude/Codex)│             │  (도구 제공)  │
└─────────────┘              └──────┬──────┘
                                    │
                              ┌─────┴─────┐
                              │ 외부 서비스  │
                              │ (DB, API)  │
                              └───────────┘
```

### MCP 서버가 제공하는 기능

| 기능 | 설명 |
|------|------|
| **Tools** | 에이전트가 호출할 수 있는 함수 |
| **Resources** | 에이전트가 읽을 수 있는 데이터 |
| **Prompts** | 재사용 가능한 프롬프트 템플릿 |

---

## Claude Code MCP 통합

### 설정 방법

#### 1. 독립 설정 파일 (.mcp.json)

```json
{
  "mcpServers": {
    "my-database": {
      "command": "node",
      "args": ["mcp-db-server.js"],
      "env": {
        "DB_URL": "${DATABASE_URL}"
      }
    },
    "my-api": {
      "command": "python",
      "args": ["-m", "my_mcp_server"],
      "env": {
        "API_KEY": "${MY_API_KEY}"
      }
    }
  }
}
```

#### 2. plugin.json 내 포함

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "데이터베이스 플러그인",
  "mcpServers": {
    "my-database": {
      "command": "node",
      "args": ["server.js"],
      "env": {
        "DB_URL": "${DATABASE_URL}"
      }
    }
  }
}
```

#### 3. settings.json

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
    }
  }
}
```

### Claude Code MCP 특징

| 특징 | 설명 |
|------|------|
| **전송 방식** | stdio (command/args) |
| **모드** | 클라이언트 전용 |
| **환경변수** | `${VAR}` 형식으로 참조 |
| **설정 위치** | .mcp.json, plugin.json, settings.json |
| **플러그인 포함** | plugin.json의 `mcpServers` 필드 |

### Claude Code MCP 설정 파일 위치

| 파일 | 위치 | 스코프 |
|------|------|--------|
| `.mcp.json` | 프로젝트 루트 | 프로젝트 |
| `.claude/settings.json` | 프로젝트/.claude/ | 프로젝트 |
| `~/.claude/settings.json` | 홈 디렉토리 | 사용자 전역 |
| `plugin.json` | 플러그인 내 | 플러그인 |

---

## Codex MCP 통합

### 설정 방법 (config.toml)

#### 1. stdio 전송

```toml
[mcpServers.my-database]
command = "node"
args = ["mcp-db-server.js"]
startup_timeout_sec = 30
tool_timeout_sec = 60

[mcpServers.my-database.env]
DB_URL = "${DATABASE_URL}"
```

#### 2. Streamable HTTP 전송

```toml
[mcpServers.remote-api]
url = "https://mcp.example.com/sse"
scopes = ["read", "write"]
oauth_resource = "https://api.example.com"
mcp_oauth_callback_port = 8080
experimental_environment = { NODE_ENV = "production" }
```

#### 3. OAuth 설정

```toml
[mcpServers.google-drive]
url = "https://mcp.google.com/drive"
scopes = ["https://www.googleapis.com/auth/drive.readonly"]
oauth_resource = "https://www.googleapis.com"
mcp_oauth_callback_port = 9090
mcp_oauth_callback_url = "https://custom-callback.example.com"
```

### Codex MCP 서버 모드 (실험적)

Codex는 **자체를 MCP 서버로 실행**하여 다른 에이전트의 도구로 노출할 수 있습니다:

```bash
# Codex를 MCP 서버로 실행
codex mcp-server

# 다른 에이전트에서 연결
# config에 codex 서버를 MCP 서버로 등록
```

> ⚠️ 이 기능은 공식 문서에서 "experimental"로 표기되어 있어 API가 변경될 수 있습니다.

### Codex MCP 승인 제어

#### 서버별 승인 모드

```toml
[mcpServers.my-server]
command = "node"
args = ["server.js"]

[mcpServers.my-server.approval]
mode = "per-server"              # "per-server" | "per-tool"
```

#### 도구 허용/거부 목록

```toml
[mcpServers.my-server.approval]
enabled_tools = ["read_file", "search", "write_file"]
disabled_tools = ["delete_file", "execute"]
```

#### per-tool 승인 오버라이드

```toml
[mcpServers.my-server.approval.tools.read_file]
require_approval = false          # 자동 승인

[mcpServers.my-server.approval.tools.write_file]
require_approval = true           # 승인 필요

[mcpServers.my-server.approval.tools.delete_file]
require_approval = true           # 승인 필요
```

#### 타임아웃 설정

```toml
[mcpServers.my-server]
startup_timeout_sec = 30          # 서버 시작 타임아웃
tool_timeout_sec = 60             # 도구 호출 타임아웃
```

### Codex MCP 특징

| 특징 | 설명 |
|------|------|
| **전송 방식** | stdio (command/args) + Streamable HTTP (url) |
| **모드** | 클라이언트 + 서버 (실험적) |
| **OAuth** | scopes, resource, callback 포트/URL 오버라이드 지원 |
| **승인 제어** | per-server, per-tool, 허용/거부 목록 |
| **타임아웃** | 시작/도구별 개별 설정 |
| **환경변수** | `[mcpServers.*.env]` 섹션 |
| **원격 배치** | HTTP URL로 원격 MCP 서버 연결 |

---

## 비교 분석

### 기능 비교표

| 기능 | Claude Code | Codex |
|------|:-----------:|:-----:|
| **stdio 전송** | ✅ | ✅ |
| **HTTP 전송** | ❌ | ✅ |
| **OAuth 인증** | ❌ | ✅ |
| **서버 모드** | ❌ | ✅ (실험적) |
| **환경변수** | ✅ | ✅ |
| **per-server 승인** | ❌ | ✅ |
| **per-tool 승인** | ❌ | ✅ |
| **도구 허용 목록** | ❌ | ✅ |
| **도구 거부 목록** | ❌ | ✅ |
| **시작 타임아웃** | ❌ | ✅ |
| **도구 타임아웃** | ❌ | ✅ |
| **플러그인 포함** | ✅ | ✅ |
| **원격 서버** | ❌ | ✅ |

### 아키텍처 비교

```
Claude Code MCP 아키텍처:
┌──────────┐   stdio   ┌──────────┐
│  Claude  │──────────►│MCP Server│──► 외부 서비스
│  Code    │           └──────────┘
└──────────┘
(클라이언트 전용)

Codex MCP 아키텍처:
┌──────────┐   stdio   ┌──────────┐
│  Codex   │──────────►│MCP Server│──► 외부 서비스
│  CLI     │           └──────────┘
│          │   HTTP    ┌──────────┐
│          │──────────►│Remote MCP│──► 클라우드 서비스
│          │  (OAuth)  └──────────┘
│          │
│  MCP     │   stdio   ┌──────────┐
│  Server  │◄──────────│ 다른     │
│  Mode    │           │ 에이전트  │
└──────────┘           └──────────┘
(클라이언트 + 서버)
```

---

## MCP 서버 개발

### 기본 MCP 서버 (Node.js)

```javascript
// server.js
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  { name: "my-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// 도구 등록
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "read_data",
      description: "데이터를 읽습니다",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "검색 쿼리" }
        },
        required: ["query"]
      }
    }
  ]
}));

// 도구 실행
server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "read_data") {
    const { query } = request.params.arguments;
    return {
      content: [{ type: "text", text: `검색 결과: ${query}` }]
    };
  }
});

// 서버 시작
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Claude Code 플러그인으로 패키징

```
my-mcp-plugin/
├── .claude-plugin/
│   └── plugin.json
├── .mcp.json              # 또는 plugin.json 내 mcpServers
├── server.js
└── package.json
```

```json
// .claude-plugin/plugin.json
{
  "name": "my-mcp-plugin",
  "version": "1.0.0",
  "description": "커스텀 MCP 서버 플러그인",
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["server.js"],
      "env": {
        "API_KEY": "${MY_API_KEY}"
      }
    }
  }
}
```

### Codex 플러그인으로 패키징

```
my-mcp-plugin/
├── .codex-plugin/
│   └── plugin.json
├── server.js
└── package.json
```

```json
// .codex-plugin/plugin.json
{
  "name": "my-mcp-plugin",
  "version": "1.0.0",
  "components": {
    "mcpServers": {
      "my-server": {
        "command": "node",
        "args": ["server.js"],
        "startup_timeout_sec": 30,
        "tool_timeout_sec": 60,
        "approval": {
          "mode": "per-tool",
          "enabled_tools": ["read_data"],
          "disabled_tools": ["delete_data"],
          "tools": {
            "read_data": { "require_approval": false },
            "delete_data": { "require_approval": true }
          }
        }
      }
    }
  }
}
```

---

## 실전 예제

### 예제 1: 파일시스템 MCP 서버

**Claude Code 설정 (.mcp.json)**

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"]
    }
  }
}
```

**Codex 설정 (config.toml)**

```toml
[mcpServers.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"]
startup_timeout_sec = 15
tool_timeout_sec = 30
```

### 예제 2: 원격 API MCP 서버 (Codex 전용)

```toml
[mcpServers.github-api]
url = "https://mcp.github.com/api"
scopes = ["repo", "read:org"]
oauth_resource = "https://api.github.com"
mcp_oauth_callback_port = 8080

[mcpServers.github-api.approval]
mode = "per-tool"
enabled_tools = ["search_code", "read_file", "create_issue"]
disabled_tools = ["delete_repo"]

[mcpServers.github-api.approval.tools.create_issue]
require_approval = true

[mcpServers.github-api.approval.tools.search_code]
require_approval = false
```

### 예제 3: Codex를 MCP 서버로 노출 (실험적)

```bash
# 터미널 1: Codex를 MCP 서버로 실행
codex mcp-server --port 3000

# 터미널 2: 다른 에이전트에서 사용
# (다른 AI 도구의 MCP 설정에 추가)
# url: http://localhost:3000
```

---

## 참고 소스

- [MCP 공식 문서 - 서버 빌드](https://modelcontextprotocol.io/docs/develop/build-server)
- [Anthropic MCP 문서](https://docs.anthropic.com/en/docs/claude-code/mcp)
- [OpenAI Codex Config Reference](https://developers.openai.com/codex/config-reference)
- [GitHub: openai/codex README](https://github.com/openai/codex/blob/main/codex-rs/README.md)
- [GitHub: config.schema.json](https://github.com/openai/codex/blob/main/codex-rs/core/config.schema.json)
