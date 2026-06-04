# OpenRouter Models API 가이드

> 원문: https://openrouter.ai/docs/models

OpenRouter는 300개 이상의 모델과 프로바이더를 제공합니다. Models API를 통해 사용 가능한 모델 목록을 조회하고, 다양한 기준으로 필터링할 수 있습니다.

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
        "modality": "text->text",
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
      "default_parameters": { "..." }
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

### supported_parameters

모델이 지원하는 API 파라미터로 필터링합니다.

```bash
# 툴 콜링을 지원하는 모델만 조회
curl "https://openrouter.ai/api/v1/models?supported_parameters=tools"

# 구조화된 출력을 지원하는 모델만 조회
curl "https://openrouter.ai/api/v1/models?supported_parameters=response_format"
```

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
| `name` | string | 모델 표시 이름 |
| `description` | string | 모델 설명 |
| `context_length` | number | 최대 컨텍스트 길이 (토큰) |
| `architecture` | object | 모달리티, 토크나이저, 인스트럭트 타입 |
| `pricing` | object | 토큰/요청/단위당 가격 정보 |
| `top_provider` | object | 최대 완성 토큰 수 등 프로바이더 정보 |
| `supported_parameters` | string[] | 지원하는 API 파라미터 목록 |
| `default_parameters` | object | 기본 파라미터 설정 |

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
