import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { BranchRow } from "../components/BranchMenu.js"
import { useSpecraft } from "./api.js"

type BranchContextValue = {
  /** wiki_head_by_branch 키 + branch_locks 로 구성한 브랜치 메뉴 행 */
  readonly branches: BranchRow[]
  readonly selectedBranch: string
  readonly setBranch: (branch: string) => void
  /** listConflicts 의 state==='open' 개수 (Sidebar 배지용, 0이면 숨김) */
  readonly openConflictCount: number
  /** 라우트 전환 시 상태 재로드 */
  readonly refresh: () => void
}

const BranchContext = createContext<BranchContextValue | null>(null)

function pickDefaultBranch(names: string[]): string {
  if (names.includes("dev")) {
    return "dev"
  }
  return names[0] ?? "dev"
}

export function BranchProvider({ children }: { readonly children: ReactNode }) {
  const { client, member, sessionChecked } = useSpecraft()
  const [branchNames, setBranchNames] = useState<string[]>([])
  const [lockedBranches, setLockedBranches] = useState<Set<string>>(new Set())
  const [resolvingBranches, setResolvingBranches] = useState<Set<string>>(new Set())
  const [openConflictCount, setOpenConflictCount] = useState(0)
  const [selectedBranch, setSelectedBranch] = useState("dev")
  const defaultAppliedRef = useRef(false)
  const [reloadToken, setReloadToken] = useState(0)

  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  useEffect(() => {
    if (!sessionChecked || !member) {
      return
    }
    // reloadToken 변경 시 재실행 트리거 (refresh())
    void reloadToken
    let active = true
    void Promise.all([client.status(), client.listConflicts()])
      .then(([status, conflictList]) => {
        if (!active) {
          return
        }
        const names = Object.keys(status.wiki_head_by_branch)
        const conflictBranchByState = new Map<string, "open" | "resolving">()
        for (const conflict of conflictList.conflicts) {
          if (conflict.state === "open" || conflict.state === "resolving") {
            conflictBranchByState.set(conflict.branch, conflict.state)
          }
        }
        const locked = new Set<string>()
        const resolving = new Set<string>()
        for (const lock of status.branch_locks) {
          const lockState = conflictBranchByState.get(lock.branch)
          if (lockState === "resolving") {
            resolving.add(lock.branch)
          } else {
            locked.add(lock.branch)
          }
        }
        for (const [branch, state] of conflictBranchByState) {
          if (state === "resolving") {
            resolving.add(branch)
          }
        }
        setBranchNames(names)
        setLockedBranches(locked)
        setResolvingBranches(resolving)
        setOpenConflictCount(
          conflictList.conflicts.filter((conflict) => conflict.state === "open").length,
        )
        if (!defaultAppliedRef.current && names.length > 0) {
          defaultAppliedRef.current = true
          setSelectedBranch(pickDefaultBranch(names))
        }
      })
      .catch(() => {
        // 상태 로드 실패 시 셸은 빈 브랜치 목록으로 동작 (정합성 기반 작업, 에러는 무시)
      })
    return () => {
      active = false
    }
  }, [client, member, sessionChecked, reloadToken])

  const branches = useMemo<BranchRow[]>(() => {
    return branchNames.map((name) => {
      let state: BranchRow["state"] = "normal"
      if (name === selectedBranch) {
        state = "selected"
      } else if (resolvingBranches.has(name)) {
        state = "resolving"
      } else if (lockedBranches.has(name)) {
        state = "locked"
      }
      return { name, state }
    })
  }, [branchNames, selectedBranch, resolvingBranches, lockedBranches])

  const value = useMemo<BranchContextValue>(
    () => ({
      branches,
      selectedBranch,
      setBranch: setSelectedBranch,
      openConflictCount,
      refresh,
    }),
    [branches, selectedBranch, openConflictCount, refresh],
  )

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
}

export function useBranch(): BranchContextValue {
  const context = useContext(BranchContext)
  if (!context) {
    throw new Error("useBranch must be used inside BranchProvider")
  }
  return context
}
