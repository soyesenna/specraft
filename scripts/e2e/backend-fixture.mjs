// 9a. ephemeral backend 픽스처 — 임시 dataDir로 백엔드를 기동하고
// admin bootstrap → API 키 발급까지 자동화한다.
// LLM provider는 전달하지 않는다(미설정) → 키워드 폴백 모드 고정(결정적, 무키).
// 사용: 모듈 import(startBackendFixture/startBackendFixtureProcess) 또는 단독 실행:
//   node scripts/e2e/backend-fixture.mjs [--code-remote <bare-remote-path>]
//
// 주의: 시나리오가 spawnSync(동기)로 자식 프로세스를 띄우는 동안에는 하니스의
// 이벤트 루프가 멈추므로, in-process 백엔드(startBackendFixture)는 자식이 보내는
// HTTP 요청에 응답하지 못해 교착한다. CLI 세션을 동기 실행하는 시나리오는 반드시
// 별도 프로세스 백엔드(startBackendFixtureProcess)를 사용할 것.
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { runCleanups, tempDir } from "./lib/util.mjs"

const repoRoot = fileURLToPath(new URL("../..", import.meta.url))
const backendDist = join(repoRoot, "apps/backend/dist")

const ADMIN = {
  email: "e2e-admin@specraft.local",
  name: "Specraft E2E Admin",
  password: "e2e-admin-password-1",
}

async function importBackend() {
  const serverModule = join(backendDist, "server.js")
  const databaseModule = join(backendDist, "storage/database.js")
  if (!existsSync(serverModule) || !existsSync(databaseModule)) {
    throw new Error(
      `backend dist not found (${backendDist}); run: pnpm --filter @specraft/backend build`,
    )
  }
  const [{ buildServer }, { createDatabase }] = await Promise.all([
    import(serverModule),
    import(databaseModule),
  ])
  return { buildServer, createDatabase }
}

/**
 * @param {string} url
 * @param {string} path
 * @param {{ method?: string, body?: unknown, cookie?: string, apiKey?: string }} [options]
 */
export async function backendFetch(url, path, options = {}) {
  const headers = { "content-type": "application/json" }
  if (options.cookie) {
    headers.cookie = options.cookie
  }
  if (options.apiKey) {
    headers.authorization = `Bearer ${options.apiKey}`
  }
  const response = await fetch(new URL(path, url), {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers,
    method: options.method ?? (options.body === undefined ? "GET" : "POST"),
  })
  const text = await response.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    // 비 JSON 응답은 json=null로 둔다.
  }
  return { cookies: response.headers.getSetCookie(), json, status: response.status, text }
}

/**
 * 임시 dataDir 백엔드 기동 + admin bootstrap + API 키 발급.
 * @param {{ cleanups: Array<() => void>, codeRemoteUrl?: string }} input
 * @returns {Promise<{ url: string, apiKey: string, adminCookie: string, dataDir: string, close: () => Promise<void> }>}
 */
export async function startBackendFixture(input) {
  const { buildServer, createDatabase } = await importBackend()
  const dataDir = tempDir("specraft-e2e-backend", input.cleanups)
  const database = createDatabase({ path: join(dataDir, "specraft.db") })
  const server = buildServer({
    ...(input.codeRemoteUrl ? { codeRemoteUrl: input.codeRemoteUrl } : {}),
    dataDir,
    database,
  })
  await server.listen({ host: "127.0.0.1", port: 0 })
  const address = server.addresses().find((entry) => typeof entry === "object")
  if (!address) {
    throw new Error("backend fixture failed to bind a port")
  }
  const url = `http://127.0.0.1:${address.port}`
  const close = async () => {
    await server.close()
  }
  input.cleanups.push(() => {
    void close()
  })

  const bootstrap = await backendFetch(url, "/api/v1/auth/bootstrap-admin", { body: ADMIN })
  if (bootstrap.status !== 200) {
    throw new Error(`bootstrap-admin failed: ${bootstrap.status} ${bootstrap.text}`)
  }
  const sessionCookie = bootstrap.cookies
    .map((cookie) => cookie.split(";")[0])
    .find((cookie) => cookie && cookie.length > 0)
  if (!sessionCookie) {
    throw new Error("bootstrap-admin did not set a session cookie")
  }

  const keyResponse = await backendFetch(url, "/api/v1/keys", {
    body: { name: "e2e-smoke" },
    cookie: sessionCookie,
  })
  const apiKey = keyResponse.json?.api_key
  if (keyResponse.status !== 200 || typeof apiKey !== "string") {
    throw new Error(`api key issuance failed: ${keyResponse.status} ${keyResponse.text}`)
  }

  return { adminCookie: sessionCookie, apiKey, close, dataDir, url }
}

/**
 * 별도 프로세스로 백엔드 픽스처를 기동한다(동기 spawnSync 시나리오용).
 * 자식이 첫 줄에 출력하는 JSON({url, api_key, data_dir})을 파싱해 돌려준다.
 * @param {{ cleanups: Array<() => void>, codeRemoteUrl?: string }} input
 * @returns {Promise<{ url: string, apiKey: string, dataDir: string, close: () => void }>}
 */
export async function startBackendFixtureProcess(input) {
  const scriptPath = fileURLToPath(import.meta.url)
  const args = [scriptPath, ...(input.codeRemoteUrl ? ["--code-remote", input.codeRemoteUrl] : [])]
  const child = spawn(process.execPath, args, { stdio: ["ignore", "pipe", "pipe"] })
  const close = () => {
    if (child.exitCode === null) {
      child.kill("SIGTERM")
    }
  }
  input.cleanups.push(close)
  let stderr = ""
  child.stderr.setEncoding("utf8")
  child.stderr.on("data", (chunk) => {
    stderr += chunk
  })
  const firstLine = await new Promise((resolve, reject) => {
    let buffer = ""
    const timer = setTimeout(() => {
      reject(
        new Error(`backend fixture process did not start in time; stderr: ${stderr.slice(0, 500)}`),
      )
    }, 30_000)
    child.stdout.setEncoding("utf8")
    child.stdout.on("data", (chunk) => {
      buffer += chunk
      const newline = buffer.indexOf("\n")
      if (newline >= 0) {
        clearTimeout(timer)
        resolve(buffer.slice(0, newline))
      }
    })
    child.on("exit", (code) => {
      clearTimeout(timer)
      reject(new Error(`backend fixture process exited (${code}); stderr: ${stderr.slice(0, 500)}`))
    })
  })
  const parsed = JSON.parse(firstLine)
  return { apiKey: parsed.api_key, close, dataDir: parsed.data_dir, url: parsed.url }
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(`file://${process.argv[1]}`)

if (invokedDirectly) {
  const cleanups = []
  const remoteFlag = process.argv.indexOf("--code-remote")
  const codeRemoteUrl = remoteFlag >= 0 ? process.argv[remoteFlag + 1] : undefined
  const fixture = await startBackendFixture({
    cleanups,
    ...(codeRemoteUrl ? { codeRemoteUrl } : {}),
  })
  process.stdout.write(
    `${JSON.stringify({ api_key: fixture.apiKey, data_dir: fixture.dataDir, url: fixture.url })}\n`,
  )
  const shutdown = async () => {
    await fixture.close()
    runCleanups(cleanups)
    process.exit(0)
  }
  process.on("SIGINT", () => void shutdown())
  process.on("SIGTERM", () => void shutdown())
}
