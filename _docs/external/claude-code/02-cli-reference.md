# Claude Code CLI 전체 참조

> CLI 명령어, 플래그, 슬래시 명령어, 대화형 단축키, 키바인딩 설정, 내장 도구 전체 참조
>
> **원문**: [CLI Reference](https://code.claude.com/docs/en/cli-reference) | [Commands](https://code.claude.com/docs/en/commands) | [Interactive Mode](https://code.claude.com/docs/en/interactive-mode) | [Keybindings](https://code.claude.com/docs/en/keybindings) | [Tools Reference](https://code.claude.com/docs/en/tools-reference) | [Fullscreen](https://code.claude.com/docs/en/fullscreen)
>
> **기존 링크**: [CLI Reference - Anthropic](https://docs.anthropic.com/en/docs/claude-code/cli-reference) | [Interactive Mode - Anthropic](https://docs.anthropic.com/en/docs/claude-code/interactive-mode) | [Slash Commands - Anthropic](https://docs.anthropic.com/en/docs/claude-code/slash-commands) | [SDK - Anthropic](https://docs.anthropic.com/en/docs/claude-code/sdk)

---

## CLI 명령어

세션 시작, 콘텐츠 파이프, 대화 재개, 업데이트 관리에 사용하는 명령어입니다.

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `claude` | 대화형 세션 시작 | `claude` |
| `claude "쿼리"` | 초기 프롬프트와 함께 대화형 세션 시작 | `claude "이 프로젝트 설명해줘"` |
| `claude -p "쿼리"` | SDK로 쿼리 실행 후 종료 | `claude -p "이 함수 설명해줘"` |
| `cat file \| claude -p "쿼리"` | 파이프된 내용 처리 | `cat logs.txt \| claude -p "설명해줘"` |
| `claude -c` | 현재 디렉토리의 가장 최근 대화 이어서 | `claude -c` |
| `claude -c -p "쿼리"` | SDK로 대화 이어서 | `claude -c -p "타입 에러 확인해줘"` |
| `claude -r "<세션>" "쿼리"` | ID 또는 이름으로 세션 재개 | `claude -r "auth-refactor" "이 PR 마저 끝내줘"` |
| `claude update` | 최신 버전으로 업데이트 | `claude update` |
| `claude install [버전]` | 네이티브 바이너리 설치 또는 재설치. `2.1.118` 같은 버전, `stable` 또는 `latest` 허용 | `claude install stable` |
| `claude auth login` | Anthropic 계정 로그인. `--email`로 이메일 미리 채우기, `--sso`로 SSO 강제, `--console`로 Anthropic Console 인증 | `claude auth login --console` |
| `claude auth logout` | Anthropic 계정 로그아웃 | `claude auth logout` |
| `claude auth status` | 인증 상태를 JSON으로 표시. `--text`로 읽기 쉬운 형식. 로그인 상태면 종료 코드 0, 아니면 1 | `claude auth status` |
| `claude agents` | 병렬 백그라운드 세션 모니터링 및 디스패치. `--cwd`, `--json`, `--permission-mode`, `--model`, `--effort`, `--agent` 등 지원 | `claude agents --json` |
| `claude attach <id>` | 백그라운드 세션에 터미널에서 연결 | `claude attach 7c5dcf5d` |
| `claude auto-mode defaults` | 빌트인 자동 모드 분류 규칙을 JSON으로 출력. `claude auto-mode config`로 설정 적용 상태 확인 | `claude auto-mode defaults > rules.json` |
| `claude daemon status` | 백그라운드 세션 슈퍼바이저 상태, 버전, 소켓 디렉토리, 워커 수 출력. 미실행 시 종료 코드 1 | `claude daemon status` |
| `claude daemon stop --any` | 슈퍼바이저 및 호스트 세션 중지. `--keep-workers`로 백그라운드 세션 유지 | `claude daemon stop --any --keep-workers` |
| `claude logs <id>` | 백그라운드 세션의 최근 출력 표시 | `claude logs 7c5dcf5d` |
| `claude mcp` | MCP 서버 구성 | `claude mcp` |
| `claude plugin` | 플러그인 관리. 별칭: `claude plugins` | `claude plugin install code-review@claude-plugins-official` |
| `claude project purge [경로]` | 프로젝트의 모든 로컬 상태 삭제. `--dry-run`, `-y`, `-i`, `--all` 플래그 지원 | `claude project purge ~/work/repo --dry-run` |
| `claude remote-control` | Remote Control 서버 시작. claude.ai 또는 Claude 앱에서 제어 가능 | `claude remote-control --name "My Project"` |
| `claude respawn <id>` | 백그라운드 세션 재시작. 대화 내용 유지. `--all`로 모든 실행 중 세션 재시작 | `claude respawn 7c5dcf5d` |
| `claude rm <id>` | 백그라운드 세션 제거. 대화 기록은 로컬에 유지되어 `claude --resume`으로 접근 가능 | `claude rm 7c5dcf5d` |
| `claude setup-token` | CI 및 스크립트용 장기 OAuth 토큰 생성. Claude 구독 필요 | `claude setup-token` |
| `claude stop <id>` | 백그라운드 세션 중지. `claude kill`도 동일 | `claude stop 7c5dcf5d` |
| `claude ultrareview [대상]` | 비대화형으로 ultrareview 실행. `--json`, `--timeout <분>` 지원 | `claude ultrareview 1234 --json` |

명령어를 잘못 입력하면 가장 가까운 일치 항목을 제안합니다. 예: `claude udpate` → `Did you mean claude update?`

---

## CLI 플래그

Claude Code의 동작을 커스터마이즈하는 명령줄 플래그입니다. `claude --help`에 모든 플래그가 표시되지 않으므로, 표시되지 않는다고 사용 불가능한 것은 아닙니다.

| 플래그 | 설명 | 예시 |
|--------|------|------|
| `--add-dir` | Claude가 파일을 읽고 편집할 추가 작업 디렉토리 | `claude --add-dir ../apps ../lib` |
| `--agent` | 세션에 사용할 에이전트 지정 (`agent` 설정 오버라이드) | `claude --agent my-custom-agent` |
| `--agents` | JSON으로 커스텀 서브에이전트 동적 정의 | `claude --agents '{"reviewer":{"description":"Reviews code","prompt":"You are a code reviewer"}}'` |
| `--allow-dangerously-skip-permissions` | `Shift+Tab` 모드 순환에 `bypassPermissions` 추가 (시작 모드는 다르게 지정 가능) | `claude --permission-mode plan --allow-dangerously-skip-permissions` |
| `--allowedTools` | 권한 프롬프트 없이 실행할 도구. 패턴 매칭 지원 | `"Bash(git log *)" "Bash(git diff *)" "Read"` |
| `--append-system-prompt` | 기본 시스템 프롬프트 끝에 텍스트 추가 | `claude --append-system-prompt "Always use TypeScript"` |
| `--append-system-prompt-file` | 파일에서 추가 시스템 프롬프트 텍스트 로드 | `claude --append-system-prompt-file ./extra-rules.txt` |
| `--bare` | 최소 모드: 훅, 스킬, 플러그인, MCP 서버, 자동 메모리, CLAUDE.md 자동 탐색 건너뛰기 | `claude --bare -p "쿼리"` |
| `--betas` | API 요청에 포함할 베타 헤더 (API 키 사용자만) | `claude --betas interleaved-thinking` |
| `--bg` | 세션을 백그라운드 에이전트로 시작. 세션 ID와 관리 명령어 출력 | `claude --bg "flaky test 조사해줘"` |
| `--channels` | (리서치 프리뷰) Claude가 수신할 채널 알림의 MCP 서버 지정 | `claude --channels plugin:my-notifier@my-marketplace` |
| `--chrome` | Chrome 브라우저 통합 활성화 | `claude --chrome` |
| `--continue`, `-c` | 현재 디렉토리의 가장 최근 대화 로드 | `claude --continue` |
| `--dangerously-load-development-channels` | 승인 목록에 없는 채널 활성화 (로컬 개발용) | `claude --dangerously-load-development-channels server:webhook` |
| `--dangerously-skip-permissions` | 권한 프롬프트 건너뛰기. `--permission-mode bypassPermissions`와 동일 | `claude --dangerously-skip-permissions` |
| `--debug` | 디버그 모드 활성화 (카테고리 필터링 가능, 예: `"api,hooks"`) | `claude --debug "api,mcp"` |
| `--debug-file <경로>` | 디버그 로그를 특정 파일에 기록 | `claude --debug-file /tmp/claude-debug.log` |
| `--disable-slash-commands` | 모든 스킬과 명령어 비활성화 | `claude --disable-slash-commands` |
| `--disallowedTools` | 거부 규칙. 스코프 없는 도구명은 모델 컨텍스트에서 제거 | `"Bash(git log *)" "Bash(git diff *)" "Edit"` |
| `--effort` | 세션의 노력 수준 설정. `low`, `medium`, `high`, `xhigh`, `max` | `claude --effort high` |
| `--enable-auto-mode` | v2.1.111에서 제거됨. `--permission-mode auto` 사용 | `claude --permission-mode auto` |
| `--exclude-dynamic-system-prompt-sections` | 시스템 프롬프트의 머신별 섹션을 첫 사용자 메시지로 이동. 프롬프트 캐시 재사용 개선 | `claude -p --exclude-dynamic-system-prompt-sections "쿼리"` |
| `--exec` | Claude 세션 대신 쉘 명령을 PTY 백그라운드 작업으로 실행 | `claude --bg --exec 'pytest -x'` |
| `--fallback-model` | 기본 모델 과부하 시 자동 폴백할 모델 지정 (print 모드, 백그라운드 세션에만 적용) | `claude -p --fallback-model sonnet "쿼리"` |
| `--fork-session` | 재개 시 새 세션 ID 생성 (`--resume` 또는 `--continue`와 함께 사용) | `claude --resume abc123 --fork-session` |
| `--from-pr` | 특정 PR에 연결된 세션 재개. PR 번호, GitHub/GitLab/Bitbucket URL 지원 | `claude --from-pr 123` |
| `--ide` | 시작 시 사용 가능한 IDE가 정확히 하나면 자동 연결 | `claude --ide` |
| `--init` | 세션 전에 `init` 매처로 Setup 훅 실행 (print 모드만) | `claude -p --init "쿼리"` |
| `--init-only` | Setup 및 `SessionStart` 훅만 실행 후 종료 | `claude --init-only` |
| `--include-hook-events` | 출력 스트림에 모든 훅 수명주기 이벤트 포함. `--output-format stream-json` 필요 | `claude -p --output-format stream-json --verbose --include-hook-events "쿼리"` |
| `--include-partial-messages` | 출력에 부분 스트리밍 이벤트 포함. `--print` 및 `--output-format stream-json` 필요 | `claude -p --output-format stream-json --verbose --include-partial-messages "쿼리"` |
| `--input-format` | print 모드 입력 형식 지정 (`text`, `stream-json`) | `claude -p --output-format json --input-format stream-json` |
| `--json-schema` | 에이전트 완료 후 JSON Schema에 맞는 검증된 JSON 출력 (print 모드만) | `claude -p --json-schema '{"type":"object","properties":{...}}' "쿼리"` |
| `--maintenance` | 세션 전에 `maintenance` 매처로 Setup 훅 실행 (print 모드만) | `claude -p --maintenance "쿼리"` |
| `--max-budget-usd` | API 호출 최대 지출 금액 (print 모드만) | `claude -p --max-budget-usd 5.00 "쿼리"` |
| `--max-turns` | 에이전트 턴 수 제한 (print 모드만) | `claude -p --max-turns 3 "쿼리"` |
| `--mcp-config` | JSON 파일 또는 문자열에서 MCP 서버 로드 | `claude --mcp-config ./mcp.json` |
| `--model` | 세션 모델 설정. 별칭 (`sonnet`, `opus`) 또는 전체 이름. `model` 설정 및 `ANTHROPIC_MODEL` 오버라이드 | `claude --model claude-sonnet-4-6` |
| `--name`, `-n` | 세션 표시 이름 설정. `/resume` 및 터미널 제목에 표시 | `claude -n "my-feature-work"` |
| `--no-chrome` | Chrome 브라우저 통합 비활성화 | `claude --no-chrome` |
| `--no-session-persistence` | 세션 저장을 비활성화하여 디스크에 기록하지 않고 재개 불가. print 모드만. `CLAUDE_CODE_SKIP_PROMPT_HISTORY` 환경변수로 모든 모드에서 동일 효과 | `claude -p --no-session-persistence "쿼리"` |
| `--output-format` | print 모드 출력 형식 지정 (`text`, `json`, `stream-json`) | `claude -p "쿼리" --output-format json` |
| `--permission-mode` | 지정된 권한 모드로 시작. `default`, `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions` | `claude --permission-mode plan` |
| `--permission-prompt-tool` | 비대화형 모드에서 권한 프롬프트를 처리할 MCP 도구 지정 | `claude -p --permission-prompt-tool mcp_auth_tool "쿼리"` |
| `--plugin-dir` | 디렉토리 또는 `.zip`에서 플러그인 로드 (세션 전용) | `claude --plugin-dir ./my-plugin` |
| `--plugin-url` | URL에서 플러그인 `.zip` 아카이브 가져오기 (세션 전용) | `claude --plugin-url https://example.com/plugin.zip` |
| `--print`, `-p` | 대화형 모드 없이 응답 출력 | `claude -p "쿼리"` |
| `--prompt-suggestions` | 각 턴 후 예상 다음 프롬프트를 `prompt_suggestion` 메시지로 출력 | `claude -p --prompt-suggestions --output-format stream-json --verbose "쿼리"` |
| `--remote` | claude.ai에 제공된 작업 설명으로 새 웹 세션 생성 | `claude --remote "Fix the login bug"` |
| `--remote-control`, `--rc` | Remote Control이 활성화된 대화형 세션 시작 | `claude --remote-control "My Project"` |
| `--remote-control-session-name-prefix` | 자동 생성된 Remote Control 세션 이름의 접두사 | `claude remote-control --remote-control-session-name-prefix dev-box` |
| `--replay-user-messages` | stdin의 사용자 메시지를 stdout에 재생. `--input-format stream-json` 및 `--output-format stream-json` 필요 | `claude -p --input-format stream-json --output-format stream-json --verbose --replay-user-messages` |
| `--resume`, `-r` | ID 또는 이름으로 특정 세션 재개, 또는 대화형 선택기 표시 | `claude --resume auth-refactor` |
| `--session-id` | 대화에 사용할 특정 세션 ID (유효한 UUID) | `claude --session-id "550e8400-e29b-41d4-a716-446655440000"` |
| `--setting-sources` | 로드할 설정 소스를 쉼표로 구분 (`user`, `project`, `local`) | `claude --setting-sources user,project` |
| `--settings` | 설정 JSON 파일 경로 또는 인라인 JSON 문자열 | `claude --settings ./settings.json` |
| `--strict-mcp-config` | `--mcp-config`의 MCP 서버만 사용 | `claude --strict-mcp-config --mcp-config ./mcp.json` |
| `--system-prompt` | 전체 시스템 프롬프트를 커스텀 텍스트로 교체 | `claude --system-prompt "You are a Python expert"` |
| `--system-prompt-file` | 파일에서 시스템 프롬프트 로드 (기본 프롬프트 교체) | `claude --system-prompt-file ./custom-prompt.txt` |
| `--teleport` | 웹 세션을 로컬 터미널에서 재개 | `claude --teleport` |
| `--teammate-mode` | 에이전트 팀 팀원 표시 방식. `auto`, `in-process`, `tmux` | `claude --teammate-mode in-process` |
| `--tmux` | 워크트리용 tmux 세션 생성. `--worktree` 필요 | `claude -w feature-auth --tmux` |
| `--tools` | Claude가 사용할 수 있는 빌트인 도구 제한. `""`로 전체 비활성화, `"default"`로 전체 활성화 | `claude --tools "Bash,Edit,Read"` |
| `--verbose` | 상세 로깅 활성화. 전체 턴별 출력 표시 | `claude --verbose` |
| `--version`, `-v` | 버전 번호 출력 | `claude -v` |
| `--worktree`, `-w` | 격리된 git worktree에서 Claude 시작. `#<번호>` 또는 PR URL로 해당 PR의 브랜치에서 시작 | `claude -w feature-auth` |

---

## 시스템 프롬프트 플래그

Claude Code는 시스템 프롬프트 커스터마이징을 위한 4개의 플래그를 제공합니다. 모두 대화형 및 비대화형 모드에서 작동합니다.

| 플래그 | 동작 | 예시 |
|--------|------|------|
| `--system-prompt` | 전체 기본 프롬프트 교체 | `claude --system-prompt "You are a Python expert"` |
| `--system-prompt-file` | 파일 내용으로 교체 | `claude --system-prompt-file ./prompts/review.txt` |
| `--append-system-prompt` | 기본 프롬프트에 추가 | `claude --append-system-prompt "Always use TypeScript"` |
| `--append-system-prompt-file` | 파일 내용을 기본 프롬프트에 추가 | `claude --append-system-prompt-file ./style-rules.txt` |

`--system-prompt`과 `--system-prompt-file`은 상호 배타적입니다. 추가(append) 플래그는 교체 플래그와 조합할 수 있습니다.

선택 기준:
- **추가 플래그**: Claude Code의 기본 코딩 어시스턴트 기능을 유지하면서 추가 규칙이 필요할 때
- **교체 플래그**: 코딩 어시스턴트가 아닌 다른 역할의 에이전트를 파이프라인에서 실행할 때. 기본 프롬프트의 도구 안내, 안전 지침 등이 모두 삭제됨

---

## 슬래시 명령어

대화형 세션에서 `/`를 입력하면 사용 가능한 모든 명령어, 스킬, 플러그인 및 MCP 서버 명령어가 표시됩니다.

| 명령어 | 설명 |
|--------|------|
| `/add-dir <경로>` | 현재 세션에 작업 디렉토리 추가 |
| `/agents` | 에이전트 구성 관리 |
| `/autofix-pr [프롬프트]` | 현재 브랜치의 PR을 감시하고 CI 실패 또는 리뷰 코멘트 시 자동 수정 |
| `/background [프롬프트]` | 현재 세션을 백그라운드 에이전트로 분리. 별칭: `/bg` |
| `/batch <지시사항>` | **스킬.** 코드베이스 전체에 대규모 병렬 변경 오케스트레이션 |
| `/branch [이름]` | 현재 대화의 분기 생성 |
| `/btw <질문>` | 대화 기록에 추가하지 않고 빠른 질문 |
| `/chrome` | Chrome 설정 구성 |
| `/claude-api [migrate\|managed-agents-onboard]` | **스킬.** Claude API 참조 자료 로드 |
| `/clear [이름]` | 새 대화 시작. 별칭: `/reset`, `/new` |
| `/code-review [수준] [--fix] [--comment]` | **스킬.** 현재 diff에 대한 코드 리뷰 |
| `/color [색상\|default]` | 프롬프트 바 색상 설정 |
| `/compact [지시사항]` | 대화 압축으로 컨텍스트 확보 |
| `/config` | 설정 인터페이스 열기. 별칭: `/settings` |
| `/context [all]` | 현재 컨텍스트 사용량 시각화 |
| `/copy [N]` | 마지막 어시스턴트 응답을 클립보드에 복사 |
| `/cost` | `/usage`의 별칭 |
| `/debug [설명]` | **스킬.** 디버그 로깅 활성화 |
| `/deep-research <질문>` | **워크플로우.** 웹 검색 팬아웃, 소스 교차 검증, 인용 보고서 합성 |
| `/desktop` | Claude Code Desktop 앱에서 세션 계속. 별칭: `/app` |
| `/diff` | 대화형 diff 뷰어 열기 |
| `/doctor` | Claude Code 설치 및 설정 진단 |
| `/effort [수준\|auto]` | 모델 노력 수준 설정 |
| `/exit` | CLI 종료. 별칭: `/quit` |
| `/export [파일명]` | 대화를 일반 텍스트로 내보내기 |
| `/fast [on\|off]` | 패스트 모드 토글 |
| `/feedback [리포트]` | 피드백 제출. 별칭: `/bug`, `/share` |
| `/fewer-permission-prompts` | **스킬.** 권한 프롬프트 감소를 위한 허용 목록 생성 |
| `/focus` | 포커스 뷰 토글 |
| `/fork <지시사항>` | 전체 대화를 상속하는 포크 서브에이전트 생성 |
| `/goal [조건\|clear]` | 목표 설정: 조건 충족까지 Claude가 계속 작업 |
| `/heapdump` | JavaScript 힙 스냅샷 및 메모리 분석 생성 |
| `/help` | 도움말 및 사용 가능한 명령어 표시 |
| `/hooks` | 훅 설정 보기 |
| `/ide` | IDE 통합 관리 |
| `/init` | CLAUDE.md 가이드로 프로젝트 초기화 |
| `/insights` | Claude Code 세션 분석 리포트 생성 |
| `/install-github-app` | GitHub Actions 앱 설치 |
| `/install-slack-app` | Claude Slack 앱 설치 |
| `/keybindings` | 키바인딩 구성 파일 열기/생성 |
| `/login` | Anthropic 계정 로그인 |
| `/logout` | Anthropic 계정 로그아웃 |
| `/loop [간격] [프롬프트]` | **스킬.** 프롬프트 반복 실행. 별칭: `/proactive` |
| `/mcp` | MCP 서버 연결 및 OAuth 인증 관리 |
| `/memory` | CLAUDE.md 메모리 파일 편집 |
| `/mobile` | Claude 모바일 앱 QR 코드 표시. 별칭: `/ios`, `/android` |
| `/model [모델]` | AI 모델 전환 |
| `/passes` | 친구에게 Claude Code 무료 1주 공유 |
| `/permissions` | 권한 규칙 관리. 별칭: `/allowed-tools` |
| `/plan [설명]` | 프롬프트에서 바로 계획 모드 진입 |
| `/plugin` | 플러그인 관리 |
| `/powerup` | 인터랙티브 레슨으로 기능 탐색 |
| `/radio` | Claude FM lo-fi 라디오 열기 |
| `/recap` | 현재 세션 요약 생성 |
| `/release-notes` | 체인지로그를 인터랙티브 버전 선택기로 표시 |
| `/reload-plugins` | 플러그인 다시 로드 |
| `/reload-skills` | 스킬 및 명령어 디렉토리 재스캔 |
| `/remote-control` | claude.ai에서 원격 제어 활성화. 별칭: `/rc` |
| `/remote-env` | `--remote`로 시작하는 웹 세션의 기본 원격 환경 구성 |
| `/rename [이름]` | 세션 이름 변경 |
| `/resume [세션]` | 대화 재개. 별칭: `/continue` |
| `/review [PR]` | 로컬에서 풀 리퀘스트 리뷰 |
| `/rewind` | 대화 및/또는 코드를 이전 시점으로 되돌리기. 별칭: `/checkpoint`, `/undo` |
| `/run` | **스킬.** 프로젝트 앱 실행 및 구동 |
| `/run-skill-generator` | **스킬.** `/run` 및 `/verify`용 프로젝트 스킬 작성 |
| `/sandbox` | 샌드박스 모드 토글 |
| `/schedule [설명]` | 루틴 생성, 업데이트, 목록, 실행. 별칭: `/routines` |
| `/scroll-speed` | 마우스 휠 스크롤 속도 조정 |
| `/pr-comments [PR]` | **v2.1.91에서 제거됨.** PR 코멘트 조회는 Claude에게 직접 요청 |
| `/privacy-settings` | 개인정보 설정 보기 및 업데이트. Pro 및 Max 플랜 구독자만 사용 가능 |
| `/security-review` | 현재 브랜치의 보안 취약점 분석 |
| `/setup-bedrock` | Amazon Bedrock 인증 구성 마법사 |
| `/setup-vertex` | Google Vertex AI 인증 구성 마법사 |
| `/simplify [대상]` | **스킬.** 변경된 코드의 정리 기회 검토 및 수정 적용 |
| `/skills` | 사용 가능한 스킬 목록 |
| `/stats` | `/usage`의 별칭. Stats 탭 열기 |
| `/status` | 설정 인터페이스 열기 (상태 탭) |
| `/statusline` | Claude Code 상태 라인 구성 |
| `/stickers` | Claude Code 스티커 주문 |
| `/stop` | 현재 백그라운드 세션 중지 |
| `/tasks` | 백그라운드 작업 목록 및 관리. 별칭: `/bashes` |
| `/team-onboarding` | 팀 온보딩 가이드 생성 |
| `/teleport` | Claude Code on the web 세션을 로컬로 가져오기. 별칭: `/tp` |
| `/terminal-setup` | Shift+Enter 등 터미널 키바인딩 구성 |
| `/theme` | 색상 테마 변경 |
| `/tui [default\|fullscreen]` | 터미널 UI 렌더러 설정 |
| `/ultraplan <프롬프트>` | ultraplan 세션에서 계획 초안 작성 |
| `/ultrareview [PR]` | 클라우드 샌드박스에서 심층 다중 에이전트 코드 리뷰 |
| `/upgrade` | 상위 플랜으로 업그레이드 |
| `/usage` | 세션 비용, 플랜 사용량 한도, 활동 통계 표시 |
| `/usage-credits` | 한도 도달 시 작업 계속을 위한 사용량 크레딧 구성 |
| `/verify` | **스킬.** 코드 변경 검증 |
| `/voice [hold\|tap\|off]` | 음성 받아쓰기 토글 |
| `/web-setup` | GitHub 계정을 Claude Code on the web에 연결 |
| `/workflows` | 워크플로우 진행 뷰 열기 |

---

## 대화형 모드

### 키보드 단축키 — 일반 제어

| 단축키 | 설명 | 컨텍스트 |
|--------|------|----------|
| `Ctrl+C` | 실행 중인 작업 중단. 입력 없으면 첫 번째로 프롬프트 지우고, 두 번째로 Claude Code 종료 | 일반 |
| `Ctrl+X Ctrl+K` | 이 세션의 모든 실행 중인 백그라운드 서브에이전트 종료. 3초 내 두 번 눌러 확인 | 서브에이전트 제어 |
| `Ctrl+D` | Claude Code 세션 종료 | EOF 시그널 |
| `Ctrl+G` 또는 `Ctrl+X Ctrl+E` | 기본 텍스트 에디터에서 열기 | 프롬프트 또는 응답 편집 |
| `Ctrl+L` | 화면 다시 그리기. 입력과 대화 기록 유지 | 디스플레이 복구 |
| `Ctrl+O` | 트랜스크립트 뷰어 토글 | 상세 도구 사용량 표시 |
| `Ctrl+R` | 명령 기록 역순 검색 | 기록 검색 |
| `Ctrl+V` 또는 `Cmd+V` (iTerm2) 또는 `Alt+V` (Windows/WSL) | 클립보드에서 이미지 붙여넣기 | 이미지 삽입 |
| `Ctrl+B` | 실행 중인 작업 백그라운드로 전환. tmux에서는 두 번 누름 | 백그라운드 |
| `Ctrl+T` | 작업 목록 토글 | 상태 영역 |
| `Esc` | Claude 중단 | 현재 응답/도구 호출 중단 |
| `Esc` + `Esc` | 입력 초안 지우기 또는 되감기 | 입력 있으면 지우고 기록에 저장, 없으면 되감기 메뉴 |
| `Shift+Tab` 또는 `Alt+M` | 권한 모드 순환 | `default` → `acceptEdits` → `plan` → `auto` → `bypassPermissions` |
| `Option+P` (macOS) / `Alt+P` (Windows/Linux) | 모델 전환 | 프롬프트 유지하며 모델 변경 |
| `Option+T` (macOS) / `Alt+T` (Windows/Linux) | 확장 사고 토글 | v2.1.132부터 macOS에서 Meta 설정 없이 작동 |
| `Option+O` (macOS) / `Alt+O` (Windows/Linux) | 패스트 모드 토글 | 빠른 응답 모드 |

### 키보드 단축키 — 텍스트 편집

| 단축키 | 설명 | 컨텍스트 |
|--------|------|----------|
| `Ctrl+A` | 현재 줄 시작으로 이동 | 멀티라인 입력 시 현재 논리 줄 |
| `Ctrl+E` | 현재 줄 끝으로 이동 | 멀티라인 입력 시 혼자 줄 |
| `Ctrl+K` | 줄 끝까지 삭제 | 삭제된 텍스트는 붙여넣기용 저장 |
| `Ctrl+U` | 커서부터 줄 시작까지 삭제 | 삭제된 텍스트 저장. 반복 시 멀티라인에서 여러 줄 삭제 |
| `Ctrl+W` | 이전 단어 삭제 | macOS에서 `Cmd+Backspace`도 동일 |
| `Ctrl+Y` | 삭제된 텍스트 붙여넣기 | `Ctrl+K`, `Ctrl+U`, `Ctrl+W`로 삭제한 텍스트 |
| `Alt+Y` (`Ctrl+Y` 후) | 붙여넣기 기록 순환 | macOS에서 Meta as Option 필요 |
| `Alt+B` | 한 단어 뒤로 이동 | macOS에서 Meta as Option 필요 |
| `Alt+F` | 한 단어 앞으로 이동 | macOS에서 Meta as Option 필요 |

### 여러 줄 입력

| 방법 | 단축키 | 컨텍스트 |
|------|--------|----------|
| 빠른 이스케이프 | `\` + `Enter` | 모든 터미널 |
| Option 키 | `Option+Enter` | macOS에서 Meta as Option 활성화 후 |
| Shift+Enter | `Shift+Enter` | iTerm2, WezTerm, Ghostty, Kitty, Warp, Apple Terminal, Windows Terminal |
| 제어 시퀀스 | `Ctrl+J` | 모든 터미널 |
| 붙여넣기 모드 | 직접 붙여넣기 | 코드 블록, 로그 등 |

### 빠른 명령

| 단축키 | 설명 |
|--------|------|
| `/` (시작 시) | 명령어 또는 스킬 |
| `!` (시작 시) | 쉘 모드 — 명령을 직접 실행하고 결과를 세션에 추가 |
| `@` | 파일 경로 멘션 — 파일 경로 자동완성 트리거 |

### 트랜스크립트 뷰어 단축키

트랜스크립트 뷰어(`Ctrl+O`)가 열려 있을 때 사용 가능합니다.

| 단축키 | 설명 |
|--------|------|
| `?` | 키보드 단축키 도움말 패널 토글 (풀스크린 필요) |
| `{` / `}` | 이전/다음 사용자 프롬프트로 이동 (풀스크린 필요) |
| `Ctrl+E` | 모든 콘텐츠 표시 토글 |
| `[` | 전체 대화를 터미널 네이티브 스크롤백에 기록 (풀스크린 필요) |
| `v` | 대화를 임시 파일로 저장하고 `$VISUAL`/`$EDITOR`로 열기 (풀스크린 필요) |
| `q`, `Ctrl+C`, `Esc` | 트랜스크립트 뷰 종료 |

### 음성 입력

| 단축키 | 설명 | 참고 |
|--------|------|------|
| `Space` 길게 또는 탭 | 음성 받아쓰기 | 음성 받아쓰기 활성화 필요. `/voice tap`으로 탭 모드 전환 |

### 명령 기록

- 입력 기록은 작업 디렉토리별로 저장됨
- `/clear` 실행 시 기록 초기화. 이전 대화는 보존되어 `/resume`으로 접근 가능
- 동일한 프롬프트를 연속으로 제출하면 하나의 기록 항목으로 기록됨
- `Ctrl+R`로 대화형 역순 검색 가능. `Ctrl+S`로 범위 순환 (이 세션 → 이 프로젝트 → 모든 프로젝트)

### 백그라운드 Bash 명령

`Ctrl+B`로 실행 중인 명령을 백그라운드로 전환할 수 있습니다 (tmux에서는 두 번 누름). 출력은 파일에 기록되며 Claude가 Read 도구로 가져올 수 있습니다.

### 쉘 모드 (`!` 접두사)

`!`로 시작하는 입력은 Claude를 거치지 않고 쉘 명령을 직접 실행합니다:
- 명령과 출력이 대화 컨텍스트에 추가됨
- 실시간 진행 상황 및 출력 표시
- `Ctrl+B` 백그라운드 지원
- `Tab`으로 이전 `!` 명령 자동완성
- `Escape`, `Backspace`, `Ctrl+U`로 종료

### 프롬프트 제안

세션을 처음 열면 회색 예시 명령어가 나타나며, Claude 응답 후에도 대화 기록 기반 제안이 계속 표시됩니다.
- `Tab` 또는 `→`로 제안 수락 후 `Enter`로 제출
- 입력 시작하면 제안 사라짐
- 비활성화: `export CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION=false`

### `/btw` 사이드 질문

대화 기록에 추가하지 않고 빠른 질문을 할 수 있습니다. Claude가 작업 중일 때도 사용 가능하며, 도구 접근 없이 현재 컨텍스트만으로 답변합니다.

| 키 | 동작 |
|----|------|
| `Space`, `Enter`, `Escape` | 답변 닫기 |
| `Up` / `Down` | 답변 스크롤 |
| `f` | 새 세션으로 포크 |
| `x` | 이전 `/btw` 교환 목록 지우기 |

### 세션 리캡

터미널로 돌아오면 마지막 완료 턴 이후 3분 이상 경과 시 한 줄 요약이 표시됩니다. `/recap`으로 수동 생성. `/config`에서 비활성화 가능.

### PR 리뷰 상태

열린 pull request가 있는 브랜치에서 작업하면 푸터에 클릭 가능한 PR 링크가 표시됩니다 (예: "PR #446"). 링크의 밑줄 색상으로 리뷰 상태를 나타냅니다:

| 색상 | 의미 |
|------|------|
| 녹색 | 승인됨 |
| 노란색 | 리뷰 대기 중 |
| 빨간색 | 변경 요청됨 |
| 회색 | 초안 |

PR이 병합되거나 닫히면 뱃지가 사라집니다. macOS에서 `Cmd+click`, Windows/Linux에서 `Ctrl+click`으로 브라우저에서 열기. 상태는 60초마다, 그리고 `gh pr` 또는 `git push` 명령 실행 직후에 갱신됩니다.

### 작업 목록 (Task list)

복잡한 다단계 작업 시 Claude가 작업 목록을 생성하여 진행 상황을 추적합니다. 작업은 터미널 상태 영역에 표시됩니다.

- `Ctrl+T`로 작업 목록 보기 토글. 한 번에 최대 5개 작업 표시
- 모든 작업 확인 또는 삭제: Claude에게 직접 "show me all tasks" 또는 "clear all tasks" 요청
- 작업은 컨텍스트 압축 후에도 유지되어 대규모 프로젝트에서 조직 유지에 도움
- 세션 간 작업 목록 공유: `CLAUDE_CODE_TASK_LIST_ID`를 설정하여 `~/.claude/tasks/`의 명명된 디렉토리 사용
  ```
  CLAUDE_CODE_TASK_LIST_ID=my-project claude
  ```

---

## 키바인딩 설정

Claude Code는 키보드 단축키 커스터마이징을 지원합니다. `/keybindings`를 실행하면 `~/.claude/keybindings.json` 파일을 생성하거나 엽니다.

### 구성 파일 형식

```json
{
  "$schema": "https://www.schemastore.org/claude-code-keybindings.json",
  "$docs": "https://code.claude.com/docs/en/keybindings",
  "bindings": [
    {
      "context": "Chat",
      "bindings": {
        "ctrl+e": "chat:externalEditor",
        "ctrl+u": null
      }
    }
  ]
}
```

| 필드 | 설명 |
|------|------|
| `$schema` | 에디터 자동완성용 JSON Schema URL (선택) |
| `$docs` | 문서 URL (선택) |
| `bindings` | 컨텍스트별 바인딩 블록 배열 |

### 컨텍스트

| 컨텍스트 | 설명 |
|----------|------|
| `Global` | 앱 전체에 적용 |
| `Chat` | 메인 채팅 입력 영역 |
| `Autocomplete` | 자동완성 메뉴 |
| `Settings` | 설정 메뉴 |
| `Confirmation` | 권한 및 확인 대화상자 |
| `Tabs` | 탭 내비게이션 |
| `Help` | 도움말 메뉴 |
| `Transcript` | 트랜스크립트 뷰어 |
| `HistorySearch` | 기록 검색 모드 (Ctrl+R) |
| `Task` | 백그라운드 작업 실행 중 |
| `ThemePicker` | 테마 선택 대화상자 |
| `Attachments` | 이미지 첨부 네비게이션 |
| `Footer` | 푸터 인디케이터 (작업, 팀, diff) |
| `MessageSelector` | 되감기/요약 메시지 선택 |
| `DiffDialog` | diff 뷰어 네비게이션 |
| `ModelPicker` | 모델 선택 노력 수준 |
| `Select` | 일반 선택/목록 컴포넌트 |
| `Plugin` | 플러그인 대화상자 |
| `Scroll` | 풀스크린 모드 대화 스크롤 |
| `Doctor` | `/doctor` 진단 화면 |

### 주요 액션

액션은 `namespace:action` 형식입니다.

**App 액션** (Global 컨텍스트):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `app:interrupt` | Ctrl+C | 현재 작업 취소 |
| `app:exit` | Ctrl+D | Claude Code 종료 |
| `app:redraw` | (없음) | 터미널 강제 다시 그리기 |
| `app:toggleTodos` | Ctrl+T | 작업 목록 토글 |
| `app:toggleTranscript` | Ctrl+O | 트랜스크립트 토글 |

**History 액션**:

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `history:search` | Ctrl+R | 기록 검색 열기 |
| `history:previous` | Up | 이전 기록 항목 |
| `history:next` | Down | 다음 기록 항목 |

**Chat 액션** (Chat 컨텍스트):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `chat:submit` | Enter | 메시지 전송 |
| `chat:newline` | Ctrl+J | 줄바꿈 삽입 |
| `chat:cancel` | Escape | 현재 입력 취소 |
| `chat:clearInput` | Ctrl+L | 화면 다시 그리기. 풀스크린에서 2초 내 두 번 누르면 `/clear` 실행 |
| `chat:clearScreen` | Cmd+K | 풀스크린에서 2초 내 두 번 누르면 `/clear` 실행 |
| `chat:killAgents` | Ctrl+X Ctrl+K | 모든 백그라운드 서브에이전트 종료 |
| `chat:cycleMode` | Shift+Tab | 권한 모드 순환 |
| `chat:modelPicker` | Meta+P | 모델 선택기 열기 |
| `chat:fastMode` | Meta+O | 패스트 모드 토글 |
| `chat:thinkingToggle` | Meta+T | 확장 사고 토글 |
| `chat:externalEditor` | Ctrl+G, Ctrl+X Ctrl+E | 외부 에디터에서 열기 |
| `chat:stash` | Ctrl+S | 현재 프롬프트 임시 저장 |
| `chat:imagePaste` | Ctrl+V (Windows/WSL: Alt+V) | 클립보드 이미지 붙여넣기 |
| `chat:undo` | Ctrl+_, Ctrl+Shift+- | 마지막 작업 실행 취소 |

**Autocomplete 액션** (Autocomplete 컨텍스트):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `autocomplete:accept` | Tab | 제안 수락 |
| `autocomplete:dismiss` | Escape | 메뉴 닫기 |
| `autocomplete:previous` | Up | 이전 제안 |
| `autocomplete:next` | Down | 다음 제안 |

**Confirmation 액션** (Confirmation 컨텍스트):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `confirm:yes` | Y, Enter | 작업 확인 |
| `confirm:no` | N, Escape | 작업 거부 |
| `confirm:previous` | Up | 이전 옵션 |
| `confirm:next` | Down | 다음 옵션 |
| `confirm:nextField` | Tab | 다음 필드 |
| `confirm:previousField` | (없음) | 이전 필드 |
| `confirm:toggle` | Space | 선택 토글 |
| `confirm:cycleMode` | Shift+Tab | 권한 모드 순환 |
| `confirm:toggleExplanation` | Ctrl+E | 권한 설명 토글 |

**Permission 액션** (Confirmation 컨텍스트 — 권한 대화상자):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `permission:toggleDebug` | (없음) | 권한 디버그 정보 토글 |

**Transcript 액션** (Transcript 컨텍스트):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `transcript:toggleShowAll` | Ctrl+E | 모든 콘텐츠 표시 토글 |
| `transcript:exit` | q, Ctrl+C, Escape | 트랜스크립트 뷰 종료 |

**History Search 액션** (HistorySearch 컨텍스트):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `historySearch:next` | Ctrl+R | 다음 일치 항목 |
| `historySearch:accept` | Escape, Tab | 선택 수락 |
| `historySearch:cancel` | Ctrl+C | 검색 취소 |
| `historySearch:execute` | Enter | 선택한 명령 즉시 실행 |
| `historySearch:cycleScope` | Ctrl+S | 범위 순환: 세션 → 프로젝트 → 전체 |

**Task 액션** (Task 컨텍스트):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `task:background` | Ctrl+B | 현재 작업 백그라운드 전환 |

**Theme 액션** (ThemePicker 컨텍스트):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `theme:toggleSyntaxHighlighting` | Ctrl+T | 구문 하이라이트 토글 |

**Help 액션** (Help 컨텍스트):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `help:dismiss` | Escape | 도움말 메뉴 닫기 |

**Tabs 액션** (Tabs 컨텍스트):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `tabs:next` | Tab, Right | 다음 탭 |
| `tabs:previous` | Shift+Tab, Left | 이전 탭 |

**Attachments 액션** (Attachments 컨텍스트):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `attachments:next` | Right | 다음 첨부 |
| `attachments:previous` | Left | 이전 첨부 |
| `attachments:remove` | Backspace, Delete | 선택한 첨부 제거 |
| `attachments:exit` | Down, Escape | 첨부 네비게이션 종료 |

**Footer 액션** (Footer 컨텍스트):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `footer:next` | Right | 다음 푸터 항목 |
| `footer:previous` | Left | 이전 푸터 항목 |
| `footer:up` | Up | 위로 이동 (최상단에서 선택 해제) |
| `footer:down` | Down | 아래로 이동 |
| `footer:openSelected` | Enter | 선택한 항목 열기 |
| `footer:clearSelection` | Escape | 푸터 선택 해제 |

**Message Selector 액션** (MessageSelector 컨텍스트):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `messageSelector:up` | Up, K, Ctrl+P | 위로 이동 |
| `messageSelector:down` | Down, J, Ctrl+N | 아래로 이동 |
| `messageSelector:top` | Ctrl+Up, Shift+Up, Meta+Up, Shift+K | 맨 위로 |
| `messageSelector:bottom` | Ctrl+Down, Shift+Down, Meta+Down, Shift+J | 맨 아래로 |
| `messageSelector:select` | Enter | 메시지 선택 |

**Diff 액션** (DiffDialog 컨텍스트):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `diff:dismiss` | Escape | diff 뷰어 닫기 |
| `diff:previousSource` | Left | 이전 diff 소스 |
| `diff:nextSource` | Right | 다음 diff 소스 |
| `diff:previousFile` | Up, K | 이전 파일; 상세 뷰에서 한 줄 위로 스크롤 |
| `diff:nextFile` | Down, J | 다음 파일; 상세 뷰에서 한 줄 아래로 스크롤 |
| `diff:viewDetails` | Enter | diff 세부사항 보기 |
| `diff:back` | (컨텍스트별) | diff 뷰어에서 뒤로 |

**Model Picker 액션** (ModelPicker 컨텍스트):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `modelPicker:decreaseEffort` | Left | 노력 수준 감소 |
| `modelPicker:increaseEffort` | Right | 노력 수준 증가 |
| `modelPicker:thisSessionOnly` | s | 이 세션에만 모델 적용 |

**Select 액션** (Select 컨텍스트):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `select:next` | Down, J, Ctrl+N | 다음 옵션 |
| `select:previous` | Up, K, Ctrl+P | 이전 옵션 |
| `select:accept` | Enter | 선택 수락 |
| `select:cancel` | Escape | 선택 취소 |

**Plugin 액션** (Plugin 컨텍스트):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `plugin:toggle` | Space | 플러그인 선택 토글 |
| `plugin:install` | I | 선택한 플러그인 설치 |
| `plugin:favorite` | F | 선택한 플러그인 즐겨찾기 (Installed 탭 상단 정렬) |

**Settings 액션** (Settings 컨텍스트):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `settings:search` | / | 검색 모드 진입 |
| `settings:retry` | R | 사용량 데이터 다시 로드 (에러 시) |
| `settings:close` | Enter | 변경 사항 저장 후 닫기. Escape는 변경 사항 폐기 후 닫기 |

**Doctor 액션** (Doctor 컨텍스트):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `doctor:fix` | F | 진단 리포트를 Claude에 보내 문제 수정. 문제 발견 시에만 활성 |

**Voice 액션** (Chat 컨텍스트 — 음성 받아쓰기 활성화 시):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `voice:pushToTalk` | Space | 프롬프트 받아쓰기. `/voice` 모드에 따라 길게 누르거나 탭 |

**Scroll 액션** (Scroll 컨텍스트 — 풀스크린 렌더링 활성화 시):

| 액션 | 기본값 | 설명 |
|------|--------|------|
| `scroll:lineUp` | (없음) | 한 줄 위로 스크롤. 마우스 휠이 이 액션 트리거 |
| `scroll:lineDown` | (없음) | 한 줄 아래로 스크롤. 마우스 휠이 이 액션 트리거 |
| `scroll:pageUp` | PageUp | 뷰포트 높이의 절반 위로 스크롤 |
| `scroll:pageDown` | PageDown | 뷰포트 높이의 절반 아래로 스크롤 |
| `scroll:top` | Ctrl+Home | 대화 시작으로 이동 |
| `scroll:bottom` | Ctrl+End | 최신 메시지로 이동 후 자동 추적 재활성화 |
| `scroll:halfPageUp` | (없음) | 뷰포트 절반 위로 (vi 스타일 리바인드용) |
| `scroll:halfPageDown` | (없음) | 뷰포트 절반 아래로 (vi 스타일 리바인드용) |
| `scroll:fullPageUp` | (없음) | 뷰포트 전체 위로 스크롤 |
| `scroll:fullPageDown` | (없음) | 뷰포트 전체 아래로 스크롤 |
| `selection:copy` | Ctrl+Shift+C / Cmd+C | 선택한 텍스트를 클립보드에 복사 |
| `selection:clear` | (없음) | 활성 텍스트 선택 해제 |
| `selection:extendLeft` | Shift+Left | 선택을 왼쪽으로 한 칸 확장 |
| `selection:extendRight` | Shift+Right | 선택을 오른쪽으로 한 칸 확장 |
| `selection:extendUp` | Shift+Up | 선택을 위로 한 줄 확장. 상단 도달 시 뷰포트 스크롤 |
| `selection:extendDown` | Shift+Down | 선택을 아래로 한 줄 확장. 하단 도달 시 뷰포트 스크롤 |
| `selection:extendLineStart` | Shift+Home | 선택을 줄 시작까지 확장 |
| `selection:extendLineEnd` | Shift+End | 선택을 줄 끝까지 확장 |

### 키스트로크 문법

**수정자 키** (`+` 구분자 사용):
- `ctrl` 또는 `control` — Control 키
- `shift` — Shift 키
- `alt`, `opt`, `option`, `meta` — macOS: Option, Windows/Linux: Alt
- `cmd`, `command`, `super`, `win` — macOS: Command, Windows: Windows, Linux: Super

**코드(Chord)** (공백으로 분리):
```
ctrl+k ctrl+s   Ctrl+K 누르고 뗀 후 Ctrl+S
```

**특수 키**: `escape`/`esc`, `enter`/`return`, `tab`, `space`, `up`/`down`/`left`/`right`, `backspace`, `delete`

### 바인딩 해제

`null`로 설정하여 기본 단축키를 해제합니다:
```json
{"ctrl+s": null}
```

코드 접두사의 모든 바인딩을 해제하면 해당 접두사를 단일 키로 사용할 수 있습니다:
```json
{
  "ctrl+x ctrl+k": null,
  "ctrl+x ctrl+e": null,
  "ctrl+x": "chat:newline"
}
```

### 예약된 단축키

| 단축키 | 이유 |
|--------|------|
| Ctrl+C | 하드코딩된 인터럽트/취소 |
| Ctrl+D | 하드코딩된 종료 |
| Ctrl+M | 터미널에서 Enter와 동일 (둘 다 CR 전송) |
| Caps Lock | 터미널 애플리케이션에 전달되지 않음 |

### 터미널 충돌

| 단축키 | 충돌 |
|--------|------|
| Ctrl+B | tmux 접두사 (두 번 눌러 전송) |
| Ctrl+A | GNU screen 접두사 |
| Ctrl+Z | Unix 프로세스 일시중지 (SIGTSTP) |

### 검증

Claude Code는 키바인딩을 검증하고 다음에 대한 경고를 표시합니다:
- 파싱 에러 (잘못된 JSON 또는 구조)
- 잘못된 컨텍스트 이름
- 예약된 단축키 충돌
- 터미널 멀티플렉서 충돌
- 동일 컨텍스트 내 중복 바인딩

`/doctor`를 실행하여 키바인딩 경고를 확인할 수 있습니다.

---

## Vim 모드

`/config` → Editor mode에서 vim 스타일 편집을 활성화합니다.

> 참고: `/vim` 명령어는 v2.1.92에서 제거되었습니다.

### 모드 전환

| 명령 | 동작 | 현재 모드 |
|------|------|-----------|
| `Esc` | NORMAL 모드 진입 | INSERT, VISUAL |
| `i` | 커서 앞에 삽입 | NORMAL |
| `I` | 줄 시작에 삽입 | NORMAL |
| `a` | 커서 뒤에 삽입 | NORMAL |
| `A` | 줄 끝에 삽입 | NORMAL |
| `o` | 아래에 새 줄 열기 | NORMAL |
| `O` | 위에 새 줄 열기 | NORMAL |
| `v` | 문자 단위 시각 선택 시작 | NORMAL |
| `V` | 줄 단위 시각 선택 시작 | NORMAL |

### 탐색 (NORMAL 모드)

| 명령 | 동작 |
|------|------|
| `h`/`j`/`k`/`l` | 좌/하/상/우 이동 |
| `Space` | 우로 이동 |
| `w` | 다음 단어 |
| `e` | 단어 끝 |
| `b` | 이전 단어 |
| `0` | 줄 시작 |
| `$` | 줄 끝 |
| `^` | 첫 번째 비공백 문자 |
| `gg` | 입력 시작 |
| `G` | 입력 끝 |
| `f{문자}` | 다음 문자 위치로 이동 |
| `F{문자}` | 이전 문자 위치로 이동 |
| `t{문자}` | 다음 문자 바로 앞으로 이동 |
| `T{문자}` | 이전 문자 바로 뒤로 이동 |
| `;` | 마지막 f/F/t/T 모션 반복 |
| `,` | 마지막 f/F/t/T 모션 역방향 반복 |
| `/` | 역순 기록 검색 열기 (Ctrl+R과 동일) |

### 편집 (NORMAL 모드)

| 명령 | 동작 |
|------|------|
| `x` | 문자 삭제 |
| `dd` | 줄 삭제 |
| `D` | 줄 끝까지 삭제 |
| `dw`/`de`/`db` | 단어/끝까지/뒤로 삭제 |
| `cc` | 줄 변경 |
| `C` | 줄 끝까지 변경 |
| `cw`/`ce`/`cb` | 단어/끝까지/뒤로 변경 |
| `yy`/`Y` | 줄 복사 (yank) |
| `yw`/`ye`/`yb` | 단어/끝까지/뒤로 복사 |
| `p` | 커서 뒤에 붙여넣기 |
| `P` | 커서 앞에 붙여넣기 |
| `>>` | 줄 들여쓰기 |
| `<<` | 줄 내어쓰기 |
| `J` | 줄 결합 |
| `u` | 실행 취소 |
| `.` | 마지막 변경 반복 |

### 텍스트 오브젝트 (NORMAL 모드)

`d`, `c`, `y` 등의 연산자와 함께 사용:

| 명령 | 동작 |
|------|------|
| `iw`/`aw` | 단어 내부/단어 주변 |
| `iW`/`aW` | WORD 내부/주변 (공백 구분) |
| `i"`/`a"` | 큰따옴표 내부/주변 |
| `i'`/`a'` | 작은따옴표 내부/주변 |
| `i(`/`a(` | 괄호 내부/주변 |
| `i[`/`a[` | 대괄호 내부/주변 |
| `i{`/`a{` | 중괄호 내부/주변 |

### Visual 모드

`v`로 문자 단위 선택, `V`로 줄 단위 선택. `Ctrl+V` 블록 단위 visual 모드는 지원되지 않습니다.

| 명령 | 동작 |
|------|------|
| `d`/`x` | 선택 삭제 |
| `y` | 선택 복사 |
| `c`/`s` | 선택 변경 |
| `p` | 레지스터 내용으로 선택 교체 |
| `r{문자}` | 모든 선택 문자를 지정 문자로 교체 |
| `~`/`u`/`U` | 대소문자 토글/소문자/대문자 |
| `>`/`<` | 선택 줄 들여쓰기/내어쓰기 |
| `J` | 선택 줄 결합 |
| `o` | 커서와 앵커 교환 |
| `iw`/`aw`/`i"`/... | 텍스트 오브젝트 선택 |
| `v`/`V` | 문자/줄 단위 전환 또는 종료 |

### Vim 모드 상호작용

vim 모드와 키바인딩은 독립적으로 동작합니다:

- **Vim 모드**: 텍스트 입력 수준에서 처리 (커서 이동, 모드, 모션)
- **키바인딩**: 컴포넌트 수준에서 처리 (작업 목록 토글, 제출 등)
- vim 모드의 `Esc`는 INSERT → NORMAL 전환만 수행하며, `chat:cancel`을 트리거하지 않음
- 대부분의 `Ctrl+key` 단축키는 vim 모드를 통과하여 키바인딩 시스템으로 전달됨
- vim NORMAL 모드에서 `?`는 도움말 메뉴 표시 (vim 동작)
- vim NORMAL 모드에서 `/`는 기록 검색 열기 (표준 모드의 `Ctrl+R`과 동일)

---

## Fullscreen 렌더링

Fullscreen 렌더링은 깜빡임을 제거하고 긴 대화에서 메모리 사용량을 일정하게 유지하며 마우스를 지원하는 대체 렌더링 경로입니다. `vim`이나 `htop`처럼 터미널의 대체 화면 버퍼에 인터페이스를 그리며, 현재 보이는 메시지만 렌더링합니다.

### 활성화

```
# 세션 내에서
/tui fullscreen

# 환경변수로
CLAUDE_CODE_NO_FLICKER=1 claude
```

`/tui` 명령은 `tui` 설정을 저장하고 대화를 유지한 채 fullscreen으로 재시작합니다. `/tui default`로 비활성화. `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1`로 강제로 클래식 렌더러 사용 가능.

### 주요 변화

| 이전 | 이후 | 설명 |
|------|------|------|
| `Cmd+f` 또는 tmux 검색 | `Ctrl+O` 후 `/`로 검색 또는 `[`로 스크롤백에 기록 | 대화 검색 및 리뷰 |
| 터미널 네이티브 클릭/드래그 | 앱 내 선택, 마우스 놓으면 자동 복사 | 마우스 사용 |
| `Cmd`-클릭으로 URL 열기 | URL 클릭 | 마우스 사용 |

### 마우스 지원

- 프롬프트 입력 영역 클릭으로 커서 위치 지정
- `/` 명령 또는 `@` 파일 목록에서 제안 클릭으로 수락
- 축소된 도구 결과 클릭으로 확장/축소 토글
- URL 또는 파일 경로 클릭으로 열기
- 클릭 및 드래그로 텍스트 선택. 더블클릭: 단어 선택, 트리플클릭: 줄 선택
- 마우스 휠로 대화 스크롤

선택한 텍스트는 마우스 놓을 때 자동으로 클립보드에 복사. `/config`에서 Copy on select 토글로 비활성화 가능. 비활성화 시 `Ctrl+Shift+C`로 수동 복사.

### 스크롤 단축키

| 단축키 | 동작 |
|--------|------|
| `PgUp` / `PgDn` | 화면 절반씩 위/아래 스크롤 |
| `Ctrl+Home` | 대화 시작으로 이동 |
| `Ctrl+End` | 최신 메시지로 이동 후 자동 추적 재활성화 |
| 마우스 휠 | 몇 줄씩 스크롤 |

스크롤 속도 조정: `CLAUDE_CODE_SCROLL_SPEED=3` (1~20, vim 기본값 3). `/scroll-speed`로 대화형 조정.

### 마우스 캡처 비활성화

마우스 캡처가 방해가 되면 비활력화하면서 깜빡임 없는 렌더링 유지:

```
CLAUDE_CODE_NO_FLICKER=1 CLAUDE_CODE_DISABLE_MOUSE=1 claude
```

마우스 캡처 비활성화 시 `PgUp`/`PgDn`/`Ctrl+Home`/`Ctrl+End` 키보드 스크롤은 여전히 동작.

### 트랜스크립트 모드 탐색

`Ctrl+O`로 트랜스크립트 모드 전환. `less` 스타일 탐색 및 검색:

| 키 | 동작 |
|----|------|
| `/` | 검색 열기 |
| `n` / `N` | 다음/이전 일치 항목 |
| `j`/`k` 또는 ↑/↓ | 한 줄 스크롤 |
| `g`/`G` 또는 Home/End | 맨 위/아래로 |
| `Ctrl+u` / `Ctrl+d` | 반 페이지 스크롤 |
| `Ctrl+b` / `Ctrl+f` 또는 Space/b | 전체 페이지 스크롤 |
| `[` | 전체 대화를 터미널 네이티브 스크롤백에 기록 |
| `v` | 대화를 임시 파일로 저장하고 `$VISUAL`/`$EDITOR`로 열기 |

---

## 내장 도구

Claude Code가 코드베이스를 이해하고 수정하는 데 사용하는 빌트인 도구입니다. 도구 이름은 권한 규칙, 서브에이전트 도구 목록, 훅 매처에서 직접 사용하는 문자열입니다.

| 도구 | 설명 | 권한 필요 |
|------|------|-----------|
| `Agent` | 별도의 컨텍스트 창에서 서브에이전트를 생성하여 작업 처리 | 아니요 |
| `AskUserQuestion` | 다중 선택 질문으로 요구사항 수집 또는 모호성 해결 | 아니요 |
| `Bash` | 환경에서 쉘 명령 실행 | 예 |
| `CronCreate` | 현재 세션 내에서 반복 또는 일회성 프롬프트 예약 | 아니요 |
| `CronDelete` | 예약된 작업을 ID로 취소 | 아니요 |
| `CronList` | 세션의 모든 예약된 작업 나열 | 아니요 |
| `Edit` | 특정 파일에 대한 타겟 편집 | 예 |
| `EnterPlanMode` | 코딩 전 접근 방식 설계를 위한 계획 모드 전환 | 아니요 |
| `EnterWorktree` | 격리된 git worktree를 생성하고 전환 | 아니요 |
| `ExitPlanMode` | 계획을 승인받고 계획 모드 종료 | 예 |
| `ExitWorktree` | 워크트리 세션을 종료하고 원래 디렉토리로 복귀 | 아니요 |
| `Glob` | 패턴 매칭으로 파일 찾기 | 아니요 |
| `Grep` | 파일 내용에서 패턴 검색 | 아니요 |
| `ListMcpResourcesTool` | 연결된 MCP 서버의 리소스 나열 | 아니요 |
| `LSP` | 언어 서버를 통한 코드 인텔리전스 | 아니요 |
| `Monitor` | 백그라운드에서 명령을 실행하고 출력 라인을 Claude에 피드백 | 예 |
| `NotebookEdit` | Jupyter 노트북 셀 수정 | 예 |
| `PowerShell` | PowerShell 명령 네이티브 실행 | 예 |
| `PushNotification` | 데스크톱 알림 전송 (Remote Control 연결 시 푸시도 가능) | 아니요 |
| `Read` | 파일 내용 읽기 | 아니요 |
| `ReadMcpResourceTool` | URI로 특정 MCP 리소스 읽기 | 아니요 |
| `RemoteTrigger` | claude.ai에서 루틴 생성, 업데이트, 실행, 나열 | 아니요 |
| `ScheduleWakeup` | 자율 속도 `/loop`의 다음 반복 일정 조정 | 아니요 |
| `SendMessage` | 에이전트 팀 팀원에게 메시지 전송 또는 서브에이전트 재개 | 아니요 |
| `ShareOnboardingGuide` | `ONBOARDING.md` 업로드 및 공유 링크 반환 | 예 |
| `Skill` | 메인 대화에서 스킬 실행 | 예 |
| `TaskCreate` | 작업 목록에 새 작업 생성 | 아니요 |
| `TaskGet` | 특정 작업의 전체 세부 정보 조회 | 아니요 |
| `TaskList` | 모든 작업과 현재 상태 나열 | 아니요 |
| `TaskOutput` | (폐기됨) 백그라운드 작업의 출력 조회 | 아니요 |
| `TaskStop` | 실행 중인 백그라운드 작업을 ID로 종료 | 아니요 |
| `TaskUpdate` | 작업 상태, 종속성, 세부 정보 업데이트 또는 삭제 | 아니요 |
| `TeamCreate` | 여러 팀원으로 에이전트 팀 생성 | 아니요 |
| `TeamDelete` | 에이전트 팀 해체 및 팀원 프로세스 정리 | 아니요 |
| `TodoWrite` | 세션 작업 체크리스트 관리. v2.1.142부터 `TaskCreate` 등으로 대체 | 아니요 |
| `ToolSearch` | 도구 검색 활성화 시 지연 로드된 도구 검색 및 로드 | 아니요 |
| `WaitForMcpServers` | 백그라운드에서 연결 중인 MCP 서버 대기 | 아니요 |
| `WebFetch` | 지정된 URL에서 콘텐츠 가져오기 | 예 |
| `WebSearch` | 웹 검색 실행 | 예 |
| `Workflow` | 다수의 서브에이전트를 오케스트레이션하는 동적 워크플로우 실행 | 예 |
| `Write` | 파일 생성 또는 덮어쓰기 | 예 |

### PowerShell 도구 (Windows)

Windows에서 PowerShell 명령을 네이티브로 실행합니다. Git Bash 없이 Windows에서는 자동 활성화, Git Bash 설치 환경에서는 점진적 배포 중. Linux, macOS, WSL에서는 옵트인.

**활성화**: `CLAUDE_CODE_USE_POWERSHELL_TOOL=1` 환경변수 또는 `settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_USE_POWERSHELL_TOOL": "1"
  }
}
```

- Windows에서 `0`으로 설정하면 배포에서 옵아웃. Linux/macOS/WSL에서는 PowerShell 7+ 필요 (`pwsh`)
- Windows에서 `pwsh.exe`(PowerShell 7+) 자동 감지, 없으면 `powershell.exe`(5.1) 폴백
- PowerShell 활성화 시 기본 쉘로 처리. Git Bash 설치 시 Bash 도구도 POSIX 스크립트용으로 사용 가능
- `-ExecutionPolicy Bypass`로 프로세스 범위에서 실행. 그룹 정책 `MachinePolicy`/`UserPolicy`는 오버라이드하지 않음
- 존중하려면 `CLAUDE_CODE_POWERSHELL_RESPECT_EXECUTION_POLICY=1` 설정

**셸 선택 설정**:

| 설정 | 설명 |
|------|------|
| `"defaultShell": "powershell"` | 대화형 `!` 명령을 PowerShell로 라우팅 |
| `"shell": "powershell"` (훅) | 해당 훅을 PowerShell에서 실행 |
| `shell: powershell` (스킬 프론트매터) | `` !`command` `` 블록을 PowerShell에서 실행 |

**프리뷰 제한사항**: PowerShell 프로필이 로드되지 않음. Windows에서 샌드박싱 미지원.

### Monitor 도구

Monitor 도구는 Claude가 백그라운드에서 무언가를 감시하고 변화 시 대화를 일시정지하지 않고 반응할 수 있게 합니다.

**사용 사례**:
- 로그 파일 테일링 및 에러 발생 시 플래그
- PR 또는 CI 작업 상태 폴링 및 변화 시 리포트
- 디렉토리 파일 변경 감시
- 장기 실행 스크립트 출력 추적

Claude가 감시용 작은 스크립트를 작성하여 백그라운드에서 실행하고, 각 출력 라인이 도착하는 대로 수신합니다. 같은 세션에서 계속 작업 가능하며 이벤트 발생 시 Claude가 끼어듭니다.

- Monitor는 Bash와 동일한 권한 규칙 사용
- Amazon Bedrock, Google Vertex AI, Microsoft Foundry에서는 사용 불가
- `DISABLE_TELEMETRY` 또는 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` 설정 시 비활성화
- 플러그인이 활성 상태일 때 자동으로 시작되는 모니터 선언 가능 (플러그인 모니터 참조)

### 권한 규칙 형식

| 규칙 형식 | 적용 도구 | 세부 사항 |
|-----------|-----------|-----------|
| `Bash(npm run *)` | Bash, Monitor | 명령 패턴 매칭 |
| `PowerShell(Get-ChildItem *)` | PowerShell | 명령 패턴 매칭 |
| `Read(~/secrets/**)` | Read, Grep, Glob, LSP | 경로 패턴 매칭 |
| `Edit(/src/**)` | Edit, Write, NotebookEdit | 경로 패턴 매칭 |
| `Skill(deploy *)` | Skill | 스킬 이름 매칭 |
| `Agent(Explore)` | Agent | 서브에이전트 타입 매칭 |
| `WebFetch(domain:example.com)` | WebFetch | 도메인 매칭 |
| `WebSearch` | WebSearch | 지정자 없음; 도구 전체 허용 또는 거부 |

> 권한 규칙은 `/permissions` 또는 [권한 설정](03-settings.md)에서 구성할 수 있습니다.

---

## 관련 문서

- [Chrome 확장](https://code.claude.com/docs/en/chrome) — 브라우저 자동화 및 웹 테스트
- [대화형 모드](https://code.claude.com/docs/en/interactive-mode) — 단축키, 입력 모드, 대화형 기능
- [Fullscreen 렌더링](https://code.claude.com/docs/en/fullscreen) — 깜빡임 없는 렌더링, 마우스 지원
- [빠른 시작](https://code.claude.com/docs/en/quickstart) — Claude Code 시작하기
- [일반 워크플로우](https://code.claude.com/docs/en/common-workflows) — 고급 워크플로우 및 패턴
- [설정](https://code.claude.com/docs/en/settings) — 구성 옵션
- [Agent SDK](https://code.claude.com/docs/en/sdk) — 프로그래밍 방식 사용 및 통합
