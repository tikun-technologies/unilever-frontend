"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"

const DEFAULT_TITLE = "Study preview"

function readPreviewStudyTitle(): string {
  if (typeof window === "undefined") return ""
  try {
    const s1 = localStorage.getItem("cs_step1")
    if (s1) {
      const p = JSON.parse(s1) as { title?: string }
      const t = p?.title
      if (t && String(t).trim()) return String(t).trim()
    }
  } catch {
    /* ignore */
  }
  try {
    const d = localStorage.getItem("current_study_details")
    if (d) {
      const p = JSON.parse(d) as { study_info?: { title?: string }; title?: string }
      const t = p?.study_info?.title ?? p?.title
      if (t && String(t).trim()) return String(t).trim()
    }
  } catch {
    /* ignore */
  }
  return ""
}

function applyTitle() {
  const name = readPreviewStudyTitle()
  document.title = name ? name : DEFAULT_TITLE
}

/**
 * Sets the browser tab title from the preview study name for all routes under
 * /home/create-study/preview. Re-syncs after navigation and delayed hydration.
 */
export function PreviewParticipateDocumentTitle() {
  const pathname = usePathname()

  useEffect(() => {
    applyTitle()

    const onStorage = (e: StorageEvent) => {
      if (e.key === "cs_step1" || e.key === "current_study_details") applyTitle()
    }
    window.addEventListener("storage", onStorage)

    const t1 = window.setTimeout(applyTitle, 400)
    const t2 = window.setTimeout(applyTitle, 1200)
    const t3 = window.setTimeout(applyTitle, 2500)

    return () => {
      window.removeEventListener("storage", onStorage)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [pathname])

  useEffect(() => {
    const onFocus = () => applyTitle()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [])

  return null
}
