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
| `sort` | string \| object | - | 가격, 처리량 또는 지연 시간으로 프로바이더 정렬 |
| `preferred_min_throughput` | number \| object | - | 선호하는 최소 처리량 (tokens/sec) |
| `preferred_max_latency` | number \| object | - | 선호하는 최대 지연 시간 (초) |
| `max_price` | object | - | 이 요청에 지불할 최대 가격 |

---

## 기본 전략: 가격 기반 부하 분산

각 모델에 대해 OpenRouter의 기본 동작은 가격을 우선으로 프로바이더 간 부하 분산입니다.

### 부하 분산 로직

1. 최근 30초 내에 중대한 중단이 없었던 프로바이더를 우선시
2. 안정적인 프로바이더 중 가장 저렴한 후보를 선택하되, 가격의 역제곱에 비례하여 가중치 적용
3. 나머지 프로바이더를 폴백으로 사용

### 예시

프로바이더 A가 백만 토큰당 $1, B가 $2, C가 $3이고 B에 최근 중단이 있었던 경우:

- 프로바이더 A가 먼저 선택됩니다. A가 C보다 선택될 확률은 9배입니다 (1/3^2 = 1/9)
- A가 실패하면 C가 시도됩니다
- C도 실패하면 B가 마지막으로 시도됩니다

**참고**: `sort` 또는 `order`가 설정되면 부하 분산이 비활성화됩니다.

---

## 프로바이더 정렬

명시적으로 특정 속성을 우선하려면 `sort` 필드를 사용합니다:

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

---

## 고급 정렬 (Partition)

모델 폴백을 사용할 때 `sort`를 객체로 지정하여 여러 모델 간 정렬 방식을 제어할 수 있습니다:

| 필드 | 기본값 | 설명 |
| --- | --- | --- |
| `sort.by` | - | 정렬 전략: `"price"`, `"throughput"`, `"latency"` |
| `sort.partition` | `"model"` | `"model"` (모델별 그룹화) 또는 `"none"` (전역 정렬) |

### Use Case 1: 최고 처리량/최저 지연 모델로 라우팅

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

`partition: "none"`을 설정하면 세 모델 중 현재 가장 높은 처리량을 가진 엔드포인트로 라우팅됩니다.

### Use Case 2: 성능 요구사항을 만족하는 가장 저렴한 모델

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
      p90: 50, // 90%의 요청에서 50 tokens/sec 이상 선호
    },
  },
  stream: false,
});
```

---

## 성능 임계값

### 퍼센타일 통계

OpenRouter는 각 모델/프로바이더에 대해 5분 롤링 윈도우로 백분위수 통계를 추적합니다:

| 백분위수 | 의미 |
| --- | --- |
| **p50** (중앙값) | 50%의 요청이 이 값보다 더 나은 성능 |
| **p75** | 75%의 요청이 이 값보다 더 나은 성능 |
| **p90** | 90%의 요청이 이 값보다 더 나은 성능 |
| **p99** | 99%의 요청이 이 값보다 더 나은 성능 |

### 다중 퍼센타일 설정 예제

```typescript
const completion = await openRouter.chat.send({
  model: 'deepseek/deepseek-v3.2',
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    preferredMaxLatency: {
      p50: 1,   // 50% 요청 < 1초
      p90: 3,   // 90% 요청 < 3초
      p99: 5,   // 99% 요청 < 5초
    },
    preferredMinThroughput: {
      p50: 100, // 50% 요청 > 100 tokens/sec
      p90: 50,  // 90% 요청 > 50 tokens/sec
    },
  },
  stream: false,
});
```

---

## 특정 프로바이더 순서 지정

### 폴백 포함

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

### 폴백 비활성화

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

각 프로바이더는 여러 엔드포인트를 호스팅할 수 있습니다 (예: 기본 + "turbo" 변형, 지역별 엔드포인트).

### 슬러그 매칭 규칙

| 요청의 슬러그 | 매칭 대상 |
| --- | --- |
| `"google-vertex"` | Google Vertex의 모든 엔드포인트 (모든 지역) |
| `"google-vertex/us-east5"` | `us-east5` 지역 엔드포인트만 |
| `"deepinfra"` | DeepInfra의 모든 엔드포인트 (기본 + turbo) |
| `"deepinfra/turbo"` | DeepInfra turbo 엔드포인트만 |

### 예제: 특정 엔드포인트 변형 타겟팅

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

---

## 파라미터 지원 요구

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

```typescript
// 데이터를 저장하지 않는 프로바이더만 사용
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

---

## 특정 프로바이더만 허용 / 제외

### 허용 (only)

```typescript
// Azure만 사용하여 GPT-5-mini 호출
const completion = await openRouter.chat.send({
  model: 'openai/gpt-5-mini',
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    only: ['azure'],
  },
  stream: false,
});
```

### 제외 (ignore)

```typescript
// DeepInfra를 제외하고 Llama 3.3 70b 호출
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

## 양자화 필터링

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

### 양자화 수준

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

---

## 최대 가격 설정

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

## 폴백 비활성화

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

## Anthropic 베타 기능

Anthropic 모델(Claude) 사용 시 특정 베타 기능을 요청할 수 있습니다:

| 기능 | 헤더 값 | 설명 |
| --- | --- | --- |
| Fine-Grained Tool Streaming | `fine-grained-tool-streaming-2025-05-14` | 툴 콜 중 세분화된 스트리밍 이벤트 |
| Interleaved Thinking | `interleaved-thinking-2025-05-14` | 씽킹/추론을 일반 출력과 교차 배치 |
| Structured Outputs | `structured-outputs-2025-11-13` | 엄격한 툴 사용 기능 |

```typescript
const completion = await openRouter.chat.send(
  {
    model: 'anthropic/claude-sonnet-4.5',
    messages: [{ role: 'user', content: 'Solve step by step' }],
    stream: true,
  },
  {
    headers: {
      'x-anthropic-beta': 'interleaved-thinking-2025-05-14',
    },
  }
);
```

여러 베타 기능을 쉼표로 구분하여 결합할 수 있습니다:

```
x-anthropic-beta: fine-grained-tool-streaming-2025-05-14,interleaved-thinking-2025-05-14
```

---

## 관련 문서

- [모델 라우팅](./07-model-routing.md)
- [API 레퍼런스](./02-api-reference.md)
- [프레임워크 통합](./06-frameworks.md)
