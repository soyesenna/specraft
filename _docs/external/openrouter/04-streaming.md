# OpenRouter 스트리밍 가이드

> 원문: https://openrouter.ai/docs/api-reference/streaming

OpenRouter는 Server-Sent Events (SSE)를 통해 **모든 모델**에 대해 스트리밍을 지원합니다. 요청 본문에 `stream` 파라미터를 `true`로 설정하기만 하면 됩니다.

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

| 필드 | 설명 |
| --- | --- |
| `id` | 생성 고유 식별자 |
| `choices[].delta` | 스트리밍 전용 필드 (비스트리밍의 `message` 대신 사용) |
| `choices[].delta.content` | 각 청크의 텍스트 조각 |
| `choices[].finish_reason` | 종료 사유 (`null`이면 진행 중, `"stop"`이면 완료) |
| `model` | 실제 사용된 모델 (폴백 시 다를 수 있음) |
| `object` | `"chat.completion.chunk"` |

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

SSE 스트림에 가끔 주석(comment) 페이로드가 포함될 수 있습니다. 이는 SSE 사양에 따라 **무시**해야 합니다. 주석은 처리 중 연결 타임아웃을 방지하기 위해 전송됩니다.

동적 로딩 인디케이터 등 UX 개선에 활용할 수 있습니다.

### 권장 SSE 클라이언트

일부 SSE 클라이언트 구현은 사양을 준수하지 않아 비-JSON 주석 페이로드에서 `JSON.stringify` 오류가 발생할 수 있습니다. 다음 클라이언트를 권장합니다:

| 클라이언트 | 설명 |
| --- | --- |
| **eventsource-parser** | SSE 사양 준수 파서 |
| **OpenAI SDK** | 내장 SSE 지원 |
| **Vercel AI SDK** | `streamData` 유틸리티 포함 |

### X-Generation-Id 헤더

모든 엔드포인트(chat completions, completions, responses, messages)의 응답에 `X-Generation-Id` 헤더가 반환됩니다. 디버깅 및 요청 추적에 유용합니다.

---

## API별 스트리밍 동작 차이

OpenRouter는 Chat Completions API와 Responses API 두 가지 엔드포인트를 제공하며, 각각 스트리밍 오류 처리 방식이 다릅니다.

### Chat Completions API (`/api/v1/chat/completions`)

| 오류 시점 | 동작 |
| --- | --- |
| **토큰 전송 전** | 독립적인 `ErrorResponse` 반환 (적절한 HTTP 상태 코드 포함) |
| **토큰 전송 후** | `choices` 배열 내에 오류 정보 포함, SSE 이벤트로 전송 |
| **스트리밍 중** | 최상위 `error` 필드가 포함된 SSE 이벤트 전송 |

### Responses API (`/api/alpha/responses`)

Responses API는 특정 오류 코드를 성공 응답으로 변환합니다:

| 원본 오류 코드 | 변환 결과 |
| --- | --- |
| `context_length_exceeded` | `finish_reason: "length"`를 가진 정상 완료 응답 |

이를 통해 한도 관련 오류를 실패가 아닌 정상 종료로 우아하게 처리할 수 있습니다.

Responses API의 스트리밍 오류 이벤트 유형:

| 이벤트 유형 | 설명 |
| --- | --- |
| `response.failed` | 공식 실패 이벤트 |
| `response.error` | 응답 생성 중 오류 |
| `error` | 일반 오류 이벤트 (OpenAI에서 전송) |

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

> **참고**: `debug` 객체는 `chat-completion` 엔드포인트의 공식 파라미터로 문서화되어 있습니다. 자세한 내용은 [Chat Completion API 레퍼런스](https://openrouter.ai/docs/api-reference/chat-completion)를 참조하세요.

---

## 스트림 취소 (Stream Cancellation)

스트리밍 요청은 연결을 중단하여 취소할 수 있습니다. 지원되는 프로바이더의 경우, 모델 처리와 요금 청구가 즉시 중단됩니다.

### 프로바이더 지원 현황

| 분류 | 프로바이더 |
| --- | --- |
| **지원됨** | OpenAI, Azure, Anthropic, Fireworks, Mancer, Recursal, AnyScale, Lepton, OctoAI, Novita, DeepInfra, Together, Cohere, Hyperbolic, Infermatic, Avian, XAI, Cloudflare, SFCompute, Nineteen, Liquid, Friendli, Chutes, DeepSeek |
| **미지원** | AWS Bedrock, Groq, Modal, Google, Google AI Studio, Minimax, HuggingFace, Replicate, Perplexity, Mistral, AI21, Featherless, Lynn, Lambda, Reflection, SambaNova, Inflection, ZeroOneAI, AionLabs, Alibaba, Nebius, Kluster, Targon, InferenceNet |

### Python 예제 (requests + 스트림 취소)

```python
import requests
import json
import threading
import time

# AbortController 역할을 하는 threading.Event
cancel_event = threading.Event()

def stream_with_cancellation():
    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": "Bearer <YOUR_API_KEY>",
            "Content-Type": "application/json",
        },
        data=json.dumps({
            "model": "~openai/gpt-latest",
            "messages": [{"role": "user", "content": "Write a long story"}],
            "stream": True,
        }),
        stream=True,
    )

    for line in response.iter_lines():
        # 취소 이벤트 확인
        if cancel_event.is_set():
            response.close()
            print("\n[Stream cancelled]")
            return

        if line:
            line = line.decode('utf-8')
            if line.startswith('data: '):
                data = line[6:]
                if data == '[DONE]':
                    break
                chunk = json.loads(data)
                delta = chunk['choices'][0].get('delta', {})
                if delta.get('content'):
                    print(delta['content'], end='', flush=True)

    print()

# 예: 3초 후 스트림 취소
def cancel_after_timeout():
    time.sleep(3)
    cancel_event.set()

threading.Thread(target=cancel_after_timeout, daemon=True).start()
stream_with_cancellation()
```

### TypeScript 예제 (AbortController)

```typescript
const controller = new AbortController();

try {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer <YOUR_API_KEY>',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: '~openai/gpt-latest',
      messages: [{ role: 'user', content: 'Write a story' }],
      stream: true,
    }),
    signal: controller.signal,
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
        const content = parsed.choices[0]?.delta?.content;
        if (content) process.stdout.write(content);
      }
    }
  }
} catch (error: any) {
  if (error.name === 'AbortError') {
    console.log('\nStream cancelled');
  } else {
    throw error;
  }
}

// 스트림 취소:
// controller.abort();
```

> **참고**: 취소는 지원되는 프로바이더의 스트리밍 요청에만 작동합니다. 비스트리밍 요청이나 미지원 프로바이더의 경우, 모델이 계속 처리되며 전체 응답에 대해 요금이 청구됩니다.

---

## 스트리밍 중 오류 처리

오류 발생 시점에 따라 처리 방식이 다릅니다.

### 토큰 전송 전 오류 (Pre-Stream Errors)

토큰이 스트리밍되기 전에 오류가 발생하면, 표준 JSON 오류 응답이 반환됩니다:

```json
{
  "error": {
    "code": 400,
    "message": "Invalid model specified"
  }
}
```

| 상태 코드 | 의미 |
| --- | --- |
| **400** | 잘못된 요청 (파라미터 오류, CORS) |
| **401** | 인증 실패 (OAuth 세션 만료, 비활성화/잘못된 API 키) |
| **402** | 결제 필요 (크레딧 부족) |
| **403** | 선택한 모델에 moderation 필요, 입력이 플래그됨 |
| **408** | 요청 시간 초과 |
| **429** | 요청 과다 (속도 제한) |
| **502** | Bad Gateway (모델 다운 또는 잘못된 응답) |
| **503** | 서비스 불가 (라우팅 요구사항을 충족하는 프로바이더 없음) |

### 토큰 전송 후 오류 (Mid-Stream Errors)

일부 토큰이 이미 스트리밍된 후 오류가 발생하면, HTTP 상태 코드를 변경할 수 없으므로(이미 200 OK), 오류가 SSE 이벤트로 전송됩니다:

```json
{
  "id": "gen-xxx",
  "error": {
    "code": 502,
    "message": "Provider error occurred"
  },
  "choices": [
    {
      "finish_reason": "error",
      "delta": { "content": null }
    }
  ]
}
```

| 특징 | 설명 |
| --- | --- |
| 오류 위치 | 표준 응답 필드와 함께 **최상위 수준** |
| 종료 신호 | `choices` 배열에 `finish_reason: "error"` 포함 |
| HTTP 상태 | 200 OK 유지 |
| 스트림 종료 | 오류 이벤트 전송 후 스트림 종료 |

### 오류 처리 코드 예제

```typescript
async function streamWithErrorHandling(prompt: string) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer <YOUR_API_KEY>',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: '~openai/gpt-latest',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
  });

  // 토큰 전송 전 오류 (HTTP 상태 코드로 판별)
  if (!response.ok) {
    const err = await response.json();
    console.error(`Pre-stream error (${response.status}): ${err.error.message}`);
    return;
  }

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

        // 미드스트림 오류 확인
        if ('error' in parsed) {
          console.error(`Stream error: ${parsed.error.message}`);
          if (parsed.choices?.[0]?.finish_reason === 'error') {
            console.log('Stream terminated due to error');
          }
          return;
        }

        // 정상 콘텐츠 처리
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          process.stdout.write(content);
        }
      }
    }
  }
}
```

---

## 주의사항

1. **SSE 주석 처리**: 스트림에 주석 페이로드가 포함될 수 있으므로, `data:`로 시작하지 않는 라인은 무시해야 합니다.
2. **Usage 정보**: 비스트리밍에서는 항상 반환되지만, 스트리밍에서는 `[DONE]` 직전의 마지막 청크에 빈 `choices` 배열과 함께 반환됩니다.
3. **모델 정규화**: 응답의 `model` 필드에는 실제 사용된 모델이 표시됩니다 (예: 폴백으로 인해 다른 모델이 사용된 경우).
4. **스트림 취소**: 지원되는 프로바이더에서만 처리가 중단됩니다. 미지원 프로바이더는 전체 요금이 청구됩니다.
5. **미드스트림 오류**: 토큰 전송 후 오류는 SSE 이벤트로 전달되며 HTTP 200 상태를 유지합니다.
6. **API별 차이**: Chat Completions API와 Responses API는 오류 처리 방식이 다릅니다. 특히 Responses API는 `context_length_exceeded`를 `finish_reason: "length"`로 변환합니다.

---

## 관련 문서

- [Quickstart](./01-quickstart.md)
- [API 레퍼런스](./02-api-reference.md)
- [툴 콜링 가이드](./03-tool-calling.md)
- [Structured Outputs](./05-structured-outputs.md)
- [공식 API Streaming 문서](https://openrouter.ai/docs/api-reference/streaming)
- [공식 Error Handling 문서](https://openrouter.ai/docs/api-reference/errors)
- [공식 Chat Completion API](https://openrouter.ai/docs/api-reference/chat-completion)
