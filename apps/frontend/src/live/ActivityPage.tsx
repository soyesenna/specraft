import type { IngestLog, QueryLog } from "@specraft/shared"
import { ArrowUp, MessageCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { useSpecraft } from "./api.js"
import { LiveShell } from "./LiveShell.js"

type ActivityRow =
  | { readonly kind: "Ingest"; readonly log: IngestLog }
  | { readonly kind: "Query"; readonly log: QueryLog }

function rowId(row: ActivityRow): string {
  return row.log.id
}

function rowSummary(row: ActivityRow): string {
  return row.kind === "Ingest" ? row.log.summary : row.log.question
}

function rowStatus(row: ActivityRow): string {
  return row.kind === "Ingest" ? row.log.status : "logged"
}

export function ActivityPage() {
  const { client } = useSpecraft()
  const [rows, setRows] = useState<readonly ActivityRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void Promise.all([client.listIngestLogs(), client.listQueryLogs()])
      .then(([ingests, queries]) => {
        if (active) {
          const nextRows: readonly ActivityRow[] = [
            ...ingests.logs.map((log) => ({ kind: "Ingest", log }) as const),
            ...queries.logs.map((log) => ({ kind: "Query", log }) as const),
          ]
          setRows(nextRows)
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Failed to load activity")
        }
      })
    return () => {
      active = false
    }
  }, [client])

  return (
    <LiveShell title="Activity">
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-7 pb-7">
        {error && <span className="pen-text text-[13px] text-danger">{error}</span>}
        <div className="flex flex-col overflow-hidden rounded-md bg-surface">
          <div className="grid h-[38px] grid-cols-[120px_160px_1fr_120px_100px] items-center border-b border-hairline px-5">
            {["TYPE", "MEMBER", "SUMMARY", "STATUS", "ID"].map((header) => (
              <span
                key={header}
                className="pen-text text-[10.5px] font-semibold tracking-[0.6px] text-ink-tertiary"
              >
                {header}
              </span>
            ))}
          </div>
          {rows.map((row) => {
            const Icon = row.kind === "Ingest" ? ArrowUp : MessageCircle
            return (
              <div
                key={rowId(row)}
                className="grid min-h-[48px] grid-cols-[120px_160px_1fr_120px_100px] items-center border-b border-hairline px-5"
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-3.5 text-ink-secondary" />
                  <span className="pen-text text-[12.5px]">{row.kind}</span>
                </span>
                <span className="pen-text text-[13px] tracking-[-0.2px]">
                  {row.log.member.name}
                </span>
                <span className="pen-text min-w-0 text-[13px] tracking-[-0.2px] text-ink-secondary">
                  {rowSummary(row)}
                </span>
                <span className="pen-text text-[12px] text-ink-secondary">{rowStatus(row)}</span>
                <span className="pen-text font-mono text-[11px] text-ink-tertiary">
                  {rowId(row)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </LiveShell>
  )
}
