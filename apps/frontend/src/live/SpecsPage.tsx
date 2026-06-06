import type { WikiTreeResponse } from "@specraft/shared"
import { FileText } from "lucide-react"
import { useEffect, useState } from "react"
import { useSpecraft } from "./api.js"
import { LiveShell } from "./LiveShell.js"

const branch = "dev"

function titleFromMarkdown(content: string): string {
  const heading = content
    .split("\n")
    .find((line) => line.startsWith("# "))
    ?.replace("# ", "")
  return heading ?? "Untitled wiki page"
}

function bodyFromMarkdown(content: string): readonly string[] {
  return content
    .split("\n")
    .filter((line) => line.trim().length > 0 && !line.startsWith("#"))
    .map((line) => line.replace(/^[-*]\s+/u, ""))
}

export function SpecsPage() {
  const { client } = useSpecraft()
  const [tree, setTree] = useState<WikiTreeResponse | null>(null)
  const [selectedPath, setSelectedPath] = useState("overview.md")
  const [content, setContent] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void client
      .wikiTree({ branch })
      .then((response) => {
        if (active) {
          setTree(response)
          setSelectedPath(response.entries[0]?.path ?? "overview.md")
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Failed to load wiki tree")
        }
      })
    return () => {
      active = false
    }
  }, [client])

  useEffect(() => {
    let active = true
    void client
      .wikiPage({ branch, path: selectedPath })
      .then((page) => {
        if (active) {
          setContent(page.content)
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Failed to load wiki page")
        }
      })
    return () => {
      active = false
    }
  }, [client, selectedPath])

  const entries = tree?.entries ?? []

  return (
    <LiveShell title="Specs">
      <div className="flex min-h-0 flex-1 gap-6 px-7 pb-7">
        <nav className="flex w-[260px] shrink-0 flex-col gap-1 overflow-y-auto">
          {entries.map((entry) => (
            <button
              key={entry.path}
              type="button"
              onClick={() => setSelectedPath(entry.path)}
              className={`flex h-9 items-center gap-2 rounded-[7px] px-3 text-left ${
                selectedPath === entry.path ? "bg-surface font-semibold" : "text-ink-secondary"
              }`}
            >
              <FileText className="size-3.5" />
              <span className="pen-text text-[13px] tracking-[-0.2px]">{entry.path}</span>
            </button>
          ))}
        </nav>
        <article className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto rounded-lg bg-surface px-10 py-8">
          {error && <span className="pen-text text-[13px] text-danger">{error}</span>}
          <span className="pen-text text-[12px] tracking-[-0.12px] text-ink-tertiary">
            {branch} / {selectedPath}
          </span>
          <h2 className="pen-text m-0 font-display text-[28px] font-semibold tracking-[-0.4px]">
            {titleFromMarkdown(content)}
          </h2>
          <div className="h-px w-full bg-hairline" />
          {bodyFromMarkdown(content).map((line) => (
            <p
              key={line}
              className="pen-text m-0 text-[14.5px] leading-[1.65] tracking-[-0.22px] text-ink-secondary"
            >
              {line}
            </p>
          ))}
        </article>
      </div>
    </LiveShell>
  )
}
