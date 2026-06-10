import { API_BASE_URL } from "@/lib/api/LoginApi"
import { fetchWithAuth } from "@/lib/api/StudyAPI"

export type OnboardingStatus = {
  onboarding_completed: boolean
  onboarding_skipped: boolean
  create_study_onboarding_completed: boolean
  create_study_onboarding_skipped: boolean
  show_dashboard_onboarding: boolean
  show_create_study_onboarding: boolean
}

export type ValidateTokenOnboardingFields = Partial<OnboardingStatus>

const DEFAULT_STATUS: OnboardingStatus = {
  onboarding_completed: false,
  onboarding_skipped: false,
  create_study_onboarding_completed: false,
  create_study_onboarding_skipped: false,
  show_dashboard_onboarding: true,
  show_create_study_onboarding: true,
}

export function normalizeOnboardingStatus(
  data?: ValidateTokenOnboardingFields | null
): OnboardingStatus {
  if (!data) return { ...DEFAULT_STATUS }

  const dashboardDone =
    data.onboarding_completed === true ||
    data.onboarding_skipped === true ||
    data.show_dashboard_onboarding === false

  const createStudyDone =
    data.create_study_onboarding_completed === true ||
    data.create_study_onboarding_skipped === true ||
    data.show_create_study_onboarding === false

  return {
    onboarding_completed: dashboardDone,
    onboarding_skipped: data.onboarding_skipped === true,
    create_study_onboarding_completed: createStudyDone,
    create_study_onboarding_skipped: data.create_study_onboarding_skipped === true,
    show_dashboard_onboarding: data.show_dashboard_onboarding ?? !dashboardDone,
    show_create_study_onboarding: data.show_create_study_onboarding ?? !createStudyDone,
  }
}

export function readStoredOnboardingStatus(): OnboardingStatus {
  try {
    const raw = localStorage.getItem("user")
    if (!raw) return { ...DEFAULT_STATUS }
    const user = JSON.parse(raw)
    return normalizeOnboardingStatus(user)
  } catch {
    return { ...DEFAULT_STATUS }
  }
}

export function persistOnboardingStatusToUser(status: OnboardingStatus) {
  try {
    const raw = localStorage.getItem("user")
    if (!raw) return
    const user = JSON.parse(raw)
    const nextUser = {
      ...user,
      onboarding_completed: status.onboarding_completed,
      onboarding_skipped: status.onboarding_skipped,
      show_dashboard_onboarding: status.show_dashboard_onboarding,
      show_create_study_onboarding: status.show_create_study_onboarding,
      dashboard_onboarding_completed: status.onboarding_completed && !status.onboarding_skipped,
      dashboard_onboarding_skipped: status.onboarding_skipped,
      create_study_onboarding_completed:
        status.create_study_onboarding_completed && !status.create_study_onboarding_skipped,
      create_study_onboarding_skipped: status.create_study_onboarding_skipped,
    }
    localStorage.setItem("user", JSON.stringify(nextUser))
  } catch {
    // ignore storage errors
  }
}

export function clearLegacyOnboardingPendingFlags() {
  try {
    localStorage.removeItem("mindsurve_onboarding_pending")
    sessionStorage.removeItem("mindsurve_onboarding_pending")
    Object.keys(localStorage).forEach((key) => {
      if (
        key.startsWith("mindsurve_onboarding_pending:") ||
        key.startsWith("mindsurve_onboarding_completed:")
      ) {
        localStorage.removeItem(key)
      }
    })
  } catch {
    // ignore storage errors
  }
}

export function persistDashboardOnboardingDismissed(skipped: boolean) {
  const status = normalizeOnboardingStatus({
    onboarding_completed: true,
    onboarding_skipped: skipped,
    show_dashboard_onboarding: false,
  })
  persistOnboardingStatusToUser(status)
  clearLegacyOnboardingPendingFlags()
  return status
}

async function postOnboarding(path: string): Promise<OnboardingStatus> {
  const res = await fetchWithAuth(`${API_BASE_URL}/auth/onboarding/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { detail?: string })?.detail || "Failed to update onboarding status")
  }

  const data = (await res.json()) as ValidateTokenOnboardingFields
  const status = normalizeOnboardingStatus(data)
  persistOnboardingStatusToUser(status)
  return status
}

export function completeDashboardOnboarding() {
  return postOnboarding("dashboard/complete")
}

export function skipDashboardOnboarding() {
  return postOnboarding("dashboard/skip")
}

export function completeCreateStudyOnboarding() {
  return postOnboarding("create-study/complete")
}

export function skipCreateStudyOnboarding() {
  return postOnboarding("create-study/skip")
}

export function resetOnboarding() {
  return postOnboarding("reset")
}

export const CREATE_STUDY_WALKTHROUGH_RESTART_KEY = "create_study_walkthrough_restart"
export const CREATE_STUDY_ONBOARDING_ACTIVE_KEY = "create_study_onboarding_active"
export const CREATE_STUDY_GUIDE_SHOWN_UP_TO_KEY = "create_study_guide_shown_up_to"

export function clearCreateStudyWalkthroughSession() {
  try {
    sessionStorage.removeItem(CREATE_STUDY_ONBOARDING_ACTIVE_KEY)
    sessionStorage.removeItem(CREATE_STUDY_GUIDE_SHOWN_UP_TO_KEY)
    sessionStorage.setItem(CREATE_STUDY_WALKTHROUGH_RESTART_KEY, "true")
  } catch {
    // ignore storage errors
  }
}

export function clearCreateStudyWalkthroughRestartFlag() {
  try {
    sessionStorage.removeItem(CREATE_STUDY_WALKTHROUGH_RESTART_KEY)
  } catch {
    // ignore storage errors
  }
}

export function isCreateStudyWalkthroughRestartPending() {
  try {
    return sessionStorage.getItem(CREATE_STUDY_WALKTHROUGH_RESTART_KEY) === "true"
  } catch {
    return false
  }
}

export function shouldShowCreateStudyWalkthrough() {
  return readStoredOnboardingStatus().show_create_study_onboarding || isCreateStudyWalkthroughRestartPending()
}

export async function prepareWalkthroughRestart() {
  await resetOnboarding()
  clearCreateStudyWalkthroughSession()
  return normalizeOnboardingStatus({
    onboarding_completed: false,
    onboarding_skipped: false,
    create_study_onboarding_completed: false,
    create_study_onboarding_skipped: false,
    show_dashboard_onboarding: true,
    show_create_study_onboarding: true,
  })
}
