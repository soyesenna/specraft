# 17. 출력 스타일 (Output Styles)

> **원문**: [Output styles - Claude Code Docs](https://code.claude.com/docs/en/output-styles)
> **기존 참조**: [Settings - Output styles - Anthropic](https://docs.anthropic.com/en/docs/claude-code/settings)

---

## 목차

- [출력 스타일 개요](#출력-스타일-개요)
- [내장 출력 스타일](#내장-출력-스타일)
- [출력 스타일 변경](#출력-스타일-변경)
- [커스텀 출력 스타일 만들기](#커스텀-출력-스타일-만들기)
- [출력 스타일 작동 방식](#출력-스타일-작동-방식)

---

## 출력 스타일 개요

출력 스타일(Output Styles)은 Claude가 **어떻게 응답하는지**를 변경하며, Claude가 **무엇을 아는지**는 바꾸지 않습니다. 시스템 프롬프트를 수정하여 역할, 톤, 출력 형식을 설정합니다. 매 턴마다 같은 어조나 형식을 반복해서 요청하거나, Claude를 소프트웨어 엔지니어가 아닌 다른 역할로 동작하게 하려면 출력 스타일을 사용하세요.

커스텀 출력 스타일은 사용자 지침을 시스템 프롬프트에 추가하며, Claude Code의 내장 소프트웨어 엔지니어링 지침을 유지할지 선택할 수 있습니다. 항상 다이어그램으로 응답하는 것처럼 코딩은 하면서 Claude의 소통 방식만 바꿀 때는 유지하고, 글쓰기 도우미나 데이터 분석가처럼 소프트웨어 엔지니어링이 아예 필요 없는 경우에는 제외하세요.

프로젝트, 컨벤션, 코드베이스에 대한 지침에는 CLAUDE.md를 사용하세요.

---

## 내장 출력 스타일

Claude Code의 **Default** 출력 스타일은 소프트웨어 엔지니어링 작업을 효율적으로 완료하도록 설계된 기존 시스템 프롬프트입니다.

추가로 세 가지 내장 출력 스타일이 있습니다:

| 스타일 | 설명 |
|--------|------|
| **Default** | 기존 시스템 프롬프트. 소프트웨어 엔지니어링 작업을 효율적으로 완수하도록 설계 |
| **Proactive** | Claude가 즉시 실행하고, 일상적인 결정에 멈추지 않고 합리적인 가정을 세우며, 계획보다 행동을 우선합니다. auto mode가 적용하는 것보다 더 강력한 자율 실행 지침이며, 권한 모드는 변경하지 않으므로 도구 실행 전 여전히 권한 프롬프트가 표시됩니다 |
| **Explanatory** | 소프트웨어 엔지니어링 작업을 수행하면서 교육적인 "Insights"를 제공합니다. 구현 선택과 코드베이스 패턴을 이해하는 데 도움이 됩니다 |
| **Learning** | 협업적 learn-by-doing 모드. 코딩하면서 "Insights"를 공유할 뿐 아니라, 사용자가 직접 작은 전략적 코드를 기여하도록 요청합니다. Claude Code가 사용자가 구현할 `TODO(human)` 마커를 코드에 추가합니다 |

---

## 출력 스타일 변경

### /config 메뉴 사용

`/config`를 실행하고 **Output style**을 선택하여 메뉴에서 스타일을 고릅니다. 선택한 내용은 로컬 프로젝트 수준의 `.claude/settings.local.json`에 저장됩니다.

```bash
> /config
# Output style → 원하는 스타일 선택
```

### settings.json 직접 편집

메뉴 없이 스타일을 설정하려면, 설정 파일의 `outputStyle` 필드를 직접 편집하세요:

```json
{
  "outputStyle": "Explanatory"
}
```

> **참고**: 출력 스타일은 시스템 프롬프트의 일부이며, Claude Code는 세션 시작 시 한 번 읽습니다. 변경 사항은 `/clear` 또는 새 세션 후에 적용됩니다. 출력 스타일 변경이 캐시에 미치는 영향은 [prompt caching](https://code.claude.com/docs/en/prompt-caching) 문서를 참조하세요.

---

## 커스텀 출력 스타일 만들기

커스텀 출력 스타일은 Markdown 파일입니다: frontmatter에 메타데이터를 정의하고, 그 아래에 시스템 프롬프트에 추가할 지침을 작성합니다.

플러그인도 `output-styles/` 디렉터리에 출력 스타일을 제공할 수 있습니다.

### Frontmatter

출력 스타일 파일은 다음 frontmatter 필드를 지원합니다:

| Frontmatter | 용도 | 기본값 |
| --- | --- | --- |
| `name` | 출력 스타일 이름. 지정하지 않으면 파일 이름 사용 | 파일 이름 상속 |
| `description` | 출력 스타일 설명. `/config` 선택기에 표시됨 | 없음 |
| `keep-coding-instructions` | Claude Code의 내장 소프트웨어 엔지니어링 지침 유지 여부 | `false` |
| `force-for-plugin` | 플러그인 출력 스타일 전용: 플러그인이 활성화될 때마다 사용자가 선택하지 않아도 이 스타일을 자동 적용합니다. 사용자의 `outputStyle` 설정을 재정의합니다. 여러 활성 플러그인이 이 값을 설정하면 Claude Code가 먼저 로드된 것을 사용합니다 | `false` |

---

## 출력 스타일 작동 방식

출력 스타일은 Claude Code의 시스템 프롬프트를 직접 수정합니다.

- 모든 출력 스타일은 자체 커스텀 지침을 시스템 프롬프트 끝에 추가합니다.
- 모든 출력 스타일은 대화 중에 출력 스타일 지침을 준수하도록 Claude에게 리마인더를 트리거합니다.
- 커스텀 출력 스타일은 `keep-coding-instructions`가 `true`로 설정되지 않은 한, 변경 범위 지정, 주석 작성, 작업 검증 방법 등 Claude Code의 내장 소프트웨어 엔지니어링 지침을 생략합니다.

### 토큰 사용량

토큰 사용량은 스타일에 따라 다릅니다. 시스템 프롬프트에 지침을 추가하면 input token이 증가하지만, prompt caching 덕분에 세션 내 첫 번째 요청 이후에는 비용이 줄어듭니다. 내장 Explanatory와 Learning 스타일은 설계상 Default보다 긴 응답을 생성하므로 output token이 증가합니다. 커스텀 스타일의 output token 사용량은 지침이 Claude에게 무엇을 생성하도록 지시하는지에 따라 다릅니다.

### Output styles vs CLAUDE.md vs Agents 비교

여러 기능이 Claude Code의 동작을 커스터마이즈합니다. 출력 스타일은 시스템 프롬프트를 직접 수정하고 모든 응답에 적용됩니다. 나머지는 기본 시스템 프롬프트를 변경하지 않고 지침을 추가하거나, 특정 작업으로 범위를 제한합니다.

| 기능 | 작동 방식 | 사용 시기 |
| --- | --- | --- |
| **Output styles** | 시스템 프롬프트를 수정 | 매 턴마다 다른 역할, 톤, 기본 응답 형식을 원할 때 |
| **CLAUDE.md** | 시스템 프롬프트 이후에 user message로 추가 | Claude가 항상 프로젝트 컨벤션과 코드베이스 컨텍스트를 알아야 할 때 |
| **`--append-system-prompt`** | 시스템 프롬프트에 아무것도 제거하지 않고 추가 | 단일 실행에 일회성 추가를 원할 때 |
| **Agents** | 자체 시스템 프롬프트, 모델, 도구로 subagent 실행 | 집중된 작업에 대해 별도로 범위가 지정된 도우미를 원할 때 |
| **Skills** | 호출되거나 관련 있을 때 작업별 지침을 로드 | 재사용 가능한 워크플로가 있을 때 |

### 관련 문서

- **Settings**: `outputStyle` 필드가 있는 위치와 설정 우선순위 작동 방식
- **Permission modes**: Proactive 스타일이 auto mode와 어떻게 비교되는지
- **Plugins**: skills, hooks, agents와 함께 출력 스타일을 패키징하여 배포
- **Debug your configuration**: 출력 스타일이 적용되지 않는 원인 진단
