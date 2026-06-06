# OpenRouter Reasoning Tokens (추론 토큰) 가이드

> 원문: https://openrouter.ai/docs/guides/reasoning-tokens

Reasoning Tokens(추론 토큰, 사고 토큰이라고도 함)는 모델이 응답을 생성하기 전 거치는 추론 과정을 투명하게 보여주는 기능입니다. OpenRouter는 다양한 프로바이더의 추론 토큰 제어 방식을 통합된 인터페이스로 정규화하여, 동일한 API 구조로 모든 모델의 추론을 제어할 수 있습니다.

**핵심 특징**:

- 모델이 출력하기로 결정하면 기본적으로 응답에 포함됨
- 추론 토큰은 출력 토큰으로 간주되어 요금이 부과됨
- `reasoning` 파라미터를 통해 세부 제어 가능
- 일부 모델(예: OpenAI o-시리즈)은 추론 토큰을 반환하지 않음

---

## `reasoning` 파라미터 개요

요청 본문에 `reasoning` 객체를 추가하여 추론 토큰을 제어합니다.

```json
{
  "model": "your-model",
  "messages": [],
  "reasoning": {
    "effort": "high",
    "max_tokens": 2000,
    "exclude": false,
    "enabled": true
  }
}
```

### 파라미터 필드

| 필드 | 타입 | 설명 | 기본값 |
| --- | --- | --- | --- |
| `effort` | string | 추론 강도 수준 (`"xhigh"`, `"high"`, `"medium"`, `"low"`, `"minimal"`, `"none"`) | `"medium"` |
| `max_tokens` | number | 추론에 사용할 최대 토큰 수 (직접 지정) | 모델 기본값 |
| `exclude` | boolean | `true` 시 모델은 추론을 수행하지만 응답에 포함하지 않음 | `false` |
| `enabled` | boolean | 기본 파라미터로 추론 활성화 (`"medium"` 강도) | `effort` 또는 `max_tokens`에서 자동 추론 |

> **참고**: `effort`와 `max_tokens`는 동시에 사용할 수 없으며, 둘 중 하나만 선택해야 합니다.

---

## Reasoning Effort Level (추론 강도 수준)

`effort` 파라미터는 추론에 할당할 토큰 비율을 제어합니다.

| 수준 | 추론 할당 비율 (대략) | 설명 |
| --- | --- | --- |
| `"xhigh"` | max_tokens의 약 95% | 가장 많은 토큰을 추론에 할당 |
| `"high"` | max_tokens의 약 80% | 많은 토큰을 추론에 할당 |
| `"medium"` | max_tokens의 약 50% | 중간 수준의 추론 토큰 할당 |
| `"low"` | max_tokens의 약 20% | 적은 토큰을 추론에 할당 |
| `"minimal"` | max_tokens의 약 10% | 최소한의 추론 토큰 할당 |
| `"none"` | — | 추론 완전 비활성화 |

### 프로바이더별 지원

| 프로바이더 | 지원 방식 | 비고 |
| --- | --- | --- |
| OpenAI (o1, o3, GPT-5 시리즈) | `effort` | 원본 지원 |
| Grok | `effort` | 원본 지원 |
| Anthropic (Claude) | `max_tokens` | `effort` 사용 시 비율 기반으로 `budget_tokens` 자동 계산 |
| Gemini (thinking 모델) | `max_tokens` | Gemini 3은 `thinkingLevel`로 매핑 |
| Alibaba Qwen (thinking 모델) | `max_tokens` | 모델별 지원 여부 확인 필요 |

`effort`만 지원하는 모델에 `max_tokens`를 전달하면, 위 비율표를 기반으로 effort 수준이 자동 결정됩니다. 반대로 `max_tokens`만 지원하는 모델에 `effort`를 전달하면, 비율에 따라 토큰 수가 자동 계산됩니다.

---

## 편의 필드 (Convenience Fields)

하위 호환성과 사용 편의를 위해 OpenRouter는 추가 필드를 제공합니다.

### `reasoning_effort` (OpenAI 스타일)

요청 최상위 레벨에서 직접 추론 강도를 지정할 수 있습니다. `reasoning.effort`의 단축 형태입니다.

```json
{
  "model": "openai/o3",
  "messages": [{ "role": "user", "content": "복잡한 수학 문제를 풀어주세요." }],
  "reasoning_effort": "high"
}
```

### `include_reasoning` (Deprecated)

`reasoning.exclude`의 별칭으로, 과거 버전 호환성을 위해 유지됩니다.

| `include_reasoning` 값 | 동일한 `reasoning` 설정 |
| --- | --- |
| `true` | `reasoning: {}` (기본값으로 추론 포함) |
| `false` | `reasoning: { "exclude": true }` (추론 제외) |

> **권장**: 새로운 통합 `reasoning` 파라미터를 사용하세요. `include_reasoning`은 하위 호환성을 위해서만 유지됩니다.

---

## `reasoning_details` 응답 구조

추론 모델이 응답을 생성하면 `reasoning_details` 배열을 통해 정형화된 추론 정보가 반환됩니다.

### 위치

| 응답 유형 | `reasoning_details` 위치 |
| --- | --- |
| 비스트리밍 응답 | `choices[].message.reasoning_details` |
| 스트리밍 응답 | `choices[].delta.reasoning_details` (각 청크) |

### 공통 필드

모든 추론 상세 객체는 다음 공통 필드를 가집니다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string \| null | 추론 상세 항목의 고유 식별자 |
| `format` | string | 포맷 버전 (예: `"anthropic-claude-v1"`, `"openai-responses-v1"` 등) |
| `index` | number (optional) | 순차 인덱스 |

**`format` 가능 값**:

| 값 | 프로바이더 |
| --- | --- |
| `"unknown"` | 미지정 |
| `"openai-responses-v1"` | OpenAI |
| `"azure-openai-responses-v1"` | Azure OpenAI |
| `"xai-responses-v1"` | xAI |
| `"anthropic-claude-v1"` | Anthropic (기본값) |
| `"google-gemini-v1"` | Google Gemini |

### 추론 상세 타입

#### 1. Summary 타입 (`reasoning.summary`)

추론 과정의 요약을 포함합니다.

```json
{
  "type": "reasoning.summary",
  "summary": "모델이 핵심 제약 조건을 식별한 후 가능한 해결책을 평가하는 방식으로 문제를 분석했습니다...",
  "id": "reasoning-summary-1",
  "format": "anthropic-claude-v1",
  "index": 0
}
```

#### 2. Encrypted 타입 (`reasoning.encrypted`)

암호화되거나 편집된 추론 데이터를 포함합니다.

```json
{
  "type": "reasoning.encrypted",
  "data": "eyJlbmNyeXB0ZWQiOiJ0cnVlIiwiY29udGVudCI6IltSRURBQ1RFRF0ifQ==",
  "id": "reasoning-encrypted-1",
  "format": "anthropic-claude-v1",
  "index": 1
}
```

#### 3. Text 타입 (`reasoning.text`)

원시 텍스트 형태의 추론 내용입니다. 선택적으로 서명 검증이 포함됩니다.

```json
{
  "type": "reasoning.text",
  "text": "단계별로 생각해 보겠습니다:\n1. 먼저 사용자의 질문을 이해해야 합니다...",
  "signature": "sha256:abc123def456...",
  "id": "reasoning-text-1",
  "format": "anthropic-claude-v1",
  "index": 2
}
```

### 비스트리밍 응답 예시

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "분석 결과, 다음 접근 방식을 권장합니다...",
        "reasoning_details": [
          {
            "type": "reasoning.summary",
            "summary": "문제를 구성 요소로 분해하여 분석",
            "id": "reasoning-summary-1",
            "format": "anthropic-claude-v1",
            "index": 0
          },
          {
            "type": "reasoning.text",
            "text": "체계적으로 접근하겠습니다:\n1. 첫 번째 고려사항...\n2. 두 번째 고려사항...",
            "signature": null,
            "id": "reasoning-text-1",
            "format": "anthropic-claude-v1",
            "index": 1
          }
        ]
      }
    }
  ]
}
```

### 스트리밍 응답 예시

```json
{
  "choices": [
    {
      "delta": {
        "reasoning_details": [
          {
            "type": "reasoning.text",
            "text": "단계별로 생각해 보겠습니다...",
            "signature": null,
            "id": "reasoning-text-1",
            "format": "anthropic-claude-v1",
            "index": 0
          }
        ]
      }
    }
  ]
}
```

**스트리밍 동작 특이사항**:

- 각 추론 상세 청크는 생성되는 즉시 전송됨
- 청크의 `reasoning_details` 배열에는 하나 이상의 추론 객체가 포함될 수 있음
- 암호화된 추론의 경우 스트리밍 응답에서 `[REDACTED]`로 표시될 수 있음
- 전체 추론 시퀀스는 모든 청크를 순서대로 연결하여 구성됨

---

## 툴 콜링 시 추론 블록 보존

툴 콜링 과정에서 모델의 추론 맥락을 유지하려면, 이전 응답의 추론 블록을 후속 요청에 다시 전달해야 합니다.

### 보존 방법

| 방법 | 필드 | 사용 시기 |
| --- | --- | --- |
| 문자열 전달 | `message.reasoning` | 원시 텍스트 추론만 반환하는 모델 |
| 배열 전달 | `message.reasoning_details` | 암호화/요약 등 특수 타입을 반환하는 모델 |

`reasoning_content`는 `reasoning`의 별칭으로 동일하게 작동합니다.

### 지원 모델

**프로프라이어터리 모델**:

- 모든 OpenAI 추론 모델 (o1, o3, GPT-5 시리즈 이상)
- 모든 Anthropic 추론 모델 (Claude 3.7 시리즈 이상)
- 모든 Gemini 추론 모델
- 모든 xAI 추론 모델

**오픈소스 모델**:

- MiniMax M2 / M2.1
- Kimi K2 Thinking / K2.5
- INTELLECT-3
- Nemotron 3 Nano
- MiMo-V2-Flash
- Z.ai 추론 모델 (GLM 4.5 시리즈 이상, 표준 인터리브드 사고만 지원)

> **중요**: `reasoning_details` 블록을 전달할 때, 연속된 추론 블록의 전체 시퀀스가 원본 요청에서 생성된 출력과 정확히 일치해야 합니다. 블록의 순서를 변경하거나 수정할 수 없습니다.

### 툴 콜링 + 추론 보존 예시

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// 툴 정의
const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string" },
        },
        required: ["location"],
      },
    },
  },
];

// 첫 번째 요청: 툴과 함께 추론 요청
const response1 = await client.chat.completions.create({
  model: "anthropic/claude-sonnet-4-5",
  messages: [
    { role: "user", content: "보스턴 날씨가 어때? 그리고 뭐 입으면 좋을지 추천해 줘." },
  ],
  tools,
  extra_body: { reasoning: { max_tokens: 2000 } },
});

const message = response1.choices[0].message;

// 두 번째 요청: 추론 블록 보존하여 툴 결과 전달
const response2 = await client.chat.completions.create({
  model: "anthropic/claude-sonnet-4-5",
  messages: [
    { role: "user", content: "보스턴 날씨가 어때? 그리고 뭐 입으면 좋을지 추천해 줘." },
    {
      role: "assistant",
      content: message.content,
      tool_calls: message.tool_calls,
      reasoning_details: message.reasoning_details, // 수정 없이 그대로 전달
    },
    {
      role: "tool",
      tool_call_id: message.tool_calls[0].id,
      content: '{"temperature": 7, "condition": "비", "humidity": 85}',
    },
  ],
  tools,
});
```

> **참고**: `openai/gpt-5.2`와 `anthropic/claude-sonnet-4-5`는 `reasoning_details` 구조가 완전히 동일하므로, 코드 수정 없이 모델을 교체할 수 있습니다.

---

## `:thinking` 모델 변형

모델 ID 뒤에 `:thinking`을 붙여 확장 추론 기능을 활성화할 수 있습니다.

```json
{
  "model": "deepseek/deepseek-r1:thinking"
}
```

이 변형은 복잡한 작업에서 체인오브띝(Chain-of-Thought) 추론을 통해 더 철저한 분석과 단계별 문제 해결을 가능하게 합니다.

> **주의**: `:thinking` 변형은 Anthropic 모델에서 더 이상 지원되지 않습니다. Anthropic 모델의 경우 `reasoning` 파라미터를 대신 사용하세요.

---

## 프로바이더별 동작 상세

### Anthropic (Claude)

Anthropic 모델에서 추론 토큰을 사용하려면 통합 `reasoning` 파라미터를 `effort` 또는 `max_tokens`와 함께 사용합니다.

**`max_tokens` 직접 지정 시**:

- 지정한 값이 그대로 사용됨 (최소 1,024 토큰)
- 상한: 128,000 토큰

**`effort` 사용 시 자동 계산**:

`budget_tokens = max(min(max_tokens * effort_ratio, 128000), 1024)`

| effort | effort_ratio |
| --- | --- |
| `xhigh` | 0.95 |
| `high` | 0.8 |
| `medium` | 0.5 |
| `low` | 0.2 |
| `minimal` | 0.1 |

> **중요**: `max_tokens`는 reasoning budget보다 반드시 커야 합니다. 추론 완료 후 최종 응답에 사용할 토큰이 남아 있어야 하기 때문입니다.

### OpenAI (o-시리즈, GPT-5)

OpenAI 추론 모델은 `reasoning.effort`를 네이티브로 지원합니다.

- `effort` 값을 OpenAI API에 직접 전달
- 추론 토큰이 응답에 반환되지 않음 (프로바이더 제약)
- `reasoning.exclude: true` 설정 시에도 동일 (반환할 추론 토큰이 없음)

### Google Gemini 3

Gemini 3 모델은 기존 `thinkingBudget` 대신 Google의 `thinkingLevel` API를 사용합니다.

| OpenRouter `reasoning.effort` | Google `thinkingLevel` |
| --- | --- |
| `"minimal"` | `"minimal"` |
| `"low"` | `"low"` |
| `"medium"` | `"medium"` |
| `"high"` | `"high"` |
| `"xhigh"` | `"high"` (매핑됨) |

> **참고**: `thinkingLevel` 사용 시 실제 소비되는 추론 토큰 수는 Google 내부에서 결정됩니다. 각 수준별 공개된 토큰 한계 기준점은 없습니다.

`reasoning.max_tokens`를 지정하면 Google API에 `thinkingBudget`으로 전달되지만, Gemini 3 모델에서는 Google이 내부적으로 이를 `thinkingLevel`에 매핑하므로 정확한 토큰 제어는 불가능합니다.

---

## 사용 예제

### 기본 사용법 (TypeScript)

```typescript
import { OpenRouter } from "@openrouter/sdk";

const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const response = await openRouter.chat.send({
  model: "anthropic/claude-sonnet-4-5",
  messages: [
    {
      role: "user",
      content: "세계에서 가장 높은 마천루를 어떻게 지을 수 있을까요?",
    },
  ],
  reasoning: {
    effort: "high",
  },
  stream: false,
});

console.log("REASONING:", response.choices[0].message.reasoning);
console.log("CONTENT:", response.choices[0].message.content);
```

### max_tokens로 추론 제어 (Python)

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="<YOUR_API_KEY>",
)

response = client.chat.completions.create(
    model="anthropic/claude-sonnet-4-5",
    messages=[
        {"role": "user", "content": "대용량 데이터셋 정렬의 가장 효율적인 알고리즘은?"}
    ],
    extra_body={
        "reasoning": {
            "max_tokens": 2000
        }
    },
)

msg = response.choices[0].message
print(getattr(msg, "reasoning", None))
print(getattr(msg, "content", None))
```

### 추론 토큰 제외 (Python)

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="<YOUR_API_KEY>",
)

response = client.chat.completions.create(
    model="anthropic/claude-sonnet-4-5",
    messages=[
        {"role": "user", "content": "양자 컴퓨팅을 쉽게 설명해 주세요."}
    ],
    extra_body={
        "reasoning": {
            "effort": "high",
            "exclude": True
        }
    },
)

msg = response.choices[0].message
print(getattr(msg, "content", None))  # 추론 없이 최종 응답만 출력
```

### 추론 체인오브띝 (Python)

한 모델의 추론을 다른 모델에 주입하여 응답 품질을 향상시키는 예시입니다.

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="<YOUR_API_KEY>",
)

question = "9.11과 9.9 중 어느 것이 더 큰가요?"

def do_req(model: str, content: str, reasoning_config: dict | None = None):
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": content}],
        "stop": "",
    }
    if reasoning_config:
        payload.update(reasoning_config)
    return client.chat.completions.create(**payload)

# 추론 능력이 뛰어난 모델에서 추론 획득
content = f"{question} 천천히 생각해 보되, 정답은 출력하지 마세요."
reasoning_response = do_req("deepseek/deepseek-r1", content)
reasoning = getattr(reasoning_response.choices[0].message, "reasoning", "")

# 비교: 추론 없는 일반 응답
simple_response = do_req("openai/gpt-4o-mini", question)
print("일반 응답:", getattr(simple_response.choices[0].message, "content", None))

# 비교: 추론 컨텍스트 주입 응답
content = f"{question}. 다음 컨텍스트를 참고하세요: {reasoning}"
smart_response = do_req("openai/gpt-4o-mini", content)
print("추론 주입 응답:", getattr(smart_response.choices[0].message, "content", None))
```

### Anthropic 스트리밍 (Python)

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="<YOUR_API_KEY>",
)

def chat_completion_with_reasoning(messages):
    response = client.chat.completions.create(
        model="anthropic/claude-sonnet-4-5",
        messages=messages,
        max_tokens=10000,
        extra_body={
            "reasoning": {
                "max_tokens": 8000
            }
        },
        stream=True
    )
    return response

for chunk in chat_completion_with_reasoning([
    {"role": "user", "content": "9.9와 9.11 중 어느 것이 더 큰가요?"}
]):
    if hasattr(chunk.choices[0].delta, 'reasoning_details') and chunk.choices[0].delta.reasoning_details:
        print(f"REASONING: {chunk.choices[0].delta.reasoning_details}")
    elif getattr(chunk.choices[0].delta, 'content', None):
        print(f"CONTENT: {chunk.choices[0].delta.content}")
```

---

## 관련 문서

- [01-quickstart.md](./01-quickstart.md) - 빠른 시작 가이드
- [03-tool-calling.md](./03-tool-calling.md) - 툴 콜링 가이드
- [04-streaming.md](./04-streaming.md) - 스트리밍 가이드
- [07-model-routing.md](./07-model-routing.md) - 모델 라우팅 및 변형
- [08-provider-selection.md](./08-provider-selection.md) - 프로바이더 선택
