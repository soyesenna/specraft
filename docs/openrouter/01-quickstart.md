# OpenRouter Quickstart 가이드

> 원문: https://openrouter.ai/docs/quickstart

OpenRouter는 단일 엔드포인트로 수백 개의 AI 모델에 접근할 수 있는 통합 API를 제공하며, 자동으로 폴백(fallback)을 처리하고 가장 비용 효율적인 옵션을 선택합니다.

## 통합 방법 3가지

| 방법 | 적합한 경우 |
| --- | --- |
| **API** | 완전한 제어, 모든 언어, 의존성 없음 |
| **Client SDK** | 타입 안전한 모델 호출, 최소한의 보일러플레이트 |
| **Agent SDK** | 툴 사용, 루프, 상태 관리를 포함한 에이전트 구축 |

---

## 1. API 직접 사용

가장 직접적인 방법입니다. `/api/v1/chat/completions` 엔드포인트에 표준 HTTP 요청을 보냅니다.

```python
import requests
import json

response = requests.post(
    url="https://openrouter.ai/api/v1/chat/completions",
    headers={
        "Authorization": "Bearer <YOUR_API_KEY>",
        "HTTP-Referer": "<YOUR_SITE_URL>",  # Optional. 랭킹용.
        "X-OpenRouter-Title": "<YOUR_APP_TITLE>",  # Optional. 랭킹용.
    },
    data=json.dumps({
        "model": "~openai/gpt-latest",
        "messages": [
            {
                "role": "user",
                "content": "What is the meaning of life?"
            }
        ]
    })
)
```

- `~openai/gpt-latest`는 항상 최신 OpenAI 플래그십 모델을 가리키는 alias입니다.
- 전체 모델 목록은 `GET /api/v1/models` 엔드포인트로 조회 가능합니다.

---

## 2. Client SDK (`@openrouter/sdk`)

OpenAPI 스펙 기반으로 자동 생성된 타입을 제공하는 공식 SDK입니다.

### 설치

```bash
npm install @openrouter/sdk
```

### 사용법

```typescript
import { OpenRouter } from '@openrouter/sdk';

const client = new OpenRouter({
  apiKey: '<YOUR_API_KEY>',
  httpReferer: '', // Optional
  appTitle: '',    // Optional
});

const completion = await client.chat.send({
  model: '~openai/gpt-latest',
  messages: [
    {
      role: 'user',
      content: 'What is the meaning of life?',
    },
  ],
});

console.log(completion.choices[0].message.content);
```

---

## 3. Agent SDK (`@openrouter/agent`)

에이전트 구축을 위한 상위 수준 SDK입니다. 멀티턴 대화 루프, 툴 실행, 상태 관리를 `callModel` 함수로 자동 처리합니다.

### 설치

```bash
npm install @openrouter/agent
```

### 툴을 사용한 에이전트 예제

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

const result = await callModel({
  model: '~anthropic/claude-sonnet-latest',
  messages: [
    { role: 'user', content: 'What is the weather in San Francisco?' },
  ],
  tools: [weatherTool],
});

const text = await result.getText();
console.log(text);
```

SDK가 프롬프트를 전송하고, 모델로부터 툴 콜을 수신한 뒤 `get_weather`를 실행하고, 결과를 다시 피드백하여 최종 응답을 반환합니다. 모든 과정이 하나의 `callModel` 호출로 처리됩니다.

---

## 4. OpenAI SDK 호환 사용법

기존 OpenAI SDK 코드를 그대로 사용하면서 OpenRouter의 모델 카탈로그에 접근할 수 있습니다.

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: '<YOUR_API_KEY>',
  defaultHeaders: {
    'HTTP-Referer': '',
    'X-OpenRouter-Title': '',
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: '~openai/gpt-latest',
    messages: [
      {
        role: 'user',
        content: 'What is the meaning of life?',
      },
    ],
  });

  console.log(completion.choices[0].message);
}

main();
```

### Python 예제

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="<YOUR_API_KEY>",
)

completion = client.chat.completions.create(
    model="~openai/gpt-latest",
    messages=[
        {"role": "user", "content": "What is the meaning of life?"}
    ]
)

print(completion.choices[0].message.content)
```

---

## 선택적 헤더

OpenRouter는 앱 식별을 위한 선택적 헤더를 지원합니다:

| 헤더 | 설명 |
| --- | --- |
| `HTTP-Referer` | openrouter.ai에서 앱을 식별하는 사이트 URL |
| `X-OpenRouter-Title` | 앱 제목 설정 (`X-Title`도 허용) |
| `X-OpenRouter-Categories` | 마켓플레이스 카테고리 할당 |

## 관련 문서

- [API 레퍼런스](./02-api-reference.md)
- [툴 콜링 가이드](./03-tool-calling.md)
- [스트리밍 가이드](./04-streaming.md)
- [프레임워크 통합](./06-frameworks.md)
