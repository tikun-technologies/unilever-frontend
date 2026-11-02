import {
  invertSquare,
  leastSquaresSolver,
  matMulTranspose,
  type LeastSquaresSolver,
} from "@/lib/analysis-engine/lstsq"
import type { NumpyRng } from "@/lib/analysis-engine/numpyRng"
import { asNumber } from "@/lib/analysis-engine/rows"
import {
  PANEL_COL,
  RATING_COL,
  RESPONSE_TIME_COL,
  type AnalysisRow,
  type AnalysisSettings,
  type PanelCoefficientRow,
} from "@/lib/analysis-engine/types"
import { comparePanelist, panelistKey } from "@/lib/analysis-engine/rows"

export type ScoreMode = "TOP" | "BOTTOM" | "RESPONSE"

function clipResponseTime(value: number): number {
  if (!Number.isFinite(value)) return 0
  return value > 7 ? 7 : value
}

export function buildOutcome(
  rows: AnalysisRow[],
  mode: ScoreMode,
  settings: AnalysisSettings,
  rng?: NumpyRng,
): number[] {
  if (mode === "RESPONSE") {
    return rows.map((row) => clipResponseTime(asNumber(row[RESPONSE_TIME_COL], 0)))
  }
  const hundred = new Set(mode === "TOP" ? settings.top.hundred : settings.bottom.hundred)
  const outcome = rows.map((row) => (hundred.has(Math.trunc(asNumber(row[RATING_COL], 0))) ? 100 : 0))
  if (!rng) return outcome
  return outcome.map((value) => value + rng.uniform(-0.5, 0.5) * 1e-5)
}

function designMatrix(rows: AnalysisRow[], elementCols: string[], includeIntercept: boolean): number[][] {
  return rows.map((row) => {
    const line = includeIntercept ? [1] : []
    for (const column of elementCols) line.push(asNumber(row[column], 0))
    return line
  })
}

export function groupRows(rows: AnalysisRow[]): Array<{ panelist: string | number; rows: AnalysisRow[] }> {
  const groups = new Map<string | number, AnalysisRow[]>()
  for (const row of rows) {
    const panelist = panelistKey(row[PANEL_COL])
    if (panelist == null) continue
    const bucket = groups.get(panelist)
    if (bucket) bucket.push(row)
    else groups.set(panelist, [row])
  }
  return [...groups.entries()]
    .sort((a, b) => comparePanelist(a[0], b[0]))
    .map(([panelist, group]) => ({ panelist, rows: group }))
}

interface FactoredDesign {
  design: number[][]
  solver: LeastSquaresSolver
}

/**
 * Top, Bottom and Response share one design matrix per respondent and one pooled design,
 * so the factorizations are computed once per report. Only use it for a single rows/settings pair.
 */
export interface RegressionCache {
  panel?: Array<{ panelist: string | number; rows: AnalysisRow[] } & FactoredDesign>
  pooled?: FactoredDesign & { inverseGram?: number[][] | null }
}

export function createRegressionCache(): RegressionCache {
  return {}
}

function factor(design: number[][]): FactoredDesign {
  return { design, solver: leastSquaresSolver(design) }
}

function panelDesigns(
  rows: AnalysisRow[],
  elementCols: string[],
  includeIntercept: boolean,
  cache?: RegressionCache,
): NonNullable<RegressionCache["panel"]> {
  if (cache?.panel) return cache.panel
  const panel = groupRows(rows).map((group) => ({
    ...group,
    ...factor(designMatrix(group.rows, elementCols, includeIntercept)),
  }))
  if (cache) cache.panel = panel
  return panel
}

export function runPanelRegressions(
  rows: AnalysisRow[],
  elementCols: string[],
  mode: ScoreMode,
  settings: AnalysisSettings,
  rng?: NumpyRng,
  cache?: RegressionCache,
): PanelCoefficientRow[] {
  const includeIntercept = settings.regression.include_intercept
  const result: PanelCoefficientRow[] = []
  for (const group of panelDesigns(rows, elementCols, includeIntercept, cache)) {
    const design = group.design
    const outcome = buildOutcome(group.rows, mode, settings, mode === "RESPONSE" ? undefined : rng)
    const beta = group.solver.solve(outcome)
    const intercept = includeIntercept ? beta[0] ?? null : null
    const coefficients: Record<string, number> = {}
    const slope = includeIntercept ? beta.slice(1) : beta
    elementCols.forEach((column, index) => {
      coefficients[column] = slope[index] ?? 0
    })
    const fitted = design.map((line) => line.reduce((sum, value, index) => sum + value * (beta[index] ?? 0), 0))
    let sse = 0
    let mean = 0
    for (const value of outcome) mean += value
    mean = outcome.length ? mean / outcome.length : 0
    let sst = 0
    for (let index = 0; index < outcome.length; index += 1) {
      sse += (outcome[index] - fitted[index]) ** 2
      sst += (outcome[index] - mean) ** 2
    }
    result.push({
      panelist: group.panelist,
      r2: sst === 0 ? null : 1 - sse / sst,
      intercept: intercept == null || !Number.isFinite(intercept) ? intercept : intercept,
      coefficients,
    })
  }
  return result
}

export interface PooledRegression {
  threshold: number | null
  intercept: number | null
  tIntercept: number | null
  elements: Array<{ element: string; beta: number; t: number }>
}

export function runPooledRegression(
  rows: AnalysisRow[],
  elementCols: string[],
  mode: ScoreMode,
  settings: AnalysisSettings,
  rng?: NumpyRng,
  cache?: RegressionCache,
): PooledRegression {
  const includeIntercept = settings.regression.include_intercept
  if (rows.length === 0) {
    return {
      threshold: null,
      intercept: null,
      tIntercept: null,
      elements: elementCols.map((element) => ({ element, beta: 0, t: 0 })),
    }
  }
  let pooled = cache?.pooled
  if (!pooled) {
    const pooledDesign = designMatrix(rows, elementCols, includeIntercept)
    const gram = matMulTranspose(pooledDesign)
    pooled = {
      design: pooledDesign,
      solver: leastSquaresSolver(pooledDesign, gram),
      inverseGram: pooledDesign.length > pooledDesign[0].length ? invertSquare(gram) : null,
    }
    if (cache) cache.pooled = pooled
  }
  const design = pooled.design
  const outcome = buildOutcome(rows, mode, settings, mode === "RESPONSE" ? undefined : rng)
  const beta = pooled.solver.solve(outcome)
  const fitted = design.map((line) => line.reduce((sum, value, index) => sum + value * (beta[index] ?? 0), 0))
  let sse = 0
  for (let index = 0; index < outcome.length; index += 1) sse += (outcome[index] - fitted[index]) ** 2
  const dof = outcome.length - design[0].length
  const sigma2 = dof > 0 ? sse / dof : 0
  let tValues = beta.map(() => 0)
  if (dof > 0) {
    const inverted = pooled.inverseGram ?? null
    if (inverted) {
      tValues = beta.map((value, index) => {
        const variance = sigma2 * inverted[index][index]
        if (!(variance > 0)) return 0
        const t = value / Math.sqrt(variance)
        return Number.isFinite(t) ? t : 0
      })
    }
  }
  const intercept = includeIntercept ? beta[0] ?? null : null
  const tIntercept = includeIntercept ? tValues[0] ?? null : null
  const slopes = includeIntercept ? beta.slice(1) : beta
  const slopeT = includeIntercept ? tValues.slice(1) : tValues
  const elements = elementCols.map((element, index) => ({
    element,
    beta: slopes[index] ?? 0,
    t: slopeT[index] ?? 0,
  }))
  const significant = elements.filter((element) => element.t >= 2).map((element) => element.beta)
  return {
    threshold: significant.length ? Math.min(...significant) : null,
    intercept: intercept != null && Number.isFinite(intercept) ? intercept : intercept,
    tIntercept: tIntercept != null && Number.isFinite(tIntercept) ? tIntercept : tIntercept,
    elements,
  }
}
