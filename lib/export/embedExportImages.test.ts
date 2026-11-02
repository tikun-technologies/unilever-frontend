import { afterEach, describe, expect, it, vi } from "vitest"
import { applyImageTokens, collectImageSources, packExportImages } from "@/lib/export/embedExportImages"
import { classificationQuestionsForExport, slimAnalysisRows } from "@/lib/export/offlineAnalysis"
import { packRows } from "@/lib/export/packRows"

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe("export image packing", () => {
  it("keeps the exact live PPT artwork without fetching or recompressing it", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const source = "https://cdn.example.com/a.png"
    const original = "data:image/png;base64,AAECAw=="
    const result = await packExportImages([source, source], undefined, { [source]: original })
    expect(result.images).toEqual({ "1": original })
    expect(result.value).toEqual(["msimg:1", "msimg:1"])
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it("finishes when image requests never resolve, preserves URLs and reports failures", async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}))
    vi.stubGlobal("fetch", fetchMock)
    const sources = Array.from({ length: 25 }, (_, index) => `https://cdn.example.com/${index}.png`)
    const progress = vi.fn()
    const pending = packExportImages(sources, progress)
    await vi.advanceTimersByTimeAsync(31_000)
    const result = await pending
    expect(result.value).toEqual(sources)
    expect(result.failed).toEqual(expect.arrayContaining(sources))
    expect(result.failed).toHaveLength(25)
    expect(fetchMock.mock.calls.length).toBeLessThan(25)
    expect(progress).toHaveBeenLastCalledWith(25, 25)
  })

  it("embeds repeated images once and reports success", async () => {
    vi.stubGlobal("FileReader", class {
      result = "data:image/webp;base64,AAAA"
      onload?: () => void
      readAsDataURL() { this.onload?.() }
    })
    const fetchMock = vi.fn(async () => new Response(new Blob(["image"], { type: "image/webp" })))
    vi.stubGlobal("fetch", fetchMock)
    const result = await packExportImages({ a: "https://cdn.example.com/a.png", b: "https://cdn.example.com/a.png" })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ value: { a: "msimg:1", b: "msimg:1" }, images: { "1": "data:image/webp;base64,AAAA" }, failed: [] })
  })
  it("collects each image once and leaves video urls alone", () => {
    const tree = {
      study: {
        elements: [
          { content: "https://cdn.example.com/a.png" },
          { content: "https://cdn.example.com/a.png" },
          { content: "https://cdn.example.com/clip.mp4" },
        ],
      },
      layers: [{ image_url: "https://cdn.example.com/a.png" }],
    }
    expect(Array.from(collectImageSources(tree))).toEqual(["https://cdn.example.com/a.png"])
  })

  it("replaces repeated image urls with one token", () => {
    const tokens = new Map([["https://cdn.example.com/a.png", "msimg:1"]])
    const packed = applyImageTokens(
      {
        content: "https://cdn.example.com/a.png",
        nested: [{ image_url: "https://cdn.example.com/a.png" }],
        title: "Keep this",
      },
      tokens,
    )
    expect(packed).toEqual({
      content: "msimg:1",
      nested: [{ image_url: "msimg:1" }],
      title: "Keep this",
    })
  })
})

it("builds filter choices from packed column dictionaries without expanding task rows", () => {
  const questions = classificationQuestionsForExport([
    { question_id: "Q1", question_text: "Brand", question_type: "multiple_choice" },
    { question_id: "Q2", question_text: "Comment", question_type: "text" },
  ], {}, [], packRows([{ Brand: "Dove", Comment: "Nice" }, { Brand: "Lux", Comment: "Other" }, { Brand: "Dove" }]))
  expect(questions[0].answer_options?.map((option) => option.text)).toEqual(["Dove", "Lux"])
  expect(questions[1].answer_options).toEqual([])
})

describe("slimAnalysisRows", () => {
  it("keeps scores and drops embedded image payloads", () => {
    const [row] = slimAnalysisRows([
      {
        Panelist: 1,
        Rating: 5,
        Gender: " Female ",
        Note: "",
        Photo: "data:image/png;base64,AAAA",
        Essay: "x".repeat(4001),
        Extra: { nested: true },
      },
    ])
    expect(row).toEqual({
      Panelist: 1,
      Rating: 5,
      Gender: "Female",
    })
  })
})
