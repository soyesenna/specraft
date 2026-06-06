import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { z } from "zod"

const SpecraftConfigSchema = z.object({
  server_url: z.string().url(),
  strict_mode: z.boolean().default(true),
})

export type SpecraftConfig = z.infer<typeof SpecraftConfigSchema>

export function findSpecraftConfig(cwd: string): SpecraftConfig | null {
  const configPath = join(cwd, ".specraft.json")
  if (!existsSync(configPath)) {
    return null
  }
  return SpecraftConfigSchema.parse(JSON.parse(readFileSync(configPath, "utf8")))
}

export function loadSpecraftConfig(cwd: string): SpecraftConfig {
  const config = findSpecraftConfig(cwd)
  if (!config) {
    throw new Error(".specraft.json not found")
  }
  return config
}
