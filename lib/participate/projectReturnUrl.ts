/**
 * When a participant opens a study from /participate/project/[projectId], we store
 * that page URL so the thank-you screen can send them back to the project list.
 */

export const PARTICIPATE_PROJECT_RETURN_KEY = "participate_project_return"

export function setParticipateProjectReturnFromCurrentPage(studyId: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(
      PARTICIPATE_PROJECT_RETURN_KEY,
      JSON.stringify({
        url: window.location.href,
        studyId,
      })
    )
  } catch {
    /* ignore quota / private mode */
  }
}

export function readParticipateProjectReturn(studyId: string): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(PARTICIPATE_PROJECT_RETURN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { url?: string; studyId?: string }
    if (!parsed?.url || typeof parsed.url !== "string") return null
    if (parsed.studyId !== studyId) return null
    const u = new URL(parsed.url, window.location.origin)
    if (u.origin !== window.location.origin) return null
    if (!u.pathname.startsWith("/participate/project/")) return null
    return u.href
  } catch {
    return null
  }
}

export function clearParticipateProjectReturn(): void {
  try {
    localStorage.removeItem(PARTICIPATE_PROJECT_RETURN_KEY)
  } catch {
    /* ignore */
  }
}
