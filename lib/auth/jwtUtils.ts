import { normalizePlanTier, type PlanTier } from '@/lib/config/planLimits'

export interface JwtClaims {
  plan?: PlanTier | string
  subscription_status?: string
  [key: string]: unknown
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  return atob(padded)
}

export function decodeJwtPayload(token: string): JwtClaims | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const decoded = decodeBase64Url(parts[1])
    return JSON.parse(decoded) as JwtClaims
  } catch {
    return null
  }
}

export function getPlanFromAccessToken(accessToken: string | undefined | null): PlanTier {
  if (!accessToken) return 'free'
  const claims = decodeJwtPayload(accessToken)
  return normalizePlanTier(claims?.plan)
}

export function getSubscriptionStatusFromAccessToken(
  accessToken: string | undefined | null
): string | null {
  if (!accessToken) return null
  const claims = decodeJwtPayload(accessToken)
  const status = claims?.subscription_status
  return typeof status === 'string' ? status : null
}
