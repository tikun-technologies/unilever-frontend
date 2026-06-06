export class PlanUpgradeRequiredError extends Error {
  readonly code = 'plan_upgrade_required'
  readonly status = 402
  readonly requiredPlan: string

  constructor(message: string, requiredPlan = 'pro') {
    super(message)
    this.name = 'PlanUpgradeRequiredError'
    this.requiredPlan = requiredPlan
  }
}

export function isPlanUpgradeRequiredError(error: unknown): error is PlanUpgradeRequiredError {
  return error instanceof PlanUpgradeRequiredError
}

export function parsePlanUpgradeError(
  responseStatus: number,
  errorData: unknown
): PlanUpgradeRequiredError | null {
  if (responseStatus !== 402) return null

  const detail =
    typeof errorData === 'object' && errorData !== null && 'detail' in errorData
      ? (errorData as { detail?: unknown }).detail
      : undefined

  if (typeof detail === 'object' && detail !== null && 'code' in detail) {
    const code = (detail as { code?: string }).code
    if (code === 'plan_upgrade_required') {
      const message =
        typeof (detail as { message?: string }).message === 'string'
          ? (detail as { message: string }).message
          : 'Please upgrade to Pro for complete analysis.'
      const requiredPlan =
        typeof (detail as { required_plan?: string }).required_plan === 'string'
          ? (detail as { required_plan: string }).required_plan
          : 'pro'
      return new PlanUpgradeRequiredError(message, requiredPlan)
    }
  }

  return null
}
