import { existsSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { findSpecraftConfig } from "./config.js"

export const DEFAULT_SERVER_URL = "http://127.0.0.1:4311"

export type CredentialsEnv = Readonly<Record<string, string | undefined>>

function envOrNull(env: CredentialsEnv, name: string): string | null {
  const value = env[name]
  return value !== undefined && value !== "" ? value : null
}

export function credentialsPath(home: string): string {
  return join(home, ".specraft", "credentials")
}

/**
 * Credentials file format (~/.specraft/credentials): dotenv-style `KEY=VALUE`,
 * one entry per line. Blank lines and `#` comments are ignored. Recognized keys:
 * `SPECRAFT_API_KEY`, `SPECRAFT_SERVER_URL`.
 */
export function parseCredentials(content: string): Record<string, string> {
  const entries: Record<string, string> = {}
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim()
    if (line === "" || line.startsWith("#")) {
      continue
    }
    const separator = line.indexOf("=")
    if (separator <= 0) {
      continue
    }
    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim()
    if (key !== "" && value !== "") {
      entries[key] = value
    }
  }
  return entries
}

function warnOnLoosePermissions(path: string): void {
  if (process.platform === "win32") {
    return
  }
  const mode = statSync(path).mode & 0o777
  if ((mode & 0o077) !== 0) {
    process.stderr.write(
      `specraft: credentials file ${path} has mode 0${mode.toString(8)}; expected 0600 — run: chmod 600 ${path}\n`,
    )
  }
}

export function readCredentialsFile(home: string): Record<string, string> {
  const path = credentialsPath(home)
  if (!existsSync(path)) {
    return {}
  }
  try {
    warnOnLoosePermissions(path)
    return parseCredentials(readFileSync(path, "utf8"))
  } catch {
    return {}
  }
}

export type ResolveApiKeyOptions = {
  readonly home: string
  readonly env?: CredentialsEnv
}

/**
 * API key resolution chain:
 * 1. `SPECRAFT_API_KEY` env
 * 2. `CLAUDE_PLUGIN_OPTION_API_KEY` env (Claude Code plugin userConfig export)
 * 3. `~/.specraft/credentials` `SPECRAFT_API_KEY`
 */
export function resolveApiKey(options: ResolveApiKeyOptions): string | null {
  const env = options.env ?? process.env
  return (
    envOrNull(env, "SPECRAFT_API_KEY") ??
    envOrNull(env, "CLAUDE_PLUGIN_OPTION_API_KEY") ??
    readCredentialsFile(options.home)["SPECRAFT_API_KEY"] ??
    null
  )
}

export type ResolveServerUrlOptions = {
  readonly cwd: string
  readonly home: string
  readonly env?: CredentialsEnv
}

/**
 * Server URL resolution chain:
 * 1. `SPECRAFT_SERVER_URL` env
 * 2. `.specraft.json` `server_url` (project config)
 * 3. `~/.specraft/credentials` `SPECRAFT_SERVER_URL`
 * 4. `DEFAULT_SERVER_URL` (http://127.0.0.1:4311)
 */
export function resolveServerUrl(options: ResolveServerUrlOptions): string {
  const env = options.env ?? process.env
  return (
    envOrNull(env, "SPECRAFT_SERVER_URL") ??
    findSpecraftConfig(options.cwd)?.server_url ??
    readCredentialsFile(options.home)["SPECRAFT_SERVER_URL"] ??
    DEFAULT_SERVER_URL
  )
}
