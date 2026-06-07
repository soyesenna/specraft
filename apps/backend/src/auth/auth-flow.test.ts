import { describe, expect, it } from "vitest"
import { loadServerConfig } from "../config/secrets.js"
import { buildServer } from "../server.js"
import { createDatabase } from "../storage/database.js"
import { decryptCredential } from "./credentials.js"

const secret = "0123456789abcdef0123456789abcdef"
const credentialKey = loadServerConfig({ SPECRAFT_SECRET: secret }).credentialKey

describe("auth and admin API", () => {
  it("bootstraps admin, invites a member, logs in, and manages API keys/settings", async () => {
    const database = createDatabase({ path: ":memory:" })
    const server = buildServer({ database, credentialKey, secret })

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
    expect(bootstrap.statusCode).toBe(200)
    expect(bootstrap.json()).toEqual({
      member: {
        id: expect.any(String),
        email: "admin@example.com",
        name: "Admin One",
        role: "admin",
      },
    })
    expect(adminCookie?.name).toBe("specraft_session")

    const adminSession = await server.inject({
      method: "GET",
      url: "/api/v1/auth/session",
      cookies: { specraft_session: adminCookie?.value ?? "" },
    })
    expect(adminSession.statusCode).toBe(200)
    expect(adminSession.json()).toEqual({
      member: {
        id: expect.any(String),
        email: "admin@example.com",
        name: "Admin One",
        role: "admin",
      },
    })

    const invite = await server.inject({
      method: "POST",
      url: "/api/v1/admin/invites",
      cookies: { specraft_session: adminCookie?.value ?? "" },
    })
    expect(invite.statusCode).toBe(200)
    expect(invite.json()).toEqual({
      invite_url: expect.stringContaining("/invite/"),
      expires_at: expect.any(String),
    })
    const inviteUrlParts = String(invite.json<{ invite_url: string }>().invite_url).split("/")
    const inviteToken = inviteUrlParts[inviteUrlParts.length - 1]

    const inviteList = await server.inject({
      method: "GET",
      url: "/api/v1/admin/invites",
      cookies: { specraft_session: adminCookie?.value ?? "" },
    })
    expect(inviteList.statusCode).toBe(200)
    expect(inviteList.json()).toEqual({
      invites: [
        {
          token: inviteToken,
          expires_at: expect.any(String),
          used_at: null,
          used_by: null,
        },
      ],
    })

    const signup = await server.inject({
      method: "POST",
      url: "/api/v1/auth/signup",
      payload: {
        invite_token: inviteToken,
        email: "member@example.com",
        password: "member-password",
        name: "Member One",
      },
    })
    expect(signup.statusCode).toBe(200)
    expect(signup.json<{ member: { readonly role: string } }>().member.role).toBe("member")

    const login = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "member@example.com", password: "member-password" },
    })
    const memberCookie = login.cookies[0]
    expect(login.statusCode).toBe(200)
    expect(memberCookie?.name).toBe("specraft_session")
    expect(login.json()).toEqual({
      member: {
        id: expect.any(String),
        email: "member@example.com",
        name: "Member One",
        role: "member",
      },
    })

    const createdKey = await server.inject({
      method: "POST",
      url: "/api/v1/keys",
      cookies: { specraft_session: memberCookie?.value ?? "" },
      payload: { name: "default" },
    })
    expect(createdKey.statusCode).toBe(200)
    expect(createdKey.json()).toEqual({
      id: expect.any(String),
      api_key: expect.stringMatching(/^sk-spcrft-/),
    })
    const apiKey = createdKey.json<{ readonly api_key: string }>().api_key

    const listedKeys = await server.inject({
      method: "GET",
      url: "/api/v1/keys",
      cookies: { specraft_session: memberCookie?.value ?? "" },
    })
    expect(listedKeys.statusCode).toBe(200)
    expect(
      listedKeys.json<{ keys: readonly { readonly prefix: string }[] }>().keys[0]?.prefix,
    ).toBe("sk-spcrft-")

    const memberSession = await server.inject({
      method: "GET",
      url: "/api/v1/auth/session",
      cookies: { specraft_session: memberCookie?.value ?? "" },
    })
    expect(memberSession.statusCode).toBe(200)
    expect(memberSession.json()).toEqual({
      member: {
        id: expect.any(String),
        email: "member@example.com",
        name: "Member One",
        role: "member",
      },
    })

    const settings = await server.inject({
      method: "PUT",
      url: "/api/v1/admin/settings",
      cookies: { specraft_session: adminCookie?.value ?? "" },
      payload: {
        git_remote_url: "https://example.com/repo.git",
        git_credential: "secret-token",
        model_ingest: "openrouter/auto",
      },
    })
    expect(settings.statusCode).toBe(200)
    expect(settings.json()).toEqual({ status: "ok" })
    const settingsView = await server.inject({
      method: "GET",
      url: "/api/v1/admin/settings",
      cookies: { specraft_session: adminCookie?.value ?? "" },
    })
    expect(settingsView.statusCode).toBe(200)
    expect(settingsView.json()).toEqual({
      git_remote_url: "https://example.com/repo.git",
      model_ingest: "openrouter/auto",
      model_query: null,
      credential_configured: true,
    })
    const encryptedCredential = database
      .prepare<[string], { readonly value: string }>("SELECT value FROM settings WHERE key = ?")
      .get("git_credential")
    expect(encryptedCredential?.value).not.toBe("secret-token")
    expect(encryptedCredential?.value.startsWith("enc:v1:")).toBe(true)
    expect(decryptCredential(credentialKey, encryptedCredential?.value ?? "")).toBe("secret-token")

    const bearerQuery = await server.inject({
      method: "POST",
      url: "/api/v1/query",
      headers: { authorization: `Bearer ${apiKey}` },
      payload: { branch: "main", commit_hash: "abc", question: "What is specraft?" },
    })
    expect(bearerQuery.statusCode).toBe(200)

    const revoked = await server.inject({
      method: "DELETE",
      url: "/api/v1/keys",
      cookies: { specraft_session: memberCookie?.value ?? "" },
      payload: { id: createdKey.json<{ readonly id: string }>().id },
    })
    expect(revoked.statusCode).toBe(200)
    const revokedBearerQuery = await server.inject({
      method: "POST",
      url: "/api/v1/query",
      headers: { authorization: `Bearer ${apiKey}` },
      payload: { branch: "main", commit_hash: "abc", question: "Can I still query?" },
    })
    expect(revokedBearerQuery.statusCode).toBe(401)

    const members = await server.inject({
      method: "GET",
      url: "/api/v1/admin/members",
      cookies: { specraft_session: adminCookie?.value ?? "" },
    })
    expect(members.statusCode).toBe(200)
    expect(members.json()).toEqual({
      members: expect.arrayContaining([
        {
          id: expect.any(String),
          email: "admin@example.com",
          name: "Admin One",
          role: "admin",
        },
        {
          id: expect.any(String),
          email: "member@example.com",
          name: "Member One",
          role: "member",
        },
      ]),
    })

    const disabled = await server.inject({
      method: "PUT",
      url: `/api/v1/admin/members/${encodeURIComponent(
        login.json<{ readonly member: { readonly id: string } }>().member.id,
      )}/disable`,
      cookies: { specraft_session: adminCookie?.value ?? "" },
    })
    expect(disabled.statusCode).toBe(200)
    const disabledLogin = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "member@example.com", password: "member-password" },
    })
    expect(disabledLogin.statusCode).toBe(401)

    const enabled = await server.inject({
      method: "POST",
      url: "/api/v1/admin/members/enable",
      cookies: { specraft_session: adminCookie?.value ?? "" },
      payload: { id: login.json<{ readonly member: { readonly id: string } }>().member.id },
    })
    expect(enabled.statusCode).toBe(200)
    expect(enabled.json()).toEqual({ status: "ok" })
    const reEnabledLogin = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "member@example.com", password: "member-password" },
    })
    expect(reEnabledLogin.statusCode).toBe(200)

    await server.close()
    database.close()
  })

  it("requires admin for member enable and rejects when unauthenticated", async () => {
    const database = createDatabase({ path: ":memory:" })
    const server = buildServer({ database, credentialKey, secret })

    const enableUnauthenticated = await server.inject({
      method: "POST",
      url: "/api/v1/admin/members/enable",
      payload: { id: "mem_anything" },
    })
    expect(enableUnauthenticated.statusCode).toBe(401)
    expect(enableUnauthenticated.json()).toEqual({ error: "unauthorized" })

    await server.close()
    database.close()
  })

  it("tests the git connection through an injectable tester", async () => {
    const database = createDatabase({ path: ":memory:" })
    const calls: { remoteUrl: string; credential?: string }[] = []
    const server = buildServer({
      database,
      credentialKey,
      secret,
      gitConnectionTester: (input) => {
        calls.push({ ...input })
        return input.remoteUrl.includes("ok")
          ? { status: "ok" }
          : { status: "failed", message: "no" }
      },
    })

    const bootstrap = await server.inject({
      method: "POST",
      url: "/api/v1/auth/bootstrap-admin",
      payload: { email: "admin@example.com", password: "admin-password", name: "Admin One" },
    })
    const adminCookie = bootstrap.cookies[0]?.value ?? ""

    const unauthenticated = await server.inject({
      method: "POST",
      url: "/api/v1/admin/git/test-connection",
    })
    expect(unauthenticated.statusCode).toBe(401)

    const unconfigured = await server.inject({
      method: "POST",
      url: "/api/v1/admin/git/test-connection",
      cookies: { specraft_session: adminCookie },
    })
    expect(unconfigured.statusCode).toBe(200)
    expect(unconfigured.json()).toEqual({
      status: "failed",
      message: "git remote url is not configured",
    })
    expect(calls).toHaveLength(0)

    await server.inject({
      method: "PUT",
      url: "/api/v1/admin/settings",
      cookies: { specraft_session: adminCookie },
      payload: {
        git_remote_url: "https://example.com/ok-repo.git",
        git_credential: "secret-token",
      },
    })

    const ok = await server.inject({
      method: "POST",
      url: "/api/v1/admin/git/test-connection",
      cookies: { specraft_session: adminCookie },
    })
    expect(ok.statusCode).toBe(200)
    expect(ok.json()).toEqual({ status: "ok" })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.remoteUrl).toBe("https://example.com/ok-repo.git")
    expect(calls[0]?.credential).toBe("secret-token")

    await server.close()
    database.close()
  })
})
