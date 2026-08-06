const CREATE_STUDY_STORAGE_KEYS = [
  "cs_step1",
  "cs_step2",
  "cs_step3",
  "cs_step4",
  "cs_step4_shuffle",
  "cs_step6_optional_classification",
  "cs_step6_optional_classification_completed",
  "cs_step5_grid",
  "cs_step5_text",
  "cs_step5_hybrid",
  "cs_step5_hybrid_grid",
  "cs_step5_hybrid_text",
  "cs_step5_hybrid_phase_order",
  "cs_step5_layer",
  "cs_step5_layer_background",
  "cs_step5_layer_preview_aspect",
  "cs_step5_layer_design_constraints",
  "cs_step_keys",
  "cs_step6",
  "cs_step7_tasks",
  "cs_step7_matrix",
  "cs_step7_job_state",
  "cs_step7_generation_error",
  "cs_step7_timer_state",
  "cs_current_step",
  "cs_study_last_step",
  "cs_backup_steps",
  "cs_flash_message",
  "cs_resuming_draft",
  "cs_study_id",
  "cs_is_fresh_start",
  "cs_step8",
] as const

export type CreateStudyType = "grid" | "layer" | "text" | "hybrid"

function normalizeStudyType(raw: unknown): CreateStudyType | null {
  const v = String(raw || "").toLowerCase().trim()
  if (v === "grid" || v === "layer" || v === "text" || v === "hybrid") return v
  return null
}

/** Current study type from Step 2 local cache. */
export function getCurrentStudyType(): CreateStudyType | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem("cs_step2")
    if (!raw) return null
    return normalizeStudyType(JSON.parse(raw)?.type)
  } catch {
    return null
  }
}

/** Study type the cached task preview was generated for. */
export function getGeneratedTasksStudyType(): CreateStudyType | null {
  if (typeof window === "undefined") return null
  try {
    const matrixRaw = localStorage.getItem("cs_step7_matrix")
    if (matrixRaw) {
      const matrix = JSON.parse(matrixRaw)
      const fromMeta = normalizeStudyType(matrix?.metadata?.study_type)
      if (fromMeta) return fromMeta
    }
    const tasksRaw = localStorage.getItem("cs_step7_tasks")
    if (tasksRaw) {
      const tasks = JSON.parse(tasksRaw)
      const fromTasks = normalizeStudyType(tasks?.study_type)
      if (fromTasks) return fromTasks
    }
  } catch {
    /* ignore */
  }
  return null
}

/** True when task generation has completed and preview tasks are stored locally. */
export function hasGeneratedTasks(): boolean {
  if (typeof window === "undefined") return false
  try {
    return !!localStorage.getItem("cs_step7_tasks") || !!localStorage.getItem("cs_step7_matrix")
  } catch {
    return false
  }
}

/** True when a task-generation job is still pending/processing. */
export function isTaskGenerationInProgress(): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = localStorage.getItem("cs_step7_job_state")
    if (!raw) return false
    const job = JSON.parse(raw) as { status?: { status?: string } | string }
    const s = typeof job?.status === "string" ? job.status : job?.status?.status
    return s === "processing" || s === "pending"
  } catch {
    return false
  }
}

/**
 * Stamp the study type onto existing task markers when missing (legacy drafts),
 * so a later type change can correctly detect staleness / allow revert.
 */
export function ensureGeneratedTasksTypeStamp(studyType: CreateStudyType): void {
  if (typeof window === "undefined") return
  if (!hasGeneratedTasks()) return
  try {
    const tasksRaw = localStorage.getItem("cs_step7_tasks")
    if (tasksRaw) {
      try {
        const tasks = JSON.parse(tasksRaw)
        if (!normalizeStudyType(tasks?.study_type)) {
          localStorage.setItem(
            "cs_step7_tasks",
            JSON.stringify({ ...tasks, study_type: studyType, completed: true })
          )
        }
      } catch {
        localStorage.setItem(
          "cs_step7_tasks",
          JSON.stringify({ completed: true, timestamp: Date.now(), study_type: studyType })
        )
      }
    }

    const matrixRaw = localStorage.getItem("cs_step7_matrix")
    if (matrixRaw) {
      const matrix = JSON.parse(matrixRaw)
      if (!normalizeStudyType(matrix?.metadata?.study_type)) {
        matrix.metadata = { ...(matrix.metadata || {}), study_type: studyType }
        localStorage.setItem("cs_step7_matrix", JSON.stringify(matrix))
      }
    }
  } catch {
    /* ignore */
  }
}

/**
 * Cached tasks exist but were generated for a different study type than Step 2.
 * Keep the preview in localStorage until Task Generation regenerates; do not delete on type change.
 */
export function areGeneratedTasksStale(): boolean {
  if (typeof window === "undefined") return false
  if (!hasGeneratedTasks()) return false
  const current = getCurrentStudyType()
  const generatedFor = getGeneratedTasksStudyType()
  if (!current || !generatedFor) return false
  return current !== generatedFor
}

/** Whether Step 5 structure for the current study type is complete enough to regenerate tasks. */
export function isStudyStructureReadyForCurrentType(): boolean {
  if (typeof window === "undefined") return false
  try {
    const type = getCurrentStudyType()
    if (!type) return false

    const hasValidMediaElement = (element: any) =>
      Boolean(element && (element.secureUrl || element.previewUrl || element.textContent))

    if (type === "grid") {
      const gridData = localStorage.getItem("cs_step5_grid")
      if (!gridData) return false
      const grid = JSON.parse(gridData)
      const isCategoryFormat = grid.length > 0 && grid[0] && grid[0].title && grid[0].elements
      if (isCategoryFormat) {
        return (
          Array.isArray(grid) &&
          grid.length >= 3 &&
          grid.every(
            (category: any) =>
              category.title &&
              category.title.trim().length > 0 &&
              Array.isArray(category.elements) &&
              category.elements.length >= 3 &&
              category.elements.every((element: any) => hasValidMediaElement(element))
          )
        )
      }
      return Array.isArray(grid) && grid.length >= 3 && grid.every((e: any) => hasValidMediaElement(e))
    }

    if (type === "text") {
      const textData = localStorage.getItem("cs_step5_text")
      if (!textData) return false
      const text = JSON.parse(textData)
      return (
        Array.isArray(text) &&
        text.length >= 3 &&
        text.every(
          (category: any) =>
            category.title &&
            category.title.trim().length > 0 &&
            Array.isArray(category.elements) &&
            category.elements.length >= 3 &&
            category.elements.every((element: any) => element.name && element.name.trim().length > 0)
        )
      )
    }

    if (type === "hybrid") {
      const hybridGridData = localStorage.getItem("cs_step5_hybrid_grid")
      const hybridTextData = localStorage.getItem("cs_step5_hybrid_text")
      if (!hybridGridData || !hybridTextData) return false
      const grid = JSON.parse(hybridGridData)
      const text = JSON.parse(hybridTextData)
      const isGridValid =
        Array.isArray(grid) &&
        grid.length >= 3 &&
        grid.every(
          (category: any) =>
            category.title &&
            category.title.trim().length > 0 &&
            Array.isArray(category.elements) &&
            category.elements.length >= 3 &&
            category.elements.every((element: any) => element.secureUrl || element.previewUrl)
        )
      const isTextValid =
        Array.isArray(text) &&
        text.length >= 3 &&
        text.every(
          (category: any) =>
            category.title &&
            category.title.trim().length > 0 &&
            Array.isArray(category.elements) &&
            category.elements.length >= 3 &&
            category.elements.every((element: any) => element.name && element.name.trim().length > 0)
        )
      return isGridValid && isTextValid
    }

    // layer
    const layerData = localStorage.getItem("cs_step5_layer")
    if (!layerData) return false
    const layer = JSON.parse(layerData)
    return (
      Array.isArray(layer) &&
      layer.length >= 3 &&
      layer.every(
        (l: any) =>
          l.images &&
          l.images.length >= 3 &&
          l.images.every((img: any) => img.secureUrl)
      )
    )
  } catch {
    return false
  }
}

/** Clear create-study draft data and mark the next visit as a fresh start. */
export function prepareFreshCreateStudy() {
  if (typeof window === "undefined") return

  CREATE_STUDY_STORAGE_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key)
    } catch { }
  })

  try {
    sessionStorage.removeItem("cs_previous_study_id")
  } catch { }

  try {
    localStorage.setItem("cs_is_fresh_start", "true")
  } catch { }
}
