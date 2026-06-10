import type { WikiGraphNode } from "@specraft/shared"
import { describe, expect, it } from "vitest"

import { buildLayout } from "./specsGraphModel.js"

const nodes: readonly WikiGraphNode[] = [
  { path: "overview.md", title: "Overview", dir: "ROOT", summary: "" },
  { path: "specs/stop-gate.md", title: "Stop Gate", dir: "SPECS", summary: "" },
  { path: "specs/ingest.md", title: "Ingest", dir: "SPECS", summary: "" },
]

const edges = [{ from: "specs/stop-gate.md", to: "overview.md" }]

describe("buildLayout node position overrides", () => {
  it("keeps the default extent and viewBox when no override exists", () => {
    const layout = buildLayout(nodes, edges, false)

    expect(layout.extent).toEqual({ minX: 0, minY: 0, width: 1224, height: 782 })
    expect(layout.viewBox).toBe("0 0 1224 782")
  })

  it("places overridden nodes at the stored coordinates and recomputes edge centers", () => {
    const layout = buildLayout(nodes, edges, false, undefined, {
      "specs/stop-gate.md": { x: 900, y: 600 },
    })

    const moved = layout.nodes.find((entry) => entry.node.path === "specs/stop-gate.md")
    expect(moved?.x).toBe(900)
    expect(moved?.y).toBe(600)
    expect(moved?.cx).toBe(900 + (moved?.width ?? 0) / 2)

    const edge = layout.edges.find((line) => line.from.node.path === "specs/stop-gate.md")
    expect(edge?.from.cx).toBe(moved?.cx)

    // 오버라이드 없는 노드는 기본 산포 그대로.
    const untouched = layout.nodes.find((entry) => entry.node.path === "overview.md")
    expect(untouched).toBeTruthy()
  })

  it("expands the svg extent when a node is dragged outside the base canvas", () => {
    const layout = buildLayout(nodes, edges, false, undefined, {
      "specs/stop-gate.md": { x: -300, y: -120 },
      "specs/ingest.md": { x: 1400, y: 900 },
    })

    expect(layout.extent.minX).toBe(-300)
    expect(layout.extent.minY).toBe(-120)
    // 오른쪽 끝 = 노드 x + 노드 폭(212), 아래 끝 = y + 노드 높이(78)
    expect(layout.extent.width).toBe(1400 + 212 - -300)
    expect(layout.extent.height).toBe(900 + 78 - -120)
    expect(layout.viewBox).toBe(`-300 -120 ${1400 + 212 + 300} ${900 + 78 + 120}`)
  })

  it("does not clamp overridden positions to the canvas margins", () => {
    const layout = buildLayout(nodes, edges, false, undefined, {
      "overview.md": { x: -50, y: 800 },
    })
    const moved = layout.nodes.find((entry) => entry.node.path === "overview.md")
    expect(moved?.x).toBe(-50)
    expect(moved?.y).toBe(800)
  })
})
