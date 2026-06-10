import type { WikiGraphNode, WikiGraphResponse } from "@specraft/shared"

export type LaidOutNode = {
  readonly node: WikiGraphNode
  readonly x: number
  readonly y: number
  readonly width: number
  readonly cx: number
  readonly cy: number
}

export type GraphNodePosition = {
  readonly x: number
  readonly y: number
}

/** 사용자가 드래그로 옮긴 노드 배치 — path → 콘텐츠 좌표계 좌상단 오버라이드 */
export type GraphNodePositions = Readonly<Record<string, GraphNodePosition>>

/** 오버라이드로 기본 캔버스 밖에 놓인 노드까지 덮는 엣지 SVG 영역 */
export type GraphExtent = {
  readonly minX: number
  readonly minY: number
  readonly width: number
  readonly height: number
}

export type GraphLayout = {
  readonly viewBox: string
  readonly width: number
  readonly height: number
  readonly extent: GraphExtent
  readonly nodes: readonly LaidOutNode[]
  readonly clusters: readonly { readonly dir: string; readonly cx: number; readonly cy: number }[]
  readonly edges: readonly { readonly from: LaidOutNode; readonly to: LaidOutNode }[]
}

type LayoutDims = {
  readonly width: number
  readonly height: number
  readonly nodeWidth: number
  readonly nodeHeight: number
}

const NODE_WIDTH = 212
const NODE_HEIGHT = 78
const SKELETON_NAMES = new Set(["overview.md", "index.md", "log.md"])

export function docIdOf(path: string): string {
  return encodeURIComponent(path)
}

export function fileNameOf(path: string): string {
  const segments = path.split("/")
  return segments[segments.length - 1] ?? path
}

export function prefixOf(path: string): string | undefined {
  const slash = path.lastIndexOf("/")
  return slash === -1 ? undefined : `${path.slice(0, slash)}/`
}

export function isSkeleton(node: WikiGraphNode): boolean {
  return node.dir === "CORE" || node.dir === "ROOT" || SKELETON_NAMES.has(fileNameOf(node.path))
}

export function matchesQuery(node: WikiGraphNode, query: string): boolean {
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

export function relativeUpdated(iso: string | undefined): string {
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
  return `${Math.floor(hours / 24)}일 전`
}

export function relativeSyncedLabel(iso: string | undefined): string {
  if (!iso) {
    return "No sync yet"
  }
  const elapsedMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(0, Math.floor(elapsedMs / 60_000))
  if (minutes < 1) {
    return "Synced just now"
  }
  if (minutes < 60) {
    return `Synced ${minutes} min ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `Synced ${hours} hr ago`
  }
  return `Synced ${Math.floor(hours / 24)} days ago`
}

export function authorInitials(author: string | undefined): string {
  const trimmed = author?.trim() ?? ""
  return trimmed === "" ? "—" : trimmed.slice(0, 2).toUpperCase()
}

export function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 1_000_000_007
  }
  return hash
}

export function buildLayout(
  nodes: readonly WikiGraphNode[],
  edges: WikiGraphResponse["edges"],
  collapsed: boolean,
  dims?: LayoutDims,
  overrides?: GraphNodePositions,
): GraphLayout {
  const width = dims?.width ?? (collapsed ? 1376 : 1224)
  const height = dims?.height ?? 782
  const nodeWidth = dims?.nodeWidth ?? NODE_WIDTH
  const nodeHeight = dims?.nodeHeight ?? NODE_HEIGHT
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
  const peripheralDirs = dirNames.slice(1)
  const centerX = width / 2
  const centerY = height / 2

  dirNames.forEach((dir, dirIndex) => {
    const members = byDir.get(dir) ?? []
    const angle = ((dirIndex - 1) / Math.max(peripheralDirs.length, 1)) * Math.PI * 2 - Math.PI / 2
    const clusterCx = dirIndex === 0 ? centerX : centerX + Math.cos(angle) * width * 0.31
    const clusterCy = dirIndex === 0 ? centerY : centerY + Math.sin(angle) * height * 0.31
    clusters.push({ dir, cx: clusterCx, cy: clusterCy })
    const radius =
      members.length <= 1
        ? 0
        : Math.max((96 + members.length * 12) * (width / 1224), nodeWidth * 0.62)

    members.forEach((node, memberIndex) => {
      const spin = (hashString(node.path) % 360) * (Math.PI / 180)
      const memberAngle =
        members.length <= 1
          ? 0
          : (memberIndex / members.length) * Math.PI * 2 + spin / members.length
      const memberCx = clusterCx + Math.cos(memberAngle) * radius
      const memberCy = clusterCy + Math.sin(memberAngle) * radius * 0.74
      const margin = Math.min(16, width * 0.02)
      // 사용자 드래그 오버라이드가 있으면 기본 산포·경계 클램프 대신 그대로 쓴다.
      const override = overrides?.[node.path]
      const x =
        override?.x ??
        Math.min(Math.max(memberCx - nodeWidth / 2, margin), width - nodeWidth - margin)
      const y =
        override?.y ??
        Math.min(Math.max(memberCy - nodeHeight / 2, margin), height - nodeHeight - margin)
      const entry = { node, x, y, width: nodeWidth, cx: x + nodeWidth / 2, cy: y + nodeHeight / 2 }
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
  // 드래그로 기본 캔버스 밖에 놓인 노드의 엣지가 잘리지 않도록 SVG 영역을 확장한다.
  let minX = 0
  let minY = 0
  let maxX = width
  let maxY = height
  for (const entry of laidOut) {
    minX = Math.min(minX, entry.x)
    minY = Math.min(minY, entry.y)
    maxX = Math.max(maxX, entry.x + nodeWidth)
    maxY = Math.max(maxY, entry.y + nodeHeight)
  }
  const extent = { minX, minY, width: maxX - minX, height: maxY - minY }
  return {
    viewBox: `${minX} ${minY} ${extent.width} ${extent.height}`,
    width,
    height,
    extent,
    nodes: laidOut,
    clusters,
    edges: edgeLines,
  }
}
