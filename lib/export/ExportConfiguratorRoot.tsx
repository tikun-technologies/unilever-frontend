"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { BarChart3, LayoutDashboard, Sparkles } from "lucide-react"
import { AnalyticsDesignConfigurator } from "@/app/home/study/[id]/analytics/components/AnalyticsDesignConfigurator"
import { AnalyticsGraph } from "@/app/home/study/[id]/analytics/components/AnalyticsGraph"
import { AnalyticsHeatmap } from "@/app/home/study/[id]/analytics/components/AnalyticsHeatmap"
import { AnalyticsKPICards } from "@/app/home/study/[id]/analytics/components/AnalyticsKPICards"
import { AnalyticsPersonaBlueprints } from "@/app/home/study/[id]/analytics/components/AnalyticsPersonaBlueprints"
import { AnalyticsPieCharts } from "@/app/home/study/[id]/analytics/components/AnalyticsPieCharts"
import { AnalyticsResponseTimeSection } from "@/app/home/study/[id]/analytics/components/AnalyticsResponseTimeSection"
import { AnalyticsTable } from "@/app/home/study/[id]/analytics/components/AnalyticsTable"
import { AnalyticsToolbar } from "@/app/home/study/[id]/analytics/components/AnalyticsToolbar"
import { AnalyticsTopBottomPerformers } from "@/app/home/study/[id]/analytics/components/AnalyticsTopBottomPerformers"
import { BrandLogo } from "@/components/brand/BrandLogo"
import type { StudyFilterPayload } from "@/lib/api/ResponseAPI"
import type { LocalSavedDesignsStore } from "@/lib/export/savedDesignLocalStorage"
import type { ApiDesignConstraint } from "@/lib/utils/designConstraintsStorage"
import { listAppliedFilterChips } from "@/lib/utils/filterAnalysisMerge"

export interface ExportConfiguratorPayload {
  studyId: string
  studyTitle: string
  studyType: string
  exportedAt: string
  analysisData: unknown
  designConstraints?: ApiDesignConstraint[]
  studyLayers?: any[]
  savedDesigns: LocalSavedDesignsStore
  appliedFilters?: StudyFilterPayload["filters"] | null
}

type AnalyticsView = "overview" | "configurator" | "detail"

function studyTypeLabel(studyType: string): string {
  if (studyType === "grid") return "Grid Study"
  if (studyType === "hybrid") return "Hybrid Study"
  if (studyType === "text") return "Text Study"
  return "Layer Study"
}

export function ExportConfiguratorRoot({ payload }: { payload: ExportConfiguratorPayload }) {
  const exportStorageId = `${payload.studyId}:export:${payload.exportedAt}`
  const studyType = (payload.studyType || "text").toLowerCase()
  const analysisData = payload.analysisData
  const appliedFilterChips = useMemo(() => listAppliedFilterChips(payload.appliedFilters), [payload.appliedFilters])
  const appliedFilters = appliedFilterChips.length > 0 ? payload.appliedFilters : null

  const [analyticsView, setAnalyticsView] = useState<AnalyticsView>("overview")
  const [activeView, setActiveView] = useState("table")
  const [activeMetric, setActiveMetric] = useState("Top Down")
  const [activeTab, setActiveTab] = useState("Overall")

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [analyticsView])

  const tabButtonClass = (active: boolean) =>
    `inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
      active ? "text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
    }`

  return (
    <div className="@container/analytics min-h-screen bg-gray-50">
      <header className="border-b border-[rgba(209,223,235,1)] bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <BrandLogo className="text-2xl" />
        </div>
      </header>

      <section className="text-white" style={{ backgroundColor: "#2674BA" }}>
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 sm:py-5 lg:py-6">
          <p className="mb-3 text-[10px] text-blue-200 sm:text-xs md:text-sm">
            {studyTypeLabel(studyType)} Analytics
          </p>
          <h1 className="text-lg font-bold tracking-tight sm:text-xl md:text-2xl lg:text-3xl">
            {payload.studyTitle}
          </h1>
          {payload.exportedAt ? (
            <p className="mt-1 text-xs text-blue-100">
              Exported {new Date(payload.exportedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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

        <div className="min-h-[50vh]">
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
                    studyType={studyType as "text" | "grid" | "layer" | "hybrid"}
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
                  />
                ) : activeView === "heatmap" ? (
                  <AnalyticsHeatmap
                    analysisData={analysisData}
                    activeMetric={activeMetric}
                    activeTab={activeTab}
                    studyType={studyType}
                    appliedFilters={appliedFilters}
                  />
                ) : (
                  <AnalyticsGraph
                    analysisData={analysisData}
                    activeMetric={activeMetric}
                    activeTab={activeTab}
                    studyType={studyType}
                    appliedFilters={appliedFilters}
                  />
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className={analyticsView !== "configurator" ? "hidden" : undefined}>
            <AnalyticsDesignConfigurator
              analysisData={analysisData}
              studyId={exportStorageId}
              studyType={studyType}
              designConstraints={payload.designConstraints || []}
              studyLayers={payload.studyLayers || []}
              persistence="local"
              initialSavedDesigns={payload.savedDesigns}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
