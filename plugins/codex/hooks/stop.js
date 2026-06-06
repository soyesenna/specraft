#!/usr/bin/env node
process.stdout.write(
  JSON.stringify({
    decision: "block",
    reason:
      "If this session changed code, ensure the tree is clean, HEAD is pushed, and specraft_ingest succeeded. Read-only sessions are exempt.",
  }),
)
