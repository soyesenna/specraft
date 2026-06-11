---
name: specraft-clarify
description: Resolve open questions of a spec area through user Q&A and record the answers.
---

# specraft-clarify

Resolve open questions for one spec area in the specraft wiki. The wiki is the
single source of truth — record resolutions via `specraft_ingest`, not repo files.

## 1. Locate the open questions
- Ask `specraft_query` "What are the open questions about <area>?".
- Follow the citations with `specraft_read_page` (citation `path`) and collect
  every bullet under `## Open Questions` headings. Use `specraft_tree` if the
  area name alone does not surface pages.
- If nothing is open, say so and stop.

## 2. Ask the user
Present the questions one by one, each with:
- the question and the page it came from,
- why it matters (what decision depends on it),
- your best-guess answer the user can simply confirm or correct.
Accept "still unknown" as a valid answer — keep those questions open.

## 3. Record the resolutions
Confirm HEAD is pushed to the remote first (ingest validates the commit exists;
push before calling). Then call `specraft_ingest` with:
- `agent: "codex"`, `summary`: "clarified <area>: <n> questions resolved"
- `spec_changes`: one entry per resolved question — `type: "modified"`,
  `area: "<area>"`, `description`: the decided answer as a factual statement,
  `reasoning`: "user clarification" plus the user's stated rationale
- `open_questions`: only the questions that remain unresolved

## 4. Self-verification
Re-ask `specraft_query` the original question from step 1 — resolved items must
no longer appear as open. If they do, ingest again with the missing facts.

## Cautions
- Ingest requires the HEAD commit to be pushed beforehand.
- On 409 `branch_locked`, inspect `specraft_conflicts` before retrying.
