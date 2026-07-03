"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { DashboardHeader } from "@/app/home/components/dashboard-header"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { getStudyBasicDetails, StudyDetails } from "@/lib/api/StudyAPI"
import {
    createSavedFilterReport,
    deleteSavedFilterReport,
    downloadStudyResponsesCsv,
    getAnalyticsSession,
    getSavedFilterReports,
    postClassificationCohort,
    renameSavedFilterReport,
    resetActiveFilter,
    saveActiveFilter,
    type ClassificationCohortResponse,
    type SavedFilterReport,
    type StudyFilterPayload,
} from "@/lib/api/ResponseAPI"
import {
    describeAppliedFilters,
    hasAnyFilterSelection,
    isEmptyFilterResponse,
} from "@/lib/utils/filterAnalysisMerge"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, BarChart3, Download, Filter, LayoutDashboard, Settings2, Sparkles, X } from "lucide-react"
import { exportDesignConfiguratorHtml, ExportHtmlStage } from "@/lib/export/designConfiguratorHtmlExport"
import Link from "next/link"
import { AnalyticsToolbar } from "./components/AnalyticsToolbar"
import { AnalyticsTable } from "./components/AnalyticsTable"
import { AnalyticsHeatmap } from "./components/AnalyticsHeatmap"
import { AnalyticsGraph } from "./components/AnalyticsGraph"
import { AnalyticsKPICards } from "./components/AnalyticsKPICards"
import { AnalyticsResponseTimeSection } from "./components/AnalyticsResponseTimeSection"
import { AnalyticsPieCharts } from "./components/AnalyticsPieCharts"
import { AnalyticsTopBottomPerformers } from "./components/AnalyticsTopBottomPerformers"
import { AnalyticsFatiguePredictor } from "./components/AnalyticsFatiguePredictor"
import { AnalyticsPersonaBlueprints } from "./components/AnalyticsPersonaBlueprints"
import { AnalyticsDesignConfigurator } from "./components/AnalyticsDesignConfigurator"
import { AnalyticsSettingsModal } from "./components/AnalyticsSettingsModal"
import { AnalyticsAdvancedFilterModal } from "./components/AnalyticsAdvancedFilterModal"
import { AnalyticsPrelimCohortModal } from "./components/AnalyticsPrelimCohortModal"
import { AnalyticsSavedReportsSidebar } from "./components/AnalyticsSavedReportsSidebar"

export default function StudyAnalyticsPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const studyId = params.id as string
    const projId = searchParams.get('proj_id') || searchParams.get('projectId')
    const projectQuery = projId ? `?proj_id=${encodeURIComponent(projId)}` : ''
    const homeHref = `/home${projectQuery}`
    const studyHref = `/home/study/${studyId}${projectQuery}`

    const [study, setStudy] = useState<StudyDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [exporting, setExporting] = useState(false)
    const [exportStage, setExportStage] = useState(0)
    const [exportingHtml, setExportingHtml] = useState(false)
    const [exportHtmlStage, setExportHtmlStage] = useState<ExportHtmlStage>("preparing")
    const [analysisData, setAnalysisData] = useState<any>(null)
    const [fullAnalysisData, setFullAnalysisData] = useState<any>(null)
    const [analysisLoading, setAnalysisLoading] = useState(true)
    const [analysisError, setAnalysisError] = useState<string | null>(null)
    const [filterError, setFilterError] = useState<string | null>(null)
    const [activeFilters, setActiveFilters] = useState<StudyFilterPayload["filters"] | null>(null)
    const [isFilterActive, setIsFilterActive] = useState(false)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false)
    const [filterRunning, setFilterRunning] = useState(false)
    const [saveAndRunPending, setSaveAndRunPending] = useState(false)
    const [cohortOpen, setCohortOpen] = useState(false)
    const [cohortSelection, setCohortSelection] = useState<{ questionText: string; answer: string; baseSize?: number } | null>(null)
    const [cohortData, setCohortData] = useState<ClassificationCohortResponse | null>(null)
    const [cohortLoading, setCohortLoading] = useState(false)
    const [cohortLoadingMore, setCohortLoadingMore] = useState(false)
    const [cohortError, setCohortError] = useState<string | null>(null)
    const [savedReports, setSavedReports] = useState<SavedFilterReport[]>([])
    const [savedReportsLoading, setSavedReportsLoading] = useState(false)
    const [saveReportError, setSaveReportError] = useState<string | null>(null)
    const [applyingReportId, setApplyingReportId] = useState<string | null>(null)

    const loadSavedReports = async () => {
        if (!studyId) return
        setSavedReportsLoading(true)
        try {
            const rows = await getSavedFilterReports(studyId)
            setSavedReports(rows)
        } catch (e) {
            console.warn("Failed to load saved reports:", e)
        } finally {
            setSavedReportsLoading(false)
        }
    }

    const loadAnalysis = async () => {
        if (!studyId) return
        setAnalysisLoading(true)
        setAnalysisError(null)
        setFilterError(null)
        try {
            const session = await getAnalyticsSession(studyId)
            const data = session.analysis
            setAnalysisData(data)
            if (session.has_active_filter && session.active_filters) {
                setActiveFilters(session.active_filters)
                setIsFilterActive(true)
                setFullAnalysisData(null)
            } else {
                setFullAnalysisData(data)
                setActiveFilters(null)
                setIsFilterActive(false)
            }
        } catch (e) {
            console.warn("Failed to load analysis:", e)
            setAnalysisError((e as Error)?.message ?? "Failed to load analysis")
        } finally {
            setAnalysisLoading(false)
        }
    }

    const runFilteredAnalysis = async (filters: StudyFilterPayload["filters"]) => {
        if (!studyId) return

        setAdvancedFilterOpen(false)
        setFilterRunning(true)
        setAnalysisLoading(true)
        setFilterError(null)
        setAnalysisError(null)
        setSaveReportError(null)

        try {
            if (!hasAnyFilterSelection(filters)) {
                const reset = await resetActiveFilter(studyId)
                setAnalysisData(reset.analysis)
                setFullAnalysisData(reset.analysis)
                setActiveFilters(null)
                setIsFilterActive(false)
                return
            }

            const response = await saveActiveFilter(studyId, { filters: filters ?? {} })

            if (isEmptyFilterResponse(response.analysis)) {
                setFilterError(
                    (response.analysis?.filter_meta as any)?.error ?? "There is no response for the selected segment."
                )
                const reset = await resetActiveFilter(studyId)
                setAnalysisData(reset.analysis)
                setFullAnalysisData(reset.analysis)
                setActiveFilters(null)
                setIsFilterActive(false)
                return
            }

            setAnalysisData(response.analysis)
            setActiveFilters(response.filters ?? filters ?? {})
            setIsFilterActive(true)
            setFullAnalysisData(null)
        } catch (e) {
            setFilterError((e as Error)?.message ?? "Filter analysis failed")
            if (fullAnalysisData) {
                setAnalysisData(fullAnalysisData)
            }
            setActiveFilters(null)
            setIsFilterActive(false)
        } finally {
            setAnalysisLoading(false)
            setFilterRunning(false)
            setApplyingReportId(null)
        }
    }

    const saveAndRunFilteredAnalysis = async (
        name: string,
        filters: StudyFilterPayload["filters"]
    ) => {
        if (!studyId) return
        setSaveAndRunPending(true)
        setSaveReportError(null)
        try {
            await createSavedFilterReport(studyId, { name, filters: filters ?? {} })
            await loadSavedReports()
            await runFilteredAnalysis(filters)
        } catch (e) {
            const err = e as Error & { status?: number }
            setSaveReportError(err.message ?? "Failed to save report")
            if (err.status !== 409) {
                throw e
            }
        } finally {
            setSaveAndRunPending(false)
        }
    }

    const applySavedReport = async (report: SavedFilterReport) => {
        setApplyingReportId(report.id)
        await runFilteredAnalysis(report.filters)
    }

    const clearActiveFilter = async () => {
        if (!studyId) return
        setAnalysisLoading(true)
        setFilterError(null)
        try {
            const reset = await resetActiveFilter(studyId)
            setAnalysisData(reset.analysis)
            setFullAnalysisData(reset.analysis)
            setActiveFilters(null)
            setIsFilterActive(false)
        } catch (e) {
            setFilterError((e as Error)?.message ?? "Failed to reset filter")
        } finally {
            setAnalysisLoading(false)
        }
    }

    const loadClassificationCohort = async (
        selection: { questionText: string; answer: string; baseSize?: number },
        offset = 0,
        append = false
    ) => {
        if (!studyId) return

        if (append) {
            setCohortLoadingMore(true)
        } else {
            setCohortLoading(true)
            setCohortError(null)
        }

        try {
            const response = await postClassificationCohort(studyId, {
                filters: isFilterActive ? activeFilters ?? {} : {},
                question_text: selection.questionText,
                answer: selection.answer,
                limit: 120,
                offset,
            })

            setCohortData((prev) => {
                if (!append || !prev) return response
                return {
                    ...response,
                    respondents: [...(prev.respondents || []), ...(response.respondents || [])],
                }
            })
        } catch (e) {
            setCohortError((e as Error)?.message ?? "Failed to load cohort insights")
        } finally {
            setCohortLoading(false)
            setCohortLoadingMore(false)
        }
    }

    const handlePrelimColumnClick = (selection: { questionText: string; answer: string; baseSize?: number }) => {
        setCohortSelection(selection)
        setCohortData(null)
        setCohortError(null)
        setCohortOpen(true)
        void loadClassificationCohort(selection, 0, false)
    }

    const loadMoreCohort = () => {
        if (!cohortSelection || !cohortData || cohortLoadingMore || !cohortData.meta?.has_more) return
        void loadClassificationCohort(cohortSelection, cohortData.respondents.length, true)
    }

    useEffect(() => {
        if (!studyId) return
        loadStudyDetails()
    }, [studyId])

    useEffect(() => {
        if (!studyId) return
        void loadAnalysis()
        void loadSavedReports()
    }, [studyId])

    const loadStudyDetails = async () => {
        try {
            setLoading(true)
            setError(null)
            const studyData = await getStudyBasicDetails(studyId)
            setStudy(studyData)
        } catch (err: unknown) {
            console.error("Failed to load study details:", err)
            setError((err as Error)?.message || "Failed to load study details")
        } finally {
            setLoading(false)
        }
    }

    const buildHtmlExport = async () => {
        if (!study || !analysisData) return

        const exportTitle =
            study.title || analysisData?.["Information Block"]?.["Study Title"] || "Study Analytics"
        const exportStudyType =
            (study.study_type || analysisData?.["Information Block"]?.["Study Type"] || "text").toLowerCase()

        try {
            setExportingHtml(true)
            setExportHtmlStage("preparing")
            await exportDesignConfiguratorHtml({
                studyId,
                studyTitle: exportTitle,
                studyType: exportStudyType,
                analysisData,
                designConstraints: study.design_constraints || [],
                studyLayers: study.study_layers || [],
                onStageChange: setExportHtmlStage,
            })
        } catch (e) {
            console.error("Export HTML failed:", e)
            alert((e as Error)?.message || "Failed to export HTML")
        } finally {
            setExportingHtml(false)
            setExportHtmlStage("preparing")
        }
    }

    const buildCsvAndDownload = async () => {
        if (!study) return

        try {
            setExporting(true)
            setExportStage(1)
            await new Promise(resolve => setTimeout(resolve, 1000))
            setExportStage(2)
            await new Promise(resolve => setTimeout(resolve, 1000))
            setExportStage(3)
            await new Promise(resolve => setTimeout(resolve, 500))

            const blob = await downloadStudyResponsesCsv(studyId)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${study?.title || 'study'}-analytics.csv`
            a.click()
            URL.revokeObjectURL(url)
        } catch (e) {
            console.error('Export CSV failed:', e)
            alert('Failed to export CSV')
        } finally {
            setExporting(false)
            setExportStage(0)
        }
    }

    const [analyticsView, setAnalyticsView] = useState<"overview" | "configurator" | "detail">("overview")
    const [activeView, setActiveView] = useState("table")

    // Smooth scroll to top when switching tabs to prevent jarring layout shift
    useEffect(() => {
        if (!analysisData) return
        window.scrollTo({ top: 0, behavior: "smooth" })
    }, [analyticsView, analysisData])
    const [activeMetric, setActiveMetric] = useState("Top Down")
    const [activeTab, setActiveTab] = useState("Overall")

    const loadingMessages = useMemo(
        () =>
            isFilterActive || filterRunning
                ? [
                      "Applying your filters…",
                      "Building segment insights…",
                      "Crunching the numbers…",
                      "Updating your dashboard…",
                      "Almost there…",
                  ]
                : [
                      "Getting your responses...",
                      "Crunching the numbers...",
                      "Building your analysis...",
                      "Creating insights...",
                      "Almost there...",
                  ],
        [isFilterActive, filterRunning]
    )
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
    useEffect(() => {
        if (!analysisLoading) return
        const id = setInterval(() => {
            setLoadingMessageIndex((i) => (i + 1) % loadingMessages.length)
        }, 2200)
        return () => clearInterval(id)
    }, [analysisLoading, loadingMessages.length])

    if (loading) {
        return (
            <AuthGuard requireAuth={true}>
                <div className="min-h-screen bg-gray-50">
                    <DashboardHeader />
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    </div>
                </div>
            </AuthGuard>
        )
    }

    const classificationQuestions =
        (study as any)?.classification_questions ??
        (analysisData as any)?.classification_questions ??
        (analysisData as any)?.meta?.classification_questions

    const pageTitle = study?.title || analysisData?.["Information Block"]?.["Study Title"] || "Study Analytics"
    const rawStudyType = study?.study_type || analysisData?.["Information Block"]?.["Study Type"] || "text"
    const studyType = typeof rawStudyType === "string" ? rawStudyType.toLowerCase() : "text"

    if (error && !analysisData) {
        return (
            <AuthGuard requireAuth={true}>
                <div className="min-h-screen bg-gray-50">
                    <DashboardHeader />
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
                            <p className="text-red-600">{error || "Study not found"}</p>
                            <button
                                onClick={() => router.push(homeHref)}
                                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </AuthGuard>
        )
    }

    return (
        <AuthGuard requireAuth={true}>
            <div className="flex min-h-screen bg-gray-50">
            <AnalyticsSavedReportsSidebar
                reports={savedReports}
                onSelectReport={(report) => void applySavedReport(report)}
                onRename={async (reportId, name) => {
                    const snapshot = savedReports
                    setSavedReports((prev) =>
                        prev.map((r) => (r.id === reportId ? { ...r, name } : r))
                    )
                    try {
                        await renameSavedFilterReport(studyId, reportId, name)
                    } catch (e) {
                        setSavedReports(snapshot)
                        console.warn("Failed to rename saved report:", e)
                        alert((e as Error)?.message ?? "Failed to rename report")
                    }
                }}
                onDelete={async (reportId) => {
                    const snapshot = savedReports
                    setSavedReports((prev) => prev.filter((r) => r.id !== reportId))
                    try {
                        await deleteSavedFilterReport(studyId, reportId)
                    } catch (e) {
                        setSavedReports(snapshot)
                        console.warn("Failed to delete saved report:", e)
                        alert((e as Error)?.message ?? "Failed to delete report")
                    }
                }}
                activeFilters={isFilterActive ? activeFilters : null}
                loading={savedReportsLoading}
                applyingId={applyingReportId}
            />

            <div className="flex-1 overflow-auto min-w-0">
                <DashboardHeader />

                {/* Header Section */}
                <div className="text-white overflow-hidden" style={{ backgroundColor: '#2674BA' }}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6">
                        {/* Breadcrumbs */}
                        <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] sm:text-xs md:text-sm mb-3 sm:mb-4">
                            <Link href={homeHref} className="text-blue-200 hover:text-white transition-colors shrink-0">Dashboard</Link>
                            <span className="text-blue-300 opacity-50 shrink-0">/</span>
                            <Link href={homeHref} className="text-blue-200 hover:text-white transition-colors shrink-0">Studies</Link>
                            <span className="text-blue-300 opacity-50 shrink-0">/</span>
                            <span className="text-white font-medium break-words">
                                {studyType === "grid" ? "Grid Study" : studyType === "hybrid" ? "Hybrid Study" : studyType === "text" ? "Text Study" : "Layer Study"} Analytics
                            </span>
                        </nav>

                        {/* Title and Actions */}
                        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                            <h1 className="min-w-0 flex-1 text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-tight leading-snug break-words">
                                {pageTitle}
                            </h1>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full sm:flex sm:flex-wrap sm:items-center lg:justify-end lg:w-auto lg:max-w-2xl xl:max-w-none shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setSettingsOpen(true)}
                                    className="cursor-pointer w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 border rounded-lg transition-all duration-200 hover:bg-white/10 active:scale-95 text-xs sm:text-sm font-semibold shrink-0"
                                    style={{ borderColor: 'rgba(255, 255, 255, 0.3)', color: '#FFFFFF' }}
                                >
                                    <Settings2 className="w-4 h-4 shrink-0" />
                                    <span className="truncate">Analysis Settings</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setFilterError(null)
                                        setSaveReportError(null)
                                        setAdvancedFilterOpen(true)
                                    }}
                                    className="cursor-pointer w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 border rounded-lg transition-all duration-200 hover:bg-white/10 active:scale-95 text-xs sm:text-sm font-semibold shrink-0"
                                    style={{ borderColor: 'rgba(255, 255, 255, 0.3)', color: '#FFFFFF' }}
                                >
                                    <Filter className="w-4 h-4 shrink-0" />
                                    <span className="truncate">Advanced Filter</span>
                                </button>

                                <button
                                    onClick={() => router.push(studyHref)}
                                    className="cursor-pointer w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 border rounded-lg transition-all duration-200 hover:bg-white/10 active:scale-95 text-xs sm:text-sm font-semibold shrink-0"
                                    style={{ borderColor: 'rgba(255, 255, 255, 0.3)', color: '#FFFFFF' }}
                                >
                                    <ArrowLeft className="w-4 h-4 shrink-0" />
                                    <span className="truncate">Back to Study</span>
                                </button>

                                <button
                                    onClick={buildCsvAndDownload}
                                    disabled={exporting || !study}
                                    className="cursor-pointer w-full sm:w-auto col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 bg-white rounded-lg transition-all duration-200 hover:shadow-lg active:scale-95 font-bold text-xs sm:text-sm shrink-0 disabled:cursor-not-allowed disabled:opacity-70"
                                    style={{ color: '#2674BA' }}
                                >
                                    {exporting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current shrink-0" />
                                            <span className="truncate">
                                                {exportStage === 1 && "Extracting..."}
                                                {exportStage === 2 && "Processing..."}
                                                {exportStage === 3 && "Generating..."}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4 shrink-0" />
                                            <span>Export CSV</span>
                                        </>
                                    )}
                                </button>

                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {analysisError && (
                        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
                            <p className="font-medium">Analysis could not be loaded</p>
                            <p className="text-sm mt-1">{analysisError}</p>
                        </div>
                    )}

                    {filterError && (
                        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
                            <p className="font-medium">Filter could not be applied</p>
                            <p className="text-sm mt-1">{filterError}</p>
                        </div>
                    )}

                    {isFilterActive && activeFilters && !analysisLoading && (
                        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-[#2674BA]/25 bg-[#2674BA]/5 px-4 py-3">
                            <div className="flex items-start gap-3 min-w-0">
                                <div className="shrink-0 w-9 h-9 rounded-lg bg-[#2674BA]/15 flex items-center justify-center">
                                    <Filter className="w-4 h-4 text-[#2674BA]" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[#2674BA]">Filtered analysis active</p>
                                    <p className="text-sm text-gray-600 truncate">
                                        {describeAppliedFilters(activeFilters)}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => void clearActiveFilter()}
                                className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 shrink-0"
                            >
                                <X className="w-3.5 h-3.5" />
                                Clear filter
                            </button>
                        </div>
                    )}

                    {analysisLoading ? (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gray-50/80 rounded-xl border border-gray-100">
                            <div className="animate-spin rounded-full h-14 w-14 border-2 border-[#2674BA] border-t-transparent" />
                            <p className="mt-5 text-lg font-medium text-gray-700 transition-opacity duration-300">
                                {loadingMessages[loadingMessageIndex]}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                                Something good is cooking…
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Overview / Design Configurator / Detail Analysis toggle */}
                            {analysisData && (
                                <div className="flex flex-wrap gap-2 mb-6">
                                    <button
                                        type="button"
                                        onClick={() => setAnalyticsView("overview")}
                                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                                            analyticsView === "overview"
                                                ? "text-white shadow-sm"
                                                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                        style={analyticsView === "overview" ? { backgroundColor: "#2674BA" } : undefined}
                                    >
                                        <LayoutDashboard className="w-4 h-4" />
                                        Overview
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAnalyticsView("configurator")}
                                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                                            analyticsView === "configurator"
                                                ? "text-white shadow-sm"
                                                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                        style={analyticsView === "configurator" ? { backgroundColor: "#2674BA" } : undefined}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Design Configurator
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAnalyticsView("detail")}
                                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                                            analyticsView === "detail"
                                                ? "text-white shadow-sm"
                                                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                        style={analyticsView === "detail" ? { backgroundColor: "#2674BA" } : undefined}
                                    >
                                        <BarChart3 className="w-4 h-4" />
                                        Detail Analysis
                                    </button>
                                </div>
                            )}

                            <div className="min-h-[50vh]">
                            <AnimatePresence mode="wait">
                                {analyticsView === "overview" && analysisData && (
                                    <motion.div
                                        key="overview"
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -16 }}
                                        transition={{ duration: 0.25 }}
                                        className="space-y-0"
                                    >
                                        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0, duration: 0.4 }}>
                                            <AnalyticsKPICards analysisData={analysisData} studyType={studyType} />
                                        </motion.div>
                                        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.4 }}>
                                            <AnalyticsResponseTimeSection analysisData={analysisData} />
                                        </motion.div>
                                        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.4 }}>
                                            <AnalyticsPieCharts analysisData={analysisData} />
                                        </motion.div>
                                        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.4 }}>
                                            <AnalyticsTopBottomPerformers analysisData={analysisData} studyType={studyType} />
                                        </motion.div>
                                        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.4 }} className="mt-10">
                                            <AnalyticsPersonaBlueprints
                                                analysisData={analysisData}
                                                studyType={studyType as "text" | "grid" | "layer" | "hybrid"}
                                            />
                                        </motion.div>
                                    </motion.div>
                                )}
                                {analyticsView === "detail" && analysisData && (
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
                                                appliedFilters={isFilterActive ? activeFilters : null}
                                                onPrelimColumnClick={handlePrelimColumnClick}
                                            />
                                        ) : activeView === "heatmap" ? (
                                            <AnalyticsHeatmap
                                                analysisData={analysisData}
                                                activeMetric={activeMetric}
                                                activeTab={activeTab}
                                                studyType={studyType}
                                                appliedFilters={isFilterActive ? activeFilters : null}
                                                onPrelimColumnClick={handlePrelimColumnClick}
                                            />
                                        ) : activeView === "graph" ? (
                                            <AnalyticsGraph
                                                analysisData={analysisData}
                                                activeMetric={activeMetric}
                                                activeTab={activeTab}
                                                studyType={studyType}
                                                appliedFilters={isFilterActive ? activeFilters : null}
                                                onPrelimColumnClick={handlePrelimColumnClick}
                                            />
                                        ) : (
                                            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                                                <BarChart3 className="w-16 h-16 mx-auto mb-4" style={{ color: "#2674BA" }} />
                                                <h3 className="text-xl font-semibold text-gray-700">Analytics Content for {activeTab}</h3>
                                                <p>Displaying {activeMetric} in {activeView} view.</p>
                                                <p className="mt-2 text-sm italic">We are currently building the detailed visualizations for this section.</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Keep mounted when not active so configurator selections persist when switching tabs */}
                            <div className={analyticsView !== "configurator" ? "hidden" : undefined}>
                                <AnalyticsDesignConfigurator
                                    analysisData={analysisData}
                                    studyId={studyId}
                                    studyType={studyType}
                                    designConstraints={study?.design_constraints || []}
                                    studyLayers={study?.study_layers || []}
                                    onExportHtml={() => void buildHtmlExport()}
                                    isExportingHtml={exportingHtml}
                                    exportHtmlStage={exportHtmlStage}
                                />
                            </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            </div>

            <AnalyticsSettingsModal
                studyId={studyId}
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                onOpenAdvancedFilter={() => {
                    setSettingsOpen(false)
                    setFilterError(null)
                    setSaveReportError(null)
                    setAdvancedFilterOpen(true)
                }}
                onSaved={() => {
                    void loadAnalysis()
                }}
            />

            <AnalyticsAdvancedFilterModal
                studyId={studyId}
                classificationQuestions={classificationQuestions}
                initialFilters={activeFilters}
                savedReports={savedReports}
                isOpen={advancedFilterOpen}
                onClose={() => {
                    setAdvancedFilterOpen(false)
                    setSaveReportError(null)
                }}
                onRunAnalysis={(filters) => void runFilteredAnalysis(filters)}
                onSaveAndRun={(name, filters) => saveAndRunFilteredAnalysis(name, filters)}
                isRunning={filterRunning || saveAndRunPending}
                error={filterError}
                saveError={saveReportError}
            />

            <AnalyticsPrelimCohortModal
                isOpen={cohortOpen}
                onClose={() => {
                    setCohortOpen(false)
                    setCohortSelection(null)
                    setCohortData(null)
                    setCohortError(null)
                }}
                selection={cohortSelection}
                data={cohortData}
                isLoading={cohortLoading}
                isLoadingMore={cohortLoadingMore}
                error={cohortError}
                onRetry={() => {
                    if (cohortSelection) {
                        void loadClassificationCohort(cohortSelection, 0, false)
                    }
                }}
                onLoadMore={loadMoreCohort}
            />
        </AuthGuard>
    )
}
