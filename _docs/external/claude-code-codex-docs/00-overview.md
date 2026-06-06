# Claude Code vs Codex 플러그인 생태계 종합 가이드

> 조사 일자: 2025-06-05 | 101개 병렬 에이전트로 조사 | 19개 공식 문서 소스 검증

## 개요

Claude Code(Anthropic)와 Codex(OpenAI)는 모두 구조화된 플러그인 생태계를 제공하지만, **철학과 확장 범위에서 뚜렷한 차이**가 있습니다.

| 구분 | Claude Code | Codex CLI |
|------|-------------|-----------|
| **매니페스트** | `.claude-plugin/plugin.json` | `.codex-plugin/plugin.json` |
| **컴포넌트 타입** | 5종 (commands, agents, skills, hooks, MCP) | 4종 (skills, apps, MCP, hooks) |
| **라이프사이클 훅** | 5종 | 10종 |
| **훅 핸들러** | command | command, prompt(예정), agent(예정) |
| **도구 호출 재작성** | 미지원 | 지원 (PreToolUse updatedInput) |
| **슬래시 명령어** | 마크다운 기반 | SKILL.md 기반 (오픈 에이전트 표준) |
| **MCP** | 클라이언트 | 클라이언트 + 서버 모드(실험적) |
| **보안 모델** | 신뢰 기반 | 해시 기반 신뢰 추적 + managed hooks |
| **배포 채널** | 마켓플레이스 | 로컬 스킬 + 플러그인 번들 |
| **엔터프라이즈** | 설정 공유 | requirements.toml 강제 구성 |

## 문서 구성

이 가이드는 다음 문서로 구성됩니다:

| 문서 | 내용 |
|------|------|
| [01-claude-code-plugin.md](./01-claude-code-plugin.md) | Claude Code 플러그인 개발 완전 가이드 |
| [02-codex-plugin.md](./02-codex-plugin.md) | Codex CLI 플러그인 개발 완전 가이드 |
| [03-hooks-comparison.md](./03-hooks-comparison.md) | 훅(Hook) 시스템 심층 비교 |
| [04-mcp-integration.md](./04-mcp-integration.md) | MCP 서버 통합 가이드 |
| [05-deployment-ecosystem.md](./05-deployment-ecosystem.md) | 배포 및 생태계 비교 |

## 핵심 차이점 요약

### Claude Code의 강점
- **마크다운 기반 저작**: 슬래시 명령어를 마크다운으로 작성 → 학습 곡선 낮음
- **간결한 훅 시스템**: 5종 훅으로 핵심 라이프사이클 커버
- **마켓플레이스 배포**: 공식 배포 채널을 통한 플러그인 공유
- **에이전트/서브에이전트**: 커스텀 에이전트 정의 및 툴 제한 가능

### Codex의 강점
- **세분화된 훅**: 10종 훅으로 더 정밀한 라이프사이클 제어
- **도구 호출 재작성**: PreToolUse에서 `updatedInput`으로 실시간 수정
- **엔터프라이즈 관리**: `requirements.toml`, managed hooks, 해시 기반 신뢰
- **MCP 서버 모드**: Codex 자체를 MCP 서버로 노출 가능
- **앱 연동**: GitHub, Slack, Google Drive 등 사전 구축된 커넥터

## 공식 문서 링크

### Anthropic (Claude Code)
- [Plugins](https://docs.anthropic.com/en/docs/claude-code/plugins)
- [Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands)
- [Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [MCP](https://docs.anthropic.com/en/docs/claude-code/mcp)
- [Settings](https://docs.anthropic.com/en/docs/claude-code/settings)
- [Subagents](https://docs.anthropic.com/en/docs/claude-code/subagents)

### OpenAI (Codex)
- [Plugins](https://developers.openai.com/codex/plugins)
- [Plugin Build](https://developers.openai.com/codex/plugins/build)
- [Hooks](https://developers.openai.com/codex/hooks)
- [Skills](https://developers.openai.com/codex/skills)
- [Config Reference](https://developers.openai.com/codex/config-reference)
- [GitHub: openai/codex](https://github.com/openai/codex)
- [GitHub: openai/skills](https://github.com/openai/skills)

### MCP (공통)
- [Build Server](https://modelcontextprotocol.io/docs/develop/build-server)

## 주의사항 (Caveats)

1. **Claude Code 훅**의 정확한 이벤트 목록은 공식 문서에서 확인되었으나, Codex처럼 공개 JSON Schema가 없어 코드 레벨 검증은 불가
2. **Codex prompt/agent 훅 핸들러**는 현재 "parsed but skipped" 상태로 향후 활성화 예정
3. **Codex MCP 서버 모드**(`codex mcp-server`)는 공식 문서에서 "experimental"로 표기
4. 두 플랫폼 모두 빠르게 진화 중이므로 설정 키나 동작이 변경될 수 있음
5. Claude Code 플러그인 마켓플레이스는 현재 초기 단계
