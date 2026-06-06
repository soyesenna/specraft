import { describe, expect, it } from "vitest"

import { loadServerConfig } from "./secrets.js"

describe("server secret configuration", () => {
  it("fails fast when SPECRAFT_SECRET is missing", () => {
    expect(() => loadServerConfig({})).toThrow("SPECRAFT_SECRET is required")
  })

  it("derives stable isolated session and credential keys", () => {
    const first = loadServerConfig({
      SPECRAFT_SECRET: "0123456789abcdef0123456789abcdef",
      SPECRAFT_DATA_DIR: "/tmp/specraft-test",
    })
    const second = loadServerConfig({
      SPECRAFT_SECRET: "0123456789abcdef0123456789abcdef",
      SPECRAFT_DATA_DIR: "/tmp/specraft-test",
    })

    expect(first.dataDir).toBe("/tmp/specraft-test")
    expect(first.sessionSecret).toBe(second.sessionSecret)
    expect(first.credentialKey).toBe(second.credentialKey)
    expect(first.sessionSecret).not.toBe(first.credentialKey)
  })
})
