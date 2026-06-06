import type { z } from "zod"
import type { ErrorBody } from "./schemas.js"
import { ErrorBodySchema } from "./schemas.js"

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>
type QueryPair = readonly [string, string | number | undefined]

export type ClientConfig = {
  readonly baseUrl: string
  readonly apiKey?: string
  readonly fetch?: Fetcher
}

export type RequestSpec<Request, ResponseBody> = {
  readonly path: string
  readonly method: "GET" | "POST" | "PUT" | "DELETE"
  readonly requestSchema?: z.ZodType<Request>
  readonly responseSchema: z.ZodType<ResponseBody>
  readonly body?: Request
  readonly query?: readonly QueryPair[]
}

export type Requester = <Request, ResponseBody>(
  spec: RequestSpec<Request, ResponseBody>,
) => Promise<ResponseBody>

export class SpecraftHttpError extends Error {
  readonly name = "SpecraftHttpError"

  constructor(
    readonly status: number,
    readonly body: ErrorBody | unknown,
  ) {
    super(`specraft request failed with HTTP ${status}`)
  }
}

export function createRequester(config: ClientConfig): Requester {
  const baseUrl = new URL(config.baseUrl)
  const fetcher = config.fetch ?? globalThis.fetch

  return async function request<Request, ResponseBody>(
    spec: RequestSpec<Request, ResponseBody>,
  ): Promise<ResponseBody> {
    const url = new URL(spec.path, baseUrl)
    if (spec.query) {
      for (const [key, value] of spec.query) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value))
        }
      }
    }
    const headers = new Headers({ "content-type": "application/json" })
    if (config.apiKey) {
      headers.set("authorization", `Bearer ${config.apiKey}`)
    }
    const parsedBody =
      spec.body === undefined
        ? undefined
        : spec.requestSchema
          ? spec.requestSchema.parse(spec.body)
          : spec.body
    const init: RequestInit = { method: spec.method, headers }
    if (parsedBody) {
      init.body = JSON.stringify(parsedBody)
    }
    const response = await fetcher(url.toString(), init)
    const textBody = await response.text()
    const jsonBody: unknown = textBody.length > 0 ? JSON.parse(textBody) : {}
    if (!response.ok) {
      const errorBody = ErrorBodySchema.safeParse(jsonBody)
      throw new SpecraftHttpError(response.status, errorBody.success ? errorBody.data : jsonBody)
    }
    return spec.responseSchema.parse(jsonBody)
  }
}
