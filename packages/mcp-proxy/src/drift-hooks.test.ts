// M4+ — PostToolUse 스로틀(ptu-cache)·PreToolUse status 캐시(status-cache)·
// 포인터/경고 렌더링 단위 테스트. fail-open 경로(프록시 부재)는 hook-wrapper.test.ts 소관.
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  isPtuThrottled,
  markPtuNotified,
  PTU_THROTTLE_MS,
  ptuCacheDir,
  readCachedBranchLocks,
  renderBranchLockWarning,
  renderSpecPointer,
  STATUS_CACHE_TTL_MS,
  statusCachePath,
  writeCachedBranchLocks,
} from "./drift-hooks.js"

describe("drift hooks", () => {
  let home: string

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "specraft-drift-home-"))
  })

  afterEach(() => {
    rmSync(home, { force: true, recursive: true })
  })

  describe("PostToolUse throttle (~/.specraft/ptu-cache)", () => {
    const repo = "/repo/a"
    const file = "src/auth/login.ts"

    it("throttles the same repo+file within 10 minutes and releases afterwards", () => {
      const now = Date.now()
      expect(isPtuThrottled(home, repo, file, now)).toBe(false)
      markPtuNotified(home, repo, file, now)
      expect(isPtuThrottled(home, repo, file, now + PTU_THROTTLE_MS - 1)).toBe(true)
      expect(isPtuThrottled(home, repo, file, now + PTU_THROTTLE_MS)).toBe(false)
    })

    it("keys the marker on repo+file so other files and repos are unaffected", () => {
      const now = Date.now()
      markPtuNotified(home, repo, file, now)
      expect(isPtuThrottled(home, repo, "src/other.ts", now)).toBe(false)
      expect(isPtuThrottled(home, "/repo/b", file, now)).toBe(false)
    })

    it("GCs expired markers on write and survives corrupt marker files", () => {
      const now = Date.now()
      markPtuNotified(home, repo, "src/old.ts", now - PTU_THROTTLE_MS * 2)
      writeFileSync(join(ptuCacheDir(home), "corrupt.json"), "not json")
      markPtuNotified(home, repo, file, now)
      const markers = readdirSync(ptuCacheDir(home))
      expect(markers).toHaveLength(1)
      expect(isPtuThrottled(home, repo, file, now)).toBe(true)
    })
  })

  describe("renderSpecPointer", () => {
    it("renders a short pointer with page paths only (no page content)", () => {
      const pointer = renderSpecPointer("src/auth/login.ts", [
        "auth/login.md",
        "changes/login-flow.md",
        "billing.md",
      ])
      expect(pointer).toContain("src/auth/login.ts")
      expect(pointer).toContain("auth/login.md")
      expect(pointer).toContain("changes/login-flow.md")
      expect(pointer).not.toContain("billing.md")
      expect(pointer?.split("\n").length).toBeLessThanOrEqual(2)
    })

    it("returns null when no wiki page is related", () => {
      expect(renderSpecPointer("src/auth/login.ts", ["billing.md"])).toBeNull()
      expect(renderSpecPointer("src/auth/login.ts", [])).toBeNull()
    })
  })

  describe("PreToolUse status cache (~/.specraft/status-cache)", () => {
    const url = "https://specraft.example"
    const locks = [{ branch: "main", conflict_id: "cfl_1" }]

    it("returns cached locks within the 5-minute TTL and null after expiry", () => {
      const now = Date.now()
      writeCachedBranchLocks(home, url, locks, now)
      expect(readCachedBranchLocks(home, url, now + STATUS_CACHE_TTL_MS - 1)).toEqual(locks)
      expect(readCachedBranchLocks(home, url, now + STATUS_CACHE_TTL_MS)).toBeNull()
    })

    it("misses on server url change, absence, and corrupt cache files", () => {
      const now = Date.now()
      expect(readCachedBranchLocks(home, url, now)).toBeNull()
      writeCachedBranchLocks(home, url, locks, now)
      expect(readCachedBranchLocks(home, "https://other.example", now)).toBeNull()
      writeFileSync(statusCachePath(home), "not json")
      expect(readCachedBranchLocks(home, url, now)).toBeNull()
      expect(existsSync(statusCachePath(home))).toBe(true)
    })
  })

  describe("renderBranchLockWarning", () => {
    it("warns only for the locked current branch, without blocking semantics", () => {
      const warning = renderBranchLockWarning(
        [{ branch: "main", conflict_id: "cfl_1", reason: "diverged wiki" }],
        "main",
      )
      expect(warning).toContain("main")
      expect(warning).toContain("cfl_1")
      expect(warning).toContain("diverged wiki")
      expect(warning).toContain("specraft_conflicts")
      expect(warning).not.toContain('"decision"')
    })

    it("returns null when the current branch is not locked", () => {
      expect(
        renderBranchLockWarning([{ branch: "other", conflict_id: "cfl_2" }], "main"),
      ).toBeNull()
    })
  })
})
