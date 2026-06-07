import { Cpu } from "lucide-react"
import { useEffect, useState } from "react"
import { useSpecraft } from "./api.js"

export function ModelsPanel() {
  const { client } = useSpecraft()
  const [ingestModel, setIngestModel] = useState("")
  const [queryModel, setQueryModel] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    void client.getAdminSettings().then((response) => {
      if (active) {
        setIngestModel(response.model_ingest ?? "")
        setQueryModel(response.model_query ?? "")
      }
    })
    return () => {
      active = false
    }
  }, [client])

  async function save(): Promise<void> {
    await client.updateAdminSettings({
      model_ingest: nonEmptyValue(ingestModel),
      model_query: nonEmptyValue(queryModel),
    })
    setSaved(true)
  }

  return (
    <section className="flex max-w-[760px] flex-col gap-4 rounded-lg bg-surface p-6">
      <div className="flex items-center gap-2">
        <Cpu className="size-4" />
        <span className="pen-text text-[16px] font-semibold">Models</span>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="pen-text text-[12.5px] font-medium">Ingest model</span>
        <input
          value={ingestModel}
          onChange={(event) => setIngestModel(event.currentTarget.value)}
          className="pen-text h-10 rounded-sm border-none bg-bg px-3 font-mono text-[12.5px] outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="pen-text text-[12.5px] font-medium">Query model</span>
        <input
          value={queryModel}
          onChange={(event) => setQueryModel(event.currentTarget.value)}
          className="pen-text h-10 rounded-sm border-none bg-bg px-3 font-mono text-[12.5px] outline-none"
        />
      </label>
      <button type="button" onClick={save} className="w-fit rounded-sm bg-accent px-4 py-2">
        <span className="pen-text text-[14px] text-white">Save models</span>
      </button>
      {saved && <span className="pen-text text-[13px] text-success">Models saved from API</span>}
    </section>
  )
}

function nonEmptyValue(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}
