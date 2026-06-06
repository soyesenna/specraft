import { ChevronLeft, CornerDownRight, FileText, History, Lock } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { AppShell } from "../components/AppShell.js"
import { BranchChip } from "../components/BranchChip.js"
import { IconButton } from "../components/IconButton.js"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { cn } from "../lib/cn.js"

const TREE: Array<{ section: string; docs: Array<{ name: string; active?: boolean }> }> = [
  { section: "CORE", docs: [{ name: "overview.md" }, { name: "index.md" }, { name: "log.md" }] },
  {
    section: "SPECS",
    docs: [
      { name: "ingest-pipeline.md" },
      { name: "mcp-proxy.md" },
      { name: "query-engine.md" },
      { name: "stop-gate.md", active: true },
    ],
  },
  { section: "ARCHITECTURE", docs: [{ name: "git-sync.md" }, { name: "llm-engine.md" }] },
  {
    section: "DECISIONS",
    docs: [{ name: "adr-001-bare-git.md" }, { name: "adr-002-hard-gate.md" }],
  },
  { section: "ROOT", docs: [{ name: "progress.md" }] },
]

const BACKLINKS = ["overview.md", "ingest-pipeline.md", "adr-002-hard-gate.md"]

/** 05 · Document (1440) + M05 · Document (390) */
export function DocumentScreen() {
  const navigate = useNavigate()

  return (
    <>
      {/* ───── 데스크톱 05 ───── */}
      <div className="hidden h-full md:block">
        <AppShell active="specs">
          {/* Toolbar */}
          <div className="flex w-full items-center gap-3 px-7 py-4">
            <IconButton icon={ChevronLeft} onClick={() => navigate("/specs")} />
            <div className="flex items-center gap-1.5">
              <span className="pen-text text-[13px] tracking-[-0.2px] text-ink-tertiary">
                specs /
              </span>
              <span className="pen-text text-[15px] font-semibold tracking-[-0.24px] text-ink">
                stop-gate.md
              </span>
            </div>
            <div className="flex items-center gap-[5px] rounded-pill bg-input px-2.5 py-1">
              <Lock className="size-[11px] text-ink-tertiary" />
              <span className="pen-text text-[11.5px] font-medium tracking-[-0.1px] text-ink-tertiary">
                Read-only · LLM-maintained
              </span>
            </div>
            <span className="h-px flex-1" />
            <BranchChip branch="dev" />
            <button
              type="button"
              onClick={() => navigate("/specs/doc/stop-gate/history")}
              className="flex items-center justify-center gap-1.5 rounded-sm bg-input px-4 py-2"
            >
              <span className="pen-text text-[14px] tracking-[-0.22px] text-ink">History</span>
            </button>
          </div>
          {/* Doc Body */}
          <div className="flex min-h-0 w-full flex-1 gap-[26px] px-7 pb-7">
            {/* Wiki Tree */}
            <nav className="flex w-[230px] shrink-0 flex-col gap-px overflow-y-auto">
              {TREE.map((group) => (
                <div key={group.section} className="flex flex-col gap-px">
                  <div className="flex h-[30px] items-end px-2.5 pb-2">
                    <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
                      {group.section}
                    </span>
                  </div>
                  {group.docs.map((doc) => (
                    <Link
                      key={doc.name}
                      to="/specs/doc/stop-gate"
                      className={cn(
                        "flex h-[30px] w-full items-center gap-[7px] rounded-[6px] px-2.5",
                        doc.active && "bg-surface",
                      )}
                    >
                      <FileText
                        className={cn(
                          "size-3 shrink-0",
                          doc.active ? "text-ink" : "text-ink-tertiary",
                        )}
                      />
                      <span
                        className={cn(
                          "pen-text text-[13px] tracking-[-0.2px]",
                          doc.active ? "font-semibold text-ink" : "text-ink-secondary",
                        )}
                      >
                        {doc.name}
                      </span>
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
            {/* Doc Sheet */}
            <article className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto rounded-lg bg-surface px-11 py-9">
              <h1 className="pen-text m-0 w-full font-display text-[28px] leading-[1.15] font-semibold tracking-[-0.4px] text-ink">
                Stop 게이트 판정 규칙
              </h1>
              <span className="pen-text w-full text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
                specs/stop-gate.md · 마지막 ingest soyesenna · 2시간 전 · a1b2c3d
              </span>
              <div className="h-px w-full shrink-0 bg-hairline" />
              <p className="pen-text m-0 w-full text-[14.5px] leading-[1.65] tracking-[-0.22px] text-ink-secondary">
                Stop 게이트는 세션 종료 시점에 세 가지 검사를 순서대로 수행한다 — ① 워킹트리 clean
                ② HEAD push 완료 ③ 세션 ingest 마킹 존재. 하나라도 미충족이면 종료를 차단하고
                에이전트에게 commit → push → ingest 절차를 지시한다.
              </p>
              <h2 className="pen-text m-0 w-full font-display text-[19px] font-semibold tracking-[-0.26px] text-ink">
                판정 매트릭스
              </h2>
              <DocBullet text="read-only 세션(변경 · 커밋 0건)은 ingest 강제를 면제한다 — D9" />
              <DocBullet text="dirty-uncommitted는 면제가 아니다 — clean 검사(①)에서 차단" />
              <DocBullet text="서버 도달 불가 시에도 hard block 유지 — spec 무결성 > 가용성 (D1)" />
              <div className="flex w-full flex-col gap-[3px] rounded-sm bg-dark-card px-[18px] py-3.5">
                <code className="pen-text font-mono text-[12px] leading-[1.6] whitespace-pre text-white-secondary">
                  {"// ~/.specraft/sessions/{session_id}.json"}
                </code>
                <code className="pen-text font-mono text-[12px] leading-[1.6] whitespace-pre text-white-secondary">
                  {'{ "started_at": "2026-06-06T09:12:00Z", "branch": "dev",'}
                </code>
                <code className="pen-text font-mono text-[12px] leading-[1.6] whitespace-pre text-white-secondary">
                  {'  "ingested": true, "resolved": true }'}
                </code>
              </div>
              <h2 className="pen-text m-0 w-full font-display text-[19px] font-semibold tracking-[-0.26px] text-ink">
                관련 결정
              </h2>
              <div className="flex items-center gap-[18px]">
                <span className="flex items-center gap-1.5">
                  <FileText className="size-[13px] text-ink-tertiary" />
                  <span className="pen-text text-[13.5px] tracking-[-0.2px] text-link">
                    adr-002-hard-gate.md
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="size-[13px] text-ink-tertiary" />
                  <span className="pen-text text-[13.5px] tracking-[-0.2px] text-link">
                    mcp-proxy.md
                  </span>
                </span>
              </div>
            </article>
            {/* Doc Rail */}
            <aside className="flex w-[248px] shrink-0 flex-col gap-3.5 overflow-y-auto pt-2 pl-1">
              <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
                ON THIS PAGE
              </span>
              <div className="flex w-full flex-col">
                <span className="flex h-[26px] items-center">
                  <span className="pen-text text-[12.5px] font-semibold tracking-[-0.12px] text-ink">
                    판정 매트릭스
                  </span>
                </span>
                <span className="flex h-[26px] items-center">
                  <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
                    세션 상태 파일
                  </span>
                </span>
                <span className="flex h-[26px] items-center">
                  <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
                    관련 결정
                  </span>
                </span>
              </div>
              <div className="h-px w-full bg-hairline" />
              <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
                BACKLINKS · 3
              </span>
              <div className="flex w-full flex-col gap-[9px]">
                {BACKLINKS.map((doc) => (
                  <span key={doc} className="flex w-full items-center gap-[7px]">
                    <CornerDownRight className="size-3 text-ink-tertiary" />
                    <span className="pen-text text-[13px] tracking-[-0.2px] text-link">{doc}</span>
                  </span>
                ))}
              </div>
              <div className="h-px w-full bg-hairline" />
              <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
                RECENT INGESTS
              </span>
              <div className="flex w-full flex-col gap-3">
                <RecentIngest initials="SY" name="수연" time="2시간 전" desc="게이트 면제 조건 D9 반영, 매트릭스 셀 정리" />
                <RecentIngest initials="MJ" name="민지" time="어제" desc="3중 검사 순서 및 차단 지시 문구 명시" />
              </div>
            </aside>
          </div>
        </AppShell>
      </div>

      {/* ───── 모바일 M05 ───── */}
      <div className="flex h-full flex-col overflow-hidden bg-bg md:hidden">
        <MobileStatusBar />
        <div className="flex w-full items-center gap-2.5 px-4 pt-1.5 pb-2.5">
          <button
            type="button"
            onClick={() => navigate("/specs")}
            className="flex size-[30px] shrink-0 items-center justify-center rounded-[15px] bg-input"
            aria-label="뒤로"
          >
            <ChevronLeft className="size-4 text-ink-secondary" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="pen-text text-[15.5px] font-semibold tracking-[-0.24px] text-ink">
              stop-gate.md
            </span>
            <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
              specs/ · dev
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate("/specs/doc/stop-gate/history")}
            className="flex size-7 shrink-0 items-center justify-center rounded-[14px] bg-input"
            aria-label="History"
          >
            <History className="size-[13px] text-ink-secondary" />
          </button>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[14px] bg-input">
            <Lock className="size-3 text-ink-tertiary" />
          </span>
        </div>
        <div className="flex min-h-0 w-full flex-1 flex-col px-3 pb-4">
          <article className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto rounded-md bg-surface px-[18px] py-5">
            <h1 className="pen-text m-0 w-full font-display text-[21px] leading-[1.2] font-semibold tracking-[-0.32px] text-ink">
              Stop 게이트 판정 규칙
            </h1>
            <span className="pen-text w-full text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
              마지막 ingest soyesenna · 2시간 전 · a1b2c3d
            </span>
            <div className="h-px w-full shrink-0 bg-hairline" />
            <p className="pen-text m-0 w-full text-[13.5px] leading-[1.65] tracking-[-0.2px] text-ink-secondary">
              Stop 게이트는 세션 종료 시점에 세 가지 검사를 순서대로 수행한다 — ① 워킹트리 clean ②
              HEAD push 완료 ③ 세션 ingest 마킹 존재. 하나라도 미충족이면 종료를 차단하고 commit →
              push → ingest 절차를 지시한다.
            </p>
            <h2 className="pen-text m-0 w-full font-display text-[15.5px] font-semibold tracking-[-0.24px] text-ink">
              판정 매트릭스
            </h2>
            <MobileBullet text="read-only 세션은 ingest 강제 면제 — D9" />
            <MobileBullet text="dirty-uncommitted는 clean 검사에서 차단" />
            <MobileBullet text="서버 불가 시에도 hard block — D1" />
            <div className="flex w-full flex-col gap-0.5 overflow-hidden rounded-sm bg-dark-card px-[13px] py-[11px]">
              <code className="pen-text font-mono text-[10.5px] leading-[1.6] whitespace-pre text-white-secondary">
                {"// ~/.specraft/sessions/{id}.json"}
              </code>
              <code className="pen-text font-mono text-[10.5px] leading-[1.6] whitespace-pre text-white-secondary">
                {'{ "branch": "dev",'}
              </code>
              <code className="pen-text font-mono text-[10.5px] leading-[1.6] whitespace-pre text-white-secondary">
                {'  "ingested": true }'}
              </code>
            </div>
            <span className="pen-text text-[9.5px] font-semibold tracking-[0.8px] text-ink-tertiary">
              BACKLINKS · 3
            </span>
            <div className="flex w-full flex-col gap-2">
              {BACKLINKS.map((doc) => (
                <span key={doc} className="flex items-center gap-[7px]">
                  <CornerDownRight className="size-3 text-ink-tertiary" />
                  <span className="pen-text text-[12.5px] tracking-[-0.12px] text-link">{doc}</span>
                </span>
              ))}
            </div>
          </article>
        </div>
      </div>
    </>
  )
}

function DocBullet({ text }: { text: string }) {
  return (
    <div className="flex w-full gap-2.5">
      <span className="pt-2">
        <span className="block size-[5px] rounded-full bg-ink-tertiary" />
      </span>
      <span className="pen-text w-full text-[14.5px] leading-[1.6] tracking-[-0.22px] text-ink-secondary">
        {text}
      </span>
    </div>
  )
}

function MobileBullet({ text }: { text: string }) {
  return (
    <div className="flex w-full gap-[9px]">
      <span className="pt-[7px]">
        <span className="block size-[4.5px] rounded-full bg-ink-tertiary" />
      </span>
      <span className="pen-text w-full text-[13px] leading-[1.55] tracking-[-0.2px] text-ink-secondary">
        {text}
      </span>
    </div>
  )
}

function RecentIngest({
  initials,
  name,
  time,
  desc,
}: {
  initials: string
  name: string
  time: string
  desc: string
}) {
  return (
    <div className="flex w-full gap-[9px]">
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-[11px] bg-input">
        <span className="pen-text text-[8.5px] font-semibold text-ink-secondary">{initials}</span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <span className="pen-text text-[12.5px] font-semibold tracking-[-0.12px] text-ink">
            {name}
          </span>
          <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">{time}</span>
        </span>
        <span className="pen-text w-full text-[12px] leading-[1.45] tracking-[-0.12px] text-ink-tertiary">
          {desc}
        </span>
      </div>
    </div>
  )
}
