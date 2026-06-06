# SDK Reference 가이드

> 원문: https://openrouter.ai/docs/sdks

OpenRouter는 경량의 타입 안전한 Client SDK와 에이전트 구축을 위한 Agent SDK를 제공합니다. Client SDK는 OpenRouter REST API에 대한 얇은 타입 안전 레이어로, 인증·요청 검증·응답 타이핑을 처리하여 단일 함수 호출로 300개 이상의 모델에 접근할 수 있습니다. Agent SDK는 멀티턴 루프, 툴 정의, 중지 조건, 대화 상태 관리를 위한 고수준 프리미티브를 제공합니다.

---

## SDK 한눈에 보기

| SDK | 패키지 | 언어 | 용도 |
| --- | --- | --- | --- |
| **Client SDK** | `@openrouter/sdk` | TypeScript | 타입 안전한 모델 호출, 스트리밍, 임베딩 |
| **Client SDK** | `openrouter` | Python | 타입 안전한 모델 호출, 스트리밍, 비동기 |
| **Client SDK** | `go-openrouter` | Go | 타입 안전한 모델 호출, 스트리밍 |
| **Agent SDK** | `@openrouter/agent` | TypeScript | 멀티턴 에이전트 루프, 툴 실행, 상태 관리 |

### Client SDK vs Agent SDK

| | Client SDK | Agent SDK |
| --- | --- | --- |
| **초점** | REST API를 미러링하는 경량 API 클라이언트 | 멀티턴 루프, 툴, 중지 조건을 갖춘 에이전트 프리미티브 |
| **사용 시기** | 직접적인 모델 호출, 직접 오케스트레이션 | 에이전트 루프, 자동 툴 실행, 상태 관리가 필요한 경우 |
| **대화 상태** | 직접 관리 | `callModel`이 자동 관리 |
| **툴 실행** | 직접 디스패치 | `tool()` 헬퍼로 자동 실행 |
| **지원 언어** | TypeScript, Python, Go | TypeScript |

### Client SDK를 사용해야 하는 경우

- **단일 턴 완성** — 프롬프트를 보내고 응답을 받는 단순 호출
- **스트리밍 응답** — 실시간 토큰 단위 출력
- **임베딩** — 벡터 표현 생성
- **API 키 및 크레딧 관리** — 계정 프로그래밍 관리
- **커스텀 오케스트레이션** — 대화 루프, 툴 디스패치를 직접 제어

---

## 1. TypeScript SDK (`@openrouter/sdk`)

### 설치

```bash
# npm
npm install @openrouter/sdk

# pnpm
pnpm add @openrouter/sdk

# bun
bun add @openrouter/sdk

# yarn
yarn add @openrouter/sdk
```

> 이 패키지는 ESM 전용입니다. CommonJS 환경에서는 `await import("@openrouter/sdk")`를 사용하세요.

API 키는 [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys)에서 발급받을 수 있습니다.

### 기본 설정

```typescript
import OpenRouter from "@openrouter/sdk";

const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});
```

### chat.send() — 기본 사용법

```typescript
import OpenRouter from "@openrouter/sdk";

const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const response = await client.chat.send({
  model: "minimax/minimax-m2",
  messages: [
    { role: "user", content: "Hello!" },
  ],
});

console.log(response.choices[0].message.content);
```

### chat.send() 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `request` | `models.ChatGenerationParams` | 필수 | 요청 객체 |
| `options` | `RequestOptions` | 선택 | HTTP 요청 옵션 |
| `options.fetchOptions` | `RequestInit` | 선택 | 기본 HTTP 요청에 전달되는 옵션 |
| `options.retries` | `RetryConfig` | 선택 | 실패 시 재시도 설정 |

`ChatGenerationParams`의 주요 필드:

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `model` | `string` | 모델 slug (예: `"minimax/minimax-m2"`) |
| `models` | `string[]` | 폴백용 모델 목록 |
| `messages` | `Message[]` | 대화 메시지 배열 |
| `stream` | `boolean` | 스트리밍 여부 |
| `temperature` | `number` | 샘플링 온도 |
| `max_tokens` | `number` | 최대 토큰 수 |
| `top_p` | `number` | Top-P 샘플링 |
| `frequency_penalty` | `number` | 빈도 페널티 |
| `presence_penalty` | `number` | 존재 페널티 |
| `provider` | `ChatGenerationParamsProvider` | 프로바이더 라우팅 설정 |
| `tools` | `ToolDefinitionJSON[]` | 툴 정의 |
| `tool_choice` | `any` | 툴 선택 모드 |
| `stop` | `ChatGenerationParamsStop` | 정지 시퀀스 |
| `response_format` | `ChatGenerationParamsResponseFormat` | 응답 형식 |
| `seed` | `number` | 재현성을 위한 시드 |
| `reasoning` | `Reasoning` | 추론 설정 |
| `session_id` | `string` | 관련 요청 그룹화용 세션 ID (최대 128자) |

### 스트리밍

```typescript
const stream = await client.chat.send({
  model: "minimax/minimax-m2",
  messages: [{ role: "user", content: "Write a story" }],
  stream: true,
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}
```

`stream: true`를 설정하면 응답 타입이 자동으로 스트리밍 타입으로 변경됩니다.

### 프로바이더 설정

```typescript
const response = await client.chat.send({
  model: "openai/gpt-5",
  messages: [{ role: "user", content: "Hello" }],
  provider: {
    zdr: true,        // Zero Data Retention 활성화
    sort: "price",    // 가격순 정렬
  },
});
```

### 모델 폴백

`models` 배열로 여러 모델을 지정하면, 첫 번째 모델이 실패할 경우 자동으로 다음 모델로 폴백됩니다.

```typescript
const response = await client.chat.send({
  model: "openai/gpt-4o",                // 우선 사용할 모델
  models: [
    "anthropic/claude-sonnet-4",          // 첫 번째 폴백
    "google/gemini-2.5-pro",              // 두 번째 폴백
  ],
  messages: [{ role: "user", content: "Hello" }],
});
```

### 임베딩

```typescript
// 임베딩 생성
const embedding = await client.embeddings.generate({
  input: "Hello, world!",
  model: "openai/text-embedding-3-small",
});

console.log(embedding);
```

#### 임베딩 메서드

| 메서드 | 설명 |
| --- | --- |
| `embeddings.generate()` | 임베딩 요청 제출 |
| `embeddings.listModels()` | 사용 가능한 임베딩 모델 목록 조회 |

#### 임베딩 에러 코드

| 에러 타입 | 상태 코드 |
| --- | --- |
| `BadRequestResponseError` | 400 |
| `UnauthorizedResponseError` | 401 |
| `PaymentRequiredResponseError` | 402 |
| `NotFoundResponseError` | 404 |
| `TooManyRequestsResponseError` | 429 |
| `InternalServerResponseError` | 500 |
| `BadGatewayResponseError` | 502 |
| `ServiceUnavailableResponseError` | 503 |
| `EdgeNetworkTimeoutResponseError` | 524 |
| `ProviderOverloadedResponseError` | 529 |

### TypeScript SDK API 모듈 목록

공식 TypeScript SDK는 다음 API 모듈을 제공합니다. 각 모듈은 OpenRouter REST API의 해당 엔드포인트를 미러링합니다.

| 모듈 | 설명 |
| --- | --- |
| `client.chat` | 채팅 완성 (핵심 모델 호출) |
| `client.embeddings` | 임베딩 생성 및 모델 목록 |
| `client.completions` | 텍스트 완성 |
| `client.models` | 사용 가능한 모델 조회 |
| `client.generations` | 생성 작업 관리 |
| `client.analytics` | 사용량 분석 데이터 |
| `client.apiKeys` | API 키 관리 |
| `client.credits` | 크레딧 잔액 조회 |
| `client.endpoints` | 엔드포인트 관리 |
| `client.oAuth` | OAuth 인증 |
| `client.providers` | 프로바이더 정보 |
| `client.responses` | 응답 관리 |
| `client.parametersT` | 파라미터 타입 유틸리티 |

> 위 모듈 중 이 문서에서는 `chat`과 `embeddings`의 상세 사용법을 다룹니다. 다른 모듈의 사용법은 SDK 내 타입 정의 및 IDE 자동완성을 참조하세요.

### Standalone 함수 (Tree-shaking)

클라이언트 인스턴스 없이 함수를 직접 사용할 수 있습니다. 번들 크기를 최적화할 때 유용합니다.

```typescript
import { OpenRouterCore } from "@openrouter/sdk/core.js";
import { chatSend } from "@openrouter/sdk/funcs/chatSend.js";

const client = new OpenRouterCore({
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
});

const res = await chatSend(client, {
  messages: [{ role: "user", content: "Hello" }],
});

if (res.ok) {
  const { value: result } = res;
  console.log(result);
} else {
  console.log("chatSend failed:", res.error);
}
```

### 디버깅

```typescript
// 디버그 로거 설정
const sdk = new OpenRouter({ debugLogger: console });
```

또는 환경 변수를 사용:

```bash
OPENROUTER_DEBUG=true node your-app.js
```

> 디버그 로깅을 활성화하면 API 토큰 등 민감 정보가 로그에 노출됩니다. 로컬 개발 환경에서만 사용하세요.

### 에러 처리

| 에러 타입 | 상태 코드 | 콘텐츠 타입 |
| --- | --- | --- |
| `ChatError` | 400, 401, 429 | `application/json` |
| `ChatError` | 500 | `application/json` |
| `OpenRouterDefaultError` | 4XX, 5XX | `*/*` |

---

## 2. Python SDK (`openrouter`)

### 설치

```bash
# uv (권장)
uv add openrouter

# pip
pip install openrouter

# poetry
poetry add openrouter
```

**요구 사항:** Python 3.9 이상

API 키는 [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys)에서 발급받을 수 있습니다.

### 기본 설정

```python
from openrouter import OpenRouter
import os

client = OpenRouter(
    api_key=os.getenv("OPENROUTER_API_KEY")
)
```

컨텍스트 매니저를 사용하면 리소스를 자동으로 정리합니다.

```python
with OpenRouter(
    api_key=os.getenv("OPENROUTER_API_KEY")
) as client:
    response = client.chat.send(
        model="minimax/minimax-m2",
        messages=[{"role": "user", "content": "Hello!"}]
    )
    print(response.choices[0].message.content)
```

### chat.send() — 기본 사용법

```python
from openrouter import OpenRouter
import os

with OpenRouter(
    api_key=os.getenv("OPENROUTER_API_KEY")
) as client:
    response = client.chat.send(
        model="minimax/minimax-m2",
        messages=[
            {"role": "user", "content": "Hello!"}
        ],
        temperature=0.7,
    )
    print(response.choices[0].message.content)
```

### chat.send() 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `messages` | `List[Message]` | 필수 | 대화 메시지 배열 |
| `model` | `Optional[str]` | 선택 | 모델 slug |
| `models` | `List[str]` | 선택 | 폴백용 모델 목록 |
| `stream` | `Optional[bool]` | 선택 | 스트리밍 여부 |
| `temperature` | `Optional[float]` | 선택 | 샘플링 온도 |
| `max_tokens` | `Optional[float]` | 선택 | 최대 토큰 수 |
| `max_completion_tokens` | `Optional[float]` | 선택 | 최대 완성 토큰 수 |
| `top_p` | `Optional[float]` | 선택 | Top-P 샘플링 |
| `frequency_penalty` | `Optional[float]` | 선택 | 빈도 페널티 |
| `presence_penalty` | `Optional[float]` | 선택 | 존재 페널티 |
| `provider` | `Optional[ChatGenerationParamsProvider]` | 선택 | 프로바이더 라우팅 설정 |
| `tools` | `List[ToolDefinitionJSON]` | 선택 | 툴 정의 |
| `tool_choice` | `Optional[Any]` | 선택 | 툴 선택 모드 |
| `stop` | `Optional[ChatGenerationParamsStop]` | 선택 | 정지 시퀀스 |
| `response_format` | `Optional[ChatGenerationParamsResponseFormat]` | 선택 | 응답 형식 |
| `seed` | `Optional[int]` | 선택 | 재현성을 위한 시드 |
| `reasoning` | `Optional[Reasoning]` | 선택 | 추론 설정 |
| `session_id` | `Optional[str]` | 선택 | 관련 요청 그룹화용 세션 ID (최대 128자) |
| `retries` | `Optional[RetryConfig]` | 선택 | 재시도 설정 오버라이드 |

### 비동기 — send_async()

```python
import asyncio
from openrouter import OpenRouter
import os

async def main():
    async with OpenRouter(
        api_key=os.getenv("OPENROUTER_API_KEY")
    ) as client:
        response = await client.chat.send_async(
            model="minimax/minimax-m2",
            messages=[{"role": "user", "content": "Hello!"}]
        )
        print(response.choices[0].message.content)

asyncio.run(main())
```

### 스트리밍

```python
stream = client.chat.send(
    model="minimax/minimax-m2",
    messages=[{"role": "user", "content": "Write a story"}],
    stream=True,
)

for event in stream:
    content = event.choices[0].delta.content if event.choices else None
    if content:
        print(content, end="", flush=True)
```

### 에러 처리

| 에러 타입 | 상태 코드 | 콘텐츠 타입 |
| --- | --- | --- |
| `ChatError` | 400, 401, 429 | `application/json` |
| `ChatError` | 500 | `application/json` |
| `OpenRouterDefaultError` | 4XX, 5XX | `*/*` |

### Python SDK API 모듈 목록

공식 Python SDK는 다음 API 모듈을 제공합니다. 각 모듈은 OpenRouter REST API의 해당 엔드포인트를 미러링합니다.

| 모듈 | 설명 |
| --- | --- |
| `client.chat` | 채팅 완성 (핵심 모델 호출) |
| `client.embeddings` | 임베딩 생성 및 모델 목록 |
| `client.completions` | 텍스트 완성 |
| `client.models` | 사용 가능한 모델 조회 |
| `client.generations` | 생성 작업 관리 |
| `client.analytics` | 사용량 분석 데이터 |
| `client.api_keys` | API 키 관리 |
| `client.credits` | 크레딧 잔액 조회 |
| `client.endpoints` | 엔드포인트 관리 |
| `client.o_auth` | OAuth 인증 |
| `client.providers` | 프로바이더 정보 |
| `client.responses` | 응답 관리 |
| `client.parameters` | 파라미터 유틸리티 |

> 위 모듈 중 이 문서에서는 `chat`의 상세 사용법을 다룹니다. 다른 모듈의 사용법은 SDK 내 타입 힌트 및 IDE 자동완성을 참조하세요.

---

## 3. Go SDK (`go-openrouter`)

### 설치

```bash
go get github.com/openrouter/go-openrouter
```

**요구 사항:** Go 1.21 이상

API 키는 [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys)에서 발급받을 수 있습니다.

### 기본 설정

```go
package main

import (
    "context"
    "fmt"
    "os"

    openrouter "github.com/openrouter/go-openrouter"
)

func main() {
    client, err := openrouter.NewClient(openrouter.Config{
        APIKey: os.Getenv("OPENROUTER_API_KEY"),
    })
    if err != nil {
        panic(err)
    }

    resp, err := client.Chat.Send(context.Background(), openrouter.ChatSendParams{
        Model: "minimax/minimax-m2",
        Messages: []openrouter.Message{
            {Role: "user", Content: "Hello!"},
        },
    })
    if err != nil {
        panic(err)
    }

    fmt.Println(resp.Choices[0].Message.Content)
}
```

### chat.Send() 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `Model` | `string` | 필수 | 모델 slug (예: `"minimax/minimax-m2"`) |
| `Messages` | `[]Message` | 필수 | 대화 메시지 슬라이스 |
| `Stream` | `bool` | 선택 | 스트리밍 여부 |
| `Temperature` | `*float64` | 선택 | 샘플링 온도 |
| `MaxTokens` | `*int` | 선택 | 최대 토큰 수 |
| `TopP` | `*float64` | 선택 | Top-P 샘플링 |
| `FrequencyPenalty` | `*float64` | 선택 | 빈도 페널티 |
| `PresencePenalty` | `*float64` | 선택 | 존재 페널티 |
| `Provider` | `*ProviderConfig` | 선택 | 프로바이더 라우팅 설정 |
| `Tools` | `[]ToolDefinition` | 선택 | 툴 정의 |
| `ToolChoice` | `interface{}` | 선택 | 툴 선택 모드 |
| `Stop` | `[]string` | 선택 | 정지 시퀀스 |
| `Seed` | `*int` | 선택 | 재현성을 위한 시드 |
| `Reasoning` | `*ReasoningConfig` | 선택 | 추론 설정 |
| `SessionID` | `string` | 선택 | 관련 요청 그룹화용 세션 ID (최대 128자) |

### 스트리밍

```go
stream, err := client.Chat.Send(context.Background(), openrouter.ChatSendParams{
    Model: "minimax/minimax-m2",
    Messages: []openrouter.Message{
        {Role: "user", Content: "Write a story"},
    },
    Stream: true,
})
if err != nil {
    panic(err)
}

for event := range stream.Stream() {
    if content := event.Choices[0].Delta.Content; content != nil {
        fmt.Print(*content)
    }
}
```

### 모델 폴백

`Models` 필드로 여러 모델을 지정하면, 첫 번째 모델이 실패할 경우 자동으로 다음 모델로 폴백됩니다.

```go
resp, err := client.Chat.Send(context.Background(), openrouter.ChatSendParams{
    Model: "openai/gpt-4o",
    Models: []string{
        "anthropic/claude-sonnet-4",
        "google/gemini-2.5-pro",
    },
    Messages: []openrouter.Message{
        {Role: "user", Content: "Hello"},
    },
})
```

### 에러 처리

Go SDK는 표준 Go 에러 패턴을 따르며, HTTP 상태 코드별로 구체적인 에러 타입을 제공합니다.

| 에러 타입 | 상태 코드 |
| --- | --- |
| `BadRequestError` | 400 |
| `UnauthorizedError` | 401 |
| `PaymentRequiredError` | 402 |
| `NotFoundError` | 404 |
| `TooManyRequestsError` | 429 |
| `InternalServerError` | 500 |
| `BadGatewayError` | 502 |
| `ServiceUnavailableError` | 503 |

---

## 4. Agent SDK (`@openrouter/agent`)

Agent SDK는 멀티턴 루프, 툴 정의, 중지 조건, 대화 상태 관리를 위한 에이전트 구축 프리미티브를 제공합니다. `@openrouter/agent`를 설치하면 Client SDK도 자동으로 포함됩니다.

### 설치

```bash
# npm
npm install @openrouter/agent

# pnpm
pnpm add @openrouter/agent

# bun
bun add @openrouter/agent

# yarn
yarn add @openrouter/agent
```

> 이 패키지는 ESM 전용입니다. CommonJS 환경에서는 `await import('@openrouter/agent')`를 사용하세요.

### callModel — 핵심 진입점

`callModel`은 모델에 메시지를 보내고, 툴 호출이 반환되면 자동으로 실행하고, 결과를 대화에 추가한 뒤 중지 조건이 충족될 때까지 루프를 반복합니다. `callModel`은 `ModelResult`를 동기적으로 반환하며, 별도의 클라이언트 인스턴스 없이 독립적으로 호출됩니다. `OPENROUTER_API_KEY` 환경 변수가 자동으로 사용됩니다.

#### 기본 사용법

```typescript
import { callModel, tool } from '@openrouter/agent';
import { z } from 'zod';

const weatherTool = tool({
  name: 'get_weather',
  description: 'Get the current weather for a location',
  inputSchema: z.object({
    location: z.string().describe('City name'),
  }),
  execute: async ({ location }) => {
    return { temperature: 72, condition: 'sunny', location };
  },
});

const result = callModel({
  model: 'anthropic/claude-sonnet-4',
  messages: [{ role: 'user', content: 'What is the weather in San Francisco?' }],
  tools: [weatherTool] as const,
});

const text = await result.getText();
console.log(text);
```

SDK가 메시지를 모델에 전송하고, 툴 호출을 수신하면 `get_weather`를 실행하고, 결과를 피드백하여 최종 응답을 반환합니다 — 모든 것이 단일 `callModel` 호출로 처리됩니다.

#### 입력 형식

`callModel`은 여러 입력 형식을 지원합니다.

```typescript
// 단순 메시지
const result1 = callModel({
  model: 'openai/gpt-5-nano',
  messages: [{ role: 'user', content: 'Hello!' }],
});

// 시스템 명령 포함
const result2 = callModel({
  model: 'openai/gpt-5-nano',
  instructions: 'You are a helpful assistant.',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

#### 응답 소비 패턴

`callModel`은 `ModelResult` 객체를 동기적으로 반환하며 (Promise 아님), 다양한 비동기 메서드로 응답을 소비할 수 있습니다.

```typescript
const result = callModel({
  model: 'openai/gpt-5-nano',
  messages: [{ role: 'user', content: 'Explain quantum computing' }],
});

// 텍스트 얻기
const text = await result.getText();

// 전체 응답 (사용량 데이터 포함)
const response = await result.getResponse();
console.log(response.usage); // { inputTokens, outputTokens, cost, ... }

// 툴 호출 결과 얻기
const toolCalls = await result.getToolCalls();
```

### tool() — 툴 팩토리

`tool()` 헬퍼로 타입 안전한 툴을 정의합니다. 각 툴은 이름, 설명, Zod 파라미터 스키마, `execute` 함수를 갖습니다.

#### 일반 툴 (자동 실행)

```typescript
const searchTool = tool({
  name: 'search',
  description: 'Search the web',
  inputSchema: z.object({ query: z.string() }),
  outputSchema: z.object({ results: z.array(z.string()) }),
  execute: async ({ query }) => {
    const results = await performSearch(query);
    return { results };
  },
});
```

#### 제너레이터 툴 (중간 이벤트 스트리밍)

```typescript
const analysisTool = tool({
  name: 'analyze',
  inputSchema: z.object({ data: z.string() }),
  eventSchema: z.object({ progress: z.number() }),
  outputSchema: z.object({ summary: z.string() }),
  execute: async function* ({ data }) {
    yield { progress: 0.5 };
    // ... 처리 ...
    return { summary: 'Analysis complete' };
  },
});
```

#### 수동 툴 (Human-in-the-loop)

```typescript
const confirmTool = tool({
  name: 'confirm_action',
  inputSchema: z.object({ action: z.string() }),
  execute: false,  // 자동 실행하지 않음
});
```

### 중지 조건 (Stop Conditions)

에이전트 루프의 종료 시점을 제어합니다. 단일 조건 또는 여러 조건을 조합할 수 있습니다 (조건 중 하나라도 충족되면 중지).

```typescript
import { callModel, stepCountIs, maxCost, hasToolCall } from '@openrouter/agent';

const result = callModel({
  model: 'openai/gpt-4o',
  messages: [{ role: 'user', content: 'Research this topic thoroughly' }],
  tools: [searchTool, summarizeTool] as const,
  stopWhen: [stepCountIs(10), maxCost(0.50), hasToolCall('summarize')],
});
```

#### 내장 중지 조건

| 조건 | 설명 |
| --- | --- |
| `stepCountIs(n)` | `n`번의 툴 실행 단계 후 중지 (기본값: 5) |
| `hasToolCall(name)` | 특정 툴이 호출되면 중지 |
| `maxTokensUsed(n)` | 총 토큰이 임계값을 초과하면 중지 |
| `maxCost(dollars)` | 총 비용이 달러 금액을 초과하면 중지 |
| `finishReasonIs(reason)` | 특정 종료 사유에서 중지 |

#### 중지 후 최종 응답

`stopWhen`이 트리거될 때 모델이 여전히 툴 호출을 생성 중이라면, `allowFinalResponse`로 툴 없이 한 번 더 모델 턴을 강제 실행할 수 있습니다.

```typescript
callModel({
  model: 'openai/gpt-4o',
  messages: [{ role: 'user', content: 'Research this topic' }],
  tools: [searchTool] as const,
  stopWhen: stepCountIs(5),
  allowFinalResponse: 'Please summarize what you found.',
  // 또는 allowFinalResponse: true
});
```

### 툴 승인 (Tool Approval)

민감한 작업에 대해 승인 체크로 툴 실행을 제어합니다.

```typescript
// 항상 승인 필요
const deleteTool = tool({
  name: 'delete_record',
  inputSchema: z.object({ id: z.string() }),
  requireApproval: true,
  execute: async ({ id }) => { /* ... */ },
});

// 조건부 승인
const writeTool = tool({
  name: 'write_file',
  inputSchema: z.object({ path: z.string(), content: z.string() }),
  requireApproval: ({ path }) => path.startsWith('/etc'),
  execute: async ({ path, content }) => { /* ... */ },
});

// callModel 수준에서 승인 처리
const result = callModel({
  model: 'openai/gpt-4o',
  messages: [{ role: 'user', content: 'Delete record abc-123' }],
  tools: [deleteTool] as const,
  approveToolCalls: async (toolCalls) => {
    // 승인된 툴 호출의 ID만 반환
    return toolCalls.map(tc => tc.id);
  },
});
```

### 툴 컨텍스트 (Tool Context)

모델을 거치지 않고 툴에 타입 안전한 컨텍스트 데이터를 제공합니다.

```typescript
const dbTool = tool({
  name: 'query_db',
  inputSchema: z.object({ sql: z.string() }),
  contextSchema: z.object({ connectionString: z.string() }),
  execute: async ({ sql }, ctx) => {
    const db = connect(ctx?.context.connectionString);
    return db.query(sql);
  },
});

const result = callModel({
  model: 'openai/gpt-4o',
  messages: [{ role: 'user', content: 'List all users' }],
  tools: [dbTool] as const,
  context: {
    query_db: { connectionString: 'postgres://localhost/mydb' },
  },
});
```

### 공유 컨텍스트 (Shared Context)

모든 툴 간에 변경 가능한 상태를 공유합니다.

```typescript
const result = callModel({
  model: 'openai/gpt-4o',
  messages: [{ role: 'user', content: 'Process these items' }],
  tools: [toolA, toolB] as const,
  sharedContextSchema: z.object({ processedIds: z.array(z.string()) }),
  context: {
    shared: { processedIds: [] },
  },
});
```

### 대화 상태 관리

멀티턴 대화의 상태를 추적하고 유지합니다.

```typescript
import { createInitialState, callModel } from '@openrouter/agent';

// 대화 시작
let state = createInitialState();

// 첫 번째 턴
const result1 = callModel({
  model: 'openai/gpt-4o',
  messages: [{ role: 'user', content: 'Search for TypeScript best practices' }],
  tools: [searchTool] as const,
  state,
});

state = (await result1.getResponse()).state;

// 대화 계속
const result2 = callModel({
  model: 'openai/gpt-4o',
  messages: [{ role: 'user', content: 'Now summarize what you found' }],
  tools: [searchTool] as const,
  state,
});
```

### 동적 파라미터 (nextTurnParams)

툴 실행 컨텍스트에 따라 모델 파라미터를 동적으로 조정합니다.

```typescript
const searchTool = tool({
  name: 'search',
  inputSchema: z.object({ query: z.string() }),
  nextTurnParams: {
    temperature: (input) => input.query.includes('creative') ? 0.9 : 0.1,
    maxOutputTokens: () => 2000,
  },
  execute: async ({ query }) => { /* ... */ },
});
```

### Claude/Chat 포맷 호환

OpenRouter 메시지와 Anthropic Claude 및 표준 Chat 메시지 형식 간 변환을 지원합니다.

```typescript
import { toClaudeMessage, fromClaudeMessages } from '@openrouter/agent';
import { toChatMessage, fromChatMessages } from '@openrouter/agent';

// Anthropic Claude 형식으로 변환
const claudeMsg = toClaudeMessage(openRouterMessage);
const orMessages = fromClaudeMessages(claudeMessages);

// 표준 Chat 형식으로 변환
const chatMsg = toChatMessage(openRouterMessage);
const orMessages2 = fromChatMessages(chatMessages);
```

### 스트리밍 메서드

`ModelResult`는 다양한 스트리밍 패턴을 지원합니다.

```typescript
const result = callModel({ model, messages, tools });

// 텍스트 델타 스트리밍
for await (const delta of result.getTextStream()) {
  process.stdout.write(delta);
}

// 추론 스트리밍 (추론 모델용)
for await (const delta of result.getReasoningStream()) {
  console.log('Reasoning:', delta);
}

// 툴 호출 스트리밍
for await (const toolCall of result.getToolCallsStream()) {
  console.log(`Tool: ${toolCall.name}`, toolCall.arguments);
}

// 툴 스트림 (델타 + 예비 결과)
for await (const event of result.getToolStream()) {
  if (event.type === 'delta') {
    process.stdout.write(event.content);
  } else if (event.type === 'preliminary_result') {
    console.log('Progress:', event.result);
  }
}
```

### Subpath Exports (Tree-shaking)

세분화된 가져오기를 위해 서브패스 익스포트를 제공합니다.

```typescript
import { callModel } from '@openrouter/agent/call-model';
import { tool } from '@openrouter/agent/tool';
import { ModelResult } from '@openrouter/agent/model-result';
import { stepCountIs, maxCost } from '@openrouter/agent/stop-conditions';
import { toClaudeMessage } from '@openrouter/agent/anthropic-compat';
import { toChatMessage } from '@openrouter/agent/chat-compat';
import { ToolContextStore } from '@openrouter/agent/tool-context';
import { ToolEventBroadcaster } from '@openrouter/agent/tool-event-broadcaster';
import { createInitialState } from '@openrouter/agent/conversation-state';
```

---

## 5. SDK vs OpenAI SDK 비교

OpenRouter Client SDK는 OpenAI SDK와 유사한 인터페이스를 제공하지만, 주요 차이점이 있습니다.

| 항목 | OpenRouter SDK | OpenAI SDK |
| --- | --- | --- |
| **엔드포인트** | OpenRouter 전용 API | OpenAI 전용 API |
| **모델 접근** | 300개 이상의 멀티 프로바이더 모델 | OpenAI 모델 전용 |
| **폴백** | `models` 배열로 자동 폴백 지원 | 미지원 |
| **프로바이더 제어** | `provider` 옵션으로 라우팅 제어 | 미지원 |
| **자동 생성** | OpenAPI 스펙에서 자동 생성 | 별도 유지관리 |
| **임베딩** | 멀티 프로바이더 임베딩 지원 | OpenAI 임베딩 전용 |
| **설치 (TS)** | `npm install @openrouter/sdk` | `npm install openai` |
| **설치 (Python)** | `pip install openrouter` | `pip install openai` |
| **호환성** | OpenAI SDK를 드롭인 대체로도 사용 가능 | — |

### OpenAI SDK로 OpenRouter 사용하기

OpenRouter은 OpenAI SDK를 드롭인 대체로 사용할 수도 있습니다. `baseURL`만 변경하면 됩니다.

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const response = await client.chat.completions.create({
  model: "openai/gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});
```

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

response = client.chat.completions.create(
    model="openai/gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}],
)
```

---

## 6. SDK 공통 특징

### Auto-generated from API Specifications

모든 Client SDK는 OpenRouter의 OpenAPI 스펙에서 자동 생성됩니다. API가 변경될 때마다 업데이트되므로 새 모델, 파라미터, 기능이 IDE 자동완성에 즉시 반영됩니다.

### Type-Safe by Default

모든 파라미터, 응답 필드, 설정 옵션이 완전히 타입 지정되어 있어, 잘못된 설정은 컴파일/실행 시점에 명확한 에러 메시지와 함께 포착됩니다.

### Actionable Error Messages

일반적인 에러 대신 구체적인 안내를 제공합니다.

```
"Model 'openai/o1-preview' requires at least 2 messages.
You provided 1 message. Add a system or user message."
```

### Beta 상태 안내

TypeScript SDK, Python SDK, Go SDK, Agent SDK 모두 현재 **베타** 상태입니다. 버전 간 호환성 변경(Breaking Change)이 발생할 수 있으므로, 특정 버전을 고정(`pin`)하여 사용하는 것을 권장합니다.

---

## 관련 문서

- [01-quickstart.md](./01-quickstart.md) — OpenRouter 퀵스타트 가이드
- [02-api-reference.md](./02-api-reference.md) — REST API 레퍼런스
- [03-tool-calling.md](./03-tool-calling.md) — 툴 호출 가이드
- [04-streaming.md](./04-streaming.md) — 스트리밍 가이드
- [06-frameworks.md](./06-frameworks.md) — 프레임워크 통합 가이드
- [07-model-routing.md](./07-model-routing.md) — 모델 라우팅 가이드
- [08-provider-selection.md](./08-provider-selection.md) — 프로바이더 선택 가이드
