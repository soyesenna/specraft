# OpenRouter Presets 가이드

> 원문: https://openrouter.ai/docs/guides/features/presets

Presets를 사용하면 LLM 설정을 코드에서 분리할 수 있습니다. OpenRouter 웹 애플리케이션에서 프로바이더 라우팅, 모델 선택, 시스템 프롬프트 및 기타 파라미터를 관리한 후 API 요청에서 참조할 수 있습니다.

---

## Presets란?

Preset은 특정 사용 사례에 필요한 모든 설정을 캡슐화하는 명명된 구성입니다.

### 사용 예

- "email-copywriter" 프리셋: 마케팅 카피 생성
- "inbound-classifier" 프리셋: 고객 문의 분류
- "code-reviewer" 프리셋: PR 분석

### 각 프리셋에서 관리 가능한 항목

- 프로바이더 라우팅 설정 (가격, 지연 시간 등 기준 정렬)
- 모델 선택 (특정 모델 또는 폴백 배열)
- 시스템 프롬프트
- 생성 파라미터 (temperature, top_p 등)
- 프로바이더 포함/제외 규칙

---

## 빠른 시작

1. OpenRouter 대시보드에서 프리셋 생성 (모델 선택, 프로바이더 라우팅 제한 등)
2. API 요청에서 프리셋 참조:

```json
{
  "model": "@preset/ravenel-bridge",
  "messages": [
    {
      "role": "user",
      "content": "What's your opinion of the Golden Gate Bridge?"
    }
  ]
}
```

---

## 프리셋 사용 방법 3가지

### 1. Direct Model Reference

`@preset/preset-slug`를 모델처럼 사용:

```json
{
  "model": "@preset/email-copywriter",
  "messages": [
    {
      "role": "user",
      "content": "Write a marketing email about our new feature"
    }
  ]
}
```

### 2. Preset Field

```json
{
  "model": "openai/gpt-4",
  "preset": "email-copywriter",
  "messages": [
    {
      "role": "user",
      "content": "Write a marketing email about our new feature"
    }
  ]
}
```

### 3. Combined Model and Preset

```json
{
  "model": "openai/gpt-4@preset/email-copywriter",
  "messages": [
    {
      "role": "user",
      "content": "Write a marketing email about our new feature"
    }
  ]
}
```

---

## API 요청에서 프리셋 생성

대시보드 외에도, 기존 추론 요청 본문에서 직접 프리셋을 생성(또는 업데이트)할 수 있습니다. 이는 작동하는 요청을 재사용 가능한 구성으로 캡처할 때 유용합니다.

### 엔드포인트

| 스킨 | 엔드포인트 |
| --- | --- |
| Chat Completions | `POST /api/v1/presets/{slug}/chat/completions` |
| Anthropic Messages | `POST /api/v1/presets/{slug}/messages` |
| Responses | `POST /api/v1/presets/{slug}/responses` |

`{slug}`는 URL 안전 식별자입니다. 해당 슬러그의 프리셋이 이미 존재하면 새 버전이 생성되어 활성 버전으로 지정됩니다.

### Chat Completions에서 생성

```bash
curl https://openrouter.ai/api/v1/presets/email-copywriter/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o",
    "temperature": 0.7,
    "provider": { "sort": "price" },
    "messages": [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user", "content": "Write a marketing email." }
    ]
  }'
```

`messages` 배열은 프리셋 저장에 무시되며, 구성 필드(`model`, `temperature`, `provider`)와 추출된 시스템 프롬프트만 유지됩니다.

### Anthropic Messages에서 생성

```bash
curl https://openrouter.ai/api/v1/presets/code-reviewer/messages \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "anthropic/claude-4.6-sonnet",
    "max_tokens": 1024,
    "system": "You are a senior code reviewer.",
    "messages": [
      { "role": "user", "content": "Review this PR." }
    ]
  }'
```

최상위 `system` 필드가 프리셋의 시스템 프롬프트가 됩니다.

### Responses에서 생성

```bash
curl https://openrouter.ai/api/v1/presets/inbound-classifier/responses \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o",
    "instructions": "Classify the inbound message.",
    "input": "Hello, I need a refund."
  }'
```

`instructions` 필드가 프리셋의 시스템 프롬프트가 됩니다.

### 응답 형식

```json
{
  "data": {
    "id": "650e8400-e29b-41d4-a716-446655440001",
    "name": "email-copywriter",
    "slug": "email-copywriter",
    "status": "active",
    "designated_version_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2026-04-20T10:00:00Z",
    "updated_at": "2026-04-20T10:00:00Z",
    "designated_version": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "version": 1,
      "system_prompt": "You are a helpful assistant.",
      "config": {
        "model": "openai/gpt-4o",
        "temperature": 0.7,
        "provider": { "sort": "price" }
      },
      "created_at": "2026-04-20T10:00:00Z",
      "updated_at": "2026-04-20T10:00:00Z"
    }
  }
}
```

---

## 권장 워크플로우

1. `/chat/completions` (또는 `/messages`, `/responses`)에 대해 원하는 출력이 나올 때까지 요청을 빌드하고 테스트
2. 동일한 본문을 `/api/v1/presets/{slug}/...` 엔드포인트에 POST하여 구성 캡처
3. 프로덕션 코드에서 추론 호출을 `@preset/{slug}` 참조로 변경

이렇게 하면 코드에서 프롬프트와 파라미터를 반복하다가, 작동하는 구성을 수동 전사 없이 프리셋으로 승격시킬 수 있습니다.

---

## 이점

### 관심사 분리

애플리케이션 코드와 LLM 구성을 깔끔하게 분리할 수 있습니다. 코드가 더 의미론적이고 유지 관리하기 쉬워집니다.

### 빠른 반복

코드 변경 없이 LLM 설정을 업데이트할 수 있습니다:

- 새 모델 버전으로 전환
- 시스템 프롬프트 조정
- 파라미터 수정
- 프로바이더 설정 변경

---

## 참고사항

1. 조직 계정을 사용하는 경우, 모든 구성원이 조직 프리셋에 접근할 수 있습니다
2. 버전 기록이 유지되어 변경 사항을 추적하고 롤백할 수 있습니다. API를 통해 프리셋을 호출할 때는 항상 최신 버전이 사용됩니다
3. 요청에 파라미터를 제공하면 프리셋에 구성된 옵션과 얕은 병합(shallow merge)됩니다

---

## 관련 문서

- [API 레퍼런스](./02-api-reference.md)
- [Provider Selection](./08-provider-selection.md)
- [모델 라우팅](./07-model-routing.md)
