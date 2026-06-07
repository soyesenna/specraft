import { fireEvent, render, screen, within } from "@testing-library/react"
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

describe("frontend navigation shell integration", () => {
  it("Given live shell When profile avatar opens menu Then Settings is available from dropdown", async () => {
    installFetchMock({
      routes: new Map([
        ["GET /api/v1/auth/session", { member }],
        [
          "GET /api/v1/admin/settings",
          {
            git_remote_url: "ssh://git.example/specraft.git",
            model_ingest: "openrouter/auto",
            model_query: "openrouter/auto",
            credential_configured: true,
          },
        ],
      ]),
    })

    render(
      <MemoryRouter initialEntries={["/activity"]}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole("button", { name: "프로필 메뉴 열기" }))

    const profileMenu = await screen.findByRole("navigation", { name: "프로필 메뉴" })
    expect(within(profileMenu).getByRole("link", { name: "Settings" })).toBeTruthy()
    fireEvent.click(within(profileMenu).getByRole("link", { name: "Settings" }))
    expect((await screen.findAllByText("Git integration")).length).toBeGreaterThan(0)
  })

  it("Given profile menu When sign out is clicked Then session is cleared", async () => {
    let loggedOut = false
    installFetchMock({
      routes: new Map([
        ["GET /api/v1/auth/session", { member }],
        ["POST /api/v1/auth/logout", { status: "ok" }],
      ]),
      onCall: (key) => {
        if (key === "POST /api/v1/auth/logout") {
          loggedOut = true
        }
      },
    })

    render(
      <MemoryRouter initialEntries={["/activity"]}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole("button", { name: "프로필 메뉴 열기" }))
    const profileMenu = await screen.findByRole("navigation", { name: "프로필 메뉴" })
    fireEvent.click(within(profileMenu).getByRole("button", { name: "Sign out" }))

    // 디자인 정합 SignInScreen 은 데스크톱/모바일 분기를 모두 렌더링하므로 Sign in 버튼이 둘 이상이다.
    expect((await screen.findAllByRole("button", { name: "Sign in" })).length).toBeGreaterThan(0)
    expect(loggedOut).toBe(true)
  })

  it("Given settings page When rendered Then API keys is a settings subnav item only", async () => {
    installFetchMock({
      routes: new Map([
        ["GET /api/v1/auth/session", { member }],
        [
          "GET /api/v1/admin/settings",
          {
            git_remote_url: "ssh://git.example/specraft.git",
            model_ingest: "openrouter/auto",
            model_query: "openrouter/auto",
            credential_configured: true,
          },
        ],
      ]),
    })

    render(
      <MemoryRouter initialEntries={["/settings/git"]}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.queryByRole("navigation", { name: "앱 사이드바" })).toBeNull()

    const settingsNav = await screen.findByRole("navigation", { name: "Settings sections" })
    expect(within(settingsNav).getByRole("link", { name: "API keys" })).toBeTruthy()
  })

  it("Given models settings route When rendered Then model controls are not replaced by Git fields", async () => {
    installFetchMock({
      routes: new Map([
        ["GET /api/v1/auth/session", { member }],
        [
          "GET /api/v1/admin/settings",
          {
            git_remote_url: "ssh://git.example/specraft.git",
            model_ingest: "openrouter/ingest",
            model_query: "openrouter/query",
            credential_configured: true,
          },
        ],
      ]),
    })

    render(
      <MemoryRouter initialEntries={["/settings/models"]}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByDisplayValue("openrouter/ingest")).toBeTruthy()
    expect(screen.getByDisplayValue("openrouter/query")).toBeTruthy()
    expect(screen.queryByLabelText("Remote URL")).toBeNull()
  })

  it("Given live shell When sidebar toggle is clicked Then collapsed rail can expand", async () => {
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
                title: "Overview",
                dir: "CORE",
                summary: "Live content.",
              },
            ],
            edges: [],
          },
        ],
      ]),
    })

    render(
      <MemoryRouter initialEntries={["/specs"]}>
        <App />
      </MemoryRouter>,
    )

    // 디자인 정합 Specs 화면은 그래프/리스트 뷰로 노드(파일명)를 렌더한다.
    expect((await screen.findAllByText("overview.md")).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole("button", { name: "사이드바 접기" }))
    const collapsedSidebar = screen.getByRole("navigation", { name: "앱 사이드바" })
    expect(await screen.findByRole("button", { name: "사이드바 펼치기" })).toBeTruthy()
    expect(collapsedSidebar.className).toContain("w-16")
    fireEvent.click(screen.getByRole("button", { name: "사이드바 펼치기" }))
    const expandedSidebar = screen.getByRole("navigation", { name: "앱 사이드바" })
    expect(expandedSidebar.className).toContain("w-[216px]")
    expect(within(expandedSidebar).getByText("Specs")).toBeTruthy()
  })
})
