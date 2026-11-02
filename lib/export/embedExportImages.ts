import { withExportTimeout } from "@/lib/export/withExportTimeout"

const HTTP_URL_RE = /^https?:\/\//i
const IMAGE_EMBED_CONCURRENCY = 5
const IMAGE_TIMEOUT_MS = 10_000
const IMAGE_BUDGET_MS = 30_000

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && HTTP_URL_RE.test(value)
}

function isVideoUrl(value: string): boolean {
  const cleanUrl = value.split("?")[0].split("#")[0]
  return /\.(mp4|m4v|mov|webm|m3u8)$/i.test(cleanUrl) || /\/video\/upload\//i.test(cleanUrl)
}

const EXPORT_IMAGE_EDGE = 1400
const EXPORT_IMAGE_QUALITY = 75

function getProxiedImageUrl(url: string): string {
  const params = new URLSearchParams({
    url,
    w: String(EXPORT_IMAGE_EDGE),
    q: String(EXPORT_IMAGE_QUALITY),
    fmt: "webp",
  })
  return `/api/proxy-image?${params.toString()}`
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

export const EXPORT_IMAGE_TOKEN_PREFIX = "msimg:"

function isDataImage(value: string): boolean {
  return value.startsWith("data:image/")
}

function isPackableImage(value: string): boolean {
  if (isDataImage(value)) return true
  return isHttpUrl(value) && !isVideoUrl(value)
}

export function collectImageSources(value: unknown, urls = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    if (isPackableImage(value)) urls.add(value)
    return urls
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectImageSources(item, urls))
    return urls
  }
  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => collectImageSources(item, urls))
  }
  return urls
}

export function applyImageTokens<T>(value: T, tokens: Map<string, string>): T {
  if (typeof value === "string") return (tokens.get(value) || value) as T
  if (Array.isArray(value)) return value.map((item) => applyImageTokens(item, tokens)) as T
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      next[key] = applyImageTokens(item, tokens)
    }
    return next as T
  }
  return value
}

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(blob)
  })
}

async function compressDataUrl(dataUrl: string): Promise<string | null> {
  if (dataUrl.length < 160_000) return dataUrl
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") return dataUrl
  try {
    const comma = dataUrl.indexOf(",")
    if (comma < 0) return dataUrl
    const header = dataUrl.slice(0, comma)
    const mime = /data:([^;,]+)/i.exec(header)?.[1] || "image/png"
    const binary = atob(dataUrl.slice(comma + 1))
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    const bitmap = await createImageBitmap(new Blob([bytes], { type: mime }))
    const scale = Math.min(1, EXPORT_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) {
      bitmap.close?.()
      return dataUrl
    }
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", EXPORT_IMAGE_QUALITY / 100))
    if (!blob) return dataUrl
    const packed = await blobToDataUrl(blob)
    if (!packed || packed.length >= dataUrl.length) return dataUrl
    return packed
  } catch {
    return dataUrl
  }
}

export function collectHttpUrls(value: unknown, urls = new Set<string>()): Set<string> {
  if (isHttpUrl(value)) {
    // Keep playable video URLs streamable in the exported configurator instead
    // of trying to fetch and embed full clips as if they were image thumbnails.
    if (isVideoUrl(value)) return urls
    urls.add(value)
    return urls
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectHttpUrls(item, urls))
    return urls
  }
  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => collectHttpUrls(item, urls))
  }
  return urls
}

async function fetchAsDataUrl(url: string, timeoutMs = IMAGE_TIMEOUT_MS): Promise<string | null> {
  const controller = new AbortController()
  try {
    return await withExportTimeout((async () => {
      const response = await fetch(getProxiedImageUrl(url), { signal: controller.signal })
      if (!response.ok) return null
      const blob = await response.blob()
      if (blob.type && !blob.type.startsWith("image/")) return null
      return blobToDataUrl(blob)
    })(), timeoutMs, "Image download timed out")
  } catch {
    return null
  } finally {
    controller.abort()
  }
}

export async function embedImagesInValue<T>(
  value: T,
  urlMap: Map<string, string>,
  onProgress?: (done: number, total: number) => void
): Promise<T> {
  if (isHttpUrl(value)) {
    return (urlMap.get(value) || value) as T
  }
  if (Array.isArray(value)) {
    const next = await Promise.all(value.map((item) => embedImagesInValue(item, urlMap, onProgress)))
    return next as T
  }
  if (value && typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value as Record<string, unknown>).map(async ([key, item]) => [
        key,
        await embedImagesInValue(item, urlMap, onProgress),
      ])
    )
    return Object.fromEntries(entries) as T
  }
  return value
}

export async function buildImageDataUrlMap(
  urls: Iterable<string>,
  onProgress?: (done: number, total: number) => void
): Promise<{ map: Map<string, string>; failed: string[] }> {
  const unique = Array.from(new Set(urls))
  const map = new Map<string, string>()
  const failed: string[] = []
  let done = 0

  let nextIndex = 0
  const workerCount = Math.min(IMAGE_EMBED_CONCURRENCY, unique.length)

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < unique.length) {
        const url = unique[nextIndex]
        nextIndex += 1

        const dataUrl = await fetchAsDataUrl(url)
        if (dataUrl) map.set(url, dataUrl)
        else failed.push(url)
        done += 1
        onProgress?.(done, unique.length)
      }
    })
  )

  return { map, failed }
}

/**
 * Fetch each image once, resized, and replace every copy with `msimg:<id>`.
 * The HTML file keeps a single compressed copy instead of repeating the bytes.
 */
export async function packExportImages<T>(
  value: T,
  onProgress?: (done: number, total: number) => void,
  reportArtwork?: Record<string, string | null>,
): Promise<{ value: T; images: Record<string, string>; failed: string[] }> {
  const sources = Array.from(collectImageSources(value))
  const images: Record<string, string> = {}
  const tokens = new Map<string, string>()
  const failed: string[] = []
  const deadline = Date.now() + IMAGE_BUDGET_MS
  onProgress?.(0, sources.length)
  await yieldToUi()

  let done = 0
  let nextIndex = 0
  const workerCount = Math.min(IMAGE_EMBED_CONCURRENCY, sources.length)

  async function worker() {
    while (nextIndex < sources.length) {
      const index = nextIndex
      nextIndex += 1
      const source = sources[index]
      const remaining = deadline - Date.now()
      let packed: string | null = null
      if (reportArtwork && Object.prototype.hasOwnProperty.call(reportArtwork, source)) {
        // Retain the exact live-PPT bytes and alpha. Do not recompress them.
        packed = reportArtwork[source]
      } else if (isDataImage(source)) {
        packed = remaining > 0
          ? await withExportTimeout(compressDataUrl(source), Math.min(IMAGE_TIMEOUT_MS, remaining), "Image compression timed out").catch(() => source)
          : source
      } else if (remaining > 0) {
        packed = await fetchAsDataUrl(source, Math.min(IMAGE_TIMEOUT_MS, remaining))
      }
      if (packed) {
        const id = String(index + 1)
        images[id] = packed
        tokens.set(source, `${EXPORT_IMAGE_TOKEN_PREFIX}${id}`)
      } else {
        failed.push(source)
      }
      done += 1
      onProgress?.(done, sources.length)
      await yieldToUi()
    }
  }

  if (workerCount > 0) {
    await Promise.all(Array.from({ length: workerCount }, () => worker()))
  }

  return { value: applyImageTokens(value, tokens), images, failed }
}
