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
          "GET /api/v1/wiki/dev/graph",
          {
            branch: "dev",
            nodes: [
              {
                path: "overview.md",
                title: "Live Overview",
                dir: "CORE",
                summary: "Live wiki content from API.",
              },
              {
                path: "specs/stop-gate.md",
                title: "Stop Gate",
                dir: "SPECS",
                summary: "Stop 게이트 판정 규칙",
              },
            ],
            edges: [{ from: "specs/stop-gate.md", to: "overview.md" }],
          },
        ],
        [
          "POST /api/v1/query/stream",
          {
            sse:
              'event: delta\ndata: {"text":"Live answer from API about Stop gate."}\n\n' +
              'event: done\ndata: {"answer":"Live answer from API about Stop gate.","citations":[{"path":"overview.md","section":"Goal"}],"query_id":"qry-live"}\n\n',
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

    // 디자인 정합 Specs 화면은 그래프/리스트 노드(파일명·요약)로 위키 데이터를 렌더한다.
    expect((await screen.findAllByText("overview.md")).length).toBeGreaterThan(0)
    expect(screen.getAllByText("Live wiki content from API.").length).toBeGreaterThan(0)

    fireEvent.click(firstElement(screen.getAllByRole("link", { name: "Query" }), "Query"))
    expect(
      firstElement(screen.getAllByRole("button", { name: "질문 전송" }), "질문 전송").getAttribute(
        "disabled",
      ),
    ).not.toBeNull()
    fireEvent.change(firstElement(await screen.findAllByLabelText("질문"), "질문"), {
      target: { value: "Stop 게이트 조건은?" },
    })
    fireEvent.click(firstElement(screen.getAllByRole("button", { name: "질문 전송" }), "질문 전송"))

    // 반응형 분기(데스크톱 hidden md:block + 모바일 md:hidden)가 jsdom 에서 동시 렌더되어
    // 동일 텍스트가 양쪽에 존재하므로 findAllByText 로 단언한다.
    expect(
      (await screen.findAllByText("Live answer from API about Stop gate.")).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText("overview.md#Goal").length).toBeGreaterThan(0)

    fireEvent.click(firstElement(screen.getAllByRole("link", { name: "Activity" }), "Activity"))
    // Activity 로그가 API 응답에서 온다는 시나리오 단언.
    // (디자인 정합 후 Activity 테이블은 UUID ID 컬럼 대신 질문·작성자를 렌더한다.)
    expect((await screen.findAllByText("Stop 게이트 조건은?")).length).toBeGreaterThan(0)
    expect(screen.getAllByText("Admin API User").length).toBeGreaterThan(0)
  })

  it("Given query API returns HTTP 500 When user asks a question Then inline error renders without static fallback answer or citation", async () => {
    installFetchMock({
      routes: new Map([
        ["GET /api/v1/auth/session", { member }],
        [
          "POST /api/v1/query/stream",
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

    // LiveShell 세션 확인 게이트가 풀린 뒤에야 AskBar가 렌더되므로 비동기로 조회한다.
    fireEvent.change(firstElement(await screen.findAllByLabelText("질문"), "질문"), {
      target: { value: "Stop 게이트 조건은?" },
    })
    fireEvent.click(firstElement(screen.getAllByRole("button", { name: "질문 전송" }), "질문 전송"))

    expect(
      (await screen.findAllByText("specraft request failed with HTTP 500")).length,
    ).toBeGreaterThan(0)
    expect(
      screen.queryByText(/Stop 게이트는 .*워킹트리 clean .*3중 검사를 순서대로 수행/),
    ).toBeNull()
    expect(screen.queryByText("stop-gate.md#판정-매트릭스")).toBeNull()
    expect(screen.queryByText(/query_id qx_8f31/)).toBeNull()
  })
})
