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

const graphResponse = {
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
}

type LayoutPositions = Record<string, { x: number; y: number }>

function firstElement<T>(items: readonly T[], name: string): T {
  const item = items[0]
  if (item === undefined) {
    throw new Error(`missing test element: ${name}`)
  }
  return item
}

function renderSpecs(
  options: {
    readonly layoutPositions?: LayoutPositions
    readonly onCall?: (key: string, body: unknown) => void
  } = {},
): void {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date("2026-06-07T10:00:00Z"))
  installFetchMock({
    routes: new Map<`${"DELETE" | "GET" | "POST" | "PUT"} ${string}`, unknown>([
      ["GET /api/v1/auth/session", { member }],
      ["GET /api/v1/wiki/dev/graph", graphResponse],
      ["GET /api/v1/logs/ingests", { logs: [], next_cursor: null }],
      ["GET /api/v1/wiki/dev/layout", { branch: "dev", positions: options.layoutPositions ?? {} }],
      ["PUT /api/v1/wiki/dev/layout", { status: "ok" }],
    ]),
    ...(options.onCall ? { onCall: options.onCall } : {}),
  })
  render(
    <MemoryRouter initialEntries={["/specs"]}>
      <App />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

async function findStopGateNode(): Promise<HTMLElement> {
  return firstElement(
    await screen.findAllByRole("button", { name: /stop-gate\.md/i }),
    "stop-gate graph node",
  )
}

describe("frontend specs graph node drag", () => {
  it("Given a graph node When dragged Then it moves by the pointer delta and saves the layout", async () => {
    const calls: { key: string; body: unknown }[] = []
    renderSpecs({ onCall: (key, body) => calls.push({ key, body }) })

    const node = await findStopGateNode()
    const startLeft = Number.parseFloat(node.style.left)
    const startTop = Number.parseFloat(node.style.top)

    fireEvent.pointerDown(node, { buttons: 1, clientX: 400, clientY: 300, pointerId: 11 })
    fireEvent.pointerMove(node, { buttons: 1, clientX: 460, clientY: 340, pointerId: 11 })
    fireEvent.pointerUp(node, { buttons: 0, clientX: 460, clientY: 340, pointerId: 11 })

    const moved = await findStopGateNode()
    expect(Number.parseFloat(moved.style.left)).toBeCloseTo(startLeft + 60)
    expect(Number.parseFloat(moved.style.top)).toBeCloseTo(startTop + 40)

    // 드래그 종료 시 멤버×브랜치 배치가 서버로 저장된다.
    await waitFor(() => {
      const save = calls.find((call) => call.key === "PUT /api/v1/wiki/dev/layout")
      expect(save).toBeTruthy()
      const body = save?.body as { branch: string; positions: LayoutPositions }
      expect(body.branch).toBe("dev")
      expect(body.positions["specs/stop-gate.md"]?.x).toBeCloseTo(startLeft + 60)
      expect(body.positions["specs/stop-gate.md"]?.y).toBeCloseTo(startTop + 40)
    })
  })

  it("Given a drag release When the trailing click fires Then the node is not selected", async () => {
    renderSpecs()

    const node = await findStopGateNode()
    // 첫 노드(overview)가 선택돼 있으므로 stop-gate는 선택 링이 없다.
    expect(node.className).not.toContain("border-accent")

    fireEvent.pointerDown(node, { buttons: 1, clientX: 400, clientY: 300, pointerId: 12 })
    fireEvent.pointerMove(node, { buttons: 1, clientX: 480, clientY: 360, pointerId: 12 })
    fireEvent.pointerUp(node, { buttons: 0, clientX: 480, clientY: 360, pointerId: 12 })
    // 브라우저는 드래그를 놓는 순간에도 click을 발사한다 — 선택으로 이어지면 안 된다.
    fireEvent.click(node)

    expect((await findStopGateNode()).className).not.toContain("border-accent")

    // 이동 없는 일반 클릭(포인터 다운→업→클릭)은 그대로 선택 동작.
    const settled = await findStopGateNode()
    fireEvent.pointerDown(settled, { buttons: 1, clientX: 480, clientY: 360, pointerId: 13 })
    fireEvent.pointerUp(settled, { buttons: 0, clientX: 480, clientY: 360, pointerId: 13 })
    fireEvent.click(settled)

    expect((await findStopGateNode()).className).toContain("border-accent")
  })

  it("Given a saved layout When the page loads Then nodes render at the stored positions", async () => {
    renderSpecs({ layoutPositions: { "specs/stop-gate.md": { x: 901, y: 603 } } })

    await waitFor(async () => {
      const node = await findStopGateNode()
      expect(node.style.left).toBe("901px")
      expect(node.style.top).toBe("603px")
    })
  })
})
