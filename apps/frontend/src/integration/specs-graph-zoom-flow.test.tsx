import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { App } from "../App.js"
import { installFetchMock } from "./testFetch.js"

const member = {
  id: "mem-live",
  email: "live-admin@specraft.test",
  name: "Admin API User",
  role: "admin",
}

type GraphTransform = {
  readonly x: number
  readonly y: number
  readonly scale: number
}

function firstElement<T>(items: readonly T[], name: string): T {
  const item = items[0]
  if (item === undefined) {
    throw new Error(`missing test element: ${name}`)
  }
  return item
}

function textOf(element: HTMLElement): string {
  return element.textContent ?? ""
}

function parseGraphTransform(value: string | null): GraphTransform {
  if (value === null || value.trim() === "") {
    throw new Error("missing graph viewport transform")
  }
  let x: number | null = null
  let y: number | null = null
  let scale: number | null = null
  for (const part of value.split(";")) {
    const pieces = part.split("=")
    const key = pieces[0]
    const raw = pieces[1]
    if (key === undefined || raw === undefined) {
      continue
    }
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) {
      throw new Error(`invalid graph viewport transform value: ${part}`)
    }
    if (key === "x") {
      x = parsed
    } else if (key === "y") {
      y = parsed
    } else if (key === "scale") {
      scale = parsed
    }
  }
  if (x === null || y === null || scale === null) {
    throw new Error(`incomplete graph viewport transform: ${value}`)
  }
  return { x, y, scale }
}

function graphTransformOf(canvas: HTMLElement): GraphTransform {
  return parseGraphTransform(canvas.getAttribute("data-viewport-transform"))
}

function graphGridSizeOf(canvas: HTMLElement): number {
  const raw = canvas.getAttribute("data-grid-size")
  if (raw === null) {
    throw new Error("missing graph grid size")
  }
  const size = Number(raw)
  if (!Number.isFinite(size)) {
    throw new Error(`invalid graph grid size: ${raw}`)
  }
  return size
}

function clickZoom(label: "확대" | "축소", times: number): void {
  for (let i = 0; i < times; i += 1) {
    fireEvent.click(firstElement(screen.getAllByRole("button", { name: label }), `zoom ${label}`))
  }
}

function installSpecsMocks(): void {
  installFetchMock({
    routes: new Map([
      ["GET /api/v1/auth/session", { member }],
      [
        "GET /api/v1/wiki/dev/graph",
        {
          branch: "dev",
          nodes: [
            {
              path: "overview.md",
              title: "Live Overview",
              dir: "ROOT",
              summary: "Live wiki content from API.",
              updated: "2026-06-07T08:30:00Z",
              author: "specraft-server",
              commit: "ov12345",
            },
            {
              path: "specs/stop-gate.md",
              title: "Stop Gate",
              dir: "SPECS",
              summary: "Stop gate rules",
              updated: "2026-06-07T09:10:00Z",
              author: "soyesenna",
              commit: "sg12345",
            },
          ],
          edges: [{ from: "specs/stop-gate.md", to: "overview.md" }],
        },
      ],
      ["GET /api/v1/logs/ingests", { logs: [], next_cursor: null }],
    ]),
  })
}

function renderSpecs(): void {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date("2026-06-07T10:00:00Z"))
  installSpecsMocks()
  render(
    <MemoryRouter initialEntries={["/specs"]}>
      <App />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe("frontend specs graph zoom controls", () => {
  it("Given graph zoom controls When clicked Then scale changes by ten percent and grid tracks zoom", async () => {
    renderSpecs()

    const canvas = await screen.findByTestId("specs-graph-canvas")
    const initial = graphTransformOf(canvas)
    const initialGrid = graphGridSizeOf(canvas)

    clickZoom("축소", 1)

    await waitFor(() => {
      expect(graphTransformOf(canvas).scale).toBeCloseTo(0.9)
    })
    expect(graphGridSizeOf(canvas)).toBeLessThan(initialGrid)
    expect(screen.queryByTestId("specs-dot-canvas")).toBeNull()

    clickZoom("확대", 1)

    await waitFor(() => {
      expect(graphTransformOf(canvas).scale).toBeCloseTo(initial.scale)
    })
    expect(graphGridSizeOf(canvas)).toBeCloseTo(initialGrid)
  })

  it("Given graph zoom reaches fifty percent When threshold is crossed Then compact graph view is selected", async () => {
    renderSpecs()

    await screen.findByTestId("specs-graph-canvas")

    clickZoom("축소", 5)

    const dotCanvas = await screen.findByTestId("specs-dot-canvas")
    expect(screen.queryByTestId("specs-graph-canvas")).toBeNull()
    expect(dotCanvas.getAttribute("data-viewport-scale")).toBe("0.5")
    expect(textOf(dotCanvas)).toContain("Compact view — zoom 50%")

    clickZoom("확대", 1)

    const graphCanvas = await screen.findByTestId("specs-graph-canvas")
    expect(screen.queryByTestId("specs-dot-canvas")).toBeNull()
    expect(graphTransformOf(graphCanvas).scale).toBeCloseTo(0.6)
  })
})
