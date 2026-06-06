# Codex IDE Extension - IDE 확장 전체 가이드

> VS Code, Cursor, Windsurf, JetBrains IDE에서 Codex를 사용하는 방법에 대한 종합 가이드

**참조**: [developers.openai.com/codex/ide](https://developers.openai.com/codex/ide) | [developers.openai.com/codex/ide/features](https://developers.openai.com/codex/ide/features) | [developers.openai.com/codex/ide/settings](https://developers.openai.com/codex/ide/settings) | [developers.openai.com/codex/ide/commands](https://developers.openai.com/codex/ide/commands) | [developers.openai.com/codex/ide/slash-commands](https://developers.openai.com/codex/ide/slash-commands)

---

## 1. 개요

**Codex IDE Extension**은 VS Code 및 그 포크(fork) 에디터, JetBrains IDE에서 Codex 에이전트를 사이드바에서 직접 사용할 수 있게 해주는 확장입니다. CLI와 동일한 에이전트를 사용하며, `~/.codex/config.toml` 설정을 공유합니다.

### 1.1 지원 IDE 및 플랫폼

| IDE | 다운로드 | 비고 |
| --- | --- | --- |
| **Visual Studio Code** | VS Code Marketplace | 기본 지원, 오른쪽 사이드바에 자동 표시 |
| **Cursor** | 별도 다운로드 | VS Code 포크. 수동으로 오른쪽 사이드바 이동 필요 |
| **Windsurf** | 별도 다운로드 | VS Code 포크 |
| **Visual Studio Code Insiders** | 별도 다운로드 | Insiders 빌드 지원 |
| **JetBrains IDE** (Rider, IntelliJ, PyCharm, WebStorm) | JetBrains Marketplace | ChatGPT 계정, API 키, JetBrains AI 구독으로 로그인 |

| 플랫폼 | 지원 여부 | 비고 |
| --- | --- | --- |
| **macOS** | 지원 | |
| **Windows** | 지원 | Windows 샌드박스 네이티브 또는 WSL2 사용 가능 |
| **Linux** | 지원 | |

### 1.2 설치 및 로그인

1. VS Code Marketplace 또는 위 표의 다운로드 링크에서 확장을 설치합니다.
2. 설치 후 에디터를 재시작합니다(VS Code의 경우 필수).
3. 사이드바에 Codex가 나타나면 ChatGPT 계정 또는 API 키로 로그인합니다.
4. ChatGPT 플랜(Plus, Pro, Business, Edu, Enterprise)에 사용 크레딧이 포함되어 있어 별도 설정 없이 사용할 수 있습니다.

> **참고**: Windows에서 `chatgpt.runCodexInWindowsSubsystemForLinux` 설정을 켜면 WSL2 환경에서 실행됩니다. 그렇지 않으면 Windows 샌드박스에서 네이티브로 실행됩니다.

### 1.3 Cursor에서 사이드바 설정

Cursor에서는 액티비티 바가 기본적으로 수평 방향으로 표시되어 Codex가 숨겨질 수 있습니다.

1. 에디터 설정에서 `activity bar`를 검색합니다 (Workbench 설정).
2. 방향을 `vertical`로 변경합니다.
3. 에디터를 재시작합니다.
4. Codex 아이콘을 오른쪽 사이드바로 드래그합니다.
5. 액티비티 바 방향을 `horizontal`로 복원합니다.

### 1.4 확장 업데이트

확장은 자동으로 업데이트됩니다. 수동 확인 시 IDE의 확장 페이지에서 업데이트를 확인할 수 있습니다.

---

## 2. 기능

Codex IDE Extension은 에디터 내에서 채팅, 코드 편집, 변경 사항 미리보기를 원활하게 수행할 수 있게 합니다. 열려 있는 파일과 선택된 코드가 자동으로 컨텍스트에 포함되므로, 더 짧은 프롬프트로 더 빠르고 관련성 높은 결과를 얻을 수 있습니다.

### 2.1 파일 참조 (`@file`)

프롬프트에서 `@` 기호로 파일을 참조할 수 있습니다.

```
Use @example.tsx as a reference to add a new page named "Resources" to the app that contains a list of resources defined in @resources.ts
```

### 2.2 모델 전환

채팅 입력창 하단의 모델 전환기(switcher)로 모델을 변경할 수 있습니다. 각 모델의 강점에 따라 적절히 선택합니다.

### 2.3 추론 노력 조절 (`reasoning effort`)

추론 노력을 `low`, `medium`, `high` 중에서 선택할 수 있습니다.

| 수준 | 설명 |
| --- | --- |
| `low` | 빠른 응답. 단순 작업에 적합 |
| `medium` | 기본값. 대부분의 작업에 적합 |
| `high` | 깊은 추론. 복잡한 작업에 적합. 토큰 소비량 증가 |

`high`는 더 많은 토큰을 소비하며, 특히 고성능 모델에서 rate limit에 더 빨리 도달할 수 있습니다. `medium`으로 시작하여 필요할 때만 `high`로 전환하는 것을 권장합니다.

### 2.4 승인 모드 (Approval Mode)

| 모드 | 설명 |
| --- | --- |
| **Chat** | 코드 편집 없이 대화만. 계획 수립 시 유용 |
| **Agent** (기본값) | 작업 디렉터리 내에서 파일 읽기, 편집, 명령 실행을 자동으로 수행. 작업 디렉터리 밖이나 네트워크 접근 시 승인 필요 |
| **Agent (Full Access)** | 네트워크 접근을 포함한 모든 작업을 승인 없이 수행. 주의 필요 |

채팅 입력창 하단의 전환기로 모드를 변경합니다.

### 2.5 클라우드 작업 위임

더 오래 걸리는 작업을 Codex Cloud에 위임할 수 있습니다.

1. 클라우드 환경을 설정합니다.
2. 환경을 선택하고 **Run in the cloud**를 클릭합니다.
3. `main`에서 시작(새 아이디어 시작)하거나 로컬 변경 사항에서 시작(작업 마무리)할 수 있습니다.

클라우드 작업을 로컬 대화에서 시작하면, Codex가 대화 컨텍스트를 기억하여 이어서 작업합니다. 클라우드 변경 사항을 미리 보고, 후속 작업을 클라우드에서 실행하거나 로컬에 diff를 적용하여 테스트할 수 있습니다.

### 2.6 웹 검색

Codex는 자체 웹 검색 도구를 제공합니다.

| 설정 | 동작 |
| --- | --- |
| **기본 (캐시 모드)** | OpenAI가 관리하는 웹 결과 인덱스에서 사전 인덱싱된 결과를 반환. 임의 라이브 콘텐츠로부터의 prompt injection 노출 감소 |
| **Full Access 모드** | 라이브 결과로 전환. 가장 최신 데이터를 가져옴 |

웹 검색 결과는 신뢰할 수 없는(untrusted) 것으로 취급해야 합니다. `web_search` 항목이 트랜스크립트나 `codex exec --json` 출력에 표시됩니다.

웹 검색 비활성화 또는 라이브 결과 전환은 Config basics에서 설정할 수 있습니다.

### 2.7 이미지 첨부

프롬프트 작성기에 이미지를 드래그 앤 드롭하여 컨텍스트로 포함할 수 있습니다.

> **주의**: VS Code에서 이미지를 드롭할 때 `Shift` 키를 누른 상태로 드롭해야 합니다. 그렇지 않으면 VS Code가 확장의 드롭을 차단합니다.

### 2.8 이미지 생성

에디터를 떠나지 않고 이미지를 생성하거나 편집할 수 있습니다.

| 항목 | 설명 |
| --- | --- |
| **용도** | UI 에셋, 레이아웃, 일러스트레이션, 스프라이트 시트, 플레이스홀더 등 |
| **사용 모델** | `gpt-image-2` |
| **호출 방법** | 자연어로 요청하거나 프롬프트에 `$imagegen` 포함 |
| **참조 이미지** | 기존 에셋을 변환하거나 확장할 때 프롬프트에 참조 이미지 추가 |

| 비고 | 설명 |
| --- | --- |
| **사용량** | 일반 Codex 사용 한도에 포함. 이미지 생성 없는 유사 작업 대비 한도를 평균 3~5배 더 빨리 소모 |
| **대량 생성** | 대량 이미지 생성 시 환경 변수에 `OPENAI_API_KEY`를 설정하고 API를 통해 생성하면 API 요금이 적용됨 |

---

## 3. 설정

### 3.1 설정 변경 방법

1. 에디터 설정을 엽니다.
2. `Codex` 또는 설정 이름을 검색합니다.
3. 값을 업데이트합니다.

### 3.2 IDE 확장 설정

Codex IDE Extension은 Codex CLI를 사용합니다. 기본 모델, 승인, 샌드박스 설정 등은 에디터 설정이 아닌 공유 `~/.codex/config.toml` 파일에서 구성합니다.

확장은 VS Code의 내장 chat font 설정도 Codex 대화 표면에 적용합니다.

### 3.3 설정 레퍼런스

| 설정 | 설명 |
| --- | --- |
| `chat.fontSize` | Codex 사이드바의 채팅 텍스트 크기 (대화 콘텐츠 및 작성기 포함) |
| `chat.editor.fontSize` | Codex 대화 내 코드 렌더링 크기 (코드 스니펫 및 diff 포함) |
| `chatgpt.cliExecutable` | 개발 전용: Codex CLI 실행 파일 경로. 활성 개발 중이 아닌 한 설정 불필요. 수동 설정 시 일부 기능이 예상과 다르게 동작할 수 있음 |
| `chatgpt.commentCodeLensEnabled` | TODO 주석 위에 CodeLens를 표시하여 Codex로 완료할 수 있게 함 |
| `chatgpt.localeOverride` | Codex UI의 선호 언어. 비워두면 자동 감지 |
| `chatgpt.openOnStartup` | 확장 시작 완료 시 Codex 사이드바에 포커스 |
| `chatgpt.runCodexInWindowsSubsystemForLinux` | Windows 전용: WSL 사용 가능 시 WSL에서 Codex 실행. 리포지토리와 도구가 WSL2에 있거나 Linux 네이티브 도구가 필요한 경우 사용. 그 외에는 Windows 샌드박스에서 네이티브 실행. 변경 시 VS Code가 리로드됨 |

### 3.4 config.toml 연동

IDE 확장은 CLI와 동일한 `~/.codex/config.toml`을 공유합니다. 다음 항목은 config.toml에서 설정합니다.

| config.toml 항목 | 설명 |
| --- | --- |
| 기본 모델 | `model` 필드로 기본 모델 지정 |
| 승인 설정 | `approvals` 관련 설정 |
| 샌드박스 설정 | `sandbox` 관련 설정 |
| 웹 검색 | 웹 검색 활성화/비활성화 및 라이브/캐시 전환 |

> 자세한 config.toml 설정은 [03-config-reference.md](./03-config-reference.md)를 참조하세요.

---

## 4. IDE 명령어

에디터의 **Command Palette**에서 사용할 수 있는 Codex 명령어입니다. 키보드 단축키로 바인딩할 수 있습니다.

### 4.1 단축키 바인딩 방법

1. Command Palette를 엽니다 (macOS: `Cmd+Shift+P`, Windows/Linux: `Ctrl+Shift+P`).
2. **Preferences: Open Keyboard Shortcuts**를 실행합니다.
3. `Codex` 또는 명령어 ID(예: `chatgpt.newChat`)를 검색합니다.
4. 연필 아이콘을 선택하고 원하는 단축키를 입력합니다.

또는 Codex 채팅의 설정 아이콘에서 **Keyboard shortcuts**를 선택할 수도 있습니다.

### 4.2 명령어 레퍼런스

| 명령어 | 기본 단축키 | 설명 |
| --- | --- | --- |
| `chatgpt.addToThread` | - | 선택한 텍스트 범위를 현재 스레드의 컨텍스트로 추가 |
| `chatgpt.addFileToThread` | - | 전체 파일을 현재 스레드의 컨텍스트로 추가 |
| `chatgpt.newChat` | macOS: `Cmd+N`, Windows/Linux: `Ctrl+N` | 새 스레드 생성 |
| `chatgpt.implementTodo` | - | 선택한 TODO 주석을 Codex가 처리하도록 요청 |
| `chatgpt.newCodexPanel` | - | 새 Codex 패널 생성 |
| `chatgpt.openSidebar` | - | Codex 사이드바 패널 열기 |

---

## 5. 슬래시 명령어

슬래시 명령어는 채팅 입력창을 벗어나지 않고 Codex를 제어할 수 있게 합니다.

### 5.1 사용 방법

1. Codex 채팅 입력창에 `/`를 입력합니다.
2. 목록에서 명령어를 선택하거나 계속 입력하여 필터링합니다 (예: `/status`).
3. **Enter**를 누릅니다.

### 5.2 슬래시 명령어 레퍼런스

| 슬래시 명령어 | 설명 |
| --- | --- |
| `/auto-context` | Auto Context를 켜거나 끕니다. 켜면 최근 파일과 IDE 컨텍스트가 자동으로 포함됩니다 |
| `/cloud` | 클라우드 모드로 전환하여 작업을 원격으로 실행합니다 (클라우드 접근 필요) |
| `/cloud-environment` | 사용할 클라우드 환경을 선택합니다 (클라우드 모드에서만 사용 가능) |
| `/feedback` | 피드백 대화상자를 열어 피드백을 제출합니다. 로그 포함 가능 |
| `/local` | 로컬 모드로 전환하여 작업을 워크스페이스에서 실행합니다 |
| `/review` | 코드 리뷰 모드를 시작합니다. 커밋되지 않은 변경 사항을 리뷰하거나 base 브랜치와 비교합니다 |
| `/status` | 스레드 ID, 컨텍스트 사용량, rate limit을 표시합니다 |

---

## 6. CLI와의 차이점

IDE Extension과 CLI는 동일한 Codex 에이전트를 사용하고 `~/.codex/config.toml`을 공유하지만, 인터페이스와 기능에 차이가 있습니다.

| 항목 | IDE Extension | CLI |
| --- | --- | --- |
| **실행 환경** | 에디터 사이드바 (VS Code, Cursor, Windsurf, JetBrains) | 터미언르 풀스크린 TUI |
| **설치 방식** | VS Code Marketplace / JetBrains Marketplace | `curl -fsSL https://chatgpt.com/codex/install.sh \| sh` 또는 npm/homebrew |
| **오픈소스** | 아니요 | 예 (Rust 기반) |
| **인터페이스** | 그래픽 사이드바 패널 | 터미언l 텍스트 UI |
| **파일 컨텍스트** | 열린 파일, 선택 영역, `@file` 참조 자동 포함 | 수동으로 디렉터리 내 파일에 접근 |
| **이미지 입력** | 드래그 앤 드롭 (`Shift` 키 필요) | 스크린샷/디자인 스펙 첨부 |
| **모델 전환** | 채팅 입력창 하단 전환기 | `/model` 명령어 |
| **승인 모드 전환** | 채팅 입력창 하단 전환기 | 시작 시 선택 또는 CLI 옵션 |
| **클라우드 작업** | IDE 내에서 실행, 진행 추적, diff 로컬 적용 | CLI에서 실행, 터미널에서 진행 추적 |
| **Command Palette** | `chatgpt.*` 명령어 + 키보드 단축키 바인딩 | 해당 없음 |
| **슬래시 명령어** | `/auto-context`, `/cloud`, `/cloud-environment`, `/feedback`, `/local`, `/review`, `/status` | 별도의 CLI 슬래시 명령어 세트 |
| **스크립팅** | 제한적 | `codex exec` 명령어로 자동화 워크플로우 스크립팅 가능 |
| **Subagent** | 지원 | `/subagent`로 병렬 작업 수행 |
| **코드 리뷰** | `/review` 슬래시 명령어 | 별도 에이전트로 로컬 코드 리뷰 수행 |
| **설정 공유** | `~/.codex/config.toml` 공유 | `~/.codex/config.toml` 공유 |
| **MCP** | config.toml에서 설정 | config.toml에서 설정 |
| **웹 검색** | 기본 캐시 모드, Full Access 시 라이브 | CLI 설정에 따름 |
