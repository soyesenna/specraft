import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { App } from "../App.js"
import { installFetchMock } from "./testFetch.js"

const member = {
  id: "mem-live",
  email: "live-admin@specraft.test",
  name: "Admin API User",
  role: "admin",
}

function firstElement<T>(items: readonly T[], name: string): T {
  const item = items[0]
  if (item === undefined) {
    throw new Error(`missing test element: ${name}`)
  }
  return item
}

describe("frontend wiki and query integration", () => {
  it("Given wiki and query API When user opens specs and asks a question Then page content citations and query log come from API", async () => {
    installFetchMock({
      routes: new Map([
        ["GET /api/v1/auth/session", { member }],
        [
          "GET /api/v1/wiki/dev/tree",
          {
            branch: "dev",
            entries: [
              { path: "overview.md", type: "file" },
              { path: "specs/stop-gate.md", type: "file" },
            ],
          },
        ],
        [
          "GET /api/v1/wiki/dev/page",
          {
            branch: "dev",
            path: "overview.md",
            content: "# Live Overview\n\nLive wiki content from API.",
          },
        ],
        [
          "POST /api/v1/query",
          {
            answer: "Live answer from API about Stop gate.",
            citations: [{ path: "overview.md", section: "Goal" }],
            query_id: "qry-live",
          },
        ],
        [
          "GET /api/v1/logs/ingests",
          {
            logs: [],
            next_cursor: null,
          },
        ],
        [
          "GET /api/v1/logs/queries",
          {
            logs: [
              {
                id: "qry-log-live",
                member,
                branch: "dev",
                question: "Stop 게이트 조건은?",
                created_at: "2026-06-06T00:00:00Z",
              },
            ],
            next_cursor: null,
          },
        ],
      ]),
    })

    render(
      <MemoryRouter initialEntries={["/specs"]}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByText("Live Overview")).toBeTruthy()
    expect(screen.getByText("Live wiki content from API.")).toBeTruthy()

    fireEvent.click(firstElement(screen.getAllByRole("link", { name: "Query" }), "Query"))
    expect(
      firstElement(screen.getAllByRole("button", { name: "질문 전송" }), "질문 전송").getAttribute(
        "disabled",
      ),
    ).not.toBeNull()
    fireEvent.change(firstElement(screen.getAllByLabelText("질문"), "질문"), {
      target: { value: "Stop 게이트 조건은?" },
    })
    fireEvent.click(firstElement(screen.getAllByRole("button", { name: "질문 전송" }), "질문 전송"))

    expect(await screen.findByText("Live answer from API about Stop gate.")).toBeTruthy()
    expect(screen.getByText("overview.md#Goal")).toBeTruthy()

    fireEvent.click(firstElement(screen.getAllByRole("link", { name: "Activity" }), "Activity"))
    expect(await screen.findByText("Stop 게이트 조건은?")).toBeTruthy()
    expect(screen.getByText("qry-log-live")).toBeTruthy()
  })

  it("Given query API returns HTTP 500 When user asks a question Then inline error renders without static fallback answer or citation", async () => {
    installFetchMock({
      routes: new Map([
        ["GET /api/v1/auth/session", { member }],
        [
          "POST /api/v1/query",
          {
            status: 500,
            body: { error: "query_failed" },
          },
        ],
      ]),
    })

    render(
      <MemoryRouter initialEntries={["/query"]}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.change(firstElement(screen.getAllByLabelText("질문"), "질문"), {
      target: { value: "Stop 게이트 조건은?" },
    })
    fireEvent.click(firstElement(screen.getAllByRole("button", { name: "질문 전송" }), "질문 전송"))

    expect(await screen.findByText("specraft request failed with HTTP 500")).toBeTruthy()
    expect(
      screen.queryByText(/Stop 게이트는 .*워킹트리 clean .*3중 검사를 순서대로 수행/),
    ).toBeNull()
    expect(screen.queryByText("stop-gate.md#판정-매트릭스")).toBeNull()
    expect(screen.queryByText(/query_id qx_8f31/)).toBeNull()
  })
})
