---
description: Turn a feature idea into a structured spec recorded in the specraft wiki
---

# /specraft-spec

Turn the user's feature idea into a structured spec. The wiki is the single
source of truth — write nothing to repository files; record via `specraft_ingest`.
If the wiki has a `steering.md` page (check `specraft_tree`), read it first and
keep the spec consistent with its standing rules.

## 1. Understand the idea
Restate the feature in one sentence and confirm with the user. Ask at most
2-3 questions if the goal or scope is genuinely unclear — never guess.

## 2. Draft the spec (template)
Fill every section; mark unknowns as open questions instead of inventing facts:

```markdown
## Goal
<one paragraph: what the feature achieves and for whom>

## Constraints
- <technical/product constraint, one per line>

## Acceptance Criteria
- [ ] <verifiable criterion — testable, no vague words>
```

## 3. Record to the wiki
Confirm HEAD is pushed to the remote first (ingest validates the commit exists;
push before calling). Then call `specraft_ingest` with:
- `agent: "claude-code"`, `summary`: one-line feature summary
- `spec_changes`: one entry — `type: "added"`, `area: "<feature name>"`,
  `description`: the full template text from step 2, `reasoning`: why this
  spec is needed (user request, problem evidence)
- `open_questions`: unresolved questions from step 1-2

## 4. Self-verification
Ask `specraft_query` "What is the spec for <feature name>?" — the answer must
reflect the Goal and Acceptance Criteria. If not, ingest the missing facts as
additional spec_changes and query again.

## Cautions
- Ingest requires the HEAD commit to be pushed beforehand.
- On 409 `branch_locked`, inspect `specraft_conflicts` before retrying.
