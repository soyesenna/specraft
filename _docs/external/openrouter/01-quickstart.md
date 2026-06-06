# OpenRouter Quickstart 가이드

> 원문: https://openrouter.ai/docs/quickstart

OpenRouter는 단일 엔드포인트로 수백 개의 AI 모델에 접근할 수 있는 통합 API를 제공하며, 자동으로 폴백(fallback)을 처리하고 가장 비용 효율적인 옵션을 선택합니다.

## 통합 방법 3가지

| 방법 | 적합한 경우 |
| --- | --- |
| **API** | 완전한 제어, 모든 언어, 의존성 없음 |
| **Client SDKs** | 타입 안전한 모델 호출, 최소한의 보일러플레이트 |
| **Agent SDK** | 툴 사용, 루프, 상태 관리를 포함한 에이전트 구축 |

> 무료 모델과 요금 제한에 대한 정보를 찾고 계신가요? [FAQ](https://openrouter.ai/docs/faq)를 참조하세요.

아래 예시에서 OpenRouter 전용 헤더는 선택 사항입니다. 이 헤더를 설정하면 앱이 OpenRouter 리더보드에 표시됩니다. 앱 식별에 대한 자세한 내용은 [App Attribution 가이드](https://openrouter.ai/docs/app-attribution)를 참조하세요.

---

## 1. API 직접 사용

가장 직접적인 방법입니다. `/api/v1/chat/completions` 엔드포인트에 표준 HTTP 요청을 보냅니다 — 모든 언어 및 프레임워크와 호환됩니다.

[Request Builder](https://openrouter.ai/playground)를 사용하여 원하는 언어로 OpenRouter API 요청을 대화식으로 생성할 수 있습니다.

아래 예시는 `~openai/gpt-latest`를 사용합니다. 이것은 항상 최신 OpenAI 플래그십 모델로 해석되는 latest alias이므로, 재배포 없이도 최신 버전을 계속 사용할 수 있습니다. 여기에 다른 모델 slug를 대체할 수 있습니다. 전체 카탈로그는 [openrouter.ai/models](https://openrouter.ai/models)에서 탐색하거나, `GET /api/v1/models` 엔드포인트로 프로그래밍 방식으로 조회할 수 있습니다.

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

API는 스트리밍도 지원합니다. 또한 OpenAI SDK를 OpenRouter를 가리키도록 설정하여 드롭인 대체로 사용할 수도 있습니다.

---

## 2. Client SDKs (`@openrouter/sdk`)

Client SDKs는 OpenRouter API를 완전한 타입 안전성, OpenAPI 스펙에서 자동 생성된 타입, 제로 보일러플레이트로 래핑합니다. REST API 위의 얇은 레이어로 의도적으로 가볍게 설계되었습니다.

### 설치

```bash
npm install @openrouter/sdk
```

### 사용법

```typescript
import { OpenRouter } from '@openrouter/sdk';

const client = new OpenRouter({
  apiKey: '<YOUR_API_KEY>',
  httpReferer: '', // Optional. Site URL for rankings on openrouter.ai.
  appTitle: '',    // Optional. Site title for rankings on openrouter.ai.
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

스트리밍, 임베딩, 전체 API 레퍼런스는 [Client SDKs 문서](https://openrouter.ai/docs/client-sdks)를 참조하세요.

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

정지 조건, 스트리밍, 동적 파라미터 등에 대한 자세한 내용은 [Agent SDK 문서](https://openrouter.ai/docs/agent-sdk)를 참조하세요.

---

## 4. OpenAI SDK 호환 사용법

기존 OpenAI SDK 코드를 그대로 사용하면서 OpenRouter의 모델 카탈로그에 접근할 수 있습니다. 기존에 OpenAI SDK로 구축된 코드가 있고, 코드 구조를 변경하지 않고 OpenRouter의 모델 카탈로그에 접근하려는 경우에 유용합니다.

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: '<YOUR_API_KEY>',
  defaultHeaders: {
    'HTTP-Referer': '', // Optional. Site URL for rankings on openrouter.ai.
    'X-OpenRouter-Title': '', // Optional. Site title for rankings on openrouter.ai.
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

> **참고:** 아래 Python 예제는 공식 Quickstart에 포함된 내용은 아니며, Python 사용자를 위한 보조 예시입니다.

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

## 5. 서드파티 SDK 사용

서드파티 SDK 및 프레임워크를 OpenRouter와 함께 사용하는 방법은 [프레임워크 문서](https://openrouter.ai/docs/frameworks)를 참조하세요.

---

## 선택적 헤더

OpenRouter는 앱 식별을 위한 선택적 헤더를 지원합니다:

| 헤더 | 설명 |
| --- | --- |
| `HTTP-Referer` | openrouter.ai에서 앱을 식별하는 사이트 URL (리더보드 랭킹용) |
| `X-OpenRouter-Title` | 앱 제목 설정 (`X-Title`도 허용) (리더보드 랭킹용) |

> 앱 식별에 대한 자세한 내용은 [App Attribution 가이드](https://openrouter.ai/docs/app-attribution)를 참조하세요.

## 관련 문서

- [API 레퍼런스](./02-api-reference.md)
- [툴 콜링 가이드](./03-tool-calling.md)
- [스트리밍 가이드](./04-streaming.md)
- [프레임워크 통합](./06-frameworks.md)
- [Client SDKs 문서](https://openrouter.ai/docs/client-sdks)
- [Agent SDK 문서](https://openrouter.ai/docs/agent-sdk)
- [FAQ](https://openrouter.ai/docs/faq)
- [App Attribution 가이드](https://openrouter.ai/docs/app-attribution)
