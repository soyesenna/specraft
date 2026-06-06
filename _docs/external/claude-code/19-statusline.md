# 상태 라인 커스터마이징 (Status Line)

> **원문**: [Customize your status line - code.claude.com](https://code.claude.com/docs/en/statusline)
>
> **참조**: [Status line configuration - docs.anthropic.com](https://docs.anthropic.com/en/docs/claude-code/settings)

---

## 목차

- [상태 라인 개요](#상태-라인-개요)
- [상태 라인 설정](#상태-라인-설정)
- [상태 라인 작동 방식](#상태-라인-작동-방식)
- [사용 가능한 데이터](#사용-가능한-데이터)
- [Context window 필드 상세](#context-window-필드-상세)
- [예시 스크립트](#예시-스크립트)
- [Subagent 상태 라인](#subagent-상태-라인)
- [팁](#팁)
- [문제 해결](#문제-해결)

---

## 상태 라인 개요

상태 라인(Status Line)은 Claude Code 하단에 위치한 커스터마이징 가능한 바로, 구성한 셸 스크립트를 실행합니다. stdin으로 JSON 세션 데이터를 수신하고 스크립트가 출력하는 내용을 표시하여, 컨텍스트 사용량, 비용, git 상태 등 추적하고 싶은 모든 정보를 항상 볼 수 있게 해줍니다.

상태 라인은 다음과 같은 경우에 유용합니다:

- 작업 중 컨텍스트 윈도우 사용량을 모니터링하고 싶을 때
- 세션 비용을 추적해야 할 때
- 여러 세션에서 작업하며 구분이 필요할 때
- git 브랜치와 상태를 항상 표시하고 싶을 때

---

## 상태 라인 설정

`/statusline` 명령어로 Claude Code가 스크립트를 생성하도록 하거나, 수동으로 스크립트를 만들어 설정에 추가할 수 있습니다.

### /statusline 명령어 사용

`/statusline` 명령어는 표시할 내용을 자연어로 설명하면, Claude Code가 `~/.claude/`에 스크립트 파일을 생성하고 설정을 자동으로 업데이트합니다:

```
/statusline show model name and context percentage with a progress bar
```

### 수동 구성

사용자 설정(`~/.claude/settings.json`) 또는 프로젝트 설정에 `statusLine` 필드를 추가합니다. `type`을 `"command"`로 설정하고 `command`에 스크립트 경로 또는 인라인 셸 명령어를 지정합니다.

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 2
  }
}
```

`command` 필드는 셸에서 실행되므로, 스크립트 파일 대신 인라인 명령어도 사용할 수 있습니다. 다음 예시는 `jq`를 사용해 JSON 입력을 파싱하여 모델 이름과 컨텍스트 비율을 표시합니다:

```json
{
  "statusLine": {
    "type": "command",
    "command": "jq -r '\"[\\(.model.display_name)] \\(.context_window.used_percentage // 0)% context\"'"
  }
}
```

### 선택 필드

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `padding` | number | `0` | 상태 라인 콘텐츠에 추가할 가로 여백(문자 수). 인터페이스 기본 여백에 추가되므로 터미널 가장자리로부터의 절대 거리가 아닌 상대 들여쓰기를 제어 |
| `refreshInterval` | number | 미설정 | 이벤트 기반 업데이트 외에 N초마다 명령어를 재실행. 최솟값은 `1`. 시간 기반 데이터(시계 등)를 표시하거나 백그라운드 서브에이전트가 메인 세션이 유휴 상태일 때 git 상태를 변경하는 경우에 설정. 설정하지 않으면 이벤트 발생 시에만 실행 |
| `hideVimModeIndicator` | boolean | `false` | 프롬프트 아래에 표시되는 내장 `-- INSERT --` 텍스트를 숨김. 스크립트에서 `vim.mode`를 직접 렌더링할 때 중복 표시를 방지하려면 `true`로 설정 |

### 상태 라인 비활성화

`/statusline` 명령어에 삭제나 초기화를 요청하여 비활성화합니다:

```
/statusline delete
/statusline clear
/statusline remove it
```

또는 settings.json에서 `statusLine` 필드를 수동으로 삭제합니다.

---

## 상태 라인 작동 방식

Claude Code가 스크립트를 실행하고 JSON 세션 데이터를 stdin으로 파이프합니다. 스크립트는 JSON을 읽어 필요한 값을 추출하고 stdout에 텍스트를 출력합니다. Claude Code는 스크립트가 출력하는 내용을 표시합니다.

### 업데이트 트리거

스크립트는 새 어시스턴트 메시지 이후, `/compact` 완료 후, 권한 모드 변경 시, 또는 vim 모드 토글 시 실행됩니다. 업데이트는 300ms로 디바운스되어 빠른 변경이 하나로 묶이고 안정된 후에 한 번 실행됩니다. 스크립트가 아직 실행 중일 때 새 업데이트가 발생하면 실행 중인 스크립트는 취소됩니다. 스크립트를 편집해도 다음 Claude Code 상호작용이 업데이트를 트리거할 때까지 변경 사항이 반영되지 않습니다.

메인 세션이 유휴 상태일 때(예: 코디네이터가 백그라운드 서브에이전트를 대기 중) 이 트리거가 실행되지 않을 수 있습니다. 유휴 기간 동안 시간 기반 또는 외부 소스 세그먼트를 최신 상태로 유지하려면 `refreshInterval`을 설정하여 고정 타이머로도 명령어를 재실행하세요.

### 스크립트 출력 형식

- **여러 줄**: 각 `echo` 또는 `print` 문이 별도의 행으로 표시됩니다.
- **색상**: ANSI 이스케이프 코드(예: `\033[32m` = 초록)를 사용합니다. 터미널이 지원해야 합니다.
- **링크**: OSC 8 이스케이프 시퀀스를 사용하여 텍스트를 클릭 가능하게 만듭니다(macOS에서 Cmd+클릭, Windows/Linux에서 Ctrl+클릭). iTerm2, Kitty, WezTerm 등 하이퍼링크를 지원하는 터미널이 필요합니다.

### 터미널 크기에 맞춘 출력

Claude Code는 스크립트의 출력을 캡처하므로, `tput cols` 및 언어 수준 너비 감지로는 스크립트 내에서 터미널 크기를 읽을 수 없습니다. 대신 `COLUMNS` 및 `LINES` 환경 변수를 읽으세요. Claude Code는 스크립트 실행 전 이 변수들을 현재 터미널 크기로 설정합니다. Claude Code v2.1.153 이상이 필요합니다.

---

## 사용 가능한 데이터

Claude Code는 stdin을 통해 다음 JSON 필드를 스크립트에 전달합니다:

| 필드 | 설명 |
|------|------|
| `model.id`, `model.display_name` | 현재 모델 식별자 및 표시 이름 |
| `cwd`, `workspace.current_dir` | 현재 작업 디렉터리. 두 필드는 동일한 값을 가지며, `workspace.current_dir`이 `workspace.project_dir`과의 일관성을 위해 권장됨 |
| `workspace.project_dir` | Claude Code가 실행된 디렉터리. 세션 중 작업 디렉터리가 변경되면 `cwd`와 다를 수 있음 |
| `workspace.added_dirs` | `/add-dir` 또는 `--add-dir`로 추가된 추가 디렉터리. 없으면 빈 배열 |
| `workspace.git_worktree` | `git worktree add`로 생성된 연결된 worktree 내부에 있을 때의 git worktree 이름. 메인 작업 트리에서는 없음. `--worktree` 세션에만 적용되는 `worktree.*`와 달리 모든 git worktree에 대해 채워짐 |
| `workspace.repo.host`, `workspace.repo.owner`, `workspace.repo.name` | `origin` remote에서 파싱한 저장소 정보 (예: `"github.com"`, `"anthropics"`, `"claude-code"`). git 저장소 외부이거나 `origin` remote가 없으면 없음 |
| `cost.total_cost_usd` | 추정 세션 비용(USD). 클라이언트 측에서 계산되므로 실제 청구액과 다를 수 있음 |
| `cost.total_duration_ms` | 세션 시작 이후 총 경과 시간(밀리초) |
| `cost.total_api_duration_ms` | API 응답 대기에 소요된 총 시간(밀리초) |
| `cost.total_lines_added`, `cost.total_lines_removed` | 변경된 코드 라인 수 |
| `context_window.total_input_tokens`, `context_window.total_output_tokens` | 가장 최근 API 응답 기준 컨텍스트 윈도우의 현재 토큰 수. 입력에는 캐시 읽기/쓰기 포함. v2.1.132 이전에는 누적 세션 합계였음 |
| `context_window.context_window_size` | 최대 컨텍스트 윈도우 크기(토큰). 기본값 200000, 확장 컨텍스트 모델은 1000000 |
| `context_window.used_percentage` | 미리 계산된 컨텍스트 윈도우 사용 비율 |
| `context_window.remaining_percentage` | 미리 계산된 컨텍스트 윈도우 잔여 비율 |
| `context_window.current_usage` | 마지막 API 호출의 토큰 수. context window 필드 참조 |
| `exceeds_200k_tokens` | 가장 최근 API 응답의 총 토큰 수(입력, 캐시, 출력 합계)가 200k를 초과하는지 여부. 실제 컨텍스트 윈도우 크기와 무관한 고정 임계값 |
| `effort.level` | 현재 reasoning effort(`low`, `medium`, `high`, `xhigh`, 또는 `max`). 세션 중 `/effort` 변경을 포함한 실시간 값 반영. Ultracode는 별도 레벨이 아니며 `xhigh`로 보고됨. 현재 모델이 effort 파라미터를 지원하지 않으면 없음 |
| `thinking.enabled` | 세션에 extended thinking이 활성화되어 있는지 여부 |
| `rate_limits.five_hour.used_percentage`, `rate_limits.seven_day.used_percentage` | 5시간 또는 7일 rate limit 사용 비율(0~100) |
| `rate_limits.five_hour.resets_at`, `rate_limits.seven_day.resets_at` | 5시간 또는 7일 rate limit 윈도우가 초기화되는 Unix epoch 시간(초) |
| `session_id` | 고유 세션 식별자 |
| `session_name` | `--name` 플래그 또는 `/rename`으로 설정한 사용자 지정 세션 이름. 설정하지 않으면 없음 |
| `transcript_path` | 대화 트랜스크립트 파일 경로 |
| `version` | Claude Code 버전 |
| `output_style.name` | 현재 output style의 이름 |
| `vim.mode` | vim 모드 활성화 시 현재 모드(`NORMAL`, `INSERT`, `VISUAL`, 또는 `VISUAL LINE`) |
| `agent.name` | `--agent` 플래그 또는 에이전트 설정으로 실행 중일 때의 에이전트 이름 |
| `pr.number`, `pr.url` | 현재 브랜치의 열린 pull request. 하단 상태 바의 PR 배지와 동일. PR이 발견되지 않았거나, git 저장소가 아니거나, PR이 병합/닫힌 경우 없음 |
| `pr.review_state` | 열린 PR의 리뷰 상태: `approved`, `pending`, `changes_requested`, 또는 `draft`. `pr`이 있어도 독립적으로 없을 수 있음 |
| `worktree.name` | 활성 worktree의 이름. `--worktree` 세션에서만 존재 |
| `worktree.path` | worktree 디렉터리의 절대 경로 |
| `worktree.branch` | worktree의 git 브랜치 이름(예: `"worktree-my-feature"`). hook 기반 worktree에서는 없음 |
| `worktree.original_cwd` | worktree에 진입하기 전 Claude가 있던 디렉터리 |
| `worktree.original_branch` | worktree에 진입하기 전 체크아웃된 git 브랜치. hook 기반 worktree에서는 없음 |

### 전체 JSON 스키마

상태 라인 명령어는 stdin으로 다음 JSON 구조를 수신합니다:

```json
{
  "cwd": "/current/working/directory",
  "session_id": "abc123...",
  "session_name": "my-session",
  "transcript_path": "/path/to/transcript.jsonl",
  "model": {
    "id": "claude-opus-4-8",
    "display_name": "Opus"
  },
  "workspace": {
    "current_dir": "/current/working/directory",
    "project_dir": "/original/project/directory",
    "added_dirs": [],
    "git_worktree": "feature-xyz",
    "repo": {
      "host": "github.com",
      "owner": "anthropics",
      "name": "claude-code"
    }
  },
  "version": "2.1.90",
  "output_style": {
    "name": "default"
  },
  "cost": {
    "total_cost_usd": 0.01234,
    "total_duration_ms": 45000,
    "total_api_duration_ms": 2300,
    "total_lines_added": 156,
    "total_lines_removed": 23
  },
  "context_window": {
    "total_input_tokens": 15500,
    "total_output_tokens": 1200,
    "context_window_size": 200000,
    "used_percentage": 8,
    "remaining_percentage": 92,
    "current_usage": {
      "input_tokens": 8500,
      "output_tokens": 1200,
      "cache_creation_input_tokens": 5000,
      "cache_read_input_tokens": 2000
    }
  },
  "exceeds_200k_tokens": false,
  "effort": {
    "level": "high"
  },
  "thinking": {
    "enabled": true
  },
  "rate_limits": {
    "five_hour": {
      "used_percentage": 23.5,
      "resets_at": 1738425600
    },
    "seven_day": {
      "used_percentage": 41.2,
      "resets_at": 1738857600
    }
  },
  "vim": {
    "mode": "NORMAL"
  },
  "agent": {
    "name": "security-reviewer"
  },
  "pr": {
    "number": 1234,
    "url": "https://github.com/anthropics/claude-code/pull/1234",
    "review_state": "pending"
  },
  "worktree": {
    "name": "my-feature",
    "path": "/path/to/.claude/worktrees/my-feature",
    "branch": "worktree-my-feature",
    "original_cwd": "/path/to/project",
    "original_branch": "main"
  }
}
```

### 없을 수 있는 필드 (JSON에 존재하지 않음)

- `session_name`: `--name` 또는 `/rename`으로 사용자 지정 이름을 설정한 경우에만 나타남
- `workspace.git_worktree`: 연결된 git worktree 내부에 있을 때만 나타남
- `workspace.repo`: `origin` remote가 구성된 git 저장소 내부에 있을 때만 나타남
- `effort`: 현재 모델이 reasoning effort 파라미터를 지원할 때만 나타남
- `vim`: vim 모드가 활성화되어 있을 때만 나타남
- `agent`: `--agent` 플래그 또는 에이전트 설정으로 실행 중일 때만 나타남
- `pr`: 현재 브랜치에 열린 PR이 발견된 경우에만 나타나며, PR이 병합/닫히면 제거됨. `pr.review_state`는 독립적으로 없을 수 있음
- `worktree`: `--worktree` 세션에서만 나타남. 존재하는 경우에도 hook 기반 worktree에서는 `branch`와 `original_branch`가 없을 수 있음
- `rate_limits`: Claude.ai 구독자(Pro/Max)의 첫 API 응답 이후에만 나타남. 각 윈도우(`five_hour`, `seven_day`)는 독립적으로 없을 수 있음. `jq -r '.rate_limits.five_hour.used_percentage // empty'`로 우아하게 처리

### `null`일 수 있는 필드

- `context_window.current_usage`: 세션의 첫 API 호출 전과 `/compact` 직후 다음 API 호출 전까지 `null`
- `context_window.used_percentage`, `context_window.remaining_percentage`: 세션 초기에 `null`일 수 있음

스크립트에서 조건부 접근과 null 값에 대한 대체 기본값을 사용하여 누락된 필드를 처리하세요.

---

## Context window 필드 상세

`context_window` 객체는 가장 최근 API 응답의 라이브 컨텍스트 윈도우를 설명합니다. v2.1.132부터 `total_input_tokens`와 `total_output_tokens`는 누적 세션 합계가 아닌 현재 컨텍스트 사용량을 반영합니다.

### 합계 (Combined totals)

- `total_input_tokens`: 컨텍스트 윈도우에 현재 있는 토큰 수. `input_tokens` + `cache_creation_input_tokens` + `cache_read_input_tokens`의 합
- `total_output_tokens`: 가장 최근 응답의 출력 토큰 수
- 첫 API 응답 전에는 둘 다 `0`

### 구성 요소별 사용량 (Per-component usage)

`current_usage` 객체는 동일한 토큰 수를 카테고리별로 분류합니다. 캐시 히트와 새 입력을 구분해야 할 때 사용합니다:

| 필드 | 설명 |
|------|------|
| `input_tokens` | 현재 컨텍스트의 입력 토큰 |
| `output_tokens` | 생성된 출력 토큰 |
| `cache_creation_input_tokens` | 캐시에 기록된 토큰 |
| `cache_read_input_tokens` | 캐시에서 읽은 토큰 |

`used_percentage`는 입력 토큰만으로 계산됩니다: `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`. `output_tokens`는 포함하지 않습니다.

`current_usage` 객체는 세션의 첫 API 호출 전과 `/compact` 직후 다음 API 호출이 데이터를 다시 채울 때까지 `null`입니다.

---

## 예시 스크립트

예시를 사용하려면:

1. 스크립트를 `~/.claude/statusline.sh`(또는 `.py`/`.js`) 파일로 저장
2. 실행 권한 부여: `chmod +x ~/.claude/statusline.sh`
3. 설정에 경로 추가

Bash 예시는 JSON 파싱에 `jq`를 사용합니다. Python과 Node.js는 내장 JSON 파싱을 사용합니다.

### 컨텍스트 윈도우 사용량

현재 모델과 컨텍스트 윈도우 사용량을 시각적 프로그레스 바로 표시합니다. 각 스크립트는 stdin에서 JSON을 읽고 `used_percentage` 필드를 추출하여, 채워진 블록(▓)이 사용량을 나타내는 10자 프로그레스 바를 만듭니다.

```bash
#!/bin/bash
# ~/.claude/statusline.sh
read -r JSON
MODEL=$(echo "$JSON" | jq -r '.model.display_name // "?"')
PCT=$(echo "$JSON" | jq -r '.context_window.used_percentage // 0')
BAR=$(printf '▓%.0s' $(seq 1 $((PCT / 10))))$(printf '░%.0s' $(seq 1 $((10 - PCT / 10))))
echo "[$MODEL] $BAR ${PCT}%"
```

### 색상이 있는 Git 상태

git 브랜치와 staged/modified 파일의 색상 표시기를 표시합니다. ANSI 이스케이프 코드를 사용합니다: `\033[32m` = 초록, `\033[33m` = 노랑, `\033[0m` = 기본값 복원.

```bash
#!/bin/bash
# ~/.claude/statusline.sh
BRANCH=$(git branch --show-current 2>/dev/null || echo "not a git repo")
STAGED=$(git diff --cached --numstat 2>/dev/null | wc -l | tr -d ' ')
MODIFIED=$(git diff --numstat 2>/dev/null | wc -l | tr -d ' ')

GREEN='\033[32m'
YELLOW='\033[33m'
RESET='\033[0m'

if [ "$STAGED" -gt 0 ] || [ "$MODIFIED" -gt 0 ]; then
  echo -e "${GREEN}${BRANCH}${RESET} staged:${STAGED} ${YELLOW}modified:${MODIFIED}${RESET}"
else
  echo -e "${GREEN}${BRANCH}${RESET} clean"
fi
```

### 비용 및 시간 추적

세션의 API 비용과 경과 시간을 추적합니다.

```bash
#!/bin/bash
# ~/.claude/statusline.sh
read -r JSON
COST=$(echo "$JSON" | jq -r '.cost.total_cost_usd // 0')
DURATION_MS=$(echo "$JSON" | jq -r '.cost.total_duration_ms // 0')
MINUTES=$((DURATION_MS / 60000))
SECONDS=$(((DURATION_MS % 60000) / 1000))
echo "\$${COST} | ${MINUTES}m ${SECONDS}s"
```

### 여러 줄 표시

스크립트는 여러 줄을 출력하여 더 풍부한 디스플레이를 만들 수 있습니다. 각 `echo` 문이 상태 영역에 별도의 행을 만듭니다.

```bash
#!/bin/bash
# ~/.claude/statusline.sh
read -r JSON
MODEL=$(echo "$JSON" | jq -r '.model.display_name // "?"')
PCT=$(echo "$JSON" | jq -r '.context_window.used_percentage // 0')
COST=$(echo "$JSON" | jq -r '.cost.total_cost_usd // 0')
BRANCH=$(git branch --show-current 2>/dev/null || echo "N/A")

# 색상 선택: 70% 미만 초록, 70-89% 노랑, 90% 이상 빨강
if [ "$PCT" -lt 70 ]; then
  COLOR='\033[32m'
elif [ "$PCT" -lt 90 ]; then
  COLOR='\033[33m'
else
  COLOR='\033[31m'
fi
RESET='\033[0m'

BAR=$(printf '▓%.0s' $(seq 1 $((PCT / 10))))$(printf '░%.0s' $(seq 1 $((10 - PCT / 10))))
echo -e "${COLOR}${BAR} ${PCT}%${RESET} [${MODEL}] \$${COST}"
echo "branch: ${BRANCH}"
```

### 클릭 가능한 링크

OSC 8 이스케이프 시퀀스로 GitHub 저장소에 대한 클릭 가능한 링크를 만듭니다. macOS에서 Cmd+클릭, Windows/Linux에서 Ctrl+클릭으로 브라우저에서 열 수 있습니다.

```bash
#!/bin/bash
# ~/.claude/statusline.sh
read -r JSON
REPO_OWNER=$(echo "$JSON" | jq -r '.workspace.repo.owner // empty')
REPO_NAME=$(echo "$JSON" | jq -r '.workspace.repo.name // empty')

if [ -n "$REPO_OWNER" ] && [ -n "$REPO_NAME" ]; then
  URL="https://github.com/${REPO_OWNER}/${REPO_NAME}"
  printf '\033]8;;%s\033\\%s\033]8;;\033\\\n' "$URL" "${REPO_OWNER}/${REPO_NAME}"
fi
```

### Rate limit 사용량

Claude.ai 구독 rate limit 사용량을 표시합니다. `rate_limits` 필드는 Claude.ai 구독자(Pro/Max)의 첫 API 응답 이후에만 존재합니다.

```bash
#!/bin/bash
# ~/.claude/statusline.sh
read -r JSON
FIVE_HR=$(echo "$JSON" | jq -r '.rate_limits.five_hour.used_percentage // empty')
SEVEN_DAY=$(echo "$JSON" | jq -r '.rate_limits.seven_day.used_percentage // empty')

[ -n "$FIVE_HR" ] && echo "5h: ${FIVE_HR}% | 7d: ${SEVEN_DAY}%"
```

### 느린 작업 캐싱

상태 라인 스크립트는 활성 세션 중 자주 실행됩니다. `git status`나 `git diff` 같은 명령어는 특히 큰 저장소에서 느릴 수 있습니다. 다음 예시는 git 정보를 임시 파일에 캐시하고 5초마다만 갱신합니다.

캐시 파일명은 세션 내 호출 간에 안정적이어야 하지만, 서로 다른 저장소의 동시 세션이 서로의 캐시된 git 상태를 읽지 않도록 세션 간에 고유해야 합니다. `$$`, `os.getpid()`, `process.pid` 같은 프로세스 기반 식별자는 호출마다 변경되어 캐시가 무효화됩니다. 대신 JSON 입력의 `session_id`를 사용하세요: 세션 수명 동안 안정적이고 세션별로 고유합니다.

```bash
#!/bin/bash
# ~/.claude/statusline.sh
read -r JSON
SESSION_ID=$(echo "$JSON" | jq -r '.session_id')
CACHE="/tmp/claude-statusline-git-${SESSION_ID}"

# 캐시가 없거나 5초 이상 오래된 경우 갱신
if [ ! -f "$CACHE" ] || [ $(($(date +%s) - $(stat -f %m "$CACHE" 2>/dev/null || echo 0))) -gt 5 ]; then
  git status --porcelain 2>/dev/null > "$CACHE"
fi

CHANGES=$(wc -l < "$CACHE" | tr -d ' ')
BRANCH=$(git branch --show-current 2>/dev/null || echo "N/A")
echo "${BRANCH} ±${CHANGES}"
```

### Windows 환경 구성

Windows에서 Claude Code는 Git Bash가 설치된 경우 Git Bash를 통해, 없는 경우 PowerShell을 통해 상태 라인 명령어를 실행합니다.

Git Bash는 따옴표 없는 백슬래시를 이스케이프 문자로 처리하므로, `C:\Users\username\script.mjs` 같은 Windows 경로는 구분 기호가 제거되어 명령이 보이는 오류 없이 실패합니다. `command` 문자열의 파일 경로는 아래 예시처럼 슬래시(`/`)로 작성하세요. `~` 단축 표기도 작동하며 Windows 홈 디렉터리로 확장됩니다.

PowerShell 스크립트를 상태 라인으로 실행하려면 `powershell`을 통해 호출합니다:

```json
{
  "statusLine": {
    "type": "command",
    "command": "powershell -File ~/statusline.ps1"
  }
}
```

또는 Git Bash가 설치된 경우 Bash 스크립트를 직접 실행할 수 있습니다:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash ~/.claude/statusline.sh"
  }
}
```

---

## Subagent 상태 라인

`subagentStatusLine` 설정은 프롬프트 아래 에이전트 패널에 표시되는 각 서브에이전트에 대한 커스텀 행 본문을 렌더링합니다. 기본 `name · description · token count` 행을 자체 포맷으로 대체할 때 사용합니다.

```json
{
  "subagentStatusLine": {
    "type": "command",
    "command": "~/.claude/subagent-statusline.sh"
  }
}
```

명령어는 새로고침 틱마다 한 번씩 실행되며, 보이는 모든 서브에이전트 행이 단일 JSON 객체로 stdin에 전달됩니다. 입력에는 기본 hook 필드와 함께 `columns`(사용 가능한 행 너비) 및 `tasks` 배열이 포함됩니다. 각 task는 `id`, `name`, `type`, `status`, `description`, `label`, `startTime`, `tokenCount`, `tokenSamples`, `cwd`를 가집니다.

재정의하려는 각 행에 대해 stdout에 한 줄의 JSON을 출력합니다. 형식: `{"id": "<task id>", "content": "<row body>"}`. `content` 문자열은 ANSI 색상과 OSC 8 하이퍼링크를 포함하여 있는 그대로 렌더링됩니다. task의 `id`를 생략하면 해당 행의 기본 렌더링이 유지되고, 빈 `content` 문자열을 출력하면 해당 행이 숨겨집니다.

`statusLine`에 적용되는 동일한 신뢰 및 `disableAllHooks` 게이트가 여기에도 적용됩니다. 플러그인은 `settings.json`에 기본 `subagentStatusLine`을 제공할 수 있습니다.

---

## 팁

- **모의 입력으로 테스트**: `echo '{"model":{"display_name":"Opus"},"workspace":{"current_dir":"/home/user/project"},"context_window":{"used_percentage":25},"session_id":"test-session-abc"}' | ./statusline.sh`
- **출력은 짧게**: 상태 바는 너비가 제한되어 있어 긴 출력은 잘리거나 줄바꿈될 수 있습니다
- **느린 작업은 캐싱**: 스크립트는 활성 세션 중 자주 실행되므로 `git status` 같은 명령어는 지연을 유발할 수 있습니다. 캐싱 예시를 참조하세요

커뮤니티 프로젝트인 ccstatusline과 starship-claude는 테마와 추가 기능이 포함된 사전 구성을 제공합니다.

---

## 문제 해결

### 상태 라인이 나타나지 않는 경우

- 스크립트가 실행 권한을 가지고 있는지 확인: `chmod +x ~/.claude/statusline.sh`
- 스크립트가 stderr가 아닌 stdout으로 출력하는지 확인
- 스크립트를 수동으로 실행하여 출력을 생성하는지 확인
- Windows에서 Git Bash가 설치된 경우, `command` 경로의 백슬래시가 이스케이프 문자로 소비되었을 수 있습니다. 경로에 슬래시를 사용하세요
- 설정에 `disableAllHooks`가 `true`로 설정된 경우 상태 라인도 비활성화됩니다. 이 설정을 제거하거나 `false`로 설정하세요
- `claude --debug`를 실행하여 세션의 첫 상태 라인 호출의 종료 코드와 stderr를 로그로 확인
- Claude에게 설정 파일을 읽고 `statusLine` 명령어를 직접 실행하여 오류를 확인하도록 요청

### 상태 라인에 `--` 또는 빈 값이 표시되는 경우

- 첫 API 응답 완료 전에는 필드가 `null`일 수 있습니다
- 스크립트에서 `jq`의 `// 0` 같은 대체값으로 null 처리
- 여러 메시지 후에도 값이 비어 있다면 Claude Code를 재시작

### 컨텍스트 비율이 예상과 다른 경우

- 가장 간단하고 정확한 컨텍스트 상태를 위해 `used_percentage` 사용
- 컨텍스트 비율은 계산 시점에 따라 `/context` 출력과 다를 수 있습니다

### OSC 8 링크가 클릭되지 않는 경우

- 터미널이 OSC 8 하이퍼링크를 지원하는지 확인 (iTerm2, Kitty, WezTerm)
- Terminal.app은 클릭 가능한 링크를 지원하지 않습니다
- 링크 텍스트가 표시되지만 클릭할 수 없다면, Claude Code가 터미널에서 하이퍼링크 지원을 감지하지 못했을 수 있습니다. Windows Terminal 및 자동 감지 목록에 없는 다른 에뮬레이터에서 자주 발생합니다. Claude Code 실행 전에 `FORCE_HYPERLINK` 환경 변수를 설정하세요:
  - PowerShell: `$env:FORCE_HYPERLINK = "1"; claude`
- SSH 및 tmux 세션은 구성에 따라 OSC 시퀀스를 제거할 수 있습니다
- 이스케이프 시퀀스가 `\e]8;;` 같은 리터럴 텍스트로 나타나면 `echo -e` 대신 `printf '%b'`를 사용하세요

### 이스케이프 시퀀스로 디스플레이 깨짐

- 복잡한 이스케이프 시퀀스(ANSI 색상, OSC 8 링크)는 다른 UI 업데이트와 겹칠 때 가끔 깨진 출력을 일으킬 수 있습니다
- 텍스트가 손상되면 스크립트를 일반 텍스트 출력으로 단순화해 보세요
- 이스케이프 코드가 있는 여러 줄 상태 라인은 한 줄 일반 텍스트보다 렌더링 문제가 발생하기 쉽습니다

### 워크스페이스 신뢰 필요

- 상태 라인 명령어는 현재 디렉터리에 대해 워크스페이스 신뢰 대화상자를 수락한 경우에만 실행됩니다. `statusLine`은 셸 명령어를 실행하므로 hook 및 다른 셸 실행 설정과 동일한 신뢰 수락이 필요합니다
- 신뢰가 수락되지 않으면 상태 라인 출력 대신 `statusline skipped · restart to fix` 알림이 표시됩니다. Claude Code를 재시작하고 신뢰 프롬프트를 수락하세요

### 스크립트 오류 또는 멈춤

- 0이 아닌 종료 코드로 종료되거나 출력이 없는 스크립트는 상태 라인이 비어 있게 만듭니다
- 느린 스크립트는 완료될 때까지 상태 라인 업데이트를 차단합니다. 출력이 오래되지 않도록 스크립트를 빠르게 유지하세요
- 느린 스크립트가 실행 중일 때 새 업데이트가 발생하면 실행 중인 스크립트가 취소됩니다
- 구성하기 전에 모의 입력으로 스크립트를 독립적으로 테스트하세요

### 알림이 상태 라인 행을 공유함

- MCP 서버 오류 및 자동 업데이트 같은 시스템 알림은 상태 라인과 같은 행의 오른쪽에 표시됩니다. context-low 경고 같은 일시적 알림도 이 영역을 순환합니다
- verbose 모드를 활성화하면 이 영역에 토큰 카운터가 추가됩니다
- 좁은 터미널에서는 이러한 알림이 상태 라인 출력을 잘라낼 수 있습니다
