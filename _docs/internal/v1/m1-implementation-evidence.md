# M1 Implementation Evidence

Generated: 2026-06-06 KST

Scope: `ralplan-specraft-v1.md` up to M1 only. This includes the M0 scaffold required by the empty repository and the M1 `packages/shared` contract freeze. M2+ auth, DB, git-sync, LLM, plugin behavior, and full dashboard workflows remain intentionally unimplemented.

## Automated Verification

- RED shared contract tests: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/red-shared.txt`
- RED server scaffold test: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/red-server.txt`
- RED dashboard scaffold test: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/red-dashboard.txt`
- Final `pnpm -r test`: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/final-test.txt`
- Final `pnpm -r typecheck`: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/final-typecheck.txt`
- Final `pnpm -r build`: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/final-build.txt`
- Final `pnpm biome check .`: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/final-biome.txt`
- TypeScript no-excuse audit: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/no-excuse.txt`

## Manual QA

- C001 tmux package-surface happy path: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/c001-happy.txt`
- C002 tmux malformed/P2/error-body path: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/c002-errors.txt`
- C003 HTTP and browser surface check: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/c003-surfaces.txt`
- C003 browser screenshot: `.omo/ulw-loop/019e9c71-cca5-79d1-b2a2-4a934195c508/evidence/c003-dashboard.png`

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
