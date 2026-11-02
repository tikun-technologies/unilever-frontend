export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

export type AnalysisReport = { [key: string]: JsonValue }

export interface RatingMap {
  hundred: number[]
  zero: number[]
}

export interface AnalysisSettings {
  top: RatingMap
  bottom: RatingMap
  regression: { include_intercept: boolean }
  exclude_constant_raters: boolean
}

export interface AnalysisFilters {
  age_groups?: string[]
  genders?: string[]
  classification_filters?: Record<string, string[]>
}

export interface AnalysisCategory {
  id?: string
  name?: string
  order?: number
  z_index?: number
  transform?: JsonValue
  [key: string]: unknown
}

export interface AnalysisElement {
  id?: string
  name?: string
  content?: string
  category_id?: string
  category?: { id?: string; name?: string; order?: number }
  z_index?: number
  transform?: JsonValue
  layer_name?: string
  layer_order?: number
  image_order?: number
  alt_text?: string
  [key: string]: unknown
}

export interface AnalysisQuestion {
  question_id?: string
  question_text?: string
  optional_classification_question?: boolean
  config?: { optional_classification_question?: boolean }
  [key: string]: unknown
}

export interface AnalysisStudy {
  title?: string
  main_question?: string
  background?: string
  language?: string
  launched_at?: string
  aspect_ratio?: string | null
  study_type?: string
  categories?: AnalysisCategory[]
  elements?: AnalysisElement[]
  classification_questions?: AnalysisQuestion[]
  [key: string]: unknown
}

export type AnalysisRow = Record<string, unknown>

export interface AnalysisReportInput {
  study: AnalysisStudy
  rows: AnalysisRow[]
  filters?: AnalysisFilters | null
  /**
   * Same object the API stores on the study. It is normalized again with
   * maxRating, which defaults to 5 because that is what the Python service does.
   */
  analysisOptions?: Partial<AnalysisSettings> | Record<string, unknown> | null
  includeRawData?: boolean
  maxRating?: number
}

export interface PanelCoefficientRow {
  panelist: string | number
  r2: number | null
  intercept: number | null
  coefficients: Record<string, number>
}

export const PANEL_COL = "Panelist"
export const RATING_COL = "Rating"
export const RESPONSE_TIME_COL = "ResponseTime"
export const GENDER_COL = "Gender"
export const AGE_COL = "Age"
export const TASK_COL = "Task"
export const AGE_BINS = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const
