import { randomBytes, randomUUID } from "node:crypto"

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`
}

export function createOpaqueToken(byteLength = 24): string {
  return randomBytes(byteLength).toString("base64url")
}

export function createApiKeySecret(): string {
  return `sk-spcrft-${createOpaqueToken(32)}`
}

export function apiKeyPrefix(): string {
  return "sk-spcrft-"
}
