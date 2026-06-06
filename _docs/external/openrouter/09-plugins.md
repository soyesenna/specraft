# OpenRouter 플러그인 가이드

> 원문: https://openrouter.ai/docs/guides/features/plugins
> https://openrouter.ai/docs/guides/features/response-healing

OpenRouter 플러그인은 모델의 기능을 확장합니다. 요청이나 응답을 주입 또는 변형하여 PDF 처리, 자동 JSON 수리, 컨텍스트 압축 등의 기능을 추가합니다.

서버 툴(모델이 0~N번 호출 가능)과 달리, 플러그인은 활성화 시 항상 한 번 실행됩니다. 플러그인은 API를 통해 **요청별(per-request)**로 활성화하거나, Plugins 설정 페이지에서 **기본값으로 설정**할 수 있습니다.

---

## 사용 가능한 플러그인

| 플러그인 | 설명 | 문서 |
| --- | --- | --- |
| **Web Search** (deprecated) | 실시간 웹 검색 결과로 LLM 응답 보강. `openrouter:web_search` 서버 툴 사용 권장 | [Web Search](./10-web-search.md) |
| **PDF Inputs** | 업로드된 PDF 파일에서 콘텐츠 파싱 및 추출 | PDF Inputs |
| **Response Healing** | LLM의 잘못된 형식의 JSON 응답을 자동 수정 | Response Healing |
| **Context Compression** | 모델의 컨텍스트 윈도우를 초과하는 프롬프트를 중간 제거 방식으로 압축 | [Message Transforms](./11-message-transforms.md) |

---

## API를 통한 플러그인 활성화

`plugins` 배열을 chat completions 요청에 추가합니다:

```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <YOUR_API_KEY>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/gpt-5.2',
    messages: [
      {
        role: 'user',
        content: 'What are the latest developments in AI?'
      }
    ],
    plugins: [
      { id: 'web' }
    ]
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

---

## 다중 플러그인 사용

단일 요청에서 여러 플러그인을 활성화할 수 있습니다:

```json
{
  "model": "openai/gpt-5.2",
  "messages": ["..."],
  "plugins": [
    { "id": "web", "max_results": 3 },
    { "id": "response-healing" }
  ],
  "response_format": {
    "type": "json_schema",
    "json_schema": { "..." }
  }
}
```

---

## 기본 플러그인 설정

조직 관리자와 개인 사용자는 모든 API 요청에 적용되는 기본 플러그인 설정을 구성할 수 있습니다. 이 기능은 다음과 같은 이점이 있습니다:

- 웹 검색이나 응답 복구 같은 플러그인을 모든 요청에 기본으로 활성화
- 애플리케이션 코드 수정 없이 일관된 플러그인 구성 유지
- 개별 요청에서 재정의할 수 없는 플러그인 설정 강제 적용

> **참고:** 조직에서는 Plugins 설정 페이지에 **관리자(admin)만 접근**할 수 있습니다.

### 설정 방법

1. **Settings > Plugins** 로 이동
2. 플러그인을 켜기/끄기로 기본 활성화
3. 구성 버튼을 클릭하여 설정 커스터마이즈
4. 선택적으로 "Prevent overrides"를 활성화하여 모든 요청에 설정 강제 적용

### Prevent overrides

"Prevent overrides"를 활성화하면 개별 API 요청이 해당 플러그인의 구성을 비활성화하거나 수정할 수 없습니다. 이는 조직 전체 정책을 강제하는 데 유용합니다.

### 플러그인 우선순위

1. **요청 수준 설정**: 개별 요청의 `plugins` 배열
2. **계정 기본값**: Plugins 설정 페이지의 설정

요청에서 플러그인을 지정하면 기본 설정을 덮어씁니다. "Prevent overrides"가 활성화된 경우 요청 수준에서 덮어쓸 수 없습니다.

---

## 기본 플러그인 비활성화

기본으로 활성화된 플러그인을 특정 요청에서 비활성화하려면 `"enabled": false`를 설정합니다:

```json
{
  "model": "openai/gpt-5.2",
  "messages": ["..."],
  "plugins": [
    { "id": "web", "enabled": false }
  ]
}
```

---

## 모델 변형으로 플러그인 활성화

일부 플러그인은 모델 ID에 접미사를 추가하여 편리하게 활성화할 수 있습니다:

### :online (웹 검색)

```json
{
  "model": "openai/gpt-5.2:online"
}
```

다음과 동일합니다:

```json
{
  "model": "openai/gpt-5.2",
  "plugins": [{ "id": "web" }]
}
```

더 많은 모델 변형은 [Model Routing](./07-model-routing.md)을 참조하세요.

---

## Response Healing (응답 복구)

Response Healing 플러그인은 AI 모델이 반환한 잘못된 형식의 JSON 응답을 자동으로 검증하고 복구합니다. 모델이 누락된 괄호, 후행 쉼표, 마크다운 래퍼, 텍스트와 JSON 혼합 등 불완전한 형식을 반환할 때 플러그인이 응답을 복구하여 유효하고 파싱 가능한 JSON을 제공합니다.

### 작동 방식

이 플러그인은 **비스트리밍 요청**에서 `response_format`에 `type: "json_schema"` 또는 `type: "json_object"`를 사용하고, `plugins` 배열에 `response-healing`을 포함할 때 활성화됩니다.

### 어떤 것을 수정하나요?

Response Healing 플러그인은 LLM 응답에서 발생하는 일반적인 문제를 처리합니다.

#### JSON 구문 오류

누락된 닫는 괄호 등의 구문 오류를 수정합니다.

| 수정 전 (입력) | 수정 후 (출력) |
| --- | --- |
| `{"name": "Alice", "age": 30` | `{"name": "Alice", "age": 30}` |

#### 마크다운 코드 블록

JSON이 마크다운 코드 블록으로 감싸진 경우 추출합니다.

| 수정 전 (입력) | 수정 후 (출력) |
| --- | --- |
| ```` ```json {"name": "Bob"} ``` ```` | `{"name": "Bob"}` |

#### 텍스트와 JSON 혼합

JSON 앞에 텍스트가 포함된 경우 JSON만 추출합니다.

| 수정 전 (입력) | 수정 후 (출력) |
| --- | --- |
| `Here is the result: {"name": "Charlie", "age": 25}` | `{"name": "Charlie", "age": 25}` |

#### 후행 쉼표

유효하지 않은 후행 쉼표를 제거합니다.

| 수정 전 (입력) | 수정 후 (출력) |
| --- | --- |
| `{"name": "David", "age": 35,}` | `{"name": "David", "age": 35}` |

#### 따옴표 없는 키

JavaScript 스타일의 따옴표 없는 키를 수정합니다.

| 수정 전 (입력) | 수정 후 (출력) |
| --- | --- |
| `{name: "Eve", age: 40}` | `{"name": "Eve", "age": 40}` |

### 전체 예제

```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <YOUR_API_KEY>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/gpt-5.2',
    messages: [
      {
        role: 'user',
        content: 'Generate a product listing with name, price, and description'
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'Product',
        schema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Product name'
            },
            price: {
              type: 'number',
              description: 'Price in USD'
            },
            description: {
              type: 'string',
              description: 'Product description'
            }
          },
          required: ['name', 'price']
        }
      }
    },
    plugins: [
      { id: 'response-healing' }
    ]
  }),
});

const data = await response.json();
const product = JSON.parse(data.choices[0].message.content);
// 플러그인이 잘못된 JSON 구문을 복구 시도
console.log(product.name, product.price);
```

### 제한 사항

| 제한 사항 | 설명 |
| --- | --- |
| **비스트리밍 요청만** | Response Healing은 비스트리밍 요청에만 적용됩니다. |
| **모든 JSON을 복구할 수 없음** | 일부 잘못된 JSON 응답은 복구가 불가능할 수 있습니다. 특히 `max_tokens`로 인해 응답이 잘린 경우 플러그인으로 복구할 수 없습니다. |

---

## PDF Inputs

PDF 파일의 내용을 모델에 전달할 수 있습니다. `file-parser` 플러그인을 활성화하면 PDF가 자동으로 파싱됩니다:

```json
{
  "model": "openai/gpt-5.2",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "Summarize this document" },
        { "type": "image_url", "image_url": { "url": "data:application/pdf;base64,..." } }
      ]
    }
  ],
  "plugins": [
    { "id": "file-parser" }
  ]
}
```

---

## Context Compression (컨텍스트 압축)

자세한 내용은 [Message Transforms](./11-message-transforms.md)를 참조하세요.

---

## 관련 문서

- [API 레퍼런스](./02-api-reference.md)
- [웹 검색](./10-web-search.md)
- [Message Transforms](./11-message-transforms.md)
- [모델 라우팅](./07-model-routing.md)
