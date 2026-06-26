"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  dismissJobNotification as dismissJobNotificationApi,
  getAccessTokenForWebSocket,
  getWebSocketBaseUrl,
  listActiveJobs,
  listDismissedJobIds,
} from '@/lib/jobs/jobsApi'
import {
  isActiveJobStatus,
  normalizeJobFromApi,
  type JobWatchCallbacks,
  type RegisterJobInput,
  type TrackedJob,
} from '@/lib/jobs/jobTypes'
import { getTaskGenerationStatus } from '@/lib/api/StudyAPI'

const STEP7_JOB_KEY = 'cs_step7_job_state'

type JobsMap = Record<string, TrackedJob>

interface JobNotificationContextValue {
  jobs: TrackedJob[]
  activeJobs: TrackedJob[]
  unreadCount: number
  isConnected: boolean
  registerJob: (input: RegisterJobInput) => void
  watchJob: (jobId: string, callbacks: JobWatchCallbacks) => () => void
  markJobRead: (jobId: string) => void
  markAllRead: () => void
  dismissJob: (jobId: string) => void
  getJob: (jobId: string) => TrackedJob | undefined
  isJobActive: (jobId: string) => boolean
  syncStep7JobState: (jobId: string, studyId: string) => void
}

const JobNotificationContext = createContext<JobNotificationContextValue | undefined>(undefined)

function mergeJob(existing: TrackedJob | undefined, incoming: Partial<TrackedJob>): TrackedJob {
  const base = existing || {
    jobId: incoming.jobId || '',
    studyId: incoming.studyId || '',
    jobKind: incoming.jobKind || 'task_generation',
    status: incoming.status || 'pending',
    progress: 0,
    updatedAt: Date.now(),
    unread: true,
  }

  const nextProgress = Math.max(
    base.progress,
    typeof incoming.progress === 'number' ? incoming.progress : 0
  )

  return {
    ...base,
    ...incoming,
    progress: nextProgress,
    studyTitle: incoming.studyTitle ?? base.studyTitle,
    message: incoming.message ?? base.message,
    error: incoming.error ?? base.error,
    updatedAt: Date.now(),
    unread: incoming.unread ?? base.unread,
  }
}

function mapWsStatus(type: string | undefined, status?: string): TrackedJob['status'] {
  if (status && ['pending', 'started', 'processing', 'completed', 'failed', 'cancelled'].includes(status)) {
    return status as TrackedJob['status']
  }
  if (type === 'completed') return 'completed'
  if (type === 'failed') return 'failed'
  if (type === 'progress') return 'processing'
  return 'processing'
}

export function JobNotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, refreshToken } = useAuth()
  const [jobsMap, setJobsMap] = useState<JobsMap>({})
  const [isConnected, setIsConnected] = useState(false)
  const readSetRef = useRef<Set<string>>(new Set())
  const dismissedSetRef = useRef<Set<string>>(new Set())
  const watchersRef = useRef<Map<string, Set<JobWatchCallbacks>>>(new Map())
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stoppedRef = useRef(false)
  const jobsMapRef = useRef<JobsMap>({})

  useEffect(() => {
    jobsMapRef.current = jobsMap
  }, [jobsMap])

  const notifyWatchers = useCallback((job: TrackedJob) => {
    const watchers = watchersRef.current.get(job.jobId)
    if (!watchers) return
    watchers.forEach((cb) => {
      try {
        if (isActiveJobStatus(job.status)) {
          cb.onProgress?.(job)
        } else if (job.status === 'completed') {
          cb.onComplete?.(job)
        } else if (job.status === 'failed' || job.status === 'cancelled') {
          cb.onError?.(job, job.error || job.message || 'Job failed')
        }
      } catch {
        /* ignore listener errors */
      }
    })
  }, [])

  const scheduleNotifyWatchers = useCallback(
    (job: TrackedJob) => {
      queueMicrotask(() => notifyWatchers(job))
    },
    [notifyWatchers]
  )

  const upsertJob = useCallback(
    (incoming: Partial<TrackedJob> & { jobId: string }, options?: { markUnread?: boolean }) => {
      if (dismissedSetRef.current.has(incoming.jobId)) {
        return
      }

      let mergedJob: TrackedJob | null = null

      setJobsMap((prev) => {
        const existing = prev[incoming.jobId]
        const isTerminal = incoming.status === 'completed' || incoming.status === 'failed' || incoming.status === 'cancelled'
        const wasRead = readSetRef.current.has(incoming.jobId)
        const unread =
          options?.markUnread === false
            ? false
            : isTerminal && !wasRead
              ? true
              : isActiveJobStatus(incoming.status || existing?.status || 'pending')
                ? false
                : existing?.unread ?? false

        mergedJob = mergeJob(existing, { ...incoming, unread })
        const next = { ...prev, [incoming.jobId]: mergedJob }
        jobsMapRef.current = next
        return next
      })

      if (mergedJob) {
        scheduleNotifyWatchers(mergedJob)
      }
    },
    [scheduleNotifyWatchers]
  )

  const syncStep7JobState = useCallback((jobId: string, studyId: string) => {
    const job = jobsMapRef.current[jobId]
    if (!job || job.jobKind !== 'task_generation') return
    try {
      localStorage.setItem(
        STEP7_JOB_KEY,
        JSON.stringify({
          jobId,
          studyId,
          status: {
            job_id: jobId,
            status: isActiveJobStatus(job.status) ? 'processing' : job.status,
            progress: job.progress,
            message: job.message,
            error: job.error,
          },
          startTime: job.startedAt || Date.now(),
          progress: job.progress,
          timestamp: Date.now(),
        })
      )
    } catch {
      /* ignore */
    }
  }, [])

  const registerJob = useCallback(
    (input: RegisterJobInput) => {
      if (dismissedSetRef.current.has(input.jobId)) {
        return
      }
      upsertJob({
        jobId: input.jobId,
        studyId: input.studyId,
        studyTitle: input.studyTitle,
        jobKind: input.jobKind,
        status: input.status || 'pending',
        progress: input.progress ?? 0,
        message: input.message,
        startedAt: Date.now(),
        unread: false,
      })
      if (input.jobKind === 'task_generation') {
        syncStep7JobState(input.jobId, input.studyId)
      }
    },
    [syncStep7JobState, upsertJob]
  )

  const watchJob = useCallback((jobId: string, callbacks: JobWatchCallbacks) => {
    if (!watchersRef.current.has(jobId)) {
      watchersRef.current.set(jobId, new Set())
    }
    watchersRef.current.get(jobId)!.add(callbacks)

    const existing = jobsMapRef.current[jobId]
    if (existing) {
      queueMicrotask(() => {
        if (isActiveJobStatus(existing.status)) {
          callbacks.onProgress?.(existing)
        } else if (existing.status === 'completed') {
          callbacks.onComplete?.(existing)
        } else if (existing.status === 'failed' || existing.status === 'cancelled') {
          callbacks.onError?.(existing, existing.error || 'Job failed')
        }
      })
    }

    return () => {
      watchersRef.current.get(jobId)?.delete(callbacks)
      if (watchersRef.current.get(jobId)?.size === 0) {
        watchersRef.current.delete(jobId)
      }
    }
  }, [])

  const markJobRead = useCallback((jobId: string) => {
    readSetRef.current.add(jobId)
    setJobsMap((prev) => {
      const job = prev[jobId]
      if (!job) return prev
      return { ...prev, [jobId]: { ...job, unread: false } }
    })
  }, [])

  const markAllRead = useCallback(() => {
    Object.keys(jobsMapRef.current).forEach((id) => readSetRef.current.add(id))
    setJobsMap((prev) => {
      const next: JobsMap = {}
      for (const [id, job] of Object.entries(prev)) {
        next[id] = { ...job, unread: false }
      }
      return next
    })
  }, [])

  const dismissJob = useCallback((jobId: string) => {
    dismissedSetRef.current.add(jobId)
    markJobRead(jobId)
    setJobsMap((prev) => {
      const next = { ...prev }
      delete next[jobId]
      return next
    })
    void dismissJobNotificationApi(jobId).catch((err) => {
      console.warn('[JobNotifications] Failed to persist dismiss:', err)
      dismissedSetRef.current.delete(jobId)
    })
  }, [markJobRead])

  const getJob = useCallback((jobId: string) => jobsMapRef.current[jobId], [])

  const isJobActive = useCallback(
    (jobId: string) => {
      const job = jobsMapRef.current[jobId]
      return job ? isActiveJobStatus(job.status) : false
    },
    []
  )

  const applySnapshot = useCallback(
    (jobs: TrackedJob[]) => {
      jobs.forEach((job) => {
        if (dismissedSetRef.current.has(job.jobId)) {
          return
        }
        const wasRead = readSetRef.current.has(job.jobId)
        upsertJob(
          {
            ...job,
            unread: !wasRead && (job.status === 'completed' || job.status === 'failed'),
          },
          { markUnread: !wasRead && (job.status === 'completed' || job.status === 'failed') }
        )
      })
    },
    [upsertJob]
  )

  const handleWsMessage = useCallback(
    (raw: Record<string, unknown>) => {
      const event = String(raw.event || raw.type || '')

      if (event === 'snapshot' && Array.isArray(raw.jobs)) {
        const parsed = raw.jobs
          .map((j) => normalizeJobFromApi(j as Record<string, unknown>))
          .filter(Boolean) as TrackedJob[]
        applySnapshot(parsed)
        return
      }

      if (event === 'ping') return

      const jobId = String(raw.job_id || '')
      if (!jobId || dismissedSetRef.current.has(jobId)) return

      const status = mapWsStatus(
        typeof raw.type === 'string' ? raw.type : undefined,
        typeof raw.status === 'string' ? raw.status : undefined
      )

      upsertJob({
        jobId,
        studyId: String(raw.study_id || jobsMapRef.current[jobId]?.studyId || ''),
        studyTitle:
          typeof raw.study_title === 'string'
            ? raw.study_title
            : jobsMapRef.current[jobId]?.studyTitle,
        jobKind:
          raw.job_kind === 'simulate_ai'
            ? 'simulate_ai'
            : jobsMapRef.current[jobId]?.jobKind || 'task_generation',
        status,
        progress: typeof raw.progress === 'number' ? raw.progress : undefined,
        message: typeof raw.message === 'string' ? raw.message : undefined,
        error: typeof raw.error === 'string' ? raw.error : undefined,
        respondentsRequested:
          typeof raw.respondents_requested === 'number' ? raw.respondents_requested : undefined,
        respondentsCompleted:
          typeof raw.respondents_completed === 'number' ? raw.respondents_completed : undefined,
      })

      const job = jobsMapRef.current[jobId]
      if (job?.jobKind === 'task_generation') {
        syncStep7JobState(jobId, job.studyId)
      }

      if (status === 'completed' && job?.jobKind === 'task_generation') {
        try {
          localStorage.removeItem(STEP7_JOB_KEY)
        } catch {
          /* ignore */
        }
      }
    },
    [applySnapshot, syncStep7JobState, upsertJob]
  )

  const pollActiveJobs = useCallback(async () => {
    try {
      const jobs = await listActiveJobs(true)
      applySnapshot(jobs)
    } catch {
      /* silent fallback */
    }
  }, [applySnapshot])

  const startPollingFallback = useCallback(() => {
    if (pollTimerRef.current) return
    pollTimerRef.current = setInterval(() => {
      void pollActiveJobs()
    }, 10000)
  }, [pollActiveJobs])

  const stopPollingFallback = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const connectWebSocket = useCallback(async () => {
    if (stoppedRef.current || !isAuthenticated) return

    const wsBase = getWebSocketBaseUrl()
    const token = getAccessTokenForWebSocket()

    if (!wsBase || !token) {
      startPollingFallback()
      return
    }

    if (wsRef.current) {
      try {
        wsRef.current.close()
      } catch {
        /* ignore */
      }
      wsRef.current = null
    }

    const wsUrl = `${wsBase}/ws/user/jobs?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      reconnectAttemptsRef.current = 0
      stopPollingFallback()
    }

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        handleWsMessage(data)
      } catch {
        /* ignore */
      }
    }

    ws.onerror = () => {
      setIsConnected(false)
    }

    ws.onclose = async (event) => {
      setIsConnected(false)
      wsRef.current = null

      if (stoppedRef.current) return

      if (event.code === 4001) {
        const refreshed = await refreshToken()
        if (refreshed) {
          reconnectAttemptsRef.current = 0
          connectWebSocket()
          return
        }
      }

      reconnectAttemptsRef.current += 1
      if (reconnectAttemptsRef.current > 8) {
        startPollingFallback()
        return
      }

      const delay = Math.min(1000 * 2 ** (reconnectAttemptsRef.current - 1), 30000)
      reconnectTimerRef.current = setTimeout(() => {
        void connectWebSocket()
      }, delay)
    }
  }, [
    handleWsMessage,
    isAuthenticated,
    refreshToken,
    startPollingFallback,
    stopPollingFallback,
  ])

  useEffect(() => {
    stoppedRef.current = false

    if (isLoading || !isAuthenticated) {
      setJobsMap({})
      dismissedSetRef.current = new Set()
      readSetRef.current = new Set()
      setIsConnected(false)
      if (wsRef.current) {
        try {
          wsRef.current.close()
        } catch {
          /* ignore */
        }
        wsRef.current = null
      }
      stopPollingFallback()
      return () => {
        stoppedRef.current = true
      }
    }

    void (async () => {
      try {
        const [jobs, dismissedIds] = await Promise.all([
          listActiveJobs(true),
          listDismissedJobIds(),
        ])
        dismissedSetRef.current = new Set(dismissedIds)
        applySnapshot(jobs)
      } catch {
        /* ignore hydrate errors */
      }
      void connectWebSocket()
    })()

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void pollActiveJobs()
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          void connectWebSocket()
        }
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      stoppedRef.current = true
      document.removeEventListener('visibilitychange', onVisible)
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      stopPollingFallback()
      if (wsRef.current) {
        try {
          wsRef.current.close()
        } catch {
          /* ignore */
        }
        wsRef.current = null
      }
    }
  }, [
    applySnapshot,
    connectWebSocket,
    isAuthenticated,
    isLoading,
    pollActiveJobs,
    stopPollingFallback,
  ])

  const jobs = useMemo(() => {
    return Object.values(jobsMap).sort((a, b) => b.updatedAt - a.updatedAt)
  }, [jobsMap])

  const activeJobs = useMemo(
    () => jobs.filter((j) => isActiveJobStatus(j.status)),
    [jobs]
  )

  const unreadCount = useMemo(
    () => jobs.filter((j) => j.unread || isActiveJobStatus(j.status)).length,
    [jobs]
  )

  const value = useMemo<JobNotificationContextValue>(
    () => ({
      jobs,
      activeJobs,
      unreadCount,
      isConnected,
      registerJob,
      watchJob,
      markJobRead,
      markAllRead,
      dismissJob,
      getJob,
      isJobActive,
      syncStep7JobState,
    }),
    [
      jobs,
      activeJobs,
      unreadCount,
      isConnected,
      registerJob,
      watchJob,
      markJobRead,
      markAllRead,
      dismissJob,
      getJob,
      isJobActive,
      syncStep7JobState,
    ]
  )

  return (
    <JobNotificationContext.Provider value={value}>
      {children}
    </JobNotificationContext.Provider>
  )
}

export function useJobNotifications(): JobNotificationContextValue {
  const ctx = useContext(JobNotificationContext)
  if (!ctx) {
    throw new Error('useJobNotifications must be used within JobNotificationProvider')
  }
  return ctx
}

/** Poll a single job via REST when global WS may have missed terminal state */
export async function pollJobUntilTerminal(
  jobId: string,
  onProgress?: (progress: number, message?: string) => void
): Promise<{ status: string; error?: string }> {
  const maxAttempts = 360
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getTaskGenerationStatus(jobId)
    const progress = typeof status.progress === 'number' ? status.progress : 0
    onProgress?.(progress, status.message)
    if (status.status === 'completed') return { status: 'completed' }
    if (status.status === 'failed') return { status: 'failed', error: status.error }
    await new Promise((r) => setTimeout(r, 5000))
  }
  return { status: 'timeout', error: 'Job polling timed out' }
}
