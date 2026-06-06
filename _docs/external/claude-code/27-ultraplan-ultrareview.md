# Ultraplan & Ultrareview — 클라우드 기반 계획 수립 및 심층 코드 리뷰

> **원문**: [Plan in the cloud with ultraplan](https://code.claude.com/docs/en/ultraplan) | [Find bugs with ultrareview](https://code.claude.com/docs/en/ultrareview)

이 문서는 Claude Code의 클라우드 기반 두 가지 고급 기능을 다룹니다. **Ultraplan**은 계획 작업을 Claude Code on the web 세션으로 위임하여 브라우저에서 리뷰·수정한 뒤 원격 또는 로컬에서 실행하는 기능이며, **Ultrareview**는 다중 에이전트 플릿이 클라우드 샌드박스에서 병렬로 코드를 리뷰하고 각 발견 사항을 독립적으로 재현·검증하는 심층 코드 리뷰 기능입니다.

---

## 기능 개요 비교

|  | **Ultraplan** | **Ultrareview** |
| --- | --- | --- |
| **목적** | 클라우드에서 계획 수립 및 리뷰 | 클라우드에서 심층 코드 리뷰 |
| **실행 환경** | Claude Code on the web 세션 (plan mode) | 원격 클라우드 샌드박스 |
| **다중 에이전트** | 단일 Claude 세션이 계획 초안 작성 | 다수의 reviewer agent가 병렬로 리뷰 |
| **로컬 리소스** | 터미널을 사용하지 않음 | 터미널을 사용하지 않음 |
| **리뷰 방식** | 브라우저에서 인라인 코멘트, 이모지 반응 | 검증된 발견 사항을 세션에 알림으로 표시 |
| **명령어** | `/ultraplan` | `/ultrareview` |

### 공통 사항

- 모두 Anthropic 클라우드 인프라에서 실행되므로 **Amazon Bedrock, Google Cloud Vertex AI, Microsoft Foundry**에서는 사용할 수 없습니다
- 모두 **Claude Code on the web 계정**이 필요합니다. Ultraplan은 **GitHub 저장소**가 필요하지만, Ultrareview는 인자 없이 실행하는 기본 모드(브랜치 diff 리뷰)에서는 GitHub 없이도 동작하며, PR 모드에서만 `github.com` 원격이 필요합니다
- Ultraplan은 Claude.ai 계정 인증이 필요하며, Ultrareview도 Claude.ai 계정 인증이 필요합니다 (API 키만으로는 불가)
- **Ultrareview**는 **Zero Data Retention**이 활성화된 조직에서는 사용할 수 없습니다. Ultraplan에는 이 제한이 공식 문서에 명시되어 있지 않습니다

---

## Ultraplan

Ultraplan은 계획 작업을 로컬 CLI에서 Claude Code on the web 세션으로 위임합니다. Claude가 클라우드에서 계획을 작성하는 동안 터미널에서 다른 작업을 계속할 수 있습니다. 계획이 완료되면 브라우저에서 열어 특정 섹션에 코멘트를 남기고, 수정을 요청하고, 실행 위치를 선택할 수 있습니다.

### Ultraplan이 제공하는 이점

| 이점 | 설명 |
| --- | --- |
| **타겟팅된 피드백** | 계획 전체가 아닌 개별 섹션에 코멘트를 남길 수 있음 |
| **핸즈오프 초안 작성** | 계획이 원격으로 생성되어 터미널이 다른 작업에 사용 가능 |
| **유연한 실행** | 웹에서 실행하거나 터미널로 가져와 실행하는 중 선택 가능 |

### Ultraplan 실행 방법

로컬 CLI 세션에서 세 가지 방법으로 ultraplan을 실행할 수 있습니다.

| 방법 | 설명 |
| --- | --- |
| **명령어** | `/ultraplan` 뒤에 프롬프트 입력 |
| **키워드** | 일반 프롬프트에 `ultraplan` 단어 포함 |
| **로컬 계획에서 전송** | 로컬 plan mode에서 승인 대화상자가 나타나면 __No, refine with Ultraplan on Claude Code on the web__ 선택 |

실행 예시:

```
/ultraplan migrate the auth service from sessions to JWTs
```

명령어와 키워드 경로는 실행 전 확인 대화상자를 표시합니다. 로컬 계획 경로는 이미 확인으로 간주되어 대화상자를 생략합니다.

Remote Control이 활성화된 경우, ultraplan 시작 시 연결이 해제됩니다. 두 기능 모두 claude.ai/code 인터페이스를 사용하며 한 번에 하나만 연결할 수 있습니다.

### Ultraplan 상태 표시

클라우드 세션이 시작되면 CLI 프롬프트 입력 영역에 상태 표시기가 나타납니다.

| 상태 | 의미 |
| --- | --- |
| `◇ ultraplan` | Claude가 코드베이스를 분석하고 계획을 작성 중 |
| `◇ ultraplan needs your input` | Claude가 확인 질문이 있음. 세션 링크를 열어 응답 필요 |
| `◆ ultraplan ready` | 계획이 브라우저에서 리뷰 준비 완료 |

`/tasks`를 실행하고 ultraplan 항목을 선택하면 세션 링크, 에이전트 활동, **Stop ultraplan** 액션이 포함된 상세 보기를 열 수 있습니다. 중지하면 클라우드 세션이 보관되고 표시기가 사라집니다. 터미널에는 아무것도 저장되지 않습니다.

### 브라우저에서 계획 리뷰 및 수정

상태가 `◆ ultraplan ready`로 변경되면 세션 링크를 열어 claude.ai에서 계획을 확인합니다. 계획은 전용 리뷰 뷰에 표시됩니다.

| 리뷰 기능 | 설명 |
| --- | --- |
| **인라인 코멘트** | 원하는 구절을 하이라이트하고 Claude가 처리할 코멘트를 남김 |
| **이모지 반응** | 전체 코멘트 없이 승인 또는 우려를 이모지로 표시 |
| **아웃라인 사이드바** | 계획의 섹션 간 빠른 이동 |

코멘트를 처리하도록 Claude에 요청하면 수정된 초안이 제시됩니다. 실행 위치를 선택하기 전까지 필요한 만큼 반복할 수 있습니다.

### 실행 위치 선택

계획이 확정되면 브라우저에서 Claude가 같은 클라우드 세션에서 구현할지, 대기 중인 터미널로 다시 보낼지 선택합니다.

#### 웹에서 실행

브라우저에서 **Approve Claude's plan and start coding**을 선택하면 Claude가 같은 Claude Code on the web 세션에서 계획을 구현합니다. 터미널에 확인 메시지가 표시되고 상태 표시기가 사라지며, 작업은 클라우드에서 계속됩니다. 구현이 완료되면 웹 인터페이스에서 diff를 리뷰하고 pull request를 생성합니다.

#### 터미널로 계획 전송

브라우저에서 **Approve plan and teleport back to terminal**을 선택하면 계획을 로컬 환경에서 전체 접근 권한으로 구현합니다. 이 옵션은 세션이 CLI에서 시작되었고 터미널이 아직 폴링 중일 때만 나타납니다. 웹 세션은 병렬로 계속 작업하지 않도록 보관됩니다.

터미널에는 __Ultraplan approved__ 제목의 대화상자가 세 가지 옵션과 함께 나타납니다.

| 옵션 | 설명 |
| --- | --- |
| **Implement here** | 계획을 현재 대화에 주입하고 이어서 작업 |
| **Start new session** | 현재 대화를 지우고 계획만 컨텍스트로 새로 시작 |
| **Cancel** | 실행 없이 계획을 파일로 저장. Claude가 파일 경로를 출력 |

새 세션을 시작하면 Claude가 `claude --resume` 명령어를 상단에 출력하여 나중에 이전 대화로 돌아갈 수 있습니다.

---

## Ultrareview

Ultrareview는 Claude Code on the web 인프라에서 실행되는 심층 코드 리뷰입니다. `/ultrareview`를 실행하면 Claude Code가 원격 샌드박스에서 reviewer agent 플릿을 시작하여 브랜치 또는 pull request의 버그를 찾습니다.

로컬 `/review`와 비교한 ultrareview의 장점:

| 장점 | 설명 |
| --- | --- |
| **더 높은 신호** | 모든 발견 사항이 독립적으로 재현·검증되므로 스타일 제안이 아닌 실제 버그에 집중 |
| **더 넓은 커버리지** | 다수의 reviewer agent가 변경 사항을 병렬로 탐색하여 단일 패스 리뷰가 놓칠 수 있는 문제를 발견 |
| **로컬 리소스 불필요** | 리뷰가 원격 샌드박스에서 전적으로 실행되어 터미널이 다른 작업에 사용 가능 |

### 인증 요구 사항

Ultrareview는 Claude Code on the web 인프라에서 실행되므로 **Claude.ai 계정 인증**이 필요합니다. API 키만으로 로그인한 경우 먼저 `/login`을 실행하여 Claude.ai로 인증해야 합니다. Amazon Bedrock, Google Cloud Vertex AI, Microsoft Foundry를 사용하는 Claude Code에서는 사용할 수 없으며, Zero Data Retention을 활성화한 조직에서도 사용할 수 없습니다.

### CLI에서 Ultrareview 실행

git 저장소 내의 CLI에서 리뷰를 시작합니다.

| 모드 | 설명 |
| --- | --- |
| **기본 (브랜치)** | 인자 없이 실행 시 현재 브랜치와 기본 브랜치 간 diff를 리뷰. 커밋되지 않은 변경과 스테이지된 변경도 포함 |
| **PR 모드** | PR 번호를 전달하면 원격 샌드박스가 GitHub에서 직접 PR을 클론. 로컬 작업 트리를 번들링하지 않음. `github.com` 원격이 필요 |

실행 전 Claude Code가 확인 대화상자를 표시합니다. 여기에는 리뷰 범위(브랜치 리뷰 시 파일 및 라인 수 포함), 남은 무료 실행 횟수, 예상 비용이 포함됩니다. 확인 후 리뷰는 백그라운드에서 계속되며 세션을 계속 사용할 수 있습니다.

이 명령은 `/ultrareview`로 호출할 때만 실행됩니다. Claude가 자체적으로 ultrareview를 시작하지 않습니다.

### 가격 및 무료 실행

Ultrareview는 프랜차이즈에 포함된 사용량이 아닌 **extra usage**에 대해 청구되는 프리미엄 기능입니다.

| 요금제 | 무료 실행 | 무료 소진 후 |
| --- | --- | --- |
| **Pro** | 2026년 5월 5일까지 3회 무료 | extra usage로 청구 |
| **Max** | 2026년 5월 5일까지 3회 무료 | extra usage로 청구 |
| **Team 및 Enterprise** | 없음 | extra usage로 청구 |

- Pro 및 Max 구독자는 기능 체험용으로 3회의 무료 ultrareview 실행을 받습니다
- 이 3회는 **계정당 일회성 할당**이며, 갱신되지 않고 2026년 5월 5일에 만료됩니다
- 무료 실행을 모두 사용했거나 무료 기간이 종료된 후에는 각 리뷰가 extra usage로 청구되며, 변경 규모에 따라 일반적으로 **$5 ~ $20** 소요
- 원격 세션이 시작되면 1회로 계산되므로, 중간에 중지하거나 완료되지 않은 리뷰도 무료 실행을 사용합니다
- 유료 리뷰의 경우 실행된 부분에 대해서만 extra usage가 청구됩니다
- Ultrareview는 무료 실행 외에 항상 extra usage로 청구되므로, 계정 또는 조직에 **extra usage가 활성화**되어 있어야 합니다. 비활성화된 경우 Claude Code가 실행을 차단하고 결제 설정 링크를 제공합니다
- `/extra-usage`를 실행하여 현재 설정을 확인하거나 변경할 수 있습니다

### 실행 중인 리뷰 추적

리뷰는 일반적으로 **5~10분**이 소요됩니다. 백그라운드 작업으로 실행되므로 세션에서 다른 작업을 계속하거나, 다른 명령을 시작하거나, 터미널을 완전히 닫을 수 있습니다.

`/tasks`를 사용하여 실행 중이거나 완료된 리뷰를 확인하고, 리뷰 상세 보기를 열거나, 진행 중인 리뷰를 중지할 수 있습니다. 리뷰를 중지하면 클라우드 세션이 보관되며 부분 결과는 반환되지 않습니다.

리뷰가 완료되면 검증된 발견 사항이 세션에 알림으로 표시됩니다. 각 발견 사항에는 파일 위치와 문제에 대한 설명이 포함되어 있어 Claude에게 직접 수정을 요청할 수 있습니다.

### 비대화형으로 Ultrareview 실행

CI나 스크립트에서 대화형 세션 없이 ultrareview를 시작하려면 `claude ultrareview` 서브커맨드를 사용합니다. 이 서브커맨드는 `/ultrareview`와 동일한 리뷰를 시작하고, 원격 리뷰가 완료될 때까지 대기한 후 발견 사항을 stdout에 출력하고 종료 코드 0(성공) 또는 1(실패)로 종료합니다.

```
claude ultrareview
claude ultrareview 1234
claude ultrareview origin/main
```

| 인자/플래그 | 설명 |
| --- | --- |
| (인자 없음) | 현재 브랜치와 기본 브랜치 간 diff를 리뷰 |
| `PR 번호` | 해당 pull request를 리뷰 |
| `베이스 브랜치` | 해당 브랜치를 기준으로 diff를 리뷰 |
| `--json` | 포맷된 결과 대신 원시 `bugs.json` 페이로드를 출력 |
| `--timeout <minutes>` | 리뷰 완료 대기 최대 시간(분). 기본값 30 |

- 서브커맨드 호출은 대화형 명령이 표시하는 결제 및 약관 프롬프트에 대한 동의로 간주됩니다
- 진행 메시지와 라이브 세션 URL은 stdout이 파싱 가능하도록 stderr로 출력됩니다

종료 코드:

| 코드 | 의미 |
| --- | --- |
| `0` | 리뷰 완료 (발견 사항 유무와 무관) |
| `1` | 실행 실패, 원격 세션 오류, 또는 타임아웃 초과 |
| `130` | Ctrl-C로 중단 |

서브커맨드를 중단해도 원격 리뷰는 계속 실행됩니다. stderr에 출력된 세션 URL을 브라우저에서 열어 진행 상황을 확인할 수 있습니다.

GitHub pull request에 대한 자동 리뷰의 경우 **Code Review**가 저장소와 직접 통합되어 CLI 단계 없이 인라인 PR 코멘트로 발견 사항을 게시합니다.

---

## /review와 /ultrareview 비교

두 명령어 모두 코드를 리뷰하지만 워크플로우의 다른 단계를 대상으로 합니다.

|  | `/review` | `/ultrareview` |
| --- | --- | --- |
| **실행 위치** | 로컬 세션 | 원격 클라우드 샌드박스 |
| **깊이** | 단일 패스 리뷰 | 독립 검증이 포함된 다중 에이전트 플릿 |
| **소요 시간** | 수 초 ~ 수 분 | 약 5~10분 |
| **비용** | 일반 사용량에 포함 | 무료 실행 후 건당 약 $5 ~ $20 (extra usage) |
| **적합한 상황** | 작업 중 빠른 피드백 | 본격적인 변경을 병합하기 전 확신이 필요할 때 |

작업 중 빠른 피드백에는 `/review`를, 본격적인 변경을 병합하기 전 단일 리뷰가 놓칠 수 있는 문제를 포착하려면 `/ultrareview`를 사용하세요.

---

## 관련 문서

- [Claude Code on the web](https://code.claude.com/docs/en/web) — 원격 세션과 클라우드 샌드박스 작동 방식
- [Plan mode](https://code.claude.com/docs/en/planning) — 로컬 세션에서 계획 모드 작동 방식
- [Remote Control](https://code.claude.com/docs/en/remote-control) — claude.ai/code 인터페이스를 로컬 세션과 함께 사용
- [비용 관리](https://code.claude.com/docs/en/costs) — 사용량 추적 및 지출 한도 설정
