import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  credentialsPath,
  DEFAULT_SERVER_URL,
  parseCredentials,
  readCredentialsFile,
  resolveApiKey,
  resolveServerUrl,
} from "./credentials.js"

function writeCredentials(home: string, content: string, mode = 0o600): string {
  mkdirSync(join(home, ".specraft"), { recursive: true })
  const path = credentialsPath(home)
  writeFileSync(path, content)
  chmodSync(path, mode)
  return path
}

describe("credentials", () => {
  let home: string
  let cwd: string
  let stderrSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "specraft-credentials-home-"))
    cwd = mkdtempSync(join(tmpdir(), "specraft-credentials-cwd-"))
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true)
  })

  afterEach(() => {
    stderrSpy.mockRestore()
    rmSync(home, { force: true, recursive: true })
    rmSync(cwd, { force: true, recursive: true })
  })

  describe("parseCredentials", () => {
    it("parses KEY=VALUE lines and ignores comments, blanks, and malformed lines", () => {
      const parsed = parseCredentials(
        [
          "# specraft credentials",
          "",
          "SPECRAFT_API_KEY=sk-test-123",
          "  SPECRAFT_SERVER_URL = http://specraft.example:4311 ",
          "not-a-pair",
          "=no-key",
          "EMPTY_VALUE=",
        ].join("\n"),
      )
      expect(parsed).toEqual({
        SPECRAFT_API_KEY: "sk-test-123",
        SPECRAFT_SERVER_URL: "http://specraft.example:4311",
      })
    })

    it("keeps '=' characters inside values", () => {
      expect(parseCredentials("SPECRAFT_API_KEY=abc=def==")).toEqual({
        SPECRAFT_API_KEY: "abc=def==",
      })
    })
  })

  describe("file permissions", () => {
    it("warns on stderr when the credentials file is not 0600", () => {
      writeCredentials(home, "SPECRAFT_API_KEY=sk-loose\n", 0o644)
      expect(readCredentialsFile(home)).toEqual({ SPECRAFT_API_KEY: "sk-loose" })
      expect(stderrSpy).toHaveBeenCalledTimes(1)
      expect(String(stderrSpy.mock.calls[0]?.[0])).toContain("expected 0600")
      expect(String(stderrSpy.mock.calls[0]?.[0])).toContain("chmod 600")
    })

    it("does not warn when the credentials file is 0600", () => {
      writeCredentials(home, "SPECRAFT_API_KEY=sk-tight\n", 0o600)
      expect(readCredentialsFile(home)).toEqual({ SPECRAFT_API_KEY: "sk-tight" })
      expect(stderrSpy).not.toHaveBeenCalled()
    })

    it("returns an empty record when the file is missing", () => {
      expect(readCredentialsFile(home)).toEqual({})
      expect(stderrSpy).not.toHaveBeenCalled()
    })
  })

  describe("resolveApiKey fallback order", () => {
    it("prefers SPECRAFT_API_KEY env over plugin option and credentials file", () => {
      writeCredentials(home, "SPECRAFT_API_KEY=sk-file\n")
      expect(
        resolveApiKey({
          env: { CLAUDE_PLUGIN_OPTION_API_KEY: "sk-plugin", SPECRAFT_API_KEY: "sk-env" },
          home,
        }),
      ).toBe("sk-env")
    })

    it("prefers the plugin userConfig env over the credentials file", () => {
      writeCredentials(home, "SPECRAFT_API_KEY=sk-file\n")
      expect(resolveApiKey({ env: { CLAUDE_PLUGIN_OPTION_API_KEY: "sk-plugin" }, home })).toBe(
        "sk-plugin",
      )
    })

    it("falls back to the credentials file when env keys are absent or empty", () => {
      writeCredentials(home, "SPECRAFT_API_KEY=sk-file\n")
      expect(resolveApiKey({ env: { SPECRAFT_API_KEY: "" }, home })).toBe("sk-file")
    })

    it("returns null when no source provides a key", () => {
      expect(resolveApiKey({ env: {}, home })).toBeNull()
    })
  })

  describe("resolveServerUrl fallback order", () => {
    it("prefers SPECRAFT_SERVER_URL env over every other source", () => {
      writeFileSync(
        join(cwd, ".specraft.json"),
        JSON.stringify({ server_url: "http://project.example:1111" }),
      )
      writeCredentials(home, "SPECRAFT_SERVER_URL=http://file.example:2222\n")
      expect(
        resolveServerUrl({ cwd, env: { SPECRAFT_SERVER_URL: "http://env.example:3333" }, home }),
      ).toBe("http://env.example:3333")
    })

    it("prefers .specraft.json over the credentials file", () => {
      writeFileSync(
        join(cwd, ".specraft.json"),
        JSON.stringify({ server_url: "http://project.example:1111" }),
      )
      writeCredentials(home, "SPECRAFT_SERVER_URL=http://file.example:2222\n")
      expect(resolveServerUrl({ cwd, env: {}, home })).toBe("http://project.example:1111")
    })

    it("prefers the credentials file over the default", () => {
      writeCredentials(home, "SPECRAFT_SERVER_URL=http://file.example:2222\n")
      expect(resolveServerUrl({ cwd, env: {}, home })).toBe("http://file.example:2222")
    })

    it("falls back to the local default when nothing is configured", () => {
      expect(resolveServerUrl({ cwd, env: {}, home })).toBe(DEFAULT_SERVER_URL)
      expect(DEFAULT_SERVER_URL).toBe("http://127.0.0.1:4311")
    })
  })
})
