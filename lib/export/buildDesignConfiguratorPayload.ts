import type { StudyFilterPayload } from "@/lib/api/ResponseAPI"
import {
  listDesignCategories,
  listSavedDesigns,
  type DesignCategoryPayload,
  type SavedDesignPayload,
} from "@/lib/api/StudyAPI"
import { prepareDesignCategoriesForExport } from "@/lib/export/designCategoryLocalStorage"
import { prepareSavedDesignsForExport } from "@/lib/export/savedDesignLocalStorage"
import type { ApiDesignConstraint } from "@/lib/utils/designConstraintsStorage"

export interface DesignConfiguratorExportPayload {
  studyId: string
  studyTitle: string
  studyType: string
  exportedAt: string
  analysisData: any
  designConstraints?: ApiDesignConstraint[]
  studyLayers?: any[]
  savedDesigns: {
    configurator: SavedDesignPayload[]
    input: SavedDesignPayload[]
  }
  designCategories?: DesignCategoryPayload[]
  appliedFilters?: StudyFilterPayload["filters"] | null
}

export async function buildDesignConfiguratorPayload(input: {
  studyId: string
  studyTitle: string
  studyType: string
  analysisData: any
  designConstraints?: ApiDesignConstraint[]
  studyLayers?: any[]
  appliedFilters?: StudyFilterPayload["filters"] | null
}): Promise<DesignConfiguratorExportPayload> {
  const [configurator, inputDesigns, designCategories] = await Promise.all([
    listSavedDesigns(input.studyId, "configurator").catch(() => []),
    listSavedDesigns(input.studyId, "input").catch(() => []),
    listDesignCategories(input.studyId).catch(() => []),
  ])

  return {
    studyId: input.studyId,
    studyTitle: input.studyTitle,
    studyType: input.studyType,
    exportedAt: new Date().toISOString(),
    analysisData: input.analysisData,
    designConstraints: input.designConstraints || [],
    studyLayers: input.studyLayers || [],
    savedDesigns: prepareSavedDesignsForExport({
      configurator,
      input: inputDesigns,
    }),
    designCategories: prepareDesignCategoriesForExport(designCategories),
    appliedFilters: input.appliedFilters ?? null,
  }
}
