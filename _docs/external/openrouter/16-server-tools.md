# OpenRouter Server Tools 가이드

> 원문: https://openrouter.ai/docs/guides/features/server-tools
>
> **Beta**: Server Tools는 현재 베타 상태입니다. API와 동작이 변경될 수 있습니다.

Server Tools는 OpenRouter가 운영하는 특수 도구로, 요청 중 **모든 모델**이 호출할 수 있습니다. 모델이 서버 툴을 사용하기로 결정하면, OpenRouter가 서버 측에서 실행하고 결과를 모델에 반환합니다 — **클라이언트 측 구현이 필요하지 않습니다.**

---

## Server Tools vs Plugins vs User-Defined Tools

| 구분 | Server Tools | Plugins | User-Defined Tools |
| --- | --- | --- | --- |
| **실행 결정** | 모델이 결정 | 항상 실행 | 모델이 결정 |
| **실행 주체** | OpenRouter | OpenRouter | 사용자 애플리케이션 |
| **호출 빈도** | 요청당 0~N회 | 요청당 1회 | 요청당 0~N회 |
| **지정 방식** | `tools` 배열 | `plugins` 배열 | `tools` 배열 |
| **타입 접두사** | `openrouter:*` | N/A | `function` |

**Server Tools**: 모델이 요청 중 0회 이상 호출할 수 있는 툴. OpenRouter가 투명하게 실행을 처리합니다.

**Plugins**: 요청이나 응답을 주입/변형하여 기능을 추가(예: 응답 복구, PDF 파싱). 활성화 시 항상 한 번 실행됩니다.

**User-Defined Tools**: 표준 함수 콜링 툴. 모델이 호출을 제안하고, 사용자 애플리케이션이 실행합니다.

---

## 사용 가능한 Server Tools

| 툴 | 타입 | 설명 |
| --- | --- | --- |
| **Web Search** | `openrouter:web_search` | 웹에서 최신 정보 검색 |
| **Web Fetch** | `openrouter:web_fetch` | URL에서 콘텐츠 가져오기 |
| **Datetime** | `openrouter:datetime` | 현재 날짜와 시간 조회 |
| **Image Generation** | `openrouter:image_generation` | 텍스트 프롬프트로 이미지 생성 |

---

## 작동 방식

1. API 요청의 `tools` 배열에 하나 이상의 서버 툴을 포함합니다
2. 모델이 사용자 프롬프트를 기반으로 각 서버 툴을 호출할지 결정합니다
3. OpenRouter가 툴 콜을 가로채어 서버 측에서 실행하고, 결과를 모델에 반환합니다
4. 모델이 결과를 사용하여 응답을 작성합니다. 필요한 경우 툴을 다시 호출할 수도 있습니다

서버 툴은 사용자 정의 툴과 함께 사용할 수 있습니다 — 같은 요청에 두 가지를 모두 포함할 수 있습니다.

---

## Quick Start

서버 툴을 `tools` 배열에 `openrouter:` 타입 접두사를 사용하여 추가합니다:

```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <YOUR_API_KEY>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/gpt-5.2',
    messages: [
      {
        role: 'user',
        content: 'What are the latest developments in AI?',
      },
    ],
    tools: [
      { type: 'openrouter:web_search' },
      { type: 'openrouter:datetime' },
    ],
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

---

## User-Defined Tools와 결합

서버 툴과 사용자 정의 툴을 같은 요청에 사용할 수 있습니다:

```json
{
  "model": "openai/gpt-5.2",
  "messages": ["..."],
  "tools": [
    { "type": "openrouter:web_search", "parameters": { "max_results": 3 } },
    { "type": "openrouter:datetime" },
    {
      "type": "function",
      "function": {
        "name": "get_stock_price",
        "description": "Get the current stock price for a ticker symbol",
        "parameters": {
          "type": "object",
          "properties": {
            "ticker": { "type": "string" }
          },
          "required": ["ticker"]
        }
      }
    }
  ]
}
```

모델은 서버 툴과 사용자 정의 툴의 조합을 자유롭게 호출할 수 있습니다. OpenRouter가 서버 툴을 자동으로 실행하고, 사용자 정의 툴 콜은 애플리케이션이 평소처럼 처리합니다.

---

## Web Search (`openrouter:web_search`)

> 원문: https://openrouter.ai/docs/guides/features/server-tools/web-search

웹에서 실시간 정보를 검색합니다. Web Search **플러그인**(`{ "id": "web" }`)과 달리, 서버 툴은 모델이 필요에 따라 0~N번 검색을 수행할 수 있습니다.

### 작동 방식

1. `tools` 배열에 `{ "type": "openrouter:web_search" }`를 포함합니다.
2. 사용자 프롬프트를 기반으로 모델이 웹 검색 필요 여부를 판단하고 검색 쿼리를 생성합니다.
3. OpenRouter가 구성된 엔진을 사용해 검색을 실행합니다 (기본값: `auto` — 제공자 네이티브 검색이 가능하면 사용, 불가하면 Exa로 폴백).
4. 검색 결과(URL, 제목, 콘텐츠 스니펫)가 모델에 반환됩니다.
5. 모델이 결과를 종합하여 응답을 작성합니다. 단일 요청에서 여러 번 검색할 수도 있습니다.

### Quick Start

```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <YOUR_API_KEY>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/gpt-5.2',
    messages: [
      { role: 'user', content: 'What are the latest developments in AI?' }
    ],
    tools: [
      { type: 'openrouter:web_search' }
    ],
  }),
});
```

### 파라미터

| 파라미터 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `max_results` | number | — | 최대 검색 결과 수 |
| `engine` | string | `auto` | 검색 엔진 선택 (`auto`/`native`/`exa`/`firecrawl`/`parallel`) |
| `user_location` | object | — | 지리적 검색 편향을 위한 사용자 위치 정보 |
| `search_context_size` | string | — | 검색 컨텍스트 크기 (`low`/`medium`/`high`) |
| `allowed_domains` | string[] | — | 검색을 허용할 도메인 목록 |
| `excluded_domains` | string[] | — | 검색에서 제외할 도메인 목록 |
| `max_total_results` | number | — | 여러 검색 호출에 걸친 누적 결과 수 상한 |

### User Location

검색 결과에 지리적 편향을 주기 위해 사용자의 대략적인 위치를 전달합니다:

```json
{
  "type": "openrouter:web_search",
  "parameters": {
    "user_location": {
      "country": "US",
      "city": "San Francisco",
      "region": "California"
    }
  }
}
```

`user_location` 내의 모든 필드는 선택사항입니다.

### Engine Selection

웹 검색 서버 툴은 여러 검색 엔진을 지원합니다:

- **`auto`** (기본값): 제공자가 네이티브 검색을 지원하면 사용, 그렇지 않으면 Exa로 폴백
- **`native`**: 제공자의 내장 웹 검색을 강제 사용 (지원하지 않는 제공자는 Exa로 폴백하며 경고 발생)
- **`exa`**: Exa의 검색 API 사용. 키워드 및 임베딩 기반 검색을 결합합니다. 잘린 페이지 텍스트 대신 검색 쿼리에 가장 관련성 높은 페이지 발췌문인 **Exa 하이라이트**를 반환합니다. 자세한 내용은 아래 Exa 섹션을 참조하세요.
- **`firecrawl`**: Firecrawl의 검색 API 사용 (BYOK — 본인 키 사용)
- **`parallel`**: Parallel의 검색 API 사용

#### Engine Capabilities

| 기능 | Native | Exa | Firecrawl | Parallel |
| --- | --- | --- | --- | --- |
| 도메인 필터링 | 제한적 | 지원 | 지원 | 지원 |
| 컨텍스트 크기 제어 | — | 지원* | — | 지원** |
| BYOK | — | 지원 | 지원 | — |

_* Exa: 제한은 결과당 적용_

_** Parallel: 제한은 모든 결과에 걸쳐 총합으로 적용_

#### Exa 하이라이트

OpenRouter는 각 결과에 대해 Exa 하이라이트를 요청합니다. 하이라이트는 Exa가 검색 쿼리에 가장 관련성 높다고 판단하여 페이지에서 직접 추출한 발췌문으로, 잘린 페이지 텍스트보다 토큰당 더 높은 품질의 컨텍스트를 제공합니다.

기본적으로 Exa는 쿼리와 문서에 따라 적응형 하이라이트 크기를 선택합니다 — 일반적으로 결과당 약 2,000~4,000자입니다. 더 큰 고정 결과당 예산을 설정하려면 `search_context_size`를 사용합니다 (Exa의 `contents.highlights.maxCharacters` 파라미터에 매핑):

| 값 | 결과당 문자 수 |
| --- | --- |
| `low` | 5,000자 |
| `medium` | 15,000자 |
| `high` | 30,000자 |

`search_context_size`를 생략하면 OpenRouter가 Exa가 적응형으로 하이라이트 크기를 선택하도록 합니다. 선택된 발췌문은 각 결과에서 모델에 반환되며, API 호출자에게는 `url_citation` 어노테이션을 통해 제공됩니다. 단일 결과 내에서 페이지의 다른 부분에서 온 발췌문은 Exa의 `[...]` 마커로 구분됩니다.

#### Firecrawl (BYOK)

Firecrawl은 본인의 API 키를 사용합니다. 설정 방법:

1. OpenRouter 플러그인 설정에서 Firecrawl을 웹 검색 엔진으로 선택합니다.
2. Firecrawl 서비스 약관에 동의합니다 — 이메일과 연결된 Firecrawl 계정이 생성됩니다.
3. 계정은 **10,000 무료 크레딧**으로 시작합니다 (크레딧은 3개월 후 만료).

Firecrawl 검색은 Firecrawl 크레딧을 직접 사용하며, OpenRouter에서 추가 요금이 부과되지 않습니다. Firecrawl은 도메인 필터링(`allowed_domains` / `excluded_domains`)을 지원하지만, 두 필터는 상호 배타적이므로 같은 요청에 함께 사용할 수 없습니다.

#### Parallel

Parallel은 도메인 필터링과 컨텍스트 크기 제어(`search_context_size`)를 지원하며, OpenRouter 크레딧으로 요청당 $0.005의 비용이 청구됩니다. 요청당 최대 10개의 결과를 포함하며, 추가 결과당 $0.001이 부과됩니다.

### Domain Filtering

검색 결과에 표시될 도메인을 제한합니다:

```json
{
  "type": "openrouter:web_search",
  "parameters": {
    "allowed_domains": ["wikipedia.org", "github.com"]
  }
}
```

```json
{
  "type": "openrouter:web_search",
  "parameters": {
    "excluded_domains": ["pinterest.com", "facebook.com"]
  }
}
```

### Controlling Total Results

모델이 단일 요청에서 여러 번 검색할 때, `max_total_results`를 사용하여 누적 결과 수를 제한할 수 있습니다:

```json
{
  "type": "openrouter:web_search",
  "parameters": {
    "max_total_results": 15
  }
}
```

한도에 도달하면 후속 검색 호출은 검색을 수행하는 대신 모델에게 한도에 도달했음을 알리는 메시지를 반환합니다. 이는 에이전트 루프에서 비용과 컨텍스트 윈도우 사용량을 제어하는 데 유용합니다.

### Responses API와 함께 사용

웹 검색 서버 툴은 Responses API와도 함께 작동합니다:

```typescript
const response = await fetch('https://openrouter.ai/api/v1/responses', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <YOUR_API_KEY>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/gpt-5.2',
    input: 'Search for the latest AI news',
    tools: [
      { type: 'openrouter:web_search' }
    ],
  }),
});
```

### 사용량 추적

웹 검색 사용량은 응답의 `usage` 객체에서 확인할 수 있습니다:

```json
{
  "usage": {
    "input_tokens": 105,
    "output_tokens": 250,
    "server_tool_use": {
      "web_search_requests": 2
    }
  }
}
```

`web_search_requests` 필드는 요청 중 모델이 수행한 총 검색 쿼리 수를 계산합니다.

### Pricing

모든 가격은 검색 결과 콘텐츠를 처리하는 표준 LLM 토큰 비용에 추가로 청구됩니다.

| 엔진 | 가격 |
| --- | --- |
| Native (제공자 내장) | 제공자에 따라 다름 |
| Exa | API 크레딧으로 청구 |
| Firecrawl | 본인 Firecrawl 크레딧 사용 |
| Parallel | 요청당 $0.005 + 추가 결과당 $0.001 |

### Web Search Plugin에서 마이그레이션

플러그인(`{ "id": "web" }`)에서 서버 툴(`openrouter:web_search`)로 마이그레이션하는 주요 차이점:

| 구분 | Server Tool (`openrouter:web_search`) | Plugin (`{ "id": "web" }`) |
| --- | --- | --- |
| 호출 횟수 | 0~N회 (모델이 결정) | 항상 1회 |
| 컨트롤 | 모델이 필요시에만 검색 | 모든 요청에서 항상 검색 |
| 비용 효율성 | 검색이 필요 없으면 비용 발생 안함 | 모든 요청에서 검색 비용 발생 |

#### 마이그레이션 예시

**Before (Plugin):**

```json
{
  "model": "openai/gpt-5.2",
  "messages": [{ "role": "user", "content": "latest news" }],
  "plugins": [{ "id": "web" }]
}
```

**After (Server Tool):**

```json
{
  "model": "openai/gpt-5.2",
  "messages": [{ "role": "user", "content": "latest news" }],
  "tools": [{ "type": "openrouter:web_search" }]
}
```

> **권장**: Web Search 기능이 필요한 경우 플러그인(`{ "id": "web" }`) 대신 `openrouter:web_search` 서버 툴 사용을 권장합니다.

---

## Web Fetch (`openrouter:web_fetch`)

> 원문: https://openrouter.ai/docs/guides/features/server-tools/web-fetch

URL에서 콘텐츠를 가져옵니다. `openrouter:web_fetch` 서버 툴은 모든 모델에게 특정 URL의 콘텐츠를 가져오는 능력을 부여합니다. 모델이 웹 페이지나 PDF 문서를 읽어야 할 때 URL과 함께 툴을 호출하면, OpenRouter가 콘텐츠를 가져오고 추출하여 모델이 응답에 사용할 수 있는 텍스트를 반환합니다.

### 작동 방식

1. `tools` 배열에 `{ "type": "openrouter:web_fetch" }`를 포함합니다.
2. 사용자 프롬프트를 기반으로 모델이 URL을 가져올지 결정하고 요청을 생성합니다.
3. OpenRouter가 구성된 엔진을 사용해 URL을 가져옵니다 (기본값: `auto` — 네이티브 제공자 페치가 가능하면 사용, 불가하면 Exa로 폴백).
4. 페이지 콘텐츠(텍스트, 제목, URL)가 모델에 반환됩니다.
5. 모델이 가져온 콘텐츠를 응답에 반영합니다. 필요한 경우 단일 요청에서 여러 URL을 가져올 수 있습니다.

### Quick Start

```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <YOUR_API_KEY>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/gpt-5.2',
    messages: [
      { role: 'user', content: 'Summarize the content of https://example.com/article' }
    ],
    tools: [
      { type: 'openrouter:web_fetch' }
    ],
  }),
});
```

### Configuration

웹 페치 툴은 동작을 커스터마이징하기 위해 선택적 `parameters`를 받습니다:

```json
{
  "type": "openrouter:web_fetch",
  "parameters": {
    "engine": "auto",
    "max_content_tokens": 4000,
    "allowed_domains": ["wikipedia.org", "github.com"],
    "blocked_domains": ["pinterest.com"]
  }
}
```

### Engine Selection

웹 페치 서버 툴은 여러 페치 엔진을 지원합니다:

- **`auto`** (기본값): 제공자가 네이티브 페치를 지원하면 사용, 그렇지 않으면 Exa로 폴백
- **`native`**: 제공자의 내장 웹 페치를 강제 사용
- **`exa`**: Exa의 Contents API를 사용하여 페이지 콘텐츠 추출 (BYOK 지원)
- **`openrouter`**: 콘텐츠 추출이 포함된 직접 HTTP 페치 사용
- **`firecrawl`**: Firecrawl의 스크래프 API 사용 (BYOK — 본인 키 사용)

#### Engine Capabilities

| 기능 | Native | Exa | OpenRouter | Firecrawl |
| --- | --- | --- | --- | --- |
| 기본 텍스트 추출 | 지원 | 지원 | 지원 | 지원 |
| PDF 지원 | 제한적 | — | 지원 | 지원 |
| BYOK | — | 지원 | — | 지원 |

#### Firecrawl (BYOK)

Firecrawl은 본인의 API 키를 사용합니다. 설정 방법:

1. OpenRouter 플러그인 설정에서 Firecrawl API 키를 구성합니다.
2. Firecrawl 계정은 OpenRouter와 별도로 청구됩니다.

### Hard Limits

비용 통제를 위한 하드 리미트:

| 엔진 | 요청당 페치 한도 |
| --- | --- |
| Exa | 하드 리미트 없음 (API 크레딧으로 청구) |
| Firecrawl | 하드 리미트 없음 (Firecrawl 크레딧 사용) |
| OpenRouter / Native | **요청당 50회** |

### Domain Filtering

`allowed_domains`와 `blocked_domains`를 사용하여 가져올 수 있는 도메인을 제한합니다:

```json
{
  "type": "openrouter:web_fetch",
  "parameters": {
    "allowed_domains": ["wikipedia.org", "docs.python.org"]
  }
}
```

```json
{
  "type": "openrouter:web_fetch",
  "parameters": {
    "blocked_domains": ["pinterest.com", "facebook.com"]
  }
}
```

`allowed_domains`가 설정되면 해당 도메인의 URL만 가져옵니다. `blocked_domains`가 설정되면 해당 도메인의 URL이 거부됩니다.

### Content Truncation

`max_content_tokens`를 사용하여 반환되는 콘텐츠의 양을 제한합니다:

```json
{
  "type": "openrouter:web_fetch",
  "parameters": {
    "max_content_tokens": 4000
  }
}
```

이 한도를 초과하는 콘텐츠는 잘립니다. 큰 페이지를 가져올 때 컨텍스트 윈도우 사용량을 제어하는 데 유용합니다.

### Responses API와 함께 사용

웹 페치 서버 툴은 Responses API와도 함께 작동합니다:

```typescript
const response = await fetch('https://openrouter.ai/api/v1/responses', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <YOUR_API_KEY>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/gpt-5.2',
    input: 'Fetch and summarize https://example.com',
    tools: [
      { type: 'openrouter:web_fetch' }
    ],
  }),
});
```

### Response Format

모델이 웹 페치 툴을 호출하면 다음과 같은 응답을 받습니다:

**성공 시:**

```json
{
  "title": "Example Page Title",
  "url": "https://example.com",
  "content": "Page text content..."
}
```

**실패 시:**

```json
{
  "error": "Failed to fetch URL: connection timeout"
}
```

### Pricing

모든 가격은 가져온 콘텐츠를 처리하는 표준 LLM 토큰 비용에 추가로 청구됩니다.

| 엔진 | 가격 |
| --- | --- |
| Native (제공자 내장) | 제공자에 따라 다름 |
| Exa | API 크레딧으로 청구 |
| OpenRouter (직접 HTTP) | 무료 (토큰 처리 비용만) |
| Firecrawl | 본인 Firecrawl 크레딧 사용 |

---

## Datetime (`openrouter:datetime`)

> 원문: https://openrouter.ai/docs/guides/features/server-tools/datetime

현재 날짜와 시간을 조회합니다. 모델이 시간 관련 질문에 답변할 때 유용합니다 — 스케줄링, 시간 민감 질문, 모델이 "지금"을 알아야 하는 모든 작업에 활용할 수 있습니다.

### Quick Start

```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <YOUR_API_KEY>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/gpt-5.2',
    messages: [
      { role: 'user', content: 'What day of the week is it today?' }
    ],
    tools: [
      { type: 'openrouter:datetime' }
    ],
  }),
});
```

### Configuration

Datetime 툴은 선택적 `timezone` 파라미터를 받습니다:

```json
{
  "type": "openrouter:datetime",
  "parameters": {
    "timezone": "America/New_York"
  }
}
```

| 파라미터 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `timezone` | string | `UTC` | IANA 타임존 이름 (예: `"America/New_York"`, `"Europe/London"`, `"Asia/Tokyo"`) |

### Response Format

모델이 datetime 툴을 호출하면 다음과 같은 응답을 받습니다:

```json
{
  "datetime": "2025-07-15T14:30:00.000-04:00",
  "timezone": "America/New_York"
}
```

### Pricing

Datetime 툴은 표준 토큰 사용량 이외에 추가 비용이 없습니다.

---

## Image Generation (`openrouter:image_generation`)

> 원문: https://openrouter.ai/docs/guides/features/server-tools/image-generation

텍스트 프롬프트로 이미지를 생성합니다. `openrouter:image_generation` 서버 툴은 모든 모델이 텍스트 프롬프트에서 이미지를 생성할 수 있게 합니다. 모델이 이미지 생성이 필요하다고 판단하면 설명과 함께 툴을 호출하고, OpenRouter가 이미지 생성을 실행하여 결과를 모델에 반환합니다.

### 작동 방식

1. `tools` 배열에 `{ "type": "openrouter:image_generation" }`를 포함합니다.
2. 사용자 요청을 기반으로 모델이 이미지 생성 필요 여부를 판단하고 프롬프트를 작성합니다.
3. OpenRouter가 구성된 모델을 사용해 이미지를 생성합니다 (기본값: `openai/gpt-5-image`).
4. 생성된 이미지 URL이 모델에 반환됩니다.
5. 모델이 이미지를 응답에 반영합니다. 단일 요청에서 여러 이미지를 생성할 수도 있습니다.

### Quick Start

```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <YOUR_API_KEY>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/gpt-5.2',
    messages: [
      { role: 'user', content: 'Create an image of a futuristic city at sunset' }
    ],
    tools: [
      { type: 'openrouter:image_generation' }
    ],
  }),
});
```

### Configuration

이미지 생성 툴은 출력을 커스터마이징하기 위해 선택적 `parameters`를 받습니다:

```json
{
  "type": "openrouter:image_generation",
  "parameters": {
    "model": "openai/gpt-5-image",
    "quality": "high",
    "aspect_ratio": "16:9",
    "size": "1024x1024",
    "background": "transparent",
    "output_format": "png"
  }
}
```

| 파라미터 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `model` | string | `openai/gpt-5-image` | 사용할 이미지 생성 모델. 사용 가능한 이미지 모델 목록 참조 |
| `quality` | string | — | 이미지 품질 수준 (모델 종속적, 예: `"low"`, `"medium"`, `"high"`) |
| `size` | string | — | 이미지 크기 (예: `"1024x1024"`, `"512x512"`) |
| `aspect_ratio` | string | — | 가로세로 비율 (예: `"16:9"`, `"1:1"`, `"4:3"`) |
| `background` | string | — | 배경 스타일 (예: `"transparent"`, `"opaque"`) |
| `output_format` | string | — | 출력 형식 (예: `"png"`, `"jpeg"`, `"webp"`) |
| `output_compression` | number | — | 손실 형식의 압축 수준 (0-100) |
| `moderation` | string | — | 콘텐츠 모더레이션 수준 (예: `"auto"`, `"low"`) |

`model`을 제외한 모든 파라미터는 기본 이미지 생성 API에 직접 전달됩니다. 사용 가능한 옵션은 사용 중인 특정 모델에 따라 다릅니다.

### Response Format

모델이 이미지 생성 툴을 호출하면 다음과 같은 응답을 받습니다:

**성공 시:**

```json
{
  "status": "ok",
  "imageUrl": "https://..."
}
```

**실패 시:**

```json
{
  "status": "error",
  "error": "Generation failed due to content policy"
}
```

### Responses API와 함께 사용

이미지 생성 서버 툴은 Responses API와도 함께 작동합니다:

```typescript
const response = await fetch('https://openrouter.ai/api/v1/responses', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <YOUR_API_KEY>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/gpt-5.2',
    input: 'Generate an image of a mountain landscape',
    tools: [
      {
        type: 'openrouter:image_generation',
        parameters: { quality: 'high' }
      }
    ],
  }),
});
```

### 사용 가능한 이미지 모델

| 모델 | 설명 |
| --- | --- |
| `openai/gpt-5-image` | 기본 이미지 생성 모델 |
| `openai/gpt-5-image-mini` | 경량 이미지 생성 모델 |
| `openai/gpt-5.4-image-2` | 최신 이미지 생성 모델 |

다른 모델은 OpenRouter의 이미지 모델 목록에서 확인할 수 있습니다.

### Pricing

이미지 생성 가격은 사용하는 기본 모델에 따라 다릅니다:

- **openai/gpt-5-image** (기본값): 모델 페이지 참조
- **openai/gpt-5-image-mini**: 모델 페이지 참조
- **openai/gpt-5.4-image-2**: 모델 페이지 참조
- **기타 모델**: OpenRouter의 이미지 모델 목록에서 확인

비용은 요청 및 응답을 처리하는 표준 LLM 토큰 비용에 추가로 청구됩니다.

---

## 사용량 추적

서버 툴 사용량은 응답의 `usage` 객체에서 추적할 수 있습니다:

```json
{
  "usage": {
    "input_tokens": 105,
    "output_tokens": 250,
    "server_tool_use": {
      "web_search_requests": 2
    }
  }
}
```

---

## 관련 문서

- [툴 콜링 (Function Calling)](./03-tool-calling.md)
- [웹 검색](./10-web-search.md)
- [플러그인](./09-plugins.md)
- [API 레퍼런스](./02-api-reference.md)
