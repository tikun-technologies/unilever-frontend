import { pearsonKMeans } from "@/lib/analysis-engine/kmeans"
import { createNumpyRng } from "@/lib/analysis-engine/numpyRng"
import {
  createRegressionCache,
  runPanelRegressions,
  runPooledRegression,
  type ScoreMode,
} from "@/lib/analysis-engine/regression"
import type { PanelCoefficientRow } from "@/lib/analysis-engine/types"
import { roundedInt, truncInt } from "@/lib/analysis-engine/round"
import {
  ageRangeLabel,
  asNumber,
  constantRaterIds,
  filterRows,
  filtersAreActive,
  isMissing,
  normalizeAgeToBin,
  normalizeFilters,
  normalizeGender,
  panelistKey,
  sortRows,
} from "@/lib/analysis-engine/rows"
import { normalizeAnalysisSettings } from "@/lib/analysis-engine/settings"
import {
  AGE_BINS,
  AGE_COL,
  GENDER_COL,
  PANEL_COL,
  RATING_COL,
  RESPONSE_TIME_COL,
  TASK_COL,
  type AnalysisCategory,
  type AnalysisElement,
  type AnalysisFilters,
  type AnalysisQuestion,
  type AnalysisReport,
  type AnalysisReportInput,
  type AnalysisRow,
  type AnalysisSettings,
  type AnalysisStudy,
  type JsonValue,
} from "@/lib/analysis-engine/types"

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

interface ElementColumn {
  column: string
  categoryName: string
  elementName: string
  categoryOrder: number
}

interface SegmentGroup {
  base: number
  means: Record<string, number>
}

interface ClassGroup {
  questionText: string
  optional: boolean
  answerLabels: string[]
  segments: Record<string, SegmentGroup>
}

function columnLetter(index: number): string {
  let n = index
  let label = ""
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return label
}

function jsonValue(value: unknown): JsonValue {
  if (value == null) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string" || typeof value === "boolean") return value
  if (Array.isArray(value)) return value.map((item) => jsonValue(item))
  if (typeof value === "object") {
    const out: { [key: string]: JsonValue } = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) out[key] = jsonValue(item)
    return out
  }
  return String(value)
}

function defined<T>(value: T | null | undefined): value is T {
  return value != null
}

function columnNames(rows: AnalysisRow[]): Set<string> {
  const names = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) names.add(key)
  }
  return names
}

function resolveElements(study: AnalysisStudy, rows: AnalysisRow[]): {
  columns: ElementColumn[]
  categories: string[]
} {
  const available = columnNames(rows)
  const categories = study.categories ?? []
  const seen = new Set<string>()
  const columns: ElementColumn[] = []
  for (const element of study.elements ?? []) {
    const nested = element.category
    const category =
      nested && (nested.name || nested.id)
        ? nested
        : categories.find((item) => item.id != null && item.id === element.category_id) ?? nested ?? {}
    const categoryName = category.name
    const elementName = element.name
    if (!categoryName || !elementName) continue
    const underscore = `${categoryName}_${elementName}`
    const hyphen = `${categoryName}-${elementName}`
    const candidates = [
      underscore,
      hyphen,
      hyphen.replace(/_/g, "-").replace(/ /g, "-"),
      underscore.replace(/ /g, "_"),
    ]
    const column = candidates.find((candidate) => available.has(candidate))
    if (!column || seen.has(column)) continue
    seen.add(column)
    columns.push({
      column,
      categoryName,
      elementName,
      categoryOrder: typeof category.order === "number" ? category.order : 0,
    })
  }
  const order = new Map<string, { order: number; index: number }>()
  columns.forEach((column, index) => {
    const current = order.get(column.categoryName)
    if (!current || column.categoryOrder < current.order) {
      order.set(column.categoryName, { order: column.categoryOrder, index: current?.index ?? index })
    }
  })
  const categoriesSorted = [...order.entries()]
    .sort((a, b) => a[1].order - b[1].order || a[1].index - b[1].index)
    .map(([name]) => name)
  return { columns, categories: categoriesSorted }
}

function optionalQuestion(question: AnalysisQuestion): boolean {
  if (question.optional_classification_question != null) return Boolean(question.optional_classification_question)
  return Boolean(question.config?.optional_classification_question)
}

function informationBlock(study: AnalysisStudy): JsonValue {
  const categories: JsonValue[] = []
  for (const category of study.categories ?? []) {
    const info: { [key: string]: JsonValue } = {
      name: category.name ?? "",
      elements: [],
    }
    if (defined(category.id)) {
      info.id = jsonValue(category.id)
      if (study.study_type === "layer") info.layer_id = jsonValue(category.id)
    }
    if (defined(category.z_index)) info.z_index = jsonValue(category.z_index)
    if (defined(category.transform)) info.transform = jsonValue(category.transform)
    if (defined(category.order)) info.order = jsonValue(category.order)
    const elements: JsonValue[] = []
    for (const element of study.elements ?? []) {
      if (element.category_id !== category.id) continue
      elements.push(elementInfo(element, study.study_type))
    }
    info.elements = elements
    categories.push(info)
  }
  return {
    "Study Title": study.title ?? "",
    "Study Type": study.study_type ?? "",
    "Study Background": study.background ?? "",
    "Aspect Ratio": jsonValue(study.aspect_ratio ?? null),
    Categories: categories,
    "Classification Questions": (study.classification_questions ?? [])
      .filter((question) => question.question_text)
      .map((question) => ({
        question_id: jsonValue(question.question_id ?? null),
        question_text: question.question_text ?? "",
        optional_classification_question: optionalQuestion(question),
      })),
  }
}

function elementInfo(element: AnalysisElement, studyType: string | undefined): JsonValue {
  const info: { [key: string]: JsonValue } = {
    name: element.name ?? "",
    content: element.content ?? "",
  }
  if (defined(element.id)) {
    info.id = jsonValue(element.id)
    if (studyType === "layer") info.image_id = jsonValue(element.id)
  }
  if (defined(element.category_id)) {
    info.category_id = jsonValue(element.category_id)
    if (studyType === "layer") info.layer_id = jsonValue(element.category_id)
  }
  for (const key of ["z_index", "transform", "layer_name", "layer_order", "image_order", "alt_text"] as const) {
    if (defined(element[key])) info[key] = jsonValue(element[key])
  }
  return info
}

function frontPage(study: AnalysisStudy): JsonValue {
  return {
    Title: study.title ?? "",
    "Main Question": study.main_question ?? "",
    Background: study.background ?? "",
    Language: study.language ?? "",
    "Launched At": study.launched_at ?? "",
    "Aspect Ratio": jsonValue(study.aspect_ratio ?? null),
  }
}

function numericValues(rows: AnalysisRow[], column: string): number[] {
  const values: number[] = []
  for (const row of rows) {
    const value = row[column]
    const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN
    if (Number.isFinite(number)) values.push(number)
  }
  return values
}

function formatDistributionKey(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value)
}

function dashboardSummary(rows: AnalysisRow[], categories: AnalysisCategory[]): JsonValue {
  if (rows.length === 0) {
    return {
      totalResponses: 0,
      uniquePanelists: 0,
      totalRespondents: 0,
      avgResponseTime: 0,
      avgRating: 0,
      taskCount: 1,
      categoryCount: categories.length,
      ratingDistribution: [],
      ageDistribution: [],
      genderDistribution: [],
      responseTimeDistribution: [],
      responseTimeByTask: [],
    }
  }
  const tasks = new Set<string>()
  const panelistTasks = new Map<string, Set<string>>()
  for (const row of rows) {
    const panelist = panelistKey(row[PANEL_COL])
    if (panelist == null) continue
    const key = String(panelist)
    const owned = panelistTasks.get(key) ?? new Set<string>()
    if (!isMissing(row[TASK_COL])) {
      const taskKey = String(row[TASK_COL])
      tasks.add(taskKey)
      owned.add(taskKey)
    }
    panelistTasks.set(key, owned)
  }
  const taskCount = tasks.size || 1
  let totalRespondents = 0
  for (const owned of panelistTasks.values()) {
    if (owned.size === taskCount) totalRespondents += 1
  }
  const responseTimes = numericValues(rows, RESPONSE_TIME_COL)
  const ratings = numericValues(rows, RATING_COL)
  return {
    totalResponses: rows.length,
    uniquePanelists: panelistTasks.size,
    totalRespondents,
    avgResponseTime: responseTimes.length ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length : 0,
    avgRating: ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0,
    taskCount,
    categoryCount: categories.length,
    ratingDistribution: ratingDistribution(ratings),
    ageDistribution: ageDistribution(rows),
    genderDistribution: genderDistribution(rows),
    responseTimeDistribution: responseTimeDistribution(responseTimes),
    responseTimeByTask: responseTimeByTask(rows),
  }
}

function ratingDistribution(ratings: number[]): JsonValue[] {
  const counts = new Map<number, number>()
  for (const rating of ratings) counts.set(rating, (counts.get(rating) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rating, count]) => ({ name: `Rating ${formatDistributionKey(rating)}`, value: count }))
}

function ageDistribution(rows: AnalysisRow[]): JsonValue[] {
  if (!rows.some((row) => AGE_COL in row)) return []
  const order = ["13-18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+", "Under 13", "Unknown"]
  const buckets = new Map<string, Set<string>>(order.map((label) => [label, new Set()]))
  for (const row of rows) {
    const panelist = panelistKey(row[PANEL_COL])
    if (panelist == null) continue
    const label = ageRangeLabel(row[AGE_COL])
    const bucket = buckets.get(label) ?? new Set<string>()
    bucket.add(String(panelist))
    buckets.set(label, bucket)
  }
  return order.filter((label) => (buckets.get(label)?.size ?? 0) > 0).map((label) => ({
    name: label,
    value: buckets.get(label)?.size ?? 0,
  }))
}

function genderDistribution(rows: AnalysisRow[]): JsonValue[] {
  const buckets = new Map<string, Set<string>>()
  for (const row of rows) {
    const panelist = panelistKey(row[PANEL_COL])
    if (panelist == null || isMissing(row[GENDER_COL])) continue
    const name = String(row[GENDER_COL])
    const bucket = buckets.get(name) ?? new Set<string>()
    bucket.add(String(panelist))
    buckets.set(name, bucket)
  }
  return [...buckets.entries()].map(([name, panelists]) => ({ name, value: panelists.size }))
}

function responseTimeDistribution(values: number[]): JsonValue[] {
  const buckets = [
    { name: "Fast (<0.5s)", max: 0.5, fill: "#22C55E" },
    { name: "Medium (0.5-1s)", max: 1, fill: "#FCCD5B" },
    { name: "Slow (1-2s)", max: 2, fill: "#F7945A" },
    { name: "Very Slow (>2s)", max: Number.POSITIVE_INFINITY, fill: "#C04E35" },
  ]
  const counts = [0, 0, 0, 0]
  for (const value of values) {
    const index = buckets.findIndex((bucket) => value < bucket.max)
    if (index >= 0) counts[index] += 1
  }
  return buckets
    .map((bucket, index) => ({ name: bucket.name, value: counts[index], fill: bucket.fill }))
    .filter((bucket) => bucket.value > 0)
}

function responseTimeByTask(rows: AnalysisRow[]): JsonValue[] {
  const byTask = new Map<number, number[]>()
  for (const row of rows) {
    if (isMissing(row[TASK_COL])) continue
    const task = Math.trunc(asNumber(row[TASK_COL], Number.NaN))
    const time = asNumber(row[RESPONSE_TIME_COL], Number.NaN)
    if (!Number.isFinite(task) || !Number.isFinite(time)) continue
    const bucket = byTask.get(task) ?? []
    bucket.push(time)
    byTask.set(task, bucket)
  }
  return [...byTask.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([task, times]) => ({
      task,
      avg: times.reduce((sum, value) => sum + value, 0) / times.length,
      count: times.length,
    }))
}

function columnMean(rows: PanelCoefficientRow[], column: string): number {
  let sum = 0
  let count = 0
  for (const row of rows) {
    const value = row.coefficients[column]
    if (Number.isFinite(value)) {
      sum += value
      count += 1
    }
  }
  return count ? sum / count : Number.NaN
}

function meansOf(rows: PanelCoefficientRow[], columns: string[]): Record<string, number> {
  const means: Record<string, number> = {}
  for (const column of columns) means[column] = columnMean(rows, column)
  return means
}

function firstValue(rows: AnalysisRow[], column: string): Map<string | number, unknown> {
  const first = new Map<string | number, unknown>()
  for (const row of rows) {
    const panelist = panelistKey(row[PANEL_COL])
    if (panelist == null || first.has(panelist) || isMissing(row[column])) continue
    first.set(panelist, row[column])
  }
  return first
}

function genderGroups(coef: PanelCoefficientRow[], rows: AnalysisRow[], columns: string[]): Record<string, SegmentGroup> {
  const genders = firstValue(rows, GENDER_COL)
  const groups: Record<string, SegmentGroup> = {}
  for (const name of ["Male", "Female"] as const) {
    const members = coef.filter((row) => normalizeGender(genders.get(row.panelist)) === name)
    if (!members.length) continue
    groups[name] = { base: members.length, means: meansOf(members, columns) }
  }
  return groups
}

function ageGroups(coef: PanelCoefficientRow[], rows: AnalysisRow[], columns: string[]): Record<string, SegmentGroup> {
  const ages = firstValue(rows, AGE_COL)
  const bins = new Map<string | number, string>()
  for (const [panelist, age] of ages) {
    const bin = normalizeAgeToBin(age)
    if (bin) bins.set(panelist, bin)
  }
  const groups: Record<string, SegmentGroup> = {}
  for (const bin of AGE_BINS) {
    const members = coef.filter((row) => bins.get(row.panelist) === bin)
    if (!members.length) continue
    groups[bin] = { base: members.length, means: meansOf(members, columns) }
  }
  return groups
}

function classGroups(
  coef: PanelCoefficientRow[],
  rows: AnalysisRow[],
  columns: string[],
  questions: string[],
  meta: Map<string, AnalysisQuestion>,
): Record<string, ClassGroup> {
  const groups: Record<string, ClassGroup> = {}
  for (const question of questions) {
    const answers = firstValue(rows, question)
    if (answers.size === 0) continue
    const labels = [...new Set([...answers.values()].map((answer) => String(answer)))].sort()
    const segments: Record<string, SegmentGroup> = {}
    for (const label of labels) {
      const members = coef.filter((row) => String(answers.get(row.panelist) ?? "") === label && answers.has(row.panelist))
      if (!members.length) continue
      segments[label] = { base: members.length, means: meansOf(members, columns) }
    }
    if (!Object.keys(segments).length) continue
    groups[question] = {
      questionText: question,
      optional: optionalQuestion(meta.get(question) ?? {}),
      answerLabels: Object.keys(segments).sort(),
      segments,
    }
  }
  return groups
}

function displayValue(value: number, round: boolean): number {
  return round ? roundedInt(value) : value
}

function above(value: number, threshold: number | null): boolean {
  return threshold != null && Number.isFinite(value) && value >= threshold
}

function overallSection(
  columns: ElementColumn[],
  categories: string[],
  means: Record<string, number>,
  base: number,
  threshold: number | null,
  round: boolean,
): JsonValue {
  return {
    base_size: base,
    threshold,
    categories: categories.map((category, categoryIndex) => ({
      code: columnLetter(categoryIndex),
      name: category,
      elements: columns
        .filter((column) => column.categoryName === category)
        .map((column, elementIndex) => {
          const value = displayValue(means[column.column] ?? Number.NaN, round)
          return {
            code: `${columnLetter(categoryIndex)}${elementIndex + 1}`,
            name: column.elementName,
            value,
            above_threshold: above(value, threshold),
          }
        }),
    })),
  }
}

function mindsetSection(
  coef: PanelCoefficientRow[],
  columns: ElementColumn[],
  categories: string[],
  base: number,
  threshold: number | null,
  labels2: number[],
  labels3: number[],
  round: boolean,
): JsonValue {
  const count2 = [0, 0]
  const count3 = [0, 0, 0]
  labels2.forEach((label) => {
    if (label >= 0 && label < 2) count2[label] += 1
  })
  labels3.forEach((label) => {
    if (label >= 0 && label < 3) count3[label] += 1
  })
  const names = columns.map((column) => column.column)
  const total = meansOf(coef, names)
  const mean2 = [0, 1].map((label) => {
    const members = coef.filter((_, index) => labels2[index] === label)
    return members.length ? meansOf(members, names) : Object.fromEntries(names.map((name) => [name, 0]))
  })
  const mean3 = [0, 1, 2].map((label) => {
    const members = coef.filter((_, index) => labels3[index] === label)
    return members.length ? meansOf(members, names) : Object.fromEntries(names.map((name) => [name, 0]))
  })
  const valueOf = (means: Record<string, number>, column: string) => {
    const raw = means[column] ?? 0
    return round ? truncInt(raw) : raw
  }
  return {
    base_size: base,
    threshold,
    groups: {
      Total: { base_size: base },
      Mindset_2: {
        Mindset_1_of_2: { base_size: count2[0] },
        Mindset_2_of_2: { base_size: count2[1] },
      },
      Mindset_3: {
        Mindset_1_of_3: { base_size: count3[0] },
        Mindset_2_of_3: { base_size: count3[1] },
        Mindset_3_of_3: { base_size: count3[2] },
      },
    },
    categories: categories.map((category, categoryIndex) => ({
      code: columnLetter(categoryIndex),
      name: category,
      elements: columns
        .filter((column) => column.categoryName === category)
        .map((column, elementIndex) => {
          const values = {
            Total: valueOf(total, column.column),
            Mindset_1_of_2: valueOf(mean2[0], column.column),
            Mindset_2_of_2: valueOf(mean2[1], column.column),
            Mindset_1_of_3: valueOf(mean3[0], column.column),
            Mindset_2_of_3: valueOf(mean3[1], column.column),
            Mindset_3_of_3: valueOf(mean3[2], column.column),
          }
          const flags: { [key: string]: boolean } = {}
          for (const [key, value] of Object.entries(values)) flags[key] = above(value, threshold)
          return {
            code: `${columnLetter(categoryIndex)}${elementIndex + 1}`,
            name: column.elementName,
            values,
            above_threshold: flags,
          }
        }),
    })),
  }
}

function segmentSection(
  columns: ElementColumn[],
  categories: string[],
  groups: Record<string, SegmentGroup>,
  threshold: number | null,
  round: boolean,
  segmentOrder?: readonly string[],
): JsonValue {
  if (!Object.keys(groups).length) {
    return { base_size: 0, threshold, segments: {}, categories: [] }
  }
  const keys = segmentOrder ? [...segmentOrder] : Object.keys(groups).sort()
  const segments: { [key: string]: JsonValue } = {}
  for (const key of keys) {
    if (groups[key]) segments[key] = { base_size: groups[key].base }
  }
  return {
    threshold,
    segments,
    categories: categories.map((category, categoryIndex) => ({
      code: columnLetter(categoryIndex),
      name: category,
      elements: columns
        .filter((column) => column.categoryName === category)
        .map((column, elementIndex) => {
          const values: { [key: string]: number } = {}
          const flags: { [key: string]: boolean } = {}
          for (const key of keys) {
            if (!groups[key]) continue
            const value = displayValue(groups[key].means[column.column] ?? Number.NaN, round)
            values[key] = value
            flags[key] = above(value, threshold)
          }
          return {
            code: `${columnLetter(categoryIndex)}${elementIndex + 1}`,
            name: column.elementName,
            values,
            above_threshold: flags,
          }
        }),
    })),
  }
}

function classificationSection(
  columns: ElementColumn[],
  categories: string[],
  groups: Record<string, ClassGroup>,
  threshold: number | null,
  round: boolean,
): JsonValue {
  if (!Object.keys(groups).length) return { threshold, questions: [], categories: [] }
  return {
    threshold,
    questions: Object.values(groups).map((group) => ({
      question_text: group.questionText,
      optional_classification_question: group.optional,
      segments: Object.fromEntries(group.answerLabels.map((answer) => [answer, { base_size: group.segments[answer].base }])),
    })),
    categories: categories.map((category, categoryIndex) => ({
      code: columnLetter(categoryIndex),
      name: category,
      elements: columns
        .filter((column) => column.categoryName === category)
        .map((column, elementIndex) => {
          const values: { [key: string]: JsonValue } = {}
          for (const group of Object.values(groups)) {
            for (const answer of group.answerLabels) {
              const value = displayValue(group.segments[answer].means[column.column] ?? Number.NaN, round)
              values[`${group.questionText}::${answer}`] = {
                value,
                above_threshold: above(value, threshold),
              }
            }
          }
          return {
            code: `${columnLetter(categoryIndex)}${elementIndex + 1}`,
            name: column.elementName,
            values,
          }
        }),
    })),
  }
}

function combinedSection(
  columns: ElementColumn[],
  categories: string[],
  base: number,
  overall: Record<string, number>,
  genders: Record<string, SegmentGroup>,
  ages: Record<string, SegmentGroup>,
  classes: Record<string, ClassGroup>,
  threshold: number | null,
  round: boolean,
): JsonValue {
  const genderSegments: { [key: string]: JsonValue } = {}
  for (const name of ["Male", "Female"]) {
    if (genders[name]) genderSegments[name] = { base_size: genders[name].base }
  }
  const ageSegments: { [key: string]: JsonValue } = {}
  for (const bin of AGE_BINS) {
    if (ages[bin]) ageSegments[bin] = { base_size: ages[bin].base }
  }
  const classSegments: { [key: string]: JsonValue } = {}
  for (const group of Object.values(classes)) {
    classSegments[group.questionText] = {
      base_size: 0,
      optional_classification_question: group.optional,
      answers: Object.fromEntries(group.answerLabels.map((answer) => [answer, { base_size: group.segments[answer].base }])),
    }
  }
  return {
    base_size: base,
    threshold,
    segments: { Overall: { base_size: base }, Gender: genderSegments, Age: ageSegments, Classification: classSegments },
    categories: categories.map((category, categoryIndex) => ({
      code: columnLetter(categoryIndex),
      name: category,
      elements: columns
        .filter((column) => column.categoryName === category)
        .map((column, elementIndex) => {
          const values: { [key: string]: number } = {}
          const flags: { [key: string]: boolean } = {}
          const put = (key: string, raw: number) => {
            const value = displayValue(raw, round)
            values[key] = value
            flags[key] = above(value, threshold)
          }
          put("Overall", overall[column.column] ?? Number.NaN)
          for (const name of ["Male", "Female"]) {
            if (genders[name]) put(`Gender::${name}`, genders[name].means[column.column] ?? Number.NaN)
          }
          for (const bin of AGE_BINS) {
            if (ages[bin]) put(`Age::${bin}`, ages[bin].means[column.column] ?? Number.NaN)
          }
          for (const group of Object.values(classes)) {
            for (const answer of group.answerLabels) {
              put(`Classification::${group.questionText}::${answer}`, group.segments[answer].means[column.column] ?? Number.NaN)
            }
          }
          return {
            code: `${columnLetter(categoryIndex)}${elementIndex + 1}`,
            name: column.elementName,
            values,
            above_threshold: flags,
          }
        }),
    })),
  }
}

function interceptSection(
  pooled: ReturnType<typeof runPooledRegression>,
  includeIntercept: boolean,
): JsonValue {
  return {
    regression_mode: includeIntercept ? "with_intercept" : "without_intercept",
    threshold: pooled.threshold,
    intercept: pooled.intercept,
    t_intercept: pooled.tIntercept,
    data: pooled.elements.map((element) => ({
      element: element.element,
      beta_with_intercept: element.beta,
      t_with_intercept: element.t,
      beta: element.beta,
      t: element.t,
      t_above_2: element.t >= 2,
    })),
  }
}

function emptyIntercepts(): JsonValue {
  return {
    regression_mode: "with_intercept",
    threshold: null,
    intercept: null,
    t_intercept: null,
    data: [],
  }
}

function emptyReport(
  study: AnalysisStudy,
  settings: AnalysisSettings,
  filters: AnalysisFilters,
  meta: { rowsBefore: number; panelistsBefore: number; rowsAfter: number; panelistsAfter: number },
  error: string,
  includeRawData: boolean,
): AnalysisReport {
  const emptyOverall = { base_size: 0, threshold: null, categories: [] }
  const emptySegment = { base_size: 0, threshold: null, segments: {}, categories: [] }
  const emptyClass = { threshold: null, questions: [], categories: [] }
  const emptyMindset = { base_size: 0, threshold: null, groups: { Total: { base_size: 0 } }, categories: [] }
  const emptyCombined = { base_size: 0, threshold: null, segments: {}, categories: [] }
  const report: AnalysisReport = {
    analysis_settings: jsonValue(settings) as JsonValue,
    filters_applied: jsonValue(filters) as JsonValue,
    filter_meta: {
      total_rows_before_filter: meta.rowsBefore,
      total_rows_after_filter: meta.rowsAfter,
      panelists_before_filter: meta.panelistsBefore,
      panelists_after_filter: meta.panelistsAfter,
      error,
    },
    "Front Page": frontPage(study),
    "Information Block": informationBlock(study),
    dashboard_summary: dashboardSummary([], study.categories ?? []),
    "(T) Overall": emptyOverall,
    "(B) Overall": emptyOverall,
    "(R) Overall": emptyOverall,
    "(T) Mindsets": emptyMindset,
    "(B) Mindsets": emptyMindset,
    "(R) Mindsets": emptyMindset,
    "(T) Gender": emptySegment,
    "(B) Gender": emptySegment,
    "(R) Gender": emptySegment,
    "(T) Age": emptySegment,
    "(B) Age": emptySegment,
    "(R) Age": emptySegment,
    "(T) Classification Questions": emptyClass,
    "(B) Classification Questions": emptyClass,
    "(R) Classification Questions": emptyClass,
    "(T) Combined": emptyCombined,
    "(B) Combined": emptyCombined,
    "(R) Combined": emptyCombined,
    "(T) Intercepts": emptyIntercepts(),
    "(B) Intercepts": emptyIntercepts(),
    "(R) Intercepts": emptyIntercepts(),
  }
  if (includeRawData) report.RawData = []
  applyFilterMasks(report, filters)
  return report
}

function sectionRecord(report: AnalysisReport, key: string): { [key: string]: JsonValue } | null {
  const value = report[key]
  return value && typeof value === "object" && !Array.isArray(value) ? value : null
}

function zeroSegment(section: { [key: string]: JsonValue } | null, allKeys: string[], selected: string[]) {
  if (!section || selected.length === 0) return
  const selectedSet = new Set(selected)
  const segments = (section.segments as { [key: string]: JsonValue } | undefined) ?? {}
  section.segments = segments
  for (const key of allKeys) {
    if (!selectedSet.has(key) || segments[key] == null) segments[key] = { base_size: 0 }
  }
  const categories = Array.isArray(section.categories) ? section.categories : []
  for (const category of categories) {
    if (!category || typeof category !== "object" || Array.isArray(category)) continue
    const elements = Array.isArray(category.elements) ? category.elements : []
    for (const element of elements) {
      if (!element || typeof element !== "object" || Array.isArray(element)) continue
      const values = (element.values as { [key: string]: JsonValue } | undefined) ?? {}
      const flags = (element.above_threshold as { [key: string]: JsonValue } | undefined) ?? {}
      element.values = values
      element.above_threshold = flags
      for (const key of allKeys) {
        if (!selectedSet.has(key)) {
          values[key] = 0
          flags[key] = false
        }
      }
    }
  }
}

function applyFilterMasks(report: AnalysisReport, filters: AnalysisFilters) {
  const ages = filters.age_groups ?? []
  const genders = filters.genders ?? []
  const classes = filters.classification_filters ?? {}
  if (ages.length) {
    for (const prefix of ["(T)", "(B)", "(R)"]) zeroSegment(sectionRecord(report, `${prefix} Age`), [...AGE_BINS], ages)
  }
  if (genders.length) {
    for (const prefix of ["(T)", "(B)", "(R)"]) {
      zeroSegment(sectionRecord(report, `${prefix} Gender`), ["Male", "Female"], genders)
    }
  }
  if (Object.keys(classes).length) {
    for (const prefix of ["(T)", "(B)", "(R)"]) {
      maskClassification(sectionRecord(report, `${prefix} Classification Questions`), classes)
      maskCombinedClassification(sectionRecord(report, `${prefix} Combined`), classes)
    }
  }
  const summary = sectionRecord(report, "dashboard_summary")
  if (ages.length && summary) {
    const allowed = new Set(ages)
    for (const age of ages) if (age === "13-17") allowed.add("13-18")
    const distribution = Array.isArray(summary.ageDistribution) ? summary.ageDistribution : []
    summary.ageDistribution = distribution.filter((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return false
      return typeof item.name === "string" && allowed.has(item.name)
    })
  }
  if (genders.length && summary) {
    const allowed = new Set(genders)
    const distribution = Array.isArray(summary.genderDistribution) ? summary.genderDistribution : []
    summary.genderDistribution = distribution.filter((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return false
      return typeof item.name === "string" && allowed.has(item.name)
    })
  }
}

function maskClassification(
  section: { [key: string]: JsonValue } | null,
  filters: Record<string, string[]>,
) {
  if (!section) return
  const questions = Array.isArray(section.questions) ? section.questions : []
  for (const question of questions) {
    if (!question || typeof question !== "object" || Array.isArray(question)) continue
    const text = question.question_text
    if (typeof text !== "string" || !filters[text]) continue
    const allowed = new Set(filters[text])
    const segments = (question.segments as { [key: string]: JsonValue } | undefined) ?? {}
    question.segments = segments
    for (const answer of Object.keys(segments)) {
      if (!allowed.has(answer)) segments[answer] = { base_size: 0 }
    }
    for (const answer of allowed) {
      if (segments[answer] == null) segments[answer] = { base_size: 0 }
    }
  }
  const categories = Array.isArray(section.categories) ? section.categories : []
  for (const category of categories) {
    if (!category || typeof category !== "object" || Array.isArray(category)) continue
    const elements = Array.isArray(category.elements) ? category.elements : []
    for (const element of elements) {
      if (!element || typeof element !== "object" || Array.isArray(element)) continue
      const values = (element.values as { [key: string]: JsonValue } | undefined) ?? {}
      for (const [question, allowedList] of Object.entries(filters)) {
        const allowed = new Set(allowedList)
        for (const key of Object.keys(values)) {
          const separator = key.indexOf("::")
          if (separator < 0) continue
          const questionText = key.slice(0, separator)
          const answer = key.slice(separator + 2)
          if (questionText === question && !allowed.has(answer)) {
            values[key] = { value: 0, above_threshold: false }
          }
        }
      }
    }
  }
}

function maskCombinedClassification(
  section: { [key: string]: JsonValue } | null,
  filters: Record<string, string[]>,
) {
  if (!section) return
  const segments = section.segments
  const classification =
    segments && typeof segments === "object" && !Array.isArray(segments)
      ? (segments.Classification as { [key: string]: JsonValue } | undefined)
      : undefined
  if (classification) {
    for (const [question, allowedList] of Object.entries(filters)) {
      const block = classification[question]
      if (!block || typeof block !== "object" || Array.isArray(block)) continue
      const answers = (block.answers as { [key: string]: JsonValue } | undefined) ?? {}
      block.answers = answers
      const allowed = new Set(allowedList)
      for (const answer of Object.keys(answers)) {
        if (!allowed.has(answer)) answers[answer] = { base_size: 0 }
      }
      for (const answer of allowed) {
        if (answers[answer] == null) answers[answer] = { base_size: 0 }
      }
    }
  }
  const categories = Array.isArray(section.categories) ? section.categories : []
  for (const category of categories) {
    if (!category || typeof category !== "object" || Array.isArray(category)) continue
    const elements = Array.isArray(category.elements) ? category.elements : []
    for (const element of elements) {
      if (!element || typeof element !== "object" || Array.isArray(element)) continue
      const values = element.values
      const flags = element.above_threshold
      if (!values || typeof values !== "object" || Array.isArray(values)) continue
      if (!flags || typeof flags !== "object" || Array.isArray(flags)) continue
      for (const key of Object.keys(values)) {
        if (!key.startsWith("Classification::")) continue
        const parts = key.split("::")
        if (parts.length < 3) continue
        const question = parts[1]
        const answer = parts.slice(2).join("::")
        const allowed = filters[question]
        if (!allowed) continue
        if (!allowed.includes(answer)) {
          values[key] = 0
          flags[key] = false
        }
      }
    }
  }
}

function uniquePanelists(rows: AnalysisRow[]): number {
  const ids = new Set<string | number>()
  for (const row of rows) {
    const panelist = panelistKey(row[PANEL_COL])
    if (panelist != null) ids.add(panelist)
  }
  return ids.size
}

function rawData(rows: AnalysisRow[]): JsonValue {
  return rows.map((row) => {
    const out: { [key: string]: JsonValue } = {}
    for (const [key, value] of Object.entries(row)) out[key] = jsonValue(value)
    return out
  })
}

function coefficientMatrix(rows: PanelCoefficientRow[], columns: string[]): number[][] {
  return rows.map((row) => columns.map((column) => row.coefficients[column] ?? 0))
}

function roundedMeans(rows: PanelCoefficientRow[], columns: string[], round: boolean): Record<string, number> {
  const means: Record<string, number> = {}
  for (const column of columns) {
    const mean = columnMean(rows, column)
    means[column] = round ? roundedInt(mean) : mean
  }
  return means
}

export function generateAnalysisReport(input: AnalysisReportInput): AnalysisReport {
  const settings = normalizeAnalysisSettings(input.analysisOptions, input.maxRating ?? 5)
  const filters = normalizeFilters(input.filters)
  const active = filtersAreActive(filters)
  const includeRawData = input.includeRawData ?? false
  const rowsBefore = input.rows.length
  const panelistsBefore = uniquePanelists(input.rows)
  let rows = active ? sortRows(filterRows(input.rows, filters)) : input.rows.slice()
  const rowsBeforeConstant = rows.length
  if (settings.exclude_constant_raters) {
    const drop = constantRaterIds(rows)
    if (drop.size) rows = rows.filter((row) => {
      const panelist = panelistKey(row[PANEL_COL])
      return panelist == null || !drop.has(panelist)
    })
  }
  const rowsAfter = rows.length
  const panelistsAfter = uniquePanelists(rows)
  const panelistsBeforeConstant = uniquePanelists(active ? sortRows(filterRows(input.rows, filters)) : input.rows)
  const excludedConstant = settings.exclude_constant_raters
    ? Math.max(0, panelistsBeforeConstant - panelistsAfter)
    : 0

  if (rows.length === 0 && (active || settings.exclude_constant_raters)) {
    const error = rowsBeforeConstant && settings.exclude_constant_raters
      ? "No respondents remain after removing people who rated every task the same."
      : "No respondents match the applied filters."
    const report = emptyReport(
      input.study,
      settings,
      filters,
      { rowsBefore, panelistsBefore, rowsAfter: 0, panelistsAfter: 0 },
      error,
      includeRawData,
    )
    if (excludedConstant && report.dashboard_summary && typeof report.dashboard_summary === "object" && !Array.isArray(report.dashboard_summary)) {
      report.dashboard_summary.excludedConstantRaters = excludedConstant
    }
    return report
  }
  if (rows.length === 0) {
    return emptyReport(
      input.study,
      settings,
      {},
      { rowsBefore, panelistsBefore, rowsAfter: 0, panelistsAfter: 0 },
      "No respondents to analyze.",
      includeRawData,
    )
  }

  const resolved = resolveElements(input.study, rows)
  const names = resolved.columns.map((column) => column.column)
  const questions = (input.study.classification_questions ?? [])
    .map((question) => question.question_text)
    .filter((value): value is string => {
      if (!value) return false
      return columnNames(rows).has(value)
    })
  const meta = new Map<string, AnalysisQuestion>()
  for (const question of input.study.classification_questions ?? []) {
    if (question.question_text) meta.set(question.question_text, question)
  }

  const panelRng = createNumpyRng(123)
  const regressionCache = createRegressionCache()
  const coefT = runPanelRegressions(rows, names, "TOP", settings, panelRng, regressionCache)
  const coefB = runPanelRegressions(rows, names, "BOTTOM", settings, panelRng, regressionCache)
  const coefR = runPanelRegressions(rows, names, "RESPONSE", settings, undefined, regressionCache)
  const meansT = roundedMeans(coefT, names, true)
  const meansB = roundedMeans(coefB, names, true)
  const meansR = roundedMeans(coefR, names, false)
  const pooledT = runPooledRegression(rows, names, "TOP", settings, createNumpyRng(123), regressionCache)
  const pooledB = runPooledRegression(rows, names, "BOTTOM", settings, createNumpyRng(456), regressionCache)
  const pooledR = runPooledRegression(rows, names, "RESPONSE", settings, undefined, regressionCache)
  const matrix = coefficientMatrix(coefT, names)
  const labels2 = matrix.length >= 2 ? pearsonKMeans(matrix, 2, 101) : matrix.map(() => 0)
  const labels3 = matrix.length >= 3 ? pearsonKMeans(matrix, 3, 202) : matrix.map(() => 0)
  const base = coefT.length
  const includeIntercept = settings.regression.include_intercept

  const modes: Array<{
    prefix: string
    coef: PanelCoefficientRow[]
    means: Record<string, number>
    pooled: ReturnType<typeof runPooledRegression>
    round: boolean
  }> = [
    { prefix: "(T)", coef: coefT, means: meansT, pooled: pooledT, round: true },
    { prefix: "(B)", coef: coefB, means: meansB, pooled: pooledB, round: true },
    { prefix: "(R)", coef: coefR, means: meansR, pooled: pooledR, round: false },
  ]

  const report: AnalysisReport = {
    analysis_settings: jsonValue(settings) as JsonValue,
    "Front Page": frontPage(input.study),
    "Information Block": informationBlock(input.study),
    dashboard_summary: dashboardSummary(rows, input.study.categories ?? []),
  }
  if (excludedConstant && report.dashboard_summary && typeof report.dashboard_summary === "object" && !Array.isArray(report.dashboard_summary)) {
    report.dashboard_summary.excludedConstantRaters = excludedConstant
  }
  if (includeRawData) report.RawData = rawData(rows)

  for (const mode of modes) {
    const genders = genderGroups(mode.coef, rows, names)
    const ages = ageGroups(mode.coef, rows, names)
    const classes = classGroups(mode.coef, rows, names, questions, meta)
    report[`${mode.prefix} Overall`] = overallSection(resolved.columns, resolved.categories, mode.means, base, mode.pooled.threshold, mode.round)
    report[`${mode.prefix} Mindsets`] = mindsetSection(
      mode.coef,
      resolved.columns,
      resolved.categories,
      base,
      mode.pooled.threshold,
      labels2,
      labels3,
      mode.round,
    )
    report[`${mode.prefix} Gender`] = segmentSection(resolved.columns, resolved.categories, genders, mode.pooled.threshold, mode.round)
    report[`${mode.prefix} Age`] = segmentSection(resolved.columns, resolved.categories, ages, mode.pooled.threshold, mode.round, AGE_BINS)
    report[`${mode.prefix} Classification Questions`] = classificationSection(
      resolved.columns,
      resolved.categories,
      classes,
      mode.pooled.threshold,
      mode.round,
    )
    report[`${mode.prefix} Combined`] = combinedSection(
      resolved.columns,
      resolved.categories,
      base,
      mode.means,
      genders,
      ages,
      classes,
      mode.pooled.threshold,
      mode.round,
    )
    report[`${mode.prefix} Intercepts`] = interceptSection(mode.pooled, includeIntercept)
  }

  if (active) {
    applyFilterMasks(report, filters)
    report.filters_applied = jsonValue(filters) as JsonValue
    report.filter_meta = {
      total_rows_before_filter: rowsBefore,
      total_rows_after_filter: rowsAfter,
      panelists_before_filter: panelistsBefore,
      panelists_after_filter: panelistsAfter,
    }
  }
  return report
}

export type { ScoreMode }
