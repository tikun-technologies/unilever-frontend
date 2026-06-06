'use client'

import { useAuth } from '@/lib/auth/AuthContext'
import { getPlanLimits, type PlanLimits } from '@/lib/config/planLimits'

export function usePlanLimits(): PlanLimits {
  const { plan } = useAuth()
  return getPlanLimits(plan)
}
