/** What the task-generation screen should do with one job update. */

export const SAVING_TASKS_MESSAGE = "Saving generated tasks..."

const ACTIVE_STATUSES = new Set(["pending", "started", "processing"])

export type TaskGenerationUpdate = {
  status?: string | null
  progress?: number | null
  message?: string | null
  error?: string | null
}

export type TaskGenerationAction =
  | { kind: "continue"; message: string | null }
  | { kind: "saving"; message: typeof SAVING_TASKS_MESSAGE }
  | { kind: "fetch-result" }
  | { kind: "failed"; error: string }

/**
 * 90% means the matrix is built and the tasks are still being stored.
 * The result endpoint is only valid once the job status is completed.
 */
export function resolveTaskGenerationUpdate(input: TaskGenerationUpdate): TaskGenerationAction {
  const status = String(input.status || "").toLowerCase()
  const progress = typeof input.progress === "number" ? input.progress : 0

  if (status === "failed" || status === "cancelled") {
    const error = String(input.error || input.message || "").trim()
    return { kind: "failed", error: error || (status === "cancelled" ? "Job cancelled" : "Job failed") }
  }

  if (status === "completed") {
    return { kind: "fetch-result" }
  }

  if (ACTIVE_STATUSES.has(status) && progress >= 90) {
    return { kind: "saving", message: SAVING_TASKS_MESSAGE }
  }

  return { kind: "continue", message: input.message ?? null }
}

export function shouldFetchTaskResult(status?: string | null): boolean {
  return String(status || "").toLowerCase() === "completed"
}

export function isTaskGenerationSaving(input: TaskGenerationUpdate | null | undefined): boolean {
  if (!input) return false
  return resolveTaskGenerationUpdate(input).kind === "saving"
}

export function presentTaskGenerationStatus<T extends TaskGenerationUpdate>(status: T): T {
  const action = resolveTaskGenerationUpdate(status)
  if (action.kind === "saving") {
    return { ...status, message: action.message }
  }
  if (action.kind === "failed") {
    return { ...status, message: action.error, error: action.error }
  }
  return status
}

/** A result fetch that ran before the commit. The job is still running. */
export function isTaskResultNotReady(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const status = (error as { status?: number }).status
  const message = String((error as { message?: string }).message || "")
  if (status !== 400) return false
  return /not completed|current status:\s*(processing|pending|started)|still processing/i.test(message)
}
