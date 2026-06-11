import { loadServerConfig } from "./config/secrets.js"
import { OpenAICompatibleEmbeddingProvider } from "./llm/embedding.js"
import { OpenRouterProvider } from "./llm/openrouter.js"
import { verifyWikiIntegrity } from "./ops/integrity.js"
import { buildServer } from "./server.js"
import { createDatabase } from "./storage/database.js"

const host = process.env["HOST"] ?? "127.0.0.1"
const parsedPort = Number.parseInt(process.env["PORT"] ?? "4311", 10)
const port = Number.isNaN(parsedPort) ? 4311 : parsedPort
const config = loadServerConfig(process.env)
const database = createDatabase({ path: `${config.dataDir}/specraft.db` })
verifyWikiIntegrity(config.dataDir)
const llmProvider = new OpenRouterProvider({
  apiKey: config.openRouterApiKey,
  model: config.openRouterModel,
})
// SPECRAFT_EMBEDDING_MODEL 미지정 시 provider를 만들지 않는다 — 검색은 키워드 폴백.
const embeddingProvider = config.embeddingModel
  ? new OpenAICompatibleEmbeddingProvider({
      apiKey: config.openRouterApiKey,
      model: config.embeddingModel,
    })
  : undefined
const server = buildServer({
  ...(config.codeRemoteUrl ? { codeRemoteUrl: config.codeRemoteUrl } : {}),
  llmProvider,
  ...(embeddingProvider ? { embeddingProvider } : {}),
  credentialKey: config.credentialKey,
  database,
  dataDir: config.dataDir,
  secret: config.sessionSecret,
})

await server.listen({ host, port })
