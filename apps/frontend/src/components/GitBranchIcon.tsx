import type { SVGProps } from "react"

/**
 * 디자인 정본(specraft-ui.pen, Pencil 내장 lucide)의 git-branch 글리프.
 * lucide-react 1.x에서 git-branch가 리디자인되어(단일 곡선 패스) 디자인과 모양이 달라졌으므로
 * 구버전 path(직선 줄기 + 별도 arc)를 고정해 사용한다.
 */
export function GitBranchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <line x1="6" x2="6" y1="3" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  )
}
