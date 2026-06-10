import type { WikiGraphResponse } from "@specraft/shared"
import { describe, expect, it } from "vitest"

import {
  readCachedGraph,
  readCachedLayout,
  specsCacheStorage,
  writeCachedGraph,
  writeCachedLayout,
} from "./specsLocalCache.js"

function fakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => {
      map.clear()
    },
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key)
    },
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
  }
}

const graph: WikiGraphResponse = {
  branch: "dev",
  nodes: [{ path: "overview.md", title: "Overview", dir: "ROOT", summary: "Summary." }],
  edges: [],
}

describe("specs local cache", () => {
  it("round-trips the wiki graph per member and branch", () => {
    const storage = fakeStorage()
    writeCachedGraph(storage, "mem-1", "dev", graph)

    expect(readCachedGraph(storage, "mem-1", "dev")).toEqual(graph)
    // 다른 멤버·다른 브랜치 키는 격리된다.
    expect(readCachedGraph(storage, "mem-2", "dev")).toBeNull()
    expect(readCachedGraph(storage, "mem-1", "main")).toBeNull()
  })

  it("round-trips layout positions and isolates members", () => {
    const storage = fakeStorage()
    const positions = { "overview.md": { x: 12.5, y: -40 } }
    writeCachedLayout(storage, "mem-1", "dev", positions)

    expect(readCachedLayout(storage, "mem-1", "dev")).toEqual(positions)
    expect(readCachedLayout(storage, "mem-2", "dev")).toBeNull()
  })

  it("treats corrupted or mismatched entries as missing", () => {
    const storage = fakeStorage()
    storage.setItem("specraft.specs.graph.mem-1.dev", "{broken json")
    expect(readCachedGraph(storage, "mem-1", "dev")).toBeNull()

    storage.setItem("specraft.specs.graph.mem-1.dev", JSON.stringify({ v: 999, payload: graph }))
    expect(readCachedGraph(storage, "mem-1", "dev")).toBeNull()

    storage.setItem(
      "specraft.specs.layout.mem-1.dev",
      JSON.stringify({ v: 1, payload: { branch: "dev", positions: { a: { x: "no" } } } }),
    )
    expect(readCachedLayout(storage, "mem-1", "dev")).toBeNull()
  })

  it("is a no-op without a member id or storage", () => {
    const storage = fakeStorage()
    writeCachedGraph(storage, undefined, "dev", graph)
    expect(storage.length).toBe(0)
    expect(readCachedGraph(storage, undefined, "dev")).toBeNull()
    expect(readCachedGraph(null, "mem-1", "dev")).toBeNull()
    expect(() => writeCachedLayout(null, "mem-1", "dev", {})).not.toThrow()
  })

  it("disables the storage in test mode so integration tests stay deterministic", () => {
    expect(specsCacheStorage()).toBeNull()
  })
})
