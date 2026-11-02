import { generateAnalysisReport } from "@/lib/analysis-engine"
import {
  AGE_COL,
  GENDER_COL,
  PANEL_COL,
  type AnalysisElement,
  type AnalysisFilters,
  type AnalysisReport,
  type AnalysisRow,
  type AnalysisSettings,
  type AnalysisStudy,
} from "@/lib/analysis-engine/types"
import {
  comparePanelist,
  filterRows,
  isMissing,
  normalizeAgeToBin,
  normalizeFilters,
  normalizeGender,
  panelistKey,
} from "@/lib/analysis-engine/rows"
import type { ClassificationCohortResponse, StudyAnalysisSettings, StudyAnalysisSettingsResponse } from "@/lib/api/ResponseAPI"
import type { ClassificationQuestionPayload } from "@/lib/api/StudyAPI"
import type { PackedRows } from "@/lib/export/packRows"
import type { OfflinePptReportSource } from "@/lib/export/offlineAppealPpt"

export interface OfflineAnalysisSource {
  study: AnalysisStudy
  rows: AnalysisRow[]
  settings: StudyAnalysisSettings
  settingsSnapshot: StudyAnalysisSettingsResponse
  classificationQuestions: ClassificationQuestionPayload[]
  /** Compressed images, keyed by the id in `msimg:<id>` tokens. Removed when the file opens. */
  images?: Record<string, string>
  /** Response rows stored by column. When set, `rows` is empty in the file. */
  packedRows?: PackedRows
  pptReport?: OfflinePptReportSource
}

/** Drop cells the analysis never reads and any embedded image payloads inside response rows. */
export function slimAnalysisRows(rows: AnalysisRow[]): AnalysisRow[] {
  return rows.map((row) => {
    const next: AnalysisRow = {}
    for (const [key, value] of Object.entries(row)) {
      if (value == null) continue
      if (typeof value === "number") {
        if (Number.isFinite(value)) next[key] = value
        continue
      }
      if (typeof value === "boolean") {
        next[key] = value
        continue
      }
      if (typeof value !== "string") continue
      const text = value.trim()
      if (!text || text.startsWith("data:") || text.length > 4000) continue
      next[key] = text
    }
    return next
  })
}

interface BasicQuestion {
  question_id?: string
  question_text?: string
  question_type?: string
  is_required?: boolean
  order?: number
  answer_options?: Array<{ id: string; text: string; order?: number }>
  config?: Record<string, unknown>
  optional_classification_question?: boolean
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function text(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value)
}

/** Rebuild the study object the engine expects from a Python analysis JSON report. */
export function studyFromAnalysisReport(report: AnalysisReport): AnalysisStudy {
  const info = asRecord(report["Information Block"])
  const front = asRecord(report["Front Page"])
  const rawCategories = Array.isArray(info.Categories) ? info.Categories : []
  const elements: AnalysisStudy["elements"] = []
  const categories = rawCategories.map((item, index) => {
    const category = asRecord(item)
    const id = category.id != null ? String(category.id) : `category-${index}`
    const name = text(category.name)
    const order = typeof category.order === "number" ? category.order : index
    const categoryElements = Array.isArray(category.elements) ? category.elements : []
    for (const rawElement of categoryElements) {
      const element = asRecord(rawElement)
      elements.push({
        id: element.id != null ? String(element.id) : undefined,
        name: text(element.name),
        content: text(element.content),
        category_id: id,
        category: { id, name, order },
        z_index: typeof (element.z_index ?? category.z_index) === "number"
          ? ((element.z_index ?? category.z_index) as number)
          : undefined,
        transform: (element.transform ?? category.transform) as AnalysisElement["transform"],
        layer_name: element.layer_name as string | undefined,
        layer_order: element.layer_order as number | undefined,
        image_order: element.image_order as number | undefined,
        alt_text: element.alt_text as string | undefined,
      })
    }
    return {
      id,
      name,
      order,
      z_index: typeof category.z_index === "number" ? category.z_index : undefined,
      transform: category.transform as AnalysisElement["transform"],
    }
  })

  const questions = Array.isArray(info["Classification Questions"]) ? info["Classification Questions"] : []
  return {
    title: text(front.Title || info["Study Title"]),
    main_question: text(front["Main Question"]),
    background: text(front.Background || info["Study Background"]),
    language: text(front.Language),
    launched_at: text(front["Launched At"]),
    aspect_ratio: (front["Aspect Ratio"] ?? info["Aspect Ratio"] ?? null) as string | null,
    study_type: text(info["Study Type"]),
    categories,
    elements,
    classification_questions: questions.map((item) => {
      const question = asRecord(item)
      return {
        question_id: question.question_id != null ? String(question.question_id) : undefined,
        question_text: text(question.question_text),
        optional_classification_question: Boolean(question.optional_classification_question),
      }
    }),
  }
}

function distinctAnswers(rows: AnalysisRow[], questionText: string): string[] {
  const seen = new Set<string>()
  const answers: string[] = []
  for (const row of rows) {
    const value = row[questionText]
    if (isMissing(value)) continue
    const answer = String(value).trim()
    if (!answer || seen.has(answer)) continue
    seen.add(answer)
    answers.push(answer)
  }
  return answers
}

function isOpenQuestionType(questionType: string | undefined): boolean {
  const type = (questionType || "").toLowerCase()
  return type === "text" || type === "open_text" || type === "open"
}

export function classificationQuestionsForExport(
  basicQuestions: BasicQuestion[] | null | undefined,
  study: AnalysisStudy,
  rows: AnalysisRow[],
  packedRows?: PackedRows,
): ClassificationQuestionPayload[] {
  const packedColumns = new Map(packedRows?.columns.map((column) => [column.name, column.values]))
  const fromReport = study.classification_questions ?? []
  const source: BasicQuestion[] = basicQuestions?.length
    ? basicQuestions
    : fromReport.map((question, index) => ({
        question_id: question.question_id,
        question_text: question.question_text,
        order: index,
        optional_classification_question: question.optional_classification_question,
      }))

  const questions: ClassificationQuestionPayload[] = []
  source.forEach((question, index) => {
    const questionText = text(question.question_text).trim()
    if (!questionText) return
    const listed = (question.answer_options ?? [])
      .map((option) => ({ id: option.id || option.text, text: option.text, order: option.order }))
      .filter((option) => option.text)
    const seen = new Set(listed.map((option) => option.text))
    const extra = isOpenQuestionType(question.question_type)
      ? []
      : distinctAnswers(
          packedColumns.has(questionText)
            ? packedColumns.get(questionText)!.map((value) => ({ [questionText]: value }))
            : rows,
          questionText,
        ).filter((answer) => !seen.has(answer))
    const answerOptions = [
      ...listed,
      ...extra.map((answer, optionIndex) => ({ id: `seen-${index}-${optionIndex}`, text: answer })),
    ]
    const questionType = question.question_type
      || (answerOptions.length > 0 && answerOptions.length <= 40 ? "multiple_choice" : "text")
    questions.push({
      question_id: question.question_id || `q-${index}`,
      question_text: questionText,
      question_type: questionType,
      is_required: question.is_required ?? !question.optional_classification_question,
      order: question.order ?? index,
      answer_options: isOpenQuestionType(questionType) ? [] : answerOptions,
      config: question.config,
      optional_classification_question: Boolean(question.optional_classification_question),
    })
  })
  return questions
}

export function settingsFromReport(
  report: AnalysisReport,
  studyId: string,
  maxRating: number,
): StudyAnalysisSettingsResponse {
  const raw = asRecord(report.analysis_settings)
  const top = asRecord(raw.top)
  const bottom = asRecord(raw.bottom)
  const regression = asRecord(raw.regression)
  const numbers = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is number => typeof item === "number") : []
  const settings: StudyAnalysisSettings = {
    top: { hundred: numbers(top.hundred), zero: numbers(top.zero) },
    bottom: { hundred: numbers(bottom.hundred), zero: numbers(bottom.zero) },
    regression: { include_intercept: regression.include_intercept !== false },
    exclude_constant_raters: Boolean(raw.exclude_constant_raters),
  }
  return {
    study_id: studyId,
    settings,
    max_rating: maxRating,
    is_default: false,
    defaults: settings,
  }
}

export function runOfflineAnalysis(
  source: Pick<OfflineAnalysisSource, "study" | "rows" | "settings">,
  filters?: AnalysisFilters | null,
): AnalysisReport {
  return generateAnalysisReport({
    study: source.study,
    rows: source.rows,
    filters,
    analysisOptions: source.settings as AnalysisSettings,
    includeRawData: false,
    // The Python service always re-normalizes with max rating 5.
    maxRating: 5,
  })
}

export function localClassificationCohort(input: {
  rows: AnalysisRow[]
  questions: ClassificationQuestionPayload[]
  filters?: AnalysisFilters | null
  questionText: string
  answer: string
  limit?: number
  offset?: number
}): ClassificationCohortResponse {
  const limit = input.limit ?? 120
  const offset = input.offset ?? 0
  const filters = normalizeFilters(input.filters)
  const questions = input.questions.filter((question) => question.question_text.trim())
  const lookup = new Map(questions.map((question) => [question.question_text.trim().toLowerCase(), question.question_text.trim()]))
  const clickedQuestion = lookup.get(input.questionText.trim().toLowerCase()) || input.questionText.trim()
  const clickedAnswer = input.answer.trim()
  const filtered = filterRows(input.rows, filters)
  const usesAgeGroup = filtered.some((row) => "AgeGroup" in row)
  const questionNames = questions.map((question) => question.question_text)
  if (!questionNames.includes(clickedQuestion)) questionNames.push(clickedQuestion)
  type IndexedPanelist = {
    panelist: string | number
    answers: Map<string, string>
    gender: string | null
    age: string | null
  }
  const indexed = new Map<string, IndexedPanelist>()
  for (const row of filtered) {
    const panelist = panelistKey(row[PANEL_COL])
    if (panelist == null) continue
    const key = String(panelist)
    let person = indexed.get(key)
    if (!person) {
      person = { panelist, answers: new Map(), gender: null, age: null }
      indexed.set(key, person)
    }
    if (!person.gender) person.gender = normalizeGender(row[GENDER_COL])
    if (!person.age) {
      const rawAge = row[usesAgeGroup ? "AgeGroup" : AGE_COL]
      if (!isMissing(rawAge)) person.age = usesAgeGroup ? String(rawAge) : normalizeAgeToBin(rawAge)
    }
    for (const question of questionNames) {
      if (person.answers.has(question)) continue
      const value = row[question]
      if (isMissing(value)) continue
      const answer = String(value).trim()
      if (answer) person.answers.set(question, answer)
    }
  }
  const panelists = [...indexed.values()]
    .filter((person) => person.answers.get(clickedQuestion) === clickedAnswer)
    .map((person) => person.panelist)
  panelists.sort(comparePanelist)
  const page = panelists.slice(offset, offset + limit)
  const ageFilterCount = filters.age_groups?.length ?? 0
  const genderFilterCount = filters.genders?.length ?? 0

  const crossTabs: Record<string, Record<string, number>> = {}
  for (const question of questions) {
    if (question.question_text === clickedQuestion) continue
    const counts = new Map<string, number>()
    for (const panelist of panelists) {
      const answer = indexed.get(String(panelist))?.answers.get(question.question_text)
      if (!answer) continue
      counts.set(answer, (counts.get(answer) ?? 0) + 1)
    }
    if (counts.size) {
      crossTabs[question.question_text] = Object.fromEntries(
        [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
      )
    }
  }

  const genderCounts = new Map<string, number>()
  const ageCounts = new Map<string, number>()
  for (const panelist of panelists) {
    const person = indexed.get(String(panelist))
    const gender = person?.gender
    const age = person?.age
    if (gender) genderCounts.set(gender, (genderCounts.get(gender) ?? 0) + 1)
    if (age) ageCounts.set(age, (ageCounts.get(age) ?? 0) + 1)
  }
  const demographic: ClassificationCohortResponse["demographic_breakdown"] = {}
  if (genderCounts.size > 1 && genderFilterCount !== 1) {
    demographic.gender = Object.fromEntries([...genderCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))
  }
  if (ageCounts.size > 1 && ageFilterCount !== 1) {
    demographic.age_group = Object.fromEntries([...ageCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))
  }

  return {
    meta: {
      cohort_size: panelists.length,
      question_text: clickedQuestion,
      answer: clickedAnswer,
      limit,
      offset,
      has_more: offset + page.length < panelists.length,
      filters_applied: filters.age_groups?.length || filters.genders?.length || Object.keys(filters.classification_filters ?? {}).length
        ? filters
        : null,
    },
    questions: questions.map((question) => ({
      question_text: question.question_text,
      options: (question.answer_options ?? []).map((option) => option.text),
    })),
    respondents: page.map((panelist, index) => ({
      id: String(panelist),
      label: `Respondent ${offset + index + 1}`,
      session_id: String(panelist),
      panelist_id: String(panelist),
      gender: indexed.get(String(panelist))?.gender ?? null,
      age_group: indexed.get(String(panelist))?.age ?? null,
      answers: Object.fromEntries(
        questions.map((question) => [
          question.question_text,
          indexed.get(String(panelist))?.answers.get(question.question_text) ?? null,
        ]),
      ),
    })),
    cross_tabs: crossTabs,
    demographic_breakdown: demographic.gender || demographic.age_group ? demographic : null,
  }
}

export function rowsToCsv(rows: AnalysisRow[]): string {
  const columns: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue
      seen.add(key)
      columns.push(key)
    }
  }
  const escape = (value: unknown) => {
    if (value == null) return ""
    const textValue = typeof value === "object" ? JSON.stringify(value) : String(value)
    return /[",\n\r]/.test(textValue) ? `"${textValue.replace(/"/g, '""')}"` : textValue
  }
  return [columns.join(","), ...rows.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\r\n")
}

export function downloadTextFile(filename: string, contents: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
