"use client"

import { AnalyticsDesignConfigurator } from "@/app/home/study/[id]/analytics/components/AnalyticsDesignConfigurator"
import type { LocalSavedDesignsStore } from "@/lib/export/savedDesignLocalStorage"
import type { ApiDesignConstraint } from "@/lib/utils/designConstraintsStorage"

export interface ExportConfiguratorPayload {
  studyId: string
  studyTitle: string
  studyType: string
  exportedAt: string
  analysisData: unknown
  designConstraints?: ApiDesignConstraint[]
  studyLayers?: any[]
  savedDesigns: LocalSavedDesignsStore
}

export function ExportConfiguratorRoot({ payload }: { payload: ExportConfiguratorPayload }) {
  const exportStorageId = `${payload.studyId}:export:${payload.exportedAt}`

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-[rgba(209,223,235,1)] bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <div className="text-2xl font-bold">
            <span className="text-[rgba(38,116,186,1)]">Mind</span>
            <span className="text-gray-800">Surve</span>
          </div>
        </div>
      </header>

      <section className="text-white" style={{ backgroundColor: "#2674BA" }}>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{payload.studyTitle}</h1>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AnalyticsDesignConfigurator
          analysisData={payload.analysisData}
          studyId={exportStorageId}
          studyType={payload.studyType}
          designConstraints={payload.designConstraints || []}
          studyLayers={payload.studyLayers || []}
          persistence="local"
          initialSavedDesigns={payload.savedDesigns}
        />
      </main>
    </div>
  )
}
