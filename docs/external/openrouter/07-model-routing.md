# OpenRouter 모델 라우팅 가이드

> 원문: https://openrouter.ai/docs/guides/features/model-routing

OpenRouter는 요청을 모델에 동적으로 라우팅하는 두 가지 옵션을 제공합니다.

---

## Auto Router

특수 모델 ID `openrouter/auto`를 사용하면 NotDiamond가 구동하는 자동 라우터가 프롬프트에 기반하여 고품질 모델 중 하나를 선택합니다.

### TypeScript SDK

```typescript
import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
  apiKey: '<OPENROUTER_API_KEY>',
});

const completion = await openRouter.chat.send({
  model: 'openrouter/auto',
  messages: [
    {
      role: 'user',
      content: 'What is the meaning of life?',
    },
  ],
});

console.log(completion.choices[0].message.content);
```

응답의 `model` 필드에 실제 사용된 모델이 설정됩니다.

---

## models 파라미터 (모델 폴백)

`models` 파라미터를 사용하면 주 모델의 프로바이더가 다운되거나, 속도 제한에 걸리거나, 콘텐츠 모더레이션으로 거부한 경우 자동으로 다른 모델을 시도합니다.

### TypeScript SDK

```typescript
import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
  apiKey: '<OPENROUTER_API_KEY>',
});

const completion = await openRouter.chat.send({
  models: ['anthropic/claude-3.5-sonnet', 'gryphe/mythomax-l2-13b'],
  messages: [
    {
      role: 'user',
      content: 'What is the meaning of life?',
    },
  ],
});

console.log(completion.choices[0].message.content);
```

### 폴백 동작

- 주 모델이 오류를 반환하면 OpenRouter가 폴백 모델을 시도합니다.
- 폴백 모델도 다운되거나 오류를 반환하면 해당 오류가 반환됩니다.
- 기본적으로 컨텍스트 길이 검증 오류, 모더레이션 플래그, 속도 제한, 다운타임 등 모든 오류가 폴백을 트리거할 수 있습니다.
- 요금은 최종 사용된 모델 기준으로 청구되며, 응답 본문의 `model` 속성에 반환됩니다.

---

## OpenAI SDK에서 models 배열 사용

OpenAI SDK에서 `models` 배열을 사용하려면 `extra_body` 파라미터에 포함합니다:

### Python

```python
from openai import OpenAI

openai_client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="<YOUR_API_KEY>",
)

completion = openai_client.chat.completions.create(
    model="openai/gpt-4o",
    extra_body={
        "models": ["anthropic/claude-3.5-sonnet", "gryphe/mythomax-l2-13b"],
    },
    messages=[
        {
            "role": "user",
            "content": "What is the meaning of life?"
        }
    ]
)

print(completion.choices[0].message.content)
```

### TypeScript

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: '<YOUR_API_KEY>',
});

const completion = await openai.chat.completions.create({
  model: 'openai/gpt-4o',
  messages: [
    { role: 'user', content: 'What is the meaning of life?' }
  ],
}, {
  body: {
    models: ['anthropic/claude-3.5-sonnet', 'gryphe/mythomax-l2-13b'],
  },
});
```

---

## 모델 변형 (Model Variants)

모델 슬러그 뒤에 접미사를 붙여 특별한 기능을 활성화할 수 있습니다:

### :nitro (처리량 우선)

`:nitro`를 붙이면 처리량 기준 정렬과 동일합니다:

```typescript
const completion = await openRouter.chat.send({
  model: 'meta-llama/llama-3.3-70b-instruct:nitro',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: false,
});
```

### :floor (가격 우선)

`:floor`를 붙이면 가격 기준 정렬과 동일합니다:

```typescript
const completion = await openRouter.chat.send({
  model: 'meta-llama/llama-3.3-70b-instruct:floor',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: false,
});
```

### :online (웹 검색)

`:online`을 붙이면 웹 검색 플러그인이 활성화됩니다:

```json
{
  "model": "openai/gpt-5.2:online"
}
```

이는 다음과 동일합니다:

```json
{
  "model": "openai/gpt-5.2",
  "plugins": [{ "id": "web" }]
}
```

### :free (무료)

`:free`를 붙이면 무료 모델 변형을 사용합니다.

---

## 관련 문서

- [Quickstart](./01-quickstart.md)
- [API 레퍼런스](./02-api-reference.md)
- [Provider Selection](./08-provider-selection.md)
- [웹 검색](./10-web-search.md)
