# 14. 빠른 시작 가이드 (Quickstart)

> **참조**: [Quickstart - Claude Code Docs](https://code.claude.com/docs/en/quickstart)

---

## 목차

- [시작하기 전에](#시작하기-전에)
- [1단계: Claude Code 설치](#1단계-claude-code-설치)
- [2단계: 계정 로그인](#2단계-계정-로그인)
- [3단계: 첫 세션 시작](#3단계-첫-세션-시작)
- [4단계: 첫 질문하기](#4단계-첫-질문하기)
- [5단계: 첫 코드 변경](#5단계-첫-코드-변경)
- [6단계: Git과 함께 사용](#6단계-git과-함께-사용)
- [7단계: 버그 수정 및 기능 추가](#7단계-버그-수정-및-기능-추가)
- [8단계: 다른 일반 워크플로우](#8단계-다른-일반-워크플로우)
- [필수 명령어](#필수-명령어)
- [초보자를 위한 팁](#초보자를-위한-팁)
- [다음 단계](#다음-단계)

---

## 시작하기 전에

- 터미널 또는 명령 프롬프트 열기
  - 터미널을 처음 사용한다면 [터미널 가이드](https://code.claude.com/docs/en/terminal-basics)를 확인하세요
- 작업할 코드 프로젝트 준비
- Claude 구독 (Pro, Max, Team, Enterprise), Console 계정, 또는 지원되는 클라우드 프로바이더 접근 권한

---

## 1단계: Claude Code 설치

### 네이티브 설치 (권장)

**macOS, Linux, WSL:**

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Windows PowerShell:**

```powershell
irm https://claude.ai/install.ps1 | iex
```

**Windows CMD:**

```cmd
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
```

> `The token '&&' is not a valid statement separator` 오류가 나타나면 PowerShell이 아닌 CMD에서 실행 중인 것입니다. 반대로 `'irm' is not recognized` 오류가 나타나면 CMD가 아닌 PowerShell에서 실행하세요.

> 네이티브 Windows에서는 **Git for Windows** 설치를 권장합니다. Claude Code가 Bash 도구를 사용할 수 있습니다. Git for Windows가 설치되어 있지 않으면 Claude Code는 PowerShell을 셸 도구로 대신 사용합니다. WSL 환경에서는 Git for Windows가 필요하지 않습니다.

### Homebrew (macOS)

```bash
# Stable 채널
brew install --cask claude-code

# Latest 채널
brew install --cask claude-code@latest
```

### WinGet (Windows)

```cmd
winget install Anthropic.ClaudeCode
```

> apt, dnf, apk를 통한 설치도 Debian, Fedora, RHEL, Alpine에서 지원됩니다.

---

## 2단계: 계정 로그인

```bash
claude
# 최초 실행 시 브라우저에서 로그인 프롬프트가 표시됩니다
```

### 지원 계정 유형

| 계정 | 설명 |
|------|------|
| **Claude Pro, Max, Team, Enterprise** | 권장 |
| **Claude Console** | API 접근 (선불 크레딧). 첫 로그인 시 "Claude Code" 워크스페이스가 자동 생성됨 |
| **Amazon Bedrock / Google Vertex AI / Microsoft Foundry** | 엔터프라이즈 클라우드 프로바이더 |

> 로그인 후 자격 증명이 저장되어 다시 로그인할 필요가 없습니다. 계정을 전환하려면 `/login`을 사용하세요.

---

## 3단계: 첫 세션 시작

```bash
cd /path/to/your/project
claude
```

시작하면 환영 화면, 최근 대화 목록, 최신 업데이트가 표시됩니다. `/help`를 입력하면 사용 가능한 명령어를 확인할 수 있고, `/resume`으로 이전 대화를 이어갈 수 있습니다.

---

## 4단계: 첫 질문하기

코드베이스 이해부터 시작:

```
> 이 프로젝트는 무엇을 하나요?
```

```
> 이 프로젝트는 어떤 기술을 사용하나요?
```

```
> 메인 진입점은 어디인가요?
```

```
> 폴더 구조를 설명해주세요
```

Claude 자체의 기능에 대해서도 질문할 수 있습니다:

```
> Claude Code에서 커스텀 스킬을 어떻게 만들죠?
```

```
> Claude Code는 Docker와 함께 작동하나요?
```

---

## 5단계: 첫 코드 변경

```
> 메인 파일에 hello world 함수를 추가해주세요
```

Claude Code가 다음을 수행합니다:
1. 적절한 파일 찾기
2. 제안된 변경사항 표시
3. 승인 요청
4. 편집 적용

---

## 6단계: Git과 함께 사용

```
> 어떤 파일을 변경했나요?
```

```
> 변경사항을 설명이 포함된 메시지로 커밋해주세요
```

```
> feature/quickstart라는 새 브랜치를 만들어주세요
```

```
> 최근 5개의 커밋을 보여주세요
```

```
> 머지 충돌을 해결하는 것을 도와주세요
```

---

## 7단계: 버그 수정 및 기능 추가

```
> 사용자 등록 폼에 입력값 검증을 추가해주세요
```

```
> 빈 폼이 제출되는 버그가 있어요 - 수정해주세요
```

Claude Code가 관련 코드를 찾고, 컨텍스트를 파악하여, 솔루션을 구현하고, 가능한 경우 테스트를 실행합니다.

---

## 8단계: 다른 일반 워크플로우

**코드 리팩토링**
```
> 인증 모듈을 콜백 대신 async/await를 사용하도록 리팩토링해주세요
```

**테스트 작성**
```
> 계산기 함수에 대한 단위 테스트를 작성해주세요
```

**문서 업데이트**
```
> README에 설치 지침을 업데이트해주세요
```

**코드 리뷰**
```
> 변경사항을 리뷰하고 개선점을 제안해주세요
```

---

## 필수 명령어

| 명령어 | 용도 | 예시 |
|--------|------|------|
| `claude` | 대화형 모드 시작 | `claude` |
| `claude "작업"` | 일회성 작업 실행 | `claude "빌드 에러 수정해줘"` |
| `claude -p "쿼리"` | 비대화형 쿼리 후 종료 | `claude -p "이 함수 설명해줘"` |
| `claude -c` | 최근 대화 이어서 | `claude -c` |
| `claude -r` | 이전 대화 선택 재개 | `claude -r` |
| `/clear` | 대화 기록 삭제 | `/clear` |
| `/help` | 사용 가능한 명령어 보기 | `/help` |
| `exit` 또는 Ctrl+D | Claude Code 종료 | `exit` |

---

## 초보자를 위한 팁

- 시작하기 전에 [일반 워크플로우](15-common-workflows.md)를 확인하세요
- 코드베이스 이해부터 시작한 뒤 점진적으로 복잡한 작업으로 넘어가세요
- Plan Mode(Shift+Tab)를 사용하면 안전하게 코드를 분석할 수 있습니다
- `#` 단축키로 빠르게 메모리에 규칙을 추가할 수 있습니다
- 이미지를 드래그 앤 드롭하거나 경로를 지정해 분석에 활용할 수 있습니다

---

## 다음 단계

기본기를 익혔다면 고급 기능을 탐색해보세요:

| 기능 | 설명 | 문서 |
|------|------|------|
| **일반 워크플로우** | 다양한 실전 활용법 | [일반 워크플로우](15-common-workflows.md) |
| **서브에이전트** | 특화된 AI 어시스턴트 | [서브에이전트](08-subagents.md) |
| **출력 스타일** | 응답 형식 커스터마이징 | [출력 스타일](17-output-styles.md) |
| **GitHub Actions** | CI/CD 자동화 | [GitHub Actions](12-github-actions.md) |
| **SDK** | 프로그래밍 통합 | [SDK](11-sdk.md) |

---

## 도움 받기

| 방법 | 설명 |
|------|------|
| Claude Code 내부 | `/help` 입력 또는 "어떻게..." 질문 |
| 공식 문서 | https://docs.anthropic.com/en/docs/claude-code |
| 커뮤니티 | Discord에서 팁과 지원 |
