import type { Conflict } from "@specraft/shared"
import { GitMerge, Lock } from "lucide-react"
import { useEffect, useState } from "react"
import { useSpecraft } from "./api.js"
import { LiveShell } from "./LiveShell.js"

function statusLabel(conflict: Conflict): string {
  return conflict.state
}

export function ConflictsPage() {
  const { client } = useSpecraft()
  const [conflicts, setConflicts] = useState<readonly Conflict[]>([])
  const [selected, setSelected] = useState<Conflict | null>(null)
  const [directive, setDirective] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void client
      .listConflicts()
      .then((response) => {
        if (active) {
          setConflicts(response.conflicts)
          setSelected(response.conflicts[0] ?? null)
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Failed to load conflicts")
        }
      })
    return () => {
      active = false
    }
  }, [client])

  async function resolveSelected(): Promise<void> {
    if (!selected || directive.trim().length === 0) {
      return
    }
    setError(null)
    try {
      const response = await client.resolveConflict({ id: selected.id, directive })
      const next: Conflict = response.conflict ?? {
        ...selected,
        state: response.status === "resolved" ? "resolved" : "open",
      }
      setSelected(next)
      setConflicts((current) => current.map((item) => (item.id === next.id ? next : item)))
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Resolve failed")
    }
  }

  return (
    <LiveShell title="Conflicts">
      <div className="flex min-h-0 flex-1 gap-6 px-7 pb-7">
        <aside className="flex w-[360px] shrink-0 flex-col gap-2.5 overflow-y-auto">
          {conflicts.map((conflict) => (
            <button
              key={conflict.id}
              type="button"
              onClick={() => setSelected(conflict)}
              className={`flex flex-col gap-1.5 rounded-lg bg-surface px-4 py-3 text-left ${
                selected?.id === conflict.id ? "ring-2 ring-accent" : ""
              }`}
            >
              <span className="pen-text text-[11.5px] font-semibold text-danger">
                {statusLabel(conflict)}
              </span>
              <span className="pen-text text-[13.5px] font-semibold">{conflict.branch}</span>
              <span className="pen-text text-[12px] text-ink-tertiary">{conflict.id}</span>
            </button>
          ))}
        </aside>
        <article className="flex min-w-0 flex-1 flex-col gap-4 rounded-lg bg-surface px-[26px] py-[22px]">
          {selected ? (
            <>
              <div className="flex items-center gap-2.5">
                <GitMerge className="size-4 text-ink" />
                <span className="pen-text font-display text-[21px] font-semibold tracking-[-0.3px]">
                  {selected.branch}
                </span>
                <span className="rounded-pill bg-bg px-2.5 py-1">
                  <span className="pen-text text-[11.5px] font-semibold text-ink-secondary">
                    {selected.state}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-sm bg-bg px-3.5 py-2.5">
                <Lock className="size-[13px] text-danger" />
                <span className="pen-text text-[12.5px] text-ink-secondary">
                  Branch lock remains until Merge Agent resolves the conflict.
                </span>
              </div>
              <p className="pen-text m-0 text-[13.5px] leading-[1.65] tracking-[-0.2px] text-ink-secondary">
                {selected.detail}
              </p>
              <label className="flex flex-col gap-1.5">
                <span className="pen-text text-[12.5px] font-medium">해결 지시</span>
                <textarea
                  value={directive}
                  onChange={(event) => setDirective(event.currentTarget.value)}
                  className="pen-text min-h-24 rounded-sm border-none bg-bg p-3 text-[13px] outline-none"
                />
              </label>
              {error && <span className="pen-text text-[13px] text-danger">{error}</span>}
              <button
                type="button"
                onClick={resolveSelected}
                className="flex h-10 w-fit items-center justify-center rounded-sm bg-accent px-4"
              >
                <span className="pen-text text-[14px] text-white">Resolve conflict</span>
              </button>
            </>
          ) : (
            <span className="pen-text text-[14px] text-ink-tertiary">No conflict selected.</span>
          )}
        </article>
      </div>
    </LiveShell>
  )
}
