import { loadServerConfig } from "./config/secrets.js"
import { buildServer } from "./server.js"
import { createDatabase } from "./storage/database.js"

const host = process.env["HOST"] ?? "127.0.0.1"
const parsedPort = Number.parseInt(process.env["PORT"] ?? "4311", 10)
const port = Number.isNaN(parsedPort) ? 4311 : parsedPort
const config = loadServerConfig(process.env)
const database = createDatabase({ path: `${config.dataDir}/specraft.db` })
const server = buildServer({ database, secret: config.sessionSecret })

await server.listen({ host, port })
