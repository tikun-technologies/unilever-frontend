"use client"

import { useEffect, useState } from "react"
import { API_BASE_URL } from "@/lib/api/LoginApi"
import { fetchWithAuth } from "@/lib/api/StudyAPI"
import { getCurrentStudyType } from "@/lib/utils/createStudyStorage"

export interface VideoEncodeItem {
  url: string
  status: "ready" | "processing" | "failed" | "unknown" | string
  playback_url: string
  poster_url?: string | null
}

export interface VideoEncodeSummary {
  items: VideoEncodeItem[]
  ready: number
  processing: number
  failed: number
  total: number
  all_ready: boolean
  byUrl: Record<string, VideoEncodeItem>
}

const EMPTY: VideoEncodeSummary = {
  items: [],
  ready: 0,
  processing: 0,
  failed: 0,
  total: 0,
  all_ready: true,
  byUrl: {},
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function looksLikeVideoUrl(value: string): boolean {
  const path = value.split("?")[0].toLowerCase()
  return /\.(mp4|webm|mov|m4v|m3u8)$/.test(path) || path.includes("/videos/") || path.includes("/videos-hls/")
}

export function collectVideoSourceUrls(): string[] {
  if (typeof window === "undefined") return []
  if (getCurrentStudyType() !== "video") return []
  try {
    const raw = localStorage.getItem("cs_step5_video")
    const categories = raw ? JSON.parse(raw) : []
    const urls: string[] = []
    for (const category of Array.isArray(categories) ? categories : []) {
      for (const element of category?.elements || []) {
        const url = typeof element?.secureUrl === "string" ? element.secureUrl : ""
        if (isHttpUrl(url)) urls.push(url)
      }
    }
    return Array.from(new Set(urls))
  } catch {
    return []
  }
}

export function collectVideoUrlsFromValue(value: unknown, found: string[] = []): string[] {
  if (typeof value === "string") {
    if (isHttpUrl(value) && looksLikeVideoUrl(value)) found.push(value)
    return found
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectVideoUrlsFromValue(item, found))
    return found
  }
  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => collectVideoUrlsFromValue(item, found))
  }
  return found
}

export function videoEncodeMessage(summary: VideoEncodeSummary): string | null {
  if (summary.total === 0 || summary.all_ready) return null
  if (summary.failed > 0 && summary.processing === 0) {
    return `${summary.failed} video${summary.failed === 1 ? "" : "s"} failed to process. Remove ${summary.failed === 1 ? "it" : "them"} in Study Structure and upload again.`
  }
  const done = summary.ready
  return `${done} of ${summary.total} videos processed. Task generation, preview, and launch stay closed until every video is ready.`
}

export async function fetchVideoEncodeStatus(urls: string[]): Promise<VideoEncodeSummary> {
  const unique = Array.from(new Set(urls.filter((url) => typeof url === "string" && url.length > 0)))
  if (unique.length === 0) return EMPTY
  const res = await fetchWithAuth(`${API_BASE_URL}/uploads/videos/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls: unique }),
  })
  if (!res.ok) {
    throw new Error(`Video status failed (${res.status})`)
  }
  const data = await res.json()
  const items: VideoEncodeItem[] = Array.isArray(data?.items) ? data.items : []
  const byUrl: Record<string, VideoEncodeItem> = {}
  items.forEach((item) => {
    if (item?.url) byUrl[item.url] = item
  })
  return {
    items,
    ready: Number(data?.ready || 0),
    processing: Number(data?.processing || 0),
    failed: Number(data?.failed || 0),
    total: Number(data?.total || items.length),
    all_ready: Boolean(data?.all_ready),
    byUrl,
  }
}

export function matrixStillHasRawVideo(): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = localStorage.getItem("cs_step7_matrix")
    if (!raw) return false
    const urls = Array.from(new Set(collectVideoUrlsFromValue(JSON.parse(raw))))
    return urls.some((url) => !url.split("?")[0].toLowerCase().endsWith(".m3u8"))
  } catch {
    return false
  }
}

export function useVideoEncodeGate(enabled: boolean, explicitUrls?: string[]) {
  const urlsKey = explicitUrls ? [...explicitUrls].sort().join("\n") : ""
  const [storageTick, setStorageTick] = useState(0)
  const [summary, setSummary] = useState<VideoEncodeSummary>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)

  useEffect(() => {
    if (explicitUrls) return
    const bump = () => setStorageTick((value) => value + 1)
    window.addEventListener("stepDataChanged", bump)
    return () => window.removeEventListener("stepDataChanged", bump)
  }, [explicitUrls])

  useEffect(() => {
    if (!enabled) {
      setSummary(EMPTY)
      setLoading(false)
      setChecked(true)
      setCheckError(null)
      return
    }
    let stopped = false
    let timer = 0

    const tick = async () => {
      const urls = explicitUrls ?? collectVideoSourceUrls()
      if (!explicitUrls && getCurrentStudyType() !== "video") {
        if (!stopped) {
          setSummary(EMPTY)
          setLoading(false)
          setChecked(true)
          setCheckError(null)
        }
        return
      }
      if (urls.length === 0) {
        if (!stopped) {
          setSummary(EMPTY)
          setLoading(false)
          setChecked(true)
          setCheckError(null)
        }
        return
      }
      try {
        const next = await fetchVideoEncodeStatus(urls)
        if (stopped) return
        setSummary(next)
        setLoading(false)
        setChecked(true)
        setCheckError(null)
        if (!next.all_ready) timer = window.setTimeout(tick, 4000)
      } catch {
        if (stopped) return
        setLoading(false)
        setChecked(true)
        setCheckError("Could not check video processing. Retrying...")
        timer = window.setTimeout(tick, 8000)
      }
    }

    setLoading(true)
    setChecked(false)
    void tick()
    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [enabled, urlsKey, storageTick, explicitUrls])

  const applies = enabled && (explicitUrls ? explicitUrls.length > 0 : getCurrentStudyType() === "video")
  const blocked = applies && (!checked || loading || !summary.all_ready || Boolean(checkError))
  return { ...summary, loading, checked, checkError, blocked, message: checkError || videoEncodeMessage(summary) }
}
