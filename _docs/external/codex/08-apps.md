# Codex - 플러그인, 연동, 및 앱 기능

> Codex의 플러그인 시스템, 외부 서비스 연동, Sites 호스팅, 그리고 앱 내 기능(Review, Automations, Worktrees)에 대해 설명합니다.

**참조**: <https://developers.openai.com/codex/integrations/github>, <https://developers.openai.com/codex/integrations/slack>, <https://developers.openai.com/codex/integrations/linear>, <https://developers.openai.com/codex/sites>, <https://developers.openai.com/codex/app/review>, <https://developers.openai.com/codex/app/automations>, <https://developers.openai.com/codex/app/worktrees>

---

## 플러그인 및 연동 개요

Plugins는 skills, app 연동, MCP 서버를 재사용 가능한 워크플로로 묶어 Codex의 기능을 확장합니다.

플러그인이 포함할 수 있는 요소:

| 구성 요소 | 설명 |
| --- | --- |
| Skills | 특정 작업에 대한 재사용 가능한 지침. 필요할 때 Codex가 로드 |
| Apps | GitHub, Slack, Google Drive 등 외부 도구와의 연결 |
| MCP servers | 로컬 프로젝트 외부의 시스템에서 추가 도구나 공유 정보에 접근 |

### 지원 플러그인 및 연동

| 플러그인/연동 | 유형 | 설명 |
| --- | --- | --- |
| GitHub Code Review | 연동(Integration) | PR 코드 리뷰 자동화 |
| Slack | 연동(Integration) | 채널/스레드에서 작업 실행 |
| Linear | 연동(Integration) | 이슈에서 작업 위임 및 triage 자동화 |
| Sites | 플러그인 | 웹사이트/앱 생성 및 배포 호스팅 |
| Codex Security | 플러그인 | 인가된 코드 스캔 및 취약점 확인 |
| Gmail | 플러그인 | 이메일 읽기 및 관리 |
| Google Drive | 플러그인 | Drive, Docs, Sheets, Slides 연동 |

---

## 플러그인 설치 및 사용

### Codex 앱에서의 Plugin Directory

Codex 앱에서 **Plugins**를 열어 큐레이션된 플러그인을 탐색하고 설치합니다.

플러그인 디렉토리 분류:

| 카테고리 | 설명 |
| --- | --- |
| Curated by OpenAI | 모든 Codex 사용자에게 제공되는 추천 플러그인 |
| Shared with you | ChatGPT 워크스페이스 구성원이 공유한 플러그인 |
| Created by you | 직접 생성하거나 워크스페이스에 추가한 플러그인 |

### CLI에서 플러그인 관리

```
codex
/plugins
```

CLI 플러그인 브라우저는 마켓플레이스별로 그룹화됩니다. 마켓플레이스 탭으로 소스를 전환하고, 플러그인 상세를 확인하며, 설치/제거할 수 있습니다. 설치된 플러그인에서 `Space`를 눌러 활성화 상태를 토글합니다.

### 플러그인 설치 및 호출

1. 플러그인 디렉토리에서 검색 또는 탐색 후 상세를 엽니다.
2. 설치 버튼을 선택합니다. (앱: 플러스 버튼 또는 **Add to Codex**, CLI: `Install plugin`)
3. 외부 앱 연결이 필요한 경우 안내에 따라 인증합니다.
4. 설치 후 새 스레드를 시작하고 플러그인을 사용합니다.

플러그인 호출 방법:

| 방식 | 예시 | 사용 시기 |
| --- | --- | --- |
| 작업 직접 설명 | "Summarize unread Gmail threads from today" | Codex가 적절한 도구를 자동 선택하게 할 때 |
| 특정 플러그인 지정 | `@Gmail` 또는 `@Sites` | 특정 플러그인이나 skill을 명시할 때 |

### 권한 및 데이터 공유

플러그인 설치 시 워크플로가 Codex에 제공되지만, 기존 승인 설정은 그대로 유지됩니다.

- Bundled skills는 설치 즉시 사용 가능
- 플러그인에 apps가 포함된 경우 ChatGPT에서 설치 또는 로그인 필요
- MCP 서버가 포함된 경우 추가 설정이나 인증이 필요할 수 있음
- 외부 서비스를 통한 데이터 전송 시 해당 앱의 약관 및 개인정보처리방침이 적용

### 플러그인 제거 및 비활성화

플러그인 브라우저에서 다시 열어 **Uninstall plugin**을 선택합니다. 제거해도 bundled apps는 ChatGPT에서 관리할 때까지 설치된 상태로 유지됩니다.

설치 상태를 유지하면서 비활성화하려면 `~/.codex/config.toml`에서 설정 후 Codex를 재시작합니다.

```toml
[plugins."gmail@openai-curated"]
enabled = false
```

---

## GitHub Code Review

Codex를 사용하면 GitHub Pull Request에 대한 고품질 코드 리뷰를 수행할 수 있습니다. Codex는 PR diff를 검토하고, 리포지토리 가이드라인을 따르며, 심각한 이슈에 집중한 표준 GitHub 코드 리뷰를 게시합니다.

### 사전 준비

- 리뷰할 리포지토리에 대해 Codex Cloud가 설정되어 있어야 합니다.
- Codex code review 설정에 접근할 수 있어야 합니다.
- 리포지토리별 리뷰 가이드라인을 원하는 경우 `AGENTS.md` 파일이 필요합니다.

### 설정

1. Codex Cloud를 설정합니다.
2. Codex 설정으로 이동합니다.
3. 해당 리포지토리의 **Code review** 토글을 켭니다.

### 리뷰 요청

PR 코멘트에서 `@codex review`를 멘션합니다.

```
@codex review
```

Codex는 팀원처럼 PR에 리뷰를 게시하며, **P0 및 P1 이슈**만 플래그하여 리뷰 코멘트가 우선순위가 높은 위험에 집중되도록 합니다.

### 자동 리뷰

**Automatic Reviews**를 활성화하면 누군가 새 PR을 열 때 `@codex review` 코멘트 없이도 자동으로 리뷰가 게시됩니다.

### 커스터마이징

#### AGENTS.md 리뷰 가이드라인

리포지토리에 `AGENTS.md` 파일을 추가하여 **Review guidelines**를 정의합니다.

```markdown
## Review guidelines

- Don't log PII.
- Verify that authentication middleware wraps every route.
```

Codex는 변경된 파일에 가장 가까운 `AGENTS.md`의 가이드라인을 적용합니다. 특정 패키지에 추가 검증이 필요한 경우 더 깊은 디렉토리에 구체적인 지침을 배치할 수 있습니다.

문서 내 오타를 플래그하려면 `AGENTS.md`에 가이드라인을 추가합니다. (예: "Treat typos in docs as P1.")

#### 일회성 포커스

PR 코멘트에 특정 초점을 추가할 수도 있습니다.

```
@codex review for security regressions
```

### 리뷰 후 수정

리뷰가 게시된 후, 같은 PR에서 코멘트를 통해 이슈 수정을 요청할 수 있습니다.

```
@codex fix the P1 issue
```

Codex는 PR을 컨텍스트로 사용하여 클라우드 작업을 시작하고, 권한이 있는 경우 브랜치에 수정 사항을 푸시할 수 있습니다.

### 기타 작업 위임

`@codex`와 함께 `review` 외의 다른 명령을 사용하면 Codex가 PR을 컨텍스트로 사용하는 클라우드 작업을 시작합니다.

```
@codex fix the CI failures
```

### Troubleshoot

Codex가 반응하지 않거나 리뷰를 게시하지 않는 경우:

- Codex 설정에서 해당 리포지토리에 **Code review**가 활성화되어 있는지 확인
- PR이 Codex Cloud가 설정된 리포지토리에 속해 있는지 확인
- PR 코멘트에 정확한 트리거 `@codex review`를 사용했는지 확인
- 자동 리뷰의 경우 **Automatic Reviews**가 활성화되어 있고 PR 이벤트가 리뷰 트리거 설정과 일치하는지 확인

---

## Slack 통합

Slack 채널과 스레드에서 `@Codex`를 멘션하여 코딩 작업을 시작할 수 있습니다. Codex가 클라우드 작업을 생성하고 결과로 답장합니다.

### 설정

1. **Codex Cloud 작업 설정**: Plus, Pro, Business, Enterprise, 또는 Edu 플랜이 필요하며, 연결된 GitHub 계정과 최소 하나의 환경이 필요합니다.
2. **Slack 앱 설치**: Codex 설정에서 Slack 앱을 워크스페이스에 설치합니다. Slack 워크스페이스 정책에 따라 관리자 승인이 필요할 수 있습니다.
3. **채널에 @Codex 추가**: 채널에 `@Codex`를 추가합니다. 아직 추가하지 않은 경우 멘션 시 Slack이 추가를 안내합니다.

### 작업 시작

1. 채널이나 스레드에서 `@Codex`를 멘션하고 프롬프트를 포함합니다. Codex는 스레드의 이전 메시지를 참조할 수 있으므로 컨텍스트를 다시 설명할 필요가 없습니다.
2. (선택) 프롬프트에 환경이나 리포지토리를 지정합니다. (예: `@Codex fix the above in openai/codex`)
3. Codex가 반응(👀)하고 작업 링크로 답장합니다. 완료되면 결과를 스레드에 게시합니다.

### 환경 선택 방식

| 조건 | 동작 |
| --- | --- |
| 명시적 지정 | 프롬프트에 지정된 환경/리포지토리 사용 |
| 모호한 요청 | 사용자가 가장 최근에 사용한 환경으로 폴백 |
| 기본 리포지토리 | 환경의 리포지토리 맵에서 첫 번째 리포지토리의 기본 브랜치 사용 |
| 적합한 환경 없음 | Slack에서 해결 방법 안내 후 재시도 |

### 엔터프라이즈 데이터 제어

기본적으로 Codex는 작업 완료 시 스레드에 전체 답변을 게시합니다. 엔터프라이즈 관리자는 ChatGPT 워크스페이스 설정에서 **Allow Codex Slack app to post answers on task completion**을 해제하여 이를 비활성화할 수 있습니다. 비활성화하면 Codex는 작업 링크만 게시합니다.

### Data usage, privacy, and security

`@Codex`를 멘션하면 Codex가 요청을 이해하고 작업을 생성하기 위해 메시지와 스레드 히스토리를 수신합니다.

- 데이터 처리는 OpenAI의 Privacy Policy, Terms of Use 및 기타 적용 가능한 정책을 따릅니다.
- 보안에 대한 자세한 내용은 Codex security documentation을 참조하십시오.
- Codex는 대규모 언어 모델을 사용하므로 실수를 할 수 있습니다. 항상 답변과 diff를 검토하십시오.

### Tips and troubleshooting

| 문제 | 해결 방법 |
| --- | --- |
| Missing connections | Slack 또는 GitHub 연결을 확인할 수 없는 경우, Codex가 재연결 링크로 답장 |
| Unexpected environment choice | 스레드에서 원하는 환경을 지정한 후 (예: `Please run this in openai/openai (applied)`) `@Codex`를 다시 멘션 |
| Long or complex threads | 최신 메시지에 핵심 내용을 요약하여 컨텍스트 누락 방지 |
| Workspace posting | 일부 Enterprise 워크스페이스는 최종 답변 게시를 제한. 이 경우 작업 링크를 열어 진행 상황과 결과 확인 |
| More help | OpenAI Help Center 참조 |

---

## Linear 통합

Linear 이슈에서 작업을 위임할 수 있습니다. 이슈를 Codex에 할당하거나 코멘트에서 `@Codex`를 멘션하면 Codex가 클라우드 작업을 생성하고 진행 상황과 결과를 답장합니다.

> Codex in Linear는 유료 플랜에서 사용 가능합니다 (Pricing 참조). Enterprise 플랜의 경우 ChatGPT 워크스페이스 관리자에게 Codex cloud tasks를 활성화하고 커넥터 설정에서 **Codex for Linear**를 켜달라고 요청하십시오.

### 설정

1. Codex에서 GitHub를 연결하고 작업할 리포지토리에 대한 환경을 생성하여 Codex Cloud 작업을 설정합니다.
2. Codex 설정에서 **Codex for Linear**를 워크스페이스에 설치합니다.
3. Linear 이슈의 코멘트 스레드에서 `@Codex`를 멘션하여 Linear 계정을 연결합니다.

### 이슈 할당

설치 후 이슈를 팀원에게 할당하듯이 Codex에게 할당할 수 있습니다. Codex가 작업을 시작하고 이슈에 업데이트를 게시합니다.

코멘트 스레드에서 `@Codex`를 멘션하여 작업을 위임하거나 질문할 수도 있습니다. Codex가 답장한 후 스레드에서 후속 질문을 하면 같은 세션이 계속됩니다.

특정 리포지토리를 지정하려면 코멘트에 포함합니다. (예: `@Codex fix this in openai/codex`)

진행 상황 추적:

- 이슈의 **Activity**에서 진행 업데이트 확인
- 작업 링크를 열어 상세 진행 상황 확인

작업이 완료되면 Codex가 요약과 완료된 작업 링크를 게시하여 PR을 생성할 수 있습니다.

### 환경 선택 방식

| 조건 | 동작 |
| --- | --- |
| 이슈 컨텍스트 기반 | Linear가 이슈 컨텍스트를 기반으로 리포지토리를 제안하고 Codex가 매칭되는 환경 선택 |
| 모호한 요청 | 사용자가 가장 최근에 사용한 환경으로 폴백 |
| 기본 리포지토리 | 환경의 리포지토리 맵에서 첫 번째 리포지토리의 기본 브랜치 사용 |
| 적합한 환경 없음 | Linear에서 해결 방법 안내 후 재시도 |

### Triage rules

Triage rules를 사용하여 이슈를 Codex에 자동 할당할 수 있습니다.

1. Linear에서 **Settings**로 이동합니다.
2. **Your teams**에서 팀을 선택합니다.
3. 워크플로 설정에서 **Triage**를 열고 활성화합니다.
4. **Triage rules**에서 규칙을 생성하고 **Delegate** > **Codex**를 선택합니다 (및 기타 설정할 속성).

Triage가 활성화되면 새 이슈가 triage에 들어올 때 자동으로 Codex에 할당됩니다. Triage rules를 사용하면 Codex가 이슈 생성자의 계정으로 작업을 실행합니다.

### MCP 서버 로컬 연결

Codex 앱, CLI, 또는 IDE Extension에서 로컬로 Linear 이슈에 접근하려면 Linear MCP(Model Context Protocol) 서버를 구성합니다.

#### CLI 사용 (권장)

```
codex mcp add linear --url https://mcp.linear.app/mcp
```

Linear 계정으로 로그인하고 Codex에 연결하라는 안내가 표시됩니다.

#### 수동 구성

1. 편집기에서 `~/.codex/config.toml`을 엽니다.
2. 다음을 추가합니다.

```toml
[mcp_servers.linear]
url = "https://mcp.linear.app/mcp"
```

3. `codex mcp login linear`을 실행하여 로그인합니다.

---

## Review (앱 내 코드 리뷰)

Review pane은 Codex가 변경한 내용을 이해하고, 타겟 피드백을 제공하며, 유지할 변경 사항을 결정하는 데 도움을 줍니다.

Review pane은 Git 리포지토리 내에 있는 프로젝트에서만 작동합니다. 프로젝트가 아직 Git 리포지토리가 아닌 경우, review pane에서 생성하라는 메시지가 표시됩니다.

### 표시되는 변경 사항

Review pane은 Codex가 편집한 내용뿐만 아니라 **Git 리포지토리의 상태**를 반영합니다. 즉, 다음이 모두 표시됩니다.

- Codex가 수행한 변경
- 사용자가 직접 수행한 변경
- 리포의 다른 모든 uncommitted 변경

기본적으로 review pane은 **uncommitted changes**에 집중합니다. 스코프를 다음으로 전환할 수도 있습니다.

| 스코프 | 설명 |
| --- | --- |
| **Uncommitted changes** | (기본값) 커밋되지 않은 모든 변경 |
| **All branch changes** | base 브랜치와의 diff |
| **Last turn changes** | 가장 최근 어시스턴트 턴의 변경만 |

로컬에서 작업 시 **Unstaged**와 **Staged** 변경 사이를 토글할 수도 있습니다.

### Review pane 탐색

| 액션 | 설명 |
| --- | --- |
| 파일명 클릭 | 설정에서 선택한 편집기에서 해당 파일 열기 |
| 파일명 배경 클릭 | diff 펼치기/접기 |
| `Cmd` 키를 누른 채 줄 클릭 | 선택한 편집기에서 해당 줄 열기 |
| 만족하는 변경 | stage / 만족하지 않는 변경은 revert |

### 인라인 코멘트로 피드백

인라인 코멘트를 사용하면 diff의 특정 줄에 직접 피드백을 첨부할 수 있습니다. 이는 종종 Codex를 올바른 수정으로 안내하는 가장 빠른 방법입니다.

인라인 코멘트 남기기:

1. Review pane을 엽니다.
2. 코멘트를 남기고 싶은 줄에 마우스를 올립니다.
3. 나타나는 **+** 버튼을 클릭합니다.
4. 피드백을 작성하고 제출합니다.
5. 피드백 작성이 끝나면 스레드에 메시지를 다시 보냅니다.

코멘트는 줄 단위로 특정되므로, Codex는 일반적인 지침보다 더 정확하게 응답할 수 있습니다.

Codex는 인라인 코멘트를 리뷰 가이드라인으로 처리합니다. 코멘트를 남긴 후, 의도를 명확히 하는 후속 메시지를 보내십시오. 예: "Address the inline comments and keep the scope minimal."

### 코드 리뷰 결과

`/review`를 사용하여 코드 리뷰를 실행하면, 코멘트가 review pane에 직접 인라인으로 표시됩니다.

### Pull request 리뷰

Codex가 리포지토리에 대한 GitHub 접근 권한이 있고 현재 프로젝트가 PR 브랜치에 있는 경우, Codex 앱은 앱을 떠나지 않고도 PR 피드백을 처리할 수 있습니다. 사이드바에 PR 컨텍스트와 리뷰어 피드백이 표시되고, review pane에 diff와 함께 코멘트가 표시되어 같은 스레드에서 Codex에게 이슈 해결을 요청할 수 있습니다.

GitHub CLI(`gh`)를 설치하고 `gh auth login`으로 인증하여 Codex가 PR 컨텍스트, 리뷰 코멘트, 변경된 파일을 로드할 수 있도록 하십시오. `gh`가 누락되거나 인증되지 않은 경우 PR 세부 정보가 사이드바나 review pane에 나타나지 않을 수 있습니다.

PR 리뷰 워크플로:

1. PR 브랜치에서 review pane을 엽니다.
2. PR 컨텍스트, 코멘트, 변경된 파일을 검토합니다.
3. 처리할 특정 코멘트를 Codex에게 수정하도록 요청합니다.
4. Review pane에서 결과 diff를 검사합니다.
5. 준비되면 변경을 stage, commit, push합니다.

> GitHub 트리거 리뷰에 대해서는 GitHub Code Review 섹션을 참조하십시오.

### 파일 staging 및 revert

Review pane에는 커밋 전에 diff를 형성할 수 있는 Git 액션이 포함되어 있습니다.

다음 수준에서 stage, unstage, revert를 수행할 수 있습니다.

| 수준 | 설명 |
| --- | --- |
| **전체 diff** | Review 헤더의 액션 버튼 사용 (예: "Stage all" 또는 "Revert all") |
| **파일별** | 개별 파일에 대해 stage, unstage, revert |
| **Hunk별** | 단일 hunk에 대해 stage, unstage, revert |

작업의 일부를 수용하려면 staging을, 폐기하려면 revert를 사용하십시오.

#### Staged와 unstaged 상태

Git은 동일한 파일에 staged와 unstaged 변경을 모두 나타낼 수 있습니다. 이 경우 pane이 staged와 unstaged 보기에서 "같은 파일이 두 번" 표시되는 것처럼 보일 수 있습니다. 이는 정상적인 Git 동작입니다.

---

## Automations (자동화)

Automations를 사용하면 백그라운드에서 반복 작업을 자동화할 수 있습니다. Codex가 발견한 내용을 inbox에 추가하거나, 보고할 내용이 없으면 자동으로 작업을 보관합니다. Skills와 결합하여 더 복잡한 작업을 수행할 수도 있습니다.

### 사전 조건

프로젝트 범위의 automation의 경우, automation이 실행되도록 예약된 시점에 다음 조건이 충족되어야 합니다.

- 로컬 Codex 앱을 실행하는 머신이 켜져 있어야 합니다.
- Codex가 실행 중이어야 합니다.
- 선택한 프로젝트가 디스크에서 사용 가능해야 합니다.

### 실행 위치

Git 리포지토리에서는 automation을 로컬 프로젝트에서 실행할지 새 worktree에서 실행할지 선택할 수 있습니다. 두 옵션 모두 백그라운드에서 실행됩니다.

| 실행 위치 | 설명 |
| --- | --- |
| **로컬 프로젝트** | 작업 중인 파일을 직접 수정할 수 있음 |
| **Worktree** | automation 변경 사항을 진행 중인 로컬 작업과 분리 |

비 버전 관리 프로젝트에서는 automation이 프로젝트 디렉토리에서 직접 실행됩니다.

모델과 reasoning effort는 기본 설정을 그대로 사용하거나, automation 실행 방식을 더 세밀하게 제어하려면 명시적으로 선택할 수 있습니다.

### Triage Inbox

모든 automation과 그 실행 결과는 Codex 앱 사이드바의 automation pane에서 확인할 수 있습니다.

**Triage** 섹션은 inbox 역할을 합니다. 발견 사항이 있는 automation 실행 결과가 여기에 표시되며, 모든 automation 실행 결과만 표시하거나 읽지 않은 항목만 필터링할 수 있습니다.

### Standalone Automations

Standalone automation은 스케줄에 따라 새로운 실행을 시작하고 결과를 Triage에 보고합니다. 각 실행이 독립적이어야 하거나 하나의 automation이 하나 이상의 프로젝트에서 실행되어야 할 때 사용합니다.

특정 cadence가 필요한 경우 custom schedule을 선택하고 cron 구문을 입력합니다.

Standalone automation은 동일한 automation을 둘 이상의 프로젝트에서 실행할 수 있습니다.

### Thread Automations

Thread automation은 현재 스레드에 연결된 heartbeat 방식의 반복 wake-up call입니다. 예약된 작업이 새 프롬프트로 시작하는 대신 스레드의 컨텍스트를 유지해야 할 때 사용합니다.

Thread automation은 활성 follow-up 루프에 분 단위 간격을 사용하거나, 특정 시간에 check-in이 필요할 때 일일/주간 스케줄을 사용할 수 있습니다.

Thread automation의 활용 사례:

| 활용 사례 | 설명 |
| --- | --- |
| 장시간 실행되는 명령 모니터링 | 완료될 때까지 확인 |
| Slack, GitHub 등 폴링 | 결과를 같은 스레드에 유지 |
| 리뷰 루프 유지 | 고정 cadence로 Codex가 리뷰를 계속하도록提醒 |
| Skill 기반 워크플로 | plugin을 사용하여 PR 상태 확인 및 새 피드백 처리 |
| 연구/triage 작업 | 지속적인 대화에 집중 |

각 실행이 독립적이어야 하거나, 둘 이상의 프로젝트에서 실행되어야 하거나, 발견 사항이 Triage에 별도의 automation 실행으로 나타나야 할 때는 standalone 또는 프로젝트 automation을 사용하십시오.

Thread automation을 생성할 때 프롬프트를 내구성 있게 만드십시오. 프롬프트에는 다음이 포함되어야 합니다.

- 스레드가 wake-up할 때마다 Codex가 수행할 작업
- 중요한 보고 사항이 있는지 판단하는 방법
- 중지하거나 사용자의 입력을 요청해야 하는 시기

### Sandbox 설정

Automation은 사용자의 기본 sandbox 설정을 사용합니다.

| Sandbox 모드 | 동작 |
| --- | --- |
| **read-only** | 파일 수정, 네트워크 접근, 컴퓨터 앱 작업이 필요한 tool 호출 실패. workspace write로 업데이트 권장 |
| **workspace-write** | 워크스페이스 외부 파일 수정, 네트워크 접근, 컴퓨터 앱 작업이 필요한 tool 호출 실패. rules로 선택적으로 허용 가능 |
| **full access** | 백그라운드 automation의 위험이 높음. Codex가 파일 변경, 명령 실행, 네트워크 접근을 묻지 않고 수행. workspace write로 설정 변경 및 rules로 선택적 제어 권장 |

관리 환경에서는 관리자가 admin-enforced requirements로 이러한 동작을 제한할 수 있습니다. 예: `approval_policy = "never"` 비허용 또는 sandbox 모드 제한 (`requirements.toml` 참조).

Automation은 조직 정책이 허용하는 경우 `approval_policy = "never"`를 사용합니다. 관리자 요구 사항이 `approval_policy = "never"`를 비허용하면, automation은 선택한 모드의 승인 동작으로 폴백합니다.

### Skills와 결합

Automation은 Codex에서 사용 가능한 동일한 plugin과 skill을 사용할 수 있습니다. Automation을 팀 간에 유지 관리 가능하고 공유 가능하게 하려면, skill을 사용하여 작업을 정의하고 도구와 컨텍스트를 제공하십시오.

Automation 내에서 skill을 명시적으로 트리거하려면 `$skill-name`을 사용합니다.

```
Check my commits from the last 24h and submit a $recent-code-bugfix.
```

### Automation 생성 및 업데이트

일반 Codex 스레드에서 automation을 생성하고 업데이트할 수 있습니다. 작업, 스케줄, 현재 스레드에 연결할지 새 실행을 시작할지 설명합니다. Codex가 automation 프롬프트를 초안 작성하고, 올바른 automation 유형을 선택하며, 범위나 cadence가 변경되면 업데이트합니다.

Skill도 automation을 생성하거나 업데이트할 수 있습니다. 예: PR을 babysit하는 skill이 GitHub plugin으로 PR 상태를 확인하고 새 리뷰 피드백을 수정하는 반복 automation을 설정할 수 있습니다.

### 모범 사례

Automation을 예약하기 전에 일반 스레드에서 프롬프트를 수동으로 테스트하십시오. 이를 통해 다음을 확인할 수 있습니다.

- 프롬프트가 명확하고 범위가 올바른지
- 선택한(또는 기본) 모델, reasoning effort, 도구가 예상대로 작동하는지
- 결과 diff를 검토할 수 있는지

실행 예약을 시작한 후 처음 몇 개의 출력을 검토하고 필요에 따라 프롬프트나 cadence를 조정합니다.

Git 리포지토리에서 worktree를 선택한 경우, 빈번한 스케줄은 시간이 지남에 따라 많은 worktree를 생성할 수 있습니다. 더 이상 필요하지 않은 automation 실행은 보관하고, worktree를 유지할 의도가 없는 한 실행을 pin하지 마십시오.

---

## Worktrees (워크트리)

Codex 앱에서 worktree를 사용하면 Codex가 동일한 프로젝트에서 여러 독립 작업을 서로 간섭 없이 병렬로 실행할 수 있습니다. Git 리포지토리의 경우 automation은 전용 백그라운드 worktree에서 실행되어 진행 중인 작업과 충돌하지 않습니다. 비 버전 관리 프로젝트에서는 automation이 프로젝트 디렉토리에서 직접 실행됩니다.

Worktree는 스레드를 수동으로 worktree에서 시작할 수도 있고, Handoff를 사용하여 스레드를 Local과 Worktree 사이에서 이동할 수도 있습니다.

### 개념

Worktree는 Git 리포지토리의 일부인 프로젝트에서만 작동합니다. Worktree를 사용하면 리포지토리의 두 번째 복사본("checkout")을 생성할 수 있습니다. 각 worktree는 리포의 모든 파일 복사본을 가지지만 모두 동일한 메타데이터(`.git` 폴더)를 공유합니다. 이를 통해 여러 브랜치를 병렬로 checkout하고 작업할 수 있습니다.

| 용어 | 설명 |
| --- | --- |
| **Local checkout** | 사용자가 생성한 리포지토리. Codex 앱에서는 단순히 **Local**로 표시되기도 함 |
| **Worktree** | Local checkout에서 Codex 앱 내에 생성된 Git worktree |
| **Handoff** | 스레드를 Local과 Worktree 사이에서 이동하는 흐름. Codex가 작업을 안전하게 이동하는 데 필요한 Git 작업을 처리 |

### 이점

1. 현재 Local 설정을 방해하지 않고 Codex와 병렬로 작업
2. 전경에 집중하는 동안 백그라운드 작업을 대기열에 추가
3. 나중에 검사, 테스트, 또는 더 직접적인 협업을 위해 스레드를 Local로 이동

### Worktree 시작하기

1. **"Worktree" 선택**: 새 스레드 뷰에서 composer 아래의 **Worktree**를 선택합니다. 선택적으로 worktree에 대해 setup script를 실행할 로컬 환경을 선택합니다.
2. **시작 브랜치 선택**: Composer 아래에서 worktree의 기반이 될 Git 브랜치를 선택합니다. `main`/`master` 브랜치, feature 브랜치, 또는 unstaged local 변경 사항이 있는 현재 브랜치 중 선택할 수 있습니다.
3. **프롬프트 제출**: 작업을 제출하면 Codex가 선택한 브랜치를 기반으로 Git worktree를 생성합니다. 기본적으로 Codex는 "detached HEAD" 상태에서 작업합니다.
4. **작업 위치 선택**: 준비되면 worktree에서 계속 작업하거나 스레드를 local checkout으로 handoff할 수 있습니다.

### Handoff 흐름

Worktree는 Local checkout과 외관과 느낌이 거의 같습니다. 차이점은 워크플로에서의 위치입니다. Local은 전경, Worktree는 배경으로 생각할 수 있습니다. Handoff를 사용하면 스레드를 그 사이에서 이동할 수 있습니다.

내부적으로 Handoff는 두 checkout 사이에서 작업을 안전하게 이동하는 데 필요한 Git 작업을 처리합니다. 이것이 중요한 이유는 **Git은 브랜치가 한 번에 한 곳에서만 checkout될 수 있기 때문**입니다. Worktree에서 브랜치를 checkout하면 local checkout에서 동시에 checkout할 수 없으며, 그 반대도 마찬가지입니다.

#### 옵션 1: Worktree에서 작업

Worktree에서 배타적으로 작업하려면 스레드 헤더의 **Create branch here** 버튼을 사용하여 worktree를 브랜치로 전환합니다.

이후 변경 사항을 커밋하고, 브랜치를 remote 리포지토리에 push하고, GitHub에서 PR을 열 수 있습니다.

헤더의 "Open" 버튼을 사용하여 IDE를 worktree로 열거나, 통합 터미널을 사용하거나 worktree 디렉토리에서 필요한 다른 작업을 수행할 수 있습니다.

> Worktree에서 브랜치를 생성하면 다른 worktree(local checkout 포함)에서 해당 브랜치를 checkout할 수 없습니다.

#### 옵션 2: 스레드를 Local로 Handoff

스레드를 전경으로 가져오려면 스레드 헤더에서 **Hand off**를 클릭하고 **Local**로 이동합니다.

이 경로는 일반적인 IDE 창에서 변경 사항을 읽으려고 하거나, 기존 개발 서버를 실행하거나, 일상적으로 사용하는 환경에서 작업을 검증하려는 경우에 적합합니다.

Codex가 worktree와 local checkout 사이에서 스레드를 안전하게 이동하는 데 필요한 Git 단계를 처리합니다.

각 스레드는 시간이 지나도 동일한 연결된 worktree를 유지합니다. 나중에 스레드를 다시 worktree로 handoff하면 Codex는 동일한 배경 환경으로 반환하여 중단한 곳에서 계속할 수 있습니다.

반대 방향도 가능합니다. 이미 Local에서 작업 중이고 전경을 비우고 싶다면 **Hand off**를 사용하여 스레드를 worktree로 이동합니다. 이는 Codex가 백그라운드에서 계속 작업하는 동안 주의를 다른 로컬 작업으로 전환할 때 유용합니다.

> Handoff는 Git 작업을 사용하므로 `.gitignore` 파일에 포함된 파일은 스레드와 함께 이동하지 않습니다.

### Codex-managed와 Permanent Worktree

| 유형 | 설명 |
| --- | --- |
| **Codex-managed worktree** | (기본값) 가볍고 일회용으로 설계. 일반적으로 하나의 스레드에 전용. 나중에 handback하면 동일한 worktree로 반환 |
| **Permanent worktree** | 사이드바의 프로젝트三点 메뉴에서 생성. 자체 프로젝트로 새 permanent worktree가 생성됨. 자동 삭제되지 않으며, 동일한 worktree에서 여러 스레드를 시작할 수 있음 |

### Codex가 Worktree를 관리하는 방법

Codex는 `$CODEX_HOME/worktrees`에 worktree를 생성합니다. 시작 커밋은 스레드를 시작할 때 선택한 브랜치의 `HEAD` 커밋입니다. local 변경 사항이 있는 브랜치를 선택한 경우, uncommitted 변경 사항도 worktree에 적용됩니다.

Worktree는 브랜치로 checkout되지 않고 **detached HEAD** 상태가 됩니다. 이를 통해 Codex는 브랜치를 오염시키지 않고 여러 worktree를 생성할 수 있습니다.

### 브랜치 제한

Codex가 worktree에서 작업을 완료하고 **Create branch here**를 사용하여 `feature/a` 브랜치를 생성한 후, local checkout에서 해당 브랜치를 checkout하려고 하면 다음 오류가 발생합니다.

```
fatal: 'feature/a' is already used by worktree at '<WORKTREE_PATH>'
```

해결하려면 worktree에서 `feature/a` 대신 다른 브랜치를 checkout해야 합니다.

로컬에서 브랜치를 checkout할 계획이라면, 양쪽에서 같은 브랜치를 checkout하려 시도하는 대신 **Handoff**를 사용하여 스레드를 Local로 이동하십시오.

**왜 이 제한이 존재하는가**: Git은 브랜치가 단일 가변 참조(`refs/heads/<name>`)이며, 그 의미가 working tree의 "현재 checkout된 상태"를 나타내기 때문에, 동일한 브랜치가 둘 이상의 worktree에서 동시에 checkout되는 것을 방지합니다. 브랜치가 checkout되면 Git은 해당 HEAD를 해당 worktree가 소유한 것으로 처리하고, commit, reset, rebase, merge 등의 작업이 해당 참조를 잘 정의된 직렬화된 방식으로 진행하도록 기대합니다.

여러 worktree가 동일한 브랜치를 동시에 checkout하는 것을 허용하면, 어떤 worktree의 작업이 브랜치 참조를 업데이트할지에 대한 모호성과 경쟁 조건이 발생하여 잠재적으로 커밋 손실, 불일치하는 인덱스, 불분명한 충돌 해결로 이어질 수 있습니다.

one-branch-per-worktree 규칙을 적용함으로써 Git은 각 브랜치가 단일 권한 있는 working copy를 갖도록 보장하면서, 다른 worktree가 detached HEAD나 별도의 브랜치를 통해 동일한 커밋을 안전하게 참조할 수 있도록 합니다.

### Worktree 정리

Worktree는 많은 디스크 공간을 차지할 수 있습니다. 각 worktree에는 고유한 리포지토리 파일, 종속성, 빌드 캐시 등의 세트가 있습니다. 따라서 Codex 앱은 worktree 수를 합리적인 한도로 유지하려고 합니다.

기본적으로 Codex는 가장 최근의 **15개** Codex-managed worktree를 유지합니다. 이 한도는 설정에서 변경하거나, 직접 디스크 사용량을 관리하려면 자동 삭제를 끌 수 있습니다.

**자동 삭제되지 않는 Codex-managed worktree**:

- Pinned conversation이 연결된 경우
- 스레드가 아직 진행 중인 경우
- Permanent worktree인 경우

**자동 삭제되는 경우**:

- 연결된 스레드를 보관할 때
- 구성된 한도를 유지하기 위해 오래된 worktree를 삭제해야 할 때

Codex-managed worktree를 삭제하기 전에 Codex는 해당 work의 스냅샷을 저장합니다. worktree가 삭제된 후 대화를 열면 복원 옵션이 표시됩니다.

Permanent worktree는 스레드를 보관해도 자동으로 삭제되지 않습니다.

### FAQ

| 질문 | 답변 |
| --- | --- |
| Worktree가 생성되는 위치를 제어할 수 있는가? | 현재는 불가능. Codex는 `$CODEX_HOME/worktrees` 아래에 worktree를 생성하여 일관되게 관리 |
| 스레드를 Local과 Worktree 사이에서 이동할 수 있는가? | 가능. 스레드 헤더의 **Hand off**를 사용. 나중에 다시 worktree로 handoff하면 동일한 연결 worktree로 반환 |
| Worktree가 삭제되면 스레드는 어떻게 되는가? | 기본 worktree 디렉토리가 삭제되어도 스레드는 기록에 남음. Codex-managed worktree의 경우 삭제 전 스냅샷을 저장하며, 연결된 스레드를 다시 열면 복원 옵션 제공 |

---

## Sites (호스팅)

Sites 플러그인을 사용하면 Codex가 웹사이트, 웹 앱, 게임을 생성, 저장, 배포, 검사할 수 있습니다. 별도의 배포 워크플로를 설정하지 않고도 프롬프트 또는 호환 가능한 기존 프로젝트를 호스팅된 사이트로 전환할 수 있습니다.

> Sites는 preview 상태이며 현재 ChatGPT Business 및 Enterprise 워크스페이스에서 사용 가능합니다. 추가 플랜은 순차적으로 지원될 예정입니다. ChatGPT Enterprise 워크스페이스의 경우 관리자가 역할 기반 접근 제어(RBAC)를 통해 활성화해야 합니다. 플랜별 지원 비교는 [Feature availability](https://developers.openai.com/codex/feature-availability)를 참조하십시오.

**모든 Sites 배포 URL은 프로덕션 배포**입니다. 빌드를 라이브로 만들기 전에 검토하려면 Codex에게 배포 없이 버전을 저장하도록 요청하십시오.

### 설정

1. **Enterprise 워크스페이스 활성화**: ChatGPT Enterprise를 사용하는 경우 워크스페이스 관리자에게 ChatGPT 관리자 설정의 RBAC 컨트롤에서 Sites를 켜달라고 요청합니다. ChatGPT Business 워크스페이스는 기본적으로 활성화되어 있으므로 이 단계를 건너뛸 수 있습니다.
2. **Sites 플러그인 추가**: Sites가 이미 사용 가능하지 않은 경우 Codex 앱에서 **Plugins**를 열고 **Sites**를 찾아 추가합니다. 플러그인 설치 후 새 스레드를 시작합니다.
3. **Sites 작업 시작**: 스레드에서 생성 또는 게시할 사이트를 설명합니다. 특히 호스팅 배포로 끝나야 하는 작업의 경우 `@Sites`로 명시적으로 지정할 수 있습니다.
4. **저장 또는 배포 검토**: Codex에게 사이트 빌드를 검증하도록 요청합니다. 그런 다음 검토용으로 배포 가능한 버전을 저장할지, 승인된 저장 버전을 배포할지 알려줍니다.
5. **배포된 사이트로 돌아가기**: 앱 사이드바에서 **Sites**를 열어 Sites 프로젝트로 돌아갑니다. Codex에게 저장된 버전 검사, 배포 상태 확인, 배포된 사이트의 접근 권한 변경을 요청할 수도 있습니다.

### 프롬프트 예시

새 웹사이트, 대시보드, 내부 도구의 경우:

```
@Sites Build a project request dashboard for my operations team. Let team
members submit requests, see who owns each one, update the status, and filter
the list. Require people to sign in with their workspace account, and keep the
request data saved between visits.
```

기존 프로젝트 배포:

```
@Sites Deploy this project. Check whether it is compatible with Sites, make any
required changes, and give me the deployment URL.
```

지속적 애플리케이션 데이터 또는 업로드 파일이 필요한 경우:

```
@Sites Add persistent player scores and avatar uploads to this game. Use
the appropriate Sites storage and deploy the updated game.
```

> 배포된 내부 앱과 이를 만든 전체 프롬프트를 보려면 Sites showcase를 탐색하십시오.

### .openai/hosting.json

Sites 프로젝트는 로컬 소스 프로젝트를 Sites를 통해 관리되는 호스팅에 연결합니다. 이 연결 정보와 선택적 스토리지 바인딩 이름은 `.openai/hosting.json`에 저장됩니다.

새로 생성된 로컬 스타터는 `project_id` 없이 시작할 수 있으며, Sites가 호스팅 프로젝트를 프로비저닝한 후 추가합니다.

예시 - 관계형 데이터베이스 바인딩을 사용하고 파일 스토리지가 없는 프로비저닝된 사이트:

```json
{
  "project_id": "<project-id>",
  "d1": "DB",
  "r2": null
}
```

### 게시 단계

Sites 게시는 두 가지 별개의 단계로 구분됩니다.

| 단계 | 설명 |
| --- | --- |
| **Save a version** | Codex가 배포 가능한 사이트를 빌드하고 해당 버전을 빌드에 사용된 소스 Git 커밋과 연결. 검토 가능한 배포 후보가 필요할 때 사용 |
| **Deploy a version** | 저장된 버전을 게시하고 배포 성공 시 프로덕션 URL을 보고. 선택한 대상이 사이트에 접근할 의도가 있을 때만 사용 |

이전 배포 후보를 확인하려면 Codex에게 저장된 버전을 나열하거나 검사하도록 요청합니다.

### 사이트 유형 및 스토리지

Sites는 Cloudflare Worker 호환 출력을 ES 모듈로 빌드하는 프로젝트를 호스팅합니다. **새 프로젝트**의 경우 Sites 워크플로는 추천 사이트 스타터로 시작할 수 있습니다. **기존 사이트**의 경우 배포를 요청하기 전에 프로젝트 빌드가 호환 가능한 배포 아티팩트를 생성할 수 있는지 Codex에게 확인하십시오.

| 사이트 요구사항 | 요청 내용 |
| --- | --- |
| 콘텐츠 중심 웹사이트 또는 랜딩 페이지 | 경험에 필요하지 않은 한 영구 애플리케이션 상태가 없는 사이트 |
| 저장된 레코드, 사용자 진행 상황, 게임 점수 | D1 - 내구성 있는 구조화된 데이터를 위한 관계형 데이터베이스 |
| 이미지, 문서, 오디오, 비디오 등 업로드 파일 | R2 - 파일용 오브젝트 스토리지 |
| 검색 가능한 메타데이터가 있는 업로드 파일 | 메타데이터용 D1 + 파일 콘텐츠용 R2 |
| 현재 워크스페이스 사용자의 신원이 필요한 내부 사이트 | Workspace-authenticated user identity |
| 공개 로그인 또는 외부 인증 제공자 | Authentication-enabled Sites 프로젝트 |

임시 표시 상태(테마 선택, 배너 닫기 등)에는 내구성 있는 스토리지를 요청하지 마십시오. 호스팅된 사이트가 기억해야 할 제품 데이터에만 요청하십시오.

### 접근 제어

배포된 URL을 공유하기 전에 대상을 설정합니다. 새 사이트의 경우 콘텐츠, 데이터 처리, 예상 대상을 검토할 때까지 접근을 소유자 및 워크스페이스 관리자로 제한합니다.

| 접근 모드 | 접근 가능한 사용자 |
| --- | --- |
| Owner and admins (`admins_only`) | 사이트 소유자 및 워크스페이스 관리자 |
| Workspace (`workspace_all`) | 워크스페이스의 모든 활성 사용자 |
| Custom (`custom`) | 지정한 특정 활성 사용자 또는 워크스페이스 그룹 (소유자는 항상 허용) |

```
@Sites Change this deployed site's access to everyone in my workspace after
showing me the current site and confirming the deployment URL.
```

### 런타임 환경 변수 구성

Codex 앱 사이드바에서 **Sites**를 열고 프로젝트를 선택하여 Sites 패널에서 호스팅된 환경 변수 및 시크릿을 추가, 업데이트 또는 제거합니다. 이 값은 `.openai/hosting.json`에 저장하지 마십시오. 로컬 `.env` 및 `.env.example` 파일을 로컬 개발에 필요한 키와 정렬하고, 시크릿 값을 커밋하지 마십시오.

환경 값을 추가, 업데이트 또는 제거한 후 Codex에게 승인된 저장 버전을 재배포하도록 요청하여 다음 배포가 업데이트된 구성을 사용하도록 합니다.

### 배포 전 체크리스트

- Codex 리뷰 창에서 소스 변경 사항 및 데이터베이스 마이그레이션을 검토
- 빌드가 성공했고 선택한 저장 버전이 게시하려는 버전인지 확인
- 의도한 대상만 사이트에 접근할 수 있는지 확인
- 런타임 시크릿 값을 Sites를 통해 구성했고 소스 파일에 커밋하지 않았는지 확인
- 배포 후 Codex에게 배포 상태와 프로덕션 URL을 확인하도록 요청한 후 공유

---

## 앱 설정

앱 및 커넥터의 세부 설정은 `config.toml`의 `[apps]` 섹션에서 제어합니다. 상세한 설정 항목은 Config Reference 문서를 참조하십시오.

### 주요 설정 항목

| 설정 | 설명 |
| --- | --- |
| `enabled` | 앱 활성화/비활성화 |
| `default_tools_enabled` | 앱 내 도구 기본 활성화 여부 |
| `default_tools_approval_mode` | 도구 승인 모드: `auto`, `prompt`, `approve` |
| `destructive_enabled` | destructive_hint 도구 허용 여부 |
| `open_world_enabled` | open_world_hint 도구 허용 여부 |

### 승인 모드 (Approval Mode)

| 모드 | 설명 |
| --- | --- |
| `auto` | 기본 동작 사용 |
| `prompt` | 도구 호출 시 사용자 승인 요청 |
| `approve` | 자동 승인 |

---

## 요약

| 기능 | 방법 |
| --- | --- |
| 플러그인 목록 보기 | Codex 앱: **Plugins**, CLI: `/plugins` |
| 플러그인 호출 | `@` 입력 후 플러그인명 지정 또는 작업 직접 설명 |
| GitHub 코드 리뷰 | PR 코멘트에서 `@codex review` |
| Slack 작업 | 채널/스레드에서 `@Codex` 멘션 |
| Linear 작업 위임 | 이슈를 Codex에 할당 또는 `@Codex` 멘션 |
| Linear triage 자동화 | Linear Settings > Triage rules > Delegate > Codex |
| Linear MCP 로컬 연결 | `codex mcp add linear --url https://mcp.linear.app/mcp` |
| Sites 배포 | `@Sites`로 사이트 생성 후 save > deploy |
| Review pane | 앱 내에서 변경 사항 검토, 인라인 코멘트, PR 리뷰 |
| Automations | Standalone/Thread automation으로 반복 작업 자동화 |
| Worktrees | Local과 Worktree 사이에서 병렬 작업, Handoff로 이동 |
| 앱 설정 | `~/.codex/config.toml`의 `[apps]` 섹션 |
| 플러그인 비활성화 | `~/.codex/config.toml`에서 `enabled = false` 설정 |
