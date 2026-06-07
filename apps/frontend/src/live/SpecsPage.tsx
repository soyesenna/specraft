import type { WikiGraphNode, WikiGraphResponse } from "@specraft/shared"
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Minus,
  Plus,
  Scan,
  Search,
  Waypoints,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Avatar } from "../components/Avatar.js"
import { BranchChip } from "../components/BranchChip.js"
import { BranchMenu } from "../components/BranchMenu.js"
import { DocSheet } from "../components/DocSheet.js"
import { GlassNav } from "../components/GlassNav.js"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { MobileTabBar } from "../components/MobileTabBar.js"
import { SearchField } from "../components/SearchField.js"
import { SpecNode } from "../components/SpecNode.js"
import { StatusBadge } from "../components/StatusBadge.js"
import { useSidebarCollapsed } from "../components/sidebarCollapsed.js"
import { type SpecsView, ViewSwitcher } from "../components/ViewSwitcher.js"
import { cn } from "../lib/cn.js"
import { useSpecraft } from "./api.js"
import { useBranch } from "./branch.js"
import { LiveShell } from "./LiveShell.js"

/* ───────────────────────── 데이터 유틸 ───────────────────────── */

/** path → /specs/doc/:docId 식별자 */
function docIdOf(path: string): string {
  return encodeURIComponent(path)
}

/** specs/stop-gate.md → stop-gate.md */
function fileNameOf(path: string): string {
  const segments = path.split("/")
  return segments[segments.length - 1] ?? path
}

/** specs/stop-gate.md → "specs/" (루트 파일은 접두 없음) */
function prefixOf(path: string): string | undefined {
  const slash = path.lastIndexOf("/")
  return slash === -1 ? undefined : `${path.slice(0, slash)}/`
}

/** 골격 문서(루트/CORE 디렉터리 또는 overview/index/log) — dark 카드 */
const SKELETON_NAMES = new Set(["overview.md", "index.md", "log.md"])
function isSkeleton(node: WikiGraphNode): boolean {
  return node.dir === "CORE" || node.dir === "ROOT" || SKELETON_NAMES.has(fileNameOf(node.path))
}

/** 검색 필터 — 파일명/타이틀/디렉터리 부분 일치(대소문자 무시) */
function matchesQuery(node: WikiGraphNode, query: string): boolean {
  if (query.trim() === "") {
    return true
  }
  const needle = query.trim().toLowerCase()
  return (
    node.path.toLowerCase().includes(needle) ||
    node.title.toLowerCase().includes(needle) ||
    node.dir.toLowerCase().includes(needle)
  )
}

/* ───────────────────────── 결정적 그래프 레이아웃 ─────────────────────────
 * lib/graphData.ts 의 시각 언어(dir 클러스터 · dark 골격 · accent 선택 · SVG 엣지)를
 * 노드 수에 무관하게 일반화한다. 좌표는 viewBox 논리 공간에서 결정적으로 계산해
 * 같은 입력이면 항상 같은 배치를 만든다.
 */

type LaidOutNode = {
  node: WikiGraphNode
  /** 카드 좌상단 좌표(논리 px) */
  x: number
  y: number
  width: number
  /** 카드 중심 좌표 — 엣지 연결용 */
  cx: number
  cy: number
}

type GraphLayout = {
  viewBox: string
  width: number
  height: number
  nodes: LaidOutNode[]
  clusters: { dir: string; cx: number; cy: number }[]
  edges: { from: LaidOutNode; to: LaidOutNode }[]
}

const NODE_WIDTH = 212
const NODE_HEIGHT = 78

/** 04 리스트 UPDATED 컬럼 — 상대 시간 표기 */
function relativeUpdated(iso: string | undefined): string {
  if (!iso) {
    return "—"
  }
  const elapsedMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(elapsedMs / 60_000)
  if (minutes < 1) {
    return "방금"
  }
  if (minutes < 60) {
    return `${minutes}분 전`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}시간 전`
  }
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

function authorInitials(author: string | undefined): string {
  const trimmed = author?.trim() ?? ""
  if (trimmed === "") {
    return "—"
  }
  return trimmed.slice(0, 2).toUpperCase()
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 1_000_000_007
  }
  return hash
}

type LayoutDims = {
  width: number
  height: number
  nodeWidth: number
  nodeHeight: number
}

function buildLayout(
  nodes: WikiGraphNode[],
  edges: WikiGraphResponse["edges"],
  selectedPath: string | null,
  collapsed: boolean,
  dims?: LayoutDims,
): GraphLayout {
  // 03/03b 의 viewBox 폭(펼침 1224 / 접힘 1376)을 그대로 따른다. (모바일은 dims 로 358 폭 미니 캔버스)
  const width = dims?.width ?? (collapsed ? 1376 : 1224)
  const height = dims?.height ?? 782
  const nodeWidth = dims?.nodeWidth ?? NODE_WIDTH
  const nodeHeight = dims?.nodeHeight ?? NODE_HEIGHT
  const cx0 = width / 2
  const cy0 = height / 2

  // dir 기준 클러스터링 — CORE/ROOT(골격)를 먼저, 나머지는 이름순으로 결정적 정렬
  const byDir = new Map<string, WikiGraphNode[]>()
  for (const node of nodes) {
    const list = byDir.get(node.dir) ?? []
    list.push(node)
    byDir.set(node.dir, list)
  }
  const dirNames = [...byDir.keys()].sort((a, b) => {
    const skeletonA = a === "CORE" || a === "ROOT"
    const skeletonB = b === "CORE" || b === "ROOT"
    if (skeletonA !== skeletonB) {
      return skeletonA ? -1 : 1
    }
    return a.localeCompare(b)
  })

  const laidOut: LaidOutNode[] = []
  const clusters: { dir: string; cx: number; cy: number }[] = []
  const byPath = new Map<string, LaidOutNode>()

  // 골격(첫 dir)은 캔버스 중앙, 그 외 dir 들은 중앙을 둘러싼 링에 배치
  const peripheralDirs = dirNames.slice(1)
  const ringRadiusX = width * 0.31
  const ringRadiusY = height * 0.31

  dirNames.forEach((dir, dirIndex) => {
    const members = byDir.get(dir) ?? []
    let clusterCx: number
    let clusterCy: number
    if (dirIndex === 0) {
      clusterCx = cx0
      clusterCy = cy0
    } else {
      const peripheralIndex = dirIndex - 1
      const angle =
        (peripheralIndex / Math.max(peripheralDirs.length, 1)) * Math.PI * 2 - Math.PI / 2
      clusterCx = cx0 + Math.cos(angle) * ringRadiusX
      clusterCy = cy0 + Math.sin(angle) * ringRadiusY
    }
    clusters.push({ dir, cx: clusterCx, cy: clusterCy })

    // 클러스터 내부는 부채꼴로 펼친다(단일 노드는 중심)
    const radiusScale = width / 1224
    const memberRadius =
      members.length <= 1 ? 0 : Math.max((96 + members.length * 12) * radiusScale, nodeWidth * 0.62)
    members.forEach((node, memberIndex) => {
      let memberCx = clusterCx
      let memberCy = clusterCy
      if (members.length > 1) {
        const spin = (hashString(node.path) % 360) * (Math.PI / 180)
        const memberAngle = (memberIndex / members.length) * Math.PI * 2 + spin / members.length
        memberCx = clusterCx + Math.cos(memberAngle) * memberRadius
        memberCy = clusterCy + Math.sin(memberAngle) * (memberRadius * 0.74)
      }
      // 카드가 캔버스를 벗어나지 않도록 클램프
      const margin = Math.min(16, width * 0.02)
      const x = Math.min(Math.max(memberCx - nodeWidth / 2, margin), width - nodeWidth - margin)
      const y = Math.min(Math.max(memberCy - nodeHeight / 2, margin), height - nodeHeight - margin)
      const entry: LaidOutNode = {
        node,
        x,
        y,
        width: nodeWidth,
        cx: x + nodeWidth / 2,
        cy: y + nodeHeight / 2,
      }
      laidOut.push(entry)
      byPath.set(node.path, entry)
    })
  })

  const edgeLines: { from: LaidOutNode; to: LaidOutNode }[] = []
  for (const edge of edges) {
    const from = byPath.get(edge.from)
    const to = byPath.get(edge.to)
    if (from && to) {
      edgeLines.push({ from, to })
    }
  }

  // selectedPath 가 레이아웃에 없으면 무시(선택 표시는 SpecNode selected 로 처리)
  void selectedPath
  return {
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    nodes: laidOut,
    clusters,
    edges: edgeLines,
  }
}

/* ───────────────────────── 페이지 ───────────────────────── */

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
        tone="success"
        dotSize={6}
        label="Synced 2 min ago"
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
      {/* ───── 데스크톱 ───── */}
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

      {/* ───── 모바일 ───── */}
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

/* ───────────────────────── 데스크톱 그래프 ───────────────────────── */

function DesktopGraphCanvas({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  onOpenDoc,
  onZoomOut,
}: {
  nodes: WikiGraphNode[]
  edges: WikiGraphResponse["edges"]
  selectedNode: WikiGraphNode | null
  onSelectNode: (path: string) => void
  onOpenDoc: (path: string) => void
  onZoomOut: () => void
}) {
  const collapsed = useSidebarCollapsed()
  const layout = useMemo(
    () => buildLayout(nodes, edges, selectedNode?.path ?? null, collapsed),
    [nodes, edges, selectedNode, collapsed],
  )
  return (
    <div className="relative min-h-0 w-full flex-1 overflow-hidden">
      <svg
        viewBox={layout.viewBox}
        className="pointer-events-none absolute top-0 left-0"
        style={{ width: layout.width, height: layout.height }}
        aria-hidden
        role="presentation"
      >
        {layout.edges.map((edge, i) => {
          const active =
            selectedNode !== null &&
            (edge.from.node.path === selectedNode.path || edge.to.node.path === selectedNode.path)
          return (
            <line
              key={`edge-${i.toString()}`}
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
      {layout.nodes.map((entry) => (
        <SpecNode
          key={entry.node.path}
          dir={entry.node.dir}
          name={fileNameOf(entry.node.path)}
          title={entry.node.title}
          dark={isSkeleton(entry.node)}
          selected={selectedNode?.path === entry.node.path}
          width={entry.width}
          x={entry.x}
          y={entry.y}
          onClick={() => {
            onSelectNode(entry.node.path)
            onOpenDoc(entry.node.path)
          }}
        />
      ))}
      <ZoomControls onZoomOut={onZoomOut} className="bottom-[72px] left-6" />
      <div className="absolute bottom-6 left-6 flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-dark-card" />
          <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
            Core skeleton
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] border border-separator bg-surface" />
          <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
            LLM-generated
          </span>
        </span>
      </div>
      {selectedNode && <DetailPanel node={selectedNode} edges={edges} onOpenDoc={onOpenDoc} />}
    </div>
  )
}

function ZoomControls({
  onZoomIn,
  onZoomOut: handleZoomOut,
  className,
}: {
  onZoomIn?: () => void
  onZoomOut?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "absolute flex flex-col rounded-sm bg-surface shadow-[0_2px_8px_#00000014]",
        className,
      )}
    >
      <button
        type="button"
        onClick={onZoomIn}
        className="flex h-8 w-[34px] items-center justify-center"
        aria-label="확대"
      >
        <Plus className="size-3.5 text-ink-secondary" />
      </button>
      <button
        type="button"
        onClick={handleZoomOut}
        className="flex h-8 w-[34px] items-center justify-center"
        aria-label="축소"
      >
        <Minus className="size-3.5 text-ink-secondary" />
      </button>
      <button
        type="button"
        className="flex h-8 w-[34px] items-center justify-center"
        aria-label="화면 맞춤"
      >
        <Scan className="size-3.5 text-ink-secondary" />
      </button>
    </div>
  )
}

function DetailPanel({
  node,
  edges,
  onOpenDoc,
}: {
  node: WikiGraphNode
  edges: WikiGraphResponse["edges"]
  onOpenDoc: (path: string) => void
}) {
  const connected = edges
    .filter((edge) => edge.from === node.path || edge.to === node.path)
    .map((edge) => (edge.from === node.path ? edge.to : edge.from))
  const uniqueConnected = [...new Set(connected)]
  return (
    <aside className="absolute top-5 right-5 flex w-[344px] flex-col gap-3.5 rounded-lg bg-surface p-[22px] shadow-[3px_5px_30px_#00000038]">
      <div className="flex w-full flex-col gap-[5px]">
        <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
          {node.dir}
        </span>
        <span className="pen-text font-display text-[21px] font-semibold tracking-[-0.3px] text-ink">
          {fileNameOf(node.path)}
        </span>
        <p className="pen-text m-0 w-full text-[13px] leading-[1.5] tracking-[-0.2px] text-ink-secondary">
          {node.summary || node.title}
        </p>
      </div>
      <div className="flex w-full items-center gap-2">
        <Avatar initials="SY" size={20} />
        <span className="pen-text text-[12px] tracking-[-0.12px] text-ink-tertiary">
          {node.path}
        </span>
      </div>
      <div className="h-px w-full bg-hairline" />
      <div className="flex w-full flex-col gap-2.5">
        <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
          CONNECTED · {uniqueConnected.length}
        </span>
        {uniqueConnected.map((doc) => (
          <button
            key={doc}
            type="button"
            onClick={() => onOpenDoc(doc)}
            className="flex w-full items-center gap-2 text-left"
          >
            <FileText className="size-[13px] shrink-0 text-ink-tertiary" />
            <span className="pen-text truncate text-[13px] tracking-[-0.2px] text-link">
              {fileNameOf(doc)}
            </span>
          </button>
        ))}
      </div>
      <div className="h-px w-full bg-hairline" />
      <button
        type="button"
        onClick={() => onOpenDoc(node.path)}
        className="flex w-full items-center justify-center gap-1.5 rounded-sm bg-accent px-4 py-2"
      >
        <span className="pen-text text-[14px] tracking-[-0.22px] text-white">Open document</span>
      </button>
    </aside>
  )
}

/* ───── 03c 도트 모드 ───── */

function DesktopDotCanvas({
  nodes,
  edges,
  selectedNode,
  onZoomIn,
}: {
  nodes: WikiGraphNode[]
  edges: WikiGraphResponse["edges"]
  selectedNode: WikiGraphNode | null
  onZoomIn: () => void
}) {
  // specs-graph-3: 도트 모드도 사이드바 접힘 좌표를 반영한다.
  const collapsed = useSidebarCollapsed()
  const layout = useMemo(
    () => buildLayout(nodes, edges, selectedNode?.path ?? null, collapsed),
    [nodes, edges, selectedNode, collapsed],
  )
  const dotColors = ["#7E92CE", "#5F76B8", "#9AACE4"]
  return (
    <div className="relative min-h-0 w-full flex-1 overflow-hidden bg-bg">
      <svg
        viewBox={layout.viewBox}
        className="pointer-events-none absolute top-0 left-0"
        style={{ width: layout.width, height: layout.height }}
        aria-hidden
        role="presentation"
      >
        {layout.edges.map((edge, i) => {
          const active =
            selectedNode !== null &&
            (edge.from.node.path === selectedNode.path || edge.to.node.path === selectedNode.path)
          return (
            <line
              key={`dotedge-${i.toString()}`}
              x1={edge.from.cx}
              y1={edge.from.cy}
              x2={edge.to.cx}
              y2={edge.to.cy}
              stroke={active ? "#0071E3" : "#0000000F"}
              strokeWidth={active ? 1.5 : 1}
            />
          )
        })}
      </svg>
      {layout.clusters.map((cluster) => (
        <span
          key={`hub-${cluster.dir}`}
          aria-hidden
          className="absolute rounded-[2.5px] bg-[#59616F]"
          style={{ left: cluster.cx - 6, top: cluster.cy - 6, width: 12, height: 12 }}
        />
      ))}
      {layout.nodes.map((entry) => {
        const selected = selectedNode?.path === entry.node.path
        const size = 11
        const color = selected
          ? "#0071E3"
          : dotColors[hashString(entry.node.path) % dotColors.length]
        return (
          <span
            key={`dot-${entry.node.path}`}
            aria-hidden
            className="absolute rounded-full"
            style={{
              left: entry.cx - size / 2,
              top: entry.cy - size / 2,
              width: size,
              height: size,
              border: `${(size * 0.3).toFixed(2)}px solid ${color}`,
              boxShadow: `0 0 3px ${color}8C, 0 0 9px ${color}40, inset 0 0 3px ${color}66`,
            }}
          />
        )
      })}
      {selectedNode && (
        <div className="absolute top-4 right-6 flex max-w-[260px] flex-col gap-0.5 rounded-[10px] bg-surface px-3 py-2 shadow-[0_2px_12px_#00000014]">
          <span className="pen-text truncate text-[12px] font-semibold tracking-[-0.12px] text-ink">
            {selectedNode.path}
          </span>
          <span className="pen-text truncate text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
            {edges.filter((e) => e.from === selectedNode.path || e.to === selectedNode.path).length}{" "}
            connections
          </span>
        </div>
      )}
      <div className="absolute top-4 left-[512px] flex items-center gap-1.5 rounded-pill bg-surface px-3 py-[5px] shadow-[0_1px_6px_#00000014]">
        <Minus className="size-3 text-ink-secondary" />
        <span className="pen-text text-[11.5px] font-medium tracking-[-0.1px] text-ink-secondary">
          Compact view — zoom 24%
        </span>
      </div>
      <ZoomControls onZoomIn={onZoomIn} className="bottom-[86px] left-6" />
      <div className="absolute bottom-[59px] left-6 flex w-[34px] items-center justify-center rounded-[6px] bg-surface py-[3px] shadow-[0_1px_4px_#00000014]">
        <span className="pen-text font-mono text-[10px] text-ink-tertiary">24%</span>
      </div>
      <div className="absolute bottom-7 left-[72px] flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="size-[9px] rounded-full border-[2.6px] border-[#5F76B8]" />
          <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">Document</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-[9px] rounded-[2px] bg-[#59616F]" />
          <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">Hub</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-[9px] rounded-full border-[2.7px] border-accent" />
          <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">Selected</span>
        </span>
      </div>
    </div>
  )
}

/* ───── 04 리스트 뷰 ───── */

function DesktopListView({
  nodes,
  edges,
  onOpenDoc,
}: {
  nodes: WikiGraphNode[]
  edges: WikiGraphResponse["edges"]
  onOpenDoc: (path: string) => void
}) {
  const linkCount = useMemo(() => {
    const counts = new Map<string, number>()
    for (const edge of edges) {
      counts.set(edge.from, (counts.get(edge.from) ?? 0) + 1)
      counts.set(edge.to, (counts.get(edge.to) ?? 0) + 1)
    }
    return counts
  }, [edges])
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col px-7 pt-1 pb-7">
      <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
        <div className="flex h-[38px] w-full shrink-0 items-center gap-3.5 border-b border-hairline px-5">
          <span className="w-6 shrink-0" />
          <span className="w-[380px] shrink-0">
            <span className="pen-text text-[10.5px] font-semibold tracking-[0.6px] text-ink-tertiary">
              NAME
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="pen-text text-[10.5px] font-semibold tracking-[0.6px] text-ink-tertiary">
              SUMMARY
            </span>
          </span>
          <span className="w-14 shrink-0">
            <span className="pen-text text-[10.5px] font-semibold tracking-[0.6px] text-ink-tertiary">
              LINKS
            </span>
          </span>
          <span className="flex w-[110px] shrink-0 items-center gap-1">
            <span className="pen-text text-[10.5px] font-semibold tracking-[0.6px] text-ink-tertiary">
              UPDATED
            </span>
            <ChevronDown className="size-2.5 text-ink-tertiary" />
          </span>
          <span className="w-7 shrink-0" />
          <span className="w-3.5 shrink-0" />
        </div>
        {nodes.map((node, i) => {
          const dark = isSkeleton(node)
          return (
            <button
              key={node.path}
              type="button"
              onClick={() => onOpenDoc(node.path)}
              className={cn(
                "flex h-12 w-full shrink-0 items-center gap-3.5 px-5 text-left",
                i < nodes.length - 1 && "border-b border-hairline",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-[6px]",
                  dark ? "bg-dark-card" : "bg-input",
                )}
              >
                <FileText className={cn("size-3", dark ? "text-white" : "text-ink-tertiary")} />
              </span>
              <span className="flex w-[380px] shrink-0 items-center gap-0.5 overflow-hidden">
                {prefixOf(node.path) && (
                  <span className="pen-text text-[13px] tracking-[-0.2px] whitespace-nowrap text-ink-tertiary">
                    {prefixOf(node.path)}
                  </span>
                )}
                <span className="pen-text text-[13px] font-semibold tracking-[-0.2px] whitespace-nowrap text-ink">
                  {fileNameOf(node.path)}
                </span>
              </span>
              <span className="min-w-0 flex-1 overflow-hidden">
                <span className="pen-text text-[13px] tracking-[-0.2px] whitespace-nowrap text-ink-tertiary">
                  {node.summary || node.title}
                </span>
              </span>
              <span className="flex w-14 shrink-0 items-center gap-[5px]">
                <Waypoints className="size-3 text-ink-tertiary" />
                <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-secondary">
                  {linkCount.get(node.path) ?? 0}
                </span>
              </span>
              <span className="flex w-[110px] shrink-0 items-center">
                <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
                  {relativeUpdated(node.updated)}
                </span>
              </span>
              <span className="flex w-7 shrink-0 items-center">
                <Avatar initials={authorInitials(node.author)} size={24} />
              </span>
              <ChevronRight className="size-3.5 shrink-0 text-separator" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────────────────── 모바일 (M03/M03c/M04) ───────────────────────── */

function MobileSpecs({
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
}: {
  view: SpecsView
  onViewChange: (view: SpecsView) => void
  nodes: WikiGraphNode[]
  edges: WikiGraphResponse["edges"]
  selectedNode: WikiGraphNode | null
  query: string
  onQueryChange: (value: string) => void
  sheetOpen: boolean
  onSheetOpen: (path: string) => void
  onSheetClose: () => void
  onOpenDoc: (path: string) => void
}) {
  const { selectedBranch, branches, setBranch } = useBranch()
  const [branchOpen, setBranchOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  // M03 Mini Canvas — 카드와 엣지가 같은 358 폭 좌표계를 공유한다
  const layout = useMemo(
    () =>
      buildLayout(nodes, edges, selectedNode?.path ?? null, false, {
        width: 358,
        height: 520,
        nodeWidth: 138,
        nodeHeight: 52,
      }),
    [nodes, edges, selectedNode],
  )
  const connectedNames = selectedNode
    ? [
        ...new Set(
          edges
            .filter((e) => e.from === selectedNode.path || e.to === selectedNode.path)
            .map((e) => (e.from === selectedNode.path ? e.to : e.from))
            .map(fileNameOf),
        ),
      ]
    : []

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-bg md:hidden">
      <MobileStatusBar />
      <div className="flex w-full items-center gap-2.5 px-4 py-2">
        <h1 className="pen-text m-0 font-display text-[24px] font-semibold tracking-[-0.4px] text-ink">
          Specs
        </h1>
        <BranchChip
          branch={selectedBranch}
          open={branchOpen}
          onClick={() => setBranchOpen((o) => !o)}
        />
        <span className="h-px flex-1" />
        <button type="button" aria-label="검색" onClick={() => setSearchOpen((o) => !o)}>
          <Search className="size-[18px] text-ink-secondary" />
        </button>
      </div>
      {searchOpen && (
        <div className="w-full px-4 pb-1.5">
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
      {view === "graph" ? (
        <div className="min-h-0 w-full flex-1 overflow-hidden">
          {/* M03 Mini Canvas — 카드·엣지 동일 좌표계(358×520) */}
          <div className="relative mx-auto h-[520px] w-[358px]">
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
            {layout.nodes.map(({ node, x, y }) => {
              const dark = isSkeleton(node)
              return (
                <button
                  key={node.path}
                  type="button"
                  onClick={() => onSheetOpen(node.path)}
                  className={cn(
                    "absolute flex flex-col gap-px overflow-hidden rounded-[9px] px-2.5 py-[7px] text-left shadow-[0_3px_14px_#00000017]",
                    dark ? "bg-dark-card" : "bg-surface",
                    selectedNode?.path === node.path && "border-[1.5px] border-accent",
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
            })}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 pt-0.5 pb-3">
          <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
            {nodes.map((node, i) => {
              const dark = isSkeleton(node)
              return (
                <button
                  key={node.path}
                  type="button"
                  onClick={() => onOpenDoc(node.path)}
                  className={cn(
                    "flex h-[58px] w-full shrink-0 items-center gap-[11px] px-3.5 text-left",
                    i < nodes.length - 1 && "border-b border-hairline",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-sm",
                      dark ? "bg-dark-card" : "bg-input",
                    )}
                  >
                    <FileText
                      className={cn("size-[13px]", dark ? "text-white" : "text-ink-tertiary")}
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
                    <span className="pen-text truncate text-[13.5px] font-semibold tracking-[-0.2px] text-ink">
                      {fileNameOf(node.path)}
                    </span>
                    <span className="pen-text truncate text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
                      {node.summary || node.title}
                    </span>
                  </span>
                  <ChevronRight className="size-3.5 shrink-0 text-separator" />
                </button>
              )
            })}
          </div>
        </div>
      )}
      <MobileTabBar active="spec" />
      <GlassNav active="specs" className="absolute bottom-[88px] left-4 z-20" />
      {view === "graph" && sheetOpen && selectedNode && (
        <DocSheet
          dir={selectedNode.dir}
          name={fileNameOf(selectedNode.path)}
          summary={selectedNode.summary || selectedNode.title}
          docId={docIdOf(selectedNode.path)}
          connected={connectedNames.slice(0, 2)}
          moreCount={Math.max(connectedNames.length - 2, 0)}
          onClose={onSheetClose}
          className="absolute top-[520px] left-2.5 z-30"
        />
      )}
      {branchOpen && (
        <div className="absolute top-[88px] left-[92px] z-40">
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
  )
}
