"use client"

import { useLayoutEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LandingPage } from "@/components/landing/landing-page"

/** Presence-only check: no JWT validation (handled on /home). */
function hasStoredAccessToken(): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = localStorage.getItem("tokens")
    if (!raw) return false
    const parsed = JSON.parse(raw) as { access_token?: unknown }
    const t = parsed?.access_token
    return typeof t === "string" && t.trim().length > 0
  } catch {
    return false
  }
}

export default function Page() {
  const router = useRouter()
  const [showLanding, setShowLanding] = useState(false)

  useLayoutEffect(() => {
    if (hasStoredAccessToken()) {
      router.replace("/home")
      return
    }
    setShowLanding(true)
  }, [router])

  if (!showLanding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div
          className="h-12 w-12 animate-spin rounded-full border-2 border-gray-200 border-t-[rgba(38,116,186,1)]"
          aria-label="Loading"
        />
      </div>
    )
  }

  return <LandingPage />
}