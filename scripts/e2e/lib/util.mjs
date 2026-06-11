// 공용 E2E 유틸리티: 단계 기록(PASS/SKIP/FAIL), 임시 디렉터리, 자식 프로세스 실행.
import { execFileSync, spawnSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

/** @typedef {{ name: string, status: "PASS" | "SKIP" | "FAIL", detail: string }} StepResult */

export class StepLog {
  /** @param {string} scope */
  constructor(scope) {
    this.scope = scope
    /** @type {StepResult[]} */
    this.results = []
  }

  /**
   * @param {"PASS" | "SKIP" | "FAIL"} status
   * @param {string} name
   * @param {string} detail
   */
  record(status, name, detail = "") {
    this.results.push({ name, status, detail })
    const suffix = detail ? ` — ${detail}` : ""
    process.stdout.write(`[${this.scope}] ${status} ${name}${suffix}\n`)
  }

  pass(name, detail = "") {
    this.record("PASS", name, detail)
  }

  skip(name, reason) {
    this.record("SKIP", name, reason)
  }

  fail(name, detail = "") {
    this.record("FAIL", name, detail)
  }

  get failed() {
    return this.results.filter((result) => result.status === "FAIL")
  }

  summary() {
    const counts = { PASS: 0, SKIP: 0, FAIL: 0 }
    for (const result of this.results) {
      counts[result.status] += 1
    }
    return `${this.scope}: ${counts.PASS} pass / ${counts.SKIP} skip / ${counts.FAIL} fail`
  }
}

/**
 * 정리 대상으로 등록되는 임시 디렉터리를 만든다.
 * @param {string} prefix
 * @param {Array<() => void>} cleanups
 */
export function tempDir(prefix, cleanups) {
  const dir = mkdtempSync(join(tmpdir(), `${prefix}-`))
  cleanups.push(() => rmSync(dir, { force: true, recursive: true }))
  return dir
}

/** 등록 역순으로 cleanup을 실행한다(실패는 무시). @param {Array<() => void>} cleanups */
export function runCleanups(cleanups) {
  for (const cleanup of [...cleanups].reverse()) {
    try {
      cleanup()
    } catch {
      // cleanup 실패는 하니스 결과에 영향을 주지 않는다.
    }
  }
}

/**
 * 동기 명령 실행(stdout 반환, 실패 시 throw).
 * @param {string} command
 * @param {readonly string[]} args
 * @param {{ cwd?: string, env?: Record<string, string | undefined>, input?: string, timeoutMs?: number }} [options]
 */
export function run(command, args, options = {}) {
  return execFileSync(command, [...args], {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env,
    input: options.input,
    timeout: options.timeoutMs ?? 120_000,
    maxBuffer: 16 * 1024 * 1024,
  }).trim()
}

/**
 * 동기 명령 실행(실패해도 throw하지 않고 결과 객체 반환).
 * @param {string} command
 * @param {readonly string[]} args
 * @param {{ cwd?: string, env?: Record<string, string | undefined>, input?: string, timeoutMs?: number }} [options]
 */
export function tryRun(command, args, options = {}) {
  const result = spawnSync(command, [...args], {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env,
    input: options.input,
    timeout: options.timeoutMs ?? 120_000,
    maxBuffer: 16 * 1024 * 1024,
  })
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ?? null,
  }
}

/** @param {string} name */
export function commandExists(name) {
  return tryRun(process.platform === "win32" ? "where" : "which", [name]).status === 0
}

/**
 * 조건이 참이 될 때까지 폴링한다.
 * @param {() => boolean | Promise<boolean>} predicate
 * @param {{ timeoutMs?: number, intervalMs?: number, label?: string }} [options]
 */
export async function waitFor(predicate, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15_000
  const intervalMs = options.intervalMs ?? 250
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate()) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error(`waitFor timed out: ${options.label ?? "condition"}`)
}
