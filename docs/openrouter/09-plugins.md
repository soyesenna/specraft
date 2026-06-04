# OpenRouter 플러그인 가이드

> 원문: https://openrouter.ai/docs/guides/features/plugins

OpenRouter 플러그인은 모델의 기능을 확장합니다. 요청이나 응답을 주입 또는 변형하여 PDF 처리, 자동 JSON 수리, 컨텍스트 압축 등의 기능을 추가합니다.

서버 툴(모델이 0~N번 호출 가능)과 달리, 플러그인은 활성화 시 항상 한 번 실행됩니다.

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

조직 관리자와 개인 사용자는 모든 API 요청에 적용되는 기본 플러그인 설정을 구성할 수 있습니다.

### 설정 방법

1. **Settings > Plugins** 로 이동
2. 플러그인을 켜기/끄기로 기본 활성화
3. 구성 버튼을 클릭하여 설정 커스터마이즈
4. 선택적으로 "Prevent overrides"를 활성화하여 모든 요청에 설정 강제 적용

### 플러그인 우선순위

1. **요청 수준 설정**: 개별 요청의 `plugins` 배열
2. **계정 기본값**: Plugins 설정 페이지의 설정

요청에서 플러그인을 지정하면 기본 설정을 덮어씁니다. "Prevent overrides"가 활성화된 경우 요청 수준에서 덮어쓸 수 없습니다.

---

## 기본 플러그인 비활성화

기본으로 활성화된 플러그인을 특정 요청에서 비활성화하려면 `enabled: false`를 설정합니다:

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

Response Healing 플러그인은 LLM이 불완전한 JSON을 반환할 때 자동으로 수정합니다. `response_format`과 함께 사용하면 특히 유용합니다:

```json
{
  "model": "openai/gpt-5.2",
  "messages": ["..."],
  "plugins": [
    { "id": "response-healing" }
  ],
  "response_format": {
    "type": "json_schema",
    "json_schema": { "..." }
  }
}
```

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
