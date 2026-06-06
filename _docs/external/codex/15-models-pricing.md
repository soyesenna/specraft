# Codex CLI - 모델 및 요금

> **원문**
> - Models: https://developers.openai.com/codex/models
> - Pricing: https://developers.openai.com/codex/pricing
> - Speed: https://developers.openai.com/codex/speed

---

## 목차

1. [지원 모델 목록](#1-지원-모델-목록)
2. [모델별 특징 및 권장 용도](#2-모델별-특징-및-권장-용도)
3. [Fast mode](#3-fast-mode)
4. [Codex-Spark](#4-codex-spark)
5. [Deprecated 모델](#5-deprecated-모델)
6. [요금제](#6-요금제)
7. [크레딧 레이트 카드](#7-크레딧-레이트-카드)
8. [플랜별 기능 매트릭스](#8-플랜별-기능-매트릭스)
9. [세션 중 모델 전환](#9-세션-중-모델-전환)

---

## 1. 지원 모델 목록

| 모델 | 유형 | CLI & SDK | App & IDE | Cloud | ChatGPT Credits | API Access |
|---|---|---|---|---|---|---|
| `gpt-5.5` | 최신 프론티어 | 지원 | 지원 | 지원 | 지원 | 지원 |
| `gpt-5.4` | 범용 프론티어 | 지원 | 지원 | 지원 | 지원 | 지원 |
| `gpt-5.4-mini` | 경량 모델 | 지원 | 지원 | 지원 | 지원 | 지원 |
| `gpt-5.3-codex-spark` | 고속 전용 (research preview) | 지원 | 지원 | 지원 | 지원 | -- |

대부분의 작업에서는 `gpt-5.5`에서 시작하는 것을 권장한다. 더 빠르고 저렴한 작업이나 subagent 용도로는 `gpt-5.4-mini`를 사용한다.

---

## 2. 모델별 특징 및 권장 용도

### gpt-5.5

OpenAI의 최신 프론티어 모델로, 복잡한 코딩, computer use, 지식 작업 및 연구 워크플로우에 최적화되어 있다. GPT-5.4와 동등한 결과를 내기 위해 훨씬 적은 토큰을 소비하며, 실행 속도도 더 빠르고 대부분의 사용자에게 더 높은 품질을 제공한다.

```bash
codex -m gpt-5.5
```

- **권장 용도**: 복잡한 코딩, computer use, 지식 작업, 연구 워크플로우
- **특징**: GPT-5.4 대비 적은 토큰 소비, 더 빠른 실행 속도, 더 높은 품질

### gpt-5.4

프로페셔널 작업용 플래그십 프론티어 모델이다. 강력한 코딩, 추론, 도구 사용 및 에이전트 워크플로우 기능을 갖추고 있다.

```bash
codex -m gpt-5.4
```

- **권장 용도**: 전문적인 코딩 및 추론 작업, 도구 사용이 많은 워크플로우
- **특징**: 강력한 코딩/추론/도구 사용/에이전트 워크플로우

### gpt-5.4-mini

빠르고 효율적인 미니 모델로, 반응성이 중요한 코딩 작업과 subagent에 적합하다.

```bash
codex -m gpt-5.4-mini
```

- **권장 용도**: 가벼운 코딩 작업, subagent, 빠른 반응이 필요한 작업
- **특징**: 빠른 속도, 낮은 비용, 높은 사용량 한도

### gpt-5.3-codex-spark

텍스트 전용 research preview 모델로, 거의 즉각적인 실시간 코딩 반복에 최적화되어 있다. ChatGPT Pro 사용자만 사용할 수 있다.

```bash
codex -m gpt-5.3-codex-spark
```

- **권장 용도**: 실시간 코딩 반복, 빠른 피드백 루프
- **특징**: 텍스트 전용, 초고속 응답, ChatGPT Pro 전용, 전용 저지연 하드웨어
- **제한**: research preview 상태로, 수요에 따라 사용량 한도가 조정될 수 있음

---

## 3. Fast mode

Fast mode는 지원 모델의 속도를 높이는 기능으로, 크레딧 소비율이 증가한다.

### 지원 모델 및 크레딧 배율

| 모델 | 속도 향상 | 크레딧 소비율 (Standard 대비) |
|---|---|---|
| `gpt-5.5` | 1.5x | 2.5x |
| `gpt-5.4` | 1.5x | 2.0x |

- Fast mode는 모델을 변경하지 않고 동일한 모델을 더 빠르게 실행한다.
- Fast mode는 Codex IDE extension, CLI, App에서 ChatGPT 로그인 시 사용할 수 있다.
- API Key 인증에서는 Fast mode 크레딧을 사용할 수 없으며, 표준 API 가격이 적용된다.

### CLI에서 Fast mode 제어

```bash
# Fast mode 켜기
/fast on

# Fast mode 끄기
/fast off

# 현재 상태 확인
/fast status
```

### config.toml에서 기본값 설정

```toml
service_tier = "fast"

[features]
fast_mode = true
```

---

## 4. Codex-Spark

GPT-5.3-Codex-Spark는 Fast mode와 달리 별도의 모델이다. Fast mode가 지원 모델의 속도를 높이는 것이라면, Codex-Spark는 자체적인 모델이며 자체 사용량 한도를 가진다.

| 항목 | 내용 |
|---|---|
| 모델명 | `gpt-5.3-codex-spark` |
| 유형 | 텍스트 전용 (research preview) |
| 최적화 | 거의 즉각적인 실시간 코딩 반복 |
| 가용성 | ChatGPT Pro 구독자 전용 |
| API | 런칭 시점에 API 미지원 |
| 하드웨어 | 전문 저지연 하드웨어에서 실행 |
| 사용량 | 수요에 따라 조정되는 별도 한도 적용 |

---

## 5. Deprecated 모델

다음 모델은 ChatGPT 로그인 시 Codex에서 더 이상 사용되지 않는다(deprecated).

| 모델 | 상태 | 비고 |
|---|---|---|
| `gpt-5.2` | Deprecated (ChatGPT 로그인) | API에서는 여전히 사용 가능할 수 있음 |
| `gpt-5.3-codex` | Deprecated (ChatGPT 로그인) | API에서는 여전히 사용 가능할 수 있음 |

스크립트, 구성 파일 또는 `codex exec --model` 명령에서 deprecated 모델을 참조하는 경우 최신 모델로 업데이트해야 한다. API Key 인증을 사용하고 특정 deprecated 모델에 의존하는 워크플로우가 있는 경우, API 모델 페이지에서 현재 가용성을 확인하라.

---

## 6. 요금제

### 개인 요금제

| 플랜 | 월 요금 | 설명 |
|---|---|---|
| **Free** | $0 | 빠른 코딩 작업으로 Codex 기능 탐색 |
| **Go** | $8/month | 가벼운 코딩 작업에 Codex 사용 |
| **Plus** | $20/month | 주당 몇 차례 집중 코딩 세션 운영 |
| **Pro** | $100/month~ | Plus 대비 5x 또는 20x 높은 사용량 |

### 비즈니스 / 엔터프라이즈 요금제

| 플랜 | 요금 | 설명 |
|---|---|---|
| **Business** | 종량제 | 스타트업 및 성장 기업용 |
| **Enterprise & Edu** | 영업팀 문의 | 조직 전체를 위한 엔터프라이즈급 기능 |
| **API Key** | 토큰 사용량 기반 | CI 등 공유 환경의 자동화에 적합 |

### Plus 플랜 세부 내용

- Codex web, CLI, IDE extension, iOS에서 사용
- 자동 코드 리뷰, Slack 연동 등 클라우드 기반 통합
- 최신 모델 포함: GPT-5.5, GPT-5.4, GPT-5.3-Codex
- GPT-5.4-mini로 일상적인 로컬 메시지에 더 높은 사용량 한도
- ChatGPT credits로 유연하게 사용량 확장
- Plus 플랜의 다른 ChatGPT 기능 포함

### Pro 플랜 세부 내용

Plus의 모든 기능과 더불어:

- GPT-5.3-Codex-Spark (research preview) 접근 권한
- Plus 대비 5x 또는 20x 높은 Codex 사용량
- Pro 플랜의 다른 ChatGPT 기능 포함

### API Key 플랜 세부 내용

- Codex CLI, SDK, IDE extension에서 사용
- 클라우드 기반 기능 미포함 (GitHub 코드 리뷰, Slack 등)
- 신규 모델(GPT-5.3-Codex, GPT-5.3-Codex-Spark 등)에 대한 지연 접근
- 사용한 토큰에 대해서만 API 가격으로 결제

### Business 플랜 세부 내용

Plus의 모든 기능과 더불어:

- 팀 필요에 따라 표준 또는 사용량 기반 Codex 좌석 할당
- 클라우드 작업 실행을 위한 더 큰 가상 머신
- ChatGPT credits로 유연한 사용량 확장
- SAML SSO, MFA를 갖춘 안전한 전용 워크스페이스
- 비즈니스 데이터에 대한 기본 학습 미사용

### Enterprise & Edu 플랜 세부 내용

Business의 모든 기능과 더불어:

- 우선 요청 처리
- SCIM, EKM, 사용자 분석, 도메인 인증, RBAC 포함 엔터프라이즈급 보안 및 제어
- Compliance API를 통한 감사 로그 및 사용량 모니터링
- 데이터 보존 및 데이터 거주지 제어

---

## 7. 크레딧 레이트 카드

크레딧 사용량은 API 토큰 기반 요금으로 계산된다. 입력 토큰, 캐시된 입력 토큰, 출력 토큰에 대해 각각 크레딧이 소비된다.

### 텍스트 모델

| 모델 | 입력 토큰 (credits/1M tokens) | 캐시된 입력 토큰 (credits/1M tokens) | 출력 토큰 (credits/1M tokens) |
|---|---|---|---|
| GPT-5.5 | 125 | 12.50 | 750 |
| GPT-5.4 | 62.50 | 6.250 | 375 |
| GPT-5.4-mini | 18.75 | 1.875 | 113 |
| GPT-5.3-Codex | 43.75 | 4.375 | 350 |
| GPT-5.2 | 43.75 | 4.375 | 350 |
| GPT-5.3-Codex-Spark | research preview | -- | -- |

### 이미지 모델

| 모델 | 입력 토큰 (credits/1M tokens) | 캐시된 입력 토큰 (credits/1M tokens) | 출력 토큰 (credits/1M tokens) |
|---|---|---|---|
| GPT-Image-2 (image) | 200 | 50 | 750 |
| GPT-Image-2 (text) | 125 | 31.25 | 250 |

### 참고 사항

- GPT-5.5 사용량은 메시지당 평균 5-45 크레딧을 소비한다.
- Fast mode는 지원 모델에 대해 더 높은 크레딧 소비율을 적용한다.
- Cloud tasks 및 Code review는 GPT-5.3-Codex에서 실행된다.
- 이미지 생성은 유사한 턴보다 평균 3-5배 더 빠르게 포함 한도를 소비한다.

### Fast mode 크레딧 배율

| 모델 | Standard 대비 크레딧 소비율 |
|---|---|
| GPT-5.5 | 2.5x |
| GPT-5.4 | 2.0x |

---

## 8. 플랜별 기능 매트릭스

### 사용량 한도 (5시간 윈도우 기준)

#### Plus

| 모델 | 로컬 메시지 / 5h | Cloud Tasks / 5h | Code Reviews / 5h |
|---|---|---|---|
| GPT-5.5 | 15-80 | 사용 불가 | 사용 불가 |
| GPT-5.4 | 20-100 | 사용 불가 | 사용 불가 |
| GPT-5.4-mini | 60-350 | 사용 불가 | 사용 불가 |
| GPT-5.3-Codex | 30-150 | 10-60 | 20-50 |

#### Pro 5x

| 모델 | 로컬 메시지 / 5h | Cloud Tasks / 5h | Code Reviews / 5h |
|---|---|---|---|
| GPT-5.5 | 80-400 | 사용 불가 | 사용 불가 |
| GPT-5.4 | 100-500 | 사용 불가 | 사용 불가 |
| GPT-5.4-mini | 300-1750 | 사용 불가 | 사용 불가 |
| GPT-5.3-Codex | 150-750 | 50-300 | 100-250 |

#### Pro 20x

| 모델 | 로컬 메시지 / 5h | Cloud Tasks / 5h | Code Reviews / 5h |
|---|---|---|---|
| GPT-5.5 | 300-1600 | 사용 불가 | 사용 불가 |
| GPT-5.4 | 400-2000 | 사용 불가 | 사용 불가 |
| GPT-5.4-mini | 1200-7000 | 사용 불가 | 사용 불가 |
| GPT-5.3-Codex | 600-3000 | 200-1200 | 400-1000 |

#### Business

| 모델 | 로컬 메시지 / 5h | Cloud Tasks / 5h | Code Reviews / 5h |
|---|---|---|---|
| GPT-5.5 | 15-80 | 사용 불가 | 사용 불가 |
| GPT-5.4 | 20-100 | 사용 불가 | 사용 불가 |
| GPT-5.4-mini | 60-350 | 사용 불가 | 사용 불가 |
| GPT-5.3-Codex | 30-150 | 10-60 | 20-50 |

#### API Key

| 모델 | 로컬 메시지 / 5h | Cloud Tasks / 5h | Code Reviews / 5h |
|---|---|---|---|
| GPT-5.5 | 사용 불가 | 사용 불가 | 사용 불가 |
| GPT-5.4 | 사용량 기반 | 사용 불가 | 사용 불가 |
| GPT-5.4-mini | 사용량 기반 | 사용 불가 | 사용 불가 |
| GPT-5.3-Codex | 사용량 기반 | 사용 불가 | 사용 불가 |

> 로컬 메시지와 Cloud Tasks의 사용량 한도는 **5시간 윈도우**를 공유한다. 추가 주간 한도가 적용될 수 있다. Enterprise/Edu 사용자(유연한 가격제)는 고정 사용량 한도가 없으며, 사용량이 크레딧에 따라 확장된다. 유연한 가격제가 없는 Enterprise 및 Edu 플랜은 대부분의 기능에서 Plus와 동일한 좌석당 사용량 한도를 가진다.

### 기능 가용성

| 기능 | Plus | Pro | Business | Enterprise / Edu | API Key |
|---|---|---|---|---|---|
| **접근 및 서비스** | | | | | |
| Codex web | O | O | O | O | -- |
| Codex app (로컬 작업) | O | O | O | O | O |
| Codex CLI | O | O | O | O | O |
| IDE extension | O | O | O | O | O |
| Codex SDK / `codex exec` | O | O | O | O | O |
| 자동화 액세스 토큰 | -- | -- | O | O | -- |
| **모델 및 멀티모달** | | | | | |
| Fast mode | O | O | O | O | O |
| Codex-Spark research preview | -- | O | -- | -- | -- |
| 이미지 생성 및 편집 | O | O | O | O | O |
| 음성 받아쓰기 | O | O | O | O | -- |
| 웹 검색 | O | O | O | O | O |
| **로컬 기능** | | | | | |
| `/review` 로컬 코드 리뷰 | O | O | O | O | O |
| 승인 요청 자동 리뷰 | O | O | O | O | O |
| 샌드박싱 및 권한 제어 | O | O | O | O | O |
| 프로젝트 자동화 | O | O | O | O | O |
| Automations | O | O | O | O | O |
| Worktrees 및 내장 Git 도구 | O | O | O | O | O |
| 로컬 환경 및 반복 가능한 작업 | O | O | O | O | O |
| Appshots | O | O | O | -- | O |
| **브라우저 및 원격 제어** | | | | | |
| 인앱 브라우저 미리보기 | O | O | O | O | O |
| Browser Use 자동화 | 제한* | 제한* | 제한* | 제한* | 제한* |
| Chrome extension 브라우저 제어 | 제한* | 제한* | 제한* | 제한* | 제한* |
| Computer Use | 제한* | 제한* | 제한* | 제한* | 제한* |
| SSH 원격 연결 | O | O | O | O | O |
| 모바일 원격 제어 | O | O | O | O | -- |
| **커스터마이징 및 확장** | | | | | |
| `AGENTS.md` 커스텀 명령 | O | O | O | O | O |
| Skills | O | O | O | O | O |
| Plugins | O | O | O | O | 제한* |
| Plugin 공유 | O | O | O | O | -- |
| App connectors | O | O | O | O | -- |
| MCP | O | O | O | O | O |
| Subagents 및 커스텀 에이전트 | O | O | O | O | O |
| Memories | 제한* | 제한* | 제한* | 제한* | 제한* |
| Chronicle | -- | 제한* | -- | -- | -- |
| **클라우드 및 통합** | | | | | |
| Codex cloud tasks | O | O | O | O | -- |
| Cloud 환경 및 설정 스크립트 | O | O | O | O | -- |
| Cloud 에이전트 인터넷 액세스 제어 | O | O | O | O | -- |
| Sites | -- | -- | O | O | -- |
| GitHub `@codex` 이슈/PR 위임 | O | O | O | O | -- |
| GitHub 코드 리뷰 및 자동 PR 리뷰 | O | O | O | O | -- |
| Slack 클라우드 통합 | O | O | O | O | -- |
| Linear 클라우드 통합 | O | O | O | O | -- |
| **관리, 보안 및 분석** | | | | | |
| SAML SSO, MFA, 워크스페이스 관리 | -- | -- | O | O | -- |
| `requirements.toml` 관리형 구성 | O | O | O | O | O |
| Cloud 관리 구성 정책 | -- | -- | O | O | -- |
| Codex RBAC 및 커스텀 역할 | -- | -- | -- | O | -- |
| SCIM, EKM, 도메인 인증 | -- | -- | -- | O | -- |
| 엔터프라이즈 보존 및 거주지 제어 | -- | -- | -- | O | -- |
| API/비즈니스 데이터 학습 미사용 | -- | -- | O | O | O |
| Analytics 대시보드 | -- | -- | -- | O | -- |
| Analytics API | -- | -- | -- | O | -- |
| Compliance API 및 감사 로그 | -- | -- | -- | O | -- |
| Codex Security (GitHub 연결) | -- | -- | -- | O | -- |

> \* 제한* 표시는 특정 지역으로 제한되는 기능이다. 개별 기능 문서에서 지리적 제한에 대한 자세한 내용을 확인하라. Plugins의 경우 일부 자사(first-party) 플러그인이 API Key에서 사용 불가하다.

---

## 9. 세션 중 모델 전환

### `/model` 명령어

CLI에서 활성 스레드 중에 모델을 변경할 수 있다.

```
/model gpt-5.4-mini
```

### `--model` / `-m` 플래그

새 CLI 스레드를 특정 모델로 시작하거나 `codex exec`의 모델을 지정한다.

```bash
codex -m gpt-5.4-mini
codex exec --model gpt-5.4-mini "lint 오류를 수정해줘"
```

### config.toml 기본 모델 설정

```toml
model = "gpt-5.5"
```

구성 파일에 `model` 항목을 추가하여 기본 모델을 지정한다. 지정하지 않으면 Codex가 권장 모델을 기본값으로 사용한다.

### IDE Extension에서 모델 선택

IDE extension에서는 입력 상자 아래의 모델 선택기를 사용하여 모델을 선택할 수 있다.

### Cloud Tasks의 모델

현재 Codex Cloud Tasks에서는 기본 모델을 변경할 수 없다.

### 사용량 한도 연장 팁

사용량 한도를 오래 유지하기 위한 방법:

- **프롬프트 크기 제어**: 불필요한 컨텍스트를 제거하고 정확한 지시만 포함
- **`AGENTS.md` 크기 축소**: 리포지토리 내에 중첩하여 주입 컨텍스트 양 제어
- **MCP 서버 수 제한**: 사용하지 않는 MCP 서버 비활성화
- **소형 모델로 전환**: GPT-5.4 또는 GPT-5.4-mini를 사용하여 로컬 메시지 사용량 한도 연장
