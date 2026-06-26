"use client"

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Bell,
  Bot,
  CheckCircle2,
  ExternalLink,
  Layers,
  Loader2,
  X,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useJobNotifications } from '@/lib/jobs/JobNotificationContext'
import type { TrackedJob } from '@/lib/jobs/jobTypes'
import { isActiveJobStatus, jobKindLabel } from '@/lib/jobs/jobTypes'

interface JobNotificationItemProps {
  job: TrackedJob
  onDismiss: (jobId: string) => void
  onRead: (jobId: string) => void
  projectQuery?: string
}

function statusColor(job: TrackedJob): string {
  if (job.status === 'failed' || job.status === 'cancelled') return 'text-red-600'
  if (job.status === 'completed') return 'text-emerald-600'
  return 'text-[#2674BA]'
}

function jobHref(job: TrackedJob, projectQuery?: string): string {
  const base = `/home/study/${job.studyId}`
  if (job.jobKind === 'simulate_ai') {
    return `${base}/synthetic-respondent${projectQuery || ''}`
  }
  return `/home/create-study${projectQuery || ''}`
}

export function JobNotificationItem({
  job,
  onDismiss,
  onRead,
  projectQuery = '',
}: JobNotificationItemProps) {
  const active = isActiveJobStatus(job.status)
  const progress = Math.min(100, Math.max(0, Math.round(job.progress)))
  const title = job.studyTitle || 'Untitled Study'
  const Icon = job.jobKind === 'simulate_ai' ? Bot : Layers

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={`relative rounded-xl border p-3 sm:p-4 transition-colors ${
        job.unread ? 'border-[#2674BA]/30 bg-blue-50/40' : 'border-gray-100 bg-white'
      }`}
    >
      <button
        type="button"
        onClick={() => onDismiss(job.jobId)}
        className="absolute right-2 top-2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex gap-3 pr-6">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            active ? 'bg-[#2674BA]/10' : 'bg-gray-100'
          }`}
        >
          {active ? (
            <Loader2 className={`h-4 w-4 animate-spin ${statusColor(job)}`} />
          ) : job.status === 'completed' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600">
              <Icon className="h-3 w-3" />
              {jobKindLabel(job.jobKind)}
            </span>
          </div>

          <p className={`mt-1 text-xs sm:text-sm ${statusColor(job)}`}>
            {!active &&
              (job.status === 'completed'
                ? 'Completed successfully'
                : job.error || job.message || 'Failed')}
          </p>

          {active && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                <span>Progress</span>
                <span className="font-medium text-gray-700">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#2674BA] to-[#3d8fd4]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          {/* <Link
            href={jobHref(job, projectQuery)}
            onClick={() => onRead(job.jobId)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#2674BA] hover:underline"
          >
            {active ? 'View progress' : 'View study'}
            <ExternalLink className="h-3 w-3" />
          </Link> */}
        </div>
      </div>
    </motion.div>
  )
}

export function JobNotificationBell() {
  const searchParams = useSearchParams()
  const projId = searchParams.get('proj_id') || searchParams.get('projectId')
  const projectQuery = projId ? `?proj_id=${encodeURIComponent(projId)}` : ''

  const {
    jobs,
    activeJobs,
    unreadCount,
    markAllRead,
    markJobRead,
    dismissJob,
  } = useJobNotifications()

  const [open, setOpen] = useState(false)

  const displayJobs = useMemo(() => {
    const active = jobs.filter((j) => isActiveJobStatus(j.status))
    const recent = jobs.filter((j) => !isActiveJobStatus(j.status)).slice(0, 8)
    return [...active, ...recent]
  }, [jobs])

  const badgeCount = activeJobs.length || unreadCount

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:border-[#2674BA]/30 hover:bg-blue-50/50 hover:text-[#2674BA]"
          aria-label="Job notifications"
        >
          <Bell className="h-4 w-4" />
          {badgeCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2674BA] px-1 text-[10px] font-bold text-white shadow-sm">
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(100vw-1.5rem,24rem)] border-gray-200 p-0 shadow-xl"
      >
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[10px] font-medium text-[#2674BA] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[min(70vh,28rem)] overflow-y-auto p-3 sm:p-4">
          <AnimatePresence mode="popLayout">
            {displayJobs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-10 text-center"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Bell className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">No notifications</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {displayJobs.map((job) => (
                  <JobNotificationItem
                    key={job.jobId}
                    job={job}
                    projectQuery={projectQuery}
                    onDismiss={dismissJob}
                    onRead={markJobRead}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </PopoverContent>
    </Popover>
  )
}
