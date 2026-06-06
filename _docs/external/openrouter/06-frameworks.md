# OpenRouter 프레임워크 통합 가이드

> 원문: https://openrouter.ai/docs/guides/community

OpenRouter는 인기 있는 AI 프레임워크 및 SDK와 원활하게 통합됩니다.

---

## 지원 프레임워크

### 공식 SDK

| 프레임워크 | 설명 |
| --- | --- |
| **OpenAI SDK** | OpenAI 공식 SDK를 OpenRouter에서 드롭인 대체품으로 사용 |
| **@openrouter/sdk** | 타입 안전한 공식 Client SDK |
| **@openrouter/agent** | 툴 사용, 루프, 상태 관리를 위한 에이전트 SDK |

### 서드파티 프레임워크

| 프레임워크 | 언어 | 설명 |
| --- | --- | --- |
| **LangChain** | Python, JavaScript | LangChain 체인/에이전트와의 통합 |
| **LlamaIndex** | Python, TypeScript | RAG 애플리케이션을 위한 통합 |
| **Vercel AI SDK** | TypeScript | Next.js 애플리케이션 통합 |
| **TanStack AI** | TypeScript | React, Solid, Preact 애플리케이션 |
| **PydanticAI** | Python | Pydantic 기반 상위 수준 인터페이스 |
| **Effect AI SDK** | TypeScript | Effect 애플리케이션과의 통합 |
| **Mastra** | TypeScript | 통합 AI 모델 접근 인터페이스 |
| **LiveKit Agents** | Python | *(사이드바에 등록되어 있으나 상세 문서를 확인하지 못해 미검증)* |
| **Anthropic Agent SDK** | Python, TypeScript | *(사이드바에 등록되어 있으나 상세 문서를 확인하지 못해 미검증)* |

### 코딩 도구 통합

| 도구 | 설명 |
| --- | --- |
| **Aider** | AI 코딩 어시스턴트 |
| **Cline** | VS Code 코딩 어시스턴트 |
| **Roo Code** | 코딩 어시스턴트 |
| **Kilo Code** | 코딩 어시스턴트 |
| **VSCode Copilot** | VS Code Copilot 통합 |
| **Xcode** | Xcode 코딩 어시스턴트 |

### 관측성 / 기타

| 도구 | 설명 |
| --- | --- |
| **Langfuse** | 관측성 및 트레이싱 통합 |
| **Arize** | OpenInference auto-instrumentation 기반 관측성·트레이싱 (Python, JS/TS) |
| **Zapier** | 8000+ 앱 연결 노코드 자동화, 500+ 모델 접근 |
| **Infisical** | API 키 자동 로테이션, 제로 다운타임 시크릿 관리 |
| **Deep Agents CLI** | 터미널 코딩 에이전트 |
| **Junie CLI** | JetBrains agentic 코딩 툴 |
| **Replit** | BYOK 방식으로 Replit Agent 및 Replit Apps에서 OpenRouter 사용 |

---

## OpenAI SDK 통합 (상세)

OpenAI SDK를 사용하면 기존 코드 구조를 변경하지 않고 OpenRouter의 모델 카탈로그에 접근할 수 있습니다. `baseURL`만 변경하면 됩니다.

### Python

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="<YOUR_OPENROUTER_API_KEY>",
    default_headers={
        "HTTP-Referer": "https://your-app.com",  # Optional
        "X-OpenRouter-Title": "Your App Name",   # Optional
    },
)

# 일반 완성
completion = client.chat.completions.create(
    model="~openai/gpt-latest",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)
print(completion.choices[0].message.content)

# 스트리밍
stream = client.chat.completions.create(
    model="~openai/gpt-latest",
    messages=[
        {"role": "user", "content": "Hello!"}
    ],
    stream=True,
)
for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")

# 툴 콜링
completion = client.chat.completions.create(
    model="~openai/gpt-latest",
    messages=[
        {"role": "user", "content": "What's the weather in Tokyo?"}
    ],
    tools=[{
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string"}
                },
                "required": ["location"]
            }
        }
    }]
)

# 모델 폴백 (extra_body 사용)
completion = client.chat.completions.create(
    model="openai/gpt-4o",
    extra_body={
        "models": ["anthropic/claude-3.5-sonnet", "gryphe/mythomax-l2-13b"],
    },
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)
```

### TypeScript / Node.js

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: '<YOUR_OPENROUTER_API_KEY>',
  defaultHeaders: {
    'HTTP-Referer': 'https://your-app.com',
    'X-OpenRouter-Title': 'Your App Name',
  },
});

// 일반 완성
const completion = await openai.chat.completions.create({
  model: '~openai/gpt-latest',
  messages: [{ role: 'user', content: 'Hello!' }],
});
console.log(completion.choices[0].message);

// 스트리밍
const stream = await openai.chat.completions.create({
  model: '~openai/gpt-latest',
  messages: [{ role: 'user', content: 'Hello!' }],
  stream: true,
});
for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) process.stdout.write(content);
}
```

---

## OpenRouter Client SDK 통합 (상세)

### 설치 및 기본 사용법

```bash
npm install @openrouter/sdk
```

```typescript
import OpenRouter from '@openrouter/sdk';

const client = new OpenRouter({
  apiKey: '<YOUR_API_KEY>',
  httpReferer: 'https://your-app.com',  // Optional
  appTitle: 'Your App Name',            // Optional
});

// 기본 완성
const completion = await client.chat.send({
  model: '~openai/gpt-latest',
  messages: [
    { role: 'user', content: 'Hello!' }
  ],
});
```

### Provider 설정 포함

```typescript
const completion = await client.chat.send({
  model: 'meta-llama/llama-3.3-70b-instruct',
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    sort: 'throughput',  // 'price' | 'throughput' | 'latency'
  },
  stream: false,
});
```

### 모델 폴백

```typescript
const completion = await client.chat.send({
  models: ['anthropic/claude-3.5-sonnet', 'gryphe/mythomax-l2-13b'],
  messages: [
    { role: 'user', content: 'What is the meaning of life?' },
  ],
});
```

---

## OpenRouter Agent SDK 통합 (상세)

### 설치 및 기본 사용법

```bash
npm install @openrouter/agent
```

```typescript
import { callModel, tool } from '@openrouter/agent';
import { z } from 'zod';

// 툴 정의
const weatherTool = tool({
  name: 'get_weather',
  description: 'Get the current weather for a location',
  inputSchema: z.object({
    location: z.string().describe('City name'),
  }),
  execute: async ({ location }) => {
    // 실제 API 호출
    const response = await fetch(`https://api.weather.com/${location}`);
    return await response.json();
  },
});

// 에이전트 호출
const result = await callModel({
  model: 'anthropic/claude-sonnet-4',
  messages: [
    { role: 'user', content: 'What is the weather in Tokyo?' },
  ],
  tools: [weatherTool],
});

const text = await result.getText();
console.log(text);
```

### Anthropic 베타 기능 사용

> **참고:** Anthropic 베타 헤더(`x-anthropic-beta`) 전달은 Client SDK(`@openrouter/sdk`)의 `chat.send` 메서드를
> 통해 지원됩니다. Agent SDK(`@openrouter/agent`)의 `callModel`에서는 별도의 헤더 주입이 필요한 경우
> Client SDK를 직접 사용하세요.

```typescript
import OpenRouter from '@openrouter/sdk';

const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const completion = await client.chat.send(
  {
    model: 'anthropic/claude-sonnet-4',
    messages: [{ role: 'user', content: 'Solve step by step: What is 15% of 240?' }],
    stream: true,
  },
  {
    headers: {
      'x-anthropic-beta': 'interleaved-thinking-2025-05-14',
    },
  }
);
```

---

## 추가 예제

OpenRouter의 GitHub 저장소에서 더 많은 예제를 확인할 수 있습니다.

---

## 관련 문서

- [Quickstart](./01-quickstart.md)
- [툴 콜링 가이드](./03-tool-calling.md)
- [스트리밍 가이드](./04-streaming.md)
- [Provider Selection](./08-provider-selection.md)
