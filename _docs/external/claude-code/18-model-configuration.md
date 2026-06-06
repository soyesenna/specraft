# 18. 모델 구성 (Model Configuration)

> **원문**: [Model configuration](https://code.claude.com/docs/en/model-config) | [Fast mode](https://code.claude.com/docs/en/fast-mode) | [Context window](https://code.claude.com/docs/en/context-window) | [Prompt caching](https://code.claude.com/docs/en/prompt-caching)

---

## 모델 별칭 (Model Aliases)

| 별칭 | 동작 |
|------|------|
| `default` | 모델 재정의를 지우고 계정 유형에 맞는 권장 모델로 되돌림. 모델 별칭 자체는 아님 |
| `best` | 사용 가능한 가장 강력한 모델 사용 (현재 `opus`와 동일) |
| `sonnet` | 최신 Sonnet 모델 사용 (일상적인 코딩 작업) |
| `opus` | 최신 Opus 모델 사용 (복잡한 추론 작업) |
| `haiku` | 빠르고 효율적인 Haiku 모델 사용 |
| `sonnet[1m]` | Sonnet + 100만 토큰 컨텍스트 윈도우 |
| `opus[1m]` | Opus + 100만 토큰 컨텍스트 윈도우 |
| `opusplan` | Plan 모드에서는 `opus`, 실행 모드에서는 `sonnet`으로 자동 전환 |

**프로바이더별 해석**: Anthropic API에서 `opus`는 Opus 4.8, `sonnet`은 Sonnet 4.6으로 해석됨. Claude Platform on AWS에서는 Opus 4.7 / Sonnet 4.6. Bedrock, Vertex, Foundry에서는 Opus 4.6 / Sonnet 4.5. 최신 버전을 사용하려면 전체 모델 이름을 직접 지정하거나 `ANTHROPIC_DEFAULT_OPUS_MODEL` 등의 환경변수를 설정.

---

## 모델 설정 방법 (우선순위 순)

| 방법 | 설명 |
|------|------|
| 세션 중 | `/model <별칭|이름>` 으로 즉시 전환. 인자 없이 `/model` 시 피커 열림 |
| 시작 시 | `claude --model <별칭|이름>` |
| 환경변수 | `ANTHROPIC_MODEL=<별칭|이름>` |
| 설정 파일 | `model` 필드로 영구 구성 |

v2.1.153부터 `/model`은 사용자 설정에 기본값으로 저장됨. 피커에서 `Enter`: 전환 + 기본값 저장, `s`: 이번 세션만 전환. v2.1.144~v2.1.152에서는 `/model`이 현재 세션에만 적용되었으며 피커에서 `d`로 기본값을 저장했음.

이력이 있는 대화에서 모델을 바꾸면 캐시된 컨텍스트 없이 전체 이력을 재처리하므로 확인 메시지가 표시됨.

`--model` 플래그와 `ANTHROPIC_MODEL` 환경변수는 해당 세션에만 적용됨. 여러 터미널에서 동시에 다른 모델을 실행하려면 `/model` 대신 각각 `--model` 플래그로 실행.

`claude --resume`, `--continue`, `/resume` 피커로 시작한 재개 세션은 트랜스크립트 저장 시 사용 중이던 모델을 유지함. 현재 `model` 설정과 무관. 해당 모델이 은퇴한 경우 일반 우선순위로 폴백.

시작 시 활성 모델이 프로젝트 또는 관리 설정에서 온 경우 시작 헤더에 어떤 설정 파일이 지정했는지 표시됨. `/model`로 재정의 가능, 다음 실행 시 프로젝트/관리 설정이 다시 적용됨.

```bash
# Opus로 시작
claude --model opus

# 세션 중 Sonnet으로 전환
/model sonnet
```

---

## 기본 모델 동작 (Default Model Behavior)

| 계정 유형 | 기본 모델 |
|-----------|-----------|
| Max, Team Premium, Enterprise pay-as-you-go, Anthropic API | Opus 4.8 |
| Claude Platform on AWS | Opus 4.7 |
| Pro, Team Standard, Enterprise 구독 시트 | Sonnet 4.6 |
| Bedrock, Vertex, Foundry | Sonnet 4.5 |

Enterprise pay-as-you-go는 구독 시트가 아닌 사용량 기반 과금 Enterprise 조직을 의미함.

Opus 사용량 한도에 도달하면 Sonnet으로 자동 폴백될 수 있음.

---

## 모델 선택 제한 (Restrict Model Selection)

엔터프라이즈 관리자는 `availableModels` 설정으로 사용자가 선택할 수 있는 모델을 제한할 수 있음.

```json
{
  "availableModels": ["sonnet", "haiku"]
}
```

`default` 옵션은 `availableModels`의 영향을 받지 않으며 항상 사용 가능.

완전한 모델 제어를 위한 3가지 설정 조합:
- `availableModels`: 전환 가능한 모델 제한
- `model`: 세션 시작 시 초기 모델 설정
- `ANTHROPIC_DEFAULT_SONNET_MODEL` / `ANTHROPIC_DEFAULT_OPUS_MODEL` / `ANTHROPIC_DEFAULT_HAIKU_MODEL`: `default` 옵션이 해석되는 대상 제어

**Merge 동작**: `availableModels`가 여러 수준(예: 사용자 설정 + 프로젝트 설정)에서 설정된 경우 배열이 병합되고 중복 제거됨. 엄격한 허용 목록을 적용하려면 최우선 순위인 managed 또는 policy 설정에서 `availableModels`를 설정.

---

## Mantle 모델 IDs

Bedrock Mantle 엔드포인트가 활성화된 경우, `availableModels`에서 `anthropic.`으로 시작하는 항목은 `/model` 피커에 커스텀 옵션으로 추가되어 Mantle 엔드포인트로 라우팅됨. 이는 서드파티 배포 모델 고정에서 설명하는 alias-only 매칭의 예외임. 설정은 여전히 피커를 나열된 항목으로 제한하므로, Mantle IDs와 함께 표준 alias도 포함해야 함.

---

## opusplan 모델 설정

`opusplan`은 자동 하이브리드 접근 방식:
- **Plan 모드**: `opus` 사용 (복잡한 추론, 아키텍처 결정)
- **실행 모드**: `sonnet`으로 자동 전환 (코드 생성, 구현)

Plan 모드 Opus 단계는 표준 200K 컨텍스트 윈도우로 실행됨. 자동 1M 업그레이드는 `opus` 설정에만 적용되며 `opusplan`에는 확장되지 않음.

---

## Effort Level (노력 수준)

Effort level은 적응형 추론(adaptive reasoning)을 제어함. 모델이 각 단계에서 얼마나 생각할지 작업 복잡도에 따라 결정.

### 모델별 지원 수준

| 모델 | 지원 수준 |
|------|-----------|
| Opus 4.8, Opus 4.7 | `low`, `medium`, `high`, `xhigh`, `max` |
| Opus 4.6, Sonnet 4.6 | `low`, `medium`, `high`, `max` |

지원하지 않는 수준을 설정하면 해당 수준 이하에서 가장 높은 지원 수준으로 폴백됨. 예: Opus 4.6에서 `xhigh`는 `high`로 동작.

**기본 effort**: Opus 4.8, Opus 4.6, Sonnet 4.6에서는 `high`. Opus 4.7에서는 `xhigh`.

### 수준별 사용 가이드

| 수준 | 용도 |
|------|------|
| `low` | 짧고 범위가 좁은, 지연에 민감한 작업 |
| `medium` | 비용에 민감하고 약간의 지능 저하를 감수할 수 있는 작업 |
| `high` | 토큰 사용량과 지능의 균형. Opus 4.8, Opus 4.6, Sonnet 4.6의 기본값 |
| `xhigh` | 더 깊은 추론, 더 높은 토큰 소비. Opus 4.7의 기본값 |
| `max` | 깊은 추론이지만 수확 체감 및 과도한 사고(overthinking) 가능성. 세션 전용 |
| `ultracode` | Claude Code 설정으로, `xhigh`로 모델에 전송 + 동적 워크플로 오케스트레이션. 세션 전용 |

`low`, `medium`, `high`, `xhigh`는 세션 간 유지됨. `max`는 세션 전용(환경변수 `CLAUDE_CODE_EFFORT_LEVEL`로 설정 시 제외).

### ultrathink 키워드

프롬프트 어디에든 `ultrathink`를 포함하면 해당 턴에서만 세션 effort 설정을 변경하지 않고 더 깊은 추론을 요청함. "think", "think hard", "think more" 등의 다른 표현은 키워드로 인식되지 않고 일반 텍스트로 처리됨.

### Effort 설정 방법

| 방법 | 설명 |
|------|------|
| `/effort` | 인자 없이 슬라이더 열기, 또는 `/effort <수준>` 직접 설정, `/effort auto`로 모델 기본값 복원 |
| `/model` 내 | 좌/우 화살표 키로 effort 슬라이더 조정 |
| `--effort` 플래그 | 단일 세션에 수준 이름 전달 |
| 환경변수 | `CLAUDE_CODE_EFFORT_LEVEL=<수준|auto>` |
| 설정 파일 | `effortLevel` 필드에 `low`, `medium`, `high`, `xhigh` 설정 (`max`, `ultracode`는 세션 전용) |
| 스킬/서브에이전트 frontmatter | `effort` 필드로 해당 스킬/서브에이전트 실행 시 effort 재정의 |

우선순위: 환경변수 > 설정된 수준 > 모델 기본값. Frontmatter effort는 해당 스킬/서브에이전트 활성 시 세션 수준을 재정의하되 환경변수는 재정의하지 않음.

### 적응형 추론과 고정 생각 예산

적응형 추론은 각 단계에서 생각을 선택적으로 만들어 일상적인 프롬프트에는 빠르게 응답하고, 더 깊은 생각이 필요한 단계에는 깊이 있게 사고함.

- **Opus 4.7 이상**: 항상 적응형 추론 사용. 고정 생각 예산 모드와 `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING`은 적용되지 않음.
- **Opus 4.6, Sonnet 4.6**: `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1`로 고정 생각 예산 모드로 되돌릴 수 있음. 이 경우 `MAX_THINKING_TOKENS`로 예산 제어.

---

## Extended Thinking (확장 사고)

확장 사고는 Claude가 응답 전에 생성하는 추론. 적응형 추론을 지원하는 모델에서는 effort level이 사고량의 주요 제어 수단.

| 제어 | 설정 방법 |
|------|-----------|
| 현재 세션 토글 | macOS: `Option+T`, Windows/Linux: `Alt+T` |
| 글로벌 기본값 | `/config` 실행 후 사고 모드 토글. `~/.claude/settings.json`에 `alwaysThinkingEnabled`로 저장 |
| effort 무관 완전 비활성화 | `MAX_THINKING_TOKENS=0` 설정. 다른 값은 고정 생각 예산에서만 적용 |

사고 출력은 기본적으로 접힘. `Ctrl+O`로 verbose 모드를 토글하면 회색 이탤릭 텍스트로 추론을 볼 수 있음. 접히거나 편집된 상태에서도 모든 사고 토큰에 대해 과금됨. 전체 요약을 보려면 설정에 `showThinkingSummaries: true` 추가.

---

## Extended Context (1M 컨텍스트)

Opus 4.6 이상, Sonnet 4.6은 100만 토큰 컨텍스트 윈도우를 지원.

### 플랜별 가용성

| 플랜 | Opus 1M | Sonnet 1M |
|------|---------|-----------|
| Max, Team, Enterprise | 구독에 포함 | 사용량 크레딧 필요 |
| Pro | 사용량 크레딧 필요 | 사용량 크레딧 필요 |
| API 및 pay-as-you-go | 전체 접근 | 전체 접근 |

Max, Team, Enterprise 플랜에서 Opus는 추가 구성 없이 자동으로 1M 컨텍스트로 업그레이드됨. 이는 Team Standard와 Team Premium 시트 모두에 적용됨. Sonnet 1M은 모든 구독 플랜(Max 포함)에서 사용량 크레딧이 필요.

1M 컨텍스트는 200K 이상 토큰에도 표준 모델 가격이 적용됨.

### 1M 컨텍스트 비활성화

```bash
export CLAUDE_CODE_DISABLE_1M_CONTEXT=1
```

모델 피커에서 1M 변형이 제거됨.

### 별칭/모델명에 [1m] 접미사 사용

```bash
/model opus[1m]
/model sonnet[1m]
/model claude-opus-4-8[1m]
```

---

## Fast Mode (빠른 모드)

Fast mode는 Claude Opus의 고속 구성으로, 모델을 최대 2.5배 빠르게 만들지만 토큰당 비용이 높음. 다른 모델이 아닌 Claude Opus를 다른 API 구성으로 사용하는 것. 동일한 품질과 기능을 더 빠른 응답으로 제공함.

**지원 모델**: Opus 4.8, Opus 4.7, Opus 4.6 (Sonnet, Haiku 미지원)

**핵심 사항**:
- Claude Code CLI에서 `/fast`로 토글. **VS Code 확장에서는 미지원**
- 구독 플랜(Pro/Max/Team/Enterprise) 및 Claude Console 사용자에게 제공
- 구독 플랜(Pro/Max/Team/Enterprise)에서 fast mode는 사용량 크레딧을 통해서만 제공되며 **구독 rate limit에 포함되지 않음**

### 토글 방법

| 방법 | 설명 |
|------|------|
| `/fast` 후 Tab | CLI에서 빠른 모드 켜기/끄기 토글 |
| 설정 파일 | `"fastMode": true` |

활성화 시 다른 모델이면 자동으로 Opus로 전환, `↯` 아이콘이 프롬프트 옆에 표시됨. 비활성화해도 Opus에 유지되며, 다른 모델로 전환하려면 `/model` 사용.

**버전별 기본값**: Claude Code v2.1.154 이상에서 fast mode 기본 모델은 Opus 4.8. v2.1.142~v2.1.153에서는 Opus 4.7이 기본값.

비용 효율을 위해 대화 중간보다 세션 시작 시 활성화하는 것이 좋음.

### 가격

| 모델 | 입력 (MTok) | 출력 (MTok) |
|------|------------|------------|
| Opus 4.8 | $10 | $50 |
| Opus 4.7, Opus 4.6 | $30 | $150 |

Fast mode 가격은 전체 1M 컨텍스트 윈도우에 일괄 적용. 대화 첫 활성화 시 전체 컨텍스트에 대해 uncached 입력 토큰 가격이 청구되므로, 세션 시작 시 활성화하는 것이 비용 효율적.

### Fast Mode vs Effort Level

| 설정 | 효과 |
|------|------|
| **Fast mode** | 동일한 모델 품질, 낮은 지연, 높은 비용 |
| **낮은 effort level** | 적은 사고 시간, 빠른 응답, 복잡한 작업에서 품질 저하 가능 |

두 가지를 결합 가능: 단순 작업에 fast mode + 낮은 effort level로 최대 속도 확보.

### 요구사항

- **Anthropic API 또는 구독 전용**: Bedrock, Vertex AI, Azure Foundry, Claude Platform on AWS에서는 사용 불가
- **사용량 크레딧 활성화 필요**: 구독 플랜 포함율 외 사용량 크레딧으로 과금
- **Team/Enterprise**: 관리자가 명시적으로 활성화해야 함

### 관리자 설정

관리자는 다음 경로에서 fast mode를 활성화할 수 있음:
- **Console** (API 고객): Claude Code preferences
- **Claude AI** (Team 및 Enterprise): Admin Settings > Claude Code

```json
// 세션별 opt-in 강제 (기본적으로 세션 간 유지되는 것을 방지)
{
  "fastModePerSessionOptIn": true
}
```

세션별 opt-in은 여러 세션을 동시에 실행하는 조직에서 비용 제어에 유용. 사용자는 여전히 `/fast`로 활성화 가능하지만 새 세션마다 초기화됨. 사용자의 fast mode 기본 설정은 저장되므로, 이 설정을 제거하면 기본 영구 동작이 복원됨.

전체 비활성화: `CLAUDE_CODE_DISABLE_FAST_MODE=1`

### Rate Limit 동작

Fast mode는 표준 Opus와 별도의 rate limit을 가짐. Opus 4.8, 4.7, 4.6의 fast mode는 **동일한 rate limit 풀을 공유**: 어느 모델에서 사용하든 동일한 한도에서 차감됨. rate limit 도달 또는 사용량 크레딧 소진 시:
1. 자동으로 표준 속도로 폴백
2. `↯` 아이콘이 회색으로 변경 (쿨다운 표시)
3. 표준 속도와 가격으로 작업 계속
4. 쿨다운 만료 후 자동 재활성화

수동으로 비활성화하려면 `/fast` 재실행.

### Research Preview

Fast mode는 **연구 미리보기(Research preview)** 기능임:
- 피드백에 따라 기능이 변경될 수 있음
- 가용성과 가격은 변경될 수 있음
- 기반 API 구성이 진화할 수 있음

---

## Prompt Caching (프롬프트 캐싱)

Claude Code는 프롬프트 캐싱을 자동으로 관리함. 비활성화하지 않는 한 자동 적용.

### 캐시 구조

각 API 요청은 시스템 프롬프트, 프로젝트 컨텍스트, 대화 내역, 새 메시지를 포함. 대부분의 요청이 이전 요청과 동일하므로, API는 변경되지 않은 접두사(prefix)를 재사용.

| 레이어 | 내용 | 변경 시점 |
|--------|------|-----------|
| System prompt | 핵심 지시사항, 도구 정의, 출력 스타일 | 도구 정의 변경 또는 Claude Code 업그레이드 시 |
| Project context | CLAUDE.md, auto memory, 범위 없는 규칙 | 세션 시작, `/clear` 또는 `/compact` 후 |
| Conversation | 사용자 메시지, Claude 응답, 도구 결과 | 매 턴마다 |

**캐시 키에 포함되지만 프롬프트 텍스트가 아닌 항목**:
- **모델**: 각 모델마다 별도 캐시. 모델 전환 시 전체 재처리
- **Effort level**: 같은 모델에서도 effort level마다 별도 캐시. 중간 변경 시 전체 재처리

### 캐시를 무효화하는 액션

| 액션 | 설명 |
|------|------|
| 모델 전환 | `/model`로 모델 변경 시 전체 캐시 미스 |
| Effort level 변경 | `/effort`로 변경 시 전체 캐시 미스 |
| **Fast mode 활성화** | 캐시 키의 일부인 요청 헤더가 추가되어 전체 캐시 미스 발생. 미캐시된 입력 토큰이 fast mode 요금으로 청구되므로, 세션 중간보다 시작 시 활성화하는 것이 비용 효율적 |
| MCP 서버 연결/해제 | 도구 정의가 prefix에 로드된 경우 무효화 |
| 플러그인 활성화/비활성화 | MCP 서버를 제공하는 플러그인의 경우 무효화 |
| 전체 도구 거부(deny) | `Bash` 등 도구명 자체를 deny 규칙에 추가 시 무효화 |
| `/compact` 실행 | 대화 레이어 요약으로 전체 대화 캐시 무효화 |
| Claude Code 업그레이드 | 시스템 프롬프트/도구 정의 변경 시 무효화 |

### 캐시를 유지하는 액션

| 액션 | 설명 |
|------|------|
| 저장소 파일 편집 | 파일 내용은 Claude가 읽을 때만 컨텍스트에 진입 |
| CLAUDE.md 세션 중 편집 | 캐시는 유지되지만 변경 사항은 다음 `/clear`, `/compact`, 재시작까지 적용 안 됨 |
| 출력 스타일 변경 | 시스템 프롬프트 일부지만 세션 시작 시 고정되므로 캐시 영향 없음 |
| 권한 모드 변경 | 시스템 프롬프트나 도구 정의에 영향 없음 (`opusplan` 제외) |
| 스킬/명령 실행 | 대화 끝에 추가되므로 기존 prefix 무결 |
| `/recap` 실행 | 대화 내역을 대체하지 않고 요약을 명령 출력으로 추가 |
| `/rewind` 실행 | 이전 턴로 잘라도 남은 이력은 동일하므로 이전 캐시 엔트리 히트 |
| 서브에이전트 생성 | 서브에이전트는 자체 캐시를 구축, 부모 캐시는 무영향 |

### 캐시 수명 (TTL)

캐시된 접두사는 비활성 기간 후 만료됨. 각 캐시 히트 요청이 타이머를 리셋.

| 인증 방식 | 기본 TTL |
|-----------|----------|
| Claude 구독 | 1시간 (자동) |
| API 키, Bedrock, Vertex, Foundry, Claude Platform on AWS | 5분 |

| 환경변수 | 효과 |
|----------|------|
| `ENABLE_PROMPT_CACHING_1H=1` | API 키/서드파티에서 1시간 TTL 선택 |
| `FORCE_PROMPT_CACHING_5M=1` | 구독에서도 5분 TTL 강제 |

구독에서 사용량 한도 초과로 사용량 크레딧을 사용 중이면 자동으로 5분 TTL로 전환됨.

### 캐시 성능 확인

`current_usage` 객체의 두 필드로 모니터링:

| 필드 | 의미 |
|------|------|
| `cache_creation_input_tokens` | 이번 턴에 캐시에 기록된 토큰 |
| `cache_read_input_tokens` | 이번 턴에 캐시에서 읽은 토큰 (표준 입력 요금의 약 10%) |

read 대비 creation 비율이 높으면 캐싱이 잘 작동 중.

### 캐시 범위

Claude Code에서 캐시는 사실상 하나의 머신과 디렉토리에 한정됨. 시스템 프롬프트에 작업 디렉토리, 플랫폼, 셸, OS 버전 등이 포함되기 때문.

### 프롬프트 캐싱 비활성화

| 환경변수 | 효과 |
|----------|------|
| `DISABLE_PROMPT_CACHING` | 모든 모델에서 비활성화 |
| `DISABLE_PROMPT_CACHING_HAIKU` | Haiku만 비활성화 |
| `DISABLE_PROMPT_CACHING_SONNET` | Sonnet만 비활성화 |
| `DISABLE_PROMPT_CACHING_OPUS` | Opus만 비활성화 |

---

## 현재 모델 확인 (Checking Your Current Model)

현재 사용 중인 모델은 다음 방법으로 확인 가능:
1. **Status line** (구성된 경우) — 프롬프트 옆에 모델 정보가 표시됨
2. **`/status`** — 모델 정보와 함께 계정 정보도 표시됨

---

## 컨텍스트 윈도우 탐색

Claude Code의 컨텍스트 윈도우는 세션에 대한 모든 정보를 담음: 지시사항, 읽은 파일, 응답, 터미널에 표시되지 않는 콘텐츠.

### Compaction 후 유지 여부

| 메커니즘 | Compaction 후 |
|----------|---------------|
| System prompt 및 출력 스타일 | 변경 없음 (메시지 이력의 일부가 아님) |
| 프로젝트 루트 CLAUDE.md 및 범위 없는 규칙 | 디스크에서 재주입 |
| Auto memory | 디스크에서 재주입 |
| `paths:` frontmatter가 있는 규칙 | 일치하는 파일이 다시 읽힐 때까지 손실 |
| 하위 디렉토리의 중첩 CLAUDE.md | 해당 하위 디렉토리 파일이 다시 읽힐 때까지 손실 |
| 호출된 스킬 본문 | 재주입, 스킬당 5,000 토큰, 총 25,000 토큰 상한 (초과 시 오래된 것부터 삭제) |
| Hooks | 해당 없음 (코드로 실행, 컨텍스트가 아님) |

현재 컨텍스트 사용량 확인: `/context` 실행. 시작 시 로드된 CLAUDE.md 및 auto memory 확인: `/memory` 실행.

### 컨텍스트 관리 전략

컨텍스트가 한계에 가까워지면 Claude Code가 자동으로 compaction을 수행하므로, 전체 컨텍스트 윈도우가 꽉 차도 세션이 종료되지는 않음. 자동 compaction은 `/compact`와 동일한 방식으로 동작함. 자동 실행 전에 미리 대처할 수 있음:

- **포커스와 함께 compact**: `/compact focus on the auth bug fix`처럼 지시사항과 함께 실행. 긴 새 작업을 시작하기 전에 사용하면, 자동 compaction이 중요한 것을 추측하는 대신 원하는 내용을 요약에 유지함
- **작업 전환 시 clear**: 관련 없는 작업으로 전환할 때 `/clear` 실행. 이전 대화가 다음에 필요한 파일을 밀어내고 매 메시지마다 토큰을 소모함
- **큰 읽기는 서브에이전트에 위임**: 연구 작업을 서브에이전트에 보내면 파일 내용이 서브에이전트의 컨텍스트 윈도우에만 있고, 부모 세션에는 요약과 작은 메타데이터 트레일러만 반환됨

---

## 환경변수 요약

| 변수 | 설명 |
|------|------|
| `ANTHROPIC_MODEL` | 메인 세션에 사용할 모델 이름 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | `opus` 별칭이 해석될 모델. opusplan의 Plan 모드에서도 사용 |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | `sonnet` 별칭이 해석될 모델. opusplan의 실행 모드에서도 사용 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | `haiku` 별칭 및 백그라운드 기능에 사용할 모델 |
| `CLAUDE_CODE_SUBAGENT_MODEL` | 모든 서브에이전트 및 에이전트 팀에 사용할 모델. `inherit` 설정 시 일반 모델 해석 사용 |
| `CLAUDE_CODE_EFFORT_LEVEL` | effort level 강제 설정. 모든 다른 방법보다 우선 |
| `MAX_THINKING_TOKENS` | `0`으로 설정 시 확장 사고 완전 비활성화. 다른 값은 고정 생각 예산 모드에서만 적용 |
| `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` | `1`로 설정 시 Opus 4.6, Sonnet 4.6에서 고정 생각 예산으로 되돌림 |
| `CLAUDE_CODE_DISABLE_1M_CONTEXT` | `1`로 설정 시 1M 컨텍스트 변형 비활성화 |
| `CLAUDE_CODE_DISABLE_FAST_MODE` | `1`로 설정 시 fast mode 전체 비활성화 |
| `DISABLE_PROMPT_CACHING` | `1`로 설정 시 모든 모델의 프롬프트 캐싱 비활성화 |
| `DISABLE_PROMPT_CACHING_HAIKU` | Haiku만 캐싱 비활성화 |
| `DISABLE_PROMPT_CACHING_SONNET` | Sonnet만 캐싱 비활성화 |
| `DISABLE_PROMPT_CACHING_OPUS` | Opus만 캐싱 비활성화 |
| `ENABLE_PROMPT_CACHING_1H` | API 키/서드파티에서 1시간 TTL 선택 |
| `FORCE_PROMPT_CACHING_5M` | 모든 인증에서 5분 TTL 강제 |

> **참고**: `ANTHROPIC_SMALL_FAST_MODEL`은 `ANTHROPIC_DEFAULT_HAIKU_MODEL`로 대체되어 deprecated 됨.

---

## 서브에이전트 모델 구성

서브에이전트는 frontmatter에서 `model` 필드로 모델을 지정할 수 있음.

```markdown
---
name: security-reviewer
description: 보안 전문가 리뷰어
model: opus
tools: Read, Grep, Glob
---
```

`CLAUDE_CODE_SUBAGENT_MODEL` 환경변수가 모든 서브에이전트에 적용되며 frontmatter보다 우선함. `inherit` 설정 시 일반 모델 해석 사용.

---

## 서드파티 배포에서 모델 고정

Bedrock, Vertex AI, Foundry, Claude Platform on AWS에 배포 시 버전 고정 권장.

```bash
# Bedrock 예시
export ANTHROPIC_DEFAULT_OPUS_MODEL='us.anthropic.claude-opus-4-8'

# Vertex AI 예시
export ANTHROPIC_DEFAULT_OPUS_MODEL='claude-opus-4-8'

# 1M 컨텍스트 활성화
export ANTHROPIC_DEFAULT_OPUS_MODEL='claude-opus-4-8[1m]'
```

`[1m]` 접미사는 `opus` 및 `sonnet` 별칭의 모든 사용에 1M 컨텍스트를 적용. `opusplan`의 Plan 모드 Opus 단계는 200K로 유지됨.

### 커스텀 모델 옵션 추가

`ANTHROPIC_CUSTOM_MODEL_OPTION`을 사용하면 기본 제공 alias를 대체하지 않고 `/model` 피커에 단일 커스텀 항목을 추가할 수 있음. Claude Code가 기본으로 나열하지 않는 모델 ID를 테스트할 때 유용. LLM gateway 배포의 경우 `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1`이 설정되어 있으면 gateway의 `/v1/models` 엔드포인트에서 피커를 자동으로 채우므로, discovery가 비활성화되었거나 원하는 모델을 반환하지 않을 때만 이 변수가 필요함.

```bash
export ANTHROPIC_CUSTOM_MODEL_OPTION="my-gateway/claude-opus-4-7"
export ANTHROPIC_CUSTOM_MODEL_OPTION_NAME="Opus via Gateway"
export ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION="Custom deployment routed through the internal LLM gateway"
```

커스텀 항목은 `/model` 피커 하단에 표시됨. `ANTHROPIC_CUSTOM_MODEL_OPTION_NAME`과 `ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION`은 선택 사항. 생략 시 모델 ID가 이름으로 사용되고 설명은 `Custom model (<model-id>)`이 됨. Claude Code는 이 모델 ID에 대한 유효성 검사를 건너뛰므로 API 엔드포인트가 수락하는 모든 문자열을 사용할 수 있음.

### 버전별 모델 ID 재정의

```json
{
  "modelOverrides": {
    "claude-opus-4-7": "arn:aws:bedrock:us-east-2:123456789012:application-inference-profile/opus-prod",
    "claude-opus-4-6": "arn:aws:bedrock:us-east-2:123456789012:application-inference-profile/opus-46-prod",
    "claude-sonnet-4-6": "arn:aws:bedrock:us-east-2:123456789012:application-inference-profile/sonnet-prod"
  }
}
```

### 고정 모델의 표시 이름 및 기능 사용자 정의

서드파티 프로바이더에서 모델을 고정하면 프로바이더별 ID가 `/model` 피커에 그대로 표시되며, Claude Code가 해당 모델이 지원하는 기능을 인식하지 못할 수 있음. 각 고정 모델에 대해 컴패니언 환경변수로 표시 이름을 재정의하고 기능을 선언할 수 있음.

이 변수들은 Bedrock, Vertex AI, Foundry 같은 서드파티 프로바이더에서 적용됨. `_NAME` 및 `_DESCRIPTION` 변수는 `ANTHROPIC_BASE_URL`이 LLM 게이트웨이를 가리킬 때도 적용됨. `api.anthropic.com`에 직접 연결할 때는 효과가 없음.

| 환경변수 | 설명 |
|----------|------|
| `ANTHROPIC_DEFAULT_OPUS_MODEL_NAME` | 고정된 Opus 모델의 `/model` 피커 표시 이름. 미설정 시 모델 ID가 기본값 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION` | 고정된 Opus 모델의 `/model` 피커 표시 설명. 미설정 시 `Custom Opus model`이 기본값 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES` | 고정된 Opus 모델이 지원하는 기능의 쉼표로 구분된 목록 |

동일한 `_NAME`, `_DESCRIPTION`, `_SUPPORTED_CAPABILITIES` 접미사가 `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL`, `ANTHROPIC_CUSTOM_MODEL_OPTION`에도 사용 가능.

Claude Code는 모델 ID를 알려진 패턴과 매칭하여 effort level, 확장 사고 등의 기능을 활성화함. Bedrock ARN이나 커스텀 배포 이름 같은 프로바이더별 ID는 종종 이 패턴과 매칭되지 않아 지원 기능이 비활성화됨. `_SUPPORTED_CAPABILITIES`를 설정하여 Claude Code에 해당 모델이 실제로 지원하는 기능을 알릴 수 있음:

| 기능 값 | 활성화 |
|---------|--------|
| `effort` | Effort level 및 `/effort` 명령 |
| `xhigh_effort` | `xhigh` effort level |
| `max_effort` | `max` effort level |
| `thinking` | 확장 사고 |
| `adaptive_thinking` | 작업 복잡도에 따라 동적으로 사고를 할당하는 적응형 추론 |
| `interleaved_thinking` | 도구 호출 사이의 사고 |

`_SUPPORTED_CAPABILITIES`가 설정되면 나열된 기능은 활성화되고 나열되지 않은 기능은 해당 고정 모델에 대해 비활성화됨. 변수가 설정되지 않으면 Claude Code는 모델 ID 기반 내장 감지로 폴백함.

다음 예시는 Opus를 Bedrock 커스텀 모델 ARN으로 고정하고, 친근한 이름을 설정하며, 기능을 선언함:

```bash
export ANTHROPIC_DEFAULT_OPUS_MODEL='arn:aws:bedrock:us-east-1:123456789012:custom-model/abc'
export ANTHROPIC_DEFAULT_OPUS_MODEL_NAME='Opus via Bedrock'
export ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION='Opus 4.7 routed through a Bedrock custom endpoint'
export ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES='effort,xhigh_effort,max_effort,thinking,adaptive_thinking,interleaved_thinking'
```
