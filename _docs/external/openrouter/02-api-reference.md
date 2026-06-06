# OpenRouter API 레퍼런스

> 원문: https://openrouter.ai/docs/api-reference

OpenRouter의 요청/응답 스키마는 OpenAI Chat API와 매우 유사합니다. **OpenRouter는 모델과 프로바이더 간 스키마를 정규화**하므로 하나의 스키마만 학습하면 됩니다.

---

## OpenAPI 스펙

완전한 API는 OpenAPI 스펙으로 문서화되어 있습니다 (YAML/JSON 형식 모두 제공). Swagger UI, Postman 또는 OpenAPI 호환 코드 생성기에 사용할 수 있습니다.

---

## 요청 (Request)

### Completions 요청 포맷

`POST /api/v1/chat/completions` 엔드포인트의 요청 본문 TypeScript 타입 정의:

```typescript
// Definitions of subtypes are below
type Request = {
  // "messages" 또는 "prompt" 중 하나 필수
  messages?: Message[];
  prompt?: string;

  // "model"이 지정되지 않으면 사용자 기본값 사용
  model?: string;

  // 특정 출력 포맷 강제 (Structured Outputs)
  response_format?: ResponseFormat;

  stop?: string | string[];
  stream?: boolean; // 스트리밍 활성화

  // 모델 기능 확장 플러그인
  plugins?: Plugin[];

  // LLM 파라미터
  max_tokens?: number;       // 범위: [1, context_length)
  temperature?: number;      // 범위: [0.0, 2.0], 기본값: 1.0

  // 툴 콜링
  tools?: Tool[];
  tool_choice?: ToolChoice;

  // 샘플링 파라미터
  seed?: number;                     // 정수만 (재현 가능한 결과)
  top_p?: number;                    // 범위: [0.0, 1.0], 기본값: 1.0
  top_k?: number;                    // 정수, 0 이상, 기본값: 0 (OpenAI 모델은 미지원)
  frequency_penalty?: number;        // 범위: [-2.0, 2.0], 기본값: 0.0
  presence_penalty?: number;         // 범위: [-2.0, 2.0], 기본값: 0.0
  repetition_penalty?: number;       // 범위: [0.0, 2.0], 기본값: 1.0
  min_p?: number;                    // 범위: [0.0, 1.0], 기본값: 0.0
  top_a?: number;                    // 범위: [0.0, 1.0], 기본값: 0.0
  logit_bias?: { [key: number]: number };
  top_logprobs: number;              // 정수만

  // 추론(Reasoning) 제어
  reasoning?: {
    enabled?: boolean;               // 추론 활성화 여부
    effort?: 'xhigh' | 'high' | 'medium' | 'low' | 'minimal' | 'none';
    max_tokens?: number;             // 최대 추론 토큰 수
    exclude?: boolean;               // 응답에서 추론 토큰 제외
  };
  reasoning_effort?: 'xhigh' | 'high' | 'medium' | 'low' | 'minimal' | 'none';
  include_reasoning?: boolean;       // deprecated: reasoning.exclude의 별칭

  // 지연 시간 최적화 (predicted output)
  prediction?: { type: 'content'; content: string };

  // OpenRouter 전용 파라미터
  models?: string[];          // 모델 폴백 배열
  route?: 'fallback';
  provider?: ProviderPreferences; // 프로바이더 라우팅 설정
  user?: string;              // 사용자 식별자 (남용 방지용)

  // 디버그 옵션 (스트리밍 전용)
  debug?: {
    echo_upstream_body?: boolean;
  };
};
```

### 서브타입 정의

```typescript
type TextContent = {
  type: 'text';
  text: string;
};

type ImageContentPart = {
  type: 'image_url';
  image_url: {
    url: string;    // URL 또는 base64 인코딩 이미지 데이터
    detail?: string; // 기본값: "auto"
  };
};

type ContentPart = TextContent | ImageContentPart;

type Message =
  | {
      role: 'user' | 'assistant' | 'system';
      content: string | ContentPart[]; // ContentPart는 "user" 역할만
      name?: string;
    }
  | {
      role: 'tool';
      content: string;
      tool_call_id: string;
      name?: string;
    };

type FunctionDescription = {
  description?: string;
  name: string;
  parameters: object; // JSON Schema 객체
};

type Tool = {
  type: 'function';
  function: FunctionDescription;
};

type ToolChoice =
  | 'none'
  | 'auto'
  | {
      type: 'function';
      function: {
        name: string;
      };
    };

type ResponseFormat =
  | { type: 'json_object' }
  | {
      type: 'json_schema';
      json_schema: {
        name: string;
        strict?: boolean;
        schema: object; // JSON Schema 객체
      };
    };

type Plugin = {
  id: string; // 'web', 'file-parser', 'response-healing', 'context-compression'
  enabled?: boolean;
  [key: string]: unknown; // 플러그인별 추가 옵션
};
```

---

## Structured Outputs

`response_format` 파라미터로 모델의 JSON 응답을 강제할 수 있습니다:

- `{ type: 'json_object' }`: 기본 JSON 모드
- `{ type: 'json_schema', json_schema: { ... } }`: 엄격한 스키마 모드

---

## Plugins

플러그인은 요청의 `plugins` 배열로 활성화합니다:

```json
{
  "plugins": [
    { "id": "web" },
    { "id": "response-healing" }
  ]
}
```

사용 가능한 플러그인: `web` (웹 검색), `file-parser` (PDF 처리), `response-healing` (JSON 자동 수리), `context-compression` (프롬프트 압축)

---

## Assistant Prefill

모델에 부분 응답을 완성하도록 요청할 수 있습니다. `messages` 배열 끝에 `role: "assistant"` 메시지를 추가합니다:

```javascript
fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <API_KEY>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/gpt-5.2',
    messages: [
      { role: 'user', content: 'What is the meaning of life?' },
      { role: 'assistant', content: "I'm not sure, but my best guess is" },
    ],
  }),
});
```

---

## 응답 (Response)

### CompletionsResponse 포맷

OpenRouter는 모델/프로바이더 간 스키마를 OpenAI Chat API에 맞게 정규화합니다.

```typescript
type Response = {
  id: string;
  choices: (NonStreamingChoice | StreamingChoice | NonChatChoice)[];
  created: number;           // Unix 타임스탬프
  model: string;
  object: 'chat.completion' | 'chat.completion.chunk';
  system_fingerprint?: string;
  usage?: ResponseUsage;
};
```

### Usage 정보

```typescript
type ResponseUsage = {
  prompt_tokens: number;       // 이미지, 오디오, 툴 포함
  completion_tokens: number;   // 생성된 토큰
  total_tokens: number;        // 위 두 값의 합

  prompt_tokens_details?: {
    cached_tokens: number;
    cache_write_tokens?: number;
    audio_tokens?: number;
    video_tokens?: number;
  };

  completion_tokens_details?: {
    reasoning_tokens?: number;
    audio_tokens?: number;
    image_tokens?: number;
  };

  cost?: number;               // 크레딧 비용
  is_byok?: boolean;           // BYOK 사용 여부
  cost_details?: {
    upstream_inference_cost?: number;
    upstream_inference_prompt_cost: number;
    upstream_inference_completions_cost: number;
  };

  server_tool_use?: {
    web_search_requests?: number;
  };
};
```

### Choice 서브타입

```typescript
type NonStreamingChoice = {
  finish_reason: string | null;
  native_finish_reason: string | null;
  message: {
    content: string | null;
    role: string;
    tool_calls?: ToolCall[];
  };
  error?: ErrorResponse;
};

type StreamingChoice = {
  finish_reason: string | null;
  native_finish_reason: string | null;
  delta: {
    content: string | null;
    role?: string;
    tool_calls?: ToolCall[];
  };
  error?: ErrorResponse;
};

type ToolCall = {
  id: string;
  type: 'function';
  function: FunctionCall;
};

type ErrorResponse = {
  code: number;
  message: string;
  metadata?: Record<string, unknown>;
};
```

---

## Finish Reason 정규화

OpenRouter는 각 모델의 `finish_reason`을 다음 값 중 하나로 정규화합니다:

| 정규화된 값 | 의미 |
| --- | --- |
| `tool_calls` | 툴 콜이 요청됨 |
| `stop` | 정상 종료 |
| `length` | 최대 토큰 도달 |
| `content_filter` | 콘텐츠 필터링 |
| `error` | 오류 발생 |

원래의 `finish_reason`은 `native_finish_reason` 속성에서 확인할 수 있습니다.

---

## 비용 및 통계 조회

반환된 `id`를 사용하여 요청 완료 후 `/api/v1/generation` 엔드포인트로 통계를 조회할 수 있습니다:

```javascript
const generation = await fetch(
  'https://openrouter.ai/api/v1/generation?id=$GENERATION_ID',
  { headers },
);
const stats = await generation.json();
```

---

## 스트리밍

`stream: true`를 설정하면 Server-Sent Events (SSE)로 **모든 모델**에 대해 스트리밍이 지원됩니다. SSE 스트림에 주석 페이로드가 포함될 수 있으며, 이는 무시해야 합니다.

---

## 비표준 파라미터

선택한 모델이 요청 파라미터를 지원하지 않는 경우 (예: 비OpenAI 모델의 `logit_bias`, OpenAI 모델의 `top_k`) 해당 파라미터는 무시됩니다. 나머지 파라미터는 기본 모델 API로 전달됩니다.

---

## 관련 문서

- [Quickstart](./01-quickstart.md)
- [툴 콜링 가이드](./03-tool-calling.md)
- [Structured Outputs](./05-structured-outputs.md)
- [플러그인](./09-plugins.md)
