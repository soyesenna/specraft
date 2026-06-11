import { hkdfSync } from "node:crypto"

const defaultDataDir = "/data"
const minSecretLength = 16

export type ServerConfig = {
  readonly codeRemoteUrl?: string
  readonly dataDir: string
  readonly openRouterApiKey: string
  readonly openRouterModel: string
  /**
   * M4+.4 임베딩 모델 — 미지정 시 시맨틱 인덱싱을 끄고 검색은 키워드 폴백으로 동작한다.
   * 키는 기존 관례(LLM provider와 동일한 OPENROUTER_API_KEY env)를 재사용한다.
   */
  readonly embeddingModel?: string
  readonly sessionSecret: string
  readonly credentialKey: string
}

export type EnvReader = Record<string, string | undefined>

function deriveKey(secret: string, info: string): string {
  const key = hkdfSync("sha256", secret, "specraft-v1", info, 32)
  return Buffer.from(key).toString("base64url")
}

export function loadServerConfig(env: EnvReader): ServerConfig {
  const secret = env["SPECRAFT_SECRET"]
  if (!secret || secret.length < minSecretLength) {
    throw new Error("SPECRAFT_SECRET is required")
  }
  const openRouterApiKey = env["OPENROUTER_API_KEY"]?.trim()
  if (!openRouterApiKey) {
    throw new Error("OPENROUTER_API_KEY is required")
  }
  const codeRemoteUrl = env["SPECRAFT_CODE_REMOTE_URL"] ?? env["GIT_REMOTE_URL"]

  const embeddingModel = env["SPECRAFT_EMBEDDING_MODEL"]?.trim()

  return {
    ...(codeRemoteUrl ? { codeRemoteUrl } : {}),
    dataDir: env["SPECRAFT_DATA_DIR"] ?? defaultDataDir,
    openRouterApiKey,
    openRouterModel: env["OPENROUTER_MODEL"] ?? "openrouter/auto",
    ...(embeddingModel ? { embeddingModel } : {}),
    sessionSecret: deriveKey(secret, "session-cookie"),
    credentialKey: deriveKey(secret, "credential-encryption"),
  }
}
