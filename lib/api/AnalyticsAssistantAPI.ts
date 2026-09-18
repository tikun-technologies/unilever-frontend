/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_BASE_URL } from "./LoginApi"
import { fetchWithAuth } from "./StudyAPI"
import type {
  AssistantClearHistoryResponse,
  AssistantHistoryPage,
  AssistantQueryRequest,
  AssistantQueryResponse,
} from "@/lib/types/analyticsAssistant"

function normalizeStudyId(studyId: string): string {
  return String(studyId || "").trim()
}

async function parseJsonResponse(response: Response): Promise<any> {
  const text = await response.text().catch(() => "")
  let data: any = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { detail: text }
  }
  return { data, text }
}

function throwApiError(response: Response, data: any, text: string, fallback: string): never {
  const msg =
    (data && (data.detail || data.message)) ||
    text ||
    `${fallback} (${response.status})`
  throw Object.assign(new Error(typeof msg === "string" ? msg : JSON.stringify(msg)), {
    status: response.status,
    data,
  })
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

  const { data, text } = await parseJsonResponse(response)
  if (!response.ok) {
    throwApiError(response, data, text, "Assistant query failed")
  }

  return data as AssistantQueryResponse
}

export async function postAnalyticsAssistantQueryStream(
  studyId: string,
  payload: AssistantQueryRequest,
  handlers: {
    onThinking?: (text: string) => void
    onToken?: (text: string) => void
    onDone?: (response: AssistantQueryResponse) => void
    onError?: (message: string) => void
  } = {},
  signal?: AbortSignal
): Promise<AssistantQueryResponse> {
  const cleanId = normalizeStudyId(studyId)
  if (!cleanId) throw new Error("Study ID is required")

  const response = await fetchWithAuth(
    `${API_BASE_URL}/studies/${encodeURIComponent(cleanId)}/assistant/query/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(payload),
      signal,
    }
  )

  if (!response.ok) {
    const { data, text } = await parseJsonResponse(response)
    throwApiError(response, data, text, "Assistant query failed")
  }
  if (!response.body) {
    throw new Error("Assistant stream was empty")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let final: AssistantQueryResponse | null = null
  let streamError: string | null = null

  const consume = (raw: string) => {
    const line = raw
      .split("\n")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith("data:"))
    if (!line) return
    const jsonText = line.slice(line.indexOf(":") + 1).trim()
    if (!jsonText || jsonText === "[DONE]") return
    let parsed: { event?: string; data?: unknown } = {}
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      return
    }
    const event = parsed.event
    const data = parsed.data
    if (event === "thinking" && typeof data === "string" && data.trim()) {
      handlers.onThinking?.(data)
    } else if (event === "token" && data != null) {
      handlers.onToken?.(String(data))
    } else if (event === "done" && data && typeof data === "object") {
      final = data as AssistantQueryResponse
      handlers.onDone?.(final)
    } else if (event === "error") {
      streamError = typeof data === "string" ? data : "Assistant stream failed"
      handlers.onError?.(streamError)
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split("\n\n")
    buffer = chunks.pop() || ""
    chunks.forEach(consume)
  }
  if (buffer.trim()) consume(buffer)

  if (final) return final
  if (streamError) throw Object.assign(new Error(streamError), { status: 500 })
  throw new Error("Assistant stream ended without an answer")
}

export async function getAnalyticsAssistantHistory(
  studyId: string,
  options?: { limit?: number; before?: string | null; signal?: AbortSignal }
): Promise<AssistantHistoryPage> {
  const cleanId = normalizeStudyId(studyId)
  if (!cleanId) throw new Error("Study ID is required")

  const params = new URLSearchParams()
  if (options?.limit != null) params.set("limit", String(options.limit))
  if (options?.before) params.set("before", options.before)
  const qs = params.toString()

  const response = await fetchWithAuth(
    `${API_BASE_URL}/studies/${encodeURIComponent(cleanId)}/assistant/messages${qs ? `?${qs}` : ""}`,
    {
      method: "GET",
      signal: options?.signal,
    }
  )

  const { data, text } = await parseJsonResponse(response)
  if (!response.ok) {
    throwApiError(response, data, text, "Failed to load assistant history")
  }

  return data as AssistantHistoryPage
}

export async function downloadAnalyticsAssistantPpt(
  studyId: string,
  payload?: {
    filters?: Record<string, any> | null
    use_active_filters?: boolean
    metric?: string | null
    segment_section?: string | null
    segment_key?: string | null
  },
  signal?: AbortSignal
): Promise<{ blob: Blob; filename: string }> {
  const cleanId = normalizeStudyId(studyId)
  if (!cleanId) throw new Error("Study ID is required")

  const response = await fetchWithAuth(
    `${API_BASE_URL}/studies/${encodeURIComponent(cleanId)}/assistant/export-ppt`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      },
      body: JSON.stringify({
        filters: payload?.filters ?? null,
        use_active_filters: payload?.use_active_filters ?? true,
        metric: payload?.metric ?? "T",
        segment_section: payload?.segment_section ?? null,
        segment_key: payload?.segment_key ?? null,
      }),
      signal,
    }
  )

  if (!response.ok) {
    const { data, text } = await parseJsonResponse(response)
    throwApiError(response, data, text, "Failed to generate PowerPoint")
  }

  const blob = await response.blob()
  const disposition = response.headers.get("Content-Disposition") || ""
  const match = /filename=\"?([^\";]+)\"?/i.exec(disposition)
  const filename = match?.[1] || "MindSurve-analytics.pptx"
  return { blob, filename }
}

export async function clearAnalyticsAssistantHistory(
  studyId: string,
  signal?: AbortSignal
): Promise<AssistantClearHistoryResponse> {
  const cleanId = normalizeStudyId(studyId)
  if (!cleanId) throw new Error("Study ID is required")

  const response = await fetchWithAuth(
    `${API_BASE_URL}/studies/${encodeURIComponent(cleanId)}/assistant/messages`,
    {
      method: "DELETE",
      signal,
    }
  )

  const { data, text } = await parseJsonResponse(response)
  if (!response.ok) {
    throwApiError(response, data, text, "Failed to clear assistant history")
  }

  return data as AssistantClearHistoryResponse
}
