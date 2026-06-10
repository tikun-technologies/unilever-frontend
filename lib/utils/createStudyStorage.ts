const CREATE_STUDY_STORAGE_KEYS = [
  "cs_step1",
  "cs_step2",
  "cs_step3",
  "cs_step4",
  "cs_step4_shuffle",
  "cs_step5_grid",
  "cs_step5_text",
  "cs_step5_hybrid",
  "cs_step5_hybrid_grid",
  "cs_step5_hybrid_text",
  "cs_step5_hybrid_phase_order",
  "cs_step5_layer",
  "cs_step5_layer_background",
  "cs_step5_layer_preview_aspect",
  "cs_step_keys",
  "cs_step6",
  "cs_step7_tasks",
  "cs_step7_matrix",
  "cs_step7_job_state",
  "cs_step7_timer_state",
  "cs_current_step",
  "cs_backup_steps",
  "cs_flash_message",
  "cs_resuming_draft",
  "cs_study_id",
  "cs_is_fresh_start",
  "cs_step8",
] as const

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
