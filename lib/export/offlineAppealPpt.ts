const PPTX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
declare const __PPT_WORKER_SOURCE__: string

export interface OfflinePptReportSource {
  format: "reportgen-v1"
  sha256: string
  files: Record<string, string>
  artwork?: Record<string, string | null>
  mainQuestion?: string
  preparedBy?: string
  constraintStudy?: Record<string, unknown> | null
}

export interface AppealPptInput {
  analysis: unknown
  studyTitle: string
  studyType?: string
  preparedBy?: string
  reportSource?: OfflinePptReportSource
  onProgress?: (message: string) => void
}

export interface PreparedPptInput {
  analysis: unknown
  studyType?: string
  preparedBy?: string
  constraintStudy?: Record<string, unknown> | null
  artwork: Array<{ url: string; bytes: Uint8Array }>
}

function decodeDataUrl(value: string): Uint8Array {
  const comma = value.indexOf(",")
  const binary = atob(value.slice(comma + 1))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

/** Point embedded image bytes at stable URLs the live generator can open offline. */
export async function localizeArtwork<T>(value: T): Promise<{ value: T; artwork: PreparedPptInput["artwork"] }> {
  const artwork: PreparedPptInput["artwork"] = []
  const resolved = new Map<string, Promise<string>>()
  const visit = async (item: unknown): Promise<unknown> => {
    if (typeof item === "string" && /^(data:image\/|blob:)/.test(item)) {
      let result = resolved.get(item)
      if (!result) {
        result = (async () => {
          const bytes = item.startsWith("data:")
            ? decodeDataUrl(item)
            : new Uint8Array(await (await fetch(item)).arrayBuffer())
          const url = `https://offline-artwork.invalid/${artwork.length}.png`
          artwork.push({ url, bytes })
          return url
        })()
        resolved.set(item, result)
      }
      return result
    }
    if (Array.isArray(item)) return Promise.all(item.map(visit))
    if (item && typeof item === "object") {
      return Object.fromEntries(await Promise.all(Object.entries(item).map(async ([key, child]) => [key, await visit(child)])))
    }
    return item
  }
  return { value: await visit(value) as T, artwork }
}

/** Preserve the embedded source bytes, including alpha, without canvas recompression. */
export async function preparePptInput(input: AppealPptInput): Promise<PreparedPptInput> {
  const localized = await localizeArtwork(input.analysis)
  const analysis = (localized.value ?? {}) as Record<string, any>
  const mainQuestion = input.reportSource?.mainQuestion
  if (mainQuestion) analysis["Front Page"] = { ...analysis["Front Page"], "Main Question": mainQuestion }
  return {
    analysis,
    studyType: input.studyType,
    preparedBy: input.reportSource?.preparedBy || input.preparedBy,
    constraintStudy: input.reportSource?.constraintStudy,
    artwork: localized.artwork,
  }
}

export interface CombinationPptInput {
  category: Record<string, unknown>
  analysis: unknown
  study?: Record<string, unknown> | null
  studyId: string
  studyTitle: string
  studyType?: string
  preparedBy?: string
  reportSource?: OfflinePptReportSource
  onProgress?: (message: string) => void
}

function isEmbeddedImage(value: unknown): value is string {
  return typeof value === "string" && /^(blob:|data:image\/|msimg:)/i.test(value.trim())
}

function studyBackgroundImage(analysis: unknown, study?: Record<string, unknown> | null): string | null {
  const info = analysis && typeof analysis === "object" && !Array.isArray(analysis)
    ? (analysis as Record<string, unknown>)["Information Block"]
    : null
  const block = info && typeof info === "object" && !Array.isArray(info) ? info as Record<string, unknown> : {}
  const candidates = [block["Study Background"], block.background_image_url, block.Background, study?.background]
  const embedded = candidates.find(isEmbeddedImage)
  if (embedded) return embedded.trim()
  const remote = candidates.find((value) => typeof value === "string" && /^https?:\/\//i.test(value.trim()))
  return typeof remote === "string" ? remote.trim() : null
}

/**
 * The live readout paints configuration.background_url under a layer pack.
 * The HTML file keeps that picture on the study after the saved copy drops the blob URL.
 */
export function withCombinationBackground<T extends { items?: unknown[] }>(
  category: T,
  analysis: unknown,
  study: Record<string, unknown> | null | undefined,
  studyType?: string,
): T {
  const background = studyBackgroundImage(analysis, study)
  if (!background || !Array.isArray(category.items)) return category
  return {
    ...category,
    items: category.items.map((item) => {
      if (!item || typeof item !== "object") return item
      const record = item as { study_type?: unknown; configuration?: Record<string, unknown> }
      const config = record.configuration && typeof record.configuration === "object" ? { ...record.configuration } : {}
      const type = String(record.study_type || config.study_type || studyType || "").toLowerCase()
      const layerLike = type === "layer" || type === "hybrid" || config.show_layer_background === true
      if (!layerLike || config.show_layer_background === false) return item
      if (isEmbeddedImage(config.background_url)) return item
      config.background_url = background
      return { ...record, configuration: config }
    }),
  }
}

/** Same study JSON the live category export writes before building the readout. */
export function combinationStudyPayload(input: Pick<CombinationPptInput, "study" | "studyId" | "studyTitle" | "studyType" | "reportSource">): Record<string, unknown> {
  const study = input.study || {}
  const config = study.study_config && typeof study.study_config === "object" && !Array.isArray(study.study_config)
    ? study.study_config as Record<string, unknown>
    : {}
  const question = String(study.main_question || input.reportSource?.mainQuestion || "").replace(/\s+/g, " ").trim()
  return {
    id: String(study.id || input.studyId || ""),
    title: String(study.title || input.studyTitle || ""),
    main_question: question,
    study_type: String(study.study_type || input.studyType || ""),
    created_at: String(study.created_at || study.launched_at || ""),
    study_config: {
      aspect_ratio: config.aspect_ratio || study.aspect_ratio || "9:16",
      country: config.country || "",
      number_of_respondents: config.number_of_respondents || 0,
    },
  }
}

let worker: Worker | null = null
let sourceHash: string | null = null
let sequence = 0
let ready: Promise<void> | null = null
let cachedSignature: string | null = null
let cachedReport: { blob: Blob; filename: string; slideCount: number } | null = null
const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; progress?: (message: string) => void; timer: ReturnType<typeof setTimeout> }>()

export function disposeOfflinePpt(reason = new Error("PowerPoint generation was interrupted. Please try again.")): void {
  worker?.terminate()
  worker = null
  ready = null
  sourceHash = null
  cachedSignature = null
  cachedReport = null
  for (const request of pending.values()) {
    clearTimeout(request.timer)
    request.reject(reason)
  }
  pending.clear()
}

let turn: Promise<void> = Promise.resolve()

function request(message: Record<string, unknown>, progress?: (message: string) => void): Promise<any> {
  const run = () => new Promise((resolve, reject) => {
    if (!worker) {
      reject(new Error("PowerPoint generation was interrupted. Please try again."))
      return
    }
    const id = ++sequence
    const timer = inactivityTimer()
    pending.set(id, { resolve, reject, progress, timer })
    worker.postMessage({ ...message, id })
  })
  const result = turn.then(run, run)
  turn = result.then(() => undefined, () => undefined)
  return result
}

function inactivityTimer(): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    disposeOfflinePpt(new Error("PowerPoint generation stopped responding for 3 minutes. Please try again."))
  }, 180_000)
}

async function initialize(source: OfflinePptReportSource, progress?: (message: string) => void): Promise<void> {
  if (sourceHash !== source.sha256) disposeOfflinePpt()
  if (!worker) {
    const script = URL.createObjectURL(new Blob([__PPT_WORKER_SOURCE__], { type: "text/javascript" }))
    worker = new Worker(script)
    URL.revokeObjectURL(script)
    worker.onmessage = ({ data }) => {
      const current = pending.get(data.id)
      if (!current) return
      if (data.progress) {
        // A large deck may legitimately take longer than 3 minutes in total.
        // Only stop a stalled worker; active slide progress keeps it alive.
        clearTimeout(current.timer)
        current.timer = inactivityTimer()
        current.progress?.(data.progress)
        return
      }
      clearTimeout(current.timer)
      pending.delete(data.id)
      if (data.error) current.reject(new Error(data.error))
      else current.resolve(data)
    }
    worker.onerror = (event) => {
      for (const current of pending.values()) current.reject(new Error(event.message || "PowerPoint engine could not start."))
      disposeOfflinePpt()
    }
    sourceHash = source.sha256
    const runtime = document.getElementById("appeal-ppt-runtime")?.textContent
    if (!runtime) {
      disposeOfflinePpt()
      throw new Error("The PowerPoint engine is missing from this file. Export the HTML again from the updated website.")
    }
    ready = request({ type: "initialize", runtime, files: source.files }, progress)
      .then(() => undefined)
      .catch((error) => { disposeOfflinePpt(); throw error })
  }
  await ready
}

/** Execute the live website's reportgen code locally. There are no alternate slide layouts. */
export async function buildOfflineAppealPpt(input: AppealPptInput): Promise<{ blob: Blob; filename: string; slideCount: number }> {
  const source = input.reportSource
  if (source?.format !== "reportgen-v1") {
    throw new Error("This file does not contain the live PowerPoint template. Export the HTML again from the updated website.")
  }
  const signature = JSON.stringify([
    source.sha256, input.studyType, source.mainQuestion, source.preparedBy || input.preparedBy,
    source.constraintStudy, input.analysis,
  ])
  if (cachedSignature === signature && cachedReport) {
    input.onProgress?.("Downloading PowerPoint…")
    return cachedReport
  }
  input.onProgress?.("Preparing PowerPoint…")
  await initialize(source, input.onProgress)
  const prepared = await preparePptInput(input)
  const result = await request({ type: "build", input: prepared }, input.onProgress)
  cachedReport = {
    blob: new Blob([result.bytes], { type: PPTX_MEDIA_TYPE }),
    filename: result.filename,
    slideCount: result.slideCount,
  }
  cachedSignature = signature
  return cachedReport
}

/** Run the live Design Combination Readout for one report-builder category. */
export async function buildOfflineCombinationPpt(input: CombinationPptInput): Promise<{ blob: Blob; filename: string; slideCount: number }> {
  const source = input.reportSource
  if (source?.format !== "reportgen-v1" || !source.files?.["combinations.py"]) {
    throw new Error("This file does not contain the combination PowerPoint. Export the HTML again from the updated website.")
  }
  const items = Array.isArray(input.category.items) ? input.category.items : []
  if (items.length === 0) {
    throw new Error("Add at least one combination to this category before downloading.")
  }
  const hasElements = items.some((item) => {
    const config = item && typeof item === "object" ? (item as { configuration?: { selected_elements?: unknown[] } }).configuration : undefined
    return (config?.selected_elements || []).some((element) => {
      if (!element || typeof element !== "object") return false
      const record = element as Record<string, unknown>
      return Boolean(record.name || record.content || record.image_url)
    })
  })
  if (!hasElements) {
    throw new Error("This category has no combinations with elements to include in the report.")
  }
  input.onProgress?.("Preparing the combination report…")
  await initialize(source, input.onProgress)
  const study = combinationStudyPayload(input)
  const category = withCombinationBackground(input.category, input.analysis, input.study, input.studyType)
  const localized = await localizeArtwork({ category, study })
  const analysis = input.analysis && typeof input.analysis === "object" && !Array.isArray(input.analysis)
    ? { ...(input.analysis as Record<string, unknown>) }
    : input.analysis
  if (analysis && typeof analysis === "object" && !Array.isArray(analysis)) delete (analysis as Record<string, unknown>).RawData
  const result = await request({
    type: "combination",
    input: {
      category: localized.value.category,
      study: localized.value.study,
      analysis,
      studyType: input.studyType || study.study_type,
      preparedBy: source.preparedBy || input.preparedBy,
      artwork: localized.artwork,
    },
  }, input.onProgress)
  return {
    blob: new Blob([result.bytes], { type: PPTX_MEDIA_TYPE }),
    filename: result.filename,
    slideCount: result.slideCount,
  }
}

export function triggerOfflineBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  setTimeout(() => { link.remove(); URL.revokeObjectURL(url) }, 1000)
}
