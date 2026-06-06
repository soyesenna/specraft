import type { Citation, QueryResponse } from "@specraft/shared"
import { ArrowUp, FileText, Sparkles } from "lucide-react"
import { useState } from "react"
import { useSpecraft } from "./api.js"
import { LiveShell } from "./LiveShell.js"

const branch = "dev"
const commitHash = "frontend-live"

function citationLabel(citation: Citation): string {
  return `${citation.path}#${citation.section}`
}

export function QueryPage() {
  const { client } = useSpecraft()
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<QueryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const trimmedQuestion = question.trim()

  async function submit(): Promise<void> {
    if (trimmedQuestion.length === 0) {
      return
    }
    setError(null)
    try {
      const response = await client.query({
        branch,
        commit_hash: commitHash,
        question: trimmedQuestion,
      })
      setAnswer(response)
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Query failed")
    }
  }

  return (
    <LiveShell title="Query">
      <div className="flex min-h-0 flex-1 flex-col items-center px-7 pb-7">
        <div className="flex h-full w-full max-w-[760px] flex-col gap-5">
          <div className="flex flex-1 flex-col justify-end gap-4">
            {answer && (
              <article className="flex flex-col gap-3.5 rounded-lg bg-surface px-[26px] py-[22px] shadow-[0_2px_12px_#0000000F]">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-3.5 text-accent" />
                  <span className="pen-text text-[12.5px] font-semibold">specraft</span>
                  <span className="pen-text text-[12px] text-ink-tertiary">
                    query_id {answer.query_id}
                  </span>
                </div>
                <p className="pen-text m-0 text-[14.5px] leading-[1.7] tracking-[-0.22px] text-ink-secondary">
                  {answer.answer}
                </p>
                <div className="flex flex-wrap gap-2">
                  {answer.citations.map((citation) => (
                    <span
                      key={citationLabel(citation)}
                      className="flex items-center gap-1.5 rounded-[6px] bg-bg px-2.5 py-[5px]"
                    >
                      <FileText className="size-[11px] text-ink-tertiary" />
                      <span className="pen-text text-[12px] tracking-[-0.12px] text-link">
                        {citationLabel(citation)}
                      </span>
                    </span>
                  ))}
                </div>
              </article>
            )}
            {error && <span className="pen-text text-[13px] text-danger">{error}</span>}
          </div>
          <div className="flex items-center gap-3 rounded-pill bg-surface py-2 pr-2 pl-5 shadow-[3px_5px_30px_#00000038]">
            <label className="sr-only" htmlFor="specraft-question">
              질문
            </label>
            <input
              id="specraft-question"
              value={question}
              onChange={(event) => setQuestion(event.currentTarget.value)}
              className="pen-text w-full border-none bg-transparent text-[14px] tracking-[-0.22px] outline-none"
              placeholder="이 프로젝트의 spec에 대해 무엇이든 물어보세요..."
            />
            <button
              type="button"
              disabled={trimmedQuestion.length === 0}
              onClick={submit}
              className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-accent disabled:bg-separator"
              aria-label="질문 전송"
            >
              <ArrowUp className="size-[15px] text-white" />
            </button>
          </div>
        </div>
      </div>
    </LiveShell>
  )
}
