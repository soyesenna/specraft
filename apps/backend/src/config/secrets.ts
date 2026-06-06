import { hkdfSync } from "node:crypto"

const defaultDataDir = "/data"
const minSecretLength = 16

export type ServerConfig = {
  readonly dataDir: string
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

  return {
    dataDir: env["SPECRAFT_DATA_DIR"] ?? defaultDataDir,
    sessionSecret: deriveKey(secret, "session-cookie"),
    credentialKey: deriveKey(secret, "credential-encryption"),
  }
}
