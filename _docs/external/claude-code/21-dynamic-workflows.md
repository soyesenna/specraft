# Dynamic Workflows, Agent Teams, Agent View 및 병렬 실행

> **원문**: [Dynamic Workflows](https://code.claude.com/docs/en/workflows) | [Agent Teams](https://code.claude.com/docs/en/agent-teams) | [Running Agents in Parallel](https://code.claude.com/docs/en/agents) | [Agent View](https://code.claude.com/docs/en/agent-view) | [Goal](https://code.claude.com/docs/en/goal)

이 문서는 Claude Code의 다중 에이전트 오케스트레이션 기능을 다룹니다. Dynamic Workflows로 수십~수백 개의 에이전트를 스크립트로 조정하고, Agent Teams로 다중 세션을 협업시키며, Agent View로 모든 백그라운드 세션을 한 화면에서 관리하는 방법을 설명합니다.

---

## 병렬 실행 방식 비교

Claude Code는 네 가지 병렬 실행 접근 방식을 제공합니다. 각 방식은 조정자, 통신 방식, 격리 수준이 다릅니다.

| 접근 방식 | 정의 | 언제 사용하는가 |
| --- | --- | --- |
| **Subagents** | 세션 내에서 Claude가 생성하는 작업자 | 사이드 태스크가 메인 대화를 검색 결과나 로그로 채울 때 |
| **Agent View** | `claude agents`로 여는 백그라운드 세션 관리 화면. Research preview | 여러 독립 태스크를 위임하고 한눈에 상태를 확인할 때 |
| **Agent Teams** | 공유 태스크 목록과 메시징으로 조정되는 다중 세션. 실험적, 기본 비활성화 | Claude가 프로젝트를 분할하고 작업자 간 동기화가 필요할 때 |
| **Dynamic Workflows** | 여러 subagent를 실행하고 결과를 교차 검증하는 스크립트. Research preview | 소수의 subagent로 감당 안 되는 규모, 코드베이스 전체 감사, 500파일 마이그레이션, 교차 검증 연구 |

### 핵심 차이점 비교

|  | Subagents | Skills | Agent Teams | Workflows |
| --- | --- | --- | --- | --- |
| **정체** | Claude가 생성하는 작업자 | Claude가 따르는 지침 | 리드 에이전트가 피어 세션을 감독 | 런타임이 실행하는 스크립트 |
| **다음 단계 결정** | Claude, 턴별 | Claude, 프롬프트에 따라 | 리드 에이전트, 턴별 | 스크립트 자체 |
| **중간 결과 저장소** | Claude의 컨텍스트 윈도우 | Claude의 컨텍스트 윈도우 | 공유 태스크 목록 | 스크립트 변수 |
| **재사용 가능한 것** | 작업자 정의 | 지침 | 팀 정의 | 오케스트레이션 자체 |
| **규모** | 턴당 몇 개의 위임 | Subagent와 동일 | 소수의 장기 실행 피어 | 실행당 수십~수백 개 에이전트 |
| **중단 시** | 턴 재시작 | 턴 재시작 | 팀원은 계속 실행 | 같은 세션에서 이어서 실행 가능 |

### 선택 기준

- **누가 작업을 조정하는가?**
  - Claude가 한 대화에서 위임하고 결과를 수집: Subagents
  - 독립 태스크를 위임하고 나중에 확인: Agent View
  - Claude가 계획, 할당, 감독: Agent Teams
  - 스크립트가 판단 대신 계획을 보관: Dynamic Workflows

- **작업자 간 통신이 필요한가?** Subagent는 호출자에게만 결과를 보고, Agent View 세션은 사용자에게만 보고. Agent Teams의 팀원은 공유 태스크 목록과 직접 메시징으로 소통.

- **같은 파일을 편집하는가?** Worktree로 격리. Subagent와 직접 실행 세션은 각각 별도의 worktree 사용 가능. Agent Teams는 팀원을 worktree로 격리하지 않으므로 파일 소유를 분할해야 함.

### 지원 도구

에이전트 실행 방식은 아니지만 병렬 작업을 지원하는 도구:

- **Worktrees**: 각 세션에 별도의 git 체크아웃을 제공하여 병렬 세션이 같은 파일을 편집하지 않도록 함. 직접 실행하는 세션에 사용. Agent View는 디스패치된 각 세션을 자동으로 worktree로 이동시키며, 생성하는 subagent도 각각 worktree를 가질 수 있음
- **`/batch`**: Claude가 하나의 큰 변경을 5~30개의 worktree 격리된 subagent로 분할하여 각각 PR을 열도록 하는 스크립트. subagent와 worktree의 패키지된 사용법으로, 별도의 조정 방식은 아님

에이전트를 이용한 작업 분할과는 다른 문제를 해결하는 기능:

- **Background bash command**: 대화를 차단하지 않고 하나의 셸 명령을 실행. 에이전트를 생성하지 않음
- **Forked subagent**: 전체 대화 컨텍스트를 상속하는 subagent. 새로 시작하지 않고 subagent를 생성하는 방법이며, 별도의 서피스가 아님
- **Routine**: 사용자의 로컬이 아닌 Anthropic의 클라우드에서 일정에 따라 세션을 실행. 병렬 실행이 아님

---

## Dynamic Workflows

Dynamic Workflow는 대규모 subagent를 오케스트레이션하는 JavaScript 스크립트입니다. Claude가 태스크에 맞는 스크립트를 작성하고, 런타임이 백그라운드에서 실행하면서 세션은 응답성을 유지합니다. 워크플로우는 한 대화가 조정할 수 있는 에이전트 수를 넘어서거나, 오케스트레이션을 읽고 재실행할 수 있는 스크립트로 명시화하려는 경우에 사용합니다. 예시: 코드베이스 전체 버그 스윕, 500파일 마이그레이션, 소스를 교차 검증해야 하는 연구 질문, 확정 전 여러 독립적 관점에서 초안을 작성할 가치가 있는 계획.

### 워크플로우를 언제 사용하는가

Subagents, Skills, Agent Teams, Workflows는 모두 다단계 태스크를 실행할 수 있습니다. 차이점은 **누가 계획을 가지고 있는가**입니다.

|  | Subagents | Skills | Agent Teams | Workflows |
| --- | --- | --- | --- | --- |
| **정체** | Claude가 생성하는 작업자 | Claude가 따르는 지침 | 리드 에이전트가 피어 세션을 감독 | 런타임이 실행하는 스크립트 |
| **다음 단계 결정** | Claude, 턴별 | Claude, 프롬프트에 따라 | 리드 에이전트, 턴별 | 스크립트 자체 |
| **중간 결과 저장소** | Claude의 컨텍스트 윈도우 | Claude의 컨텍스트 윈도우 | 공유 태스크 목록 | 스크립트 변수 |
| **재사용 가능한 것** | 작업자 정의 | 지침 | 팀 정의 | 오케스트레이션 자체 |
| **규모** | 턴당 몇 개의 위임 | Subagent와 동일 | 소수의 장기 실행 피어 | 실행당 수십~수백 개 에이전트 |
| **중단 시** | 턴 재시작 | 턴 재시작 | 팀원은 계속 실행 | 같은 세션에서 이어서 실행 가능 |

워크플로우는 계획을 코드로 옮깁니다. Subagents, Skills, Agent Teams에서는 Claude가 오케스트레이터 역할을 하여 턴별로 다음에 무엇을 생성하거나 할당할지 결정하고, 모든 결과가 컨텍스트 윈도우에 들어갑니다. 워크플로우 스크립트는 루프, 분기, 중간 결과를 직접 관리하므로 Claude의 컨텍스트에는 최종 답변만 남습니다.

계획을 코드로 옮기면 반복 가능한 품질 패턴도 적용할 수 있습니다: 독립적인 에이전트가 서로의 발견을 적대적으로 검토하거나, 여러 관점에서 계획을 초안하여 서로 비교 평가할 수 있어 단일 패스보다 더 신뢰할 수 있는 결과를 얻습니다.

### 번들 워크플로우

| 명령어 | 기능 |
| --- | --- |
| `/deep-research <question>` | 여러 관점에서 웹 검색을 확장, 소스를 가져와 교차 검증, 각 주장에 투표하고 인용된 보고서 반환. WebSearch 도구 필요 |

직접 저장한 워크플로우도 동일한 방식으로 명령어가 되어 `/` 자동완성에 나타납니다.

### 워크플로우 실행

#### 프롬프트에서 요청

프롬프트에 `ultracode` 키워드를 포함하거나 자연어로 "use a workflow"라고 요청합니다.

```
ultracode: audit every API endpoint under src/routes/ for missing auth checks
```

의도하지 않았다면 macOS에서 `Option+W`, Windows/Linux에서 `Alt+W`로 하이라이트를 해제할 수 있습니다. `/config`에서 Ultracode 키워드 트리거를 끌 수도 있습니다.

#### Ultracode 자동 결정

Ultracode는 `xhigh` reasoning effort와 자동 워크플로우 오케스트레이션을 결합한 설정입니다. 활성화하면 Claude가 모든 실질적 태스크에 대해 워크플로우를 계획합니다.

```
/effort ultracode
```

- 현재 세션에만 적용, 새 세션에서 리셋
- `xhigh` effort를 지원하는 모델에서만 사용 가능
- `/effort high`로 복귀 가능

#### 실행 전 승인

CLI에서 실행 시 계획된 단계가 표시되며 다음 옵션이 제공됩니다.

- **Yes, run it**: 실행 시작
- **Yes, and don't ask again for `<name>` in `<path>`**: 해당 프로젝트에서 이 워크플로우는 다시 묻지 않음
- **View raw script**: 스크립트 확인
- **No**: 취소

`Ctrl+G`로 에디터에서 스크립트를 열 수 있습니다. `Tab`으로 실행 전에 프롬프트를 조정할 수 있습니다.

Desktop 앱에서는 승인 카드가 워크플로우 이름, 단계 목록, 토큰 사용량 경고를 표시하며 **Once**, **Always**, **Deny** 세 가지 동작을 제공합니다. 진행 상태 보기는 Background tasks 사이드 창에 나타납니다.

권한 모드별 승인 동작:

| 권한 모드 | 승인 프롬프트 시점 |
| --- | --- |
| Default, accept edits | 매 실행 (해당 워크플로우에서 "don't ask again"을 선택하지 않은 경우) |
| Auto | 첫 실행만. ultracode 활성 시 생략 |
| Bypass permissions, `claude -p`, Agent SDK | 승인 없이 즉시 실행 |

권한 모드는 위 실행 승인 프롬프트만 제어합니다. 워크플로우가 생성하는 subagent는 항상 `acceptEdits` 모드로 실행되며 세션 모드와 관계없이 사용자의 도구 허용 리스트를 상속합니다. 파일 편집은 자동 승인됩니다.

셸 명령, 웹 페치, 허용 리스트에 없는 MCP 도구는 실행 중에도 여전히 프롬프트를 트리거할 수 있습니다. 긴 실행에서 이를 피하려면 시작 전에 에이전트에 필요한 명령을 허용 리스트에 추가하십시오.

`claude -p`와 Agent SDK에서는 프롬프트할 대상이 없으므로, 도구 호출은 대화형 확인 없이 구성된 권한 규칙을 따릅니다.

#### 실행 상태 모니터링

| 키 | 동작 |
| --- | --- |
| `↑` / `↓` | 단계 또는 에이전트 선택 |
| `Enter` 또는 `→` | 선택한 단계로 드릴인, 에이전트의 프롬프트·도구 호출·결과 확인 |
| `Esc` | 한 단계 뒤로 |
| `j` / `k` | 에이전트 상세 스크롤 |
| `p` | 실행 일시정지/재개 |
| `x` | 선택한 에이전트 정지, 또는 실행 중이면 전체 워크플로우 정지 |
| `r` | 선택한 실행 중인 에이전트 재시작 |
| `s` | 실행 스크립트를 명령어로 저장 |

### 워크플로우 저장 및 재사용

`/workflows`에서 원하는 실행을 선택하고 `s`를 누르면 저장 대화상자가 나타납니다. `Tab`으로 두 위치를 전환합니다.

| 저장 위치 | 설명 |
| --- | --- |
| `.claude/workflows/` (프로젝트) | 리포지토리를 클론하는 모든 사람과 공유 |
| `~/.claude/workflows/` (사용자) | 모든 프로젝트에서 사용 가능, 본인만 볼 수 있음 |

프로젝트 워크플로우와 개인 워크플로우가同名이면 프로젝트 워크플로우가 우선 실행됩니다.

### 인수 전달

저장된 워크플로우는 `args` 파라미터로 입력을 받을 수 있습니다. 스크립트 내에서 `args`라는 이름의 전역 변수로 접근합니다.

```
> Run /triage-issues on issues 1024, 1025, and 1030
```

`args`가 생략되면 스크립트 내에서 `undefined`입니다.

### 런타임 동작과 제한

| 제약 | 이유 |
| --- | --- |
| 실행 중 사용자 입력 불가 | 에이전트 권한 프롬프트만 실행을 일시정지 가능. 단계 간 승인이 필요하면 각 단계를 별도 워크플로우로 실행 |
| 워크플로우 자체의 직접 파일시스템/셸 접근 불가 | 에이전트가 읽고 쓰고 실행. 스크립트는 에이전트를 조정 |
| 최대 16개 동시 에이전트 (CPU 코어에 따라 감소) | 로컬 리소스 제한 |
| 실행당 최대 1,000개 에이전트 | 무한 루프 방지 |

- 모든 실행 스크립트는 `~/.claude/projects/` 하위 세션 디렉터리에 파일로 저장됨
- 중단 후 같은 세션 내에서 재개 가능 (완료된 에이전트는 캐시된 결과 반환)
- 세션을 종료하면 다음 세션에서 새로 시작

### 비용 관리

워크플로우는 많은 에이전트를 생성하므로 대화로 작업할 때보다 훨씬 많은 토큰을 소모합니다. 대규모 태스크 전에 작은 단위로 먼저 실행하여 비용을 가늠하십시오.

- `/model`로 대규모 실행 전 모델 확인
- 스크립트에서 단계별로 다른 모델 지정 가능

### 워크플로우 비활성화

| 방법 | 범위 |
| --- | --- |
| `/config`에서 Dynamic workflows 끄기 | 세션 간 유지 |
| `~/.claude/settings.json`에 `"disableWorkflows": true` 설정 | 세션 간 유지 |
| `CLAUDE_CODE_DISABLE_WORKFLOWS=1` 환경변수 | 시작 시 읽음 |
| 관리 설정에서 `"disableWorkflows": true` | 조직 전체 |

비활성화 시 번들 워크플로우 명령어 사용 불가, `ultracode` 키워드 트리거 안 됨, `/effort` 메뉴에서 ultracode 제거.

---

## Agent Teams

Agent Teams는 여러 Claude Code 인스턴스가 팀으로 협업하는 기능입니다. 한 세션이 팀 리드로서 작업을 조정하고, 팀원은 각자의 컨텍스트 윈도우에서 독립적으로 작업하며 서로 직접 소통합니다. Subagent는 단일 세션 내에서 실행되어 메인 에이전트에게만 결과를 보고하는 반면, Agent Teams의 팀원은 리드를 거치지 않고도 서로 직접 상호작용할 수 있습니다.

### 언제 Agent Teams를 사용하는가

Agent Teams는 병렬 탐색이 실질적인 가치를 더하는 태스크에 가장 효과적입니다.

- **연구 및 리뷰**: 여러 팀원이 문제의 다양한 측면을 동시에 조사하고 서로의 발견을 공유하고 검증
- **새 모듈 또는 기능**: 팀원이 각각 별도의 부분을 서로 충돌 없이 소유
- **경쟁 가설로 디버깅**: 팀원이 서로 다른 이론을 병렬로 테스트하여 더 빠르게 정답에 수렴
- **크로스 레이어 조정**: 프론트엔드, 백엔드, 테스트에 걸친 변경을 각각 다른 팀원이 소유

Agent Teams는 조정 오버헤드가 추가되며 단일 세션보다 훨씬 많은 토큰을 사용합니다. 순차적 태스크, 동일 파일 편집, 많은 의존성이 있는 작업에서는 단일 세션 또는 subagent가 더 효과적입니다.

### Subagent와 비교

|  | Subagents | Agent Teams |
| --- | --- | --- |
| **Context** | 고유 컨텍스트 윈도우; 결과를 호출자에게 반환 | 고유 컨텍스트 윈도우; 완전히 독립적 |
| **Communication** | 메인 에이전트에게만 결과 보고 | 팀원 간 직접 메시징 |
| **Coordination** | 메인 에이전트가 모든 작업 관리 | 공유 태스크 목록으로 자체 조정 |
| **Best for** | 결과만 중요한 집중 태스크 | 논의와 협업이 필요한 복잡한 작업 |
| **Token cost** | 낮음: 결과가 메인 컨텍스트로 요약됨 | 높음: 각 팀원이 별도의 Claude 인스턴스 |

빠르고 집중된 작업자가 필요하면 subagent를, 팀원 간 발견 공유와 상호 검증이 필요하면 Agent Teams를 사용하십시오.

### 활성화

기본적으로 비활성화. 환경변수 또는 `settings.json`에서 활성화합니다.

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### Claude가 Agent Teams를 시작하는 방법

Agent Teams가 시작되는 두 가지 방법:

- **사용자가 팀을 요청**: 병렬 작업이 유용한 태스크를 주고 Agent Teams를 명시적으로 요청. Claude가 지시에 따라 팀을 생성
- **Claude가 팀을 제안**: Claude가 태스크가 병렬 작업에 적합하다고 판단하면 팀 생성을 제안. 사용자가 확인해야 진행

두 경우 모두 사용자가 제어권을 가집니다. Claude는 승인 없이 팀을 생성하지 않습니다.

### 아키텍처

| 구성 요소 | 역할 |
| --- | --- |
| **Team lead** | 팀을 생성하고 팀원을 생성하며 작업을 조정하는 메인 Claude Code 세션 |
| **Teammates** | 할당된 태스크에서 작업하는 개별 Claude Code 인스턴스 |
| **Task list** | 팀원이 할당받고 완료하는 공유 작업 항목 목록 |
| **Mailbox** | 에이전트 간 통신 메시징 시스템 |

시스템이 태스크 의존성을 자동으로 관리합니다. 팀원이 다른 태스크가 의존하는 태스크를 완료하면 차단된 태스크가 수동 개입 없이 차단 해제됩니다.

저장 위치:

- 팀 설정: `~/.claude/teams/{team-name}/config.json`
- 태스크 목록: `~/.claude/tasks/{team-name}/`

Claude Code는 팀 생성 시 두 파일을 자동으로 생성하며, 팀원이 참여·유휴·이탈할 때마다 업데이트합니다. 팀 설정은 세션 ID, tmux 창 ID 등 런타임 상태를 포함하므로 수동 편집하거나 사전 작성하지 마십시오 (다음 상태 업데이트 시 덮어씌워짐). 재사용 가능한 팀원 역할을 정의하려면 subagent 정의를 사용하십시오.

팀 설정의 `members` 배열에는 각 팀원의 name, agent ID, agent type이 포함됩니다. 팀원은 이 파일을 읽어 다른 팀원을 발견할 수 있습니다. 프로젝트 수준의 팀 설정 파일(예: `.claude/teams/teams.json`)은 인식되지 않으며 Claude가 일반 파일로 취급합니다.

### 디스플레이 모드

| 모드 | 설명 | 요구사항 |
| --- | --- | --- |
| **In-process** | 모든 팀원이 메인 터미널에서 실행. `Shift+Down`으로 팀원 순환 | 없음 |
| **Split panes** | 각 팀원이 별도의 창. 모든 출력을 동시에 볼 수 있음 | tmux 또는 iTerm2 |

기본값은 `"auto"` (tmux 세션 안이면 split panes, 아니면 in-process). 설정 변경:

```json
{
  "teammateMode": "in-process"
}
```

또는 세션별 플래그:

```bash
claude --teammate-mode in-process
```

### 팀원 및 모델 지정

```
Create a team with 4 teammates to refactor these modules in parallel.
Use Sonnet for each teammate.
```

팀원은 기본적으로 리드의 `/model` 설정을 상속하지 않습니다. `/config`에서 **Default teammate model**을 변경하거나, **Default (leader's model)**을 선택하여 리드의 현재 모델을 따르게 할 수 있습니다.

### Subagent 정의를 팀원으로 사용

미리 정의한 subagent 타입을 팀원으로 참조할 수 있습니다.

```
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```

팀원은 해당 정의의 `tools` 허용 리스트와 `model`을 따르며, 정의의 본문은 시스템 프롬프트에 추가됩니다. `SendMessage` 및 태스크 관리 도구는 `tools` 제한에 관계없이 항상 사용 가능합니다.

### 태스크 할당 및 관리

태스크 상태: pending, in progress, completed. 태스크 간 의존성 설정 가능.

- **리드가 할당**: 리드에게 어떤 태스크를 누구에게 줄지 지시
- **자동 할당**: 팀원이 태스크를 완료하면 다음 미할당, 미차단 태스크를 자동으로 가져감
- 파일 잠금으로 동시 할당 경쟁 방지

### 품질 게이트 (Hooks)

| Hook | 실행 시점 | 종료 코드 2의 효과 |
| --- | --- | --- |
| `TeammateIdle` | 팀원이 유휴 상태로 전환 직전 | 피드백 전송, 팀원 계속 작업 |
| `TaskCreated` | 태스크 생성 중 | 생성 방지, 피드백 전송 |
| `TaskCompleted` | 태스크 완료 표시 중 | 완료 방지, 피드백 전송 |

### 계획 승인 요구

복잡하거나 위험한 태스크에서 팀원이 구현 전에 계획을 승인받도록 요구할 수 있습니다.

```
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```

### 컨텍스트 및 통신

각 팀원은 고유한 컨텍스트 윈도우를 가집니다. 생성 시 팀원은 일반 세션과 동일한 프로젝트 컨텍스트(CLAUDE.md, MCP 서버, 스킬)를 로드하며, 리드로부터 spawn 프롬프트도 받습니다. 리드의 대화 기록은 상속되지 않습니다.

**팀원 간 정보 공유 방식:**

- **자동 메시지 전달**: 팀원이 메시지를 보내면 수신자에게 자동 전달됨. 리드가 업데이트를 폴링할 필요 없음
- **유휴 알림**: 팀원이 작업을 마치고 멈추면 리드에게 자동으로 알림이 전송됨
- **공유 태스크 목록**: 모든 에이전트가 태스크 상태를 확인하고 사용 가능한 작업을 할당받을 수 있음
- **팀원 메시징**: 이름으로 특정 팀원에게 메시지를 보냄. 모두에게 연락하려면 수신자별로 개별 메시지를 보내야 함

리드는 팀원을 생성할 때마다 이름을 할당하며, 모든 팀원은 이름으로 서로 메시지를 보낼 수 있습니다. 이후 프롬프트에서 참조할 수 있는 예측 가능한 이름을 원하면 spawn 지시에서 각 팀원의 이름을 지정하십시오.

### 토큰 사용량

Agent Teams는 단일 세션보다 훨씬 많은 토큰을 사용합니다. 각 팀원이 고유한 컨텍스트 윈도우를 가지며, 토큰 사용량은 활성 팀원 수에 비례하여 증가합니다. 연구, 리뷰, 신규 기능 작업에서는 추가 토큰이 보통 가치가 있습니다. 루틴 태스크에서는 단일 세션이 더 비용 효율적입니다.

### 권한

팀원은 리드의 권한 설정으로 시작합니다. 리드가 `--dangerously-skip-permissions`로 실행 중이면 모든 팀원도 동일. 생성 후 개별 팀원의 모드를 변경할 수 있지만, 생성 시점에 팀원별 모드를 설정할 수는 없습니다.

### 키보드 단축키 (In-process 모드)

| 단축키 | 동작 |
| --- | --- |
| `Shift+Down` | 팀원 순환 (마지막 팀원 후 리드로 돌아감) |
| `Enter` | 선택한 팀원의 세션 보기 |
| `Escape` | 팀원의 현재 턴 중단 |
| `Ctrl+T` | 태스크 목록 토글 |

### 팀원 종료 및 정리

팀원을 우아하게 종료하려면:

```
Ask the researcher teammate to shut down
```

리드가 shutdown 요청을 보냅니다. 팀원은 승인(우아하게 종료)하거나 거부(이유와 함께)할 수 있습니다.

작업이 끝나면 리드에게 정리를 요청하십시오. 공유 팀 리소스가 제거됩니다. 리드는 정리 시 활성 팀원이 있는지 확인하고, 있으면 실패하므로 먼저 팀원을 종료하십시오.

### 사용 사례 예시

#### 병렬 코드 리뷰

단일 리뷰어는 한 번에 한 가지 유형의 이슈에 집중하는 경향이 있습니다. 리뷰 기준을 독립된 영역으로 분할하면 보안, 성능, 테스트 커버리지가 모두 동시에 철저한 검토를 받습니다.

```
Create an agent team to review PR #142. Spawn three reviewers:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

각 리뷰어는 동일한 PR에서 작업하지만 다른 필터를 적용합니다. 리드는 세 명 모두의 발견을 종합합니다.

#### 경쟁 가설로 조사

근본 원인이 불명확할 때, 단일 에이전트는 하나의 그럴듯한 설명을 찾으면 탐색을 멈추는 경향이 있습니다. 팀원이 명시적으로 대립하도록 만들어 이를 방지합니다.

```
Users report the app exits after one message instead of staying connected.
Spawn 5 agent teammates to investigate different hypotheses. Have them talk to
each other to try to disprove each other's theories, like a scientific
debate. Update the findings doc with whatever consensus emerges.
```

순차 조사는 닻내림 효과의 영향을 받습니다: 한 이론이 탐색되면 이후 조사가 그쪽으로 편향됩니다. 여러 독립 조사자가 서로의 이론을 적극적으로 반박하면, 살아남는 이론이 실제 근본 원인일 가능성이 훨씬 높습니다.

### 베스트 프랙티스

1. **팀원에게 충분한 컨텍스트 제공**: 팀원은 프로젝트 컨텍스트를 자동으로 로드하지만 리드의 대화 기록은 상속되지 않습니다. spawn 프롬프트에 태스크별 세부 정보를 포함하십시오

2. **적절한 팀 규모 선택**: 토큰 비용은 선형으로 증가하고 조정 오버헤드도 증가합니다. 대부분의 워크플로우에서 3~5명의 팀원으로 시작하십시오. 팀원당 5~6개 태스크가 과도한 컨텍스트 전환 없이 생산성을 유지합니다

3. **태스크 크기 적절히 조정**: 너무 작으면 조정 오버헤드가 이익을 초과, 너무 크면 체크인 없이 너무 오래 작업하여 낭비 위험 증가. 함수, 테스트 파일, 리뷰 등 명확한 산출물을 내는 자급자족 단위가 적합

4. **팀원 완료 대기**: 리드가 팀원을 기다리지 않고 직접 태스크를 구현하기 시작하는 경우가 있습니다. 발견하면 다음과 같이 지시하십시오: `Wait for your teammates to complete their tasks before proceeding`

5. **연구 및 리뷰로 시작**: Agent Teams가 처음이면 코드 작성이 필요 없는 명확한 경계의 태스크로 시작하십시오: PR 리뷰, 라이브러리 조사, 버그 조사 등

6. **파일 충돌 방지**: 두 팀원이 같은 파일을 편집하면 덮어쓰기가 발생합니다. 각 팀원이 다른 파일 세트를 소유하도록 작업을 분할하십시오

7. **모니터링 및 조정**: 팀원의 진행 상황을 확인하고, 작동하지 않는 접근을 리디렉션하며, 발견이 들어오는 대로 종합하십시오. 팀을 너무 오래 방치하면 낭비된 노력의 위험이 증가합니다

### 트러블슈팅

#### 팀원이 나타나지 않는 경우

- In-process 모드에서는 팀원이 이미 실행 중이지만 보이지 않을 수 있음. `Shift+Down`으로 활성 팀원을 순환
- Claude가 태스크를 기반으로 팀원 생성 여부를 결정하므로, 태스크가 팀을 필요로 할 만큼 복잡한지 확인
- Split pane을 명시적으로 요청한 경우 tmux가 설치되어 PATH에 있는지 확인
- iTerm2의 경우 `it2` CLI가 설치되어 있고 iTerm2 환경설정에서 Python API가 활성화되어 있는지 확인

#### 권한 프롬프트가 너무 많은 경우

팀원의 권한 요청이 리드로 전달되어 마찰이 발생할 수 있습니다. 팀원을 생성하기 전에 권한 설정에서 일반적인 작업을 미리 승인하여 중단을 줄이십시오.

#### 팀원이 에러로 정지하는 경우

팀원이 에러를 만나면 복구 대신 정지할 수 있습니다. In-process 모드에서 `Shift+Down` 또는 Split 모드에서 창을 클릭하여 출력을 확인한 후:
- 직접 추가 지시를 제공
- 대체 팀원을 생성하여 작업을 계속

#### 리드가 작업 완료 전에 종료하는 경우

리드가 모든 태스크가 완료되기 전에 팀이 끝났다고 판단할 수 있습니다. 이 경우 계속 진행하라고 지시하십시오. 리드가 위임 대신 직접 작업하기 시작하면 팀원의 완료를 기다리라고 지시할 수도 있습니다.

#### 고아 tmux 세션

팀이 종료된 후 tmux 세션이 남아 있는 경우 완전히 정리되지 않았을 수 있습니다.

```bash
tmux ls
tmux kill-session -t <session-name>
```

### 제한사항

- `/resume` 및 `/rewind`로 in-process 팀원 복원 불가
- 태스크 상태가 지연될 수 있음
- 종료가 느릴 수 있음
- 리드당 한 팀만 관리 가능
- 중첩 팀 불가 (팀원이 자신의 팀을 생성할 수 없음)
- 리드 고정 (팀원을 리드로 승격 불가)
- 모든 팀원은 리드의 권한 모드로 시작
- Split pane 모드는 VS Code 통합 터미널, Windows Terminal, Ghostty에서 미지원

---

## Agent View

Agent View는 `claude agents` 명령어로 여는 모든 백그라운드 세션의 관리 화면입니다. Research preview. Claude Code v2.1.139 이상 필요. 여러 독립 태스크를 위임하고 한눈에 상태를 확인하며, 입력이 필요할 때만 개입할 수 있는 하나의 화면을 제공합니다.

### 빠른 시작

| 단계 | 동작 |
| --- | --- |
| 1 | `claude agents` 실행 |
| 2 | 프롬프트 입력 후 `Enter`로 세션 디스패치 |
| 3 | `Space`로 피크 패널 열어서 최근 출력 확인 및 답변 |
| 4 | `Enter` 또는 `→`로 전체 대화에 첨부, `←`로 분리 |
| 5 | 기존 세션에서 `/bg` 또는 `←`로 백그라운드 전환 |

### 세션 상태

| 상태 | 아이콘 표시 | 의미 |
| --- | --- | --- |
| Working | 애니메이션 | Claude가 도구를 실행하거나 응답 생성 중 |
| Needs input | 노란색 | Claude가 질문이나 권한 결정 대기 |
| Idle | 흐림 | 다음 프롬프트 대기 중 |
| Completed | 초록색 | 태스크 성공 완료 |
| Failed | 빨간색 | 오류로 종료 |
| Stopped | 회색 | `Ctrl+X` 또는 `claude stop`으로 정지 |

아이콘 모양으로 프로세스 상태 구분:

| 모양 | 의미 |
| --- | --- |
| `✻` 또는 애니메이션 `✽` | 세션 프로세스 활성, 즉시 응답 |
| `∙` | 프로세스 종료됨. 피크, 답변, 첨부 가능하며 Claude가 이어서 재시작 |
| `✢` | `/loop` 세션이 반복 사이에 대기 중 |

### 키보드 단축키

| 단축키 | 동작 |
| --- | --- |
| `↑` / `↓` | 행 간 이동 |
| `Enter` | 선택한 세션에 첨부, 또는 입력이 있으면 디스패치 |
| `Space` | 피크 패널 열기/닫기 |
| `Shift+Enter` | 디스패치 후 즉시 첨부 |
| `→` | 선택한 세션에 첨부 |
| `Alt+1`..`Alt+9` | 해당 디렉터리의 1~9번 세션에 첨부 |
| `Tab` | 빈 입력에서 subagent 탐색, 그 외 제안 적용 |
| `Ctrl+S` | 상태/디렉터리 그룹핑 전환 |
| `Ctrl+T` | 세션 고정/해제 |
| `Ctrl+R` | 세션 이름 변경 |
| `Ctrl+G` | 에디터에서 디스패치 프롬프트 작성 |
| `Ctrl+X` | 세션 정지, 2초 내 다시 누르면 삭제 |
| `Shift+↑` / `Shift+↓` | 세션 순서 변경 |
| `Esc` | 피크 패널 닫기, 입력 지우기, 종료 |
| `?` | 모든 단축키 표시 |

### 세션 디스패치

| 입력 | 효과 |
| --- | --- |
| `<agent-name> <prompt>` | 첫 단어가 subagent 이름과 일치하면 해당 subagent로 실행 |
| `@<agent-name>` | 프롬프트 내에서 subagent 지정 |
| `@<repo>` | 하위 리포지토리에서 세션 실행 |
| `/<command>` | 스킬이나 명령어를 프롬프트로 디스패치 |
| `! <command>` | Claude 세션 대신 셸 명령을 백그라운드 잡으로 실행 |
| `#<number>` 또는 PR URL | 해당 PR을 작업 중인 세션 선택 |

셸에서 직접 디스패치:

```bash
claude --bg "investigate the flaky SettingsChangeDetector test"
claude --agent code-reviewer --bg "address review comments on PR 1234"
claude --bg --name "flaky-test-fix" "investigate the flaky test"
```

### 파일 편집 격리

모든 백그라운드 세션은 파일 편집 전 `.claude/worktrees/` 하위의 격리된 git worktree로 이동합니다.

Worktree 생략 조건:
- 이미 연결된 git worktree 안에 있는 경우
- 작업 디렉터리가 git 리포지토리가 아닌 경우
- 쓰기가 작업 디렉터리 밖인 경우

Worktree 격리 끄기 (v2.1.143+):

```json
{
  "worktree": {
    "bgIsolation": "none"
  }
}
```

### 백그라운드 세션 관리 (셸 명령)

| 명령어 | 용도 |
| --- | --- |
| `claude agents` | Agent View 열기 |
| `claude agents --cwd <path>` | 특정 디렉터리로 범위 제한 |
| `claude agents --json` | 실행 중인 세션을 JSON 배열로 출력 |
| `claude attach <id>` | 세션에 첨부 |
| `claude logs <id>` | 최근 출력 표시 |
| `claude stop <id>` | 세션 정지 |
| `claude respawn <id>` | 대화를 유지한 채 세션 재시작 |
| `claude respawn --all` | 모든 실행 중인 세션 재시작 |
| `claude rm <id>` | 세션 제거 |
| `claude daemon status` | 감독자 프로세스 상태 확인 |
| `claude daemon stop --any` | 감독자 및 백그라운드 세션 정지 |

### 상태 저장 위치

| 경로 | 내용 |
| --- | --- |
| `~/.claude/daemon.log` | 감독자 로그 |
| `~/.claude/daemon/roster.json` | 실행 중인 백그라운드 세션 목록 |
| `~/.claude/jobs/<id>/state.json` | 세션별 상태 |
| `~/.claude/jobs/<id>/tmp/` | 세션별 임시 디렉터리 |

### Agent View 비활성화

`disableAgentView` 설정을 `true`로 설정하거나 `CLAUDE_CODE_DISABLE_AGENT_VIEW` 환경변수를 설정합니다.

---

## /goal 명령어

`/goal` 명령어로 완료 조건을 설정하면 Claude가 조건이 충족될 때까지 여러 턴에 걸쳐 계속 작업합니다. 복잡한 태스크에서 중간에 사용자가 개입하지 않아도 Claude가 스스로 판단하여 작업을 이어갈 수 있습니다.

- 설정 방법: `/goal <완료 조건>` 입력
- Claude는 조건이 충족될 때까지 턴을 반복하며 작업 진행
- 탐색 메뉴의 Goals 섹션(Automation 카테고리)에 위치

---

## 실행 중인 작업 확인

| 접근 방식 | 확인 명령 |
| --- | --- |
| 백그라운드 세션 | `claude agents` (Agent View) |
| 현재 세션의 subagent | `/agents` (Running 탭 + Library 탭) |
| 현재 세션의 백그라운드 작업 | `/tasks` |
| Dynamic Workflows | `/workflows` |
