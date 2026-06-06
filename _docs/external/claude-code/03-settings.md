# Claude Code 설정

> 설정 파일 계층, 사용 가능한 설정, 권한, 샌드박스, 워크트리, 어트리뷰션, 환경 변수, 글로벌 구성

**원문**: [Claude Code settings](https://code.claude.com/docs/en/settings) | [Environment variables](https://code.claude.com/docs/en/env-vars) | [Permissions](https://code.claude.com/docs/en/permissions) | [Permission modes](https://code.claude.com/docs/en/permission-modes) | [Auto mode config](https://code.claude.com/docs/en/auto-mode-config) | [Terminal config](https://code.claude.com/docs/en/terminal-config) | [Network config](https://code.claude.com/docs/en/network-config)

---

## 설정 스코프

Claude Code는 __스코프 시스템__을 사용하여 구성이 적용되는 범위와 공유 대상을 결정합니다.

| 스코프 | 위치 | 영향 범위 | 팀 공유 여부 |
|--------|------|-----------|-------------|
| **Managed** | 서버 관리 설정, plist / 레지스트리, 또는 시스템 수준 `managed-settings.json` | 머신의 모든 사용자 | 예 (IT가 배포) |
| **User** | `~/.claude/` 디렉토리 | 모든 프로젝트에서 본인만 | 아니요 |
| **Project** | 저장소 내 `.claude/` | 이 저장소의 모든 협업자 | 예 (git에 커밋) |
| **Local** | `.claude/settings.local.json` | 이 저장소에서 본인만 | 아니요 (gitignore) |

### 설정 파일 위치

`settings.json`은 계층적 설정을 통한 공식 구성 메커니즘입니다. 설정 파일 상단에 `$schema` 줄을 추가하면 VS Code, Cursor 등에서 자동완성 및 인라인 검증이 활성화됩니다. 발행된 스키마는 주기적으로 업데이트되며, 최신 CLI 릴리스에 추가된 필드를 아직 포함하지 않을 수 있습니다.

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": { ... }
}
```

| 설정 파일 | 위치 | 설명 |
|-----------|------|------|
| **사용자 설정** | `~/.claude/settings.json` | 모든 프로젝트에 적용되는 개인 설정 |
| **공유 프로젝트 설정** | `.claude/settings.json` | 소스 컨트롤에 체크인되어 팀과 공유되는 설정 |
| **로컬 프로젝트 설정** | `.claude/settings.local.json` | 체크인되지 않는 개인 프로젝트 설정 (git이 자동으로 ignore 처리) |
| **Managed 설정** | 플랫폼별 경로 (아래 참조) | IT/DevOps가 배포, 재정의 불가 |

### Managed 설정 파일 경로

Managed 설정은 여러 전달 메커니즘을 지원합니다.

| 전달 방식 | 설명 |
|-----------|------|
| **서버 관리 설정** | Anthropic 서버에서 Claude.ai 관리 콘솔을 통해 전달 |
| **MDM/OS 수준 정책** | macOS: `com.anthropic.claudecode` 관리 환경설정 도메인. Windows: `HKLM\SOFTWARE\Policies\ClaudeCode` 레지스트리의 `Settings` 값(REG_SZ)에 JSON 포함 |
| **파일 기반** | 시스템 디렉토리의 `managed-settings.json` 및 `managed-mcp.json` (아래 경로 표 참조) |

| 플랫폼 | 경로 |
|--------|------|
| macOS | `/Library/Application Support/ClaudeCode/managed-settings.json` |
| Linux / WSL | `/etc/claude-code/managed-settings.json` |
| Windows | `C:\Program Files\ClaudeCode\managed-settings.json` |

파일 기반 Managed 설정은 동일 시스템 디렉토리의 `managed-settings.d/` 드롭인 디렉토리도 지원합니다. `managed-settings.json`이 먼저 병합된 후 `*.json` 파일이 알파벳순으로 병합됩니다. 숫자 접두사로 병합 순서를 제어할 수 있습니다(예: `10-telemetry.json`, `20-security.json`).

---

## 설정 우선순위

높은 순서에서 낮은 순서로:

| 우선순위 | 설정 소스 | 설명 |
|----------|-----------|------|
| 1 (최고) | **Managed 설정** | 서버 관리, MDM/OS 수준 정책, 또는 managed-settings 파일. 다른 어떤 수준으로도 재정의 불가 |
| 2 | **CLI 인수** | 특정 세션에 대한 임시 재정의. `--settings <file-or-json>`으로 전달 |
| 3 | **로컬 프로젝트 설정** | `.claude/settings.local.json` - 개인 프로젝트별 설정 |
| 4 | **공유 프로젝트 설정** | `.claude/settings.json` - 소스 컨트롤의 팀 공유 설정 |
| 5 (최저) | **사용자 설정** | `~/.claude/settings.json` - 개인 글로벌 설정 |

> Managed 설정 내에서의 우선순위: 서버 관리 > MDM/OS 수준 정책 > 파일 기반(`managed-settings.d/*.json` + `managed-settings.json`) > HKCU 레지스트리(Windows만).

### 구성 시스템 핵심 포인트

- **메모리 파일 (CLAUDE.md)**: Claude가 시작 시 로드하는 지침과 컨텍스트
- **설정 파일 (JSON)**: 권한, 환경 변수, 도구 동작 구성
- **스킬(Skills)**: `/skill-name`으로 실행하거나 Claude가 자동 로드하는 커스텀 프롬프트
- **MCP 서버**: Claude Code를 추가 도구 및 통합으로 확장
- **우선순위**: 더 높은 수준의 구성(Managed)이 더 낮은 수준(User/Project)을 재정의
- **상속**: 설정이 스코프 간에 병합되며, 스칼라 값은 더 높은 우선순위 스코프에서 재정의, 배열은 연결

### 편집 적용 시점

Claude Code는 설정 파일을 감시하고 변경 시 자동으로 다시 로드합니다. 대부분의 키(`permissions`, `hooks`, `apiKeyHelper` 등)는 재시작 없이도 실행 중인 세션에 적용됩니다. `ConfigChange` hook이 각 변경을 감지합니다.

단, 세션 시작 시 한 번 읽고 다음 재시작에 적용되는 키도 있습니다:

- `model`: 세션 중 전환하려면 `/model` 사용
- `outputStyle`: 시스템 프롬프트의 일부로 `/clear` 또는 재시작 시 재구성

---

## 사용 가능한 설정 전체

`settings.json`에서 지원하는 설정 목록입니다.

| 키 | 설명 | 예시 |
|----|------|------|
| `$schema` | JSON 스키마 참조. 추가 시 VS Code, Cursor 등에서 자동완성 및 인라인 검증 활성화. 스키마는 주기적으로 업데이트되며 최신 CLI 릴리스의 필드를 포함하지 않을 수 있음 | `"https://json.schemastore.org/claude-code-settings.json"` |
| `agent` | 메인 스레드를 명명된 서브에이전트로 실행. `claude agents`에서 디스패치되는 세션의 기본 에이전트도 설정 | `"code-reviewer"` |
| `alwaysThinkingEnabled` | 모든 세션에 대해 확장 thinking을 기본 활성화. 일반적으로 `/config` 명령으로 구성. thinking을 강제로 끄려면 `env`에 `CLAUDE_CODE_DISABLE_THINKING` 설정 | `true` |
| `apiKeyHelper` | `/bin/sh`에서 실행할 커스텀 스크립트. 생성된 인증 값이 `X-Api-Key` 및 `Authorization: Bearer` 헤더로 전송됨 | `/bin/generate_temp_api_key.sh` |
| `attribution` | git 커밋 및 PR의 어트리뷰션 커스터마이즈. 아래 어트리뷰션 설정 참조 | `{"commit": "...", "pr": ""}` |
| `autoMemoryEnabled` | 자동 메모리 활성화. `false` 시 자동 메모리 디렉토리 읽기/쓰기 안 함 (기본값: `true`) | `false` |
| `autoMemoryDirectory` | 자동 메모리 저장소의 커스텀 디렉토리. 절대 경로 또는 `~/` 접두사 허용 | `"~/my-memory-dir"` |
| `autoScrollEnabled` | 전체화면 렌더링에서 새 출력을 따라 자동 스크롤 (기본값: `true`) | `false` |
| `autoUpdatesChannel` | 업데이트 채널. `"stable"`은 약 1주일 뒤 버전, `"latest"` (기본값)는 최신 릴리스 | `"stable"` |
| `autoMode` | auto 모드 분류기가 차단/허용하는 항목 커스터마이즈. `environment`, `allow`, `soft_deny`, `hard_deny` 배열 포함. **공유 프로젝트 설정에서는 읽지 않음** | `{"soft_deny": ["$defaults", "Never run terraform apply"]}` |
| `availableModels` | `/model`, `--model`, `ANTHROPIC_MODEL`로 선택 가능한 모델 제한. Default 옵션에는 영향 없음 | `["sonnet", "haiku"]` |
| `awaySummaryEnabled` | 몇 분 자리 비운 후 세션 요약 표시 (기본값: `true`) | `false` |
| `cleanupPeriodDays` | 마지막 활동 날짜 기준으로 세션 파일을 로컬에 보관할 기간 (기본값: 30일, 최소 1) | `20` |
| `companyAnnouncements` | 시작 시 사용자에게 표시할 공지. 여러 개 제공 시 무작위 순환 | `["Welcome to Acme Corp!"]` |
| `defaultShell` | 입력 상자 `!` 명령의 기본 셸. `"bash"` (기본값) 또는 `"powershell"` | `"powershell"` |
| `deniedMcpServers` | managed-settings.json에 설정 시 명시적으로 차단되는 MCP 서버 거부 목록. 모든 스코프에 적용. 거부 목록이 허용 목록보다 우선 | `[{"serverName": "filesystem"}]` |
| `disableAgentView` | `true`로 설정 시 백그라운드 에이전트 및 에이전트 뷰 비활성화 | `true` |
| `disableAllHooks` | 모든 hooks 및 커스텀 상태 라인 비활성화 | `true` |
| `disableAutoMode` | `"disable"`으로 설정 시 auto 모드 활성화 방지. Shift+Tab 순환에서 제거 | `"disable"` |
| `disableDeepLinkRegistration` | `"disable"`으로 설정 시 `claude-cli://` 프로토콜 핸들러 등록 방지 | `"disable"` |
| `disableRemoteControl` | Remote Control 비활성화 (v2.1.128+) | `true` |
| `disableSkillShellExecution` | 스킬 및 커스텀 명령의 인라인 셸 실행 비활성화 | `true` |
| `disableWorkflows` | 동적 워크플로우 및 번들된 워크플로우 명령 비활성화 | `true` |
| `editorMode` | 입력 프롬프트 키 바인딩 모드: `"normal"` 또는 `"vim"` (기본값: `"normal"`) | `"vim"` |
| `effortLevel` | 세션 간 effort level 유지. `"low"`, `"medium"`, `"high"`, `"xhigh"` | `"xhigh"` |
| `enableAllProjectMcpServers` | 프로젝트 `.mcp.json` 파일에 정의된 모든 MCP 서버를 자동 승인 | `true` |
| `enabledMcpjsonServers` | `.mcp.json` 파일에서 승인할 특정 MCP 서버 목록 | `["memory", "github"]` |
| `disabledMcpjsonServers` | `.mcp.json` 파일에서 거부할 특정 MCP 서버 목록 | `["filesystem"]` |
| `env` | 모든 세션 및 하위 프로세스에 적용할 환경 변수 | `{"FOO": "bar"}` |
| `fastModePerSessionOptIn` | `true` 시 fast mode가 세션 간 유지되지 않음. 매 세션마다 `/fast`로 활성화 필요 | `true` |
| `feedbackSurveyRate` | 세션 품질 설문 표시 확률 (0-1). `0`으로 완전 억제 | `0.05` |
| `fileSuggestion` | `@` 파일 자동완성을 위한 커스텀 명령 구성. 아래 파일 제안 설정 참조 | `{"type": "command", "command": "~/.claude/file-suggestion.sh"}` |
| `forceLoginMethod` | `claudeai`로 Claude.ai 계정만, `console`로 Console 계정만 로그인 제한 | `claudeai` |
| `forceLoginOrgUUID` | 특정 Anthropic 조직에 속한 계정으로만 로그인 제한. UUID 문자열 또는 UUID 배열 | `"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"` |
| `gcpAuthRefresh` | GCP Application Default Credentials 갱신 스크립트 | `gcloud auth application-default login` |
| `awsAuthRefresh` | `.aws` 디렉토리를 수정하는 커스텀 스크립트 | `aws sso login --profile myprofile` |
| `awsCredentialExport` | AWS 자격 증명이 포함된 JSON을 출력하는 커스텀 스크립트 | `/bin/generate_aws_grant.sh` |
| `hooks` | 도구 실행 전후에 실행할 커스텀 명령 구성 | hooks 문서 참조 |
| `httpHookAllowedEnvVars` | HTTP hook이 헤더에 보간할 수 있는 환경 변수 이름 허용목록 | `["MY_TOKEN", "HOOK_SECRET"]` |
| `allowedHttpHookUrls` | HTTP hook이 대상으로 할 수 있는 URL 패턴 허용목록. `*` 와일드카드 지원 | `["https://hooks.example.com/*"]` |
| `includeCoAuthoredBy` | **[DEPRECATED]** `attribution` 사용 권장. git 커밋/PR에 co-authored-by 바이라인 포함 여부 (기본값: `true`) | `false` |
| `includeGitInstructions` | 시스템 프롬프트에 빌트인 커밋/PR 워크플로우 지침 및 git 상태 스냅샷 포함 (기본값: `true`) | `false` |
| `language` | Claude의 응답 언어 설정 (예: `"korean"`, `"japanese"`, `"spanish"`) | `"japanese"` |
| `maxSkillDescriptionChars` | 스킬 설명 텍스트의 문자 단위 캡 (기본값: 1536) | `2048` |
| `minimumVersion` | 백그라운드 자동 업데이트 및 `claude update`가 이 버전 미만으로 설치하지 못하게 하는 하한선 | `"2.1.100"` |
| `model` | Claude Code에서 사용할 기본 모델 재정의. `--model` 및 `ANTHROPIC_MODEL`이 세션별로 재정의 | `"claude-sonnet-4-6"` |
| `modelOverrides` | Anthropic 모델 ID를 프로바이더별 모델 ID(예: Bedrock 추론 프로필 ARN)에 매핑 | `{"claude-opus-4-6": "arn:aws:bedrock:..."}` |
| `outputStyle` | 시스템 프롬프트를 조정할 출력 스타일 구성 | `"Explanatory"` |
| `otelHeadersHelper` | 동적 OpenTelemetry 헤더를 생성하는 스크립트. 시작 시 및 주기적으로 실행. 새로고침 간격은 `CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS`로 설정 | `/bin/generate_otel_headers.sh` |
| `permissions` | 권한 구성 (아래 권한 설정 참조) | |
| `plansDirectory` | 플랜 파일 저장 위치. 프로젝트 루트에 상대 경로. 기본값: `~/.claude/plans` | `"./plans"` |
| `preferredNotifChannel` | 작업 완료 및 권한 프롬프트 알림 방식 (기본값: `"auto"`) | `"terminal_bell"` |
| `prefersReducedMotion` | 접근성을 위해 UI 애니메이션(스피너, 시머, 플래시 효과) 축소 또는 비활성화 | `true` |
| `prUrlTemplate` | 푸터 및 도구 결과 요약에 표시되는 PR 배지의 URL 템플릿. `{host}`, `{owner}`, `{repo}`, `{number}`, `{url}` 치환 | `"https://reviews.example.com/{owner}/{repo}/pull/{number}"` |
| `requiredMaximumVersion` | (Managed만) 시작을 허용하는 최대 Claude Code 버전. 실행 버전이 더 새로우면 시작 시 종료. 백그라운드 자동 업데이트 및 `claude update`는 상한선을 넘는 버전 건너뜀 | `"2.1.150"` |
| `requiredMinimumVersion` | (Managed만) 시작에 필요한 최소 Claude Code 버전. 실행 버전이 더 오래되면 시작 시 종료. `minimumVersion`과 다르게 시작 자체를 차단 | `"2.1.150"` |
| `respectGitignore` | `@` 파일 피커가 `.gitignore` 패턴을 존중할지 여부 (기본값: `true`) | `false` |
| `showClearContextOnPlanAccept` | 플랜 수락 화면에 "컨텍스트 지우기" 옵션 표시 (기본값: `false`) | `true` |
| `showThinkingSummaries` | 대화형 세션에서 확장 thinking 요약 표시 (기본값: `false`) | `true` |
| `showTurnDuration` | 응답 후 턴 지속 시간 메시지 표시 (기본값: `true`) | `false` |
| `skillListingBudgetFraction` | 모델 컨텍스트 윈도우 중 스킬 목록에 할당하는 비율 (기본값: 0.01 = 1%) | `0.02` |
| `skillOverrides` | 스킬별 가시성 재정의. 값: `"on"`, `"name-only"`, `"user-invocable-only"`, `"off"` | `{"legacy-context": "name-only"}` |
| `skipWebFetchPreflight` | WebFetch 도메인 안전 검사 건너뛰기. Bedrock, Vertex, Foundry 환경에서 유용 | `true` |
| `spinnerTipsEnabled` | Claude 작업 중 스피너에 팁 표시 (기본값: `true`) | `false` |
| `spinnerTipsOverride` | 스피너 팁을 커스텀 문자열로 재정의 | `{"excludeDefault": true, "tips": ["Use our internal tool X"]}` |
| `spinnerVerbs` | 턴 진행 중 표시되는 동사 커스터마이즈. `mode`: `"replace"` 또는 `"append"` | `{"mode": "append", "verbs": ["Pondering"]}` |
| `sshConfigs` | Desktop 환경 드롭다운에 표시할 SSH 연결. `id`, `name`, `sshHost` 필수 | `[{"id": "dev-vm", "name": "Dev VM", "sshHost": "user@dev.example.com"}]` |
| `statusLine` | 컨텍스트를 표시할 커스텀 상태 라인 구성 | `{"type": "command", "command": "~/.claude/statusline.sh"}` |
| `syntaxHighlightingDisabled` | diff, 코드 블록, 파일 미리보기에서 구문 강조 비활성화 | `true` |
| `teammateMode` | 에이전트 팀 팀원 표시 방식: `"auto"`, `"in-process"`, `"tmux"` | `"in-process"` |
| `terminalProgressBarEnabled` | 지원 터미널에서 터미널 진행 막대 표시 (기본값: `true`) | `false` |
| `tui` | 터미널 UI 렌더러. `"fullscreen"` (깜빛임 없는 대체 화면) 또는 `"default"` (클래식) | `"fullscreen"` |
| `ultracode` | 세션에 대해 ultracode 활성화. 세션 전용이며 `settings.json`에서 읽지 않음. `/effort ultracode`, `--settings`, 또는 Agent SDK 제어 요청으로 설정 | `true` |
| `useAutoModeDuringPlan` | auto 모드 사용 가능 시 플랜 모드에서 auto 모드 시맨틱 사용 여부 (기본값: `true`). **공유 프로젝트 설정에서는 읽지 않음** | `false` |
| `viewMode` | 시작 시 기본 트랜스크립트 뷰 모드: `"default"`, `"verbose"`, `"focus"` | `"verbose"` |
| `voice` | 음성 받아쓰기 설정: `enabled`, `mode` (`"hold"` 또는 `"tap"`), `autoSubmit` | `{"enabled": true, "mode": "tap"}` |
| `voiceEnabled` | `voice.enabled`의 레거시 별칭. `voice` 객체 사용 권장 | `true` |
| `workflowKeywordTriggerEnabled` | 프롬프트에서 `ultracode` 키워드가 동적 워크플로우를 트리거할지 여부 (기본값: `true`) | `false` |

### Managed 전용 설정

다음 설정은 Managed 설정(조직 정책)에서만 사용할 수 있습니다.

| 키 | 설명 | 예시 |
|----|------|------|
| `allowAllClaudeAiMcps` | 배포된 `managed-mcp.json`과 함께 claude.ai 커넥터 로드 | `true` |
| `allowedChannelPlugins` | 메시지를 푸시할 수 있는 채널 플러그인 허용목록 | `[{"marketplace": "...", "plugin": "telegram"}]` |
| `allowedMcpServers` | 사용자가 구성할 수 있는 MCP 서버 허용목록 | `[{"serverName": "github"}]` |
| `allowManagedHooksOnly` | Managed hook, SDK hook, 및 managed에서 강제 활성화된 플러그인 hook만 로드 | `true` |
| `allowManagedMcpServersOnly` | managed 설정의 `allowedMcpServers`만 적용 | `true` |
| `allowManagedPermissionRulesOnly` | 사용자/프로젝트 설정에서 권한 규칙 정의 방지 | `true` |
| `blockedMarketplaces` | 마켓플레이스 소스 차단 목록 | `[{"source": "github", "repo": "untrusted/plugins"}]` |
| `channelsEnabled` | 조직의 채널 허용 | `true` |
| `claudeMd` | 조직 관리 메모리로 CLAUDE.md 형식 지침 주입 | `"Always run make lint before committing."` |
| `claudeMdExcludes` | 로딩에서 제외할 CLAUDE.md 파일의 글롭 패턴 또는 절대 경로 | `["**/vendor/**/CLAUDE.md"]` |
| `forceRemoteSettingsRefresh` | CLI 시작 차단 후 원격 managed 설정 새로고침. 실패 시 종료 | `true` |
| `parentSettingsBehavior` | 부모 프로세스가 제공한 설정의 처리 방식: `"first-wins"` (기본값) 또는 `"merge"` | `"merge"` |
| `pluginSuggestionMarketplaces` | 컨텍스트 설치 제안에 사용할 마켓플레이스 이름 | `["acme-corp-plugins"]` |
| `pluginTrustMessage` | 플러그인 신뢰 경고에 추가할 커스텀 메시지 | `"All plugins approved by IT"` |
| `policyHelper` | 시작 시 managed 설정을 동적으로 계산하는 실행 파일 | `{"path": "/usr/local/bin/claude-policy"}` |
| `strictKnownMarketplaces` | 플러그인 마켓플레이스 소스 허용목록 (엄격 정책) | `[{"source": "github", "repo": "acme-corp/plugins"}]` |
| `strictPluginOnlyCustomization` | 스킬, 에이전트, hook, MCP 서버를 플러그인 및 managed 소스로만 제한 | `["skills", "hooks"]` |
| `wslInheritsWindowsSettings` | WSL에서 Windows 정책 체인의 managed 설정도 읽기 | `true` |

---

## 권한 설정

`permissions` 객체 내에서 구성합니다.

| 키 | 설명 | 예시 |
|----|------|------|
| `allow` | 도구 사용을 허용하는 권한 규칙 배열 | `["Bash(git diff *)"]` |
| `ask` | 도구 사용 시 확인을 요청하는 권한 규칙 배열 | `["Bash(git push *)"]` |
| `deny` | 도구 사용을 거부하는 권한 규칙 배열. 민감한 파일 접근 제한에 사용 | `["WebFetch", "Bash(curl *)", "Read(./.env)"]` |
| `additionalDirectories` | Claude가 접근할 수 있는 추가 작업 디렉토리 | `["../docs/"]` |
| `defaultMode` | Claude Code를 열 때의 기본 권한 모드. `default`, `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions`. v2.1.142+에서는 `auto`를 프로젝트/로컬 설정에서 무시하므로 `~/.claude/settings.json`에 설정 | `"acceptEdits"` |
| `disableBypassPermissionsMode` | `"disable"`으로 설정하면 `bypassPermissions` 모드 활성화 방지 | `"disable"` |
| `skipDangerousModePermissionPrompt` | bypass permissions 모드 진입 전 확인 프롬프트 건너뛰기. 프로젝트 설정에서는 무시됨 | `true` |

### 배열 설정 병합 규칙

`permissions.allow`, `permissions.deny`, `permissions.ask` 같은 배열 설정은 스코프 간에 **재정의**되지 않고 **병합**됩니다. 예를 들어 사용자 설정의 `deny` 규칙과 프로젝트 설정의 `deny` 규칙이 모두 적용됩니다. 반면 스칼라 값(예: `defaultMode`)은 더 높은 우선순위 스코프의 값으로 재정의됩니다.

deny 규칙은 어느 스코프에서 설정되든 다른 모든 스코프의 allow 규칙보다 우선합니다. 예를 들어 사용자 수준의 deny가 프로젝트 수준의 allow를 차단합니다.

### 권한 규칙 문법

권한 규칙은 `Tool` 또는 `Tool(specifier)` 형식을 따릅니다. 규칙 평가 순서: deny 먼저, 그 다음 ask, 그 다음 allow. 첫 번째로 일치하는 규칙이 우선합니다.

| 규칙 | 효과 |
|------|------|
| `Bash` | 모든 Bash 명령 매칭 |
| `Bash(npm run *)` | `npm run`으로 시작하는 명령 매칭 |
| `Read(./.env)` | `.env` 파일 읽기 매칭 |
| `WebFetch(domain:example.com)` | example.com에 대한 fetch 요청 매칭 |

### 권한 모드

| 모드 | 승인 없이 실행 가능한 작업 | 용도 |
|------|---------------------------|------|
| `default` | 읽기만 | 시작, 민감한 작업 |
| `acceptEdits` | 읽기, 파일 편집, 일반 파일시스템 명령 (`mkdir`, `touch`, `rm`, `rmdir`, `mv`, `cp`, `sed` 등) | 코드 반복 작업 |
| `plan` | 읽기만 (코드 편집 없이 탐색 및 플랜 작성) | 변경 전 코드베이스 탐색 |
| `auto` | 모든 작업 (백그라운드 안전 검사 포함). **연구 프리뷰(Research Preview)** | 긴 작업, 프롬프트 피로 감소 |
| `dontAsk` | 사전 승인된 도구만 (`permissions.allow` 규칙에 매칭되는 도구 + 읽기 전용 Bash 명령) | 잠긴 CI 및 스크립트 |
| `bypassPermissions` | 모든 작업 (루트/홈 디렉토리 삭제만 회로 차단기로 프롬프트) | 격리된 컨테이너 및 VM 전용 |

#### 모드 전환 방법

| 환경 | 전환 방법 |
|------|-----------|
| CLI | `Shift+Tab`으로 `default` -> `acceptEdits` -> `plan` 순환. `auto`는 계정 요건 충족 시, `bypassPermissions`는 `--dangerously-skip-permissions` 시작 시 순환에 포함 |
| 시작 시 | `claude --permission-mode plan` |
| 기본값 | `defaultMode` 설정 사용 |
| VS Code | 프롬프트 상자 하단 모드 표시기 클릭 |
| Desktop / Web | 전송 버튼 옆 모드 선택기 사용 |

#### Auto 모드 상세

Auto 모드는 권한 프롬프트 없이 Claude가 실행할 수 있도록 합니다. 별도의 분류기 모델이 실행 전에 각 도구 호출을 검토하여 요청을 벗어나는 행위, 인식할 수 없는 인프라 대상, 악의적 콘텐츠 기반 행위를 차단합니다.

**가용성 요건:**

| 요건 | 내용 |
|------|------|
| **플랜** | 모든 플랜 |
| **관리자** | Team/Enterprise에서 관리자가 Claude Code 관리자 설정에서 활성화해야 함. `permissions.disableAutoMode`를 `"disable"`로 설정하면 잠금 가능 |
| **모델** | Anthropic API: Claude Opus 4.6+, Sonnet 4.6+. Bedrock/Vertex/Foundry: Claude Opus 4.7+, Opus 4.8만 |
| **프로바이더** | Anthropic API에서 기본 사용 가능. Bedrock, Vertex AI, Foundry에서는 `CLAUDE_CODE_ENABLE_AUTO_MODE` 설정 필요 |

**기본 차단/허용 동작:**

| 기본 차단 | 기본 허용 |
|-----------|-----------|
| 코드 다운로드 및 실행 (`curl \| bash` 등) | 작업 디렉토리 내 로컬 파일 작업 |
| 외부 엔드포인트로 민감 데이터 전송 | lock 파일에 선언된 종속성 설치 |
| 프로덕션 배포 및 마이그레이션 | `.env` 읽기 및 일치하는 API에 자격 증명 전송 |
| 클라우드 스토리지 대량 삭제 | 읽기 전용 HTTP 요청 |
| IAM 또는 리포지토리 권한 부여 | 시작한 브랜치 또는 Claude가 생성한 브랜치에 푸시 |
| 공유 인프라 수정 | |
| 세션 전에 존재하던 파일의 되돌릴 수 없는 파괴 | |
| 강제 푸시 및 `main`에 직접 푸시 | |

**Bedrock, Vertex AI, Foundry에서 Auto 모드 활성화:**

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_AUTO_MODE": "1"
  }
}
```

이 변수를 설정하면 `Shift+Tab` 순환에 `auto` 모드가 나타납니다. 기본 시작 모드로 설정하려면 `~/.claude/settings.json`에서 `defaultMode: "auto"`도 함께 설정합니다.

**Auto 모드 폴백:** 분류기가 동일한 작업을 3회 연속 또는 총 20회 차단하면 auto 모드가 일시 중지되고 권한 프롬프트가 재개됩니다. 사용자가 프롬프트를 승인하면 auto 모드가 재개됩니다.

**Auto 모드 구성:** `autoMode` 설정으로 분류기의 차단/허용 규칙을 커스터마이즈할 수 있습니다. 자세한 내용은 아래 Auto Mode Configuration 섹션을 참조하세요.

#### dontAsk 모드

`dontAsk` 모드는 권한 프롬프트가 필요한 모든 도구 호출을 자동 거부합니다. `permissions.allow` 규칙에 매칭되는 도구와 읽기 전용 Bash 명령만 실행됩니다. 명시적인 `ask` 규칙도 프롬프트 대신 거부됩니다. CI 파이프라인 등 Claude가 수행할 작업을 정확히 사전 정의하는 환경에 적합합니다.

```bash
claude --permission-mode dontAsk
```

#### bypassPermissions 모드

`bypassPermissions` 모드는 권한 프롬프트와 안전 검사를 모두 건너뜁니다. v2.1.126부터 보호 경로 쓰기도 프롬프트 없이 실행됩니다. 파일시스템 루트나 홈 디렉토리 삭제(`rm -rf /`, `rm -rf ~`)만 모델 오류 방지 회로 차단기로 프롬프트가 유지됩니다. 인터넷 접근이 없는 격리된 컨테이너, VM, dev container에서만 사용하세요.

Linux와 macOS에서는 root 또는 `sudo`로 이 모드를 시작할 수 없습니다:

```
--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons
```

시작 시 활성화 플래그가 필요합니다:

```bash
claude --permission-mode bypassPermissions
# 또는
claude --dangerously-skip-permissions
```

### 보호 경로

`bypassPermissions`를 제외한 모든 모드에서 다음 경로에 대한 쓰기는 자동 승인되지 않습니다:

- `.git`, `.config/git`, `.vscode`, `.idea`, `.husky`, `.cargo`, `.devcontainer`, `.yarn`, `.mvn`, `.claude` (`.claude/worktrees` 제외)
- `.gitconfig`, `.gitmodules`, `.bashrc`, `.zshrc`, `.profile`, `.npmrc`, `.yarnrc`, `.bazelrc`, `.pre-commit-config.yaml`, `.devcontainer.json`, `.mcp.json`, `.claude.json` 등

### 권한 예시

```json
{
  "permissions": {
    "allow": [
      "Bash(git diff *)",
      "Bash(git log *)",
      "Read"
    ],
    "deny": [
      "WebFetch",
      "Bash(curl *)",
      "Read(./.env)",
      "Read(./secrets/**)"
    ],
    "additionalDirectories": ["../docs/"]
  }
}
```

> `deny` 패턴은 Bash 접두사 매칭이며 우회될 수 있습니다. 자세한 내용은 Bash 권한 제한 사항을 참조하세요.

---

## 샌드박스 설정

고급 샌드박싱 동작을 구성합니다. 샌드박싱은 bash 명령을 파일시스템 및 네트워크로부터 격리합니다.

| 키 | 설명 | 예시 |
|----|------|------|
| `sandbox.enabled` | bash 샌드박싱 활성화 (macOS, Linux, WSL2). 기본값: `false` | `true` |
| `sandbox.failIfUnavailable` | `sandbox.enabled`이 `true`이지만 샌드박스를 시작할 수 없을 경우 오류로 종료. 기본값: `false` | `true` |
| `sandbox.autoAllowBashIfSandboxed` | 샌드박스 내에서 bash 명령 자동 승인. 기본값: `true` | `true` |
| `sandbox.excludedCommands` | 샌드박스 외부에서 실행할 명령 | `["docker *"]` |
| `sandbox.allowUnsandboxedCommands` | `dangerouslyDisableSandbox` 매개변수로 샌드박스 외부 실행 허용. `false` 시 탈출구 완전 비활성화. 기본값: `true` | `false` |
| `sandbox.enableWeakerNestedSandbox` | 권한 없는 Docker 환경에서 약한 샌드박스 활성화 (Linux/WSL2만). **보안 감소**. 기본값: `false` | `true` |
| `sandbox.enableWeakerNetworkIsolation` | (macOS만) 샌드박스에서 시스템 TLS 신뢰 서비스 접근 허용. **보안 감소**. 기본값: `false` | `true` |
| `sandbox.bwrapPath` | (Managed만, Linux/WSL2) `bwrap` 바이너리의 절대 경로. 자동 감지 재정의 | `/opt/admin/bwrap` |
| `sandbox.socatPath` | (Managed만, Linux/WSL2) `socat` 바이너리의 절대 경로. 자동 감지 재정의 | `/opt/admin/socat` |

### 샌드박스 파일시스템 설정

| 키 | 설명 | 예시 |
|----|------|------|
| `sandbox.filesystem.allowWrite` | 샌드박스 명령이 쓸 수 있는 추가 경로. 모든 스코프에서 병합 | `["/tmp/build", "~/.kube"]` |
| `sandbox.filesystem.denyWrite` | 샌드박스 명령이 쓸 수 없는 경로. 모든 스코프에서 병합 | `["/etc", "/usr/local/bin"]` |
| `sandbox.filesystem.denyRead` | 샌드박스 명령이 읽을 수 없는 경로. 모든 스코프에서 병합 | `["~/.aws/credentials"]` |
| `sandbox.filesystem.allowRead` | `denyRead` 영역 내에서 다시 읽기를 허용하는 경로. `denyRead`보다 우선 | `["."]` |
| `sandbox.filesystem.allowManagedReadPathsOnly` | (Managed만) managed 설정의 `allowRead` 경로만 적용. 기본값: `false` | `true` |

### 샌드박스 네트워크 설정

| 키 | 설명 | 예시 |
|----|------|------|
| `sandbox.network.allowUnixSockets` | (macOS만) 샌드박스에서 접근 가능한 Unix 소켓 경로 | `["~/.ssh/agent-socket"]` |
| `sandbox.network.allowAllUnixSockets` | 모든 Unix 소켓 연결 허용. Linux/WSL2에서만 작동. 기본값: `false` | `true` |
| `sandbox.network.allowLocalBinding` | (macOS만) localhost 포트 바인딩 허용. 기본값: `false` | `true` |
| `sandbox.network.allowMachLookup` | (macOS만) XPC/Mach 서비스 이름 추가. 후행 `*` 접두사 매칭 지원 | `["com.apple.coresimulator.*"]` |
| `sandbox.network.allowedDomains` | 아웃바운드 네트워크 트래픽을 허용할 도메인 배열. 와일드카드 지원 | `["github.com", "*.npmjs.org"]` |
| `sandbox.network.deniedDomains` | 아웃바운드 네트워크 트래픽을 차단할 도메인 배열. `allowedDomains`보다 우선 | `["sensitive.cloud.example.com"]` |
| `sandbox.network.allowManagedDomainsOnly` | (Managed만) managed 설정의 도메인만 적용. 기본값: `false` | `true` |
| `sandbox.network.httpProxyPort` | 커스텀 HTTP 프록시 포트. 미지정 시 Claude가 자체 프록시 실행 | `8080` |
| `sandbox.network.socksProxyPort` | 커스텀 SOCKS5 프록시 포트. 미지정 시 Claude가 자체 프록시 실행 | `8081` |

### 샌드박스 경로 접두사

`filesystem.allowWrite`, `filesystem.denyWrite`, `filesystem.denyRead`, `filesystem.allowRead`의 경로는 다음 접두사를 지원합니다.

| 접두사 | 의미 | 예시 |
|--------|------|------|
| `/` | 파일시스템 루트의 절대 경로 | `/tmp/build` |
| `~/` | 홈 디렉토리 기준 상대 경로 | `~/.kube` |
| `./` 또는 접두사 없음 | 프로젝트 루트(프로젝트 설정) 또는 `~/.claude`(사용자 설정) 기준 | `./output` |

### 샌드박스 구성 예시

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "excludedCommands": ["docker *"],
    "filesystem": {
      "allowWrite": ["/tmp/build", "~/.kube"],
      "denyRead": ["~/.aws/credentials"]
    },
    "network": {
      "allowedDomains": ["github.com", "*.npmjs.org", "registry.yarnpkg.com"],
      "deniedDomains": ["uploads.github.com"],
      "allowUnixSockets": ["/var/run/docker.sock"],
      "allowLocalBinding": true
    }
  }
}
```

파일시스템 및 네트워크 제한은 두 가지 방식으로 병합 구성할 수 있습니다:

- **`sandbox.filesystem` 설정** (위 예시): OS 수준 샌드박스 경계에서 경로 제어. `kubectl`, `terraform`, `npm` 등 모든 하위 프로세스 명령에 적용
- **권한 규칙**: `Edit` allow/deny 규칙으로 Claude 파일 도구 접근 제어, `Read` deny 규칙로 읽기 차단, `WebFetch` allow/deny 규칙로 네트워크 도메인 제어. 이 규칙의 경로도 샌드박스 구성에 병합됨

---

## Auto Mode Configuration

`autoMode` 설정 블록으로 auto 모드 분류기가 차단/허용하는 항목을 커스터마이즈합니다. 기본적으로 분류기는 작업 디렉토리와 현재 리포지토리의 구성된 원격만 신뢰합니다. 조직의 리포지토리, 버킷, 도메인을 추가하려면 `autoMode.environment`를 구성합니다.

### 분류기 구성 읽기 위치

| 스코프 | 파일 | 용도 |
|--------|------|------|
| 개인 | `~/.claude/settings.json` | 개인 신뢰 인프라 |
| 프로젝트(개인) | `.claude/settings.local.json` | 프로젝트별 신뢰 버킷/서비스 (gitignore) |
| 조직 전체 | Managed 설정 | 모든 개발자에게 분산 |
| `--settings` 플래그 또는 Agent SDK | 인라인 JSON | 자동화용 호출별 재정의 |

> 분류기는 공유 프로젝트 설정(`.claude/settings.json`)에서 `autoMode`를 읽지 않으므로, 체크인된 리포지토리가 자체 허용 규칙을 주입할 수 없습니다.

### 신뢰 인프라 정의

대부분의 조직에서 `autoMode.environment`만 설정하면 충분합니다. 기본 항목과 함께 커스텀 항목을 추가하려면 리터럴 문자열 `"$defaults"`를 배열에 포함합니다.

```json
{
  "autoMode": {
    "environment": [
      "$defaults",
      "Source control: github.example.com/acme-corp and all repos under it",
      "Trusted cloud buckets: s3://acme-build-artifacts, gs://acme-ml-datasets",
      "Trusted internal domains: *.corp.example.com, api.internal.example.com",
      "Key internal services: Jenkins at ci.example.com, Artifactory at artifacts.example.com"
    ]
  }
}
```

항목은 정규식이나 도구 패턴이 아닌 **자연어**입니다. 분류기가 읽을 수 있도록 새 엔지니어에게 설명하듯 작성하세요.

### 차단/허용 규칙 재정의

세 가지 추가 필드로 분류기의 빌트인 규칙 목록을 재정의할 수 있습니다.

| 필드 | 설명 |
|------|------|
| `autoMode.hard_deny` | 무조건 차단. 사용자 의도 및 `allow` 예외로도 재정의 불가 |
| `autoMode.soft_deny` | 파괴적 작업 차단. 사용자 의도 및 `allow` 예외로 재정의 가능 |
| `autoMode.allow` | `soft_deny` 규칙에 대한 예외 |

**우선순위:** `hard_deny` > `soft_deny` > `allow` > 명시적 사용자 의도

```json
{
  "autoMode": {
    "environment": ["$defaults", "Source control: github.example.com/acme-corp"],
    "allow": ["$defaults", "Deploying to staging is allowed"],
    "soft_deny": ["$defaults", "Never run database migrations outside the CLI"],
    "hard_deny": ["$defaults", "Never send repository contents to third-party APIs"]
  }
}
```

각 섹션에 `"$defaults"`를 포함하면 빌트인 규칙을 해당 위치에 상속합니다. `"$defaults"`를 생략하면 해당 목록을 완전히 교체합니다.

### CLI 하위 명령어

| 명령어 | 설명 |
|--------|------|
| `claude auto-mode defaults` | 빌트인 규칙(environment, allow, soft_deny, hard_deny)을 JSON으로 출력 |
| `claude auto-mode config` | 설정이 적용된 실제 구성을 JSON으로 출력 |
| `claude auto-mode critique` | 커스텀 규칙에 대한 AI 피드백 제공 |

### 거부 검토

auto 모드가 도구 호출을 거부하면 `/permissions`의 **Recently denied** 탭에 기록됩니다. 거부된 항목에서 `r`을 누르면 재시도로 표시됩니다. 동일한 대상에 대한 반복 거부는 분류기에 컨텍스트가 누락되었음을 의미합니다. `autoMode.environment`에 해당 대상을 추가하세요.

---

## 터미널 설정

Claude Code는 구성 없이 모든 터미널에서 작동합니다. 아래는 특정 동작을 조정할 때 필요한 설정입니다.

### 멀티라인 프롬프트 입력

Enter 키로 메시지가 제출됩니다. 줄바꿈을 추가하려면 `Ctrl+J` 또는 `\` 입력 후 Enter를 사용합니다.

| 터미널 | Shift+Enter 줄바꿈 |
|--------|-------------------|
| Ghostty, Kitty, iTerm2, WezTerm, Warp, Apple Terminal, Windows Terminal | 추가 설정 없이 작동 |
| VS Code, Cursor, Alacritty, Zed | `/terminal-setup` 한 번 실행 필요 |
| gnome-terminal, JetBrains IDE | 미지원. `Ctrl+J` 또는 `\` + Enter 사용 |

### macOS Option 키 단축키

macOS에서 대부분의 터미널은 기본적으로 Option 키를 수정자로 전송하지 않습니다.

| 터미널 | 설정 방법 |
|--------|-----------|
| Apple Terminal | Settings > Profiles > Keyboard에서 "Use Option as Meta Key" 체크. 또는 `/terminal-setup` 실행 |
| iTerm2 | Settings > Profiles > Keys > General에서 Left/Right Option key를 "Esc+"로 설정 |
| VS Code | `terminal.integrated.macOptionIsMeta: true` 추가 |

### 알림 설정

`preferredNotifChannel` 설정 또는 Notification hook으로 작업 완료/권한 프롬프트 시 알림을 받을 수 있습니다.

| 값 | 설명 |
|----|------|
| `"auto"` (기본값) | Ghostty, Kitty, iTerm2에서 데스크톱 알림 |
| `"terminal_bell"` | 모든 터미널에서 벨 문자 출력 |
| `"notifications_disabled"` | 알림 비활성화 |

Notification hook으로 커스텀 사운드 재생:

```json
{
  "hooks": {
    "Notification": [
      {
        "hooks": [{ "type": "command", "command": "afplay /System/Library/Sounds/Glass.aiff" }]
      }
    ]
  }
}
```

### tmux 구성

tmux 내에서 Claude Code 실행 시 `~/.tmux.conf`에 다음을 추가합니다:

```
set -g allow-passthrough on
set -s extended-keys on
set -as terminal-features 'xterm*:extkeys'
```

- `allow-passthrough`: 알림 및 진행 업데이트가 외부 터미널에 도달
- `extended-keys`: Shift+Enter와 일반 Enter를 구분

### 커스텀 테마

`/theme` 명령으로 빌트인 프리셋 또는 커스텀 테마를 선택합니다. 커스텀 테마는 `~/.claude/themes/`에 JSON 파일로 저장됩니다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `name` | string | `/theme`에 표시될 이름 |
| `base` | string | 기반이 되는 빌트인 프리셋: `dark`, `light`, `dark-daltonized`, `light-daltonized`, `dark-ansi`, `light-ansi` |
| `overrides` | object | 색상 토큰별 재정의 매핑. 나열되지 않은 토큰은 `base`에서 상속 |

예시:

```json
{
  "name": "Dracula",
  "base": "dark",
  "overrides": {
    "claude": "#bd93f9",
    "error": "#ff5555",
    "success": "#50fa7b"
  }
}
```

Claude Code는 `~/.claude/themes/` 디렉토리를 감시하며 파일 변경 시 자동으로 리로드합니다.

### Vim 편집 모드

`editorMode`를 `"vim"`으로 설정하거나 `/config` > Editor mode에서 활성화합니다. `hjkl` 이동, `v`/`V` 선택, `d`/`c`/`y` 텍스트 객체 등 NORMAL 및 VISUAL 모션의 일부를 지원합니다. Vim 모션은 keybindings 파일에서 리매핑할 수 없습니다.

INSERT 모드에서 Enter는 일반 Vim과 달리 프롬프트를 제출합니다. 줄바꿈에는 NORMAL 모드에서 `o`/`O` 또는 `Ctrl+J`를 사용하세요.

### 전체화면 렌더링

표시가 깜빡이거나 스크롤 위치가 점프하면 전체화면 렌더링으로 전환하세요.

```bash
/tui fullscreen
```

또는 환경 변수 `CLAUDE_CODE_NO_FLICKER=1`을 설정합니다. `/tui default`로 되돌릴 수 있습니다.

---

## 네트워크 설정

엔터프라이즈 환경에서 Claude Code의 네트워크 연결을 구성합니다.

### 프록시 구성

Claude Code는 표준 프록시 환경 변수를 준수합니다.

```bash
# HTTPS 프록시 (권장)
export HTTPS_PROXY=https://proxy.example.com:8080

# HTTP 프록시
export HTTP_PROXY=http://proxy.example.com:8080

# 프록시 우회
export NO_PROXY="localhost,192.168.1.1,example.com,.example.com"

# 모든 요청에 대해 프록시 우회
export NO_PROXY="*"
```

기본 인증 필요 시 URL에 자격 증명을 포함:

```bash
export HTTPS_PROXY=http://username:password@proxy.example.com:8080
```

### CA 인증서

| 설정 | 설명 |
|------|------|
| `CLAUDE_CODE_CERT_STORE` | CA 인증서 소스 (쉼표 구분). `bundled` (Mozilla CA), `system` (OS 인증서 저장소). 기본값: `bundled,system` |
| `NODE_EXTRA_CA_CERTS` | 커스텀 CA 인증서 경로 |

```bash
# Mozilla CA만 신뢰
export CLAUDE_CODE_CERT_STORE=bundled

# OS 인증서 저장소만 신뢰
export CLAUDE_CODE_CERT_STORE=system

# 커스텀 CA 추가
export NODE_EXTRA_CA_CERTS=/path/to/ca-cert.pem
```

### mTLS 인증

```bash
export CLAUDE_CODE_CLIENT_CERT=/path/to/client-cert.pem
export CLAUDE_CODE_CLIENT_KEY=/path/to/client-key.pem
export CLAUDE_CODE_CLIENT_KEY_PASSPHRASE="your-passphrase"  # 선택
```

### 네트워크 접근 요구 사항

| URL | 필요한 기능 |
|-----|------------|
| `api.anthropic.com` | Claude API 요청 |
| `claude.ai` | claude.ai 계정 인증 |
| `platform.claude.com` | Anthropic Console 계정 인증 |
| `downloads.claude.ai` | 플러그인 실행 파일 다운로드, 네이티브 설치/자동 업데이트 |
| `storage.googleapis.com` | v2.1.116 이전 버전의 네이티브 설치/자동 업데이트 |
| `bridge.claudeusercontent.com` | Claude in Chrome 확장 WebSocket 브릿지 |
| `raw.githubusercontent.com` | `/release-notes` 피드, 릴리스 노트, 플러그인 마켓플레이스 설치 수 |

> Amazon Bedrock, Google Vertex AI, Microsoft Foundry 사용 시 모델 트래픽과 인증은 `api.anthropic.com` 대신 해당 프로바이더로 전송됩니다. WebFetch 도구는 `skipWebFetchPreflight: true` 설정이 없으면 도메인 안전 검사를 위해 여전히 `api.anthropic.com`을 호출합니다.

---

## 워크트리 설정

`--worktree`가 git worktree를 생성하고 관리하는 방식을 구성합니다.

| 키 | 설명 | 예시 |
|----|------|------|
| `worktree.baseRef` | 새 worktree가 브랜치할 ref. `"fresh"` (기본값)는 `origin/<default-branch>`에서 브랜치하여 원격과 일치하는 깨끗한 트리 생성. `"head"`는 현재 로컬 `HEAD`에서 브랜치하여 푸시되지 않은 커밋과 피처 브랜치 상태가 worktree에 포함 | `"head"` |
| `worktree.symlinkDirectories` | 각 worktree에 메인 저장소에서 심볼릭 링크할 디렉토리. 디스크에서 큰 디렉토리 중복 방지. 기본값: 없음 | `["node_modules", ".cache"]` |
| `worktree.sparsePaths` | git sparse-checkout을 통해 각 worktree에서 체크아웃할 디렉토리. 나열된 디렉토리와 루트 수준 파일만 디스크에 기록됨. 대형 모노레포에서 유용 | `["packages/my-app", "shared/utils"]` |
| `worktree.bgIsolation` | 백그라운드 세션의 격리 모드. `"worktree"` (기본값)는 `EnterWorktree` 호출 전까지 메인 체크아웃에서 `Edit`/`Write` 차단. `"none"`은 백그라운드 작업이 작업 복사본을 직접 편집. v2.1.143+ 필요 | `"none"` |

> `.env`와 같이 gitignore된 파일을 새 worktree에 복사하려면 설정 대신 프로젝트 루트에 `.worktreeinclude` 파일을 사용하세요.

---

## 어트리뷰션 설정

Claude Code는 git 커밋과 풀 리퀘스트에 어트리뷰션을 추가합니다.

- **커밋**: 기본적으로 git 트레일러(예: `Co-Authored-By`)를 사용. 커스터마이즈 또는 비활성화 가능
- **풀 리퀘스트**: 일반 텍스트

| 키 | 설명 |
|----|------|
| `attribution.commit` | git 커밋의 어트리뷰션. 빈 문자열이면 커밋 어트리뷰션 숨김 |
| `attribution.pr` | 풀 리퀘스트 설명의 어트리뷰션. 빈 문자열이면 PR 어트리뷰션 숨김 |

**기본 커밋 어트리뷰션:**

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

**기본 PR 어트리뷰션:**

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

**예시:**

```json
{
  "attribution": {
    "commit": "Generated with AI\n\nCo-Authored-By: AI <ai@example.com>",
    "pr": ""
  }
}
```

> `includeCoAuthoredBy` 설정은 더 이상 사용되지 않으며(deprecated), `attribution` 사용을 권장합니다.

---

## 글로벌 구성 설정

`~/.claude.json`(settings.json이 아님)에 저장되는 설정입니다. `settings.json`에 추가하면 스키마 검증 오류가 발생합니다.

| 키 | 설명 | 예시 |
|----|------|------|
| `autoConnectIde` | 외부 터미널에서 Claude Code 시작 시 실행 중인 IDE에 자동 연결. 기본값: `false` | `true` |
| `autoInstallIdeExtension` | VS Code 터미널에서 실행 시 Claude Code IDE 확장 자동 설치. 기본값: `true` | `false` |
| `externalEditorContext` | `Ctrl+G`로 외부 에디터를 열 때 Claude의 이전 응답을 `#` 주석 컨텍스트로 추가. 기본값: `false` | `true` |
| `teammateDefaultModel` | 에이전트 팀 팀원의 기본 모델. 모델 별칭(예: `"sonnet"`) 또는 `null`로 리드의 현재 `/model` 선택 상속 | `"sonnet"` |

> `autoConnectIde`는 환경 변수 `CLAUDE_CODE_AUTO_CONNECT_IDE`로 재정의할 수 있습니다.
> `autoInstallIdeExtension`은 환경 변수 `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL`로 재정의할 수 있습니다.

---

## 파일 제안 설정

`@` 파일 경로 자동완성에 사용할 커스텀 명령을 구성합니다. 빌트인 파일 제안은 빠른 파일시스템 순회를 사용하지만, 대형 모노레포에서는 프로젝트별 인덱싱이 유용할 수 있습니다.

```json
{
  "fileSuggestion": {
    "type": "command",
    "command": "~/.claude/file-suggestion.sh"
  }
}
```

명령은 hook과 동일한 환경 변수로 실행되며, `CLAUDE_PROJECT_DIR`을 포함합니다. stdin으로 `query` 필드가 있는 JSON을 수신하고, stdout에 개행으로 구분된 파일 경로를 출력합니다 (최대 15개).

---

## Hook 설정

Hook은 라이프사이클 이벤트에 실행할 커스텀 명령을 구성합니다. 자세한 내용은 hooks 문서를 참조하세요.

### Hook 제한 설정

| 키 | 설명 | 예시 |
|----|------|------|
| `allowManagedHooksOnly` | (Managed만) Managed hook, SDK hook, managed에서 강제 활성화된 플러그인 hook만 로드. 사용자/프로젝트/기타 플러그인 hook 차단 | `true` |
| `allowedHttpHookUrls` | HTTP hook이 대상으로 할 수 있는 URL 패턴 허용목록. `*` 와일드카드 지원 | `["https://hooks.example.com/*"]` |
| `httpHookAllowedEnvVars` | HTTP hook이 헤더에 보간할 수 있는 환경 변수 이름 허용목록. 각 hook의 유효 `allowedEnvVars`는 이 목록과의 교집합 | `["MY_TOKEN"]` |

---

## 환경 변수 전체

Claude Code의 동작을 제어하는 환경 변수 목록입니다. `settings.json`의 `env` 키에 설정하거나 쉘에서 직접 설정할 수 있습니다.

### 인증 및 API

| 변수 | 용도 |
|------|------|
| `ANTHROPIC_API_KEY` | `X-Api-Key` 헤더로 전송되는 API 키. 설정 시 로그인 상태보다 우선 |
| `ANTHROPIC_AUTH_TOKEN` | `Authorization` 헤더에 사용할 커스텀 값 (`Bearer` 접두사 자동 추가) |
| `ANTHROPIC_CUSTOM_HEADERS` | 요청에 추가할 커스텀 헤더 (`Name: Value` 형식, 개행으로 여러 헤더 구분) |
| `ANTHROPIC_BETAS` | 추가 `anthropic-beta` 헤더 값 (쉼표 구분). 모든 인증 방식에서 작동 |
| `ANTHROPIC_AWS_API_KEY` | AWS의 Claude Platform 워크스페이스 API 키 |
| `ANTHROPIC_AWS_BASE_URL` | Claude Platform on AWS 엔드포인트 URL 재정의 |
| `ANTHROPIC_AWS_WORKSPACE_ID` | Claude Platform on AWS에 필요한 워크스페이스 ID |
| `ANTHROPIC_WORKSPACE_ID` | 워크로드 아이덴티티 페더레이션용 워크스페이스 ID |
| `ANTHROPIC_FOUNDRY_API_KEY` | Microsoft Foundry 인증용 API 키 |
| `ANTHROPIC_FOUNDRY_BASE_URL` | Foundry 리소스의 전체 base URL |
| `ANTHROPIC_FOUNDRY_RESOURCE` | Foundry 리소스 이름 |

### 모델 구성

| 변수 | 용도 |
|------|------|
| `ANTHROPIC_MODEL` | 사용할 모델 설정 이름 |
| `ANTHROPIC_CUSTOM_MODEL_OPTION` | `/model` 피커에 커스텀 모델 항목으로 추가할 모델 ID |
| `ANTHROPIC_CUSTOM_MODEL_OPTION_NAME` | 커스텀 모델 항목의 표시 이름 |
| `ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION` | 커스텀 모델 항목의 표시 설명 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Haiku 클래스 모델 ID |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Sonnet 클래스 모델 ID |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Opus 클래스 모델 ID |
| `ANTHROPIC_SMALL_FAST_MODEL` | [DEPRECATED] 백그라운드 작업용 Haiku 클래스 모델 이름 |
| `ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION` | Bedrock/Mantle 사용 시 Haiku 클래스 모델의 AWS 리전 재정의 |
| `CLAUDE_CODE_SUBAGENT_MODEL` | 서브에이전트 모델 구성 |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | 대부분의 요청에 대한 최대 출력 토큰 수 |
| `MAX_THINKING_TOKENS` | 확장 thinking 토큰 예산 재정의. `0`으로 설정 시 thinking 비활성화 |
| `CLAUDE_CODE_EFFORT_LEVEL` | effort level 설정. 값: `low`, `medium`, `high`, `xhigh`, `max`, `auto` |
| `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` | `1`로 설정 시 Opus 4.6/Sonnet 4.6에서 적응형 추론 비활성화 |
| `CLAUDE_CODE_DISABLE_THINKING` | `1`로 설정 시 확장 thinking 강제 비활성화 |

### AWS Bedrock

| 변수 | 용도 |
|------|------|
| `CLAUDE_CODE_USE_BEDROCK` | Bedrock 사용 |
| `AWS_BEARER_TOKEN_BEDROCK` | Bedrock 인증용 API 키 |
| `CLAUDE_CODE_SKIP_BEDROCK_AUTH` | Bedrock에 대한 AWS 인증 건너뛰기 |
| `ANTHROPIC_BEDROCK_BASE_URL` | Bedrock 엔드포인트 URL 재정의 |
| `ANTHROPIC_BEDROCK_MANTLE_BASE_URL` | Bedrock Mantle 엔드포인트 URL 재정의 |
| `ANTHROPIC_BEDROCK_SERVICE_TIER` | Bedrock 서비스 티어 (`default`, `flex`, `priority`) |
| `CLAUDE_CODE_USE_MANTLE` | Bedrock Mantle 엔드포인트 사용 |
| `CLAUDE_CODE_SKIP_MANTLE_AUTH` | Bedrock Mantle에 대한 AWS 인증 건너뛰기 |

### Google Vertex AI

| 변수 | 용도 |
|------|------|
| `CLAUDE_CODE_USE_VERTEX` | Vertex AI 사용 |
| `CLAUDE_CODE_SKIP_VERTEX_AUTH` | Vertex에 대한 Google 인증 건너뛰기 |
| `ANTHROPIC_VERTEX_BASE_URL` | Vertex AI 엔드포인트 URL 재정의 |
| `ANTHROPIC_VERTEX_PROJECT_ID` | Vertex AI 요청용 GCP 프로젝트 ID |
| `VERTEX_REGION_CLAUDE_3_5_HAIKU` | Claude 3.5 Haiku 리전 재정의 |
| `VERTEX_REGION_CLAUDE_3_5_SONNET` | Claude 3.5 Sonnet 리전 재정의 |
| `VERTEX_REGION_CLAUDE_3_7_SONNET` | Claude 3.7 Sonnet 리전 재정의 |
| `VERTEX_REGION_CLAUDE_4_0_OPUS` | Claude 4.0 Opus 리전 재정의 |
| `VERTEX_REGION_CLAUDE_4_0_SONNET` | Claude 4.0 Sonnet 리전 재정의 |
| `VERTEX_REGION_CLAUDE_4_1_OPUS` | Claude 4.1 Opus 리전 재정의 |
| `VERTEX_REGION_CLAUDE_4_5_OPUS` | Claude Opus 4.5 리전 재정의 |
| `VERTEX_REGION_CLAUDE_4_5_SONNET` | Claude Sonnet 4.5 리전 재정의 |
| `VERTEX_REGION_CLAUDE_4_6_OPUS` | Claude Opus 4.6 리전 재정의 |
| `VERTEX_REGION_CLAUDE_4_6_SONNET` | Claude Sonnet 4.6 리전 재정의 |
| `VERTEX_REGION_CLAUDE_4_7_OPUS` | Claude Opus 4.7 리전 재정의 (v2.1.111+) |
| `VERTEX_REGION_CLAUDE_HAIKU_4_5` | Claude Haiku 4.5 리전 재정의 |

### Microsoft Foundry

| 변수 | 용도 |
|------|------|
| `CLAUDE_CODE_USE_FOUNDRY` | Microsoft Foundry 사용 |
| `CLAUDE_CODE_SKIP_FOUNDRY_AUTH` | Foundry에 대한 Azure 인증 건너뛰기 |

### Bash 및 명령 실행

| 변수 | 용도 |
|------|------|
| `BASH_DEFAULT_TIMEOUT_MS` | 장시간 실행되는 bash 명령의 기본 타임아웃 (기본값: 120000 = 2분) |
| `BASH_MAX_TIMEOUT_MS` | 모델이 설정할 수 있는 최대 bash 타임아웃 (기본값: 600000 = 10분) |
| `BASH_MAX_OUTPUT_LENGTH` | bash 출력이 중간 잘림되기 전의 최대 문자 수 |
| `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` | 각 Bash 명령 후 원래 작업 디렉토리로 복귀 |

### 출력 및 토큰

| 변수 | 용도 |
|------|------|
| `MAX_MCP_OUTPUT_TOKENS` | MCP 도구 응답에 허용되는 최대 토큰 수 (기본값: 25000) |
| `TASK_MAX_OUTPUT_LENGTH` | 서브에이전트 출력 잘림 전 최대 문자 수 (기본값: 32000, 최대: 160000) |
| `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS` | 파일 읽기의 토큰 한도 재정의 |
| `API_TIMEOUT_MS` | API 요청 타임아웃 (밀리초, 기본값: 600000 = 10분) |
| `MAX_STRUCTURED_OUTPUT_RETRIES` | `--json-schema` 검증 실패 시 재시도 횟수 (기본값: 5) |

### 컨텍스트 및 압축

| 변수 | 용도 |
|------|------|
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | 자동 압축이 트리거되는 컨텍스트 용량 비율 (1-100). 기본값 약 95% |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | 자동 압축 계산에 사용되는 토큰 단위 컨텍스트 용량 |
| `CLAUDE_CODE_MAX_CONTEXT_TOKENS` | 컨텍스트 윈도우 크기 재정의 (`DISABLE_COMPACT`도 설정 필요) |
| `DISABLE_AUTO_COMPACT` | `1`로 설정 시 컨텍스트 한도 근접 시 자동 압축 비활성화 |
| `DISABLE_COMPACT` | `1`로 설정 시 자동 및 수동 압축 모두 비활성화 |

### MCP (Model Context Protocol)

| 변수 | 용도 |
|------|------|
| `MCP_TIMEOUT` | MCP 서버 시작 타임아웃 (밀리초, 기본값: 30000) |
| `MCP_TOOL_TIMEOUT` | MCP 도구 실행 타임아웃 (밀리초, 기본값: 100000000) |
| `MCP_CLIENT_SECRET` | 사전 구성된 자격 증명이 필요한 MCP 서버용 OAuth 클라이언트 시크릿 |
| `MCP_CONNECTION_NONBLOCKING` | MCP 서버 연결을 시작 시 차단할지 여부. v2.1.142+에서 기본 비차단 |
| `MCP_CONNECT_TIMEOUT_MS` | 차단 MCP 시작 대기 시간 (밀리초, 기본값: 5000) |
| `MCP_OAUTH_CALLBACK_PORT` | OAuth 리다이렉트 콜백용 고정 포트 |
| `MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE` | 원격 MCP 서버 병렬 연결 수 (기본값: 20) |
| `MCP_SERVER_CONNECTION_BATCH_SIZE` | 로컬 MCP 서버 병렬 연결 수 (기본값: 3) |
| `ENABLE_TOOL_SEARCH` | MCP 도구 검색 제어. `true`, `auto`, `auto:N`, `false` |
| `ENABLE_CLAUDEAI_MCP_SERVERS` | `false`로 설정 시 claude.ai MCP 서버 비활성화 |
| `CLAUDE_CODE_MCP_ALLOWLIST_ENV` | `1`로 설정 시 stdio MCP 서버를 안전한 기본 환경 + 설정된 `env`만으로 실행 |

### 네트워크 및 프록시

| 변수 | 용도 |
|------|------|
| `HTTP_PROXY` | HTTP 프록시 서버 지정 |
| `HTTPS_PROXY` | HTTPS 프록시 서버 지정 |
| `NO_PROXY` | 프록시를 우회하여 직접 요청할 도메인 및 IP 목록 |
| `ANTHROPIC_BASE_URL` | API 엔드포인트 재정의. 프록시/게이트웨이 경로에 사용 |
| `CLAUDE_CODE_PROXY_RESOLVES_HOSTS` | `1`로 설정 시 프록시가 DNS 해석 수행 |

### mTLS 및 TLS 인증

| 변수 | 용도 |
|------|------|
| `CLAUDE_CODE_CLIENT_CERT` | mTLS 인증용 클라이언트 인증서 파일 경로 |
| `CLAUDE_CODE_CLIENT_KEY` | mTLS 인증용 클라이언트 개인 키 파일 경로 |
| `CLAUDE_CODE_CLIENT_KEY_PASSPHRASE` | 암호화된 CLAUDE_CODE_CLIENT_KEY의 암호 (선택) |
| `CLAUDE_CODE_CERT_STORE` | TLS 연결용 CA 인증서 소스 (쉼표 구분). `bundled`, `system`. 기본값: `bundled,system` |

### 기능 제어

| 변수 | 용도 |
|------|------|
| `DISABLE_AUTOUPDATER` | `1`로 설정 시 자동 업데이트 비활성화 |
| `DISABLE_UPDATES` | `1`로 설정 시 모든 업데이트 차단 (`claude update`, `claude install` 포함) |
| `DISABLE_COST_WARNINGS` | `1`로 설정 시 비용 경고 메시지 비활성화 |
| `DISABLE_ERROR_REPORTING` | `1`로 설정 시 Sentry 오류 보고 옵트아웃 |
| `DISABLE_TELEMETRY` | `1`로 설정 시 원격 측정 옵트아웃 |
| `DO_NOT_TRACK` | `1`로 설정 시 원격 측정 옵트아웃 (`DISABLE_TELEMETRY`와 동일) |
| `DISABLE_GROWTHBOOK` | `1`로 설정 시 GrowthBook 기능 플래그 가져오기 비활성화 |
| `DISABLE_PROMPT_CACHING` | `1`로 설정 시 모든 모델의 프롬프트 캐싱 비활성화 |
| `DISABLE_INTERLEAVED_THINKING` | `1`로 설정 시 interleaved-thinking 베타 헤더 전송 방지 |
| `CLAUDE_CODE_ENABLE_AUTO_MODE` | `1`로 설정 시 Bedrock, Vertex, Foundry에서 auto 모드 사용 가능 (v2.1.158+) |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | `DISABLE_AUTOUPDATER` + `DISABLE_FEEDBACK_COMMAND` + `DISABLE_ERROR_REPORTING` + `DISABLE_TELEMETRY`와 동일 |
| `CLAUDE_CODE_DISABLE_AGENT_VIEW` | `1`로 설정 시 백그라운드 에이전트 및 에이전트 뷰 비활성화 |
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY` | `1`로 설정 시 자동 메모리 비활성화 |
| `CLAUDE_CODE_DISABLE_CLAUDE_MDS` | `1`로 설정 시 모든 CLAUDE.md 메모리 파일 로딩 방지 |
| `CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING` | `1`로 설정 시 파일 체크포인팅 비활성화 |
| `CLAUDE_CODE_DISABLE_WORKFLOWS` | `1`로 설정 시 워크플로우 비활성화 |
| `CLAUDE_CODE_DISABLE_CRON` | `1`로 설정 시 예약 작업 비활성화 |
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` | `1`로 설정 시 모든 백그라운드 작업 기능 비활성화 |
| `CLAUDE_CODE_DISABLE_FAST_MODE` | `1`로 설정 시 fast mode 비활성화 |
| `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` | `1`로 설정 시 세션 품질 설문 비활성화 |
| `CLAUDE_CODE_DISABLE_ATTACHMENTS` | `1`로 설정 시 첨부 파일 처리 비활성화 |
| `CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP` | `1`로 설정 시 Opus 4.0/4.1 자동 리매핑 방지 |
| `CLAUDE_CODE_DISABLE_1M_CONTEXT` | `1`로 설정 시 1M 컨텍스트 윈도우 비활성화 |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | `1`로 설정 시 Anthropic 베타 헤더/스키마 필드 제거 |
| `CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK` | `1`로 설정 시 스트리밍 실패 시 비스트리밍 폴백 비활성화 |
| `CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING` | 도구 호출 입력 스트리밍 제어. `0`으로 비활성화, `1`로 강제 활성화 |

### IDE 및 터미널 UI

| 변수 | 용도 |
|------|------|
| `CLAUDE_CODE_AUTO_CONNECT_IDE` | IDE 자동 연결 재정의. `false`로 방지, `true`로 강제 연결 시도 |
| `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL` | IDE 확장 자동 설치 건너뛰기 |
| `CLAUDE_CODE_IDE_HOST_OVERRIDE` | IDE 확장 연결에 사용할 호스트 주소 재정의 |
| `CLAUDE_CODE_IDE_SKIP_VALID_CHECK` | IDE 락파일 항목 검증 건너뛰기 |
| `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` | `1`로 설정 시 터미널 제목 자동 업데이트 비활성화 |
| `CLAUDE_CODE_ACCESSIBILITY` | `1`로 설정 시 네이티브 터미널 커서 표시, 반전 텍스트 커서 비활성화 |
| `CLAUDE_CODE_DISABLE_MOUSE` | `1`로 설정 시 전체화면 렌더링에서 마우스 추적 비활성화 |
| `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN` | `1`로 설정 시 전체화면 렌더링 비활성화, 클래식 메인 화면 렌더러 사용 |
| `CLAUDE_CODE_NO_FLICKER` | `1`로 설정 시 전체화면 렌더링 활성화 (깜빡임 감소) |
| `CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL` | `1`로 설정 시 가상 스크롤 비활성화 |
| `CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT` | `1`로 설정 시 전체화면에서 매 프레임 전체 화면 다시 그리기 |
| `CLAUDE_CODE_SCROLL_SPEED` | 마우스 휠 스크롤 배수 (1-20) |
| `CLAUDE_CODE_TMUX_TRUECOLOR` | `1`로 설정 시 tmux 내에서 24비트 트루컬러 허용 |
| `CLAUDE_CODE_NATIVE_CURSOR` | `1`로 설정 시 터미널 자체 커서를 입력 캐럿에 표시 |
| `CLAUDE_CODE_SYNTAX_HIGHLIGHT` | `false`로 설정 시 diff 출력의 구문 강조 비활성화 |
| `CLAUDE_CODE_HIDE_CWD` | `1`로 설정 시 시작 로고에서 작업 디렉토리 숨김 |
| `CLAUDE_CODE_FORCE_SYNC_OUTPUT` | `1`로 설정 시 DEC private mode 2026 동기화 출력 강제 활성화 |

### 프롬프트 캐싱

| 변수 | 용도 |
|------|------|
| `ENABLE_PROMPT_CACHING_1H` | `1`로 설정 시 기본 5분 대신 1시간 프롬프트 캐시 TTL 요청 |
| `ENABLE_PROMPT_CACHING_1H_BEDROCK` | [DEPRECATED] `ENABLE_PROMPT_CACHING_1H` 사용 권장 |
| `FORCE_PROMPT_CACHING_5M` | `1`로 설정 시 1시간 TTL이 적용될 때도 5분 캐시 TTL 강제 |
| `DISABLE_PROMPT_CACHING_HAIKU` | `1`로 설정 시 Haiku 모델 프롬프트 캐싱 비활성화 |
| `DISABLE_PROMPT_CACHING_OPUS` | `1`로 설정 시 Opus 모델 프롬프트 캐싱 비활성화 |
| `DISABLE_PROMPT_CACHING_SONNET` | `1`로 설정 시 Sonnet 모델 프롬프트 캐싱 비활성화 |
| `CLAUDE_CODE_ATTRIBUTION_HEADER` | `0`으로 설정 시 시스템 프롬프트 시작 부분의 어트리뷰션 블록 생략 (캐시 적중률 향상) |

### 세션 및 디버그

| 변수 | 용도 |
|------|------|
| `DEBUG` | `1`로 설정 시 디버그 모드 활성화 |
| `CLAUDE_CODE_DEBUG_LOGS_DIR` | 디버그 로그 파일 경로 재정의 |
| `CLAUDE_CODE_DEBUG_LOG_LEVEL` | 디버그 로그의 최소 로그 레벨 (`verbose`, `debug`, `info`, `warn`, `error`) |
| `CLAUDE_CODE_SESSION_ID` | 하위 프로세스에서 자동으로 설정되는 현재 세션 ID |
| `CLAUDE_CODE_REMOTE` | 클라우드 세션으로 실행 중일 때 자동으로 `true`로 설정 |
| `CLAUDE_CODE_REMOTE_SESSION_ID` | 클라우드 세션에서 자동으로 설정되는 세션 ID |
| `CLAUDECODE` | Claude Code가 생성한 하위 프로세스에서 `1`로 설정됨 |
| `CLAUDE_CODE_SKIP_PROMPT_HISTORY` | `1`로 설정 시 프롬프트 기록 및 세션 기록 디스크 기록 건너뛰기 |
| `CLAUDE_CODE_RESUME_INTERRUPTED_TURN` | `1`로 설정 시 이전 세션이 턴 중간에 종료된 경우 자동 재개 |
| `CLAUDE_CODE_RESUME_PROMPT` | 턴 중간에 종료된 세션 재개 시 삽입할 계속 메시지 재정의 |
| `CLAUDE_CODE_EXIT_AFTER_STOP_DELAY` | 쿼리 루프 유휴 후 자동 종료까지의 대기 시간 (밀리초) |
| `CLAUDE_CODE_MAX_RETRIES` | 실패한 API 요청 재시도 횟수 재정의 (기본값: 10) |
| `CLAUDE_CODE_MAX_TURNS` | 명시적 한계가 없을 때 에이전트 턴 수 상한 |
| `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` | 병렬 실행 가능한 읽기 전용 도구 및 서브에이전트 최대 수 (기본값: 10) |
| `CLAUDE_CODE_ENABLE_TASKS` | `0`으로 설정 시 레거시 `TodoWrite` 도구로 되돌림 (v2.1.142+에서 기본 Task 도구) |
| `CLAUDE_CODE_TASK_LIST_ID` | 여러 인스턴스에서 공유할 작업 목록 ID |
| `CLAUDE_CODE_TEAM_NAME` | 에이전트 팀 팀원이 속한 팀 이름 (자동 설정) |

### 에이전트 및 서브에이전트

| 변수 | 용도 |
|------|------|
| `CLAUDE_CODE_FORK_SUBAGENT` | `1`로 설정 시 포크된 서브에이전트를 기본으로 사용 |
| `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS` | `1`로 설정 시 모든 빌트인 서브에이전트 비활성화 (비대화형 모드만) |
| `CLAUDE_AGENT_SDK_MCP_NO_PREFIX` | `1`로 설정 시 SDK 생성 MCP 서버에서 `mcp__<server>__` 접두사 생략 |
| `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` | 백그라운드 서브에이전트 스톨 타임아웃 (기본값: 600000 = 10분) |
| `CLAUDE_AUTO_BACKGROUND_TASKS` | `1`로 설정 시 장시간 실행되는 에이전트 작업 자동 백그라운드 전환 강제 활성화 |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | `1`로 설정 시 에이전트 팀 활성화 (실험적, 기본 비활성화) |

### 하위 프로세스 및 셸

| 변수 | 용도 |
|------|------|
| `CLAUDE_CODE_SHELL` | 자동 셸 감지 재정의 |
| `CLAUDE_CODE_SHELL_PREFIX` | Claude Code가 생성하는 셸 명령을 감싸는 명령 접두사 |
| `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` | `1`로 설정 시 하위 프로세스 환경에서 Anthropic 및 클라우드 프로바이더 자격 증명 제거 |
| `CLAUDE_CODE_SCRIPT_CAPS` | 스크립트 호출 횟수를 제한하는 JSON 객체 |
| `CLAUDE_ENV_FILE` | 각 Bash 명령 전에 실행할 셸 스크립트 경로 |
| `CLAUDE_CODE_USE_POWERSHELL_TOOL` | PowerShell 도구 제어 |
| `CLAUDE_CODE_POWERSHELL_RESPECT_EXECUTION_POLICY` | `1`로 설정 시 PowerShell 실행 정책 준수 |
| `CLAUDE_CODE_PERFORCE_MODE` | `1`로 설정 시 Perforce 인식 쓰기 보호 활성화 |

### 스트리밍 및 연결 감시

| 변수 | 용도 |
|------|------|
| `CLAUDE_ENABLE_BYTE_WATCHDOG` | `1`로 강제 활성화, `0`으로 강제 비활성화 |
| `CLAUDE_ENABLE_BYTE_WATCHDOG_BEDROCK` | `1`로 설정 시 Bedrock에서 바이트 수준 감시 활성화 |
| `CLAUDE_ENABLE_STREAM_WATCHDOG` | `1`로 설정 시 이벤트 수준 스트리밍 유휴 감시 활성화 |
| `CLAUDE_STREAM_IDLE_TIMEOUT_MS` | 스트리밍 유휴 감시 타임아웃 (기본값/최소: 300000 = 5분) |

### 원격 및 클라우드

| 변수 | 용도 |
|------|------|
| `CCR_FORCE_BUNDLE` | `1`로 설정 시 `claude --remote`에서 GitHub 접근 가능해도 로컬 저장소 번들 강제 |
| `CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX` | Remote Control 세션 이름 자동 생성 시 접두사 |
| `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST` | 호스트 플랫폼이 설정 시 프로바이더 선택/엔드포인트/인증 변수 무시 |
| `IS_DEMO` | `1`로 설정 시 데모 모드 (이메일, 조직 이름 숨김, 온보딩 건너뛰기) |

### 플러그인 및 스킬

| 변수 | 용도 |
|------|------|
| `CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL` | `1`로 설정 시 공식 플러그인 마켓플레이스 자동 추가 건너뛰기 |
| `CLAUDE_CODE_DISABLE_POLICY_SKILLS` | `1`로 설정 시 시스템 수준 managed 스킬 디렉토리 로딩 건너뛰기 |
| `CLAUDE_CODE_SYNC_SKILLS` | `1`로 설정 시 첫 번째 쿼리 전 claude.ai 스킬 다운로드 |
| `CLAUDE_CODE_SYNC_SKILLS_WAIT_TIMEOUT_MS` | 초기 스킬 동기화 대기 타임아웃 (기본값: 5000) |
| `CLAUDE_CODE_SYNC_PLUGIN_INSTALL` | `1`로 설정 시 비대화형 모드에서 플러그인 설치 완료 대기 |
| `CLAUDE_CODE_SYNC_PLUGIN_INSTALL_TIMEOUT_MS` | 동기 플러그인 설치 타임아웃 (밀리초) |
| `CLAUDE_CODE_PLUGIN_CACHE_DIR` | 플러그인 루트 디렉토리 재정의 |
| `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS` | 플러그인 git 작업 타임아웃 (기본값: 120000) |
| `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE` | `1`로 설정 시 git pull 실패 시 기존 마켓플레이스 캐시 유지 |
| `CLAUDE_CODE_PLUGIN_PREFER_HTTPS` | `1`로 설정 시 GitHub 소스를 HTTPS로 클론 |
| `CLAUDE_CODE_PLUGIN_SEED_DIR` | 읽기 전용 플러그인 시드 디렉토리 경로 |
| `CLAUDE_CODE_ENABLE_BACKGROUND_PLUGIN_REFRESH` | `1`로 설정 시 비대화형 모드에서 백그라운드 플러그인 새로고침 |
| `FORCE_AUTOUPDATE_PLUGINS` | `1`로 설정 시 메인 자동 업데이트 비활성화 상태에서도 플러그인 자동 업데이트 강제 |
| `SLASH_COMMAND_TOOL_CHAR_BUDGET` | 스킬 메타데이터 문자 예산 재정의 |

### OpenTelemetry 모니터링

| 변수 | 용도 |
|------|------|
| `CLAUDE_CODE_ENABLE_TELEMETRY` | `1`로 설정 시 OpenTelemetry 데이터 수집 활성화 |
| `CLAUDE_CODE_OTEL_FLUSH_TIMEOUT_MS` | 대기 중인 OTel 스팬 플러시 타임아웃 (기본값: 5000) |
| `CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS` | 종료 시 OTel 익스포터 타임아웃 (기본값: 2000) |
| `CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS` | 동적 OTel 헤더 새로고침 간격 (기본값: 1740000 = 29분) |
| `OTEL_LOG_RAW_API_BODIES` | API 요청/응답 JSON을 로그 이벤트로 출력. `1` 또는 `file:<dir>` |
| `OTEL_LOG_TOOL_CONTENT` | `1`로 설정 시 도구 입출력 콘텐츠를 OTel 스팬 이벤트에 포함 |
| `OTEL_LOG_TOOL_DETAILS` | `1`로 설정 시 도구 인자, MCP 서버 이름, 오류 등을 OTel에 포함 |
| `OTEL_LOG_USER_PROMPTS` | `1`로 설정 시 사용자 프롬프트 텍스트를 OTel에 포함 |
| `OTEL_METRICS_INCLUDE_ACCOUNT_UUID` | `false`로 설정 시 메트릭에서 계정 UUID 제외 |
| `OTEL_METRICS_INCLUDE_ENTRYPOINT` | `true`로 설정 시 메트릭에 세션 엔트리포인트 포함 (v2.1.152+) |
| `OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES` | `false`로 설정 시 OTel 리소스 속성을 메트릭 라벨에서 제외 |
| `OTEL_METRICS_INCLUDE_SESSION_ID` | `false`로 설정 시 메트릭에서 세션 ID 제외 |
| `OTEL_METRICS_INCLUDE_VERSION` | `true`로 설정 시 메트릭에 Claude Code 버전 포함 |
| `CLAUDE_CODE_PROPAGATE_TRACEPARENT` | `1`로 설정 시 커스텀 프록시에 W3C 트레이스 컨텍스트 전파 |

### OAuth 인증

| 변수 | 용도 |
|------|------|
| `CLAUDE_CODE_OAUTH_TOKEN` | Claude.ai 인증용 OAuth 액세스 토큰. `/login` 대안 |
| `CLAUDE_CODE_OAUTH_REFRESH_TOKEN` | OAuth 리프레시 토큰. 자동화 환경에 유용 |
| `CLAUDE_CODE_OAUTH_SCOPES` | 리프레시 토큰에 발급된 OAuth 스코프 (공백 구분) |

### 기타

| 변수 | 용도 |
|------|------|
| `CLAUDE_CODE_API_KEY_HELPER_TTL_MS` | `apiKeyHelper` 사용 시 자격 증명 새로고침 간격 (밀리초) |
| `CLAUDE_CODE_EXTRA_BODY` | 모든 API 요청 본문의 최상위에 병합할 JSON 객체 |
| `CLAUDE_CODE_USE_NATIVE_FILE_SEARCH` | `1`로 설정 시 ripgrep 대신 Node.js 파일 API로 커스텀 명령/서브에이전트/출력 스타일 검색 |
| `USE_BUILTIN_RIPGREP` | `0`으로 설정 시 Claude Code 내장 `rg` 대신 시스템 설치된 `rg` 사용 |
| `CLAUDE_CODE_TMPDIR` | 내부 임시 파일에 사용할 임시 디렉토리 재정의 |
| `CLAUDE_CODE_GIT_BASH_PATH` | (Windows만) Git Bash 실행 파일 경로 |
| `CLAUDE_CODE_NEW_INIT` | `1`로 설정 시 `/init`이 대화형 설정 흐름 실행 |
| `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY` | `1`로 설정 시 게이트웨이의 `/v1/models`에서 `/model` 피커 채움 |
| `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION` | `false`로 설정 시 프롬프트 제안 비활성화 |
| `CLAUDE_CODE_ENABLE_AWAY_SUMMARY` | 세션 요약 가용성 재정의. `0`으로 끄기, `1`로 강제 켜기 |
| `CLAUDE_CODE_GLOB_HIDDEN` | `false`로 설정 시 Glob 결과에서 dotfiles 제외 |
| `CLAUDE_CODE_GLOB_NO_IGNORE` | `false`로 설정 시 Glob이 `.gitignore` 패턴 존중 |
| `CLAUDE_CODE_GLOB_TIMEOUT_SECONDS` | Glob 도구 파일 검색 타임아웃 (초, 기본값: 20) |
| `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS` | `1`로 설정 시 빌트인 git 워크플로우 지침 제거 |
| `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` | Stop/SubagentStop hook이 턴 종료를 연속 차단할 수 있는 최대 횟수 (기본값: 8) |
| `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` | SessionEnd hook 시간 예산 재정의 (밀리초) |
| `CLAUDE_CODE_DISABLE_INSTALLATION_CHECKS` | `1`로 설정 시 설치 경고 비활성화 |
| `CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE` | `1`로 설정 시 패키지 매니저 업그레이드 명령 백그라운드 자동 실행 허용 |
| `CLAUDE_CONFIG_DIR` | 구성 디렉토리 재정의 (기본값: `~/.claude`) |
| `CLAUDE_EFFORT` | 하위 프로세스에 자동 설정되는 현재 effort level |
| `FALLBACK_FOR_ALL_PRIMARY_MODELS` | 모든 기본 모델에서 반복 과부하 오류 시 `--fallback-model`로 폴백 트리거 |
| `CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH` | Claude Platform on AWS 클라이언트 측 인증 건너뛰기 |

---

## 설정 관리 명령어

기본적으로 `config`는 프로젝트 설정을 변경합니다. 글로벌 설정을 관리하려면 `--global` (또는 `-g`) 플래그를 사용합니다. `/config` 명령으로 대화형 설정 인터페이스를 열 수도 있습니다.

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `claude config list` | 설정 나열 | `claude config list` |
| `claude config get <키>` | 특정 설정 확인 | `claude config get theme` |
| `claude config set <키> <값>` | 설정 변경 | `claude config set theme dark` |
| `claude config add <키> <값>` | 리스트 설정에 추가 | `claude config add permissions.allow "Bash(git log:*)"` |
| `claude config remove <키> <값>` | 리스트 설정에서 제거 | `claude config remove permissions.allow "Bash(git log:*)"` |

### 글로벌 설정 예시

```bash
# 테마 변경
claude config set -g theme dark

# 알림 채널 변경
claude config set -g preferredNotifChannel terminal_bell

# 상세 모드 활성화
claude config set -g verbose true
```

---

## 민감한 파일 제외 방법

API 키, 시크릿, 환경 파일 등 민감한 정보가 포함된 파일에 Claude Code가 접근하지 못하도록 하려면 `.claude/settings.json`의 `permissions.deny` 설정을 사용합니다.

```json
{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Read(./config/credentials.json)",
      "Read(./build)"
    ]
  }
}
```

이 패턴과 일치하는 파일은 파일 검색 및 검색 결과에서 제외되며, 해당 파일에 대한 읽기 작업이 거부됩니다.

> 이 설정은 더 이상 사용되지 않는 `ignorePatterns` 구성을 대체합니다.

---

## 서브에이전트 구성

Claude Code는 사용자 및 프로젝트 수준에서 구성할 수 있는 커스텀 AI 서브에이전트를 지원합니다. 서브에이전트는 YAML 프론트매터가 포함된 Markdown 파일로 저장됩니다.

| 유형 | 위치 | 설명 |
|------|------|------|
| 사용자 서브에이전트 | `~/.claude/agents/` | 모든 프로젝트에서 사용 가능 |
| 프로젝트 서브에이전트 | `.claude/agents/` | 프로젝트별, 팀과 공유 가능 |

서브에이전트 파일은 커스텀 프롬프트와 도구 권한을 가진 전문화된 AI 어시스턴트를 정의합니다.

---

## Policy Helper

`policyHelper` 설정은 시작 시 managed 설정을 동적으로 계산하는 실행 파일을 가리킵니다. 관리자가 정적 파일 대신 디바이스 상태, 아이덴티티 또는 원격 서비스에서 정책을 파생할 수 있습니다. MDM 또는 시스템 `managed-settings.json`에서만 구성됩니다.

| 키 | 타입 | 설명 |
|----|------|------|
| `path` | string | helper 실행 파일의 절대 경로 |
| `timeoutMs` | number | helper 대기 시간 (실패 처리 기준) |
| `refreshIntervalMs` | number | 백그라운드에서 helper를 재실행할 간격. `0`으로 비활성화 또는 최소 `60000` |

helper는 stdout에 JSON을 출력합니다. 설정을 `managedSettings` 키 아래에 배치합니다:

```json
{
  "managedSettings": {
    "permissions": { "deny": ["Read(//etc/secrets/**)"] }
  },
  "claudeMd": "# Organization context\n...",
  "appendSystemPrompt": "Always cite the internal style guide."
}
```

---

## 플러그인 구성

Claude Code는 마켓플레이스를 통해 배포되는 플러그인 시스템을 지원합니다. 플러그인은 스킬, 에이전트, hook, MCP 서버로 기능을 확장합니다.

### `enabledPlugins`

플러그인 활성화/비활성화를 제어합니다. 형식: `"plugin-name@marketplace-name": true/false`.

```json
{
  "enabledPlugins": {
    "code-formatter@team-tools": true,
    "deployment-tools@team-tools": true,
    "experimental-features@personal": false
  }
}
```

### `extraKnownMarketplaces`

팀이 사용할 수 있는 추가 마켓플레이스를 정의합니다.

```json
{
  "extraKnownMarketplaces": {
    "acme-tools": {
      "source": {
        "source": "github",
        "repo": "acme-corp/claude-plugins"
      }
    }
  }
}
```

### 마켓플레이스 소스 유형

| 유형 | 필드 | 설명 |
|------|------|------|
| `github` | `repo` | GitHub 저장소 |
| `git` | `url` | 임의의 git URL |
| `directory` | `path` | 로컬 파일시스템 경로 (개발용) |
| `hostPattern` | `hostPattern` | 마켓플레이스 호스트 매칭용 정규식 |
| `settings` | `name`, `plugins` | `settings.json`에 인라인 선언 |

---

## 활성 설정 확인

Claude Code 내에서 `/status`를 실행하여 활성 설정 소스를 확인할 수 있습니다. Status 탭에 Claude Code가 현재 세션에 로드한 각 계층이 나열됩니다. Managed 설정이 적용 중인 경우 전달 채널도 표시됩니다 (예: `Enterprise managed settings (remote)`, `(plist)`, `(HKLM)`, `(file)`).

---

## 시스템 프롬프트

Claude Code의 내부 시스템 프롬프트는 공개되지 않습니다. 커스텀 지침을 추가하려면 `CLAUDE.md` 파일이나 `--append-system-prompt` 플래그를 사용하세요.

---

## 함께 보기

- [Permissions](https://code.claude.com/docs/en/permissions): 권한 시스템, 규칙 문법, 도구별 패턴, managed 정책
- [Authentication](https://code.claude.com/docs/en/authentication): Claude Code 사용자 접근 설정
- [Sandboxing](https://code.claude.com/docs/en/sandboxing): Bash 명령의 파일시스템 및 네트워크 격리
- [Hooks](https://code.claude.com/docs/en/hooks): 커스텀 권한 로직
- [Subagents](https://code.claude.com/docs/en/subagents): 서브에이전트 생성 및 사용
- [Plugins](https://code.claude.com/docs/en/plugins): 플러그인 시스템
