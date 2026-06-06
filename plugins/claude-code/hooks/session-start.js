#!/usr/bin/env node
import { spawnSync } from "node:child_process"

const hookCommand = "hook session-start"
const result = spawnSync("specraft-mcp-proxy", hookCommand.split(" "), {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
})

process.stdout.write(
  result.status === 0 && result.stdout.trim() !== ""
    ? result.stdout
    : "Use specraft context before repository answers. Run specraft_status if context injection is unavailable.\n",
)
