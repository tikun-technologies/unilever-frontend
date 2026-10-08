/** Browser job key for task generation. One key is shared by every study. */

export const TASK_JOB_STATE_KEY = "cs_step7_job_state"
export const TASK_JOB_TIMER_KEY = "cs_step7_timer_state"

export function readOpenStudyId(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem("cs_study_id")
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      if (typeof parsed === "string" && parsed.trim()) return parsed.trim()
      if (parsed != null && String(parsed).trim()) return String(parsed).trim()
    } catch {
      return raw.trim() || null
    }
  } catch {
    return null
  }
  return null
}

/** Preview JSON uses `jobid`. Older callers also send jobId / job_id. */
export function previewJobId(details: { jobId?: unknown; job_id?: unknown; jobid?: unknown } | null | undefined): string | null {
  if (!details) return null
  const raw = details.jobId ?? details.job_id ?? details.jobid
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function clearStoredTaskJob(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(TASK_JOB_STATE_KEY)
    localStorage.removeItem(TASK_JOB_TIMER_KEY)
  } catch {
    /* ignore */
  }
}

export function jobStateFromPreview(
  studyId: string,
  details: { jobId?: unknown; job_id?: unknown; jobid?: unknown; progress?: unknown }
): { jobId: string; studyId: string; progress: number; startTime: number; status: { status: string; progress: number }; timestamp: number } | null {
  const jobId = previewJobId(details)
  if (!jobId || !studyId) return null
  const progress = typeof details?.progress === "number" ? details.progress : 0
  return {
    jobId,
    studyId,
    progress,
    startTime: Date.now(),
    status: { status: "processing", progress },
    timestamp: Date.now(),
  }
}

export function storeTaskJobFromPreview(
  studyId: string,
  details: { jobId?: unknown; job_id?: unknown; jobid?: unknown; progress?: unknown }
): void {
  if (typeof window === "undefined") return
  const state = jobStateFromPreview(studyId, details)
  if (!state) {
    clearStoredTaskJob()
    return
  }
  try {
    localStorage.setItem(TASK_JOB_STATE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

/** Only the open study may write the shared job key. */
export function shouldPersistStep7Job(openStudyId: string | null, jobStudyId: string | null | undefined): boolean {
  if (!openStudyId || !jobStudyId) return false
  return openStudyId === jobStudyId
}
