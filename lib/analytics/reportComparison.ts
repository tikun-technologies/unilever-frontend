import type {
  SavedDesignComparison,
  SavedDesignConfigurationPayload,
} from "@/lib/api/StudyAPI"

export type ReportMetric = "Top Down" | "Bottom Up" | "Response Time"

export type ComparisonSource = SavedDesignComparison["source"]

export interface ComparisonBase {
  id: string
  source: ComparisonSource
  question: string | null
  title: string
  segments: Array<{ key: string; label: string; base_size: number }>
  available: boolean
  lockedReason: string | null
}

const PREFIX: Record<ReportMetric, string> = {
  "Top Down": "(T)",
  "Bottom Up": "(B)",
  "Response Time": "(R)",
}

const AGE_ORDER = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"]

type FiltersApplied = {
  genders?: string[]
  age_groups?: string[]
  classification_filters?: Record<string, string[]>
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (value && typeof value === "object" && "value" in value) {
    const inner = (value as { value?: unknown }).value
    if (typeof inner === "number" && Number.isFinite(inner)) return inner
  }
  return null
}

function filtersOf(analysis: any): FiltersApplied {
  const raw = analysis?.filters_applied
  if (!raw || typeof raw !== "object") return {}
  return {
    genders: Array.isArray(raw.genders) ? raw.genders.map(String) : [],
    age_groups: Array.isArray(raw.age_groups) ? raw.age_groups.map(String) : [],
    classification_filters: raw.classification_filters && typeof raw.classification_filters === "object"
      ? raw.classification_filters
      : {},
  }
}

function audienceOf(filters: FiltersApplied): SavedDesignComparison["audience"] | null {
  const genders = filters.genders || []
  const ageGroups = filters.age_groups || []
  const classification = filters.classification_filters || {}
  const hasClass = Object.values(classification).some((answers) => Array.isArray(answers) && answers.length > 0)
  if (!genders.length && !ageGroups.length && !hasClass) return null
  return {
    genders,
    age_groups: ageGroups,
    classification_filters: classification,
  }
}

/** Yes/No on a usage question reads as users and non-users, matching the deck. */
export function legendLabel(question: string, option: string): string {
  const choice = option.trim()
  if (!/\b(use|using|user)\b/i.test(question)) return choice
  if (choice.toLowerCase() === "no") return "Non-users"
  if (choice.toLowerCase() === "yes") {
    const match = question.trim().match(/\buse\s+(.+?)\s*\??$/i)
    const brand = (match?.[1] || "").replace(/[?.\s]+$/g, "").replace(/\s+/g, " ")
    if (!brand) return "Users"
    return `${brand.slice(0, 1).toUpperCase()}${brand.slice(1)} users`
  }
  return choice
}

function orderAnswers(question: string, answers: string[]): string[] {
  const byLower = new Map(answers.map((answer) => [answer.toLowerCase(), answer]))
  if (byLower.size === 2 && byLower.has("yes") && byLower.has("no")) {
    return [byLower.get("no") as string, byLower.get("yes") as string]
  }
  if (/\b(use|using|user)\b/i.test(question) && byLower.has("no") && byLower.has("yes")) {
    const rest = answers.filter((answer) => !["yes", "no"].includes(answer.toLowerCase()))
    return [byLower.get("no") as string, byLower.get("yes") as string, ...rest]
  }
  return answers
}

function liveSegments(
  entries: Array<{ key: string; label: string; base_size: number }>
) {
  return entries.filter((entry) => entry.base_size > 0)
}

function lockReason(
  title: string,
  live: Array<{ label: string }>,
  filteredTo: string[] | null,
  hiddenByOtherClassification: boolean
): string | null {
  if (live.length >= 2) return null
  if (filteredTo && filteredTo.length > 0 && live.length < 2) {
    return `Already filtered to ${filteredTo.join(", ")}. This is the audience, not a comparison.`
  }
  if (hiddenByOtherClassification) {
    return "Not available while another classification filter is applied."
  }
  if (live.length === 1) return `Only ${live[0].label} is in this analysis.`
  return `${title} is not in this analysis.`
}

function segmentBase(
  id: string,
  source: ComparisonSource,
  question: string | null,
  title: string,
  entries: Array<{ key: string; label: string; base_size: number }>,
  filteredTo: string[] | null,
  hiddenByOtherClassification: boolean
): ComparisonBase {
  const live = liveSegments(entries)
  const reason = lockReason(title, live, filteredTo, hiddenByOtherClassification)
  return {
    id,
    source,
    question,
    title,
    segments: live,
    available: live.length >= 2,
    lockedReason: reason,
  }
}

function readGroupSection(section: any, preferredOrder: string[] = []) {
  const declared = section?.segments && typeof section.segments === "object" ? Object.keys(section.segments) : []
  const ordered = [
    ...preferredOrder.filter((key) => declared.includes(key)),
    ...declared.filter((key) => !preferredOrder.includes(key)),
  ]
  return ordered.map((key) => ({
    key,
    label: key,
    base_size: Number(section?.segments?.[key]?.base_size) || 0,
  }))
}

export function listComparisonBases(analysis: any, metric: ReportMetric): ComparisonBase[] {
  const prefix = PREFIX[metric]
  const filters = filtersOf(analysis)
  const classFilters = filters.classification_filters || {}
  const otherClassFilter = Object.entries(classFilters).some(([, answers]) => Array.isArray(answers) && answers.length > 0)
  const bases: ComparisonBase[] = [
    {
      id: "overall",
      source: "overall",
      question: null,
      title: "Overall",
      segments: [],
      available: true,
      lockedReason: null,
    },
  ]

  const gender = analysis?.[`${prefix} Gender`]
  if (gender && typeof gender === "object") {
    const filteredTo = (filters.genders || []).length ? filters.genders || [] : null
    bases.push(segmentBase(
      "gender",
      "gender",
      null,
      "Gender",
      readGroupSection(gender, ["Male", "Female", "Other"]),
      filteredTo,
      false,
    ))
  }

  const age = analysis?.[`${prefix} Age`]
  if (age && typeof age === "object") {
    const filteredTo = (filters.age_groups || []).length ? filters.age_groups || [] : null
    bases.push(segmentBase(
      "age",
      "age",
      null,
      "Age",
      readGroupSection(age, AGE_ORDER),
      filteredTo,
      false,
    ))
  }

  const block = analysis?.[`${prefix} Classification Questions`]
  const questions = Array.isArray(block?.questions) ? block.questions : []
  for (const question of questions) {
    const questionText = text(question?.question_text)
    if (!questionText) continue
    const answers = orderAnswers(questionText, Object.keys(question?.segments || {}))
    const entries = answers.map((answer) => ({
      key: `${questionText}::${answer}`,
      label: legendLabel(questionText, answer),
      base_size: Number(question?.segments?.[answer]?.base_size) || 0,
    }))
    const selected = Array.isArray(classFilters[questionText]) ? classFilters[questionText] : []
    const hidden = otherClassFilter && selected.length === 0 && liveSegments(entries).length < 2
    bases.push(segmentBase(
      `classification:${questionText}`,
      "classification",
      questionText,
      questionText,
      entries,
      selected.length ? selected : null,
      hidden,
    ))
  }

  return bases
}

export function selectedComparisonId(keys: string[]): string {
  const unique = Array.from(new Set(keys.filter(Boolean))).sort()
  return unique.length ? unique.join("|") : "overall"
}

export function comparisonChoiceId(comparison?: SavedDesignComparison | null): string {
  return selectedComparisonId((comparison?.segments || []).map((segment) => segment.key))
}

function elementIndex(section: any): Map<string, any> {
  const index = new Map<string, any>()
  for (const category of section?.categories || []) {
    for (const element of category?.elements || []) {
      const name = text(element?.name).toLowerCase()
      if (name && !index.has(name)) index.set(name, element)
    }
  }
  return index
}

function sectionName(metric: ReportMetric, source: ComparisonSource): string | null {
  const prefix = PREFIX[metric]
  if (source === "gender") return `${prefix} Gender`
  if (source === "age") return `${prefix} Age`
  if (source === "classification") return `${prefix} Classification Questions`
  return null
}

export function stampReportComparison(
  configuration: SavedDesignConfigurationPayload,
  analysis: any,
  bases: ComparisonBase[],
  selectedKeys: string[]
): SavedDesignConfigurationPayload {
  const filters = filtersOf(analysis)
  const audience = audienceOf(filters)
  const chosen = new Set(selectedKeys)
  const groups = bases
    .filter((base) => base.source !== "overall" && base.available)
    .map((base) => ({
      source: base.source as Exclude<ComparisonSource, "overall" | "multiple">,
      question: base.question,
      title: base.title,
      segments: base.segments.filter((segment) => chosen.has(segment.key)),
    }))
    .filter((group) => group.segments.length > 0)

  const flat = groups.flatMap((group) => group.segments.map((segment) => ({ group, segment })))
  const labelCount = new Map<string, number>()
  for (const item of flat) labelCount.set(item.segment.label, (labelCount.get(item.segment.label) || 0) + 1)
  const segments = flat.map(({ group, segment }) => ({
    key: segment.key,
    label: (labelCount.get(segment.label) || 0) > 1 ? `${group.title}: ${segment.label}` : segment.label,
    base_size: segment.base_size,
  }))

  const ready = segments.length >= 2
  const comparison: SavedDesignComparison = ready
    ? {
        source: groups.length === 1 ? groups[0].source : "multiple",
        question: groups.length === 1 ? groups[0].question : null,
        metric: configuration.metric,
        segments,
        groups: groups.map((group) => ({
          source: group.source,
          question: group.question,
          title: group.title,
          segments: group.segments.map((segment) => ({
            key: segment.key,
            label: segment.label,
            base_size: segment.base_size,
          })),
        })),
        audience,
      }
    : {
        source: "overall",
        question: null,
        metric: configuration.metric,
        segments: [],
        groups: [],
        audience,
      }

  const metric = configuration.metric as ReportMetric
  const elements = (configuration.selected_elements || []).map((element) => {
    if (!ready) return element
    const segmentLifts: Record<string, number> = {}
    for (const group of groups) {
      const name = sectionName(metric, group.source)
      if (!name) continue
      const match = elementIndex(analysis?.[name]).get(text(element.name).toLowerCase())
      const values = match?.values || {}
      for (const segment of group.segments) {
        const score = numberValue(values[segment.key])
        if (score !== null) segmentLifts[segment.key] = score
      }
    }
    return Object.keys(segmentLifts).length ? { ...element, segment_lifts: segmentLifts } : element
  })

  return {
    ...configuration,
    comparison,
    selected_elements: elements,
  }
}
