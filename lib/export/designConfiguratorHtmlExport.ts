import {
  getStudyOfflineAnalysisSource,
  getSavedFilterReports,
} from "@/lib/api/ResponseAPI"
import {
  buildDesignConfiguratorPayload,
  DesignConfiguratorExportPayload,
} from "@/lib/export/buildDesignConfiguratorPayload"
import { packExportImages } from "@/lib/export/embedExportImages"
import { withExportTimeout } from "@/lib/export/withExportTimeout"
import type { ExportConfiguratorPayload } from "@/lib/export/ExportConfiguratorRoot"
import {
  classificationQuestionsForExport,
  type OfflineAnalysisSource,
} from "@/lib/export/offlineAnalysis"
import type { ApiDesignConstraint } from "@/lib/utils/designConstraintsStorage"

export type ExportHtmlStage = "preparing" | "embedding" | "generating" | "done"

function safeFileName(value: string, fallback = "study"): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 32))
}

function currentPreparedBy(): string | undefined {
  if (typeof window === "undefined") return undefined
  try {
    const raw = window.localStorage.getItem("user")
    if (!raw) return undefined
    const user = JSON.parse(raw) as { name?: unknown; email?: unknown }
    const name = typeof user.name === "string" ? user.name.trim() : ""
    const email = typeof user.email === "string" ? user.email.trim() : ""
    return [name, email].filter(Boolean).join(" | ") || undefined
  } catch {
    return undefined
  }
}

async function loadExportAssets(): Promise<{ bundle: string; css: string; pptRuntime: string }> {
  const signal = AbortSignal.timeout(30_000)
  const [bundleRes, cssRes, pptRes] = await Promise.all([
    fetch("/export-assets/configurator-bundle.js", { signal }),
    fetch("/export-assets/export-styles.css", { signal }),
    fetch("/export-assets/appeal-ppt-runtime.json", { signal }),
  ])

  if (!bundleRes.ok || !cssRes.ok || !pptRes.ok) {
    throw new Error(
      "Export assets are missing. Run npm run build:export-assets, then reload this page and try again."
    )
  }

  return {
    bundle: await bundleRes.text(),
    css: await cssRes.text(),
    pptRuntime: await pptRes.text(),
  }
}

function toExportConfiguratorPayload(
  payload: DesignConfiguratorExportPayload,
  offline: OfflineAnalysisSource | null,
  savedReports: ExportConfiguratorPayload["savedReports"],
  preparedBy?: string,
): ExportConfiguratorPayload {
  return {
    studyId: payload.studyId,
    studyTitle: payload.studyTitle,
    studyType: payload.studyType,
    exportedAt: payload.exportedAt,
    preparedBy,
    analysisData: payload.analysisData,
    designConstraints: payload.designConstraints || [],
    studyLayers: payload.studyLayers || [],
    savedDesigns: payload.savedDesigns,
    designCategories: payload.designCategories || [],
    appliedFilters: payload.appliedFilters ?? null,
    offline,
    savedReports: savedReports ?? [],
  }
}

export function generateDesignConfiguratorHtml(
  payload: DesignConfiguratorExportPayload,
  assets: { bundle: string; css: string; pptRuntime?: string },
  offline: OfflineAnalysisSource | null = null,
  savedReports: ExportConfiguratorPayload["savedReports"] = [],
  preparedBy?: string,
): string {
  const exportPayload = toExportConfiguratorPayload(payload, offline, savedReports, preparedBy)
  const json = JSON.stringify(exportPayload).replace(/</g, "\\u003c")
  const bundle = assets.bundle.replace(/<\/script/gi, "<\\/script")
  const title = escapeHtml(payload.studyTitle)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} - Analytics</title>
  <style>${assets.css}</style>
</head>
<body>
  <div id="export-root"></div>
  <script type="application/json" id="export-data">${json}</script>
  <script type="application/json" id="appeal-ppt-runtime">${(assets.pptRuntime || "{}").replace(/</g, "\\u003c")}</script>
  <script>window.process = window.process || { env: { NODE_ENV: "production" } };</script>
  <script>${bundle}</script>
</body>
</html>`
}

export async function exportDesignConfiguratorHtml(input: {
  studyId: string
  studyTitle: string
  studyType: string
  analysisData: any
  designConstraints?: ApiDesignConstraint[]
  studyLayers?: any[]
  appliedFilters?: DesignConfiguratorExportPayload["appliedFilters"]
  onStageChange?: (stage: ExportHtmlStage) => void
  onEmbedProgress?: (done: number, total: number) => void
}): Promise<{ fileName: string; missingImages: number }> {
  input.onStageChange?.("preparing")
  const [payload, assets, source, savedReports] = await withExportTimeout(Promise.all([
    buildDesignConfiguratorPayload(input),
    loadExportAssets(),
    getStudyOfflineAnalysisSource(input.studyId),
    getSavedFilterReports(input.studyId).catch(() => []),
  ]), 120_000, "The server took too long to prepare the export. Please try again.").catch((error: unknown) => {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("The server took too long to prepare the export. Please try again.")
    }
    throw error
  })

  if (source?.packedRows?.format !== "columns-v1") {
    throw new Error("This study did not include response rows, so the file cannot recompute filters.")
  }
  if (source.pptReport?.format !== "reportgen-v1") {
    throw new Error("The server needs the updated PowerPoint export code. Restart the backend, then export the HTML again.")
  }
  const offline: OfflineAnalysisSource = {
    ...source,
    classificationQuestions: classificationQuestionsForExport(
      source.classificationQuestions,
      source.study,
      [],
      source.packedRows,
    ),
  }

  input.onStageChange?.("embedding")
  await yieldToUi()
  const initialReport: Record<string, unknown> = { ...((payload.analysisData ?? {}) as Record<string, unknown>) }
  delete initialReport.RawData
  const packed = await packExportImages(
    {
      analysisData: payload.analysisData ? initialReport : null,
      study: offline.study,
      studyLayers: payload.studyLayers || [],
      savedDesigns: payload.savedDesigns,
      designCategories: payload.designCategories || [],
    },
    input.onEmbedProgress,
    source.pptReport.artwork,
  )
  const exportPayload: DesignConfiguratorExportPayload = {
    ...payload,
    analysisData: packed.value.analysisData,
    studyLayers: packed.value.studyLayers,
    savedDesigns: packed.value.savedDesigns,
    designCategories: packed.value.designCategories,
  }
  await yieldToUi()
  const embeddedOffline: OfflineAnalysisSource = {
    ...offline,
    rows: [],
    study: packed.value.study,
    images: packed.images,
    pptReport: { ...offline.pptReport!, artwork: undefined },
  }

  input.onStageChange?.("generating")
  await yieldToUi()
  const html = generateDesignConfiguratorHtml(exportPayload, assets, embeddedOffline, savedReports, currentPreparedBy())
  const fileName = `${safeFileName(input.studyTitle)}.html`
  const blob = new Blob([html], { type: "text/html;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)

  input.onStageChange?.("done")
  return { fileName, missingImages: packed.failed.length }
}
