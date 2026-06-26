export type JobKind = 'task_generation' | 'simulate_ai'

export type JobLifecycleStatus =
  | 'pending'
  | 'started'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface TrackedJob {
  jobId: string
  studyId: string
  studyTitle?: string
  jobKind: JobKind
  status: JobLifecycleStatus
  progress: number
  message?: string
  error?: string
  respondentsRequested?: number
  respondentsCompleted?: number
  startedAt?: number
  updatedAt: number
  unread: boolean
}

export interface JobWatchCallbacks {
  onProgress?: (job: TrackedJob) => void
  onComplete?: (job: TrackedJob) => void
  onError?: (job: TrackedJob, error: string) => void
}

export interface RegisterJobInput {
  jobId: string
  studyId: string
  studyTitle?: string
  jobKind: JobKind
  status?: JobLifecycleStatus
  progress?: number
  message?: string
}

export function isActiveJobStatus(status: JobLifecycleStatus): boolean {
  return status === 'pending' || status === 'started' || status === 'processing'
}

export function jobKindLabel(kind: JobKind): string {
  return kind === 'simulate_ai' ? 'Synthetic respondents' : 'Task generation'
}

export function normalizeJobFromApi(raw: Record<string, unknown>): TrackedJob | null {
  const jobId = String(raw.job_id || '')
  const studyId = String(raw.study_id || '')
  if (!jobId || !studyId) return null

  const kind = raw.job_kind === 'simulate_ai' ? 'simulate_ai' : 'task_generation'
  const status = (raw.status as JobLifecycleStatus) || 'pending'
  const progress = typeof raw.progress === 'number' ? raw.progress : 0

  return {
    jobId,
    studyId,
    studyTitle: typeof raw.study_title === 'string' ? raw.study_title : undefined,
    jobKind: kind,
    status,
    progress,
    message: typeof raw.message === 'string' ? raw.message : undefined,
    error: typeof raw.error === 'string' ? raw.error : undefined,
    respondentsRequested:
      typeof raw.respondents_requested === 'number' ? raw.respondents_requested : undefined,
    respondentsCompleted:
      typeof raw.respondents_completed === 'number' ? raw.respondents_completed : undefined,
    updatedAt: Date.now(),
    unread: raw.unread === true || raw.is_read === false,
  }
}
