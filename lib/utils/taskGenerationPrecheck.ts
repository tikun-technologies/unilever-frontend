export interface TaskGenerationPrecheckResponse {
  can_generate: boolean
  multiplier: number
  tasks_per_respondent: number
  generated_respondents: number
  total_elements: number
  reason: string
  scarce_layer?: string | null
  expected_failures?: number
}

export type PrecheckDecisionInput =
  | { ok: false }
  | {
      ok: true
      can_generate: boolean
      tasks_per_respondent: number
      multiplier: number
      reason: string
    }

export type PrecheckDecision =
  | { proceed: true; tasksPerRespondent: number }
  | { proceed: false; reason: string }

/**
 * A failed or timed-out precheck continues at 1.5× (tasksPerRespondent 0).
 * A successful "cannot generate" response must not start the long job.
 */
export function resolvePrecheckDecision(result: PrecheckDecisionInput): PrecheckDecision {
  if (!result.ok) {
    return { proceed: true, tasksPerRespondent: 0 }
  }
  if (!result.can_generate) {
    return {
      proceed: false,
      reason: result.reason || "This study cannot be generated within 2.0× tasks per respondent.",
    }
  }
  const tasks = Number(result.tasks_per_respondent)
  if (!Number.isFinite(tasks) || tasks < 1) {
    return { proceed: true, tasksPerRespondent: 0 }
  }
  return { proceed: true, tasksPerRespondent: Math.round(tasks) }
}
