/* eslint-disable @typescript-eslint/no-explicit-any */
import { fetchWithAuth } from "@/lib/api/StudyAPI"
import { API_BASE_URL } from "@/lib/api/LoginApi"

export type TemplateStatus = "draft" | "published"
export type TemplateAspectRatio = "9:16" | "16:9" | "1:1"
export type TemplateSort = "newest" | "oldest" | "a-z"

export interface TemplateCreator {
  id?: string | null
  name?: string | null
  email?: string | null
}

export interface TemplateRecord {
  id: string
  title: string
  status: TemplateStatus
  aspect_ratio: TemplateAspectRatio
  layer_count: number
  element_count: number
  layer_json: Record<string, any>
  preview_metadata?: Record<string, any> | null
  created_by?: TemplateCreator | null
  created_at: string
  updated_at: string
  published_at?: string | null
}

export interface TemplateListResponse {
  items: TemplateRecord[]
  total: number
  page: number
  per_page: number
}

export interface TemplateCreatePayload {
  title: string
  aspect_ratio: TemplateAspectRatio
  status?: TemplateStatus
  layer_json: Record<string, any>
  preview_metadata?: Record<string, any> | null
}

export interface TemplateUpdatePayload {
  title?: string
  aspect_ratio?: TemplateAspectRatio
  layer_json?: Record<string, any>
  preview_metadata?: Record<string, any> | null
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data?.detail === "string") return data.detail
    if (Array.isArray(data?.detail)) {
      return data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
    }
    return data?.message || res.statusText || "Request failed"
  } catch {
    return res.statusText || "Request failed"
  }
}

/** @deprecated Prefer checkIsTemplateManager from specialCreators — UI no longer calls this on home. */
export async function fetchTemplatePermissions(): Promise<boolean> {
  const res = await fetchWithAuth(`${API_BASE_URL}/templates/permissions`)
  if (!res.ok) return false
  const data = await res.json()
  return Boolean(data?.can_manage)
}

export async function listPublishedTemplates(params?: {
  search?: string
  sort?: TemplateSort
  page?: number
  per_page?: number
}): Promise<TemplateListResponse> {
  const qs = new URLSearchParams()
  if (params?.search) qs.set("search", params.search)
  if (params?.sort) qs.set("sort", params.sort)
  if (params?.page) qs.set("page", String(params.page))
  if (params?.per_page) qs.set("per_page", String(params.per_page))
  const url = `${API_BASE_URL}/templates/published${qs.toString() ? `?${qs}` : ""}`
  const res = await fetchWithAuth(url)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function listManagedTemplates(params?: {
  status?: TemplateStatus | "all"
  search?: string
  sort?: TemplateSort
  page?: number
  per_page?: number
}): Promise<TemplateListResponse> {
  const qs = new URLSearchParams()
  if (params?.status && params.status !== "all") qs.set("status", params.status)
  if (params?.search) qs.set("search", params.search)
  if (params?.sort) qs.set("sort", params.sort)
  if (params?.page) qs.set("page", String(params.page))
  if (params?.per_page) qs.set("per_page", String(params.per_page))
  const url = `${API_BASE_URL}/templates${qs.toString() ? `?${qs}` : ""}`
  const res = await fetchWithAuth(url)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function getTemplate(id: string): Promise<TemplateRecord> {
  const res = await fetchWithAuth(`${API_BASE_URL}/templates/${id}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function createTemplate(payload: TemplateCreatePayload): Promise<TemplateRecord> {
  const res = await fetchWithAuth(`${API_BASE_URL}/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function updateTemplate(id: string, payload: TemplateUpdatePayload): Promise<TemplateRecord> {
  const res = await fetchWithAuth(`${API_BASE_URL}/templates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function publishTemplate(id: string): Promise<TemplateRecord> {
  const res = await fetchWithAuth(`${API_BASE_URL}/templates/${id}/publish`, { method: "POST" })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function moveTemplateToDraft(id: string): Promise<TemplateRecord> {
  const res = await fetchWithAuth(`${API_BASE_URL}/templates/${id}/draft`, { method: "POST" })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function deleteTemplate(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE_URL}/templates/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function validateTemplateTitle(title: string, excludeId?: string): Promise<{ available: boolean; message?: string }> {
  const res = await fetchWithAuth(`${API_BASE_URL}/templates/validate-title`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, exclude_id: excludeId || null }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}
