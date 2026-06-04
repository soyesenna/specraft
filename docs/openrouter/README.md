# OpenRouter 개발자 문서

> OpenRouter 공식 문서(https://openrouter.ai/docs)를 기반으로 정리한 한국어 개발자 가이드입니다.
> 최종 업데이트: 2026-06-05

OpenRouter는 단일 API로 수백 개의 AI 모델에 접근할 수 있는 통합 플랫폼입니다. OpenAI Chat API와 호환되며, 자동 폴백, 프로바이더 선택, 모델 라우팅 등의 고급 기능을 제공합니다.

---

## 문서 목록

### 기본

| # | 문서 | 설명 |
| --- | --- | --- |
| 01 | [Quickstart 가이드](./01-quickstart.md) | API, Client SDK, Agent SDK, OpenAI SDK 호환 사용법 |
| 02 | [API 레퍼런스](./02-api-reference.md) | 요청/응답 스키마, 파라미터, 타입 정의 |

### 핵심 기능

| # | 문서 | 설명 |
| --- | --- | --- |
| 03 | [Tool Calling (Function Calling)](./03-tool-calling.md) | 툴 콜링 3단계, 에이전트 루프, 인터리브드 씽킹 |
| 04 | [스트리밍](./04-streaming.md) | SSE 스트리밍, 언어별 예제, 툴 콜링과 결합 |
| 05 | [Structured Outputs](./05-structured-outputs.md) | JSON Schema 강제, Response Healing |

### 통합

| # | 문서 | 설명 |
| --- | --- | --- |
| 06 | [프레임워크 통합](./06-frameworks.md) | OpenAI SDK, LangChain, Vercel AI SDK, PydanticAI 등 |

### 라우팅

| # | 문서 | 설명 |
| --- | --- | --- |
| 07 | [모델 라우팅](./07-model-routing.md) | Auto Router, 모델 폴백, 모델 변형 (:nitro, :floor, :online) |
| 08 | [Provider Selection](./08-provider-selection.md) | 프로바이더 정렬, 성능 임계값, 양자화 필터, Anthropic 베타 기능 |

### 모델 카탈로그

| # | 문서 | 설명 |
| --- | --- | --- |
| 13 | [Models API](./13-models-api.md) | 모델 목록 조회, Pricing 객체, 쿼리 파라미터, 모델 별칭 |

### 확장 기능

| # | 문서 | 설명 |
| --- | --- | --- |
| 09 | [플러그인](./09-plugins.md) | Web Search, PDF Inputs, Response Healing, Context Compression |
| 10 | [웹 검색](./10-web-search.md) | 웹 검색 엔진, 네이티브/Exa 검색, 가격 |
| 11 | [Message Transforms](./11-message-transforms.md) | 컨텍스트 압축, 긴 프롬프트 처리 |
| 12 | [Presets](./12-presets.md) | LLM 설정 분리, API에서 프리셋 생성 |

---

## 빠른 참조

### 엔드포인트

| 엔드포인트 | 설명 |
| --- | --- |
| `POST /api/v1/chat/completions` | Chat Completions (핵심 엔드포인트) |
| `GET /api/v1/models` | 사용 가능한 모델 목록 조회 |
| `GET /api/v1/generation?id=xxx` | 생성 통계 및 비용 조회 |
| `POST /api/v1/presets/{slug}/chat/completions` | 프리셋 생성/업데이트 |

### 모델 alias

| Alias | 설명 |
| --- | --- |
| `~openai/gpt-latest` | 항상 최신 OpenAI 플래그십 모델 |
| `~anthropic/claude-sonnet-latest` | 항상 최신 Claude Sonnet |
| `openrouter/auto` | Auto Router (NotDiamond 구동) |

### 모델 변형 접미사

| 접미사 | 설명 |
| --- | --- |
| `:nitro` | 처리량 우선 정렬 |
| `:floor` | 가격 우선 정렬 |
| `:online` | 웹 검색 플러그인 활성화 |
| `:free` | 무료 모델 변형 |

### OpenAI SDK 호환 설정

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="<YOUR_OPENROUTER_API_KEY>",
)
```

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: '<YOUR_OPENROUTER_API_KEY>',
});
```

---

## 원문 링크

- 공식 문서: https://openrouter.ai/docs
- 모델 목록: https://openrouter.ai/models
- API 상태: https://status.openrouter.ai
