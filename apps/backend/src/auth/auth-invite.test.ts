import { describe, expect, it } from "vitest"
import { buildServer } from "../server.js"
import { createDatabase } from "../storage/database.js"

const secret = "0123456789abcdef0123456789abcdef"

describe("auth invite signup", () => {
  it("does not create a login-capable member when signup uses an invalid invite", async () => {
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

    const signup = await server.inject({
      method: "POST",
      url: "/api/v1/auth/signup",
      payload: {
        invite_token: "invalid-token",
        email: "intruder@example.com",
        password: "member-password",
        name: "Intruder",
      },
    })
    const login = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "intruder@example.com", password: "member-password" },
    })

    expect(signup.statusCode).toBe(422)
    expect(login.statusCode).toBe(401)

    await server.close()
    database.close()
  })

  it("does not create a second member when signup reuses an invite token", async () => {
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
    const invite = await server.inject({
      method: "POST",
      url: "/api/v1/admin/invites",
      cookies: { specraft_session: bootstrap.cookies[0]?.value ?? "" },
    })
    const inviteUrlParts = String(invite.json<{ readonly invite_url: string }>().invite_url).split(
      "/",
    )
    const inviteToken = inviteUrlParts[inviteUrlParts.length - 1] ?? ""

    const firstSignup = await server.inject({
      method: "POST",
      url: "/api/v1/auth/signup",
      payload: {
        invite_token: inviteToken,
        email: "member@example.com",
        password: "member-password",
        name: "Member One",
      },
    })
    const secondSignup = await server.inject({
      method: "POST",
      url: "/api/v1/auth/signup",
      payload: {
        invite_token: inviteToken,
        email: "second@example.com",
        password: "second-password",
        name: "Second Member",
      },
    })
    const secondLogin = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "second@example.com", password: "second-password" },
    })

    expect(firstSignup.statusCode).toBe(200)
    expect(secondSignup.statusCode).toBe(422)
    expect(secondLogin.statusCode).toBe(401)

    await server.close()
    database.close()
  })

  it("does not create a member when signup uses an invalid invite token", async () => {
    const database = createDatabase({ path: ":memory:" })
    const server = buildServer({ database, secret })

    const signup = await server.inject({
      method: "POST",
      url: "/api/v1/auth/signup",
      payload: {
        invite_token: "missing-invite",
        email: "member@example.com",
        password: "member-password",
        name: "Member One",
      },
    })
    expect(signup.statusCode).toBe(422)

    const login = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "member@example.com", password: "member-password" },
    })
    expect(login.statusCode).toBe(401)

    await server.close()
    database.close()
  })
})
