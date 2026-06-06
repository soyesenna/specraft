# 플러그인 시스템

> Codex 플러그인 시스템은 스킬(Skills), 앱(Apps), MCP 서버를 하나의 배포 단위로 패키징하여 팀 간 재사용 가능한 워크플로를 제공합니다.

**참조:** [Plugins - Codex | OpenAI Developers](https://developers.openai.com/codex/plugins) | [Build plugins - Codex | OpenAI Developers](https://developers.openai.com/codex/plugins/build)

---

## 1. 플러그인 개요

플러그인은 Codex의 기능을 확장하는 설치 가능한 배포 단위입니다. 플러그인을 통해 다음을 수행할 수 있습니다:

- **스킬(Skills):** 특정 작업 유형에 대한 재사용 가능한 지시사항
- **앱(Apps):** GitHub, Slack, Google Drive 등 외부 도구와의 연동
- **MCP 서버:** Codex에 추가 도구나 공유 정보를 제공하는 서비스

### 기본 제공 플러그인 예시

| 플러그인 | 설명 |
|---|---|
| **Codex Security** | 인가된 코드를 스캔하고 취약점 발견을 확인하며 수정 사항을 준비 |
| **Gmail** | Codex가 Gmail을 읽고 관리할 수 있게 함 |
| **Google Drive** | Drive, Docs, Sheets, Slides 전반에서 작업 |
| **Slack** | 채널 요약 또는 답변 초안 작성 |
| **Sites** | 호스팅된 웹사이트, 웹 앱, 게임을 생성하고 배포 |

---

## 2. 플러그인 디렉토리 구조

모든 플러그인은 `.codex-plugin/plugin.json` 매니페스트 파일을 반드시 포함해야 합니다.

```
my-plugin/
├── .codex-plugin/
│   └── plugin.json          # 필수: 플러그인 매니페스트
├── skills/
│   └── my-skill/
│       └── SKILL.md         # 선택: 스킬 지시사항
├── hooks/
│   └── hooks.json           # 선택: 라이프사이클 훅
├── .app.json                # 선택: 앱 또는 커넥터 매핑
├── .mcp.json                # 선택: MCP 서버 설정
└── assets/                  # 선택: 아이콘, 로고, 스크린샷
```

- `.codex-plugin/plugin.json`만 `.codex-plugin/` 디렉토리에 속합니다.
- `skills/`, `hooks/`, `assets/`, `.mcp.json`, `.app.json`은 플러그인 루트에 위치합니다.

---

## 3. plugin.json 매니페스트 스키마

### 3.1 기본 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `name` | `string` | 플러그인 식별자 (kebab-case 권장) |
| `version` | `string` | 시맨틱 버전 (예: `"0.1.0"`) |
| `description` | `string` | 플러그인 설명 |
| `author` | `object` | 작성자 정보 (`name`, `email`, `url`) |
| `homepage` | `string` | 플러그인 홈페이지 URL |
| `repository` | `string` | 저장소 URL |
| `license` | `string` | 라이선스 (예: `"MIT"`) |
| `keywords` | `string[]` | 검색 키워드 |

### 3.2 컴포넌트 경로 필드

| 필드 | 설명 |
|---|---|
| `skills` | 스킬 디렉토리 경로 (예: `"./skills/"`) |
| `mcpServers` | MCP 서버 설정 파일 경로 (예: `"./.mcp.json"`) |
| `apps` | 앱 매핑 파일 경로 (예: `"./.app.json"`) |
| `hooks` | 훅 파일 경로 (예: `"./hooks/hooks.json"`) |

### 3.3 interface 필드

설치 화면에서 플러그인을 표시하는 방식을 제어합니다:

| 필드 | 설명 |
|---|---|
| `displayName` | 플러그인 표시 이름 |
| `shortDescription` | 짧은 설명 |
| `longDescription` | 상세 설명 |
| `developerName` | 개발자 이름 |
| `category` | 카테고리 (예: `"Productivity"`) |
| `capabilities` | 기능 배열 (예: `["Read", "Write"]`) |
| `websiteURL` | 웹사이트 URL |
| `privacyPolicyURL` | 개인정보 처리방침 URL |
| `termsOfServiceURL` | 서비스 약관 URL |
| `defaultPrompt` | 시작 프롬프트 배열 |
| `brandColor` | 브랜드 색상 (예: `"#10A37F"`) |
| `composerIcon` | 작성기 아이콘 경로 |
| `logo` | 로고 경로 |
| `screenshots` | 스크린샷 경로 배열 |

### 3.4 전체 매니페스트 예시

```json
{
  "name": "my-plugin",
  "version": "0.1.0",
  "description": "Bundle reusable skills and app integrations.",
  "author": {
    "name": "Your team",
    "email": "team@example.com",
    "url": "https://example.com"
  },
  "homepage": "https://example.com/plugins/my-plugin",
  "repository": "https://github.com/example/my-plugin",
  "license": "MIT",
  "keywords": ["research", "crm"],
  "skills": "./skills/",
  "mcpServers": "./.mcp.json",
  "apps": "./.app.json",
  "hooks": "./hooks/hooks.json",
  "interface": {
    "displayName": "My Plugin",
    "shortDescription": "Reusable skills and apps",
    "longDescription": "Distribute skills and app integrations together.",
    "developerName": "Your team",
    "category": "Productivity",
    "capabilities": ["Read", "Write"],
    "websiteURL": "https://example.com",
    "privacyPolicyURL": "https://example.com/privacy",
    "termsOfServiceURL": "https://example.com/terms",
    "defaultPrompt": [
      "Use My Plugin to summarize new CRM notes.",
      "Use My Plugin to triage new customer follow-ups."
    ],
    "brandColor": "#10A37F",
    "composerIcon": "./assets/icon.png",
    "logo": "./assets/logo.png",
    "screenshots": ["./assets/screenshot-1.png"]
  }
}
```

### 3.5 경로 규칙

- 모든 매니페스트 경로는 플러그인 루트에 상대적이며 `./`로 시작해야 합니다.
- `composerIcon`, `logo`, `screenshots` 등 시각 자산은 `./assets/`에 저장합니다.
- 플러그인 루트 내부에 있어야 합니다.

---

## 4. 마켓플레이스 시스템

마켓플레이스는 플러그인의 JSON 카탈로그입니다. Codex는 여러 소스에서 마켓플레이스 파일을 읽을 수 있습니다.

### 4.1 마켓플레이스 검색 위치

| 위치 | 용도 |
|---|---|
| `$REPO_ROOT/.agents/plugins/marketplace.json` | 저장소 범위 마켓플레이스 |
| `~/.agents/plugins/marketplace.json` | 개인 마켓플레이스 |
| `$REPO_ROOT/.claude-plugin/marketplace.json` | 레거시 호환 마켓플레이스 |

### 4.2 marketplace.json 스키마

```json
{
  "name": "local-example-plugins",
  "interface": {
    "displayName": "Local Example Plugins"
  },
  "plugins": [
    {
      "name": "my-plugin",
      "source": {
        "source": "local",
        "path": "./plugins/my-plugin"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Productivity"
    },
    {
      "name": "research-helper",
      "source": {
        "source": "local",
        "path": "./plugins/research-helper"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Productivity"
    }
  ]
}
```

**주요 필드 설명:**

| 필드 | 설명 |
|---|---|
| `name` | 마켓플레이스 식별자 |
| `interface.displayName` | Codex에 표시되는 마켓플레이스 제목 |
| `plugins[]` | 플러그인 항목 배열 |
| `plugins[].source.source` | 소스 타입 (`"local"` 또는 `"git-subdir"`) |
| `plugins[].source.path` | 플러그인 디렉토리 경로 (`./` 접두사) |
| `plugins[].policy.installation` | `AVAILABLE`, `INSTALLED_BY_DEFAULT`, `NOT_AVAILABLE` |
| `plugins[].policy.authentication` | `ON_INSTALL` 또는 첫 사용 시 |
| `plugins[].category` | 카테고리 분류 |

### 4.3 소스 타입

#### 로컬 소스 (local)

```json
{
  "source": {
    "source": "local",
    "path": "./plugins/my-plugin"
  }
}
```

또는 단순 문자열 경로:

```json
{
  "source": "./plugins/my-plugin"
}
```

#### Git 하위 디렉토리 소스 (git-subdir)

```json
{
  "name": "remote-helper",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/example/codex-plugins.git",
    "path": "./plugins/remote-helper",
    "ref": "main"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Productivity"
}
```

Git 기반 항목은 `ref` 또는 `sha` 선택자를 사용할 수 있습니다. Codex가 마켓플레이스 항목의 소스를 해석할 수 없는 경우 전체 마켓플레이스를 실패시키지 않고 해당 항목만 건너뜁니다.

### 4.4 CLI 관리 명령어

```bash
# 마켓플레이스 추가
codex plugin marketplace add owner/repo
codex plugin marketplace add owner/repo --ref main
codex plugin marketplace add https://github.com/example/plugins.git --sparse .agents/plugins
codex plugin marketplace add ./local-marketplace-root

# 마켓플레이스 관리
codex plugin marketplace list
codex plugin marketplace upgrade
codex plugin marketplace upgrade marketplace-name
codex plugin marketplace remove marketplace-name
```

마켓플레이스 소스는 GitHub 약식 표기(`owner/repo` 또는 `owner/repo@ref`), HTTP/HTTPS Git URL, SSH Git URL, 또는 로컬 마켓플레이스 루트 디렉토리일 수 있습니다.

- `--ref`: Git ref를 고정
- `--sparse PATH`: Git 기반 마켓플레이스 저장소에 대해 희소 체크아웃 사용 (반복 가능)

### 4.5 플러그인 설치 경로

Codex는 플러그인을 다음 경로에 설치합니다:

```
~/.codex/plugins/cache/$MARKETPLACE_NAME/$PLUGIN_NAME/$VERSION/
```

로컬 플러그인의 경우 `$VERSION`은 `local`이 되며, Codex는 마켓플레이스 항목에서 직접 로드하는 대신 이 캐시 경로에서 설치된 복사본을 로드합니다.

### 4.6 플러그인 활성화/비활성화

`~/.codex/config.toml`에서 개별 플러그인을 활성화/비활성화합니다:

```toml
[plugins."gmail@openai-curated"]
enabled = false
```

---

## 5. 플러그인 MCP 서버 설정

### 5.1 .mcp.json 직접 서버 맵

```json
{
  "docs": {
    "command": "docs-mcp",
    "args": ["--stdio"]
  }
}
```

### 5.2 mcp_servers 래핑 형식

```json
{
  "mcp_servers": {
    "docs": {
      "command": "docs-mcp",
      "args": ["--stdio"]
    }
  }
}
```

### 5.3 사용자 측 MCP 서버 정책 제어

설치 후 사용자는 플러그인의 MCP 서버를 활성화/비활성화하고 도구 승인 정책을 조정할 수 있습니다:

```toml
[plugins."my-plugin".mcp_servers.docs]
enabled = true
default_tools_approval_mode = "prompt"
enabled_tools = ["search"]

[plugins."my-plugin".mcp_servers.docs.tools.search]
approval_mode = "approve"
```

---

## 6. 플러그인 훅 번들링

### 6.1 기본 훅 파일

플러그인은 `hooks/hooks.json`에 라이프사이클 훅을 번들링할 수 있습니다:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 ${PLUGIN_ROOT}/hooks/session_start.py",
            "statusMessage": "Loading plugin context"
          }
        ]
      }
    ]
  }
}
```

### 6.2 매니페스트를 통한 훅 경로 지정

`.codex-plugin/plugin.json`에서 `hooks` 필드를 사용하여 기본 `hooks/hooks.json`을 재정의할 수 있습니다:

```json
{
  "name": "repo-policy",
  "hooks": ["./hooks/session.json", "./hooks/tools.json"]
}
```

매니페스트 훅 경로는 다른 컴포넌트 경로와 동일한 규칙을 따릅니다: `./`로 시작, 플러그인 루트에 상대적, 플러그인 루트 내부에 위치.

### 6.3 PLUGIN_ROOT, PLUGIN_DATA 환경변수

플러그인 훅 명령은 다음 Codex 전용 환경변수를 받습니다:

| 환경변수 | 설명 |
|---|---|
| `PLUGIN_ROOT` | 설치된 플러그인 루트 경로 |
| `PLUGIN_DATA` | 플러그인의 쓰기 가능한 데이터 디렉토리 경로 |
| `CLAUDE_PLUGIN_ROOT` | `PLUGIN_ROOT`의 호환성 별칭 |
| `CLAUDE_PLUGIN_DATA` | `PLUGIN_DATA`의 호환성 별칭 |

---

## 7. 플러그인 훅 신뢰 모델

**플러그인 훅은 자동으로 신뢰되지 않습니다.** 플러그인 설치 또는 활성화만으로는 훅이 자동 실행되지 않습니다. 플러그인 번들 훅은 비관리(non-managed) 훅으로 간주되며, 사용자가 현재 훅 정의를 검토하고 신뢰할 때까지 Codex가 이를 건너뜁니다.

CLI에서 `/hooks`를 사용하여 훅 소스를 검사하고 신뢰할 수 있습니다.

---

## 8. 플러그인 설치 및 사용

### 8.1 Codex 앱에서

1. **Plugins** 열기 -> 플러그인 탐색
2. 플러그인 세부정보 열기 -> 설치 버튼 선택
3. 외부 앱 연결이 필요한 경우 프롬프트에 따라 인증
4. 새 스레드에서 플러그인 사용

### 8.2 CLI에서

```bash
codex
/plugins
```

CLI 플러그인 브라우저에서 마켓플레이스별로 그룹화된 플러그인을 탐색하고, `Space` 키로 활성화 상태를 전환합니다.

### 8.3 프롬프트에서 사용

- **작업 직접 설명:** "Summarize unread Gmail threads from today"
- **특정 플러그인 선택:** `@`를 입력하여 플러그인 또는 스킬을 명시적으로 호출

---

## 9. 플러그인 제거

플러그인 브라우저에서 다시 열어 **Uninstall plugin**을 선택합니다. 플러그인을 제거하면 Codex에서 번들이 제거되지만, 번들된 앱은 ChatGPT에서 별도로 관리해야 합니다.

비활성화만 하려면:

```toml
[plugins."gmail@openai-curated"]
enabled = false
```

---

## 10. 워크스페이스 공유

1. Codex 앱에서 **Plugins** 열기
2. **Created by you**에서 플러그인 세부정보 열기
3. **Share** 선택
4. 워크스페이스 멤버 추가 또는 공유 링크 복사

공유된 플러그인은 **Shared with you**에서 찾을 수 있습니다. 로컬 플러그인의 워크스페이스 공유는 공개 플러그인 디렉토리에 게시되지 않습니다.

관리자가 플러그인 공유를 비활성화하려면 `requirements.toml`에 추가:

```toml
plugin_sharing = false
```
