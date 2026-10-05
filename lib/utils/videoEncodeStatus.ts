"use client"

import { useEffect, useMemo, useSyncExternalStore } from "react"
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

const encodeByUrl = new Map<string, VideoEncodeItem>()
const encodeListeners = new Set<() => void>()
let encodeRevision = 0
let encodeSnapshotSeen = false

function emitEncodeStore() {
  encodeRevision += 1
  encodeListeners.forEach((listener) => listener())
}

function subscribeEncodeStore(listener: () => void) {
  encodeListeners.add(listener)
  return () => encodeListeners.delete(listener)
}

function readEncodeRevision() {
  return encodeRevision
}

function isHlsUrl(url: string) {
  return url.split("?")[0].toLowerCase().endsWith(".m3u8")
}

function itemFromEvent(raw: Record<string, unknown>): VideoEncodeItem | null {
  const url = typeof raw.url === "string" ? raw.url : ""
  if (!url) return null
  const status = typeof raw.status === "string" && raw.status ? raw.status : "processing"
  const playback = typeof raw.playback_url === "string" && raw.playback_url ? raw.playback_url : url
  const poster = typeof raw.poster_url === "string" ? raw.poster_url : null
  return { url, status, playback_url: playback, poster_url: poster }
}

/** Live encode update from the global jobs websocket. */
export function recordVideoEncodeEvent(raw: Record<string, unknown>) {
  const item = itemFromEvent(raw)
  if (!item) return
  encodeByUrl.set(item.url, item)
  emitEncodeStore()
}

/** Videos included with the jobs websocket snapshot when the socket connects. */
export function recordVideoEncodeSnapshot(items: unknown) {
  encodeSnapshotSeen = true
  if (Array.isArray(items)) {
    for (const raw of items) {
      if (!raw || typeof raw !== "object") continue
      const item = itemFromEvent(raw as Record<string, unknown>)
      if (item) encodeByUrl.set(item.url, item)
    }
  }
  emitEncodeStore()
}

function knownEncodeItem(url: string): VideoEncodeItem {
  const known = encodeByUrl.get(url)
  if (known) return known
  if (isHlsUrl(url)) {
    return { url, status: "ready", playback_url: url, poster_url: null }
  }
  return { url, status: "processing", playback_url: url, poster_url: null }
}

function summarizeKnown(urls: string[]): VideoEncodeSummary {
  const items = urls.map(knownEncodeItem)
  const byUrl: Record<string, VideoEncodeItem> = {}
  let ready = 0
  let processing = 0
  let failed = 0
  for (const item of items) {
    byUrl[item.url] = item
    if (item.status === "failed") failed += 1
    else if (item.status === "processing") processing += 1
    else ready += 1
  }
  return {
    items,
    ready,
    processing,
    failed,
    total: items.length,
    all_ready: processing === 0 && failed === 0,
    byUrl,
  }
}

export function useVideoEncodeGate(enabled: boolean, explicitUrls?: string[]) {
  const urlsKey = explicitUrls ? [...explicitUrls].sort().join("\n") : ""
  useSyncExternalStore(subscribeEncodeStore, readEncodeRevision, readEncodeRevision)

  const urls = useMemo(() => {
    if (!enabled) return [] as string[]
    if (explicitUrls) return explicitUrls.filter(Boolean)
    if (getCurrentStudyType() !== "video") return [] as string[]
    return collectVideoSourceUrls()
  }, [enabled, explicitUrls, urlsKey])

  // The socket snapshot covers videos uploaded after owner tracking. Ask once
  // about any clip it does not know, instead of polling status.
  useEffect(() => {
    if (!enabled || !encodeSnapshotSeen || urls.length === 0) return
    const unknown = urls.filter((url) => !encodeByUrl.has(url) && !isHlsUrl(url))
    if (unknown.length === 0) return
    let stopped = false
    void fetchVideoEncodeStatus(unknown)
      .then((summary) => {
        if (stopped) return
        summary.items.forEach((item) => encodeByUrl.set(item.url, item))
        emitEncodeStore()
      })
      .catch(() => {
        /* the next socket event still updates these clips */
      })
    return () => {
      stopped = true
    }
  }, [enabled, urls])

  const summary = !enabled || urls.length === 0 ? EMPTY : summarizeKnown(urls)
  const applies = enabled && urls.length > 0
  const blocked = applies && !summary.all_ready
  return {
    ...summary,
    loading: false,
    checked: true,
    checkError: null,
    blocked,
    message: videoEncodeMessage(summary),
  }
}
