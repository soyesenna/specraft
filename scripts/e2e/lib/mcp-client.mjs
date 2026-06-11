// 최소 MCP stdio 클라이언트 — 번들 proxy(cli.js)를 자식 프로세스로 띄워
// initialize → tools/list → tools/call 을 JSON-RPC(newline-delimited)로 수행한다.
// 호스트 CLI 없이 MCP 서버 계약을 프로세스 레벨에서 검증하기 위한 픽스처다.
import { spawn } from "node:child_process"

export class McpStdioClient {
  /**
   * @param {{ command: string, args: readonly string[], cwd: string, env: Record<string, string | undefined> }} input
   */
  constructor(input) {
    this.child = spawn(input.command, [...input.args], {
      cwd: input.cwd,
      env: input.env,
      stdio: ["pipe", "pipe", "pipe"],
    })
    this.nextId = 1
    this.buffer = ""
    this.stderr = ""
    /** @type {Map<number, { resolve: (value: unknown) => void, reject: (error: Error) => void }>} */
    this.pending = new Map()
    this.child.stdout.setEncoding("utf8")
    this.child.stderr.setEncoding("utf8")
    this.child.stderr.on("data", (chunk) => {
      this.stderr += chunk
    })
    this.child.stdout.on("data", (chunk) => {
      this.buffer += chunk
      let newline = this.buffer.indexOf("\n")
      while (newline >= 0) {
        const line = this.buffer.slice(0, newline).trim()
        this.buffer = this.buffer.slice(newline + 1)
        if (line !== "") {
          this.dispatch(line)
        }
        newline = this.buffer.indexOf("\n")
      }
    })
    this.child.on("exit", () => {
      for (const waiter of this.pending.values()) {
        waiter.reject(new Error(`mcp server exited early; stderr: ${this.stderr.slice(0, 500)}`))
      }
      this.pending.clear()
    })
  }

  /** @param {string} line */
  dispatch(line) {
    let message
    try {
      message = JSON.parse(line)
    } catch {
      return
    }
    if (typeof message.id !== "number") {
      return
    }
    const waiter = this.pending.get(message.id)
    if (!waiter) {
      return
    }
    this.pending.delete(message.id)
    if (message.error) {
      waiter.reject(new Error(`rpc error ${message.error.code}: ${message.error.message}`))
      return
    }
    waiter.resolve(message.result)
  }

  /**
   * @param {string} method
   * @param {unknown} [params]
   * @param {number} [timeoutMs]
   * @returns {Promise<any>}
   */
  request(method, params, timeoutMs = 20_000) {
    const id = this.nextId
    this.nextId += 1
    const payload = { id, jsonrpc: "2.0", method, ...(params === undefined ? {} : { params }) }
    this.child.stdin.write(`${JSON.stringify(payload)}\n`)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`rpc timeout: ${method}; stderr: ${this.stderr.slice(0, 500)}`))
      }, timeoutMs)
      this.pending.set(id, {
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
        resolve: (value) => {
          clearTimeout(timer)
          resolve(value)
        },
      })
    })
  }

  /** @param {string} method @param {unknown} [params] */
  notify(method, params) {
    const payload = { jsonrpc: "2.0", method, ...(params === undefined ? {} : { params }) }
    this.child.stdin.write(`${JSON.stringify(payload)}\n`)
  }

  /** MCP 핸드셰이크를 완료하고 initialize 결과를 돌려준다. */
  async initialize() {
    const result = await this.request("initialize", {
      capabilities: {},
      clientInfo: { name: "specraft-e2e", version: "0.0.0" },
      protocolVersion: "2024-11-05",
    })
    this.notify("notifications/initialized")
    return result
  }

  async listTools() {
    const result = await this.request("tools/list", {})
    return result.tools ?? []
  }

  /** @param {string} name @param {unknown} args */
  async callTool(name, args) {
    return this.request("tools/call", { arguments: args, name })
  }

  async close() {
    this.child.stdin.end()
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.child.kill("SIGKILL")
        resolve(undefined)
      }, 3_000)
      this.child.on("exit", () => {
        clearTimeout(timer)
        resolve(undefined)
      })
    })
  }
}
