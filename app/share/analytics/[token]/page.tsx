"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { StudyAnalyticsDashboard } from "@/app/home/study/[id]/analytics/StudyAnalyticsDashboard"
import { DashboardHeader } from "@/app/home/components/dashboard-header"
import { resolveAnalyticsShare } from "@/lib/api/AnalyticsShareAPI"
import {
  ANALYTICS_SHARE_REVOKED_EVENT,
  SHARE_REVOKED_MESSAGE,
  setAnalyticsShareToken,
} from "@/lib/analyticsShare"

export default function SharedAnalyticsPage() {
  const params = useParams()
  const token = typeof params.token === "string" ? params.token : ""
  const [studyId, setStudyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setError("This share link is invalid or has expired.")
      setLoading(false)
      return
    }

    setAnalyticsShareToken(token)
    let cancelled = false

    resolveAnalyticsShare(token)
      .then((status) => {
        if (cancelled) return
        if (!status.study_id) {
          setError("This share link is invalid or has expired.")
          return
        }
        setStudyId(status.study_id)
      })
      .catch((e) => {
        if (cancelled) return
        setError((e as Error)?.message || SHARE_REVOKED_MESSAGE)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    const onRevoked = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      setError(detail || SHARE_REVOKED_MESSAGE)
      setStudyId(null)
    }
    window.addEventListener(ANALYTICS_SHARE_REVOKED_EVENT, onRevoked)

    return () => {
      cancelled = true
      window.removeEventListener(ANALYTICS_SHARE_REVOKED_EVENT, onRevoked)
      setAnalyticsShareToken(null)
    }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader variant="shared" />
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#2674BA] border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-gray-600">Opening shared analytics…</p>
        </div>
      </div>
    )
  }

  if (error || !studyId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader variant="shared" />
        <div className="mx-auto max-w-xl px-4 py-16">
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-gray-900">Shared access ended</h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              {error || SHARE_REVOKED_MESSAGE}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <StudyAnalyticsDashboard studyId={studyId} isSharedView />
}
