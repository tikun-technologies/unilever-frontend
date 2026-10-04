/**
 * Sanitized playback diagnostics for video studies.
 * Keeps a small ring buffer (window.__videoDiag()) and mirrors warnings to the
 * console. Never logs query strings, so SAS tokens cannot leak.
 * Enable the on-screen overlay with ?videoDebug=1 (sticks for the session).
 */

export type VideoDiagEntry = {
  at: number
  clip: string
  event: string
  data?: Record<string, unknown>
}

const MAX_ENTRIES = 200
const entries: VideoDiagEntry[] = []
let overlayEnabled: boolean | null = null

const WARN_EVENTS = new Set([
  "media-error",
  "play-rejected",
  "stall-recover",
  "hls-error",
  "claim-discarded",
  "fatal",
])

export function videoDiagEnabled(): boolean {
  if (typeof window === "undefined") return false
  if (overlayEnabled !== null) return overlayEnabled
  try {
    const fromQuery = /[?&]videoDebug=1\b/.test(window.location.search)
    if (fromQuery) window.sessionStorage.setItem("video_debug", "1")
    overlayEnabled = fromQuery || window.sessionStorage.getItem("video_debug") === "1"
  } catch {
    overlayEnabled = false
  }
  return overlayEnabled
}

/** Asset folder + file name only. The query string is dropped on purpose. */
export function videoClipLabel(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean)
    return parts.slice(-2).join("/") || "clip"
  } catch {
    return "clip"
  }
}

export function videoDiag(clip: string, event: string, data?: Record<string, unknown>): string {
  const entry: VideoDiagEntry = { at: Date.now(), clip, event, data }
  entries.push(entry)
  if (entries.length > MAX_ENTRIES) entries.shift()
  const stamp = new Date(entry.at).toISOString().slice(11, 23)
  const line = `${stamp} ${event}${data ? " " + JSON.stringify(data) : ""}`
  if (WARN_EVENTS.has(event)) console.warn(`[video ${clip}] ${line}`)
  else if (overlayEnabled) console.info(`[video ${clip}] ${line}`)
  return line
}

export function getVideoDiag(): VideoDiagEntry[] {
  return entries.slice()
}

/** Snapshot of the media element state that matters when something stalls. */
export function mediaSnapshot(node: HTMLMediaElement): Record<string, unknown> {
  return {
    rs: node.readyState,
    ns: node.networkState,
    t: Number(node.currentTime.toFixed(2)),
    paused: node.paused,
    muted: node.muted,
  }
}

if (typeof window !== "undefined") {
  ;(window as unknown as { __videoDiag?: () => VideoDiagEntry[] }).__videoDiag = getVideoDiag
}
