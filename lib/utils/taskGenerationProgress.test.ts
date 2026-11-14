import { describe, expect, it } from "vitest"
import {
  SAVING_TASKS_MESSAGE,
  isTaskResultNotReady,
  presentTaskGenerationStatus,
  resolveTaskGenerationUpdate,
  shouldFetchTaskResult,
} from "./taskGenerationProgress"

describe("task generation progress", () => {
  it("keeps polling at 89% processing and does not fetch the result", () => {
    const action = resolveTaskGenerationUpdate({ status: "processing", progress: 89, message: "Building respondents 180/200..." })
    expect(action).toEqual({ kind: "continue", message: "Building respondents 180/200..." })
    expect(shouldFetchTaskResult("processing")).toBe(false)
  })

  it("shows saving at 90% processing and does not fetch the result", () => {
    const action = resolveTaskGenerationUpdate({ status: "processing", progress: 90, message: "Building respondents 200/200..." })
    expect(action).toEqual({ kind: "saving", message: SAVING_TASKS_MESSAGE })
    expect(shouldFetchTaskResult("processing")).toBe(false)
  })

  it("shows saving at 95% processing and does not fetch the result", () => {
    const action = resolveTaskGenerationUpdate({ status: "processing", progress: 95 })
    expect(action).toEqual({ kind: "saving", message: SAVING_TASKS_MESSAGE })
    expect(shouldFetchTaskResult("processing")).toBe(false)
  })

  it("fetches the result only when the job is completed", () => {
    expect(resolveTaskGenerationUpdate({ status: "completed", progress: 100 })).toEqual({ kind: "fetch-result" })
    expect(shouldFetchTaskResult("completed")).toBe(true)
    expect(resolveTaskGenerationUpdate({ status: "processing", progress: 100 }).kind).toBe("saving")
  })

  it("surfaces the failure reason and does not fetch the result", () => {
    const action = resolveTaskGenerationUpdate({
      status: "failed",
      progress: 90,
      error: "Study configuration error: variety too low",
    })
    expect(action).toEqual({ kind: "failed", error: "Study configuration error: variety too low" })
    expect(shouldFetchTaskResult("failed")).toBe(false)
  })

  it("keeps a refresh during saving on the saving state without loading tasks", () => {
    const restored = { status: "processing", progress: 90, message: "Building respondents 200/200..." }
    const presented = presentTaskGenerationStatus(restored)
    expect(presented.message).toBe(SAVING_TASKS_MESSAGE)
    expect(shouldFetchTaskResult(presented.status)).toBe(false)
    expect(resolveTaskGenerationUpdate(presented).kind).toBe("saving")
  })

  it("does not treat a still-processing result response as a terminal failure", () => {
    expect(isTaskResultNotReady({
      status: 400,
      message: "Job is not completed yet. Current status: processing",
    })).toBe(true)
    expect(isTaskResultNotReady({ status: 404, message: "Job not found" })).toBe(false)
    expect(isTaskResultNotReady({ status: 500, message: "Job is not completed yet" })).toBe(false)
  })
})