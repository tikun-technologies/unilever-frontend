import { clearMergeState } from "@/lib/config/mergedStudies"

export const QUOTA_CLOSED_MESSAGE =
  "This response has been removed. You can no longer continue this study."

const PARTICIPATE_STORAGE_KEYS = [
  "study_session",
  "current_study_details",
  "current_study_creator_email",
  "personal_info",
  "session_metrics",
  "classification_answers",
  "post_classification_answers",
  "post_classification_completed",
  "current_panelist_id",
  "current_study_skip_completed_storage",
  "study_response_times",
  "pending_task_responses",
  "redirect_rid",
]

/** True when this study saved a respondent limit on a screening option. */
export function studyDetailsHaveOptionQuotas(): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = localStorage.getItem("current_study_details")
    if (!raw) return false
    const study = JSON.parse(raw)
    const questions = Array.isArray(study?.classification_questions) ? study.classification_questions : []
    return questions.some((question: { optional_classification_question?: boolean; config?: { optional_classification_question?: boolean }; answer_options?: Array<{ max_respondents?: number }>; options?: Array<{ max_respondents?: number }> }) => {
      const optional = question?.optional_classification_question === true || question?.config?.optional_classification_question === true
      if (optional) return false
      const options = question?.answer_options || question?.options || []
      return options.some((option) => {
        const limit = Number(option?.max_respondents)
        return Number.isInteger(limit) && limit >= 1
      })
    })
  } catch {
    return false
  }
}

/** Drop the in-progress study so this attempt cannot open tasks or the thank-you redirect. */
export function markStudyQuotaClosed(studyId: string) {
  if (typeof window === "undefined" || !studyId) return
  try {
    localStorage.removeItem(`quota_closed_${studyId}`)
    for (const key of PARTICIPATE_STORAGE_KEYS) {
      localStorage.removeItem(key)
    }
    clearMergeState()
    sessionStorage.removeItem("task_img_cache")
  } catch {
    /* private mode */
  }
}

/** Samplicio over-quota callback. RIS=40 is their quota-full status. */
const QUOTA_FULL_REDIRECT_BASE = "https://samplicio.us/s/ClientCallBack.aspx?RIS=40"

/**
 * Over-quota redirect. The respondent id captured from rid, RID, frid, or firid
 * is written into the RID parameter.
 */
export function quotaFullRedirectUrl(rid: string | null, serverUrl?: string | null): string | null {
  const base = (serverUrl || process.env.NEXT_PUBLIC_CINT_QUOTA_FULL_URL || QUOTA_FULL_REDIRECT_BASE).trim()
  if (!base) return null
  try {
    const url = new URL(base)
    if (rid) url.searchParams.set("RID", rid)
    return url.toString()
  } catch {
    if (!rid) return base
    const join = base.includes("?") ? "&" : "?"
    return `${base}${join}RID=${encodeURIComponent(rid)}`
  }
}
