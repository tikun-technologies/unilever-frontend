export type JobKind = 'task_generation' | 'simulate_ai'

export type NotificationType = 'job' | 'study_invite' | 'project_invite'

export type JobLifecycleStatus =
  | 'pending'
  | 'started'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface TrackedJob {
  notificationId: string
  notificationType: NotificationType
  jobId?: string
  studyId: string
  projectId?: string
  studyTitle?: string
  projectTitle?: string
  resourceTitle?: string
  inviterName?: string
  role?: string
  jobKind?: JobKind
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

export function isJobNotification(item: TrackedJob): boolean {
  return item.notificationType === 'job'
}

export function isInvitationNotification(item: TrackedJob): boolean {
  return item.notificationType === 'study_invite' || item.notificationType === 'project_invite'
}

export function jobKindLabel(kind: JobKind): string {
  return kind === 'simulate_ai' ? 'Synthetic respondents' : 'Task generation'
}

export function invitationKindLabel(kind: NotificationType): string {
  return kind === 'project_invite' ? 'Project invitation' : 'Study invitation'
}

export function normalizeJobFromApi(raw: Record<string, unknown>): TrackedJob | null {
  const notificationType = (raw.notification_type as NotificationType) || 'job'
  const notificationId = String(raw.notification_id || raw.job_id || '')
  const studyId = raw.study_id ? String(raw.study_id) : ''
  const projectId = raw.project_id ? String(raw.project_id) : undefined

  if (!notificationId) return null
  if (notificationType === 'job' && !studyId) return null
  if (notificationType !== 'job' && !studyId && !projectId) return null

  const kind = raw.job_kind === 'simulate_ai' ? 'simulate_ai' : 'task_generation'
  const status = (raw.status as JobLifecycleStatus) || 'pending'
  const progress = typeof raw.progress === 'number' ? raw.progress : 0

  return {
    notificationId,
    notificationType,
    jobId: raw.job_id ? String(raw.job_id) : undefined,
    studyId: studyId || projectId || '',
    projectId,
    studyTitle: typeof raw.study_title === 'string' ? raw.study_title : undefined,
    projectTitle: typeof raw.project_title === 'string' ? raw.project_title : undefined,
    resourceTitle: typeof raw.resource_title === 'string' ? raw.resource_title : undefined,
    inviterName: typeof raw.inviter_name === 'string' ? raw.inviter_name : undefined,
    role: typeof raw.role === 'string' ? raw.role : undefined,
    jobKind: notificationType === 'job' ? kind : undefined,
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
