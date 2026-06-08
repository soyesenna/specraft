import { afterEach, vi } from "vitest"

type RouteMethod = "DELETE" | "GET" | "POST" | "PUT"
type RouteKey = `${RouteMethod} ${string}`

type FetchResponse = {
  readonly body?: unknown
  readonly status?: number
  // 설정 시 text/event-stream 으로 응답 (SSE 라우트 mock 용)
  readonly sse?: string
}

type FetchMockOptions = {
  readonly routes: ReadonlyMap<RouteKey, FetchResponse | unknown>
  readonly onCall?: (key: RouteKey, body: unknown) => void
}

function isFetchResponse(value: FetchResponse | unknown): value is FetchResponse {
  return typeof value === "object" && value !== null && ("body" in value || "sse" in value)
}

function responseFor(value: FetchResponse | unknown): FetchResponse {
  if (isFetchResponse(value)) {
    return value
  }
  return { body: value }
}

function isRouteMethod(value: string): value is RouteMethod {
  return value === "DELETE" || value === "GET" || value === "POST" || value === "PUT"
}

function routeKey(method: RouteMethod, pathname: string): RouteKey {
  return `${method} ${pathname}`
}

function parseBody(init: RequestInit | undefined): unknown {
  if (typeof init?.body !== "string" || init.body.length === 0) {
    return null
  }
  const parsed: unknown = JSON.parse(init.body)
  return parsed
}

export function installFetchMock(options: FetchMockOptions): void {
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = new URL(input.toString())
      const method = init?.method ?? "GET"
      if (!isRouteMethod(method)) {
        throw new Error(`unsupported test method: ${method}`)
      }
      const key = routeKey(method, url.pathname)
      const requestBody = parseBody(init)
      options.onCall?.(key, requestBody)
      const configured = options.routes.get(key)
      if (configured === undefined) {
        return new Response(JSON.stringify({ error: "unexpected_route", key }), {
          status: 500,
          headers: { "content-type": "application/json" },
        })
      }
      const response = responseFor(configured)
      if (typeof response.sse === "string") {
        return new Response(response.sse, {
          status: response.status ?? 200,
          headers: { "content-type": "text/event-stream" },
        })
      }
      return new Response(JSON.stringify(response.body), {
        status: response.status ?? 200,
        headers: { "content-type": "application/json" },
      })
    },
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})
