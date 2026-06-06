# OpenRouter Models API 가이드

> 원문: https://openrouter.ai/docs/models
> https://openrouter.ai/docs/api-reference/list-available-models
> https://openrouter.ai/docs/api-reference/list-endpoints-for-a-model

OpenRouter는 300개 이상의 모델과 프로바이더를 제공합니다. Models API를 통해 사용 가능한 모델 목록을 조회하고, 다양한 기준으로 필터링할 수 있습니다. RSS 피드를 구독하여 새로운 모델이 추가될 때마다 알림을 받을 수도 있습니다.

---

## 엔드포인트

```
GET https://openrouter.ai/api/v1/models
```

인증이 필요하지 않은 공개 엔드포인트입니다.

### 기본 요청

```bash
curl "https://openrouter.ai/api/v1/models"
```

---

## 응답 구조

```json
{
  "data": [
    {
      "id": "openai/gpt-5.2",
      "canonical_slug": "openai/gpt-5.2",
      "name": "GPT-5.2",
      "created": 1700000000,
      "description": "OpenAI의 최신 플래그십 모델",
      "context_length": 128000,
      "architecture": {
        "input_modalities": ["file", "image", "text"],
        "output_modalities": ["text"],
        "tokenizer": "o200k_base",
        "instruct_type": null
      },
      "pricing": { "..." },
      "top_provider": {
        "max_completion_tokens": 16384,
        "..." 
      },
      "per_request_limits": { "..." },
      "supported_parameters": ["tools", "response_format", "stream", "..." ],
      "default_parameters": { "..." },
      "hugging_face_id": "openai/gpt-5.2"
    }
  ]
}
```

---

## 쿼리 파라미터

### output_modalities

모델의 출력 모달리티로 필터링합니다.

| 값 | 설명 |
| --- | --- |
| `text` | 텍스트 출력 모델 (기본값) |
| `image` | 이미지 출력 모델 |
| `audio` | 오디오 출력 모델 |
| `embeddings` | 임베딩 모델 |
| `all` | 모든 모달리티 포함 |

```bash
# 이미지 생성 모델만 조회
curl "https://openrouter.ai/api/v1/models?output_modalities=image"

# 모든 모달리티 조회
curl "https://openrouter.ai/api/v1/models?output_modalities=all"
```

> **참고:** 동일한 파라미터를 `/v1/models/count` 엔드포인트에서도 사용할 수 있으며, 목록 결과와 일관된 카운트를 반환합니다.

### supported_parameters

모델이 지원하는 API 파라미터로 필터링합니다.

```bash
# 툴 콜링을 지원하는 모델만 조회
curl "https://openrouter.ai/api/v1/models?supported_parameters=tools"

# 구조화된 출력을 지원하는 모델만 조회
curl "https://openrouter.ai/api/v1/models?supported_parameters=response_format"
```

### category

모델 카테고리로 필터링합니다 (예: `programming`). 사용량이 많은 순으로 정렬됩니다.

```bash
curl "https://openrouter.ai/api/v1/models?category=programming"
```

### use_rss

`true`로 설정하면 JSON 대신 RSS XML 피드를 반환합니다 (베타).

| 값 | 설명 |
| --- | --- |
| `true` | RSS XML 피드 반환 |
| `false` | JSON 반환 (기본값) |

### use_rss_chat_links

`use_rss=true`일 때, 모델 페이지 URL 대신 채팅 URL을 RSS 항목 링크로 사용합니다 (베타).

| 값 | 설명 |
| --- | --- |
| `true` | 채팅 URL 사용 |
| `false` | 모델 페이지 URL 사용 (기본값) |

---

## Pricing 객체

모든 가격은 USD 기준이며 단위는 토큰/요청/단위당 비용입니다. 값이 `"0"`이면 해당 기능이 무료임을 나타냅니다.

| 필드 | 설명 |
| --- | --- |
| `prompt` | 입력 토큰당 비용 |
| `completion` | 출력 토큰당 비용 |
| `request` | API 요청당 고정 비용 |
| `image` | 이미지 입력당 비용 |
| `web_search` | 웹 검색 작업당 비용 |
| `internal_reasoning` | 내부 추론 토큰당 비용 |
| `input_cache_read` | 캐시된 입력 토큰 읽기당 비용 |
| `input_cache_write` | 캐시된 입력 토큰 쓰기당 비용 |

```json
{
  "pricing": {
    "prompt": "0.000005",
    "completion": "0.000015",
    "request": "0",
    "image": "0",
    "web_search": "0",
    "internal_reasoning": "0.000005",
    "input_cache_read": "0.000001",
    "input_cache_write": "0.000002"
  }
}
```

---

## 모델 객체 주요 필드

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string | 모델 고유 식별자 (예: `openai/gpt-5.2`) |
| `canonical_slug` | string | 변경되지 않는 모델의 영구 슬러그 |
| `name` | string | 모델 표시 이름 |
| `created` | number | 모델이 OpenRouter에 추가된 Unix 타임스탬프 |
| `description` | string | 모델 설명 |
| `context_length` | number | 최대 컨텍스트 길이 (토큰) |
| `architecture` | Architecture | 입력/출력 모달리티, 토크나이저, 인스트럭트 타입 |
| `pricing` | Pricing | 토큰/요청/단위당 최저 가격 정보 |
| `top_provider` | TopProvider | 최대 완성 토큰 수 등 주 프로바이더 정보 |
| `per_request_limits` | object \| null | 요청당 속도 제한 정보 (null이면 제한 없음) |
| `supported_parameters` | string[] | 지원하는 API 파라미터 목록 |
| `default_parameters` | object \| null | 기본 파라미터 설정 (null이면 없음) |
| `expiration_date` | string \| null | 모델 엔드포인트 폐기 예정일 (null이면 폐기 아님) |
| `hugging_face_id` | string | Hugging Face 모델 식별자 |

### Architecture 객체

```json
{
  "input_modalities": ["file", "image", "text"],
  "output_modalities": ["text"],
  "tokenizer": "o200k_base",
  "instruct_type": null
}
```

### TopProvider 객체

```json
{
  "context_length": 128000,
  "max_completion_tokens": 16384,
  "is_moderated": false
}
```

### supported_parameters 전체 목록

`supported_parameters` 배열은 각 모델이 지원하는 OpenAI 호환 파라미터를 나타냅니다.

| 파라미터 | 설명 |
| --- | --- |
| `tools` | 함수 콜링 기능 |
| `tool_choice` | 툴 선택 제어 |
| `max_tokens` | 응답 길이 제한 |
| `temperature` | 무작위성 제어 |
| `top_p` | 뉴클리어스 샘플링 |
| `reasoning` | 내부 추론 모드 |
| `include_reasoning` | 응답에 추론 포함 |
| `structured_outputs` | JSON 스키마 강제 |
| `response_format` | 출력 형식 지정 |
| `stop` | 커스텀 정지 시퀀스 |
| `frequency_penalty` | 반복 감소 |
| `presence_penalty` | 주제 다양성 |
| `seed` | 결정론적 출력 |

> **참고:** `supported_parameters`는 해당 모델의 **모든 프로바이더가 지원하는 파라미터의 합집합(union)**입니다. 즉, 단일 프로바이더가 목록의 모든 파라미터를 제공하지 않을 수 있습니다.

---

## 모델 수 조회

```
GET https://openrouter.ai/api/v1/models/count
```

`/api/v1/models`와 동일한 쿼리 파라미터(`output_modalities`, `supported_parameters` 등)를 사용하여 조건에 맞는 모델 수를 반환합니다. 목록 조회 결과와 일관된 카운트를 제공합니다.

---

## 모델 엔드포인트 조회

```
GET https://openrouter.ai/api/v1/models/:author/:slug/endpoints
```

특정 모델의 프로바이더별 엔드포인트 목록을 조회합니다. 인증이 필요하지 않습니다.

### 경로 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `author` | string | 필수 | 모델 작성자 (예: `openai`) |
| `slug` | string | 필수 | 모델 슬러그 (예: `gpt-5.2`) |

### 요청 예시

```bash
curl "https://openrouter.ai/api/v1/models/openai/gpt-5.2/endpoints"
```

### 응답 예시

```json
{
  "data": {
    "id": "openai/gpt-5.2",
    "name": "GPT-5.2",
    "created": 1700000000,
    "description": "OpenAI의 최신 플래그십 모델",
    "architecture": {
      "input_modalities": ["text", "image"],
      "output_modalities": ["text"],
      "tokenizer": "o200k_base",
      "instruct_type": null
    },
    "endpoints": [
      {
        "name": "OpenAI",
        "context_length": 128000,
        "pricing": {
          "request": "0",
          "image": "0",
          "prompt": "0.000005",
          "completion": "0.000015"
        },
        "provider_name": "OpenAI",
        "supported_parameters": ["tools", "temperature", "max_tokens"]
      }
    ]
  }
}
```

### 엔드포인트 객체 필드

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `name` | string | 엔드포인트 표시 이름 |
| `context_length` | number | 프로바이더별 컨텍스트 제한 |
| `pricing` | Pricing | 프로바이더별 가격 정보 |
| `provider_name` | string | 프로바이더 이름 |
| `supported_parameters` | string[] | 이 프로바이더가 지원하는 파라미터 목록 |

---

## RSS 피드 구독

OpenRouter는 새로운 모델이 추가될 때마다 업데이트되는 RSS 피드를 제공합니다. `use_rss` 쿼리 파라미터를 사용하여 구독할 수 있습니다.

```bash
# RSS 피드 구독
curl "https://openrouter.ai/api/v1/models?use_rss=true"

# 채팅 링크가 포함된 RSS 피드
curl "https://openrouter.ai/api/v1/models?use_rss=true&use_rss_chat_links=true"
```

---

## 모델 별칭 (Alias)

하드코딩된 모델 ID 대신 별칭을 사용하면 항상 최신 모델을 가리킵니다.

| Alias | 설명 |
| --- | --- |
| `~openai/gpt-latest` | 항상 최신 OpenAI 플래그십 모델 |
| `~anthropic/claude-sonnet-latest` | 항상 최신 Claude Sonnet |
| `openrouter/auto` | Auto Router (NotDiamond 구동) |

---

## 모델 변형 접미사

모델 ID에 접미사를 붙여 특별한 라우팅 동작을 활성화할 수 있습니다.

| 접미사 | 설명 |
| --- | --- |
| `:nitro` | 처리량 기준 정렬 (throughput 우선) |
| `:floor` | 가격 기준 정렬 (price 우선) |
| `:online` | 웹 검색 플러그인 활성화 |
| `:free` | 무료 모델 변형 사용 |

---

## 웹에서 모델 탐색

- 모델 목록: https://openrouter.ai/models
- 툴 콜링 지원 모델: https://openrouter.ai/models?supported_parameters=tools
- 구조화된 출력 지원 모델: https://openrouter.ai/models?supported_parameters=response_format

---

## 관련 문서

- [API 레퍼런스](./02-api-reference.md)
- [모델 라우팅](./07-model-routing.md)
- [Provider Selection](./08-provider-selection.md)
- [List available models (공식)](https://openrouter.ai/docs/api-reference/list-available-models)
- [List endpoints for a model (공식)](https://openrouter.ai/docs/api-reference/list-endpoints-for-a-model)
