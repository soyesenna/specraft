import { describe, expect, it } from "vitest"

import { loadServerConfig } from "./secrets.js"

describe("server secret configuration", () => {
  const requiredEnv = {
    OPENROUTER_API_KEY: "sk-or-v1-test",
    SPECRAFT_SECRET: "0123456789abcdef0123456789abcdef",
  } as const

  it("fails fast when SPECRAFT_SECRET is missing", () => {
    expect(() => loadServerConfig({})).toThrow("SPECRAFT_SECRET is required")
  })

  it("fails fast when OPENROUTER_API_KEY is missing", () => {
    expect(() => loadServerConfig({ SPECRAFT_SECRET: "0123456789abcdef0123456789abcdef" })).toThrow(
      "OPENROUTER_API_KEY is required",
    )
  })

  it("derives stable isolated session and credential keys", () => {
    const first = loadServerConfig({
      ...requiredEnv,
      SPECRAFT_DATA_DIR: "/tmp/specraft-test",
    })
    const second = loadServerConfig({
      ...requiredEnv,
      SPECRAFT_DATA_DIR: "/tmp/specraft-test",
    })

    expect(first.dataDir).toBe("/tmp/specraft-test")
    expect(first.openRouterApiKey).toBe("sk-or-v1-test")
    expect(first.sessionSecret).toBe(second.sessionSecret)
    expect(first.credentialKey).toBe(second.credentialKey)
    expect(first.sessionSecret).not.toBe(first.credentialKey)
  })
})
