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

describe("frontend conflict and settings integration", () => {
  it("Given conflict and settings APIs When user resolves conflict and saves settings Then UI reflects server responses without static data", async () => {
    installFetchMock({
      routes: new Map([
        ["GET /api/v1/auth/session", { member }],
        [
          "GET /api/v1/conflicts",
          {
            conflicts: [
              {
                id: "cfl-live",
                branch: "feat/live-conflict",
                source_branch: "dev",
                state: "open",
                detail: "Live conflict detail from API",
              },
            ],
          },
        ],
        [
          "POST /api/v1/conflicts/cfl-live/resolve",
          {
            status: "resolved",
            conflict: {
              id: "cfl-live",
              branch: "feat/live-conflict",
              source_branch: "dev",
              state: "resolved",
              detail: "Live conflict resolved from API",
            },
          },
        ],
        [
          "GET /api/v1/admin/settings",
          {
            git_remote_url: "ssh://git.example/specraft.git",
            model_ingest: "openrouter/auto",
            model_query: "openrouter/auto",
            credential_configured: true,
          },
        ],
        ["PUT /api/v1/admin/settings", { status: "ok" }],
      ]),
    })

    render(
      <MemoryRouter initialEntries={["/conflicts"]}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByText("Live conflict detail from API")).toBeTruthy()
    fireEvent.change(firstElement(screen.getAllByLabelText("해결 지시"), "해결 지시"), {
      target: { value: "두 정책을 비교표로 병합" },
    })
    fireEvent.click(
      firstElement(screen.getAllByRole("button", { name: "Resolve conflict" }), "Resolve"),
    )

    expect(await screen.findByText("Live conflict resolved from API")).toBeTruthy()
    expect(screen.getAllByText("resolved").length).toBeGreaterThan(0)

    fireEvent.click(
      firstElement(screen.getAllByRole("button", { name: "프로필 메뉴 열기" }), "프로필 메뉴"),
    )
    fireEvent.click(firstElement(screen.getAllByRole("link", { name: "Settings" }), "Settings"))
    expect(await screen.findByDisplayValue("ssh://git.example/specraft.git")).toBeTruthy()
    fireEvent.change(firstElement(screen.getAllByLabelText("Remote URL"), "Remote URL"), {
      target: { value: "ssh://git.example/specraft-next.git" },
    })
    fireEvent.click(
      firstElement(screen.getAllByRole("button", { name: "Save settings" }), "Save settings"),
    )

    expect(await screen.findByText("Settings saved from API")).toBeTruthy()
  })
})
