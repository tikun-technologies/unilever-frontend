"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardHeader } from "@/app/home/components/dashboard-header"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { getStudyBasicDetails, StudyDetails } from "@/lib/api/StudyAPI"
import { downloadStudyResponsesCsv } from "@/lib/api/ResponseAPI"
import { ArrowLeft, BarChart3, Download } from "lucide-react"
import Link from "next/link"
import { AnalyticsToolbar } from "./components/AnalyticsToolbar"
import { AnalyticsTable } from "./components/AnalyticsTable"
import { AnalyticsHeatmap } from "./components/AnalyticsHeatmap"
import { AnalyticsGraph } from "./components/AnalyticsGraph"

export default function StudyAnalyticsPage() {
    const params = useParams()
    const router = useRouter()
    const studyId = params.id as string

    const [study, setStudy] = useState<StudyDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [exporting, setExporting] = useState(false)
    const [exportStage, setExportStage] = useState(0)
    const [analysisData, setAnalysisData] = useState<any>(null)

    useEffect(() => {
        if (!studyId) return
        loadStudyDetails()
    }, [studyId])

    useEffect(() => {
        fetch("/analysis.json")
            .then((r) => r.json())
            .then(setAnalysisData)
            .catch((e) => console.warn("Failed to load analysis.json:", e))
    }, [])

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

    const [activeView, setActiveView] = useState("table")
    const [activeMetric, setActiveMetric] = useState("Response Time")
    const [activeTab, setActiveTab] = useState("Overall")

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

    const pageTitle = study?.title || analysisData?.["Information Block"]?.["Study Title"] || "Study Analytics"
    const studyType = study?.study_type || "text"

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
                                onClick={() => router.push("/home")}
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
            <div className="min-h-screen bg-gray-50">
                <DashboardHeader />

                {/* Header Section */}
                <div className="text-white" style={{ backgroundColor: '#2674BA' }}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        {/* Breadcrumbs */}
                        <nav className="text-[10px] sm:text-xs md:text-sm mb-4">
                            <Link href="/home" className="text-blue-200 hover:text-white transition-colors">Dashboard</Link>
                            <span className="mx-2 text-blue-300 opacity-50">/</span>
                            <Link href="/home" className="text-blue-200 hover:text-white transition-colors">Studies</Link>
                            <span className="mx-2 text-blue-300 opacity-50">/</span>
                            <span className="text-white font-medium">
                                {studyType === "grid" ? "Grid Study" : studyType === "hybrid" ? "Hybrid Study" : studyType === "text" ? "Text Study" : "Layer Study"} Analytics
                            </span>
                        </nav>

                        {/* Title and Actions */}
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{pageTitle}</h1>
                            <div className="flex items-center gap-3 w-full lg:w-auto">
                                <button
                                    onClick={() => router.push(`/home/study/${studyId}`)}
                                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg transition-all duration-200 hover:bg-white/10 active:scale-95 text-xs sm:text-sm font-semibold"
                                    style={{ borderColor: 'rgba(255, 255, 255, 0.3)', color: '#FFFFFF' }}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span className="whitespace-nowrap">Back to Study</span>
                                </button>

                                <button
                                    onClick={buildCsvAndDownload}
                                    disabled={exporting || !study}
                                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white rounded-lg transition-all duration-200 hover:shadow-lg active:scale-95 font-bold text-xs sm:text-sm whitespace-nowrap"
                                    style={{ color: '#2674BA' }}
                                >
                                    {exporting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                                            <span>
                                                {exportStage === 1 && "Extracting..."}
                                                {exportStage === 2 && "Processing..."}
                                                {exportStage === 3 && "Generating..."}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" />
                                            <span>Export CSV</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <AnalyticsToolbar
                        activeView={activeView}
                        setActiveView={setActiveView}
                        activeMetric={activeMetric}
                        setActiveMetric={setActiveMetric}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                    />

                    {activeView === "table" ? (
                        <AnalyticsTable analysisData={analysisData} activeMetric={activeMetric} activeTab={activeTab} />
                    ) : activeView === "heatmap" ? (
                        <AnalyticsHeatmap analysisData={analysisData} activeMetric={activeMetric} activeTab={activeTab} />
                    ) : activeView === "graph" ? (
                        <AnalyticsGraph analysisData={analysisData} activeMetric={activeMetric} activeTab={activeTab} />
                    ) : (
                        <div className="bg-white rounded-lg shadow-sm border p-12 text-center text-gray-500">
                            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-blue-200" />
                            <h3 className="text-xl font-semibold text-gray-700">Analytics Content for {activeTab}</h3>
                            <p>Displaying {activeMetric} in {activeView} view.</p>
                            <p className="mt-2 text-sm italic">We are currently building the detailed visualizations for this section.</p>
                        </div>
                    )}
                </div>
            </div>
        </AuthGuard>
    )
}
