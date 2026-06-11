#!/usr/bin/env node
// Codex가 플러그인 훅을 기본 로드하지 않는 환경(openai/codex#16430,
// features.plugin_hooks 미활성)을 우회하기 위해 specraft 훅을 사용자 레벨
// hooks.json(~/.codex/hooks.json — _docs/external/codex/06-hooks.md §6)에 병합한다.
//
// - 멱등: 여러 번 실행해도 결과가 동일하다 (기존 specraft 항목을 교체).
// - 보존: specraft 외의 기존 훅 항목은 그대로 유지한다.
// - 제거: `--remove` 옵션으로 specraft 항목만 제거한다.
//
// 사용법:
//   node plugins/codex/scripts/install-global-hooks.mjs
//   node plugins/codex/scripts/install-global-hooks.mjs --remove

import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const SPECRAFT_MARKER = "/plugins/codex/hooks/"

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const codexHome = process.env.CODEX_HOME ?? join(homedir(), ".codex")
const hooksPath = join(codexHome, "hooks.json")
const removeMode = process.argv.includes("--remove")

function specraftHookGroups() {
  const hook = (script, timeout, statusMessage) => ({
    type: "command",
    command: `node "${join(pluginRoot, "hooks", script)}"`,
    timeout,
    statusMessage,
  })
  return {
    SessionStart: [
      {
        matcher: "startup|resume|clear",
        hooks: [hook("session-start.js", 10, "Specraft: Injecting spec context")],
      },
      {
        matcher: "compact",
        hooks: [hook("post-compact.js", 10, "Specraft: Re-injecting spec context")],
      },
    ],
    UserPromptSubmit: [
      { hooks: [hook("user-prompt-submit.js", 5, "Specraft: Checking pending replay")] },
    ],
    Stop: [{ hooks: [hook("stop.js", 10, "Specraft: Checking stop gate")] }],
  }
}

function isSpecraftHandler(handler) {
  return (
    handler !== null &&
    typeof handler === "object" &&
    typeof handler.command === "string" &&
    (handler.command.includes(SPECRAFT_MARKER) ||
      handler.command.includes(join(pluginRoot, "hooks")))
  )
}

function withoutSpecraft(events) {
  const result = {}
  for (const [eventName, groups] of Object.entries(events)) {
    if (!Array.isArray(groups)) {
      result[eventName] = groups
      continue
    }
    const kept = groups
      .map((group) => {
        if (group === null || typeof group !== "object" || !Array.isArray(group.hooks)) {
          return group
        }
        const handlers = group.hooks.filter((handler) => !isSpecraftHandler(handler))
        return handlers.length === group.hooks.length ? group : { ...group, hooks: handlers }
      })
      .filter(
        (group) =>
          group === null ||
          typeof group !== "object" ||
          !Array.isArray(group.hooks) ||
          group.hooks.length > 0,
      )
    if (kept.length > 0) {
      result[eventName] = kept
    }
  }
  return result
}

function readExisting() {
  if (!existsSync(hooksPath)) {
    return { hooks: {} }
  }
  let parsed
  try {
    parsed = JSON.parse(readFileSync(hooksPath, "utf8"))
  } catch {
    console.error(
      `error: ${hooksPath} 가 유효한 JSON이 아닙니다. 손상된 파일을 덮어쓰지 않습니다. 직접 복구하거나 삭제한 뒤 다시 실행하세요.`,
    )
    process.exit(1)
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    console.error(`error: ${hooksPath} 의 최상위 구조가 객체가 아닙니다.`)
    process.exit(1)
  }
  if (parsed.hooks === undefined) {
    parsed.hooks = {}
  }
  if (parsed.hooks === null || typeof parsed.hooks !== "object" || Array.isArray(parsed.hooks)) {
    console.error(`error: ${hooksPath} 의 "hooks" 키가 객체가 아닙니다.`)
    process.exit(1)
  }
  return parsed
}

function versionGuard() {
  const result = spawnSync("codex", ["--version"], { encoding: "utf8" })
  if (result.error || result.status !== 0) {
    console.warn(
      "warn: codex CLI를 찾을 수 없습니다. Codex 설치 후 훅이 동작합니다 (https://developers.openai.com/codex).",
    )
    return
  }
  console.log(`codex 감지: ${String(result.stdout).trim()}`)
  const configPath = join(codexHome, "config.toml")
  if (existsSync(configPath)) {
    const config = readFileSync(configPath, "utf8")
    if (/^\s*plugin_hooks\s*=\s*true\s*$/m.test(config)) {
      console.warn(
        "warn: config.toml에 features.plugin_hooks = true가 설정되어 있습니다. specraft 플러그인이 설치되어 있으면 플러그인 레벨 훅이 직접 로드되므로, 이 글로벌 설치와 중복 실행될 수 있습니다. 한쪽만 사용하세요 (글로벌 제거: --remove).",
      )
    }
  }
}

const existing = readExisting()
const cleaned = withoutSpecraft(existing.hooks)

if (removeMode) {
  const next = { ...existing, hooks: cleaned }
  writeFileSync(hooksPath, `${JSON.stringify(next, null, 2)}\n`)
  console.log(`specraft 훅을 제거했습니다: ${hooksPath}`)
  process.exit(0)
}

const merged = { ...cleaned }
for (const [eventName, groups] of Object.entries(specraftHookGroups())) {
  merged[eventName] = [...(merged[eventName] ?? []), ...groups]
}

mkdirSync(dirname(hooksPath), { recursive: true })
const next = { ...existing, hooks: merged }
writeFileSync(hooksPath, `${JSON.stringify(next, null, 2)}\n`)
console.log(`specraft 훅을 설치했습니다: ${hooksPath}`)
console.log(
  "참고: 새 훅은 다음 대화형 Codex 세션 시작 시 신뢰 검토(trust review)를 통과해야 실행됩니다.",
)
versionGuard()
