# M1 Implementation Evidence

Generated: 2026-06-06 KST

Scope: `ralplan-specraft-v1.md` up to M1 only. This includes the M0 scaffold required by the empty repository and the M1 `packages/shared` contract freeze. M2+ auth, DB, git-sync, LLM, plugin behavior, and full frontend workflows remain intentionally unimplemented.

## Automated Verification

- RED shared contract tests: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/red-shared.txt`
- RED server scaffold test: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/red-server.txt`
- RED frontend scaffold evidence alias: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/red-frontend.txt`
- Final `pnpm -r test`: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/final-test.txt`
- Final `pnpm -r typecheck`: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/final-typecheck.txt`
- Final `pnpm -r build`: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/final-build.txt`
- Final `pnpm biome check .`: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/final-biome.txt`
- TypeScript no-excuse audit: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/no-excuse.txt`

## Manual QA

- C001 tmux package-surface happy path: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/c001-happy.txt`
- C002 tmux malformed/P2/error-body path: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/c002-errors.txt`
- C003 HTTP and browser surface check: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/c003-surfaces.txt`
- C003 browser screenshot: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/c003-frontend.png`

Cleanup receipts are recorded in the C001, C002, and C003 evidence files.

## Post-Review Remediation

- Added `.dockerignore` so Docker build context excludes git metadata, local ULW state,
  env files/directories, dependency directories, generated outputs, coverage, keys, and
  common key/certificate files.
- Expanded the M1 shared contract surface to cover all spec §9.3 endpoint families:
  auth, api-key create/list/delete, admin invites/settings/member disable, conflicts,
  paginated ingest/query logs with member attribution, and wiki tree/page reads.
- Split shared schema/client files so implementation files stay below the 250 pure LOC review cap.
- Re-ran `pnpm -r test`, `pnpm -r typecheck`, `pnpm -r build`, `pnpm biome check .`,
  no-excuse pattern scan, and pure LOC scan after remediation; all passed.

## Latest External Docs Audit Remediation

- Rechecked the updated local OpenRouter, Claude Code, and Codex external docs against
  the v1 spec/plan and M1 implementation.
- OpenRouter `Responses API Beta` remains a separate beta endpoint from Chat Completions,
  so M1 keeps the existing internal REST/shared contract and defers provider transport
  choice to M4.
- Confirmed packages/shared production은 REST/Zod/API client 전용으로 유지한다.
- Documented that hook I/O·capability는 M0.5 검증 산출물로 분리하고 M7/M8 어댑터 입력으로 사용한다.
- Updated the spec and plan to clarify Claude Code `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`,
  `background_tasks`, `session_crons`, optional manifest packaging, Codex required
  `.codex-plugin/plugin.json`, and Codex matcher-ignored semantics.
