import { API_BASE_URL } from "./LoginApi"
import { fetchWithAuth } from "./StudyAPI"
import { SHARE_REVOKED_MESSAGE } from "@/lib/analyticsShare"

export interface AnalyticsShareStatus {
  is_shared: boolean
  token?: string | null
  created_at?: string | null
  study_id?: string | null
  title?: string | null
  study_type?: string | null
  status?: string | null
}

function detailFromBody(data: any, fallback: string): string {
  const detail = data?.detail ?? data?.message
  if (typeof detail === "string" && detail.trim()) return detail
  return fallback
}

export async function getStudyAnalyticsShare(studyId: string): Promise<AnalyticsShareStatus> {
  const res = await fetchWithAuth(`${API_BASE_URL}/studies/${encodeURIComponent(studyId)}/analytics-share`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(detailFromBody(data, "Failed to load share status")), {
      status: res.status,
      data,
    })
  }
  return data
}

export async function createStudyAnalyticsShare(studyId: string): Promise<AnalyticsShareStatus> {
  const res = await fetchWithAuth(`${API_BASE_URL}/studies/${encodeURIComponent(studyId)}/analytics-share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(detailFromBody(data, "Failed to create share link")), {
      status: res.status,
      data,
    })
  }
  return data
}

export async function revokeStudyAnalyticsShare(studyId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE_URL}/studies/${encodeURIComponent(studyId)}/analytics-share`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(detailFromBody(data, "Failed to revoke share link")), {
      status: res.status,
      data,
    })
  }
}

export async function resolveAnalyticsShare(token: string): Promise<AnalyticsShareStatus> {
  const res = await fetch(`${API_BASE_URL}/share/analytics/${encodeURIComponent(token)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = detailFromBody(
      data,
      res.status === 403 ? SHARE_REVOKED_MESSAGE : "This share link is invalid or has expired."
    )
    throw Object.assign(new Error(message), { status: res.status, data })
  }
  return data
}
