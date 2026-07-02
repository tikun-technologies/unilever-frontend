// === Participate image URLs ===
//
// The participate task flow (personal-info / classification / orientation
// preloads + the tasks page) historically rendered the *original* full-size
// PNGs straight from Azure Blob. For layer studies with many high-quality
// layers this meant tens/hundreds of MB of assets, causing long "Preparing
// assets" waits and heavy mobile memory use.
//
// This helper routes every task image through the on-the-fly optimizing proxy
// (`/api/proxy-image`) as a device-appropriate WebP. WebP keeps alpha
// transparency (required for layered overlays) and is typically 10-40x smaller
// than the source PNG with no visible quality loss.
//
// CRITICAL: the preloader and the <img src> MUST produce the *same* URL string,
// otherwise the pre-warmed HTTP cache entry won't be reused. To guarantee that,
// this module exposes a single deterministic transform (fixed width + quality,
// no window/DPR dependency) used by BOTH the cache manager and the renderer.

// One width for every participate image keeps the preload URL and the render
// URL identical (the preloader can't know a URL's on-screen size ahead of
// time). 1100px comfortably covers a full-screen square preview at DPR 2 while
// keeping per-image bytes small enough to stream 200-300 layer images.
export const PARTICIPATE_IMAGE_WIDTH = 1100
export const PARTICIPATE_IMAGE_QUALITY = 80

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

/**
 * Returns the display URL for a participate image.
 *
 * - http(s) URLs are rewritten to the optimizing WebP proxy.
 * - Non-remote URLs (blob:, data:, /local paths, placeholders) are returned
 *   unchanged so they still render.
 */
export function getParticipateImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return ''
  if (!isHttpUrl(url)) return url

  const params = new URLSearchParams({
    url,
    w: String(PARTICIPATE_IMAGE_WIDTH),
    q: String(PARTICIPATE_IMAGE_QUALITY),
    fmt: 'webp',
  })
  return `/api/proxy-image?${params.toString()}`
}
