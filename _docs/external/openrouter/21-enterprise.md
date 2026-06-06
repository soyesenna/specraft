# OpenRouter Enterprise (엔터프라이즈) 가이드

> 원문: https://openrouter.ai/docs/enterprise-quickstart
> https://openrouter.ai/docs/use-cases/organization-management
> https://openrouter.ai/docs/guides/features/guardrails
> https://openrouter.ai/docs/guides/features/workspaces
> https://openrouter.ai/docs/guides/features/broadcast
> https://openrouter.ai/docs/guides/features/service-tiers
> https://openrouter.ai/docs/guides/features/sovereign-ai

OpenRouter 엔터프라이즈 기능은 조직 단위의 협업, 비용 통제, 보안 정책, 관측성(Observability), 데이터 주권까지 프로덕션 환경에 필요한 모든 것을 제공합니다. 이 문서는 조직 관리부터 주권 AI 배포까지 엔터프라이즈 기능을 종합적으로 다룹니다.

---

## 목차

1. [조직 관리 (Organization Management)](#1-조직-관리-organization-management)
2. [가드레일 (Guardrails)](#2-가드레일-guardrails)
3. [워크스페이스 (Workspaces)](#3-워크스페이스-workspaces)
4. [Broadcast (관측성)](#4-broadcast-관측성)
5. [서비스 티어 (Service Tiers)](#5-서비스-티어-service-tiers)
6. [주권 AI (Sovereign AI)](#6-주권-ai-sovereign-ai)
7. [API 키 관리 (API Key Management)](#7-api-키-관리-api-key-management)
8. [엔터프라이즈 퀵스타트 체크리스트](#8-엔터프라이즈-퀵스타트-체크리스트)

---

## 1. 조직 관리 (Organization Management)

OpenRouter 조직(Organization)은 팀과 기업이 공유 크레딧, 중앙 집중식 API 키 관리, 통합 사용량 추적으로 협업할 수 있게 합니다.

### 조직 생성

1. **Settings > Preferences**로 이동
2. Organization 섹션에서 **Create Organization** 클릭
3. 조직 세부 정보 구성
4. 팀원 초대

> 조직을 생성하려면 **인증된 이메일 주소**가 필요합니다.

### 개인 계정과 조직 간 전환

조직에 가입하면 웹 애플리케이션 상단의 **조직 전환기(Organization Switcher)**를 통해 개인 계정과 조직 컨텍스트를 전환할 수 있습니다.

| 모드 | 설명 |
| --- | --- |
| **조직 모드** | 모든 작업(API 사용, 크레딧 구매, 키 관리)이 조직을 대신하여 수행 |
| **개인 모드** | 개인 계정 리소스로 작업 |

### 크레딧 관리

#### 공유 크레딧 풀 (Shared Credit Pool)

조직은 중앙 집중식 크레딧 풀을 유지합니다:

| 기능 | 설명 |
| --- | --- |
| **중앙 집중식 빌링** | 조직 계정에서 구매한 모든 크레딧은 조직원 누구나 사용 가능 |
| **간소화된 회계** | 모든 AI 추론 비용을 한 곳에서 추적 |
| **예산 통제** | 관리자가 전체 팀의 지출 관리 및 사용량 모니터링 |

#### 관리자 전용 크레딧 관리

**관리자(Admin)**만 수행할 수 있는 작업:

- 조직 크레딧 구매
- 상세 빌링 정보 열람
- 결제 수단 및 인보이스 설정 관리

일반 멤버는 크레딧을 구매하거나 빌링 정보에 접근할 수 없습니다.

#### 개인 → 조직 크레딧 이전

개인 계정의 크레딧을 조직으로 이전하려면:

1. support@openrouter.ai에 이메일 요청
2. 조직 정보와 이전 금액 기재
3. 지원팀이 수동 처리

> 크레딧 이전은 자동으로 처리되지 않으며, 지원팀의 수동 처리가 필요합니다.

### 역할 기반 접근 제어 (RBAC)

조직은 2가지 역할을 지원합니다:

| 역할 | 권한 |
| --- | --- |
| **Admin** | 모든 조직 기능 및 설정에 대한 전체 접근 권한. 프로바이더 설정, 개인정보 설정, 멤버 관리, 빌링 구성 |
| **Member** | API 키 생성, 조직 리소스 사용, 본인 활동 열람 |

### 멤버 권한 상세

#### Member 권한

- **API 키 생성**: 모든 조직 멤버가 API 키 생성 가능
- **본인 키 조회**: 본인이 생성한 키만 조회 및 관리 가능
- **조직 키 사용**: 모든 멤버가 생성한 키를 전체 멤버가 사용 가능
- **공유 사용량**: 조직 키의 API 사용량은 조직의 크레딧 풀에서 청구

#### Admin 권한

- **전체 키 조회**: 조직 내 모든 API 키 조회 가능
- **전체 키 관리**: 모든 조직 API 키 편집, 비활성화, 삭제 가능
- **사용량 모니터링**: 모든 조직 키의 상세 사용량 분석 접근

> **참고**: 조직당 최대 **10명**의 멤버만 가질 수 있습니다. 더 많은 멤버가 필요한 경우 support@openrouter.ai에 문의하세요.

### 활동 및 사용량 추적

#### 조직 전체 활동 피드

조직 컨텍스트에서 활동 피드를 볼 때:

| 항목 | 설명 |
| --- | --- |
| **전체 멤버 활동** | 모든 조직원의 사용 데이터가 표시 |
| **메타데이터 전용** | 모델 사용량, 비용, 요청 메타데이터 표시 |
| **키 필터링** | 특정 API 키별로 필터링하여 해당 키의 사용량만 조회 가능 |

> **알려진 제한**: 활동 피드는 조직 컨텍스트에서 모든 조직원의 활동을 표시합니다. OpenRouter는 프롬프트나 응답을 저장하지 않습니다.

---

## 2. 가드레일 (Guardrails)

가드레일은 조직이 멤버와 API 키의 OpenRouter 사용 방식을 제어할 수 있게 합니다. 지출 한도 설정, 모델/프로바이더 접근 제한, 데이터 개인정보 보호 정책 강제가 가능합니다.

### 가드레일 활성화

1. **Settings > Privacy**로 이동
2. Guardrails 섹션으로 스크롤
3. **"New Guardrail"** 클릭

> 조직 계정의 경우 **조직 Admin**만 가드레일을 생성하고 관리할 수 있습니다.

### 가드레일 설정 항목

각 가드레일은 다음 설정의 조합을 포함할 수 있습니다:

| 설정 | 설명 |
| --- | --- |
| **예산 한도 (Budget limit)** | 일간/주간/월간으로 초기화되는 USD 지출 상한. 한도 도달 시 요청 거부 |
| **모델 허용 목록 (Model allowlist)** | 특정 모델으로 제한. 비워두면 전체 허용 |
| **프로바이더 허용 목록 (Provider allowlist)** | 특정 프로바이더로 제한. 비워두면 전체 허용 |
| **Zero Data Retention (ZDR)** | 모델 그룹별(Anthropic, OpenAI, Google, Non-frontier) ZDR 강제 |
| **보안 (Security)** | 프롬프트 인젝션 및 탈옥 공격 방지. 정규식 기반 탐지 및 Google Cloud Model Armor 사용 |
| **민감 정보 (Sensitive Info)** | 내장 프리셋과 NLP 기반 탐지로 API 요청 내 PII를 탐지하여 편집(Redact) 또는 차단(Block) |
| **커스텀 콘텐츠 필터** | 정규식 패턴을 직접 정의하여 매칭되는 콘텐츠를 편집하거나 차단 |

> 개별 API 키 예산은 별도로 적용되며, **더 낮은 한도가 우선** 적용됩니다.

### 가드레일 할당

가드레일은 여러 수준에서 할당할 수 있습니다:

| 할당 수준 | 설명 |
| --- | --- |
| **멤버 할당** | 특정 조직 멤버에게 할당. 해당 멤버의 모든 API 키 및 채팅 사용에 기준선 설정 |
| **API 키 할당** | 특정 키에 직접 할당. 멤버 가드레일 위에 추가 레이어 적용 |

사용자 또는 키에 직접 할당할 수 있는 가드레일은 **하나**뿐입니다. 조직 멤버가 생성한 모든 API 키는 해당 사용자의 가드레일 할당을 암묵적으로 따릅니다.

### 가드레일 계층 구조

계정 전체 개인정보 및 프로바이더 설정은 항상 기본 가드레일로 적용됩니다. 추가 가드레일이 요청에 적용될 때 결합 규칙:

| 설정 | 결합 규칙 | 설명 |
| --- | --- | --- |
| **프로바이더 허용 목록** | 교집합 (Intersection) | 모든 가드레일에서 허용된 프로바이더만 사용 가능 |
| **모델 허용 목록** | 교집합 (Intersection) | 모든 가드레일에서 허용된 모델만 사용 가능 |
| **ZDR** | OR 논리 (모델 그룹별) | 어느 하나의 가드레일이라도 해당 스코프에 ZDR을 강제하면 강제됨 |
| **민감 정보** | 합집합 (Union) | 모든 가드레일의 필터가 결합됨. 동일 엔티티가 다른 동작을 가지면 Block이 Redact보다 우선 |
| **예산 한도** | 독립 검사 | 각 가드레일의 예산이 독립적으로 검사됨 |

**핵심 원칙**: 더 엄격한 규칙이 항상 우선합니다.

### 예산 집행 (Budget Enforcement)

가드레일 예산은 **사용자별·키별**로 집행되며, 동일 가드레일을 가진 모든 사용자 간에 공유되지 않습니다.

**예시 1: 멤버 가드레일 $50/일**

Alice, Bob, Carol에게 $50/일 예산 가드레일을 할당하면, 각 멤버에게 독립적인 $50/일 허용량이 부여됩니다. Alice가 $50를 소진해도 Bob과 Carol은 각각 $50까지 사용할 수 있습니다.

**예시 2: API 키 사용량이 멤버 사용량에 누적**

Alice가 두 개의 API 키를 생성하고, 각각 $20/일 한도의 가드레일을 할당합니다. Key A가 $15, Key B가 $10을 소비하면, Alice의 총 멤버 사용량은 $25입니다. Alice에게 $20/일 한도의 멤버 가드레일도 있다면, 합산 사용량($25)이 멤버 한도($20)를 초과하여 요청이 차단됩니다.

**예시 3: 계층화된 가드레일**

Bob에게 $100/일 한도의 멤버 가드레일이 있고, 그의 API 키에 $30/일 한도의 별도 가드레일이 있습니다. 키는 $30/일(자체 한도)만 사용할 수 있지만, Bob의 모든 키를 통한 총 사용량은 $100/일을 초과할 수 없습니다. 두 한도 모두 각 요청에서 독립적으로 검사됩니다.

### 커스텀 콘텐츠 필터

각 가드레일에 **커스텀 콘텐츠 필터 패턴** 목록을 추가할 수 있습니다. 각 패턴은 정규식과 연관된 동작:

| 동작 | 설명 |
| --- | --- |
| **Redact** | 매칭된 구간이 플레이스홀더로 교체된 후 모델에 전달 |
| **Block** | 요청이 모델에 도달하기 전에 `403`으로 거부 |

패턴은 모든 사용자 메시지에 대해 로컬에서 평가되므로 요청에 미미한 지연만 추가됩니다.

#### 지원되는 정규식 기능

| 기능 | 예시 |
| --- | --- |
| 문자 클래스 | `[a-z]`, `\d`, `\w`, `\s` |
| 수량자 | `*`, `+`, `?`, `{n,m}` |
| 교대 (Alternation) | `foo\|bar` |
| 비캡처 그룹 | `(?:...)` |
| 명명된 캡처 그룹 | `(?<name>...)` |
| 앵커 | `^`, `$`, `\b` |
| 이스케이프 시퀀스 | `\.`, `\(`, `\\` |

#### 미지원 정규식 기능

| 미지원 기능 | 이유 |
| --- | --- |
| Lookahead | `(?=...)`, `(?!...)` |
| Lookbehind | `(?<=...)`, `(?<!...)` |
| 과도한 백트래킹 | 중첩 수량자 예: `(a+)+` |

> 패턴당 최대 **100,000자**까지 허용됩니다. 가드레일당 여러 패턴을 설정할 수 있으며, 각각 독립적으로 평가됩니다.

### 요청 차단 시 응답

가드레일의 런타임 검사가 요청을 차단하면 HTTP **403 Forbidden** 응답이 반환됩니다:

```json
{
  "error": {
    "code": 403,
    "message": "Request blocked: prompt injection patterns detected",
    "metadata": {
      "patterns": ["ignore all previous instructions"]
    }
  }
}
```

`X-OpenRouter-Experimental-Metadata: enabled` 헤더를 통해 라우터 메타데이터를 옵트인하면, 403 응답에 라우팅 컨텍스트와 가드레일 파이프라인 단계 정보가 포함됩니다:

```json
{
  "error": {
    "code": 403,
    "message": "Request blocked: prompt injection patterns detected",
    "metadata": {
      "patterns": ["ignore all previous instructions"]
    }
  },
  "openrouter_metadata": {
    "requested": "openai/gpt-4o",
    "strategy": "direct",
    "region": "iad",
    "summary": "available=1",
    "attempt": 1,
    "is_byok": false,
    "endpoints": {
      "total": 1,
      "available": [
        { "provider": "OpenAI", "model": "openai/gpt-4o", "selected": false }
      ]
    },
    "pipeline": [
      {
        "type": "guardrail",
        "name": "regex_pi_detection",
        "guardrail_id": "grd_abc123",
        "guardrail_scope": "api-key",
        "summary": "Blocked: prompt injection detected (1 pattern matched)",
        "data": {
          "action": "blocked",
          "detected": true,
          "engines": ["regex"],
          "patterns": ["ignore all previous instructions"]
        }
      }
    ]
  }
}
```

### 가드레일 API 접근

가드레일은 OpenRouter API를 통해 프로그래밍 방식으로 관리할 수 있습니다. 코드에서 직접 가드레일을 생성, 업데이트, 삭제 및 API 키와 조직 멤버에 할당할 수 있습니다.

---

## 3. 워크스페이스 (Workspaces)

워크스페이스는 OpenRouter 프로젝트를 각각의 API 키, 라우팅 기본값, 가드레일, 관측성 설정을 가진 별도의 환경으로 구성할 수 있게 합니다. 팀, 프로젝트 또는 배포 단계(예: 스테이징 vs 프로덕션)를 단일 계정 아래에 격리합니다.

### 시작하기

기존 OpenRouter 설정은 이미 **Default 워크스페이스**에 있습니다. 모든 API 키, 가드레일, BYOK 프로바이더 키, 라우팅 정책, 프리셋, 플러그인, 관측성 통합이 포함됩니다. 여러 워크스페이스가 필요 없다면 기존대로 작업하면 됩니다.

조직의 경우 모든 멤버가 Default 워크스페이스에 자동으로 추가됩니다.

### 새 워크스페이스 생성

1. 홈 대시보드로 이동
2. 워크스페이스 선택기를 클릭하고 **Create Workspace** 선택
3. 이름과 설명 입력

> 조직 **Admin**만 워크스페이스를 생성하고 삭제할 수 있습니다. Management API를 통해서도 프로그래밍 방식으로 생성 및 관리가 가능합니다.

### 워크스페이스별 독립 설정

각 워크스페이스는 독립적인 설정을 가집니다:

| 설정 | 설명 |
| --- | --- |
| **API Keys** | 모든 API 키는 워크스페이스에 속함. 멤버는 소속된 워크스페이스에 자신의 키 생성 가능. Admin은 개인 사용자가 아닌 워크스페이스 소유 시스템 키 생성 가능 |
| **Guardrails** | 각 워크스페이스에 고유한 가드레일. 계정 수준 정책을 상속하며, 그 제약 내에서 더 제한적인 규칙 추가 가능 |
| **BYOK** | 워크스페이스별 프로바이더 키 설정, 또는 여러 워크스페이스에 동일한 프로바이더 키 공유 |
| **Routing** | 워크스페이스별 프로바이더 라우팅 구성. 비용, 지연, 처리량, 툴 호출 품질 최적화 |
| **Presets** | 시스템 프롬프트, 모델/프로바이더 구성, 요청 파라미터에 대한 단축키 구성 |
| **Plugins** | 각 워크스페이스의 API 요청에 대한 기본 플러그인 동작 구성 |
| **Observability** | 워크스페이스별 관측성 통합 연결, 또는 모든 워크스페이스의 트레이스를 동일한 플랫폼으로 전송 |
| **Members** | 각 워크스페이스에 대한 팀 멤버 접근 제어 |

### 계정 수준 설정

일부 설정은 모든 워크스페이스에 전역으로 적용됩니다:

| 설정 | 설명 |
| --- | --- |
| **Activity & Logs** | 모든 계정 활동 및 로그 열람. 워크스페이스별 필터링 옵션 |
| **Credits & Billing** | 모든 워크스페이스에 대한 통합 빌링 |
| **Organization** | 조직 멤버, 역할, 워크스페이스 할당 관리 |
| **Management Keys** | 모든 워크스페이스에 걸쳐 관리 작업을 수행하는 API 키 |
| **Privacy** | 모든 워크스페이스에 적용되는 계정 수준 데이터 정책 및 프로바이더/모델 제한 |
| **Preferences** | 모든 워크스페이스에 적용되는 계정 기본 설정 |

### 조직 권한 구조

| 역할 | 권한 범위 |
| --- | --- |
| **Org Admin** | 모든 워크스페이스에 admin 권한. 워크스페이스 생성/삭제, 멤버 접근 관리 가능. 모든 워크스페이스의 API 키, 가드레일, BYOK, 라우팅, 프리셋, 플러그인, 관측성, 멤버, 설정 조회 및 관리 |
| **Org Member** | 추가된 각 워크스페이스에 member 권한. 여러 워크스페이스에 소속 가능. 각 워크스페이스의 설정이 해당 워크스페이스의 API 키를 관리. 모든 조직원은 Default 워크스페이스에 자동 접근 |

### 워크스페이스 FAQ

**Q: 워크스페이스 멤버는 무엇을 볼 수 있나요?**

멤버는 워크스페이스 내에서 자신의 API 키를 생성하고 관리할 수 있으며, 다른 멤버와 역할을 조회할 수 있습니다. 계정 수준에서는 Activity와 Logs를 볼 수 있습니다.

**Q: 워크스페이스별로 다른 데이터 정책을 적용할 수 있나요?**

워크스페이스는 계정 수준 데이터 정책과 허용된 프로바이더/모델을 상속합니다. 그 제약 내에서 각 워크스페이스는 더 세분화된 가드레일을 설정할 수 있습니다. 계정 수준 정책이 상한선이며, 개별 워크스페이스는 더 제한적일 수만 있습니다.

**Q: 멤버를 워크스페이스에서 제거하면 어떻게 되나요?**

해당 워크스페이스에 대한 접근이 제거됩니다. 제거 전에 해당 멤버가 생성한 API 키를 먼저 삭제해야 합니다. 다른 워크스페이스에 대한 접근은 영향을 받지 않습니다. 모든 조직원은 조직에 남아있는 한 Default 워크스페이스에 대한 접근을 유지합니다.

---

## 4. Broadcast (관측성)

Broadcast는 OpenRouter 요청의 트레이스를 외부 관측성 및 분석 플랫폼에 자동으로 전송합니다. 애플리케이션 코드에 추가 계측 없이 LLM 사용량을 모니터링, 디버깅, 분석할 수 있습니다.

### Broadcast 활성화

1. **Settings > Observability**로 이동
2. **"Enable Broadcast"** 스위치를 켜기
3. 트레이스를 전송할 대상(Destination)을 하나 이상 추가

> 조직 계정의 경우 **조직 Admin**만 Broadcast 설정을 편집할 수 있습니다.

### 지원 대상 (Destinations)

| 대상 | 설명 |
| --- | --- |
| **Datadog** | 풀스택 모니터링 및 분석 |
| **Langfuse** | 오픈소스 LLM 엔지니어링 플랫폼 |
| **LangSmith** | LangChain 관측성 및 디버깅 |
| **Braintrust** | LLM 평가 및 모니터링 |
| **OpenTelemetry Collector** | OTLP 호환 백엔드로 트레이스 전송 |
| **S3 / S3-Compatible** | S3, R2 또는 호환 스토리지에 트레이스 저장 |
| **Arize AI** | ML 관측성 및 모니터링 |
| **Comet Opik** | LLM 평가 및 테스팅 |
| **Grafana Cloud** | 관측성 및 모니터링 플랫폼 |
| **New Relic** | 풀스택 관측성 플랫폼 |
| **Sentry** | 애플리케이션 모니터링 및 에러 추적 |
| **W&B Weave** | LLM 관측성 및 추적 |
| **PostHog** | 제품 분석 with LLM 추적 |
| **Snowflake** | 클라우드 데이터 웨어하우스 |
| **ClickHouse** | 실시간 분석 데이터베이스 |
| **Webhook** | 커스텀 HTTP 엔드포인트로 트레이스 전송 |

> 대상당 서로 다른 환경에 대해 최대 **5개**까지 동일 유형 대상을 구성할 수 있습니다.

### 트레이스 데이터

각 Broadcast 트레이스에는 다음 정보가 포함됩니다:

| 데이터 | 설명 |
| --- | --- |
| **요청 및 응답 데이터** | 입력 메시지와 모델 출력 (멀티모달 콘텐츠는 효율성을 위해 제거됨) |
| **토큰 사용량** | 프롬프트 토큰, 완성 토큰, 총 토큰 |
| **비용 정보** | 요청의 총 비용 |
| **타이밍** | 요청 시작 시간, 종료 시간, 지연 메트릭 |
| **모델 정보** | 모델 슬러그 및 사용된 프로바이더 이름 |
| **툴 사용** | 요청에 툴이 포함되었는지, 툴 호출이 발생했는지 여부 |

### 선택적 트레이스 데이터

API 요청에 선택적 필드를 포함하여 트레이스를 보강할 수 있습니다:

#### User ID

`user` 필드로 특정 엔드유저와 트레이스를 연결합니다:

```json
{
  "model": "openai/gpt-4o",
  "messages": [{ "role": "user", "content": "Hello, world!" }],
  "user": "user_12345"
}
```

#### Session ID

`session_id` 필드로 관련 요청을 그룹화합니다. `x-session-id` HTTP 헤더로도 전달 가능합니다:

```json
{
  "model": "openai/gpt-4o",
  "messages": [{ "role": "user", "content": "Hello, world!" }],
  "session_id": "session_abc123"
}
```

### 커스텀 메타데이터

`trace` 필드로 임의의 메타데이터를 트레이스에 전달할 수 있습니다:

```json
{
  "model": "openai/gpt-4o",
  "messages": [{ "role": "user", "content": "Summarize this document..." }],
  "trace": {
    "trace_id": "workflow_12345",
    "trace_name": "Document Processing",
    "span_name": "Summarization Step",
    "generation_name": "Generate Summary",
    "environment": "production",
    "feature": "customer-support",
    "version": "1.2.3"
  }
}
```

#### 공통 메타데이터 키

| 키 | 설명 |
| --- | --- |
| `trace_id` | 여러 API 요청을 단일 트레이스로 그룹화. 같은 ID를 사용하면 다단계 워크플로우 추적 가능 |
| `trace_name` | 관측성 플랫폼의 루트 트레이스 커스텀 이름. 미설정 시 모델 이름이 기본값 |
| `span_name` | LLM 작업을 그룹화하는 부모 스팬 생성. 스팬이 생성을 포함하는 계층 구조 생성 |
| `generation_name` | 특정 LLM 생성/호출의 커스텀 이름. 미설정 시 모델 이름이 기본값 |
| `parent_span_id` | OpenRouter 트레이스를 기존 추적 시스템(예: OpenTelemetry)의 스팬 아래에 중첩 |

#### 외부 트레이스 연결

자체 추적 계측(예: OpenTelemetry)이 있는 경우, `parent_span_id`를 사용하여 OpenRouter 호출을 기존 스팬 아래에 중첩할 수 있습니다:

```json
{
  "model": "openai/gpt-4o",
  "messages": [{ "role": "user", "content": "Hello!" }],
  "trace": {
    "trace_id": "your-existing-trace-id",
    "parent_span_id": "your-existing-span-id"
  }
}
```

### API 키 필터링

각 대상은 특정 API 키의 트레이스만 수신하도록 구성할 수 있습니다. API 키를 선택하지 않으면 계정의 모든 API 키 또는 채팅 요청의 트레이스를 수신합니다.

### 샘플링 레이트

각 대상에 샘플링 레이트를 구성하여 전송되는 트레이스의 비율을 제어할 수 있습니다. `1.0`은 모든 트레이스를 전송하고, `0.5`는 약 50%의 트레이스를 전송합니다.

샘플링은 결정적(deterministic)입니다. `session_id`를 제공하면 해당 세션의 모든 트레이스가 일관되게 포함되거나 제외됩니다. 대상별로 전체 세션이 표시되지만, 모든 대상에서 동일한 세션이 표시되는 것은 아닙니다.

### 프라이버시 모드 (Privacy Mode)

각 대상에 **Privacy Mode**를 선택적으로 활성화하면 트레이스에서 프롬프트와 완성 콘텐츠가 제외됩니다. 활성화 시 다음 데이터가 전송 전에 제거됩니다:

- **입력 메시지** (모델에 전송된 프롬프트)
- **출력 선택 항목** (모델이 반환한 완성)

토큰 수, 비용, 타이밍, 모델 정보, 커스텀 메타데이터 등 다른 모든 트레이스 데이터는 정상적으로 전송됩니다.

> Privacy Mode는 **대상별**로 구성됩니다. 한 대상에는 전체 트레이스를 보내고, 다른 대상에는 프라이버시가 적용된 트레이스를 보낼 수 있습니다.

---

## 5. 서비스 티어 (Service Tiers)

`service_tier` 파라미터를 통해 OpenRouter 요청의 비용과 지연 시간 간 트레이드오프를 제어할 수 있습니다. 요청에서 특정 처리 티어를 선택하면, 응답에 실제로 사용된 티어가 표시됩니다. 실제 제공된 티어의 요금으로 청구됩니다.

### 사용 방법

요청 본문에 `service_tier`를 최상위 파라미터로 전달합니다:

```json
{
  "model": "openai/gpt-5",
  "messages": [{ "role": "user", "content": "Hello" }],
  "service_tier": "flex"
}
```

| 값 | 설명 |
| --- | --- |
| `flex` | 더 낮은 비용, 더 높은 지연 시간. 예: OpenAI gpt-5의 경우 약 50% 할인 |
| `priority` | 더 빠른 응답, 더 높은 비용 |

### 지원 프로바이더

| 프로바이더 | 가능한 응답 값 | 비고 |
| --- | --- | --- |
| **OpenAI** | `default`, `flex`, `priority` | Chat Completions 및 Responses API 지원 |
| **Google (Vertex AI)** | `standard`, `flex`, `priority` | Google Flex 및 Priority 문서 참조 |
| **Google (AI Studio)** | `standard`, `flex`, `priority` | Google Flex 및 Priority 문서 참조 |

### API 응답 형식 차이

응답의 `service_tier` 필드 위치는 API 형식에 따라 다릅니다:

| API | 필드 위치 |
| --- | --- |
| **Chat Completions** (`/api/v1/chat/completions`) | 응답 객체 **최상위** |
| **Responses API** (`/api/v1/responses`) | 응답 객체 **최상위** |
| **Messages API** (`/api/v1/messages`) | **`usage` 객체 내부** |

---

## 6. 주권 AI (Sovereign AI)

주권 AI(Sovereign AI)는 국가나 지역이 자체 인프라와 규제 프레임워크 내에서 AI 시스템을 개발, 배포, 제어할 수 있는 능력을 의미합니다. AI가 핵심 인프라가 됨에 따라, 정부와 기업은 AI 워크로드(처리하는 데이터 포함)가 특정 지리적, 관할적 경계 내에 머물도록 요구합니다.

### 주권 AI가 중요한 이유

| 요인 | 설명 |
| --- | --- |
| **규제 준수** | EU AI Act, GDPR, 산업별 규칙(의료, 금융, 국방)이 데이터 처리 및 저장 위치에 엄격한 요구사항 부과 |
| **데이터 거주 및 개인정보** | 민감한 데이터(개인, 금융, 분류 정보)가 특정 관할구역을 법적/윤리적으로 떠나지 않아야 함 |

### EU 인-리전 라우팅

엔터프라이즈 고객을 위해 OpenRouter는 EU 인-리전 라우팅을 지원합니다. 활성화 시 요청이 지정된 지역 내에서만 복호화되며, 해당 지역에서 운영되는 프로바이더로만 라우팅됩니다. 프롬프트와 완성은 EU 내에서만 처리됩니다.

#### EU 전용 베이스 URL 사용

```typescript
import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
  apiKey: '<YOUR_API_KEY>',
  serverURL: 'https://eu.openrouter.ai/api/v1',
});

const completion = await openRouter.chat.send({
  model: 'meta-llama/llama-3.3-70b-instruct',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: false,
});
```

#### EU 전용 모델 목록 확인

- EU 도메인을 통해 `/api/v1/models`를 호출하여 프로그래밍 방식으로 전체 목록 조회
- 모델 페이지에서 **In-Region Routing** 필터를 사용하여 EU 지원 모델 탐색

> EU 인-리전 라우팅은 엔터프라이즈 고객에게 요청 시 제공됩니다. 활성화를 위해 엔터프라이즈 팀에 문의하세요.

### Zero Data Retention (ZDR)

ZDR은 프로바이더가 프롬프트나 응답을 저장하지 않음을 보장합니다. 주권 AI의 핵심 구성 요소로, 요청 완료 후 데이터가 제어 밖에서 유지되지 않음을 보장합니다.

ZDR 강제 방법:

| 방법 | 설명 |
| --- | --- |
| **계정 수준** | 개인정보 설정에서 전체 계정에 적용 |
| **가드레일** | 가드레일 설정에서 모델 그룹별 적용 |
| **요청별** | 요청 본문에서 `provider.zdr` 파라미터 사용 |

요청별 ZDR 강제 예시:

```json
{
  "model": "meta-llama/llama-3.3-70b-instruct",
  "messages": [{ "role": "user", "content": "Hello" }],
  "provider": {
    "zdr": true
  }
}
```

### 데이터 수집 제어

`data_collection` 파라미터로 프로바이더의 데이터 수집 여부를 제어합니다:

```json
{
  "provider": {
    "data_collection": "deny"
  }
}
```

`"deny"`로 설정하면 사용자 데이터를 수집하지 않는 프로바이더로만 라우팅됩니다. 이 설정은 개인정보 설정에서 계정 전체 기본값으로도 구성할 수 있습니다.

### 주권 AI 스택 구성

OpenRouter의 기능을 조합하여 완전한 주권 AI 배포를 구성할 수 있습니다:

1. **EU 인-리전 라우팅 활성화** - 모든 데이터를 EU 내에 유지
2. **ZDR 강제** - 프로바이더의 데이터 보존 방지
3. **데이터 수집 거부** - 데이터 학습 방지

이를 통해 개별 지역 프로바이더와의 관계 관리 복잡성 없이, 단일 API와 통합 빌링으로 데이터 거주, 개인정보, 규정 준수에 대한 완전한 제어를 유지할 수 있습니다.

---

## 7. API 키 관리 (API Key Management)

엔터프라이즈 배포에서는 자동화된 프로비저닝, 회전, 수명 주기 관리를 위한 프로그래밍 방식 API 키 관리가 필요합니다.

### Management API 키

Management API 키를 생성하면 API 키를 프로그래밍 방식으로 관리할 수 있습니다. 다음이 가능합니다:

| 기능 | 설명 |
| --- | --- |
| **자동 키 생성** | 고객 인스턴스를 위한 자동화된 키 생성 |
| **프로그래밍 방식 키 회전** | 보안 규정 준수를 위한 자동화된 키 회전 |
| **사용량 모니터링** | 자동 한도 집행을 포함한 사용량 모니터링 |

### API 키 회전 (Key Rotation)

정기적인 키 회전은 손상된 자격 증명의 영향을 제한합니다. OpenRouter Management API는 **다운타임 없는 회전**을 지원합니다:

1. **새 키 생성**
2. **애플리케이션 업데이트**
3. **이전 키 삭제**

BYOK(Bring Your Own Key)를 사용하는 경우, 프로바이더 자격 증명을 건드리지 않고 OpenRouter API 키만 회전할 수 있어 키 관리가 간소화됩니다.

### 사용자 추적 (User Tracking)

API 요청에 `user` 파라미터를 포함하여 엔드유저를 추적할 수 있습니다:

- 캐싱 성능 향상 (사용자별 고정 라우팅)
- 활동 피드 및 익스포트에서 사용자 수준 분석 활성화

---

## 8. 엔터프라이즈 퀵스타트 체크리스트

### 1단계: 조직 설정

| 작업 | 경로 |
| --- | --- |
| 조직 생성 | Settings > Preferences > Create Organization |
| 팀원 초대 | 조직 설정에서 멤버 초대 |
| 공유 크레딧 구성 | Admin만 크레딧 구매 가능 |

### 2단계: API 키 관리 구성

| 작업 | 설명 |
| --- | --- |
| Management API 키 생성 | 프로그래밍 방식 관리 활성화 |
| 키 회전 전략 수립 | 다운타임 없는 회전 프로세스 설정 |
| BYOK 구성 (선택) | 프로바이더 자격 증명 분리 관리 |

### 3단계: 보안 통제 구현

| 작업 | 설명 |
| --- | --- |
| 가드레일 생성 | 지출 한도, 모델/프로바이더 허용 목록 설정 |
| ZDR 강제 | 민감 워크로드에 대한 Zero Data Retention 구성 |
| 커스텀 콘텐츠 필터 | 정규식 패턴으로 PII 및 민감 정보 보호 |
| 보안 기능 활성화 | 프롬프트 인젝션 및 탈옥 방지 |

### 4단계: 관측성 설정

| 작업 | 설명 |
| --- | --- |
| Broadcast 활성화 | Settings > Observability |
| 대상 구성 | Langfuse, Datadog, LangSmith 등 |
| API 키 필터링 | 환경별 트레이스 라우팅 |
| 샘플링 레이트 설정 | 비용/데이터 볼륨 최적화 |

### 5단계: 사용량 및 비용 모니터링

| 작업 | 설명 |
| --- | --- |
| 사용량 계정 확인 | API 응답의 토큰 수, 비용, 타이밍 데이터 활용 |
| 활동 익스포트 | Activity 페이지에서 CSV/PDF 익스포트 |
| User Tracking | `user` 파라미터로 사용자 수준 분석 |

### 6단계: 안정성 최적화

| 작업 | 설명 |
| --- | --- |
| 프로바이더 라우팅 구성 | 비용, 지연, 프로바이더 기본 설정 기반 라우팅 |
| 폴백 체인 설정 | 다중 모델 지정으로 자동 장애 조치 |
| 서비스 티어 활용 | flex/priority 티어로 비용-지연 트레이드오프 제어 |

> 엔터프라이즈 영업 문의나 맞춤 요구사항은 openrouter.ai/enterprise에서 연락하세요.

---

## 관련 문서

- [01-quickstart.md](01-quickstart.md) - API 기본 사용법
- [07-model-routing.md](07-model-routing.md) - 모델 라우팅 및 폴백
- [08-provider-selection.md](08-provider-selection.md) - 프로바이더 선택
- [14-rate-limits.md](14-rate-limits.md) - 속도 제한 및 사용량 관리
- [15-privacy.md](15-privacy.md) - 개인정보 및 데이터 처리
- [12-presets.md](12-presets.md) - 프리셋 구성
- [09-plugins.md](09-plugins.md) - 플러그인 시스템
