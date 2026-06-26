import { API_BASE_URL } from '@/lib/api/LoginApi'
import { fetchWithAuth } from '@/lib/api/StudyAPI'
import type { TrackedJob } from './jobTypes'
import { normalizeJobFromApi } from './jobTypes'

export async function listActiveJobs(includeRecent = false): Promise<TrackedJob[]> {
  const url = `${API_BASE_URL}/auth/me/active-jobs?include_recent=${includeRecent ? 'true' : 'false'}`
  const res = await fetchWithAuth(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `Failed to load active jobs (${res.status})`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }

  const jobs = Array.isArray(data.jobs) ? data.jobs : []
  return jobs
    .map((j: Record<string, unknown>) => normalizeJobFromApi(j))
    .filter((j: TrackedJob | null): j is TrackedJob => j !== null)
}

export async function listDismissedJobIds(): Promise<string[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}/auth/me/dismissed-jobs`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `Failed to load dismissed jobs (${res.status})`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return Array.isArray(data.job_ids) ? data.job_ids.map(String) : []
}

export async function dismissJobNotification(jobId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE_URL}/auth/me/dismissed-jobs/${encodeURIComponent(jobId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const msg = (data && (data.detail || data.message)) || `Failed to dismiss notification (${res.status})`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
}

export function getWebSocketBaseUrl(): string | null {
  if (!API_BASE_URL) return null
  try {
    const url = new URL(API_BASE_URL)
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${wsProtocol}//${url.host}${url.pathname}`
  } catch {
    return null
  }
}

export function getAccessTokenForWebSocket(): string | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem('tokens')
    if (!raw) return null
    const tokens = JSON.parse(raw)
    return tokens?.access_token || null
  } catch {
    return null
  }
}
