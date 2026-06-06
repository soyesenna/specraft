import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const algorithm = "aes-256-gcm"
const prefix = "enc:v1"

function keyBuffer(credentialKey: string): Buffer {
  const key = Buffer.from(credentialKey, "base64url")
  if (key.length !== 32) {
    throw new RangeError("credential key must be 32 bytes")
  }
  return key
}

export function encryptCredential(credentialKey: string, plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(algorithm, keyBuffer(credentialKey), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    prefix,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":")
}

export function decryptCredential(credentialKey: string, encrypted: string): string {
  const parts = encrypted.split(":")
  const version = parts[0]
  const variant = parts[1]
  const iv = parts[2]
  const tag = parts[3]
  const ciphertext = parts[4]
  if (version !== "enc" || variant !== "v1" || !iv || !tag || !ciphertext) {
    throw new RangeError("invalid encrypted credential")
  }
  const decipher = createDecipheriv(
    algorithm,
    keyBuffer(credentialKey),
    Buffer.from(iv, "base64url"),
  )
  decipher.setAuthTag(Buffer.from(tag, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}
