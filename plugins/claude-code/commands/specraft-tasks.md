---
description: Break a spec area into an executable task list tracked in the specraft wiki
---

# /specraft-tasks

Break one spec area into executable tasks. The wiki is the single source of
truth — record the plan via `specraft_ingest` (progress_updates), not repo files.

## 1. Load the spec
- Ask `specraft_query` "What is the spec for <area>?" and follow citations with
  `specraft_read_page` to read the Goal, Constraints, and Acceptance Criteria.
- If the area has no spec yet, stop and suggest `/specraft-spec` first.

## 2. Decompose into tasks
Derive 3-10 tasks that together satisfy every acceptance criterion:
- each task is independently completable and verifiable,
- name the concrete code areas it touches,
- order by dependency; flag tasks blocked by open questions.

## 3. Record the task list
Confirm HEAD is pushed to the remote first (ingest validates the commit exists;
push before calling). Then call `specraft_ingest` with:
- `agent: "claude-code"`, `summary`: "task breakdown for <area>"
- `spec_changes`: one entry — `type: "modified"`, `area: "<area>"`,
  `description`: the ordered task list as markdown bullets,
  `reasoning`: how the tasks map to the acceptance criteria
- `progress_updates`: one entry per task — `feature: "<area>: <task name>"`,
  `status: "planned"` (use `"blocked"` for tasks gated on open questions),
  `note`: scope and verification method
- `open_questions`: blockers discovered during decomposition

## 4. Self-verification
Ask `specraft_query` "What tasks are planned for <area>?" — every task from
step 2 must appear. If not, ingest the missing tasks and query again.

## Cautions
- Ingest requires the HEAD commit to be pushed beforehand.
- On 409 `branch_locked`, inspect `specraft_conflicts` before retrying.
