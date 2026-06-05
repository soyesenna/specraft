# OpenRouter Tool Calling (Function Calling) 가이드

> 원문: https://openrouter.ai/docs/guides/features/tool-calling

툴 콜(함수 콜이라고도 함)은 LLM에게 외부 툴에 대한 접근을 제공합니다. LLM이 직접 툴을 호출하지는 않으며, 호출할 툴을 제안합니다. 사용자가 별도로 툴을 호출한 후 결과를 LLM에 제공하면, LLM이 최종 응답을 작성합니다.

OpenRouter는 모델과 프로바이더 간 툴 콜링 인터페이스를 표준화하여, 지원되는 모든 모델에서 동일한 방식으로 외부 툴을 통합할 수 있습니다.

**지원 모델**: `openrouter.ai/models?supported_parameters=tools`에서 확인 가능

---

## Tool Calling의 3단계

### Step 1: 툴이 포함된 추론 요청

```json
{
  "model": "google/gemini-3-flash-preview",
  "messages": [
    {
      "role": "user",
      "content": "What are the titles of some James Joyce books?"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "search_gutenberg_books",
        "description": "Search for books in the Project Gutenberg library",
        "parameters": {
          "type": "object",
          "properties": {
            "search_terms": {
              "type": "array",
              "items": { "type": "string" },
              "description": "List of search terms to find books"
            }
          },
          "required": ["search_terms"]
        }
      }
    }
  ]
}
```

### Step 2: 툴 실행 (클라이언트 측)

모델의 `tool_calls` 응답을 받은 후 로컬에서 툴을 실행합니다:

```javascript
// 모델이 tool_calls로 응답하면 로컬에서 툴을 실행
const toolResult = await searchGutenbergBooks(["James", "Joyce"]);
```

### Step 3: 툴 결과를 포함한 추론 요청

```json
{
  "model": "google/gemini-3-flash-preview",
  "messages": [
    {
      "role": "user",
      "content": "What are the titles of some James Joyce books?"
    },
    {
      "role": "assistant",
      "content": null,
      "tool_calls": [
        {
          "id": "call_abc123",
          "type": "function",
          "function": {
            "name": "search_gutenberg_books",
            "arguments": "{\"search_terms\": [\"James\", \"Joyce\"]}"
          }
        }
      ]
    },
    {
      "role": "tool",
      "tool_call_id": "call_abc123",
      "content": "[{\"id\": 4300, \"title\": \"Ulysses\", \"authors\": [{\"name\": \"Joyce, James\"}]}]"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "search_gutenberg_books",
        "description": "Search for books in the Project Gutenberg library",
        "parameters": {
          "type": "object",
          "properties": {
            "search_terms": {
              "type": "array",
              "items": { "type": "string" },
              "description": "List of search terms to find books"
            }
          },
          "required": ["search_terms"]
        }
      }
    }
  ]
}
```

**중요**: `tools` 파라미터는 모든 요청(Step 1, Step 3)에 포함되어야 합니다. 라우터가 각 호출에서 툴 스키마를 검증하기 위함입니다.

---

## 완전한 TypeScript 예제

### 설정

```typescript
import { OpenRouter } from '@openrouter/sdk';

const OPENROUTER_API_KEY = "<YOUR_API_KEY>";
const MODEL = "google/gemini-3-flash-preview";

const openRouter = new OpenRouter({
  apiKey: OPENROUTER_API_KEY,
});

const task = "What are the titles of some James Joyce books?";

const messages = [
  {
    role: "system",
    content: "You are a helpful assistant."
  },
  {
    role: "user",
    content: task,
  }
];
```

### 툴 정의

```typescript
async function searchGutenbergBooks(searchTerms: string[]): Promise<any> {
  const searchQuery = searchTerms.join(' ');
  const url = 'https://gutendex.com/books';
  const response = await fetch(`${url}?search=${searchQuery}`);
  const data = await response.json();

  return data.results.map((book: any) => ({
    id: book.id,
    title: book.title,
    authors: book.authors,
  }));
}

const tools = [
  {
    type: 'function',
    function: {
      name: 'searchGutenbergBooks',
      description: 'Search for books in the Project Gutenberg library based on specified search terms',
      parameters: {
        type: 'object',
        properties: {
          search_terms: {
            type: 'array',
            items: { type: 'string' },
            description: "List of search terms to find books in the Gutenberg library",
          },
        },
        required: ['search_terms'],
      },
    },
  },
];

const TOOL_MAPPING = {
  searchGutenbergBooks,
};
```

### 툴 사용 및 결과 처리

```typescript
// 첫 번째 API 호출
const result = await openRouter.chat.send({
  model: MODEL,
  tools,
  messages,
  stream: false,
});

const response_1 = result.choices[0].message;

// LLM 응답을 메시지 배열에 추가 (이 단계를 잊기 쉽습니다!)
messages.push(response_1);

// 툴 콜 처리
for (const toolCall of response_1.tool_calls) {
  const toolName = toolCall.function.name;
  const { search_params } = JSON.parse(toolCall.function.arguments);
  const toolResponse = await TOOL_MAPPING[toolName](search_params);
  messages.push({
    role: 'tool',
    toolCallId: toolCall.id,
    name: toolName,
    content: JSON.stringify(toolResponse),
  });
}

// 두 번째 API 호출로 최종 결과 획득
const response_2 = await openRouter.chat.send({
  model: MODEL,
  messages,
  tools,
  stream: false,
});

console.log(response_2.choices[0].message.content);
```

---

## 스트리밍과 함께 툴 콜 사용

```typescript
const stream = await fetch('/api/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'anthropic/claude-sonnet-4.5',
    messages: messages,
    tools: tools,
    stream: true
  })
});

const reader = stream.body.getReader();
let toolCalls = [];

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = new TextDecoder().decode(value);
  const lines = chunk.split('\n').filter(line => line.trim());

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));

      if (data.choices[0].delta.tool_calls) {
        toolCalls.push(...data.choices[0].delta.tool_calls);
      }

      if (data.choices[0].delta.finish_reason === 'tool_calls') {
        await handleToolCalls(toolCalls);
      } else if (data.choices[0].delta.finish_reason === 'stop') {
        break;
      }
    }
  }
}
```

---

## Tool Choice 설정

`tool_choice` 파라미터로 툴 사용을 제어합니다:

```json
// 모델이 자동 결정 (기본값)
{ "tool_choice": "auto" }

// 툴 사용 비활성화
{ "tool_choice": "none" }

// 특정 툴 강제 사용
{
  "tool_choice": {
    "type": "function",
    "function": {"name": "search_database"}
  }
}
```

---

## 병렬 툴 콜 제어

`parallel_tool_calls` 파라미터로 여러 툴의 동시 호출을 제어합니다 (기본값: `true`):

```json
// 병렬 툴 콜 비활성화 - 순차 실행
{ "parallel_tool_calls": false }
```

---

## 단순 에이전트 루프 (Agentic Loop)

다양한 사용자 입력과 툴 콜을 처리하기 위한 에이전트 루프 예제:

```typescript
async function callLLM(messages: Message[]): Promise<any> {
  const result = await openRouter.chat.send({
    model: MODEL,
    tools,
    messages,
    stream: false,
  });

  messages.push(result.choices[0].message);
  return result;
}

async function getToolResponse(response: any): Promise<any> {
  const toolCall = response.choices[0].message.toolCalls[0];
  const toolName = toolCall.function.name;
  const toolArgs = JSON.parse(toolCall.function.arguments);

  const toolResult = await TOOL_MAPPING[toolName](toolArgs);

  return {
    role: 'tool',
    toolCallId: toolCall.id,
    content: toolResult,
  };
}

const maxIterations = 10;
let iterationCount = 0;

while (iterationCount < maxIterations) {
  iterationCount++;
  const response = await callLLM(messages);

  if (response.choices[0].message.toolCalls) {
    messages.push(await getToolResponse(response));
  } else {
    break;
  }
}

if (iterationCount >= maxIterations) {
  console.warn("Warning: Maximum iterations reached");
}

console.log(messages[messages.length - 1].content);
```

---

## 인터리브드 씽킹 (Interleaved Thinking)

인터리브드 씽킹은 모델이 툴 콜 사이에 추론을 수행할 수 있게 합니다. 더 정교한 의사결정과 다단계 툴 콜 체이닝이 가능합니다.

**중요**: 인터리브드 씽킹은 토큰 사용량과 응답 지연 시간을 증가시킵니다.

### 작동 방식

- 툴 콜 결과에 대한 추론 후 다음 행동 결정
- 추론 단계가 포함된 여러 툴 콜 체이닝
- 중간 결과를 기반으로 한 더 정교한 의사결정
- 툴 선택 과정에 대한 투명한 추론 제공

### 예제: 추론을 포함한 다단계 연구

```json
{
  "model": "anthropic/claude-sonnet-4.5",
  "messages": [
    {
      "role": "user",
      "content": "Research the environmental impact of electric vehicles and provide a comprehensive analysis."
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "search_academic_papers",
        "description": "Search for academic papers on a given topic",
        "parameters": {
          "type": "object",
          "properties": {
            "query": { "type": "string" },
            "field": { "type": "string" }
          },
          "required": ["query"]
        }
      }
    },
    {
      "type": "function",
      "function": {
        "name": "get_latest_statistics",
        "description": "Get latest statistics on a topic",
        "parameters": {
          "type": "object",
          "properties": {
            "topic": { "type": "string" },
            "year": { "type": "integer" }
          },
          "required": ["topic"]
        }
      }
    }
  ]
}
```

### 인터리브드 씽킹 모범 사례

- **명확한 툴 설명**: 모델이 각 툴을 언제 사용할지 추론할 수 있도록 상세한 설명 제공
- **구조화된 파라미터**: 정확한 툴 콜을 위한 명확한 파라미터 스키마 정의
- **컨텍스트 보존**: 여러 툴 상호작용에 걸쳐 대화 컨텍스트 유지
- **오류 처리**: 모델이 접근 방식을 조정할 수 있도록 의미 있는 오류 메시지 제공

---

## 모범 사례: 함수 정의 가이드라인

### 명확하고 설명적인 이름 사용

```json
// 좋음: 명확하고 구체적
{ "name": "get_weather_forecast" }

// 피해야 함: 너무 모호함
{ "name": "weather" }
```

### 포괄적인 설명 제공

```json
{
  "description": "Get current weather conditions and 5-day forecast for a specific location. Supports cities, zip codes, and coordinates.",
  "parameters": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "City name, zip code, or coordinates (lat,lng). Examples: 'New York', '10001', '40.7128,-74.0060'"
      },
      "units": {
        "type": "string",
        "enum": ["celsius", "fahrenheit"],
        "description": "Temperature unit preference",
        "default": "celsius"
      }
    },
    "required": ["location"]
  }
}
```

---

## 신뢰도 추적

OpenRouter는 각 프로바이더의 툴 콜 완료 신뢰도를 추적하며, 이를 모델 페이지의 **Tool Call Error Rate**로 표시합니다. 툴 콜링 요청 시 Auto Exacto 프로바이더 순서에도 반영됩니다.

---

## 관련 문서

- [API 레퍼런스](./02-api-reference.md)
- [스트리밍 가이드](./04-streaming.md)
- [Structured Outputs](./05-structured-outputs.md)
