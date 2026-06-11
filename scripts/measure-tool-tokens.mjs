// M2.3 — 도구 정의 토큰 측정 + ≤5k 게이트.
// 번들 proxy(plugins/claude-code/proxy/cli.js)를 MCP stdio로 띄워 tools/list 결과
// (name + description + inputSchema)를 Anthropic 도구 정의 형태로 직렬화하고 토큰을 센다.
//
// 측정 모드:
//   1차  — ANTHROPIC_API_KEY 존재 시: Anthropic count_tokens API (plan §Acceptance Criteria 기준).
//          tools 포함/미포함 두 번 호출해 차분을 취한다(메시지 오버헤드 제거).
//   폴백 — chars/3.5 휴리스틱. 근거: Anthropic 문서의 영어 텍스트 경험칙은 ~4 chars/token이고
//          (https://docs.anthropic.com/en/docs/resources/glossary#tokens), JSON 스키마는 구두점이
//          많아 더 잘게 토크나이즈되므로 3.5로 나눠 보수적으로(과대) 추정한다.
//
// 총 토큰이 5,000을 초과하면 exit 1 (CI 게이트).
//
// 사용: node scripts/measure-tool-tokens.mjs
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { McpStdioClient } from "./e2e/lib/mcp-client.mjs"

const TOKEN_BUDGET = 5_000
const HEURISTIC_CHARS_PER_TOKEN = 3.5
const COUNT_TOKENS_MODEL = "claude-sonnet-4-5"

const repoRoot = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "")
const proxyBundle = process.argv[2] ?? join(repoRoot, "plugins/claude-code/proxy/cli.js")

/** tools/list 결과를 Anthropic count_tokens의 tools 파라미터 형태로 변환한다. */
function toAnthropicTools(tools) {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description ?? "",
    input_schema: tool.inputSchema ?? { type: "object" },
  }))
}

/** chars/3.5 휴리스틱(파일 머리 주석 참조 — 보수적 과대 추정). */
function heuristicTokens(value) {
  return Math.ceil(JSON.stringify(value).length / HEURISTIC_CHARS_PER_TOKEN)
}

async function countTokensViaApi(apiKey, anthropicTools) {
  const call = async (body) => {
    const response = await fetch("https://api.anthropic.com/v1/messages/count_tokens", {
      body: JSON.stringify(body),
      headers: {
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      method: "POST",
    })
    const json = await response.json()
    if (!response.ok || typeof json.input_tokens !== "number") {
      throw new Error(
        `count_tokens failed (${response.status}): ${JSON.stringify(json).slice(0, 300)}`,
      )
    }
    return json.input_tokens
  }
  const messages = [{ content: "x", role: "user" }]
  const [withTools, withoutTools] = await Promise.all([
    call({ messages, model: COUNT_TOKENS_MODEL, tools: anthropicTools }),
    call({ messages, model: COUNT_TOKENS_MODEL }),
  ])
  return withTools - withoutTools
}

async function main() {
  // tools/list만 수행하므로 git repo·실서버 없이 임시 cwd/HOME으로 충분하다.
  // (runMcp는 API 키 존재만 검사하고 git 스냅샷은 도구 호출 시점까지 지연된다.)
  const scratch = mkdtempSync(join(tmpdir(), "specraft-token-measure-"))
  const client = new McpStdioClient({
    args: [proxyBundle],
    command: "node",
    cwd: scratch,
    env: {
      HOME: scratch,
      PATH: process.env.PATH,
      SPECRAFT_API_KEY: "sk-spcrft-token-measure-fixture",
      SPECRAFT_SERVER_URL: "http://127.0.0.1:9",
    },
  })
  let tools
  try {
    await client.initialize()
    tools = await client.listTools()
  } finally {
    await client.close()
    rmSync(scratch, { force: true, recursive: true })
  }
  if (!Array.isArray(tools) || tools.length === 0) {
    throw new Error("tools/list returned no tools — is the proxy bundle up to date?")
  }

  const anthropicTools = toAnthropicTools(tools)
  const apiKey = process.env.ANTHROPIC_API_KEY
  let total
  let mode
  if (apiKey) {
    total = await countTokensViaApi(apiKey, anthropicTools)
    mode = `anthropic count_tokens (${COUNT_TOKENS_MODEL}, tools 차분)`
  } else {
    total = heuristicTokens(anthropicTools)
    mode = `heuristic chars/${HEURISTIC_CHARS_PER_TOKEN} (ANTHROPIC_API_KEY 없음 — 보수적 과대 추정)`
  }

  process.stdout.write(`[measure-tool-tokens] mode: ${mode}\n`)
  process.stdout.write(`[measure-tool-tokens] tools: ${tools.length}\n`)
  for (const tool of anthropicTools) {
    process.stdout.write(
      `  - ${tool.name}: ~${heuristicTokens(tool)} tokens (heuristic per-tool breakdown)\n`,
    )
  }
  process.stdout.write(`[measure-tool-tokens] total: ${total} tokens (budget ${TOKEN_BUDGET})\n`)
  if (total > TOKEN_BUDGET) {
    process.stderr.write(
      `[measure-tool-tokens] FAIL — tool definitions exceed the ${TOKEN_BUDGET} token budget\n`,
    )
    process.exitCode = 1
    return
  }
  process.stdout.write("[measure-tool-tokens] PASS — within budget\n")
}

await main()
