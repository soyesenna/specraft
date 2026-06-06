# Sessions, Worktrees, Checkpointing & Deep Links

> 출처: https://code.claude.com/docs/en/sessions
> https://code.claude.com/docs/en/worktrees
> https://code.claude.com/docs/en/checkpointing
> https://code.claude.com/docs/en/deep-links

---

## Sessions (대화 관리)

Session은 프로젝트 디렉터리에 연결된 저장된 대화입니다. Claude Code는 작업 중 로컬에 지속적으로 저장하므로, 나중에 이어서 작업하거나 다른 접근 방식을 시도하거나 작업 간 전환이 가능합니다.

Desktop 앱, 웹 버전, VS Code 확장 프로그램은 각각 자체 session 기록을 유지합니다. 이 문서는 CLI 기준입니다.

### 세션 재개 (Resume)

| 명령어 | 동작 |
| --- | --- |
| `claude --continue` | 현재 디렉터리의 가장 최근 session 재개 |
| `claude --resume` | Session picker 열기 |
| `claude --resume <name>` | 지정한 이름의 session 직접 재개 |
| `claude --from-pr <number>` | 해당 Pull Request에 연결된 session 재개 |
| `/resume` | 활성 session 내에서 다른 대화로 전환 |

`claude -p` 또는 Agent SDK로 생성된 session은 session picker에 나타나지 않지만, `claude --resume <session-id>`로 session ID를 직접 전달하면 재개할 수 있습니다.

#### Session picker 검색 범위

Session은 프로젝트 디렉터리별로 저장됩니다. 기본적으로 현재 worktree의 대화형 session과 `/add-dir`로 추가된 다른 디렉터리의 session을 보여줍니다.

| 단축키 | 동작 |
| --- | --- |
| `Ctrl+W` | 같은 리포지터리의 모든 worktree로 확대 |
| `Ctrl+A` | 이 머신의 모든 프로젝트로 확대 |

이름으로 재개 시 현재 리포지터리와 그 worktree 전체에서 검색합니다.

| 명령어 | 정확히 일치 | 모호한 이름 |
| --- | --- | --- |
| `claude --resume <name>` | 직접 재개 | session picker 열기 (이름이 검색어로 미리 입력됨) |
| `/resume <name>` | 직접 재개 | 에러 표시; `/resume` (인자 없이)로 picker 열기 |

### 세션 이름 지정

여러 작업을 병렬로 수행할 때 session에 이름을 지정하면 picker에서 찾고 이름으로 재개하기 쉽습니다.

| 시점 | 설정 방법 |
| --- | --- |
| 시작 시 | `claude -n auth-refactor` |
| session 진행 중 | `/rename auth-refactor` (prompt bar에도 표시됨) |
| Session picker에서 | session 강조 후 `Ctrl+R` |
| Plan 수락 시 | Plan mode에서 plan을 수락하면 plan 내용으로 자동 이름 지정 (이미 설정된 이름이 없는 경우) |

이름을 지정한 후 `claude --resume <name>` 또는 `/resume <name>`으로 돌아갈 수 있습니다.

### Session picker 단축키

`/resume` 또는 `claude --resume` (인자 없음)으로 대화형 session picker를 엽니다.

| 단축키 | 동작 |
| --- | --- |
| `↑` / `↓` | session 간 이동 |
| `→` / `←` | 그룹화된 session 펼치기/접기 |
| `Enter` | 강조된 session 재개 |
| `Space` | session 내용 미리보기 (`Ctrl+V`도 가능, paste로 인식되지 않는 터미널에서) |
| `Ctrl+R` | 강조된 session 이름 변경 |
| `/` 또는 Space 외 출력 가능 문자 | 검색 모드 진입 및 session 필터링. GitHub/GitHub Enterprise/GitLab/Bitbucket PR/MR URL을 붙여넣으면 해당 session을 찾음 |
| `Ctrl+A` | 이 머신의 모든 프로젝트 session 표시. 다시 누르면 현재 리포지터리로 복귀 |
| `Ctrl+W` | 현재 리포지터리의 모든 worktree session 표시. 다시 누르면 현재 worktree로 복귀 (다중 worktree 리포지터리에서만 표시) |
| `Ctrl+B` | 현재 git branch의 session으로 필터링. 다시 누르면 전체 branch 표시 |
| `Esc` | Session picker 또는 검색 모드 종료 |

각 행에는 session 이름(설정된 경우), 대화 요약 또는 첫 프롬프트, 마지막 활동 이후 시간, 메시지 수, git branch가 표시됩니다. `Ctrl+A`로 모든 프로젝트를 표시하면 프로젝트 경로도 나타납니다.

`/branch`, `/rewind`, `--fork-session`으로 생성된 분기 session은 루트 session 아래에 그룹화됩니다. `→`를 눌러 그룹을 펼치세요.

### 세션 분기 (Branch)

분기는 지금까지의 대화를 복사하여 그 안으로 전환하며, 원본은 그대로 유지합니다. 다른 접근 방식을 시도할 때 유용합니다.

Session 내부에서 `/branch` 실행 (선택적 이름 지정):

```
/branch try-streaming-approach
```

명령줄에서 `--continue` 또는 `--resume`과 `--fork-session`을 조합:

```
claude --continue --fork-session
```

원본 session은 변경되지 않고 session picker에 그대로 남습니다. `/branch` 확인 메시지에는 새 branch의 session ID와 원본 session ID가 모두 출력됩니다. 원본으로 돌아가려면 `/resume`에 원본 ID를 전달하거나 session picker를 사용하세요.

"allow for this session"으로 승인한 권한은 새 branch로 이어지지 않습니다.

### 세션 내 컨텍스트 관리

session을 떠나지 않고 context window 내용을 제어하는 명령어입니다.

| 명령어 | 동작 |
| --- | --- |
| `/clear` | 빈 context로 새로 시작. 이전 대화는 저장되어 재개 가능 |
| `/compact [instructions]` | 기록을 요약으로 대체. 선택적으로 집중할 내용 지정 가능 |
| `/context` | 현재 context를 소비하는 항목 표시 |

### 세션 데이터 내보내기 및 위치

`/export`를 실행하면 현재 대화를 클립보드에 복사하거나 일반 텍스트 파일로 저장합니다. 파일명을 전달하면 해당 파일에 직접 기록합니다.

| 항목 | 경로/설정 |
| --- | --- |
| Transcript 위치 | `~/.claude/projects/<project>/<session-id>.jsonl` |
| 저장 위치 변경 | `CLAUDE_CONFIG_DIR` 설정 |
| 자동 정리 | 30일 후 삭제 (기본값, `cleanupPeriodDays`로 변경 가능) |
| 기록 비활성화 | `CLAUDE_CODE_SKIP_PROMPT_HISTORY` 설정 또는 비대화형 모드에서 `--no-session-persistence` 사용 |

---

## Worktrees (병렬 세션 격리)

Git worktree는 리포지터리 기록과 remote를 공유하면서 자체 파일과 branch를 가진 별도의 작업 디렉터리입니다. 각 Claude Code session을 자체 worktree에서 실행하면 한 session의 편집이 다른 session에 영향을 주지 않습니다.

### Worktree에서 Claude 시작

| 명령어 | 동작 |
| --- | --- |
| `claude --worktree feature-auth` 또는 `claude -w feature-auth` | `.claude/worktrees/feature-auth/`에 격리된 worktree 생성 후 Claude 시작 |
| `claude --worktree bugfix-123` | 다른 터미널에서 두 번째 격리 session 시작 |
| `claude --worktree` (이름 생략) | `bright-running-fox` 같은 임의 이름 자동 생성 |

세션 중에 Claude에게 "work in a worktree"라고 요청하면 `EnterWorktree` 도구로 worktree를 생성합니다. Worktree 내부에서 `EnterWorktree`에 대상 경로를 전달하여 `.claude/worktrees/` 아래의 다른 worktree로 직접 전환할 수 있습니다.

**주의**: 디렉터리에서 `--worktree`를 처음 사용하기 전에 해당 디렉터리에서 `claude`를 한 번 실행하여 workspace trust 대화상자를 수락해야 합니다. 수락하지 않은 상태에서 `--worktree`를 사용하면 에러가 발생합니다.

### Base branch 선택

| 설정 | 동작 |
| --- | --- |
| 기본값 | 리포지터리의 기본 branch(`origin/HEAD`)에서 분기. Remote가 없거나 fetch 실패 시 로컬 `HEAD`로 폴백 |
| `worktree.baseRef: "head"` | 항상 로컬 `HEAD`에서 분기. 진행 중인 작업을 그대로 가져가 subagent 격리에 유용 |
| `worktree.baseRef: "fresh"` | 기본 동작과 동일 (remote 기본 branch에서 분기) |

`settings.json` 설정 예시:

```json
{
  "worktree": {
    "baseRef": "head"
  }
}
```

`baseRef`는 `"fresh"` 또는 `"head"`만 허용하며, 임의의 git ref는 지원하지 않습니다.

특정 Pull Request에서 분기하려면 PR 번호 앞에 `#`을 붙이거나 전체 GitHub PR URL을 전달합니다:

```
claude --worktree "#1234"
```

완전한 제어를 원하면 `WorktreeCreate` hook을 설정하세요. 기본 `git worktree` 로직을 완전히 대체합니다.

### Gitignored 파일을 worktree로 복사

Worktree는 새로운 checkout이므로 `.env`, `.env.local` 같은 추적되지 않는 파일이 없습니다. 프로젝트 루트에 `.worktreeinclude` 파일을 추가하면 자동으로 복사할 수 있습니다.

`.gitignore` 문법을 사용하며, 패턴과 일치하면서 gitignore된 파일만 복사됩니다 (추적되는 파일은 복사되지 않음).

```
.env
.env.local
config/secrets.json
```

이 설정은 `--worktree`, subagent worktree, desktop 앱의 병렬 session 모두에 적용됩니다.

### Subagent를 worktree로 격리

Subagent가 자체 worktree에서 실행되도록 하여 병렬 편집 충돌을 방지할 수 있습니다.

- Claude에게 "use worktrees for your agents"라고 요청
- 또는 커스텀 subagent의 frontmatter에 `isolation: worktree` 추가

각 subagent는 임시 worktree를 받으며, 변경 사항 없이 종료되면 자동으로 제거됩니다.

### Worktree 정리

종료 시 정리 동작:

| 상태 | 동작 |
| --- | --- |
| 커밋되지 않은 변경 없음, 추적되지 않는 파일 없음, 새 커밋 없음 | worktree와 branch 자동 제거. 이름이 있는 session은 나중에 사용할 수 있도록 프롬프트 표시 |
| 커밋되지 않은 변경, 추적되지 않는 파일 또는 새 커밋 존재 | 유지 또는 제거 선택 프롬프트. 유지하면 디렉터리와 branch가 보존됨 |
| 비대화형 실행 (`--worktree` + `-p`) | 종료 프롬프트가 없으므로 자동 정리되지 않음. `git worktree remove`로 수동 제거 |

Subagent 및 백그라운드 session용 worktree는 `cleanupPeriodDays` 설정 기간이 지나고 변경 사항이 없으면 자동 제거됩니다. `--worktree`로 직접 생성한 worktree는 자동 제거에서 제외됩니다.

### 수동으로 worktree 관리

Git 명령어로 직접 제어할 수 있습니다.

```bash
# 새 branch에 worktree 생성
git worktree add ../project-feature-a -b feature-a

# 기존 branch에서 worktree 생성
git worktree add ../project-bugfix bugfix-123

# Worktree에서 Claude 시작
cd ../project-feature-a && claude

# Worktree 목록 보기
git worktree list

# Worktree 제거
git worktree remove ../project-feature-a
```

새 worktree에서 개발 환경(의존성 설치, 가상 환경 설정 등)을 초기화해야 합니다.

### Git 외부 버전 관리 시스템

SVN, Perforce, Mercurial 등 다른 VCS를 사용하려면 `WorktreeCreate` 및 `WorktreeRemove` hook을 설정하세요. Hook이 기본 git 동작을 대체하므로 `.worktreeinclude`는 처리되지 않습니다.

`WorktreeCreate` hook 예시 (SVN):

```json
{
  "hooks": {
    "WorktreeCreate": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'NAME=$(jq -r .name); DIR=\"$HOME/.claude/worktrees/$NAME\"; svn checkout https://svn.example.com/repo/trunk \"$DIR\" >&2 && echo \"$DIR\"'"
          }
        ]
      }
    ]
  }
}
```

---

## Checkpointing (세션 체크포인트)

Claude Code는 작업 중 Claude의 파일 편집을 자동으로 추적하여, 문제가 발생하면 이전 상태로 되돌릴 수 있습니다.

### 자동 추적

| 항목 | 설명 |
| --- | --- |
| 추적 대상 | Claude의 파일 편집 도구로 만든 모든 변경 |
| 체크포인트 생성 | 모든 사용자 프롬프트마다 새 체크포인트 생성 |
| 세션 간 지속 | Session을 재개해도 체크포인트에 접근 가능 |
| 자동 정리 | Session과 함께 30일 후 자동 삭제 (설정 가능) |

### 되감기 및 요약 (Rewind)

`/rewind`를 실행하거나 prompt input이 비어 있을 때 `Esc`를 두 번 누르면 rewind 메뉴가 열립니다.

Rewind 메뉴는 session 중 보낸 각 프롬프트를 나열합니다. 원하는 시점을 선택한 후 작업을 선택합니다.

| 작업 | 설명 |
| --- | --- |
| Restore code and conversation | 코드와 대화 모두 해당 시점으로 복원 |
| Restore conversation | 대화만 해당 시점으로 되감기, 현재 코드는 유지 |
| Restore code | 파일 변경만 되돌리기, 대화는 유지 |
| Summarize from here | 선택한 메시지 이후의 대화를 요약으로 압축. 이전 메시지는 그대로 유지 |
| Summarize up to here | 선택한 메시지 이전의 대화를 요약으로 압축. 이후 메시지는 그대로 유지 |
| Never mind | 변경 없이 메시지 목록으로 돌아가기 |

Restore conversation 또는 Summarize from here를 선택하면 선택한 메시지의 원본 프롬프트가 입력 필드에 복원되어 다시 보내거나 편집할 수 있습니다.

Summarize up to here를 선택하면 대화 끝에 머물며 입력 필드는 비어 있습니다.

### Restore vs. Summarize 차이점

| 유형 | 동작 |
| --- | --- |
| Restore | 상태를 되돌립니다: 코드 변경, 대화 기록 또는 둘 모두를 실행 취소 |
| Summarize | 디스크의 파일은 변경하지 않고 대화의 일부를 AI 생성 요약으로 압축 |

요약 시 원본 메시지는 session transcript에 보존되므로 Claude가 필요시 세부 사항을 참조할 수 있습니다. 요약이 집중할 내용을 안내하는 선택적 지시어를 입력할 수 있습니다.

### 주요 활용 사례

| 사례 | 설명 |
| --- | --- |
| 대안 탐색 | 시작점을 잃지 않고 다른 구현 접근 방식 시도 |
| 실수 복구 | 버그를 도입한 변경을 빠르게 되돌리기 |
| 기능 반복 | 작동하는 상태로 되돌릴 수 있다는 확신 하에 변형 실험 |
| context 공간 확보 | 긴 디버깅 session을 중간 지점부터 요약하여 초기 지시는 그대로 유지 |

### 제한 사항

| 제한 | 설명 |
| --- | --- |
| Bash 명령어 변경 미추적 | `rm`, `mv`, `cp` 등 bash 명령어로 수정한 파일은 rewind로 되돌릴 수 없음 |
| 외부 변경 미추적 | Claude Code 외부에서 수동으로 변경한 파일과 다른 동시 session의 편집은 캡처되지 않음 (같은 파일을 수정하는 경우는 예외) |
| 버전 관리 대체 불가 | Checkpoint는 빠른 session 수준 복구용입니다. 영구적인 버전 기록과 협업을 위해서는 Git 등 버전 관리를 계속 사용하세요 |

---

## Deep Links (URL에서 세션 실행)

Deep link는 `claude-cli://` URL로 새 터미널 창에서 Claude Code를 엽니다. URL에 작업 디렉터리와 프롬프트를 미리 채울 수 있습니다.

Deep link는 URL이므로 링크가 들어갈 수 있는 곳 어디나 배치할 수 있습니다.

| 활용 사례 | 설명 |
| --- | --- |
| 인시던트 런북 | 영향받는 서비스 리포지터리를 진단 프롬프트와 함께 여는 단계 |
| 모니터링 알림 | 특정 메트릭에 대한 조사 프롬프트로 연결되는 대시보드 링크 |
| README/Wiki | 프로젝트를 온보딩 프롬프트와 함께 여는 링크 |
| CI 실패 알림 | 실패한 job 이름을 미리 채우는 링크 |

### 작동 방식

`claude-cli://` 접두사는 `mailto:`가 이메일 클라이언트를 여는 것과 같이 운영체제에 등록된 커스텀 URL scheme입니다.

1. 브라우저 또는 앱이 URL을 운영체제에 전달
2. 운영체제가 `claude-cli://` 접두사를 인식하고 Claude Code 시작
3. 새 터미널 창이 열리며 지정된 디렉터리에서 Claude Code가 실행되고 프롬프트가 입력란에 미리 입력됨
4. 프롬프트를 읽고 필요시 편집한 후 Enter를 눌러 전송

Deep link는 자동으로 어떤 것도 실행하지 않습니다. 디렉터리를 선택하고 프롬프트 상자를 채울 뿐입니다. Enter를 누르기 전까지 모델에 아무것도 전달되지 않습니다.

1,000자가 넘는 프롬프트의 경우 배너에서 전체 텍스트를 스크롤하여 검토하라고 안내합니다.

### 링크 구성

모든 deep link는 `claude-cli://open`으로 시작합니다. 이 경로만 handler가 허용합니다.

| 매개변수 | 설명 |
| --- | --- |
| `q` | 프롬프트 상자에 미리 입력할 텍스트. URL 인코딩 필요. 줄바꿈은 `%0A`. 최대 5,000자 |
| `cwd` | 작업 디렉터리로 사용할 절대 경로. 네트워크 및 UNC 경로는 거부됨 |
| `repo` | GitHub `owner/name` slug. Claude Code가 이전에 본 로컬 clone으로 해석 |

`cwd`와 `repo`를 모두 전달하면 `cwd`가 우선하며 `repo`는 무시됩니다.

예시:

```
claude-cli://open?repo=acme/payments&q=Investigate%20the%20failed%20deploy%20of%20payments-api.%0ACheck%20recent%20commits%20to%20main%20and%20the%20last%20successful%20build.
```

클릭하면 다음과 같이 디코딩된 프롬프트가 입력됩니다:

```
Investigate the failed deploy of payments-api.
Check recent commits to main and the last successful build.
```

### `cwd` vs `repo` 선택 기준

| 매개변수 | 적합한 상황 |
| --- | --- |
| `cwd` | 모든 링크 클릭자가 동일한 절대 경로에 프로젝트를 둔 경우 (표준화된 devcontainer, VM 이미지 등) |
| `repo` | 링크가 공유되고 각자 다른 위치에 clone한 경우 |

`repo` 해석 방식:

- `claude`를 git 리포지터리에서 실행할 때마다 해당 디렉터리 경로가 GitHub `owner/name` slug에 기록됨
- Deep link 도착 시 가장 최근에 사용한 일치 경로를 엶
- 여러 clone과 worktree가 별도로 추적됨
- Claude Code를 최소 한 번 실행한 경로만 찾을 수 있음
- 어떤 branch가 checkout되어 있는지는 변경하지 않음

### 런북에 링크 임베드

Markdown에서 deep link를 사용할 수 있습니다. 단, GitHub 렌더링 Markdown에서는 `claude-cli://`를 허용하지 않으므로 README, issue, wiki에서는 레이블만 표시됩니다. 이 경우 code block에 URL을 넣어 복사+붙여넣기할 수 있게 합니다.

프롬프트는 URL의 일부이므로 URL 인코딩해야 합니다. `encodeURIComponent` 또는 URL 인코더를 사용하세요.

```markdown
## High 5xx rate on web-gateway

1. Acknowledge the page in PagerDuty.
2. [Open Claude Code in the gateway repo](claude-cli://open?repo=acme/web-gateway&q=5xx%20rate%20is%20elevated%20on%20web-gateway.%20Check%20recent%20deploys%2C%20error%20logs%20from%20the%20last%2030%20minutes%2C%20and%20open%20incidents%20in%20Linear.)
3. Post initial findings in #incident.
```

### Shell에서 링크 열기

Shell 스크립트, alias, 자동화에서도 deep link를 열 수 있습니다.

| 플랫폼 | 명령어 |
| --- | --- |
| macOS | `open "claude-cli://open?repo=acme/payments&q=review%20open%20PRs"` |
| Linux | `xdg-open "claude-cli://open?repo=acme/payments&q=review%20open%20PRs"` |
| Windows (PowerShell) | `Start-Process "claude-cli://open?repo=acme/payments&q=review%20open%20PRs"` |
| Windows (cmd.exe) | `start "" "claude-cli://open?repo=acme/payments&q=review%20open%20PRs"` |

### Handler 등록 및 지원 플랫폼

Claude Code는 macOS, Linux, Windows에서 대화형 session을 처음 시작할 때 `claude-cli://` handler를 운영체제에 등록합니다. 별도 설치 명령이 필요하지 않습니다.

| 플랫폼 | Handler 위치 |
| --- | --- |
| macOS | `~/Applications/Claude Code URL Handler.app` |
| Linux | `$XDG_DATA_HOME/applications` (기본값 `~/.local/share/applications`) 아래 `claude-code-url-handler.desktop` |
| Windows | `HKEY_CURRENT_USER\Software\Classes\claude-cli` |

터미널 에뮬레이터 감지:

| 플랫폼 | 감지 방식 |
| --- | --- |
| macOS | 가장 최근 대화형 session에서 사용한 터미널 기억. iTerm2, Ghostty, kitty, Alacritty, WezTerm, Terminal.app 지원 |
| Linux | `$TERMINAL` 환경변수 > `x-terminal-emulator` > 공통 에뮬레이터 목록 순 |
| Windows | Windows Terminal > PowerShell > `cmd.exe` 순 |

등록을 완전히 비활성화하려면 `settings.json`에서 `disableDeepLinkRegistration`을 `"disable"`로 설정하세요. 조직 전체에 적용하려면 managed settings에서 설정합니다.

### VS Code 탭 열기

VS Code 확장 프로그램은 `vscode://anthropic.claude-code/open`에 자체 handler를 등록합니다. 터미널 창 대신 Claude Code editor 탭을 엽니다.

### 문제 해결

| 문제 | 해결 방법 |
| --- | --- |
| 링크 클릭해도 반응 없음 | 해당 머신에서 대화형 `claude` session을 한 번 실행한 후 다시 시도. Linux에서 데스크탑 환경이 없으면 `xdg-open`이 처리할 수 없음 |
| 링크가 일반 텍스트로 렌더링됨 | 일부 Markdown 렌더러가 `http`/`https`만 허용. GitHub에서는 code block에 URL을 넣어 브라우저 주소창에 직접 붙여넣기 하도록 안내 |
| 홈 디렉터리에서 열림 | `repo`는 Claude Code가 이미 본 clone만 해석. clone에서 `claude`를 한 번 실행하여 경로를 기록시키거나 `cwd` 사용 |
| 잘못된 터미널이 열림 | macOS: 선호하는 터미널에서 `claude`를 한 번 실행. Linux: `$TERMINAL` 환경변수 설정. Windows: Windows Terminal 설치 |
