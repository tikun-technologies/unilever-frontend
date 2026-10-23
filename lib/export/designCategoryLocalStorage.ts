import type { DesignCategoryPayload, SavedDesignPayload, SavedDesignType } from "@/lib/api/StudyAPI"
import { createLocalDesignId, slimDesignConfiguration } from "@/lib/export/savedDesignLocalStorage"

const STORAGE_PREFIX = "designConfiguratorCategories:"

type LocalDesignCategoriesStore = {
  categories: DesignCategoryPayload[]
  deleted_ids?: string[]
}

const memoryCategoryStores = new Map<string, LocalDesignCategoriesStore>()

function slimCategoryItem(item: DesignCategoryPayload["items"][number]) {
  return {
    ...item,
    configuration: item.configuration ? slimDesignConfiguration(item.configuration) : item.configuration,
  }
}

function slimCategory(category: DesignCategoryPayload): DesignCategoryPayload {
  return {
    ...category,
    items: (category.items || []).map(slimCategoryItem),
  }
}

export function prepareDesignCategoriesForExport(categories: DesignCategoryPayload[]): DesignCategoryPayload[] {
  return (categories || []).map(slimCategory)
}

function readCategoryStore(studyId: string): LocalDesignCategoriesStore | null {
  const memoryStore = memoryCategoryStores.get(studyId)
  if (memoryStore) return memoryStore
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${studyId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const store: LocalDesignCategoriesStore = { categories: parsed, deleted_ids: [] }
      memoryCategoryStores.set(studyId, store)
      return store
    }
    if (parsed && Array.isArray(parsed.categories)) {
      memoryCategoryStores.set(studyId, parsed)
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function writeCategoryStore(studyId: string, store: LocalDesignCategoriesStore) {
  const slimmed: LocalDesignCategoriesStore = {
    categories: (store.categories || []).map(slimCategory),
    deleted_ids: store.deleted_ids || [],
  }
  memoryCategoryStores.set(studyId, slimmed)
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${studyId}`, JSON.stringify(slimmed))
  } catch (error) {
    console.warn("Could not persist design categories", error)
  }
}

function mergeCategories(
  existing: DesignCategoryPayload[],
  initial: DesignCategoryPayload[],
  deletedIds: Set<string>
): DesignCategoryPayload[] {
  const seen = new Set<string>()
  const merged: DesignCategoryPayload[] = []
  for (const cat of [...existing, ...initial]) {
    if (!cat || deletedIds.has(cat.id) || seen.has(cat.id)) continue
    seen.add(cat.id)
    merged.push(slimCategory(cat))
  }
  return merged.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
}

export function seedLocalDesignCategories(
  studyId: string,
  initial: DesignCategoryPayload[] = []
): DesignCategoryPayload[] {
  const existing = readCategoryStore(studyId)
  if (existing) {
    const deletedIds = new Set(existing.deleted_ids || [])
    const categories = mergeCategories(existing.categories || [], initial, deletedIds)
    const nextStore = { categories, deleted_ids: Array.from(deletedIds) }
    writeCategoryStore(studyId, nextStore)
    return categories
  }
  const initialStore = {
    categories: (initial || []).map(slimCategory),
    deleted_ids: [],
  }
  writeCategoryStore(studyId, initialStore)
  return initialStore.categories
}

export function listLocalDesignCategories(
  studyId: string,
  initial: DesignCategoryPayload[] = []
): DesignCategoryPayload[] {
  return seedLocalDesignCategories(studyId, initial)
}

export function renameDesignInLocalCategories(studyId: string, savedDesignId: string, name: string) {
  const store = readCategoryStore(studyId) || { categories: [], deleted_ids: [] }
  const categories = store.categories.map((category) => ({
    ...category,
    items: category.items.map((item) => (
      item.saved_design_id === savedDesignId ? { ...item, name } : item
    )),
  }))
  writeCategoryStore(studyId, { ...store, categories })
}

export function removeDesignFromLocalCategories(studyId: string, savedDesignId: string) {
  const store = readCategoryStore(studyId) || { categories: [], deleted_ids: [] }
  const categories = store.categories.map((category) => ({
    ...category,
    items: category.items.filter((item) => item.saved_design_id !== savedDesignId),
  }))
  writeCategoryStore(studyId, { ...store, categories })
}

function itemFromDesign(design: SavedDesignPayload, position: number) {
  return {
    id: createLocalDesignId(),
    saved_design_id: design.id,
    name: design.name,
    design_type: design.design_type,
    metric: design.metric,
    segment_label: design.segment_label ?? design.configuration?.segment?.label ?? null,
    selection_count: design.selection_count,
    total_coefficient: design.total_coefficient ?? design.configuration?.total_coefficient ?? null,
    position,
    configuration: design.configuration ? slimDesignConfiguration(design.configuration) : design.configuration,
  }
}

export function assignLocalDesignCategory(input: {
  studyId: string
  categoryId?: string
  categoryName?: string
  designs: SavedDesignPayload[]
  initial?: DesignCategoryPayload[]
}): DesignCategoryPayload {
  const store = readCategoryStore(input.studyId) || {
    categories: (input.initial || []).map(slimCategory),
    deleted_ids: [],
  }
  const categories = [...store.categories]
  const now = new Date().toISOString()
  let category = input.categoryId
    ? categories.find((item) => item.id === input.categoryId)
    : undefined

  if (!category && input.categoryName) {
    const normalized = input.categoryName.trim().toLowerCase()
    category = categories.find((item) => item.name.trim().toLowerCase() === normalized)
  }

  if (!category) {
    const name = input.categoryName?.trim()
    if (!name) throw new Error("Category name is required")
    const position = categories.reduce((max, item) => Math.max(max, item.position), -1) + 1
    category = {
      id: createLocalDesignId(),
      study_id: input.studyId,
      name,
      position,
      created_at: now,
      updated_at: now,
      items: [],
    }
    categories.push(category)
  }

  const present = new Set(category.items.map((item) => item.saved_design_id))
  let position = category.items.reduce((max, item) => Math.max(max, item.position), 0)
  input.designs.forEach((design) => {
    if (present.has(design.id)) return
    position += 1
    category?.items.push(itemFromDesign(design, position))
    present.add(design.id)
  })
  category.updated_at = now
  writeCategoryStore(input.studyId, { ...store, categories })
  return category
}

export function renameLocalDesignCategory(studyId: string, categoryId: string, name: string): DesignCategoryPayload {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("Category name is required")
  const store = readCategoryStore(studyId) || { categories: [], deleted_ids: [] }
  const categories = [...store.categories]
  const category = categories.find((item) => item.id === categoryId)
  if (!category) throw new Error("Category not found.")
  const normalized = trimmed.toLowerCase()
  if (categories.some((item) => item.id !== categoryId && item.name.trim().toLowerCase() === normalized)) {
    throw new Error("A category with this name already exists.")
  }
  category.name = trimmed
  category.updated_at = new Date().toISOString()
  writeCategoryStore(studyId, { ...store, categories })
  return category
}

export function deleteLocalDesignCategory(studyId: string, categoryId: string) {
  const store = readCategoryStore(studyId) || { categories: [], deleted_ids: [] }
  writeCategoryStore(studyId, {
    categories: store.categories.filter((category) => category.id !== categoryId),
    deleted_ids: Array.from(new Set([...(store.deleted_ids || []), categoryId])),
  })
}

export function removeLocalDesignCategoryItem(studyId: string, categoryId: string, savedDesignId: string) {
  const store = readCategoryStore(studyId) || { categories: [], deleted_ids: [] }
  const categories = store.categories.map((category) =>
    category.id === categoryId
      ? { ...category, items: category.items.filter((item) => item.saved_design_id !== savedDesignId) }
      : category
  )
  writeCategoryStore(studyId, { ...store, categories })
}

export function findLocalSavedDesign(
  lists: Record<SavedDesignType, SavedDesignPayload[]>,
  designId: string,
  categories: DesignCategoryPayload[] = []
): SavedDesignPayload | undefined {
  const direct =
    lists.configurator.find((design) => design.id === designId) ||
    lists.input.find((design) => design.id === designId)
  if (direct) return direct

  for (const cat of categories) {
    const item = (cat.items || []).find((entry) => entry.saved_design_id === designId)
    if (item && item.configuration) {
      return {
        id: item.saved_design_id,
        study_id: cat.study_id,
        name: item.name,
        design_type: item.design_type,
        study_type: item.configuration.study_type || "grid",
        metric: item.metric as "Top Down" | "Bottom Up" | "Response Time",
        segment_label: item.segment_label,
        selection_count: item.selection_count,
        total_coefficient: item.total_coefficient ?? 0,
        configuration: item.configuration,
        created_at: cat.created_at,
        updated_at: cat.updated_at,
      }
    }
  }
  return undefined
}
