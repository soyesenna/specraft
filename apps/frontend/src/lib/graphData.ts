/**
 * specraft-ui.pen 그래프 캔버스 데이터 1:1 추출.
 * 03(S0cTu) / 03b(fXNaq) / 03c(P6hVv5) / M03(X0Ygzj) / M03c(x4yxq)
 */

export type GraphNode = {
  id: string
  dir: string
  name: string
  title: string
  dark?: boolean
  selected?: boolean
  width: number
  x: number
  y: number
}

/** 03 — 사이드바 펼침 (캔버스 1224×782) */
export const GRAPH_EXPANDED = {
  viewBox: "0 0 1224 782",
  edges:
    "M494 125c0 86-32 86-32 172m0 0c-135 0-135-110-270-110m270 110c-145 0-145 62-290 62m290-62c0 180 198 180 198 360m-468-470c0 135 92 135 92 270m-92-270c0 160 316 160 316 320m-336-148c0 159 266 159 266 318m70-170c-152 0-152 110-304 110m512-188c-104 0-104 78-208 78",
  edgesActive:
    "M462 297c122 0 122-64 244-64m0 0c0 98 10 98 10 196m-10-196c0 137-198 137-198 274m198-274c0 182 246 182 246 364",
  nodes: [
    {
      id: "overview",
      dir: "CORE",
      name: "overview.md",
      title: "프로젝트 개요 · 세션 주입 본체",
      dark: true,
      width: 224,
      x: 350,
      y: 260,
    },
    {
      id: "index",
      dir: "CORE",
      name: "index.md",
      title: "전 페이지 카탈로그",
      dark: true,
      width: 188,
      x: 400,
      y: 88,
    },
    {
      id: "log",
      dir: "CORE",
      name: "log.md",
      title: "append-only 활동 이력",
      dark: true,
      width: 188,
      x: 110,
      y: 580,
    },
    {
      id: "stop-gate",
      dir: "SPECS",
      name: "stop-gate.md",
      title: "Stop 게이트 판정 규칙",
      selected: true,
      width: 212,
      x: 600,
      y: 196,
    },
    {
      id: "mcp-proxy",
      dir: "SPECS",
      name: "mcp-proxy.md",
      title: "stdio 프록시 · 도구 3종",
      width: 208,
      x: 612,
      y: 392,
    },
    {
      id: "ingest-pipeline",
      dir: "SPECS",
      name: "ingest-pipeline.md",
      title: "ingest 처리 파이프라인",
      width: 216,
      x: 400,
      y: 470,
    },
    {
      id: "query-engine",
      dir: "SPECS",
      name: "query-engine.md",
      title: "인용 포함 질의 응답",
      width: 208,
      x: 180,
      y: 420,
    },
    {
      id: "llm-engine",
      dir: "ARCHITECTURE",
      name: "llm-engine.md",
      title: "4종 에이전트 루프",
      width: 208,
      x: 88,
      y: 150,
    },
    {
      id: "git-sync",
      dir: "ARCHITECTURE",
      name: "git-sync.md",
      title: "브랜치 미러링 · lazy 전파",
      width: 216,
      x: 64,
      y: 322,
    },
    {
      id: "adr-002",
      dir: "DECISIONS",
      name: "adr-002-hard-gate.md",
      title: "spec 무결성 > 가용성",
      width: 224,
      x: 840,
      y: 560,
    },
    {
      id: "progress",
      dir: "PROGRESS",
      name: "progress.md",
      title: "마일스톤 진행 현황",
      width: 200,
      x: 560,
      y: 620,
    },
    {
      id: "adr-001",
      dir: "DECISIONS",
      name: "adr-001-bare-git.md",
      title: "wiki SoT = bare git repo",
      width: 216,
      x: 330,
      y: 640,
    },
  ] satisfies GraphNode[],
  panelX: 860,
}

/** 03b — 사이드바 접힘 (캔버스 1376×782, 좌표 재계산본) */
export const GRAPH_COLLAPSED = {
  viewBox: "0 0 1376 782",
  edges:
    "M554 125c0 87-42 87-42 174m0 0c-154 0-154-112-308-112m308 112c-166 0-166 68-332 68m332-68c0 183 228 183 228 366m-536-478c0 140 100 140 100 280m-100-280c182 0 182 328 364 328m-388-148c0 160 308 160 308 320m80-172c-177 0-177 110-354 110m606-190c-126 0-126 80-252 80",
  edgesActive:
    "M512 299c147 0 147-66 294-66m0 0c0 101 14 101 14 202m-14-202c0 141-238 141-238 282m238-282c0 182 266 182 266 364",
  nodes: [
    {
      id: "overview",
      dir: "CORE",
      name: "overview.md",
      title: "프로젝트 개요 · 세션 주입 본체",
      dark: true,
      width: 224,
      x: 400,
      y: 262,
    },
    {
      id: "index",
      dir: "CORE",
      name: "index.md",
      title: "전 페이지 카탈로그",
      dark: true,
      width: 188,
      x: 460,
      y: 88,
    },
    {
      id: "log",
      dir: "CORE",
      name: "log.md",
      title: "append-only 활동 이력",
      dark: true,
      width: 188,
      x: 120,
      y: 588,
    },
    {
      id: "stop-gate",
      dir: "SPECS",
      name: "stop-gate.md",
      title: "Stop 게이트 판정 규칙",
      selected: true,
      width: 212,
      x: 700,
      y: 196,
    },
    {
      id: "mcp-proxy",
      dir: "SPECS",
      name: "mcp-proxy.md",
      title: "stdio 프록시 · 도구 3종",
      width: 208,
      x: 716,
      y: 398,
    },
    {
      id: "ingest-pipeline",
      dir: "SPECS",
      name: "ingest-pipeline.md",
      title: "ingest 처리 파이프라인",
      width: 216,
      x: 460,
      y: 478,
    },
    {
      id: "query-engine",
      dir: "SPECS",
      name: "query-engine.md",
      title: "인용 포함 질의 응답",
      width: 208,
      x: 200,
      y: 430,
    },
    {
      id: "llm-engine",
      dir: "ARCHITECTURE",
      name: "llm-engine.md",
      title: "4종 에이전트 루프",
      width: 208,
      x: 100,
      y: 150,
    },
    {
      id: "git-sync",
      dir: "ARCHITECTURE",
      name: "git-sync.md",
      title: "브랜치 미러링 · lazy 전파",
      width: 216,
      x: 72,
      y: 330,
    },
    {
      id: "adr-002",
      dir: "DECISIONS",
      name: "adr-002-hard-gate.md",
      title: "spec 무결성 > 가용성",
      width: 224,
      x: 960,
      y: 560,
    },
    {
      id: "progress",
      dir: "PROGRESS",
      name: "progress.md",
      title: "마일스톤 진행 현황",
      width: 200,
      x: 640,
      y: 628,
    },
    {
      id: "adr-001",
      dir: "DECISIONS",
      name: "adr-001-bare-git.md",
      title: "wiki SoT = bare git repo",
      width: 216,
      x: 380,
      y: 650,
    },
  ] satisfies GraphNode[],
  panelX: 1012,
}

export type DotSpec = {
  x: number
  y: number
  size: number
  color: string
  blurA: number
  blurB: number
}

export type HubSpec = {
  x: number
  y: number
  size: number
  radius: number
  dark?: boolean
  label?: string
  labelX?: number
  labelY?: number
  /** 라벨 톤 — 03c core 허브 라벨만 ink-secondary */
  labelStrong?: boolean
}

/** 03c — 줌아웃 도트 모드 (캔버스 1224×782) */
export const DOT_MODE = {
  viewBox: "0 0 1224 782",
  interEdges:
    "M640 200l-140 130m140-130l180 100m-180-100l-400 20m400-20l240 360m-240-360l420-60m-420 60l440 230m-440-230l-210-90m70 220l320-30m-320 30l-260-110m260 110l-200 230m200-230l100 310m-100-310l220 140m-480-250l-100 200m740 140l200-130m-780 130l-160-140m460 220l120-170",
  spokes:
    "M500 330l57 10m-57-10l44 63m-44-63l-11 61m11-61l-66 46m66-46l-65-11m65 11l-49-70m49 70l12-69m-12 69l73-51m67-79l70 37m-70-37l28 58m-28-58l-14 82m14-82l-49 47m49-47l-86 12m86-12l-64-34m64 34l-40-82m40 82l13-75m-13 75l68-66m-68 66l79-11m-419 371l39 39m-39-39l-34 66m34-66l-58-9m58 9l-12-77m12 77l56-29m464-231l79 0m-79 0l40 50m-40-50l-18 81m18-81l-61 30m61-30l-78-38m78 38l-16-70m16 70l57-71m-637-9l58 16m-58-16l20 76m-20-76l-45 45m45-45l-80-21m80 21l-18-66m18 66l62-62m578 402l63 37m-63-37l-29 50m29-50l-67-38m67 38l31-54m-311 134l26 45m-26-45l-71 0m71 0l28-48m-488-172l70 26m-70-26l-2 60m2-60l-76 22m76-22l-36-53m36 53l51-65m869-215l50 4m-50-4l16 67m-16-67l-46 28m46-28l-55-48m55 48l23-53m-3 343l59 49m-59-49l-11 61m11-61l-76 28m76-28l-51-42m51 42l15-84m-15 84l66-24m-716-296l16 45m-16-45l-63 23m63-23l-18-49m18 49l67-24m223 384l60 39m-60-39l-14 54m14-54l-75 4m75-4l-22-56m22 56l61-50",
  conflictEdge: "M380 430l65 45",
  selectedEdges: "M900 250l-80 50m80-50l-400 80m400-80l-20 310m20-310l-180 220",
  dots: [
    { x: 552.5, y: 335.5, size: 9, color: "#7E92CE", blurA: 3, blurB: 8 },
    { x: 538.5, y: 387.5, size: 11, color: "#5F76B8", blurA: 3, blurB: 10 },
    { x: 482.5, y: 384.5, size: 13, color: "#9AACE4", blurA: 4, blurB: 12 },
    { x: 429.5, y: 371.5, size: 9, color: "#7E92CE", blurA: 3, blurB: 8 },
    { x: 429.5, y: 313.5, size: 11, color: "#5F76B8", blurA: 3, blurB: 10 },
    { x: 444.5, y: 253.5, size: 13, color: "#9AACE4", blurA: 4, blurB: 12 },
    { x: 507.5, y: 256.5, size: 9, color: "#7E92CE", blurA: 3, blurB: 8 },
    { x: 567.5, y: 273.5, size: 11, color: "#5F76B8", blurA: 3, blurB: 10 },
    { x: 704.5, y: 231.5, size: 11, color: "#7E92CE", blurA: 3, blurB: 10 },
    { x: 661.5, y: 251.5, size: 13, color: "#5F76B8", blurA: 4, blurB: 12 },
    { x: 621.5, y: 277.5, size: 9, color: "#9AACE4", blurA: 3, blurB: 8 },
    { x: 585.5, y: 241.5, size: 11, color: "#7E92CE", blurA: 3, blurB: 10 },
    { x: 547.5, y: 205.5, size: 13, color: "#5F76B8", blurA: 4, blurB: 12 },
    { x: 571.5, y: 161.5, size: 9, color: "#9AACE4", blurA: 3, blurB: 8 },
    { x: 594.5, y: 112.5, size: 11, color: "#7E92CE", blurA: 3, blurB: 10 },
    { x: 646.5, y: 118.5, size: 13, color: "#5F76B8", blurA: 4, blurB: 12 },
    { x: 703.5, y: 129.5, size: 9, color: "#9AACE4", blurA: 3, blurB: 8 },
    { x: 713.5, y: 183.5, size: 11, color: "#7E92CE", blurA: 3, blurB: 10 },
    { x: 333.5, y: 593.5, size: 11, color: "#9AACE4", blurA: 3, blurB: 10 },
    { x: 259.5, y: 619.5, size: 13, color: "#7E92CE", blurA: 4, blurB: 12 },
    { x: 237.5, y: 546.5, size: 9, color: "#5F76B8", blurA: 3, blurB: 8 },
    { x: 282.5, y: 477.5, size: 11, color: "#9AACE4", blurA: 3, blurB: 10 },
    { x: 349.5, y: 524.5, size: 13, color: "#7E92CE", blurA: 4, blurB: 12 },
    { x: 892.5, y: 293.5, size: 13, color: "#9AACE4", blurA: 4, blurB: 12 },
    { x: 855.5, y: 345.5, size: 9, color: "#7E92CE", blurA: 3, blurB: 8 },
    { x: 796.5, y: 375.5, size: 11, color: "#2FB3AC", blurA: 3, blurB: 10 },
    { x: 752.5, y: 323.5, size: 13, color: "#9AACE4", blurA: 4, blurB: 12 },
    { x: 737.5, y: 257.5, size: 9, color: "#7E92CE", blurA: 3, blurB: 8 },
    { x: 798.5, y: 224.5, size: 11, color: "#5F76B8", blurA: 3, blurB: 10 },
    { x: 870.5, y: 222.5, size: 13, color: "#9AACE4", blurA: 4, blurB: 12 },
    { x: 291.5, y: 229.5, size: 13, color: "#5F76B8", blurA: 4, blurB: 12 },
    { x: 255.5, y: 291.5, size: 9, color: "#9AACE4", blurA: 3, blurB: 8 },
    { x: 189.5, y: 259.5, size: 11, color: "#7E92CE", blurA: 3, blurB: 10 },
    { x: 153.5, y: 192.5, size: 13, color: "#5F76B8", blurA: 4, blurB: 12 },
    { x: 217.5, y: 149.5, size: 9, color: "#2FB3AC", blurA: 3, blurB: 8 },
    { x: 296.5, y: 152.5, size: 11, color: "#7E92CE", blurA: 3, blurB: 10 },
    { x: 937.5, y: 591.5, size: 11, color: "#9AACE4", blurA: 3, blurB: 10 },
    { x: 844.5, y: 603.5, size: 13, color: "#7E92CE", blurA: 4, blurB: 12 },
    { x: 808.5, y: 517.5, size: 9, color: "#5F76B8", blurA: 3, blurB: 8 },
    { x: 905.5, y: 500.5, size: 11, color: "#9AACE4", blurA: 3, blurB: 10 },
    { x: 620.5, y: 679.5, size: 11, color: "#5F76B8", blurA: 3, blurB: 10 },
    { x: 522.5, y: 633.5, size: 13, color: "#9AACE4", blurA: 4, blurB: 12 },
    { x: 623.5, y: 587.5, size: 9, color: "#7E92CE", blurA: 3, blurB: 8 },
    { x: 205.5, y: 441.5, size: 9, color: "#9AACE4", blurA: 3, blurB: 8 },
    { x: 132.5, y: 474.5, size: 11, color: "#7E92CE", blurA: 3, blurB: 10 },
    { x: 57.5, y: 435.5, size: 13, color: "#5F76B8", blurA: 4, blurB: 12 },
    { x: 99.5, y: 362.5, size: 9, color: "#9AACE4", blurA: 3, blurB: 8 },
    { x: 185.5, y: 349.5, size: 11, color: "#7E92CE", blurA: 3, blurB: 10 },
    { x: 1104.5, y: 138.5, size: 11, color: "#9AACE4", blurA: 3, blurB: 10 },
    { x: 1069.5, y: 200.5, size: 13, color: "#7E92CE", blurA: 4, blurB: 12 },
    { x: 1009.5, y: 163.5, size: 9, color: "#5F76B8", blurA: 3, blurB: 8 },
    { x: 999.5, y: 86.5, size: 11, color: "#9AACE4", blurA: 3, blurB: 10 },
    { x: 1076.5, y: 80.5, size: 13, color: "#7E92CE", blurA: 4, blurB: 12 },
    { x: 1132.5, y: 472.5, size: 13, color: "#9AACE4", blurA: 4, blurB: 12 },
    { x: 1064.5, y: 486.5, size: 9, color: "#7E92CE", blurA: 3, blurB: 8 },
    { x: 998.5, y: 452.5, size: 11, color: "#5F76B8", blurA: 3, blurB: 10 },
    { x: 1022.5, y: 381.5, size: 13, color: "#2FB3AC", blurA: 4, blurB: 12 },
    { x: 1090.5, y: 341.5, size: 9, color: "#7E92CE", blurA: 3, blurB: 8 },
    { x: 1140.5, y: 400.5, size: 11, color: "#5F76B8", blurA: 3, blurB: 10 },
    { x: 440.5, y: 149.5, size: 11, color: "#7E92CE", blurA: 3, blurB: 10 },
    { x: 360.5, y: 126.5, size: 13, color: "#2FB3AC", blurA: 4, blurB: 12 },
    { x: 407.5, y: 56.5, size: 9, color: "#9AACE4", blurA: 3, blurB: 8 },
    { x: 491.5, y: 80.5, size: 11, color: "#7E92CE", blurA: 3, blurB: 10 },
    { x: 774.5, y: 503.5, size: 11, color: "#9AACE4", blurA: 3, blurB: 10 },
    { x: 699.5, y: 517.5, size: 13, color: "#7E92CE", blurA: 4, blurB: 12 },
    { x: 640.5, y: 469.5, size: 9, color: "#5F76B8", blurA: 3, blurB: 8 },
    { x: 692.5, y: 408.5, size: 11, color: "#9AACE4", blurA: 3, blurB: 10 },
    { x: 774.5, y: 413.5, size: 13, color: "#7E92CE", blurA: 4, blurB: 12 },
  ] satisfies DotSpec[],
  hubs: [
    {
      x: 494,
      y: 324,
      size: 12,
      radius: 2.5,
      dark: true,
      label: "overview",
      labelX: 512,
      labelY: 310,
      labelStrong: true,
    },
    {
      x: 634,
      y: 194,
      size: 12,
      radius: 2.5,
      dark: true,
      label: "index",
      labelX: 652,
      labelY: 180,
      labelStrong: true,
    },
    {
      x: 294,
      y: 554,
      size: 12,
      radius: 2.5,
      dark: true,
      label: "log",
      labelX: 312,
      labelY: 540,
      labelStrong: true,
    },
    { x: 815.5, y: 295.5, size: 9, radius: 2, label: "specs/", labelX: 832, labelY: 280 },
    { x: 235.5, y: 215.5, size: 9, radius: 2, label: "architecture/", labelX: 252, labelY: 200 },
    { x: 875.5, y: 555.5, size: 9, radius: 2, label: "decisions/", labelX: 892, labelY: 540 },
    { x: 595.5, y: 635.5, size: 9, radius: 2 },
    { x: 135.5, y: 415.5, size: 9, radius: 2 },
    { x: 1055.5, y: 135.5, size: 9, radius: 2 },
    { x: 1075.5, y: 425.5, size: 9, radius: 2 },
    { x: 425.5, y: 105.5, size: 9, radius: 2 },
    { x: 715.5, y: 465.5, size: 9, radius: 2 },
  ] satisfies HubSpec[],
  selectedRing: { x: 889, y: 239, size: 22 },
  selectedDot: { x: 894, y: 244, size: 12 },
  conflictDots: [
    { x: 375, y: 425, size: 10 },
    { x: 440, y: 470, size: 10 },
  ],
  twinkles: [
    { x: 90, y: 115, size: 5 },
    { x: 345, y: 70, size: 4 },
    { x: 1155, y: 255, size: 5 },
    { x: 60, y: 580, size: 4 },
    { x: 530, y: 150, size: 5 },
    { x: 770, y: 645, size: 4 },
    { x: 200, y: 700, size: 5 },
    { x: 1120, y: 700, size: 4 },
  ],
}

export type MobileNode = {
  id: string
  dir: string
  name: string
  dark?: boolean
  selected?: boolean
  width: number
  x: number
  y: number
}

/** M03 — 모바일 미니 그래프 (캔버스 390×360) */
export const MOBILE_GRAPH = {
  viewBox: "0 0 390 360",
  edges: "M167 36c-43.5 0-43.5 100-87 100m0 0c-3.5 0-3.5 108-7 108m0 0c72 0 72 38 144 38",
  edgesActive: "M80 136c94.5 0 94.5-18 189-18m0 0c15 0 15 84 30 84m-30-84c-26 0-26 164-52 164",
  nodes: [
    { id: "index", dir: "CORE", name: "index.md", dark: true, width: 104, x: 115, y: 16 },
    { id: "overview", dir: "CORE", name: "overview.md", dark: true, width: 116, x: 22, y: 116 },
    {
      id: "stop-gate",
      dir: "SPECS",
      name: "stop-gate.md",
      selected: true,
      width: 114,
      x: 212,
      y: 98,
    },
    { id: "llm-engine", dir: "ARCH", name: "llm-engine.md", width: 114, x: 16, y: 224 },
    { id: "ingest-pipeline", dir: "SPECS", name: "ingest-pipeline.md", width: 138, x: 148, y: 262 },
    { id: "mcp-proxy", dir: "SPECS", name: "mcp-proxy.md", width: 110, x: 244, y: 182 },
  ] satisfies MobileNode[],
}

/** M03c — 모바일 도트 모드 (캔버스 390×628) */
export const MOBILE_DOT_MODE = {
  viewBox: "0 0 390 628",
  interEdges:
    "M195 115l-90 140m90-140l90 110m-180 30l180-30m-180 30l-30 160m30-160l45 250m135-80l35 70m-245-80l75 90",
  spokes:
    "M195 115l37 10m-37-10l12 45m-12-45l-40 40m40-40l-42-11m42 11l-13-50m13 50l28-28m-118 168l44 37m-44-37l-8 43m8-43l-50 18m50-18l-31-26m31 26l9-48m-9 48l55-20m125-10l48 0m-48 0l18 54m-18-54l-36 26m36-26l-43-31m43 31l12-38m-222 228l37 17m-37-17l-21 45m21-45l-34-16m34 16l19-42m191 52l21 29m-21-29l-37 26m37-26l-31-44m31 44l34-24m-169 104l42 29m-42-29l-22 31m22-31l-39-27m39 27l20-28m150 18l13 36m-13-36l-25-4m25 4l22-26",
  selectedEdges: "M322 168l-37 57m37-57l-127-53",
  dots: [
    { x: 228.5, y: 121.5, size: 7, color: "#7E92CE", blurA: 2, blurB: 6 },
    { x: 202.5, y: 155.5, size: 9, color: "#5F76B8", blurA: 3, blurB: 8 },
    { x: 149.5, y: 149.5, size: 11, color: "#9AACE4", blurA: 4, blurB: 10 },
    { x: 149.5, y: 100.5, size: 7, color: "#7E92CE", blurA: 2, blurB: 6 },
    { x: 177.5, y: 60.5, size: 9, color: "#5F76B8", blurA: 3, blurB: 8 },
    { x: 217.5, y: 81.5, size: 11, color: "#9AACE4", blurA: 4, blurB: 10 },
    { x: 143.5, y: 286.5, size: 11, color: "#5F76B8", blurA: 4, blurB: 10 },
    { x: 93.5, y: 294.5, size: 7, color: "#9AACE4", blurA: 2, blurB: 6 },
    { x: 50.5, y: 268.5, size: 9, color: "#7E92CE", blurA: 3, blurB: 8 },
    { x: 68.5, y: 223.5, size: 11, color: "#5F76B8", blurA: 4, blurB: 10 },
    { x: 110.5, y: 203.5, size: 7, color: "#9AACE4", blurA: 2, blurB: 6 },
    { x: 155.5, y: 230.5, size: 9, color: "#7E92CE", blurA: 3, blurB: 8 },
    { x: 328.5, y: 220.5, size: 9, color: "#9AACE4", blurA: 3, blurB: 8 },
    { x: 297.5, y: 273.5, size: 11, color: "#7E92CE", blurA: 4, blurB: 10 },
    { x: 245.5, y: 247.5, size: 7, color: "#5F76B8", blurA: 2, blurB: 6 },
    { x: 237.5, y: 189.5, size: 9, color: "#9AACE4", blurA: 3, blurB: 8 },
    { x: 291.5, y: 181.5, size: 11, color: "#7E92CE", blurA: 4, blurB: 10 },
    { x: 106.5, y: 426.5, size: 11, color: "#9AACE4", blurA: 4, blurB: 10 },
    { x: 50.5, y: 456.5, size: 7, color: "#7E92CE", blurA: 2, blurB: 6 },
    { x: 36.5, y: 394.5, size: 9, color: "#5F76B8", blurA: 3, blurB: 8 },
    { x: 88.5, y: 367.5, size: 11, color: "#9AACE4", blurA: 4, blurB: 10 },
    { x: 300.5, y: 448.5, size: 11, color: "#5F76B8", blurA: 4, blurB: 10 },
    { x: 244.5, y: 447.5, size: 7, color: "#9AACE4", blurA: 2, blurB: 6 },
    { x: 249.5, y: 376.5, size: 9, color: "#7E92CE", blurA: 3, blurB: 8 },
    { x: 313.5, y: 395.5, size: 11, color: "#5F76B8", blurA: 4, blurB: 10 },
    { x: 186.5, y: 528.5, size: 11, color: "#7E92CE", blurA: 4, blurB: 10 },
    { x: 124.5, y: 532.5, size: 7, color: "#5F76B8", blurA: 2, blurB: 6 },
    { x: 106.5, y: 473.5, size: 9, color: "#9AACE4", blurA: 3, blurB: 8 },
    { x: 164.5, y: 471.5, size: 11, color: "#7E92CE", blurA: 4, blurB: 10 },
    { x: 327.5, y: 525.5, size: 11, color: "#9AACE4", blurA: 4, blurB: 10 },
    { x: 291.5, y: 487.5, size: 7, color: "#7E92CE", blurA: 2, blurB: 6 },
    { x: 337.5, y: 464.5, size: 9, color: "#5F76B8", blurA: 3, blurB: 8 },
  ] satisfies DotSpec[],
  hubs: [
    { x: 190, y: 110, size: 10, radius: 2, dark: true, label: "index", labelX: 204, labelY: 99 },
    {
      x: 100,
      y: 250,
      size: 10,
      radius: 2,
      dark: true,
      label: "overview",
      labelX: 114,
      labelY: 239,
    },
    { x: 281, y: 221, size: 8, radius: 2, label: "specs/", labelX: 294, labelY: 209 },
    { x: 71, y: 411, size: 8, radius: 2 },
    { x: 281, y: 421, size: 8, radius: 2 },
    { x: 145, y: 500, size: 10, radius: 2, dark: true, label: "log", labelX: 159, labelY: 489 },
    { x: 316, y: 491, size: 8, radius: 2 },
  ] satisfies HubSpec[],
  selectedRing: { x: 312, y: 158, size: 20 },
  selectedDot: { x: 316.5, y: 162.5, size: 11 },
  twinkles: [
    { x: 40, y: 80, size: 4 },
    { x: 360, y: 60, size: 4 },
    { x: 30, y: 330, size: 4 },
    { x: 368, y: 330, size: 4 },
    { x: 55, y: 595, size: 4 },
  ],
}

export type DocRow = {
  id: string
  prefix?: string
  name: string
  summary: string
  links: number
  updated: string
  author: string
  dark?: boolean
  highlighted?: boolean
}

/** 04 — 리스트 행 (디자인 순서 그대로) */
export const DOC_ROWS: DocRow[] = [
  {
    id: "stop-gate",
    prefix: "specs/",
    name: "stop-gate.md",
    summary: "Stop 게이트 판정 규칙",
    links: 4,
    updated: "2시간 전",
    author: "SY",
    highlighted: true,
  },
  {
    id: "log",
    name: "log.md",
    summary: "append-only 활동 이력",
    links: 2,
    updated: "2시간 전",
    author: "SY",
    dark: true,
  },
  {
    id: "index",
    name: "index.md",
    summary: "전 페이지 카탈로그 · 매 ingest 갱신",
    links: 12,
    updated: "2시간 전",
    author: "SY",
    dark: true,
  },
  {
    id: "ingest-pipeline",
    prefix: "specs/",
    name: "ingest-pipeline.md",
    summary: "ingest 처리 파이프라인",
    links: 4,
    updated: "5시간 전",
    author: "MJ",
  },
  {
    id: "overview",
    name: "overview.md",
    summary: "프로젝트 개요 · 세션 주입 본체",
    links: 6,
    updated: "어제",
    author: "MJ",
    dark: true,
  },
  {
    id: "mcp-proxy",
    prefix: "specs/",
    name: "mcp-proxy.md",
    summary: "stdio 프록시 · 도구 3종",
    links: 3,
    updated: "어제",
    author: "SY",
  },
  {
    id: "llm-engine",
    prefix: "architecture/",
    name: "llm-engine.md",
    summary: "4종 에이전트 루프",
    links: 3,
    updated: "2일 전",
    author: "DK",
  },
  {
    id: "query-engine",
    prefix: "specs/",
    name: "query-engine.md",
    summary: "인용 포함 질의 응답",
    links: 2,
    updated: "2일 전",
    author: "DK",
  },
  {
    id: "git-sync",
    prefix: "architecture/",
    name: "git-sync.md",
    summary: "브랜치 미러링 · lazy 전파",
    links: 2,
    updated: "3일 전",
    author: "MJ",
  },
  {
    id: "adr-002",
    prefix: "decisions/",
    name: "adr-002-hard-gate.md",
    summary: "spec 무결성 > 가용성",
    links: 2,
    updated: "4일 전",
    author: "SY",
  },
  {
    id: "adr-001",
    prefix: "decisions/",
    name: "adr-001-bare-git.md",
    summary: "wiki SoT = bare git repo",
    links: 2,
    updated: "5일 전",
    author: "DK",
  },
  {
    id: "progress",
    name: "progress.md",
    summary: "마일스톤 진행 현황",
    links: 1,
    updated: "5일 전",
    author: "MJ",
    dark: true,
  },
]

export type MobileDocRow = {
  id: string
  name: string
  summary: string
  time: string
  dark?: boolean
}

/** M04 — 모바일 리스트 행 */
export const MOBILE_DOC_ROWS: MobileDocRow[] = [
  { id: "stop-gate", name: "stop-gate.md", summary: "Stop 게이트 판정 규칙", time: "2시간 전" },
  { id: "log", name: "log.md", summary: "append-only 활동 이력", time: "2시간 전", dark: true },
  { id: "index", name: "index.md", summary: "전 페이지 카탈로그", time: "2시간 전", dark: true },
  {
    id: "ingest-pipeline",
    name: "ingest-pipeline.md",
    summary: "ingest 처리 파이프라인",
    time: "5시간 전",
  },
  {
    id: "overview",
    name: "overview.md",
    summary: "프로젝트 개요 · 주입 본체",
    time: "어제",
    dark: true,
  },
  { id: "mcp-proxy", name: "mcp-proxy.md", summary: "stdio 프록시 · 도구 3종", time: "어제" },
  { id: "llm-engine", name: "llm-engine.md", summary: "4종 에이전트 루프", time: "2일 전" },
  { id: "query-engine", name: "query-engine.md", summary: "인용 포함 질의 응답", time: "2일 전" },
  { id: "adr-002", name: "adr-002-hard-gate.md", summary: "spec 무결성 > 가용성", time: "4일 전" },
]
