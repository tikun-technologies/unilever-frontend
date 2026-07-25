/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_BASE_URL } from "./LoginApi"
import { fetchWithAuth } from "./StudyAPI"
import type { AssistantQueryRequest, AssistantQueryResponse } from "@/lib/types/analyticsAssistant"

function normalizeStudyId(studyId: string): string {
  return String(studyId || "").trim()
}

export async function postAnalyticsAssistantQuery(
  studyId: string,
  payload: AssistantQueryRequest,
  signal?: AbortSignal
): Promise<AssistantQueryResponse> {
  const cleanId = normalizeStudyId(studyId)
  if (!cleanId) throw new Error("Study ID is required")

  const response = await fetchWithAuth(
    `${API_BASE_URL}/studies/${encodeURIComponent(cleanId)}/assistant/query`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    }
  )

  const text = await response.text().catch(() => "")
  let data: any = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { detail: text }
  }

  if (!response.ok) {
    const msg =
      (data && (data.detail || data.message)) ||
      text ||
      `Assistant query failed (${response.status})`
    throw Object.assign(new Error(typeof msg === "string" ? msg : JSON.stringify(msg)), {
      status: response.status,
      data,
    })
  }

  return data as AssistantQueryResponse
}
