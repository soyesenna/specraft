import { describe, expect, it } from "vitest"

import { createDatabase, listTableNames } from "./database.js"

describe("operational database schema", () => {
  it("creates every v1 operational table", () => {
    const database = createDatabase({ path: ":memory:" })

    const tables = listTableNames(database)

    expect(tables).toEqual([
      "api_keys",
      "branch_locks",
      "conflicts",
      "graph_layouts",
      "ingest_logs",
      "invites",
      "members",
      "query_logs",
      "settings",
      "wiki_graph_cache",
    ])
    database.close()
  })
})
