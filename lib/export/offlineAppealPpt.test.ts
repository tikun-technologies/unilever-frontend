import { afterEach, expect, it, vi } from "vitest"
import { buildOfflineAppealPpt, buildOfflineCombinationPpt, combinationStudyPayload, disposeOfflinePpt, preparePptInput, withCombinationBackground } from "@/lib/export/offlineAppealPpt"

afterEach(() => { disposeOfflinePpt(); vi.useRealTimers(); vi.unstubAllGlobals() })

it("preserves the source artwork bytes and report inputs without external requests", async () => {
  const fetchMock = vi.fn(() => { throw new Error("No external requests allowed") })
  vi.stubGlobal("fetch", fetchMock)
  const image = "data:image/png;base64,AAECAw=="
  const source = { format: "reportgen-v1" as const, sha256: "sha", files: {}, mainQuestion: "Main question?", preparedBy: "Analyst", constraintStudy: { design_constraints: [{ name: "Block" }] } }
  const input = { analysis: { "Information Block": { Categories: [{ elements: [{ content: image }, { content: image }] }] } }, studyTitle: "Study", studyType: "layer", reportSource: source }
  const prepared = await preparePptInput(input)
  expect(prepared.artwork).toHaveLength(1)
  expect(Array.from(prepared.artwork[0].bytes)).toEqual([0, 1, 2, 3])
  expect((prepared.analysis as any)["Front Page"]["Main Question"]).toBe("Main question?")
  expect(prepared.constraintStudy).toEqual(source.constraintStudy)
  expect(prepared.preparedBy).toBe("Analyst")
  expect(fetchMock).not.toHaveBeenCalled()
})

it("requires the canonical source instead of silently producing a different deck", async () => {
  await expect(buildOfflineAppealPpt({ analysis: {}, studyTitle: "Study" })).rejects.toThrow("live PowerPoint template")
})

it("sends the live combination readout the same study record and category artwork", async () => {
  const payload = combinationStudyPayload({
    studyId: "study-1",
    studyTitle: "Fallback title",
    studyType: "grid",
    study: {
      id: "study-1",
      title: "Dove",
      study_type: "layer",
      main_question: "How   appealing?",
      launched_at: "2026-01-02T00:00:00",
      aspect_ratio: "1:1",
      study_config: { aspect_ratio: "9:16", country: "India", number_of_respondents: 800 },
    },
  })
  expect(payload).toEqual({
    id: "study-1",
    title: "Dove",
    main_question: "How appealing?",
    study_type: "layer",
    created_at: "2026-01-02T00:00:00",
    study_config: { aspect_ratio: "9:16", country: "India", number_of_respondents: 800 },
  })

  vi.useFakeTimers()
  const Stub = fakeWorker()
  const image = "data:image/png;base64,AAECAw=="
  const source = { format: "reportgen-v1" as const, sha256: "combo", files: { "combinations.py": "c291cmNl" }, preparedBy: "Analyst" }
  const pending = buildOfflineCombinationPpt({
    category: { name: "Report Combinations", items: [{ configuration: { selected_elements: [{ name: "Cap", image_url: image }] } }] },
    analysis: { "(T) Overall": { base_size: 800 }, RawData: [{ big: true }] },
    study: payload,
    studyId: "study-1",
    studyTitle: "Dove",
    studyType: "layer",
    reportSource: source,
  })
  await vi.advanceTimersByTimeAsync(0)
  await vi.advanceTimersByTimeAsync(0)
  expect(Stub.current.message.type).toBe("combination")
  expect(Stub.current.message.input.analysis.RawData).toBeUndefined()
  expect(Stub.current.message.input.analysis["(T) Overall"].base_size).toBe(800)
  expect(Stub.current.message.input.study.study_type).toBe("layer")
  expect(Stub.current.message.input.artwork[0].url).toMatch(/^https:\/\/offline-artwork\.invalid\//)
  expect(Stub.current.message.input.category.items[0].configuration.selected_elements[0].image_url).toBe(Stub.current.message.input.artwork[0].url)
  Stub.current.complete()
  const result = await pending
  expect(result.filename).toBe("study.pptx")
  expect(result.slideCount).toBe(80)
})

it("puts the study background back on a layer combination before the readout is built", () => {
  const background = "blob:https://local/background"
  const category = withCombinationBackground(
    { items: [{ study_type: "layer", configuration: { show_layer_background: true, selected_elements: [{ name: "Cap" }] } }] },
    { "Information Block": { "Study Background": background } },
    {},
    "layer",
  )
  expect((category.items[0].configuration as Record<string, unknown>).background_url).toBe(background)
  const remote = withCombinationBackground(
    { items: [{ study_type: "layer", configuration: { background_url: "https://cdn.example.com/bg.png", selected_elements: [] } }] },
    { "Information Block": { "Study Background": background } },
    {},
    "layer",
  )
  expect(remote.items[0].configuration.background_url).toBe(background)
  const hidden = withCombinationBackground(
    { items: [{ study_type: "layer", configuration: { show_layer_background: false } }] },
    { "Information Block": { "Study Background": background } },
    {},
    "layer",
  )
  expect((hidden.items[0].configuration as Record<string, unknown>).background_url).toBeUndefined()
})

it("asks for a fresh HTML export when the combination generator is not in the file", async () => {
  await expect(buildOfflineCombinationPpt({
    category: { items: [{ configuration: { selected_elements: [{ name: "Cap" }] } }] },
    analysis: {},
    studyId: "study-1",
    studyTitle: "Dove",
    reportSource: { format: "reportgen-v1", sha256: "sha", files: {} },
  })).rejects.toThrow("Export the HTML again")
})

function fakeWorker() {
  class WorkerStub {
    static current: WorkerStub
    onmessage?: (event: { data: any }) => void
    onerror?: (event: any) => void
    message: any
    terminated = false
    constructor() { WorkerStub.current = this }
    postMessage(message: any) {
      this.message = message
      if (message.type === "initialize") queueMicrotask(() => this.onmessage?.({ data: { id: message.id } }))
    }
    terminate() { this.terminated = true }
    progress() { this.onmessage?.({ data: { id: this.message.id, progress: "Creating slide 42…" } }) }
    complete() { this.onmessage?.({ data: { id: this.message.id, bytes: new Uint8Array([80, 75]), filename: "study.pptx", slideCount: 80 } }) }
  }
  vi.stubGlobal("Worker", WorkerStub)
  vi.stubGlobal("document", { getElementById: () => ({ textContent: "{}" }) })
  vi.stubGlobal("__PPT_WORKER_SOURCE__", "/* test worker */")
  return WorkerStub
}

const reportInput = { analysis: {}, studyTitle: "Study", reportSource: { format: "reportgen-v1" as const, sha256: "sha", files: {} } }

it("does not terminate a large deck while the worker continues producing slides", async () => {
  vi.useFakeTimers()
  const Stub = fakeWorker()
  const pending = buildOfflineAppealPpt(reportInput)
  await vi.advanceTimersByTimeAsync(0)
  await vi.advanceTimersByTimeAsync(170_000)
  Stub.current.progress()
  await vi.advanceTimersByTimeAsync(170_000)
  expect(Stub.current.terminated).toBe(false)
  Stub.current.complete()
  expect((await pending).slideCount).toBe(80)
})

it("reports the actual stall error instead of masking it as an interruption", async () => {
  vi.useFakeTimers()
  fakeWorker()
  const pending = buildOfflineAppealPpt(reportInput)
  const rejected = expect(pending).rejects.toThrow("stopped responding for 3 minutes")
  await vi.advanceTimersByTimeAsync(180_001)
  await rejected
})

it("reuses only an unchanged finished deck and rebuilds when the analytics change", async () => {
  vi.useFakeTimers()
  const Stub = fakeWorker()
  const input = { ...reportInput, analysis: { dashboard_summary: { totalRespondents: 644 } } }
  const first = buildOfflineAppealPpt(input)
  await vi.advanceTimersByTimeAsync(0)
  Stub.current.complete()
  const result = await first
  const completedRequest = Stub.current.message.id
  expect(await buildOfflineAppealPpt(input)).toBe(result)
  expect(Stub.current.message.id).toBe(completedRequest)
  input.analysis.dashboard_summary.totalRespondents = 800
  const changed = buildOfflineAppealPpt(input)
  await vi.advanceTimersByTimeAsync(0)
  expect(Stub.current.message.id).not.toBe(completedRequest)
  Stub.current.complete()
  expect(await changed).not.toBe(result)
})
