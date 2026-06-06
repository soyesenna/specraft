# OpenRouter 모델 라우팅 가이드

> 원문: https://openrouter.ai/docs/guides/routing/routers
> https://openrouter.ai/docs/guides/routing/model-fallbacks
> https://openrouter.ai/docs/guides/routing/model-variants
> https://openrouter.ai/docs/guides/routing/auto-exacto

OpenRouter는 요청을 최적의 모델에 동적으로 라우팅하는 다양한 옵션을 제공합니다.

---

## 목차

- [Auto Router](#auto-router)
- [Body Builder Router](#body-builder-router)
- [Free Models Router](#free-models-router)
- [Auto Exacto](#auto-exacto)
- [모델 폴백 (Model Fallbacks)](#모델-폴백-model-fallbacks)
- [모델 변형 (Model Variants)](#모델-변형-model-variants)

---

## Auto Router

특수 모델 ID `openrouter/auto`를 사용하면 NotDiamond가 구동하는 자동 라우터가 프롬프트를 분석하여 최적의 모델을 자동 선택합니다.

### 작동 방식

1. **프롬프트 분석**: NotDiamond의 라우팅 시스템이 프롬프트를 분석
2. **모델 선택**: 작업 요구사항에 기반하여 최적 모델 선택
3. **요청 전달**: 선택된 모델로 요청 전달
4. **응답 추적**: 응답에 사용된 모델 메타데이터 포함

### 기본 사용법

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
// 어떤 모델이 사용되었는지 확인
console.log('Model used:', completion.model);
```

응답의 `model` 필드에 실제 사용된 모델이 설정됩니다.

### 지원 모델

Auto Router는 큐레이션된 고품질 모델 풀에서 선택합니다. 모델 슬러그는 새 버전 출시에 따라 변경될 수 있으며, 최신 목록은 모델 페이지에서 확인해야 합니다.

| 모델 | 슬러그 |
|------|--------|
| Claude Sonnet 4.5 | `anthropic/claude-sonnet-4.5` |
| Claude Opus 4.5 | `anthropic/claude-opus-4.5` |
| GPT-5.1 | `openai/gpt-5.1` |
| Gemini 3.1 Pro | `google/gemini-3.1-pro-preview` |
| DeepSeek 3.2 | `deepseek/deepseek-v3.2` |

> **참고**: 위 예시는 2025년 12월 4일 기준입니다. 실제 모델 풀은 새로운 모델이 출시됨에 따라 업데이트될 수 있습니다.

### 비용/품질 트레이드오프 (cost_quality_tradeoff)

`cost_quality_tradeoff` 파라미터를 사용하여 비용과 품질 사이의 균형을 제어할 수 있습니다.

| 값 | 동작 |
|----|------|
| **0** | 순수 품질 — 비용에 관계없이 항상 가장 성능이 좋은 모델 선택 |
| **7** | 기본값 — 비용 절감과 강력한 출력 품질의 균형 |
| **10** | 최대 비용 절감 — 가장 저렴한 모델 선택 |

```typescript
const completion = await openRouter.chat.send({
  model: 'openrouter/auto',
  messages: [{ role: 'user', content: 'Hello' }],
  cost_quality_tradeoff: 5,
});
```

**Settings UI에서 설정**:

1. **Settings > Plugins** 로 이동
2. **Auto Router** 의 설정 버튼 클릭
3. 트레이드오프 값 입력 후 저장

요청 시 설정한 값이 Settings UI의 기본값을 덮어씁니다.

### 허용 모델 구성

`plugins` 파라미터를 사용하여 Auto Router가 선택할 수 있는 모델을 제한할 수 있습니다. 와일드카드 패턴으로 모델을 필터링합니다.

#### API 요청으로 설정

```typescript
const completion = await openRouter.chat.send({
  model: 'openrouter/auto',
  messages: [{ role: 'user', content: 'Hello' }],
  plugins: [
    {
      id: 'auto-router',
      models: ['anthropic/*', 'openai/*'],
    },
  ],
});
```

**패턴 문법**:

| 패턴 | 의미 |
|------|------|
| `anthropic/*` | 모든 Anthropic 모델 매칭 |
| `openai/*` | 모든 OpenAI 모델 매칭 |
| (설정 없음) | 기본값: 지원되는 모든 모델 사용 |

#### Settings UI에서 설정

1. **Settings > Plugins** 로 이동
2. **Auto Router** 의 설정 버튼 클릭
3. 모델 패턴을 한 줄에 하나씩 입력
4. 설정 저장

### 요금

선택된 모델의 표준 요금이 부과됩니다. Auto Router 자체에 대한 추가 요금은 없습니다.

### 사용 사례

- **범용 애플리케이션**: 사용자가 어떤 유형의 프롬프트를 보낼지 모를 때
- **비용 최적화**: 단순 작업에 효율적인 모델 자동 선택
- **품질 최적화**: 복잡한 프롬프트에 성능이 좋은 모델 라우팅 보장
- **실험**: 어떤 모델이 특정 용도에 적합한지 발견

### 제한 사항

- `messages` 형식이 필요합니다 (`prompt` 형식 미지원)
- 스트리밍 지원
- 모든 표준 OpenRouter 기능(툴 콜링 등)이 선택된 모델에서 동작합니다

---

## Body Builder Router

`openrouter/bodybuilder`는 자연어 프롬프트를 구조화된 OpenRouter API 요청 본문으로 변환하여, 여러 모델에 동일한 작업을 병렬로 실행할 수 있게 합니다.

### 개요

Body Builder는 AI를 사용해 사용자의 의도를 파악하고 유효한 OpenRouter API 요청 본문을 생성합니다. 달성하고자 하는 작업과 사용할 모델을 자연어로 설명하면, Body Builder가 실행 가능한 JSON 요청을 반환합니다.

**Body Builder는 무료**로 사용할 수 있습니다. 요청 본문 생성에 대한 요금은 부과되지 않습니다.

### 사용법

```typescript
const completion = await openRouter.chat.send({
  model: 'openrouter/bodybuilder',
  messages: [
    {
      role: 'user',
      content:
        'Translate the following to French, Spanish, and Japanese using Claude Sonnet, GPT-5, and Gemini: "Hello, how are you today?"',
    },
  ],
});
```

### 응답 형식

Body Builder는 OpenRouter 호환 요청 본문 배열을 포함하는 JSON 객체를 반환합니다.

### 생성된 요청 실행

요청 본문이 생성된 후 병렬로 실행할 수 있습니다.

### 모델 선택

Body Builder는 모든 사용 가능한 OpenRouter 모델에 접근할 수 있으며:

- 기본적으로 최신 모델 버전을 사용
- 설명에 기반하여 적절한 모델을 선택
- 모델 별칭과 일반적인 이름을 이해

모델 슬러그는 새 버전 출시에 따라 변경됩니다. 아래 예시는 2025년 12월 4일 기준입니다.

| 입력 | 매핑되는 슬러그 |
|------|-----------------|
| "Claude Sonnet" | `anthropic/claude-sonnet-4.5` |
| "Claude Opus" | `anthropic/claude-opus-4.5` |
| "GPT-5" | `openai/gpt-5.1` |
| "Gemini" | `google/gemini-3.1-pro-preview` |
| "DeepSeek" | `deepseek/deepseek-v3.2` |

### 요금

| 항목 | 요금 |
|------|------|
| Body Builder 요청 | 무료 (요청 본문 생성에 대한 요금 없음) |
| 생성된 요청 실행 | 표준 모델 요금 적용 |

### 사용 사례

- **모델 벤치마킹**: 동일한 작업에 대해 여러 모델의 성능 비교
- **중복성 및 안정성**: 중요 애플리케이션에서 여러 프로바이더의 응답 확보
- **A/B 테스트**: 모델 간 프롬프트 테스트로 최적 모델 발견
- **탐색**: 특정 작업에 뛰어난 모델 발견

### 제한 사항

- `messages` 형식 입력이 필요
- 생성된 요청은 기본적으로 최소 필수 필드만 사용
- 입력의 시스템 메시지는 보존되어 전달됨

---

## Free Models Router

`openrouter/free`는 OpenRouter에서 사용 가능한 무료 모델 중 하나를 자동으로 선택합니다. 라우터는 요청에 필요한 기능(이미지 이해, 툴 콜링, 구조화된 출력 등)을 지원하는 모델을 지능적으로 필터링합니다.

### 개요

직접 특정 무료 모델을 선택할 필요 없이 Free Models Router가 모델 선택을 처리합니다. 실험, 학습, 소규모 사용 사례에 적합합니다.

코드 없이 시도하려면 Chat Playground 가이드를 참조하세요.

### 사용법

```typescript
import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
  apiKey: '',
});

const completion = await openRouter.chat.send({
  model: 'openrouter/free',
  messages: [
    {
      role: 'user',
      content: 'Hello! What can you help me with today?',
    },
  ],
});

console.log(completion.choices[0].message.content);
// 어떤 모델이 선택되었는지 확인
console.log('Model used:', completion.model);
```

### 작동 방식

1. **요청 분석**: 필요한 기능 파악 (예: 비전, 툴 콜링, 구조화된 출력)
2. **모델 필터링**: 요청 요구사항을 지원하는 무료 모델으로 필터링
3. **무작위 선택**: 필터링된 풀에서 모델을 무작위로 선택
4. **요청 전달**: 선택된 무료 모델로 요청 전달
5. **응답 추적**: 응답에 사용된 모델 메타데이터 포함

### 사용 가능한 무료 모델

무료 모델 가용성은 자주 변경됩니다. 현재 무료 모델 목록은 모델 페이지에서 확인하세요.

- **DeepSeek R1 (free)**: DeepSeek의 추론 모델
- **Llama 모델 (free)**: 다양한 Meta Llama 모델
- **Qwen 모델 (free)**: Alibaba의 Qwen 모델 패밀리
- 기타 커뮤니티 제공 무료 모델

### 요금

Free Models Router는 완전히 무료입니다.

- 라우터 자체 사용: 무료
- 무료 모델로 라우팅된 요청: 무료

### 사용 사례

- **학습 및 실험**: 비용 없이 AI 기능 체험
- **프로토타이핑**: 유료 모델 커밋 전 앱 빌드 및 테스트
- **소규모 애플리케이션**: 개인 프로젝트나 데모에 적합
- **교육**: 학생과 교육자가 AI를 탐색하는 데 적합

### 제한 사항

- **속도 제한**: 유료 모델보다 낮은 속도 제한이 적용될 수 있음
- **가용성**: 무료 모델 가용성은 변동될 수 있으며 일시적으로 사용 불가능할 수 있음
- **성능**: 피크 사용 시간에 레이턴시가 높아질 수 있음
- **모델 선택**: 특정 모델 선택을 제어할 수 없음 (특정 무료 모델이 필요한 경우 `:free` 변형 접미사 사용)

### 특정 무료 모델 선택

무작위 선택 대신 특정 무료 모델을 사용하려면:

**`:free` 변형 사용**: 무료 변형이 있는 모델에 `:free`를 추가:

```json
{
  "model": "meta-llama/llama-3.2-3b-instruct:free"
}
```

**무료 모델 탐색**: 모델 페이지에서 사용 가능한 모든 무료 모델을 확인하고 직접 선택할 수도 있습니다.

---

## Auto Exacto

Auto Exacto는 툴 콜링이 포함된 모든 요청에 대해 프로바이더 순서를 자동으로 최적화하는 라우팅 단계입니다. 별도의 설정 없이 모든 툴 콜링 요청에 기본적으로 활성화되어 있습니다.

### 작동 방식

요청에 툴이 포함되어 있으면 Auto Exacto는 실제 성능 신호를 조합하여 사용 가능한 프로바이더를 재정렬합니다.

| 신호 | 설명 |
|------|------|
| **처리량** | 실시간 초당 토큰 수 메트릭 (모델 페이지의 Performance 탭에서 확인 가능) |
| **툴 콜링 성공률** | 각 프로바이더의 툴 콜 완료 신뢰성 (Performance 탭에서 확인 가능) |
| **벤치마크 데이터** | 내부 평가 결과 (추후 공개 예정) |

성능이 낮은 프로바이더는 우선순위가 낮아지고, 강력한 실적을 가진 프로바이더가 목록 앞쪽으로 이동합니다.

### 결과

Auto Exacto 활성화 시 tau-bench 점수와 툴 콜링 성공률에서 눈에 띄는 개선이 관찰되었습니다.

### 옵트아웃 (Opt Out)

Auto Exacto가 활성화되지 않은 경우 OpenRouter의 기본 라우팅은 주로 가격 가중치 기반입니다. Auto Exacto는 툴 콜링 요청에 대해 가격 대신 품질 신호로 프로바이더를 재정렬합니다.

이전 가격 가중치 동작으로 되돌리려면 다음 방법 중 하나로 명시적으로 가격 정렬을 설정하세요.

| 방법 | 설명 |
|------|------|
| **`provider.sort` 파라미터** | 요청 본문의 `provider` 객체에서 `sort`를 `"price"`로 설정 |
| **`:floor` 가상 변형** | 모델 슬러그에 `:floor` 추가 (예: `openai/gpt-4o:floor`) |
| **계정 설정의 기본 정렬** | 계정 설정에서 기본 프로바이더 정렬을 가격으로 설정 |

위 방법 중 하나를 사용하면 Auto Exacto가 우회되고 표준 가격 가중치 프로바이더 순서로 돌아갑니다.

---

## 모델 폴백 (Model Fallbacks)

`models` 파라미터를 사용하면 주 모델의 프로바이더가 다운되거나, 속도 제한에 걸리거나, 콘텐츠 모더레이션으로 거부한 경우 자동으로 다음 모델을 시도합니다.

### 사용법

우선순위 순서대로 모델 ID 배열을 제공합니다. 첫 번째 모델이 오류를 반환하면 OpenRouter가 자동으로 다음 모델을 시도합니다.

#### TypeScript SDK

```typescript
import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
  apiKey: '<OPENROUTER_API_KEY>',
});

const completion = await openRouter.chat.send({
  models: ['~anthropic/claude-sonnet-latest', 'gryphe/mythomax-l2-13b'],
  messages: [
    {
      role: 'user',
      content: 'What is the meaning of life?',
    },
  ],
});

console.log(completion.choices[0].message.content);
```

#### OpenAI SDK에서 사용 (Python)

```python
from openai import OpenAI

openai_client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="<OPENROUTER_API_KEY>",
)

completion = openai_client.chat.completions.create(
    model="~openai/gpt-latest",
    extra_body={
        "models": ["~anthropic/claude-sonnet-latest", "gryphe/mythomax-l2-13b"],
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

#### OpenAI SDK에서 사용 (TypeScript)

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: '<OPENROUTER_API_KEY>',
});

const completion = await openai.chat.completions.create({
  model: '~openai/gpt-latest',
  messages: [
    { role: 'user', content: 'What is the meaning of life?' }
  ],
}, {
  body: {
    models: ['~anthropic/claude-sonnet-latest', 'gryphe/mythomax-l2-13b'],
  },
});
```

> **참고**: `~` 접두사가 붙은 슬러그(`~anthropic/claude-sonnet-latest`, `~openai/gpt-latest` 등)는 Latest Model Resolution alias로, 항상 해당 모델 패밀리의 최신 버전을 가리킵니다.

### 폴백 동작

| 항목 | 설명 |
|------|------|
| **폴백 트리거** | 컨텍스트 길이 검증 오류, 모더레이션 플래그, 속도 제한, 다운타임 등 모든 오류 |
| **폴백 실패 시** | 폴백 모델도 오류를 반환하면 해당 오류가 반환됨 |
| **요금** | 최종 사용된 모델 기준으로 청구되며, 응답 본문의 `model` 속성에 반환됨 |

---

## 모델 변형 (Model Variants)

모델 슬러그 뒤에 접미사(`:`)를 붙여 특별한 기능을 활성화할 수 있습니다.

### 변형 요약

| 변형 | 기능 | 예시 |
|------|------|------|
| `:free` | 무료 모델 접근 | `meta-llama/llama-3.2-3b-instruct:free` |
| `:extended` | 확장 컨텍스트 윈도우 | `openai/gpt-4o:extended` |
| `:exacto` | 품질 우선 프로바이더 정렬 | `moonshotai/kimi-k2-0905:exacto` |
| `:thinking` | 확장 추론 기능 | `deepseek/deepseek-r1:thinking` |
| `:online` | 웹 검색 (deprecated) | `openai/gpt-5.2:online` |
| `:nitro` | 처리량 우선 프로바이더 정렬 | `openai/gpt-5.2:nitro` |
| `:floor` | 가격 우선 프로바이더 정렬 | `meta-llama/llama-3.3-70b-instruct:floor` |

---

### :free (무료)

무료 버전의 모델에 접근합니다. 비용은 발생하지 않으나, 유료 버전에 비해 속도 제한이나 가용성이 다를 수 있습니다.

```json
{
  "model": "meta-llama/llama-3.2-3b-instruct:free"
}
```

---

### :extended (확장 컨텍스트)

확장된 컨텍스트 윈도우를 가진 모델 버전에 접근합니다. 더 긴 입력을 처리하고 더 많은 대화 기록을 유지할 수 있습니다.

```json
{
  "model": "openai/gpt-4o:extended"
}
```

---

### :exacto (품질 우선 프로바이더 정렬)

`:exacto`를 추가하면 품질 우선 프로바이더 정렬이 명시적으로 적용됩니다. 기본 가격 가중치 순서 대신 툴 콜링 품질 신호가 강한 프로바이더를 우선시합니다.

```typescript
import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const completion = await openRouter.chat.send({
  model: 'moonshotai/kimi-k2-0905:exacto',
  messages: [
    {
      role: 'user',
      content: 'Draft a concise changelog entry for the Exacto launch.',
    },
  ],
  stream: false,
});

console.log(completion.choices[0].message.content);
```

`:exacto` 접미사가 있는 모델은 선택 시 Exacto 정렬을 요청하며, `models` 배열과 함께 폴백 모델을 제공할 수도 있습니다.

**Exacto vs Auto Exacto**:

| 항목 | 설명 |
|------|------|
| **Auto Exacto** | 툴 콜링 요청에 자동으로 실행되며 모델 접미사가 필요 없음 |
| **`:exacto`** | 특정 모델 슬러그에 명시적으로 Exacto 정렬을 요청하는 바로가기 |

명시적으로 가격, 처리량, 레이턴시로 정렬을 지정하면 해당 정렬이 우선합니다.

**권장 사용 사례**: 툴 콜링 정확성과 신뢰성이 원시 비용 효율성보다 중요한 품질 민감형 에이전트 워크플로우에 적합합니다.

---

### :thinking (확장 추론)

확장된 추론 기능을 활성화합니다. 복잡한 문제 해결 작업에서 단계별 사고(chain-of-thought)가 가능한 모델에 접근합니다.

```json
{
  "model": "deepseek/deepseek-r1:thinking"
}
```

---

### :online (웹 검색) - Deprecated

> **Deprecated**: `:online` 변형은 더 이상 권장되지 않습니다. 대신 `openrouter:web_search` 서버 툴을 사용하세요. 서버 툴은 모델이 검색 시기와 빈도를 직접 제어할 수 있습니다.
>
> 애플리케이션이 이미 `web_search` 툴을 제공하는 경우(예: OpenAI의 내장 웹 검색 툴 타입), OpenRouter가 이를 자동으로 인식하여 `openrouter:web_search` 서버 툴로 승격합니다. 따라서 모델 슬러그에서 `:online` 접미사를 안전하게 제거할 수 있으며, 애플리케이션이 `web_search` 툴을 노출하는 한 웹 검색 기능은 계속 동작합니다.

```json
{
  "model": "openai/gpt-5.2:online"
}
```

이는 다음과 동일합니다:

```json
{
  "model": "openrouter/auto",
  "plugins": [{ "id": "web" }]
}
```

권장 접근 방법은 [Web Search Server Tool](./10-web-search.md)을 참조하세요.

---

### :nitro (처리량 우선)

`:nitro`를 추가하면 처리량 기준 프로바이더 정렬과 동일합니다. `provider.sort`를 `"throughput"`으로 설정하는 것과 정확히 같습니다.

```typescript
const completion = await openRouter.chat.send({
  model: 'openai/gpt-5.2:nitro',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: false,
});
```

---

### :floor (가격 우선)

`:floor`를 추가하면 가격 기준 프로바이더 정렬과 동일합니다.

```typescript
const completion = await openRouter.chat.send({
  model: 'meta-llama/llama-3.3-70b-instruct:floor',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: false,
});
```

---

## 관련 문서

- [Quickstart](./01-quickstart.md)
- [API 레퍼런스](./02-api-reference.md)
- [Provider Selection](./08-provider-selection.md)
- [웹 검색](./10-web-search.md)
- [툴 콜링](./09-tool-calling.md)
