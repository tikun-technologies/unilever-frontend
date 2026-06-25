export const CONFIGURATOR_THUMB_WIDTH = 240
export const CONFIGURATOR_PREVIEW_WIDTH = 720
export const CONFIGURATOR_IMAGE_QUALITY = 82
export const CONFIGURATOR_PRELOAD_BATCH_SIZE = 8
export const CONFIGURATOR_PREVIEW_PRELOAD_BATCH_SIZE = 2

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function shouldUseOptimizedProxy(): boolean {
  if (typeof window === "undefined") return true
  return window.location.protocol !== "file:"
}

export function getConfiguratorOptimizedImageUrl(
  url: string | null | undefined,
  width: number,
  quality: number = CONFIGURATOR_IMAGE_QUALITY
): string {
  if (!url) return ""
  if (!isHttpUrl(url)) return url
  if (!shouldUseOptimizedProxy()) return url

  const params = new URLSearchParams({
    url,
    w: String(width),
    q: String(quality),
    fmt: "webp",
  })
  return `/api/proxy-image?${params.toString()}`
}

export function getConfiguratorThumbnailUrl(url: string | null | undefined): string {
  return getConfiguratorOptimizedImageUrl(url, CONFIGURATOR_THUMB_WIDTH)
}

export function getConfiguratorPreviewUrl(url: string | null | undefined): string {
  return getConfiguratorOptimizedImageUrl(url, CONFIGURATOR_PREVIEW_WIDTH)
}

/** Full-resolution proxy for canvas export / file download (not display). */
export function getConfiguratorExportProxyUrl(url: string): string {
  if (!isHttpUrl(url)) return url
  if (typeof window !== "undefined" && window.location.protocol === "file:") return url
  if (typeof window !== "undefined" && url.includes(window.location.host)) return url
  return `/api/proxy-image?url=${encodeURIComponent(url)}`
}

export function collectConfiguratorDisplayUrls(input: {
  backgroundUrl?: string | null
  categories: Array<{ elements: Array<{ imageUrl?: string | null; elementType?: string }> }>
}): { previewUrls: string[]; thumbnailUrls: string[] } {
  const previewUrls = new Set<string>()
  const thumbnailUrls = new Set<string>()

  input.categories.forEach((category) => {
    category.elements.forEach((element) => {
      const isText = !element.imageUrl || element.elementType?.toLowerCase() === "text"
      if (isText || !element.imageUrl) return
      const thumb = getConfiguratorThumbnailUrl(element.imageUrl)
      if (thumb) thumbnailUrls.add(thumb)
    })
  })

  return {
    previewUrls: [...previewUrls],
    thumbnailUrls: [...thumbnailUrls],
  }
}
