# 12. GitHub Actions 통합

> **참조**: [Claude Code GitHub Actions](https://code.claude.com/docs/en/github-actions) | [Claude Code GitLab CI/CD](https://code.claude.com/docs/en/gitlab-ci-cd) | [GitHub Actions - Anthropic](https://docs.anthropic.com/en/docs/claude-code/github-actions)

---

## 목차

- [GitHub Actions 개요](#github-actions-개요)
- [주요 기능](#주요-기능)
- [Claude가 할 수 있는 일](#claude가-할-수-있는-일)
- [설정 방법](#설정-방법)
- [Beta에서 GA로 업그레이드](#beta에서-ga로-업그레이드)
- [Action 매개변수 v1](#action-매개변수-v1)
- [claude_args 사용법](#claude_args-사용법)
- [스킬 사용](#스킬-사용)
- [대체 통합 방법](#대체-통합-방법)
- [Claude 동작 커스터마이징](#claude-동작-커스터마이징)
- [AWS Bedrock / Google Vertex AI 사용](#aws-bedrock--google-vertex-ai-사용)
- [보안 고려사항](#보안-고려사항)
- [비용 최적화 팁](#비용-최적화-팁)
- [문제 해결](#문제-해결)
- [GitLab CI/CD 통합](#gitlab-cicd-통합)

---

## GitHub Actions 개요

Claude Code GitHub Actions는 GitHub 워크플로우에 AI 자동화를 제공합니다. PR이나 이슈에서 `@claude` 멘션만으로 Claude가 코드를 분석하고, PR을 생성하며, 기능을 구현하고, 버그를 수정할 수 있습니다. 트리거 없이 모든 PR에 자동 리뷰를 게시하려면 GitHub Code Review를 참조하세요.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **즉시 PR 생성** | 원하는 것을 설명하면 Claude가 필요한 모든 변경사항이 포함된 완전한 PR 생성 |
| **자동 코드 구현** | 단일 명령으로 이슈를 작동하는 코드로 변환 |
| **표준 준수** | `CLAUDE.md` 가이드라인과 기존 코드 패턴을 따름 |
| **간단한 설정** | 설치 프로그램과 API 키로 몇 분 안에 시작 |
| **기본 보안** | 코드가 GitHub의 러너에 머물며 안전하게 처리 |

---

## Claude가 할 수 있는 일

### 이슈/PR 코멘트에서 사용

```
@claude 이 PR의 코드를 리뷰해주세요
@claude 이 버그를 수정해주세요
@claude 이 기능을 구현해주세요
@claude 테스트를 추가해주세요
```

Claude가 자동으로 컨텍스트를 분석하고 적절하게 응답합니다.

---

## 설정 방법

### 빠른 설정

가장 쉬운 설정 방법은 Claude Code 터미널에서 `/install-github-app`을 실행하는 것입니다.

```bash
$ claude
> /install-github-app
```

이 명령어가 GitHub 앱 설정과 필수 시크릿 구성을 안내합니다.

### 수동 설정

빠른 설정이 실패하거나 수동 설정을 선호하는 경우:

**1단계**: Claude GitHub 앱을 리포지토리에 설치

- [https://github.com/apps/claude](https://github.com/apps/claude) 에서 설치

**2단계**: `ANTHROPIC_API_KEY`를 리포지토리 시크릿에 추가

- GitHub 리포지토리 > Settings > Secrets and variables > Actions
- 새 시크릿 추가: 이름 `ANTHROPIC_API_KEY`

**3단계**: 워크플로우 파일 복사

```yaml
# .github/workflows/claude.yml
name: Claude Code
on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  issues:
    types: [opened, assigned]

jobs:
  claude:
    if: contains(github.event.comment.body, '@claude') || (github.event_name == 'issues' && contains(github.event.issue.body, '@claude'))
    runs-on: ubuntu-latest
    steps:
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

---

## Beta에서 GA로 업그레이드

Beta 버전을 사용 중인 경우 GA 버전으로 업그레이드하는 것이 권장됩니다.

### 필수 변경사항

1. **액션 버전 업데이트**: `@beta`를 `@v1`로 변경
2. **모드 설정 제거**: `mode: "tag"` 또는 `mode: "agent"` 삭제 (자동 감지됨)
3. **프롬프트 입력 업데이트**: `direct_prompt`를 `prompt`로 교체
4. **CLI 옵션 이동**: `max_turns`, `model`, `custom_instructions` 등을 `claude_args`로 변환

### Breaking Changes 표

| 구 Beta 입력 | 신규 v1.0 입력 |
|-------------|---------------|
| `mode` | _(제거됨 - 자동 감지)_ |
| `direct_prompt` | `prompt` |
| `override_prompt` | `prompt` (GitHub 변수 사용) |
| `custom_instructions` | `claude_args: --append-system-prompt` |
| `max_turns` | `claude_args: --max-turns` |
| `model` | `claude_args: --model` |
| `allowed_tools` | `claude_args: --allowedTools` |
| `disallowed_tools` | `claude_args: --disallowedTools` |
| `claude_env` | `settings` JSON 형식 |

### 변경 전/후 예시

**Beta 버전:**

```yaml
- uses: anthropics/claude-code-action@beta
  with:
    mode: "agent"
    direct_prompt: "Review this PR"
    max_turns: 5
    model: "claude-sonnet-4-6"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

**GA 버전 (v1.0):**

```yaml
- uses: anthropics/claude-code-action@v1
  with:
    prompt: "Review this PR"
    claude_args: "--max-turns 5 --model claude-sonnet-4-6"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

---

## Action 매개변수 v1

| 매개변수 | 설명 | 필수 |
|----------|------|------|
| `prompt` | Claude에 대한 지침 (일반 텍스트 또는 스킬 이름) | 아니요* |
| `claude_args` | Claude Code에 전달할 CLI 인자 | 아니요 |
| `plugin_marketplaces` | 플러그인 마켓플레이스 Git URL 목록 (줄바꿈 구분) | 아니요 |
| `plugins` | 실행 전 설치할 플러그인 이름 목록 (줄바꿈 구분) | 아니요 |
| `anthropic_api_key` | Anthropic API 키 | 예** |
| `github_token` | GitHub API 접근용 토큰 | 아니요 |
| `trigger_phrase` | 커스텀 트리거 구문 (기본값: `@claude`) | 아니요 |
| `use_bedrock` | Anthropic API 대신 AWS Bedrock 사용 | 아니요 |
| `use_vertex` | Anthropic API 대신 Google Vertex AI 사용 | 아니요 |

> *`prompt`는 선택사항입니다. 이슈/PR 코멘트에서 생략하면 Claude가 트리거 구문에 응답합니다.
>
> **Anthropic API 직접 사용 시에만 필수. Bedrock/Vertex 사용 시 불필요

---

## claude_args 사용법

`claude_args` 매개변수는 Claude Code의 모든 CLI 인자를 허용합니다.

### 일반 인자

| 인자 | 설명 | 예시 |
|------|------|------|
| `--max-turns` | 최대 대화 턴 수 (기본값: 10) | `--max-turns 5` |
| `--model` | 사용할 모델 | `--model claude-sonnet-4-6` |
| `--mcp-config` | MCP 설정 파일 경로 | `--mcp-config servers.json` |
| `--allowed-tools` | 허용할 도구 목록 (쉼표 구분) | `--allowed-tools "Bash,Read,Edit"` |
| `--debug` | 디버그 출력 활성화 | `--debug` |

### 사용 예시

```yaml
- uses: anthropics/claude-code-action@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    claude_args: "--max-turns 5 --model claude-sonnet-4-6 --debug"
```

---

## 스킬 사용

`prompt` 입력은 일반 텍스트뿐만 아니라 스킬 호출도 허용합니다.

### 리포지토리 스킬 (`.claude/skills/`)

리포지토리의 `.claude/skills/` 디렉터리에 있는 스킬을 사용하려면, 액션 단계 전에 `actions/checkout`을 실행하고 `/skill-name`을 전달합니다.

### 플러그인 스킬

플러그인으로 패키지된 스킬을 사용하려면, `plugin_marketplaces` 및 `plugins` 입력으로 플러그인을 설치하고 `/plugin-name:skill-name` 형식으로 호출합니다.

### 예시: 플러그인 스킬로 코드 리뷰

다음 워크플로우는 `code-review` 플러그인을 설치하고, 새로 생성되거나 업데이트된 PR마다 해당 스킬을 실행합니다.

```yaml
name: Code Review
on:
  pull_request:
    types: [opened, synchronize]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          plugin_marketplaces: "https://github.com/anthropics/claude-code.git"
          plugins: "code-review@claude-code-plugins"
          prompt: "/code-review:code-review ${{ github.repository }}/pull/${{ github.event.pull_request.number }}"
```

---

## 대체 통합 방법

`/install-github-app` 명령어가 권장되지만, 다음 방법도 사용할 수 있습니다.

| 방법 | 설명 |
|------|------|
| **Custom GitHub App** | 조직에서 브랜드 사용자명이나 커스텀 인증 흐름이 필요한 경우. 필요한 권한(contents, issues, pull requests)으로 GitHub App을 생성하고 `actions/create-github-app-token` 액션으로 토큰을 생성 |
| **Manual GitHub Actions** | 최대 유연성을 위한 직접 워크플로우 구성 |
| **MCP Configuration** | Model Context Protocol 서버의 동적 로딩 |

자세한 가이드는 Claude Code Action 문서의 인증, 보안, 고급 구성 섹션을 참조하세요.

---

## Claude 동작 커스터마이징

Claude의 동작은 두 가지 방법으로 구성할 수 있습니다.

### CLAUDE.md

리포지토리 루트에 `CLAUDE.md` 파일을 생성하여 코딩 표준, 리뷰 기준, 프로젝트별 규칙을 정의합니다. Claude는 PR을 생성하고 요청에 응답할 때 이 가이드라인을 따릅니다. 자세한 내용은 Memory 문서를 참조하세요.

### Custom prompts

워크플로우 파일의 `prompt` 매개변수를 사용하여 워크플로우별 지침을 제공합니다. 이를 통해 워크플로우나 작업에 따라 Claude의 동작을 다르게 커스터마이징할 수 있습니다.

## AWS Bedrock / Google Vertex AI 사용

엔터프라이즈 환경에서는 자체 클라우드 인프라를 사용하여 데이터 거주지와 결제를 제어할 수 있습니다.

### Google Cloud Vertex AI 전제조건

| 요구사항 | 설명 |
|----------|------|
| Google Cloud 프로젝트 | Vertex AI 활성화 |
| Workload Identity Federation | GitHub Actions용 구성 |
| 서비스 계정 | 필요한 권한 포함 |
| GitHub App | 권장 (또는 기본 `GITHUB_TOKEN` 사용) |

### AWS Bedrock 전제조건

| 요구사항 | 설명 |
|----------|------|
| AWS 계정 | Amazon Bedrock 활성화 |
| GitHub OIDC Identity Provider | AWS에 구성 |
| IAM 역할 | Bedrock 권한 포함 |
| GitHub App | 권장 (또는 기본 `GITHUB_TOKEN` 사용) |

### 워크플로우 예시 (Bedrock)

```yaml
- uses: anthropics/claude-code-action@v1
  with:
    use_bedrock: true
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

---

## 보안 고려사항

### API 키 관리

항상 GitHub Secrets를 사용하여 API 키를 관리하세요.

```yaml
# 올바른 방법
anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

# 절대 하지 말 것 - 워크플로우 파일에 API 키를 직접 하드코딩 금지
anthropic_api_key: "sk-ant-xxxxx"  # 위험!
```

### 보안 체크리스트

| 항목 | 설명 |
|------|------|
| **시크릿 사용** | API 키를 `ANTHROPIC_API_KEY` 리포지토리 시크릿으로 저장 |
| **최소 권한** | 액션 권한을 필요한 것만으로 제한 |
| **변경 검토** | Claude의 제안을 병합 전에 검토 |
| **시크릿 참조** | 워크플로우에서 `${{ secrets.ANTHROPIC_API_KEY }}`로 참조 |

---

## 비용 최적화 팁

### GitHub Actions 비용

- Claude Code는 GitHub 호스팅 러너에서 실행되어 GitHub Actions 분을 소비
- 자세한 가격 및 분 제한은 GitHub 결제 문서 참조

### API 비용

- 각 Claude 상호작용은 프롬프트와 응답 길이에 따라 API 토큰 소비
- 토큰 사용량은 작업 복잡도와 코드베이스 크기에 따라 다름
- 현재 토큰 요금은 Claude 가격 페이지 참조

### 비용 절감 방법

| 방법 | 설명 |
|------|------|
| **구체적 명령 사용** | `@claude` 명령을 구체적으로 작성하여 불필요한 API 호출 감소 |
| **max-turns 설정** | `claude_args`에 적절한 `--max-turns`를 구성하여 과도한 반복 방지 |
| **타임아웃 설정** | 워크플로우 수준 타임아웃으로 장기 실행 작업 방지 |
| **동시성 제어** | GitHub의 동시성 제어를 사용하여 병렬 실행 제한 |

```yaml
jobs:
  claude:
    runs-on: ubuntu-latest
    timeout-minutes: 10  # 워크플로우 타임아웃
    concurrency:
      group: claude-${{ github.event.pull_request.number }}
      cancel-in-progress: true  # 이전 실행 취소
```

---

## 문제 해결

### Claude가 @claude 명령에 응답하지 않는 경우

| 확인 사항 | 해결 방법 |
|----------|----------|
| GitHub 앱 설치 | 앱이 올바르게 설치되어 있는지 확인 |
| 워크플로우 활성화 | 워크플로우가 활성화되어 있는지 확인 |
| API 키 | 리포지토리 시크릿에 API 키가 설정되어 있는지 확인 |
| 트리거 구문 | 코멘트에 `@claude`가 포함되어 있는지 확인 (`/claude` 아님) |

### Claude의 커밋에 CI가 실행되지 않는 경우

| 확인 사항 | 해결 방법 |
|----------|----------|
| 앱 사용 | GitHub App 또는 커스텀 앱 사용 중인지 확인 (Actions 사용자가 아님) |
| 워크플로우 트리거 | 트리거에 필요한 이벤트가 포함되어 있는지 확인 |
| 앱 권한 | CI 트리거가 포함되어 있는지 확인 |

### 인증 에러

| 확인 사항 | 해결 방법 |
|----------|----------|
| API 키 유효성 | API 키가 유효하고 충분한 권한이 있는지 확인 |
| Bedrock/Vertex 자격 증명 | 자격 증명 구성이 올바른지 확인 |
| 시크릿 이름 | 워크플로우에서 시크릿 이름이 정확한지 확인 |

---

## 요약

Claude Code GitHub Actions는 `@claude` 멘션으로 PR 생성, 코드 분석, 기능 구현, 버그 수정을 자동화합니다. 빠른 설정(`/install-github-app`)으로 몇 분 안에 시작할 수 있으며, GA 버전(v1)은 간소화된 매개변수 구조를 제공합니다. 비용 최적화와 보안 모범 사례를 준수하여 효율적으로 사용하세요.

---

## GitLab CI/CD 통합

> **참조**: [Claude Code GitLab CI/CD](https://code.claude.com/docs/en/gitlab-ci-cd)

Claude Code는 GitLab CI/CD에서도 실행할 수 있으며, 격리된 잡에서 AI 작업을 실행하고 MR을 통해 결과를 커밋합니다.

### GitLab에서 Claude를 사용하는 이유

| 기능 | 설명 |
|------|------|
| **즉시 MR 생성** | 원하는 것을 설명하면 Claude가 변경사항과 설명이 포함된 완전한 MR 제안 |
| **자동 구현** | 단일 명령이나 멘션으로 이슈를 작동하는 코드로 변환 |
| **프로젝트 인식** | `CLAUDE.md` 가이드라인과 기존 코드 패턴을 따름 |
| **간단한 설정** | `.gitlab-ci.yml`에 잡 하나 추가하고 마스크된 CI/CD 변수 설정 |
| **엔터프라이즈 지원** | Claude API, Amazon Bedrock, Google Vertex AI 중 선택 가능 |
| **기본 보안** | GitLab 러너에서 실행되며 브랜치 보호 및 승인 규칙 적용 |

### 작동 방식

1. **이벤트 기반 오케스트레이션**: GitLab이 선택한 트리거(예: 이슈, MR, 리뷰 스레드에서 `@claude` 멘션이 포함된 코멘트)를 수신합니다. 잡이 스레드와 리포지토리에서 컨텍스트를 수집하고 프롬프트를 구성하여 Claude Code를 실행합니다.
2. **프로바이더 추상화**: 환경에 맞는 프로바이더 선택:
   - Claude API (SaaS)
   - Amazon Bedrock (IAM 기반 접근, 리전 간 옵션)
   - Google Vertex AI (GCP 네이티브, Workload Identity Federation)
3. **샌드박스 실행**: 각 상호작용은 엄격한 네트워크 및 파일시스템 규칙이 적용된 컨테이너에서 실행됩니다. Claude Code는 워크스페이스 범위 권한으로 쓰기를 제한하며, 모든 변경사항은 MR을 통해 흐르므로 리뷰어가 diff를 확인하고 승인 규칙이 그대로 적용됩니다.

### 빠른 설정

**1단계**: 마스크된 CI/CD 변수 추가

- Settings > CI/CD > Variables로 이동
- `ANTHROPIC_API_KEY` 추가 (마스크 처리, 필요시 보호 설정)

**2단계**: `.gitlab-ci.yml`에 Claude 잡 추가

```yaml
stages:
  - ai

claude:
  stage: ai
  image: node:24-alpine3.21
  rules:
    - if: '$CI_PIPELINE_SOURCE == "web"'
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
  variables:
    GIT_STRATEGY: fetch
  before_script:
    - apk update
    - apk add --no-cache git curl bash
    - curl -fsSL https://claude.ai/install.sh | bash
  script:
    - /bin/gitlab-mcp-server || true
    - echo "$AI_FLOW_INPUT for $AI_FLOW_CONTEXT on $AI_FLOW_EVENT"
    - >
      claude
      -p "${AI_FLOW_INPUT:-'Review this MR and implement the requested changes'}"
      --permission-mode acceptEdits
      --allowedTools "Bash Read Edit Write mcp__gitlab"
      --debug
```

잡과 `ANTHROPIC_API_KEY` 변수를 추가한 후, CI/CD > Pipelines에서 수동으로 잡을 실행하거나 MR에서 트리거하여 테스트할 수 있습니다.

### 수동 설정 (프로덕션 권장)

1. **프로바이더 접근 구성**:
   - **Claude API**: `ANTHROPIC_API_KEY`를 마스크된 CI/CD 변수로 생성하여 저장
   - **Amazon Bedrock**: GitLab > AWS OIDC를 구성하고 Bedrock용 IAM 역할 생성
   - **Google Vertex AI**: Workload Identity Federation을 GitLab > GCP로 구성
2. **GitLab API 작업용 프로젝트 자격 증명 추가**:
   - 기본적으로 `CI_JOB_TOKEN` 사용, 또는 `api` 스코프가 있는 Project Access Token 생성
   - PAT 사용 시 `GITLAB_ACCESS_TOKEN`으로 저장 (마스크 처리)
3. **`.gitlab-ci.yml`에 Claude 잡 추가** (아래 예시 참조)
4. **(선택) 멘션 기반 트리거 활성화**:
   - 이벤트 리스너(사용하는 경우)에 "Comments (notes)"용 프로젝트 웹훅 추가
   - 코멘트에 `@claude`가 포함된 경우 `AI_FLOW_INPUT` 및 `AI_FLOW_CONTEXT` 변수로 파이프라인 트리거 API를 호출하도록 리스너 구성

### Amazon Bedrock 잡 예시 (OIDC)

**필수 CI/CD 변수**: `AWS_ROLE_TO_ASSUME`, `AWS_REGION`

```yaml
claude-bedrock:
  stage: ai
  image: node:24-alpine3.21
  rules:
    - if: '$CI_PIPELINE_SOURCE == "web"'
  before_script:
    - apk add --no-cache bash curl jq git python3 py3-pip
    - pip install --no-cache-dir awscli
    - curl -fsSL https://claude.ai/install.sh | bash
    - export AWS_WEB_IDENTITY_TOKEN_FILE="${CI_JOB_JWT_FILE:-/tmp/oidc_token}"
    - if [ -n "${CI_JOB_JWT_V2}" ]; then printf "%s" "$CI_JOB_JWT_V2" > "$AWS_WEB_IDENTITY_TOKEN_FILE"; fi
    - >
      aws sts assume-role-with-web-identity
      --role-arn "$AWS_ROLE_TO_ASSUME"
      --role-session-name "gitlab-claude-$(date +%s)"
      --web-identity-token "file://$AWS_WEB_IDENTITY_TOKEN_FILE"
      --duration-seconds 3600 > /tmp/aws_creds.json
    - export AWS_ACCESS_KEY_ID="$(jq -r .Credentials.AccessKeyId /tmp/aws_creds.json)"
    - export AWS_SECRET_ACCESS_KEY="$(jq -r .Credentials.SecretAccessKey /tmp/aws_creds.json)"
    - export AWS_SESSION_TOKEN="$(jq -r .Credentials.SessionToken /tmp/aws_creds.json)"
  script:
    - /bin/gitlab-mcp-server || true
    - >
      claude
      -p "${AI_FLOW_INPUT:-'Implement the requested changes and open an MR'}"
      --permission-mode acceptEdits
      --allowedTools "Bash Read Edit Write mcp__gitlab"
      --debug
  variables:
    AWS_REGION: "us-west-2"
```

### Google Vertex AI 잡 예시 (Workload Identity Federation)

**필수 CI/CD 변수**: `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `CLOUD_ML_REGION`

```yaml
claude-vertex:
  stage: ai
  image: gcr.io/google.com/cloudsdktool/google-cloud-cli:slim
  rules:
    - if: '$CI_PIPELINE_SOURCE == "web"'
  before_script:
    - apt-get update && apt-get install -y git && apt-get clean
    - curl -fsSL https://claude.ai/install.sh | bash
    - >
      gcloud auth login --cred-file=<(cat <<EOF
      {
        "type": "external_account",
        "audience": "${GCP_WORKLOAD_IDENTITY_PROVIDER}",
        "subject_token_type": "urn:ietf:params:oauth:token-type:jwt",
        "service_account_impersonation_url": "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT}:generateAccessToken",
        "token_url": "https://sts.googleapis.com/v1/token"
      }
      EOF
      )
    - gcloud config set project "$(gcloud projects list --format='value(projectId)' --filter="name:${CI_PROJECT_NAMESPACE}" | head -n1)" || true
  script:
    - /bin/gitlab-mcp-server || true
    - >
      CLOUD_ML_REGION="${CLOUD_ML_REGION:-us-east5}"
      claude
      -p "${AI_FLOW_INPUT:-'Review and update code as requested'}"
      --permission-mode acceptEdits
      --allowedTools "Bash Read Edit Write mcp__gitlab"
      --debug
  variables:
    CLOUD_ML_REGION: "us-east5"
```

### GitLab 모범 사례

| 항목 | 설명 |
|------|------|
| **CLAUDE.md** | 리포지토리 루트에 코딩 표준, 리뷰 기준, 프로젝트 규칙을 정의. Claude가 실행 중 이 파일을 읽고 규칙을 따름 |
| **보안** | API 키나 클라우드 자격 증명을 리포지토리에 절대 커밋하지 말 것. 항상 GitLab CI/CD 변수 사용 |
| **성능 최적화** | `CLAUDE.md`를 간결하게 유지, 이슈/MR 설명을 명확하게 작성, 적절한 잡 타임아웃 구성 |
| **비용 인식** | GitLab 러너 시간, API 토큰 비용을 고려. `@claude` 명령을 구체적으로 사용하여 불필요한 턴 감소 |

### GitLab 문제 해결

| 문제 | 해결 방법 |
|------|----------|
| `@claude` 명령에 응답하지 않음 | 파이프라인이 트리거되고 있는지 확인, CI/CD 변수가 설정되어 있는지 확인, 코멘트에 `@claude`(not `/claude`)가 포함되어 있는지 확인 |
| `CI_JOB_TOKEN` 권한 부족 | `mcp__gitlab` 도구가 `--allowedTools`에 활성화되어 있는지 확인, 필요시 `api` 스코프의 Project Access Token 사용 |
| 인증 에러 (Claude API) | `ANTHROPIC_API_KEY`가 유효하고 만료되지 않았는지 확인 |
| 인증 에러 (Bedrock/Vertex) | OIDC/WIF 구성, 역할 가장, 시크릿 이름 확인. 리전 및 모델 가용성 확인 |
