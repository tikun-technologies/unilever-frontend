"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, BarChart3, ChevronDown, Download, Filter, LayoutDashboard, Presentation, Settings2, Sparkles, X } from "lucide-react"
import { AnalyticsDesignConfigurator } from "@/app/home/study/[id]/analytics/components/AnalyticsDesignConfigurator"
import { AnalyticsGraph } from "@/app/home/study/[id]/analytics/components/AnalyticsGraph"
import { AnalyticsHeatmap } from "@/app/home/study/[id]/analytics/components/AnalyticsHeatmap"
import { AnalyticsKPICards } from "@/app/home/study/[id]/analytics/components/AnalyticsKPICards"
import { AnalyticsPersonaBlueprints } from "@/app/home/study/[id]/analytics/components/AnalyticsPersonaBlueprints"
import { AnalyticsPieCharts } from "@/app/home/study/[id]/analytics/components/AnalyticsPieCharts"
import { AnalyticsResponseTimeSection } from "@/app/home/study/[id]/analytics/components/AnalyticsResponseTimeSection"
import { AnalyticsTable } from "@/app/home/study/[id]/analytics/components/AnalyticsTable"
import { AnalyticsAdvancedFilterModal } from "@/app/home/study/[id]/analytics/components/AnalyticsAdvancedFilterModal"
import { AnalyticsPrelimCohortModal } from "@/app/home/study/[id]/analytics/components/AnalyticsPrelimCohortModal"
import { AnalyticsSavedReportsSidebar } from "@/app/home/study/[id]/analytics/components/AnalyticsSavedReportsSidebar"
import { AnalyticsSettingsModal } from "@/app/home/study/[id]/analytics/components/AnalyticsSettingsModal"
import { AnalyticsToolbar } from "@/app/home/study/[id]/analytics/components/AnalyticsToolbar"
import { AnalyticsTopBottomPerformers } from "@/app/home/study/[id]/analytics/components/AnalyticsTopBottomPerformers"
import { BrandLogo } from "@/components/brand/BrandLogo"
import type { ClassificationCohortResponse, SavedFilterReport, StudyAnalysisSettings, StudyFilterPayload } from "@/lib/api/ResponseAPI"
import type { DesignCategoryPayload } from "@/lib/api/StudyAPI"
import {
  downloadTextFile,
  localClassificationCohort,
  rowsToCsv,
  type OfflineAnalysisSource,
} from "@/lib/export/offlineAnalysis"
import { createOfflineAnalysisClient, type OfflineAnalysisClient } from "@/lib/export/offlineAnalysisClient"
import { buildOfflineAppealPpt, buildOfflineCombinationPpt, disposeOfflinePpt, triggerOfflineBlobDownload } from "@/lib/export/offlineAppealPpt"
import { filterRows, normalizeFilters } from "@/lib/analysis-engine/rows"
import { countAppliedFilters, hasAnyFilterSelection, isEmptyFilterResponse } from "@/lib/utils/filterAnalysisMerge"
import type { LocalSavedDesignsStore } from "@/lib/export/savedDesignLocalStorage"
import type { ApiDesignConstraint } from "@/lib/utils/designConstraintsStorage"
import { listAppliedFilterChips } from "@/lib/utils/filterAnalysisMerge"

export interface ExportConfiguratorPayload {
  studyId: string
  studyTitle: string
  studyType: string
  exportedAt: string
  preparedBy?: string
  analysisData: unknown
  designConstraints?: ApiDesignConstraint[]
  studyLayers?: any[]
  savedDesigns: LocalSavedDesignsStore
  designCategories?: DesignCategoryPayload[]
  appliedFilters?: StudyFilterPayload["filters"] | null
  offline?: OfflineAnalysisSource | null
  savedReports?: SavedFilterReport[]
}

type AnalyticsView = "overview" | "configurator" | "detail"

function studyTypeLabel(studyType: string): string {
  if (studyType === "grid") return "Grid Study"
  if (studyType === "video") return "Video Study"
  if (studyType === "hybrid") return "Hybrid Study"
  if (studyType === "text") return "Text Study"
  return "Layer Study"
}

export function ExportConfiguratorRoot({ payload }: { payload: ExportConfiguratorPayload }) {
  const exportStorageId = `${payload.studyId}:export:${payload.exportedAt}`
  const studyType = (payload.studyType || "text").toLowerCase()
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const offline = payload.offline ?? null

  const [analyticsView, setAnalyticsView] = useState<AnalyticsView>("overview")
  const [activeView, setActiveView] = useState("table")
  const [activeMetric, setActiveMetric] = useState("Top Down")
  const [activeTab, setActiveTab] = useState("Overall")
  const [filters, setFilters] = useState<StudyFilterPayload["filters"] | null>(payload.appliedFilters ?? null)
  const [settings, setSettings] = useState<StudyAnalysisSettings | null>(offline?.settings ?? null)
  const [settingsSnapshot, setSettingsSnapshot] = useState(offline?.settingsSnapshot ?? null)
  const [savedReports, setSavedReports] = useState<SavedFilterReport[]>(payload.savedReports ?? [])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterError, setFilterError] = useState<string | null>(null)
  const [cohortOpen, setCohortOpen] = useState(false)
  const [cohortSelection, setCohortSelection] = useState<{ questionText: string; answer: string; baseSize?: number } | null>(null)
  const [cohortData, setCohortData] = useState<ClassificationCohortResponse | null>(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [exportNotice, setExportNotice] = useState<string | null>(null)
  const [exportingPpt, setExportingPpt] = useState(false)
  const [pptProgress, setPptProgress] = useState("Preparing PowerPoint…")
  const exportMenuRef = useRef<HTMLDivElement | null>(null)

  const [analysisData, setAnalysisData] = useState<any>(payload.analysisData ?? null)
  const [computing, setComputing] = useState(false)
  const clientRef = useRef<OfflineAnalysisClient | null>(null)
  const runIdRef = useRef(0)

  const getClient = () => {
    if (!offline) return null
    if (!clientRef.current) clientRef.current = createOfflineAnalysisClient(offline)
    return clientRef.current
  }

  /** Recompute in the background. Returns null when a newer request replaced this one. */
  const recompute = async (
    nextFilters: StudyFilterPayload["filters"] | null,
    nextSettings: StudyAnalysisSettings,
  ): Promise<any | null> => {
    const client = getClient()
    if (!client) return null
    runIdRef.current += 1
    const runId = runIdRef.current
    setComputing(true)
    try {
      const report = await client.run(hasAnyFilterSelection(nextFilters) ? nextFilters ?? null : null, nextSettings)
      return runId === runIdRef.current ? report : null
    } finally {
      if (runId === runIdRef.current) setComputing(false)
    }
  }

  useEffect(() => {
    const client = getClient()
    if (client && settings && !payload.analysisData) {
      void recompute(filters, settings).then((report) => {
        if (report) setAnalysisData(report)
      })
    }
    return () => {
      clientRef.current?.dispose()
      clientRef.current = null
      disposeOfflinePpt()
    }
    // Runs once: later changes go through applyFilters and the settings modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const appliedFilterChips = useMemo(
    () => listAppliedFilterChips(hasAnyFilterSelection(filters) ? filters : null),
    [filters],
  )
  const appliedFilters = appliedFilterChips.length > 0 ? filters : null
  const appliedFilterCount = countAppliedFilters(hasAnyFilterSelection(filters) ? filters : null)
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [analyticsView])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!exportMenuRef.current?.contains(event.target as Node)) setExportMenuOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

  const applyFilters = async (next: StudyFilterPayload["filters"] | null) => {
    setFilterOpen(false)
    if (!offline || !settings) return
    const active = hasAnyFilterSelection(next) ? next : null
    const report = await recompute(active, settings)
    if (!report) return
    if (active && isEmptyFilterResponse(report)) {
      const meta = report.filter_meta
      const message = meta && typeof meta === "object" && "error" in meta && typeof meta.error === "string"
        ? meta.error
        : "There is no response for the selected segment."
      setFilterError(message)
      return
    }
    setFilterError(null)
    setFilters(active)
    setAnalysisData(report)
  }

  const applySettings = async (next: StudyAnalysisSettings) => {
    const report = await recompute(filters, next)
    if (!report) return
    setSettings(next)
    setSettingsSnapshot((current) => (current ? { ...current, settings: next, is_default: false } : current))
    setAnalysisData(report)
  }

  const openCohort = (selection: { questionText: string; answer: string; baseSize?: number }, offset = 0) => {
    const client = getClient()
    if (!offline || !client) return
    setCohortSelection(selection)
    setCohortOpen(true)
    setCohortData(localClassificationCohort({
      rows: client.rows(),
      questions: offline.classificationQuestions,
      filters: hasAnyFilterSelection(filters) ? filters : null,
      questionText: selection.questionText,
      answer: selection.answer,
      limit: 120,
      offset,
    }))
  }

  const downloadFilteredCsv = (reportFilters: StudyFilterPayload["filters"] | null, filename: string) => {
    const client = getClient()
    if (!client) return
    const active = normalizeFilters(hasAnyFilterSelection(reportFilters) ? reportFilters : null)
    const rows = filterRows(client.rows(), active)
    downloadTextFile(filename, rowsToCsv(rows))
  }

  const downloadPpt = async () => {
    if (!analysisData || exportingPpt || computing) return
    setExportMenuOpen(false)
    setExportNotice(null)
    setExportingPpt(true)
    try {
      const { blob, filename } = await buildOfflineAppealPpt({
        analysis: analysisData,
        studyTitle: payload.studyTitle,
        studyType: payload.studyType,
        preparedBy: payload.preparedBy,
        reportSource: offline?.pptReport,
        onProgress: setPptProgress,
      })
      triggerOfflineBlobDownload(blob, filename)
    } catch (error) {
      setExportNotice((error as Error)?.message || "Failed to create the PowerPoint. Please try again.")
    } finally {
      setExportingPpt(false)
    }
  }

  const respondentBaseSize = useMemo(() => {
    const raw =
      analysisData?.["(T) Overall"]?.base_size ??
      analysisData?.["(T) Combined"]?.base_size ??
      analysisData?.filter_meta?.panelists_after_filter ??
      analysisData?.dashboard_summary?.uniquePanelists ??
      analysisData?.dashboard_summary?.totalRespondents
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [analysisData])

  const tabButtonClass = (active: boolean) =>
    `inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
      active ? "text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
    }`

  return (
    <>
    <div className="flex h-screen bg-gray-50">
      <div ref={scrollContainerRef} className="@container/analytics flex-1 overflow-auto min-w-0">
        <header className="border-b border-[rgba(209,223,235,1)] bg-white px-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex h-14 min-w-0 max-w-7xl items-center justify-between gap-2 sm:h-16 sm:gap-4">
            <BrandLogo className="text-lg sm:text-2xl" />
            {respondentBaseSize !== null && (
              <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1 text-xs font-semibold text-[#2674BA]">
                n={respondentBaseSize} respondents
              </span>
            )}
          </div>
        </header>

        <div className="relative z-10 overflow-visible text-white" style={{ backgroundColor: "#2674BA" }}>
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
            <nav className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-[10px] sm:mb-4 sm:text-xs md:text-sm">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="shrink-0 text-blue-200">Dashboard</span>
                <span className="shrink-0 text-blue-300 opacity-50">/</span>
                <span className="shrink-0 text-blue-200">Studies</span>
                <span className="shrink-0 text-blue-300 opacity-50">/</span>
                <span className="break-words font-medium text-white">{studyTypeLabel(studyType)} Analytics</span>
              </div>
              <button
                type="button"
                onClick={() => setExportNotice("Open this study on the live MindSurve site to go back to the study.")}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-blue-200 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Study</span>
              </button>
            </nav>

            <div className="flex flex-col gap-4 @5xl/analytics:flex-row @5xl/analytics:items-start @5xl/analytics:justify-between @5xl/analytics:gap-6">
              <h1 className="w-full min-w-0 text-lg font-bold leading-snug tracking-tight break-words @md/analytics:text-xl @3xl/analytics:text-2xl @5xl/analytics:flex-1 @5xl/analytics:text-3xl">
                {payload.studyTitle}
              </h1>
              <div className="grid w-full grid-cols-2 gap-2 @5xl/analytics:flex @5xl/analytics:w-auto @5xl/analytics:max-w-none @5xl/analytics:flex-wrap @5xl/analytics:items-center @5xl/analytics:justify-end @5xl/analytics:gap-3">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-all duration-200 hover:bg-white/10 active:scale-95 @md/analytics:text-sm @5xl/analytics:w-auto @5xl/analytics:gap-2 @5xl/analytics:px-4"
                  style={{ borderColor: "rgba(255, 255, 255, 0.3)", color: "#FFFFFF" }}
                >
                  <Settings2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">Analysis Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterError(null)
                    setFilterOpen(true)
                  }}
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-all duration-200 active:scale-95 @md/analytics:text-sm @5xl/analytics:w-auto @5xl/analytics:gap-2 @5xl/analytics:px-4"
                  style={
                    appliedFilterCount > 0
                      ? { backgroundColor: "#FFFFFF", borderColor: "#FFFFFF", color: "#2674BA" }
                      : { borderColor: "rgba(255, 255, 255, 0.3)", color: "#FFFFFF" }
                  }
                >
                  <Filter className="h-4 w-4 shrink-0" />
                  <span className="truncate">Filters</span>
                  {appliedFilterCount > 0 ? (
                    <span
                      className="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold"
                      style={{ backgroundColor: "#2674BA", color: "#FFFFFF" }}
                    >
                      {appliedFilterCount}
                    </span>
                  ) : null}
                </button>
                <div ref={exportMenuRef} className="relative z-30 col-span-2 w-full overflow-visible @5xl/analytics:col-span-1 @5xl/analytics:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setExportNotice(null)
                      setExportMenuOpen((open) => !open)
                    }}
                    className={`flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2.5 text-xs font-bold shadow-md ring-1 ring-white/30 transition-all duration-200 hover:shadow-lg active:scale-[0.98] @md/analytics:text-sm @5xl/analytics:w-auto @5xl/analytics:gap-2 @5xl/analytics:px-4 ${
                      exportMenuOpen ? "ring-2 ring-white/50 shadow-lg" : ""
                    }`}
                    style={{ color: "#2674BA" }}
                    aria-label="Export analytics"
                    aria-haspopup="menu"
                    aria-expanded={exportMenuOpen}
                  >
                    <Download className="h-4 w-4 shrink-0" />
                    <span>Export</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${exportMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {exportMenuOpen ? (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        role="menu"
                        className="absolute right-0 top-[calc(100%+0.5rem)] z-[200] w-80 overflow-visible rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-2xl"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => void downloadPpt()}
                          disabled={exportingPpt || computing || !analysisData}
                          className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2674BA]/10 text-[#2674BA]">
                            {exportingPpt ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2674BA] border-t-transparent" />
                            ) : (
                              <Presentation className="h-4 w-4" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-slate-900">
                              {exportingPpt ? "Exporting PPTX" : "Export PPTX"}
                            </span>
                            <span className="mt-0.5 block min-h-[2.5rem] text-xs leading-5 text-slate-500">
                              Download the same PowerPoint as the live website. Works offline.
                            </span>
                          </span>
                        </button>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {filterError ? (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <p className="font-medium">Filter could not be applied</p>
              <p className="mt-1 text-sm">{filterError}</p>
            </div>
          ) : null}

          {exportNotice ? (
            <div className="mb-6 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <p className="min-w-0 text-sm break-words">{exportNotice}</p>
              <button
                type="button"
                onClick={() => setExportNotice(null)}
                className="shrink-0 rounded-md p-1 text-amber-600 transition-colors hover:bg-amber-100 hover:text-amber-800"
                aria-label="Dismiss export notice"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {appliedFilterChips.length > 0 && (
            <div className="mb-6 flex flex-col gap-3 rounded-xl border border-[#2674BA]/25 bg-[#2674BA]/5 px-4 py-3 @3xl/analytics:flex-row @3xl/analytics:items-center @3xl/analytics:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {appliedFilterChips.map((chip, index) => (
                  <span
                    key={`${chip}-${index}`}
                    className="inline-flex items-center rounded-full border border-[#2674BA]/20 bg-white px-2.5 py-1 text-xs font-semibold text-[#2674BA]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterOpen(true)}
                  className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#2674BA]/25 bg-white px-3 py-2 text-sm font-semibold text-[#2674BA] hover:bg-[#2674BA]/5"
                >
                  <Filter className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterError(null)
                    void applyFilters(null)
                  }}
                  className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>
            </div>
          )}

          <div className="mb-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAnalyticsView("overview")}
              className={tabButtonClass(analyticsView === "overview")}
              style={analyticsView === "overview" ? { backgroundColor: "#2674BA" } : undefined}
            >
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsView("configurator")}
              className={tabButtonClass(analyticsView === "configurator")}
              style={analyticsView === "configurator" ? { backgroundColor: "#2674BA" } : undefined}
            >
              <Sparkles className="h-4 w-4" />
              Design Configurator
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsView("detail")}
              className={tabButtonClass(analyticsView === "detail")}
              style={analyticsView === "detail" ? { backgroundColor: "#2674BA" } : undefined}
            >
              <BarChart3 className="h-4 w-4" />
              Detail Analysis
            </button>
          </div>

          {exportingPpt ? (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-[#2674BA]" role="status">
              <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#2674BA] border-t-transparent" />
              <span>{pptProgress}</span>
            </div>
          ) : null}
          {computing ? (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-[#2674BA]" role="status">
              <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#2674BA] border-t-transparent" />
              <span>Recomputing analytics…</span>
            </div>
          ) : null}

          <div className={`min-h-[50vh] transition-opacity ${computing ? "opacity-60" : ""}`}>
            <AnimatePresence mode="wait">
              {analyticsView === "overview" && analysisData ? (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-0"
                >
                  <AnalyticsKPICards analysisData={analysisData} studyType={studyType} />
                  <AnalyticsResponseTimeSection analysisData={analysisData} />
                  <AnalyticsPieCharts analysisData={analysisData} />
                  <AnalyticsTopBottomPerformers analysisData={analysisData} studyType={studyType} />
                  <div className="mt-10">
                    <AnalyticsPersonaBlueprints
                      analysisData={analysisData}
                      studyType={studyType as "text" | "grid" | "layer" | "hybrid" | "video"}
                    />
                  </div>
                </motion.div>
              ) : null}

              {analyticsView === "detail" && analysisData ? (
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.25 }}
                >
                  <AnalyticsToolbar
                    activeView={activeView}
                    setActiveView={setActiveView}
                    activeMetric={activeMetric}
                    setActiveMetric={setActiveMetric}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                  />
                  {activeView === "table" ? (
                    <AnalyticsTable
                      analysisData={analysisData}
                      activeMetric={activeMetric}
                      activeTab={activeTab}
                      studyType={studyType}
                      appliedFilters={appliedFilters}
                      onPrelimColumnClick={offline ? (selection) => openCohort(selection, 0) : undefined}
                    />
                  ) : activeView === "heatmap" ? (
                    <AnalyticsHeatmap
                      analysisData={analysisData}
                      activeMetric={activeMetric}
                      activeTab={activeTab}
                      studyType={studyType}
                      appliedFilters={appliedFilters}
                      onPrelimColumnClick={offline ? (selection) => openCohort(selection, 0) : undefined}
                    />
                  ) : (
                    <AnalyticsGraph
                      analysisData={analysisData}
                      activeMetric={activeMetric}
                      activeTab={activeTab}
                      studyType={studyType}
                      appliedFilters={appliedFilters}
                      onPrelimColumnClick={offline ? (selection) => openCohort(selection, 0) : undefined}
                    />
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className={analyticsView !== "configurator" ? "hidden" : undefined}>
              <AnalyticsDesignConfigurator
                analysisData={analysisData}
                classificationQuestions={offline?.classificationQuestions}
                studyId={exportStorageId}
                studyType={studyType}
                designConstraints={payload.designConstraints || []}
                studyLayers={payload.studyLayers || []}
                persistence="local"
                initialSavedDesigns={payload.savedDesigns}
                initialDesignCategories={payload.designCategories || []}
                onDownloadCategoryLocal={async (category) => {
                  const { blob, filename } = await buildOfflineCombinationPpt({
                    category: category as unknown as Record<string, unknown>,
                    analysis: analysisData,
                    study: offline?.study,
                    studyId: payload.studyId,
                    studyTitle: payload.studyTitle,
                    studyType: payload.studyType,
                    preparedBy: payload.preparedBy,
                    reportSource: offline?.pptReport,
                    onProgress: setPptProgress,
                  })
                  triggerOfflineBlobDownload(blob, filename)
                }}
              />
            </div>
          </div>
        </main>
      </div>
      {offline ? (
        <AnalyticsSavedReportsSidebar
          reports={savedReports}
          activeFilters={appliedFilters}
          onSelectReport={(report) => applyFilters(report.filters)}
          onRename={async (reportId, name) => {
            setSavedReports((current) => current.map((report) => (report.id === reportId ? { ...report, name } : report)))
          }}
          onDelete={async (reportId) => {
            setSavedReports((current) => current.filter((report) => report.id !== reportId))
          }}
          onDownloadReport={(report) => downloadFilteredCsv(report.filters, `${report.name || "saved-report"}.csv`)}
        />
      ) : null}
    </div>
    {offline && settingsSnapshot ? (
      <>
        <AnalyticsSettingsModal
          studyId={payload.studyId}
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          offlineSnapshot={settingsSnapshot}
          onApplyOffline={(next) => {
            void applySettings(next)
          }}
          onOpenAdvancedFilter={() => {
            setSettingsOpen(false)
            setFilterOpen(true)
          }}
        />
        <AnalyticsAdvancedFilterModal
          studyId={payload.studyId}
          classificationQuestions={offline.classificationQuestions}
          initialFilters={filters}
          savedReports={savedReports}
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
          onRunAnalysis={applyFilters}
          onSaveAndRun={async (name, next) => {
            setSavedReports((current) => [
              {
                id: `local-${Date.now()}`,
                study_id: payload.studyId,
                name,
                filters: next ?? {},
                created_at: new Date().toISOString(),
              },
              ...current,
            ])
            await applyFilters(next)
          }}
          error={filterError}
        />
        <AnalyticsPrelimCohortModal
          isOpen={cohortOpen}
          onClose={() => {
            setCohortOpen(false)
            setCohortSelection(null)
            setCohortData(null)
          }}
          selection={cohortSelection}
          data={cohortData}
          isLoading={false}
          onLoadMore={() => {
            if (!cohortSelection || !cohortData?.meta.has_more) return
            const next = localClassificationCohort({
              rows: getClient()?.rows() ?? [],
              questions: offline.classificationQuestions,
              filters: hasAnyFilterSelection(filters) ? filters : null,
              questionText: cohortSelection.questionText,
              answer: cohortSelection.answer,
              limit: 120,
              offset: cohortData.respondents.length,
            })
            setCohortData({
              ...next,
              respondents: [...cohortData.respondents, ...next.respondents],
            })
          }}
        />
      </>
    ) : null}
    </>
  )
}
