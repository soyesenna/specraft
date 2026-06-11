---
name: specraft-init
description: Initialize a specraft wiki for this repository.
---

# specraft-init

Initialize the specraft wiki from a structured repository survey. Follow the steps in order.

## 1. Exploration checklist
Work through every item and take notes as you go:
- [ ] Directory structure (top-level layout, workspace/monorepo shape)
- [ ] Package/module boundaries and dependency direction
- [ ] Entry points (servers, CLIs, binaries, build targets)
- [ ] Core domain models and their relationships
- [ ] Test and build systems (commands, CI gates)
- [ ] Unresolved questions encountered along the way (collect — never guess)

## 2. Area split
Group findings into 5±2 areas along package or feature boundaries
(e.g. backend, shared-contracts, frontend, plugin, infra).
Every area must map to concrete directories you actually inspected.

## 3. spec_changes template (one entry per area)
```json
{
  "type": "added",
  "area": "<area name>",
  "description": "<factual statement of what exists — no speculation>",
  "reasoning": "<code evidence, e.g. 'apps/backend/src/server.ts defines buildServer()'>"
}
```

## 4. open_questions
Collect only questions a maintainer must answer: ambiguous ownership,
suspected dead code, unclear invariants. No rhetorical or answerable questions.

## 5. Ingest
Confirm HEAD is pushed to the remote first (ingest validates the commit exists).
Call `specraft_ingest` with `agent: "codex"`, the current branch, the HEAD
commit hash, the step-3 spec_changes, and the step-4 open_questions.

## 6. Self-verification
Ask `specraft_query` two representative questions (e.g. "What are the main
components?" plus one area-specific question). If the wiki cannot answer either,
write the missing facts as additional spec_changes and ingest again.

## Cautions
- Ingest requires the HEAD commit to be pushed beforehand.
- On 409 `branch_locked`, inspect `specraft_conflicts` before retrying.
