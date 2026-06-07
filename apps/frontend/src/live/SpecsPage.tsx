import type { WikiGraphResponse } from "@specraft/shared"
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { SearchField } from "../components/SearchField.js"
import { StatusBadge, type StatusTone } from "../components/StatusBadge.js"
import { type SpecsView, ViewSwitcher } from "../components/ViewSwitcher.js"
import { useSpecraft } from "./api.js"
import { useBranch } from "./branch.js"
import { LiveShell } from "./LiveShell.js"
import { MobileSpecs } from "./MobileSpecs.js"
import { DesktopDotCanvas } from "./SpecsDotCanvas.js"
import { DesktopGraphCanvas } from "./SpecsGraphCanvases.js"
import { DesktopListView } from "./SpecsListView.js"
import { docIdOf, matchesQuery, relativeSyncedLabel } from "./specsGraphModel.js"

type SyncStatus = {
  readonly label: string
  readonly tone: StatusTone
}

const SYNC_LOADING: SyncStatus = { label: "Syncing…", tone: "neutral" }

export function SpecsPage() {
  const { client } = useSpecraft()
  const { selectedBranch } = useBranch()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [graph, setGraph] = useState<WikiGraphResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<SpecsView>(params.get("view") === "list" ? "list" : "graph")
  const [dotMode, setDotMode] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SYNC_LOADING)

  useEffect(() => {
    let active = true
    setGraph(null)
    setSelectedPath(null)
    void client
      .wikiGraph({ branch: selectedBranch })
      .then((response) => {
        if (active) {
          setGraph(response)
          setSelectedPath(response.nodes[0]?.path ?? null)
          setError(null)
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Failed to load spec graph")
        }
      })
    return () => {
      active = false
    }
  }, [client, selectedBranch])

  useEffect(() => {
    let active = true
    setSyncStatus(SYNC_LOADING)
    void client
      .listIngestLogs({ limit: 100 })
      .then((response) => {
        if (!active) {
          return
        }
        const branchLogs = response.logs.filter((log) => log.branch === selectedBranch)
        const latest = branchLogs[branchLogs.length - 1]
        setSyncStatus({
          label: relativeSyncedLabel(latest?.created_at),
          tone: latest ? "success" : "neutral",
        })
      })
      .catch(() => {
        if (active) {
          setSyncStatus({ label: "Sync unavailable", tone: "warning" })
        }
      })
    return () => {
      active = false
    }
  }, [client, selectedBranch])

  const allNodes = useMemo(() => graph?.nodes ?? [], [graph])
  const visibleNodes = useMemo(
    () => allNodes.filter((node) => matchesQuery(node, query)),
    [allNodes, query],
  )
  const visiblePaths = useMemo(() => new Set(visibleNodes.map((node) => node.path)), [visibleNodes])
  const visibleEdges = useMemo(
    () =>
      (graph?.edges ?? []).filter(
        (edge) => visiblePaths.has(edge.from) && visiblePaths.has(edge.to),
      ),
    [graph, visiblePaths],
  )
  const selectedNode = useMemo(
    () => visibleNodes.find((node) => node.path === selectedPath) ?? visibleNodes[0] ?? null,
    [visibleNodes, selectedPath],
  )

  const changeView = (next: SpecsView) => {
    setView(next)
    setDotMode(false)
    const nextParams = new URLSearchParams(params)
    if (next === "list") {
      nextParams.set("view", "list")
    } else {
      nextParams.delete("view")
    }
    setParams(nextParams, { replace: true })
  }

  const openDoc = (path: string) => {
    navigate(`/specs/doc/${docIdOf(path)}`)
  }

  const toolbar = (
    <div className="flex items-center gap-3.5">
      <StatusBadge
        tone={syncStatus.tone}
        dotSize={6}
        label={syncStatus.label}
        labelClassName="font-normal text-ink-tertiary"
      />
      <SearchField
        placeholder="Search specs"
        value={query}
        onChange={setQuery}
        className="hidden md:flex"
      />
      <ViewSwitcher view={view} onChange={changeView} />
    </div>
  )

  return (
    <>
      <div className="hidden h-full md:block">
        <LiveShell title="Specs" titleRight={toolbar}>
          {error && (
            <div className="px-7 pb-2">
              <span className="pen-text text-[13px] text-danger">{error}</span>
            </div>
          )}
          {view === "graph" ? (
            dotMode ? (
              <DesktopDotCanvas
                nodes={visibleNodes}
                edges={visibleEdges}
                selectedNode={selectedNode}
                onSelectNode={setSelectedPath}
                onOpenDoc={openDoc}
                onZoomIn={() => setDotMode(false)}
              />
            ) : (
              <DesktopGraphCanvas
                nodes={visibleNodes}
                edges={visibleEdges}
                selectedNode={selectedNode}
                onSelectNode={setSelectedPath}
                onOpenDoc={openDoc}
                onZoomOut={() => setDotMode(true)}
              />
            )
          ) : (
            <DesktopListView nodes={visibleNodes} edges={visibleEdges} onOpenDoc={openDoc} />
          )}
        </LiveShell>
      </div>
      <MobileSpecs
        view={view}
        onViewChange={changeView}
        nodes={visibleNodes}
        edges={visibleEdges}
        selectedNode={selectedNode}
        query={query}
        onQueryChange={setQuery}
        sheetOpen={sheetOpen}
        onSheetOpen={(path) => {
          setSelectedPath(path)
          setSheetOpen(true)
        }}
        onSheetClose={() => setSheetOpen(false)}
        onOpenDoc={openDoc}
      />
    </>
  )
}
