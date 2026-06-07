import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, useLocation } from "react-router-dom"
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

type TestIngestLog = {
  readonly id: string
  readonly member: typeof member
  readonly branch: string
  readonly commit_hash: string
  readonly status: "accepted"
  readonly summary: string
  readonly wiki_commit: string
  readonly created_at: string
}

const devIngestLog: TestIngestLog = {
  id: "ing-live",
  member,
  branch: "dev",
  commit_hash: "sg12345",
  status: "accepted",
  summary: "Stop gate synced from API.",
  wiki_commit: "wiki123",
  created_at: "2026-06-07T09:17:00Z",
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

function PathProbe() {
  const location = useLocation()
  return <span data-testid="current-path">{location.pathname}</span>
}

function currentPath(): string {
  return textOf(screen.getByTestId("current-path"))
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

function installSpecsMocks(ingestLogs: readonly TestIngestLog[] = [devIngestLog]): void {
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
              summary: "Stop 게이트 판정 규칙",
              updated: "2026-06-07T09:10:00Z",
              author: "soyesenna",
              commit: "sg12345",
            },
          ],
          edges: [{ from: "specs/stop-gate.md", to: "overview.md" }],
        },
      ],
      [
        "GET /api/v1/logs/ingests",
        {
          logs: ingestLogs,
          next_cursor: null,
        },
      ],
      [
        "GET /api/v1/wiki/dev/page",
        {
          branch: "dev",
          path: "specs/stop-gate.md",
          content: "# Stop Gate\n\nStop 게이트 판정 규칙",
        },
      ],
    ]),
  })
}

function renderSpecs(options: { readonly ingestLogs?: readonly TestIngestLog[] } = {}): void {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date("2026-06-07T10:00:00Z"))
  installSpecsMocks(options.ingestLogs)
  render(
    <MemoryRouter initialEntries={["/specs"]}>
      <App />
      <PathProbe />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe("frontend specs graph interaction", () => {
  it("Given desktop graph node When clicked Then detail panel opens without navigation until Open document", async () => {
    renderSpecs()

    const stopGateNode = firstElement(
      await screen.findAllByRole("button", { name: /stop-gate\.md/i }),
      "stop-gate graph node",
    )
    fireEvent.click(stopGateNode)

    expect(currentPath()).toBe("/specs")
    const panel = await screen.findByTestId("specs-detail-panel")
    expect(textOf(panel)).toContain("stop-gate.md")
    expect(textOf(panel)).toContain("Stop 게이트 판정 규칙")

    fireEvent.click(within(panel).getByRole("button", { name: /Open document/i }))

    expect(currentPath()).toBe("/specs/doc/specs%2Fstop-gate.md")
  })

  it("Given detail panel When connected doc clicked Then navigates straight to that document", async () => {
    renderSpecs()

    const stopGateNode = firstElement(
      await screen.findAllByRole("button", { name: /stop-gate\.md/i }),
      "stop-gate graph node",
    )
    fireEvent.click(stopGateNode)

    const panel = await screen.findByTestId("specs-detail-panel")
    fireEvent.click(within(panel).getByRole("button", { name: /overview\.md/i }))

    expect(currentPath()).toBe("/specs/doc/overview.md")
  })

  it("Given graph canvas When wheel and pointer drag fire Then viewport transform updates and remains bounded", async () => {
    renderSpecs()

    const canvas = await screen.findByTestId("specs-graph-canvas")
    const initialRaw = canvas.getAttribute("data-viewport-transform")
    const initial = parseGraphTransform(initialRaw)

    fireEvent.wheel(canvas, { clientX: 480, clientY: 280, deltaY: -180 })
    await waitFor(() => {
      expect(canvas.getAttribute("data-viewport-transform")).not.toBe(initialRaw)
    })
    const zoomed = parseGraphTransform(canvas.getAttribute("data-viewport-transform"))
    expect(zoomed.scale).toBeGreaterThan(initial.scale)

    fireEvent.pointerDown(canvas, { buttons: 1, clientX: 420, clientY: 280, pointerId: 1 })
    fireEvent.pointerMove(canvas, { buttons: 1, clientX: 467, clientY: 319, pointerId: 1 })
    fireEvent.pointerUp(canvas, { buttons: 0, clientX: 467, clientY: 319, pointerId: 1 })
    await waitFor(() => {
      const panned = parseGraphTransform(canvas.getAttribute("data-viewport-transform"))
      expect(panned.x).not.toBe(zoomed.x)
      expect(panned.y).not.toBe(zoomed.y)
      expect(Number.isFinite(panned.scale)).toBe(true)
    })

    fireEvent.click(screen.getByRole("button", { name: "화면 맞춤" }))

    expect(canvas.getAttribute("data-viewport-transform")).toBe(initialRaw)
  })

  it("Given compact graph and ingest logs When dot is clicked Then detail panel opens and sync label comes from API", async () => {
    renderSpecs()

    expect(
      textOf(firstElement(await screen.findAllByText("Synced 43 min ago"), "sync label")),
    ).toBe("Synced 43 min ago")
    expect(screen.queryByText("Synced 2 min ago")).toBeNull()

    for (let i = 0; i < 5; i += 1) {
      fireEvent.click(firstElement(screen.getAllByRole("button", { name: "축소" }), "zoom out"))
    }

    const dotCanvas = await screen.findByTestId("specs-dot-canvas")
    fireEvent.click(within(dotCanvas).getByRole("button", { name: /stop-gate\.md.*details/i }))

    expect(currentPath()).toBe("/specs")
    const panel = await screen.findByTestId("specs-detail-panel")
    expect(textOf(panel)).toContain("stop-gate.md")

    fireEvent.click(firstElement(screen.getAllByRole("button", { name: "List" }), "list switch"))
    const list = await screen.findByTestId("specs-list-view")
    fireEvent.click(within(list).getByRole("button", { name: /stop-gate\.md/i }))

    expect(currentPath()).toBe("/specs/doc/specs%2Fstop-gate.md")
  })

  it("Given latest ingest belongs to another branch When specs renders Then sync status stays branch scoped", async () => {
    renderSpecs({
      ingestLogs: [
        {
          ...devIngestLog,
          id: "ing-other-branch",
          branch: "main",
          created_at: "2026-06-07T09:59:00Z",
        },
      ],
    })

    expect(
      textOf(firstElement(await screen.findAllByText("No sync yet"), "empty sync label")),
    ).toBe("No sync yet")
    expect(screen.queryByText("Synced 1 min ago")).toBeNull()
    expect(screen.queryByText("Synced 43 min ago")).toBeNull()
  })
})
