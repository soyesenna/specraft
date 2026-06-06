# 25. Computer Use (CLI)

> **출처**: [https://code.claude.com/docs/en/computer-use](https://code.claude.com/docs/en/computer-use)

---

## 1. 개요

Computer Use는 Claude가 앱을 열고, 화면을 제어하고, 사용자 대신 마우스/키보드로 작업할 수 있게 하는 기능이다. CLI에서 Swift 앱을 컴파일하고, 실행하고, 모든 버튼을 클릭하고, 결과를 스크린샷으로 캡처하는 작업을 코드를 작성한 동일한 대화에서 수행할 수 있다.

> 이 문서는 CLI에서의 Computer Use를 다룬다. macOS 또는 Windows의 Desktop 앱에서의 Computer Use는 별도 문서를 참조하라.

### Computer Use로 할 수 있는 일

| 용도 | 설명 |
| --- | --- |
| **네이티브 앱 빌드 및 검증** | macOS 메뉴바 앱을 만들도록 요청하면, Claude가 Swift 코드를 작성, 컴파일, 실행하고 모든 컨트롤을 클릭하여 검증 |
| **엔드투엔드 UI 테스트** | 로컬 Electron 앱의 온보딩 흐름 테스트 요청 시, 앱을 열고 가입 과정을 클릭하며 각 단계를 스크린샷으로 캡처. Playwright 설정이나 테스트 하네스 불필요 |
| **시각적/레이아웃 버그 디버깅** | "모달이 작은 창에서 잘린다"고 알려주면, Claude가 창 크기를 조절하고 버그를 재현하며 스크린샷을 촬영하고 CSS를 패치하여 수정 |
| **GUI 전용 도구 구동** | 디자인 도구, 하드웨어 제어판, iOS Simulator, CLI나 API가 없는 독점 앱과 상호작용 |

---

## 2. Computer Use 적용 시점

Claude는 앱이나 서비스와 상호작용하는 여러 방법을 가지고 있다. Computer Use는 가장 광범위하지만 가장 느린 방법이므로, Claude는 가장 정확한 도구를 먼저 시도한다.

| 우선순위 | 조건 | 사용 도구 |
| --- | --- | --- |
| 1 | 서비스에 대한 MCP 서버가 있는 경우 | MCP 서버 |
| 2 | 셸 명령으로 처리 가능한 작업 | Bash |
| 3 | 브라우저 작업이며 Claude in Chrome이 설정된 경우 | Claude in Chrome |
| 4 | 위 어느 것도 해당하지 않는 경우 | **Computer Use** |

화면 제어는 다른 방법으로 접근할 수 없는 네이티브 앱, 시뮬레이터, API가 없는 도구에 예약된다.

---

## 3. 활성화 방법

Computer Use는 `computer-use`라는 이름의 **내장 MCP 서버**로 제공된다. 기본적으로 비활성화되어 있으며, 직접 활성화해야 한다.

### 활성화 단계

1. Claude Code CLI에서 `/mcp` 명령 실행
2. `computer-use` 서버를 활성화
3. GUI가 필요한 작업을 Claude에게 요청

### 활성화 후 사용 예시

```
Build the app target, launch it, and click through each tab to make
sure nothing crashes. Screenshot any error states you find.
```

---

## 4. 세션별 앱 승인

`computer-use` 서버를 활성화해도 Claude가 머신의 모든 앱에 접근할 수 있는 것은 아니다. 세션에서 특정 앱이 처음 필요할 때 터미널에 프롬프트가 표시된다.

### 승인 프롬프트에 표시되는 정보

- Claude가 제어하려는 앱 목록
- 요청된 추가 권한 (예: 클립보드 접근)
- Claude가 작업하는 동안 숨겨질 다른 앱의 수

사용자는 **Allow for this session** 또는 **Deny**를 선택한다. 승인은 현재 세션 동안만 유효하며, 여러 앱을 동시에 승인할 수 있다.

### 특별 경고 앱

광범위한 권한을 가진 앱은 승인 전 추가 경고가 표시된다.

| 경고 | 대상 앱 |
| --- | --- |
| Equivalent to shell access | Terminal, iTerm, VS Code, Warp 및 기타 터미널/IDE |
| Can read or write any file | Finder |
| Can change system settings | System Settings |

이 앱들은 차단되지 않는다. 경고는 해당 수준의 접근이 필요한지 결정하도록 돕는다.

### 앱 카테고리별 제어 수준

| 앱 카테고리 | 제어 수준 |
| --- | --- |
| 브라우저, 트레이딩 플랫폼 | 보기 전용 (view-only) |
| 터미널, IDE | 클릭 전용 (click-only) |
| 기타 모든 앱 | 전체 제어 (full control) |

---

## 5. 화면 작동 방식

### 세션 단독 실행

Computer Use는 활성화 중 머신 전체 락을 유지한다. 다른 Claude Code 세션이 이미 컴퓨터를 사용 중이면 새 시도는 실패하며, 어떤 세션이 락을 보유하고 있는지 알려주는 메시지가 표시된다. 해당 세션을 종료하거나 완료해야 한다.

### 작업 중 앱 숨김

Claude가 화면 제어를 시작하면 승인된 앱만 상호작용하도록 다른 표시 중인 앱이 숨겨진다. 터미널 창은 표시 상태를 유지하며 스크린샷에서 제외되어, 세션을 관찰할 수 있고 Claude는 자신의 출력을 볼 수 없다.

Claude가 턴을 마치면 숨겨진 앱은 자동으로 복원된다.

### 스크린샷 자동 다운스케일링

Claude Code는 모든 스크린샷을 모델에 전송하기 전에 자동으로 다운스케일링한다. 디스플레이 해상도를 낮추거나 Retina/고해상도 디스플레이에서 창 크기를 조절할 필요가 없다.

| 디스플레이 | 원본 해상도 | 다운스케일된 해상도 |
| --- | --- | --- |
| 16인치 MacBook Pro (Retina) | 3456 x 2234 | 약 1372 x 887 |

> **참고**: 대상 크기를 변경하는 설정은 없다. 다운스케일링 후 화면의 텍스트나 컨트롤이 너무 작아 읽기 어려운 경우, 디스플레이 해상도가 아닌 앱 내에서 크기를 늘려라.

### 언제든 중단 가능

Claude가 락을 획득하면 macOS 알림이 표시된다: "Claude is using your computer - press Esc to stop."

| 중단 방법 | 설명 |
| --- | --- |
| `Esc` 키 | 어디서든 즉시 현재 작업 중단 |
| `Ctrl+C` (터미널) | 터미널에서 중단 |

두 방법 모두 Claude가 락을 해제하고, 앱을 복원하며, 제어권을 사용자에게 반환한다. Claude가 작업을 마치면 두 번째 알림이 표시된다.

---

## 6. 안전 및 신뢰 경계

기본 내장 가드레일이 위험을 줄인다. 별도의 설정이 필요하지 않다.

| 가드레일 | 설명 |
| --- | --- |
| **앱별 승인** | Claude는 현재 세션에서 승인한 앱만 제어 가능 |
| **센티넬 경고** | 셸, 파일시스템, 시스템 설정 접근을 부여하는 앱은 승인 전 플래그 표시 |
| **터미널 스크린샷 제외** | Claude가 터미널 창을 볼 수 없어, 세션의 온스크린 프롬프트가 모델에 피드백되지 않음 |
| **전역 Escape** | `Esc` 키가 어디서나 Computer Use를 중단하며, 키 입력이 소비되어 prompt injection이 이를 사용해 대화상자를 닫을 수 없음 |
| **락 파일** | 한 번에 하나의 세션만 머신을 제어 가능 |

---

## 7. 예시 워크플로우

### 네이티브 빌드 검증

macOS 또는 iOS 앱 변경 후, Claude에게 한 번에 컴파일하고 검증하도록 요청:

```
Build the MenuBarStats target, launch it, open the preferences window,
and verify the interval slider updates the label. Screenshot the
preferences window when you're done.
```

Claude가 `xcodebuild`를 실행하고, 앱을 실행하고, UI와 상호작용하며, 결과를 보고한다.

### 레이아웃 버그 재현

시각적 버그가 특정 창 크기에서만 나타나는 경우:

```
The settings modal clips its footer on narrow windows. Resize the app
window down until you can reproduce it, screenshot the clipped state,
then check the CSS for the modal container.
```

Claude가 창 크기를 조절하고, 깨진 상태를 캡처하며, 관련 스타일시트를 읽는다.

### 시뮬레이터 흐름 테스트

XCTest를 작성하지 않고 iOS Simulator를 구동:

```
Open the iOS Simulator, launch the app, tap through the onboarding
screens, and tell me if any screen takes more than a second to load.
```

Claude가 마우스로 사용자가 하는 것과 동일한 방식으로 시뮬레이터를 제어한다.

---

## 8. Desktop 앱과의 차이점

CLI와 Desktop은 동일한 Computer Use 엔진을 공유하지만, 몇 가지 차이가 있다.

| 기능 | Desktop | CLI |
| --- | --- | --- |
| **지원 플랫폼** | macOS 및 Windows | macOS 전용 |
| **활성화 방법** | Settings > General (Desktop app 섹션)에서 토글 | `/mcp`에서 `computer-use` 활성화 |
| **거부 앱 목록** | Settings에서 구성 가능 | 아직 사용 불가 |
| **자동 복원 토글** | 선택 사항 | 항상 켜짐 |
| **Dispatch 통합** | Dispatch에서 생성된 세션이 Computer Use 사용 가능 | 해당 없음 |

---

## 9. 트러블슈팅

### "Computer use is in use by another Claude session"

다른 Claude Code 세션이 락을 보유하고 있다. 해당 세션의 작업을 완료하거나 종료하라. 다른 세션이 충돌한 경우, Claude가 프로세스가 더 이상 실행되지 않음을 감지하면 락이 자동으로 해제된다.

### macOS 권한 프롬프트가 계속 표시됨

macOS는 Screen Recording 권한을 부여한 후 요청 프로세스의 재시작을 요구하는 경우가 있다. Claude Code를 완전히 종료하고 새 세션을 시작하라. 프롬프트가 계속되면 **System Settings > Privacy & Security > Screen Recording**을 열고 터미널 앱이 나열되어 있고 활성화되어 있는지 확인하라.

### `computer-use`가 `/mcp`에 나타나지 않음

서버는 조건을 충족하는 설정에서만 나타난다. 다음 사항을 확인하라.

| 확인 항목 | 내용 |
| --- | --- |
| **운영체제** | macOS여야 한다. CLI의 Computer Use는 Linux나 Windows에서 사용할 수 없다. Windows에서는 Desktop의 Computer Use를 사용하라. |
| **버전** | Claude Code v2.1.85 이상이어야 한다. `claude --version`으로 확인. |
| **요금제** | Pro 또는 Max 요금제여야 한다. `/status`로 구독을 확인. |
| **인증** | claude.ai를 통해 인증되어야 한다. Amazon Bedrock, Google Cloud Vertex AI, Microsoft Foundry 같은 서드파티 프로바이더에서는 Computer Use를 사용할 수 없다. 서드파티 프로바이더만 사용하는 경우 별도의 claude.ai 계정이 필요하다. |
| **세션 모드** | 대화형 세션이어야 한다. `-p` 플래그를 사용한 비대화형 모드에서는 Computer Use를 사용할 수 없다. |

---

## 10. 관련 문서

- **Computer use in Desktop**: 그래픽 설정 페이지가 있는 동일한 기능
- **Claude in Chrome**: 웹 기반 작업을 위한 브라우저 자동화
- **MCP**: 구조화된 도구와 API에 Claude 연결
- **Sandboxing**: Claude의 Bash 도구가 파일시스템 및 네트워크 접근을 격리하는 방법
- **Computer use safety guide**: Computer Use의 안전한 사용 모범 사례
