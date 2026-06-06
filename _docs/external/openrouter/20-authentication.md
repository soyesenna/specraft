# OpenRouter 인증 (Authentication) 가이드

> 원문: https://openrouter.ai/docs/api/reference/authentication
> https://openrouter.ai/docs/api-keys
> https://openrouter.ai/docs/guides/overview/auth/management-api-keys
> https://openrouter.ai/docs/guides/overview/auth/oauth
> https://openrouter.ai/docs/guides/overview/auth/byok

OpenRouter API는 Bearer 토큰 기반 인증을 사용합니다. API 키를 통해 모델 사용 비용을 관리하고, 앱에 크레딧 한도를 설정할 수 있으며, OAuth 흐름에서도 활용할 수 있습니다.

OpenRouter의 API 키는 일반 모델 API 키보다 더 강력합니다. 사용자가 앱의 크레딧 한도를 설정할 수 있고, OAuth 흐름에 사용할 수 있습니다.

---

## 1. API 키 인증

### API 키 생성

API 키를 사용하려면 먼저 [OpenRouter 키 설정 페이지](https://openrouter.ai/settings/keys)에서 키를 생성합니다. 키에 이름을 지정하고, 선택적으로 크레딧 한도(credit limit)를 설정할 수 있습니다.

### Bearer 토큰 인증

OpenRouter API를 직접 호출할 때는 `Authorization` 헤더에 Bearer 토큰으로 API 키를 설정합니다.

| 헤더 | 필수 여부 | 설명 |
| --- | --- | --- |
| `Authorization` | **필수** | `Bearer <YOUR_API_KEY>` 형식 |
| `HTTP-Referer` | 선택 | 앱의 사이트 URL. OpenRouter 리더보드 랭킹에 사용 |
| `X-OpenRouter-Title` | 선택 | 앱의 사이트 제목. OpenRouter 리더보드 랭킹에 사용 (`X-Title`도 허용) |
| `Content-Type` | **필수** | `application/json` |

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "HTTP-Referer: https://your-app.com" \
  -H "X-OpenRouter-Title: Your App Name" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### OpenAI SDK에서 사용

OpenAI SDK를 OpenRouter로 포인팅하여 드롭인 대체로 사용할 수 있습니다. 기존 OpenAI SDK 기반 코드를 그대로 유지하면서 OpenRouter의 모델 카탈로그에 접근할 수 있습니다.

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: '<YOUR_API_KEY>',
  defaultHeaders: {
    'HTTP-Referer': '<YOUR_SITE_URL>',    // Optional. 랭킹용.
    'X-OpenRouter-Title': '<YOUR_APP_TITLE>', // Optional. 랭킹용.
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: 'openai/gpt-5.2',
    messages: [
      { role: 'user', content: 'What is the meaning of life?' },
    ],
  });

  console.log(completion.choices[0].message);
}

main();
```

### @openrouter/sdk에서 사용

OpenRouter 전용 Client SDK를 사용하면 완전한 타입 안전성과 제로 보일러플레이트로 API를 호출할 수 있습니다.

```bash
npm install @openrouter/sdk
```

```typescript
import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
  apiKey: '<YOUR_API_KEY>',
  defaultHeaders: {
    'HTTP-Referer': '<YOUR_SITE_URL>',      // Optional. 랭킹용.
    'X-OpenRouter-Title': '<YOUR_APP_TITLE>', // Optional. 랭킹용.
  },
});

const completion = await openRouter.chat.send({
  model: 'openai/gpt-5.2',
  messages: [{ role: 'user', content: 'Say this is a test' }],
  stream: false,
});

console.log(completion.choices[0].message);
```

---

## 2. 키 보안

### 환경 변수 사용

API 키를 코드에 하드코딩하지 말고 항상 환경 변수를 통해 관리하세요.

```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
```

```python
import os
api_key = os.environ.get("OPENROUTER_API_KEY")
```

```typescript
const apiKey = process.env.OPENROUTER_API_KEY;
```

### GitHub Secret Scanning 파트너십

OpenRouter는 **GitHub Secret Scanning 파트너**입니다. 공개 리포지토리에 API 키가 커밋되면 GitHub가 이를 감지합니다. 또한 OpenRouter 자체적으로도 노출된 키를 탐지하는 추가 방법을 운영합니다.

키가 노출된 것으로 판단되면 이메일 알림을 받게 됩니다.

### 키 노출 시 대응

키 노출이 의심되는 경우 즉시 다음 조치를 취하세요:

1. [키 설정 페이지](https://openrouter.ai/settings/keys)에서 노출된 키 삭제
2. 새로운 키 생성
3. 환경 변수 및 서비스 설정에 새 키 적용

> **중요**: API 키를 보호하고 절대 공개 리포지토리에 커밋하지 마세요. 환경 변수를 사용하고 키를 코드베이스 밖에 유지하는 것을 강력히 권장합니다.

---

## 3. Management API Keys (프로그래밍 방식 키 관리)

OpenRouter는 API 키를 프로그래밍 방식으로 관리할 수 있는 엔드포인트를 제공합니다. 이를 통해 키 생성, 조회, 수정, 삭제를 자동화할 수 있습니다.

### 매니지먼트 키 생성

키 관리 API를 사용하려면 먼저 **Management API Key**를 생성해야 합니다:

1. [Management Keys 설정 페이지](https://openrouter.ai/settings/management-keys)로 이동
2. "Create New Key" 클릭
3. 키 생성 프로세스 완료

> **중요**: 매니지먼트 키는 OpenRouter의 완성(completions) 엔드포인트 호출에 사용할 수 **없습니다**. 오직 키 관리 작업만을 위한 전용 키입니다.

### 주요 활용 사례

| 사례 | 설명 |
| --- | --- |
| **SaaS 애플리케이션** | 각 고객 인스턴스마다 고유한 API 키 자동 생성 |
| **키 순환** | 보안 규정 준수를 위해 정기적으로 API 키 교체 |
| **사용량 모니터링** | 키별 사용량 추적 및 한도 초과 시 자동 비활성화 |

### 엔드포인트 개요

모든 키 관리 엔드포인트는 `/api/v1/keys` 하위에 있으며, Authorization 헤더에 매니지먼트 키가 필요합니다.

| 작업 | 메서드 | 엔드포인트 | 설명 |
| --- | --- | --- | --- |
| 키 목록 조회 | `GET` | `/api/v1/keys` | 계정의 모든 API 키 목록 반환 |
| 키 생성 | `POST` | `/api/v1/keys` | 새 API 키 생성 |
| 특정 키 조회 | `GET` | `/api/v1/keys/:hash` | 특정 키의 상세 정보 반환 |
| 키 수정 | `PATCH` | `/api/v1/keys/:hash` | 기존 키의 속성 수정 |
| 키 삭제 | `DELETE` | `/api/v1/keys/:hash` | 키 삭제 |

---

### 키 목록 조회 (List)

```bash
curl https://openrouter.ai/api/v1/keys \
  -H "Authorization: Bearer <MANAGEMENT_API_KEY>"
```

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `offset` | `number` | 선택 | 페이지네이션 오프셋 |
| `include_disabled` | `boolean` | 선택 | 비활성화된 키 포함 여부 |

**응답 예제:**

```json
{
  "data": [
    {
      "name": "Customer Key",
      "label": "sk-or-v1-customkey",
      "limit": 10,
      "limit_reset": "monthly",
      "disabled": false,
      "created_at": "2025-02-19T20:52:27.363244+00:00",
      "updated_at": "2025-02-19T21:24:11.708154+00:00",
      "expires_at": null,
      "hash": "<YOUR_KEY_HASH>",
      "usage": 0
    }
  ]
}
```

---

### 키 생성 (Create)

```python
import requests

response = requests.post(
    "https://openrouter.ai/api/v1/keys",
    headers={
        "Authorization": "Bearer <MANAGEMENT_API_KEY>",
        "Content-Type": "application/json",
    },
    json={
        "name": "Customer Instance Key",       # 필수: 키의 표시 이름
        "limit": 1000,                         # 선택: 크레딧 한도
        "limit_reset": "monthly",              # 선택: 한도 초기화 주기
        "expires_at": "2026-12-31T23:59:59Z",  # 선택: 키 만료 시간 (ISO 8601 UTC)
        "include_byok_in_limit": False,        # 선택: BYOK 사용량을 한도에 포함할지 여부
    },
)

print(response.json())
```

**요청 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `name` | `string` | **필수** | API 키의 표시 이름 |
| `limit` | `number` | 선택 | 크레딧 한도 (미설정 시 무제한) |
| `limit_reset` | `string \| null` | 선택 | 한도 초기화 주기. `"daily"` / `"weekly"` / `"monthly"` / `null`. `null`이면 자동 리셋 없음 |
| `expires_at` | `string \| null` | 선택 | 키 만료 시간 (ISO 8601 UTC 타임스탬프). `null`이면 만료 없음 |
| `include_byok_in_limit` | `boolean` | 선택 | BYOK 사용량을 크레딧 한도에 포함할지 여부 |
| `creator_user_id` | `string` | 선택 | 키 생성자의 사용자 ID (워크스페이스 컨텍스트) |
| `workspace_id` | `string` | 선택 | 키를 할당할 워크스페이스 ID |

> **참고**: `label`은 요청 파라미터가 아닌 응답 전용 필드입니다. 키의 표시 이름은 `name` 파라미터로 설정합니다.

**`limit_reset` 상세 스펙:**

| 값 | 리셋 시점 | 설명 |
| --- | --- | --- |
| `"daily"` | 매일 UTC 자정 | 매일 00:00 UTC에 사용량 초기화 |
| `"weekly"` | 매주 월요일 UTC 자정 | 월요일~일요일 주기로 사용량 초기화 |
| `"monthly"` | 매월 1일 UTC 자정 | 매월 1일 00:00 UTC에 사용량 초기화 |
| `null` | 리셋 없음 | 한도에 도달하면 수동으로 업데이트할 때까지 비활성화 |

**응답 예제:**

```json
{
  "data": {
    "name": "Customer Instance Key",
    "label": "sk-or-v1-...",
    "limit": 1000,
    "limit_reset": "monthly",
    "disabled": false,
    "created_at": "2025-02-19T20:52:27.363244+00:00",
    "updated_at": "2025-02-19T20:52:27.363244+00:00",
    "expires_at": "2026-12-31T23:59:59Z",
    "hash": "<KEY_HASH>"
  },
  "key": "sk-or-v1-..."  // 실제 키 문자열 (생성 시에만 반환됨)
}
```

> **참고**: `key` 필드는 키 생성 시에만 응답에 포함됩니다. 이후에는 키의 `hash`로만 참조할 수 있습니다.

---

### 특정 키 조회 (Get)

```bash
curl https://openrouter.ai/api/v1/keys/<KEY_HASH> \
  -H "Authorization: Bearer <MANAGEMENT_API_KEY>"
```

**경로 파라미터:**

| 파라미터 | 타입 | 설명 |
| --- | --- | --- |
| `hash` | `string` | 조회할 API 키의 해시 |

**응답 데이터 필드:**

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `name` | `string` | 키의 표시 이름 |
| `label` | `string` | 키 라벨 (응답 전용, 읽기 전용) |
| `limit` | `number` | 크레딧 한도 |
| `limit_reset` | `string \| null` | 한도 초기화 주기 (`"daily"` / `"weekly"` / `"monthly"` / `null`) |
| `disabled` | `boolean` | 비활성화 여부 |
| `created_at` | `string` | 생성 일시 (ISO 8601) |
| `updated_at` | `string` | 수정 일시 (ISO 8601) |
| `expires_at` | `string \| null` | 키 만료 시간 (ISO 8601 UTC). `null`이면 만료 없음 |
| `hash` | `string` | 키의 해시 값 |

---

### 키 수정 (Update)

```python
import requests

key_hash = "<YOUR_KEY_HASH>"

response = requests.patch(
    f"https://openrouter.ai/api/v1/keys/{key_hash}",
    headers={
        "Authorization": "Bearer <MANAGEMENT_API_KEY>",
        "Content-Type": "application/json",
    },
    json={
        "name": "Updated Key Name",
        "disabled": True,               # 키 비활성화
        "limit": 5000,                  # 새 크레딧 한도
        "limit_reset": "weekly",        # 한도 초기화 주기 변경
        "expires_at": "2027-06-30T23:59:59Z",  # 만료 시간 업데이트
        "include_byok_in_limit": False,  # BYOK 사용량을 한도에 포함하지 않음
    },
)

print(response.json())
```

**요청 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `name` | `string` | 선택 | 새 표시 이름 |
| `disabled` | `boolean` | 선택 | 키 비활성화 여부 |
| `limit` | `number` | 선택 | 새 크레딧 한도 |
| `limit_reset` | `string \| null` | 선택 | 한도 초기화 주기 (`"daily"` / `"weekly"` / `"monthly"` / `null`) |
| `expires_at` | `string \| null` | 선택 | 키 만료 시간 (ISO 8601 UTC). `null`로 설정하면 만료 제거 |
| `include_byok_in_limit` | `boolean` | 선택 | BYOK 사용량을 한도에 포함할지 여부 |

---

### 키 삭제 (Delete)

```bash
curl -X DELETE https://openrouter.ai/api/v1/keys/<KEY_HASH> \
  -H "Authorization: Bearer <MANAGEMENT_API_KEY>"
```

**응답 예제:**

```json
{
  "data": {
    "success": true
  }
}
```

---

### 크레딧 한도 및 사용량 관리

`GET /api/v1/key` 엔드포인트로 API 키의 크레딧 잔액과 사용량을 조회할 수 있습니다.

```bash
curl https://openrouter.ai/api/v1/key \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

**응답 필드:**

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `label` | `string` | API 키의 표시 이름 (응답 전용, 읽기 전용) |
| `limit` | `number \| null` | 사용 한도. `null`이면 무제한 |
| `limit_reset` | `string \| null` | 한도 초기화 주기 (`"daily"` / `"weekly"` / `"monthly"` / `null`). `null`이면 자동 리셋 없음 |
| `limit_remaining` | `number \| null` | 남은 크레딧 |
| `usage` | `number` | 전체 기간 사용량 |
| `usage_daily` | `number` | 당일 사용량 (UTC 기준, 매일 자정 리셋) |
| `usage_weekly` | `number` | 당주 사용량 (UTC 기준, 월요일~일요일 주기) |
| `usage_monthly` | `number` | 당월 사용량 (UTC 기준, 매월 1일 리셋) |
| `is_free_tier` | `boolean` | 크레딧 구매 이력이 없으면 `true` |
| `is_provisioning_key` | `boolean` | 매니지먼트 키 여부 (이전 명칭: 프로비저닝 키) |
| `include_byok_in_limit` | `boolean` | BYOK 사용량을 한도에 포함할지 여부 |

---

## 4. BYOK (Bring Your Own Key)

OpenRouter는 자체 인프라 대신 사용자가 소유한 클라우드 프로바이더 API 키나 자격 증명을 사용하여 모델에 접근할 수 있는 BYOK(Bring Your Own Key) 기능을 지원합니다. 이를 통해 기존 프로바이더 계약을 활용하면서도 OpenRouter의 통합 인터페이스를 사용할 수 있습니다.

> 원문: https://openrouter.ai/docs/guides/overview/auth/byok

### 키 우선순위 (Prioritized / Fallback)

BYOK 키는 **우선순위(Prioritized)** 또는 **폴백(Fallback)** 모드로 설정할 수 있습니다:

- **우선순위(Prioritized)**: BYOK 키를 먼저 사용하며, 실패 시 OpenRouter의 기본 라우팅으로 폴백
- **폴백(Fallback)**: OpenRouter의 기본 라우팅을 먼저 시도하며, 실패 시 BYOK 키를 사용

### 프로바이더 순서와의 결합

BYOK 설정은 모델의 프로바이더 순서(`provider.order`)와 결합됩니다. 특정 프로바이더에 BYOK 키를 매핑하면 해당 프로바이더가 우선 순위에 따라 호출됩니다.

### 다중 BYOK 키

여러 개의 BYOK 키를 등록할 수 있습니다. 각 키는 서로 다른 프로바이더나 모델에 매핑될 수 있으며, 사용 사례에 맞게 조합할 수 있습니다.

### 키 필터

BYOK 키에 필터를 적용하여 특정 조건에서만 활성화할 수 있습니다:

| 필터 | 설명 |
| --- | --- |
| **모델 필터** | 특정 모델에만 BYOK 키 적용 |
| **API 키 필터** | 특정 API 키로 호출 시에만 BYOK 키 사용 |
| **멤버 필터** | 워크스페이스 내 특정 멤버의 요청에만 BYOK 키 적용 |

### 프로바이더별 BYOK 구성

#### Azure AI Foundry / Per-Deployment 구성

Azure AI Foundry의 경우 개별 배포(deployment) 단위로 BYOK 키를 구성할 수 있습니다. Azure의 엔드포인트 URL과 API 키를 OpenRouter에 등록하여 사용합니다.

#### AWS Bedrock API Keys / Credentials

AWS Bedrock을 BYOK로 사용하려면 AWS 액세스 키와 시크릿 키를 등록해야 합니다. OpenRouter가 사용자를 대신해 Bedrock API를 호출합니다.

#### Google Vertex AI 서비스 계정 키

Google Vertex AI의 경우 서비스 계정(Service Account) JSON 키를 등록하여 BYOK를 구성합니다. 프로젝트 ID와 리전 정보도 함께 제공해야 합니다.

---

## 5. OAuth PKCE (사용자 인증)

사용자가 **원클릭으로 OpenRouter에 연결**할 수 있도록 Proof Key for Code Exchange(PKCE) 인증 흐름을 지원합니다. 이 방식을 사용하면 사용자의 브라우저를 통해 인증하고, 사용자 제어 API 키를 발급받을 수 있습니다.

> 원문: https://openrouter.ai/docs/guides/overview/auth/oauth

### 인증 흐름 개요

```
사용자 브라우저 → OpenRouter 인증 페이지 → 콜백 URL (code 포함) → API 키 교환 요청 → API 키 획득
```

### Step 1: 사용자를 OpenRouter로 리다이렉트

사용자를 아래 URL로 리다이렉트합니다:

```
https://openrouter.ai/auth?callback_url=YOUR_SITE_URL
```

**파라미터:**

| 파라미터 | 필수 | 설명 |
| --- | --- | --- |
| `callback_url` | **필수** | 인증 완료 후 리다이렉트할 사이트 URL |
| `code_challenge` | 선택 | 최대 256자리의 임의 비밀번호 (보안 강화) |
| `code_challenge_method` | 선택 | `plain` 또는 `S256` (권장) |

**예시 URL:**

| 방식 | URL |
| --- | --- |
| 기본 (code challenge 없음) | `https://openrouter.ai/auth?callback_url=https://your-app.com/callback` |
| Plain code challenge | `https://openrouter.ai/auth?callback_url=https://your-app.com/callback&code_challenge=5f6525...&code_challenge_method=plain` |
| S256 code challenge (**권장**) | `https://openrouter.ai/auth?callback_url=https://your-app.com/callback&code_challenge=17T2L7...&code_challenge_method=S256` |

> **localhost 앱**: 로컬 우선 앱의 경우 `http://localhost:3000`을 콜백 및 리퍼러 URL로 사용하여 테스트할 수 있습니다. 프로덕션 환경에서는 공개 GitHub 리포지토리 또는 프로젝트 웹사이트 URL로 교체하세요.

### Step 2: 코드를 API 키로 교환

사용자가 로그인하면 콜백 URL에 `code` 쿼리 파라미터가 포함되어 리다이렉트됩니다. 이 코드를 API 키로 교환합니다.

```javascript
// URL에서 code 파라미터 추출
// 예: ?code=abc123...

fetch("https://openrouter.ai/api/v1/auth/keys", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    code: "<CODE_FROM_QUERY_PARAM>",
    code_verifier: "<CODE_VERIFIER>",          // Step 1에서 code_challenge를 보낸 경우에만 필요
    code_challenge_method: "<CODE_CHALLENGE_METHOD>", // Step 1에서 보낸 경우에만 필요
  }),
});
```

### Step 3: API 키 사용

응답의 `key` 필드에 새 API 키가 포함됩니다. 이 키를 안전하게 저장하고 OpenAI 호환 요청에 사용합니다.

```javascript
fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer <OPENROUTER_API_KEY>",
    "HTTP-Referer": "<YOUR_SITE_URL>",    // Optional. 랭킹용.
    "X-Title": "<YOUR_SITE_NAME>",        // Optional. 랭킹용.
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    "model": "openai/gpt-4o",
    "messages": [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user", "content": "Hello!" },
    ],
  }),
});
```

### S256 code_challenge 생성 (JavaScript)

```javascript
import crypto from 'crypto';

export async function sha256CodeChallenge(input: string) {
  return crypto.createHash('sha256').update(input).digest('base64url');
}

// 사용 예시
const code_verifier = crypto.randomBytes(32).toString('hex');
const code_challenge = await sha256CodeChallenge(code_verifier);

// Step 1: code_challenge와 code_challenge_method=S256으로 리다이렉트
// Step 2: code_verifier를 교환 요청에 포함
```

### OAuth PKCE 에러 코드

| 에러 코드 | 설명 | 해결 방법 |
| --- | --- | --- |
| `400 Invalid code_challenge_method` | Step 1과 Step 2의 code challenge 메서드가 다름 | 동일한 메서드 사용 |
| `403 Invalid code or code_verifier` | code가 유효하지 않거나 code_verifier 불일치 | 사용자가 로그인했는지 확인, code_verifier/code_challenge_method 확인 |
| `405 Method Not Allowed` | POST와 HTTPS를 사용하지 않음 | POST 메서드 및 HTTPS 사용 |

---

## 6. API 키 정보 조회 (현재 키)

`GET /api/v1/key` 엔드포인트로 현재 사용 중인 API 키의 정보를 조회할 수 있습니다.

### Python (requests)

```python
import requests

url = "https://openrouter.ai/api/v1/key"
headers = {"Authorization": "Bearer <YOUR_API_KEY>"}
response = requests.get(url, headers=headers)
print(response.json())
```

### @openrouter/sdk

```typescript
import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
  apiKey: '<YOUR_API_KEY>',
});

const keyInfo = await openRouter.apiKeys.getCurrent();
console.log(keyInfo);
```

### 응답 타입 (TypeScript)

```typescript
type Key = {
  data: {
    label: string;               // API 키 라벨 (응답 전용, 읽기 전용)
    limit: number | null;        // 사용 한도 (null이면 무제한)
    limit_reset: string | null;  // 한도 초기화 주기 ("daily" | "weekly" | "monthly" | null)
    limit_remaining: number | null; // 남은 한도 (null이면 무제한)
    include_byok_in_limit: boolean; // BYOK 사용량을 한도에 포함할지 여부

    usage: number;               // 총 사용량 (전체 기간)
    usage_daily: number;         // 일일 사용량 (UTC 자정 리셋)
    usage_weekly: number;        // 주간 사용량 (UTC 기준, 월요일~일요일)
    usage_monthly: number;       // 월간 사용량 (UTC 기준, 매월 1일 리셋)

    // BYOK (Bring Your Own Key) 사용량
    byok_usage: number;
    byok_usage_daily: number;
    byok_usage_weekly: number;
    byok_usage_monthly: number;

    is_free_tier: boolean;       // 크레딧을 구매한 적이 없는지 여부
    is_provisioning_key: boolean; // 매니지먼트 키 여부 (이전 명칭: 프로비저닝 키)
  };
};
```

---

## 7. 인증 방법 비교

| 방법 | 대상 | 주요 용도 | 키 타입 |
| --- | --- | --- | --- |
| **Bearer 토큰** | 서버/백엔드 | API 호출 인증 | 일반 API 키 |
| **OpenAI SDK** | 기존 코드 마이그레이션 | baseURL 변경만으로 OpenRouter 사용 | 일반 API 키 |
| **@openrouter/sdk** | TypeScript 프로젝트 | 타입 안전한 API 호출 | 일반 API 키 |
| **Management API** | SaaS/플랫폼 | 프로그래밍 방식 키 관리 (CRUD) | 매니지먼트 API 키 |
| **BYOK** | 엔터프라이즈/기존 계약 | 자체 프로바이더 키로 모델 접근 | 프로바이더 API 키/자격 증명 |
| **OAuth PKCE** | 사용자 대면 앱 | 최종 사용자 인증 및 키 발급 | 사용자 제어 API 키 |

---

## 관련 문서

- [Quickstart 가이드](./01-quickstart.md)
- [API 레퍼런스](./02-api-reference.md)
- [속도 제한 (Rate Limits)](./14-rate-limits.md)
- [개인정보 및 데이터 처리](./15-privacy.md)
