import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  FileText,
  Minus,
  Plus,
  Scan,
  Search,
  Waypoints,
  ZoomOut,
} from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AppShell, useSidebarCollapsed } from "../components/AppShell.js"
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
import { type SpecsView, ViewSwitcher } from "../components/ViewSwitcher.js"
import { cn } from "../lib/cn.js"
import {
  DOC_ROWS,
  DOT_MODE,
  type DotSpec,
  GRAPH_COLLAPSED,
  GRAPH_EXPANDED,
  type HubSpec,
  MOBILE_DOC_ROWS,
  MOBILE_DOT_MODE,
  MOBILE_GRAPH,
} from "../lib/graphData.js"

export function SpecsScreen() {
  const [view, setView] = useState<SpecsView>("graph")
  const [dotMode, setDotMode] = useState(false)
  const [branchOpen, setBranchOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(true)

  return (
    <>
      {/* ───── 데스크톱 (03/03b/03c/04/04b) ───── */}
      <div className="relative hidden h-full md:block">
        <AppShell active="specs">
          <Toolbar
            view={view}
            onViewChange={(v) => {
              setView(v)
              setBranchOpen(false)
            }}
            branchOpen={branchOpen}
            onBranchToggle={() => setBranchOpen((o) => !o)}
          />
          {view === "graph" ? (
            dotMode ? (
              <DesktopDotCanvas onZoomIn={() => setDotMode(false)} />
            ) : (
              <DesktopGraphCanvas onZoomOut={() => setDotMode(true)} />
            )
          ) : (
            <DesktopListView />
          )}
        </AppShell>
        {branchOpen && (
          <div className="absolute top-[102px] left-[328px] z-40">
            <BranchMenu />
          </div>
        )}
      </div>

      {/* ───── 모바일 (M03/M03c/M04) ───── */}
      <div className="relative flex h-full flex-col overflow-hidden bg-bg md:hidden">
        <MobileStatusBar />
        <div className="flex w-full items-center gap-2.5 px-4 py-2">
          <h1 className="pen-text m-0 font-display text-[24px] font-semibold tracking-[-0.4px] text-ink">
            Specs
          </h1>
          <BranchChip branch="dev" open={branchOpen} onClick={() => setBranchOpen((o) => !o)} />
          <span className="h-px flex-1" />
          <Search className="size-[18px] text-ink-secondary" />
        </div>
        <div className="w-full px-4 pt-1 pb-2.5">
          <ViewSwitcher view={view} onChange={setView} className="w-full" mobile />
        </div>
        {view === "graph" ? (
          // 디자인 정합을 위해 별도 버튼 없이 캔버스 더블탭으로 도트 모드(M03c) 토글
          dotMode ? (
            <div className="contents" onDoubleClick={() => setDotMode(false)}>
              <MobileDotCanvas />
            </div>
          ) : (
            <div className="contents" onDoubleClick={() => setDotMode(true)}>
              <MobileGraphCanvas onSelect={() => setSheetOpen(true)} />
            </div>
          )
        ) : (
          <MobileListView />
        )}
        <MobileTabBar active="spec" />
        <GlassNav active="specs" className="absolute bottom-[88px] left-4 z-20" />
        {view === "graph" && sheetOpen && (
          <DocSheet
            onClose={() => setSheetOpen(false)}
            className="absolute bottom-2.5 left-2.5 z-30"
          />
        )}
        {branchOpen && (
          <div className="absolute top-[88px] left-[92px] z-40">
            <BranchMenu width={250} />
          </div>
        )}
      </div>
    </>
  )
}

/* ───────────────────────── 데스크톱 서브뷰 ───────────────────────── */

function Toolbar({
  view,
  onViewChange,
  branchOpen,
  onBranchToggle,
}: {
  view: SpecsView
  onViewChange: (view: SpecsView) => void
  branchOpen: boolean
  onBranchToggle: () => void
}) {
  return (
    <div className="flex w-full items-center gap-3.5 px-7 py-[18px]">
      <h1 className="pen-text m-0 font-display text-[28px] font-semibold tracking-[-0.4px] text-ink">
        Specs
      </h1>
      <BranchChip branch="dev" open={branchOpen} onClick={onBranchToggle} />
      <StatusBadge
        tone="success"
        dotSize={6}
        label="Synced 2 min ago"
        labelClassName="font-normal text-ink-tertiary"
      />
      <span className="h-px flex-1" />
      <SearchField />
      <ViewSwitcher view={view} onChange={onViewChange} />
    </div>
  )
}

function ZoomControls({
  onZoomIn,
  onZoomOut: handleZoomOut,
  className,
}: {
  onZoomIn?: (() => void) | undefined
  onZoomOut?: (() => void) | undefined
  className?: string
}) {
  return (
    <div
      className={cn(
        "absolute flex flex-col rounded-s bg-surface shadow-[0_2px_8px_#00000014]",
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

function DesktopGraphCanvas({ onZoomOut: handleZoomOut }: { onZoomOut: () => void }) {
  const navigate = useNavigate()
  const collapsed = useSidebarCollapsed()
  const data = collapsed ? GRAPH_COLLAPSED : GRAPH_EXPANDED
  const [, , vbWidth, vbHeight] = data.viewBox.split(" ").map(Number)
  return (
    <div className="relative min-h-0 w-full flex-1 overflow-hidden">
      <svg
        viewBox={data.viewBox}
        className="pointer-events-none absolute top-0 left-0"
        style={{ width: vbWidth, height: vbHeight }}
        aria-hidden
      >
        <path d={data.edges} fill="none" stroke="#D2D2D7" strokeWidth={1.5} />
        <path d={data.edgesActive} fill="none" stroke="#0071E3" strokeWidth={2} />
      </svg>
      {data.nodes.map((node) => (
        <SpecNode
          key={node.id}
          dir={node.dir}
          name={node.name}
          title={node.title}
          dark={node.dark ?? false}
          selected={node.selected ?? false}
          width={node.width}
          x={node.x}
          y={node.y}
          onClick={() => navigate(`/specs/doc/${node.id}`)}
        />
      ))}
      <ZoomControls onZoomOut={handleZoomOut} className="bottom-[72px] left-6" />
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
      <DetailPanel />
    </div>
  )
}

function DetailPanel() {
  const connected = ["overview.md", "mcp-proxy.md", "ingest-pipeline.md", "adr-002-hard-gate.md"]
  return (
    <aside className="absolute top-5 right-5 flex w-[344px] flex-col gap-3.5 rounded-l bg-surface p-[22px] shadow-[3px_5px_30px_#00000038]">
      <div className="flex w-full flex-col gap-[5px]">
        <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
          SPECS
        </span>
        <span className="pen-text font-display text-[21px] font-semibold tracking-[-0.3px] text-ink">
          stop-gate.md
        </span>
        <p className="pen-text m-0 w-full text-[13px] leading-[1.5] tracking-[-0.2px] text-ink-secondary">
          세션 종료를 차단하는 Stop 게이트의 3중 검사(clean · pushed · ingested)와 read-only 세션
          면제(D9) 규칙.
        </p>
      </div>
      <div className="flex w-full items-center gap-2">
        <Avatar initials="SY" size={20} />
        <span className="pen-text text-[12px] tracking-[-0.12px] text-ink-tertiary">
          soyesenna · 2시간 전
        </span>
        <span className="flex items-center rounded-[4px] bg-input px-[7px] py-0.5">
          <span className="pen-text font-mono text-[10.5px] text-ink-secondary">a1b2c3d</span>
        </span>
      </div>
      <div className="h-px w-full bg-hairline" />
      <div className="flex w-full flex-col gap-2.5">
        <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
          CONNECTED · 4
        </span>
        {connected.map((doc) => (
          <Link key={doc} to="/specs/doc/stop-gate" className="flex w-full items-center gap-2">
            <FileText className="size-[13px] text-ink-tertiary" />
            <span className="pen-text text-[13px] tracking-[-0.2px] text-link">{doc}</span>
            <span className="h-px flex-1" />
            <ArrowUpRight className="size-[11px] text-ink-tertiary" />
          </Link>
        ))}
      </div>
      <div className="h-px w-full bg-hairline" />
      <Link
        to="/specs/doc/stop-gate"
        className="flex w-full items-center justify-center gap-1.5 rounded-s bg-accent px-4 py-2"
      >
        <span className="pen-text text-[14px] tracking-[-0.22px] text-white">Open document</span>
      </Link>
    </aside>
  )
}

/* ───── 03c 도트 모드 ───── */

function RingDot({ dot }: { dot: DotSpec }) {
  return (
    <span
      aria-hidden
      className="absolute rounded-full"
      style={{
        left: dot.x,
        top: dot.y,
        width: dot.size,
        height: dot.size,
        border: `${(dot.size * 0.29).toFixed(2)}px solid ${dot.color}`,
        boxShadow: `0 0 ${dot.blurA.toString()}px ${dot.color}8C, 0 0 ${dot.blurB.toString()}px ${dot.color}40`,
      }}
    />
  )
}

function Hub({ hub, mobile }: { hub: HubSpec; mobile?: boolean }) {
  return (
    <>
      <span
        aria-hidden
        className={cn("absolute", hub.dark ? "bg-dark-card" : "bg-[#59616F]")}
        style={{
          left: hub.x,
          top: hub.y,
          width: hub.size,
          height: hub.size,
          borderRadius: hub.radius,
        }}
      />
      {hub.label && (
        <span
          className={cn(
            "pen-text absolute font-medium tracking-[0.1px]",
            mobile ? "text-[8.5px]" : "text-[9.5px]",
            hub.labelStrong ? "text-ink-secondary" : "text-ink-tertiary",
          )}
          style={{ left: hub.labelX, top: hub.labelY }}
        >
          {hub.label}
        </span>
      )}
    </>
  )
}

function Twinkle({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <span
      aria-hidden
      className="absolute rounded-full bg-[#7E92CE4D]"
      style={{ left: x, top: y, width: size, height: size }}
    />
  )
}

function SelectedRingDot({
  ring,
  dot,
  glowB,
}: {
  ring: { x: number; y: number; size: number }
  dot: { x: number; y: number; size: number }
  glowB: number
}) {
  return (
    <>
      <span
        aria-hidden
        className="absolute rounded-full border-[1.5px] border-[#0071E359]"
        style={{ left: ring.x, top: ring.y, width: ring.size, height: ring.size }}
      />
      <span
        aria-hidden
        className="absolute rounded-full"
        style={{
          left: dot.x,
          top: dot.y,
          width: dot.size,
          height: dot.size,
          border: `${(dot.size * 0.3).toFixed(2)}px solid #0071E3`,
          boxShadow: `0 0 4px #0071E3B3, 0 0 ${glowB.toString()}px #0071E34D`,
        }}
      />
    </>
  )
}

function DesktopDotCanvas({ onZoomIn }: { onZoomIn: () => void }) {
  const d = DOT_MODE
  return (
    <div className="relative min-h-0 w-full flex-1 overflow-hidden bg-bg">
      <svg
        viewBox={d.viewBox}
        className="pointer-events-none absolute top-0 left-0"
        style={{ width: 1224, height: 782 }}
        aria-hidden
      >
        <path d={d.interEdges} fill="none" stroke="#0000000F" strokeWidth={1} />
        <path d={d.spokes} fill="none" stroke="#00000030" strokeWidth={1} />
        <path d={d.conflictEdge} fill="none" stroke="#ED6A1C66" strokeWidth={1} />
        <path d={d.selectedEdges} fill="none" stroke="#0071E3" strokeWidth={1.5} />
      </svg>
      {d.dots.map((dot, i) => (
        <RingDot key={`dot-${i.toString()}`} dot={dot} />
      ))}
      {d.hubs.map((hub, i) => (
        <Hub key={`hub-${i.toString()}`} hub={hub} />
      ))}
      {d.twinkles.map((t, i) => (
        <Twinkle key={`tw-${i.toString()}`} x={t.x} y={t.y} size={t.size} />
      ))}
      <SelectedRingDot ring={d.selectedRing} dot={d.selectedDot} glowB={14} />
      {d.conflictDots.map((c, i) => (
        <span
          key={`cf-${i.toString()}`}
          aria-hidden
          className="absolute rounded-full"
          style={{
            left: c.x,
            top: c.y,
            width: c.size,
            height: c.size,
            border: `${(c.size * 0.29).toFixed(2)}px solid #F26B1D`,
            boxShadow: "0 0 3px #F26B1D8C, 0 0 9px #F26B1D40",
          }}
        />
      ))}
      <div className="absolute top-[276px] left-[920px] flex flex-col gap-0.5 rounded-[10px] bg-surface px-3 py-2 shadow-[0_2px_12px_#00000014]">
        <span className="pen-text text-[12px] font-semibold tracking-[-0.12px] text-ink">
          specs/stop-gate.md
        </span>
        <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
          4 connections · 마지막 ingest 2시간 전
        </span>
      </div>
      <div className="absolute top-4 left-[512px] flex items-center gap-1.5 rounded-pill bg-surface px-3 py-[5px] shadow-[0_1px_6px_#00000014]">
        <ZoomOut className="size-3 text-ink-secondary" />
        <span className="pen-text text-[11.5px] font-medium tracking-[-0.1px] text-ink-secondary">
          Compact view — zoom 24%
        </span>
      </div>
      <ZoomControls onZoomIn={onZoomIn} className="bottom-[86px] left-6" />
      <div className="absolute bottom-[59px] left-6 flex w-[34px] items-center justify-center rounded-[6px] bg-surface py-[3px] shadow-[0_1px_4px_#00000014]">
        <span className="pen-text font-mono text-[10px] text-ink-tertiary">24%</span>
      </div>
      <div className="absolute bottom-7 left-[72px] flex items-center gap-4">
        <LegendItem label="Document">
          <span className="size-[9px] rounded-full border-[2.6px] border-[#5F76B8]" />
        </LegendItem>
        <LegendItem label="Hub">
          <span className="size-[9px] rounded-[2px] bg-[#59616F]" />
        </LegendItem>
        <LegendItem label="Core">
          <span className="size-[9px] rounded-[2px] bg-dark-card" />
        </LegendItem>
        <LegendItem label="Selected">
          <span className="size-[9px] rounded-full border-[2.7px] border-accent" />
        </LegendItem>
        <LegendItem label="In conflict">
          <span className="size-[9px] rounded-full border-[2.6px] border-[#F26B1D]" />
        </LegendItem>
      </div>
    </div>
  )
}

function LegendItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      {children}
      <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">{label}</span>
    </span>
  )
}

/* ───── 04 리스트 뷰 ───── */

function DesktopListView() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col px-7 pt-1 pb-7">
      <div className="flex w-full flex-col overflow-hidden rounded-m bg-surface">
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
        {DOC_ROWS.map((row, i) => (
          <button
            key={row.id}
            type="button"
            onClick={() => navigate(`/specs/doc/${row.id}`)}
            className={cn(
              "flex h-12 w-full shrink-0 items-center gap-3.5 px-5 text-left",
              i < DOC_ROWS.length - 1 && "border-b border-hairline",
              row.highlighted && "bg-bg",
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-[6px]",
                row.dark ? "bg-dark-card" : "bg-input",
              )}
            >
              <FileText className={cn("size-3", row.dark ? "text-white" : "text-ink-tertiary")} />
            </span>
            <span className="flex w-[380px] shrink-0 items-center gap-0.5 overflow-hidden">
              {row.prefix && (
                <span className="pen-text text-[13px] tracking-[-0.2px] whitespace-nowrap text-ink-tertiary">
                  {row.prefix}
                </span>
              )}
              <span className="pen-text text-[13px] font-semibold tracking-[-0.2px] whitespace-nowrap text-ink">
                {row.name}
              </span>
            </span>
            <span className="min-w-0 flex-1 overflow-hidden">
              <span className="pen-text text-[13px] tracking-[-0.2px] whitespace-nowrap text-ink-tertiary">
                {row.summary}
              </span>
            </span>
            <span className="flex w-14 shrink-0 items-center gap-[5px]">
              <Waypoints className="size-3 text-ink-tertiary" />
              <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-secondary">
                {row.links}
              </span>
            </span>
            <span className="flex w-[110px] shrink-0 items-center">
              <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
                {row.updated}
              </span>
            </span>
            <span className="flex w-7 shrink-0 items-center">
              <Avatar initials={row.author} size={24} />
            </span>
            <ChevronRight className="size-3.5 shrink-0 text-separator" />
          </button>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────── 모바일 서브뷰 ───────────────────────── */

function MobileGraphCanvas({ onSelect }: { onSelect: () => void }) {
  const m = MOBILE_GRAPH
  return (
    <div className="relative min-h-0 w-full flex-1 overflow-hidden">
      <svg
        viewBox={m.viewBox}
        className="pointer-events-none absolute top-0 left-0"
        style={{ width: 390, height: 360 }}
        aria-hidden
      >
        <path d={m.edges} fill="none" stroke="#D2D2D7" strokeWidth={1.5} />
        <path d={m.edgesActive} fill="none" stroke="#0071E3" strokeWidth={2} />
      </svg>
      {m.nodes.map((node) => (
        <button
          key={node.id}
          type="button"
          onClick={onSelect}
          style={{ width: node.width, left: node.x, top: node.y }}
          className={cn(
            "absolute flex flex-col gap-px overflow-hidden rounded-[9px] px-2.5 py-[7px] text-left shadow-[0_3px_14px_#00000017]",
            node.dark ? "bg-dark-card" : "bg-surface",
            node.selected && "border-[1.5px] border-accent",
          )}
        >
          <span
            className={cn(
              "pen-text text-[7.5px] font-semibold tracking-[0.5px]",
              node.dark ? "text-white-tertiary" : "text-ink-tertiary",
            )}
          >
            {node.dir}
          </span>
          <span
            className={cn(
              "pen-text text-[11.5px] font-semibold tracking-[-0.1px]",
              node.dark ? "text-white" : "text-ink",
            )}
          >
            {node.name}
          </span>
        </button>
      ))}
    </div>
  )
}

function MobileDotCanvas() {
  const d = MOBILE_DOT_MODE
  return (
    <div className="relative min-h-0 w-full flex-1 overflow-hidden">
      <svg
        viewBox={d.viewBox}
        className="pointer-events-none absolute top-0 left-0"
        style={{ width: 390, height: 628 }}
        aria-hidden
      >
        <path d={d.interEdges} fill="none" stroke="#0000000F" strokeWidth={1} />
        <path d={d.spokes} fill="none" stroke="#00000030" strokeWidth={1} />
        <path d={d.selectedEdges} fill="none" stroke="#0071E3" strokeWidth={1.5} />
      </svg>
      {d.dots.map((dot, i) => (
        <RingDot key={`mdot-${i.toString()}`} dot={dot} />
      ))}
      {d.hubs.map((hub, i) => (
        <Hub key={`mhub-${i.toString()}`} hub={hub} mobile />
      ))}
      {d.twinkles.map((t, i) => (
        <Twinkle key={`mtw-${i.toString()}`} x={t.x} y={t.y} size={t.size} />
      ))}
      <SelectedRingDot ring={d.selectedRing} dot={d.selectedDot} glowB={12} />
      <div className="absolute top-3 left-[108px] flex items-center gap-[5px] rounded-pill bg-surface px-[11px] py-[5px] shadow-[0_1px_6px_#00000014]">
        <ZoomOut className="size-[11px] text-ink-secondary" />
        <span className="pen-text text-[10.5px] font-medium tracking-[-0.1px] text-ink-secondary">
          Compact — zoom 32%
        </span>
      </div>
    </div>
  )
}

function MobileListView() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 pt-0.5 pb-3">
      <div className="flex w-full flex-col overflow-hidden rounded-m bg-surface">
        {MOBILE_DOC_ROWS.map((row, i) => (
          <button
            key={row.id}
            type="button"
            onClick={() => navigate(`/specs/doc/${row.id}`)}
            className={cn(
              "flex h-[58px] w-full shrink-0 items-center gap-[11px] px-3.5 text-left",
              i < MOBILE_DOC_ROWS.length - 1 && "border-b border-hairline",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-s",
                row.dark ? "bg-dark-card" : "bg-input",
              )}
            >
              <FileText
                className={cn("size-[13px]", row.dark ? "text-white" : "text-ink-tertiary")}
              />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
              <span className="pen-text truncate text-[13.5px] font-semibold tracking-[-0.2px] text-ink">
                {row.name}
              </span>
              <span className="pen-text truncate text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
                {row.summary}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-[5px]">
              <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
                {row.time}
              </span>
              <ChevronRight className="size-3.5 text-separator" />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
