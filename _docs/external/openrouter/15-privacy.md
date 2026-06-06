# OpenRouter 개인정보 및 데이터 처리 가이드

> 원문: https://openrouter.ai/docs/guides/privacy
> https://openrouter.ai/docs/guides/features/zdr

OpenRouter를 통해 AI를 사용할 때(채팅 인터페이스 또는 API) 프롬프트와 응답은 여러 터치포인트를 거칩니다. 각 단계에서 데이터가 어떻게 처리되는지에 대한 실용적인 개요를 제공합니다. 자세한 내용은 개인정보처리방침(Privacy Policy) 및 서비스 약관(Terms of Service)에서 확인할 수 있습니다.

---

## OpenRouter 내부 데이터 처리

### 프롬프트 및 응답 저장

**OpenRouter는 프롬프트나 응답을 저장하지 않습니다.** 단, 계정 설정에서 프롬프트 로깅을 명시적으로 활성화(opt-in)한 경우는 예외입니다.

### 익명 프롬프트 분류

OpenRouter는 리포팅 및 모델 랭킹을 위해 소수의 프롬프트를 샘플링하여 분류합니다.

- 프롬프트 로깅에 동의하지 않은 경우, 프롬프트 분류는 **완전히 익명**으로 저장됩니다
- 분류 결과는 계정이나 사용자 ID와 **절대 연결되지 않습니다**
- 분류는 모델 단위로 수행되며, **Zero-Data-Retention(영데이터보존)** 정책을 따릅니다

### 메타데이터 저장

OpenRouter는 각 요청에 대해 다음 메타데이터를 저장합니다:

| 저장 항목 | 설명 |
| --- | --- |
| 프롬프트 토큰 수 | 입력 토큰 수량 |
| 완성 토큰 수 | 출력 토큰 수량 |
| 지연 시간 | 요청 처리 시간 |
| 기타 요청 정보 | 모델 식별자, 비용 등 |

**중요**: 이 메타데이터에는 프롬프트나 응답의 **내용은 포함되지 않으며**, 요청 자체에 대한 정보만 포함됩니다.

용도:
- 리포팅 및 모델 랭킹
- 활동 피드 (Activity Feed)

---

## OpenRouter의 데이터 정책 관리 방식

OpenRouter는 프로바이더와 협력하여 각 프로바이더의 데이터 정책을 파악하고, 사용자가 원하는 프로바이더로만 라우팅할 수 있도록 정책 데이터를 구조화합니다.

| 정책 관리 항목 | 설명 |
| --- | --- |
| **프로바이더별 개별 정책 추적** | 프로바이더의 일반 정책과 특정 엔드포인트의 정책이 다를 수 있음. OpenRouter는 엔드포인트 단위로 정책을 추적 |
| **프로바이더 협력** | 프로바이더와 협력하여 정책을 최신으로 유지 |
| **특별 협약** | 경우에 따라 프로바이더의 기본 정책보다 더 엄격한 개인정보 보호를 위한 특별 협약 체결 |
| **보수적 접근** | 정책을 명확히 확인할 수 없는 경우, 해당 엔드포인트가 데이터를 보존하고 학습에 사용한다고 간주 |

> **참고**: 프로바이더 목록과 기본 데이터 정책은 프로바이더 선택 페이지에서 확인할 수 있습니다. 이 목록은 프로바이더의 기본 정책을 보여주며, 특정 엔드포인트의 정책이 기본과 다를 경우 "ZDR Only" 활성화 시 해당 엔드포인트를 사용할 수 없습니다.

---

## Zero Data Retention (ZDR)

Zero Data Retention(ZDR)은 프로바이더가 사용자의 데이터를 어떤 기간 동안도 저장하지 않는다는 것을 의미합니다.

OpenRouter의 개인정보 설정을 활성화하면 ZDR 정책을 가진 엔드포인트로만 라우팅됩니다. ZDR은 **전체 계정**, **모델 그룹별**, **가드레일별**, **요청별**로 강제할 수 있습니다.

데이터를 보존하지 않는 프로바이더는 데이터를 학습에 사용할 수도 없습니다. 단, 데이터를 학습에 사용하지 않으면서도 **보존**하는 엔드포인트/프로바이더도 존재합니다(예: 남용 스캔, 법적 사유). OpenRouter는 두 가지 정책(보존 여부, 학습 여부) 모두에 대한 제어 기능을 제공합니다.

### 모델 그룹별 ZDR 강제 (Per-Model-Group)

단일 글로벌 토글 대신, OpenRouter는 모델 그룹별로 독립적으로 ZDR을 강제할 수 있습니다. 이 기능은 계정 수준 개인정보 설정과 가드레일 모두에서 사용할 수 있습니다.

**4가지 모델 그룹 스코프:**

| 모델 그룹 | 대상 | 활용 예시 |
| --- | --- | --- |
| **Anthropic** | Anthropic사의 Claude 계열 모델 | Anthropic 퍼스트파티 엔드포인트에만 ZDR 적용 |
| **OpenAI** | OpenAI사의 GPT 계열 모델 | Azure 등 특정 프로바이더 경로에만 ZDR 적용 |
| **Google** | Google사의 Gemini/Gemma 계열 모델 | Google 퍼스트파티 엔드포인트에만 ZDR 적용 |
| **Non-frontier** | 위 3사 외의 모든 모델 | 비프론티어 모델에만 ZDR 강제, 프론티어는 제외 |

**활용 시나리오**: 비프론티어 모델에만 ZDR을 강제하고, Anthropic/OpenAI/Google의 퍼스트파티 엔드포인트는 ZDR 제한 없이 사용 가능하도록 설정할 수 있습니다.

### 계정 수준 설정

개인정보 설정(Privacy Settings)에서 각 모델 그룹별로 개별 토글이 제공됩니다. 스코프를 활성화하면 해당 모델 그룹의 모든 요청이 ZDR 엔드포인트로만 제한됩니다.

### 가드레일 수준 설정

가드레일 생성 또는 편집 시 각 모델 그룹별로 ZDR을 독립적으로 설정할 수 있습니다. 이를 통해 API 키나 조직 구성원별로 다른 ZDR 정책을 적용할 수 있습니다.

API에서는 가드레일 객체의 개별 필드로 표현됩니다:

```typescript
// 가드레일 예시 (Per-Model-Group ZDR 필드)
const guardrail = {
  // 레거시 필드 (deprecated)
  enforce_zdr: true,  // 새 통합에서는 사용하지 마세요

  // Per-Model-Group 필드 (권장)
  enforce_zdr_anthropic: true,
  enforce_zdr_openai: false,
  enforce_zdr_google: true,
  enforce_zdr_non_frontier: true,
};
```

> **중요**: 레거시 `enforce_zdr` 필드는 **deprecated** 되었습니다. 제공 시 해당 값은 요청에서 명시적으로 설정되지 않은 Per-Model-Group 필드에 복사됩니다. 새 통합에서는 Per-Model-Group 필드를 직접 사용하세요.

### 요청 수준 ZDR

계정 수준 및 가드레일 수준 설정 외에도, API 호출 시 `zdr` 파라미터로 요청별 ZDR을 강제할 수 있습니다.

```typescript
const completion = await openRouter.chat.send({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    zdr: true,  // ZDR 엔드포인트로만 라우팅
  },
  stream: false,
});
```

**동작 방식**:

| 설정값 | 동작 |
| --- | --- |
| `zdr: true` | ZDR 정책을 가진 엔드포인트로만 라우팅 |
| `zdr: false` 또는 생략 | 계정 또는 가드레일 설정에 따라 ZDR 적용 여부 결정 |

요청 수준 `zdr` 파라미터는 계정 수준 및 가드레일 ZDR 설정과 **OR** 관계로 작동합니다. 즉, 어느 하나라도 활성화되면 ZDR이 적용됩니다. 이 파라미터는 특정 요청에 ZDR을 활성화하는 데만 사용할 수 있으며, 계정 수준이나 가드레일 강제를 재정의하거나 비활성화할 수는 없습니다.

### 캐싱 정책

일부 엔드포인트/모델은 프롬프트의 암시적 캐싱(implicit caching)을 제공합니다. 반복되는 프롬프트 데이터를 프로바이더 데이터센터의 **인메모리 캐시**에 유지하여, 반복 부분을 재처리하지 않아도 되므로 상당한 비용 절감이 가능합니다.

| 캐싱 관련 | OpenRouter의 입장 |
| --- | --- |
| 인메모리 캐싱 | 데이터 "보존(retaining)"으로 간주하지 **않음** |
| ZDR 라우팅 정책 | 인메모리 캐싱이 있는 엔드포인트/모델도 ZDR 정책이 적용될 때 사용 가능 |
| 영향 | ZDR 활성화 상태에서도 암시적 캐싱 엔드포인트로 라우팅 가능 |

### OpenRouter 자체 보존 정책

OpenRouter 자체도 ZDR 정책을 따릅니다. 프롬프트 로깅에 명시적으로 동의하지 않는 한 프롬프트가 보존되지 않습니다.

---

## ZDR 엔드포인트 목록

다음 엔드포인트들이 ZDR 정책을 갖고 있습니다. 이 목록은 프로바이더의 데이터 정책 변경 시 자동으로 업데이트됩니다.

**프로그래매틱 액세스**: `https://openrouter.ai/api/v1/endpoints/zdr` 에서 전체 목록을 API로 조회할 수 있습니다.

아래는 주요 ZDR 엔드포인트 중 대표적인 것들입니다 (전체 목록은 위 API 또는 공식 문서 참조):

### Anthropic 계열 (ZDR)

| 모델 | 프로바이더 | 암시적 캐싱 |
| --- | --- | --- |
| Claude 3 Haiku | Amazon Bedrock | No |
| Claude 3.5 Haiku | Amazon Bedrock | No |
| Claude Haiku 4.5 | Amazon Bedrock | No |
| Claude Haiku 4.5 | Google | No |
| Claude Opus 4 | Google | No |
| Claude Opus 4.1 | Google | No |
| Claude Opus 4.1 | Amazon Bedrock | No |
| Claude Opus 4.5 | Amazon Bedrock | No |
| Claude Opus 4.5 | Google | No |
| Claude Opus 4.6 | Google | No |
| Claude Opus 4.6 | Amazon Bedrock | No |
| Claude Opus 4.7 | Google | No |
| Claude Opus 4.7 | Amazon Bedrock | No |
| Claude Opus 4.8 | Google | No |
| Claude Opus 4.8 | Amazon Bedrock | No |
| Claude Sonnet 4 | Google | No |
| Claude Sonnet 4 | Amazon Bedrock | No |
| Claude Sonnet 4.5 | Amazon Bedrock | No |
| Claude Sonnet 4.5 | Google | No |
| Claude Sonnet 4.6 | Amazon Bedrock | No |
| Claude Sonnet 4.6 | Google | No |

### OpenAI 계열 (ZDR)

| 모델 | 프로바이더 | 암시적 캐싱 |
| --- | --- | --- |
| GPT-4 | Azure | No |
| GPT-4.1 | Azure | Yes |
| GPT-4.1 Mini | Azure | Yes |
| GPT-4.1 Nano | Azure | Yes |
| GPT-4o | Azure | No |
| GPT-4o-mini | Azure | No |
| GPT-5 | Azure | Yes |
| GPT-5 Mini | Azure | No |
| GPT-5 Nano | Azure | No |
| GPT-5.1 | Azure | Yes |
| GPT-5.1 Chat | Azure | Yes |
| GPT-5.1-Codex | Azure | Yes |
| GPT-5.1-Codex-Max | Azure | Yes |
| GPT-5.1-Codex-Mini | Azure | Yes |
| GPT-5.2 | Azure | Yes |
| GPT-5.2 Chat | Azure | Yes |
| GPT-5.2-Codex | Azure | Yes |
| GPT-5.3 Chat | Azure | No |
| GPT-5.3-Codex | Azure | No |
| GPT-5.4 | Azure | No |
| GPT-5.4 Mini | Azure | No |
| GPT-5.4 Nano | Azure | No |
| GPT-5.4 Pro | Azure | No |
| GPT-5.5 | Azure | No |
| gpt-oss-120b | Amazon Bedrock / Phala / DeepInfra / SambaNova / Together / Novita / Mara / BaseTen / SiliconFlow / Parasail / Groq / Google / Cerebras / DekaLLM / Nebius / DigitalOcean | No |
| gpt-oss-20b | Parasail / Amazon Bedrock / Phala / Together / SiliconFlow / Groq / DeepInfra / Fireworks / Google / NextBit / Novita / DekaLLM | No |
| gpt-oss-safeguard-20b | Groq | No |
| Text Embedding 3 Large | Azure | No |
| Text Embedding 3 Small | Azure | No |
| Whisper Large V3 | Groq / Together | No |
| Whisper Large V3 Turbo | Groq | No |

### Google 계열 (ZDR)

| 모델 | 프로바이더 | 암시적 캐싱 |
| --- | --- | --- |
| Gemini 2.5 Flash | Google | No |
| Gemini 2.5 Flash Lite | Google | No |
| Gemini 2.5 Flash Lite Preview 09-2025 | Google | No |
| Gemini 2.5 Pro | Google | No |
| Gemini 2.5 Pro Preview 05-06 | Google | No |
| Gemini 2.5 Pro Preview 06-05 | Google | No |
| Gemini 3 Flash Preview | Google | Yes |
| Gemini 3.1 Flash Lite | Google | Yes |
| Gemini 3.1 Flash Lite Preview | Google | Yes |
| Gemini 3.1 Flash TTS Preview | Google | No |
| Gemini 3.1 Pro Preview | Google | No |
| Gemini 3.5 Flash | Google | Yes |
| Gemma 2 27B | NextBit | No |
| Gemma 3 12B | DeepInfra / SambaNova | No |
| Gemma 3 27B | DeepInfra / Phala / Parasail / Novita / Nebius | No |
| Gemma 3 4B | DeepInfra | No |
| Gemma 3n 4B | Together | No |
| Gemma 4 26B A4B | Google / Parasail / Novita / NextBit / Venice / DeepInfra / SiliconFlow / DekaLLM | No |
| Gemma 4 31B | Together / Phala / Novita / DeepInfra / Venice / SiliconFlow / Parasail | No |
| Chirp 3 | Google | No |
| Nano Banana (Gemini 2.5 Flash Image) | Google | No |
| Nano Banana 2 (Gemini 3.1 Flash Image Preview) | Google | No |
| Nano Banana Pro (Gemini 3 Pro Image Preview) | Google | No |
| Veo 3.1 Lite | Google | No |

### DeepSeek 계열 (ZDR)

| 모델 | 프로바이더 | 암시적 캐싱 |
| --- | --- | --- |
| DeepSeek V3 | StreamLake / Novita / DeepInfra | No |
| DeepSeek V3 0324 | ModelRun / Novita / SiliconFlow / DeepInfra / AtlasCloud | No |
| DeepSeek V3.1 | AtlasCloud / Novita / SambaNova / DeepInfra / Google / SiliconFlow | No |
| DeepSeek V3.1 Terminus | DeepInfra / SiliconFlow / AtlasCloud / Novita | No |
| DeepSeek V3.2 | Novita / SiliconFlow / DeepInfra / Google / StreamLake / SambaNova / AtlasCloud / DigitalOcean / Parasail | No |
| DeepSeek V3.2 Exp | Novita / SiliconFlow / AtlasCloud | No |
| DeepSeek V4 Flash | SiliconFlow / Parasail / AtlasCloud / Venice / DeepInfra / AkashML / Morph / StreamLake / Novita / DigitalOcean | No |
| DeepSeek V4 Pro | SiliconFlow / Parasail / Fireworks / DeepInfra / Venice / AtlasCloud / Together / StreamLake / Novita / DigitalOcean | No |
| R1 | Azure / Novita | No |
| R1 0528 | Novita / AtlasCloud / SiliconFlow / DeepInfra / StreamLake | No |
| R1 Distill Llama 70B | DeepInfra / Novita | No |
| R1 Distill Qwen 32B | NextBit | No |

### Meta / Qwen / 기타 모델 (ZDR)

| 모델 | 프로바이더 | 암시적 캐싱 |
| --- | --- | --- |
| Meta: Llama 3 70B Instruct | Novita | No |
| Meta: Llama 3 8B Instruct | Novita / Together | No |
| Meta: Llama 3.1 70B Instruct | Amazon Bedrock / DeepInfra | No |
| Meta: Llama 3.1 8B Instruct | Novita / DeepInfra / Groq | No |
| Meta: Llama 3.2 11B Vision Instruct | DeepInfra | No |
| Meta: Llama 3.2 3B Instruct | Venice | No |
| Meta: Llama 3.3 70B Instruct | Together / Google / SambaNova / Parasail / Groq / Nebius / Venice / Inceptron / DeepInfra / Novita / AkashML | No |
| Meta: Llama 4 Maverick | DeepInfra / SambaNova / Parasail / Google / Novita | No |
| Meta: Llama 4 Scout | DeepInfra / Groq / Novita / Google | No |
| Meta: Llama Guard 4 12B | Together / DeepInfra | No |
| Qwen: Qwen3 235B A22B Instruct 2507 | Together / Google / AtlasCloud / DeepInfra / Parasail / StreamLake / Novita | No |
| Qwen: Qwen3 32B | Groq / Nebius / DeepInfra / SiliconFlow / AtlasCloud | No |
| Qwen: Qwen3 Coder 480B A35B | Venice / Novita / DeepInfra / Google / AtlasCloud | No |
| Qwen: Qwen3.5 397B A17B | Venice / Novita / Together / AtlasCloud / Parasail / Morph / Phala / DeepInfra | No |
| Mistral: Mistral Nemo | DeepInfra / Novita / DekaLLM | No |
| Mistral: Mistral Small 3.2 24B | Parasail / Venice / DeepInfra | No |
| Z.ai: GLM 4.7 | Z.AI / Parasail / Google / Novita / StreamLake / AtlasCloud / Cerebras / Phala / Venice / DeepInfra / SiliconFlow | No |
| Z.ai: GLM 5 | Amazon Bedrock / Phala / Novita / DeepInfra / SiliconFlow / Z.AI / Parasail / Together / AtlasCloud / Venice / StreamLake | No |
| Z.ai: GLM 5.1 | Novita / Together / Parasail / Fireworks / Io Net / Z.AI / SiliconFlow / Venice / Phala / StreamLake / DeepInfra / BaseTen / AtlasCloud / Inceptron | No |

> **참고**: 위 테이블은 대표적인 엔드포인트만 포함합니다. 전체 ZDR 엔드포인트 목록은 공식 문서 또는 `https://openrouter.ai/api/v1/endpoints/zdr` API에서 확인하세요. 프로바이더 정책 변경 시 자동 업데이트됩니다.

---

## 데이터 정책 제어

<!-- data_collection 파라미터: 공식 Privacy 가이드(docs/guides/privacy) 및 ZDR 문서(docs/guides/features/zdr)에 명시적으로 문서화되어 있지 않음. 공식 문서에서 확인되면 주석을 해제할 것. -->

<!--
### 요청 수준 data_collection

`provider` 객체의 `data_collection` 필드로 데이터 저장 정책을 제어할 수 있습니다:

```typescript
const completion = await openRouter.chat.send({
  messages: [{ role: 'user', content: 'Hello' }],
  provider: {
    dataCollection: 'deny',
  },
  stream: false,
});
```

| 값 | 설명 |
| --- | --- |
| `"allow"` (기본값) | 사용자 데이터를 비일시적으로 저장하거나 학습에 사용할 수 있는 프로바이더 허용 |
| `"deny"` | 사용자 데이터를 수집하지 않는 프로바이더만 사용 |
-->

### 계정 수준

개인정보 설정(Privacy Settings)에서 계정 전체에 데이터 정책을 설정할 수 있습니다:
- 서드파티 모델 프로바이더의 입력 데이터 학습 사용 여부 제어
- 특정 프로바이더 허용/차단

---

## 프롬프트 로깅

프롬프트 로깅은 기본적으로 **비활성화**되어 있습니다.

- 활성화: 계정 설정에서 명시적으로 opt-in
- 비활성화 시: 프롬프트와 응답 내용이 OpenRouter에 저장되지 않음
- 분류: 프롬프트 로깅 여부와 관계없이 익명 분류는 수행됨 (위 참조)

---

## EU 데이터 레지던시 (Enterprise)

<!-- 공식 Privacy 가이드(docs/guides/privacy) 및 ZDR 문서(docs/guides/features/zdr)에 EU 데이터 레지던시에 대한 명시적인 내용이 확인되지 않음. 엔터프라이즈 기능으로 존재할 수 있으나, 현재 공식 문서에서 독립적으로 검증할 수 없음. 확인되면 내용을 업데이트할 것. -->

---

## Distillable Text Enforcement

<!-- 공식 Privacy 가이드(docs/guides/privacy) 및 ZDR 문서(docs/guides/features/zdr)에 Distillable Text 관련 내용이 확인되지 않음. provider-selection 페이지에서 확인되면 참조 추가할 것. -->

---

## 추가 정보

- **개인정보처리방침**: OpenRouter의 공식 개인정보처리방침
- **서비스 약관**: 각 프로바이더의 서비스 약관은 모델 페이지에서 확인 가능
- **데이터 정책 태그**: 모델 페이지에 Data Policy 태그로 표시됨

> **참고**: 데이터 정책 태그는 서드파티 데이터 정책의 결정적 출처가 아니며, OpenRouter의 최선 지식을 기반으로 합니다.

---

## 관련 문서

- [API 레퍼런스](./02-api-reference.md)
- [Provider Selection](./08-provider-selection.md)
- [속도 제한](./14-rate-limits.md)
- [가드레일](./11-guardrails.md)
