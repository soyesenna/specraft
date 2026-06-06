#!/usr/bin/env node
import { spawnSync } from "node:child_process"

const hookCommand = "hook context"
const result = spawnSync("specraft-mcp-proxy", hookCommand.split(" "), {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
})

process.stdout.write(
  result.status === 0 && result.stdout.trim() !== ""
    ? result.stdout
    : "Rehydrate specraft context with specraft_query before continuing.\n",
)
