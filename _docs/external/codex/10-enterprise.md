# Codex - 엔터프라이즈 관리

> ChatGPT Enterprise 환경에서 Codex를 관리하기 위한 관리자 가이드입니다.

**참조**: <https://developers.openai.com/codex/enterprise/admin-setup>, <https://developers.openai.com/codex/enterprise/governance>, <https://developers.openai.com/codex/enterprise/managed-configuration>, <https://developers.openai.com/codex/auth>, <https://developers.openai.com/codex/enterprise/access-tokens>, <https://developers.openai.com/codex/remote-connections>, <https://developers.openai.com/codex/amazon-bedrock>

---

## 목차

- [엔터프라이즈 관리 개요](#엔터프라이즈-관리-개요)
- [Admin Setup 롤아웃](#admin-setup-롤아웃)
- [인증](#인증)
- [requirements.toml 시스템](#requirementstoml-시스템)
- [Managed Configuration (managed_config.toml)](#managed-configuration-managed_configtoml)
- [macOS MDM 배포](#macos-mdm-배포)
- [Managed Hooks](#managed-hooks)
- [Amazon Bedrock 배포](#amazon-bedrock-배포)
- [엔터프라이즈 보안 기능](#엔터프라이즈-보안-기능)
- [Governance 및 Observability](#governance-및-observability)
- [원격 연결](#원격-연결)

---

## 엔터프라이즈 관리 개요

엔터프라이즈 관리자는 두 가지 방식으로 로컬 Codex 동작을 제어할 수 있습니다.

| 방식 | 설명 | 사용자 재정의 |
| --- | --- | --- |
| **Requirements** (강제 제약) | 관리자가 강제하는 보안 제약 | 불가 |
| **Managed defaults** (관리 기본값) | 시작 시 적용되는 기본값 | 세션 중 변경 가능 (재시작 시 복원) |

Requirements는 보안 관련 설정(approval policy, approvals reviewer, automatic review policy, sandbox mode, web search mode, managed hooks, MCP 서버 허용 목록)을 제한합니다. 구성 충돌 시 Codex는 호환 가능한 값으로 대체하고 사용자에게 알립니다.

---

## Admin Setup 롤아웃

이 섹션은 ChatGPT Enterprise 관리자가 Codex를 워크스페이스에 설정하는 단계별 가이드입니다.

### 롤아웃 소유자

롤아웃 중 팀원이 다음 역할을 담당해야 합니다.

| 역할 | 담당 |
| --- | --- |
| **ChatGPT Enterprise workspace owner** | 워크스페이스 Codex 설정 구성 |
| **Security owner** | 에이전트 권한 설정 결정 |
| **Analytics owner** | Analytics/Compliance API를 데이터 파이프라인에 통합 |

### Codex 서피스 선택

| 서피스 | 설명 | 에이전트 실행 환경 |
| --- | --- | --- |
| **Codex local** | Codex App, CLI, IDE Extension 포함 | 개발자 컴퓨터의 샌드박스 |
| **Codex cloud** | Codex cloud, iOS, Code Review, Slack/Linear 통합 작업 포함 | 호스트된 컨테이너 |
| **Both** | local + cloud 함께 사용 | 혼합 |

local, cloud 또는 둘 다 활성화할 수 있으며, 워크스페이스 설정과 RBAC로 접근을 제어합니다.

### Codex Local 설정

**Workspace Settings > Settings and Permissions**에서 구성합니다.

Codex local은 신규 ChatGPT Enterprise 워크스페이스에서 **기본 활성화**됩니다.

1. **Allow members to use Codex Local** 토글 켜기
   - 활성화 시 Codex App, CLI, IDE Extension 사용 가능
   - 비활성화 시 사용자에게 `403 - Unauthorized` 오류 표시

2. **접근 토큰 설정** (선택 사항)
   - **Allow members to use Codex access tokens** 토글 켜기
   - **Access token expiration limit**: 새 토큰에 대해 선택 가능한 최대 만료 기간 설정
   - 커스텀 롤을 통해 접근 토큰 권한을 부여할 수도 있음

3. **기기 코드 인증** (선택 사항)
   - 비대화형 환경(예: 원격 개발 서버)에서 CLI 로그인 시 device code 인증 허용

### Codex Cloud 설정

#### 사전 요구사항

- **GitHub (cloud-hosted) 리포지토리** 필요
- 온프레미스 또는 비-GitHub 코드베이스인 경우 Codex SDK로 자체 인프라에 유사 워크플로우 구축 가능
- 관리자로서 Codex를 설정하려면 조직 전체에서 일반적으로 사용되는 리포지토리에 **GitHub 접근 권한이 필수**입니다. 필요한 접근 권한이 없는 경우, 해당 권한을 가진 엔지니어링 팀원과 협업하세요.

#### 워크스페이스 설정

1. **ChatGPT GitHub Connector** 활성화: Codex 섹션의 Workspace Settings > Settings and Permissions
2. **Allow members to use Codex cloud** 토글 켜기
   - 활성화 후 최대 10분 소요 (ChatGPT에 Codex 탭 표시)

#### GitHub Connector 설정

1. Codex에서 **Get started** 선택
2. **Connect to GitHub** 선택 → ChatGPT GitHub Connector 설치
3. 설치 대상 조직 선택
4. 연결할 리포지토리 허용

GitHub Enterprise Managed Users (EMU)의 경우 조직 소유자가 먼저 Codex GitHub App을 설치해야 합니다.

Codex는 각 작업에 단기 수명의 최소 권한 GitHub App 설치 토큰을 사용하며, 사용자의 기존 GitHub 권한과 브랜치 보호 규칙을 준수합니다.

#### IP 주소 구성

GitHub 조직이 앱 연결에 사용하는 IP 주소를 제어하는 경우, Codex cloud 송신 IP 대역을 허용 목록에 추가해야 합니다. 이 IP 대역은 변경될 수 있으므로 자동 확인 및 업데이트를 권장합니다.

#### 인터넷 접근 설정

기본적으로 Codex cloud 에이전트는 런타임에 **인터넷 접근이 없습니다** (프롬프트 인젝션 등 보안 위험 방지).

이 설정으로 사용자가 다음을 수행할 수 있습니다:
- 일반 소프트웨어 종속성 도메인 허용 목록 사용
- 도메인 및 신뢰할 수 있는 사이트 추가
- 허용된 HTTP 메서드 지정

#### Slack 통합

**Enable Codex Slack app to post answers on task completion**을 켜면 작업 완료 시 Codex가 전체 답변을 Slack에 게시합니다. 비활성화 시 작업 링크만 게시됩니다.

#### Linear 통합

Linear 통합을 통해 작업을 Codex cloud에 위임할 수 있습니다. 자세한 내용은 Linear 통합 문서를 참조하세요.

### RBAC (역할 기반 접근 제어)

**Workspace Settings > Settings and Permissions**에서 RBAC로 세부 권한을 제어합니다.

#### RBAC 기능

Workspace Owners는 다음을 수행할 수 있습니다:

| 기능 | 설명 |
| --- | --- |
| 기본 역할 설정 | 커스텀 롤이 없는 사용자의 기본 역할 지정 |
| 커스텀 롤 생성 | 세부 권한을 가진 커스텀 롤 생성 |
| 그룹에 역할 할당 | 하나 이상의 커스텀 롤을 그룹에 할당 |
| SCIM 동기화 | IdP를 통해 사용자를 그룹에 자동 동기화 |
| 중앙 관리 | Custom Roles 탭에서 역할 관리 |

사용자는 여러 역할을 상속할 수 있으며, 권한은 가장 허용적인(가장 덜 제한적인) 것으로 해석됩니다.

#### Codex Admin 그룹 생성

**Allow members to administer Codex** 토글이 Codex Admin 역할을 부여합니다.

**Codex Admin 권한**:

| 권한 | 설명 |
| --- | --- |
| Codex 워크스페이스 Analytics 보기 | 채택 및 사용 현황 모니터링 |
| Codex Policies 페이지 열기 | cloud-managed `requirements.toml` 정책 관리 |
| 관리 정책을 그룹에 할당 | 사용자 그룹별 정책 또는 기본 대체 정책 구성 |
| Cloud 환경 관리 | 환경 편집 및 삭제 |

**권장 롤아웃 패턴**:

1. "Codex Users" 그룹: Codex를 사용할 사용자
2. "Codex Admin" 그룹: 설정 및 정책을 관리할 소수 그룹
3. **Allow members to administer Codex**가 활성화된 커스텀 롤을 "Codex Admin" 그룹에만 할당
4. "Codex Admin" 그룹 멤버십을 workspace owner 또는 지정된 플랫폼/IT/거버넌스 담당자로 제한
5. SCIM 사용 시 "Codex Admin" 그룹을 IdP로 백업하여 멤버십 변경이 감사 가능하고 중앙 관리되도록 함

### 코드 리뷰 설정

**Settings → Code review**에서 구성합니다.

| 설정 | 설명 |
| --- | --- |
| 리포지토리 수준 구성 | 리포지토리별 코드 리뷰 설정 |
| Auto review | PR에 대해 Codex가 자동으로 리뷰를 트리거할지 여부 |
| Review triggers | 어떤 PR 이벤트가 Codex 리뷰를 시작할지 제어 |

사용자도 자신의 PR에 대해 auto review를 활성화하고 Codex가 자동으로 리뷰를 트리거하는 시점을 선택할 수 있습니다.

### Codex Security 설정

Codex Security는 엔지니어링 및 보안 팀이 연결된 GitHub 리포지토리에서 가능한 취약점을 찾고, 확인하고, 수정하도록 돕습니다.

**주요 기능**:

- 연결된 리포지토리를 커밋 단위로 스캔
- 가능한 발견 사항의 순위를 매기고 가능한 경우 확인
- 증거, 심각도, 제안된 수정 사항이 포함된 구조화된 발견 결과 표시
- 리포지토리 위협 모델을 개선하여 우선순위 지정 및 리뷰 품질 향상

설정, 스캔 생성, 발견 결과 검토, 위협 모델 지침은 Codex Security 설정 문서를 참조하세요.

### Cloud-managed 정책 (Codex Policies)

Codex Admin은 Codex Policies 페이지에서 `requirements.toml` 정책을 배포할 수 있습니다.

**권장 설정**:

1. 대부분의 사용자를 위한 기본 정책 생성, 필요한 경우에만 더 엄격하거나 허용적인 변형 생성
2. 각 관리 정책을 특정 사용자 그룹에 할당, 기본 대체 정책 구성
3. 그룹 규칙 순서에 주의: 사용자가 둘 이상의 그룹 규칙과 매칭되면 **첫 번째 매칭 규칙**이 적용
4. 각 정책을 해당 그룹의 완전한 프로필로 취급: Codex는 이후 매칭 그룹 규칙에서 누락된 필드를 채우지 않음

#### 정책 할당 확인

워크플로우 마지막의 정책 조회 도구를 사용하여 사용자에게 적용되는 관리 정책을 확인할 수 있습니다. 그룹별 또는 사용자 이메일 입력으로 정책 할당을 확인합니다.

### Team Config

조직 전체에 Codex를 표준화하려면 Team Config를 사용하여 기본값, 규칙, 스킬을 공유합니다.

리포지토리의 `.codex` 디렉토리에 체크인하면, Codex가 해당 리포지토리를 열 때 자동으로 설정을 적용합니다.

| 유형 | 경로 | 용도 |
| --- | --- | --- |
| Config basics | `config.toml` | sandbox mode, approvals, model, reasoning effort 등의 기본값 |
| Rules | `rules/` | 샌드박스 밖에서 Codex가 실행할 수 있는 명령 제어 |
| Skills | `skills/` | 팀이 공유할 스킬 제공 |

트래픽이 가장 높은 리포지토리부터 Team Config를 시작하세요.

---

## 인증

Codex는 두 가지 로그인 방식을 지원합니다.

| 방식 | 설명 | 사용 가능 서피스 |
| --- | --- | --- |
| **ChatGPT 로그인** | 브라우저 로그인 후 access token 수신 | 모든 서피스 (cloud 필수) |
| **API 키 로그인** | OpenAI Platform API 키 사용 | App, CLI, IDE (cloud 불가) |

### 로그인 방식별 정책 차이

| 항목 | ChatGPT 로그인 | API 키 로그인 |
| --- | --- | --- |
| 권한 관리 | ChatGPT 워크스페이스 권한, RBAC | API 조직 설정 |
| 데이터 처리 | ChatGPT Enterprise 보존/거주지 설정 | API 조직의 보존/데이터 공유 설정 |
| 요금 체계 | ChatGPT 플랜 크레딧 포함 | 표준 API 요금 |

### ChatGPT 로그인

Codex App, CLI, IDE Extension에서 ChatGPT로 로그인하면 브라우저 창이 열리고 로그인 후 access token을 반환합니다.

이미 환경에 ChatGPT access token이 있는 경우 stdin으로 전달:

```bash
printenv CODEX_ACCESS_TOKEN | codex login --with-access-token
```

### API 키 로그인

OpenAI 대시보드에서 API 키를 가져와 사용합니다. API 키 사용 시 표준 API 요금이 청구됩니다.

API 키 인증은 로컬 Codex 워크플로우만 지원하며, ChatGPT 워크스페이스 접근이나 클라우드 서비스에 의존하는 일부 기능은 제한되거나 사용할 수 없습니다.

### 기기 코드 인증 (beta)

원격 또는 헤드리스 환경에서 브라우저 기반 로그인이 작동하지 않는 경우 사용합니다.

**설정 방법**:

1. ChatGPT 보안 설정(개인 계정) 또는 워크스페이스 권한(워크스페이스 관리자)에서 device code 로그인 활성화
2. 대화형 로그인 UI에서 **Sign in with Device Code** 선택 또는 `codex login --device-auth` 실행
3. 브라우저에서 링크를 열고 로그인한 후 일회성 코드 입력

서버에서 device code 로그인이 활성화되지 않은 경우 표준 브라우저 기반 로그인으로 대체됩니다.

### 원격/헤드리스 환경 폴백 인증

ChatGPT로 CLI에 로그인할 때 브라우저 기반 로그인 UI가 작동하지 않는 경우(예: 원격 또는 헤드리스 환경, 로컬 네트워크 설정이 `localhost` 콜백을 차단하는 경우) 다음 폴백 방법을 사용할 수 있습니다.

#### 폴백 1: 로컬에서 인증 후 auth.json 복사

브라우저가 있는 머신에서 로그인한 후 캐시된 자격 증명을 헤드리스 머신으로 복사합니다.

1. 브라우저가 있는 머신에서 `codex login` 실행
2. `~/.codex/auth.json`이 생성되었는지 확인
3. `~/.codex/auth.json`을 헤드리스 머신의 `~/.codex/auth.json`으로 복사

> **보안 경고**: `~/.codex/auth.json`에는 액세스 토큰이 포함되어 있으므로 비밀번호처럼 취급하세요. 커밋하거나, 티켓에 붙여넣거나, 채팅에 공유하지 마세요.

**SSH를 통한 원격 머신 복사**:

```bash
ssh user@remote 'mkdir -p ~/.codex'
scp ~/.codex/auth.json user@remote:~/.codex/auth.json
```

또는 `scp` 없이 원격 라인으로 복사:

```bash
ssh user@remote 'mkdir -p ~/.codex && cat > ~/.codex/auth.json' < ~/.codex/auth.json
```

**Docker 컨테이너로 복사**:

```bash
CONTAINER_HOME=$(docker exec MY_CONTAINER printenv HOME)
docker exec MY_CONTAINER mkdir -p "$CONTAINER_HOME/.codex"
docker cp ~/.codex/auth.json MY_CONTAINER:"$CONTAINER_HOME/.codex/auth.json"
```

OS가 `~/.codex/auth.json` 대신 자격 증명 저장소를 사용하는 경우 이 방법이 적용되지 않을 수 있습니다. 파일 기반 저장소 구성에 대한 자세한 내용은 [자격 증명 저장소](#자격-증명-저장소)를 참조하세요.

신뢰할 수 있는 CI/CD 러너에서 이 패턴의 고급 버전은 **Maintain Codex account auth in CI/CD (advanced)** 가이드를 참조하세요. API 키는 여전히 자동화의 권장 기본값입니다.

#### 폴백 2: SSH를 통한 localhost 콜백 포워딩

로컬 머신과 원격 호스트 간에 포트를 포워딩할 수 있는 경우, 표준 브라우저 기반 흐름을 터널링할 수 있습니다.

1. 로컬 머신에서 포트 포워딩 시작:

```bash
ssh -L 1455:localhost:1455 user@remote
```

2. 해당 SSH 세션에서 `codex login`을 실행하고 로컬 머신의 브라우저에서 출력된 주소를 엽니다.

### 커스텀 model_provider 인증

구성 파일에서 커스텀 모델 제공자를 정의할 때 다음 인증 방법 중 하나를 선택할 수 있습니다.

| 방법 | 설정 | 설명 |
| --- | --- | --- |
| **OpenAI 인증** | `requires_openai_auth = true` | ChatGPT 또는 API 키로 로그인. LLM 프록시 서버를 통해 OpenAI 모델에 접근할 때 유용. `requires_openai_auth = true` 시 `env_key`는 무시됨 |
| **환경 변수 인증** | `env_key = "<ENV_VARIABLE_NAME>"` | 로컬 환경 변수에서 제공자별 API 키 사용 |
| **인증 없음** | 둘 다 설정하지 않음 | 제공자가 인증을 요구하지 않는다고 가정. 로컬 모델에 유용 |

### 로그인 디버깅

직접 `codex login` 실행 시 구성된 로그 디렉토리에 전용 `codex-login.log` 파일이 작성됩니다. 브라우저 로그인 또는 기기 코드 실패를 디버깅하거나 지원팀이 로그인 관련 로그를 요청할 때 사용하세요.

### 인증 캐시 보안

`~/.codex/auth.json`에는 액세스 토큰이 포함되어 있습니다. 다음을 절대 수행하지 마세요:

- 버전 관리에 커밋
- 티켓이나 이슈에 붙여넣기
- 채팅이나 메신저에 공유
- 신뢰할 수 없는 머신에 보관

### 접근 토큰 (Access Tokens)

Codex 접근 토큰은 신뢰할 수 있는 자동화가 ChatGPT 워크스페이스 아이덴티티로 Codex local을 실행할 수 있게 합니다. ChatGPT Business 및 Enterprise 워크스페이스에서 지원됩니다.

**사용 사례**:

| 사례 | 설명 |
| --- | --- |
| `codex exec` 작업 | 신뢰할 수 있는 자동화에서 실행 |
| 로컬 스크립트 | 반복 가능한 비대화형 실행 |
| 엔터프라이즈 워크플로우 | ChatGPT 워크스페이스 사용자와 연결되어야 하는 경우 |

**주의 사항**:

| 위험 | 설명 |
| --- | --- |
| 유출된 시크릿 | 토큰 소유자는 누구나 토큰 생성자로 Codex 실행 가능 |
| 신뢰할 수 없는 실행 환경 | 공개 CI, 포크된 PR, 공유 머신에서는 토큰 노출 위험 |
| 공유 아이덴티티 | 한 사람의 토큰을 여러 팀에서 재사용하면 감사 추적이 어려움 |
| 오래된 자격 증명 | 장기 토큰은 워크플로우 변경 후에도 활성 상태로 유지될 수 있음 |
| 잘못된 자격 증명 유형 | 접근 토큰은 Codex local 전용, 일반 OpenAI API 호출은 Platform API 키 사용 |

#### 접근 토큰 설정

1. **Workspace Settings > Permissions & roles**에서 Codex Local 활성화
2. **Allow members to use Codex access tokens** 켜기 (또는 커스텀 롤로 권한 부여)
3. **Access token expiration limit**으로 새 토큰에 대해 선택할 수 있는 최대 만료 기간 설정

#### 토큰 생성

1. **Access tokens** 페이지에서 **Create** 선택
2. 설명적인 이름 입력 (예: `release-ci`, `nightly-docs-check`)
3. 만료 기간 선택 (7, 30, 60, 90일 권장). **No expiration** 선택 시 정기적 교체 필요
4. **Create** 후 생성된 토큰 즉시 복사 (모달 닫으면 재확인 불가)
5. 시크릿 매니저 또는 CI 시크릿 스토어에 저장

최단 커스텀 만료 기간은 1일입니다. 해지되거나 만료된 토큰으로는 새 Codex 실행을 시작할 수 없습니다.

#### 토큰 사용

임시 자동화의 경우 환경 변수 사용:

```bash
export CODEX_ACCESS_TOKEN="<ACCESS_TOKEN>"
codex exec --json "review this repository and summarize the top risks"
```

영구 로컬 로그인의 경우 파이프로 전달:

```bash
printf '%s' "$CODEX_ACCESS_TOKEN" | codex login --with-access-token
codex exec "summarize the last release diff"
```

`codex login --with-access-token`은 Codex 인증 저장소에 에이전트 아이덴티티 자격 증명을 저장합니다. 자격 증명을 머신에 저장하고 싶지 않으면 `CODEX_ACCESS_TOKEN` 환경 변수를 사용하세요.

#### 접근 토큰 권한 매트릭스

| 기능 | Workspace owner/admin | 접근 토큰 권한 멤버 | 접근 토큰 권한 없는 멤버 |
| --- | --- | --- | --- |
| Access tokens 페이지 열기 | 예 | 예 | 아니오 |
| 접근 토큰 생성 | 자신의 ChatGPT 아이덴티티로 | 자신의 ChatGPT 아이덴티티로 | 아니오 |
| 접근 토큰 목록 보기 | 워크스페이스 전체 (생성자 포함) | 자신이 생성한 토큰만 | 아니오 |
| 접근 토큰 해지 | 워크스페이스의 모든 토큰 | 자신이 생성한 토큰만 | 페이지 접근 불가 |
| 접근 토큰 권한 부여/제거 | 예 | 아니오 | 아니오 |
| 다른 Codex 엔터프라이즈 설정 관리 | 예 (관리자 역할 및 Codex 관리자 권한 기반) | 아니오 (별도로 부여되지 않은 경우) | 아니오 |

#### 토큰 교체 절차

1. 교체 토큰 생성
2. 실행 환경, 스케줄러 또는 시크릿 매니저의 시크릿 업데이트
3. 새 토큰으로 스모크 테스트 실행
4. Access tokens 페이지에서 이전 토큰 해지

#### 접근 토큰 문제 해결

| 문제 | 해결 방법 |
| --- | --- |
| Access tokens 페이지가 404 또는 forbidden | 워크스페이스 owner 또는 admin에게 Codex 접근 토큰이 활성화되어 있는지, 역할에 접근 토큰 권한이 포함되어 있는지 확인 요청 |
| `codex login --with-access-token` 실패 | 브라우저 세션 토큰이나 Platform API 키가 아닌 **생성된 접근 토큰**을 복사했는지 확인. 토큰이 만료되거나 해지되지 않았는지 확인 |

### MFA 요구사항

Codex cloud는 코드베이스에 직접 접근하므로 강력한 보안이 필요합니다. **다중 인증(MFA) 활성화가 필수**입니다.

| 로그인 방식 | MFA 요구사항 |
| --- | --- |
| 소셜 로그인 (Google, Microsoft, Apple) | ChatGPT 계정에 필수는 아니지만, 소셜 로그인 제공자에서 설정 권장 |
| SSO | 조직의 SSO 관리자가 모든 사용자에게 MFA 강제 |
| 이메일/비밀번호 | Codex cloud 접근 전 MFA 설정 필수 |
| 혼합 로그인 | 이메일/비밀번호가 포함된 경우 MFA 필수 |

### 자격 증명 저장소

Codex는 로그인 세부 정보를 `~/.codex/auth.json` 또는 OS 자격 증명 저장소에 캐시합니다. CLI와 IDE Extension은 동일한 캐시를 공유합니다.

`cli_auth_credentials_store`로 저장 위치 제어:

```toml
# file | keyring | auto
cli_auth_credentials_store = "keyring"
```

| 값 | 설명 |
| --- | --- |
| `file` | `CODEX_HOME`(기본 `~/.codex`)의 `auth.json`에 저장 |
| `keyring` | OS 자격 증명 저장소에 저장 |
| `auto` | OS 자격 증명 저장소 사용 가능 시 사용, 불가 시 `auth.json`으로 대체 |

ChatGPT 세션의 경우 만료 전에 자동으로 토큰을 갱신하므로 활성 세션은 중단 없이 유지됩니다.

### 관리자 인증 제한

관리 환경에서 로그인 방식을 강제할 수 있습니다:

```toml
# ChatGPT 로그인 또는 API 키 로그인만 허용
forced_login_method = "chatgpt"  # 또는 "api"

# ChatGPT 로그인 시 특정 워크스페이스로 제한
forced_chatgpt_workspace_id = "00000000-0000-0000-0000-000000000000"
```

활성 자격 증명이 구성된 제한과 일치하지 않으면 Codex가 사용자를 로그아웃하고 종료합니다.

### 프록시/사설 CA 환경

기업 TLS 프록시 또는 사설 루트 CA를 사용하는 경우:

```bash
export CODEX_CA_CERTIFICATE=/path/to/corporate-root-ca.pem
codex login
```

`CODEX_CA_CERTIFICATE`가 설정되지 않은 경우 `SSL_CERT_FILE`로 대체됩니다.

---

## requirements.toml 시스템

`requirements.toml`은 사용자가 재정의할 수 없는 **관리자 강제 제약**을 정의합니다.

### 우선순위

Codex는 다음 순서로 requirements를 적용합니다 (이전 레이어가 우선).

| 우선순위 | 소스 | 설명 |
| --- | --- | --- |
| 1 (최고) | 클라우드 관리 Requirements | ChatGPT Business/Enterprise에서 가져옴 |
| 2 | macOS MDM | `com.openai.codex:requirements_toml_base64` |
| 3 | 시스템 `requirements.toml` | Linux/macOS: `/etc/codex/requirements.toml`, Windows: `%ProgramData%\OpenAI\Codex\requirements.toml` |

필드별로 병합됩니다: 이전 레이어가 설정한 필드는 이후 레이어가 덮어쓸 수 없습니다.

하위 호환성을 위해 Codex는 레거시 `managed_config.toml`의 `approval_policy` 및 `sandbox_mode` 필드도 requirements로 해석합니다.

### 클라우드 관리 Requirements

ChatGPT Business 또는 Enterprise 플랜으로 로그인하면 Codex 서비스에서 관리자 강제 requirements를 가져올 수 있습니다. CLI, App, IDE Extension 등 모든 Codex 서피스에 적용됩니다.

#### 작동 방식

1. 사용자가 Codex를 시작하고 ChatGPT Business/Enterprise로 로그인
2. 유효하고 만료되지 않은 로컬 관리 requirements 캐시 항목이 있으면 사용
3. 캐시가 없거나 만료/손상/인증 아이덴티티 불일치 시 서비스에서 가져오기 시도 (재시도 포함)
4. 성공 시 서명된 새 캐시 항목 작성
5. 유효한 캐시가 없고 가져오기도 실패하면 관리 requirements 레이어 없이 계속 진행

### 제어 가능한 설정

| 카테고리 | 설정 키 | 설명 |
| --- | --- | --- |
| 승인 정책 | `allowed_approval_policies` | 허용되는 승인 정책 값 제한 |
| 샌드박스 모드 | `allowed_sandbox_modes` | 허용되는 샌드박스 모드 제한 |
| 웹 검색 | `allowed_web_search_modes` | 웹 검색 모드 제한 (`disabled`, `cached`, `live`) |
| 자동 검토 | `allowed_approvals_reviewers` | 승인 리뷰어 제한 (`auto_review`, `user`) |
| 명령 규칙 | `rules` | 제한적 명령 규칙 강제 |
| MCP 서버 | `mcp_servers` | 허용되는 MCP 서버 허용 목록 |
| 기능 플래그 | `features` | 기능 플래그 고정 |
| 파일 시스템 | `permissions.filesystem.deny_read` | 읽기 거부 경로/글로브 |
| 네트워크 | `experimental_network` | 네트워크 접근 요구사항 |
| 호스트별 샌드박스 | `remote_sandbox_config` | 호스트별 샌드박스 오버라이드 |
| 관리형 훅 | `hooks` | 관리자 강제 라이프사이클 훅 |
| 검토 정책 | `guardian_policy_config` | 자동 검토 정책 교체 |
| 거주지 제한 | `enforce_residency` | 데이터 거주지 제한 (예: `"us"`) |

### 예시

#### 승인 정책 및 샌드박스 제한

`--ask-for-approval never` 및 `--sandbox danger-full-access` (including `--yolo`) 차단:

```toml
allowed_approval_policies = ["untrusted", "on-request"]
allowed_sandbox_modes = ["read-only", "workspace-write"]
```

#### 웹 검색 제한

```toml
allowed_web_search_modes = ["cached"]  # "disabled"는 암시적으로 항상 허용
```

`allowed_web_search_modes = []`는 `"disabled"`만 허용합니다.

#### 파일 시스템 읽기 거부 (deny_read)

```toml
[permissions.filesystem]
deny_read = [
  "/**/*.env",    # 절대 경로 글로브
  "~/.ssh",       # 홈 디렉토리 상대경로 ($HOME/%USERPROFILE%)
]
```

- `deny_read`가 설정되면 Codex는 로컬 샌드박스 모드를 `read-only` 또는 `workspace-write`로 제한하여 강제할 수 있도록 합니다.
- **Windows**: 관리 `deny_read`는 직접 파일 도구에만 적용되며, 셸 서브프로세스 읽기에는 이 샌드박스 규칙이 사용되지 않습니다.
- `./`로 시작하는 상대 경로는 허용되지 않습니다.

#### 네트워크 접근 요구사항

```toml
experimental_network.enabled = true
experimental_network.dangerously_allow_all_unix_sockets = true
experimental_network.allow_local_binding = true
experimental_network.allowed_domains = [
  "api.openai.com",
  "*.example.com",
]
experimental_network.denied_domains = [
  "blocked.example.com",
  "*.exfil.example.com",
]
```

`experimental_network.managed_allowed_domains_only = true`를 사용하면 관리자 소유 `allowed_domains`만 독점적으로 적용됩니다. 관리 허용 규칙 없이 `true`로 설정하면 사용자가 추가한 도메인 허용 규칙이 적용되지 않습니다.

#### 기능 플래그 고정

```toml
[features]
personality = true
unified_exec = false

# 특정 Codex 서피스 비활성화
browser_use = false
in_app_browser = false
computer_use = false
```

| 플래그 | 효과 |
| --- | --- |
| `in_app_browser = false` | 인앱 브라우저 창 비활성화 |
| `browser_use = false` | Browser Use 및 Browser Agent 비활성화 |
| `computer_use = false` | Computer Use 및 관련 설치/설정 흐름 비활성화 |

생략된 키는 제한되지 않습니다.

#### 자동 검토 정책 구성

```toml
allowed_approval_policies = ["on-request"]
allowed_approvals_reviewers = ["auto_review"]

guardian_policy_config = """
## Environment Profile
- Trusted internal destinations include github.com/my-org, artifacts.example.com,
  and internal CI systems.

## Tenant Risk Taxonomy and Allow/Deny Rules
- Treat uploads to unapproved third-party file-sharing services as high risk.
- Deny actions that expose credentials or private source code to untrusted
  destinations.
"""
```

- `allowed_approvals_reviewers = ["auto_review"]`: 자동 검토 필수
- `"user"` 포함 시 사용자가 수동 승인 선택 가능
- 관리 `guardian_policy_config`는 로컬 `[auto_review].policy`보다 우선합니다.

#### 명령 규칙 강제

```toml
[rules]
prefix_rules = [
  { pattern = [{ token = "rm" }], decision = "forbidden", justification = "Use git clean -fd instead." },
  { pattern = [{ token = "git" }, { any_of = ["push", "commit"] }], decision = "prompt", justification = "Require review before mutating history." },
]
```

> `requirements.toml`의 규칙은 `decision`이 `prompt` 또는 `forbidden`이어야 합니다 (`allow` 불가). 일반 `.rules` 파일과 병합되며, 가장 제한적인 decision이 우선합니다.

#### MCP 서버 허용 목록

```toml
[mcp_servers.docs]
identity = { command = "codex-mcp" }

[mcp_servers.remote]
identity = { url = "https://example.com/mcp" }
```

- stdio 서버는 `command`로 매칭, streamable HTTP 서버는 `url`로 매칭
- `mcp_servers`가 존재하지만 비어있으면 모든 MCP 서버가 비활성화됩니다
- 이름과 아이덴티티가 모두 일치해야 활성화됩니다

### 호스트별 샌드박스 오버라이드

`remote_sandbox_config`로 호스트별로 다른 샌드박스 요구사항을 적용합니다.

```toml
allowed_sandbox_modes = ["read-only"]

[[remote_sandbox_config]]
hostname_patterns = ["*.devbox.example.com", "runner-??.ci.example.com"]
allowed_sandbox_modes = ["read-only", "workspace-write"]
```

- 첫 번째로 매칭되는 항목이 우선 적용됩니다
- 매칭이 대소문자 구분 없이 수행됩니다
- `*`는 임의의 문자 시퀀스, `?`는 한 문자와 매칭됩니다
- 호스트 이름 매칭은 정책 선택용이며, 인증된 디바이스 증명으로 간주하지 마세요

---

## Managed Configuration (managed_config.toml)

관리 기본값은 Codex 시작 시 적용되며, 사용자는 세션 중 변경할 수 있지만 **재시작 시 복원**됩니다.

### 위치

| 플랫폼 | 경로 |
| --- | --- |
| Linux/macOS (Unix) | `/etc/codex/managed_config.toml` |
| Windows (non-Unix) | `~/.codex/managed_config.toml` |

파일이 없으면 관리 레이어를 건너뜁니다.

### 구성 우선순위

| 우선순위 | 소스 |
| --- | --- |
| 1 (최고) | macOS 관리 환경설정 (MDM) |
| 2 | `managed_config.toml` |
| 3 | `config.toml` (사용자 기본 구성) |

CLI `--config key=value` 오버라이드는 베이스에 적용되지만, 관리 레이어가 우선합니다. 즉, 로컬 플래그를 제공해도 각 실행이 관리 기본값에서 시작됩니다.

클라우드 관리 requirements는 requirements 레이어에 영향을 미치며 managed defaults에는 영향을 주지 않습니다.

### 예시 managed_config.toml

```toml
# 보수적 기본값 설정
approval_policy = "on-request"
sandbox_mode    = "workspace-write"

[sandbox_workspace_write]
network_access = false             # 네트워크 비활성화 유지

[otel]
environment = "prod"
exporter = "otlp-http"             # collector 지정
log_user_prompt = false            # 프롬프트 내용 익명화
```

### 권장 가드레일

- 대부분의 사용자에게는 승인이 포함된 `workspace-write`를 권장, 제어된 컨테이너에만 전체 접근 예약
- 보안 검토에서 collector 또는 워크플로우에 필요한 도메인을 허용하지 않는 한 `network_access = false` 유지
- 관리 구성으로 OTel 설정(exporter, environment)을 고정하되, 정책에서 명시적으로 허용하지 않는 한 `log_user_prompt = false` 유지
- 로컬 `config.toml`과 관리 정책 간 차이를 정기적으로 감사하여 드리프트 파악

---

## macOS MDM 배포

macOS에서는 MDM을 통해 설정을 배포할 수 있습니다.

### 설정 방법

| 항목 | 값 |
| --- | --- |
| Preference Domain | `com.openai.codex` |
| 관리 기본값 키 | `config_toml_base64` |
| Requirements 키 | `requirements_toml_base64` |

### MDM 배포 워크플로우

1. 관리 페이로드 TOML을 작성하고 `base64`로 인코딩 (줄바꿈 없이)
2. MDM 프로필의 `com.openai.codex` 도메인에 문자열 배치
3. 프로필 푸시 후 사용자에게 Codex 재시작 요청
4. 시작 구성 요약에서 관리 값 반영 확인
5. 정책 변경 시 관리 페이로드 업데이트, 다음 실행 시 반영

페이로드에 시크릿이나 자주 변경되는 동적 값을 포함하지 마세요. 관리 TOML을 변경 관리 대상 MDM 설정처럼 취급하세요.

### 지원 도구

Jamf Pro, Fleet, Kandji 등 표준 macOS MDM 도구 사용 가능.

---

## Managed Hooks

`requirements.toml`에서 관리형 라이프사이클 훅을 직접 정의할 수 있습니다.

### 설정

```toml
# 사용자/프로젝트/세션/플러그인 훅을 건너뛰고 관리 훅만 허용
allow_managed_hooks_only = true

[features]
hooks = true

[hooks]
managed_dir = "/enterprise/hooks"
windows_managed_dir = 'C:\enterprise\hooks'

[[hooks.PreToolUse]]
matcher = "^Bash$"

[[hooks.PreToolUse.hooks]]
type = "command"
command = "python3 /enterprise/hooks/pre_tool_use_policy.py"
command_windows = 'py -3 C:\enterprise\hooks\pre_tool_use_policy.py'
timeout = 30
statusMessage = "Checking managed Bash command"
```

### 주의사항

- Codex는 `requirements.toml`의 훅 설정을 강제하지만, 스크립트 파일은 배포하지 않습니다
- 스크립트는 MDM 또는 디바이스 관리 도구로 별도 배포해야 합니다
- 관리 훅 명령은 구성된 관리 디렉토리 내의 절대 경로를 참조해야 합니다
- `allow_managed_hooks_only = true`는 사용자, 프로젝트, 세션, 플러그인 소스의 훅을 건너뛰지만 `requirements.toml` 및 다른 관리 구성 레이어의 훅은 로드합니다
- 사용자가 로컬에서 훅을 비활성화한 경우에도 관리 훅을 강제하려면 `[features].hooks = true`를 `[hooks]`와 함께 설정하세요

---

## Amazon Bedrock 배포

Amazon Bedrock을 모델 제공자로 구성하면 Codex가 로컬에서 실행되면서 모델 요청을 Bedrock으로 보냅니다. AWS 관리 인증 및 접근 제어를 사용합니다.

### 작동 방식

- OpenAI 호스트 Responses API가 요청 경로에 포함되지 않습니다
- Codex가 모델 요청을 Amazon Bedrock으로 전송
- Bedrock이 지원되는 OpenAI 모델에 대해 OpenAI 호환 Responses API 구현을 제공
- 인증은 AWS 네이티브: Bedrock API 키 또는 AWS IAM 자격 증명 사용
- ChatGPT 로그인이나 `OPENAI_API_KEY`는 이 제공자에 사용되지 않습니다

### 사전 요구사항

| 요구사항 | 설명 |
| --- | --- |
| Bedrock 모델 접근 | Amazon Bedrock에서 지원되는 OpenAI 모델에 대한 접근 권한 |
| AWS 리전 | 선택한 모델이 사용 가능한 AWS 리전 |
| 인증 구성 | AWS 계정에 대해 구성된 Amazon Bedrock Mantle 경로 인증 |

### 구성

`~/.codex/config.toml`에 `amazon-bedrock` 모델 제공자를 추가합니다.

```toml
model_provider = "amazon-bedrock"
```

> 이 가이드는 지원되는 상업 AWS 리전의 Amazon Bedrock Mantle 경로를 다룹니다. AWS GovCloud 리전의 Bedrock Mantle 엔드포인트는 지원되지 않습니다.

### 인증 옵션

Codex는 다음 순서로 확인합니다:

| 우선순위 | 방식 | 설명 |
| --- | --- | --- |
| 1 | Bedrock API 키 | `AWS_BEARER_TOKEN_BEDROCK` 환경 변수 |
| 2 | AWS SDK 자격 증명 체인 | 표준 AWS SDK 자격 증명 소스 |

#### 옵션 1: Bedrock API 키

API 키 인증 사용 시 리전을 반드시 지정해야 합니다.

```bash
export AWS_BEARER_TOKEN_BEDROCK=<YOUR_BEDROCK_API_KEY>
export AWS_REGION=us-east-2
```

#### 옵션 2: AWS SDK 자격 증명

| 방식 | 명령/설정 |
| --- | --- |
| 공유 AWS config/credentials 파일 | `aws configure` |
| 환경 변수 | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` |
| AWS Management Console | `aws login` |
| AWS SSO / 이름이 지정된 프로필 | `aws sso login --profile codex-bedrock` + `export AWS_PROFILE=codex-bedrock` |
| 페더레이션 아이덴티티 | `credential_process`로 구성된 AWS 프로필 |

### 데스크톱 앱 및 VS Code Extension

데스크톱 앱과 IDE Extension은 셸의 환경 변수를 상속하지 않을 수 있습니다. `~/.codex/.env`에 필요한 값을 넣고 앱/Extension을 재시작하세요.

```
export AWS_BEARER_TOKEN_BEDROCK=<YOUR_BEDROCK_API_KEY>
export AWS_REGION=us-east-2
```

### 지원 모델

```
openai.gpt-5.5
openai.gpt-5.4
```

모델 가용성은 AWS 리전에 따라 다릅니다.

### 설정 확인

- CLI: `/status` 열고 `amazon-bedrock` 모델 제공자 사용 확인
- 데스크톱 앱/VS Code Extension: 재시작 후 새 세션 시작
- 선택한 모델이 구성된 AWS 리전에서 사용 가능한지, AWS 아이덴티티에 접근 권한이 있는지 확인

### Fast Mode 제한

Fast Mode는 우선 처리(priority processing)를 사용하며, 초기 Amazon Bedrock 제공은 온디맨드 추론만 지원하므로 Fast Mode를 사용할 수 없습니다.

### 기능 가용성

| 기능 | Amazon Bedrock |
| --- | --- |
| **접근 및 서피스** | |
| Codex web | -- |
| Codex app (로컬 작업) | 지원 |
| Codex CLI | 지원 |
| IDE Extension | 지원 |
| Codex SDK, `codex exec`, 스크립트 가능한 워크플로우 | 지원 |
| **모델 및 멀티모달** | |
| Bedrock 지원 OpenAI 모델 추론 | 지원 |
| Fast Mode | -- |
| 이미지 생성/편집 | -- |
| 음성 받아쓰기 | -- |
| 웹 검색 | -- |
| **로컬 기능** | |
| `/review` 로컬 코드 리뷰 | 지원 |
| 승인 요청에 대한 Auto-review | 지원 |
| 샌드박싱 및 권한 제어 | 지원 |
| 프로젝트/독립형 앱 자동화 | 지원 |
| Automations | 지원 |
| Worktree 및 내장 Git 도구 | 지원 |
| 로컬 환경 및 반복 가능한 작업 | 지원 |
| Appshots | 지원 |
| **브라우저 및 원격 제어** | |
| 인앱 브라우저 미리보기 및 코멘트 | 지원 |
| Browser Use 자동화 | 제한적* |
| Chrome Extension 브라우저 제어 | 제한적* |
| Computer Use | 제한적* |
| SSH 원격 연결 | 지원 |
| 모바일 원격 제어 | -- |
| **커스터마이제이션 및 확장** | |
| `AGENTS.md` 커스텀 지침 | 지원 |
| Skills | 지원 |
| Plugins | 제한적† |
| Plugin 공유 | -- |
| App connectors | -- |
| MCP | 지원 |
| Subagents 및 커스텀 에이전트 | 지원 |
| Memories | 제한적* |
| Chronicle | -- |
| **클라우드 및 통합** | |
| Codex cloud 작업 | -- |
| Sites | -- |
| GitHub `@codex` 이슈/PR 위임 | -- |
| GitHub 코드 리뷰 및 자동 PR 리뷰 | -- |
| Slack 클라우드 통합 | -- |
| Linear 클라우드 통합 | -- |
| **관리, 보안, Analytics** | |
| SAML SSO, MFA, 워크스페이스 사용자 관리 | -- |
| `requirements.toml` 관리 구성 | 지원 |
| 클라우드 관리 구성 정책 | -- |
| Codex RBAC 및 커스텀 롤 | -- |
| SCIM, EKM, 도메인 검증 | -- |
| 엔터프라이즈 보존 및 거주지 제어 | -- |
| 기본적으로 API/비즈니스 데이터 학습 안 함 | 지원 |
| Analytics Dashboard | -- |
| Analytics API | -- |
| Compliance API 및 감사 로그 | -- |
| Codex Security (연결된 GitHub 리포지토리) | -- |

\* 특정 리전으로만 제한됩니다. 개별 기능 문서에서 지역 제한을 확인하세요.

† 일부 자사 플러그인을 사용할 수 없습니다.

### 문제 해결

| 확인 항목 | 설명 |
| --- | --- |
| 모델 ID | 지원되는 모델과 정확히 일치하는지 확인 |
| AWS 리전 | 모델이 사용 가능한 리전인지 확인 |
| 자격 증명 유효성 | Bedrock API 키 또는 AWS 자격 증명이 만료되지 않았는지 확인 |
| 모델 접근 권한 | AWS 아이덴티티에 선택한 Bedrock 모델 접근 권한이 있는지 확인 |
| `AWS_BEARER_TOKEN_BEDROCK` | 만료되거나 의도하지 않은 키로 설정되어 있지 않은지 확인 |
| 환경 변수 | 데스크톱 앱/VS Code Extension의 경우 `~/.codex/.env`에 필요한 변수가 있는지 확인 |

### 지원 경계

| OpenAI Support 담당 | AWS Support / 관리자 담당 |
| --- | --- |
| Codex 클라이언트 설정 및 구성 | AWS 자격 증명 및 IAM 권한 |
| 로컬 CLI, 데스크톱 앱, IDE Extension 동작 | Bedrock 모델 접근, 할당량, 빌링 |
| 로컬 Codex 제품 경험 | 리전 가용성 |
| | Bedrock 요청 실패 및 서비스 로그 |

---

## 엔터프라이즈 보안 기능

Codex는 ChatGPT Enterprise 보안 기능을 지원합니다.

| 기능 | 설명 |
| --- | --- |
| **데이터 학습 없음** | 엔터프라이즈 데이터로 모델 학습을 수행하지 않음 |
| **Zero Data Retention (ZDR)** | App, CLI, IDE의 경우 코드가 개발자 환경에만 유지됨 |
| **거주지 및 보존** | ChatGPT Enterprise 정책을 따름 |
| **세부 사용자 접근 제어** | RBAC 및 워크스페이스 토글로 권한 관리 |
| **저장 데이터 암호화** | AES-256 |
| **전송 중 암호화** | TLS 1.2+ |
| **감사 로깅** | ChatGPT Compliance API를 통한 감사 로그 |

보안 제어 및 런타임 보호에 대한 자세한 내용은 Agent approvals & security 문서를, ZDR에 대한 자세한 내용은 Zero Data Retention (ZDR) 문서를 참조하세요. 광범위한 엔터프라이즈 보안 개요는 Codex 보안 백서를 참조하세요.

---

## Governance 및 Observability

Codex는 엔터프라이즈 팀에 채택 및 영향에 대한 가시성과 보안 및 컴플라이언스 프로그램에 필요한 감사 기능을 제공합니다.

### 모니터링 방식

| 방식 | 용도 |
| --- | --- |
| **Analytics Dashboard** | 빠른 채택 및 코드 리뷰 영향 가시성 |
| **Analytics API** | 데이터 웨어하우스/BI 도구에 일일 메트릭 연동 |
| **Compliance API** | 감사, 모니터링, 조사를 위한 상세 활동 로그 내보내기 |

### Analytics Dashboard

ChatGPT 워크스페이스 관리자가 셀프 서비스로 채택 현황을 추적할 수 있습니다.

**제공 대시보드**:

| 대시보드 | 내용 |
| --- | --- |
| 제품별 일일 사용자 | CLI, IDE, cloud, Code Review |
| 일일 코드 리뷰 사용자 | Code Review 고유 사용자 수 |
| 일일 코드 리뷰 | 총 리뷰 수 |
| 우선순위별 코드 리뷰 | 우선순위별 분류 |
| 감성별 일일 코드 리뷰 | 피드백 감성별 분류 (긍정/부정/중립) |
| 일일 클라우드 작업 | 작업 수 |
| 일일 클라우드 사용자 | 고유 사용자 수 |
| 일일 VS Code Extension 사용자 | VS Code 고유 사용자 수 |
| 일일 CLI 사용자 | CLI 고유 사용자 수 |

**데이터 내보내기**: CSV 또는 JSON 형식으로 내보내기 가능.

| 내보내기 항목 | 내용 |
| --- | --- |
| Code review users and reviews | 일일 고유 사용자 및 총 리뷰 완료 수 |
| Code review findings and feedback | 일일 코멘트, 반응, 답변, 우선순위별 발견 수 |
| Cloud users and tasks | 일일 고유 클라우드 사용자 및 완료된 작업 |
| CLI and VS Code users | CLI 및 VS Code Extension 일일 고유 사용자 |
| Sessions and messages per user | 모든 서피스의 일일 세션 시작 및 사용자 메시지 수 |

### Analytics API

프로그래밍 방식으로 Codex 메트릭을 가져옵니다. 일일 시계열 메트릭을 제공하며, 선택적으로 사용자별 및 클라이언트별 세부 분류가 가능합니다.

**엔드포인트**:

```
https://api.chatgpt.com/v1/analytics/codex
```

| 엔드포인트 | 설명 |
| --- | --- |
| `/workspaces/{id}/usage` | 일일 스레드, 턴, 크레딧 집계, 클라이언트 서피스별 세부 분류 |
| `/workspaces/{id}/code_reviews` | PR 리뷰 완료 수, 코멘트 수, 심각도 분류 |
| `/workspaces/{id}/code_review_responses` | 코멘트 반응(찬성/반대 포함), 참여도 분석 |

**작동 방식**:
- 일일 단위, 시간 윈도우 기반
- 결과는 시간순으로 정렬, 커서 기반 페이지네이션
- 워크스페이스별 조회, 선택적으로 사용자별 그룹화 또는 워크스페이스 수준 집계

**일반 사용 사례**:
- 엔지니어링 가시성 대시보드
- 리더십 보고용 채택 보고
- 사용 거버넌스 및 비용 모니터링

#### Analytics API 키 설정 절차

1. OpenAI API Platform Portal에 owner 또는 admin으로 로그인, 올바른 조직 선택
2. API keys 페이지로 이동
3. Codex Analytics 전용 새 시크릿 키 생성 (예: 이름을 `Codex Analytics API`로 지정)
4. 조직에 적합한 프로젝트 선택
5. 키 권한을 **Read only**로 설정 (이 API는 analytics 데이터만 검색)
6. 키 값 복사 후 안전하게 저장 (한 번만 확인 가능)
7. `support@openai.com`에 이메일을 보내 해당 키를 `codex.enterprise.analytics.read` 스코프로만 제한 요청
8. OpenAI에서 Codex Analytics API 접근 확인을 받을 때까지 대기

#### Analytics API 사용

```bash
curl -H "Authorization: Bearer <YOUR_PLATFORM_API_KEY>" \
  "https://api.chatgpt.com/v1/analytics/codex/workspaces/<WORKSPACE_ID>/usage"
```

- `workspace_id`는 ChatGPT Admin 콘솔의 Workspace details에서 확인
- `start_time`, `end_time`으로 보고 기간 설정
- `next_page`로 다음 페이지 조회

### Compliance API

감사 및 조사를 위한 활동 로그를 내보냅니다. eDiscovery, DLP, SIEM 또는 기타 컴플라이언스 시스템과 함께 사용하도록 설계되었습니다.

**엔드포인트**:

```
https://api.chatgpt.com/v1/
```

| 엔드포인트 | 설명 |
| --- | --- |
| `/compliance/workspaces/{id}/logs` | 사용 가능한 로그 파일 목록 |
| `/compliance/workspaces/{id}/logs/{file_id}` | 특정 로그 파일 다운로드 |
| `/compliance/workspaces/{id}/codex_tasks` | Codex 작업 목록 |
| `/compliance/workspaces/{id}/codex_environments` | Codex 환경 목록 |

**로그 보존**: 최대 30일

**내보낼 수 있는 항목**:

| 항목 | 설명 |
| --- | --- |
| 활동 로그 | 프롬프트 텍스트, Codex 생성 응답, 워크스페이스/사용자/타임스탬프/모델 식별자, 토큰 사용량 |
| 메타데이터 | 누가 작업을 실행했는지, 언제 실행되었는지, 어떤 모델이 사용되었는지, 얼마나 많은 콘텐츠가 처리되었는지 |

**일반 사용 사례**:
- 보안 조사
- 컴플라이언스 보고
- 정책 집행 감사
- SIEM 및 eDiscovery 파이프라인으로의 이벤트 라우팅

> API 키 인증으로 사용된 Codex 사용량은 API 조직 설정을 따르며 Compliance API 내보내기에 포함되지 않습니다.

#### Compliance API "제공하지 않는 것"

Compliance API는 다음을 제공하지 않습니다:

| 항목 | 이유 |
| --- | --- |
| 생성된 코드 줄 수 | 생산성의 노이지한 프록시이며 잘못된 행동을 장려할 수 있음 |
| 제안 수락률 | 사용자가 보통 먼저 변경을 수락하므로 거의 100%에 가까움 |
| 코드 품질 또는 성능 KPI | 측정 대상이 아님 |

#### Compliance API 키 설정 절차

1. OpenAI API Platform Portal에 owner 또는 admin으로 로그인, 올바른 조직 선택
2. API keys 페이지로 이동
3. Compliance API 전용 새 시크릿 키 생성, 적절한 프로젝트 선택
4. **All permissions** 선택
5. 키 값 복사 후 안전하게 저장 (한 번만 확인 가능)
6. `support@openai.com`에 이메일 전송:
   - API 키의 마지막 4자리
   - 키 이름
   - 생성자 이름
   - 필요한 스코프: `read`, `delete` 또는 둘 다
7. OpenAI에서 Compliance API 접근 확인을 받을 때까지 대기

#### Compliance API 사용

```bash
# 로그 파일 목록
curl -L -H "Authorization: Bearer <YOUR_COMPLIANCE_API_KEY>" \
  "https://api.chatgpt.com/v1/compliance/workspaces/<WORKSPACE_ID>/logs?event_type=CODEX_LOG&after=2026-03-01T00:00:00Z"

# Codex 작업 목록
curl -H "Authorization: Bearer <YOUR_COMPLIANCE_API_KEY>" \
  "https://api.chatgpt.com/v1/compliance/workspaces/<WORKSPACE_ID>/codex_tasks"
```

### 추천 거버넌스 설정

| 역할 | 담당 |
| --- | --- |
| 채택 보고 소유자 | Analytics Dashboard 및 API 모니터링 |
| 감사/컴플라이언스 소유자 | Compliance API 로그 검토 |
| 검토 주기 | 정기적인 거버넌스 리뷰 일정 수립 |
| 성공 기준 | 무엇이 성공인지 정의 |

---

## 원격 연결

원격 연결을 통해 다른 디바이스나 다른 머신에서 Codex를 사용할 수 있습니다.

### 지원 연결 유형

| 유형 | 설명 |
| --- | --- |
| **모바일 → Codex App 호스트** | ChatGPT 모바일 앱에서 Mac/Windows Codex App 호스트 제어 |
| **Codex App → Codex App** | 다른 Codex App 기기에서 작업 계속 |
| **Codex App → SSH 호스트** | SSH 호스트의 프로젝트에 연결 |

### 모바일 원격 접속

원격 접속은 연결된 호스트의 프로젝트, 스레드, 파일, 자격 증명, 권한, 플러그인, Computer Use, 브라우저 설정, 로컬 도구를 사용합니다.

**지원 호스트 OS**: macOS, Windows

**지원 모바일**: iOS, Android (ChatGPT 모바일 앱)

> Windows는 현재 다른 컴퓨터를 제어할 수 없습니다.

#### 설정 절차

1. **호스트에서 시작**: Codex App에서 사이드바의 **Set up Codex mobile** 선택
2. **QR 코드 스캔**: 휴대폰으로 QR 코드 스캔 → ChatGPT 열기
3. **ChatGPT에서 완료**: 동일한 ChatGPT 계정/워크스페이스 확인, MFA/SSO/패스키 완료
4. **호스트 설정 검토**: Settings > Connections에서 연결된 기기 관리

> 워크스페이스를 통해 Codex를 사용하는 경우 관리자가 Remote Control 접근을 활성화해야 합니다.

### SSH 원격 연결

Codex App에서 SSH 호스트의 원격 프로젝트를 추가하고 원격 파일 시스템 및 셸에 대해 스레드를 실행합니다.

#### 설정 절차

1. SSH config에 호스트 추가 (Codex가 자동 검색)

```ssh
Host devbox
  HostName devbox.example.com
  User you
  IdentityFile ~/.ssh/id_ed25519
```

2. Codex App 실행 머신에서 SSH 연결 확인

```bash
ssh devbox
```

3. 원격 호스트에 Codex 설치 및 인증
4. Codex App에서 **Settings > Connections**에서 SSH 호스트 추가/활성화 후 원격 프로젝트 폴더 선택

> 원격 연결은 SSH를 사용하여 원격 Codex app server를 시작하고 관리합니다. app server 전송을 공용 네트워크에 직접 노출하지 마세요.

### 보안 릴레이

Codex는 신뢰할 수 있는 머신을 공용 인터넷에 직접 노출하지 않고 승인된 ChatGPT 기기에서 접근할 수 있도록 보안 릴레이 레이어를 사용합니다.

샌드박스 설정, 보안 제어, 작업 승인은 연결된 세션에도 그대로 적용됩니다.

### 문제 해결

| 문제 | 해결 방법 |
| --- | --- |
| 휴대폰에 호스트가 보이지 않음 | Codex App이 실행 중인지, Allow other devices to connect가 활성화되어 있는지, 동일한 계정/워크스페이스인지 확인 |
| 승인 요청이 나타나지 않음 | 동일한 계정/워크스페이스 확인, QR 코드 재스캔, 관리자에게 Remote Control 접근 활성화 확인 |
| 원격 세션 연결 끊김 | 호스트가 절전 모드인지, 네트워크 연결이 끊겼는지, Codex가 종료되었는지 확인 |
| 인증 문제 | MFA/SSO/패스키 인증 완료, 관리자에게 Remote Control 접근 확인 |
