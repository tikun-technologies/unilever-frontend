"use client"

import { useParams, usePathname } from "next/navigation"
import { useEffect } from "react"

function participateStepLabel(pathname: string): string | null {
  const lower = pathname.toLowerCase()
  if (lower.includes("/thank-you")) return "Thank you"
  if (lower.includes("/tasks")) return "Tasks"
  if (lower.includes("/orientation-page")) return "Orientation"
  if (lower.includes("/personal-information")) return "Your details"
  if (lower.includes("/product-id")) return "Product ID"
  if (lower.includes("/classification-questions")) return "Questions"
  if (lower.includes("/fragrance-like")) return "Fragrance"
  // Root intro URL: keep server metadata title until session storage has the name
  return null
}

function readStudyTitleForParticipate(expectedStudyId: string): string {
  if (typeof window === "undefined") return ""
  try {
    const sessionRaw = localStorage.getItem("study_session")
    if (sessionRaw) {
      const { studyId: sid } = JSON.parse(sessionRaw) as { studyId?: string }
      if (sid != null && String(sid) !== String(expectedStudyId)) return ""
    }
  } catch {
    /* ignore */
  }
  try {
    const raw = localStorage.getItem("current_study_details")
    if (!raw) return ""
    const p = JSON.parse(raw) as {
      study_id?: string
      study_info?: { id?: string; title?: string }
      title?: string
    }
    const storedId = p?.study_id ?? p?.study_info?.id
    if (storedId != null && String(storedId) !== String(expectedStudyId)) return ""
    const t = p?.study_info?.title ?? p?.title
    if (t && String(t).trim()) return String(t).trim()
  } catch {
    /* ignore */
  }
  return ""
}

function buildTitle(studyId: string, pathname: string): string | null {
  const name = readStudyTitleForParticipate(studyId)
  const step = participateStepLabel(pathname)
  if (name) {
    return step ? `${name} · ${step}` : `${name}`
  }
  if (step) {
    return `Study · ${step}`
  }
  return null
}

function applyTitle(studyId: string, pathname: string) {
  if (!studyId) return
  const next = buildTitle(studyId, pathname)
  if (next) document.title = next
}

/**
 * Keeps the browser tab title in sync on client navigations under /participate/[id].
 * Server layout metadata handles the first paint; this updates step labels and localStorage-backed titles.
 */
export function ParticipateStudyDocumentTitle() {
  const params = useParams<{ id: string }>()
  const pathname = usePathname() || ""
  const studyId = params?.id ?? ""

  useEffect(() => {
    if (!studyId) return
    applyTitle(studyId, pathname)

    const onStorage = (e: StorageEvent) => {
      if (e.key === "current_study_details" || e.key === "study_session") {
        applyTitle(studyId, pathname)
      }
    }
    window.addEventListener("storage", onStorage)
    const t1 = window.setTimeout(() => applyTitle(studyId, pathname), 400)
    const t2 = window.setTimeout(() => applyTitle(studyId, pathname), 1200)
    const t3 = window.setTimeout(() => applyTitle(studyId, pathname), 2500)

    return () => {
      window.removeEventListener("storage", onStorage)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [studyId, pathname])

  useEffect(() => {
    if (!studyId) return
    const onFocus = () => applyTitle(studyId, pathname)
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [studyId, pathname])

  return null
}
