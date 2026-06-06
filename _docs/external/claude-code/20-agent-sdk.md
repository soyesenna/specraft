# Claude Code Agent SDK

> 공식 프로그래밍 SDK — TypeScript/Python으로 Claude Code 에이전트 빌드

**원문**: https://code.claude.com/docs/en/agent-sdk/overview (및 하위 페이지 전체)

> **2026년 6월 15일 공지**: 구독 플랜에서 Agent SDK 및 `claude -p` 사용량이 기존 대화형 사용량 한도와 분리된 새로운 월간 Agent SDK 크레딧에서 차감된다. 자세한 내용은 Claude 플랜별 Agent SDK 사용 가이드를 참조.

---

## 1. 개요

Agent SDK는 Claude Code를 라이브러리로 사용하여 프로덕션급 AI 에이전트를 빌드할 수 있게 해주는 공식 SDK다. Python과 TypeScript를 지원하며, 파일 읽기, 명령어 실행, 코드 편집, 웹 검색 등을 자율적으로 수행하는 에이전트를 프로그래밍 방식으로 제어할 수 있다.

### 핵심 특징

| 특징 | 설명 |
| --- | --- |
| 내장 도구 | Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, Monitor 등 |
| 언어 지원 | TypeScript (`@anthropic-ai/claude-agent-sdk`), Python (`claude-agent-sdk`) |
| 인증 | Anthropic API Key, Amazon Bedrock, Vertex AI, Azure AI Foundry |
| 에이전트 루프 | 자율적 도구 호출 루프 (Claude Code CLI와 동일) |
| 서브에이전트 | 프로그래밍 방식으로 하위 에이전트 정의 및 실행 |
| MCP 통합 | Model Context Protocol 서버 연동 |
| 커스텀 도구 | 인프로세스 MCP 서버로 커스텀 함수 등록 |
| 권한 제어 | 세분화된 권한 모드 및 규칙 |
| 세션 관리 | 세션 생성, 재개, 포크, 외부 스토리지 영속화 |
| 훅 시스템 | 에이전트 라이프사이클 이벤트에 콜백 등록 |

### 다른 Claude 도구와의 비교

| 구분 | Agent SDK | Client SDK | Claude Code CLI | Managed Agents |
| --- | --- | --- | --- | --- |
| 실행 환경 | 사용자 프로세스 | 사용자 프로세스 | 터미널 | Anthropic 관리 인프라 |
| 인터페이스 | Python/TypeScript 라이브러리 | API 직접 호출 | CLI | REST API |
| 도구 실행 | 자동 (내장) | 수동 구현 | 자동 (내장) | Claude가 트리거, 사용자가 실행·반환 |
| 세션 상태 | 로컬 파일시스템 JSONL | 해당 없음 | 로컬 파일시스템 | Anthropic 호스팅 이벤트 로그 |
| 적합한 용도 | 프로덕션 자동화, CI/CD | 저수준 API 제어 | 대화형 개발 | 호스팅 샌드박스, 장기 실행 에이전트 |

---

## 2. 빠른 시작

### 전제 조건

- Node.js 18+ (TypeScript) 또는 Python 3.10+ (Python)
- Anthropic 계정 및 API Key

### 설치

| 언어 | 명령어 |
| --- | --- |
| TypeScript | `npm install @anthropic-ai/claude-agent-sdk` |
| Python | `pip install claude-agent-sdk` |

TypeScript SDK는 플랫폼별 네이티브 Claude Code 바이너리를 선택적 의존성으로 번들하므로 Claude Code를 별도로 설치할 필요가 없다.

### API Key 설정

```bash
export ANTHROPIC_API_KEY=your-api-key
```

서드파티 프로바이더 인증:

| 프로바이더 | 환경 변수 |
| --- | --- |
| Amazon Bedrock | `CLAUDE_CODE_USE_BEDROCK=1` + AWS 자격증명 |
| Vertex AI | `CLAUDE_CODE_USE_VERTEX=1` + Google Cloud 자격증명 |
| Azure AI Foundry | `CLAUDE_CODE_USE_FOUNDRY=1` + Azure 자격증명 |
| Claude Platform on AWS | `CLAUDE_CODE_USE_ANTHROPIC_AWS=1` + AWS 자격증명 |

### 첫 번째 에이전트 실행

**Python**

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="What files are in this directory?",
        options=ClaudeAgentOptions(allowed_tools=["Bash", "Glob"]),
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

**TypeScript**

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "What files are in this directory?",
  options: { allowedTools: ["Bash", "Glob"] },
})) {
  if ("result" in message) console.log(message.result);
}
```

### 권한 모드 요약

| 모드 | 동작 | 사용 사례 |
| --- | --- | --- |
| `acceptEdits` | 파일 편집 및 파일시스템 명령 자동 승인 | 신뢰된 개발 워크플로 |
| `dontAsk` | `allowedTools` 외의 모든 요청 거부 | 잠긴 헤드리스 에이전트 |
| `auto` (TS만) | 모델 분류기가 승인/거부 결정 | 안전 가드레일이 있는 자율 에이전트 |
| `bypassPermissions` | 모든 권한 프롬프트 생략 | 샌드박스 CI, 완전 신뢰 환경 |
| `default` | `canUseTool` 콜백으로 승인 처리 | 커스텀 승인 플로우 |
| `plan` | 읽기 전용 도구만 실행 | 코드 수정 없이 분석/계획 |

---

## 3. TypeScript SDK

### 설치

```bash
npm install @anthropic-ai/claude-agent-sdk
```

### 핵심 함수

| 함수 | 설명 |
| --- | --- |
| `query()` | 메인 함수. AsyncGenerator로 메시지를 스트리밍 |
| `startup()` | CLI 서브프로세스를 미리 준비 (pre-warm) |
| `tool()` | 타입 안전 MCP 도구 정의 (Zod 스키마) |
| `createSdkMcpServer()` | 인프로세스 MCP 서버 생성 |
| `listSessions()` | 과거 세션 목록 조회 |
| `getSessionMessages()` | 세션 메시지 읽기 |
| `getSessionInfo()` | 단일 세션 메타데이터 조회 |
| `renameSession()` | 세션 제목 변경 |
| `tagSession()` | 세션 태그 설정 |
| `resolveSettings()` | 설정 병합 결과 조회 (Alpha) |

### `query()` 시그니처

```typescript
function query({
  prompt,
  options
}: {
  prompt: string | AsyncIterable<SDKUserMessage>;
  options?: Options;
}): Query;
```

### `Options` 주요 필드

| 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `allowedTools` | `string[]` | `[]` | 자동 승인할 도구 목록 |
| `disallowedTools` | `string[]` | `[]` | 항상 거부할 도구. `bypassPermissions`에서도 적용 |
| `permissionMode` | `PermissionMode` | `'default'` | 권한 모드 |
| `canUseTool` | `CanUseTool` | `undefined` | 커스텀 권한 콜백 |
| `model` | `string` | CLI 기본값 | 사용할 모델 |
| `fallbackModel` | `string` | `undefined` | 주 모델 실패 시 폴백 모델 |
| `maxTurns` | `number` | `undefined` | 최대 도구 사용 턴 수 |
| `maxBudgetUsd` | `number` | `undefined` | 최대 비용 (USD) |
| `effort` | `'low'/'medium'/'high'/'xhigh'/'max'` | `'high'` | 추론 노력 수준 |
| `systemPrompt` | `string \| {type:'preset', preset:'claude_code', append?, excludeDynamicSections?}` | `undefined` | 시스템 프롬프트 |
| `mcpServers` | `Record<string, McpServerConfig>` | `{}` | MCP 서버 설정 |
| `agents` | `Record<string, AgentDefinition>` | `undefined` | 프로그래밍 방식 서브에이전트 |
| `hooks` | `Partial<Record<HookEvent, HookCallbackMatcher[]>>` | `{}` | 훅 콜백 |
| `settingSources` | `SettingSource[]` | CLI 기본값 (전체) | 파일시스템 설정 소스. `[]`로 전체 비활성화 가능 |
| `cwd` | `string` | `process.cwd()` | 작업 디렉토리 |
| `resume` | `string` | `undefined` | 재개할 세션 ID |
| `forkSession` | `boolean` | `false` | `resume` 시 새 세션 ID로 분기 |
| `sandbox` | `SandboxSettings` | `undefined` | 샌드박스 설정 |
| `plugins` | `SdkPluginConfig[]` | `[]` | 플러그인 설정 |
| `thinking` | `ThinkingConfig` | `{type:'adaptive'}` | 확장 사고 설정 |
| `tools` | `string[] \| {type:'preset', preset:'claude_code'}` | `undefined` | 도구 가용성 제어 |
| `toolConfig` | `ToolConfig` | `undefined` | 내장 도구 동작 설정 |
| `includePartialMessages` | `boolean` | `false` | 스트리밍 부분 메시지 포함 |
| `promptSuggestions` | `boolean` | `false` | 턴 후 프롬프트 예측 제안 |
| `persistSession` | `boolean` | `true` | `false` 시 디스크 세션 영속화 비활성화 |
| `strictMcpConfig` | `boolean` | `false` | `mcpServers`만 사용, 프로젝트 `.mcp.json` 등 무시 |
| `outputFormat` | `{type: 'json_schema', schema: JSONSchema}` | `undefined` | 구조화된 출력 형식 |
| `sessionStore` | `SessionStore` | `undefined` | 외부 세션 스토리지 백엔드 |
| `enableFileCheckpointing` | `boolean` | `false` | 파일 변경 추적 및 복원 활성화 |
| `continue` | `boolean` | `false` | 가장 최근 대화 계속 |
| `env` | `Record<string, string>` | `process.env` | 환경 변수 |
| `betas` | `SdkBeta[]` | `[]` | 베타 기능 활성화 |
| `agent` | `string` | `undefined` | 메인 스레드 에이전트 이름 |

### `startup()` — Pre-warm

```typescript
import { startup } from "@anthropic-ai/claude-agent-sdk";
const warm = await startup({ options: { maxTurns: 3 } });
for await (const message of warm.query("What files are here?")) {
  console.log(message);
}
```

### Query 객체 메서드

`query()` 반환값은 `AsyncGenerator<SDKMessage>`를 확장한 `Query` 객체.

| 메서드 | 설명 |
| --- | --- |
| `interrupt()` | 쿼리 중단 (스트리밍 입력 모드만) |
| `rewindFiles(userMessageId, opts?)` | 파일 복원. `enableFileCheckpointing: true` 필요 |
| `setPermissionMode(mode)` | 권한 모드 변경 (스트리밍 입력 모드만) |
| `setModel(model?)` | 모델 변경 (스트리밍 입력 모드만) |
| `initializationResult()` | 전체 초기화 결과 (명령어, 모델, 계정 정보 등) |
| `supportedCommands()` | 슬래시 명령어 목록 |
| `supportedModels()` | 모델 목록 |
| `supportedAgents()` | 서브에이전트 목록 |
| `mcpServerStatus()` | MCP 서버 상태 |
| `accountInfo()` | 계정 정보 (이메일, 조직, 구독 유형) |
| `reconnectMcpServer(name)` | MCP 서버 재연결 |
| `toggleMcpServer(name, enabled)` | MCP 서버 토글 |
| `setMcpServers(servers)` | MCP 서버 동적 교체 (추가/제거/오류 결과 반환) |
| `streamInput(stream)` | 스트리밍 입력 |
| `stopTask(taskId)` | 백그라운드 태스크 중단 |
| `close()` | 쿼리 종료 및 프로세스 정리 |

### 메시지 타입 (30+)

| 타입 | 설명 |
| --- | --- |
| `SDKAssistantMessage` | Claude의 응답 (텍스트 + 도구 호출) |
| `SDKUserMessage` | 사용자 입력 / 도구 결과 |
| `SDKResultMessage` | 최종 결과 (비용, 사용량, 세션 ID, `deferred_tool_use`) |
| `SDKSystemMessage` | 세션 초기화 메타데이터 |
| `SDKPartialAssistantMessage` | 스트리밍 부분 메시지 (`type: 'stream_event'`) |
| `SDKCompactBoundaryMessage` | 컨텍스트 압축 경계 |
| `SDKStatusMessage` | 상태 업데이트 (예: compacting) |
| `SDKPluginInstallMessage` | 플러그인 설치 진행 |
| `SDKPermissionDeniedMessage` | 권한 자동 거부 이벤트 |
| `SDKTaskNotificationMessage` | 백그라운드 태스크 완료/실패/중단 |
| `SDKTaskStartedMessage` | 백그라운드 태스크 시작 |
| `SDKTaskProgressMessage` | 서브에이전트 진행 (agentProgressSummaries 시 summary 포함) |
| `SDKTaskUpdatedMessage` | 태스크 상태 변경 |
| `SDKToolProgressMessage` | 도구 실행 진행 |
| `SDKToolUseSummaryMessage` | 도구 사용 요약 |
| `SDKHookStartedMessage` | 훅 실행 시작 |
| `SDKHookProgressMessage` | 훅 stdout/stderr |
| `SDKHookResponseMessage` | 훅 실행 완료 |
| `SDKAuthStatusMessage` | 인증 플로우 |
| `SDKFilesPersistedEvent` | 파일 체크포인트 영속화 |
| `SDKRateLimitEvent` | 속도 제한 상태 |
| `SDKCommandsChangedMessage` | 세션 중 명령어 세트 변경 |
| `SDKPromptSuggestionMessage` | 프롬프트 예측 제안 |
| `SDKUserMessageReplay` | 재생된 사용자 메시지 |

### ThinkingConfig

```typescript
type ThinkingConfig =
  | { type: "adaptive"; display?: "summarized" | "omitted" }
  | { type: "enabled"; budgetTokens?: number; display?: "summarized" | "omitted" }
  | { type: "disabled" };
```

`display`: Claude Opus 4.7+ 기본값은 `"omitted"`. 사고 콘텐츠 수신하려면 `"summarized"` 설정.

> **Breaking change**: Opus 4.7에서 `thinking.type` 기본값이 `"adaptive"`로 변경. SDK v0.2.111+ 필요.

### Beta 기능 — context-1m-2025-08-07 retired

`context-1m-2025-08-07` 베타는 **2026년 4월 30일부로 폐기**. Sonnet 4.5/Sonnet 4에서 전달해도 무효. 1M 컨텍스트를 사용하려면 Sonnet 4.6, Opus 4.6, Opus 4.7로 마이그레이션 (베타 헤더 불필요).

### ToolConfig

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `askUserQuestion.previewFormat` | `'markdown' \| 'html'` | `AskUserQuestion`의 `preview` 필드 활성화 및 형식 설정 |

### extractFromBunfs() — 단일 실행파일 컴파일

`bun build --compile` 시 번들된 CLI 바이너리를 추출. SDK v0.3.144+ 필요.

```typescript
import binPath from "@anthropic-ai/claude-agent-sdk-darwin-arm64/claude" with { type: "file" };
import { extractFromBunfs } from "@anthropic-ai/claude-agent-sdk/extract";
const cliPath = extractFromBunfs(binPath); // 컴파일 외부에서는 입력 경로 그대로 반환
```

### 메시지 타입 확인

```typescript
if (message.type === "result" && message.subtype === "success") {
  console.log(message.result);
}
```

---

## 4. Python SDK

### 설치

```bash
pip install claude-agent-sdk
```

Python 3.10 이상 필요.

### `query()` vs `ClaudeSDKClient`

| 기능 | `query()` | `ClaudeSDKClient` |
| --- | --- | --- |
| 세션 | 호출마다 새 세션 | 동일 세션 유지 |
| 인터럽트 | 미지원 | 지원 |
| 커스텀 도구/훅 | 지원 | 지원 |
| 적합한 용도 | 일회성 작업 | 연속 대화, 채팅 인터페이스 |

### `query()` 사용

```python
options = ClaudeAgentOptions(system_prompt="Expert Python dev", permission_mode="acceptEdits")
async for message in query(prompt="Create a web server", options=options):
    print(message)
```

### `ClaudeSDKClient` — 연속 대화

```python
async with ClaudeSDKClient() as client:
    await client.query("Capital of France?")
    async for message in client.receive_response():
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock): print(block.text)
    await client.query("Population?")  # 동일 세션 문맥
    async for message in client.receive_response():
        ...
```

### `ClaudeSDKClient` 메서드

| 메서드 | 설명 |
| --- | --- |
| `connect(prompt)` | 연결 및 초기 프롬프트 전송 |
| `query(prompt)` | 새 요청 전송 |
| `receive_messages()` | 모든 메시지 수신 |
| `receive_response()` | ResultMessage까지 수신 |
| `interrupt()` | 실행 중단 |
| `set_permission_mode(mode)` | 권한 모드 변경 |
| `set_model(model)` | 모델 변경 |
| `rewind_files(user_message_id)` | 파일 상태 복원 |
| `get_mcp_status()` | MCP 서버 상태 |
| `reconnect_mcp_server(name)` | MCP 서버 재연결 |
| `toggle_mcp_server(name, enabled)` | MCP 서버 토글 |
| `stop_task(task_id)` | 백그라운드 태스크 중단 |
| `get_server_info()` | 서버 정보 (세션 ID, 기능 등) |
| `disconnect()` | 연결 종료 |

### `ClaudeAgentOptions` 주요 필드

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `allowed_tools` | `list[str]` | 자동 승인할 도구 |
| `disallowed_tools` | `list[str]` | 차단할 도구 |
| `permission_mode` | `PermissionMode` | 권한 모드 |
| `model` | `str \| None` | 사용할 모델 |
| `max_turns` | `int \| None` | 최대 턴 수 |
| `max_budget_usd` | `float \| None` | 최대 비용 (USD) |
| `effort` | `Literal["low", "medium", "high", "max"]` | 추론 노력 수준 |
| `system_prompt` | `str \| SystemPromptPreset` | 시스템 프롬프트 |
| `mcp_servers` | `dict[str, McpServerConfig]` | MCP 서버 설정 |
| `agents` | `dict[str, AgentDefinition]` | 서브에이전트 정의 |
| `hooks` | `dict[HookEvent, list[HookMatcher]]` | 훅 설정 |
| `setting_sources` | `list[SettingSource] \| None` | 설정 소스 제어. 생략 시 아무 설정도 로드하지 않음 (Python SDK 기본값: `None`) |
| `cwd` | `str \| Path` | 작업 디렉토리 |
| `resume` | `str \| None` | 재개할 세션 ID |
| `sandbox` | `SandboxSettings` | 샌드박스 설정 |
| `thinking` | `ThinkingConfig` | 확장 사고 설정 |
| `skills` | `list[str] \| Literal["all"]` | 활성 스킬 |
| `session_store` | `SessionStore` | 외부 세션 스토리지 |

---

## 5. 에이전트 루프

### 아키텍처

프롬프트 수신 -> Claude 평가/응답 -> 도구 실행 -> 도구 호출 없을 때까지 반복 -> `ResultMessage` 반환

### 루프 제어

| 옵션 | 설명 | 기본값 |
| --- | --- | --- |
| `max_turns` / `maxTurns` | 최대 도구 사용 턴 수 | 제한 없음 |
| `max_budget_usd` / `maxBudgetUsd` | 최대 비용 임계치 (USD) | 제한 없음 |
| `effort` | 추론 노력 수준 | TS: `'high'`, Py: 모델 기본값 |

### 노력 수준

| 수준 | 동작 | 적합한 용도 |
| --- | --- | --- |
| `low` | 최소 추론, 빠른 응답 | 파일 조회, 디렉토리 나열 |
| `medium` | 균형 잡힌 추론 | 일반 편집, 표준 작업 |
| `high` | 철저한 분석 | 리팩토링, 디버깅 |
| `xhigh` | 확장된 추론 깊이 (TS만) | 코딩/에이전트 작업, Opus 4.7 권장 |
| `max` | 최대 추론 깊이 | 심층 분석이 필요한 다단계 문제 |

### ResultMessage 하위타입

| 하위타입 | 의미 | `result` 필드 |
| --- | --- | --- |
| `success` | 정상 완료 | 있음 |
| `error_max_turns` | `maxTurns` 한계 도달 | 없음 |
| `error_max_budget_usd` | `maxBudgetUsd` 한계 도달 | 없음 |
| `error_during_execution` | 실행 중 오류 | 없음 |
| `error_max_structured_output_retries` | 구조화된 출력 검증 실패 | 없음 |

### 컨텍스트 윈도우

컨텍스트는 턴 간 누적. 한계 근접 시 자동 **compaction**. 절감: 서브에이전트 활용, 도구 최소화, 낮은 `effort`.

---

## 6. 커스텀 도구

### 도구 정의 (TypeScript)

```typescript
import { tool, createSdkMcpServer, query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const getTemperature = tool(
  "get_temperature", "Get temperature for a location",
  { latitude: z.number(), longitude: z.number() },
  async ({ latitude, longitude }) => {
    return { content: [{ type: "text", text: `Temperature: 22°C` }] };
  }
);

const weatherServer = createSdkMcpServer({ name: "weather", tools: [getTemperature] });

for await (const message of query({
  prompt: "Weather at lat 37.5, lon 127?",
  options: { mcpServers: { weather: weatherServer }, allowedTools: ["mcp__weather__get_temperature"] },
})) { console.log(message); }
```

### 도구 어노테이션

| 필드 | 타입 | 기본값 | 의미 |
| --- | --- | --- | --- |
| `title` | `string` | `undefined` | 도구의 사용자 친화적 제목 |
| `readOnlyHint` | `boolean` | `false` | 환경 수정하지 않음 (병렬 실행 가능) |
| `destructiveHint` | `boolean` | `true` | 파괴적 업데이트 가능 |
| `idempotentHint` | `boolean` | `false` | 동일 인자 반복 호출 시 추가 효과 없음 |
| `openWorldHint` | `boolean` | `true` | 외부 시스템과 상호작용 |

### 도구 이름 형식

`mcp__{server_name}__{tool_name}` (예: `mcp__weather__get_temperature`)

### 에러 처리

| 상황 | 결과 |
| --- | --- |
| 핸들러 미처리 예외 | 에이전트 루프 중단 |
| 핸들러 `isError: true` 반환 | 루프 계속, Claude가 에러를 데이터로 처리 |

---

## 7. 구조화된 출력

`outputFormat` (TS) / `output_format` (Py) 옵션 사용:

```python
options = ClaudeAgentOptions(
    output_format={
        "type": "json_schema",
        "schema": {
            "type": "object",
            "properties": {"name": {"type": "string"}, "year": {"type": "integer"}},
            "required": ["name", "year"],
        },
    },
)
```

| 하위타입 | 의미 |
| --- | --- |
| `success` | 출력 생성 및 검증 성공 |
| `error_max_structured_output_retries` | 유효한 출력 생성 불가 |

---

## 8. 스트리밍

`includePartialMessages` / `include_partial_messages`를 `true`로 설정 시 `StreamEvent` 수신.

### 스트리밍 이벤트 흐름

```
StreamEvent (message_start) → content_block_delta (text_delta) → message_stop → AssistantMessage → ... → ResultMessage
```

### 제한 사항

- 확장 사고(`maxThinkingTokens`) 활성화 시 `StreamEvent` 미발생
- 구조화된 출력은 `ResultMessage.structured_output`에서만 확인 가능

---

## 9. 마이그레이션 가이드

| 항목 | 기존 | 신규 |
| --- | --- | --- |
| TS 패키지 | `@anthropic-ai/claude-code` | `@anthropic-ai/claude-agent-sdk` |
| Py 패키지 | `claude-code-sdk` | `claude-agent-sdk` |
| Py 옵션 | `ClaudeCodeOptions` | `ClaudeAgentOptions` |

```bash
# TypeScript
npm uninstall @anthropic-ai/claude-code && npm install @anthropic-ai/claude-agent-sdk
# Python
pip uninstall claude-code-sdk && pip install claude-agent-sdk
```

---

## 10. 세션 관리

각 `query()` 호출은 세션을 생성하거나 계속. `ResultMessage.session_id`로 재개.

```python
async for message in query(prompt="Read auth module", options=ClaudeAgentOptions(allowed_tools=["Read"])):
    if isinstance(message, SystemMessage) and message.subtype == "init":
        session_id = message.data["session_id"]
async for message in query(prompt="Find callers", options=ClaudeAgentOptions(resume=session_id)):
    if isinstance(message, ResultMessage): print(message.result)
```

`forkSession: true`로 원본 세션 보존하며 분기. `sessionStore`로 외부 백엔드 미러링.

| 함수 | 설명 |
| --- | --- |
| `listSessions()` | 과거 세션 목록 |
| `getSessionMessages()` | 세션 메시지 읽기 |
| `getSessionInfo()` | 세션 메타데이터 |
| `renameSession()` | 세션 제목 변경 |
| `tagSession()` | 세션 태그 설정 |

---

## 11. MCP 통합

### MCP 서버 추가

```python
# stdio
options = ClaudeAgentOptions(mcp_servers={"playwright": {"command": "npx", "args": ["@playwright/mcp@latest"]}})
```

```typescript
// HTTP
options: { mcpServers: { "remote-api": { type: "http", url: "https://api.example.com/mcp" } } }
```

### 전송 타입

| 타입 | 시나리오 |
| --- | --- |
| `stdio` | 로컬 프로세스 (npx, python 등) |
| `http` | 클라우드 MCP 서버 |
| `sse` | SSE 기반 원격 API |
| `sdk` | 인프로세스 SDK MCP 서버 |

---

## 12. 스킬

```python
options = ClaudeAgentOptions(skills=["all"])  # 또는 skills=["code-review"]
```

| 위치 | 설명 |
| --- | --- |
| `.claude/skills/` | 프로젝트 스킬 |
| `~/.claude/skills/` | 사용자 스킬 |

---

## 13. 서브에이전트

```python
options = ClaudeAgentOptions(
    allowed_tools=["Read", "Glob", "Grep", "Agent"],
    agents={"code-reviewer": AgentDefinition(
        description="Expert code reviewer.", prompt="Analyze code quality.", tools=["Read", "Glob", "Grep"],
    )},
)
```

### AgentDefinition 필드

| 필드 | 필수 | 설명 |
| --- | --- | --- |
| `description` | Yes | 에이전트 사용 시기 (자연어) |
| `prompt` | Yes | 시스템 프롬프트 |
| `tools` | No | 허용 도구 (생략 시 부모 상속) |
| `disallowedTools` | No | 명시적으로 차단할 도구 (TS만) |
| `model` | No | 모델 오버라이드 (`sonnet`, `opus`, `haiku`, `inherit` 또는 전체 모델 ID) |
| `mcpServers` | No | 에이전트 전용 MCP 서버 (이름 참조 또는 인라인 설정) |
| `skills` | No | 프리로드할 스킬 |
| `initialPrompt` | No | 메인 스레드 에이전트 시 자동 제출될 첫 사용자 턴 |
| `maxTurns` | No | 최대 턴 수 |
| `background` | No | 백그라운드 실행 |
| `memory` | No | 메모리 소스 (`user`, `project`, `local`) |
| `effort` | No | 추론 노력 수준 (이름 또는 정수) |
| `permissionMode` | No | 권한 모드 |

---

## 14. 시스템 프롬프트 수정

```python
# 커스텀
options = ClaudeAgentOptions(system_prompt="Expert code reviewer.")

# Claude Code 프리셋 + 추가 지시
options = ClaudeAgentOptions(system_prompt={"type": "preset", "preset": "claude_code", "append": "Add detailed comments."})
```

---

## 15. 비용 추적

| 필드 | 설명 |
| --- | --- |
| `total_cost_usd` | 총 비용 (USD, 클라이언트 추정치) |
| `usage` | 토큰 사용량 (input/output/cache) |
| `modelUsage` | 모델별 상세 사용량 |
| `num_turns` | 총 턴 수 |
| `duration_ms` | 총 실행 시간 (ms) |

---

## 16. 슬래시 명령어

`/compact`, `/clear` 등을 프롬프트에 직접 포함. 커스텀 명령어는 `.claude/commands/`에 Markdown으로 정의.

---

## 17. 권한

### 권한 평가 순서

1. 훅 ([`PreToolUse`](#18-훅)) -> allow, deny, continue 결정
2. `disallowed_tools` 거부 규칙 -> 매칭 시 즉시 차단 (`bypassPermissions`에서도 적용)
3. 권한 모드 -> `bypassPermissions`은 여기서 모두 승인, `acceptEdits`은 파일 작업 승인 등
4. `allowed_tools` 허용 규칙 -> 매칭 시 자동 승인
5. `canUseTool` 콜백 -> 런타임 승인 (`dontAsk` 모드에서는 건너뛰고 거부)

### `canUseTool` 콜백

```typescript
canUseTool: async (toolName, input, { signal, suggestions }) => {
  if (toolName === "Bash" && input.command?.includes("rm -rf"))
    return { behavior: "deny", message: "Dangerous command blocked" };
  return { behavior: "allow", updatedInput: input };
},
```

---

## 18. 훅

### 훅 이벤트

| 이벤트 | Python | TypeScript | 발생 시점 | 주요 용도 |
| --- | --- | --- | --- | --- |
| `PreToolUse` | Yes | Yes | 도구 실행 전 | 입력 검증, 차단, **defer** 지원 |
| `PostToolUse` | Yes | Yes | 도구 실행 후 | 출력 감사 |
| `PostToolUseFailure` | Yes | Yes | 도구 실행 실패 | 오류 로깅 |
| `PostToolBatch` | No | Yes | 배치 완료 후 | 결과 집계 |
| `UserPromptSubmit` | Yes | Yes | 프롬프트 전송 | 컨텍스트 주입 |
| `Stop` | Yes | Yes | 에이전트 종료 | 결과 검증 |
| `SubagentStart` | Yes | Yes | 서브에이전트 시작 | 병렬 작업 추적 |
| `SubagentStop` | Yes | Yes | 서브에이전트 완료 | 결과 집계 |
| `PreCompact` | Yes | Yes | 컨텍스트 압축 전 | 트랜스크립트 아카이빙 |
| `PermissionRequest` | Yes | Yes | 권한 결정 필요 | 프로그래밍 방식 권한, **defer** |
| `Notification` | Yes | Yes | 알림 | 외부 전달 |
| `SessionStart` | No | Yes | 세션 시작 | 초기화 |
| `SessionEnd` | No | Yes | 세션 종료 | 정리 |
| `Setup` | No | Yes | 초기화/유지보수 | 세션 구성 |
| `TeammateIdle` | No | Yes | 팀원 유휴 | 작업 분배 |
| `TaskCompleted` | No | Yes | 태스크 완료 | 진행 추적 |
| `ConfigChange` | No | Yes | 설정 변경 | 핫 리로드 |
| `WorktreeCreate` | No | Yes | 워크트리 생성 | 격리 추적 |
| `WorktreeRemove` | No | Yes | 워크트리 제거 | 리소스 정리 |

### PermissionRequest 훅과 defer

`PreToolUse`에서 `permissionDecision: "defer"` 반환 시, 결과의 `stop_reason`이 `"tool_deferred"`가 되고 `deferred_tool_use`에 대기 중인 도구 정보 포함. 동일 `session_id`로 재개 시 계속 진행.

### 훅 예시

```typescript
hooks: { PostToolUse: [{ matcher: "Edit|Write", hooks: [logFileChange] }] }
```

---

## 19. 보안 배포

### 샌드박스 설정 (SandboxSettings)

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `false` | 샌드박스 활성화 |
| `failIfUnavailable` | `boolean` | `true` | 시작 불가 시 중단. `false`면 폴백 |
| `autoAllowBashIfSandboxed` | `boolean` | `true` | 샌드박스 시 Bash 자동 승인 |
| `excludedCommands` | `string[]` | `[]` | 항상 샌드박스 우회 명령 |
| `allowUnsandboxedCommands` | `boolean` | `true` | 모델의 비샌드박스 실행 요청 허용 |
| `network` | `SandboxNetworkConfig` | `undefined` | 네트워크 설정 |
| `filesystem` | `SandboxFilesystemConfig` | `undefined` | 파일시스템 설정 |
| `ignoreViolations` | `Record<string, string[]>` | `undefined` | 무시할 위반 패턴 |

**SandboxNetworkConfig**: `allowedDomains`, `deniedDomains`, `allowLocalBinding`, `allowUnixSockets`, `httpProxyPort`, `socksProxyPort`

**SandboxFilesystemConfig**: `allowWrite`, `denyWrite`, `denyRead` (모두 `string[]`)

> **보안 주의**: `allowUnixSockets`로 Docker 소켓 허용 시 샌드박스 격리 무력화.

### 서브프로세스 모델

`query()` 호출 시 `claude` CLI 서브프로세스를 stdio로 통신. 1 세션 = 1 서브프로세스.

### 리소스 권장사항

| 리소스 | 시작점 |
| --- | --- |
| RAM | 1 GiB/에이전트 |
| 디스크 | 5 GiB |
| CPU | 1 코어/에이전트 |

### 관측 가능성 (OpenTelemetry)

```bash
CLAUDE_CODE_ENABLE_TELEMETRY=1
CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1
OTEL_TRACES_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318
```

### 멀티테넌트 격리

```python
options = ClaudeAgentOptions(
    setting_sources=[], cwd=f"/tenants/{tenant_id}",
    env={"CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1", "CLAUDE_CONFIG_DIR": f"/tenants/{tenant_id}/.claude"},
)
```

---

## 20. 플러그인

```typescript
plugins: [{ type: "local", path: "./my-plugin" }]
```

---

## 21. Claude Code 기능

| 기능 | 설명 | 위치 |
| --- | --- | --- |
| Skills | Claude가 자동/수동 호출하는 전문 기능 | `.claude/skills/*/SKILL.md` |
| Commands | 커스텀 명령어 (레거시) | `.claude/commands/*.md` |
| Memory | 프로젝트 컨텍스트 및 지시사항 | `CLAUDE.md` / `.claude/CLAUDE.md` |
| Plugins | 스킬, 에이전트, 훅, MCP 서버 확장 | `plugins` 옵션 |

### 설정 소스 우선순위 (높은 순)

1. Local (`.claude/settings.local.json`) > Project (`.claude/settings.json`) > User (`~/.claude/settings.json`)
2. 프로그래밍 옵션 > 파일시스템 설정
3. 관리 정책 설정 > 모든 프로그래밍 옵션

### 내장 도구

| 카테고리 | 도구 |
| --- | --- |
| 파일 | `Read`, `Edit`, `Write` |
| 검색 | `Glob`, `Grep` |
| 실행 | `Bash` |
| 모니터링 | `Monitor` |
| 웹 | `WebSearch`, `WebFetch` |
| 오케스트레이션 | `Agent`, `Skill`, `AskUserQuestion`, `TaskCreate`, `TaskUpdate`, `Workflow` |
| 발견 | `ToolSearch` |

### Workflow 도구 (v0.3.149+)

다수 서브에이전트를 백그라운드에서 오케스트레이션하고 통합 결과를 반환. `agent()`, `parallel()`, `pipeline()`, `phase()` 헬퍼 사용. `resumeFromRunId`로 재개 시 변경분만 실행.

### TodoWrite → TaskCreate/TaskGet/TaskUpdate/TaskList (v0.3.142+)

`TodoWrite` 기본 비활성화. `CLAUDE_CODE_ENABLE_TASKS=0`으로 복구 가능.

| 구 도구 | 신규 도구 | 설명 |
| --- | --- | --- |
| `TodoWrite` (배열 교체) | `TaskCreate` | 단일 태스크 생성, ID 반환 |
| - | `TaskGet` | ID로 태스크 조회 |
| - | `TaskUpdate` | 태스크 패치 (상태/차단 관계) |
| - | `TaskList` | 전체 태스크 스냅샷 |
