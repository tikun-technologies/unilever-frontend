import type { AnalysisFilters, AnalysisReport, AnalysisRow } from "@/lib/analysis-engine/types"
import type { StudyAnalysisSettings } from "@/lib/api/ResponseAPI"
import { runOfflineAnalysis, type OfflineAnalysisSource } from "@/lib/export/offlineAnalysis"
import { unpackRows } from "@/lib/export/packRows"

declare const __ANALYSIS_WORKER_SOURCE__: string | undefined

type Pending = {
  resolve: (report: AnalysisReport) => void
  reject: (error: Error) => void
  filters: AnalysisFilters | null
  settings: StudyAnalysisSettings
}

export interface OfflineAnalysisClient {
  run(filters: AnalysisFilters | null, settings: StudyAnalysisSettings): Promise<AnalysisReport>
  /** Response rows on this page, unpacked the first time something needs them. */
  rows(): AnalysisRow[]
  dispose(): void
}

function workerSource(): string | null {
  return typeof __ANALYSIS_WORKER_SOURCE__ === "string" && __ANALYSIS_WORKER_SOURCE__ ? __ANALYSIS_WORKER_SOURCE__ : null
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 50))
}

/** Runs the analysis in a background worker so the page keeps responding; falls back to the page thread. */
export function createOfflineAnalysisClient(source: OfflineAnalysisSource): OfflineAnalysisClient {
  let cachedRows: AnalysisRow[] | null = source.packedRows ? null : source.rows
  const rows = () => {
    if (!cachedRows) cachedRows = source.packedRows ? unpackRows(source.packedRows) : source.rows
    return cachedRows
  }

  const runHere = async (filters: AnalysisFilters | null, settings: StudyAnalysisSettings) => {
    await nextFrame()
    return runOfflineAnalysis({ study: source.study, rows: rows(), settings }, filters)
  }

  let worker: Worker | null = null
  let workerUrl: string | null = null
  const pending = new Map<number, Pending>()
  let sequence = 0

  const failOver = () => {
    worker?.terminate()
    worker = null
    const waiting = [...pending.values()]
    pending.clear()
    for (const job of waiting) runHere(job.filters, job.settings).then(job.resolve, job.reject)
  }

  const code = workerSource()
  if (code && typeof Worker !== "undefined") {
    try {
      workerUrl = URL.createObjectURL(new Blob([code], { type: "text/javascript" }))
      worker = new Worker(workerUrl)
      worker.onmessage = (event: MessageEvent<{ id: number; report?: AnalysisReport; error?: string }>) => {
        const job = pending.get(event.data.id)
        if (!job) return
        pending.delete(event.data.id)
        if (event.data.error) job.reject(new Error(event.data.error))
        else job.resolve(event.data.report as AnalysisReport)
      }
      worker.onerror = (event) => {
        event.preventDefault()
        failOver()
      }
      worker.postMessage({
        type: "init",
        study: source.study,
        packedRows: source.packedRows,
        rows: source.packedRows ? undefined : source.rows,
      })
    } catch {
      worker = null
    }
  }

  return {
    rows,
    run(filters, settings) {
      if (!worker) return runHere(filters, settings)
      sequence += 1
      const id = sequence
      return new Promise<AnalysisReport>((resolve, reject) => {
        pending.set(id, { resolve, reject, filters, settings })
        worker?.postMessage({ type: "run", id, filters, settings })
      })
    },
    dispose() {
      worker?.terminate()
      worker = null
      if (workerUrl) URL.revokeObjectURL(workerUrl)
    },
  }
}
