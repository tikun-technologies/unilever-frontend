import {
  AGE_BINS,
  AGE_COL,
  GENDER_COL,
  PANEL_COL,
  type AnalysisFilters,
  type AnalysisRow,
} from "@/lib/analysis-engine/types"

export function isMissing(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === "number" && !Number.isFinite(value)) return true
  return false
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback
  if (typeof value === "boolean") return value ? 1 : 0
  if (typeof value === "string" && value.trim() !== "") {
    const number = Number(value)
    return Number.isFinite(number) ? number : fallback
  }
  return fallback
}

export function ratingToken(value: unknown): string | number | null {
  if (value == null) return null
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null
    return Number.isInteger(value) ? value : value
  }
  if (typeof value === "string") {
    const text = value.trim()
    if (!text || text.toLowerCase() === "nan" || text.toLowerCase() === "none" || text.toLowerCase() === "null") {
      return null
    }
    const number = Number(text)
    if (!Number.isFinite(number)) return text
    return Number.isInteger(number) ? number : number
  }
  const text = String(value).trim()
  return text || null
}

export function constantRaterIds(rows: AnalysisRow[]): Set<string | number> {
  const seen = new Map<string | number, Set<string>>()
  const counts = new Map<string | number, number>()
  for (const row of rows) {
    const panelist = row[PANEL_COL]
    if (typeof panelist !== "number" && typeof panelist !== "string") continue
    if (typeof panelist === "number" && !Number.isFinite(panelist)) continue
    const token = ratingToken(row.Rating)
    if (token == null) continue
    const bucket = seen.get(panelist) ?? new Set<string>()
    bucket.add(typeof token === "number" ? `n:${token}` : `s:${token}`)
    seen.set(panelist, bucket)
    counts.set(panelist, (counts.get(panelist) ?? 0) + 1)
  }
  const drop = new Set<string | number>()
  for (const [panelist, total] of counts) {
    if (total >= 2 && (seen.get(panelist)?.size ?? 0) === 1) drop.add(panelist)
  }
  return drop
}

export function normalizeGender(value: unknown): "Male" | "Female" | null {
  if (typeof value !== "string") return null
  const text = value.trim().toLowerCase()
  if (text.startsWith("m")) return "Male"
  if (text.startsWith("f")) return "Female"
  return null
}

export function normalizeAgeToBin(value: unknown): string | null {
  if (isMissing(value)) return null
  if (typeof value === "number" && Number.isFinite(value)) {
    const age = Math.trunc(value)
    if (age >= 13 && age <= 17) return "13-17"
    if (age >= 18 && age <= 24) return "18-24"
    if (age >= 25 && age <= 34) return "25-34"
    if (age >= 35 && age <= 44) return "35-44"
    if (age >= 45 && age <= 54) return "45-54"
    if (age >= 55 && age <= 64) return "55-64"
    if (age >= 65) return "65+"
    return null
  }
  if (typeof value === "string") {
    const compact = value.replace(/ /g, "")
    for (const bin of AGE_BINS) {
      if (compact === bin.replace(/ /g, "")) return bin
    }
    if (compact === "13-18") return "13-17"
    const digits = value.replace(/[^0-9]+/g, " ").trim().split(/\s+/).filter(Boolean)
    if (digits.length) {
      const parsed = Number(digits[0])
      if (Number.isFinite(parsed)) return normalizeAgeToBin(parsed)
    }
  }
  return null
}

/** Dashboard age labels. Numeric 13-17 is shown as 13-18, unlike the regression bins. */
export function ageRangeLabel(value: unknown): string {
  if (isMissing(value)) return "Unknown"
  if (typeof value === "string") {
    const text = value.trim()
    if (["13-18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"].includes(text)) return text
    const number = Number(text)
    if (!Number.isFinite(number)) return "Unknown"
    return ageRangeLabel(number)
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unknown"
  if (value >= 65) return "65+"
  if (value >= 55) return "55-64"
  if (value >= 45) return "45-54"
  if (value >= 35) return "35-44"
  if (value >= 25) return "25-34"
  if (value >= 18) return "18-24"
  if (value >= 13) return "13-18"
  return "Under 13"
}

export function comparePanelist(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b
  const left = String(a)
  const right = String(b)
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

export function panelistKey(value: unknown): string | number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value !== "") return value
  return null
}

export function normalizeFilters(filters?: AnalysisFilters | null): AnalysisFilters {
  if (!filters) return {}
  const out: AnalysisFilters = {}
  if (filters.age_groups?.length) {
    out.age_groups = filters.age_groups.map((group) => (group === "13-18" ? "13-17" : group))
  }
  if (filters.genders?.length) out.genders = filters.genders.map((gender) => String(gender))
  if (filters.classification_filters) {
    const classification: Record<string, string[]> = {}
    for (const [question, answers] of Object.entries(filters.classification_filters)) {
      if (answers?.length) classification[question] = answers.map((answer) => String(answer))
    }
    if (Object.keys(classification).length) out.classification_filters = classification
  }
  return out
}

export function filtersAreActive(filters: AnalysisFilters): boolean {
  if (filters.age_groups?.length || filters.genders?.length) return true
  return Object.values(filters.classification_filters ?? {}).some((answers) => answers.length > 0)
}

function firstByPanelist(rows: AnalysisRow[], column: string, skipMissing: boolean): Map<string | number, unknown> {
  const first = new Map<string | number, unknown>()
  for (const row of rows) {
    const panelist = panelistKey(row[PANEL_COL])
    if (panelist == null || first.has(panelist)) continue
    const value = row[column]
    if (skipMissing && isMissing(value)) continue
    if (skipMissing) {
      first.set(panelist, value)
      continue
    }
    first.set(panelist, value)
  }
  return first
}

export function filterRows(rows: AnalysisRow[], filters: AnalysisFilters): AnalysisRow[] {
  if (!filtersAreActive(filters)) return rows.slice()
  if (rows.length === 0) return []
  const ageGroups = filters.age_groups ?? []
  const genders = filters.genders ?? []
  const classification = filters.classification_filters ?? {}

  const ageSource = rows.some((row) => "AgeGroup" in row) ? "AgeGroup" : AGE_COL
  const ageFirst = firstByPanelist(rows, ageSource, ageSource === AGE_COL)
  const genderFirst = firstByPanelist(rows, GENDER_COL, true)
  const classFirst = new Map<string, Map<string | number, unknown>>()
  for (const question of Object.keys(classification)) {
    if (!rows.some((row) => question in row)) continue
    classFirst.set(question, firstByPanelist(rows, question, true))
  }

  const ageBins = new Map<string | number, string | null>()
  let anyAge = false
  if (ageSource === "AgeGroup") {
    const grouped = firstByPanelist(rows, "AgeGroup", true)
    for (const [panelist, value] of grouped) {
      if (isMissing(value)) {
        ageBins.set(panelist, null)
      } else {
        ageBins.set(panelist, String(value))
        anyAge = true
      }
    }
  } else {
    for (const [panelist, value] of ageFirst) {
      const bin = normalizeAgeToBin(value)
      ageBins.set(panelist, bin)
      if (bin) anyAge = true
    }
  }

  const genderNorm = new Map<string | number, string | null>()
  let anyGender = false
  for (const [panelist, value] of genderFirst) {
    const gender = normalizeGender(value)
    genderNorm.set(panelist, gender)
    if (gender) anyGender = true
  }

  const panelists = new Set<string | number>()
  for (const row of rows) {
    const panelist = panelistKey(row[PANEL_COL])
    if (panelist != null) panelists.add(panelist)
  }

  const keep = new Set<string | number>()
  for (const panelist of panelists) {
    if (ageGroups.length && anyAge && !ageGroups.includes(ageBins.get(panelist) ?? "")) continue
    if (genders.length && anyGender && !genders.includes(genderNorm.get(panelist) ?? "")) continue
    let classOk = true
    for (const [question, allowed] of Object.entries(classification)) {
      if (!allowed.length || !classFirst.has(question)) continue
      const answer = classFirst.get(question)?.get(panelist)
      if (answer == null || !allowed.includes(String(answer))) {
        classOk = false
        break
      }
    }
    if (!classOk) continue
    keep.add(panelist)
  }

  return rows.filter((row) => {
    const panelist = panelistKey(row[PANEL_COL])
    return panelist != null && keep.has(panelist)
  })
}

export function sortRows(rows: AnalysisRow[]): AnalysisRow[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const a = panelistKey(left.row[PANEL_COL])
      const b = panelistKey(right.row[PANEL_COL])
      if (a == null && b == null) return left.index - right.index
      if (a == null) return 1
      if (b == null) return -1
      const byPanelist = comparePanelist(a, b)
      if (byPanelist !== 0) return byPanelist
      const byTask = asNumber(left.row.Task, Number.POSITIVE_INFINITY) - asNumber(right.row.Task, Number.POSITIVE_INFINITY)
      if (byTask !== 0) return byTask
      return left.index - right.index
    })
    .map((item) => item.row)
}
