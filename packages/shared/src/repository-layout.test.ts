/// <reference types="node" />

import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"
import { z } from "zod"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
const PackageJsonSchema = z.object({
  name: z.string(),
  scripts: z.record(z.string(), z.string()).optional(),
})

function readText(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), "utf8")
}

function readPackage(relativePath: string): z.infer<typeof PackageJsonSchema> {
  return PackageJsonSchema.parse(JSON.parse(readText(relativePath)))
}

function expectNoOldAppRefs(relativePath: string): void {
  const text = readText(relativePath)
  for (const oldRef of [
    "apps/server",
    "apps/dashboard",
    "@specraft/server",
    "@specraft/dashboard",
  ]) {
    expect(text, `${relativePath} still contains ${oldRef}`).not.toContain(oldRef)
  }
}

function expectNoLegacyDashboardDocName(relativePath: string): void {
  const text = readText(relativePath)
  const legacyPatterns = [
    /\|\s*dashboard\s*\|/,
    /\*\*dashboard\*\*/,
    /\(dashboard\)/,
    /dashboard\/Goal/,
    /plugins\/dashboard\/auth/,
    /대시보드(?:에서|에는|이력|기능 범위|React|열람용|세부 UI\/UX)/,
  ]

  for (const pattern of legacyPatterns) {
    expect(text, `${relativePath} still uses ${pattern.source}`).not.toMatch(pattern)
  }
}

function expectNoDashboardSourceName(relativePath: string): void {
  expect(
    readText(relativePath),
    `${relativePath} still uses dashboard as the app name`,
  ).not.toMatch(/\bdashboard\b|대시보드/)
}

describe("repository app layout", () => {
  it("uses backend and frontend app workspace names", () => {
    expect(existsSync(resolve(repoRoot, "apps/backend"))).toBe(true)
    expect(existsSync(resolve(repoRoot, "apps/frontend"))).toBe(true)
    expect(existsSync(resolve(repoRoot, "apps/server"))).toBe(false)
    expect(existsSync(resolve(repoRoot, "apps/dashboard"))).toBe(false)
    expect(readPackage("apps/backend/package.json").name).toBe("@specraft/backend")
    expect(readPackage("apps/frontend/package.json").name).toBe("@specraft/frontend")
  })

  it("updates docs and deployment references to backend and frontend", () => {
    const referenceFiles = [
      "Dockerfile",
      "docker-compose.yml",
      "_docs/internal/v1/deep-interview-specraft.md",
      "_docs/internal/v1/ralplan-specraft-v1.md",
      "_docs/internal/v1/m1-implementation-evidence.md",
    ]

    for (const filePath of referenceFiles) {
      expectNoOldAppRefs(filePath)
    }
    expectNoLegacyDashboardDocName("_docs/internal/v1/deep-interview-specraft.md")
    expectNoLegacyDashboardDocName("_docs/internal/v1/ralplan-specraft-v1.md")
    expect(readText("Dockerfile")).toContain("apps/backend")
    expect(readText("Dockerfile")).toContain("apps/frontend")
  })

  it("keeps renamed backend and frontend runnable through workspace filters", () => {
    const backendScripts = readPackage("apps/backend/package.json").scripts
    const frontendScripts = readPackage("apps/frontend/package.json").scripts

    expect(backendScripts?.build).toBe("tsc -p tsconfig.json")
    expect(backendScripts?.dev).toContain("node dist/main.js")
    expect(frontendScripts?.build).toContain("vite build")
    expect(frontendScripts?.dev).toBe("vite")
    expectNoDashboardSourceName("apps/frontend/src/App.tsx")
    expectNoDashboardSourceName("apps/frontend/src/App.test.tsx")
    expectNoDashboardSourceName("apps/frontend/src/main.tsx")
  })
})
