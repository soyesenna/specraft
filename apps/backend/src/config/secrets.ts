import { hkdfSync } from "node:crypto"

const defaultDataDir = "/data"
const minSecretLength = 16

export type ServerConfig = {
  readonly codeRemoteUrl?: string
  readonly dataDir: string
  readonly openRouterApiKey?: string
  readonly openRouterModel: string
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
  const codeRemoteUrl = env["SPECRAFT_CODE_REMOTE_URL"] ?? env["GIT_REMOTE_URL"]

  return {
    ...(codeRemoteUrl ? { codeRemoteUrl } : {}),
    dataDir: env["SPECRAFT_DATA_DIR"] ?? defaultDataDir,
    ...(env["OPENROUTER_API_KEY"] ? { openRouterApiKey: env["OPENROUTER_API_KEY"] } : {}),
    openRouterModel: env["OPENROUTER_MODEL"] ?? "openrouter/auto",
    sessionSecret: deriveKey(secret, "session-cookie"),
    credentialKey: deriveKey(secret, "credential-encryption"),
  }
}
