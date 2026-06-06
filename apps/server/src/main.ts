import { buildServer } from "./server.js"

const host = process.env["HOST"] ?? "127.0.0.1"
const parsedPort = Number.parseInt(process.env["PORT"] ?? "4311", 10)
const port = Number.isNaN(parsedPort) ? 4311 : parsedPort
const server = buildServer()

await server.listen({ host, port })
