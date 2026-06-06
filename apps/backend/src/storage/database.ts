import { mkdirSync } from "node:fs"
import { dirname } from "node:path"

import Database from "better-sqlite3"
import { z } from "zod"

import { migrateDatabase } from "./migrations.js"

export type SpecraftDatabase = Database.Database

export type DatabaseOptions = {
  readonly path: string
}

const TableRowSchema = z.object({
  name: z.string(),
})

export function createDatabase(options: DatabaseOptions): SpecraftDatabase {
  if (options.path !== ":memory:") {
    mkdirSync(dirname(options.path), { recursive: true })
  }
  const database = new Database(options.path)
  migrateDatabase(database)
  return database
}

export function listTableNames(database: SpecraftDatabase): readonly string[] {
  const rows = database
    .prepare<[], unknown>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all()
  return z
    .array(TableRowSchema)
    .parse(rows)
    .map((row) => row.name)
}
