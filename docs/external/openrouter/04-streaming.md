# OpenRouter 스트리밍 가이드

> 원문: https://openrouter.ai/docs/api-reference (Streaming 섹션)

OpenRouter는 Server-Sent Events (SSE)를 통해 **모든 모델**에 대해 스트리밍을 지원합니다. 요청 본문에 `stream: true`를 설정하기만 하면 됩니다.

---

## 기본 스트리밍 요청

### Python (requests)

```python
import requests
import json

response = requests.post(
    url="https://openrouter.ai/api/v1/chat/completions",
    headers={
        "Authorization": "Bearer <YOUR_API_KEY>",
        "Content-Type": "application/json",
    },
    data=json.dumps({
        "model": "~openai/gpt-latest",
        "messages": [
            {"role": "user", "content": "Write a haiku about programming"}
        ],
        "stream": True,
    }),
    stream=True  # requests 레벨에서도 스트리밍 활성화
)

for line in response.iter_lines():
    if line:
        line = line.decode('utf-8')
        if line.startswith('data: '):
            data = line[6:]
            if data == '[DONE]':
                break
            chunk = json.loads(data)
            delta = chunk['choices'][0]['delta']
            if 'content' in delta and delta['content']:
                print(delta['content'], end='', flush=True)

print()
```

### TypeScript (fetch)

```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <YOUR_API_KEY>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: '~openai/gpt-latest',
    messages: [
      { role: 'user', content: 'Write a haiku about programming' }
    ],
    stream: true,
  }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n').filter(line => line.trim());

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') break;

      const parsed = JSON.parse(data);
      const delta = parsed.choices[0]?.delta;
      if (delta?.content) {
        process.stdout.write(delta.content);
      }
    }
  }
}
```

### OpenAI SDK (Python)

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="<YOUR_API_KEY>",
)

stream = client.chat.completions.create(
    model="~openai/gpt-latest",
    messages=[
        {"role": "user", "content": "Write a haiku about programming"}
    ],
    stream=True,
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end='', flush=True)

print()
```

### OpenAI SDK (TypeScript)

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: '<YOUR_API_KEY>',
});

const stream = await openai.chat.completions.create({
  model: '~openai/gpt-latest',
  messages: [
    { role: 'user', content: 'Write a haiku about programming' }
  ],
  stream: true,
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}
```

---

## OpenRouter Client SDK 스트리밍

```typescript
import { OpenRouter } from '@openrouter/sdk';

const client = new OpenRouter({
  apiKey: '<YOUR_API_KEY>',
});

const stream = await client.chat.send({
  model: '~openai/gpt-latest',
  messages: [
    { role: 'user', content: 'Write a haiku about programming' }
  ],
  stream: true,
});

// 스트림 처리 로직은 SDK 문서 참조
```

---

## SSE 스트림 구조

### 청크 포맷

스트리밍 시 각 청크는 다음 구조를 가집니다:

```json
{
  "id": "gen-xxxxxxxxxxxxxx",
  "choices": [
    {
      "finish_reason": null,
      "native_finish_reason": null,
      "delta": {
        "content": "Hello",
        "role": "assistant"
      }
    }
  ],
  "created": 1234567890,
  "model": "openai/gpt-4o",
  "object": "chat.completion.chunk"
}
```

- 비스트리밍에서는 `message` 필드가 사용되지만, 스트리밍에서는 `delta` 필드가 사용됩니다.
- `delta.content`에는 각 청크의 텍스트 조각이 포함됩니다.

### 종료 신호

스트림은 `data: [DONE]` 메시지로 종료됩니다. 이 메시지 직전의 마지막 청크에 `usage` 정보가 포함됩니다:

```json
{
  "id": "gen-xxxxxxxxxxxxxx",
  "choices": [],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

### 주석 페이로드

SSE 스트림에 가끔 주석(comment) 페이로드가 포함될 수 있습니다. 이는 **무시**해야 합니다.

---

## 스트리밍과 툴 콜링

스트리밍 응답에서 툴 콜을 처리할 때는 다른 콘텐츠 타입을 적절히 구분해야 합니다:

```typescript
const reader = stream.body.getReader();
let toolCalls: any[] = [];

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = new TextDecoder().decode(value);
  const lines = chunk.split('\n').filter(line => line.trim());

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));

      // 툴 콜이 포함된 delta 수집
      if (data.choices[0].delta.tool_calls) {
        toolCalls.push(...data.choices[0].delta.tool_calls);
      }

      // 툴 콜로 인한 종료
      if (data.choices[0].delta.finish_reason === 'tool_calls') {
        await handleToolCalls(toolCalls);
      }
      // 일반 종료
      else if (data.choices[0].delta.finish_reason === 'stop') {
        break;
      }
    }
  }
}
```

---

## 스트리밍과 Structured Outputs

Structured Outputs도 스트리밍과 함께 사용할 수 있습니다. 모델은 유효한 부분 JSON을 스트리밍하며, 완료되면 스키마에 맞는 유효한 응답을 형성합니다:

```json
{
  "stream": true,
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "weather",
      "strict": true,
      "schema": { ... }
    }
  }
}
```

---

## Anthropic 베타: Fine-Grained Tool Streaming

Anthropic 모델(Claude)에서 `x-anthropic-beta: fine-grained-tool-streaming-2025-05-14` 헤더를 사용하면 툴 콜 중 더 세분화된 스트리밍 이벤트를 활성화할 수 있습니다:

```typescript
const completion = await openRouter.chat.send(
  {
    model: 'anthropic/claude-sonnet-4.5',
    messages: [{ role: 'user', content: 'What is the weather in Tokyo?' }],
    tools: [weatherTool],
    stream: true,
  },
  {
    headers: {
      'x-anthropic-beta': 'fine-grained-tool-streaming-2025-05-14',
    },
  }
);
```

이를 통해 툴 인수가 생성되는 동안 실시간 업데이트를 받을 수 있습니다.

---

## 디버그 옵션

스트리밍 전용 디버그 옵션을 사용하면 프로바이더에게 전송된 변환된 요청 본문을 확인할 수 있습니다:

```json
{
  "stream": true,
  "debug": {
    "echo_upstream_body": true
  }
}
```

---

## 주의사항

1. **SSE 주석 처리**: 스트림에 주석 페이로드가 포함될 수 있으므로, `data:`로 시작하지 않는 라인은 무시해야 합니다.
2. **Usage 정보**: 비스트리밍에서는 항상 반환되지만, 스트리밍에서는 `[DONE]` 직전의 마지막 청크에 빈 `choices` 배열과 함께 반환됩니다.
3. **모델 정규화**: 응답의 `model` 필드에는 실제 사용된 모델이 표시됩니다 (예: 폴백으로 인해 다른 모델이 사용된 경우).

---

## 관련 문서

- [Quickstart](./01-quickstart.md)
- [API 레퍼런스](./02-api-reference.md)
- [툴 콜링 가이드](./03-tool-calling.md)
- [Structured Outputs](./05-structured-outputs.md)
