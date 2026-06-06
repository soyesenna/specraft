# OpenRouter Responses API Beta 가이드

> 원문: https://openrouter.ai/docs/api-reference/responses/basic-usage

Responses API Beta는 OpenAI Responses API와 호환되는 새로운 엔드포인트로, 구조화된 입출력, 추론(reasoning), 툴 콜링, 웹 검색을 단일 인터페이스로 제공합니다. 현재 **Beta 단계**이며 향후 Breaking Change가 발생할 수 있습니다.

---

## 개요

### 엔드포인트

| 항목 | 값 |
| --- | --- |
| 엔드포인트 | `POST https://openrouter.ai/api/v1/responses` |
| 호환성 | OpenAI Responses API 호환 |
| 상태 | **Beta** (Breaking Change 가능) |
| 세션 관리 | **Stateless** (서버가 대화 상태를 저장하지 않음) |

> **참고**: Chat Completions API (`/api/v1/chat/completions`)와는 별개의 엔드포인트입니다. 기존 Chat Completions 기반 프로젝트는 변경 없이 계속 사용할 수 있습니다.

---

## Basic Usage (기본 사용법)

### 단순 텍스트 입력

가장 간단한 형태는 `input` 필드에 문자열을 직접 전달하는 것입니다.

```typescript
const response = await fetch('https://openrouter.ai/api/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_OPENROUTER_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/o4-mini',
    input: 'What is the meaning of life?',
    max_output_tokens: 9000,
  }),
});

const result = await response.json();
console.log(result);
```

### 구조화된 메시지 입력

복잡한 대화에는 메시지 배열 형식을 사용합니다.

```typescript
const response = await fetch('https://openrouter.ai/api/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_OPENROUTER_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/o4-mini',
    input: [
      {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Tell me a joke about programming',
          },
        ],
      },
    ],
    max_output_tokens: 9000,
  }),
});

const result = await response.json();
```

### 응답 포맷

API는 구조화된 JSON 응답을 반환합니다.

```json
{
  "id": "resp_1234567890",
  "object": "response",
  "created_at": 1234567890,
  "model": "openai/o4-mini",
  "output": [
    {
      "type": "message",
      "id": "msg_abc123",
      "status": "completed",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "The meaning of life is a philosophical question...",
          "annotations": []
        }
      ]
    }
  ],
  "usage": {
    "input_tokens": 12,
    "output_tokens": 45,
    "total_tokens": 57
  },
  "status": "completed"
}
```

### 공통 파라미터

| 파라미터 | 타입 | 설명 |
| --- | --- | --- |
| `model` | string | **필수.** 사용할 모델 (예: `openai/o4-mini`) |
| `input` | string \| array | **필수.** 텍스트 문자열 또는 메시지 배열 |
| `stream` | boolean | 스트리밍 응답 활성화 (기본값: `false`) |
| `max_output_tokens` | integer | 생성할 최대 토큰 수 |
| `temperature` | number | 샘플링 온도 (0~2) |
| `top_p` | number | Nucleus 샘플링 파라미터 (0~1) |

---

## 스트리밍

`stream: true`를 설정하면 Server-Sent Events(SSE) 형식으로 실시간 응답을 받을 수 있습니다.

### 스트리밍 요청

```typescript
const response = await fetch('https://openrouter.ai/api/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_OPENROUTER_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/o4-mini',
    input: 'Write a short story about AI',
    stream: true,
    max_output_tokens: 9000,
  }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        console.log(parsed);
      } catch (e) {
        // 유효하지 않은 JSON 건너뛰기
      }
    }
  }
}
```

### 스트리밍 이벤트 타입

스트리밍 응답은 다음 순서로 SSE 이벤트를 전송합니다.

| 이벤트 타입 | 설명 |
| --- | --- |
| `response.created` | 응답 객체 생성 |
| `response.output_item.added` | 출력 아이템(메시지, 함수 콜 등) 추가 |
| `response.content_part.added` | 콘텐츠 파트 추가 |
| `response.content_part.delta` | 텍스트 조각 스트리밍 |
| `response.output_item.done` | 출력 아이템 완료 |
| `response.done` | 전체 응답 완료 |

```text
data: {"type":"response.created","response":{"id":"resp_1234567890","object":"response","status":"in_progress"}}

data: {"type":"response.output_item.added","response_id":"resp_1234567890","output_index":0,"item":{"type":"message","id":"msg_abc123","role":"assistant","status":"in_progress","content":[]}}

data: {"type":"response.content_part.added","response_id":"resp_1234567890","output_index":0,"content_index":0,"part":{"type":"output_text","text":""}}

data: {"type":"response.content_part.delta","response_id":"resp_1234567890","output_index":0,"content_index":0,"delta":"Once"}

data: {"type":"response.content_part.delta","response_id":"resp_1234567890","output_index":0,"content_index":0,"delta":" upon"}

data: {"type":"response.content_part.delta","response_id":"resp_1234567890","output_index":0,"content_index":0,"delta":" a time"}

data: {"type":"response.output_item.done","response_id":"resp_1234567890","output_index":0,"item":{"type":"message","id":"msg_abc123","role":"assistant","status":"completed","content":[{"type":"output_text","text":"Once upon a time..."}]}}

data: {"type":"response.done","response":{"id":"resp_1234567890","object":"response","status":"completed","usage":{"input_tokens":12,"output_tokens":45,"total_tokens":57}}}

data: [DONE]
```

---

## 멀티턴 대화

Responses API는 **Stateless**이므로, 모든 요청에 전체 대화 기록을 포함해야 합니다. API 서버는 이전 메시지를 저장하지 않으며, 클라이언트 측에서 컨텍스트를 유지해야 합니다.

### 첫 번째 요청

```typescript
const firstResponse = await fetch('https://openrouter.ai/api/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_OPENROUTER_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/o4-mini',
    input: [
      {
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_text', text: 'What is the capital of France?' },
        ],
      },
    ],
    max_output_tokens: 9000,
  }),
});

const firstResult = await firstResponse.json();
```

### 후속 요청 (대화 기록 포함)

```typescript
const secondResponse = await fetch('https://openrouter.ai/api/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_OPENROUTER_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/o4-mini',
    input: [
      {
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_text', text: 'What is the capital of France?' },
        ],
      },
      {
        type: 'message',
        role: 'assistant',
        id: 'msg_abc123',
        status: 'completed',
        content: [
          { type: 'output_text', text: 'The capital of France is Paris.', annotations: [] },
        ],
      },
      {
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_text', text: 'What is the population of that city?' },
        ],
      },
    ],
    max_output_tokens: 9000,
  }),
});

const secondResult = await secondResponse.json();
```

> **필수 필드**: 대화 기록에 포함되는 `assistant` 역할의 메시지에는 `id`와 `status` 필드가 필수입니다.

---

## Reasoning (추론)

Responses API는 모델이 내부 추론 과정을 보여주는 기능을 `reasoning` 파라미터로 제어할 수 있습니다.

### Reasoning 설정

```typescript
const response = await fetch('https://openrouter.ai/api/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_OPENROUTER_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/o4-mini',
    input: 'What is the meaning of life?',
    reasoning: {
      effort: 'high',
    },
    max_output_tokens: 9000,
  }),
});

const result = await response.json();
```

### Effort 레벨

`effort` 파라미터는 모델이 추론에 할당하는 연산량을 제어합니다.

| Effort 수준 | 설명 |
| --- | --- |
| `minimal` | 최소한의 연산으로 기본 수준의 추론 |
| `low` | 단순 문제에 대한 가벼운 추론 |
| `medium` | 중간 복잡도 문제에 대한 균형 잡힌 추론 |
| `high` | 복잡한 문제에 대한 깊은 추론 |

> **참고**: Chat Completions API의 `reasoning` 파라미터에서는 `xhigh` 및 `none` 수준도 지원하지만, Responses API에서는 위 4단계만 공식 문서에 명시되어 있습니다.

### 추론 응답 구조

Reasoning이 활성화된 경우, 응답의 `output` 배열에 `reasoning` 타입 항목이 포함됩니다. 추론 내용은 **암호화(encrypted)** 되어 전송됩니다.

```json
{
  "id": "resp_1234567890",
  "object": "response",
  "created_at": 1234567890,
  "model": "openai/o4-mini",
  "output": [
    {
      "type": "reasoning",
      "id": "rs_abc123",
      "encrypted_content": "gAAAAABotI9-FK1PbhZhaZk4yMrZw3XDI1AWFaKb9T0NQq7LndK6zaRB...",
      "summary": [
        "First, I need to determine the current year",
        "Then calculate the difference from 1995",
        "Finally, compare that to 30 years"
      ]
    },
    {
      "type": "message",
      "id": "msg_xyz789",
      "status": "completed",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "Yes. In 2025, 1995 was 30 years ago.",
          "annotations": []
        }
      ]
    }
  ],
  "usage": {
    "input_tokens": 15,
    "output_tokens": 85,
    "output_tokens_details": {
      "reasoning_tokens": 45
    },
    "total_tokens": 100
  },
  "status": "completed"
}
```

### 스트리밍 Reasoning

스트리밍 모드에서는 `response.reasoning.delta` 이벤트로 추론 과정을 실시간으로 수신할 수 있습니다.

```typescript
const response = await fetch('https://openrouter.ai/api/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_OPENROUTER_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/o4-mini',
    input: 'Solve this step by step: If a train travels 60 mph for 2.5 hours, how far does it go?',
    reasoning: { effort: 'medium' },
    stream: true,
    max_output_tokens: 9000,
  }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'response.reasoning.delta') {
          console.log('Reasoning:', parsed.delta);
        }
      } catch (e) {
        // 유효하지 않은 JSON 건너뛰기
      }
    }
  }
}
```

### Reasoning Best Practices

- **적절한 effort 수준 선택**: 복잡한 문제에는 `high`, 단순 작업에는 `low` 사용
- **토큰 사용량 고려**: Reasoning 활성화 시 토큰 소비가 증가하며 `usage.output_tokens_details.reasoning_tokens`에서 확인 가능
- **스트리밍 권장**: 긴 추론 체인의 경우 스트리밍이 더 나은 사용자 경험을 제공
- **충분한 컨텍스트 제공**: 모델이 효과적으로 추론할 수 있도록 충분한 맥락 정보 포함

---

## Tool Calling (툴 콜링)

Responses API는 OpenAI 함수 호출 형식의 툴 정의를 지원하며, 병렬 실행 및 멀티 툴 워크플로우를 처리할 수 있습니다.

### 툴 정의

```typescript
const weatherTool = {
  type: 'function' as const,
  name: 'get_weather',
  description: 'Get the current weather in a location',
  strict: null,
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'The city and state, e.g. San Francisco, CA',
      },
      unit: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
      },
    },
    required: ['location'],
  },
};

const response = await fetch('https://openrouter.ai/api/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_OPENROUTER_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/o4-mini',
    input: [
      {
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_text', text: 'What is the weather in San Francisco?' },
        ],
      },
    ],
    tools: [weatherTool],
    tool_choice: 'auto',
    max_output_tokens: 9000,
  }),
});

const result = await response.json();
```

### Tool Choice 옵션

| Tool Choice | 설명 |
| --- | --- |
| `auto` | 모델이 툴 호출 여부를 결정 |
| `none` | 툴을 호출하지 않음 |
| `{type: 'function', name: 'tool_name'}` | 특정 툴 강제 호출 |

**특정 툴 강제 호출 예시:**

```typescript
body: JSON.stringify({
  model: 'openai/o4-mini',
  input: [/* ... */],
  tools: [weatherTool],
  tool_choice: { type: 'function', name: 'get_weather' },
  max_output_tokens: 9000,
}),
```

**툴 콜링 비활성화:**

```typescript
body: JSON.stringify({
  model: 'openai/o4-mini',
  input: [/* ... */],
  tools: [weatherTool],
  tool_choice: 'none',
  max_output_tokens: 9000,
}),
```

### 복수 툴 및 병렬 실행

여러 툴을 정의하고 병렬로 실행할 수 있습니다.

```typescript
const calculatorTool = {
  type: 'function' as const,
  name: 'calculate',
  description: 'Perform mathematical calculations',
  strict: null,
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate',
      },
    },
    required: ['expression'],
  },
};

// 병렬 툴 콜 요청
const response = await fetch('https://openrouter.ai/api/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_OPENROUTER_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/o4-mini',
    input: [
      {
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_text', text: 'Calculate 10*5 and also tell me the weather in Miami' },
        ],
      },
    ],
    tools: [weatherTool, calculatorTool],
    tool_choice: 'auto',
    max_output_tokens: 9000,
  }),
});
```

### 툴 콜 응답

툴이 호출되면 응답에 `function_call` 타입의 항목이 포함됩니다.

```json
{
  "id": "resp_1234567890",
  "object": "response",
  "created_at": 1234567890,
  "model": "openai/o4-mini",
  "output": [
    {
      "type": "function_call",
      "id": "fc_abc123",
      "call_id": "call_xyz789",
      "name": "get_weather",
      "arguments": "{\"location\":\"San Francisco, CA\"}"
    }
  ],
  "usage": {
    "input_tokens": 45,
    "output_tokens": 25,
    "total_tokens": 70
  },
  "status": "completed"
}
```

**`function_call` 필수 필드:**

| 필드 | 설명 |
| --- | --- |
| `type` | 항상 `"function_call"` |
| `id` | 함수 콜 객체의 고유 식별자 |
| `call_id` | 호출의 고유 식별자 |
| `name` | 툴 정의와 일치하는 함수명 |
| `arguments` | 함수 파라미터가 포함된 유효한 JSON 문자열 |

### 툴 결과 후속 요청

툴 실행 결과를 대화 기록에 포함하여 후속 요청을 보냅니다.

```typescript
const response = await fetch('https://openrouter.ai/api/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_OPENROUTER_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/o4-mini',
    input: [
      {
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_text', text: 'What is the weather in Boston?' },
        ],
      },
      {
        type: 'function_call',
        id: 'fc_1',
        call_id: 'call_123',
        name: 'get_weather',
        arguments: JSON.stringify({ location: 'Boston, MA' }),
      },
      {
        type: 'function_call_output',
        id: 'fc_output_1',
        call_id: 'call_123',
        output: JSON.stringify({ temperature: '72°F', condition: 'Sunny' }),
      },
      {
        type: 'message',
        role: 'assistant',
        id: 'msg_abc123',
        status: 'completed',
        content: [
          {
            type: 'output_text',
            text: 'The weather in Boston is currently 72°F and sunny.',
            annotations: [],
          },
        ],
      },
      {
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_text', text: 'Is that good weather for a picnic?' },
        ],
      },
    ],
    max_output_tokens: 9000,
  }),
});
```

> **필수 필드**: `function_call_output` 객체에는 `id` 필드가 필수입니다.

### 스트리밍 툴 콜

스트리밍으로 툴 콜을 실시간 모니터링할 수 있습니다.

```typescript
const response = await fetch('https://openrouter.ai/api/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_OPENROUTER_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/o4-mini',
    input: [
      {
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_text', text: 'What is the weather like in Tokyo?' },
        ],
      },
    ],
    tools: [weatherTool],
    tool_choice: 'auto',
    stream: true,
    max_output_tokens: 9000,
  }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'response.output_item.added' &&
            parsed.item?.type === 'function_call') {
          console.log('Function call:', parsed.item.name);
        }
        if (parsed.type === 'response.function_call_arguments.done') {
          console.log('Arguments:', parsed.arguments);
        }
      } catch (e) {
        // 유효하지 않은 JSON 건너뛰기
      }
    }
  }
}
```

---

## Web Search (웹 검색)

Responses API는 웹 검색 통합을 지원하여, 모델이 실시간 인터넷 정보에 접근하고 출처 인용(Annotation)을 포함한 응답을 제공할 수 있습니다.

### 웹 검색 활성화

`plugins` 파라미터를 통해 웹 검색을 활성화합니다.

```typescript
const response = await fetch('https://openrouter.ai/api/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_OPENROUTER_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/o4-mini',
    input: 'What is OpenRouter?',
    plugins: [{ id: 'web', max_results: 3 }],
    max_output_tokens: 9000,
  }),
});

const result = await response.json();
```

### 플러그인 설정

| 파라미터 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string | **필수.** `"web"`로 고정 |
| `max_results` | integer | 검색 결과 최대 수 (1~10) |

### Online 모델 변형

일부 모델은 `:online` 접미사를 통해 내장 웹 검색 기능을 사용할 수 있습니다.

```typescript
const response = await fetch('https://openrouter.ai/api/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_OPENROUTER_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/o4-mini:online',
    input: 'What was a positive news story from today?',
    max_output_tokens: 9000,
  }),
});
```

### Citation Annotation

웹 검색 응답에는 인용 Annotation이 포함됩니다.

```json
{
  "id": "resp_1234567890",
  "object": "response",
  "created_at": 1234567890,
  "model": "openai/o4-mini",
  "output": [
    {
      "type": "message",
      "id": "msg_abc123",
      "status": "completed",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "OpenRouter is a unified API for accessing multiple LLM providers...",
          "annotations": [
            {
              "type": "url_citation",
              "url": "https://openrouter.ai/docs",
              "start_index": 0,
              "end_index": 85
            },
            {
              "type": "url_citation",
              "url": "https://openrouter.ai/models",
              "start_index": 120,
              "end_index": 180
            }
          ]
        }
      ]
    }
  ],
  "usage": {
    "input_tokens": 15,
    "output_tokens": 95,
    "total_tokens": 110
  },
  "status": "completed"
}
```

**URL Citation Annotation 구조:**

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | string | `"url_citation"` |
| `url` | string | 인용된 페이지의 URL |
| `start_index` | integer | 텍스트에서 인용이 시작되는 인덱스 |
| `end_index` | integer | 텍스트에서 인용이 끝나는 인덱스 |

### Annotation 추출 유틸리티

```typescript
function extractCitations(response: any) {
  const messageOutput = response.output?.find((o: any) => o.type === 'message');
  const textContent = messageOutput?.content?.find((c: any) => c.type === 'output_text');
  const annotations = textContent?.annotations || [];

  return annotations
    .filter((annotation: any) => annotation.type === 'url_citation')
    .map((annotation: any) => ({
      url: annotation.url,
      text: textContent.text.slice(annotation.start_index, annotation.end_index),
      startIndex: annotation.start_index,
      endIndex: annotation.end_index,
    }));
}

const result = await response.json();
const citations = extractCitations(result);
console.log('Found citations:', citations);
```

### 스트리밍 웹 검색

스트리밍으로 웹 검색 진행 상황을 모니터링할 수 있습니다.

```typescript
const response = await fetch('https://openrouter.ai/api/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_OPENROUTER_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/o4-mini',
    input: [
      {
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_text', text: 'What is the latest news about AI?' },
        ],
      },
    ],
    plugins: [{ id: 'web', max_results: 2 }],
    stream: true,
    max_output_tokens: 9000,
  }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'response.completed') {
          const annotations = parsed.response?.output
            ?.find((o: any) => o.type === 'message')
            ?.content?.find((c: any) => c.type === 'output_text')
            ?.annotations || [];
          console.log('Citations:', annotations.length);
        }
      } catch (e) {
        // 유효하지 않은 JSON 건너뛰기
      }
    }
  }
}
```

---

## Error Handling (에러 처리)

### 에러 응답 형식

Responses API는 에러 발생 시 다음 형식의 JSON을 반환합니다. Chat Completions API와 달리 `error.code`는 문자열 형식이며, `metadata`는 `error` 객체와 같은 레벨의 최상위 필드입니다.

```json
{
  "error": {
    "code": "invalid_prompt",
    "message": "The input prompt is invalid or missing required fields."
  },
  "metadata": null
}
```

```typescript
type ResponsesErrorResponse = {
  error: {
    code: string;      // 문자열 에러 코드 (예: 'invalid_prompt', 'rate_limit_exceeded', 'server_error')
    message: string;
  };
  metadata: Record<string, unknown> | null;  // error와 같은 레벨의 최상위 필드
};
```

> **참고**: Chat Completions API의 에러 형식(`{ error: { code: number, message, metadata } }`)과 다릅니다. Responses API에서는 `code`가 문자열이고 `metadata`가 `error` 외부에 위치합니다.

### 에러 처리 예시

```typescript
try {
  const response = await fetch('https://openrouter.ai/api/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_OPENROUTER_API_KEY',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/o4-mini',
      input: 'Hello, world!',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error.error.code, error.error.message);
    if (error.metadata) {
      console.error('Metadata:', error.metadata);
    }
    return;
  }

  const result = await response.json();
  console.log(result);
} catch (error) {
  console.error('Network Error:', error);
}
```

### 에러 코드

Responses API는 Chat Completions API의 HTTP 상태 코드 방식과 달리 문자열 기반 에러 코드를 사용합니다.

| 에러 코드 | HTTP 동등 | 설명 |
| --- | --- | --- |
| **`invalid_prompt`** | 400 | 요청이 유효하지 않거나 필수 파라미터가 누락됨 |
| **`rate_limit_exceeded`** | 429 | 속도 제한(Rate Limit) 초과 |
| **`server_error`** | 500+ | 서버 내부 오류 (모델 프로바이더 장애, 라우팅 불가 등) |

> **참고**: 위 에러 코드는 Responses API 전용입니다. Chat Completions API의 HTTP 상태 코드 기반 에러(400, 401, 402, 403, 408, 429, 502, 503)는 `/api/v1/chat/completions` 엔드포인트에서 사용됩니다.

### Moderation 에러

입력이 검열 플래그된 경우 최상위 `metadata` 필드에 상세 정보가 포함됩니다.

```json
{
  "error": {
    "code": "invalid_prompt",
    "message": "Input flagged by moderation"
  },
  "metadata": {
    "reasons": ["violence"],
    "flagged_input": "...",
    "provider_name": "...",
    "model_slug": "..."
  }
}
```

```typescript
type ModerationErrorMetadata = {
  reasons: string[];           // 플래그된 이유
  flagged_input: string;       // 플래그된 텍스트 세그먼트 (최대 100자)
  provider_name: string;       // 검열을 요청한 프로바이더명
  model_slug: string;
};
```

### Provider 에러

모델 프로바이더에서 에러가 발생한 경우:

```json
{
  "error": {
    "code": "server_error",
    "message": "Provider returned an error"
  },
  "metadata": {
    "provider_name": "...",
    "raw": "..."
  }
}
```

```typescript
type ProviderErrorMetadata = {
  provider_name: string;  // 에러가 발생한 프로바이더명
  raw: unknown;           // 프로바이더의 원본 에러
};
```

### 콘텐츠 미생성

간혹 모델이 콘텐츠를 생성하지 못하는 경우가 있습니다. 주요 원인은 다음과 같습니다.

- 모델이 콜드 스타트에서 웜업 중
- 시스템이 요청 증가에 맞춰 스케일업 중

웜업 시간은 모델과 프로바이더에 따라 수 초에서 수 분까지 소요될 수 있습니다. 지속적인 문제 발생 시 재시도 메커니즘 구현 또는 다른 프로바이더/모델 사용을 고려하세요.

> **주의**: 콘텐츠가 생성되지 않은 경우에도 업스트림 프로바이더에서 프롬프트 처리 비용이 청구될 수 있습니다.

---

## Chat Completions과의 차이점

Responses API와 기존 Chat Completions API의 주요 차이는 다음과 같습니다.

| 항목 | Chat Completions API | Responses API Beta |
| --- | --- | --- |
| 엔드포인트 | `/api/v1/chat/completions` | `/api/v1/responses` |
| 입력 필드 | `messages` (메시지 배열만) | `input` (문자열 또는 메시지 배열) |
| 메시지 콘텐츠 타입 | `content: "text"` 또는 `content: [{type: "text", ...}]` | `content: [{type: "input_text", ...}]` |
| 출력 콘텐츠 타입 | `choices[].message.content` | `output[].content[].type === "output_text"` |
| 툴 결과 전달 | `role: "tool"` 메시지 | `type: "function_call_output"` 객체 |
| Reasoning | `reasoning` 파라미터 (Chat Completions 포맷) | `reasoning` 파라미터 (Responses 포맷) |
| 웹 검색 | `plugins` 파라미터 | `plugins` 파라미터 (동일) |
| 스트리밍 이벤트 | `choices[].delta.content` | `response.content_part.delta` |
| 응답 구조 | `choices[]` 배열 | `output[]` 배열 |
| 사용량 | `usage.total_tokens` | `usage.total_tokens` + `output_tokens_details` |
| 상태 | 안정(Stable) | **Beta** (Breaking Change 가능) |
| OpenAI 호환 | OpenAI Chat Completions 포맷 | OpenAI Responses API 포맷 |

### 마이그레이션 고려사항

- **입력 필드명 변경**: `messages` → `input`
- **콘텐츠 타입명 변경**: `text` → `input_text` (입력), `output_text` (출력)
- **응답 구조 변경**: `choices[0].message.content` → `output[0].content[0].text`
- **툴 결과 전달 방식 변경**: `role: "tool"` 메시지 → `type: "function_call_output"` 객체
- **상태 관리**: 두 API 모두 Stateless

---

## 관련 문서

- [01-quickstart.md](./01-quickstart.md) - API, Client SDK, Agent SDK 기본 사용법
- [02-api-reference.md](./02-api-reference.md) - Chat Completions API 레퍼런스
- [03-tool-calling.md](./03-tool-calling.md) - Chat Completions 기반 툴 콜링 가이드
- [04-streaming.md](./04-streaming.md) - SSE 스트리밍 상세 가이드
- [10-web-search.md](./10-web-search.md) - 웹 검색 플러그인 상세 가이드
- [17-reasoning-tokens.md](./17-reasoning-tokens.md) - 추론 토큰(Effort Level, 프로바이더별 지원) 가이드
