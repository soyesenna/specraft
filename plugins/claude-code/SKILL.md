---
name: specraft
description: Use specraft MCP tools for project spec context, query, ingest, and status before answering implementation questions.
---

# Specraft

At session start and after compact, read injected specraft context first. For project questions, call `specraft_query`. Before ending a write session, commit, push, and call `specraft_ingest` with a precise summary of code and spec changes.
