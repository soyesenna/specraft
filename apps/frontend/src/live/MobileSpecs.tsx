import type { WikiGraphNode, WikiGraphResponse } from "@specraft/shared"
import { Search, Waypoints } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { BranchChip } from "../components/BranchChip.js"
import { BranchMenu } from "../components/BranchMenu.js"
import { DocSheet } from "../components/DocSheet.js"
import { GlassNav } from "../components/GlassNav.js"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { MobileTabBar } from "../components/MobileTabBar.js"
import { SearchField } from "../components/SearchField.js"
import { type SpecsView, ViewSwitcher } from "../components/ViewSwitcher.js"
import { cn } from "../lib/cn.js"
import { useDismissable } from "../lib/useDismissable.js"
import { useBranch } from "./branch.js"
import { MobileList } from "./MobileSpecsList.js"
import { buildLayout, docIdOf, fileNameOf, isSkeleton } from "./specsGraphModel.js"
import { DEFAULT_GRAPH_VIEWPORT, type GraphViewport } from "./specsGraphViewport.js"
import { useGraphViewport } from "./useGraphViewport.js"

type MobileSpecsProps = {
  readonly view: SpecsView
  readonly onViewChange: (view: SpecsView) => void
  readonly nodes: readonly WikiGraphNode[]
  readonly edges: WikiGraphResponse["edges"]
  readonly selectedNode: WikiGraphNode | null
  readonly query: string
  readonly onQueryChange: (value: string) => void
  readonly sheetOpen: boolean
  readonly onSheetOpen: (path: string) => void
  readonly onSheetClose: () => void
  readonly onOpenDoc: (path: string) => void
  readonly loading?: boolean
  readonly empty?: boolean
}

export function MobileSpecs({
  view,
  onViewChange,
  nodes,
  edges,
  selectedNode,
  query,
  onQueryChange,
  sheetOpen,
  onSheetOpen,
  onSheetClose,
  onOpenDoc,
  loading = false,
  empty = false,
}: MobileSpecsProps) {
  const { selectedBranch, branches, setBranch } = useBranch()
  const [branchOpen, setBranchOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  // 브랜치 드롭다운 dismiss: 트리거(BranchChip)와 메뉴를 함께 감싼 앵커 기준으로
  // 외부 클릭/Escape 닫기, Escape 시 트리거로 포커스 복귀.
  const branchAnchorRef = useRef<HTMLDivElement | null>(null)
  const branchChipRef = useRef<HTMLButtonElement | null>(null)
  useDismissable(branchOpen, () => setBranchOpen(false), branchAnchorRef, branchChipRef)
  // 메뉴 열릴 때 앵커의 첫 버튼(BranchChip)을 캐시해 Escape 닫기 시 포커스 복귀 대상으로 쓴다.
  useEffect(() => {
    if (branchOpen) {
      branchChipRef.current =
        branchAnchorRef.current?.querySelector<HTMLButtonElement>("button") ?? null
    }
  }, [branchOpen])
  // ease-enter 페이드·슬라이드 등장: 검색필드/브랜치메뉴는 mount 다음 프레임에 entered.
  // (DocSheet는 컴포넌트 내부에서 자체 등장/퇴장 모션을 소유한다.)
  const [searchEntered, setSearchEntered] = useState(false)
  const [branchEntered, setBranchEntered] = useState(false)
  useEffect(() => {
    if (!searchOpen) {
      setSearchEntered(false)
      return
    }
    const frame = requestAnimationFrame(() => setSearchEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [searchOpen])
  useEffect(() => {
    if (!branchOpen) {
      setBranchEntered(false)
      return
    }
    const frame = requestAnimationFrame(() => setBranchEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [branchOpen])
  const docSheetVisible = view === "graph" && sheetOpen && selectedNode !== null
  const layout = useMemo(
    () =>
      buildLayout(nodes, edges, false, { width: 358, height: 520, nodeWidth: 138, nodeHeight: 52 }),
    [nodes, edges],
  )
  const connectedNames = selectedNode
    ? [
        ...new Set(
          edges
            .filter((edge) => edge.from === selectedNode.path || edge.to === selectedNode.path)
            .map((edge) => (edge.from === selectedNode.path ? edge.to : edge.from))
            .map(fileNameOf),
        ),
      ]
    : []

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-bg md:hidden">
      <MobileStatusBar />
      {/* 헤더와 브랜치 메뉴를 한 앵커로 감싸 useDismissable의 내부 클릭 판정에 포함시킨다. */}
      <div ref={branchAnchorRef} className="w-full">
        <MobileHeader
          branch={selectedBranch}
          branchOpen={branchOpen}
          searchOpen={searchOpen}
          onBranchToggle={() => setBranchOpen((open) => !open)}
          onSearchToggle={() => setSearchOpen((open) => !open)}
        />
        {branchOpen && (
          <div
            className={cn(
              "absolute top-[88px] left-[92px] z-40 origin-top transition duration-300 ease-[var(--ease-enter)] motion-reduce:transition-none",
              branchEntered ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
            )}
          >
            <BranchMenu
              rows={branches}
              width={250}
              onSelect={(branch) => {
                setBranch(branch)
                setBranchOpen(false)
              }}
            />
          </div>
        )}
      </div>
      {searchOpen && (
        <div
          className={cn(
            "w-full px-4 pb-1.5 transition duration-300 ease-[var(--ease-enter)] motion-reduce:transition-none",
            searchEntered ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
          )}
        >
          <SearchField
            placeholder="Search specs"
            value={query}
            onChange={onQueryChange}
            className="w-full"
          />
        </div>
      )}
      <div className="w-full px-4 pt-1 pb-2.5">
        <ViewSwitcher view={view} onChange={onViewChange} className="w-full" mobile />
      </div>
      {loading ? (
        <MobileSpecsSkeleton list={view === "list"} />
      ) : empty ? (
        <MobileEmptyState query={query.trim()} onClearQuery={() => onQueryChange("")} />
      ) : view === "graph" ? (
        <MobileGraph
          nodes={nodes}
          layout={layout}
          selectedNode={selectedNode}
          onSheetOpen={onSheetOpen}
        />
      ) : (
        <MobileList nodes={nodes} onOpenDoc={onOpenDoc} />
      )}
      <MobileTabBar active="spec" />
      <GlassNav active="specs" className="absolute inset-x-4 bottom-[88px] z-20" />
      {/* 노드 상세 시트 — 탭바 바로 위에 하단 고정. 콘텐츠 길이와 무관하게
          바닥 기준선이 일정하고, GlassNav(bottom-88~142px 영역)를 항상 덮는다. */}
      {docSheetVisible && selectedNode && (
        <div className="absolute inset-x-2.5 bottom-[86px] z-30">
          <DocSheet
            dir={selectedNode.dir}
            name={fileNameOf(selectedNode.path)}
            summary={selectedNode.summary || selectedNode.title}
            docId={docIdOf(selectedNode.path)}
            connected={connectedNames.slice(0, 2)}
            moreCount={Math.max(connectedNames.length - 2, 0)}
            onClose={onSheetClose}
          />
        </div>
      )}
    </div>
  )
}

function MobileHeader({
  branch,
  branchOpen,
  searchOpen,
  onBranchToggle,
  onSearchToggle,
}: {
  readonly branch: string
  readonly branchOpen: boolean
  readonly searchOpen: boolean
  readonly onBranchToggle: () => void
  readonly onSearchToggle: () => void
}) {
  return (
    <div className="flex w-full items-center gap-2.5 px-4 py-2">
      <h1 className="pen-text m-0 font-display text-[24px] font-semibold tracking-[-0.4px] text-ink">
        Specs
      </h1>
      <BranchChip
        branch={branch}
        open={branchOpen}
        onClick={onBranchToggle}
        aria-expanded={branchOpen}
        aria-haspopup="true"
      />
      <span className="h-px flex-1" />
      <button
        type="button"
        aria-label="검색"
        aria-expanded={searchOpen}
        onClick={onSearchToggle}
        className="-mr-1.5 flex size-9 cursor-pointer items-center justify-center rounded-pill active:opacity-60"
      >
        <Search className="size-[18px] text-ink-secondary" />
      </button>
    </div>
  )
}

function MobileGraph({
  nodes,
  layout,
  selectedNode,
  onSheetOpen,
}: {
  readonly nodes: readonly WikiGraphNode[]
  readonly layout: ReturnType<typeof buildLayout>
  readonly selectedNode: WikiGraphNode | null
  readonly onSheetOpen: (path: string) => void
}) {
  const [viewport, setViewport] = useState<GraphViewport>(DEFAULT_GRAPH_VIEWPORT)
  const onViewportChange = (updater: (current: GraphViewport) => GraphViewport) => {
    setViewport(updater)
  }
  const controls = useGraphViewport(viewport, onViewportChange)
  return (
    <div className="min-h-0 w-full flex-1 overflow-hidden">
      <div
        className="relative mx-auto h-[520px] w-[358px] touch-none overflow-hidden"
        ref={controls.canvasRef}
        onPointerDown={controls.onPointerDown}
        onPointerMove={controls.onPointerMove}
        onPointerUp={controls.onPointerUp}
        onPointerCancel={controls.onPointerCancel}
        style={{ ...controls.gridStyle, touchAction: "none" }}
      >
        <div className="absolute top-0 left-0 origin-top-left" style={controls.contentStyle}>
          <svg
            viewBox={layout.viewBox}
            width={layout.width}
            height={layout.height}
            className="pointer-events-none absolute top-0 left-0"
            aria-hidden
            role="presentation"
          >
            {layout.edges.map((edge, i) => {
              const active =
                selectedNode !== null &&
                (edge.from.node.path === selectedNode.path ||
                  edge.to.node.path === selectedNode.path)
              return (
                <line
                  key={`medge-${i.toString()}`}
                  x1={edge.from.cx}
                  y1={edge.from.cy}
                  x2={edge.to.cx}
                  y2={edge.to.cy}
                  stroke={active ? "#0071E3" : "#D2D2D7"}
                  strokeWidth={active ? 2 : 1.5}
                />
              )
            })}
          </svg>
          {nodes.map((node) => {
            const entry = layout.nodes.find((item) => item.node.path === node.path)
            if (!entry) {
              return null
            }
            return (
              <MobileNode
                key={node.path}
                node={node}
                selected={selectedNode?.path === node.path}
                x={entry.x}
                y={entry.y}
                onSheetOpen={onSheetOpen}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MobileNode({
  node,
  selected,
  x,
  y,
  onSheetOpen,
}: {
  readonly node: WikiGraphNode
  readonly selected: boolean
  readonly x: number
  readonly y: number
  readonly onSheetOpen: (path: string) => void
}) {
  const dark = isSkeleton(node)
  return (
    <button
      type="button"
      onClick={() => onSheetOpen(node.path)}
      className={cn(
        "absolute flex min-h-11 flex-col justify-center gap-px overflow-hidden rounded-[9px] border-2 border-transparent px-2.5 py-[7px] text-left shadow-[0_3px_14px_#00000017] transition-colors duration-150 ease-[var(--ease-standard)]",
        dark ? "bg-dark-card" : "bg-surface",
        selected && "border-accent",
      )}
      style={{ width: 138, left: x, top: y }}
    >
      <span
        className={cn(
          "pen-text text-[7.5px] font-semibold tracking-[0.5px]",
          dark ? "text-white-tertiary" : "text-ink-tertiary",
        )}
      >
        {node.dir}
      </span>
      <span
        className={cn(
          "pen-text truncate text-[11.5px] font-semibold tracking-[-0.1px]",
          dark ? "text-white" : "text-ink",
        )}
      >
        {fileNameOf(node.path)}
      </span>
    </button>
  )
}

/**
 * DESIGN.md §14 Skeleton: 최종 콘텐츠와 동일한 radius·치수의 bg(#f5f5f7) 블록.
 * shimmer는 animate-pulse, blue-tint 금지. 그래프(358×520)/리스트 행 구조를 각각 모방.
 */
function MobileSpecsSkeleton({ list }: { list: boolean }) {
  if (list) {
    return (
      <div
        className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 pt-0.5 pb-3"
        aria-hidden
      >
        <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={`mspec-skeleton-row-${i.toString()}`}
              className="flex h-[58px] w-full shrink-0 items-center gap-[11px] border-b border-hairline px-3.5 last:border-b-0"
            >
              <span className="size-7 shrink-0 animate-pulse rounded-sm bg-bg" />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="h-[13px] w-[42%] animate-pulse rounded-sm bg-bg" />
                <span className="h-[11px] w-[68%] animate-pulse rounded-sm bg-bg" />
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-0 w-full flex-1 overflow-hidden" aria-hidden>
      <div className="relative mx-auto h-[520px] w-[358px] overflow-hidden">
        {[
          { left: 18, top: 96 },
          { left: 192, top: 60 },
          { left: 100, top: 196 },
          { left: 210, top: 232 },
          { left: 40, top: 320 },
          { left: 196, top: 376 },
        ].map((pos, i) => (
          <span
            key={`mspec-skeleton-node-${i.toString()}`}
            className="absolute h-[52px] w-[138px] animate-pulse rounded-[9px] bg-surface"
            style={{ left: pos.left, top: pos.top }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * DESIGN.md §14 Empty: 검색 결과 0건이면 'No results for "<query>".' + 검색 초기화 링크,
 * 데이터 자체가 0건이면 'No specs yet'. DesktopEmptyState와 동일 톤(아이콘 카드 + 카피).
 */
function MobileEmptyState({ query, onClearQuery }: { query: string; onClearQuery: () => void }) {
  const searching = query.length > 0
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3.5 px-6 pb-24">
      <span className="flex size-14 items-center justify-center rounded-[28px] bg-input">
        <Waypoints className="size-6 text-ink-tertiary" />
      </span>
      <div className="flex flex-col items-center gap-[5px]">
        <span className="pen-text text-center text-[15px] font-semibold tracking-[-0.24px] text-ink">
          {searching ? `No results for "${query}".` : "No specs yet"}
        </span>
        <span className="pen-text max-w-[300px] text-center text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
          {searching
            ? "검색어와 일치하는 스펙이 없습니다 — 다른 키워드를 시도하세요"
            : "이 브랜치에 동기화된 스펙 문서가 없습니다 — ingest 후 다시 확인하세요"}
        </span>
      </div>
      {searching && (
        <button
          type="button"
          onClick={onClearQuery}
          className="pen-text text-[13px] tracking-[-0.2px] text-link hover:underline"
        >
          검색 초기화
        </button>
      )}
    </div>
  )
}
