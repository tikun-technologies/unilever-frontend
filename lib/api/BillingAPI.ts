/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_BASE_URL, ApiError } from '@/lib/api/LoginApi'
import { fetchWithAuth } from '@/lib/api/StudyAPI'
import { normalizePlanTier, type PlanTier } from '@/lib/config/planLimits'

export type SubscriptionStatus =
  | 'none'
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'

export interface PlanLimitsOut {
  max_categories: number
  max_elements_per_category: number
  max_layers: number
  max_images_per_layer: number
  ai_respondent_limit: number
  can_share_study: boolean
  can_analysis_export: boolean
  can_basic_export: boolean
}

export interface BillingStatus {
  plan: PlanTier
  subscription_status: SubscriptionStatus
  current_period_start?: string | null
  current_period_end?: string | null
  limits: PlanLimitsOut
  usage: {
    ai_respondents_used: number
    studies_created: number
  }
  stripe_customer_id?: string | null
  has_active_subscription: boolean
}

export interface StudyLiveAccess {
  study_id: string
  live_participants_allowed: boolean
  live_participants_paid: boolean
  live_participants_included_by_plan: boolean
  live_participants_unlocked: boolean
  requires_payment: boolean
  amount_cents: number
  plan: PlanTier
  currency: string
  unlock_source: 'none' | 'paid' | 'plan' | 'ai_only'
}

export interface StudyCheckoutResponse {
  checkout_url: string
  session_id: string
  payment_id: string
}

export interface SubscriptionCheckoutResponse {
  checkout_url: string
  session_id: string
}

async function parseApiResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const text = await res.text().catch(() => '')
  let data: any = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { detail: text }
  }

  if (!res.ok) {
    const detail = data?.detail
    const message =
      typeof detail === 'string'
        ? detail
        : detail?.message || data?.message || fallbackMessage
    throw new ApiError(message, res.status, data)
  }

  return data as T
}

/**
 * GET /api/v1/billing/status
 */
export async function getBillingStatus(): Promise<BillingStatus> {
  const res = await fetchWithAuth(`${API_BASE_URL}/billing/status`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await parseApiResponse<BillingStatus>(res, 'Failed to fetch billing status')
  return {
    ...data,
    plan: normalizePlanTier(data.plan),
  }
}

/**
 * GET /api/v1/billing/study/{studyId}/live-access
 */
export async function getStudyLiveAccess(studyId: string): Promise<StudyLiveAccess> {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/billing/study/${encodeURIComponent(studyId)}/live-access`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  )
  const data = await parseApiResponse<StudyLiveAccess>(res, 'Failed to fetch study live access')
  return {
    ...data,
    plan: normalizePlanTier(data.plan),
  }
}

export interface StudyCheckoutPayload {
  study_id: string
  success_url: string
  cancel_url: string
}

/**
 * POST /api/v1/billing/study-checkout
 * Creates a Stripe Checkout session for the one-time $10 live participant unlock.
 */
export async function createStudyCheckout(
  payload: StudyCheckoutPayload
): Promise<StudyCheckoutResponse> {
  const res = await fetchWithAuth(`${API_BASE_URL}/billing/study-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseApiResponse<StudyCheckoutResponse>(res, 'Failed to start study checkout')
}

export interface SubscriptionCheckoutPayload {
  success_url: string
  cancel_url: string
}

/**
 * POST /api/v1/billing/subscription-checkout
 * Creates a Stripe Checkout session for Pro subscription.
 */
export async function createSubscriptionCheckout(
  payload: SubscriptionCheckoutPayload
): Promise<SubscriptionCheckoutResponse> {
  const res = await fetchWithAuth(`${API_BASE_URL}/billing/subscription-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseApiResponse<SubscriptionCheckoutResponse>(
    res,
    'Failed to start subscription checkout'
  )
}

/**
 * Poll live-access until webhook processing completes after Stripe redirect.
 */
/**
 * Poll billing status until Pro subscription is active (after Stripe redirect + webhook).
 */
export async function waitForActiveSubscription(
  {
    maxAttempts = 8,
    intervalMs = 1500,
  }: {
    maxAttempts?: number
    intervalMs?: number
  } = {}
): Promise<BillingStatus> {
  let last: BillingStatus | null = null
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    last = await getBillingStatus()
    if (
      last.has_active_subscription ||
      last.plan === 'pro' ||
      last.plan === 'enterprise'
    ) {
      return last
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }

  if (last) return last
  throw new ApiError('Timed out waiting for subscription confirmation')
}

export async function waitForStudyLiveAccess(
  studyId: string,
  {
    maxAttempts = 8,
    intervalMs = 1500,
    predicate,
  }: {
    maxAttempts?: number
    intervalMs?: number
    predicate?: (access: StudyLiveAccess) => boolean
  } = {}
): Promise<StudyLiveAccess> {
  const isUnlocked = predicate ?? ((access) => access.live_participants_allowed)

  let last: StudyLiveAccess | null = null
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    last = await getStudyLiveAccess(studyId)
    if (isUnlocked(last)) return last
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }

  if (last) return last
  throw new ApiError('Timed out waiting for study unlock confirmation')
}
