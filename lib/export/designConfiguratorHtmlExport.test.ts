import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { exportDesignConfiguratorHtml } from "@/lib/export/designConfiguratorHtmlExport"
import { getFullStudyAnalysisJson, getSavedFilterReports, getStudyOfflineAnalysisSource } from "@/lib/api/ResponseAPI"
import { buildDesignConfiguratorPayload } from "@/lib/export/buildDesignConfiguratorPayload"
import { packRows, unpackRows } from "@/lib/export/packRows"
import type { OfflineAnalysisSource } from "@/lib/export/offlineAnalysis"

vi.mock("@/lib/api/ResponseAPI", () => ({
  getStudyOfflineAnalysisSource: vi.fn(), getSavedFilterReports: vi.fn(), getFullStudyAnalysisJson: vi.fn(),
}))
vi.mock("@/lib/export/buildDesignConfiguratorPayload", () => ({ buildDesignConfiguratorPayload: vi.fn() }))

const input = {
  studyId: "study-1", studyTitle: "Dove", studyType: "grid",
  analysisData: { dashboard_summary: { totalResponses: 2 }, RawData: [{ unnecessary: "large" }] },
  appliedFilters: { genders: ["Female"] },
}
const settings = { top: { hundred: [5], zero: [1] }, bottom: { hundred: [1], zero: [5] }, regression: { include_intercept: true }, exclude_constant_raters: false }
const source: OfflineAnalysisSource = {
  study: { title: "Dove", study_type: "grid" }, rows: [],
  packedRows: packRows([{ Panelist: "p1", Gender: "Female", Rating: 5 }, { Panelist: "p2", Gender: "Male", Rating: 2 }]),
  settings, settingsSnapshot: { study_id: "study-1", settings, defaults: settings, is_default: true, max_rating: 5 },
  classificationQuestions: [],
  pptReport: { format: "reportgen-v1", sha256: "template-hash", files: { "build.py": "c291cmNl" } },
}
let downloadedBlob: Blob | undefined
const click = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  downloadedBlob = undefined
  vi.mocked(getStudyOfflineAnalysisSource).mockResolvedValue(source)
  vi.mocked(getSavedFilterReports).mockResolvedValue([])
  vi.mocked(buildDesignConfiguratorPayload).mockResolvedValue({
    ...input, exportedAt: "2026-11-01T00:00:00Z", savedDesigns: { configurator: [], input: [] },
  })
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(url.endsWith(".json") ? '{"version":"0.29.0","files":{}}' : "/* export asset */")))
  vi.stubGlobal("document", { createElement: () => ({ click }), body: { appendChild: vi.fn(), removeChild: vi.fn() } })
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => { downloadedBlob = blob as Blob; return "blob:export" })
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
})

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

it("downloads the current report, packed unfiltered data, settings and active filters without requesting full analysis", async () => {
  const stages = vi.fn()
  const result = await exportDesignConfiguratorHtml({ ...input, onStageChange: stages })
  expect(result).toEqual({ fileName: "dove.html", missingImages: 0 })
  expect(click).toHaveBeenCalledOnce()
  expect(getFullStudyAnalysisJson).not.toHaveBeenCalled()
  const html = await downloadedBlob!.text()
  const data = JSON.parse(html.match(/<script type="application\/json" id="export-data">([\s\S]*?)<\/script>/)![1])
  expect(data.analysisData).toEqual({ dashboard_summary: { totalResponses: 2 } })
  expect(data.appliedFilters).toEqual(input.appliedFilters)
  expect(data.offline.settings).toEqual(settings)
  expect(data.offline.rows).toEqual([])
  expect(unpackRows(data.offline.packedRows)).toHaveLength(2)
  expect(data.offline.pptExport).toBeUndefined()
  expect(data.offline.pptExportToken).toBeUndefined()
  expect(data.offline.pptReport.sha256).toBe("template-hash")
  expect(html).toContain('id="appeal-ppt-runtime"')
  expect(stages.mock.calls.flat()).toEqual(["preparing", "embedding", "generating", "done"])
})

it("reports a stalled preparation request instead of leaving the export pending", async () => {
  vi.useFakeTimers()
  vi.mocked(getStudyOfflineAnalysisSource).mockReturnValue(new Promise(() => {}))
  const pending = exportDesignConfiguratorHtml(input)
  const rejection = expect(pending).rejects.toThrow("server took too long")
  await vi.advanceTimersByTimeAsync(120_001)
  await rejection
  expect(click).not.toHaveBeenCalled()
})

it("explains request timeouts without showing the browser's signal error", async () => {
  vi.mocked(getStudyOfflineAnalysisSource).mockRejectedValue(Object.assign(new Error("signal timed out"), { name: "TimeoutError" }))
  await expect(exportDesignConfiguratorHtml(input)).rejects.toThrow("server took too long to prepare the export")
  expect(click).not.toHaveBeenCalled()
})
