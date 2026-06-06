# Prompt Caching (프롬프트 캐싱) 가이드

> 원문: https://openrouter.ai/docs/prompt-caching
> https://openrouter.ai/docs/guides/features/prompt-caching
> https://openrouter.ai/docs/guides/features/response-caching

프롬프트 캐싱은 동일한 프롬프트 접두사를 재사용하여 LLM 추론 비용과 지연 시간을 크게 줄이는 기능입니다. OpenRouter는 프로바이더 수준의 **프롬프트 캐싱**과 OpenRouter 수준의 **응답 캐싱** 두 가지 캐싱 메커니즘을 제공합니다.

---

## 목차

1. [프롬프트 캐싱 개요](#프롬프트-캐싱-개요)
2. [프로바이더별 캐싱 상세](#프로바이더별-캐싱-상세)
3. [Provider Sticky Routing](#provider-sticky-routing)
4. [캐시 사용량 확인](#캐시-사용량-확인)
5. [응답 캐싱 (Response Caching)](#응답-캐싱-response-caching)
6. [코드 예제](#코드-예제)

---

## 프롬프트 캐싱 개요

프롬프트 캐싱은 LLM 엔진이 처리된 프롬프트의 메모리 스냅샷을 저장하여, 동일한 프롬프트 접두사가 포함된 후속 요청에서 이를 재사용하는 방식입니다. 캐시된 토큰은 정상 입력 가격보다 낮은 할인율로 청구됩니다.

### 핵심 특징

| 특징 | 설명 |
| --- | --- |
| **비용 절감** | 캐시된 토큰은 정상 입력 가격의 0.1x~0.5x로 청구 |
| **지연 감소** | 이미 처리된 프롬프트를 재사용하여 응답 시간 단축 |
| **자동 활성화** | 대부분의 프로바이더에서 별도 설정 없이 자동 적용 |
| **프로바이더 종속** | 캐시는 프로바이더별로 저장되며, 프로바이더 간 공유되지 않음 |

> **참고**: 프롬프트 캐싱은 프로바이더 전환 시 작동하지 않습니다. LLM 엔진이 처리된 프롬프트의 메모리 스냅샷을 저장하지만, 이는 다른 프로바이더와 공유되지 않기 때문입니다.

---

## 프로바이더별 캐싱 상세

### 프로바이더별 캐싱 요약

| 프로바이더 | 활성화 방식 | 캐시 쓰기 비용 | 캐시 읽기 비용 | 최소 토큰 |
| --- | --- | --- | --- | --- |
| **OpenAI** | 자동 | 무료 | 0.25x ~ 0.5x | 1,024 |
| **Anthropic** | 자동 또는 명시적 `cache_control` | 1.25x / 2x | 0.1x | 모델별 상이 |
| **DeepSeek** | 자동 | 입력가 동일 | 0.1x | - |
| **Google Gemini** | 암시적 + 명시적 | 무료 (암시적) / 저장비용 (명시적) | 0.25x | 1,028 ~ 4,096 |
| **Grok** | 자동 | 무료 | 0.25x | - |
| **Groq** | 자동 | 무료 | 0.5x | - |
| **Moonshot AI** | 자동 | 무료 | 0.25x | - |

> 비용 열의 `x`는 원본 입력 토큰 가격의 배수를 의미합니다.

---

### OpenAI

| 항목 | 내용 |
| --- | --- |
| **활성화** | 자동 (별도 설정 불필요) |
| **캐시 쓰기** | 무료 |
| **캐시 읽기** | 모델에 따라 0.25x 또는 0.5x |
| **최소 프롬프트 크기** | 1,024 토큰 |

OpenAI 프롬프트 캐싱은 자동으로 활성화되며 추가 설정이 필요 없습니다. 최소 1,024 토큰 이상의 프롬프트에만 캐싱이 적용됩니다.

---

### Anthropic Claude

Anthropic은 자동 캐싱과 명시적 캐시 브레이크포인트 두 가지 방식을 지원합니다.

#### 가격 구조

| 항목 | 비용 |
| --- | --- |
| **캐시 쓰기 (5분 TTL)** | 원본 입력가의 1.25x |
| **캐시 쓰기 (1시간 TTL)** | 원본 입력가의 2x |
| **캐시 읽기** | 원본 입력가의 0.1x |

#### 캐싱 활성화 방식

| 방식 | 설명 | 적합한 경우 |
| --- | --- | --- |
| **자동 캐싱** | 요청 최상위에 `cache_control` 필드 추가 | 멀티턴 대화 |
| **명시적 브레이크포인트** | 개별 콘텐츠 블록에 `cache_control` 배치 | 세밀한 제어 필요 시 |

> **중요**: 자동 캐싱(최상위 `cache_control`)은 **Anthropic 직접 프로바이더**에서만 지원됩니다. Amazon Bedrock 및 Google Vertex AI는 현재 최상위 `cache_control`을 지원하지 않습니다. 명시적 블록별 `cache_control` 브레이크포인트는 Anthropic, Bedrock, Vertex를 포함한 모든 Anthropic 호환 프로바이더에서 작동합니다.

#### 지원 모델

| 모델 | 최소 토큰 |
| --- | --- |
| Claude Opus 4.6 | 4,096 |
| Claude Opus 4.5 | 4,096 |
| Claude Haiku 4.5 | 4,096 |
| Claude Sonnet 4.6 | 2,048 |
| Claude Haiku 3.5 | 2,048 |
| Claude Sonnet 4.5 | 1,024 |
| Claude Opus 4.1 | 1,024 |
| Claude Opus 4 | 1,024 |
| Claude Sonnet 4 | 1,024 |
| Claude Sonnet 3.7 (deprecated) | 1,024 |

#### 캐시 TTL 옵션

| TTL | 설정 | 캐시 쓰기 비용 |
| --- | --- | --- |
| **5분** (기본) | `cache_control: { "type": "ephemeral" }` | 1.25x |
| **1시간** | `cache_control: { "type": "ephemeral", "ttl": "1h" }` | 2x |

> 1시간 TTL은 캐시 쓰기 비용이 더 높지만(2x vs 1.25x), 장기 세션에서 반복적인 캐시 쓰기를 피할 수 있어 전체 비용 절감에 유리합니다. 1시간 TTL은 Anthropic, Amazon Bedrock, Google Vertex를 포함한 모든 Claude 모델 프로바이더에서 지원됩니다.

#### 자동 캐싱 예제 (멀티턴 대화 권장)

```json
{
  "model": "anthropic/claude-sonnet-4.6",
  "cache_control": { "type": "ephemeral" },
  "messages": [
    {
      "role": "system",
      "content": "You are a historian studying the fall of the Roman Empire. You know the following book very well: HUGE TEXT BODY"
    },
    {
      "role": "user",
      "content": "What triggered the collapse?"
    }
  ]
}
```

자동 캐싱에서는 시스템이 마지막 캐시 가능 블록에 자동으로 캐시 브레이크포인트를 적용하며, 대화가 길어지면 브레이크포인트도 자동으로 앞으로 이동합니다.

#### 1시간 TTL 자동 캐싱 예제

```json
{
  "model": "anthropic/claude-sonnet-4.6",
  "cache_control": { "type": "ephemeral", "ttl": "1h" },
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "What is the meaning of life?"
    }
  ]
}
```

#### 명시적 브레이크포인트 예제 (세밀한 제어)

시스템 메시지 캐싱 (기본 5분 TTL):

```json
{
  "messages": [
    {
      "role": "system",
      "content": [
        {
          "type": "text",
          "text": "You are a historian studying the fall of the Roman Empire. You know the following book very well:"
        },
        {
          "type": "text",
          "text": "HUGE TEXT BODY",
          "cache_control": {
            "type": "ephemeral"
          }
        }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What triggered the collapse?"
        }
      ]
    }
  ]
}
```

사용자 메시지 캐싱 (1시간 TTL):

```json
{
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Given the book below:"
        },
        {
          "type": "text",
          "text": "HUGE TEXT BODY",
          "cache_control": {
            "type": "ephemeral",
            "ttl": "1h"
          }
        },
        {
          "type": "text",
          "text": "Name all the characters in the above book"
        }
      ]
    }
  ]
}
```

> **참고**: 명시적 브레이크포인트는 최대 4개까지 가능합니다. 캐시 브레이크포인트는 캐릭터 카드, CSV 데이터, RAG 데이터, 책 챕터 등 대용량 텍스트에 예약하는 것을 권장합니다.

---

### DeepSeek

| 항목 | 내용 |
| --- | --- |
| **활성화** | 자동 (별도 설정 불필요) |
| **캐시 쓰기** | 원본 입력가 동일 |
| **캐시 읽기** | 0.1x |

DeepSeek 프롬프트 캐싱은 자동으로 활성화되며 추가 설정이 필요 없습니다. 캐시 읽기 시 원본 가격의 10%만 청구됩니다.

---

### Google Gemini

Google Gemini는 **암시적 캐싱**과 **명시적 캐싱** 두 가지 방식을 지원합니다.

#### 암시적 캐싱 (Gemini 2.5 Pro / Flash)

| 항목 | 내용 |
| --- | --- |
| **지원 모델** | Gemini 2.5 Pro, Gemini 2.5 Flash |
| **활성화** | 자동 (별도 설정 불필요) |
| **캐시 쓰기** | 무료 |
| **캐시 읽기** | 0.25x |
| **TTL** | 평균 3~5분 (가변적) |
| **최소 토큰** | Gemini 2.5 Flash: 1,028 / Gemini 2.5 Pro: 2,048 |

> 암시적 캐시 적중률을 극대화하려면 메시지 배열의 초기 부분을 요청 간에 일관되게 유지하고, 변동 요소(질문, 동적 컨텍스트)를 프롬프트의 끝부분에 배치하세요.

#### 명시적 캐싱

| 항목 | 내용 |
| --- | --- |
| **활성화** | `cache_control` 브레이크포인트를 메시지 콘텐츠에 삽입 |
| **캐시 쓰기** | 입력 토큰 비용 + 5분 캐시 저장 비용 |
| **캐시 읽기** | 0.25x |
| **TTL** | 5분 (갱신되지 않음) |
| **최소 토큰** | 일반적으로 4,096 (모델별 상이) |

OpenRouter는 Gemini 캐시 관리를 단순화합니다:

- 캐시를 수동으로 생성, 업데이트 또는 삭제할 필요가 없습니다
- 캐시 이름이나 TTL을 명시적으로 관리할 필요가 없습니다

> **참고**: Gemini 캐싱은 Anthropic과 달리 브레이크포인트 개수 제한이 없습니다. OpenRouter는 Gemini 캐싱에 마지막 브레이크포인트만 사용합니다. 여러 브레이크포인트를 포함해도 안전하며 Anthropic과의 호환성을 유지하는 데 도움이 됩니다.

#### Gemini 명시적 캐싱 예제

시스템 메시지 캐싱:

```json
{
  "messages": [
    {
      "role": "system",
      "content": [
        {
          "type": "text",
          "text": "You are a historian studying the fall of the Roman Empire. Below is an extensive reference book:"
        },
        {
          "type": "text",
          "text": "HUGE TEXT BODY HERE",
          "cache_control": {
            "type": "ephemeral"
          }
        }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What triggered the collapse?"
        }
      ]
    }
  ]
}
```

---

### Grok

| 항목 | 내용 |
| --- | --- |
| **활성화** | 자동 (별도 설정 불필요) |
| **캐시 쓰기** | 무료 |
| **캐시 읽기** | 0.25x |

Grok 프롬프트 캐싱은 자동으로 활성화되며 추가 설정이 필요 없습니다.

---

### Groq

| 항목 | 내용 |
| --- | --- |
| **활성화** | 자동 (별도 설정 불필요) |
| **캐시 쓰기** | 무료 |
| **캐시 읽기** | 0.5x |
| **지원 모델** | 현재 Kimi K2 모델에서 사용 가능 |

Groq 프롬프트 캐싱은 자동으로 활성화되며 추가 설정이 필요 없습니다.

---

### Moonshot AI

| 항목 | 내용 |
| --- | --- |
| **활성화** | 자동 (별도 설정 불필요) |
| **캐시 쓰기** | 무료 |
| **캐시 읽기** | 0.25x |

Moonshot AI 프롬프트 캐싱은 자동으로 활성화되며 추가 설정이 필요 없습니다.

---

## Provider Sticky Routing

Provider Sticky Routing은 OpenRouter가 캐시가 활성화된 요청 이후, 동일한 프로바이더 엔드포인트로 후속 요청을 라우팅하여 캐시 적중률을 극대화하는 기능입니다.

### 작동 방식

| 단계 | 설명 |
| --- | --- |
| **1. 최초 요청** | 프롬프트 캐싱을 사용하는 요청이 특정 프로바이더로 라우팅됨 |
| **2. 프로바이더 기억** | OpenRouter가 어느 프로바이더가 요청을 처리했는지 기억 |
| **3. 후속 라우팅** | 동일한 모델에 대한 후속 요청을 동일한 프로바이더로 라우팅 |
| **4. 자동 폴백** | 해당 프로바이더가 사용 불가능하면 자동으로 다음 최적 프로바이더로 전환 |

### 핵심 특징

- **비용 보장**: Sticky 라우팅은 프로바이더의 캐시 읽기 가격이 일반 프롬프트 가격보다 저렴한 경우에만 활성화되어, 항상 비용 절감이 보장됩니다
- **적용 범위**: 암시적 캐싱(OpenAI, DeepSeek, Gemini 2.5 등)과 명시적 캐싱(Anthropic `cache_control`) 모두에 자동 적용됩니다
- **수동 오버라이드**: `provider.order`로 수동 프로바이더 순서를 지정한 경우, 명시적 순서가 우선합니다

### 추적 세분성

Sticky 라우팅은 **계정 수준**, **모델별**, **대화별**로 추적됩니다. OpenRouter는 각 요청의 첫 번째 시스템(또는 개발자) 메시지와 첫 번째 비시스템 메시지를 해시하여 대화를 식별합니다. 따라서 동일한 시작 메시지를 공유하는 요청은 동일한 프로바이더로 라우팅되며, 서로 다른 대화는 자연스럽게 다른 프로바이더에 분산되어 로드 밸런싱과 처리량이 개선됩니다.

---

## 캐시 사용량 확인

캐시 사용량을 확인하는 세 가지 방법이 있습니다.

### 1. Activity 페이지

OpenRouter 대시보드의 Activity 페이지에서 세부 정보 버튼을 클릭하여 각 생성의 캐시 절감액을 확인할 수 있습니다.

### 2. Generation API

`/api/v1/generation` API를 사용하여 프로그래밍 방식으로 캐시 사용량을 조회할 수 있습니다.

### 3. 응답 Usage 객체

API 응답에 포함된 `usage` 객체의 `prompt_tokens_details` 필드에서 상세 캐시 메트릭을 확인할 수 있습니다.

```json
{
  "usage": {
    "prompt_tokens": 10339,
    "completion_tokens": 60,
    "total_tokens": 10399,
    "prompt_tokens_details": {
      "cached_tokens": 10318,
      "cache_write_tokens": 0
    }
  }
}
```

### Usage 객체 필드

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `cached_tokens` | number | 캐시에서 읽은 토큰 수 (캐시 적중). 0보다 크면 캐시 혜택을 받고 있음 |
| `cache_write_tokens` | number | 캐시에 쓴 토큰 수. 새 캐시 항목을 생성하는 첫 요청에서 나타남 |

`cache_discount` 필드는 캐시 사용으로 절감된 금액을 나타냅니다. Anthropic 같은 프로바이더는 캐시 쓰기에서 음수 할인(비용 증가)이, 캐시 읽기에서 양수 할인(비용 감소)이 나타날 수 있습니다.

---

## 응답 캐싱 (Response Caching)

> **Beta**: 응답 캐싱은 현재 베타 단계이며 API와 동작이 변경될 수 있습니다.

응답 캐싱은 **OpenRouter 수준**에서 동일한 API 요청에 대한 응답을 캐시하는 기능입니다. 프롬프트 캐싱(프로바이더 수준)과는 별개로 작동하며, 두 가지를 함께 사용할 수 있습니다.

### 핵심 특징

| 특징 | 설명 |
| --- | --- |
| **무료** | 캐시 적중 시 모든 청구 가능 항목이 `0`으로 보고됨 |
| **모델 독립** | 모든 모델 및 프로바이더에서 작동 |
| **프로바이더 도달 전 캐싱** | OpenRouter 레이어에서 처리되어 프로바이더 지원 불필요 |
| **스트리밍 지원** | 스트리밍 및 비스트리밍 요청 모두 지원 |

### 응답 캐싱 vs 프롬프트 캐싱 비교

| 구분 | 프롬프트 캐싱 | 응답 캐싱 |
| --- | --- | --- |
| **작동 수준** | 프로바이더 인프라 내부 | OpenRouter 레이어 |
| **적용 방식** | 프롬프트 접두사 재사용 | 완전 동일한 요청의 응답 재사용 |
| **비용** | 할인된 가격 청구 | 완전 무료 (0 토큰) |
| **지원 범위** | 프로바이더별 상이 | 모든 모델/프로바이더 공통 |

### 활성화 방법

#### 1. 요청 헤더 사용 (개별 요청)

```bash
curl -i https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -H "X-OpenRouter-Cache: true" \
  -d '{
    "model": "google/gemini-2.5-flash",
    "messages": [
      {
        "role": "user",
        "content": "What is the meaning of life?"
      }
    ]
  }'
```

#### 2. Preset 설정 사용 (모든 요청)

Preset에 다음 필드를 설정하여 해당 Preset을 사용하는 모든 요청에 캐싱을 적용할 수 있습니다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `cache_enabled` | `boolean` | 해당 Preset의 모든 요청에 캐싱 활성화 |
| `cache_ttl_seconds` | `number` | 캐시된 응답의 기본 TTL (1~86400초, 기본 300) |

Preset 설정 예제:

```json
{
  "name": "cached-tests",
  "cache_enabled": true,
  "cache_ttl_seconds": 600
}
```

### 응답 헤더

최초 요청 (Cache MISS):

```http
HTTP/2 200
X-OpenRouter-Cache-Status: MISS
X-OpenRouter-Cache-TTL: 300

{
  "id": "gen-abc123",
  "model": "google/gemini-2.5-flash",
  "choices": ["..."],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 120,
    "total_tokens": 135
  }
}
```

후속 동일 요청 (Cache HIT):

```http
HTTP/2 200
X-OpenRouter-Cache-Status: HIT
X-OpenRouter-Cache-Age: 12
X-OpenRouter-Cache-TTL: 288
X-Generation-Id: gen-def456

{
  "id": "gen-def456",
  "created": 1746000012,
  "model": "google/gemini-2.5-flash",
  "choices": ["..."],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  }
}
```

### 캐시 키 구성

두 요청이 동일한 것으로 간주되려면 다음 항목이 모두 일치해야 합니다.

| 구성 요소 | 설명 |
| --- | --- |
| **API 키** | 동일한 API 키여야 함 (다른 키는 캐시 공유 불가) |
| **모델** | 동일한 모델 slug |
| **엔드포인트 타입** | 동일한 API 엔드포인트 |
| **스트리밍 모드** | `stream: true`와 `stream: false`는 별도 캐시 |
| **요청 본문** | SHA-256 해시로 비교 (속성 순서 중요) |

> **주의**: JSON 속성 순서가 다르면 다른 캐시 키가 생성됩니다. `{"model":"x","messages":[]}`와 `{"messages":[],"model":"x"}`는 서로 다른 캐시 항목으로 처리됩니다.

### 요청 헤더 참조

| 헤더 | 값 | 설명 |
| --- | --- | --- |
| `X-OpenRouter-Cache` | `true` | 이 요청에 캐싱 활성화 |
| `X-OpenRouter-Cache` | `false` | 이 요청에 캐싱 비활성화 (Preset 오버라이드) |
| `X-OpenRouter-Cache-TTL` | `<초>` | 커스텀 TTL (1~86400초, 기본 300) |
| `X-OpenRouter-Cache-Clear` | `true` | 이 요청의 캐시 강제 갱신 |

### 응답 헤더 참조

| 헤더 | 값 | 설명 |
| --- | --- | --- |
| `X-OpenRouter-Cache-Status` | `HIT` 또는 `MISS` | 캐시에서 응답했는지 여부 |
| `X-OpenRouter-Cache-Age` | `<초>` | 캐시된 시간 (HIT 시만) |
| `X-OpenRouter-Cache-TTL` | `<초>` | HIT 시 남은 TTL / MISS 시 전체 TTL |

### 우선순위 규칙

요청 헤더와 Preset 설정의 상호작용:

| 우선순위 | 조건 | 결과 |
| --- | --- | --- |
| 1 | Preset이 `cache_enabled: false`를 명시적 설정 | 요청 헤더와 관계없이 캐싱 **비활성화** |
| 2 | `X-OpenRouter-Cache: false` 헤더 | Preset이 캐싱을 활성화해도 캐싱 **비활성화** |
| 3 | `X-OpenRouter-Cache: true` 헤더 | Preset에 캐싱 설정이 없으면 캐싱 **활성화** |
| 4 | `X-OpenRouter-Cache-TTL` 헤더 | Preset의 `cache_ttl_seconds`를 **오버라이드** |
| 5 | 헤더와 Preset 모두 없음 | 캐싱 **비활성화** |

### TTL (Time-to-Live)

| 항목 | 값 |
| --- | --- |
| **기본 TTL** | 300초 (5분) |
| **범위** | 1초 ~ 86,400초 (24시간) |

요청별로 `X-OpenRouter-Cache-TTL` 헤더로 커스텀 TTL을 설정하거나, Preset의 `cache_ttl_seconds`로 기본 TTL을 설정할 수 있습니다.

### 지원 엔드포인트

| 엔드포인트 | API 형식 |
| --- | --- |
| `/api/v1/chat/completions` | OpenAI Chat Completions |
| `/api/v1/responses` | OpenAI Responses |
| `/api/v1/messages` | Anthropic Messages |
| `/api/v1/embeddings` | OpenAI Embeddings |

> 캐시 키에 엔드포인트 타입 구분자가 포함되어 있어, 동일한 본문으로 다른 엔드포인트에 요청해도 캐시가 충돌하지 않습니다.

### 청구

- 캐시 **MISS** (최초 요청): 정상적으로 청구
- 캐시 **HIT** (후속 동일 요청): **무료**, 모든 청구 가능 항목이 `0`으로 보고됨
  - Chat Completions / Responses: `prompt_tokens`, `completion_tokens`, `total_tokens` 모두 0
  - Embeddings: `prompt_tokens`, `total_tokens` 모두 0
  - Anthropic Messages: `input_tokens`, `output_tokens` 모두 0

캐시 적중은 프로바이더에 도달하지 않으므로 프로바이더 속도 제한에도 계산되지 않습니다.

### 제한사항

| 제한 | 설명 |
| --- | --- |
| **ZDR 비활성화** | 계정 수준 Zero Data Retention이 설정된 경우 응답 캐싱 사용 불가 |
| **동시 요청** | 두 동일 요청이 동시에 도착하면 모두 MISS 처리됨 (요청 병합 없음) |
| **캐시 제거** | 메모리 압력으로 TTL 만료 전에 캐시가 제거될 수 있음 |
| **비결정성** | 캐시된 응답은 `temperature` 등의 파라미터와 관계없이 그대로 반환됨 |

### 활용 사례

| 사례 | 설명 |
| --- | --- |
| **에이전트 워크플로우** | 실패 지점부터 재시작 시 이전 단계를 캐시에서 무료로 재생 |
| **유닛 테스트** | 동일한 테스트 요청에 대해 반복 가능한 응답을 0비용으로 제공 |
| **반복 동일 요청** | 동일한 모델/메시지/파라미터로 여러 번 호출 시 첫 호출만 비용 발생 |

---

## 코드 예제

### TypeScript: 프롬프트 캐싱 (Anthropic 자동 캐싱)

```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <YOUR_API_KEY>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'anthropic/claude-sonnet-4.6',
    cache_control: { type: 'ephemeral', ttl: '1h' },
    messages: [
      {
        role: 'system',
        content: 'You are a historian studying the fall of the Roman Empire...',
      },
      {
        role: 'user',
        content: 'What triggered the collapse?',
      },
    ],
  }),
});

const data = await response.json();
console.log('캐시된 토큰:', data.usage?.prompt_tokens_details?.cached_tokens);
console.log('캐시 쓰기 토큰:', data.usage?.prompt_tokens_details?.cache_write_tokens);
```

### TypeScript: 응답 캐싱

```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <YOUR_API_KEY>',
    'Content-Type': 'application/json',
    'X-OpenRouter-Cache': 'true',
    'X-OpenRouter-Cache-TTL': '600', // 10분
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',
    messages: [
      {
        role: 'user',
        content: 'What is the meaning of life?',
      },
    ],
  }),
});

// 캐시 상태 확인
const cacheStatus = response.headers.get('X-OpenRouter-Cache-Status');
console.log('캐시 상태:', cacheStatus); // 'HIT' 또는 'MISS'

const data = await response.json();
if (cacheStatus === 'HIT') {
  console.log('캐시 적중 — 무료 응답');
  console.log('토큰:', data.usage); // 모든 값이 0
}
```

### Python: Anthropic 명시적 브레이크포인트

```python
import requests
import json

response = requests.post(
    url="https://openrouter.ai/api/v1/chat/completions",
    headers={
        "Authorization": "Bearer <YOUR_API_KEY>",
        "Content-Type": "application/json",
    },
    data=json.dumps({
        "model": "anthropic/claude-sonnet-4.6",
        "messages": [
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": "You are a historian studying the fall of the Roman Empire. You know the following book very well:"
                    },
                    {
                        "type": "text",
                        "text": "VERY LONG BOOK CONTENT HERE...",
                        "cache_control": {
                            "type": "ephemeral",
                            "ttl": "1h"
                        }
                    }
                ]
            },
            {
                "role": "user",
                "content": "What triggered the collapse?"
            }
        ]
    })
)

data = response.json()
print(f"총 프롬프트 토큰: {data['usage']['prompt_tokens']}")
print(f"캐시된 토큰: {data['usage'].get('prompt_tokens_details', {}).get('cached_tokens', 0)}")
print(f"캐시 쓰기 토큰: {data['usage'].get('prompt_tokens_details', {}).get('cache_write_tokens', 0)}")
```

### Python: 응답 캐싱을 활용한 반복 요청

```python
import requests
import json

headers = {
    "Authorization": "Bearer <YOUR_API_KEY>",
    "Content-Type": "application/json",
    "X-OpenRouter-Cache": "true",
    "X-OpenRouter-Cache-TTL": "300",  # 5분
}

body = {
    "model": "google/gemini-2.5-flash",
    "messages": [
        {"role": "user", "content": "What is the meaning of life?"}
    ],
}

# 최초 요청 — 캐시 MISS
first = requests.post(
    "https://openrouter.ai/api/v1/chat/completions",
    headers=headers,
    data=json.dumps(body),
)
print(f"첫 요청 캐시 상태: {first.headers.get('X-OpenRouter-Cache-Status')}")  # MISS
print(f"첫 요청 토큰: {first.json()['usage']}")

# 동일 요청 재시도 — 캐시 HIT (무료)
second = requests.post(
    "https://openrouter.ai/api/v1/chat/completions",
    headers=headers,
    data=json.dumps(body),
)
print(f"두 번째 요청 캐시 상태: {second.headers.get('X-OpenRouter-Cache-Status')}")  # HIT
print(f"두 번째 요청 토큰: {second.json()['usage']}")  # 모든 값 0
```

### Python: 캐시 강제 갱신

```python
import requests
import json

headers = {
    "Authorization": "Bearer <YOUR_API_KEY>",
    "Content-Type": "application/json",
    "X-OpenRouter-Cache": "true",
    "X-OpenRouter-Cache-Clear": "true",  # 기존 캐시 삭제 후 새 요청
}

body = {
    "model": "google/gemini-2.5-flash",
    "messages": [
        {"role": "user", "content": "What is the meaning of life?"}
    ],
}

response = requests.post(
    "https://openrouter.ai/api/v1/chat/completions",
    headers=headers,
    data=json.dumps(body),
)
print(f"갱신 후 캐시 상태: {response.headers.get('X-OpenRouter-Cache-Status')}")  # MISS
```

---

## 관련 문서

- [API 레퍼런스](./02-api-reference.md)
- [모델 라우팅](./07-model-routing.md)
- [Provider Selection](./08-provider-selection.md)
- [Presets](./12-presets.md)
- [속도 제한](./14-rate-limits.md)
