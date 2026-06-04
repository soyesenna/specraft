# OpenRouter Structured Outputs 가이드

> 원문: https://openrouter.ai/docs/guides/features/structured-outputs

Structured Outputs를 사용하면 모델 응답이 특정 JSON Schema 포맷을 따르도록 강제할 수 있습니다. 이 기능은 일관되고 잘 포맷된 응답이 필요한 애플리케이션에 특히 유용합니다.

---

## 개요

Structured Outputs의 장점:

- 특정 JSON Schema 검증을 모델 응답에 강제
- 일관되고 타입 안전한 출력 보장
- 파싱 오류 및 환각 필드 방지
- 애플리케이션의 응답 처리 간소화

---

## 기본 사용법

`response_format` 파라미터를 요청에 포함합니다. `type`을 `json_schema`로 설정하고 `json_schema` 객체에 스키마를 정의합니다:

```json
{
  "messages": [
    { "role": "user", "content": "What's the weather like in London?" }
  ],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "weather",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "location": {
            "type": "string",
            "description": "City or location name"
          },
          "temperature": {
            "type": "number",
            "description": "Temperature in Celsius"
          },
          "conditions": {
            "type": "string",
            "description": "Weather conditions description"
          }
        },
        "required": ["location", "temperature", "conditions"],
        "additionalProperties": false
      }
    }
  }
}
```

모델은 스키마를 엄격하게 따르는 JSON 객체로 응답합니다:

```json
{
  "location": "London",
  "temperature": 18,
  "conditions": "Partly cloudy with light drizzle"
}
```

---

## 두 가지 모드

### 1. 기본 JSON 모드

```json
{
  "response_format": { "type": "json_object" }
}
```

모델이 유효한 JSON을 반환합니다. 스키마 검증은 없습니다.

### 2. 엄격한 스키마 모드

```json
{
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "my_schema",
      "strict": true,
      "schema": { ... }
    }
  }
}
```

모델이 정확한 스키마에 맞는 JSON을 반환합니다.

---

## TypeScript SDK 예제

```typescript
import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
  apiKey: '<YOUR_API_KEY>',
});

const response = await openRouter.chat.send({
  model: 'openai/gpt-4o',
  messages: [
    { role: 'user', content: 'What is the weather like in London?' },
  ],
  responseFormat: {
    type: 'json_schema',
    jsonSchema: {
      name: 'weather',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City or location name',
          },
          temperature: {
            type: 'number',
            description: 'Temperature in Celsius',
          },
          conditions: {
            type: 'string',
            description: 'Weather conditions description',
          },
        },
        required: ['location', 'temperature', 'conditions'],
        additionalProperties: false,
      },
    },
  },
  stream: false,
});

const weatherInfo = response.choices[0].message.content;
```

---

## Python (OpenAI SDK) 예제

```python
from openai import OpenAI
import json

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="<YOUR_API_KEY>",
)

response = client.chat.completions.create(
    model="openai/gpt-4o",
    messages=[
        {"role": "user", "content": "What is the weather like in London?"}
    ],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "weather",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City or location name"
                    },
                    "temperature": {
                        "type": "number",
                        "description": "Temperature in Celsius"
                    },
                    "conditions": {
                        "type": "string",
                        "description": "Weather conditions description"
                    }
                },
                "required": ["location", "temperature", "conditions"],
                "additionalProperties": False
            }
        }
    }
)

weather = json.loads(response.choices[0].message.content)
print(weather)
```

---

## 스트리밍과 함께 사용

Structured Outputs는 스트리밍 응답에서도 지원됩니다. 모델이 유효한 부분 JSON을 스트리밍하며, 완료되면 스키마에 맞는 유효한 응답을 형성합니다:

```json
{
  "stream": true,
  "response_format": {
    "type": "json_schema",
    "json_schema": { "..." }
  }
}
```

---

## 지원 모델

Structured Outputs는 특정 모델에서만 지원됩니다. 지원 모델 목록은 `openrouter.ai/models?supported_parameters=response_format`에서 확인할 수 있습니다.

지원 프로바이더/모델:

- **OpenAI**: GPT-4o 이상
- **Google**: Gemini 모델
- **Anthropic**: Sonnet 4.5, Opus 4.1+
- **대부분의 오픈소스 모델**
- **모든 Fireworks 제공 모델**

### 지원 확인 방법

1. 모델 페이지에서 `supported_parameters` 확인
2. Provider Preferences에 `require_parameters: true` 설정
3. `response_format`에 `type: json_schema` 포함

---

## Response Healing (응답 복구)

비스트리밍 요청에서 `response_format`의 `type`이 `"json_schema"`인 경우, Response Healing 플러그인을 활성화하면 모델이 불완전한 포맷을 반환할 때 자동으로 JSON을 수리합니다:

```json
{
  "response_format": {
    "type": "json_schema",
    "json_schema": { "..." }
  },
  "plugins": [
    { "id": "response-healing" }
  ]
}
```

---

## 모범 사례

1. **설명 포함**: 스키마 속성에 명확한 설명을 추가하여 모델을 안내
2. **strict 모드 사용**: 항상 `strict: true`를 설정하여 스키마를 정확히 따르도록 강제
3. **additionalProperties: false**: 불필요한 필드가 생성되지 않도록 설정

---

## 오류 처리

| 시나리오 | 동작 |
| --- | --- |
| 모델이 Structured Outputs를 미지원 | 미지원 오류와 함께 요청 실패 |
| 잘못된 스키마 | 스키마가 유효하지 않다는 오류 반환 |

---

## 관련 문서

- [API 레퍼런스](./02-api-reference.md)
- [툴 콜링 가이드](./03-tool-calling.md)
- [스트리밍 가이드](./04-streaming.md)
- [플러그인 (Response Healing)](./09-plugins.md)
