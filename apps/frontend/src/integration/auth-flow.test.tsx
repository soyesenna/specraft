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

function firstElement<T>(items: readonly T[], name: string): T {
  const item = items[0]
  if (item === undefined) {
    throw new Error(`missing test element: ${name}`)
  }
  return item
}

describe("frontend auth integration", () => {
  it("Given login and keys API When user signs in and creates key Then dashboard shows session and one-time key", async () => {
    installFetchMock({
      routes: new Map([
        ["GET /api/v1/auth/session", { body: { error: "unauthorized" }, status: 401 }],
        ["POST /api/v1/auth/login", { member }],
        [
          "GET /api/v1/admin/settings",
          {
            git_remote_url: "ssh://git.example/specraft.git",
            model_ingest: "openrouter/auto",
            model_query: "openrouter/auto",
            credential_configured: true,
          },
        ],
        ["GET /api/v1/keys", { keys: [] }],
        ["POST /api/v1/keys", { id: "key-live", api_key: "sk-spcrft-live-secret" }],
      ]),
    })

    render(
      <MemoryRouter initialEntries={["/signin"]}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.change(firstElement(screen.getAllByLabelText("Email"), "Email"), {
      target: { value: "live-admin@specraft.test" },
    })
    fireEvent.change(firstElement(screen.getAllByLabelText("Password"), "Password"), {
      target: { value: "admin-password" },
    })
    fireEvent.click(firstElement(screen.getAllByRole("button", { name: "Sign in" }), "Sign in"))

    expect(await screen.findByText("Admin API User")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "프로필 메뉴 열기" }))
    fireEvent.click(screen.getByRole("link", { name: "Settings" }))
    const settingsNav = await screen.findByRole("navigation", { name: "Settings sections" })
    fireEvent.click(within(settingsNav).getByRole("link", { name: "API keys" }))
    fireEvent.click(await screen.findByRole("button", { name: "Create API key" }))

    expect(await screen.findByText("sk-spcrft-live-secret")).toBeTruthy()
    expect(screen.getByText("key-live")).toBeTruthy()
  })
})
