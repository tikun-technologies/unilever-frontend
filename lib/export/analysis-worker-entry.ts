import type { AnalysisFilters, AnalysisRow, AnalysisStudy } from "@/lib/analysis-engine/types"
import type { StudyAnalysisSettings } from "@/lib/api/ResponseAPI"
import { runOfflineAnalysis } from "@/lib/export/offlineAnalysis"
import { unpackRows, type PackedRows } from "@/lib/export/packRows"

type WorkerMessage =
  | { type: "init"; study: AnalysisStudy; packedRows?: PackedRows; rows?: AnalysisRow[] }
  | { type: "run"; id: number; filters: AnalysisFilters | null; settings: StudyAnalysisSettings }

let study: AnalysisStudy | null = null
let rows: AnalysisRow[] = []

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data
  if (message.type === "init") {
    study = message.study
    rows = message.packedRows ? unpackRows(message.packedRows) : message.rows ?? []
    return
  }
  try {
    if (!study) throw new Error("Analysis data is not loaded yet.")
    const report = runOfflineAnalysis({ study, rows, settings: message.settings }, message.filters)
    self.postMessage({ id: message.id, report })
  } catch (error) {
    self.postMessage({ id: message.id, error: error instanceof Error ? error.message : String(error) })
  }
}
