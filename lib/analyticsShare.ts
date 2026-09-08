export const ANALYTICS_SHARE_HEADER = "X-Analytics-Share-Token"
export const ANALYTICS_SHARE_REVOKED_EVENT = "analytics-share-revoked"

export const SHARE_REVOKED_MESSAGE =
  "This shared dashboard has been revoked. All shared access was deleted."

let analyticsShareToken: string | null = null

export function setAnalyticsShareToken(token: string | null) {
  analyticsShareToken = token?.trim() || null
}

export function getAnalyticsShareToken(): string | null {
  return analyticsShareToken
}

export function isAnalyticsShareView(): boolean {
  return Boolean(analyticsShareToken)
}

export function isShareRevokedDetail(detail: unknown): boolean {
  if (typeof detail !== "string") return false
  return /revok|deleted|reverted/i.test(detail)
}

export function emitAnalyticsShareRevoked(message = SHARE_REVOKED_MESSAGE) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(ANALYTICS_SHARE_REVOKED_EVENT, { detail: message }))
}

export function buildAnalyticsShareUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  return `${origin}/share/analytics/${encodeURIComponent(token)}`
}
