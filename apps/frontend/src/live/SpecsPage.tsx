import type { WikiGraphResponse } from "@specraft/shared"
import { AlertTriangle, RefreshCw, Waypoints } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ButtonSecondary } from "../components/buttons.js"
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
import {
  DEFAULT_GRAPH_VIEWPORT,
  GRAPH_COMPACT_THRESHOLD,
  GRAPH_ZOOM_STEP,
  stepGraphViewport,
  type ViewportUpdater,
} from "./specsGraphViewport.js"

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
  const [viewport, setViewport] = useState(DEFAULT_GRAPH_VIEWPORT)
  const [query, setQuery] = useState("")
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  // 데스크톱 상세 패널 표시 여부 — X로 닫으면 노드를 다시 클릭할 때까지 숨긴다.
  const [detailOpen, setDetailOpen] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SYNC_LOADING)

  // 그래프 로드를 재호출 가능한 함수로 분리 — Retry 버튼이 같은 경로를 다시 태운다.
  // active 가드는 호출자(useEffect cleanup / 버튼 핸들러)가 넘긴 ref로 stale 응답을 차단.
  const loadGraph = useCallback(
    (isActive: () => boolean) => {
      setGraph(null)
      setError(null)
      setSelectedPath(null)
      void client
        .wikiGraph({ branch: selectedBranch })
        .then((response) => {
          if (isActive()) {
            setGraph(response)
            setSelectedPath(response.nodes[0]?.path ?? null)
            setError(null)
          }
        })
        .catch((caught: unknown) => {
          if (isActive()) {
            setError(caught instanceof Error ? caught.message : "Failed to load spec graph")
          }
        })
    },
    [client, selectedBranch],
  )

  useEffect(() => {
    let active = true
    loadGraph(() => active)
    return () => {
      active = false
    }
  }, [loadGraph])

  const retryGraph = () => {
    loadGraph(() => true)
  }

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
  const compactGraph = view === "graph" && viewport.scale <= GRAPH_COMPACT_THRESHOLD
  // 로딩: graph 미도착 && 에러 없음. 데이터 0건과 로딩 중을 명확히 구분한다.
  const loading = graph === null && error === null
  const isEmpty = !loading && error === null && visibleNodes.length === 0
  const trimmedQuery = query.trim()

  const updateViewport: ViewportUpdater = (updater) => {
    setViewport((current) => updater(current))
  }

  const zoomIn = () => {
    updateViewport((current) => stepGraphViewport(current, GRAPH_ZOOM_STEP))
  }

  const zoomOut = () => {
    updateViewport((current) => stepGraphViewport(current, -GRAPH_ZOOM_STEP))
  }

  const changeView = (next: SpecsView) => {
    setView(next)
    const nextParams = new URLSearchParams(params)
    if (next === "list") {
      nextParams.set("view", "list")
    } else {
      nextParams.delete("view")
    }
    setParams(nextParams, { replace: true })
  }

  const selectNode = (path: string) => {
    setSelectedPath(path)
    setDetailOpen(true)
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
          {error ? (
            <DesktopErrorState message={error} onRetry={retryGraph} />
          ) : loading ? (
            <DesktopSpecsSkeleton list={view === "list"} />
          ) : isEmpty ? (
            <DesktopEmptyState query={trimmedQuery} onClearQuery={() => setQuery("")} />
          ) : view === "graph" ? (
            compactGraph ? (
              <DesktopDotCanvas
                nodes={visibleNodes}
                edges={visibleEdges}
                selectedNode={selectedNode}
                viewport={viewport}
                onViewportChange={updateViewport}
                onSelectNode={selectNode}
                onOpenDoc={openDoc}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onFit={() => setViewport(DEFAULT_GRAPH_VIEWPORT)}
                detailOpen={detailOpen}
                onCloseDetail={() => setDetailOpen(false)}
              />
            ) : (
              <DesktopGraphCanvas
                nodes={visibleNodes}
                edges={visibleEdges}
                selectedNode={selectedNode}
                viewport={viewport}
                onViewportChange={updateViewport}
                onSelectNode={selectNode}
                onOpenDoc={openDoc}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onFit={() => setViewport(DEFAULT_GRAPH_VIEWPORT)}
                detailOpen={detailOpen}
                onCloseDetail={() => setDetailOpen(false)}
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
        loading={loading}
        empty={isEmpty}
      />
    </>
  )
}

/**
 * DESIGN.md §14 Error(network/system): SF 헤드라인 + 원인 1문장 + 복구 CTA 1개.
 * 빈 본문 대신 중앙 정렬로 렌더하고 Retry는 그래프 fetch를 재호출한다.
 */
function DesktopErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3.5 px-7 pb-7">
      <span className="flex size-14 items-center justify-center rounded-[28px] bg-input">
        <AlertTriangle className="size-6 text-danger" />
      </span>
      <div className="flex flex-col items-center gap-[5px]">
        <span className="pen-text text-[15px] font-semibold tracking-[-0.24px] text-ink">
          스펙 그래프를 불러오지 못했습니다
        </span>
        <span className="pen-text max-w-[420px] text-center text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
          {message}
        </span>
      </div>
      <ButtonSecondary onClick={onRetry}>
        <RefreshCw className="size-[18px] text-ink" />
        Retry
      </ButtonSecondary>
    </div>
  )
}

/**
 * DESIGN.md §14 Skeleton: 최종 콘텐츠와 동일한 radius·치수의 bg(#f5f5f7) 블록.
 * shimmer는 더 밝은 회색(animate-pulse), blue-tint 금지. 그래프/리스트 구조를 각각 모방.
 */
function DesktopSpecsSkeleton({ list }: { list: boolean }) {
  if (list) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-7 pt-1 pb-7" aria-hidden>
        <div className="flex w-full flex-col overflow-hidden rounded-lg bg-surface">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`spec-skeleton-row-${i.toString()}`}
              className="flex h-[58px] w-full shrink-0 items-center gap-[11px] border-b border-hairline px-3.5 last:border-b-0"
            >
              <span className="size-7 shrink-0 animate-pulse rounded-sm bg-bg" />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="h-[13px] w-[38%] animate-pulse rounded-sm bg-bg" />
                <span className="h-[11px] w-[64%] animate-pulse rounded-sm bg-bg" />
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="flex min-h-0 flex-1 px-7 pt-1 pb-7" aria-hidden>
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg bg-surface">
        {[
          { left: "14%", top: "20%" },
          { left: "46%", top: "12%" },
          { left: "72%", top: "30%" },
          { left: "28%", top: "54%" },
          { left: "58%", top: "62%" },
          { left: "40%", top: "82%" },
        ].map((pos, i) => (
          <span
            key={`spec-skeleton-node-${i.toString()}`}
            className="absolute h-[52px] w-[138px] animate-pulse rounded-[9px] bg-bg"
            style={{ left: pos.left, top: pos.top }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * DESIGN.md §14 Empty: 검색 결과 0건이면 'No results for "<query>".' + 검색 초기화 링크,
 * 데이터 자체가 0건이면 'No specs yet'. ConflictsPage.EmptyPane과 동일한 아이콘 카드 패턴.
 */
function DesktopEmptyState({ query, onClearQuery }: { query: string; onClearQuery: () => void }) {
  const searching = query.length > 0
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3.5 px-7 pb-7">
      <span className="flex size-14 items-center justify-center rounded-[28px] bg-input">
        <Waypoints className="size-6 text-ink-tertiary" />
      </span>
      <div className="flex flex-col items-center gap-[5px]">
        <span className="pen-text text-[15px] font-semibold tracking-[-0.24px] text-ink">
          {searching ? `No results for "${query}".` : "No specs yet"}
        </span>
        <span className="pen-text max-w-[420px] text-center text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
          {searching
            ? "검색어와 일치하는 스펙이 없습니다 — 다른 키워드를 시도하세요"
            : "이 브랜치에 동기화된 스펙 문서가 없습니다 — ingest 후 다시 확인하세요"}
        </span>
      </div>
      {searching && (
        <button
          type="button"
          onClick={onClearQuery}
          className="pen-text cursor-pointer text-[13px] tracking-[-0.2px] text-link hover:underline"
        >
          검색 초기화
        </button>
      )}
    </div>
  )
}
