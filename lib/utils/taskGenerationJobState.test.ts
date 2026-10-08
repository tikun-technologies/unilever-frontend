import { describe, expect, it } from "vitest"
import {
  jobStateFromPreview,
  previewJobId,
  shouldPersistStep7Job,
} from "./taskGenerationJobState"
import { resolvePrecheckDecision } from "./taskGenerationPrecheck"

describe("preview job id", () => {
  it("reads the preview field jobid", () => {
    expect(previewJobId({ jobid: "job-1" })).toBe("job-1")
    expect(previewJobId({ jobId: "job-2" })).toBe("job-2")
    expect(previewJobId({ job_id: "job-3" })).toBe("job-3")
  })

  it("ignores a blank job id", () => {
    expect(previewJobId({ jobid: "  " })).toBeNull()
    expect(previewJobId({})).toBeNull()
    expect(previewJobId(null)).toBeNull()
  })

  it("builds job state only when the preview includes a job", () => {
    expect(jobStateFromPreview("study-a", {})).toBeNull()
    const stored = jobStateFromPreview("study-a", { jobid: "job-9", progress: 12 })
    expect(stored?.jobId).toBe("job-9")
    expect(stored?.studyId).toBe("study-a")
    expect(stored?.status.status).toBe("processing")
    expect(stored?.progress).toBe(12)
  })

  it("does not persist a job for a different open study", () => {
    expect(shouldPersistStep7Job("study-b", "study-a")).toBe(false)
    expect(shouldPersistStep7Job("study-a", "study-a")).toBe(true)
    expect(shouldPersistStep7Job(null, "study-a")).toBe(false)
    expect(shouldPersistStep7Job("study-a", "")).toBe(false)
  })
})

describe("precheck decision", () => {
  it("uses the returned task count when the study can generate", () => {
    expect(resolvePrecheckDecision({
      ok: true,
      can_generate: true,
      tasks_per_respondent: 116,
      multiplier: 2,
      reason: "ok",
    })).toEqual({ proceed: true, tasksPerRespondent: 116 })
  })

  it("does not start generation when the study cannot fit within 2x", () => {
    const decision = resolvePrecheckDecision({
      ok: true,
      can_generate: false,
      tasks_per_respondent: 116,
      multiplier: 2,
      reason: 'This study cannot be generated within 2.0× tasks per respondent. "06_Lozenge" has 14 images.',
    })
    expect(decision.proceed).toBe(false)
    if (!decision.proceed) {
      expect(decision.reason).toContain("06_Lozenge")
    }
  })

  it("falls back to 1.5x when the precheck request fails", () => {
    expect(resolvePrecheckDecision({ ok: false })).toEqual({ proceed: true, tasksPerRespondent: 0 })
  })

  it("falls back to 1.5x when the success payload has no task count", () => {
    expect(resolvePrecheckDecision({
      ok: true,
      can_generate: true,
      tasks_per_respondent: 0,
      multiplier: 1.5,
      reason: "ok",
    })).toEqual({ proceed: true, tasksPerRespondent: 0 })
  })
})
