#!/usr/bin/env node
import { spawnSync } from "node:child_process"

const hookCommand = "hook user-prompt-submit"
const result = spawnSync("specraft-mcp-proxy", hookCommand.split(" "), {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
})

if (result.status === 0 && result.stdout.trim() !== "") {
  process.stdout.write(result.stdout)
} else {
  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason: result.stderr.trim() || "specraft prompt gate failed to run",
    }),
  )
}
