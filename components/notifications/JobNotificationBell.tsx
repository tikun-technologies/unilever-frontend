"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Bell,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Layers,
  Loader2,
  UserPlus,
  X,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useJobNotifications } from '@/lib/jobs/JobNotificationContext'
import type { TrackedJob } from '@/lib/jobs/jobTypes'
import {
  invitationKindLabel,
  isActiveJobStatus,
  isInvitationNotification,
  isJobNotification,
  jobKindLabel,
} from '@/lib/jobs/jobTypes'

const PREVIEW_COUNT = 4

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [breakpoint])

  return isMobile
}

interface NotificationItemProps {
  item: TrackedJob
  onDismiss: (notificationId: string) => void
  onRead: (notificationId: string) => void
  projectQuery?: string
}

function statusColor(item: TrackedJob): string {
  if (item.status === 'failed' || item.status === 'cancelled') return 'text-red-600'
  if (item.status === 'completed') return 'text-emerald-600'
  return 'text-[#2674BA]'
}

function itemHref(item: TrackedJob, projectQuery?: string): string {
  if (item.notificationType === 'project_invite' && item.projectId) {
    return `/home?proj_id=${encodeURIComponent(item.projectId)}`
  }
  if (item.notificationType === 'study_invite' && item.studyId) {
    return `/home/study/${item.studyId}${projectQuery || ''}`
  }
  const base = `/home/study/${item.studyId}`
  if (item.jobKind === 'simulate_ai') {
    return `${base}/synthetic-respondent${projectQuery || ''}`
  }
  return `/home/create-study${projectQuery || ''}`
}

function NotificationItem({
  item,
  onDismiss,
  onRead,
  projectQuery = '',
}: NotificationItemProps) {
  const active = isJobNotification(item) && isActiveJobStatus(item.status)
  const progress = Math.min(100, Math.max(0, Math.round(item.progress)))
  const title =
    item.resourceTitle || item.studyTitle || item.projectTitle || 'Untitled'
  const badgeLabel = isInvitationNotification(item)
    ? invitationKindLabel(item.notificationType)
    : jobKindLabel(item.jobKind || 'task_generation')
  const Icon = isInvitationNotification(item)
    ? item.notificationType === 'project_invite'
      ? FolderKanban
      : UserPlus
    : item.jobKind === 'simulate_ai'
      ? Bot
      : Layers

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={`relative rounded-xl border p-2.5 sm:p-4 transition-colors ${
        item.unread ? 'border-[#2674BA]/30 bg-blue-50/40' : 'border-gray-100 bg-white'
      }`}
    >
      <button
        type="button"
        onClick={() => onDismiss(item.notificationId)}
        className="absolute right-1 top-1 rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 sm:right-2 sm:top-2 sm:p-1"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex gap-2.5 pr-8 sm:gap-3 sm:pr-6">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${
            active ? 'bg-[#2674BA]/10' : 'bg-gray-100'
          }`}
        >
          {active ? (
            <Loader2 className={`h-4 w-4 animate-spin ${statusColor(item)}`} />
          ) : isInvitationNotification(item) ? (
            <Icon className="h-4 w-4 text-[#2674BA]" />
          ) : item.status === 'completed' ? (
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
              {badgeLabel}
            </span>
            {item.role && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium capitalize text-[#2674BA]">
                {item.role}
              </span>
            )}
          </div>

          <p className={`mt-1 text-xs sm:text-sm ${isInvitationNotification(item) ? 'text-gray-700' : statusColor(item)}`}>
            {isInvitationNotification(item)
              ? item.message
              : !active &&
                (item.status === 'completed'
                  ? 'Completed successfully'
                  : item.error || item.message || 'Failed')}
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

          {isInvitationNotification(item) && (
            <Link
              href={itemHref(item, projectQuery)}
              onClick={() => onRead(item.notificationId)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#2674BA] hover:underline"
            >
              {item.notificationType === 'project_invite' ? 'View project' : 'View study'}
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function JobNotificationBell() {
  const searchParams = useSearchParams()
  const projId = searchParams.get('proj_id') || searchParams.get('projectId')
  const projectQuery = projId ? `?proj_id=${encodeURIComponent(projId)}` : ''
  const isMobile = useIsMobile()

  const {
    jobs,
    unreadCount,
    markAllRead,
    markJobRead,
    dismissJob,
  } = useJobNotifications()

  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const allDisplayItems = useMemo(() => {
    const active = jobs.filter((j) => j.notificationType === 'job' && isActiveJobStatus(j.status))
    const activeIds = new Set(active.map((j) => j.notificationId))
    const rest = jobs.filter((j) => !activeIds.has(j.notificationId))
    return [...active, ...rest]
  }, [jobs])

  const visibleItems = useMemo(
    () => (showAll ? allDisplayItems : allDisplayItems.slice(0, PREVIEW_COUNT)),
    [allDisplayItems, showAll]
  )

  const hiddenCount = Math.max(0, allDisplayItems.length - PREVIEW_COUNT)
  const badgeCount = unreadCount

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setShowAll(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:border-[#2674BA]/30 hover:bg-blue-50/50 hover:text-[#2674BA] active:scale-95"
          aria-label="Notifications"
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
        align={isMobile ? 'center' : 'end'}
        side={isMobile ? 'bottom' : 'bottom'}
        sideOffset={isMobile ? 10 : 8}
        collisionPadding={isMobile ? 12 : 8}
        className={`z-50 border-gray-200 p-0 shadow-xl ${
          isMobile
            ? 'w-[calc(100vw-0.75rem)] max-w-none rounded-2xl'
            : 'w-[min(calc(100vw-1.5rem),24rem)] rounded-xl'
        }`}
      >
        <div className="border-b border-gray-100 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {allDisplayItems.length > 0 && (
                <p className="text-[11px] text-gray-500 sm:text-xs">
                  {showAll
                    ? `${allDisplayItems.length} total`
                    : `Showing ${Math.min(PREVIEW_COUNT, allDisplayItems.length)} of ${allDisplayItems.length}`}
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="shrink-0 rounded-md px-2 py-1.5 text-[10px] font-medium text-[#2674BA] hover:bg-blue-50 hover:underline sm:text-xs"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        <div
          className={`overflow-y-auto overscroll-contain p-2.5 sm:p-4 ${
            showAll ? 'max-h-[min(70dvh,28rem)]' : 'max-h-[min(52dvh,20rem)] sm:max-h-[min(60dvh,22rem)]'
          }`}
        >
          <AnimatePresence mode="popLayout">
            {visibleItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 text-center sm:py-10"
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 sm:h-12 sm:w-12">
                  <Bell className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">No notifications</p>
              </motion.div>
            ) : (
              <div className="space-y-2.5 sm:space-y-3">
                {visibleItems.map((item) => (
                  <NotificationItem
                    key={item.notificationId}
                    item={item}
                    projectQuery={projectQuery}
                    onDismiss={dismissJob}
                    onRead={markJobRead}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {(hiddenCount > 0 || showAll) && allDisplayItems.length > PREVIEW_COUNT && (
          <div className="border-t border-gray-100 px-2.5 py-2 sm:px-3 sm:py-2.5">
            {!showAll ? (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="flex w-full min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#2674BA]/5 px-3 py-2.5 text-sm font-semibold text-[#2674BA] transition-colors hover:bg-[#2674BA]/10 active:scale-[0.99]"
              >
                View all notifications
                <span className="rounded-full bg-[#2674BA]/15 px-2 py-0.5 text-xs font-bold">
                  {allDisplayItems.length}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className="flex w-full min-h-11 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 active:scale-[0.99]"
              >
                Show less
                <ChevronUp className="h-4 w-4 shrink-0" />
              </button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
