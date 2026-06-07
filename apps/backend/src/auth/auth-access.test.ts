import { describe, expect, it } from "vitest"
import { buildServer } from "../server.js"
import { createDatabase } from "../storage/database.js"

const secret = "0123456789abcdef0123456789abcdef"

describe("auth access controls", () => {
  it("rejects duplicate bootstrap and unauthorized admin access", async () => {
    const database = createDatabase({ path: ":memory:" })
    const server = buildServer({ database, secret })

    await server.inject({
      method: "POST",
      url: "/api/v1/auth/bootstrap-admin",
      payload: {
        email: "admin@example.com",
        password: "admin-password",
        name: "Admin One",
      },
    })
    const duplicate = await server.inject({
      method: "POST",
      url: "/api/v1/auth/bootstrap-admin",
      payload: {
        email: "other@example.com",
        password: "admin-password",
        name: "Other Admin",
      },
    })
    const invite = await server.inject({ method: "POST", url: "/api/v1/admin/invites" })

    expect(duplicate.statusCode).toBe(409)
    expect(invite.statusCode).toBe(401)
    expect(invite.json()).toEqual({ error: "unauthorized" })

    await server.close()
    database.close()
  })

  it("clears the session cookie and rejects protected routes after logout", async () => {
    const database = createDatabase({ path: ":memory:" })
    const server = buildServer({ database, secret })

    const bootstrap = await server.inject({
      method: "POST",
      url: "/api/v1/auth/bootstrap-admin",
      payload: {
        email: "admin@example.com",
        password: "admin-password",
        name: "Admin One",
      },
    })
    const adminCookie = bootstrap.cookies[0]
    const logout = await server.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      cookies: { specraft_session: adminCookie?.value ?? "" },
    })

    expect(logout.statusCode).toBe(200)
    expect(logout.json()).toEqual({ status: "ok" })
    expect(logout.cookies[0]?.name).toBe("specraft_session")
    expect(logout.cookies[0]?.value).toBe("")
    const logoutCookie = String(logout.headers["set-cookie"])
    expect(logoutCookie).toContain("specraft_session=")
    expect(logoutCookie).toContain("Path=/")
    expect(logoutCookie).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/)

    const postLogoutSession = await server.inject({ method: "GET", url: "/api/v1/auth/session" })
    const postLogoutProtectedApi = await server.inject({
      method: "POST",
      url: "/api/v1/keys",
      payload: { name: "post-logout" },
    })
    expect(postLogoutSession.statusCode).toBe(401)
    expect(postLogoutProtectedApi.statusCode).toBe(401)

    await server.close()
    database.close()
  })
})
