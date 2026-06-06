# 04. 플러그인 시스템 (Plugins)

> **원문**: [Create plugins](https://code.claude.com/docs/en/plugins) | [Plugins reference](https://code.claude.com/docs/en/plugins-reference) | [Discover plugins](https://code.claude.com/docs/en/discover-plugins) | [Plugin dependencies](https://code.claude.com/docs/en/plugin-dependencies) | [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)

---

## 1. 플러그인 개요

Claude Code 플러그인은 커스텀 commands, agents, skills, hooks, MCP 서버를 **하나의 패키지**로 묶어 프로젝트와 팀 간에 공유할 수 있게 해주는 시스템입니다. 마켓플레이스를 통해 설치하거나 직접 만들 수 있습니다.

### 독립형 설정 vs 플러그인

| 구분 | 스킬 이름 | 적합한 경우 |
|------|-----------|-------------|
| **독립형** (`.claude/` 디렉토리) | `/hello` | 개인 워크플로우, 프로젝트별 커스터마이징, 빠른 실험 |
| **플러그인** (`.claude-plugin/plugin.json` 포함) | `/plugin-name:hello` | 팀 공유, 커뮤니티 배포, 버전 관리, 다중 프로젝트 재사용 |

---

## 2. 플러그인 디렉토리 구조

```
enterprise-plugin/
├── .claude-plugin/plugin.json   # 매니페스트 (선택)
├── skills/                      # <name>/SKILL.md 구조의 스킬
├── commands/                    # 플랫 .md 스킬 (신규는 skills/ 권장)
├── agents/                      # 서브에이전트 마크다운
├── output-styles/               # 출력 스타일
├── themes/                      # 컬러 테마 (실험적)
├── monitors/monitors.json       # 백그라운드 모니터
├── hooks/hooks.json             # 훅 설정
├── bin/                         # Bash PATH에 추가되는 실행 파일
├── settings.json                # 기본 설정 (agent, subagentStatusLine)
├── .mcp.json                    # MCP 서버 정의
├── .lsp.json                    # LSP 서버 설정
└── scripts/                     # 훅 및 유틸리티 스크립트
```

컴포넌트 디렉토리(`skills/`, `agents/` 등)는 `.claude-plugin/` 내부가 아닌 **플러그인 루트**에 위치해야 합니다.

---

## 3. plugin.json 매니페스트 스키마

`.claude-plugin/plugin.json`은 플러그인의 메타데이터와 설정을 정의합니다. 매니페스트는 선택 사항이며, 생략 시 Claude Code가 기본 위치에서 컴포넌트를 자동 탐색하고 디렉토리 이름에서 플러그인 이름을 추론합니다.

### 스키마 예시

```json
{
  "name": "plugin-name",
  "displayName": "Plugin Name",
  "version": "1.2.0",
  "description": "플러그인에 대한 간단한 설명",
  "author": { "name": "Author Name", "email": "author@example.com" },
  "homepage": "https://docs.example.com/plugin",
  "repository": "https://github.com/author/plugin",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "defaultEnabled": true,
  "skills": "./custom/skills/",
  "commands": ["./custom/commands/special.md"],
  "agents": ["./custom/agents/reviewer.md"],
  "hooks": "./config/hooks.json",
  "mcpServers": "./mcp-config.json",
  "outputStyles": "./styles/",
  "lspServers": "./.lsp.json",
  "experimental": { "themes": "./themes/", "monitors": "./monitors.json" },
  "userConfig": {
    "api_endpoint": { "type": "string", "title": "API endpoint", "description": "..." },
    "api_token": { "type": "string", "title": "API token", "description": "...", "sensitive": true }
  },
  "channels": [
    { "server": "telegram", "userConfig": { "bot_token": { "type": "string", "sensitive": true, "title": "Bot token", "description": "..." } } }
  ],
  "dependencies": [
    "helper-lib",
    { "name": "secrets-vault", "version": "~2.1.0" }
  ]
}
```

### 필수 필드

매니페스트를 포함하는 경우 `name`만 필수입니다.

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `name` | string | 고유 식별자 (kebab-case, 공백 불가) | `"deployment-tools"` |

이 이름은 컴포넌트의 네임스페이스에 사용됩니다. 예를 들어, `plugin-dev` 플러그인의 `agent-creator` 에이전트는 UI에서 `plugin-dev:agent-creator`로 표시됩니다.

### 인식되지 않는 필드 (Unrecognized fields)

Claude Code는 인식할 수 없는 최상위 필드를 무시합니다. 다른 생태계(VS Code/Cursor 확장, npm `package.json`, MCPB/DXT)의 메타데이터를 유지해도 정상 로드됩니다. `claude plugin validate`는 경고로 보고하며, `--strict` 시 에러로 처리합니다.

### 메타데이터 필드

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `$schema` | string | JSON Schema URL. 편집기 자동완성 및 유효성 검사용. 로드 시 무시 | `"https://json.schemastore.org/claude-code-plugin-manifest.json"` |
| `displayName` | string | `/plugin` 피커 등 UI에 표시되는 이름. 생략 시 `name` 사용. 공백과 대소문자 허용. 네임스페이싱/조회에는 사용되지 않음 (v2.1.143+) | `"Deployment Tools"` |
| `version` | string | 시맨틱 버전. 설정하면 해당 버전 문자열로 고정되어, 범프할 때만 업데이트 수신. 생략 시 git commit SHA로 대체 | `"2.1.0"` |
| `description` | string | 플러그인 용도에 대한 간단한 설명 | `"Deployment automation tools"` |
| `author` | object | 작성자 정보 | `{"name": "Dev Team", "email": "dev@company.com"}` |
| `homepage` | string | 문서 URL | `"https://docs.example.com"` |
| `repository` | string | 소스코드 URL | `"https://github.com/user/plugin"` |
| `license` | string | 라이선스 식별자 | `"MIT"`, `"Apache-2.0"` |
| `keywords` | array | 검색/발견 태그 | `["deployment", "ci-cd"]` |
| `defaultEnabled` | boolean | 사용자가 별도 설정하지 않은 경우 활성화 상태로 시작할지 여부. 기본값 `true` (v2.1.154+) | `false` |

### 기본 활성화 (Default enablement)

`defaultEnabled: false`를 설정하면 플러그인이 비활성화 상태로 설치됩니다. 사용자는 `claude plugin enable <plugin>` 또는 `/plugin` 인터페이스로 활성화합니다. 외부 서비스에 연결되어 비용이나 범위가 추가되는 플러그인에 유용합니다.

`defaultEnabled`보다 우선하는 두 가지가 있습니다:

1. **사용자 설정**: `enabledPlugins`의 항목. 한 번 작성되면 플러그인 업데이트/재설치에도 유지됩니다.
2. **의존성 요구**: 다른 활성 플러그인이 요구하는 경우, 설치/활성화 시 `true`가 명시적으로 기록됩니다.

### 컴포넌트 경로 필드

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `skills` | string\|array | 커스텀 스킬 디렉토리. 기본 `skills/`에 추가로 로드 | `"./custom/skills/"` |
| `commands` | string\|array | 커스텀 flat `.md` 스킬 파일/디렉토리. 기본 `commands/`를 대체 | `"./custom/cmd.md"` 또는 `["./cmd1.md"]` |
| `agents` | string\|array | 커스텀 에이전트 파일. 기본 `agents/`를 대체 | `"./custom/agents/reviewer.md"` |
| `hooks` | string\|array\|object | 훅 설정 경로 또는 인라인 설정 | `"./my-extra-hooks.json"` |
| `mcpServers` | string\|array\|object | MCP 설정 경로 또는 인라인 설정 | `"./my-extra-mcp-config.json"` |
| `outputStyles` | string\|array | 커스텀 출력 스타일 파일/디렉토리. 기본 `output-styles/`를 대체 | `"./styles/"` |
| `lspServers` | string\|array\|object | LSP 설정. 코드 인텔리전스 (정의로 이동, 참조 찾기 등) | `"./.lsp.json"` |
| `experimental.themes` | string\|array | 컬러 테마 파일/디렉토리. 기본 `themes/`를 대체 (실험적) | `"./themes/"` |
| `experimental.monitors` | string\|array | 백그라운드 모니터 설정 (실험적) | `"./monitors.json"` |
| `userConfig` | object | 활성화 시 사용자에게 입력을 요청하는 설정 값 | 아래 참조 |
| `channels` | array | 메시지 주입 채널 선언 (Telegram, Slack, Discord 등) | 아래 참조 |
| `dependencies` | array | 이 플러그인이 의존하는 다른 플러그인. semver 버전 제약 선택 가능 | `[{ "name": "secrets-vault", "version": "~2.1.0" }]` |

#### 경로 동작 규칙

커스텀 경로가 기본 디렉토리를 대체하는지 추가하는지는 필드에 따라 다릅니다:

- **대체 (기본 스캔 안 함)**: `commands`, `agents`, `outputStyles`, `experimental.themes`, `experimental.monitors`
- **추가 (기본 스캔 + 커스텀)**: `skills`
- **고유 병합 규칙**: `hooks`, `mcpServers`, `lspServers`

모든 경로는 플러그인 루트에 상대적이어야 하며 `./`로 시작해야 합니다.

### 인라인 MCP 서버 정의

`plugin.json` 내에 MCP 서버를 직접 정의할 수도 있습니다.

```json
{
  "name": "my-plugin",
  "mcpServers": {
    "plugin-database": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
      "env": { "DB_PATH": "${CLAUDE_PLUGIN_ROOT}/data" }
    }
  }
}
```

### 사용자 설정 (userConfig)

`userConfig` 필드는 플러그인 활성화 시 사용자에게 값을 입력받도록 요청합니다. 위 스키마 예시를 참조하세요.

| 필드 | 필수 | 설명 |
|------|------|------|
| `type` | Yes | `string`, `number`, `boolean`, `directory`, `file` 중 하나 |
| `title` | Yes | 설정 대화상자에 표시되는 라벨 |
| `description` | Yes | 필드 아래에 표시되는 도움말 텍스트 |
| `sensitive` | No | `true`면 입력을 마스킹하고 값을 보안 저장소에 저장 |
| `required` | No | `true`면 빈 값일 때 유효성 검사 실패 |
| `default` | No | 사용자가 값을 제공하지 않을 때 사용할 기본값 |
| `multiple` | No | `string` 타입에서 문자열 배열 허용 |
| `min` / `max` | No | `number` 타입의 범위 제한 |

값은 MCP/LSP 설정, 훅/모니터 명령어에서 `${user_config.KEY}`로 치환됩니다. 모든 값은 서브프로세스에 `CLAUDE_PLUGIN_OPTION_<KEY>` 환경변수로 내보내집니다. 민감하지 않은 값은 `settings.json`에, 민감한 값은 시스템 키체인에 저장됩니다 (약 2KB 제한).

### 채널 (Channels)

`channels` 필드는 대화에 콘텐츠를 주입하는 메시지 채널을 선언합니다. 각 채널은 플러그인의 `mcpServers` 키(`server` 필드, 필수)에 바인딩됩니다. 선택적 채널별 `userConfig`로 활성화 시 bot token 등을 입력받습니다. 위 스키마 예시를 참조하세요.

### 플러그인 기본 에이전트 설정

`settings.json`에 `"agent": "security-reviewer"`를 설정하면 플러그인의 해당 에이전트를 기본 스레드로 활성화합니다. 현재 `agent` 및 `subagentStatusLine` 키만 지원됩니다. `settings.json`의 설정이 `plugin.json`의 `settings`보다 우선합니다.

### 환경 변수

Claude Code는 세 가지 경로 변수를 제공합니다. 스킬/에이전트 콘텐츠, 훅 명령어, 모니터 명령어, MCP/LSP 서버 설정에서 인라인 치환되며, 훅 프로세스 및 MCP/LSP 서버 서브프로세스에 환경변수로도 내보내집니다.

| 변수 | 설명 |
|------|------|
| `${CLAUDE_PLUGIN_ROOT}` | 플러그인 설치 디렉토리의 절대 경로. 업데이트 시 변경됨 |
| `${CLAUDE_PLUGIN_DATA}` | 업데이트를 견디는 영구 상태 디렉토리. `~/.claude/plugins/data/{id}/`. 언어 의존성(`node_modules` 등) 저장에 적합 |
| `${CLAUDE_PROJECT_DIR}` | 프로젝트 루트 디렉토리 |

훅 명령어에서는 `"${CLAUDE_PLUGIN_ROOT}"`처럼 큰따옴표로 감싸야 합니다. MCP 서버의 `env`에서는 변수가 자동 치환됩니다. 플러그인 업데이트 시 `CLAUDE_PLUGIN_ROOT` 경로가 변경되므로, 상태 저장에는 `CLAUDE_PLUGIN_DATA`를 사용하세요. 데이터 디렉토리는 마지막 설치 스코프에서 플러그인을 제거하면 자동 삭제됩니다.

### 실험적 컴포넌트

`experimental` 하위의 `themes`, `monitors`는 안정화 전까지 스키마가 변경될 수 있습니다. 최상위 선언도 동작하지만 `validate`가 경고하며, 향후 `experimental.*` 하위가 필수가 됩니다.

---

## 4. 설치 스코프

플러그인 설치 시 스코프를 선택하면, 플러그인의 가용 범위와 공유 대상이 결정됩니다.

| 스코프 | 설정 파일 | 용도 |
|--------|-----------|------|
| `user` | `~/.claude/settings.json` | 모든 프로젝트에서 사용 가능한 개인 플러그인 (기본값) |
| `project` | `.claude/settings.json` | 버전 관리를 통해 공유되는 팀 플러그인 |
| `local` | `.claude/settings.local.json` | 프로젝트 전용 플러그인, gitignore됨 |
| `managed` | 관리 설정 | 관리자가 설치한 플러그인 (읽기 전용, 업데이트만 가능) |

---

## 5. CLI 명령어 참조

### plugin init

`~/.claude/skills/<name>/`에 새 플러그인을 스캐폴딩합니다. 다음 세션부터 `<name>@skills-dir`로 자동 로드됩니다.

```bash
claude plugin init <name> [options]
```

**인수**:
- `<name>`: 플러그인 이름. 공백 및 경로 구분자 불가.

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--description <text>` | 매니페스트 설명 | |
| `--author <name>` | 작성자 이름 | `git config user.name` |
| `--author-email <email>` | 작성자 이메일 | `git config user.email` |
| `--with <components...>` | 함께 스캐폴딩할 컴포넌트. 값: `skills`, `agents`, `hooks`, `mcp`, `lsp`, `output-style`, `channel` | |
| `-f, --force` | 기존 `.claude-plugin/` 덮어쓰기 | |
| `-h, --help` | 도움말 표시 | |

별칭: `new`

각 `--with` 값별 스캐폴딩 내용:

| 컴포넌트 | 스캐폴딩 내용 |
|----------|---------------|
| `skills` | 기본 스킬 외에 추가 네임스페이스 `<name>:example` 스킬 |
| `agents` | `agents/` 서브에이전트 정의 |
| `hooks` | 샘플 이벤트 핸들러가 포함된 `hooks/hooks.json` |
| `mcp` | HTTP 및 stdio 서버 예시가 포함된 `.mcp.json` |
| `lsp` | `.lsp.json` 언어 서버 예시 |
| `output-style` | 플러그인 활성화 중 자동 적용되는 `output-styles/<name>.md` |
| `channel` | MCP 기반 채널: stdio 서버(`server.ts`), `.mcp.json`, `package.json` |

```bash
# 최소 플러그인 스캐폴딩
claude plugin init my-helper

# 스킬과 훅 폴더 포함
claude plugin init my-helper --with skills hooks

# 기존 스캐폴드 덮어쓰기
claude plugin init my-helper --force
```

### plugin install

마켓플레이스에서 플러그인을 설치합니다.

```bash
claude plugin install <plugin> [options]
```

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-s, --scope <scope>` | 설치 스코프: `user`, `project`, `local` | `user` |

```bash
# user 스코프에 설치 (기본값)
claude plugin install formatter@my-marketplace

# project 스코프에 설치 (팀 공유)
claude plugin install formatter@my-marketplace --scope project

# local 스코프에 설치 (gitignore)
claude plugin install formatter@my-marketplace --scope local
```

### plugin uninstall

설치된 플러그인을 제거합니다.

```bash
claude plugin uninstall <plugin> [options]
```

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-s, --scope <scope>` | 제거 스코프: `user`, `project`, `local` | `user` |
| `--keep-data` | 영구 데이터 디렉토리 보존 | |
| `--prune` | 더 이상 필요 없는 자동 설치 의존성도 함께 제거 | |
| `-y, --yes` | `--prune` 확인 프롬프트 건너뛰기 | |

별칭: `remove`, `rm`

기본적으로 마지막 스코프에서 제거 시 `${CLAUDE_PLUGIN_DATA}` 디렉토리도 삭제됩니다.

### plugin prune

더 이상 설치된 플러그인이 필요로 하지 않는 자동 설치 의존성을 제거합니다. 직접 설치한 플러그인은 제거되지 않습니다.

```bash
claude plugin prune [options]
```

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-s, --scope <scope>` | 정리 스코프 | `user` |
| `--dry-run` | 제거될 항목만 나열 (실제 제거 안 함) | |
| `-y, --yes` | 확인 프롬프트 건너뛰기 | |

별칭: `autoremove`. v2.1.121+ 필요.

### plugin enable / disable

플러그인을 활성화/비활성화합니다.

```bash
claude plugin enable <plugin> [-s <scope>]
claude plugin disable <plugin> [-s <scope>]
```

- **enable**: 의존성이 있는 경우 동일 스코프에서 전이적으로 활성화. 의존성 미설치 시 실패.
- **disable**: 다른 활성 플러그인이 의존 중이면 실패. 에러 메시지에 올바른 순서의 chained 명령어가 포함됨.

### plugin update

플러그인을 최신 버전으로 업데이트합니다.

```bash
claude plugin update <plugin> [-s <scope>]
```

### plugin list

설치된 플러그인 목록을 버전, 소스 마켓플레이스, 활성 상태와 함께 표시합니다.

```bash
claude plugin list [--json] [--available]
```

### plugin details

플러그인의 컴포넌트 인벤토리와 예상 토큰 비용을 표시합니다.

```bash
claude plugin details <name>
```

출력은 항상-on 토큰 비용(모든 세션에 추가)과 on-invoke 토큰 비용(컴포넌트 실행 시)을 구분하여 보여줍니다.

### plugin tag

플러그인의 릴리스 git 태그를 생성합니다. 플러그인 디렉토리 내에서 실행합니다.

```bash
claude plugin tag [--push] [--dry-run] [-f, --force]
```

---

## 6. 마켓플레이스

플러그인 마켓플레이스는 플러그인을 팀이나 커뮤니티에 배포하기 위한 카탈로그입니다. 중앙 집중식 발견, 버전 추적, 자동 업데이트를 제공하며 GitHub, GitLab, 로컬 경로 등 다양한 소스를 지원합니다.

### 마켓플레이스 추가

소스 유형별 추가 방법:

| 소스 | 명령어 | 비고 |
|------|--------|------|
| GitHub `owner/repo` | `/plugin marketplace add owner/repo` | 가장 간단한 방식 |
| GitHub + ref | `/plugin marketplace add owner/repo@v2.0` | 브랜치/태그 고정 |
| Git HTTPS | `/plugin marketplace add https://gitlab.com/company/plugins.git` | `.git` 접미사 생략 가능 |
| Git SSH | `/plugin marketplace add git@gitlab.com:company/plugins.git` | SSH 키 필요 |
| Git + ref | `/plugin marketplace add https://....git#v1.0.0` | `#ref`로 브랜치/태그 지정 |
| 로컬 경로 | `/plugin marketplace add ./my-marketplace` | 테스트에 유용 |
| 원격 URL | `/plugin marketplace add https://example.com/marketplace.json` | JSON 직접 호스팅 |

### 마켓플레이스 파일 작성

저장소 루트에 `.claude-plugin/marketplace.json`을 생성합니다.

```json
{
  "name": "company-tools",
  "owner": { "name": "DevTools Team", "email": "devtools@example.com" },
  "plugins": [
    { "name": "code-formatter", "source": "./plugins/formatter", "version": "2.1.0" },
    { "name": "deployment-tools", "source": { "source": "github", "repo": "company/deploy-plugin" } }
  ]
}
```

#### 마켓플레이스 스키마

| 필드 | 타입 | 설명 |
|------|------|------|
| `name` | string | 마켓플레이스 식별자 (kebab-case). `plugin install my-tool@your-marketplace`에서 사용 |
| `owner` | object | 유지보수 담당자 (`name` 필수, `email` 선택) |
| `plugins` | array | 플러그인 목록 (각 항목에 `name`, `source` 필수) |
| `description` | string | 설명 (선택) |
| `metadata.pluginRoot` | string | 상대 소스 경로 앞에 추가할 기본 디렉토리 (선택) |
| `allowCrossMarketplaceDependenciesOn` | array | 타 마켓플레이스 의존 허용 목록 (선택) |

#### 플러그인 엔트리 소스 유형

| 소스 | 타입 | 필드 | 비고 |
|------|------|------|------|
| 상대 경로 | `string` (`"./my-plugin"`) | 없음 | `./`로 시작. 마켓플레이스 루트 기준 |
| `github` | object | `repo`, `ref?`, `sha?` | GitHub 저장소 |
| `url` | object | `url`, `ref?`, `sha?` | Git URL 소스 |
| `git-subdir` | object | `url`, `path`, `ref?`, `sha?` | 모노레포 내 하위 디렉토리. sparse clone |
| `npm` | object | `package`, `version?`, `registry?` | npm 패키지 |

#### Strict mode

| 값 | 동작 |
|----|------|
| `true` (기본값) | `plugin.json`이 권위 있는 소스. 마켓플레이스 엔트리는 추가 컴포넌트를 보강 |
| `false` | 마켓플레이스 엔트리가 전체 정의. `plugin.json`의 컴포넌트 선언과 충돌 시 로드 실패 |

### 마켓플레이스 CLI 명령어

```bash
claude plugin marketplace add <source> [--scope user|project|local]  # 추가
claude plugin marketplace add acme-corp/monorepo --sparse .claude-plugin plugins  # 모노레포
claude plugin marketplace list [--json]        # 나열
claude plugin marketplace update [name]        # 새로고침

# 제거
claude plugin marketplace remove <name> [--scope user|project|local]
```

`remove`와 `update`는 seed로 관리되는 마켓플레이스에서는 실패합니다 (읽기 전용). seed 플러그인 변경은 관리자가 seed 이미지를 업데이트해야 합니다.

### 자동 업데이트 설정

공식 Anthropic 마켓플레이스는 자동 업데이트가 기본 활성화됩니다. 타사/로컬 마켓플레이스는 기본 비활성화입니다. `/plugin` 인터페이스의 Marketplaces 탭에서 개별적으로 전환할 수 있습니다. 관리자는 managed settings의 `extraKnownMarketplaces` 항목에 `"autoUpdate": true`를 설정할 수도 있습니다.

```bash
# Claude Code 자동 업데이트는 끄되 플러그인 자동 업데이트만 유지
export DISABLE_AUTOUPDATER=1
export FORCE_AUTOUPDATE_PLUGINS=1
```

### 공식 마켓플레이스

Anthropic은 두 개의 공개 마켓플레이스를 운영합니다.

| 마켓플레이스 | 설명 |
|-------------|------|
| `claude-plugins-official` | Anthropic이 큐레이션한 공식 플러그인. 모든 Claude Code 설치에 자동 포함 |
| `claude-community` | 커뮤니티 제출 플러그인. `/plugin marketplace add anthropics/claude-plugins-community`로 추가 |

공식 마켓플레이스에 포함된 주요 플러그인 카테고리:

| 카테고리 | 예시 플러그인 |
|----------|---------------|
| **코드 인텔리전스** | `pyright-lsp`, `typescript-lsp`, `rust-analyzer-lsp`, `gopls-lsp` 등 (LSP 기반) |
| **외부 통합** | `github`, `gitlab`, `atlassian`, `figma`, `vercel`, `sentry`, `slack` 등 |
| **보안 검토** | `security-guidance` (자동 보안 리뷰) |
| **개발 워크플로우** | `commit-commands`, `pr-review-toolkit`, `agent-sdk-dev`, `plugin-dev` |
| **출력 스타일** | `explanatory-output-style`, `learning-output-style` |

### 개인 저장소 인증

수동 설치/업데이트 시 기존 git 자격 증명 도우미를 사용합니다. 백그라운드 자동 업데이트는 자격 증명 도우미 없이 실행되므로 환경 변수로 토큰을 설정해야 합니다.

| 제공자 | 환경 변수 | 비고 |
|--------|-----------|------|
| GitHub | `GITHUB_TOKEN` 또는 `GH_TOKEN` | Personal access token 또는 GitHub App token |
| GitLab | `GITLAB_TOKEN` 또는 `GL_TOKEN` | Personal access token 또는 project token |
| Bitbucket | `BITBUCKET_TOKEN` | App password 또는 repository access token |

### 컨테이너용 플러그인 사전 구성

`CLAUDE_CODE_PLUGIN_SEED_DIR` 환경 변수로 빌드 시점에 플러그인을 미리 구성하면 런타임 클론 없이 사용할 수 있습니다.

```bash
# 빌드 시 시드에 설치
CLAUDE_CODE_PLUGIN_CACHE_DIR=/opt/claude-seed claude plugin install my-tool@your-plugins
# 런타임에서 시드 사용
export CLAUDE_CODE_PLUGIN_SEED_DIR=/opt/claude-seed
```

시드 디렉토리 구조: `known_marketplaces.json`, `marketplaces/<name>/`, `cache/<marketplace>/<plugin>/<version>/`

시드는 읽기 전용이며, 시드 마켓플레이스에 대한 `remove`/`update`는 실패합니다.

### 관리 마켓플레이스 제한

`strictKnownMarketplaces` (managed settings)로 마켓플레이스 추가를 제한합니다.

| 값 | 동작 |
|----|------|
| 정의되지 않음 (기본) | 제한 없음 |
| 빈 배열 `[]` | 전체 잠금 |
| 소스 목록 | 정확히 일치하는 마켓플레이스만 허용 |

`hostPattern`/`pathPattern`으로 정규식 패턴 매칭도 지원합니다. 개별 사용자나 프로젝트 설정으로 재정의할 수 없습니다.

### 버전 해석 및 릴리스 채널

플러그인 버전은 캐시 경로와 업데이트 감지를 결정합니다. Claude Code는 다음 순서로 버전을 해석합니다:

1. `plugin.json`의 `version`
2. 마켓플레이스 엔트리의 `version`
3. git commit SHA

릴리스 채널(예: stable/latest)을 지원하려면, 동일한 저장소의 서로 다른 ref를 가리키는 두 개의 마켓플레이스를 만들고, managed settings로 각 사용자 그룹에 할당합니다.

---

## 7. 팀 플러그인 워크플로우

플러그인을 저장소 수준에서 설정하여 팀 전체에 동일한 도구를 일관되게 제공할 수 있습니다. 팀원이 저장소를 신뢰(trust)하면 Claude Code가 자동으로 마켓플레이스와 플러그인을 설치합니다.

### 설정 방법

저장소의 `.claude/settings.json`에 `extraKnownMarketplaces`를 추가합니다.

```json
{
  "extraKnownMarketplaces": {
    "my-team-tools": {
      "source": {
        "source": "github",
        "repo": "your-org/claude-plugins"
      }
    }
  }
}
```

팀원이 저장소 폴더를 신뢰하면 플러그인이 자동 설치됩니다.

### 독립형 vs 플러그인 마이그레이션 비교

| 항목 | 독립형 (`.claude/`) | 플러그인 |
|------|---------------------|----------|
| 가용성 | 하나의 프로젝트에서만 | 마켓플레이스를 통해 공유 가능 |
| 파일 위치 | `.claude/commands/` | `plugin-name/commands/` |
| 훅 설정 | `settings.json` | `hooks/hooks.json` |
| 배포 | 수동 복사 | `/plugin install` |

---

## 8. 로컬 테스트

```bash
# 디렉토리에서 직접 로드
claude --plugin-dir ./my-plugin
# .zip 아카이브 (v2.1.128+)
claude --plugin-dir ./my-plugin.zip
# 원격 .zip 아카이브
claude --plugin-url https://example.com/my-plugin.zip
# 다중 플러그인
claude --plugin-url "https://example.com/my-plugin.zip https://example.com/other.zip"
```

동일한 이름의 설치된 마켓플레이스 플러그인이 있으면 로컬 복사본이 우선합니다 (관리 설정 강제 플러그인 제외).

### 실시간 리로드

```bash
/reload-plugins    # 플러그인, 스킬, 에이전트, 훅, MCP/LSP 서버 모두 리로드
```

`SKILL.md` 변경은 즉시 반영되지만, `hooks/`, `.mcp.json`, `agents/` 등은 `/reload-plugins` 또는 재시작이 필요합니다.

### skills 디렉토리에서 개발

`claude plugin init my-tool`로 `~/.claude/skills/my-tool/`에 플러그인을 스캐폴딩하면, 다음 세션부터 마켓플레이스 없이 `my-tool@skills-dir`로 자동 로드됩니다.

| 디렉토리 내용 | 역할 |
|---------------|------|
| `<skills-dir>/foo/SKILL.md` (매니페스트 없음) | 일반 스킬 `foo` |
| `<skills-dir>/foo/.claude-plugin/plugin.json` | 플러그인 `foo@skills-dir` |
| `<plugin>/skills/bar/SKILL.md` | 플러그인 내부 스킬 `bar` |

#### Skills-directory 플러그인 로드 위치

| Skills 디렉토리 | 스코프 | 로드 조건 |
|-----------------|--------|-----------|
| `~/.claude/skills/` | personal | 모든 프로젝트에서 로드 (추가 제약 없음) |
| `<cwd>/.claude/skills/` | project | 작업공간 신뢰 수락 후. MCP는 서버별 승인, 모니터는 로드 안 됨 |

프로젝트 스코프는 시작한 디렉토리의 `.claude/skills/`에서만 로드되며 저장소 루트까지 탐색하지 않습니다.

플러그인 중지: 폴더 삭제 또는 `claude plugin disable my-tool@skills-dir`. `uninstall`은 필요 없습니다.

---

## 9. 플러그인 의존성 (Plugin Dependencies)

플러그인은 `plugin.json` 또는 마켓플레이스 엔트리에 다른 플러그인을 의존성으로 선언할 수 있습니다. 기본적으로 의존성은 최신 버전을 추적하므로, 상위 릴리스가 플러그인을 예고 없이 변경할 수 있습니다. 버전 제약을 사용하면 테스트된 버전 범위에서 의존성을 고정할 수 있습니다.

### 의존성 선언

```json
{
  "name": "deploy-kit",
  "version": "3.1.0",
  "dependencies": [
    "audit-logger",
    { "name": "secrets-vault", "version": "~2.1.0" }
  ]
}
```

항목은 플러그인 이름만 있는 문자열 또는 버전 제약이 있는 객체일 수 있습니다:

| 필드 | 타입 | 설명 |
|------|------|------|
| `name` | string | 플러그인 이름. 동일 마켓플레이스 내에서 해결. 필수 |
| `version` | string | semver 범위 (예: `~2.1.0`, `^2.0`, `>=1.4`, `=2.1.0`) |
| `marketplace` | string | 다른 마켓플레이스에서 해결. 루트 마켓플레이스의 `allowCrossMarketplaceDependenciesOn`에 등록되어야 함 |

`version` 필드는 Node의 `semver` 패키지가 지원하는 모든 표현식을 허용합니다.

### 타 마켓플레이스 의존성

기본적으로 다른 마켓플레이스의 플러그인 자동 설치를 차단합니다. 루트 마켓플레이스의 `marketplace.json`에 `allowCrossMarketplaceDependenciesOn: ["acme-shared"]`를 설정해야 합니다.

### 버전 태깅

버전 제약은 마켓플레이스 저장소의 git 태그로 해결됩니다. 각 릴리스를 `{plugin-name}--v{version}` 형식으로 태그합니다. `claude plugin tag` 명령이 매니페스트/마켓플레이스 엔트리 버전 일치를 검증하고 태그를 생성합니다.

### 제약 조합 상호작용

여러 설치된 플러그인이 동일 의존성을 제약하는 경우, Claude Code는 범위를 교차하여 모두를 만족하는 최고 버전으로 해결합니다.

| 플러그인 A 요구 | 플러그인 B 요구 | 결과 |
|----------------|----------------|------|
| `^2.0` | `>=2.1` | 2.1.0 이상의 최고 2.x 태그 설치 |
| `~2.1` | `~3.0` | 플러그인 B 설치 실패 (`range-conflict`) |
| `=2.1.0` | 없음 | 2.1.0에 고정. 자동 업데이트 건너뜀 |

### 의존성이 있는 플러그인의 활성화/비활성화

활성화 시 의존성도 동일 스코프에서 전이적으로 활성화됩니다. 비활성화 시 다른 활성 플러그인이 여전히 의존 중이면 거부됩니다.

```bash
# secrets-vault 비활성화 실패 시 출력 예시
# secrets-vault is still required by deploy-kit. Disable that plugin first, or
# disable everything together: claude plugin disable deploy-kit@acme-tools && claude plugin disable secrets-vault@acme-tools
```

### 고아 의존성 정리

자동 설치된 의존성은 의존 플러그인 제거 후에도 디스크에 남습니다. 정리하려면:

```bash
# 고아 의존성 나열 및 제거
claude plugin prune

# 제거와 동시에 정리
claude plugin uninstall deploy-kit --prune
```

### 의존성 에러 해결

| 에러 | 해결 방법 |
|------|-----------|
| `dependency-unsatisfied` | 에러 메시지의 `claude plugin install` 명령어 실행 |
| `range-conflict` | 충돌하는 플러그인 중 하나 제거/업데이트 |
| `dependency-version-unsatisfied` | `claude plugin install <dependency>@<marketplace>` 재실행 |
| `no-matching-tag` | 상위 저장소 태그 확인 또는 범위 완화 |

---

## 10. 컴포넌트 타입 개요

플러그인은 다음 컴포넌트 타입을 포함할 수 있습니다.

| 컴포넌트 | 설명 | 위치 |
|----------|------|------|
| **Skills** | 모델이 자동으로 호출하는 확장 기능. `<name>/SKILL.md` 디렉토리, 플랫 `SKILL.md`, 또는 루트 `SKILL.md` (v2.1.142+ 단일 스킬 플러그인) | `skills/` |
| **Commands** | 커스텀 슬래시 명령어. 마크다운 파일로 정의. 신규는 `skills/` 권장 | `commands/` |
| **Agents** | 특정 작업에 특화된 커스텀 AI 서브에이전트. frontmatter에 `name`, `description`, `model`, `effort`, `maxTurns`, `tools`, `disallowedTools`, `skills`, `memory`, `background`, `isolation` 지원. 보안상 `hooks`, `mcpServers`, `permissionMode`는 플러그인 에이전트에서 미지원 | `agents/` |
| **Hooks** | 이벤트 기반 자동화 핸들러. `hooks/hooks.json` 또는 인라인으로 정의. `command`, `http`, `mcp_tool`, `prompt`, `agent` 타입 지원. 30개 이상의 이벤트 지원 | `hooks/` |
| **MCP 서버** | 외부 도구/데이터 접근 통합. `.mcp.json` 또는 `plugin.json` 인라인. 플러그인 활성화 시 자동 시작 | `.mcp.json` |
| **LSP 서버** | 언어 서버 프로토콜 기반 코드 인텔리전스. 자동 진단(편집 후 즉시 에러/경고) 및 코드 탐색(정의로 이동, 참조 찾기) 제공 | `.lsp.json` |
| **Monitors** | 백그라운드 로그/파일 감시. 세션 수명 동안 지속 실행. stdout 라인이 Claude에게 알림으로 전달. `always` 또는 `on-skill-invoke:<name>` 트리거 지원 (실험적, v2.1.105+) | `monitors/monitors.json` |
| **Output styles** | Claude 응답 방식 커스터마이징 | `output-styles/` |
| **Themes** | `/theme`에 표시되는 컬러 테마. `base` 프리셋과 `overrides` 맵 사용. 플러그인 테마는 읽기 전용이며 `Ctrl+E`로 로컬 복사본을 만들어 편집 가능 (실험적) | `themes/` |

### SKILL.md 포맷

스킬은 `SKILL.md` 파일을 포함한 디렉토리입니다. YAML frontmatter에 Claude가 언제 이 스킬을 사용할지 결정하는 `description`을 포함해야 합니다.

```
skills/
├── pdf-processor/
│   ├── SKILL.md
│   ├── reference.md      # 선택적 참조 파일
│   └── scripts/           # 선택적 지원 스크립트
└── code-reviewer/
    └── SKILL.md
```

SKILL.md 예시:

```markdown
---
description: Reviews code for best practices and potential issues. Use when reviewing code, checking PRs, or analyzing code quality.
---

When reviewing code, check for:
1. Code organization and structure
2. Error handling
3. Security concerns
4. Test coverage
```

v2.1.142+에서는 플러그인 루트에 `SKILL.md`가 있고 `skills/` 하위 디렉토리가 없으며 `skills` 매니페스트 필드도 없는 경우, 단일 스킬 플러그인으로 자동 로드됩니다. 스킬 호출 이름은 frontmatter의 `name` 필드를 사용하고, 없으면 디렉토리 베이스네임을 사용합니다.

---

## 11. 디버깅 및 문제 해결

`claude --debug`로 플러그인 로딩, 매니페스트 에러, 스킬/에이전트/훅 등록, MCP 초기화 정보를 확인합니다.

### 일반적인 문제 해결

| 문제 | 해결 방법 |
|------|-----------|
| 플러그인 로드 안 됨 | `claude plugin validate` 실행 |
| 스킬 미표시 | `skills/`가 `.claude-plugin/`이 아닌 플러그인 루트에 있는지 확인 |
| 훅 미실행 | `chmod +x script.sh` |
| MCP 서버 실패 | `${CLAUDE_PLUGIN_ROOT}` 변수 사용 |
| 경로 에러 | 모든 경로는 `./`로 시작하는 상대 경로 |
| LSP 바이너리 없음 | 해당 언어 서버 설치 |
| `/plugin` 인식 안 됨 | Claude Code 업데이트 |

### 검증 명령어

```bash
claude plugin validate ./my-plugin            # 유효성 검사
claude plugin validate ./my-plugin --strict   # CI용 (경고도 에러 처리)
```

### 플러그인 캐싱

마켓플레이스 플러그인은 `~/.claude/plugins/cache`에 복사됩니다. 각 버전은 별도 디렉토리에 저장되며, 이전 버전은 7일 후 자동 삭제됩니다. 플러그인 외부 파일 참조는 불가하며, 동일 마켓플레이스 내에서는 심볼릭 링크로 파일 공유가 가능합니다.

### 커뮤니티 제출

플러그인을 커뮤니티 마켓플레이스에 제출하려면:

1. 로컬에서 `claude plugin validate` 실행
2. 제출 폼 사용:
   - Claude.ai: claude.ai/settings/plugins/submit
   - Console: platform.claude.com/plugins/submit
3. 승인된 플러그인은 `anthropics/claude-plugins-community` 카탈로그에 특정 commit SHA로 고정됩니다.

커뮤니티 마켓플레이스 설치:

```bash
# 마켓플레이스 추가
/plugin marketplace add anthropics/claude-plugins-community

# 플러그인 설치
/plugin install <plugin-name>@claude-community
```

공식 마켓플레이스(`claude-plugins-official`)는 Anthropic이 자체적으로 큐레이션하며 별도의 신청 절차가 없습니다.

### 마켓플레이스 트러블슈팅

| 문제 | 원인 | 해결 방법 |
|------|------|-----------|
| 마켓플레이스 로드 안 됨 | URL 접근 불가 또는 `marketplace.json` 없음 | 경로 및 `.claude-plugin/marketplace.json` 존재 확인 |
| 플러그인 설치 실패 | 소스 URL 접근 불가 | GitHub 소스 공개 여부 또는 접근 권한 확인 |
| 설치 후 파일 없음 | 플러그인이 캐시에 복사됨 | 플러그인 디렉토리 외부 파일 참조 불가 |
| 스킬이 나타나지 않음 | 캐시 문제 | `rm -rf ~/.claude/plugins/cache` 후 재시작 및 재설치 |
| 개인 저장소 인증 실패 | 자격 증명 누락 | `GITHUB_TOKEN`/`GITLAB_TOKEN` 환경 변수 설정 |
| 오프라인에서 업데이트 실패 | git pull 실패 후 캐시 초기화 | `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE=1` 설정 |
| Git 작업 타임아웃 | 기본 120초 초과 | `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS=300000` 설정 |
| URL 기반 마켓플레이스에서 상대 경로 실패 | `marketplace.json`만 다운로드됨 | GitHub/npm/git URL 소스로 변경하거나 Git 기반 마켓플레이스 사용 |
| `/plugin` 명령어 인식 안 됨 | 구버전 | `claude --version` 확인 후 업데이트 |
| LSP 진단 오탐 (모노레포) | 워크스페이스 미설정 | Claude 편집 능력에는 영향 없음 |
