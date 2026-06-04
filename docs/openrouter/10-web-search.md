# OpenRouter 웹 검색 가이드

> 원문: https://openrouter.ai/docs/guides/features/web-search

OpenRouter의 웹 검색 플러그인을 사용하면 **모든 모델**에 대해 관련 웹 검색 결과를 통합할 수 있습니다. `web` 플러그인을 활성화하거나 모델 슬러그에 `:online`을 추가하기만 하면 됩니다.

---

## 활성화 방법

### 방법 1: :online 접미사

```json
{
  "model": "openai/gpt-5.2:online",
  "messages": [
    { "role": "user", "content": "What are the latest AI news?" }
  ]
}
```

`:online`은 `web` 플러그인 사용의 단축키입니다. `:free` 모델 변형과도 결합할 수 있습니다 (예: `model:free:online`).

### 방법 2: web 플러그인

```json
{
  "model": "openai/gpt-5.2",
  "messages": [
    { "role": "user", "content": "What are the latest AI news?" }
  ],
  "plugins": [
    { "id": "web" }
  ]
}
```

**참고**: 무료 모델에서도 웹 검색 사용 시 추가 비용이 발생합니다.

---

## 검색 엔진

웹 검색 플러그인은 다음 엔진 옵션을 지원합니다:

| 엔진 | 설명 |
| --- | --- |
| `native` | 항상 모델 프로바이더의 내장 웹 검색 기능 사용 |
| `exa` | Exa의 검색 API를 사용하여 웹 결과 획득 |
| 미지정 (기본값) | 지원 프로바이더는 네이티브 검색 사용, 그 외는 Exa 폴백 |

### 네이티브 검색 지원 프로바이더

- **OpenAI** 모델
- **Anthropic** 모델
- **Perplexity** 모델
- **xAI** 모델 (Web Search + X Search 모두 활성화)

### 엔진 강제 선택

```json
// Exa 검색 강제 (네이티브 지원 모델도)
{ "plugins": [{ "id": "web", "engine": "exa" }] }

// 네이티브 검색 강제
{ "plugins": [{ "id": "web", "engine": "native" }] }
```

---

## 웹 검색 결과 파싱

모든 모델(Perplexity, OpenAI Online 등 네이티브 전용 모델 포함)의 웹 검색 결과는 OpenRouter에 의해 표준화되어 OpenAI Chat Completion Message 타입의 동일한 주석 스키마를 따릅니다.

---

## 웹 플러그인 커스터마이징

### 최대 결과 수 변경

```json
{
  "plugins": [
    { "id": "web", "max_results": 3 }
  ]
}
```

기본값은 5개 결과입니다.

### 검색 프롬프트 커스터마이징

웹 플러그인이 메시지 스트림에 결과를 첨부할 때 사용하는 프롬프트를 커스터마이징할 수 있습니다. 기본적으로 현재 날짜를 사용하는 기본 프롬프트가 적용됩니다.

---

## 검색 컨텍스트 크기 (네이티브 검색)

일부 모델은 내장 웹 검색 기능이 있습니다. 이 모델들은 검색 컨텍스트 크기에 따라 요금이 부과됩니다:

| 크기 | 설명 |
| --- | --- |
| **low** | 최소 검색 컨텍스트, 기본 쿼리에 적합 |
| **medium** | 중간 검색 컨텍스트, 일반 쿼리에 적합 |
| **high** | 광범위한 검색 컨텍스트, 상세 연구에 적합 |

### 검색 컨텍스트 크기 지정

`web_search_options` 파라미터로 검색 컨텍스트 크기를 지정할 수 있습니다:

```json
{
  "model": "openai/gpt-5.2",
  "messages": ["..."],
  "plugins": [{ "id": "web" }],
  "web_search_options": {
    "search_context_size": "medium"
  }
}
```

---

## 가격

### Exa 검색 가격

Exa 검색 사용 시 OpenRouter 크레딧으로 청구됩니다: **$4 / 1000 결과**

- 기본 `max_results`: 5
- 요청당 최대 비용: $0.02 (5개 결과 기준)
- LLM 사용료는 별도

### 네이티브 검색 가격

네이티브 검색은 프로바이더의 가격이 그대로 적용됩니다. 각 프로바이더의 문서를 참조하세요.

**참고**: `"engine": "exa"`를 명시적으로 지정하면 네이티브 검색 대신 Exa 가격이 적용됩니다.

---

## 서버 툴 방식 (권장)

Web Search 플러그인은 deprecated되었으며, 대신 `openrouter:web_search` 서버 툴 사용이 권장됩니다. 서버 툴은 모델이 필요에 따라 웹 검색을 0~N번 호출할 수 있는 반면, 플러그인은 항상 한 번 실행됩니다.

---

## 관련 문서

- [플러그인](./09-plugins.md)
- [모델 라우팅](./07-model-routing.md)
- [API 레퍼런스](./02-api-reference.md)
