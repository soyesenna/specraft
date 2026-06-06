# OpenRouter 개발자 문서

> OpenRouter 공식 문서(https://openrouter.ai/docs)를 기반으로 정리한 한국어 개발자 가이드입니다.
> 최종 업데이트: 2026-06-06

OpenRouter는 단일 API로 수백 개의 AI 모델에 접근할 수 있는 통합 플랫폼입니다. OpenAI Chat API와 호환되며, 자동 폴백, 프로바이더 선택, 모델 라우팅 등의 고급 기능을 제공합니다.

---

## 문서 목록

### 기본

| # | 문서 | 설명 |
| --- | --- | --- |
| 01 | [Quickstart 가이드](./01-quickstart.md) | API, Client SDK, Agent SDK, OpenAI SDK 호환 사용법 |
| 02 | [API 레퍼런스](./02-api-reference.md) | 요청/응답 스키마, 파라미터, 타입 정의 |
| 20 | [인증](./20-authentication.md) | API 키 인증, OAuth PKCE, Provisioning API Keys |

### 핵심 기능

| # | 문서 | 설명 |
| --- | --- | --- |
| 03 | [Tool Calling (Function Calling)](./03-tool-calling.md) | 툴 콜링 3단계, 에이전트 루프, 인터리브드 씽킹 |
| 04 | [스트리밍](./04-streaming.md) | SSE 스트리밍, 스트림 취소, 미드스트림 오류 처리 |
| 05 | [Structured Outputs](./05-structured-outputs.md) | JSON Schema 강제, Response Healing |
| 16 | [Server Tools (Beta)](./16-server-tools.md) | 웹 검색, 날짜/시간, 이미지 생성 서버 툴 |
| 17 | [Reasoning Tokens](./17-reasoning-tokens.md) | 추론 파라미터, effort 레벨, reasoning_details, :thinking 변형 |
| 22 | [Responses API Beta](./22-responses-api.md) | OpenAI 호환 Responses API, reasoning, tool calling, web search |

### 멀티모달

| # | 문서 | 설명 |
| --- | --- | --- |
| 18 | [멀티모달](./18-multimodal.md) | 이미지, 오디오, PDF 입력, 이미지 생성 |

### 라우팅

| # | 문서 | 설명 |
| --- | --- | --- |
| 07 | [모델 라우팅](./07-model-routing.md) | Auto Router, Auto Exacto, 모델 폴백, 모델 변형 (:nitro, :floor, :online, :free, :extended, :exacto, :thinking) |
| 08 | [Provider Selection](./08-provider-selection.md) | 프로바이더 정렬, 성능 임계값, 양자화 필터, EU 레지던시, BYOK, Anthropic 베타 |

### 성능 최적화

| # | 문서 | 설명 |
| --- | --- | --- |
| 19 | [프롬프트 캐싱](./19-prompt-caching.md) | 프로바이더별 프롬프트 캐싱, Provider Sticky Routing, Response Caching |

### 통합

| # | 문서 | 설명 |
| --- | --- | --- |
| 06 | [프레임워크 통합](./06-frameworks.md) | OpenAI SDK, LangChain, Vercel AI SDK, PydanticAI 등 |
| 23 | [SDK 레퍼런스](./23-sdks.md) | TypeScript SDK, Python SDK, Agent SDK (@openrouter/agent) |

### 확장 기능

| # | 문서 | 설명 |
| --- | --- | --- |
| 09 | [플러그인](./09-plugins.md) | Web Search, PDF Inputs, Response Healing, Context Compression |
| 10 | [웹 검색](./10-web-search.md) | 웹 검색 엔진 (Native/Exa/Firecrawl/Parallel), Domain Filtering, 가격 |
| 11 | [Message Transforms](./11-message-transforms.md) | Middle-out 컨텍스트 압축, 긴 프롬프트 처리 |
| 12 | [Presets](./12-presets.md) | LLM 설정 분리, API에서 프리셋 생성 |

### 모델 카탈로그

| # | 문서 | 설명 |
| --- | --- | --- |
| 13 | [Models API](./13-models-api.md) | 모델 목록 조회, Endpoints API, Pricing 객체, 쿼리 파라미터, 모델 별칭 |

### 정책 및 제한

| # | 문서 | 설명 |
| --- | --- | --- |
| 14 | [속도 제한](./14-rate-limits.md) | API 키 정보, 무료 모델 제한, DDoS 보호, 음수 잔액 |
| 15 | [개인정보 및 데이터 처리](./15-privacy.md) | ZDR, 데이터 정책, 프롬프트 로깅, EU 레지던시 |

### 엔터프라이즈

| # | 문서 | 설명 |
| --- | --- | --- |
| 21 | [엔터프라이즈](./21-enterprise.md) | 조직 관리, 가드레일, 워크스페이스, Broadcast, Service Tiers, Sovereign AI |

---

## 빠른 참조

### 엔드포인트

| 엔드포인트 | 설명 |
| --- | --- |
| `POST /api/v1/chat/completions` | Chat Completions (핵심 엔드포인트) |
| `POST /api/beta/responses` | Responses API (Beta) |
| `GET /api/v1/models` | 사용 가능한 모델 목록 조회 |
| `GET /api/v1/models/{author}/{slug}/endpoints` | 모델별 프로바이더 엔드포인트 조회 |
| `GET /api/v1/generation?id=xxx` | 생성 통계 및 비용 조회 |
| `GET /api/v1/key` | API 키 정보 및 사용량 조회 |
| `POST /api/v1/presets/{slug}/chat/completions` | 프리셋 생성/업데이트 |

### 모델 alias

| Alias | 설명 |
| --- | --- |
| `~openai/gpt-latest` | 항상 최신 OpenAI 플래그십 모델 |
| `~anthropic/claude-sonnet-latest` | 항상 최신 Claude Sonnet |
| `openrouter/auto` | Auto Router (NotDiamond 구동) |
| `openrouter/bodybuilder` | 자연어를 병렬 API 요청으로 변환 |
| `openrouter/free` | 무료 모델 자동 선택 |

### 모델 변형 접미사

| 접미사 | 설명 |
| --- | --- |
| `:nitro` | 처리량 우선 정렬 |
| `:floor` | 가격 우선 정렬 |
| `:exacto` | 품질 우선 프로바이더 정렬 (Auto Exacto) |
| `:thinking` | 확장 추론 활성화 |
| `:extended` | 확장 컨텍스트 윈도우 |
| `:online` | 웹 검색 활성화 (deprecated, 서버 툴 권장) |
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
- SDK 문서: https://openrouter.ai/docs/sdks
