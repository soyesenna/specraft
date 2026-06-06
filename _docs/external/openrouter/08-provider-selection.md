# OpenRouter Provider Selection 가이드

> 원문: https://openrouter.ai/docs/guides/routing/provider-selection

OpenRouter는 모델에 대해 사용 가능한 최적의 프로바이더로 요청을 라우팅합니다. 기본적으로 가동 시간을 최대화하기 위해 상위 프로바이더에 부하 분산됩니다.

요청 본문의 `provider` 객체를 통해 라우팅을 커스터마이즈할 수 있습니다.

---

## Provider 설정 필드

| 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `order` | string[] | - | 시도할 프로바이더 슬러그 순서 (예: `["anthropic", "openai"]`) |
| `allow_fallbacks` | boolean | `true` | 기본 프로바이더가 불가능할 때 백업 프로바이더 허용 여부 |
| `require_parameters` | boolean | `false` | 요청의 모든 파라미터를 지원하는 프로바이더만 사용 |
| `data_collection` | "allow" \| "deny" | "allow" | 데이터를 저장할 수 있는 프로바이더 사용 여부 제어 |
| `zdr` | boolean | - | ZDR(Zero Data Retention) 엔드포인트로만 라우팅 제한 |
| `enforce_distillable_text` | boolean | - | 텍스트 증류를 허용하는 모델로만 라우팅 제한 |
| `only` | string[] | - | 이 요청에 허용할 프로바이더 슬러그 목록 |
| `ignore` | string[] | - | 이 요청에서 건너뛸 프로바이더 슬러그 목록 |
| `quantizations` | string[] | - | 필터링할 양자화 수준 목록 (예: `["int4", "int8"]`) |
| `sort` | string \| object | - | 가격, 처리량 또는 지연 시간으로 프로바이더 정렬. 문자열(예: `"price"`) 또는 `by`와 `partition` 필드가 있는 객체 가능 |
| `preferred_min_throughput` | number \| object | - | 선호하는 최소 처리량 (tokens/sec). 숫자 또는 백분위수 컷오프 객체(p50, p75, p90, p99) |
| `preferred_max_latency` | number \| object | - | 선호하는 최대 지연 시간 (초). 숫자 또는 백분위수 컷오프 객체(p50, p75, p90, p99) |
| `max_price` | object | - | 이 요청에 지불할 최대 가격 |

> **EU 데이터 레지던시 (Enterprise)**: OpenRouter는 엔터프라이즈 고객을 위해 EU 내 라우팅을 지원합니다. 활성화하면 프롬프트와 완성이 EU 내에서만 처리됩니다. 자세한 내용은 [개인정보 문서](https://openrouter.ai/docs/privacy)를 참조하세요. 엔터프라이즈팀에 문의하려면 [이 양식](https://openrouter.ai)을 작성하세요.

---

## 기본 전략: 가격 기반 부하 분산

각 모델에 대해 OpenRouter의 기본 동작은 가격을 우선으로 프로바이더 간 부하 분산입니다. 처리량에 더 민감한 경우 `sort` 필드를 사용하여 명시적으로 처리량을 우선할 수 있습니다.

`tools` 또는 `tool_choice`와 함께 요청을 보내면, 툴 사용을 지원하는 프로바이더로만 라우팅됩니다. 마찬가지로 `max_tokens`를 설정하면 해당 길이의 응답을 지원하는 프로바이더로만 라우팅됩니다.

### 부하 분산 로직

1. 최근 30초 내에 중대한 중단이 없었던 프로바이더를 우선시
2. 안정적인 프로바이더 중 가장 저렴한 후보를 선택하되, 가격의 역제곱에 비례하여 가중치 적용
3. 나머지 프로바이더를 폴백으로 사용

### 부하 분산 예시

프로바이더 A가 백만 토큰당 $1, B가 $2, C가 $3이고 B에 최근 중단이 있었던 경우:

- 프로바이더 A가 먼저 선택됩니다. A가 C보다 선택될 확률은 9배입니다 (1/3^2 = 1/9, 가격의 역제곱)
- A가 실패하면 C가 시도됩니다
- C도 실패하면 B가 마지막으로 시도됩니다

**참고**: `sort` 또는 `order`가 설정되면 부하 분산이 비활성화됩니다.

---

## 프로바이더 정렬

명시적으로 특정 속성을 우선하려면 `sort` 필드를 사용합니다. 부하 분산이 비활성화되고 라우터가 순서대로 프로바이더를 시도합니다.

| 정렬 옵션 | 설명 |
| --- | --- |
| `"price"` | 최저 가격 우선 |
| `"throughput"` | 최고 처리량 우선 |
| `"latency"` | 최저 지연 시간 우선 |

```typescript
import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
  apiKey: '<YOUR_API_KEY>',
});

// 처리량 우선 정렬
const completion = await openRouter.chat.send({
  model: 'meta-llama/llama-3.3-70b-instruct',
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    sort: 'throughput',
  },
  stream: false,
});
```

항상 저렴한 가격을 우선하고 부하 분산을 적용하지 않으려면 `sort`를 `"price"`로 설정하세요. 항상 낮은 지연 시간을 우선하려면 `sort`를 `"latency"`로 설정하세요.

---

## Nitro Shortcut

모델 슬러그 뒤에 `:nitro`를 붙여 처리량 기준 정렬의 바로가기로 사용할 수 있습니다. 이는 `provider.sort`를 `"throughput"`으로 설정하는 것과 완전히 동일합니다.

```typescript
import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
  apiKey: '<YOUR_API_KEY>',
});

const completion = await openRouter.chat.send({
  model: 'meta-llama/llama-3.3-70b-instruct:nitro',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: false,
});
```

---

## Floor Price Shortcut

모델 슬러그 뒤에 `:floor`를 붙여 가격 기준 정렬의 바로가기로 사용할 수 있습니다. 이는 `provider.sort`를 `"price"`으로 설정하는 것과 완전히 동일합니다.

```typescript
import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
  apiKey: '<YOUR_API_KEY>',
});

const completion = await openRouter.chat.send({
  model: 'meta-llama/llama-3.3-70b-instruct:floor',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: false,
});
```

---

## 고급 정렬 (Partition)

모델 폴백을 사용할 때 `sort`를 객체로 지정하여 여러 모델 간 정렬 방식을 제어할 수 있습니다:

| 필드 | 기본값 | 설명 |
| --- | --- | --- |
| `sort.by` | - | 정렬 전략: `"price"`, `"throughput"`, `"latency"` |
| `sort.partition` | `"model"` | `"model"` (모델별 그룹화) 또는 `"none"` (전역 정렬) |

기본적으로 여러 모델(폴백)을 지정하면 OpenRouter는 정렬 전에 모델별로 엔드포인트를 그룹화합니다. 즉, 성능 특성에 관계없이 항상 기본 모델의 엔드포인트가 먼저 시도됩니다. `partition`을 `"none"`으로 설정하면 이 그룹화가 제거되어 모든 모델에서 엔드포인트를 전역적으로 정렬할 수 있습니다.

기본 동작을 명시적으로 사용하려면 `partition: "model"`을 설정하세요. 모델 폴백 작동 방식에 대한 자세한 내용은 모델 폴백 문서를 참조하세요.

> **참고**: `preferred_max_latency`와 `preferred_min_throughput`은 해당 성능 수준의 프로바이더나 모델을 보장하지 않습니다. 단지 임계값을 충족하는 프로바이더와 모델이 우선순위를 갖습니다. 따라서 이 설정을 지정해도 요청이 실행되지 않는 일은 없습니다. 이는 가격이 맞지 않으면 요청 실행을 차단하는 `max_price`와 다른 동작입니다.

### Use Case 1: 최고 처리량/최저 지연 모델로 라우팅

여러 개의 허용 가능한 모델이 있고 현재 가장 성능이 좋은 모델을 사용하고 싶을 때, `partition: "none"`과 처리량 또는 지연 시간 정렬을 함께 사용하세요. 특정 모델보다 속도가 중요한 경우에 유용합니다.

```typescript
const completion = await openRouter.chat.send({
  models: [
    'anthropic/claude-sonnet-4.5',
    'openai/gpt-5-mini',
    'google/gemini-3-flash-preview',
  ],
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    sort: {
      by: 'throughput',
      partition: 'none',
    },
  },
  stream: false,
});
```

이 예제에서는 Claude를 항상 먼저 시도하는 대신, 세 모델 중 현재 가장 높은 처리량을 가진 엔드포인트로 라우팅됩니다.

### Use Case 2: 성능 요구사항을 만족하는 가장 저렴한 모델

`partition: "none"`과 성능 임계값을 결합하여 여러 모델에서 성능 요구사항을 충족하는 가장 저렴한 옵션을 찾을 수 있습니다. 성능 하한선이 있지만 비용을 최소화하려는 경우에 유용합니다.

```typescript
const completion = await openRouter.chat.send({
  models: [
    'anthropic/claude-sonnet-4.5',
    'openai/gpt-5-mini',
    'google/gemini-3-flash-preview',
  ],
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    sort: {
      by: 'price',
      partition: 'none',
    },
    preferredMinThroughput: {
      p90: 50, // 최근 5분간 90% 요청에서 50 tokens/sec 이상 선호
    },
  },
  stream: false,
});
```

이 예제에서는 세 모델 전체에서 p90 수준에서 초당 최소 50 토큰의 처리량을 가진 가장 저렴한 모델과 프로바이더를 찾습니다. 임계값 미만의 모델과 프로바이더는 모든 우선 옵션이 실패한 경우에도 폴백으로 사용할 수 있습니다.

`preferred_max_latency`를 사용하여 최대 허용 지연 시간을 설정할 수도 있습니다:

```typescript
const completion = await openRouter.chat.send({
  models: [
    'anthropic/claude-sonnet-4.5',
    'openai/gpt-5-mini',
  ],
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    sort: {
      by: 'price',
      partition: 'none',
    },
    preferredMaxLatency: {
      p90: 3, // 최근 5분간 90% 요청에서 3초 미만 지연 시간 선호
    },
  },
  stream: false,
});
```

### Use Case 3: BYOK 사용 극대화

BYOK(Bring Your Own Key)를 사용 중이고 자체 API 키 사용을 극대화하려면 `partition: "none"`이 도움이 됩니다. 기본 모델에 BYOK 프로바이더가 없는 경우, BYOK를 지원하는 폴백 모델로 라우팅할 수 있습니다.

```typescript
const completion = await openRouter.chat.send({
  models: [
    'anthropic/claude-sonnet-4.5',
    'openai/gpt-5-mini',
    'google/gemini-3-flash-preview',
  ],
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    sort: {
      by: 'price',
      partition: 'none',
    },
  },
  stream: false,
});
```

이 예제에서 OpenAI에 BYOK 키가 구성되어 있지만 Anthropic에는 없는 경우, Claude가 먼저 나열되어 있어도 자체 키를 사용하여 GPT 엔드포인트로 라우팅할 수 있습니다. `partition: "none"`이 없으면 라우터는 항상 Claude의 엔드포인트를 먼저 시도한 후 GPT로 폴백합니다.

BYOK 엔드포인트는 프로바이더에 API 키가 구성되어 있으면 자동으로 우선순위를 갖습니다. `partition: "none"` 설정을 통해 이 우선순위가 모델 경계를 넘어 작동할 수 있습니다.

---

## 성능 임계값

최소 처리량 또는 최대 지연 시간 임계값을 설정하여 엔드포인트를 필터링할 수 있습니다. 임계값을 충족하지 못하는 엔드포인트는 완전히 제외되는 것이 아니라 우선순위가 낮아집니다 (목록의 끝으로 이동).

| 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `preferred_min_throughput` | number \| object | - | 선호하는 최소 처리량 (tokens/sec). 숫자(p50에 적용) 또는 백분위수 컷오프 객체 |
| `preferred_max_latency` | number \| object | - | 선호하는 최대 지연 시간 (초). 숫자(p50에 적용) 또는 백분위수 컷오프 객체 |

### 퍼센타일 작동 방식

OpenRouter는 각 모델과 프로바이더에 대해 5분 롤링 윈도우로 백분위수 통계를 계산하여 지연 시간 및 처리량 메트릭을 추적합니다. 사용 가능한 백분위수는 다음과 같습니다:

| 백분위수 | 의미 |
| --- | --- |
| **p50** (중앙값) | 50%의 요청이 이 값보다 더 나은 성능 |
| **p75** | 75%의 요청이 이 값보다 더 나은 성능 |
| **p90** | 90%의 요청이 이 값보다 더 나은 성능 |
| **p99** | 99%의 요청이 이 값보다 더 나은 성능 |

높은 백분위수(p90, p99)는 최악의 성능에 대해 더 높은 신뢰도를 제공하고, 낮은 백분위수(p50)는 일반적인 성능을 반영합니다. 예를 들어, 모델과 프로바이더의 p90 지연 시간이 2초라면 90%의 요청이 2초 이내에 완료된다는 의미입니다.

여러 백분위수 컷오프를 지정하면, 모델과 프로바이더가 우선 그룹에 포함되려면 **모든** 지정된 컷오프를 충족해야 합니다. 이를 통해 일반적인 성능과 최악의 성능 요구사항을 모두 설정할 수 있습니다.

### 퍼센타일 기반 라우팅 활용 시기

퍼센타일 기반 라우팅은 예측 가능한 성능 특성이 필요한 경우에 유용합니다:

| 시나리오 | 권장 설정 |
| --- | --- |
| **실시간 애플리케이션** | p90 또는 p99 지연 시간 임계값을 사용하여 사용자 대면 기능의 일관된 응답 시간 보장 |
| **배치 처리** | 최악의 시나리오보다 평균 성능이 중요한 경우 p50 처리량 임계값 사용 |
| **SLA 준수** | 여러 백분위수 컷오프를 사용하여 다양한 성능 티어에서 프로바이더가 SLA를 충족하는지 확인 |
| **비용 최적화** | `sort: "price"`와 결합하여 성능 요구사항을 충족하는 가장 저렴한 프로바이더 확보 |

### 다중 퍼센타일 설정 예제

여러 백분위수 컷오프를 지정하여 일반적인 성능과 최악의 성능 요구사항을 모두 설정할 수 있습니다. 모든 지정된 컷오프가 충족되어야 우선 그룹에 포함됩니다.

```typescript
const completion = await openRouter.chat.send({
  model: 'deepseek/deepseek-v3.2',
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    preferredMaxLatency: {
      p50: 1,   // 최근 5분간 50% 요청 < 1초 선호
      p90: 3,   // 최근 5분간 90% 요청 < 3초 선호
      p99: 5,   // 최근 5분간 99% 요청 < 5초 선호
    },
    preferredMinThroughput: {
      p50: 100, // 최근 5분간 50% 요청 > 100 tokens/sec 선호
      p90: 50,  // 최근 5분간 90% 요청 > 50 tokens/sec 선호
    },
  },
  stream: false,
});
```

---

## 특정 프로바이더 순서 지정

`order` 필드를 사용하여 OpenRouter가 요청에 우선할 프로바이더를 설정할 수 있습니다.

| 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `order` | string[] | - | 시도할 프로바이더 슬러그 순서 (예: `["anthropic", "openai"]`) |

라우터는 이 목록의 프로바이더를 지정된 순서대로 우선시합니다. 이 필드를 설정하지 않으면 라우터는 가동 시간을 최대화하기 위해 상위 프로바이더에 부하 분산합니다.

모델 페이지에서 프로바이더 이름 옆의 복사 버튼을 사용하여 "/turbo"와 같은 변형을 포함한 정확한 프로바이더 슬러그를 얻을 수 있습니다. 자세한 내용은 [특정 프로바이더 엔드포인트 타겟팅](#특정-프로바이더-엔드포인트-타겟팅)을 참조하세요.

OpenRouter는 프로바이더를 한 번에 하나씩 시도하고, 작동하지 않으면 다른 프로바이더로 진행합니다. 다른 프로바이더를 허용하지 않으려면 폴백도 비활성화해야 합니다.

### 예제: 폴백 포함

이 예제는 OpenAI(Mixtral을 호스팅하지 않음)를 건너뛰고, Together를 시도한 후 OpenRouter의 일반 프로바이더 목록으로 폴백합니다:

```typescript
const completion = await openRouter.chat.send({
  model: 'mistralai/mixtral-8x7b-instruct',
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    order: ['openai', 'together'],
  },
  stream: false,
});
```

### 예제: 폴백 비활성화

`allow_fallbacks`를 `false`로 설정한 예제입니다. OpenAI(Mixtral을 호스팅하지 않음)를 건너뛰고, Together를 시도하며, Together가 실패하면 요청이 실패합니다:

```typescript
const completion = await openRouter.chat.send({
  model: 'mistralai/mixtral-8x7b-instruct',
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    order: ['openai', 'together'],
    allowFallbacks: false,
  },
  stream: false,
});
```

---

## 특정 프로바이더 엔드포인트 타겟팅

각 프로바이더는 여러 엔드포인트를 호스팅할 수 있습니다 (예: 기본 + "turbo" 변형, `google-vertex/us-east5`와 같은 지역별 엔드포인트). 특정 엔드포인트를 타겟팅하려면 모델 상세 페이지에서 프로바이더 이름 옆의 복사 버튼을 사용하여 정확한 프로바이더 슬러그를 얻을 수 있습니다.

### 슬러그 매칭 규칙

기본 프로바이더 슬러그(예: `"google-vertex"`)를 프로바이더 라우팅 필드(`order`, `only`, `ignore`)에 사용하면 변형이나 지역을 포함하여 해당 프로바이더의 **모든** 엔드포인트와 매칭됩니다. 특정 변형이나 지역을 타겟팅하려면 접미사가 포함된 전체 슬러그를 사용하세요.

| 요청의 슬러그 | 매칭 대상 |
| --- | --- |
| `"google-vertex"` | Google Vertex의 모든 엔드포인트 (모든 지역) |
| `"google-vertex/us-east5"` | `us-east5` 지역 엔드포인트만 |
| `"deepinfra"` | DeepInfra의 모든 엔드포인트 (기본 + turbo) |
| `"deepinfra/turbo"` | DeepInfra turbo 엔드포인트만 |

### 예제: 특정 엔드포인트 변형 타겟팅

예를 들어, DeepInfra는 DeepSeek R1을 여러 엔드포인트로 제공합니다:

- 기본 엔드포인트 (슬러그: `deepinfra`)
- Turbo 엔드포인트 (슬러그: `deepinfra/turbo`)

정확한 프로바이더 슬러그를 복사하여 요청의 `order` 배열에 사용하면 원하는 특정 엔드포인트로 라우팅을 보장할 수 있습니다:

```typescript
const completion = await openRouter.chat.send({
  model: 'deepseek/deepseek-r1',
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    order: ['deepinfra/turbo'],
    allowFallbacks: false,
  },
  stream: false,
});
```

이 방법은 특정 프로바이더의 특정 변형을 일관되게 사용하려는 경우에 특히 유용합니다.

프로바이더의 **모든** 엔드포인트(모든 지역 및 변형)로 라우팅하려면 접미사 없는 기본 슬러그를 사용하세요. 예를 들어 `"google-vertex"`는 모든 Vertex AI 지역에 걸쳐 라우팅합니다.

---

## 파라미터 지원 요구

`require_parameters` 필드를 사용하여 요청의 모든 파라미터를 지원하는 프로바이더로만 요청을 제한할 수 있습니다.

| 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `require_parameters` | boolean | `false` | 요청의 모든 파라미터를 지원하는 프로바이더만 사용 |

기본 라우팅 전략에서는 요청에 지정된 모든 LLM 파라미터를 지원하지 않는 프로바이더도 요청을 받을 수 있지만, 알 수 없는 파라미터는 무시합니다. `require_parameters`를 `true`로 설정하면 해당 프로바이더로 요청이 라우팅되지 않습니다.

### 예제: JSON 포맷을 지원하지 않는 프로바이더 제외

```typescript
const completion = await openRouter.chat.send({
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    requireParameters: true,
  },
  responseFormat: { type: 'json_object' },
  stream: false,
});
```

---

## 데이터 정책 준수

`data_collection` 필드를 사용하여 데이터 정책을 준수하는 프로바이더로만 요청을 제한할 수 있습니다.

| 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `data_collection` | "allow" \| "deny" | "allow" | 데이터를 저장할 수 있는 프로바이더 사용 여부 제어 |

| 값 | 설명 |
| --- | --- |
| `allow` | (기본값) 사용자 데이터를 비일시적으로 저장하고 학습에 사용할 수 있는 프로바이더 허용 |
| `deny` | 사용자 데이터를 수집하지 않는 프로바이더만 사용 |

일부 모델 프로바이더는 프롬프트를 로그할 수 있으므로 모델 페이지에 **Data Policy** 태그로 표시됩니다. 이는 제3자 데이터 정책의 확정적인 출처가 아니며, 당사의 최선 지식을 나타냅니다.

> **계정 전체 데이터 정책 필터링**: 개인정보 설정에서 계정 전체 설정으로도 사용할 수 있습니다. 학습용 입력을 저장하는 제3자 모델 프로바이더를 비활성화할 수 있습니다.

### 예제: 데이터 정책을 준수하지 않는 프로바이더 제외

```typescript
const completion = await openRouter.chat.send({
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    dataCollection: 'deny',
  },
  stream: false,
});
```

---

## Zero Data Retention (ZDR) 강제

`zdr` 파라미터를 사용하여 요청 단위로 ZDR을 강제하여, 프롬프트를 보유하지 않는 엔드포인트로만 라우팅할 수 있습니다.

| 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `zdr` | boolean | - | ZDR(Zero Data Retention) 엔드포인트로만 라우팅 제한 |

`zdr`이 `true`로 설정되면 Zero Data Retention 정책을 가진 엔드포인트로만 라우팅됩니다. `zdr`이 `false`이거나 제공되지 않으면 라우팅에 영향을 주지 않습니다.

### 모델 그룹별 및 계정 전체 ZDR

ZDR은 개인정보 설정 또는 가드레일을 통해 모델 그룹별(Anthropic, OpenAI, Google, non-frontier)로도 강제할 수 있습니다. 요청 단위의 `zdr` 파라미터는 계정 전체 및 가드레일 ZDR 설정과 "OR"로 작동합니다. 둘 중 하나라도 활성화되면 ZDR 강제가 적용됩니다. 요청 수준 파라미터는 ZDR을 활성화할 수만 있으며, 계정 전체 또는 가드레일 강제를 재정의할 수는 없습니다. 자세한 내용은 Zero Data Retention 문서를 참조하세요.

### 예제: 특정 요청에 ZDR 강제

```typescript
const completion = await openRouter.chat.send({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    zdr: true,
  },
  stream: false,
});
```

전역으로 ZDR을 강제하지 않고 특정 요청만 ZDR 엔드포인트로 라우팅하려는 경우에 유용합니다.

---

## Distillable Text 강제

`enforce_distillable_text` 파라미터를 사용하여 요청 단위로 증류 가능한 텍스트 필터링을 강제할 수 있습니다. 작성자가 텍스트 증류를 허용한 모델로만 라우팅을 보장합니다.

| 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `enforce_distillable_text` | boolean | - | 텍스트 증류를 허용하는 모델로만 라우팅 제한 |

`enforce_distillable_text`가 `true`로 설정되면 작성자가 명시적으로 텍스트 증류를 활성화한 모델로만 라우팅됩니다. `false`이거나 제공되지 않으면 라우팅에 영향을 주지 않습니다.

이 파라미터는 모델 파인튜닝 또는 증류 워크플로를 위한 데이터셋을 구축할 때처럼, 텍스트 증류를 허용하는 모델만 사용하도록 보장해야 하는 애플리케이션에 유용합니다.

### 예제: 특정 요청에 증류 가능한 텍스트 강제

```typescript
const completion = await openRouter.chat.send({
  model: 'meta-llama/llama-3.3-70b-instruct',
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    enforceDistillableText: true,
  },
  stream: false,
});
```

---

## 폴백 비활성화

요청이 최상위(최저 비용) 프로바이더에서만 처리되도록 보장하려면 폴백을 비활성화할 수 있습니다. 이는 [특정 프로바이더 순서 지정](#특정-프로바이더-순서-지정)의 `order` 필드와 결합하여 OpenRouter가 우선할 프로바이더를 선택한 목록으로만 제한합니다.

```typescript
const completion = await openRouter.chat.send({
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    allowFallbacks: false,
  },
  stream: false,
});
```

---

## 특정 프로바이더만 허용

`provider` 객체의 `only` 필드를 설정하여 요청에 대해 특정 프로바이더만 허용할 수 있습니다.

| 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `only` | string[] | - | 이 요청에 허용할 프로바이더 슬러그 목록 |

일부 프로바이더만 허용하면 폴백 옵션이 크게 줄어들고 요청 복구가 제한될 수 있습니다.

> **계정 전체 허용 프로바이더**: 개인정보 설정에서 모든 계정 요청에 대해 프로바이더를 허용할 수 있습니다. 이 설정은 모든 API 요청과 채팅 메시지에 적용됩니다.
>
> 특정 요청에 대해 프로바이더를 허용하면, 허용된 프로바이더 목록은 계정 전체 허용 프로바이더와 병합됩니다.

### 예제: Azure만 사용하여 GPT-5-mini 호출

```typescript
const completion = await openRouter.chat.send({
  model: 'openai/gpt-5-mini',
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    only: ['azure'],
  },
  stream: false,
});
```

---

## 프로바이더 제외

`provider` 객체의 `ignore` 필드를 설정하여 요청에서 프로바이더를 제외할 수 있습니다.

| 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `ignore` | string[] | - | 이 요청에서 건너뛸 프로바이더 슬러그 목록 |

여러 프로바이더를 제외하면 폴백 옵션이 크게 줄어들고 요청 복구가 제한될 수 있습니다.

> **계정 전체 제외 프로바이더**: 개인정보 설정에서 모든 계정 요청에 대해 프로바이더를 제외할 수 있습니다. 이 설정은 모든 API 요청과 채팅 메시지에 적용됩니다.
>
> 특정 요청에 대해 프로바이더를 제외하면, 제외된 프로바이더 목록은 계정 전체 제외 프로바이더와 병합됩니다.

### 예제: DeepInfra를 제외하고 Llama 3.3 70b 호출

```typescript
const completion = await openRouter.chat.send({
  model: 'meta-llama/llama-3.3-70b-instruct',
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    ignore: ['deepinfra'],
  },
  stream: false,
});
```

---

## 양자화

양자화는 성능 유지를 목표로 모델 크기와 계산 요구사항을 줄입니다. 대부분의 최신 LLM은 학습과 추론에 FP16 또는 BF16을 사용하며, FP32에 비해 메모리 요구사항을 절반으로 줄입니다. 일부 최적화는 FP8 또는 양자화(예: INT8, INT4)를 사용하여 크기를 더 줄입니다.

| 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `quantizations` | string[] | - | 필터링할 양자화 수준 목록 (예: `["int4", "int8"]`) |

양자화된 모델은 사용된 방법에 따라 특정 프롬프트에서 성능 저하가 발생할 수 있습니다. 프로바이더는 오픈 웨이트 모델에 대해 다양한 양자화 수준을 지원할 수 있습니다.

### 양자화 수준

기본적으로 요청은 가격순으로 정렬된 모든 사용 가능한 프로바이더에 부하 분산됩니다. 양자화 수준으로 프로바이더를 필터링하려면 `provider` 파라미터의 `quantizations` 필드에 다음 값을 지정하세요:

| 값 | 설명 |
| --- | --- |
| `int4` | Integer (4 bit) |
| `int8` | Integer (8 bit) |
| `fp4` | Floating point (4 bit) |
| `fp6` | Floating point (6 bit) |
| `fp8` | Floating point (8 bit) |
| `fp16` | Floating point (16 bit) |
| `bf16` | Brain floating point (16 bit) |
| `fp32` | Floating point (32 bit) |
| `unknown` | 알 수 없음 |

### 예제: FP8 양자화 요청

FP8 양자화를 지원하는 프로바이더만 사용하는 예제입니다:

```typescript
const completion = await openRouter.chat.send({
  model: 'meta-llama/llama-3.1-8b-instruct',
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    quantizations: ['fp8'],
  },
  stream: false,
});
```

---

## 최대 가격 설정

`provider` 파라미터의 `max_price` 필드에 JSON 객체를 지정하여 프로바이더를 가격으로 필터링할 수 있습니다. 수락할 최대 프로바이더 가격을 지정합니다.

예를 들어 `{"prompt": 1, "completion": 2}` 값은 프롬프트 토큰 가격 `<= $1/M`, 완성 토큰 가격 `<= $2/M` 이하의 프로바이더로 라우팅합니다.

일부 프로바이더는 요청당 가격을 지원하며, 이 경우 `max_price`의 `request` 속성을 사용할 수 있습니다. 또한 `image`도 사용 가능하며, 이는 수락할 이미지당 최대 가격을 지정합니다.

실제로 이 필드는 프로바이터 `sort`와 결합하여 "처리량이 가장 높은 프로바이더를 사용하되, `$x/M` 토큰 이상이면 안 됨"과 같은 표현에 자주 사용됩니다.

```typescript
const completion = await openRouter.chat.send({
  model: 'some-model',
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    max_price: {
      prompt: 1,       // 프롬프트 토큰당 최대 $1/M
      completion: 2,   // 완성 토큰당 최대 $2/M
      request: 0.01,   // 요청당 최대 (프로바이더가 지원하는 경우)
      image: 0.05,     // 이미지당 최대
    },
  },
  stream: false,
});
```

---

## Anthropic 베타 기능

일부 프로바이더는 특수 헤더를 통해 활성화할 수 있는 베타 기능을 지원합니다. OpenRouter는 요청 시 특정 프로바이더 베타 헤더를 전달할 수 있습니다.

Anthropic 모델(Claude) 사용 시 요청에 `x-anthropic-beta` 헤더를 포함하여 특정 베타 기능을 요청할 수 있습니다. OpenRouter는 지원되는 베타 기능을 Anthropic으로 전달합니다.

### 지원되는 베타 기능

| 기능 | 헤더 값 | 설명 |
| --- | --- | --- |
| Fine-Grained Tool Streaming | `fine-grained-tool-streaming-2025-05-14` | 툴 콜 중 세분화된 스트리밍 이벤트를 활성화하여, 툴 인수가 생성되는 동안 실시간 업데이트 제공 |
| Interleaved Thinking | `interleaved-thinking-2025-05-14` | 씽킹/추론을 일반 출력과 교차 배치하여 단일 블록이 아닌 형태로 제공 |
| Structured Outputs | `structured-outputs-2025-11-13` | 지원되는 Claude 모델에서 엄격한 툴 사용 기능을 활성화하여, 스키마에 대해 툴 파라미터를 검증하고 올바르게 타입이 지정된 인수를 보장 |

### 자동 관리 기능

OpenRouter는 일부 Anthropic 베타 기능을 자동으로 관리합니다:

- **프롬프트 캐싱 및 확장 컨텍스트**는 모델 기능에 따라 자동 활성화됩니다
- **JSON 스키마 응답 포맷에 대한 구조화된 출력** (`response_format.type: "json_schema"`) - 헤더가 자동으로 적용됩니다

> **주의**: **엄격한 툴 사용** (`strict: true` on tools)의 경우 `structured-outputs-2025-11-13` 헤더를 명시적으로 전달해야 합니다. 이 헤더가 없으면 OpenRouter는 `strict` 필드를 제거하고 일반적으로 라우팅합니다.

### 예제: Fine-Grained Tool Streaming 활성화

```typescript
const completion = await openRouter.chat.send(
  {
    model: 'anthropic/claude-sonnet-4.5',
    messages: [{ role: 'user', content: 'What is the weather in Tokyo?' }],
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get the current weather for a location',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string' },
            },
            required: ['location'],
          },
        },
      },
    ],
    stream: true,
  },
  {
    headers: {
      'x-anthropic-beta': 'fine-grained-tool-streaming-2025-05-14',
    },
  }
);
```

### 예제: Interleaved Thinking 활성화

```typescript
const completion = await openRouter.chat.send(
  {
    model: 'anthropic/claude-sonnet-4.5',
    messages: [{ role: 'user', content: 'Solve this step by step: What is 15% of 240?' }],
    stream: true,
  },
  {
    headers: {
      'x-anthropic-beta': 'interleaved-thinking-2025-05-14',
    },
  }
);
```

### 여러 베타 기능 결합

쉼표로 구분하여 여러 베타 기능을 활성화할 수 있습니다:

```
x-anthropic-beta: fine-grained-tool-streaming-2025-05-14,interleaved-thinking-2025-05-14
```

베타 기능은 실험적이며 Anthropic에 의해 변경되거나 폐기될 수 있습니다. 사용 가능한 베타 기능에 대한 최신 정보는 Anthropic 문서를 확인하세요.

---

## 서비스 약관

각 프로바이더의 서비스 약관은 아래에서 확인할 수 있습니다. OpenRouter에서 모델을 제공하는 제3자 프로바이더의 서비스 약관이나 정책을 위반해서는 안 됩니다.

---

## 관련 문서

- [모델 라우팅](./07-model-routing.md)
- [API 레퍼런스](./02-api-reference.md)
- [프레임워크 통합](./06-frameworks.md)
- [개인정보 및 데이터 처리](./15-privacy.md)
