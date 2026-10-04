/**
 * Bounded HLS warm-up for video studies.
 * One clip at a time, a few seconds of the small rendition only.
 * A phone keeps two paused players before the reel opens, and one hidden
 * player once a clip is on screen, so the buffer survives until it is shown.
 */

type WarmSlot = { key: string; video: HTMLVideoElement }

/** Paused players kept alive so Safari does not throw the buffer away. */
const pool: WarmSlot[] = []
let loading: WarmSlot | null = null
const pending: string[] = []
const onScreen = new Set<string>()
let pumping = false

function poolLimit() {
  // On screen players are separate elements. Once the reel is open, keep a
  // single hidden player so a phone is not decoding four clips at once.
  if (isPhone()) return onScreen.size > 0 ? 1 : 2
  return 3
}

function isPhone() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
}

export function isHlsUrl(src: string) {
  return src.split("?")[0].toLowerCase().endsWith(".m3u8")
}

export function posterFor(src: string) {
  if (!isHlsUrl(src)) return undefined
  return src.replace(/master\.m3u8(\?.*)?$/i, "poster.jpg$1")
}

/** 360p playlist. Safari cannot be told to start low, so the phone plays this directly. */
export function lowQualityHlsUrl(src: string) {
  if (!/master\.m3u8/i.test(src)) return src
  return src.replace(/master\.m3u8/i, "360/index.m3u8")
}

let nativeDecision: boolean | null = null

/**
 * Apple's player is the only dependable native HLS. Android Chrome also
 * answers "maybe" to canPlayType, but its native HLS path stalls, so every
 * non-Apple browser with MSE plays through hls.js instead.
 */
export function prefersNativeHls(): boolean {
  if (typeof document === "undefined") return false
  if (nativeDecision !== null) return nativeDecision
  const probe = document.createElement("video")
  const canNative = probe.canPlayType("application/vnd.apple.mpegurl") !== ""
  const appleWebKit = typeof navigator !== "undefined" && navigator.vendor === "Apple Computer, Inc."
  const hasMse = "MediaSource" in window || "ManagedMediaSource" in window
  nativeDecision = canNative && (appleWebKit || !hasMse)
  return nativeDecision
}

const supportsNativeHls = prefersNativeHls

function mediaKey(url: string) {
  return lowQualityHlsUrl(url).split("?")[0]
}

function heldCount() {
  return pool.length + (loading ? 1 : 0)
}

function discardVideo(video: HTMLVideoElement) {
  try {
    video.pause()
    video.removeAttribute("src")
    video.load()
    video.remove()
  } catch {
    /* already gone */
  }
}

function parkVideo(video: HTMLVideoElement) {
  video.muted = true
  video.defaultMuted = true
  video.playsInline = true
  video.preload = "auto"
  video.setAttribute("playsinline", "")
  video.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none"
  if (!video.isConnected) document.body.appendChild(video)
}

function trimPool() {
  // Only buffered players count here. An in-flight load must not evict a
  // player that is already usable.
  while (pool.length > poolLimit()) {
    const extra = pool.pop()
    if (extra) discardVideo(extra.video)
  }
}

let pumpScheduled = false

/**
 * Run the pump after the current task. All clips of a reel mount in one React
 * commit, so each gets to claim its parked player before any trimming happens.
 */
function schedulePump() {
  if (pumpScheduled || typeof window === "undefined") return
  pumpScheduled = true
  window.setTimeout(() => {
    pumpScheduled = false
    void pump()
  }, 0)
}

function bufferUntilFrame(video: HTMLVideoElement) {
  return new Promise<void>((resolve) => {
    if (video.readyState >= 2) {
      resolve()
      return
    }
    const finish = () => {
      window.clearTimeout(timer)
      video.removeEventListener("loadeddata", finish)
      video.removeEventListener("error", finish)
      resolve()
    }
    const timer = window.setTimeout(finish, 12000)
    video.addEventListener("loadeddata", finish, { once: true })
    video.addEventListener("error", finish, { once: true })
  })
}

/**
 * Hand the paused player for this clip to the on-screen reel.
 * Returns null when nothing is buffered yet, so the reel starts its own element.
 */
export function claimWarmVideo(url: string): HTMLVideoElement | null {
  if (!url) return null
  const matches = (key: string) => key === mediaKey(url) || key === url.split("?")[0]
  let video: HTMLVideoElement | null = null
  if (loading && matches(loading.key)) {
    video = loading.video
    loading = null
  } else {
    const index = pool.findIndex((slot) => matches(slot.key))
    if (index >= 0) video = pool.splice(index, 1)[0].video
  }
  if (video) video.style.cssText = ""
  schedulePump()
  return video
}

/**
 * A mounted reel clip owns its URL: the hidden pool must not load a second
 * copy of it, and while any clip is mounted the phone keeps one hidden player.
 */
export function setWarmPlaybackInterest(url: string, active: boolean) {
  if (!url) return
  const key = mediaKey(url)
  if (active) onScreen.add(key)
  else onScreen.delete(key)
  schedulePump()
}

/** The on-screen player owns this clip, so the hidden pool must not load it again. */
export function releaseWarmInterest(url: string) {
  if (!url) return
  onScreen.delete(mediaKey(url))
  onScreen.delete(url.split("?")[0])
}

function fetchWithCap(url: string, signal: AbortSignal) {
  return fetch(url, { credentials: "omit", mode: "cors", signal })
}

async function fetchPlaylist(url: string, signal: AbortSignal): Promise<{ text: string; base: string } | null> {
  const response = await fetchWithCap(url, signal)
  if (!response.ok) return null
  const text = await response.text()
  return { text, base: url.slice(0, url.lastIndexOf("/") + 1) }
}

function mediaLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
}

/** Playlist plus the first few 2s segments. Sequential, so a phone opens one download at a time. */
async function warmSegments(master: string, segmentCount: number) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 8000)
  try {
    const low = lowQualityHlsUrl(master)
    let playlist = await fetchPlaylist(low, controller.signal)
    if (!playlist && low !== master) {
      const masterPlaylist = await fetchPlaylist(master, controller.signal)
      const variant = masterPlaylist ? mediaLines(masterPlaylist.text)[0] : ""
      if (masterPlaylist && variant) {
        const variantUrl = variant.startsWith("http") ? variant : masterPlaylist.base + variant
        playlist = await fetchPlaylist(variantUrl, controller.signal)
      }
    }
    if (!playlist) return
    const segments = mediaLines(playlist.text).slice(0, segmentCount)
    for (const segment of segments) {
      const url = segment.startsWith("http") ? segment : playlist.base + segment
      await fetchWithCap(url, controller.signal).catch(() => undefined)
    }
  } catch {
    /* warm-up is best-effort */
  } finally {
    window.clearTimeout(timer)
  }
}

/** Keep the paused player. Safari drops the buffer if this element is removed. */
async function warmNativeRetain(url: string): Promise<"kept" | "skip" | "full"> {
  const key = mediaKey(url)
  if (onScreen.has(key)) return "skip"
  if (pool.some((slot) => slot.key === key) || loading?.key === key) return "skip"
  if (heldCount() >= poolLimit()) return "full"
  const video = document.createElement("video")
  parkVideo(video)
  const slot: WarmSlot = { key, video }
  loading = slot
  video.src = lowQualityHlsUrl(url)
  await bufferUntilFrame(video)
  // claimWarmVideo took this element while it was buffering.
  if (loading !== slot) return "kept"
  loading = null
  if (onScreen.has(key) || video.readyState < 1 || !video.isConnected) {
    discardVideo(video)
    return "skip"
  }
  pool.push(slot)
  return "kept"
}

function rememberPoster(url: string) {
  const poster = posterFor(url)
  if (!poster) return
  const image = new Image()
  image.decoding = "async"
  image.src = poster
}

async function pump() {
  if (pumping) return
  pumping = true
  try {
    while (pending.length > 0) {
      trimPool()
      if (supportsNativeHls() && heldCount() >= poolLimit()) break
      const url = pending.shift()
      if (!url) break
      const key = mediaKey(url)
      if (onScreen.has(key)) continue
      if (pool.some((slot) => slot.key === key) || loading?.key === key) continue
      rememberPoster(url)
      if (supportsNativeHls()) {
        // Safari will not reuse a fetch() cache. The paused <video> is the buffer.
        if (heldCount() >= poolLimit()) {
          pending.unshift(url)
          break
        }
        const result = await warmNativeRetain(url)
        if (result === "full") {
          pending.unshift(url)
          break
        }
        continue
      }
      await warmSegments(url, 4)
    }
  } finally {
    pumping = false
  }
}

/** Queue the next clips. priority puts them ahead of the following task. */
export function prewarmVideoUrls(urls: string[], priority = false) {
  if (typeof document === "undefined") return
  const incoming = priority ? [...urls].reverse() : urls
  for (const url of incoming) {
    if (!url || !isHlsUrl(url)) continue
    const key = mediaKey(url)
    if (onScreen.has(key)) continue
    if (pool.some((slot) => slot.key === key) || loading?.key === key) continue
    const existing = pending.findIndex((item) => mediaKey(item) === key)
    if (existing >= 0) {
      if (!priority) continue
      pending.splice(existing, 1)
    }
    if (pending.length >= 5) {
      if (!priority) break
      pending.pop()
    }
    if (priority) pending.unshift(url)
    else pending.push(url)
  }
  schedulePump()
}

/**
 * Give native-HLS browsers a short head start on the currently selected clip.
 * Safari cannot use fetch()'s segment cache for media playback, so it needs a
 * parked <video> element whose buffer can be adopted by the visible player.
 */
export async function prewarmNativeVideoForPlayback(url: string, waitMs = 1200): Promise<boolean> {
  if (!url || !isHlsUrl(url) || !prefersNativeHls()) return false
  prewarmVideoUrls([url], true)

  const key = mediaKey(url)
  const deadline = Date.now() + Math.max(0, waitMs)
  while (Date.now() < deadline) {
    const slot = loading?.key === key ? loading : pool.find((item) => item.key === key) || null
    if (slot?.video.error) return false
    if (slot && slot.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return true
    await new Promise<void>((resolve) => window.setTimeout(resolve, 50))
  }
  return false
}

function collectTaskVideoUrls(task: unknown): string[] {
  if (!task || typeof task !== "object") return []
  const record = task as Record<string, unknown>
  const found: string[] = []
  const push = (value: unknown) => {
    if (typeof value === "string" && isHlsUrl(value)) found.push(value)
  }

  if (Array.isArray(record.gridUrls)) record.gridUrls.forEach(push)
  push(record.leftImageUrl)
  push(record.rightImageUrl)

  const content = record.elements_shown_content
  if (content && typeof content === "object") {
    Object.values(content as Record<string, unknown>).forEach((item) => {
      if (!item || typeof item !== "object") {
        push(item)
        return
      }
      const element = item as Record<string, unknown>
      const type = String(element.element_type || "").toLowerCase()
      if (type && type !== "video") return
      push(element.content)
      push(element.url)
    })
  }

  return Array.from(new Set(found))
}

/** Early pages: warm only one upcoming task, never the whole study. */
export function prewarmVideoPhase(
  tasks: unknown[],
  phase: "personal-info" | "classification" | "orientation",
) {
  const index = phase === "personal-info" ? 0 : phase === "classification" ? 1 : 2
  const task = tasks[index]
  if (!task) return
  prewarmVideoUrls(collectTaskVideoUrls(task))
}
