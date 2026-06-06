import type { SavedDesignConfigurationPayload, SavedDesignPayload, SavedDesignType } from "@/lib/api/StudyAPI"

const STORAGE_PREFIX = "designConfiguratorSavedDesigns:"

export type LocalSavedDesignsStore = {
  configurator: SavedDesignPayload[]
  input: SavedDesignPayload[]
  deleted_ids?: string[]
}

function storableImageUrl(value: unknown): string | null {
  return typeof value === "string" && /^https?:\/\//i.test(value) ? value : null
}

function slimSelectedElement(element: Record<string, unknown>) {
  return {
    id: element.id,
    name: element.name,
    category: element.category,
    category_key: element.category_key ?? element.categoryKey,
    value: element.value,
    image_url: storableImageUrl(element.image_url ?? element.imageUrl),
    content: element.content ?? null,
    element_type: element.element_type ?? element.elementType,
    z_index: element.z_index ?? element.zIndex,
    transform: element.transform,
  }
}

function slimConfiguration(configuration: SavedDesignConfigurationPayload): SavedDesignConfigurationPayload {
  return {
    metric: configuration.metric,
    study_type: configuration.study_type,
    design_type: configuration.design_type,
    segment: configuration.segment,
    selected_by_category: configuration.selected_by_category || {},
    selected_elements: (configuration.selected_elements || []).map((element) => slimSelectedElement(element)),
    input_insights: configuration.input_insights,
    show_layer_background: configuration.show_layer_background,
    background_url: storableImageUrl(configuration.background_url),
    aspect_ratio: configuration.aspect_ratio,
    total_coefficient: configuration.total_coefficient,
  }
}

function slimDesign(design: SavedDesignPayload): SavedDesignPayload {
  return {
    ...design,
    configuration: slimConfiguration(design.configuration),
  }
}

function slimStore(store: LocalSavedDesignsStore): LocalSavedDesignsStore {
  return {
    configurator: (store.configurator || []).map(slimDesign),
    input: (store.input || []).map(slimDesign),
    deleted_ids: store.deleted_ids || [],
  }
}

export function prepareSavedDesignsForExport(store: LocalSavedDesignsStore): LocalSavedDesignsStore {
  return slimStore(store)
}

function mergeDesignLists(
  existing: SavedDesignPayload[],
  initial: SavedDesignPayload[],
  deletedIds: Set<string>
): SavedDesignPayload[] {
  const seen = new Set<string>()
  return [...existing, ...initial].filter((design) => {
    if (deletedIds.has(design.id)) return false
    if (seen.has(design.id)) return false
    seen.add(design.id)
    return true
  })
}

function mergeStores(existing: LocalSavedDesignsStore, initial: LocalSavedDesignsStore): LocalSavedDesignsStore {
  const deletedIds = new Set([...(existing.deleted_ids || []), ...(initial.deleted_ids || [])])
  return {
    configurator: mergeDesignLists(existing.configurator || [], initial.configurator || [], deletedIds),
    input: mergeDesignLists(existing.input || [], initial.input || [], deletedIds),
    deleted_ids: Array.from(deletedIds),
  }
}

const memoryStores = new Map<string, LocalSavedDesignsStore>()

export function readLocalSavedDesigns(studyId: string): LocalSavedDesignsStore | null {
  const memoryStore = memoryStores.get(studyId)
  if (memoryStore) return memoryStore
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${studyId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LocalSavedDesignsStore
    if (!parsed?.configurator || !parsed?.input) return null
    memoryStores.set(studyId, parsed)
    return parsed
  } catch {
    return null
  }
}

export function writeLocalSavedDesigns(studyId: string, store: LocalSavedDesignsStore): void {
  const slimmed = slimStore(store)
  memoryStores.set(studyId, slimmed)
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${studyId}`, JSON.stringify(slimmed))
  } catch (error) {
    console.warn("Could not persist saved designs to localStorage", error)
  }
}

export function seedLocalSavedDesigns(
  studyId: string,
  initial: LocalSavedDesignsStore
): LocalSavedDesignsStore {
  const existing = readLocalSavedDesigns(studyId)
  if (existing) {
    const merged = mergeStores(existing, initial)
    writeLocalSavedDesigns(studyId, merged)
    return merged
  }
  writeLocalSavedDesigns(studyId, initial)
  return initial
}

export function listLocalSavedDesigns(
  studyId: string,
  designType: SavedDesignType,
  initial: LocalSavedDesignsStore
): SavedDesignPayload[] {
  const store = seedLocalSavedDesigns(studyId, initial)
  return store[designType] || []
}

export function createLocalSavedDesign(
  studyId: string,
  design: SavedDesignPayload,
  initial: LocalSavedDesignsStore
): SavedDesignPayload {
  const store = seedLocalSavedDesigns(studyId, initial)
  const type = design.design_type
  const normalized = design.name.trim().toLowerCase()
  if (store[type].some((item) => item.name.trim().toLowerCase() === normalized)) {
    throw new Error("A saved design with this name already exists.")
  }
  const next = { ...store, [type]: [design, ...store[type]] }
  writeLocalSavedDesigns(studyId, next)
  return design
}

export function deleteLocalSavedDesign(
  studyId: string,
  designId: string,
  initial: LocalSavedDesignsStore
): void {
  const store = seedLocalSavedDesigns(studyId, initial)
  const next: LocalSavedDesignsStore = {
    configurator: store.configurator.filter((design) => design.id !== designId),
    input: store.input.filter((design) => design.id !== designId),
    deleted_ids: Array.from(new Set([...(store.deleted_ids || []), designId])),
  }
  writeLocalSavedDesigns(studyId, next)
}

export function compareLocalSavedDesigns(
  studyId: string,
  designIds: string[],
  designType: SavedDesignType,
  initial: LocalSavedDesignsStore
): SavedDesignPayload[] {
  const store = seedLocalSavedDesigns(studyId, initial)
  const lookup = new Set(designIds)
  return (store[designType] || []).filter((design) => lookup.has(design.id))
}

export function createLocalDesignId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0
    const value = char === "x" ? rand : (rand & 0x3) | 0x8
    return value.toString(16)
  })
}
